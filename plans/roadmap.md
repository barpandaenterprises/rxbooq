# Doctor Kart — Phase-wise Build Roadmap

Living document. Each phase is meant to be a stop-and-review point — we ship it, smoke-test it, then move on.

---

## ✅ Already shipped

### Infrastructure
- Migrations `0001`–`0007`: full schema (clinics, doctors, patients, scheduling, clinical records, identity, OTP), RLS on every table, two storage buckets (`clinic-files` private + `public-assets` public), security-definer auth helpers, extended doctors table.
- Auth gate: middleware refreshes Supabase sessions and redirects unauthenticated users from `/admin/*` and `/superadmin/*` to `/login`.
- `MOCK_DATA` feature flag — toggles every data fetcher between canned demo data and live Supabase queries.

### Auth (clinic staff)
- `/login` page (RHF + Zod), `/auth/callback` route, `/logout` route.
- Sign-out icon + real user name/role in the admin sidebar (`getSignedInClinicUser`).
- Super-admin via `auth.users.raw_app_meta_data.role = 'superadmin'`.

### Screens wired to live data
- **`/admin/today`** — appointments list + KPI counts (live in DB / mock via flag).
- **`/admin/doctors`** — full list, fully wired.
- **Add doctor** flow — RHF + Zod, persists every form field through the `addDoctorAction` server action.

---

## 🛠 Phase A — Finish the admin core (high priority)

Goal: every screen under `/admin/*` reads from live DB and key writes work end-to-end.

| Item | Notes | Effort |
|---|---|---|
| **`/admin/patients`** list | Query `patients` + last-visit aggregate. Wire filter chips (language, visit window, tags) to query params. | M |
| **`/admin/patients/[id]`** chart | Joins across `patients` + `medical_history` + `visit_notes` + `prescriptions` + `prescription_items` + `visit_attachments` + `visit_tooth_treatments` + `wa_messages`. Biggest single screen. | L |
| **`/admin/doctors/[id]`** profile | Single doctor + their availability + override windows. Edit form (RHF + Zod). | M |
| **`/admin/calendar`** | Week/month grid of appointments. Re-uses `appointments` query with a wider date range. | M |
| **`/admin/messages`** | Inbox view of `wa_messages` grouped by patient. Read-only until Phase E adds replies. | S |
| **`NewAppointmentDialog`** | Wire to a server action that uses `clinic_slot_locks` (`select … for update`) to prevent double-booking. Refactor with RHF + Zod. | M |
| Patient + doctor edit / deactivate actions | Server actions with `revalidatePath`. | S each |

---

## 🛠 Phase B — Public booking end-to-end

Goal: a clinic visitor can book an appointment from `/book` and it lands in `appointments` with a real `patient` row.

| Item | Notes | Effort |
|---|---|---|
| `/book` service picker | Wire to live `services`. | S |
| `/book/slot` | Compute available slots from `doctor_availability` − `availability_overrides` − existing `appointments`. | M |
| `/book/details` | RHF + Zod form. `findOrCreatePatient(phone, clinic)` server action — looks up patient by `(clinic_id, phone_e164)` and creates if missing. | M |
| Slot-lock booking action | `select … for update` on `clinic_slot_locks`, then insert appointment in the same transaction. Handle race. | M |
| `/book/success` | Pull confirmation details from the just-created appointment. | S |

---

## 🛠 Phase C — File uploads & storage

Goal: the Add Attachment / Upload Prescription flows actually store files in the `clinic-files` bucket.

| Item | Notes | Effort |
|---|---|---|
| Upload helper (`src/lib/supabase/storage.ts`) | Wraps signed-upload URL + path convention. | S |
| `RxEntryDialog` storage wiring | Upload the photo to `clinics/{id}/prescription_photo/{uuid}.jpg`, insert `visit_attachments` row, link `prescriptions.source_photo_id`. | M |
| Patient chart attachment uploads | Generic upload picker that writes to `visit_attachments` with the right `kind`. | M |
| Signed-URL viewer | Render private file thumbnails by fetching short-lived signed URLs. | S |
| Clinic logo + doctor photo uploads | Public bucket, attached to clinics / doctors rows. | S |

---

## 🛠 Phase D — Forms cleanup (RHF + Zod everywhere)

Goal: no more raw `useState` form-state in the codebase. Validation lives in schemas.

| Item | Notes | Effort |
|---|---|---|
| `NewAppointmentDialog` | (Also in Phase A — call out which lands first) | S |
| `RxEntryDialog` | The most complex one — has wizard steps. Multi-step form with shared schema. | M |
| `BookingPatientForm` | Phone, name, language. | S |
| `BookingDetails` form | Already in Phase B. | S |
| `AddDoctorDialog` | ✅ done |
| `LoginForm` | ✅ done |

---

## 🛠 Phase E — WhatsApp integration

Goal: confirmations and reminders go out via Interakt; replies land in `wa_messages`.

| Item | Notes | Effort |
|---|---|---|
| Send-message server util | Wraps `interakt.sendTemplateMessage` + logs to `wa_messages`. | S |
| Booking-confirmation send | Fires after a successful booking (Phase B). | S |
| Reminder cron route | `/api/cron/reminders` hit by Supabase pg_cron — sends `reminder_evening_before_v1` and `reminder_one_hour_v1`. Auth via `CRON_SECRET`. | M |
| Interakt webhook handler | `/api/wa/webhook` — verifies signature, upserts incoming `wa_messages`. | M |
| Inbox replies | Manual outbound message from `/admin/messages`. | M |
| Template approval flow | Just docs — templates are registered in Interakt console; mirror approval status into `wa_templates`. | S |

---

## 🛠 Phase F — Clinic staff invite & management

Goal: clinic admin can add a doctor/receptionist account without using the SQL editor.

| Item | Notes | Effort |
|---|---|---|
| `inviteClinicUser` server action | `auth.admin.inviteUserByEmail` + insert into `clinic_users`. Restricted to `clinic_admin` role. | S |
| `/admin/settings/team` page | List + invite + role change + deactivate. | M |
| Invitation acceptance flow | Magic-link landing → password set → redirect to `/admin/today`. | S |

---

## 🛠 Phase G — Patient self-service auth (WhatsApp OTP)

Goal: patient on `/me/appointments` can sign in with their phone and see only their record.

| Item | Notes | Effort |
|---|---|---|
| `/api/auth/wa-otp/send` | Generate 6-digit code, hash, store in `otp_codes`, send via Interakt template `patient_otp_v1`. | M |
| `/api/auth/wa-otp/verify` | Verify hash + TTL, create-or-find `auth.users` row with synthetic email, upsert `patient_users`, issue session via admin magic-link. | M |
| `/(patient)/me/login` page | Phone entry → OTP entry → success. RHF + Zod. | M |
| Wire `/me/appointments` to live data | Patient sees only their rows (RLS already in place via `current_patient_id()`). | S |
| WhatsApp template registration | Approve `patient_otp_v1` template in Interakt console. | S |

---

## 🛠 Phase H — Analytics

Goal: `/admin/analytics` shows real numbers, not mock sparklines.

| Item | Notes | Effort |
|---|---|---|
| KPI aggregations on `/admin/today` | Replace the hardcoded no-show / new-patients-week numbers with real queries. | S |
| Analytics page queries | Funnel: appointments by status, no-show rate, new patient acquisition, revenue (price × completed appointments). | M |
| Date-range picker | URL-driven so analytics shares deep-linkable. | S |
| Trends + charts | Plug into existing `recharts`. | M |

---

## 🛠 Phase I — Super admin (Doctor Kart staff)

Goal: internal Doctor Kart team can onboard a new clinic without touching the DB.

| Item | Notes | Effort |
|---|---|---|
| `/superadmin/clinics` list | Live query of `clinics` (RLS already lets super-admin see all). | S |
| `/superadmin/clinics/new` wizard | Multi-step: clinic details → first admin user → services. Server action wraps all inserts in a transaction. | M |
| Custom-domain field | Just a free-text field on the clinic for now; DNS is manual. | S |
| Plan management | silver / gold toggle. | S |

---

## 🛠 Phase J — Polish

Goal: things that don't change behavior but keep the codebase healthy.

| Item | Notes | Effort |
|---|---|---|
| `npm run db:types` | Replace the permissive `Database = any` placeholder with real generated types. Run after every migration. | S |
| Real seed data | Port the rich mock data (5 doctors, 4 patient charts) into `supabase/seed.sql`. | M |
| Loading skeletons | Per-screen `loading.tsx` files so navigation feels instant. | S |
| Error boundaries | Per-route `error.tsx` files. | S |
| Mobile testing | Walk through each screen at 360px. | M |
| Storybook stories for primitives | Defer until atoms/molecules stabilize. | M |
| SETUP.md refresh | Document the migrations through `0007`, RHF+Zod convention, MOCK_DATA flag. | S |

---

## Suggested order

If we ship phase-by-phase: **A → B → C → D → E → F → G → H → I → J**. Reasoning:
- A unlocks day-to-day clinic operations (patients, calendar, appointments).
- B lets clinics receive bookings from the public.
- C unlocks the digital prescription flow that justifies the platform.
- D pays off accumulated form debt while the patterns are fresh.
- E completes the WhatsApp loop, which is the marketing wedge.
- F removes the last manual-SQL step from onboarding.
- G ships the patient portal.
- H, I, J are value-adds.

Stages A–C are the realistic "v1 launch" envelope. Everything after is iteration.

---

## Open scope questions (revisit when each phase starts)

- **A**: Are we modeling per-patient lifetime value as a real column, or computing it from `appointments × services.price_inr` on the fly?
- **B**: Do we want SMS fallback when WhatsApp send fails, or pure-WhatsApp v1?
- **C**: Real OCR (Google Vision / Azure Document Intelligence) or stick with mock recognition?
- **E**: Self-host the Interakt webhook tunnel for local dev, or use ngrok per developer?
- **G**: Phone OTP via WhatsApp only, or fall back to SMS via MSG91 if WhatsApp delivery fails?
- **I**: Should super-admin actions be 2-step (review before commit) for safety?
