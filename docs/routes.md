# Routes & Links — Developer Reference

A map of every page URL in Rxbooq, grouped by audience: **superadmin**, **clinic admin**, and **public**. Use it to find where to link, what a route renders, and who can reach it.

> Routes are defined under `src/app/`. Clinic-scoped routes live in the `(clinic-app)/[clinicSlug]/…` tree; platform routes in `(super-admin)/…`; public/marketing in the root and `(onboarding)`/`(patient)` groups.

---

## Routing model (read first)

**Base URL** — local dev: `http://localhost:3000` · production: `https://rxbooq.com`.

**Tenant (clinic) resolution** — middleware (`src/middleware.ts`) resolves the active clinic three ways (left wins):

1. **URL path** — `/{clinicSlug}/…` (e.g. `/panda/admin/today`). The canonical form everywhere.
2. **Subdomain** (production) — `panda.rxbooq.com/admin/today` is internally rewritten to `/panda/admin/today`; the browser keeps the clean subdomain URL.
3. **`?clinic={slug}` (dev only, on apex)** — `localhost:3000/book?clinic=panda` acts like the subdomain. Handy because `localhost` has no subdomains.

So a clinic-scoped link is either `/{slug}/…` **or** the bare path on the clinic's subdomain — they render the same route.

**Auth gates** (middleware):

- `/{slug}/admin/**` → requires a signed-in **member of that clinic** (else redirect to `/login?next=…`). Role within the clinic further gates individual screens/actions — see [permissions.md](permissions.md).
- `/superadmin/**` → requires a signed-in **superadmin** (`raw_app_meta_data.role = 'superadmin'`).
- Everything else is **public** (no session required).

**Reserved slugs** — `admin`, `api`, `auth`, `book`, `d`, `get-started`, `login`, `logout`, `me`, `pricing`, `superadmin`, … (`src/lib/routing/reserved-slugs.ts`). A clinic can never take one of these as its slug.

**Where login lands you** (`src/app/(auth)/login/actions.ts`): clinic staff → `/{firstSlug}/admin/today` · superadmin → `/superadmin/clinics`.

---

## Superadmin pages

Platform-staff only. Base: `/superadmin`. (There is no bare `/superadmin` index — login lands on **Clinics**.)

| URL | Purpose | Source |
|---|---|---|
| `/superadmin/clinics` | All clinics across tenants; manage status/plan | `(super-admin)/superadmin/clinics/page.tsx` |
| `/superadmin/clinics/new` | Provision a new clinic | `…/clinics/new/page.tsx` |
| `/superadmin/applications` | Incoming clinic sign-up applications | `…/applications/page.tsx` |
| `/superadmin/verifications` | Clinic verification review queue | `…/verifications/page.tsx` |
| `/superadmin/subscriptions` | Subscriptions across all clinics | `…/subscriptions/page.tsx` |
| `/superadmin/plans` | Subscription plans catalog | `…/plans/page.tsx` |
| `/superadmin/plans/new` | Create a plan | `…/plans/new/page.tsx` |
| `/superadmin/plans/{id}/edit` | Edit a plan | `…/plans/[id]/edit/page.tsx` |
| `/superadmin/coupons` | Coupons list | `…/coupons/page.tsx` |
| `/superadmin/coupons/new` | Create a coupon | `…/coupons/new/page.tsx` |
| `/superadmin/billing/sync-plans` | Sync plans to the billing provider | `…/billing/sync-plans/page.tsx` |

---

## Clinic admin pages

Signed-in clinic staff only. Base: `/{clinicSlug}/admin` (or the same path on the clinic's subdomain). The **Role** column shows who sees full data; `doctor` logins are scoped to their own data — see [permissions.md](permissions.md).

| URL | Purpose | Role | Source |
|---|---|---|---|
| `/{slug}/admin/today` | Today's schedule + KPIs (default landing) | all (doctor: own) | `…/admin/today/page.tsx` |
| `/{slug}/admin/calendar` | Weekly calendar | all (doctor: own) | `…/admin/calendar/page.tsx` |
| `/{slug}/admin/patients` | Patient list | all (doctor: assigned/seen) | `…/admin/patients/page.tsx` |
| `/{slug}/admin/patients/{id}` | Patient chart (visits, Rx, files) | all (doctor: own access) | `…/admin/patients/[id]/page.tsx` |
| `/{slug}/admin/doctors` | Doctor roster | all (doctor: read-only) | `…/admin/doctors/page.tsx` |
| `/{slug}/admin/doctors/{id}` | Doctor profile / schedule | all (doctor: read-only) | `…/admin/doctors/[id]/page.tsx` |
| `/{slug}/admin/messages` | WhatsApp inbox | all (doctor: read-only, own patients) | `…/admin/messages/page.tsx` |
| `/{slug}/admin/analytics` | Clinic analytics | all (doctor: self-only) | `…/admin/analytics/page.tsx` |
| `/{slug}/admin/settings/team` | Team / staff logins | **clinic_admin** | `…/admin/settings/team/page.tsx` |
| `/{slug}/admin/settings/departments` | Departments | **clinic_admin** | `…/admin/settings/departments/page.tsx` |
| `/{slug}/admin/settings/billing` | Subscription & billing | **clinic_admin** | `…/admin/settings/billing/page.tsx` |

> Settings is a tabbed area (`SettingsTabs`) — `team`, `departments` (billing is reachable directly). The sidebar hides **Settings** entirely for `doctor` logins.

---

## Public pages

No login required.

### Marketing / platform

| URL | Purpose | Source |
|---|---|---|
| `/` | Marketing home / clinic discovery | `app/page.tsx` |
| `/pricing` | Pricing | `app/pricing/page.tsx` |
| `/book` | "Pick a clinic to book with" (apex landing; lists clinics) | `app/book/page.tsx` |

### Per-clinic public

| URL | Purpose | Source |
|---|---|---|
| `/{slug}` | Clinic public profile | `(clinic-app)/[clinicSlug]/page.tsx` |
| `/{slug}/book` | Booking flow (by doctor or department) | `…/[clinicSlug]/book/page.tsx` |
| `/{slug}/book/quick` | Quick-book variant | `…/book/quick/page.tsx` |
| `/{slug}/book/success` | Booking confirmation | `…/book/success/page.tsx` |
| `/d/{slug}` | **Legacy** profile URL → 308-redirects to `/{slug}` | `app/d/[clinicSlug]/page.tsx` |

Dev tip: hit a clinic's public pages on apex with `?clinic={slug}`, e.g. `localhost:3000/book?clinic=panda`.

### Patient portal (WhatsApp-OTP login)

| URL | Purpose | Source |
|---|---|---|
| `/me/login` | Patient OTP login | `(patient)/me/login/page.tsx` |
| `/me/appointments` | Patient's own appointments | `(patient)/me/appointments/page.tsx` |

### Onboarding (clinic sign-up)

| URL | Purpose | Source |
|---|---|---|
| `/get-started` | Start a clinic application | `(onboarding)/get-started/page.tsx` |
| `/get-started/{draftId}` | Resume a specific draft | `…/get-started/[draftId]/page.tsx` |
| `/get-started/resume` | Find / resume an in-progress draft | `…/get-started/resume/page.tsx` |

### Auth

| URL | Purpose | Source |
|---|---|---|
| `/login` | Staff / admin sign-in | `(auth)/login/page.tsx` |
| `/logout` | Sign out (route handler) | `(auth)/logout/route.ts` |
| `/auth/callback` | Supabase auth callback | `app/auth/callback/route.ts` |

---

## API & webhook routes

Not user-facing; called by clients, providers, or cron. Excluded from Supabase session-refresh middleware (`api/webhooks/`, `api/cron/`, `api/health`).

| URL | Purpose | Source |
|---|---|---|
| `POST /api/auth/wa-otp/send` · `…/verify` | Patient WhatsApp OTP login | `api/auth/wa-otp/*/route.ts` |
| `POST /api/wa/webhook` | Inbound WhatsApp provider webhook | `api/wa/webhook/route.ts` |
| `POST /api/webhooks/razorpay` | Razorpay payment webhook | `api/webhooks/razorpay/route.ts` |
| `GET /api/cron/expire-trials` | Daily trial-expiry job | `api/cron/expire-trials/route.ts` |
| `GET /api/cron/reminders` | Appointment-reminder job | `api/cron/reminders/route.ts` |
| `GET /api/health` | Health check | `api/health/route.ts` |
