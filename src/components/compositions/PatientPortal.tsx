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

type PastVisit = {
  id: string;
  date: string;
  service: string;
  doctor: string;
  files: { name: string; kind: "rx" | "img" | "doc" }[];
};

const UPCOMING: Appt[] = [
  { id: "a1", day: 9, month: "May", time: "5:30 PM", service: "Root Canal · Session 2", doctor: "Dr. Manoranjan Mahakur", duration: "45 min", status: "today" },
  { id: "a3", day: 10, month: "May", time: "11:00 AM", service: "Follow-up · Root Canal", doctor: "Dr. Manoranjan Mahakur", duration: "20 min", status: "tomorrow" },
  { id: "a2", day: 23, month: "May", time: "10:30 AM", service: "Teeth Whitening", doctor: "Dr. Lipsa Pradhan", duration: "45 min", status: "confirmed" },
];

const PAST: PastVisit[] = [
  { id: "p1", date: "14 Apr 2026", service: "Root Canal · Session 1", doctor: "Dr. Manoranjan Mahakur", files: [{ name: "Prescription_RCT.pdf", kind: "rx" }, { name: "X-ray_lower-right.jpg", kind: "img" }] },
  { id: "p2", date: "02 Apr 2026", service: "Consultation", doctor: "Dr. Manoranjan Mahakur", files: [{ name: "Treatment_plan.pdf", kind: "rx" }] },
  { id: "p3", date: "18 Oct 2025", service: "6-month checkup & cleaning", doctor: "Dr. Lipsa Pradhan", files: [{ name: "Receipt_Oct25.pdf", kind: "doc" }] },
];

const STATUS_MAP: Record<StatusKey, { bg: string; fg: string; icon: string; label: string }> = {
  today:     { bg: "#FFE7EC", fg: "#EE344E", icon: "fa-clock",          label: "Today at 5:30 PM" },
  tomorrow:  { bg: "#FFF8EC", fg: "#7a5c2b", icon: "fa-bolt",           label: "Tomorrow" },
  confirmed: { bg: "#E6F1FA", fg: "#0E5087", icon: "fa-check-circle",   label: "Confirmed" },
  pending:   { bg: "#F4F5F7", fg: "#575757", icon: "fa-hourglass-half", label: "Pending confirmation" },
};

const FILE_ICON: Record<PastVisit["files"][number]["kind"], { ic: string; col: string; bg: string }> = {
  rx:  { ic: "fa-prescription", col: "#0E5087", bg: "#E6F1FA" },
  img: { ic: "fa-image",         col: "#7a5c2b", bg: "#FFF8EC" },
  doc: { ic: "fa-file-alt",      col: "#575757", bg: "#F4F5F7" },
};

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

function FileChip({ f }: { f: PastVisit["files"][number] }) {
  const i = FILE_ICON[f.kind];
  return (
    <a
      href="#"
      className="inline-flex items-center gap-2 rounded-pill border border-border bg-white py-1.5 pl-1.5 pr-3 text-[12px] font-medium text-heading no-underline"
    >
      <span
        className="grid h-6 w-6 place-items-center rounded-pill text-[11px]"
        style={{ background: i.bg, color: i.col }}
      >
        <i className={`fas ${i.ic}`} />
      </span>
      {f.name}
      <i className="fas fa-download ml-0.5 text-[10px] text-[#9aa9b8]" />
    </a>
  );
}

function PastVisitRow({ v, defaultOpen }: { v: PastVisit; defaultOpen?: boolean }) {
  return (
    <details className="border-b border-border py-3.5 last:border-b-0" open={defaultOpen}>
      <summary className="flex cursor-pointer items-center justify-between [&::-webkit-details-marker]:hidden">
        <div className="flex items-center gap-3">
          <span className="grid h-9 w-9 place-items-center rounded-pill bg-[#F4F5F7] text-[13px] text-muted">
            <i className="fas fa-tooth" />
          </span>
          <div>
            <div className="text-[14px] font-semibold leading-[18px] text-heading">{v.service}</div>
            <div className="text-[12px] text-muted">{v.date} · {v.doctor}</div>
          </div>
        </div>
        <i className="fas fa-chevron-down text-[11px] text-[#9aa9b8] transition-transform group-open:rotate-180" />
      </summary>
      <div className="mt-3 flex flex-wrap gap-2 pl-12">
        {v.files.map((f) => <FileChip key={f.name} f={f} />)}
      </div>
    </details>
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

export function PatientPortal() {
  return (
    <div className="mx-auto max-w-[1200px] px-5 pb-16 pt-8 md:px-8 md:pt-10">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4 md:mb-8">
        <div>
          <span className="mb-2.5 inline-flex items-center gap-1.5 rounded-pill bg-[#E6F1FA] px-3 py-1 text-[11px] font-medium text-brand md:mb-3 md:text-[12px]">
            <i className="fas fa-shield-alt text-[10px] md:text-[11px]" />
            Verified · +91 ••••• ••342
          </span>
          <h2 className="text-[24px] font-semibold leading-[30px] text-heading md:text-[32px] md:leading-[40px]">
            Hi Anita, here are your appointments.
          </h2>
          <p className="mt-1.5 text-[14px] text-muted md:mt-2 md:text-paragraph">
            You have <strong className="text-heading">3 upcoming visits</strong> at Mahakur Poly Dental.
          </p>
        </div>
        <a
          href="/book"
          className="hidden items-center gap-2 rounded-md bg-cta px-5 py-3 text-[15px] font-medium text-cta-fg no-underline transition-colors hover:bg-[#d92843] md:inline-flex"
        >
          <i className="fas fa-plus" /> New appointment
        </a>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-[1.3fr_1fr] md:gap-8">
        {/* LEFT */}
        <div>
          <div className="mb-3.5 flex items-baseline justify-between">
            <h3 className="text-[16px] font-semibold text-heading md:text-[18px]">Upcoming</h3>
            <span className="text-[12px] text-[#9aa9b8]">Sorted by date</span>
          </div>
          <div className="mb-6 flex flex-col gap-3.5">
            {UPCOMING.map((a) => (
              <ApptCard key={a.id} a={a} />
            ))}
          </div>
          <RecommendCard />
        </div>

        {/* RIGHT */}
        <div className="flex flex-col gap-5">
          <div className="rounded-[12px] border border-border bg-white p-5 md:p-6">
            <div className="mb-2 flex items-baseline justify-between">
              <h3 className="text-[16px] font-semibold text-heading md:text-[18px]">Past visits</h3>
              <a href="#" className="text-[13px] text-link-hover no-underline">View all</a>
            </div>
            <p className="mb-2 text-[13px] text-muted">Prescriptions, reports and receipts.</p>
            <PastVisitRow v={PAST[0]!} defaultOpen />
            <PastVisitRow v={PAST[1]!} />
            <PastVisitRow v={PAST[2]!} />
            <a
              href="#"
              className="mt-3.5 inline-flex items-center gap-1.5 text-[13px] text-link-hover no-underline"
            >
              See full medical history <i className="fas fa-arrow-right text-[10px]" />
            </a>
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
    </div>
  );
}
