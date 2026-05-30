-- =============================================================================
-- 0012_onboarding_status_enum.sql
-- Extend clinic_application_status with the two states the new public funnel
-- needs.
--
-- This is split into its own file because Postgres rejects same-transaction
-- usage of an enum value added by ALTER TYPE ... ADD VALUE ("unsafe use of
-- new value"). The next migration (0013) references 'draft' in a CHECK
-- constraint, so the enum addition has to commit first.
-- =============================================================================

alter type public.clinic_application_status add value if not exists 'draft'  before 'pending';
alter type public.clinic_application_status add value if not exists 'active' after  'approved';
