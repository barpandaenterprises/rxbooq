-- =============================================================================
-- 0021_onboarding_email_or_phone.sql
-- Let clinic onboarding start with EITHER a mobile number or an email, with a
-- real OTP for each. Generalizes the phone-only onboarding tables to carry a
-- channel ('phone' | 'email') + the contact value.
--
-- No RLS changes: both tables stay service-role-only (onboarding is pre-account).
-- =============================================================================

-- ----------------------------------------------------------------------------
-- 1. OTP store — was phone-only.
-- ----------------------------------------------------------------------------
alter table public.phone_otp_verifications
  add column if not exists channel text not null default 'phone'
    check (channel in ('phone', 'email')),
  add column if not exists contact text;   -- phone E.164 OR email address

-- Email-channel OTPs carry no phone, so phone_e164 must become nullable.
-- (The original 0013 table declared it NOT NULL — that blocks email sends.)
-- The inline `phone_e164 ~ '^\+...'` CHECK from 0013 stays valid: a NULL
-- phone_e164 makes the predicate UNKNOWN, which SQL treats as satisfied.
alter table public.phone_otp_verifications
  alter column phone_e164 drop not null;

-- Backfill existing rows from the old phone column.
update public.phone_otp_verifications
  set contact = phone_e164
  where contact is null;

create index if not exists phone_otp_verifications_contact_idx
  on public.phone_otp_verifications (channel, contact, created_at desc);

-- ----------------------------------------------------------------------------
-- 2. Draft identity — the verified contact that started / resumes a draft.
--    Immutable per draft; distinct from the editable clinic primary_phone /
--    primary_email captured later in the wizard.
-- ----------------------------------------------------------------------------
alter table public.clinic_applications
  add column if not exists onboarding_channel text
    check (onboarding_channel in ('phone', 'email')),
  add column if not exists onboarding_contact text;

-- Backfill existing drafts (all phone-started until now).
update public.clinic_applications
  set onboarding_channel = 'phone',
      onboarding_contact  = phone_e164
  where onboarding_contact is null and phone_e164 is not null;

-- One in-flight draft per contact (replaces the phone-only resume key).
create unique index if not exists clinic_applications_onboarding_contact_uniq
  on public.clinic_applications (onboarding_contact)
  where status = 'draft';
