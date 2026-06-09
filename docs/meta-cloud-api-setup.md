# Meta WhatsApp Cloud API — Setup & Integration Guide

A **zero-subscription** alternative to Interakt. You pay Meta only (per-conversation; Auth
conversations are ~₹0.11–0.13 each in India), with **no platform fee** and no feature
paywall — incoming-message webhooks and free-form session messages are core platform
features, unlike Interakt's Advanced tier.

This codebase is provider-abstracted via the `WaProvider` interface in
`src/lib/wa/types.ts`, so adding Cloud API = **one new adapter file** + a provider switch.
No feature code changes.

---

## Cost model (vs Interakt)

| | Meta Cloud API (direct) | Interakt |
|---|---|---|
| Platform / subscription fee | **₹0** | ₹2,757–₹9,657 / quarter |
| Incoming webhooks + session msgs | Included | Advanced tier only (~₹3,800/mo +GST) |
| Per-conversation (Auth, India) | ~₹0.11–0.13 (Meta direct) | ~₹0.129 (Meta rate passed through) |
| You manage | App, templates, webhook, tokens | Interakt dashboard does it for you |

Trade-off: Cloud API has no managed dashboard — you submit templates and wire the webhook
yourself (more setup, more learning). Right choice for a startup/learning budget.

---

## Prerequisites

1. A **Meta (Facebook) account**.
2. A **Meta Business Account** — <https://business.facebook.com>.
3. A phone number that is **not** registered on any WhatsApp app (personal or Business).
   - For pure learning you can skip this: Meta gives a **free test number** in the
     dashboard that can message up to 5 allow-listed recipients with no number of your own.

---

## Step 1 — Create a Meta App

1. Go to <https://developers.facebook.com/apps> → **Create App**.
2. Use case: **Other** → App type: **Business**.
3. In the app dashboard, **Add Product → WhatsApp → Set up**.
4. This auto-creates a **test WhatsApp Business Account (WABA)** and a **test phone number**.

## Step 2 — Grab the IDs and a token

From **WhatsApp → API Setup** in the app dashboard, copy:

- **Phone number ID** → `META_WA_PHONE_NUMBER_ID` (this is NOT the phone number itself).
- **WhatsApp Business Account ID** → `META_WA_BUSINESS_ACCOUNT_ID` (needed for template mgmt).
- A **temporary access token** (24h) for first tests → `META_WA_ACCESS_TOKEN`.

For production, create a **permanent token**:
- Business Settings → **System Users** → create a system user → assign the app →
  **Generate token** with scopes `whatsapp_business_messaging` + `whatsapp_business_management`.
- This token does not expire. Store it as `META_WA_ACCESS_TOKEN`.

Also note from **App Settings → Basic**:
- **App Secret** → `META_WA_APP_SECRET` (used to verify webhook signatures).

## Step 3 — Add a test recipient (test number only)

In **API Setup**, add your personal WhatsApp number under "To" → you'll get an opt-in
prompt on WhatsApp. Test sends only reach allow-listed numbers until you use a real
verified number.

## Step 4 — Register message templates

Templates are created in **WhatsApp Manager → Account tools → Message templates**
(<https://business.facebook.com/wa/manage/message-templates>) or via the Graph API.

Create the same names the app expects:

### a) Patient sign-in OTP — `patient_otp_v1`
- **Important:** the send passes `variables: [code, clinic.name]` (two vars). Meta
  **Authentication** templates allow only one `{{1}}` OTP var. So either:
  - **Utility** category, body `Your {{2}} verification code is {{1}}. Expires in 10 minutes.`
  - **or** Authentication category + trim the send to `[code]` at
    `src/app/api/auth/wa-otp/send/route.ts:117`.

### b) Onboarding OTP — `onboarding_otp_v1`
- **Authentication**, `en`, single `{{1}}` = code.
- Body: `Your Rxbooq verification code is {{1}}. It expires in 10 minutes.`

### c) Appointment templates
- Reminder / confirmation templates already used by appointment messaging.

> Template approval is per-name + per-language and usually takes minutes for Auth/Utility.

## Step 5 — Configure the webhook

Cloud API webhooks differ from Interakt in **two** ways — both need handling:

1. **GET verification handshake.** Meta calls your endpoint with
   `?hub.mode=subscribe&hub.verify_token=...&hub.challenge=...`. You must echo back
   `hub.challenge` if the token matches `META_WA_WEBHOOK_VERIFY_TOKEN`.
2. **POST signature.** Each event POST carries header `X-Hub-Signature-256: sha256=<hmac>`
   = HMAC-SHA256 of the raw body using `META_WA_APP_SECRET`.

In the Meta app: **WhatsApp → Configuration → Webhook**:
- **Callback URL:** `https://<your-domain>/api/wa/webhook`
- **Verify token:** the value you set as `META_WA_WEBHOOK_VERIFY_TOKEN`
- **Subscribe to fields:** `messages` (covers both inbound messages and status updates).

> The existing webhook route (`src/app/api/wa/webhook/route.ts`) only has a POST handler
> with a static-secret check. For Cloud API you must add a **GET** handler (verification)
> and switch the POST auth to **signature verification**. See the adapter notes below.

## Step 6 — Environment variables

Add to `.env.local` (and production):

```bash
# ---------- WhatsApp provider switch ----------
WA_PROVIDER=cloud                # "cloud" = Meta Cloud API, "interakt" = Interakt

# ---------- Meta WhatsApp Cloud API ----------
META_WA_ACCESS_TOKEN=            # permanent system-user token (server-only)
META_WA_PHONE_NUMBER_ID=         # from API Setup (NOT the phone number)
META_WA_BUSINESS_ACCOUNT_ID=     # WABA id, for template management
META_WA_APP_SECRET=              # App Settings → Basic, for webhook signature
META_WA_WEBHOOK_VERIFY_TOKEN=    # any random string; must match webhook config
META_GRAPH_VERSION=v21.0         # optional, defaults to a pinned version in code

# Keep mock mode ON for free local UI dev (no real sends); set false to go live.
MOCK_DATA=false
```

---

## Step 7 — Implement the adapter

Create `src/lib/wa/cloud-api.ts` implementing the same `WaProvider` interface as
`interakt.ts`. Reference implementation:

```ts
import type {
  WaProvider,
  WaSendTemplateInput,
  WaSendTemplateResult,
  WaInboundEvent,
} from "./types";

const GRAPH_VERSION = process.env.META_GRAPH_VERSION || "v21.0";

function endpoint(): string {
  const id = process.env.META_WA_PHONE_NUMBER_ID;
  if (!id) throw new Error("META_WA_PHONE_NUMBER_ID is not set");
  return `https://graph.facebook.com/${GRAPH_VERSION}/${id}/messages`;
}

function authHeader(): string {
  const token = process.env.META_WA_ACCESS_TOKEN;
  if (!token) throw new Error("META_WA_ACCESS_TOKEN is not set");
  return `Bearer ${token}`;
}

// Cloud API wants the recipient as digits only, country code, no "+".
function toMsisdn(phoneE164: string): string {
  return phoneE164.replace(/\D/g, "");
}

type CloudSendResponse = {
  messages?: { id?: string }[];
  error?: { message?: string };
};

async function post(body: unknown): Promise<WaSendTemplateResult> {
  const res = await fetch(endpoint(), {
    method: "POST",
    headers: { Authorization: authHeader(), "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  let json: CloudSendResponse | null = null;
  try { json = (await res.json()) as CloudSendResponse; } catch { /* non-JSON */ }
  if (!res.ok || json?.error) {
    throw new Error(json?.error?.message ?? `Meta Cloud API HTTP ${res.status}`);
  }
  return { providerMessageId: json?.messages?.[0]?.id ?? "" };
}

async function sendTemplate(input: WaSendTemplateInput): Promise<WaSendTemplateResult> {
  return post({
    messaging_product: "whatsapp",
    to: toMsisdn(input.to),
    type: "template",
    template: {
      name: input.template,
      language: { code: input.language },
      components: input.variables.length
        ? [{
            type: "body",
            parameters: input.variables.map((text) => ({ type: "text", text })),
          }]
        : [],
    },
  });
}

async function sendSession({ to, text }: { to: string; text: string }): Promise<WaSendTemplateResult> {
  return post({
    messaging_product: "whatsapp",
    to: toMsisdn(to),
    type: "text",
    text: { body: text },
  });
}

// Webhook payload shape:
// { object, entry: [{ changes: [{ value: { statuses?, messages? } }] }] }
type CloudWebhook = {
  entry?: {
    changes?: {
      value?: {
        statuses?: { id?: string; status?: string; timestamp?: string }[];
        messages?: {
          from?: string;
          id?: string;
          timestamp?: string;
          text?: { body?: string };
        }[];
      };
    }[];
  }[];
};

function tsToIso(value: string | undefined): string {
  if (!value) return new Date().toISOString();
  const n = Number(value);
  return Number.isFinite(n) ? new Date(n * 1000).toISOString() : new Date(value).toISOString();
}

async function parseWebhook(req: Request): Promise<WaInboundEvent[]> {
  const raw = (await req.json().catch(() => null)) as CloudWebhook | null;
  if (!raw?.entry) return [];
  const out: WaInboundEvent[] = [];

  for (const entry of raw.entry) {
    for (const change of entry.changes ?? []) {
      const v = change.value;
      if (!v) continue;

      for (const s of v.statuses ?? []) {
        const status = (s.status ?? "").toLowerCase();
        if (s.id && (status === "delivered" || status === "read" || status === "failed")) {
          out.push({ kind: "delivery", providerMessageId: s.id, status, ts: tsToIso(s.timestamp) });
        }
      }

      for (const m of v.messages ?? []) {
        if (m.from && m.text?.body) {
          out.push({ kind: "reply", from: `+${m.from}`, text: m.text.body, ts: tsToIso(m.timestamp) });
        }
      }
    }
  }
  return out;
}

export const cloudApi: WaProvider = { sendTemplate, sendSession, parseWebhook };
```

> Note: `parseWebhook` returns `from` as `+<digits>`. The reply handler matches patients by
> `phone_e164`, so prefixing `+` keeps it consistent with stored E.164 numbers. Verify your
> `patients.phone_e164` format matches.

## Step 8 — Wire the provider switch

Create `src/lib/wa/provider.ts`:

```ts
import type { WaProvider } from "./types";
import { interakt } from "./interakt";
import { cloudApi } from "./cloud-api";

export const provider: WaProvider =
  process.env.WA_PROVIDER === "cloud" ? cloudApi : interakt;
```

Then change `src/lib/wa/send.ts` to import the active provider instead of Interakt directly:

```ts
// - import { interakt } from "./interakt";
// + import { provider } from "./provider";
// ...and replace interakt.sendTemplate(...) / interakt.sendSession(...)
//    with provider.sendTemplate(...) / provider.sendSession(...)
```

And `src/app/api/wa/webhook/route.ts` to use `provider.parseWebhook(...)`.

## Step 9 — Update the webhook route for Cloud API

The current route needs two additions for Cloud API:

1. **GET handler** for Meta's verification handshake:

```ts
export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams;
  if (
    p.get("hub.mode") === "subscribe" &&
    p.get("hub.verify_token") === process.env.META_WA_WEBHOOK_VERIFY_TOKEN
  ) {
    return new Response(p.get("hub.challenge") ?? "", { status: 200 });
  }
  return new Response("Forbidden", { status: 403 });
}
```

2. **Signature check** in POST (replace the static `x-webhook-secret` check when
   `WA_PROVIDER=cloud`): verify `X-Hub-Signature-256` is
   `sha256=` + HMAC-SHA256(rawBody, `META_WA_APP_SECRET`). Read the raw body once for the
   HMAC, then `JSON.parse` it for `provider.parseWebhook`.

---

## Step 10 — Verify end-to-end

With `MOCK_DATA=false`:
1. Send a test OTP to an allow-listed number; confirm the WhatsApp arrives.
2. Confirm `wa_messages` rows move `queued → delivered` (proves webhook + signature work).
3. Reply from the phone; confirm an inbound `direction: "in"` row appears.
4. To go beyond test recipients: add and verify a **real phone number** in WhatsApp Manager
   and complete **business verification** for higher send limits.

---

## Open items before go-live

- Resolve the `patient_otp_v1` two-variable mismatch (Step 4a).
- Confirm `patients.phone_e164` is stored with a leading `+` so inbound-reply matching works.
- Move from temporary token → permanent system-user token (Step 2).
- Complete Meta business verification to lift the test-recipient limit and raise messaging tiers.
