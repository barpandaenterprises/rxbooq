-- =============================================================================
-- 0015_subscriptions.sql
-- One row per (clinic, billing period). Owns trial, status, Razorpay linkage,
-- extra-seat add-on, and the redeemed coupon snapshot.
--
-- Invariant: at most one "active" row per clinic at a time, where "active"
-- means trialing / active / past_due. Cancelled / paused rows stay for history.
-- =============================================================================

create table if not exists public.subscriptions (
  id                        uuid primary key default gen_random_uuid(),
  clinic_id                 uuid not null references public.clinics(id) on delete cascade,
  plan_id                   uuid not null references public.subscription_plans(id),
  status                    text not null
                              check (status in ('trialing','active','past_due','cancelled','paused')),
  trial_ends_at             timestamptz,
  current_period_start      timestamptz,
  current_period_end        timestamptz,
  razorpay_customer_id      text,
  razorpay_subscription_id  text unique,
  extra_seats               int not null default 0 check (extra_seats >= 0),
  applied_coupon_id         uuid,
  cancel_at_period_end      boolean not null default false,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now()
);

create index if not exists subscriptions_clinic_idx     on public.subscriptions (clinic_id, status);
create index if not exists subscriptions_status_idx     on public.subscriptions (status);
create index if not exists subscriptions_trial_due_idx
  on public.subscriptions (trial_ends_at)
  where status = 'trialing';

-- Exactly one in-flight subscription per clinic.
create unique index if not exists subscriptions_one_active_per_clinic
  on public.subscriptions (clinic_id)
  where status in ('trialing', 'active', 'past_due');

drop trigger if exists subscriptions_updated_at on public.subscriptions;
create trigger subscriptions_updated_at
  before update on public.subscriptions
  for each row execute function public.touch_updated_at();

-- =============================================================================
-- RLS — clinic staff can read their own row (so the admin billing page works).
-- All writes go through service-role: only the activate_clinic_application
-- RPC, the upgrade server action, the webhook handler, and the trial-expiry
-- cron mutate this table. RLS makes accidental client writes impossible.
-- =============================================================================

alter table public.subscriptions enable row level security;

drop policy if exists subscriptions_tenant_read on public.subscriptions;
create policy subscriptions_tenant_read on public.subscriptions
  for select to authenticated
  using (
    clinic_id = public.current_clinic_id()
    or public.is_super_admin()
  );

-- No insert/update/delete policies for `authenticated` — service-role only.

comment on table public.subscriptions is
  'Billing state per clinic. Trial -> Free downgrade is handled by expire_trials cron, NOT by Razorpay (eMandate consent is captured only at the explicit Upgrade step from /admin/settings/billing).';
comment on column public.subscriptions.razorpay_subscription_id is
  'Null while clinic is on Free or on a trial that has not yet been upgraded. Populated only when the user explicitly authorises a mandate.';
