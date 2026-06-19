-- =============================================================================
-- 0016_coupons.sql
-- Promo + partner referral codes for the onboarding funnel and admin upgrade.
--
-- Day-one scope (per the approved plan):
--   - percent | flat ₹ off
--   - first_cycle | recurring scope
--   - partner_user_id for commission attribution (payout out of scope)
-- Deliberately NO expiry / per-user caps / per-plan restrictions in v1.
--
-- The math is computed locally (see src/lib/billing/pricing.ts). For
-- recurring-scope coupons we ALSO mirror to Razorpay as an offer so the
-- discount auto-applies on every renewal — the razorpay_offer_id is set by
-- the superadmin coupon create action.
-- =============================================================================

create table if not exists public.coupons (
  id                uuid primary key default gen_random_uuid(),
  -- Stored lowercase; client uploads any case, server lowercases.
  code              text not null unique,
  kind              text not null check (kind in ('percent','flat')),
  value             int  not null check (value > 0),
  scope             text not null check (scope in ('first_cycle','recurring')),
  partner_user_id   uuid references auth.users(id) on delete set null,
  razorpay_offer_id text,
  created_by        uuid references auth.users(id) on delete set null,
  is_active         boolean not null default true,
  notes             text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  -- Percent values must be 1..100; flat must be ≥ ₹1.
  check (kind = 'flat' or (value between 1 and 100))
);

create index if not exists coupons_active_idx
  on public.coupons (is_active)
  where is_active;

drop trigger if exists coupons_updated_at on public.coupons;
create trigger coupons_updated_at
  before update on public.coupons
  for each row execute function public.touch_updated_at();

-- =============================================================================
-- coupon_redemptions — append-only ledger.
-- Snapshots partner_user_id so disabling/deleting the coupon doesn't lose
-- commission attribution.
-- =============================================================================

create table if not exists public.coupon_redemptions (
  id                          uuid primary key default gen_random_uuid(),
  coupon_id                   uuid not null references public.coupons(id) on delete restrict,
  clinic_id                   uuid not null references public.clinics(id) on delete cascade,
  subscription_id             uuid references public.subscriptions(id) on delete set null,
  redeemed_at                 timestamptz not null default now(),
  amount_inr_off              int not null check (amount_inr_off >= 0),
  partner_user_id_snapshot    uuid
);

create index if not exists coupon_redemptions_coupon_idx  on public.coupon_redemptions (coupon_id, redeemed_at desc);
create index if not exists coupon_redemptions_clinic_idx  on public.coupon_redemptions (clinic_id);
create index if not exists coupon_redemptions_partner_idx on public.coupon_redemptions (partner_user_id_snapshot)
  where partner_user_id_snapshot is not null;

-- =============================================================================
-- RLS
--
-- coupons: public (anon + authenticated) can SELECT active rows by code so
-- the apply-coupon preview works pre-auth. Writes superadmin-only.
--
-- coupon_redemptions: read superadmin-only (it's commission accounting; no
-- need to expose to tenant staff). Writes service-role only.
-- =============================================================================

alter table public.coupons enable row level security;

drop policy if exists coupons_public_read on public.coupons;
create policy coupons_public_read on public.coupons
  for select to anon, authenticated using (is_active);

drop policy if exists coupons_superadmin_all on public.coupons;
create policy coupons_superadmin_all on public.coupons
  for all to authenticated
  using (public.is_super_admin())
  with check (public.is_super_admin());

alter table public.coupon_redemptions enable row level security;

drop policy if exists coupon_redemptions_superadmin_read on public.coupon_redemptions;
create policy coupon_redemptions_superadmin_read on public.coupon_redemptions
  for select to authenticated using (public.is_super_admin());

-- No write policies — service-role only.

-- =============================================================================
-- Tighten the 0013-deferred FKs on clinic_applications.applied_coupon_id and
-- subscriptions.applied_coupon_id.
-- =============================================================================

alter table public.clinic_applications
  drop constraint if exists clinic_applications_coupon_fk;

alter table public.clinic_applications
  add constraint clinic_applications_coupon_fk
    foreign key (applied_coupon_id)
    references public.coupons(id)
    on delete set null;

alter table public.subscriptions
  drop constraint if exists subscriptions_coupon_fk;

alter table public.subscriptions
  add constraint subscriptions_coupon_fk
    foreign key (applied_coupon_id)
    references public.coupons(id)
    on delete set null;

comment on table public.coupons is
  'Promo + partner referral codes. Mathematics in src/lib/billing/pricing.ts. v1 has no expiry / usage caps — coupons.is_active is the kill switch.';
comment on column public.coupons.scope is
  'first_cycle = one-shot discount on first invoice (computed locally, applied as negative-amount addon); recurring = discount on every renewal (mirrored to Razorpay as an offer; razorpay_offer_id stores the link).';
comment on column public.coupon_redemptions.partner_user_id_snapshot is
  'Snapshot at redemption time so commission attribution survives the partner being detached from the coupon row.';
