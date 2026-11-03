import { defineAgent } from "@grok/agent-sdk";

export default defineAgent({
  model: {
    id: "grok-4.7",
    params: [
      { id: "reasoning_effort", value: "high" },
      { id: "fast", value: "true" },
    ],
  },
  hosting: {
    egressDomains: ["www.apple.com", "api.resend.com"],
    secretNames: ["RESEND_API_KEY", "EMAIL_FROM"],
  },
});
