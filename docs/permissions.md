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

A single auth user can hold **one `clinic_users` row per clinic** (the composite unique on `(clinic_id, auth_user_id)`, migration `0019`). The same person can be a member of multiple clinics, with a potentially different role and linked doctor profile in each.

### Doctor logins (migration `0020`)

A `doctor`-role login can be **linked to a `doctors` profile** via `clinic_users.doctor_id` (nullable; one login per profile per clinic). A linked doctor sees only **their own data**; an *unlinked* doctor login is **fail-closed** (sees nothing, can't book) until an admin links it.

- Create/link a login from **Doctors → Edit doctor → Login & access**, or **Settings → Team** (invite with role *Doctor* + pick a profile, or the per-row profile dropdown).
- A doctor's patients = those **assigned to them** (`patients.assigned_doctor_id`) **OR** those they have an appointment with. Admins/receptionists set the assignment from the patient add/edit dialog or the chart header.

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

### 4.2 Role-within-clinic — enforced at the app layer

RLS itself still treats every clinic_user role equally (tenant isolation only). Role differentiation — including **"a doctor sees only their own data"** — is enforced in the **application layer**:

- **Shared gate `requireRole([...])`** (`src/lib/auth/require-role.ts`), built on the URL-scoped `getActiveMembership()` (`src/lib/auth/current-user.ts`). Every sensitive write action calls it before touching the DB. `requireClinicAdmin()` is the `["clinic_admin"]` shorthand. The team + departments actions were migrated to it.
- **Data-loader scoping.** The `/admin/{today,calendar,patients,messages,analytics}` loaders and the patient chart add a `doctor`-only branch: appointments are filtered to `doctor_id = me`; patients to the assigned-OR-appointment union (`src/lib/data/doctor-scope.ts`); the chart guards access the same way. Admin/receptionist paths are unchanged.
- **Action constraints.** `createAppointmentAction` forces `doctor_id = self` for a doctor; doctor management, team/settings, archive, broadcasts, and inbox replies are blocked for doctors.
- **UI gating.** Sidebar hides *Settings* for doctors; the Doctors screen hides management controls; the inbox is read-only.

> **Caveat — RLS is unchanged (decision: app-layer-only for now).** A service-role query (`serviceClient()`) or any future direct query bypasses the doctor filter. Doctor-scoped loaders use `serverClient()` and must re-apply the doctor scope. Hardening this into RLS (`current_doctor_id()` + role-aware policies) remains a future step.

A determined receptionist can still hit `createPrescriptionAction` directly (clinical-write role split is not yet gated). That specific gap remains.

### 4.3 What's enforced where — the truth table

| Permission | RLS | Server-action gate | UI gate |
|---|---|---|---|
| Cross-clinic isolation | ✅ | ✅ (via clinic_users lookup) | n/a |
| Patient self-access | ✅ | n/a | n/a |
| Super-admin global access | ✅ (via `is_super_admin()`) | n/a | ✅ |
| Clinic admin manages team | ❌ | ✅ (`requireClinicAdmin`) | ✅ |
| Doctor restricted to own appointments / patients | ❌ | ✅ (loaders + `requireRole`) | ✅ |
| Doctor cannot edit / add / deactivate doctors | ❌ | ✅ (`requireClinicAdmin`) | ✅ |
| Doctor books only for themselves | ❌ | ✅ (forced `doctor_id`) | ✅ |
| Doctor cannot reply in inbox / broadcast | ❌ | ✅ (`requireRole`) | ✅ |
| Doctor cannot archive patients | ❌ | ✅ (`requireRole`) | n/a |
| Doctor can write notes, receptionist can't | ❌ | ❌ | ✅ |

The remaining ❌/❌ row (clinical-write split: notes/prescriptions doctor-only) is the open hardening gap. Doctor data-scoping is now enforced at the loader + action layer, not just the UI.

---

## 5. Planned hardening

1. **`requireRole(roles[])` helper** in `src/lib/auth/require-role.ts`. Every write action calls it before touching the DB. Pattern:
   ```ts
   const gate = await requireRole(["clinic_admin", "doctor"]);
   if (!gate.ok) return gate;
   ```

2. **`current_doctor_id()` SQL helper.** The `clinic_users.doctor_id` link now exists (migration `0020`) and is enforced in the app layer. The remaining step is to push the same scoping into RLS via a `current_doctor_id()` helper, so a crafted service-role/direct query can't bypass it:
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
