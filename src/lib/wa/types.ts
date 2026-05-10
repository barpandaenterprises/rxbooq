/**
 * WhatsApp provider abstraction.
 *
 * Every WhatsApp send goes through this interface so we can swap Interakt for
 * Gupshup or Meta Cloud API later without touching feature code.
 */

export type WaLocale = "en" | "hi" | "or";

export type WaSendTemplateInput = {
  to: string;                  // E.164, e.g. +919999900000
  template: string;            // canonical name, e.g. "booking_confirmation_v1"
  language: WaLocale;
  variables: string[];         // template params in order
  contextRef?: { type: "appointment" | "patient"; id: string };
};

export type WaSendTemplateResult = {
  providerMessageId: string;
};

export type WaInboundEvent =
  | { kind: "delivery";    providerMessageId: string; status: "delivered" | "read" | "failed"; ts: string }
  | { kind: "reply";       from: string; text: string; ts: string };

export interface WaProvider {
  sendTemplate(input: WaSendTemplateInput): Promise<WaSendTemplateResult>;
  sendSession(args: { to: string; text: string }): Promise<WaSendTemplateResult>;
  parseWebhook(req: Request): Promise<WaInboundEvent[]>;
}
