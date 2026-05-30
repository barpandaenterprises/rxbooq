-- =============================================================================
-- 0017_activate_clinic_application.sql
-- One-shot activation RPC the onboarding "Finalize" server action calls.
--
-- Differs from 0008's approve_clinic_application:
--   - No superadmin review gate (we trust the OTP-verified phone for now;
--     verification badge is async via /superadmin/verifications).
--   - Reads the draft's selected_plan_id + requested_doctor_seats +
--     applied_coupon_id (added in 0013) and provisions the subscription row
--     directly, with trial dates set by the chosen plan.
--   - Razorpay ids are NOT passed in here. We delay mandate consent until the
--     user explicitly upgrades from /admin/settings/billing — this avoids the
--     #1 drop-off in Indian SaaS funnels (UPI/eMandate consent during signup).
--
-- Caller (src/app/(onboarding)/get-started/actions.ts → finalizeOnboardingAction):
--   1. Verifies the draft cookie + OTP gate, loads draft.
--   2. Creates the auth.users row via service-role admin API.
--   3. Stamps draft.auth_user_id with that new user id.
--   4. Calls this RPC. The RPC returns the new clinic_id.
--   5. Signs the user in and redirects to /admin/today.
-- =============================================================================

create or replace function public.activate_clinic_application(
  application_id uuid
) returns uuid
language plpgsql security definer set search_path = public, auth
as $$
declare
  app            public.clinic_applications%rowtype;
  plan           public.subscription_plans%rowtype;
  coupon         public.coupons%rowtype;
  new_clinic_id  uuid;
  new_sub_id     uuid;
  base_inr       int;
  discount_inr   int;
  verification   text;
  is_free_plan   boolean;
begin
  -- ---------------------------------------------------------------------------
  -- 1. Load + validate the draft.
  -- ---------------------------------------------------------------------------
  select * into app from public.clinic_applications
   where id = application_id
   for update;
  if not found then
    raise exception 'application_not_found';
  end if;

  -- Idempotency: re-calling activate on an already-active application is a
  -- no-op that returns the existing clinic_id. Protects against finalize
  -- retries on transient network errors.
  if app.status = 'active' and app.clinic_id is not null then
    return app.clinic_id;
  end if;

  if app.status not in ('draft','pending') then
    raise exception 'application_not_activatable: status=%', app.status;
  end if;

  if app.auth_user_id is null then
    raise exception 'application_missing_auth_user';
  end if;

  if app.selected_plan_id is null then
    raise exception 'application_missing_plan';
  end if;

  -- Required submission fields (also enforced by clinic_applications_submitted_complete
  -- CHECK when status flips off 'draft', but we error here with a clearer message).
  if app.clinic_name is null or app.suggested_slug is null
     or app.address is null or app.city is null or app.state is null
     or app.pincode is null or app.primary_phone is null
     or app.primary_email is null or app.doctor_full_name is null
     or app.doctor_registration_no is null then
    raise exception 'application_incomplete';
  end if;

  -- ---------------------------------------------------------------------------
  -- 2. Load the chosen plan.
  -- ---------------------------------------------------------------------------
  select * into plan from public.subscription_plans where id = app.selected_plan_id;
  if not found or not plan.is_active then
    raise exception 'plan_not_available';
  end if;

  is_free_plan := (plan.code = 'free');

  -- ---------------------------------------------------------------------------
  -- 3. Verification status: pending if either doc was uploaded, else unverified.
  --    Async review queue at /superadmin/verifications flips it to verified.
  -- ---------------------------------------------------------------------------
  verification := case
    when app.registration_cert_path is not null
      or app.clinic_license_path   is not null
    then 'pending'
    else 'unverified'
  end;

  -- ---------------------------------------------------------------------------
  -- 4. Insert the clinic.
  -- ---------------------------------------------------------------------------
  insert into public.clinics (
    slug, name, status, whatsapp_number, locale_default, locales,
    plan_id, verification_status
  )
  values (
    app.suggested_slug,
    app.clinic_name,
    'active',
    app.primary_phone,
    'en',
    '{en}',
    plan.id,
    verification
  )
  returning id into new_clinic_id;

  -- ---------------------------------------------------------------------------
  -- 5. clinic_users — founding clinic_admin row for the just-created auth user.
  -- ---------------------------------------------------------------------------
  insert into public.clinic_users (
    clinic_id, auth_user_id, role, display_name, email, phone
  )
  values (
    new_clinic_id,
    app.auth_user_id,
    'clinic_admin',
    app.doctor_full_name,
    app.primary_email,
    app.primary_phone
  );

  -- ---------------------------------------------------------------------------
  -- 6. Founding doctor.
  -- ---------------------------------------------------------------------------
  insert into public.doctors (
    clinic_id, display_name, qualifications, registration_no,
    years_experience, phone, email, primary_specialty, languages
  )
  values (
    new_clinic_id,
    app.doctor_full_name,
    app.doctor_qualifications,
    app.doctor_registration_no,
    app.doctor_years_experience,
    app.primary_phone,
    app.primary_email,
    app.doctor_primary_specialty,
    coalesce(app.doctor_languages, '{en}'::text[])
  );

  -- ---------------------------------------------------------------------------
  -- 7. Subscription row.
  --    - Free plan -> status='active' immediately (no trial countdown).
  --    - Paid plan -> status='trialing' for 14 days; trial-expiry cron will
  --      downgrade to Free unless the user upgrades from the admin app.
  --    - Razorpay ids stay NULL until upgrade.
  -- ---------------------------------------------------------------------------
  insert into public.subscriptions (
    clinic_id, plan_id, status,
    trial_ends_at,
    current_period_start, current_period_end,
    extra_seats, applied_coupon_id
  )
  values (
    new_clinic_id,
    plan.id,
    case when is_free_plan then 'active' else 'trialing' end,
    case when is_free_plan then null     else now() + interval '14 days' end,
    now(),
    case when is_free_plan then null     else now() + interval '14 days' end,
    greatest(0, coalesce(app.requested_doctor_seats, 1) - plan.included_doctor_seats),
    app.applied_coupon_id
  )
  returning id into new_sub_id;

  -- ---------------------------------------------------------------------------
  -- 8. Coupon redemption ledger entry. Computes the snapshot discount in INR
  --    so partner commission accounting has a stable number even if the
  --    coupon row is later edited or disabled.
  -- ---------------------------------------------------------------------------
  if app.applied_coupon_id is not null then
    select * into coupon from public.coupons where id = app.applied_coupon_id;
    if found and coupon.is_active then
      base_inr := plan.monthly_price_inr
                + greatest(0, coalesce(app.requested_doctor_seats, 1) - plan.included_doctor_seats)
                  * plan.extra_seat_price_inr;
      discount_inr := case
        when coupon.kind = 'percent' then floor(base_inr * coupon.value / 100.0)::int
        else least(coupon.value, base_inr)
      end;

      insert into public.coupon_redemptions (
        coupon_id, clinic_id, subscription_id,
        amount_inr_off, partner_user_id_snapshot
      )
      values (
        coupon.id, new_clinic_id, new_sub_id,
        discount_inr, coupon.partner_user_id
      );
    end if;
  end if;

  -- ---------------------------------------------------------------------------
  -- 9. Mark the application activated.
  -- ---------------------------------------------------------------------------
  update public.clinic_applications
     set status      = 'active',
         clinic_id   = new_clinic_id,
         reviewed_by = app.auth_user_id,
         reviewed_at = now()
   where id = application_id;

  return new_clinic_id;
end;
$$;

revoke all on function public.activate_clinic_application(uuid) from public;
grant execute on function public.activate_clinic_application(uuid) to authenticated;

comment on function public.activate_clinic_application(uuid) is
  'No-review activation path for the public onboarding funnel. SECURITY DEFINER bypasses RLS to provision clinic+clinic_users+doctors+subscriptions+coupon_redemption in one transaction. Idempotent on retry. Razorpay ids are NOT touched here — eMandate consent is captured at the explicit Upgrade step from /admin/settings/billing.';
