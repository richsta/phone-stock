import { defineEval } from "@grok/agent-sdk/evals";

export default defineEval({
  tags: ["smoke"],
  description: "Checks iPhone Duo pickup near 98109 with the stock tool.",
  async test(t) {
    await t.send(
      "Check iPhone Duo pickup availability near ZIP 98109. Use the check-pickup-stock tool.",
    );
    t.succeeded();
    t.calledTool("check-pickup-stock");
  },
});
