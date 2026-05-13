# Doctor Kart — Setup Guide

Step-by-step from clone to running locally with the Mahakur tenant rendered.

---

## 1. Install dependencies

```bash
cd doctorkart
npm install
```

This pulls Next.js 16, React 19, Tailwind, shadcn dependencies, Supabase SSR, TanStack Table, AG Grid, Recharts, next-intl, and the rest of the dev tooling. Storybook is added later via `npx storybook@latest init` once the first component exists — that command auto-detects Next 16 and pulls compatible versions.

## 2. Fonts — already handled

Poppins is loaded via `next/font/google` (`src/app/fonts.ts`). Next.js downloads the woff2 files at **build time** and serves them from your own server — no runtime request to Google, still DPDP-clean. There's nothing for you to do here.

If you ever need to fully air-gap (zero build-time external calls too), switch `fonts.ts` back to `next/font/local` and drop the five Poppins woff2 files into `src/app/fonts/`. Not needed for v1.

## 3. Bootstrap shadcn/ui

The base config (`components.json`) is already in place. Pull in the primitives we'll use across the app:

```bash
npx shadcn-ui@latest add button input label select dialog sheet tabs badge avatar tooltip card dropdown-menu command popover form
```

Each command writes a file to `src/components/ui/`. Don't edit those by hand — re-running `add` would overwrite changes.

## 4. Set up Supabase

### Option A — Cloud project (recommended for shared dev)

1. Create a project at https://supabase.com.
2. Region: **Mumbai** (DPDP friendly).
3. From Project Settings → API copy `Project URL`, `anon` key, and `service_role` key into `.env.local`.

```bash
cp .env.local.example .env.local
# then fill in NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
```

4. Link the CLI and apply migrations + seed:

```bash
supabase login
supabase link --project-ref <your-project-ref>
supabase db push                     # applies supabase/migrations/*
psql "$DATABASE_URL" -f supabase/seed.sql   # or use the SQL editor in Supabase Studio
```

### Option B — Local Supabase via the CLI

```bash
supabase start                       # boots Postgres + Auth + Storage in Docker
supabase db reset                    # applies migrations + seed
```

The CLI prints local `anon` and `service_role` keys; copy them into `.env.local`.

### What the migrations create

| File | Adds |
|---|---|
| `0001_initial_schema.sql` | Clinics, doctors, patients, services, scheduling, WhatsApp messaging, audit |
| `0002_rls_policies.sql` | Tenant-isolation RLS + helper functions (JWT-claim based, replaced in 0006) |
| `0003_schema_additions.sql` | Clinical records (visit notes, prescriptions + items, attachments, tooth treatments, medical history), `patient_users`, `otp_codes`, demographic columns on `patients` |
| `0004_rls_additions.sql` | RLS for the new clinical-records tables + patient self-access policies + `current_patient_id()` helper |
| `0005_storage.sql` | Two Storage buckets (`clinic-files` private, `public-assets` public) + path-scoped RLS on `storage.objects` |
| `0006_simple_auth.sql` | Rewrites the RLS helpers as `security definer` DB lookups — no JWT custom-claims hook needed |

## 5. Generate types

After the schema is applied:

```bash
npm run db:types
```

This regenerates `src/lib/supabase/database.types.ts` from your live schema. Re-run it any time you change a migration.

## 5a. Authentication setup

The current "simple auth" path uses Supabase Auth's email provider with no custom JWT hook — the RLS helpers (`current_clinic_id`, `current_role`, `is_super_admin`, `current_patient_id`) look up identity directly from `clinic_users` / `patient_users` / `auth.users` via `security definer` functions.

In the **Supabase Dashboard**:

1. **Authentication → Providers → Email**: enable. Disable open signup (clinic staff are invite-only).
2. **Authentication → URL Configuration**: site URL `http://localhost:3000` for dev (later `https://*.doctorkart.in`); redirect URLs include `/auth/callback`.
3. **Authentication → Providers → Phone**: leave disabled — the patient OTP flow goes through a custom Interakt WhatsApp endpoint, not Supabase's native phone provider.
4. **Authentication → Hooks**: **no hook needed**. Skip this section.

### Bootstrap the first super-admin

Create the user in **Authentication → Users → Add user** (email + password), then in the SQL editor:

```sql
update auth.users
   set raw_app_meta_data = jsonb_set(coalesce(raw_app_meta_data, '{}'),
                                     '{role}', '"superadmin"')
 where email = 'you@doctorkart.in';
```

The `is_super_admin()` helper checks this flag, so the user now has cross-tenant access via RLS.

### Patient WhatsApp OTP — extra setup

The `/me/login` flow uses Interakt to send a 6-digit code and then issues a Supabase session via the admin magic-link API. Before this works in production:

1. **Interakt template approved.** Register a template named `patient_otp_v1` (or whatever you set as `WA_OTP_TEMPLATE_NAME`) in the Interakt console with two body variables in this order: `{code}`, `{clinic_name}`. Get Meta approval.
2. **Redirect allow-list.** In Supabase Dashboard → Authentication → URL Configuration, add `https://<yourdomain>/me/appointments` (and `http://localhost:3000/me/appointments` for dev) to **Redirect URLs**. Without this Supabase refuses the magic-link redirect.
3. **`patients` row pre-exists.** The OTP send endpoint only sends codes to phones that already match a `patients` row at the clinic. Reception staff create the patient via `/admin/patients` first; the patient then uses the same phone to sign in.

In mock mode (`MOCK_DATA=true`), the OTP send endpoint echoes the generated code back in the JSON response and the verify endpoint short-circuits — useful for end-to-end UI testing without Interakt configured.

### Bootstrap a clinic staff user (for testing)

1. **Authentication → Users → Add user** with the staff member's email.
2. SQL editor — link them to a clinic:

```sql
insert into public.clinic_users (clinic_id, auth_user_id, role, display_name, email)
values (
  '11111111-1111-1111-1111-111111111111',     -- mahakur clinic
  '<paste auth.users.id here>',
  'clinic_admin',                              -- or 'doctor' / 'receptionist'
  'Dr. P. Mahakur',
  'pmahakur@example.com'
);
```

That row is enough for the RLS helpers to scope the user to mahakur on every query.

### Smoke-test RLS

In the SQL editor, switch the role dropdown to **"authenticated"** and the impersonation to your new user, then:

```sql
select count(*) from public.appointments;    -- only mahakur rows
select count(*) from public.patients;        -- only mahakur rows
```

Flip back to the service role to confirm the rest of the data exists but is hidden by RLS.

## 6. Run the dev server

```bash
npm run dev
```

Open http://localhost:3000?clinic=mahakur — the placeholder home page should report `Tenant resolved: mahakur`. Try `?clinic=democlinic` to confirm the second seeded tenant works.

When you're ready to test on real subdomains, add this to your `hosts` file:

```
127.0.0.1   mahakur.doctorkart.local
127.0.0.1   democlinic.doctorkart.local
```

then visit http://mahakur.doctorkart.local:3000.

## 7. Storybook (add when ready)

Storybook isn't installed by default — it would block `npm install` due to a peer-dep mismatch with Next 16. When you have your first component to preview, run:

```bash
npx storybook@latest init
```

That command auto-detects Next 16 + React 19 and installs the right Storybook version with addons. The `.storybook/` folder I scaffolded (with mobile / tablet / laptop / desktop viewports and the four background tokens) will be preserved.

## 8. Recommended editor extensions

- ESLint
- Prettier — Code formatter
- Tailwind CSS IntelliSense
- vscode-styled-components
- Supabase

## 9. CI (when you push to GitHub)

A bare-bones GitHub Actions workflow is **not** included in this scaffold; add one in week 1 with these jobs:

- Lint + typecheck (`npm run lint`, `npm run typecheck`).
- Build (`npm run build`).
- Storybook build (`npm run build-storybook`) → upload to Chromatic for visual regression.
- Tenant isolation suite once it exists.

## 10. Move the Claude Code commands

```bash
mkdir -p .claude/commands
mv claude-commands/*.md .claude/commands/
rmdir claude-commands
```

You can now run `/screen-impl 02-booking-step1`, `/new-primitive StatusBadge`, `/wire-page (clinic-app)/admin/today/page.tsx`, etc.

---

## Common errors

**`Font file not found: Can't resolve './fonts/Poppins-Regular.woff2'`** — your `fonts.ts` is still using `next/font/local`. The current version uses `next/font/google` (which auto-downloads at build time). Either restore `fonts.ts` to use `next/font/google` or drop the Poppins woff2 files into `src/app/fonts/`.

**`SUPABASE_SERVICE_ROLE_KEY is not set`** — `.env.local` is missing or wasn't loaded; restart the dev server after editing it.

**`relation "public.clinics" does not exist`** — migrations weren't applied. Run `supabase db push` (cloud) or `supabase db reset` (local).

**`permission denied for table storage.objects` when applying 0005** — `supabase db push` runs migrations as a role that may not own `storage.objects`. Apply `0005_storage.sql` from the Supabase Studio SQL editor instead (runs as `postgres`).

**RLS returns zero rows for a staff user that should have access** — check that a `clinic_users` row exists with the right `auth_user_id`. The `current_clinic_id()` helper looks the user up by `auth.uid()`; if the row is missing, every tenant-scoped table will appear empty.

**Tailwind utilities like `bg-cta` not recognized** — check that `src/styles/globals.css` is imported in `src/app/layout.tsx` and that `tailwind.config.ts`'s `content` glob matches `src/**/*.{ts,tsx}`.
