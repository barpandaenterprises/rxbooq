"use client";

import * as Tabs from "@radix-ui/react-tabs";
import Link from "next/link";
import { useMemo } from "react";
import { BlockDatesDialog } from "@/components/molecules/BlockDatesDialog";
import { DoctorScheduleGrid } from "@/components/molecules/DoctorScheduleGrid";
import { EditDoctorDialog } from "@/components/molecules/EditDoctorDialog";
import { TEL_HREF, waLink } from "@/lib/contact";
import {
  BOOKING_SERVICES,
} from "@/lib/booking-data";
import {
  STATUS_META,
  WEEKDAYS,
  WEEKDAY_LABEL,
  summariseSchedule,
  type Doctor,
  type Review,
} from "@/lib/doctors-data";

type Props = {
  doctor: Doctor;
};

const TABS: Array<{ value: string; label: string; icon: string }> = [
  { value: "overview", label: "Overview",     icon: "fa-id-card" },
  { value: "schedule", label: "Schedule",     icon: "fa-calendar-alt" },
  { value: "services", label: "Services",     icon: "fa-tooth" },
  { value: "patients", label: "Patients",     icon: "fa-users" },
  { value: "reviews",  label: "Reviews",      icon: "fa-star" },
];

export function DoctorProfile({ doctor }: Props) {
  const status = STATUS_META[doctor.status];

  // WhatsApp link to the doctor if their phone is on file, else to the clinic.
  const doctorPhoneDigits = (doctor.phone ?? "").replace(/\D/g, "");
  const doctorWaHref = doctorPhoneDigits.length >= 10
    ? `https://wa.me/${doctorPhoneDigits.length === 10 ? "91" + doctorPhoneDigits : doctorPhoneDigits}?text=${encodeURIComponent(`Hi ${doctor.name},`)}`
    : waLink(`Hi ${doctor.name},`);

  // Patients-seen demo data — filtered out of the global patient list by doctor name.
  const patientsSeen = useMemo(() => {
    return DEMO_PATIENTS_SEEN[doctor.id] ?? [];
  }, [doctor.id]);

  return (
    <div className="px-5 pt-5 md:px-8 md:pt-6">
      {/* Breadcrumb */}
      <div className="mb-3 text-[12px] text-muted">
        <Link href="/admin/doctors" className="text-link-hover no-underline">Doctors</Link>
        <i className="fas fa-chevron-right mx-1.5 text-[9px] text-[#cdd9e4]" />
        <span>{doctor.name}</span>
      </div>

      {/* Header */}
      <div className="rounded-[12px] border border-border bg-white p-5">
        <div className="flex flex-wrap items-start gap-4">
          <span
            className="grid h-16 w-16 flex-none place-items-center overflow-hidden rounded-pill text-[22px] font-semibold"
            style={{ background: doctor.avatarBg, color: doctor.avatarFg }}
          >
            {doctor.photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={doctor.photoUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              doctor.initials
            )}
          </span>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-[22px] font-semibold leading-7 text-heading md:text-[24px]">
                {doctor.name}
              </h1>
              <span
                className="inline-flex items-center gap-1.5 rounded-pill px-2.5 py-0.5 text-[11px] font-semibold"
                style={{ background: status.bg, color: status.fg }}
              >
                <span className="h-1.5 w-1.5 rounded-pill" style={{ background: status.dot }} />
                {status.label}
              </span>
              {doctor.visiting && (
                <span className="inline-flex items-center gap-1 rounded-pill border border-[#F4D9A8] bg-[#FFF8EC] px-2 py-0.5 text-[11px] font-semibold text-[#7a5c2b]">
                  <i className="fas fa-suitcase text-[9px]" />
                  Visiting consultant
                </span>
              )}
            </div>

            <div className="mt-1 text-[14px] font-medium text-link-hover">
              {doctor.qualifications.join(", ")} · Reg. No. {doctor.registrationNumber}
            </div>

            <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-muted">
              <span>
                <i className="fas fa-stethoscope mr-1.5 text-[11px] text-[#9aa9b8]" />
                {doctor.primarySpecialty}
              </span>
              <span>
                <i className="fas fa-university mr-1.5 text-[11px] text-[#9aa9b8]" />
                {doctor.trainedAt}
              </span>
              <a href={TEL_HREF} className="no-underline hover:text-link-hover">
                <i className="fas fa-phone mr-1.5 text-[11px] text-[#9aa9b8]" />
                {doctor.phone}
                {doctor.whatsappOptIn && (
                  <i className="fab fa-whatsapp ml-1.5 text-[13px] text-[#25D366]" />
                )}
              </a>
              {doctor.email && (
                <a href={`mailto:${doctor.email}`} className="no-underline hover:text-link-hover">
                  <i className="fas fa-envelope mr-1.5 text-[11px] text-[#9aa9b8]" />
                  {doctor.email}
                </a>
              )}
            </div>

            {doctor.subSpecialties.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {doctor.subSpecialties.map((s) => (
                  <span
                    key={s}
                    className="rounded-pill border border-border bg-surface-muted px-2 py-0.5 text-[11px] text-muted"
                  >
                    {s}
                  </span>
                ))}
              </div>
            )}

            {doctor.visitingNote && (
              <div className="mt-2 inline-flex items-center gap-1.5 rounded-md border border-[#F4D9A8] bg-[#FFF8EC] px-2.5 py-1 text-[11px] text-[#7a5c2b]">
                <i className="fas fa-info-circle text-[10px]" />
                {doctor.visitingNote}
              </div>
            )}
          </div>

          {/* Action cluster */}
          <div className="flex flex-wrap gap-2">
            <EditDoctorDialog
              doctor={doctor}
              trigger={
                <button
                  type="button"
                  className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-border bg-white px-3 py-2 text-[13px] font-medium text-heading hover:border-link-hover"
                >
                  <i className="fas fa-pen text-[11px]" /> Edit
                </button>
              }
            />
            <a
              href={doctorWaHref}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-md border border-border bg-white px-3 py-2 text-[13px] font-medium text-heading no-underline hover:border-[#25D366]"
            >
              <i className="fab fa-whatsapp text-[12px] text-[#25D366]" /> Message
            </a>
            <BlockDatesDialog
              doctorId={doctor.id}
              doctorName={doctor.name}
              trigger={
                <button
                  type="button"
                  className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-border bg-white px-3 py-2 text-[13px] font-medium text-heading hover:border-link-hover"
                >
                  <i className="fas fa-calendar-times text-[11px]" /> Block dates
                </button>
              }
            />
          </div>
        </div>

        {/* Vitals row */}
        <div className="mt-4 grid grid-cols-2 gap-3 border-t border-border pt-4 sm:grid-cols-4">
          <Vital label="Experience"  value={`${doctor.stats.yearsExperience} years`} icon="fa-clock" />
          <Vital label="Patients"    value={doctor.stats.patientsServed.toLocaleString("en-IN")} icon="fa-users" />
          <Vital label="Appointments" value={doctor.stats.appointmentsCompleted.toLocaleString("en-IN")} icon="fa-calendar-check" />
          <Vital
            label="Rating"
            value={doctor.stats.reviewCount > 0 ? `★ ${doctor.stats.avgRating.toFixed(1)} (${doctor.stats.reviewCount})` : "—"}
            icon="fa-star"
            accent={doctor.stats.avgRating >= 4.5 ? "ok" : undefined}
          />
        </div>
      </div>

      {/* Tabs */}
      <Tabs.Root defaultValue="overview" className="mt-5">
        <Tabs.List
          aria-label="Doctor profile sections"
          className="-mx-1 mb-4 flex gap-1 overflow-x-auto border-b border-border px-1 pb-px"
        >
          {TABS.map((t) => (
            <Tabs.Trigger
              key={t.value}
              value={t.value}
              className="inline-flex cursor-pointer items-center gap-1.5 whitespace-nowrap border-b-2 border-transparent px-3 py-2 text-[13px] font-medium text-muted transition-colors hover:text-heading data-[state=active]:border-cta data-[state=active]:text-link-hover"
            >
              <i className={`fas ${t.icon} text-[12px]`} />
              {t.label}
            </Tabs.Trigger>
          ))}
        </Tabs.List>

        {/* OVERVIEW */}
        <Tabs.Content value="overview" className="focus:outline-none">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-[1.4fr_1fr]">
            <div className="rounded-[12px] border border-border bg-white p-5">
              <h3 className="text-[14px] font-semibold uppercase tracking-[0.06em] text-[#9aa9b8]">Biography</h3>
              {doctor.bio ? (
                <p className="mt-2 text-[14px] leading-[22px] text-heading">{doctor.bio}</p>
              ) : (
                <p className="mt-2 text-[13px] italic text-muted">No biography on file yet.</p>
              )}

              <div className="mt-5 border-t border-border pt-4">
                <h3 className="text-[14px] font-semibold uppercase tracking-[0.06em] text-[#9aa9b8]">Credentials</h3>
                <dl className="mt-2 space-y-2.5 text-[13px]">
                  <Row icon="fa-graduation-cap" label="Qualifications" value={doctor.qualifications.join(", ")} />
                  <Row icon="fa-id-badge" label="Registration" value={doctor.registrationNumber} />
                  <Row icon="fa-university" label="Trained at" value={doctor.trainedAt} />
                  <Row icon="fa-stethoscope" label="Primary specialty" value={doctor.primarySpecialty} />
                  {doctor.subSpecialties.length > 0 && (
                    <Row icon="fa-puzzle-piece" label="Also handles" value={doctor.subSpecialties.join(" · ")} />
                  )}
                </dl>
              </div>
            </div>

            <div className="space-y-3">
              <div className="rounded-[12px] border border-border bg-white p-5">
                <h3 className="text-[14px] font-semibold uppercase tracking-[0.06em] text-[#9aa9b8]">Languages</h3>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {doctor.languages.map((l) => (
                    <span key={l} className="rounded-pill border border-border bg-surface-muted px-2.5 py-0.5 text-[12px] text-heading">
                      {l === "EN" ? "English" : l === "HI" ? "हिंदी" : "ଓଡ଼ିଆ"}
                    </span>
                  ))}
                </div>
              </div>

              <div className="rounded-[12px] border border-border bg-white p-5">
                <h3 className="text-[14px] font-semibold uppercase tracking-[0.06em] text-[#9aa9b8]">Hours snapshot</h3>
                <div className="mt-2 text-[13px] text-heading">{summariseSchedule(doctor.schedule)}</div>
                <div className="mt-3 space-y-1">
                  {WEEKDAYS.map((d) => {
                    const range = doctor.schedule[d]?.[0];
                    return (
                      <div key={d} className="flex items-center justify-between text-[12px]">
                        <span className="text-muted">{WEEKDAY_LABEL[d]}</span>
                        <span className={range ? "font-medium text-heading" : "text-[#cdd9e4]"}>
                          {range ? `${range.start} – ${range.end}` : "Off"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="rounded-[12px] border border-border bg-white p-5">
                <h3 className="text-[14px] font-semibold uppercase tracking-[0.06em] text-[#9aa9b8]">Joined</h3>
                <div className="mt-1 text-[13px] text-heading">
                  {new Date(doctor.joinedOn).toLocaleDateString("en-IN", {
                    day: "numeric", month: "long", year: "numeric",
                  })}
                </div>
              </div>
            </div>
          </div>
        </Tabs.Content>

        {/* SCHEDULE */}
        <Tabs.Content value="schedule" className="focus:outline-none">
          <div className="mb-3 flex items-baseline justify-between">
            <div>
              <h3 className="text-[16px] font-semibold text-heading">Weekly hours</h3>
              <p className="mt-0.5 text-[12px] text-muted">
                These hours feed the booking flow. {summariseSchedule(doctor.schedule)}.
              </p>
            </div>
            <button
              type="button"
              className="inline-flex items-center gap-1.5 rounded-md border-[1.5px] border-link-hover bg-white px-3.5 py-1.5 text-[13px] font-medium text-link-hover hover:bg-link-hover hover:text-white"
            >
              <i className="fas fa-pen text-[10px]" /> Edit hours
            </button>
          </div>
          <DoctorScheduleGrid schedule={doctor.schedule} />

          <div className="mt-4 rounded-[12px] border border-border bg-white p-5">
            <h3 className="text-[14px] font-semibold uppercase tracking-[0.06em] text-[#9aa9b8]">Upcoming exceptions</h3>
            <p className="mt-2 text-[13px] italic text-muted">No leave or special hours scheduled.</p>
            <button
              type="button"
              className="mt-3 inline-flex items-center gap-1.5 rounded-md border border-border bg-white px-3 py-1.5 text-[12px] font-medium text-heading hover:border-link-hover"
            >
              <i className="fas fa-plus text-[10px]" /> Add leave or extra hours
            </button>
          </div>
        </Tabs.Content>

        {/* SERVICES */}
        <Tabs.Content value="services" className="focus:outline-none">
          <div className="rounded-[12px] border border-border bg-white">
            <div className="flex items-baseline justify-between border-b border-border px-5 py-4">
              <div>
                <h3 className="text-[16px] font-semibold text-heading">Services offered</h3>
                <p className="mt-0.5 text-[12px] text-muted">
                  Toggle to add or remove. Affects the booking step-1 picker.
                </p>
              </div>
              <button
                type="button"
                className="inline-flex items-center gap-1.5 rounded-md border-[1.5px] border-link-hover bg-white px-3.5 py-1.5 text-[13px] font-medium text-link-hover hover:bg-link-hover hover:text-white"
              >
                <i className="fas fa-pen text-[10px]" /> Edit
              </button>
            </div>
            <div className="grid grid-cols-1 gap-2 p-3 sm:grid-cols-2">
              {BOOKING_SERVICES.map((s) => {
                const offered = doctor.services.includes(s.id);
                return (
                  <div
                    key={s.id}
                    className={
                      "flex items-center gap-3 rounded-md border p-3 " +
                      (offered ? "border-[#cdebd5] bg-[#F5FBF7]" : "border-border bg-white")
                    }
                  >
                    <span
                      className={
                        "grid h-9 w-9 flex-none place-items-center rounded-md text-[14px] " +
                        (offered ? "bg-[#E6F4EC] text-[#3a8b5e]" : "bg-surface-muted text-[#cdd9e4]")
                      }
                    >
                      <i className={`fas ${s.icon}`} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="text-[14px] font-semibold text-heading">{s.name}</div>
                      <div className="text-[11px] text-muted">{s.duration} · {s.fee}</div>
                    </div>
                    {offered ? (
                      <i className="fas fa-check-circle text-[16px] text-[#3a8b5e]" />
                    ) : (
                      <span className="rounded-pill border border-border bg-white px-2 py-0.5 text-[10px] uppercase tracking-[0.06em] text-[#9aa9b8]">
                        Off
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </Tabs.Content>

        {/* PATIENTS */}
        <Tabs.Content value="patients" className="focus:outline-none">
          <div className="rounded-[12px] border border-border bg-white">
            <div className="flex items-baseline justify-between border-b border-border px-5 py-4">
              <div>
                <h3 className="text-[16px] font-semibold text-heading">
                  Patients seen by {doctor.name.split(" ").slice(0, 2).join(" ")}
                </h3>
                <p className="mt-0.5 text-[12px] text-muted">
                  Across the last 90 days. Click any patient for the full chart.
                </p>
              </div>
              <Link
                href={`/admin/patients?doctor=${doctor.id}`}
                className="text-[13px] text-link-hover no-underline"
              >
                View all in Patients →
              </Link>
            </div>
            {patientsSeen.length === 0 ? (
              <EmptyState icon="fa-users" label="No patients yet" hint="When this doctor sees their first patient, they'll be listed here." />
            ) : (
              <div className="divide-y divide-[#F4F5F7]">
                {patientsSeen.map((p) => (
                  <Link
                    key={p.id}
                    href={`/admin/patients/${p.id}`}
                    className="flex items-center gap-3 px-5 py-3.5 no-underline hover:bg-[#FAFAFB]"
                  >
                    <span
                      className="grid h-9 w-9 flex-none place-items-center rounded-pill text-[12px] font-semibold"
                      style={{ background: p.avBg, color: p.avFg }}
                    >
                      {p.initials}
                    </span>
                    <div className="flex-1">
                      <div className="text-[14px] font-semibold text-heading">{p.name}</div>
                      <div className="text-[11px] text-muted">
                        Last visit · {p.lastVisit} · {p.lastService}
                      </div>
                    </div>
                    <i className="fas fa-arrow-right text-[11px] text-muted" />
                  </Link>
                ))}
              </div>
            )}
          </div>
        </Tabs.Content>

        {/* REVIEWS */}
        <Tabs.Content value="reviews" className="focus:outline-none">
          {doctor.reviews.length === 0 ? (
            <EmptyState icon="fa-star" label="No reviews yet" hint="Patient reviews from WhatsApp follow-ups will appear here once collected." />
          ) : (
            <div className="space-y-3">
              <div className="rounded-[12px] border border-border bg-white p-5">
                <div className="flex items-center gap-3">
                  <div>
                    <div className="text-[36px] font-bold leading-9 text-heading">
                      ★ {doctor.stats.avgRating.toFixed(1)}
                    </div>
                    <div className="text-[12px] text-muted">{doctor.stats.reviewCount} reviews</div>
                  </div>
                  <div className="ml-auto text-[12px] text-muted">
                    Showing {doctor.reviews.length} recent
                  </div>
                </div>
              </div>
              {doctor.reviews.map((r) => <ReviewCard key={r.id} r={r} />)}
            </div>
          )}
        </Tabs.Content>
      </Tabs.Root>

      <div className="h-12" />

    </div>
  );
}

function Vital({
  label,
  value,
  icon,
  accent,
}: {
  label: string;
  value: string;
  icon: string;
  accent?: "ok";
}) {
  const valueColor = accent === "ok" ? "text-[#3a8b5e]" : "text-heading";
  return (
    <div className="flex items-center gap-2.5">
      <span className="grid h-8 w-8 flex-none place-items-center rounded-md bg-[#E6F1FA] text-[12px] text-brand">
        <i className={`fas ${icon}`} />
      </span>
      <div>
        <div className="text-[10px] font-semibold uppercase tracking-[0.06em] text-[#9aa9b8]">{label}</div>
        <div className={"mt-0.5 text-[14px] font-semibold " + valueColor}>{value}</div>
      </div>
    </div>
  );
}

function Row({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="grid grid-cols-[120px_1fr] gap-3 text-[13px]">
      <dt className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-[#9aa9b8]">
        <i className={`fas ${icon} text-[10px]`} />
        {label}
      </dt>
      <dd className="text-heading">{value}</dd>
    </div>
  );
}

function ReviewCard({ r }: { r: Review }) {
  return (
    <div className="rounded-[12px] border border-border bg-white p-4">
      <div className="flex items-start gap-3">
        <span className="grid h-9 w-9 flex-none place-items-center rounded-pill bg-[#F4F5F7] text-[12px] font-semibold text-link-hover">
          {r.patientInitials}
        </span>
        <div className="flex-1">
          <div className="flex items-center justify-between gap-2">
            <div className="text-[13px] font-semibold text-heading">{r.patientName}</div>
            <div className="text-[11px] text-[#9aa9b8]">{r.date}</div>
          </div>
          <div className="mt-0.5 text-[12px] text-[#F4B400]">
            {"★".repeat(r.rating)}
            <span className="text-[#cdd9e4]">{"★".repeat(5 - r.rating)}</span>
          </div>
          <div className="mt-1.5 text-[13px] leading-[20px] text-heading">{r.body}</div>
        </div>
      </div>
    </div>
  );
}

function EmptyState({ icon, label, hint }: { icon: string; label: string; hint: string }) {
  return (
    <div className="grid place-items-center px-6 py-16 text-center">
      <span className="grid h-12 w-12 place-items-center rounded-pill bg-surface-muted text-[18px] text-[#cdd9e4]">
        <i className={`fas ${icon}`} />
      </span>
      <div className="mt-3 text-[14px] font-semibold text-heading">{label}</div>
      <div className="mt-1 text-[12px] text-muted">{hint}</div>
    </div>
  );
}

// ---------- Demo: which patients each doctor has seen ----------

type PatientSeen = {
  id: string;
  name: string;
  initials: string;
  avBg: string;
  avFg: string;
  lastVisit: string;
  lastService: string;
};

const DEMO_PATIENTS_SEEN: Record<string, PatientSeen[]> = {
  mm: [
    { id: "P-1284", name: "Anita Sahu",     initials: "AS", avBg: "#FFE7EC", avFg: "#EE344E", lastVisit: "9 May 2026", lastService: "Root Canal · S2" },
    { id: "P-1273", name: "Karthik Rao",    initials: "KR", avBg: "#FFE7EC", avFg: "#EE344E", lastVisit: "20 Apr 2026", lastService: "Root Canal · S1" },
    { id: "P-1283", name: "Bidyut Panda",   initials: "BP", avBg: "#E6F1FA", avFg: "#0E5087", lastVisit: "9 May 2026", lastService: "Tooth extraction" },
  ],
  lp: [
    { id: "P-1265", name: "Suresh Pati",    initials: "SP", avBg: "#E6F4EC", avFg: "#3a8b5e", lastVisit: "12 Apr 2026", lastService: "Braces adjustment" },
    { id: "P-1271", name: "Pinky Sahu",     initials: "PS", avBg: "#E6F1FA", avFg: "#0E5087", lastVisit: "18 Apr 2026", lastService: "Pediatric checkup" },
    { id: "P-1284", name: "Anita Sahu",     initials: "AS", avBg: "#FFE7EC", avFg: "#EE344E", lastVisit: "18 Oct 2025", lastService: "Cleaning" },
  ],
  rs: [],
  am: [],
  tm: [],
};
