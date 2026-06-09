# Interakt (WhatsApp) — Setup & Integration Guide

The Interakt integration is **already built** in this codebase. No code is required to go
live — the work is: create an Interakt/WABA account, get templates approved by Meta, set
4 env vars, and point the webhook at the app.

## What already exists

| Piece | Location | Role |
|---|---|---|
| Provider client | `src/lib/wa/interakt.ts` | Calls `https://api.interakt.ai/v1/public/message/`, parses webhooks |
| Send + DB-log helper | `src/lib/wa/send.ts` | `sendWaTemplate` / `sendWaSession`, logs to `wa_messages`, respects opt-out |
| Inbound webhook | `src/app/api/wa/webhook/route.ts` | Delivery/read/failed status + patient replies |
| Patient sign-in OTP | `src/app/api/auth/wa-otp/send/route.ts` | Uses template `patient_otp_v1` |
| Onboarding OTP | `src/app/(onboarding)/get-started/actions.ts` | Uses template `onboarding_otp_v1` |

---

## Step 1 — Interakt account + WABA

1. Sign up at [interakt.shop](https://www.interakt.shop) and complete **WhatsApp Business
   API (WABA)** onboarding via Meta embedded-signup. Requires a Facebook Business Manager
   and a phone number **not** already on a personal/Business WhatsApp app.
2. Get the number **verified and approved** by Meta (display-name review). No template can
   send until this is done.

## Step 2 — Get the API key

Interakt console → **Settings → Developer Setup → API Key**. Copy the **raw** key.

> The code base64-encodes it into a `Basic` auth header (`src/lib/wa/interakt.ts:22-27`).
> Paste the raw key into `INTERAKT_API_KEY` — do **not** pre-encode it.

## Step 3 — Create & get templates approved

Each template must be created in Interakt → **Templates → New** and approved by Meta. The
app references these exact names.

### a) Patient sign-in OTP — `patient_otp_v1` (env `WA_OTP_TEMPLATE_NAME`)
- Send call passes `variables: [code, clinic.name]` → body needs **two** variables:
  `{{1}}` = code, `{{2}}` = clinic name.
- ⚠️ **Mismatch to resolve:** Meta **Authentication**-category templates allow only a
  single `{{1}}` OTP variable (+ auto "Copy code" button) — no second free-text var.
  Pick one:
  - **Option A (recommended):** make it a **Utility** template, e.g.
    `Your {{2}} verification code is {{1}}. It expires in 10 minutes.`
  - **Option B:** make it **Authentication** with one `{{1}}` var, and trim the send call
    at `src/app/api/auth/wa-otp/send/route.ts:117` to a single variable `[code]`.

### b) Clinic onboarding OTP — `onboarding_otp_v1` (env `ONBOARDING_WA_OTP_TEMPLATE`)
- Category **Authentication**, Language `en`, single var `{{1}}` = code.
- Body: `Your Rxbooq verification code is {{1}}. It expires in 10 minutes.`
- Already matches Meta's Authentication format cleanly. (See `docs/onboarding-otp.md`.)

### c) Appointment templates
- Reminder / confirmation templates already used by appointment messaging (names live in
  the `wa_templates` table / admin messaging).

## Step 4 — Set the env vars

In `.env.local` and the production env (`.env.local.example:14-26`):

```bash
INTERAKT_API_KEY=<raw key from Step 2>
INTERAKT_WEBHOOK_SECRET=<a long random string you choose>
WA_OTP_TEMPLATE_NAME=patient_otp_v1
ONBOARDING_WA_OTP_TEMPLATE=onboarding_otp_v1

# Turn OFF mock mode so sends actually hit Interakt
MOCK_DATA=false
```

> **Mock mode:** while `MOCK_DATA=true`, **no real WhatsApp is sent** — the code is echoed
> in the UI/console instead (`src/lib/wa/send.ts:64-67`,
> `src/app/api/auth/wa-otp/send/route.ts:107-109`). That's the intended dev path; flip to
> `false` for live delivery.

## Step 5 — Configure the webhook in Interakt

Interakt console → **Settings → Developer Setup → Webhook**:
- **URL:** `https://<your-domain>/api/wa/webhook`
- **Custom header:** `x-webhook-secret: <INTERAKT_WEBHOOK_SECRET>` (same value as the env var)

> The handler also accepts the secret via `x-interakt-secret`, a `Bearer` authorization
> header, or a `?token=` query param (`src/app/api/wa/webhook/route.ts:16-28`). If Interakt
> won't let you set a custom header, append `?token=<secret>` to the URL instead.

This webhook drives delivery-status updates in `/admin/messages` and auto-confirms
appointments when a patient replies "YES"/"1".

## Step 6 — Verify end-to-end

With `MOCK_DATA=false` and a real number on file:
1. Trigger a patient OTP and confirm the WhatsApp arrives.
2. Check `wa_messages` rows move `queued → delivered` (proves webhook + secret work).
3. Reply from the phone and confirm an inbound `direction: "in"` row appears.

---

## Open item before go-live

`patient_otp_v1` send passes **two** variables (`[code, clinic.name]`) at
`src/app/api/auth/wa-otp/send/route.ts:117`, but Meta **Authentication** templates support
only the single OTP variable. Resolve via Step 3a (Option A or B) before going live.
