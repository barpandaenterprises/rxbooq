-- =============================================================================
-- 0014_subscription_plans.sql
-- The tiered SaaS catalog that drives onboarding plan selection, feature
-- gating, and the upgrade flow. Practo-inspired structure (Free / Visibility /
-- Practice / Pro). Razorpay plan ids are filled in later by a sync script —
-- they're null at seed time so this migration is environment-portable.
--
-- Also lands two clinic-level columns the public profile + funnel need:
--   - plan_id           — nullable FK to subscription_plans (new gating source)
--   - verification_status — review state of uploaded docs, surfaced as a badge
--
-- We do NOT drop the legacy `clinics.plan` text enum. New code reads plan_id;
-- old code keeps reading plan. A trigger keeps them in sync until the next
-- pass rips out the enum.
-- =============================================================================

-- =============================================================================
-- 1. subscription_plans
-- =============================================================================

create table public.subscription_plans (
  id                       uuid primary key default gen_random_uuid(),
  code                     text not null unique
                             check (code in ('free', 'visibility', 'practice', 'pro')),
  display_name             text not null,
  tagline                  text,
  monthly_price_inr        int not null default 0 check (monthly_price_inr >= 0),
  annual_price_inr         int          check (annual_price_inr is null or annual_price_inr >= 0),
  included_doctor_seats    int not null default 1 check (included_doctor_seats >= 0),
  extra_seat_price_inr     int not null default 0 check (extra_seat_price_inr >= 0),
  features                 jsonb not null default '{}'::jsonb,
  razorpay_plan_id         text,
  is_active                boolean not null default true,
  is_popular               boolean not null default false,
  sort_order               int not null default 0,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);

create index subscription_plans_active_idx
  on public.subscription_plans (is_active, sort_order);

create trigger subscription_plans_updated_at
  before update on public.subscription_plans
  for each row execute function public.touch_updated_at();

-- =============================================================================
-- 2. RLS — pricing is public (the marketing /pricing page reads it server-side
--    AND the unauthenticated onboarding wizard needs it). Writes superadmin-only.
-- =============================================================================

alter table public.subscription_plans enable row level security;

create policy subscription_plans_public_read on public.subscription_plans
  for select to anon, authenticated using (is_active);

create policy subscription_plans_superadmin_all on public.subscription_plans
  for all to authenticated
  using (public.is_super_admin())
  with check (public.is_super_admin());

-- =============================================================================
-- 3. Seed the four tiers.
--
--    features jsonb keys (kept in sync with src/lib/billing/plan-features.ts):
--      public_listing       boolean — show on /d/{slug}
--      patient_enquiries    boolean — public "request callback" form
--      calendar             boolean — admin scheduling
--      emr                  boolean — prescriptions / clinical notes
--      whatsapp_templates   boolean — broadcasts + reminders
--      sponsored_placement  boolean — boost on city/specialty pages
--      online_consult       boolean — telemedicine flag
--      custom_domain        boolean
--      departments_max      int     (0 = unlimited only on Pro; lower tiers cap)
--      analytics            text    — 'none' | 'basic' | 'full'
-- =============================================================================

insert into public.subscription_plans (
  code, display_name, tagline,
  monthly_price_inr, included_doctor_seats, extra_seat_price_inr,
  features, is_popular, sort_order
) values
  ('free', 'Free Listing',
   'Public profile so patients can find and contact you.',
   0, 1, 0,
   '{
     "public_listing": true,
     "patient_enquiries": true,
     "calendar": false,
     "emr": false,
     "whatsapp_templates": false,
     "sponsored_placement": false,
     "online_consult": false,
     "custom_domain": false,
     "departments_max": 1,
     "analytics": "none"
   }'::jsonb,
   false, 1),

  ('visibility', 'Visibility',
   'Be seen first on specialty and city searches.',
   999, 1, 199,
   '{
     "public_listing": true,
     "patient_enquiries": true,
     "calendar": false,
     "emr": false,
     "whatsapp_templates": false,
     "sponsored_placement": true,
     "online_consult": false,
     "custom_domain": true,
     "departments_max": 2,
     "analytics": "basic"
   }'::jsonb,
   false, 2),

  ('practice', 'Practice',
   'Full clinic software — calendar, EMR, WhatsApp.',
   2999, 3, 499,
   '{
     "public_listing": true,
     "patient_enquiries": true,
     "calendar": true,
     "emr": true,
     "whatsapp_templates": true,
     "sponsored_placement": false,
     "online_consult": false,
     "custom_domain": false,
     "departments_max": 5,
     "analytics": "basic"
   }'::jsonb,
   true, 3),

  ('pro', 'Pro',
   'Visibility + Practice, plus analytics and online consult.',
   4999, 5, 399,
   '{
     "public_listing": true,
     "patient_enquiries": true,
     "calendar": true,
     "emr": true,
     "whatsapp_templates": true,
     "sponsored_placement": true,
     "online_consult": true,
     "custom_domain": true,
     "departments_max": 0,
     "analytics": "full"
   }'::jsonb,
   false, 4);

-- =============================================================================
-- 4. Tighten the 0013-deferred FK on clinic_applications.selected_plan_id.
-- =============================================================================

alter table public.clinic_applications
  add constraint clinic_applications_plan_fk
    foreign key (selected_plan_id)
    references public.subscription_plans(id)
    on delete set null;

-- =============================================================================
-- 5. clinics: add plan_id + verification fields.
-- =============================================================================

alter table public.clinics
  add column if not exists plan_id              uuid references public.subscription_plans(id) on delete set null,
  add column if not exists verification_status  text not null default 'unverified'
                                                  check (verification_status in ('unverified','pending','verified','rejected')),
  add column if not exists verified_at          timestamptz,
  add column if not exists verified_by          uuid references auth.users(id) on delete set null;

create index if not exists clinics_plan_idx on public.clinics (plan_id);
create index if not exists clinics_verification_idx
  on public.clinics (verification_status)
  where verification_status = 'pending';

-- Backfill existing rows: silver -> free (lowest-cost on-ramp for legacy
-- clinics), gold -> practice (most comparable feature set). Operators can
-- nudge any clinic later from the superadmin subscriptions page.
update public.clinics c
   set plan_id = (
     select id from public.subscription_plans
      where code = case when c.plan = 'gold' then 'practice' else 'free' end
      limit 1
   )
 where plan_id is null;

-- =============================================================================
-- 6. Keep the legacy `clinics.plan` enum in sync with plan_id so unchanged
--    code paths (the existing UI reads .plan as a string) don't break while
--    we migrate callers over to plan_id. Drop this trigger when we drop the
--    column.
-- =============================================================================

create or replace function public.sync_clinic_legacy_plan() returns trigger
language plpgsql as $$
declare
  new_code text;
begin
  if new.plan_id is null then
    return new;
  end if;
  select code into new_code from public.subscription_plans where id = new.plan_id;
  -- Map the four new tiers back to the silver/gold enum the old column expects.
  new.plan := case
    when new_code in ('practice','pro') then 'gold'
    else 'silver'
  end;
  return new;
end;
$$;

drop trigger if exists clinics_sync_legacy_plan on public.clinics;
create trigger clinics_sync_legacy_plan
  before insert or update of plan_id on public.clinics
  for each row execute function public.sync_clinic_legacy_plan();

comment on column public.clinics.plan_id is
  'Active subscription tier. Source of truth for feature gating. The legacy plan text column is kept in sync via clinics_sync_legacy_plan trigger.';
comment on column public.clinics.verification_status is
  'Async review state of registration_cert + clinic_license uploads. Drives the public profile badge — does NOT gate access.';
