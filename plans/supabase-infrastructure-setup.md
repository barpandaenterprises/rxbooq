# Doctor Kart — Supabase Infrastructure Plan

## Context

The Doctor Kart codebase already has a draft Supabase schema (`supabase/migrations/0001_initial_schema.sql`, `0002_rls_policies.sql`) covering 13 tables for multi-tenant clinic operations, plus mock TypeScript data in `src/lib/doctors-data.ts` and `src/lib/patient-history-data.ts` that models clinical records the schema does **not** yet have (visit notes, prescriptions, attachments, tooth treatments, medical history).

We now have a fresh Supabase cloud project ready. This plan stands up the full database, RLS, storage, and authentication infrastructure end-to-end so phase 2 can wire components to live data. Scope is **infrastructure only** — no component rewires, no auth UI build.

**User-confirmed decisions driving this plan:**
- Consolidate existing 0001 + 0002 into fresh migrations; reset the cloud project (data loss accepted).
- Auth — clinic staff (email/password + magic link) **and** patient OTP **via WhatsApp using Interakt** (custom flow, not Supabase's native phone provider).
- Super-admin role kept in RLS; super-admin users created manually (no UI now).
- Storage — **two buckets**: private `clinic-files` for medical files + public `public-assets` for clinic logos and doctor photos.
- Do not wire mock data files to live queries — that's phase 2.

---

## Strategy: three clean migrations, one seed file

Drop the existing two migrations and replace with:

| File | Purpose |
|---|---|
| `supabase/migrations/0001_schema.sql` | Extensions, all tables (existing + 6 new clinical-records + patient_users), indexes, FKs, check constraints, updated_at triggers |
| `supabase/migrations/0002_rls.sql` | Helpers (`current_clinic_id`, `current_role`, `current_patient_id`, `is_super_admin`), RLS enable, generic policy generator extended, patient self-access policies |
| `supabase/migrations/0003_storage_and_auth.sql` | Storage buckets, storage RLS on `storage.objects`, custom-access-token JWT hook function + grants |

Apply with `supabase db reset --linked` after deleting the two old files. Seed in `supabase/seed.sql` re-authored to populate 2 demo clinics with the 5 doctors and 4 patient charts ported from mock files.

---

## A. Schema (`0001_schema.sql`)

### A.1 Carryover from existing 0001
Keep all 13 tables as-is: `clinics`, `clinic_users`, `doctors`, `patients`, `services`, `doctor_availability`, `availability_overrides`, `appointments`, `clinic_slot_locks`, `wa_templates`, `wa_messages`, `audit_logs`, plus the `touch_updated_at()` trigger function and triggers on `clinics` + `appointments`.

### A.2 Modifications to `patients`
Add columns (drop avatar/initials — those are UI-only):
```sql
date_of_birth   date,
gender          text check (gender in ('M','F','O')),
tags            text[] not null default '{}',
```
Age is derived from `date_of_birth` in the UI; `verified` is already covered by `phone_verified`; `registered_on` is already covered by `created_at`.

### A.3 New clinical-records tables

- **`visit_notes`** — chief_complaint, exam_findings, diagnosis, treatment_done, next_visit_advice; FK to `appointments` (nullable, set null on delete), `patients` (cascade), `clinic_users` for created_by. Indexes on `(clinic_id, patient_id, visit_date desc)` and `appointment_id`.
- **`prescriptions`** — `source` enum check `('handwritten','template','manual')`, `source_photo_id uuid` (FK to `visit_attachments` added with `alter table` after the attachments table is created — circular ref), `template_id text`, `ocr_confidence numeric(3,2)` checked `between 0 and 1`, `notes`, `created_by`. Indexes on `(clinic_id, patient_id, created_at desc)` and `appointment_id`.
- **`prescription_items`** — `prescription_id` (cascade), `position int`, `medication`, `dosage`, `frequency`, `duration`, `instructions`, `unique (prescription_id, position)`. No `clinic_id` column (joined through prescriptions for RLS).
- **`visit_attachments`** — `kind` enum check `('xray','prescription_pdf','treatment_plan','receipt','lab_report','consent','other')`, `file_name`, `file_size_bytes bigint`, `mime_type`, `storage_path text not null` (the path inside the Storage bucket), `notes`, `created_by`. Indexes on `(clinic_id, patient_id, created_at desc)`, `appointment_id`, and `(clinic_id, kind)`.
- **`visit_tooth_treatments`** — `tooth_fdi int check (between 11 and 48)`, `surface`, `procedure`, `notes`. Indexes on `appointment_id` and `(clinic_id, patient_id)`.
- **`medical_history`** — PK is `patient_id` (one row per patient), `blood_thinners boolean`, `conditions text[]`, `current_medications jsonb` (array of `{name, dosage}`), `allergies jsonb` (array of `{name, severity, notes}`), `dental_history_notes text`, `updated_at`. Trigger to bump `updated_at`.

### A.4 New patient-self-service identity table
- **`patient_users`** — maps `auth.users(id)` (PK) to a `patient_id` + `clinic_id` + `phone_e164`. Used by the JWT hook to inject `patient_id` into the access token. `unique (clinic_id, patient_id)`.

### A.5 New OTP store (for WhatsApp OTP custom flow)
- **`otp_codes`** — stores hashed OTP codes for the patient WhatsApp auth flow.
  - Columns: `id uuid pk`, `clinic_id uuid not null fk → clinics`, `phone_e164 text not null`, `code_hash text not null` (SHA-256 of the OTP), `purpose text not null default 'patient_signin'`, `attempts int not null default 0`, `consumed_at timestamptz`, `expires_at timestamptz not null`, `created_at timestamptz not null default now()`.
  - Index on `(clinic_id, phone_e164, created_at desc)` for the latest-OTP lookup.
  - RLS: deny all to authenticated/anon; service-role-only access (the send/verify endpoints use `serviceClient()`).

### A.6 New updated_at triggers
Add for `visit_notes` and `medical_history`. Other new tables are append-only conceptually (no `updated_at` column).

---

## B. RLS (`0002_rls.sql`)

### B.1 Helpers
Keep existing `current_clinic_id()`, `current_role()`, `is_super_admin()`. Add:
```sql
create or replace function public.current_patient_id() returns uuid
language sql stable as $$
  select coalesce(
    nullif(current_setting('request.jwt.claim.patient_id', true), '')::uuid,
    nullif((current_setting('request.jwt.claims', true)::jsonb ->> 'patient_id'), '')::uuid
  )
$$;
```

### B.2 Enable RLS on new tables
`visit_notes`, `prescriptions`, `prescription_items`, `visit_attachments`, `visit_tooth_treatments`, `medical_history`, `patient_users`, `otp_codes`.

`otp_codes` gets no public policy — RLS enabled with **no policies** means only the service role can touch it.

### B.3 Extend the generic policy generator
Add the new clinic-scoped tables to the `scoped_tables` array (everything except `prescription_items`):
```
visit_notes, prescriptions, visit_attachments,
visit_tooth_treatments, medical_history, patient_users
```

### B.4 Special-case: `prescription_items`
No `clinic_id` column — gate via join:
```sql
create policy prescription_items_tenant_all on public.prescription_items
  for all using (
    exists (
      select 1 from public.prescriptions p
      where p.id = prescription_items.prescription_id
        and (p.clinic_id = public.current_clinic_id() or public.is_super_admin())
    )
  ) with check (...same...);
```

### B.5 Patient self-access policies
Add now (additive — they OR with the tenant policies so staff access is unaffected):
- `patients_self_select` — `id = current_patient_id()`
- `appointments_patient_self_select`, `visit_notes_patient_self_select`, `prescriptions_patient_self_select`, `prescription_items_patient_self_select` (via join), `visit_attachments_patient_self_select` — `patient_id = current_patient_id()`
- `patient_users_self` — `auth_user_id = auth.uid()`

### B.6 Carryover
Keep `clinics_select`, `clinics_super_admin_all`, `wa_templates_select`, `wa_templates_super_admin_write` from current 0002.

---

## C. Storage (`0003_storage_and_auth.sql` part 1)

### C.1 Buckets — two buckets (locked in)

| Bucket | Visibility | Use | Size cap | MIME |
|---|---|---|---|---|
| `clinic-files` | private | xrays, rx photos, treatment plans, receipts, lab reports, consent forms | 25 MiB | jpeg/png/webp/heic/pdf |
| `public-assets` | public | clinic logos, doctor photos rendered on public marketing pages | 5 MiB | jpeg/png/webp/svg |

Two buckets so public marketing pages don't need signed URLs for logos/photos, and so the private bucket has a smaller leak surface.

### C.2 Path convention
`clinics/{clinic_id}/{kind}/{file_id}.{ext}` — `clinic_id` is always the second segment so RLS uses `split_part(name, '/', 2)::uuid`.

### C.3 RLS on `storage.objects`
- `clinic_files_staff_select/insert/update/delete` — `bucket_id = 'clinic-files'` and `split_part(name, '/', 2)::uuid = current_clinic_id()` or `is_super_admin()`. Insert additionally requires `split_part(name, '/', 1) = 'clinics'` to enforce the path convention.
- `clinic_files_patient_self_select` — patient can read their own files via `exists (... from visit_attachments where storage_path = name and patient_id = current_patient_id())`.
- `public_assets_anon_select` — anon + authenticated read on `bucket_id = 'public-assets'`.
- `public_assets_staff_write/update/delete` — same clinic-scoped path check as private bucket.

### C.4 Bucket creation
Idempotent `insert into storage.buckets ... on conflict (id) do nothing` with size + MIME caps.

---

## D. Auth — clinic staff (`0003_storage_and_auth.sql` part 2 + dashboard)

### D.1 Dashboard config (manual, documented in SETUP.md)
1. Authentication → Providers → **Email**: enable. Disable open signup (invite-only).
2. Authentication → URL Configuration: site URL + redirect URLs include `/auth/callback`.
3. Authentication → Providers → **Phone**: leave disabled (we use Interakt WhatsApp custom flow, not Supabase's native phone provider).
4. Authentication → Hooks → **Custom Access Token**: select `public.custom_access_token_hook`, enable.

### D.2 Custom-access-token JWT hook (SQL in migration)
A `stable plpgsql` function `public.custom_access_token_hook(event jsonb) returns jsonb` that:
- Reads `event ->> 'user_id'`.
- If the user has `raw_app_meta_data->>'role' = 'superadmin'` → inject `role = 'superadmin'`.
- If a `clinic_users` row exists for the user → inject `clinic_id` + `role`.
- If a `patient_users` row exists for the user → inject `clinic_id` + `patient_id` + `role = 'patient'`.
- Returns `{ "claims": <merged> }`.

Grants required for Supabase to call it:
```sql
grant usage on schema public to supabase_auth_admin;
grant execute on function public.custom_access_token_hook(jsonb) to supabase_auth_admin;
grant select on public.clinic_users, public.patient_users to supabase_auth_admin;
revoke execute on function public.custom_access_token_hook(jsonb) from authenticated, anon, public;
```

### D.3 Invite flow (out of scope — contract only)
Future file `src/lib/auth/invite-clinic-user.ts`:
- Signature: `inviteClinicUser({ email, role, displayName, phone? })`.
- Implementation: assert caller is `clinic_admin`, call `serviceClient().auth.admin.inviteUserByEmail(email)`, then insert into `clinic_users` keyed by the returned `auth.users.id`. Rollback the auth user on insert failure.

Super-admin: created manually in Dashboard → Users → add user, then SQL editor: `update auth.users set raw_app_meta_data = jsonb_set(coalesce(raw_app_meta_data,'{}'), '{role}', '"superadmin"') where id = '...';`

### D.4 Sign-in UI paths (out of scope — call out only)
- `src/app/(auth)/login/page.tsx`
- `src/app/auth/callback/route.ts`
- `src/app/(auth)/logout/route.ts`
- Middleware `src/middleware.ts` will need to also refresh sessions and gate `/admin/*` and `/me/*`. Today's middleware stays untouched in this phase.

---

## E. Auth — patient OTP via WhatsApp (Interakt, custom flow)

Supabase Auth's native phone provider only sends SMS, so the WhatsApp path is a **custom flow** that uses Supabase Auth for the session/JWT layer but our own code for OTP generation and delivery via Interakt's existing integration (`src/lib/wa/interakt.ts`).

### E.1 Components

| Piece | Where |
|---|---|
| OTP store | `otp_codes` table (Section A.5) |
| Send endpoint | `src/app/api/auth/wa-otp/send/route.ts` (new) |
| Verify endpoint | `src/app/api/auth/wa-otp/verify/route.ts` (new) |
| WhatsApp template | `patient_otp_v1` registered in `wa_templates` (variables: `code`, `clinic_name`) — approved with Meta/Interakt |
| Sign-in page | `src/app/(patient)/me/login/page.tsx` (phase 2 UI work, not built now — endpoints will be ready) |

### E.2 Prerequisites for the custom flow to issue Supabase sessions

To create an authenticated Supabase session for a phone number without going through Supabase's built-in OTP send, the verify endpoint will:

1. `serviceClient().auth.admin.listUsers()` filtered by phone — or use a small `phone → auth.users.id` cache table.
2. If user doesn't exist, `serviceClient().auth.admin.createUser({ phone, phone_confirm: true })`.
3. `serviceClient().auth.admin.generateLink({ type: 'magiclink', email: <synthetic> })` is **not** ideal for phone-only users. Use instead: `auth.admin.generateLink({ type: 'magiclink' })` with the phone-only user requires an email, which we don't have.

**Cleanest production approach** — sign-in token issuance via `auth.admin.signInWithUserId` is **not** an exposed API. Two viable paths:

- **Path A (recommended): synthetic email per auth.users row.** When creating the auth.users row for a patient, attach a synthetic email `phone-<phone_no_plus>@otp.local` (configurable suffix). The verify endpoint then calls `serviceClient().auth.admin.generateLink({ type: 'magiclink', email })` — returns a magic-link URL containing a one-time `token_hash`. The endpoint redirects the browser to `/auth/callback?token_hash=...&type=magiclink`, where `@supabase/ssr` exchanges it for a real session cookie. This is the supported pattern for admin-driven sign-in.

- **Path B: use Supabase's phone-OTP under the hood with a "we already sent it" shortcut.** Not actually supported — Supabase will try to send a real SMS. Skip this path.

Go with **Path A**. Document in code the synthetic-email convention so it's discoverable.

### E.3 Send-OTP flow (server)
`POST /api/auth/wa-otp/send` body: `{ phone_e164: string }`. Resolve `clinic_id` from middleware-set `x-clinic-id` header.

```
1. Validate phone (libphonenumber-js).
2. Look up patients row by (clinic_id, phone_e164). If none: respond 404 "phone not on file — ask reception."
3. Rate-limit: count otp_codes rows for (clinic_id, phone_e164) in last 60s. > 1 → 429.
4. Generate 6-digit code (crypto.randomInt). Hash with SHA-256.
5. Insert into otp_codes: (clinic_id, phone_e164, code_hash, purpose='patient_signin', expires_at=now()+10min).
6. Call interakt.sendTemplateMessage('patient_otp_v1', phone_e164, { code, clinic_name }).
7. Log to wa_messages with template_name + direction='out'.
8. Respond 202 { sent: true }.
```

### E.4 Verify-OTP flow (server)
`POST /api/auth/wa-otp/verify` body: `{ phone_e164: string, code: string }`.

```
1. Resolve clinic_id from x-clinic-id header.
2. Fetch latest non-consumed, non-expired otp_codes row for (clinic_id, phone_e164).
3. Compare SHA-256(code) === code_hash. Increment attempts; if attempts > 5, expire the row and 429.
4. Mark consumed_at = now() on match.
5. Look up patient row (clinic_id, phone_e164).
6. Find-or-create auth user:
     a. Search auth.users by synthetic email phone-{phone}@otp.local.
     b. If absent: serviceClient().auth.admin.createUser({ email, phone, phone_confirm: true, email_confirm: true }).
7. Upsert patient_users(auth_user_id, patient_id, clinic_id, phone_e164) — REPLACE on conflict, so re-signing into a different clinic switches the mapping.
8. Issue session: serviceClient().auth.admin.generateLink({ type: 'magiclink', email: synthetic_email }) → returns { properties: { hashed_token, ... } }.
9. Respond 200 { redirect: '/auth/callback?token_hash=…&type=magiclink&next=/me/appointments' } so the browser exchanges the token for a cookie session.
10. /auth/callback runs through @supabase/ssr's exchangeCodeForSession (handled by the standard Next.js Supabase callback handler).
```

After step 9 the browser has a real Supabase session, the access token carries `patient_id` + `clinic_id` claims via the JWT hook, and RLS unlocks `/me/appointments`.

### E.5 Multi-tenant phone collision
Same phone can be a patient at multiple clinics, but the auth.users row is **shared** (one synthetic email per phone). The `patient_users` mapping is **per-auth-user, single row** — re-signing at a different clinic replaces the mapping. JWT carries the currently active clinic_id only. Document this trade-off in code comments; if cross-clinic switching becomes a UX issue later, change `patient_users` PK to `(auth_user_id, clinic_id)` and select the right row in the JWT hook based on a session-time clinic hint (requires custom hook input — adds complexity).

### E.6 Future fallback: SMS via MSG91
If WhatsApp delivery fails or patient hasn't opted in, fall back to SMS. Reuse the same `otp_codes` table and verify endpoint; only the send endpoint switches provider (MSG91 HTTP call instead of Interakt). Out of scope for phase 1; flagged here as a clean extension point.

### E.7 WhatsApp template registration
Before the flow works in production, add a row to `wa_templates`:
```sql
insert into wa_templates (name, language, variables, status)
values ('patient_otp_v1', 'en', '{code,clinic_name}', 'approved'),
       ('patient_otp_v1', 'hi', '{code,clinic_name}', 'approved'),
       ('patient_otp_v1', 'or', '{code,clinic_name}', 'approved');
```
The actual template body is registered with Meta/Interakt console (not in our DB). Seed the row so the app knows the template name is approved.

---

## F. Seed data (`supabase/seed.sql` rewrite)

Port both demo clinics end-to-end so Supabase Studio shows a realistic dataset:

1. Clinics: keep `mahakur` + `democlinic` (existing UUIDs).
2. Doctors: port the 5 from `src/lib/doctors-data.ts` under `mahakur` with fixed UUIDs.
3. Doctor availability: translate each `WeeklySchedule` into rows (`mon→1, tue→2, … sun→0`), one per (weekday, time-range).
4. Services: existing 4 mahakur services + ensure the codes referenced by doctors (`rct, imp, gen, wht, brc, kid`) exist as `services` rows.
5. Patients: port the 4 from `patient-history-data.ts` — compute `date_of_birth = 2026 − age` (placeholder), strip spaces from phones, port `tags`, `language`, `whatsapp_opt_in`, `phone_verified` from `verified`, `created_at` from `registeredOn`. Maintain a UUID map in seed comments since source IDs (`P-1284`) are not UUIDs.
6. Medical history: 3 records (P-1284, P-1265, P-1273) as `medical_history` rows; `allergies` and `current_medications` as jsonb arrays.
7. Appointments: port `VISITS_BY_PATIENT` entries with `status = 'completed'`, `starts_at = date + '11:00:00+05:30'` placeholder.
8. Visit notes: one row per visit with a `note` block.
9. Prescriptions + prescription_items: port each Rx + its items. `source = 'manual'` for seeded data.
10. Visit attachments: port file metadata. `storage_path = 'clinics/{clinic_id}/{kind}/seed-{id}.{ext}'` synthetic — row exists for joins/RLS testing; no real file uploaded.
11. Visit tooth treatments: port from VISITS.
12. wa_templates: keep existing 6.
13. wa_messages: optional 1–2 rows from `COMMS_BY_PATIENT` for end-to-end testing.

**Note:** `clinic_users` is left empty in seed — Supabase Auth users can't be created via SQL. Developer adds one via Dashboard then SQL-inserts the `clinic_users` row to test RLS as that user.

---

## G. Type generation

After `supabase db reset --linked` completes:
```bash
npm run db:types
```
Runs `supabase gen types typescript --linked > src/lib/supabase/database.types.ts`. The placeholder is replaced with real types for all tables. Run `npm run typecheck` afterward — should be clean since no live queries are wired.

---

## H. Environment variables (`.env.local.example` update)

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# WhatsApp / Interakt — used for patient OTP custom flow and clinic comms
INTERAKT_API_KEY=
INTERAKT_WEBHOOK_SECRET=
# WhatsApp template name approved for OTP delivery (variables: code, clinic_name)
WA_OTP_TEMPLATE_NAME=patient_otp_v1
# Synthetic-email suffix for phone-only auth users (E.2 path A)
OTP_AUTH_EMAIL_SUFFIX=otp.local

# Misc
CRON_SECRET=
```

Real values go into `.env.local`. No SMS-provider keys are needed for phase 1 since OTP delivery is WhatsApp-only via Interakt.

---

## I. Execution sequence

1. Delete `supabase/migrations/0001_initial_schema.sql` and `supabase/migrations/0002_rls_policies.sql`.
2. Write `0001_schema.sql`, `0002_rls.sql`, `0003_storage_and_auth.sql`.
3. Re-author `supabase/seed.sql` per Section F (include `wa_templates` rows for `patient_otp_v1`).
4. Update `.env.local.example` with Interakt + OTP env vars.
5. `supabase db reset --linked` (confirms wiping cloud public schema).
6. `npm run db:types` to regenerate types.
6a. Build the two OTP API routes (`src/app/api/auth/wa-otp/{send,verify}/route.ts`) — server-side only, no UI dependency.
7. Dashboard manual steps:
   - Email provider on, signup off.
   - Phone provider stays off (custom WhatsApp flow handles OTP).
   - Custom Access Token hook registered to `public.custom_access_token_hook`.
   - URL config set (include `/auth/callback`).
   - Optional: create one super-admin via dashboard + SQL meta-update.
   - Register WhatsApp template `patient_otp_v1` (en/hi/or) in Interakt console; insert matching rows in `wa_templates` (already seeded).
8. Update `SETUP.md` with the new dashboard steps and SMS provider choice.
9. Update `.env.local` with the project's real keys.
10. `npm run typecheck` — expect clean.
11. `npm run dev` — smoke test tenant routing.
12. (Phase 2, out of scope) build auth UI pages and wire components.

---

## J. Verification

1. **Tenant isolation — staff**: create alice (mahakur clinic_admin) + bob (democlinic clinic_admin), confirm in Studio "Run as authenticated user" that each sees only their clinic's rows.
2. **Super-admin override**: flip alice to superadmin in `raw_app_meta_data`, force token refresh, alice now sees both clinics.
3. **Patient OTP smoke (manual until UI exists)**: use Postman or `curl` against `/api/auth/wa-otp/send` with a seeded patient's phone → confirm Interakt delivered the WhatsApp message and a row appeared in `otp_codes` + `wa_messages`. Then call `/api/auth/wa-otp/verify` with the received code → expect a redirect URL; follow it in a browser → land authenticated. Studio query as that user returns only that patient's appointments.
4. **Storage isolation**: service-role upload to `clinics/<mahakur-id>/xray/test.jpg`, GET with mahakur staff JWT → 200, GET with democlinic staff JWT → 403. Public bucket: anonymous GET on a `public-assets` path → 200.
5. **Types**: `npm run db:types` regenerates cleanly; `npm run typecheck` passes; grep generated file for all 7 new table names.
6. **JWT hook**: sign in any clinic_user, decode access token, confirm `clinic_id` and `role` claims appear at top level.

---

## K. Critical files

- `c:\Desktop\Healthcare\doctorkart\supabase\migrations\0001_schema.sql` — **NEW** (replaces existing 0001; includes the 6 clinical-records tables, `patient_users`, and `otp_codes`)
- `c:\Desktop\Healthcare\doctorkart\supabase\migrations\0002_rls.sql` — **NEW** (replaces existing 0002)
- `c:\Desktop\Healthcare\doctorkart\supabase\migrations\0003_storage_and_auth.sql` — **NEW** (two buckets + storage RLS + JWT hook)
- `c:\Desktop\Healthcare\doctorkart\supabase\seed.sql` — **UPDATED end-to-end** (includes `wa_templates` rows for `patient_otp_v1`)
- `c:\Desktop\Healthcare\doctorkart\src\app\api\auth\wa-otp\send\route.ts` — **NEW** (Interakt OTP send endpoint)
- `c:\Desktop\Healthcare\doctorkart\src\app\api\auth\wa-otp\verify\route.ts` — **NEW** (verify + admin session issuance)
- `c:\Desktop\Healthcare\doctorkart\src\lib\supabase\database.types.ts` — **REGENERATED** via `npm run db:types`
- `c:\Desktop\Healthcare\doctorkart\.env.local.example` — **UPDATED** (Interakt + OTP env vars; no SMS keys)
- `c:\Desktop\Healthcare\doctorkart\SETUP.md` — **UPDATED** with dashboard steps and Interakt template registration
