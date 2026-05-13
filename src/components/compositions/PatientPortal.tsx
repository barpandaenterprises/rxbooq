"use client";

import * as Tabs from "@radix-ui/react-tabs";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { VisitTimelineRow } from "@/components/molecules/VisitTimelineRow";
import {
  ATTACHMENT_META,
  formatFileSize,
  formatVisitDate,
  findChart,
  type AttachmentKind,
  type Chart,
} from "@/lib/patient-history-data";

type StatusKey = "today" | "tomorrow" | "confirmed" | "pending";

type Appt = {
  id: string;
  day: number;
  month: string;
  time: string;
  service: string;
  doctor: string;
  duration: string;
  status: StatusKey;
};

const UPCOMING: Appt[] = [
  { id: "a1", day: 9,  month: "May", time: "5:30 PM",  service: "Root Canal · Session 2", doctor: "Dr. Manoranjan Mahakur", duration: "45 min", status: "today" },
  { id: "a3", day: 10, month: "May", time: "11:00 AM", service: "Follow-up · Root Canal", doctor: "Dr. Manoranjan Mahakur", duration: "20 min", status: "tomorrow" },
  { id: "a2", day: 23, month: "May", time: "10:30 AM", service: "Teeth Whitening",        doctor: "Dr. Lipsa Pradhan",      duration: "45 min", status: "confirmed" },
];

const STATUS_MAP: Record<StatusKey, { bg: string; fg: string; icon: string; label: string }> = {
  today:     { bg: "#FFE7EC", fg: "#EE344E", icon: "fa-clock",          label: "Today at 5:30 PM" },
  tomorrow:  { bg: "#FFF8EC", fg: "#7a5c2b", icon: "fa-bolt",           label: "Tomorrow" },
  confirmed: { bg: "#E6F1FA", fg: "#0E5087", icon: "fa-check-circle",   label: "Confirmed" },
  pending:   { bg: "#F4F5F7", fg: "#575757", icon: "fa-hourglass-half", label: "Pending confirmation" },
};

/** Demo "logged-in patient" — in production resolved from the session. */
const DEMO_PATIENT_ID = "P-1284";

const TAB_VALUES = ["upcoming", "past", "files"] as const;
type TabValue = (typeof TAB_VALUES)[number];

function isTabValue(v: string | null): v is TabValue {
  return v === "upcoming" || v === "past" || v === "files";
}

function StatusBadge({ status }: { status: StatusKey }) {
  const s = STATUS_MAP[status];
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-pill px-2.5 py-1 text-[12px] font-semibold"
      style={{ background: s.bg, color: s.fg }}
    >
      <i className={`fas ${s.icon} text-[11px]`} />
      {s.label}
    </span>
  );
}

function DatePill({ day, month, time }: { day: number; month: string; time: string }) {
  return (
    <div className="w-[72px] flex-none rounded-[12px] border-[1.5px] border-border bg-white py-2 text-center">
      <div className="text-[10px] font-semibold uppercase tracking-[0.06em] text-[#9aa9b8]">{month}</div>
      <div className="text-[24px] font-bold leading-7 text-heading">{day}</div>
      <div className="mt-0.5 text-[11px] font-medium text-link-hover">{time}</div>
    </div>
  );
}

function ApptCard({ a }: { a: Appt }) {
  return (
    <article className="rounded-[12px] border border-border bg-white p-4 shadow-sm md:p-5">
      <div className="flex items-start gap-3 md:gap-4">
        <DatePill day={a.day} month={a.month} time={a.time} />
        <div className="min-w-0 flex-1">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <StatusBadge status={a.status} />
            <span className="text-[12px] text-[#9aa9b8]">· {a.duration}</span>
          </div>
          <div className="text-[16px] font-semibold leading-[22px] text-heading">{a.service}</div>
          <div className="mt-0.5 flex items-center gap-1.5 text-[13px] text-muted">
            <i className="fas fa-user-md text-[11px] text-[#9aa9b8]" />
            {a.doctor}
          </div>
          <div className="mt-0.5 flex items-center gap-1.5 text-[13px] text-muted">
            <i className="fas fa-map-marker-alt text-[11px] text-[#9aa9b8]" />
            Bhatra Chowk, Sambalpur
          </div>
        </div>
      </div>
      <div className="mt-3.5 flex flex-wrap items-center gap-2 border-t border-[#F4F5F7] pt-3.5">
        <a
          href="#"
          className="inline-flex items-center gap-1.5 rounded-md border-[1.5px] border-link-hover bg-white px-3.5 py-1.5 text-[13px] font-medium text-link-hover no-underline"
        >
          <i className="fas fa-calendar-alt text-[11px]" />
          Reschedule
        </a>
        <a
          href="#"
          className="inline-flex items-center gap-1.5 rounded-md border-[1.5px] border-border bg-white px-3.5 py-1.5 text-[13px] font-medium text-muted no-underline"
        >
          <i className="fas fa-times text-[11px]" />
          Cancel
        </a>
        <a
          href="#"
          className="inline-flex items-center gap-1.5 rounded-md bg-[#F4F5F7] px-3.5 py-1.5 text-[13px] font-medium text-heading no-underline"
        >
          <i className="fas fa-directions text-[11px]" />
          Directions
        </a>
        <a
          href="#"
          className="ml-auto inline-flex items-center gap-1.5 px-1 py-1.5 text-[13px] font-medium text-[#25D366] no-underline"
        >
          <i className="fab fa-whatsapp text-[13px]" />
          Chat
        </a>
      </div>
    </article>
  );
}

function RecommendCard() {
  return (
    <div className="flex flex-col items-start gap-4 rounded-[12px] border-[1.5px] border-cta bg-white p-5 shadow-[0_4px_14px_-6px_rgba(238,52,78,0.20)] md:flex-row md:items-center md:p-6">
      <div className="grid h-14 w-14 flex-none place-items-center rounded-pill bg-[#FFE7EC] text-[22px] text-cta">
        <i className="fas fa-calendar-plus" />
      </div>
      <div className="flex-1">
        <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-cta md:text-[12px]">
          Recommended next visit
        </div>
        <div className="mb-1 text-[16px] font-semibold leading-6 text-heading md:text-[18px]">
          Your 6-month check-up is due in October
        </div>
        <div className="text-[13px] text-muted">
          Last cleaning was on 18 Oct 2025. Book early to lock your preferred slot.
        </div>
      </div>
      <a
        href="/book"
        className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-cta px-5 py-3 text-[15px] font-medium text-cta-fg no-underline transition-colors hover:bg-[#d92843] md:w-auto"
      >
        Book check-up <i className="fas fa-arrow-right text-[11px]" />
      </a>
    </div>
  );
}

export function PatientPortal({ initialChart }: { initialChart?: Chart | null } = {}) {
  const searchParams = useSearchParams();
  const initial = isTabValue(searchParams.get("tab")) ? (searchParams.get("tab") as TabValue) : "upcoming";
  const [tab, setTab] = useState<TabValue>(initial);
  const [fileFilter, setFileFilter] = useState<AttachmentKind | "all">("all");

  // Keep URL in sync when user clicks a tab (so the back button + refresh work).
  useEffect(() => {
    const next = isTabValue(searchParams.get("tab")) ? (searchParams.get("tab") as TabValue) : "upcoming";
    if (next !== tab) setTab(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const handleTabChange = (next: string) => {
    if (!isTabValue(next)) return;
    setTab(next);
    const url = new URL(window.location.href);
    if (next === "upcoming") url.searchParams.delete("tab");
    else url.searchParams.set("tab", next);
    window.history.replaceState({}, "", url.toString());
  };

  const chart = initialChart ?? findChart(DEMO_PATIENT_ID);
  const patient = chart?.patient;
  const visits = chart?.visits ?? [];
  const allFiles = visits.flatMap((v) =>
    v.attachments.map((a) => ({ ...a, visitDate: v.appointment.date, service: v.appointment.service })),
  );
  const filteredFiles = fileFilter === "all" ? allFiles : allFiles.filter((f) => f.kind === fileFilter);
  const firstName = patient?.name.split(" ")[0] ?? "there";

  return (
    <div className="mx-auto max-w-[1200px] px-5 pb-16 pt-8 md:px-8 md:pt-10">
      {/* Greeting */}
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4 md:mb-8">
        <div>
          <span className="mb-2.5 inline-flex items-center gap-1.5 rounded-pill bg-[#E6F1FA] px-3 py-1 text-[11px] font-medium text-brand md:mb-3 md:text-[12px]">
            <i className="fas fa-shield-alt text-[10px] md:text-[11px]" />
            Verified · {patient?.phone ?? "+91 ••••• ••342"}
          </span>
          <h2 className="text-[24px] font-semibold leading-[30px] text-heading md:text-[32px] md:leading-[40px]">
            Hi {firstName}, here are your records.
          </h2>
          <p className="mt-1.5 text-[14px] text-muted md:mt-2 md:text-paragraph">
            <strong className="text-heading">{UPCOMING.length} upcoming</strong> ·{" "}
            <strong className="text-heading">{visits.length} past visits</strong> ·{" "}
            <strong className="text-heading">{allFiles.length} files</strong> on file.
          </p>
        </div>
        <a
          href="/book"
          className="hidden items-center gap-2 rounded-md bg-cta px-5 py-3 text-[15px] font-medium text-cta-fg no-underline transition-colors hover:bg-[#d92843] md:inline-flex"
        >
          <i className="fas fa-plus" /> New appointment
        </a>
      </div>

      {/* Tabs */}
      <Tabs.Root value={tab} onValueChange={handleTabChange}>
        <Tabs.List
          aria-label="Patient sections"
          className="-mx-1 mb-6 flex gap-1 overflow-x-auto border-b border-border px-1"
        >
          <Tab value="upcoming" icon="fa-calendar-day" label="Upcoming" count={UPCOMING.length} />
          <Tab value="past"     icon="fa-history"      label="Past visits" count={visits.length} />
          <Tab value="files"    icon="fa-folder-open"  label="Files" count={allFiles.length} />
        </Tabs.List>

        {/* UPCOMING */}
        <Tabs.Content value="upcoming" className="focus:outline-none">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-[1.3fr_1fr] md:gap-8">
            <div>
              <div className="mb-3.5 flex items-baseline justify-between">
                <h3 className="text-[16px] font-semibold text-heading md:text-[18px]">Upcoming</h3>
                <span className="text-[12px] text-[#9aa9b8]">Sorted by date</span>
              </div>
              <div className="mb-6 flex flex-col gap-3.5">
                {UPCOMING.map((a) => <ApptCard key={a.id} a={a} />)}
              </div>
              <RecommendCard />
            </div>

            <div className="flex flex-col gap-5">
              <div className="rounded-[12px] border border-border bg-white p-5 md:p-6">
                <div className="mb-2 flex items-baseline justify-between">
                  <h3 className="text-[16px] font-semibold text-heading md:text-[18px]">Recent visits</h3>
                  <button
                    type="button"
                    onClick={() => handleTabChange("past")}
                    className="cursor-pointer text-[13px] text-link-hover no-underline"
                  >
                    View all
                  </button>
                </div>
                <p className="mb-3 text-[13px] text-muted">Prescriptions, reports and receipts.</p>
                {visits.slice(0, 3).map((v) => (
                  <button
                    key={v.appointment.id}
                    type="button"
                    onClick={() => handleTabChange("past")}
                    className="flex w-full items-center gap-3 border-b border-border py-3 text-left last:border-b-0 hover:bg-[#FAFAFB]"
                  >
                    <span className="grid h-9 w-9 place-items-center rounded-pill bg-[#F4F5F7] text-[13px] text-muted">
                      <i className="fas fa-tooth" />
                    </span>
                    <div className="flex-1">
                      <div className="text-[14px] font-semibold leading-[18px] text-heading">
                        {v.appointment.service}
                      </div>
                      <div className="text-[12px] text-muted">
                        {formatVisitDate(v.appointment.date)} · {v.appointment.doctor}
                      </div>
                    </div>
                    <i className="fas fa-chevron-right text-[11px] text-[#9aa9b8]" />
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => handleTabChange("past")}
                  className="mt-3.5 inline-flex cursor-pointer items-center gap-1.5 text-[13px] text-link-hover"
                >
                  See full medical history <i className="fas fa-arrow-right text-[10px]" />
                </button>
              </div>

              <div className="rounded-[12px] border border-[#f3d3d8] bg-surface-warm p-5">
                <div className="mb-1.5 flex items-center gap-2.5">
                  <span className="grid h-9 w-9 place-items-center rounded-pill bg-white text-[16px] text-[#25D366]">
                    <i className="fab fa-whatsapp" />
                  </span>
                  <div className="text-[14px] font-semibold text-heading">Quick actions on WhatsApp</div>
                </div>
                <p className="mb-3 text-[13px] leading-5 text-muted">
                  You can also reschedule, cancel or ask for a prescription on chat — anytime.
                </p>
                <a
                  href="#"
                  className="inline-flex items-center gap-2 rounded-md bg-cta px-4 py-2 text-[13px] font-medium text-cta-fg no-underline hover:bg-[#d92843]"
                >
                  <i className="fab fa-whatsapp" /> Open chat
                </a>
              </div>
            </div>
          </div>
        </Tabs.Content>

        {/* PAST */}
        <Tabs.Content value="past" className="focus:outline-none">
          {visits.length === 0 ? (
            <EmptyState
              icon="fa-history"
              label="No past visits yet"
              hint="Once your first appointment is completed it will show up here with notes, prescriptions and files."
            />
          ) : (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr] lg:max-w-[820px]">
              {visits.map((v, i) => (
                <VisitTimelineRow
                  key={v.appointment.id}
                  visit={v}
                  defaultOpen={i === 0}
                  patientView
                />
              ))}
            </div>
          )}
        </Tabs.Content>

        {/* FILES */}
        <Tabs.Content value="files" className="focus:outline-none">
          <div className="mb-3 flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => setFileFilter("all")}
              className={
                "rounded-pill px-3 py-1.5 text-[12px] font-medium transition-colors " +
                (fileFilter === "all"
                  ? "bg-brand text-white"
                  : "border border-border bg-white text-heading hover:border-link-hover")
              }
            >
              All <span className={fileFilter === "all" ? "text-white/80" : "text-[#9aa9b8]"}>· {allFiles.length}</span>
            </button>
            {(Object.entries(ATTACHMENT_META) as [AttachmentKind, typeof ATTACHMENT_META[AttachmentKind]][]).map(([kind, meta]) => {
              const count = allFiles.filter((f) => f.kind === kind).length;
              if (count === 0) return null;
              const active = fileFilter === kind;
              return (
                <button
                  key={kind}
                  type="button"
                  onClick={() => setFileFilter(kind)}
                  className={
                    "inline-flex items-center gap-1.5 rounded-pill px-3 py-1.5 text-[12px] font-medium transition-colors " +
                    (active ? "bg-brand text-white" : "border border-border bg-white text-heading hover:border-link-hover")
                  }
                >
                  <i className={`fas ${meta.icon} text-[10px]`} />
                  {meta.label}
                  <span className={active ? "text-white/80" : "text-[#9aa9b8]"}>· {count}</span>
                </button>
              );
            })}
          </div>

          {filteredFiles.length === 0 ? (
            <EmptyState
              icon="fa-folder-open"
              label="No files in this category"
              hint={fileFilter === "all" ? "Prescriptions, X-rays and receipts uploaded by the clinic will appear here." : "Try another filter."}
            />
          ) : (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {filteredFiles.map((f) => {
                const meta = ATTACHMENT_META[f.kind];
                return (
                  <a
                    key={f.id}
                    href="#"
                    className="flex items-start gap-3 rounded-md border border-border bg-white p-3 no-underline transition-colors hover:border-link-hover"
                  >
                    <span
                      className="grid h-10 w-10 flex-none place-items-center rounded-md text-[14px]"
                      style={{ background: meta.bg, color: meta.fg }}
                    >
                      <i className={`fas ${meta.icon}`} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[13px] font-medium text-heading">{f.fileName}</div>
                      <div className="mt-0.5 text-[11px] text-muted">
                        {meta.label} · {formatFileSize(f.fileSizeBytes)}
                      </div>
                      <div className="mt-0.5 text-[11px] text-[#9aa9b8]">
                        {formatVisitDate(f.visitDate)} · {f.service}
                      </div>
                    </div>
                    <i className="fas fa-download mt-1 text-[11px] text-[#9aa9b8]" />
                  </a>
                );
              })}
            </div>
          )}
        </Tabs.Content>
      </Tabs.Root>
    </div>
  );
}

function Tab({ value, icon, label, count }: { value: string; icon: string; label: string; count: number }) {
  return (
    <Tabs.Trigger
      value={value}
      className="inline-flex cursor-pointer items-center gap-1.5 whitespace-nowrap border-b-2 border-transparent px-3 py-2 text-[14px] font-medium text-muted transition-colors hover:text-heading data-[state=active]:border-cta data-[state=active]:text-link-hover"
    >
      <i className={`fas ${icon} text-[12px]`} />
      {label}
      <span className="text-[11px] font-normal text-[#9aa9b8]">· {count}</span>
    </Tabs.Trigger>
  );
}

function EmptyState({ icon, label, hint }: { icon: string; label: string; hint: string }) {
  return (
    <div className="grid place-items-center rounded-[12px] border border-border bg-white px-6 py-16 text-center">
      <span className="grid h-12 w-12 place-items-center rounded-pill bg-surface-muted text-[18px] text-[#cdd9e4]">
        <i className={`fas ${icon}`} />
      </span>
      <div className="mt-3 text-[14px] font-semibold text-heading">{label}</div>
      <div className="mt-1 text-[12px] text-muted">{hint}</div>
    </div>
  );
}
