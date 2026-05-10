import type {
  WaProvider,
  WaSendTemplateInput,
  WaSendTemplateResult,
  WaInboundEvent,
} from "./types";

/**
 * Interakt implementation skeleton. Replace stubs with real API calls in
 * Phase 1, week 5. Endpoints: https://www.interakt.shop/resource-center/
 *
 * Required env:
 *   INTERAKT_API_KEY
 *   INTERAKT_WEBHOOK_SECRET
 */
export const interakt: WaProvider = {
  async sendTemplate(input: WaSendTemplateInput): Promise<WaSendTemplateResult> {
    void input;
    throw new Error("Not implemented yet — wire to Interakt /v1/public/message/");
  },

  async sendSession({ to, text }) {
    void to; void text;
    throw new Error("Not implemented yet");
  },

  async parseWebhook(req: Request): Promise<WaInboundEvent[]> {
    void req;
    throw new Error("Not implemented yet");
  },
};
