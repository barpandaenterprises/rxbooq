-- =============================================================================
-- 0013_onboarding_drafts.sql
-- Make the public onboarding funnel resumable.
--
-- 0008 modelled a one-shot apply-and-approve flow that required an authenticated
-- user up-front. The public funnel captures mobile FIRST (phone OTP) and persists
-- partial state per phone, so drop-offs are recoverable before the user creates
-- a Supabase account. Auth user is created only at the final "finalize" step.
--
-- The two new enum values ('draft', 'active') ship in 0012 so they're
-- committed before this file references them in a CHECK constraint.
--
-- Changes:
--   1. Drop NOT NULL on auth_user_id and the previously-required clinic /
--      doctor columns; re-enforce them via a CHECK that only fires when
--      status != 'draft'.
--   2. Add: phone_e164, selected_plan_id, requested_doctor_seats,
--      applied_coupon_id, last_step_completed.
--   3. Replace the "one active per user" unique index to (a) handle null
--      auth_user_id and (b) cover the new 'active' state.
--   4. Add a partial unique on (phone_e164) where status='draft' so the resume
--      flow can find exactly one draft per phone.
--   5. New phone_otp_verifications table. Distinct from the patient otp_codes
--      table in 0003 (which has NOT NULL clinic_id) — onboarding has no clinic.
-- =============================================================================

-- =============================================================================
-- 1. Relax NOT NULL on auth_user_id and the required-for-submission columns
--    so drafts can exist with sparse data.
-- =============================================================================

alter table public.clinic_applications
  alter column auth_user_id           drop not null,
  alter column clinic_name            drop not null,
  alter column suggested_slug         drop not null,
  alter column address                drop not null,
  alter column city                   drop not null,
  alter column state                  drop not null,
  alter column pincode                drop not null,
  alter column primary_phone          drop not null,
  alter column primary_email          drop not null,
  alter column doctor_full_name       drop not null,
  alter column doctor_registration_no drop not null;

-- =============================================================================
-- 2. New columns
-- =============================================================================

alter table public.clinic_applications
  add column if not exists phone_e164              text,
  add column if not exists selected_plan_id        uuid,
  add column if not exists requested_doctor_seats  int  not null default 1,
  add column if not exists applied_coupon_id       uuid,
  add column if not exists last_step_completed     text;

-- selected_plan_id / applied_coupon_id are plain uuid here because their target
-- tables don't exist yet — the FKs are added in 0014 (subscription_plans) and
-- 0016 (coupons).

-- =============================================================================
-- 3. Replace the active-per-user unique index.
--    Old: where status in ('pending', 'approved')
--    New: where auth_user_id is not null and status in ('pending','approved','active')
--    Drafts (auth_user_id null) are excluded — they're keyed by phone instead.
-- =============================================================================

drop index if exists public.clinic_applications_one_active_per_user;

create unique index clinic_applications_one_active_per_user
  on public.clinic_applications (auth_user_id)
  where auth_user_id is not null
    and status in ('pending', 'approved', 'active');

-- =============================================================================
-- 4. One open draft per phone — used by the resume flow.
-- =============================================================================

create unique index if not exists clinic_applications_one_draft_per_phone
  on public.clinic_applications (phone_e164)
  where status = 'draft' and phone_e164 is not null;

create index if not exists clinic_applications_phone_idx
  on public.clinic_applications (phone_e164);

-- =============================================================================
-- 5. CHECK constraint: when status != 'draft', the previously NOT NULL columns
--    must be populated. Keeps the post-finalize invariants the rest of the
--    system relies on.
-- =============================================================================

alter table public.clinic_applications
  add constraint clinic_applications_submitted_complete
  check (
    status = 'draft'
    or (
      auth_user_id           is not null
      and clinic_name        is not null
      and suggested_slug     is not null
      and address            is not null
      and city               is not null
      and state              is not null
      and pincode            is not null
      and primary_phone      is not null
      and primary_email      is not null
      and doctor_full_name   is not null
      and doctor_registration_no is not null
    )
  );

-- =============================================================================
-- 6. phone_otp_verifications — backs the public onboarding OTP gate.
--    Service-role-only writes (server action is the trust boundary; we don't
--    let `anon` POST OTPs directly via PostgREST).
-- =============================================================================

create table if not exists public.phone_otp_verifications (
  id           uuid primary key default gen_random_uuid(),
  phone_e164   text not null,
  code_hash    text not null,
  purpose      text not null default 'onboarding'
                 check (purpose in ('onboarding', 'resume')),
  expires_at   timestamptz not null,
  consumed_at  timestamptz,
  attempts     int not null default 0,
  created_at   timestamptz not null default now(),
  check (phone_e164 ~ '^\+[1-9][0-9]{6,14}$')
);

create index if not exists phone_otp_verifications_lookup_idx
  on public.phone_otp_verifications (phone_e164, created_at desc);

create index if not exists phone_otp_verifications_active_idx
  on public.phone_otp_verifications (phone_e164)
  where consumed_at is null;

alter table public.phone_otp_verifications enable row level security;

-- No policies for anon/authenticated. RLS denies by default → only the
-- service-role key (used by the onboarding server action) can read/write.

-- =============================================================================
-- 7. Comment trail — what changed and why.
-- =============================================================================

comment on column public.clinic_applications.phone_e164 is
  'Verified onboarding phone (E.164). Drafts are keyed on this before an auth user exists.';
comment on column public.clinic_applications.selected_plan_id is
  'Subscription tier chosen during the funnel. FK tightened in 0014.';
comment on column public.clinic_applications.applied_coupon_id is
  'Coupon redeemed at finalize. FK tightened in 0016.';
comment on column public.clinic_applications.last_step_completed is
  'phone|profile|practice|docs|plan|account. Drives the resume jump-point.';
comment on table public.phone_otp_verifications is
  'OTP store for the public onboarding funnel. Distinct from otp_codes (0003) which is patient-scoped and requires clinic_id.';
