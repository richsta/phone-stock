import { defineSchedule } from "@grok/agent-sdk/schedules";
import { DEFAULT_ALERT_EMAIL, DEFAULT_PICKUP_ZIP } from "../lib/duo-parts.js";

/**
 * ~6:00 America/Los_Angeles in standard time (PST = UTC-8 → 14:00 UTC).
 * During PDT this fires at 7:00 local. Cron is UTC-only.
 */
export default defineSchedule({
  cron: "0 14 * * *",
  async run({ callTool }) {
    const stock = (await callTool("check-pickup-stock", {
      zip: DEFAULT_PICKUP_ZIP,
    })) as {
      available?: unknown[];
      checkedAt?: string;
      availableCount?: number;
    };

    const available = Array.isArray(stock?.available) ? stock.available : [];
    if (available.length === 0) {
      return;
    }

    await callTool("send-availability-email", {
      zip: DEFAULT_PICKUP_ZIP,
      to: DEFAULT_ALERT_EMAIL,
      checkedAt: stock.checkedAt,
      items: available,
    });
  },
});
