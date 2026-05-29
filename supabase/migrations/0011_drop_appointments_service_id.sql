-- =============================================================================
-- 0011_drop_appointments_service_id.sql
-- Drop the appointments.service_id FK column after the Department-first
-- booking redesign. Both the admin dialog and the public /book flow stopped
-- writing this column in the same release (see Phase 3 of the redesign plan);
-- this migration removes the now-dead FK and column from the appointments
-- table.
--
-- The `services` table itself stays — it may still be referenced by future
-- billing / pricing features. Only the FK on appointments goes.
--
-- This migration is DESTRUCTIVE. There's no down-migration: the per-appointment
-- service link is not recoverable after the drop. Historical reporting that
-- depended on appointment → service joins (top-services KPI, per-service
-- revenue) is intentionally retired in the same release and replaced with
-- zero-valued placeholders until a separate billing model lands.
-- =============================================================================

alter table public.appointments drop column if exists service_id;
