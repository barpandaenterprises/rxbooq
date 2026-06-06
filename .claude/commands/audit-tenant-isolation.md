---
description: Scan src/ for clinic-scoped DB queries missing an explicit .eq("clinic_id", …) filter
allowed-tools: Bash, Grep, Read
---

# /audit-tenant-isolation

Guards against the bug we shipped a fix for: admin data loaders that rely
on RLS alone get bypassed by superadmin users (their session sees every
clinic). Every `.from("doctors" | "patients" | "appointments" | ...)` call
on a clinic-scoped table inside `src/app/(clinic-app)/admin/*` and
`src/lib/data/admin-*.ts` MUST add an explicit `.eq("clinic_id", clinicId)`
where `clinicId` came from `getCurrentStaffClinicId()`.

## What to do

1. Build a list of clinic-scoped tables (those with `clinic_id` column):
   `doctors`, `doctor_availability`, `patients`, `appointments`,
   `clinic_users`, `departments`, `services`, `wa_messages`,
   `availability_overrides`, `prescriptions`, `prescription_items`,
   `medical_history`, `visit_notes`, `visit_attachments`,
   `visit_tooth_treatments`, `clinic_slot_locks`, `subscriptions`,
   `coupon_redemptions`.

2. For each file under `src/lib/data/admin-*.ts` and
   `src/app/(clinic-app)/admin/**/actions.ts`, grep for `.from("<table>"`
   on those tables and check that the surrounding chain includes
   `.eq("clinic_id"`. Use multi-line grep so chains spanning lines aren't missed.

3. Report a punch list of any `.from()` call missing the explicit filter.
   Group by file. For each hit, show the line and 2 lines of context so
   it's obvious what query is at risk.

4. If nothing is found, say so explicitly: "No tenant-isolation gaps found
   across N files / M queries scanned."

5. Do NOT auto-fix — this command is a check, not a refactor. The user
   decides how to patch each hit (some queries are intentionally
   cross-clinic — e.g. superadmin loaders under `src/app/(super-admin)/*`
   which are explicitly OUT of scope for this audit).

Skip everything under `src/app/(super-admin)/*` — those are meant to be
cross-tenant.

$ARGUMENTS
