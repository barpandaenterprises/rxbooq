import type {
  WaProvider,
  WaSendTemplateInput,
  WaSendTemplateResult,
  WaInboundEvent,
  WaLocale,
} from "./types";

/**
 * Interakt provider implementation.
 *
 * Docs: https://www.interakt.shop/resource-center/
 * Endpoint: https://api.interakt.ai/v1/public/message/
 *
 * Required env:
 *   INTERAKT_API_KEY      — server-only, never exposed to the client
 *   INTERAKT_WEBHOOK_SECRET — header `x-webhook-secret` set in Interakt console
 */

const INTERAKT_BASE = "https://api.interakt.ai/v1/public";

function authHeader(): string {
  const key = process.env.INTERAKT_API_KEY;
  if (!key) throw new Error("INTERAKT_API_KEY is not set");
  // Interakt accepts the API key prefixed with Basic and base64-encoded.
  return "Basic " + Buffer.from(key, "utf8").toString("base64");
}

function splitE164(phoneE164: string): { countryCode: string; phoneNumber: string } {
  // "+919876543210" → countryCode "+91", phoneNumber "9876543210"
  const digits = phoneE164.replace(/\D/g, "");
  if (digits.length < 10) {
    return { countryCode: "+91", phoneNumber: digits };
  }
  if (digits.length === 10) {
    // No country code provided — default to India.
    return { countryCode: "+91", phoneNumber: digits };
  }
  const local = digits.slice(-10);
  const cc    = digits.slice(0, digits.length - 10);
  return { countryCode: `+${cc}`, phoneNumber: local };
}

// =============================================================================
// sendTemplate
// =============================================================================

type InteraktSendResponse = {
  result?:    boolean;
  message?:   string;
  /** Interakt assigns a wamid via the webhook; some responses include it. */
  id?:        string;
  data?:      { id?: string };
};

async function sendTemplate(input: WaSendTemplateInput): Promise<WaSendTemplateResult> {
  const { countryCode, phoneNumber } = splitE164(input.to);

  const body = {
    countryCode,
    phoneNumber,
    type:     "Template",
    callbackData: input.contextRef ? `${input.contextRef.type}:${input.contextRef.id}` : undefined,
    template: {
      name:         input.template,
      languageCode: input.language,
      bodyValues:   input.variables,
    },
  };

  const res = await fetch(`${INTERAKT_BASE}/message/`, {
    method: "POST",
    headers: {
      Authorization: authHeader(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  let json: InteraktSendResponse | null = null;
  try {
    json = (await res.json()) as InteraktSendResponse;
  } catch {
    /* response wasn't JSON */
  }

  if (!res.ok || json?.result === false) {
    throw new Error(json?.message ?? `Interakt HTTP ${res.status}`);
  }

  const providerMessageId = json?.id ?? json?.data?.id ?? "";
  return { providerMessageId };
}

// =============================================================================
// sendSession — free-form text (within the 24h customer-care window)
// =============================================================================

async function sendSession({ to, text }: { to: string; text: string }): Promise<WaSendTemplateResult> {
  const { countryCode, phoneNumber } = splitE164(to);

  const body = {
    countryCode,
    phoneNumber,
    type: "Text",
    data: { message: text },
  };

  const res = await fetch(`${INTERAKT_BASE}/message/`, {
    method: "POST",
    headers: {
      Authorization: authHeader(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  let json: InteraktSendResponse | null = null;
  try {
    json = (await res.json()) as InteraktSendResponse;
  } catch {
    /* response wasn't JSON */
  }

  if (!res.ok || json?.result === false) {
    throw new Error(json?.message ?? `Interakt HTTP ${res.status}`);
  }

  return { providerMessageId: json?.id ?? json?.data?.id ?? "" };
}

// =============================================================================
// parseWebhook
// =============================================================================

type InteraktWebhookEvent = {
  type:      string;
  timestamp?: string | number;
  message?: {
    id?:    string;
    from?:  string;
    text?:  { body?: string };
    type?:  string;
  };
  /** Status webhooks ("delivered" / "read" / "failed") */
  payload?: {
    id?:           string;
    status?:       string;
    timestamp?:    string;
  };
  from?: string;
};

function tsToIso(value: string | number | undefined): string {
  if (!value) return new Date().toISOString();
  const n = typeof value === "string" ? Number(value) : value;
  if (Number.isFinite(n)) {
    // Interakt may send unix seconds.
    return new Date(n * (n < 1e12 ? 1000 : 1)).toISOString();
  }
  return new Date(String(value)).toISOString();
}

async function parseWebhook(req: Request): Promise<WaInboundEvent[]> {
  const raw = (await req.json().catch(() => null)) as
    | InteraktWebhookEvent
    | InteraktWebhookEvent[]
    | null;
  if (!raw) return [];

  const events = Array.isArray(raw) ? raw : [raw];
  const out: WaInboundEvent[] = [];

  for (const ev of events) {
    const ts = tsToIso(ev.timestamp ?? ev.payload?.timestamp);
    if (ev.type === "message_status" || ev.type === "message_dlr") {
      const id     = ev.payload?.id ?? ev.message?.id ?? "";
      const status = (ev.payload?.status ?? "").toLowerCase();
      if (id && (status === "delivered" || status === "read" || status === "failed")) {
        out.push({ kind: "delivery", providerMessageId: id, status, ts });
      }
      continue;
    }

    // Incoming patient reply
    const from = ev.message?.from ?? ev.from;
    const text = ev.message?.text?.body;
    if (from && text) {
      out.push({ kind: "reply", from, text, ts });
    }
  }

  return out;
}

export const interakt: WaProvider = {
  sendTemplate,
  sendSession,
  parseWebhook,
};

// Re-export so callers can import the locale type from one place.
export type { WaLocale };
