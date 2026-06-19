# Supabase — database setup (dev + prod)

This folder holds the full schema as **ordered, forward-only migrations** plus a
local-only seed. The chain `0001 → 0021` applies cleanly to a brand-new Supabase
project. Every migration is **idempotent** (guarded with `if not exists` /
`drop … if exists`), so a re-run after a partial failure won't error.

## Apply order

Migrations run in filename order. Do **not** renumber or reorder them — several
files intentionally evolve earlier ones, and the order is what makes that safe:

| File | What it does | Evolves |
| --- | --- | --- |
| `0001` | Base schema: clinics, users, doctors, patients, scheduling, messaging, audit | — |
| `0002` | RLS + tenant-isolation policies | — |
| `0003` | Clinical records, patient identity, OTP store | 0001 |
| `0004` | RLS for the 0003 tables + patient self-access | 0002 |
| `0005` | Storage buckets (`clinic-files`, `public-assets`) + object RLS | — |
| `0006` | Re-implements `current_clinic_id`/`current_role`/`is_super_admin` as DB-lookup `security definer` (drops the JWT-hook approach) | 0002, 0004 |
| `0007` | Extra doctor fields + `status` | 0001 |
| `0008` | `clinic_applications` onboarding funnel + `approve_clinic_application` | — |
| `0009` | `clinic-applications` storage bucket + RLS | 0008 |
| `0010` | `departments` + `doctors.department_id` | 0001 |
| `0011` | **Destructive:** drops `appointments.service_id` | 0001 |
| `0012` | Adds enum values `draft`, `active` (separate file so 0013 can use them) | 0008 |
| `0013` | Resumable drafts: relaxes NOT NULLs, adds `phone_otp_verifications` | 0008, 0012 |
| `0014` | `subscription_plans` (+seed catalog), `clinics.plan_id`, verification fields | 0013 |
| `0015` | `subscriptions` | 0014 |
| `0016` | `coupons` + `coupon_redemptions`, ties deferred FKs | 0013, 0015 |
| `0017` | `activate_clinic_application` RPC (no-review onboarding path) | 0013–0016 |
| `0018` | Relaxes `subscription_plans.code` check for runtime CRUD | 0014 |
| `0019` | Multi-clinic membership (drops single-clinic constraint) | 0001 |
| `0020` | Links staff logins ↔ doctor profiles; patient `assigned_doctor_id` | 0001 |
| `0021` | Onboarding via phone **or** email | 0013 |

> The “Evolves” column is why these are forward migrations, **not** conflicting
> overrides: each change runs after the object it touches already exists.

## What ships where

- **Migrations** (`migrations/*.sql`) → applied to **every** environment (dev,
  prod). Includes the subscription-plan catalog (0014), which is real product
  data, not test data.
- **Seed** (`seed.sql`) → **local/dev only**. Demo clinics, doctors, WhatsApp
  templates. It runs automatically on `supabase db reset` and is **never** sent
  by `supabase db push`. Do not seed production.

## Stand up a new database

Scripts are in `package.json` (`db:push`, `db:reset`, `db:types`).

### Development

```bash
# Option A — fully local (needs Docker)
supabase start            # boots local Postgres + studio
supabase db reset         # replays 0001→0021, then seed.sql

# Option B — a hosted "dev" project
supabase link --project-ref <DEV_PROJECT_REF>
supabase db push          # replays all migrations (no seed)
# optional one-off seed of the hosted dev DB:
#   psql "$DEV_DB_URL" -f supabase/seed.sql
```

### Production

```bash
supabase link --project-ref <PROD_PROJECT_REF>
supabase db push          # migrations only — DO NOT run seed.sql
```

After either remote push, regenerate types against the linked project:

```bash
npm run db:types          # supabase gen types … > src/lib/supabase/database.types.ts
```

## Post-migration manual steps (per environment)

These are not in SQL because they depend on env-specific identities:

1. **Superadmin** — promote an auth user:
   ```sql
   update auth.users
      set raw_app_meta_data = jsonb_set(coalesce(raw_app_meta_data,'{}'), '{role}', '"superadmin"')
    where id = '<auth-user-uuid>';
   ```
   (Locally the `grant-superadmin` skill does this.)
2. **Razorpay plan ids** — `subscription_plans.razorpay_plan_id` is `null` at
   seed time; backfill via the sync script / superadmin Plans UI once the
   environment's Razorpay keys exist.
3. **Auth/SMS/email providers & redirect URLs** — set in the Supabase dashboard
   per project (see `config.toml` for the local values).

## Verifying a clean replay

With Docker available, the definitive check is:

```bash
supabase db reset    # fails loudly if any migration is non-replayable
```

Without Docker (as in CI-less local checks), the guards make every file
re-runnable, but a real `db reset` against a throwaway project is the only
end-to-end proof.
