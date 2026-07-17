# Multi-Clinic Doctor Booking — Requirement, Findings & Options

**Status:** Draft for team discussion — no implementation started.
**Author:** Engineering analysis (Claude)
**Date:** 2026-07-05
**Decision owners:** TBD (product + engineering)

---

## 1. The requirement

A single real-world doctor can practise at **multiple clinics**, with **different
availability at each** (e.g. Clinic A on Mon/Wed mornings, Clinic B on Tue/Thu
evenings).

We want the patient booking journey to be **doctor-first**:

1. Patient chooses a doctor.
2. System shows **all clinics** that doctor practises at (only where relevant —
   if the doctor is at one clinic, skip straight through).
3. Patient picks a **clinic**.
4. System shows the **available time slots for that clinic** (that clinic's own
   schedule for that doctor).
5. Patient books.

---

## 2. How the system works today (findings)

> All schema truth lives in `supabase/migrations/*.sql` — the generated
> `src/lib/supabase/database.types.ts` is a placeholder (`export type Database = any`).

### 2.1 A "doctor" is a per-clinic row — there is **no global doctor identity**

- `doctors.clinic_id` is `NOT NULL` and cascades from `clinics`
  (`supabase/migrations/0001_initial_schema.sql:46-59`). A doctor row belongs to
  exactly **one** clinic.
- The same real doctor working at two clinics = **two independent `doctors`
  rows** with **no key linking them**.
- `doctors.registration_no` exists (`0007_doctors_extended_fields.sql`) but is
  **free text, nullable, and has no unique constraint** anywhere. It is not a
  reliable identity key as-is.
- **No `clinic_doctors` / `doctor_clinics` / `memberships` join table exists.**

**This is the central blocker.** "Show all clinics a doctor is part of" is a
question the current schema cannot answer, because nothing says two doctor rows
are the same person.

### 2.2 Multi-clinic already exists — but only at the *login* layer

- Since `0019_multi_clinic_membership.sql`, the old `unique(auth_user_id)` on
  `clinic_users` was dropped and replaced with `unique(clinic_id, auth_user_id)`.
  → **One login (auth user) can be a member of many clinics.**
- `0020_doctor_login_scoping.sql` added `clinic_users.doctor_id` (nullable),
  linking a staff login to its per-clinic doctor profile, with a partial unique
  index `(clinic_id, doctor_id) where doctor_id is not null`.

So the *person who logs in* can already span clinics. We simply have not tied
their **doctor profiles** (the public-facing rows) together. This is the natural
seam to build on.

### 2.3 Availability is already per-`(clinic, doctor)` — **no change needed**

- `doctor_availability` (recurring weekly hours) carries **both** `clinic_id` and
  `doctor_id` (`0001:95-110`). Multiple rows per weekday allowed (multi-shift).
- `availability_overrides` (date-specific blocks/exceptions) also carries both
  (`0001:112-124`).
- There is **no stored slot table** — slots are computed at runtime by pure
  functions in `src/lib/data/booking-availability.ts`
  (`computeDoctorWorkingWindows`, `slotsInWindows`, `subtractBooked`,
  `workingDatesFor`) from availability + overrides + booked appointments +
  `clinic_slot_locks`.

**Because availability is already scoped per clinic, "different times at
different clinics" works the moment doctor rows are linked to a shared person.**

### 2.4 Appointments & double-booking are already per-`(clinic, doctor)`

- `appointments` → `clinic_id`, `doctor_id`, `patient_id`, `starts_at/ends_at`,
  `status` (`0001:126-147`; `service_id` was dropped in `0011`). Slot identity is
  `(doctor_id, starts_at)`.
- Double-booking is prevented by `clinic_slot_locks` — composite PK
  `(clinic_id, doctor_id, starts_at)` with `select … for update`
  (`0001:151-156`), **not** a DB unique index on appointments.

### 2.5 Booking is intentionally locked to a single tenant (security invariant)

- Booking lives entirely under `(clinic-app)/[clinicSlug]/…`. The clinic is
  resolved **server-side** from subdomain/slug/custom-domain via `src/middleware.ts`
  (headers `x-active-clinic-slug`, `x-clinic-slug`, `x-host`) →
  `getCurrentClinic()` (`src/lib/booking/current-clinic.ts`).
- `createPublicBookingAction` (`src/app/(clinic-app)/[clinicSlug]/book/actions.ts:371`)
  derives `clinic_id` from server-side tenant resolution, **never from client
  input** — so a patient cannot book against an arbitrary clinic. Every query
  explicitly filters `.eq("clinic_id", clinic.id)` because `serviceClient()`
  bypasses RLS.

> **Design implication:** the cross-clinic "pick a clinic" step must be a
> **router**, not a cross-tenant write. Once the patient picks a clinic, we send
> them *into that clinic's context* (`/[clinicSlug]/book?doctor=…`) and the
> existing, secure per-clinic booking runs unchanged. We do **not** loosen the
> server-side tenant scoping.

### 2.6 Current booking UI flow (for reference)

- Entry points converge on `src/components/compositions/BookingComposer.tsx`
  (client). Two modes: **by doctor** and **by department**.
- **Gap:** the "Book with Dr. X" links in `ClinicDoctorsSection.tsx` do **not**
  pre-select a doctor — they all point at the same `/[slug]/book`, and the
  patient re-picks the doctor inside the form. Any doctor-first flow will want to
  fix this (`?doctor=` preselect).
- Slot actions in `book/actions.ts`: `getPublicDoctorSlotsForDateAction`,
  `getPublicDeptSlotsForDateAction`, `getPublicDoctorsForSlotAction`,
  `getPublicDoctorWorkingDatesAction`; helper `fetchBookedSlots`.

### 2.7 There is no cross-clinic doctor discovery today

- The apex site (`rxbooq.com`) is **marketing only**. The only apex booking-
  adjacent page is `src/app/book/page.tsx` (`PickAClinicPage`) which lists
  **clinics**, not doctors, and links each to `/[slug]/book`.
- Doctors are only ever browsed/booked **within** a clinic's context.

---

## 3. What's easy vs. hard

| Piece | Effort | Why |
|---|---|---|
| Per-clinic availability at different times | **Already done** | `doctor_availability`/`overrides` carry `clinic_id` |
| Per-clinic slot computation & booking | **Already done** | `booking-availability.ts` + `book/actions.ts` reused as-is per clinic |
| Per-clinic double-booking safety | **Already done** | `clinic_slot_locks` PK |
| **Linking doctor rows to one person** | **Hard / core** | No global identity today — this is the crux |
| Doctor-first "pick a clinic" page | **Medium** | New page; routes patient into chosen clinic |
| Preselect doctor in booking form | **Small** | Fix existing `?doctor=` gap |
| Consent / who may link across clinics | **Policy + medium** | Must prevent Clinic A advertising Clinic B's doctor without permission |

**Key insight:** ~70% of the plumbing (availability, slots, booking, concurrency)
already exists and is correctly per-clinic. The real work is (a) a global
identity/linking model and (b) a thin doctor-first routing layer on top.

---

## 4. The central decision: how do two doctor rows become "the same person"?

This is the fork everything else hangs off. Three options:

### Option A — Explicit linked "practitioner" profile *(recommended)*

Introduce a global **`practitioners`** table (the person: name, slug, photo,
specialty, registration_no, is_public). Add a nullable
**`doctors.practitioner_id`** FK. A doctor/clinic-admin **explicitly links** their
per-clinic doctor row to a practitioner — creating a new one or claiming an
existing one (we can *suggest* matches by registration number, but the human
confirms).

- **Pros:** Consented and safe — no accidental merges; Clinic A cannot surface
  Clinic B's doctor without the doctor's action. Robust to typos/blank reg
  numbers. Clean home for a future public doctor directory. Builds naturally on
  the existing multi-clinic *login* model (`clinic_users` already spans clinics).
- **Cons:** Needs a small admin linking UI and a claim/verification step. One
  extra table + column.
- **Consent model:** a login that is a member of both clinics (already possible
  since `0019`) — or the doctor themselves — performs the link. Superadmin can
  assist.

### Option B — Auto-group by registration number

Treat all `doctors` rows sharing a `registration_no` as the same person. No
linking UI.

- **Pros:** Fastest to ship; zero new tables (just an index + queries).
- **Cons:** `registration_no` is **free-text, nullable, unverified** today. Typos
  → missed links; blanks → nothing to group on; collisions/format differences →
  **wrong merges** (surfacing the wrong clinic to patients — a trust/safety
  issue). Would need at minimum a normalization + verification pass first.

### Option C — Superadmin-linked only

Only platform superadmins link doctor rows across clinics from the console.

- **Pros:** Tightest control; good for a controlled early rollout.
- **Cons:** Manual, doesn't scale as clinics self-onboard; adds ops burden.

> A pragmatic path is **A as the model, with B as an assist** (use reg-number
> matching only to *suggest* links that a human confirms), and **C** available as
> a superadmin override. To be decided by the team.

---

## 5. Scope options for v1 (additive — choose the release contents)

1. **Doctor page + clinic picker** *(the core ask)* — a per-doctor page listing
   all clinics the practitioner is at + availability preview; pick a clinic →
   book that clinic's slots. Minimum to satisfy the requirement.
2. **Preselect doctor in booking form** — make `?doctor=` jump straight to that
   doctor's date/slot picker. Fixes an existing gap; also improves the normal
   single-clinic flow. Small, high-value.
3. **"Also practices at" nudge** — on a clinic's doctor card / booking page, show
   other clinics where the same doctor practises, linking across.
4. **Public doctor directory** — a browsable `rxbooq.com/doctors` (SEO/discovery).
   Bigger; safe to defer.

*(Team to decide which of these ship in the first release.)*

---

## 6. Proposed phased plan (pending decisions in §4 and §5)

### Phase 0 — Identity & linking (schema + admin)
- New migration: `practitioners` table + `doctors.practitioner_id` nullable FK.
- Backfill strategy for existing doctors (leave `practitioner_id` null;
  optionally auto-create a practitioner per existing doctor).
- Admin UI: link/claim a doctor row to a practitioner (with reg-number
  suggestions if we adopt the §4 "A + B assist" path).
- **No change** to availability, appointments, or slot locks.

### Phase 1 — Doctor-first page + clinic router
- New page (apex, e.g. `/doctors/[practitionerSlug]` — exact route TBD): shows
  the practitioner and every **active** clinic where they have an active doctor
  row, each with a next-available preview (reusing `workingDatesFor`).
- Selecting a clinic redirects into that clinic's tenant context:
  `/[clinicSlug]/book?doctor=<that clinic's doctor id>`.
- **Security preserved:** the actual booking still runs inside the clinic's
  server-resolved tenant scope — no cross-tenant write.
- Short-circuit: if the practitioner is at only one clinic, skip the picker.

### Phase 2 — Preselect doctor in `BookingComposer`
- Support `?doctor=` to preselect **and lock** the doctor, jumping to date/slot.
- Update `ClinicDoctorsSection` "Book with Dr. X" links to pass the doctor id.

### Phase 3 (optional) — Discovery surfaces
- In-clinic "Also practises at …" nudge.
- Public `rxbooq.com/doctors` directory (only lists `is_public` practitioners
  with ≥1 active clinic).

### Cross-cutting considerations to resolve during design
- **Consent/authorization** for linking (who can link, and can a doctor unlink
  from a clinic that lists them?).
- **Verification badge** semantics when a doctor is verified at one clinic but not
  another.
- **Which clinics appear**: `getClinicByHostOrSlug` does **not** filter on
  `status`/`verification_status` today — the doctor page should decide whether to
  show only active/verified clinics.
- **Booking ref prefix** is still `DK-` (legacy "doctorkart"); unrelated but worth
  noting if we touch booking copy.
- **Patient identity across clinics**: patients are per-clinic
  (`patients` + `patient_id` on appointments). A patient booking the same doctor
  at two clinics creates two patient records — expected, but note for later
  cross-clinic patient history (out of scope here).

---

## 7. Open questions for the team

1. **Identity model (§4):** A (explicit linked practitioner), B (auto by reg
   number), or C (superadmin-only) — or A-with-B-assist?
2. **v1 scope (§5):** which of the 4 pieces ship first?
3. **Entry point / route** for the doctor page — apex `/doctors/[slug]`, or
   surfaced only within clinics, or both?
4. **Consent & control:** who is allowed to link a doctor across clinics, and what
   does a doctor's consent/opt-out look like?
5. **Verification:** how do we present a doctor verified at Clinic A but not at
   Clinic B?
6. **Public directory:** in or out for the first release (SEO value vs. scope)?

---

## 8. TL;DR

- The booking/availability/concurrency machinery is **already per-clinic and
  reusable** — that's the good news.
- The **only fundamental gap** is that doctors have **no shared identity across
  clinics**. Solving that (recommended: an explicit `practitioners` entity that
  doctors link into) unlocks the entire requested flow.
- The cross-clinic "pick a clinic" step should be a **router into the chosen
  clinic's existing secure booking flow** — not a new cross-tenant booking path —
  so we keep the current tenant-security guarantees intact.
