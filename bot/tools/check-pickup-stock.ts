import { prompt } from "@grok/agent-sdk";
import { defineTool } from "@grok/agent-sdk/tools";
import * as z from "zod/v4";
import {
  DEFAULT_PICKUP_ZIP,
  IPHONE_DUO_PARTS,
  partByNumber,
} from "../lib/duo-parts.js";

type PickupItem = {
  partNumber: string;
  label: string;
  color: string;
  storage: string;
  storeName: string;
  city: string;
  state: string;
  distance: string;
  quote: string;
  reservationUrl: string;
};

type AppleStore = {
  storeName?: string;
  city?: string;
  state?: string;
  storeDistance?: string;
  reservationUrl?: string;
  partsAvailability?: Record<
    string,
    {
      partNumber?: string;
      pickupDisplay?: string;
      pickupSearchQuote?: string;
    }
  >;
};

export default defineTool({
  description: prompt`
    Check Apple Store pickup availability for every unlocked iPhone Duo
    configuration near a US ZIP code. Use this before deciding whether to alert.
  `,
  effect: "read",
  inputSchema: z.object({
    zip: z
      .string()
      .regex(/^\d{5}$/)
      .default(DEFAULT_PICKUP_ZIP)
      .describe("US ZIP code for nearby Apple Stores"),
  }),
  async execute({ zip }) {
    const query = new URLSearchParams({
      pl: "true",
      "mts.0": "regular",
      location: zip,
    });
    IPHONE_DUO_PARTS.forEach((part, index) => {
      query.set(`parts.${index}`, part.partNumber);
    });

    const url = `https://www.apple.com/shop/retail/pickup-message?${query.toString()}`;
    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
        "User-Agent":
          "Mozilla/5.0 (compatible; iphone-duo-stock/1.0; +local-agent)",
      },
    });

    if (!response.ok) {
      return {
        ok: false as const,
        zip,
        checkedAt: new Date().toISOString(),
        error: `Apple pickup API returned HTTP ${response.status}`,
        available: [] as PickupItem[],
        unavailableCount: 0,
        storesChecked: 0,
      };
    }

    const payload = (await response.json()) as {
      body?: { stores?: AppleStore[] };
    };
    const stores = payload.body?.stores ?? [];
    const available: PickupItem[] = [];
    let unavailableCount = 0;

    for (const store of stores) {
      const parts = store.partsAvailability ?? {};
      for (const [partNumber, info] of Object.entries(parts)) {
        const display = (info.pickupDisplay ?? "").toLowerCase().trim();
        const quote = info.pickupSearchQuote ?? "";
        // Trust pickupDisplay only — quotes like "Currently unavailable" also contain "available".
        const isAvailable =
          display === "available" || display === "available today";
        const meta = partByNumber(partNumber) ?? {
          partNumber,
          color: "Unknown",
          storage: "Unknown",
          label: `iPhone Duo ${partNumber}`,
        };
        if (!isAvailable) {
          unavailableCount += 1;
          continue;
        }
        available.push({
          partNumber,
          label: meta.label,
          color: meta.color,
          storage: meta.storage,
          storeName: store.storeName ?? "Unknown store",
          city: store.city ?? "",
          state: store.state ?? "",
          distance: store.storeDistance ?? "",
          quote,
          reservationUrl: store.reservationUrl ?? "https://www.apple.com/shop/buy-iphone/iphone-duo",
        });
      }
    }

    available.sort((a, b) =>
      `${a.storeName}:${a.partNumber}`.localeCompare(
        `${b.storeName}:${b.partNumber}`,
      ),
    );

    return {
      ok: true as const,
      zip,
      checkedAt: new Date().toISOString(),
      product: "iPhone Duo",
      storesChecked: stores.length,
      availableCount: available.length,
      unavailableCount,
      available,
      buyUrl: "https://www.apple.com/shop/buy-iphone/iphone-duo",
    };
  },
});
