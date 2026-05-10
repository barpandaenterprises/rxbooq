# Doctor Kart — Component & Screen Inventory

Single source of truth for the v1 build. Update as components are added or screens go live.

---

## Screens

| #  | Screen | Route | Design refs | Status | Owner | PR |
|----|--------|-------|-------------|--------|-------|----|
| 01 | Public clinic home              | `/` (clinic-site)                     | `design/refs/01-clinic-home/`    | 🚧 wip | – | – |
| 02 | Booking — service & doctor      | `/book`                               | `design/refs/02-booking-step1/`  | 🚧 wip | – | – |
| 03 | Booking — slot picker           | `/book/slot`                          | `design/refs/03-booking-step2/`  | 🚧 wip | – | – |
| 04 | Booking — patient details       | `/book/details`                       | `design/refs/04-booking-step3/`  | 🚧 wip | – | – |
| 05 | Booking success                 | `/book/success`                       | `design/refs/05-booking-success/`| 🚧 wip | – | – |
| 06 | Patient portal — appointments   | `/me/appointments`                    | `design/refs/06-patient-portal/` | 🚧 wip | – | – |
| 07 | Clinic dashboard — Today        | `/admin/today`                        | `design/refs/07-clinic-today/`   | 🚧 wip | – | – |
| 08 | Clinic dashboard — Patients     | `/admin/patients`                     | `design/refs/08-clinic-patients/`| 🚧 wip | – | – |
| 09 | Clinic dashboard — Messages     | `/admin/messages`                     | `design/refs/09-clinic-messages/`| 🚧 wip | – | – |
| 10 | Clinic dashboard — Analytics    | `/admin/analytics`                    | `design/refs/10-clinic-analytics/`| 🚧 wip | – | – |
| 11 | Super-admin tenants             | `/superadmin/clinics`                 | `design/refs/11-super-tenants/`  | 🚧 wip | – | – |
| 12 | Super-admin onboard wizard      | `/superadmin/clinics/new`             | `design/refs/12-super-onboard/`  | 🚧 wip | – | – |

Status legend: 🚧 wip · 🔄 needs revision · ✅ shipped

---

## Components

### Atoms (`src/components/atoms/`)
- [ ] BrandLogo
- [ ] LangSwitcher
- [ ] StatusBadge
- [ ] Avatar (re-exports shadcn)
- [ ] Tag / Chip
- [ ] KpiDelta
- [ ] WhatsAppIcon, CallIcon, CalendarIcon (FontAwesome wrappers)
- [ ] Spinner
- [ ] Skeleton
- [ ] EmptyStateIllustration

### Molecules (`src/components/molecules/`)
- [ ] KpiTile
- [ ] ServiceCard
- [ ] DoctorCard
- [ ] ReviewCard
- [ ] DateStripPill
- [ ] SlotPill
- [ ] AppointmentRow
- [ ] MessageBubble
- [ ] MessageThreadRow
- [ ] BookingStepperHeader
- [ ] WhatsAppPreviewFrame
- [ ] FormField (label + input + helper + error)
- [ ] LangPicker
- [ ] ConsentCheckbox

### Compositions (`src/components/compositions/`)
- [ ] PublicSiteHeader
- [ ] PublicSiteFooter
- [ ] Hero
- [ ] ServicesStrip
- [ ] WhyUsSection
- [ ] DoctorSection
- [ ] TestimonialsCarousel
- [ ] BrandCtaStrip
- [ ] ContactPanel
- [ ] BookingFlow
- [ ] BookingServicePicker
- [ ] BookingSlotPicker
- [ ] BookingPatientForm
- [ ] BookingSuccessCard
- [ ] PatientPortalAppointmentList
- [ ] ClinicTodayTimeline
- [ ] PatientsTable (TanStack Table)
- [ ] MessagesPane
- [ ] AnalyticsGrid
- [ ] SuperAdminTenantsGrid (AG Grid)
- [ ] OnboardClinicWizard

### Layouts (`src/components/layouts/`)
- [ ] PublicSiteLayout
- [ ] ClinicAppLayout
- [ ] SuperAdminLayout
- [ ] PatientPortalLayout

---

## Naming & file conventions

- One component = one file at the corresponding folder + a co-located `*.stories.tsx` and (for compositions) a `*.fixtures.ts` with mock data.
- All components are typed with explicit `Props`. No untyped destructuring.
- All visual variants live in `class-variance-authority` definitions next to the component, never inline in JSX.
- Public exports go through an `index.ts` per folder so feature code imports `@/components/atoms` etc. instead of file paths.
