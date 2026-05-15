# Client Onboarding — Operating Model Questions

This is the running list of decisions we need from the clinic owner before locking the implementation. Each question describes what changes downstream, lays out the options, and notes the team's current default-thinking. The clinic's answer drives schema, RLS, UI, and copy.

> **How to use this doc.** Walk through it on a kickoff call. Mark the chosen option per section. Anything left blank gets the "default if not answered" pick.

---

## 1. Patient visibility across doctors in the same clinic

**The question.** If five doctors work at one clinic, should every doctor see every other doctor's patient records, notes, and prescriptions?

**Options.**

| Mode | Behaviour | When it fits |
|---|---|---|
| **Open** | All doctors see all patients, full charts. | Small clinics where the team shares continuity of care; cross-coverage when a doctor's on leave. Most dental / family clinics. |
| **Shared basics, private clinical** | Demographics + allergies + medication list + appointment history are shared. Visit notes + prescriptions are author-only. | Mid-size clinics that want privacy on clinical reasoning but smooth handoffs on the basics. |
| **Siloed** | Each doctor sees only patients they've personally treated. | Multi-specialty clinics where doctors are independent practitioners renting space. |

**Default if not answered:** **Open**. It mirrors current behaviour and how most small clinics operate.

**Implication if changed later.** Switching from Open → Siloed mid-flight will hide existing patient charts from doctors who never treated them. Plan for a "share patient" admin action before the flip.

---

## 2. Statistics & analytics visibility

**The question.** When a doctor opens `/admin/analytics` or `/admin/today` KPIs, should they see clinic-wide numbers or only their own slice?

**Options.**

- **Clinic-wide for everyone** — every staff member sees the same numbers (today's default).
- **Doctor sees only their own** — KPIs, revenue, no-show rate, top services all filtered by `doctor_id`. Admins still see clinic-wide.

**Default if not answered:** **Doctor sees own** when the clinic picks Siloed in section 1, otherwise **clinic-wide**.

---

## 3. High-volume OPD slots (rural / camp clinics)

**The question.** Does any doctor see multiple patients within the same time slot — e.g. 15 patients in a 10:00–11:00 OPD window where the doctor just sees them in arrival order?

**Options.**

| Mode | Schema | UX |
|---|---|---|
| **One slot = one patient** | `slot_minutes` controls grid (4, 5, 15, 30…). | Each slot is one cell; patient is told "10:24 AM". |
| **Sessions with capacity** | Add `slot_capacity int default 1` to `doctor_availability`. Drop the slot-lock unique constraint; replace with count-vs-capacity under row lock. | Slot cell shows "5 / 15 booked" until full. Patient gets a token number, not a clock time. |

**Default if not answered:** **One slot = one patient** with `slot_minutes = 15`. If the clinic confirms they run OPD with multi-patient sessions, we ship the capacity-per-slot migration.

---

## 4. Doctors visiting multiple clinics

**The question.** Does the clinic share visiting consultants with other clinics on the platform (the same Dr. X appears at Clinic A and Clinic B)?

**Options.**

- **Duplicate row per clinic** (today's model). Each clinic gets its own `doctors` row with the same name. Bio/profile fields are duplicated.
- **Many-to-many** — `doctors` becomes clinic-agnostic; a `clinic_doctors` link table holds the clinic-specific attributes (registration_no, display_order, status). Bigger refactor.

**Default if not answered:** **Duplicate row per clinic**. Move to many-to-many once we have a clinic actually living this pain.

---

## 5. Appointment scheduling rules

**5a. Slot length.** Default 15 min. Some doctors want 30 or 45. Per-doctor (via `doctor_availability.slot_minutes`) or per-clinic default?

**5b. Lunch / breaks.** Currently hardcoded `14:00–14:30` in the UI. Should breaks be:
- Per-doctor, configurable from the Schedule tab via `availability_overrides`?
- Per-clinic, applies to everyone?

**5c. Lead time.** Minimum hours before an appointment can be booked online (so the front desk has time to prepare). 0h, 1h, 4h, same-day-cutoff at 18:00 the day before, …?

**5d. Maximum advance.** Furthest out a patient can self-book. 14 days, 30 days, 90 days?

**5e. No-show handling.** Auto-mark `no_show` if not checked in by start + X minutes? Send a follow-up template? Block re-booking for repeat offenders?

---

## 6. WhatsApp templates & cadence

**The question.** Which of these messages should fire automatically?

| Template | When | Default? |
|---|---|---|
| `booking_confirmation_v1` | Immediately after a booking is created. | ✅ on |
| `reminder_evening_before_v1` | 7 PM the day before. | ✅ on |
| `reminder_one_hour_v1` | 60 min before the appointment. | ✅ on |
| `noshow_followup_v1` | 30 min after a marked no-show. | optional |
| `post_visit_followup_v1` | 24 hours after a completed visit. | optional |
| `review_request_v1` | 48 hours after a completed visit, with GMB link. | optional |
| `cancellation_ack_v1` | When a booking is cancelled. | ✅ on |

**Bonus questions.**
- WhatsApp template language: English, Hindi, Odia, or all three? (Patient's preferred language drives this — we already store it.)
- Reply handling: who's responsible for responding to incoming WhatsApp messages (which staff role)?
- Opt-out keyword: standard `STOP`, or clinic-specific?

---

## 7. Patient self-service portal

**The question.** Do you want patients to log in to view their own appointments, prescriptions, and files?

**Options.**

- **No portal** — patients only receive WhatsApp confirmations and reminders. Simpler operations.
- **Portal with WhatsApp OTP** — `/me/login` flow, patient enters phone, gets OTP on WhatsApp, sees `/me/appointments` with full history. Already built. Needs a WhatsApp template approval for the OTP message.

**If portal is enabled — visibility scope:** Patients see their own appointments, prescriptions, and attachments. Anything we should hide? (e.g. doctor-internal notes that shouldn't reach the patient.)

**Default if not answered:** Portal **off** for v1, enable per clinic on request.

---

## 8. Patient registration policy

**The question.** Who can become a patient at this clinic, and how?

**Options.**

- **Reception-only.** Patients must be added by staff via `/admin/patients`. Online booking only works for existing patients.
- **Self-registration via booking.** Anyone can hit `/book` on the public site and create their own patient row by providing name + phone. (Current default.)
- **Self-registration with phone-verify.** Same as above, but the patient must verify their phone via OTP before the booking is confirmed.

**Default if not answered:** **Self-registration via booking** with no OTP verify. Reception can clean up duplicates later.

---

## 9. Receptionist permissions (within-clinic role detail)

The default permissions matrix is in [permissions.md](../permissions.md). Confirm or override:

- Can receptionists **archive patients**? Default: ❌ (admin only).
- Can receptionists **cancel any doctor's appointment** or only their own bookings? Default: ✅ any.
- Can receptionists **reply to WhatsApp messages**? Default: ✅.
- Can receptionists **edit a doctor's profile**? Default: ❌.
- Can receptionists **block a doctor's dates**? Default: ❌.

---

## 10. Doctor permissions

- Can doctors **invite new patients**? Default: ✅ (same as reception).
- Can doctors **see other doctors' patients** when an admin isn't around to share? Tied to section 1's choice.
- Can doctors **edit prescriptions written by another doctor**? Default: ❌ (only the author + admin).
- Can doctors **deactivate their own profile** (go off-duty)? Default: ❌ (admin only — prevents accidental lockout).

---

## 11. Payments

**The question.** How does the clinic collect payment?

- **Cash / UPI at the counter only** — Doctor Kart records nothing about payment. (Current.)
- **Mark paid manually** — Reception updates an `appointments.payment_status` column to `paid` / `pending`. Simple ledger.
- **Online payment at booking** — Razorpay / similar gateway integrated into the public booking flow. Requires PCI considerations and a new schema for transactions.

**Default if not answered:** **Cash / UPI at counter only** for v1.

---

## 12. Clinical content depth

**The question.** Beyond the standard chart (visit notes, prescriptions, attachments), what does the clinic need to capture?

- **Dental-specific:** Tooth-by-tooth treatment plan (FDI 11–48 notation) — we have the `visit_tooth_treatments` table for this. Use it or leave it empty?
- **Vital signs:** BP, weight, temperature at each visit — needs a new `visit_vitals` table or jsonb column on `visit_notes`.
- **Lab orders:** Integration with a lab partner, or just text + file upload?
- **Consent forms:** Stored as PDFs against `visit_attachments.kind = 'consent'`. Pre-built templates per service type?

---

## 13. Data residency, retention, and exit

DPDP / DPDPA-relevant.

- **Region.** Default: Supabase Mumbai (asia-south1). Any objection?
- **Audit log retention.** Default: keep `audit_logs` forever. Want a 12-month / 24-month / 7-year window?
- **Patient record retention.** Default: never delete; patient can request anonymisation.
- **Data export on exit.** Default: clinic can export all their tables as CSV at any time via admin. Need a "export & delete" flow?

---

## 14. Branding

- **Logo upload.** Public bucket — appears on `/book`, on WhatsApp template `clinic_name` header if Meta approves dynamic media, and on the admin sidebar.
- **Brand colors.** Currently per-clinic via `clinics.theme jsonb`. Default brand blue `#0168B3`, brand-dark `#0E5087`. Provide the clinic's hex values.
- **Custom domain.** Default: subdomain like `mahakur.doctorkart.in`. Custom domain (e.g. `book.mahakurdental.com`) needs DNS configuration.
- **Patient ID format.** Default: `P-` + last 4 hex chars of the UUID. Some clinics use their own numbering ("MD-2026-0123"). Worth keeping our display ID, or use clinic-supplied?

---

## 15. Default UI language

- Per-clinic default language for the admin app: English, Hindi, Odia?
- Are non-English staff actually going to use the admin in a regional language, or is English fine for staff and we only need patient-facing copy translated?

**Default if not answered:** **English for staff**, multilingual for patient-facing copy (WhatsApp templates, booking flow) based on each patient's `language`.

---

## 16. Multilingual marketing site UI

**The question.** Should the public marketing site (`/`, `/book`, doctor pages) be translated into Hindi and Odia, or stay English-only?

**Current state (v1).** **English-only for UI copy.** The placeholder English/Hindi/Odia switcher in the header was removed because it set a cookie nothing read. Patient *preference* still gets captured properly in `/book/details` — the booking form has a language selector that writes to `patients.language`, and WhatsApp templates fire in the patient's preferred language. So the **operational bilingual surface (WhatsApp) is already real**; only the *marketing-page UI* is English-only.

**Options.**

| Mode | What it means | Effort |
|---|---|---|
| **English-only UI** (default) | All headings, service descriptions, doctor blurbs, About / Contact copy in English. Patient WhatsApp comms stay in their preferred language. | 0 days — what we have today. |
| **Translated marketing UI** | Wire `next-intl` (already installed), extract every user-facing string into `messages/{en,hi,or}.json`, get real translations from a fluent speaker (not Google Translate — clinical/medical copy is high-stakes), reintroduce the header switcher. | ~2–3 days for site + booking flow. Recurring cost: copy must be translated for every new section / banner / service. |
| **Patient WhatsApp only** | Don't translate the marketing site. Translate WhatsApp templates (booking confirmation, reminders, OTP) in all three languages, keyed off `patients.language`. | ~0.5 days per template once we have fluent copy. |

**Default if not answered:** **English-only UI** + **Patient WhatsApp only** (multi-language templates). Most patients land on the marketing page once to book; their ongoing relationship with the clinic happens over WhatsApp where the language pick *does* travel with them.

**Implication if the clinic wants translated UI later.** Bring back the header switcher (the schema + cookie hook are minimal), wire `next-intl`'s provider into the root layout, extract strings. The plumbing is straightforward; finding people to translate clinical copy in Hindi + Odia is the longer-pole task.

---

## Next steps

1. Run through this doc with the clinic on a 30-minute call.
2. Capture answers inline (or in a sibling doc `operating-model-<clinic-slug>.md` if you want one decision-set per clinic).
3. Open a ticket per item that needs implementation work; link back to this doc.

When new questions surface during the build, add them here so future clinics get the same checklist.
