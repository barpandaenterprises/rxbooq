# Permissions Matrix

This document is the source of truth for **who can do what** in Doctor Kart. It covers role definitions, screen-by-screen access, and how each permission is enforced today (RLS at the database layer or UI gating in the application).

> **Audience:** product, engineering, and clinic onboarding. When you add a new screen or action, update this doc.

---

## 1. Roles

Five distinct roles live in the system. The first four are stored on `public.clinic_users.role` (one row per (auth_user × clinic)). The fifth (`patient`) lives on `public.patient_users` (one row per (auth_user × patient)).

| Role | Where stored | Who | Notes |
|---|---|---|---|
| **superadmin** | `auth.users.raw_app_meta_data.role = 'superadmin'` | Doctor Kart staff | Bypasses tenant isolation. Cross-tenant access via `is_super_admin()` RLS helper. |
| **clinic_admin** | `clinic_users.role = 'clinic_admin'` | Clinic owner / manager | Full access within their clinic. |
| **doctor** | `clinic_users.role = 'doctor'` | Practicing clinician | Reads everything in their clinic. Writes clinical content (notes, prescriptions). |
| **receptionist** | `clinic_users.role = 'receptionist'` | Front-desk staff | Reads everything in their clinic. Writes scheduling + patient registration only. |
| **patient** | `patient_users.auth_user_id` matches an `auth.users` row | The patient (via WhatsApp OTP) | Read-only access to their own record. |

A single auth user can hold at most one `clinic_users` row at a time (the unique constraint on `auth_user_id`). A staff member who moves between clinics must be deactivated at the old clinic before being invited to the new one.

---

## 2. Section-level access

| Section | superadmin | clinic_admin | doctor | receptionist | patient |
|---|---|---|---|---|---|
| `/admin/today` | ✅ any clinic | ✅ own clinic | ✅ own clinic | ✅ own clinic | ❌ |
| `/admin/calendar` | ✅ any | ✅ own | ✅ own | ✅ own | ❌ |
| `/admin/patients` | ✅ any | ✅ own | ✅ own | ✅ own | ❌ |
| `/admin/patients/[id]` | ✅ any | ✅ own | ✅ own | ✅ own | ❌ |
| `/admin/doctors` | ✅ any | ✅ own | ✅ own (read) | ✅ own (read) | ❌ |
| `/admin/doctors/[id]` | ✅ any | ✅ own | ✅ own (read) | ✅ own (read) | ❌ |
| `/admin/messages` | ✅ any | ✅ own | 👁 read-only | ✅ own | ❌ |
| `/admin/analytics` | ✅ any | ✅ own | 👁 limited | 👁 limited | ❌ |
| `/admin/settings/team` | ✅ any | ✅ own | ❌ | ❌ | ❌ |
| `/admin/settings/*` (clinic config) | ✅ any | ✅ own | ❌ | ❌ | ❌ |
| `/superadmin/clinics` | ✅ | ❌ | ❌ | ❌ | ❌ |
| `/(patient)/me/appointments` | ❌ | ❌ | ❌ | ❌ | ✅ own |

Legend: ✅ full · 👁 read-only · ❌ blocked.

---

## 3. Action-level permissions

This is the matrix that drives button visibility, server-action gates, and (eventually) RLS policies. Each row is an action; columns are roles.

### Patients

| Action | superadmin | clinic_admin | doctor | receptionist | patient |
|---|---|---|---|---|---|
| List patients | ✅ | ✅ | ✅ | ✅ | ❌ |
| View patient chart | ✅ | ✅ | ✅ | ✅ | ✅ own |
| Add patient (`createPatientAction`) | ✅ | ✅ | ✅ | ✅ | ❌ |
| Edit demographics (`updatePatientAction`) | ✅ | ✅ | ✅ | ✅ | ❌ |
| Archive patient (`archivePatientAction`) | ✅ | ✅ | ❌ | ❌ | ❌ |
| Write visit notes (`visit_notes` insert) | ✅ | ✅ | ✅ | ❌ | ❌ |
| Write prescription (`createPrescriptionAction`) | ✅ | ✅ | ✅ | ❌ | ❌ |
| Upload attachment (`uploadAttachmentAction`) | ✅ | ✅ | ✅ | ✅ | ❌ |
| Delete attachment (`deleteAttachmentAction`) | ✅ | ✅ | ✅ own author | ❌ | ❌ |

### Appointments

| Action | superadmin | clinic_admin | doctor | receptionist | patient |
|---|---|---|---|---|---|
| View today's schedule | ✅ | ✅ all | ✅ own bookings | ✅ all | ❌ |
| View calendar | ✅ | ✅ all | ✅ own | ✅ all | ❌ |
| Create appointment (`createAppointmentAction`) | ✅ | ✅ | ✅ | ✅ | ❌ |
| Edit appointment | ✅ | ✅ | ✅ own | ✅ | ❌ |
| Cancel appointment | ✅ | ✅ | ✅ own | ✅ | ❌ |
| Mark completed / no-show | ✅ | ✅ | ✅ own | ✅ | ❌ |
| View own appointments (patient portal) | ❌ | ❌ | ❌ | ❌ | ✅ |

### Doctors

| Action | superadmin | clinic_admin | doctor | receptionist | patient |
|---|---|---|---|---|---|
| List doctors | ✅ | ✅ | ✅ | ✅ | ❌ |
| View doctor profile | ✅ | ✅ | ✅ | ✅ | ❌ |
| Add doctor (`addDoctorAction`) | ✅ | ✅ | ❌ | ❌ | ❌ |
| Edit doctor (`updateDoctorAction`) | ✅ | ✅ | ✅ own profile only | ❌ | ❌ |
| Deactivate doctor (`deactivateDoctorAction`) | ✅ | ✅ | ❌ | ❌ | ❌ |
| Block dates (`blockDoctorDatesAction`) | ✅ | ✅ | ✅ own | ❌ | ❌ |
| Edit weekly schedule | ✅ | ✅ | ❌ | ❌ | ❌ |

### Communications (WhatsApp)

| Action | superadmin | clinic_admin | doctor | receptionist | patient |
|---|---|---|---|---|---|
| View inbox | ✅ | ✅ | 👁 read-only | ✅ | ❌ |
| Reply to message (`sendInboxReplyAction`) | ✅ | ✅ | ❌ | ✅ | ❌ |
| Send template manually | ✅ | ✅ | ❌ | ✅ | ❌ |
| Manage WA templates (`wa_templates`) | ✅ | ❌ | ❌ | ❌ | ❌ |

### Team & clinic settings

| Action | superadmin | clinic_admin | doctor | receptionist | patient |
|---|---|---|---|---|---|
| View team | ✅ | ✅ | ❌ | ❌ | ❌ |
| Invite user (`inviteClinicUserAction`) | ✅ | ✅ | ❌ | ❌ | ❌ |
| Change role (`updateClinicUserRoleAction`) | ✅ | ✅ | ❌ | ❌ | ❌ |
| Deactivate user (`deactivateClinicUserAction`) | ✅ | ✅ | ❌ | ❌ | ❌ |
| Edit clinic profile / theme | ✅ | ✅ | ❌ | ❌ | ❌ |
| Manage services (price, duration) | ✅ | ✅ | ❌ | ❌ | ❌ |
| View audit log | ✅ | ✅ | ❌ | ❌ | ❌ |

### Super-admin (cross-tenant)

| Action | superadmin | others |
|---|---|---|
| List all clinics | ✅ | ❌ |
| Create new clinic | ✅ | ❌ |
| Suspend / reactivate clinic | ✅ | ❌ |
| Change clinic plan (silver / gold) | ✅ | ❌ |
| Impersonate clinic admin | ✅ (planned) | ❌ |

---

## 4. How permissions are enforced today

There are two enforcement layers — **RLS at the database** and **gates inside server actions / UI**. Both should refuse the same action; one alone is brittle.

### 4.1 Database layer (RLS) — what's already wired

RLS is enabled on every clinic-scoped table (`clinics`, `clinic_users`, `doctors`, `patients`, `services`, `doctor_availability`, `availability_overrides`, `appointments`, `clinic_slot_locks`, `wa_messages`, `audit_logs`, plus the clinical-records tables added in `0003`). The generic policy generator in `0002_rls_policies.sql` allows:

- `clinic_id = current_clinic_id() OR is_super_admin()` for select/insert/update/delete.

The helper functions in `0006_simple_auth.sql` resolve identity via `security definer` lookups against `clinic_users` and `patient_users` — no JWT hook needed.

Patient self-access policies (added in `0004_rls_additions.sql`) additionally allow:

- `patient_id = current_patient_id()` for select on `patients`, `appointments`, `visit_notes`, `prescriptions`, `prescription_items`, `visit_attachments`, `medical_history`.

So tenant isolation and "patient sees only their own data" are both enforced at the DB level. **A misconfigured UI cannot leak data across clinics or between patients.**

### 4.2 What RLS does *not* yet enforce — role-within-clinic

The current RLS treats every clinic_user role equally — a `receptionist` can `select` from `prescriptions` just as well as a `doctor` can. The role differentiation in section 3 above is currently enforced only in:

- **Server actions** that call `requireClinicAdmin()` (see `settings/team/actions.ts`) — the most explicit gate.
- **UI rendering** — buttons and routes hidden client-side based on the user's role.

**This is a hardening gap.** A determined receptionist can hit `createPrescriptionAction` directly from a crafted request and the server will let them through. To fix it properly, every write action should call a `requireRole(...)` helper before any DB write. Tracked as a polish-phase task.

### 4.3 What's enforced where — the truth table

| Permission | RLS | Server-action gate | UI gate |
|---|---|---|---|
| Cross-clinic isolation | ✅ | ✅ (via clinic_users lookup) | n/a |
| Patient self-access | ✅ | n/a | n/a |
| Super-admin global access | ✅ (via `is_super_admin()`) | n/a | ✅ |
| Clinic admin manages team | ❌ | ✅ (`requireClinicAdmin`) | ✅ |
| Doctor restricted to own appointments | ❌ | ❌ | ✅ |
| Doctor can write notes, receptionist can't | ❌ | ❌ | ✅ |
| Doctor cannot edit other doctors | ❌ | ❌ | ✅ |
| Receptionist cannot deactivate doctors | ❌ | ❌ | ✅ |

The ❌ rows are the hardening gap. The UI hides the wrong buttons today, but the actions themselves don't reject the wrong role.

---

## 5. Planned hardening

1. **`requireRole(roles[])` helper** in `src/lib/auth/require-role.ts`. Every write action calls it before touching the DB. Pattern:
   ```ts
   const gate = await requireRole(["clinic_admin", "doctor"]);
   if (!gate.ok) return gate;
   ```

2. **`current_doctor_id()` SQL helper.** When a `clinic_user.role = 'doctor'` is linked to a `doctors` row (currently they're not linked at all — that's a v2 gap), this helper returns the doctor's UUID and lets RLS scope further:
   ```sql
   create policy appointments_doctor_self on public.appointments
     for select using (
       clinic_id = current_clinic_id()
       and (
         current_role() != 'doctor' or doctor_id = current_doctor_id()
       )
     );
   ```

3. **Audit logging.** Sensitive writes (deactivate user, archive patient, delete attachment) should land a row in `audit_logs` with the actor + before/after diff. The table exists; the helper to write to it doesn't.

4. **Super-admin impersonation flow.** Today super-admins simply have cross-tenant select privileges. A safer pattern: explicit "Impersonate clinic X" with an audit trail and a banner across the UI.

---

## 6. Onboarding cheat-sheet

When you invite a new staff member, ask:

- **Do they manage other staff or the clinic's settings?** → `clinic_admin`.
- **Do they write prescriptions or visit notes?** → `doctor`.
- **Do they only book appointments and handle the front desk?** → `receptionist`.

If a person wears multiple hats (rural clinic owner who is also the dentist), use `clinic_admin` — it's a strict superset of `doctor`'s permissions at this time.
