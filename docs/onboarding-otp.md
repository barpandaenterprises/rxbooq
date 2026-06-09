# Onboarding OTP — Email-or-Phone Setup

Clinic sign-up (`/get-started`) accepts **either a mobile number or an email**, and verifies a real 6-digit OTP for each:

- **Phone →** delivered over **WhatsApp** via Interakt (`interakt.sendTemplate`).
- **Email →** delivered over **SMTP** (`src/lib/email/send.ts`, nodemailer).

The code is always verified against a stored SHA-256 hash — there is **no bypass**. In dev (`MOCK_DATA=true`) the real
code is shown in the UI and logged, so you can test without a provider.

## Environment

```bash
# WhatsApp (phone OTP)
INTERAKT_API_KEY=...
INTERAKT_WEBHOOK_SECRET=...
ONBOARDING_WA_OTP_TEMPLATE=onboarding_otp_v1   # must match the approved template name

# Email OTP (SMTP)
SMTP_HOST=smtp.yourprovider.com
SMTP_PORT=587                                  # 465 = implicit TLS, else STARTTLS
SMTP_USER=...
SMTP_PASS=...
SMTP_FROM=Rxbooq <no-reply@rxbooq.com>

# Funnel cookie secret (already required)
ONBOARDING_DRAFT_SECRET=<32+ char random>
```

In dev, leave `SMTP_HOST` unset and `MOCK_DATA=true` — emails/WA sends are logged to the server console and the code is
surfaced in the UI.

## WhatsApp OTP template (register in Interakt → Meta)

Phone OTP cannot be delivered in production until this **Authentication-category** template is approved.

- **Name:** `onboarding_otp_v1` (must equal `ONBOARDING_WA_OTP_TEMPLATE`)
- **Category:** Authentication · **Language:** English (`en`)
- **Body:** `Your Rxbooq verification code is {{1}}. It expires in 10 minutes.`
  - One body variable `{{1}}` = the 6-digit code (the app passes `variables: [code]`).
- Meta's Authentication format also adds a **"Copy code" button** automatically — accept the default.

Steps: Interakt console → **Templates → New → Authentication** → fill the body above → submit for Meta approval (usually
minutes). Once approved, set the env vars and point the Interakt webhook at `https://<domain>/api/wa/webhook` with header
`x-webhook-secret: <INTERAKT_WEBHOOK_SECRET>` (already used by appointment messaging).

## SMTP deliverability

Use a real transactional sender (e.g. SES, SendGrid SMTP, Mailgun, or your domain's SMTP). Configure **SPF + DKIM** on the
`SMTP_FROM` domain so codes don't land in spam. The app only needs valid SMTP creds; deliverability is infra-side.

## How it works (for maintainers)

- Tables: `phone_otp_verifications` (now carries `channel` + `contact`) and `clinic_applications` (now carries
  `onboarding_channel` + `onboarding_contact`, the immutable verified identity that keys draft resume). See migration
  `supabase/migrations/0021_onboarding_email_or_phone.sql`.
- Actions: `sendOnboardingOtpAction({channel, contact})` / `verifyOnboardingOtpAction({channel, contact, code})` in
  `src/app/(onboarding)/get-started/actions.ts`.
- The signed draft cookie (`src/lib/onboarding/draft-cookie.ts`) carries `{ draftId, channel, contact }`; legacy phone-only
  cookies still resolve via a back-compat mapping.
- A phone-only sign-up still sets an **email + password** at the final Account step (clinic login is email/password); the
  phone is the OTP gate + draft key. Email sign-ups prefill that login email.
