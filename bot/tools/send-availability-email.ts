import { prompt } from "@grok/agent-sdk";
import { defineTool } from "@grok/agent-sdk/tools";
import * as z from "zod/v4";
import { DEFAULT_ALERT_EMAIL, DEFAULT_PICKUP_ZIP } from "../lib/duo-parts.js";

const ItemSchema = z.object({
  partNumber: z.string(),
  label: z.string(),
  color: z.string(),
  storage: z.string(),
  storeName: z.string(),
  city: z.string(),
  state: z.string(),
  distance: z.string(),
  quote: z.string(),
  reservationUrl: z.string(),
});

type Item = z.infer<typeof ItemSchema>;

function fingerprint(items: Item[]): string {
  return items
    .map((i) => `${i.storeName}|${i.partNumber}`)
    .sort()
    .join("\n");
}

function buildBody(zip: string, items: Item[], checkedAt: string): string {
  const lines = items.map(
    (i) =>
      `- ${i.label} @ Apple ${i.storeName}` +
      (i.city ? ` (${i.city}, ${i.state})` : "") +
      (i.distance ? ` · ${i.distance} mi` : "") +
      `\n  ${i.quote || "Available"}\n  ${i.reservationUrl}`,
  );
  return [
    `iPhone Duo pickup is available near ZIP ${zip}.`,
    `Checked at ${checkedAt} (UTC).`,
    "",
    "In-stock configurations:",
    ...lines,
    "",
    "Reserve quickly — stock often disappears within minutes.",
    "Buy: https://www.apple.com/shop/buy-iphone/iphone-duo",
  ].join("\n");
}

export default defineTool({
  description: prompt`
    Email an availability alert listing every in-stock iPhone Duo pickup option.
    Skips sending when the same store/SKU set was already emailed (kv dedupe).
    Only call this when check-pickup-stock returned at least one available item.
  `,
  effect: "idempotent",
  inputSchema: z.object({
    zip: z.string().default(DEFAULT_PICKUP_ZIP),
    to: z.string().email().default(DEFAULT_ALERT_EMAIL),
    checkedAt: z.string().optional(),
    items: z.array(ItemSchema).min(1),
    force: z
      .boolean()
      .default(false)
      .describe("Bypass dedupe and send even if this stock set was already alerted"),
  }),
  dryRunResult: ({ to, zip, items }) => ({
    sent: false,
    dryRun: true,
    to,
    zip,
    itemCount: items.length,
  }),
  async execute({ zip, to, checkedAt, items, force }, ctx) {
    const when = checkedAt ?? new Date().toISOString();
    const fp = fingerprint(items);
    const kvKey = `alert:iphone-duo:${zip}`;

    if (!force) {
      const prior = await ctx.host.kv.get(kvKey);
      if (
        prior &&
        typeof prior === "object" &&
        prior !== null &&
        "fingerprint" in prior &&
        (prior as { fingerprint?: string }).fingerprint === fp
      ) {
        return {
          sent: false,
          skipped: "duplicate_stock",
          to,
          zip,
          itemCount: items.length,
        };
      }
    }

    const apiKey = process.env.RESEND_API_KEY;
    const from =
      process.env.EMAIL_FROM ?? "iPhone Duo Stock <onboarding@resend.dev>";

    if (!apiKey) {
      return {
        sent: false,
        error: "RESEND_API_KEY is not set",
        to,
        zip,
        itemCount: items.length,
        previewSubject: `iPhone Duo available near ${zip} (${items.length})`,
        previewBody: buildBody(zip, items, when),
      };
    }

    const subject = `iPhone Duo available near ${zip} (${items.length})`;
    const text = buildBody(zip, items, when);

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [to],
        subject,
        text,
      }),
    });

    const payload = (await response.json().catch(() => ({}))) as {
      id?: string;
      message?: string;
    };

    if (!response.ok) {
      return {
        sent: false,
        error: payload.message ?? `Resend HTTP ${response.status}`,
        to,
        zip,
        itemCount: items.length,
      };
    }

    await ctx.host.kv.put(kvKey, {
      fingerprint: fp,
      sentAt: new Date().toISOString(),
      to,
      itemCount: items.length,
      messageId: payload.id ?? null,
    });

    return {
      sent: true,
      to,
      zip,
      itemCount: items.length,
      messageId: payload.id ?? null,
      subject,
    };
  },
});
