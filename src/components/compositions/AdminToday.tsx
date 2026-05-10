"use client";

import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import * as Popover from "@radix-ui/react-popover";
import { useMemo, useState } from "react";
import { Sparkline } from "@/components/atoms/Sparkline";

type ApptStatus = "confirmed" | "booked" | "completed" | "noshow" | "cancelled";

type ApptItem = {
  time: string;
  name: string;
  phone: string;
  service: string;
  doctor: string;
  status: ApptStatus;
  isNow?: boolean;
  isNew?: boolean;
};

const ALL_DOCTORS = ["Dr. Manoranjan", "Dr. Lipsa", "Dr. Asit"] as const;

const TODAYS_APPTS: { hour: string; items: ApptItem[] }[] = [
  { hour: "09:00", items: [
    { time: "09:00", name: "Priya Sahu",     phone: "+91 93456 78901", service: "Root Canal · S2",    doctor: "Dr. Manoranjan", status: "completed" },
    { time: "09:30", name: "Rajesh Mishra",  phone: "+91 94370 11111", service: "Consultation",       doctor: "Dr. Manoranjan", status: "completed" },
  ]},
  { hour: "10:00", items: [
    { time: "10:00", name: "Anita Sahu",     phone: "+91 98765 12342", service: "Root Canal · S2",    doctor: "Dr. Manoranjan", status: "completed" },
    { time: "10:30", name: "Laxmi Pradhan",  phone: "+91 90324 55512", service: "Cleaning",           doctor: "Dr. Lipsa",      status: "cancelled" },
    { time: "11:00", name: "Sarita Mahanti", phone: "+91 99378 23445", service: "Whitening",          doctor: "Dr. Lipsa",      status: "noshow" },
  ]},
  { hour: "12:00", items: [
    { time: "12:00", name: "Manoj Behera",   phone: "+91 95672 34111", service: "Implant consult",    doctor: "Dr. Manoranjan", status: "confirmed", isNow: true },
    { time: "12:30", name: "Suresh Pati",    phone: "+91 89230 11445", service: "Braces adjust",      doctor: "Dr. Asit",       status: "confirmed" },
  ]},
  { hour: "14:00", items: [
    { time: "14:00", name: "Karthik Rao",    phone: "+91 70084 91144", service: "Root Canal · S1",    doctor: "Dr. Manoranjan", status: "booked" },
    { time: "14:30", name: "Pinky Sahu",     phone: "+91 87224 55501", service: "Pediatric checkup",  doctor: "Dr. Lipsa",      status: "booked" },
    { time: "15:30", name: "Bidyut Panda",   phone: "+91 96543 22018", service: "Tooth extraction",   doctor: "Dr. Manoranjan", status: "booked", isNew: true },
  ]},
  { hour: "17:00", items: [
    { time: "17:00", name: "Susmita Dash",   phone: "+91 99220 33015", service: "Cleaning",           doctor: "Dr. Lipsa",      status: "booked" },
    { time: "17:30", name: "Anita Mohanti",  phone: "+91 98123 56611", service: "Follow-up",          doctor: "Dr. Manoranjan", status: "booked" },
  ]},
];

const STATUS_DOT: Record<ApptStatus, string> = {
  confirmed: "#0E5087",
  booked:    "#0168B3",
  completed: "#3a8b5e",
  noshow:    "#EE344E",
  cancelled: "#9aa9b8",
};

const STATUS_CHIP: Record<ApptStatus, { bg: string; fg: string; label: string }> = {
  confirmed: { bg: "#E6F1FA", fg: "#0E5087", label: "Confirmed" },
  booked:    { bg: "#E6F1FA", fg: "#0168B3", label: "Booked" },
  completed: { bg: "#E6F4EC", fg: "#3a8b5e", label: "Completed" },
  noshow:    { bg: "#FFE7EC", fg: "#EE344E", label: "No-show" },
  cancelled: { bg: "#F4F5F7", fg: "#9aa9b8", label: "Cancelled" },
};

function StatusChip({ status }: { status: ApptStatus }) {
  const s = STATUS_CHIP[status];
  return (
    <span
      className={
        "inline-flex items-center rounded-pill px-2.5 py-0.5 text-[11px] font-semibold " +
        (status === "cancelled" ? "line-through" : "")
      }
      style={{ background: s.bg, color: s.fg }}
    >
      {s.label}
    </span>
  );
}

function KpiTile({ label, value, icon, delta, deltaColor, sparkData, sparkColor }: {
  label: string; value: string; icon: string; delta: string; deltaColor?: string; sparkData: number[]; sparkColor?: string;
}) {
  return (
    <div className="flex flex-col gap-2.5 rounded-[12px] border border-border bg-white p-5">
      <div className="flex items-center justify-between">
        <span className="grid h-9 w-9 place-items-center rounded-md bg-[#E6F1FA] text-[14px] text-brand">
          <i className={`fas ${icon}`} />
        </span>
        <span className="text-[11px] font-medium uppercase tracking-[0.06em] text-[#9aa9b8]">{label}</span>
      </div>
      <div className="flex items-end justify-between gap-2">
        <div>
          <div className="text-[30px] font-bold leading-[34px] text-heading">{value}</div>
          <div className="mt-0.5 text-[12px]" style={{ color: deltaColor ?? "#0E5087" }}>
            <i
              className={`fas ${delta.startsWith("-") || delta.startsWith("−") ? "fa-arrow-down" : "fa-arrow-up"} mr-1 text-[9px]`}
            />
            {delta}
          </div>
        </div>
        <Sparkline data={sparkData} color={sparkColor ?? "#0168B3"} />
      </div>
    </div>
  );
}

function ApptRowMenu({ apptName }: { apptName: string }) {
  const items = [
    { ic: "fa-eye",            label: "View details" },
    { ic: "fa-pencil-alt",     label: "Edit appointment" },
    { ic: "fa-clock",          label: "Reschedule" },
    { ic: "fa-check-circle",   label: "Mark completed" },
    { ic: "fa-user-clock",     label: "Mark no-show", danger: false },
    { ic: "fa-times-circle",   label: "Cancel", danger: true },
  ];
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          aria-label={`Actions for ${apptName}`}
          className="grid h-8 w-8 flex-none cursor-pointer place-items-center rounded-md border border-border bg-white text-muted hover:text-link-hover"
        >
          <i className="fas fa-ellipsis-v text-[13px]" />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={4}
          className="z-50 w-[200px] rounded-md border border-border bg-white p-1.5 shadow-md"
        >
          {items.map((it) => (
            <DropdownMenu.Item
              key={it.label}
              className={
                "flex cursor-pointer items-center gap-2.5 rounded-sm px-2.5 py-2 text-[13px] outline-none hover:bg-surface-muted " +
                (it.danger ? "text-cta" : "text-heading")
              }
            >
              <i
                className={`fas ${it.ic} w-4 text-center text-[12px]`}
                style={{ color: it.danger ? "#EE344E" : "#575757" }}
              />
              {it.label}
            </DropdownMenu.Item>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

function TimelineRow({ a }: { a: ApptItem }) {
  return (
    <div
      className="relative flex cursor-grab items-center gap-3.5 rounded-md p-3.5 md:gap-4"
      style={{
        background: a.isNow ? "#FFF8EC" : "#fff",
        border: a.isNow ? "1.5px solid #F4D9A8" : "1px solid #E6E8EC",
      }}
    >
      {a.isNew && (
        <span className="absolute -top-1.5 left-2 inline-flex items-center gap-1 rounded-pill bg-[#3a8b5e] px-2 py-0.5 text-[9px] font-semibold text-white">
          <span
            className="h-[5px] w-[5px] rounded-pill bg-[#7fe0a4]"
            style={{ boxShadow: "0 0 0 3px rgba(127,224,164,0.4)" }}
          />
          NEW
        </span>
      )}
      <div className="flex-none border-r border-border pr-3.5 text-center md:w-[60px]">
        <div className={`text-[16px] font-semibold ${a.isNow ? "text-[#7a5c2b]" : "text-heading"}`}>
          {a.time}
        </div>
        {a.isNow && <div className="text-[10px] font-semibold text-[#7a5c2b]">NOW</div>}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 text-[14px] font-semibold text-heading">
          <span className="h-2 w-2 rounded-pill" style={{ background: STATUS_DOT[a.status] }} />
          {a.name}
          <span className="text-[12px] font-normal text-[#9aa9b8]">· {a.phone}</span>
        </div>
        <div className="mt-0.5 text-[13px] text-muted">
          {a.service} <span className="mx-1.5 text-border">·</span> {a.doctor}
        </div>
      </div>
      <StatusChip status={a.status} />
      <a
        href={`https://wa.me/${a.phone.replace(/\D/g, "")}`}
        target="_blank"
        rel="noreferrer"
        aria-label="Open WhatsApp chat"
        className="grid h-8 w-8 flex-none place-items-center rounded-md border border-border bg-white text-muted hover:border-[#25D366]"
      >
        <i className="fab fa-whatsapp text-[13px] text-[#25D366]" />
      </a>
      <ApptRowMenu apptName={a.name} />
    </div>
  );
}

const WA_ACTIVITY = [
  { name: "Bidyut Panda",   tpl: "booking_confirmation_v1", status: "replied",   ts: "just now",   replied: true,  highlight: true },
  { name: "Anita Sahu",     tpl: "reminder_24h_v2",         status: "read",      ts: "2 min ago" },
  { name: "Sarita Mahanti", tpl: "noshow_followup_v1",      status: "delivered", ts: "14 min ago" },
  { name: "Karthik Rao",    tpl: "booking_confirmation_v1", status: "read",      ts: "18 min ago" },
  { name: "Pinky Sahu",     tpl: "booking_confirmation_v1", status: "read",      ts: "22 min ago" },
  { name: "Suresh Pati",    tpl: "reminder_24h_v2",         status: "replied",   ts: "31 min ago", replied: true },
  { name: "Manoj Behera",   tpl: "reminder_24h_v2",         status: "delivered", ts: "46 min ago" },
  { name: "Laxmi Pradhan",  tpl: "cancellation_ack_v1",     status: "read",      ts: "1 hr ago" },
];

function WaStatusIcon({ status }: { status: string }) {
  if (status === "delivered") return <i className="fas fa-check-double text-[11px] text-[#9aa9b8]" />;
  if (status === "read")      return <i className="fas fa-check-double text-[11px] text-[#34B7F1]" />;
  if (status === "replied")   return <i className="fas fa-reply text-[11px] text-[#3a8b5e]" />;
  return null;
}

function WaFeed() {
  return (
    <div className="flex h-full flex-col rounded-[12px] border border-border bg-white">
      <div className="flex items-center gap-2.5 border-b border-border px-5 py-4">
        <span className="grid h-8 w-8 place-items-center rounded-pill bg-[#E6F4EC] text-[14px] text-[#25D366]">
          <i className="fab fa-whatsapp" />
        </span>
        <div className="flex-1">
          <div className="text-[14px] font-semibold text-heading">Recent WhatsApp activity</div>
          <div className="flex items-center gap-1.5 text-[11px] text-[#3a8b5e]">
            <span
              className="h-1.5 w-1.5 rounded-pill bg-[#3a8b5e]"
              style={{ boxShadow: "0 0 0 3px rgba(58,139,94,0.20)" }}
            />
            Live · 8 events in the last hour
          </div>
        </div>
        <a href="/admin/messages" className="text-[12px] text-link-hover no-underline">View all</a>
      </div>
      <div className="flex-1 overflow-hidden">
        {WA_ACTIVITY.map((m, i) => (
          <div
            key={m.name}
            className="flex items-start gap-3 px-5 py-3.5 last:border-b-0"
            style={{
              borderBottom: i < WA_ACTIVITY.length - 1 ? "1px solid #F4F5F7" : "none",
              background: m.highlight ? "#FBFEF9" : "#fff",
            }}
          >
            <span className="grid h-8 w-8 flex-none place-items-center rounded-pill bg-[#F4F5F7] text-[11px] font-semibold text-link-hover">
              {m.name.split(" ").map((n) => n[0]).slice(0, 2).join("")}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex justify-between gap-2 text-[13px] font-semibold text-heading">
                <span>{m.name}</span>
                <span className="text-[11px] font-normal text-[#9aa9b8]">{m.ts}</span>
              </div>
              <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[12px] text-muted">
                <code className="rounded-sm bg-[#F4F5F7] px-1.5 py-0.5 font-mono text-[10px] text-muted">
                  {m.tpl}
                </code>
                <span className={"inline-flex items-center gap-1 " + (m.replied ? "text-[#3a8b5e]" : "text-muted")}>
                  <WaStatusIcon status={m.status} />
                  {m.status}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function DoctorFilter({
  selected,
  onChange,
}: {
  selected: Set<string>;
  onChange: (next: Set<string>) => void;
}) {
  const [open, setOpen] = useState(false);
  const allSelected = selected.size === 0 || selected.size === ALL_DOCTORS.length;
  const label = allSelected ? "All doctors" : `${selected.size} doctor${selected.size > 1 ? "s" : ""}`;

  const toggle = (d: string) => {
    const next = new Set(selected);
    if (next.has(d)) next.delete(d);
    else next.add(d);
    onChange(next);
  };

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button
          type="button"
          className={
            "inline-flex cursor-pointer items-center gap-1.5 rounded-pill border bg-white px-3 py-1.5 text-[12px] " +
            (allSelected ? "border-border text-link-hover" : "border-link-hover bg-[#E6F1FA] font-medium text-link-hover")
          }
        >
          <i className="fas fa-filter text-[10px]" /> {label}
          <i className="fas fa-chevron-down text-[9px] text-[#9aa9b8]" />
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="end"
          sideOffset={4}
          className="z-50 w-[200px] rounded-md border border-border bg-white p-1.5 shadow-md"
        >
          <div className="mb-1 flex items-center justify-between px-2 pt-1">
            <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[#9aa9b8]">Doctors</span>
            {selected.size > 0 && (
              <button
                type="button"
                onClick={() => onChange(new Set())}
                className="text-[11px] text-link-hover"
              >
                All
              </button>
            )}
          </div>
          {ALL_DOCTORS.map((d) => {
            const checked = selected.size === 0 || selected.has(d);
            return (
              <label
                key={d}
                className="flex cursor-pointer items-center gap-2 rounded-sm px-2.5 py-1.5 text-[13px] hover:bg-surface-muted"
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggle(d)}
                  className="h-4 w-4 cursor-pointer accent-brand"
                />
                {d}
              </label>
            );
          })}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

export function AdminToday() {
  const [doctors, setDoctors] = useState<Set<string>>(new Set()); // empty = all

  const filtered = useMemo(() => {
    if (doctors.size === 0) return TODAYS_APPTS;
    return TODAYS_APPTS.map((g) => ({
      ...g,
      items: g.items.filter((a) => doctors.has(a.doctor)),
    })).filter((g) => g.items.length > 0);
  }, [doctors]);

  const totalCount = useMemo(
    () => filtered.reduce((sum, g) => sum + g.items.length, 0),
    [filtered],
  );

  return (
    <div className="px-5 pt-7 md:px-8 md:pt-8">
      {/* KPI strip */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiTile label="Today's appointments" value="12" icon="fa-calendar-day"  delta="+2 vs avg"  deltaColor="#3a8b5e" sparkData={[8, 9, 7, 10, 11, 9, 12]} />
        <KpiTile label="Confirmed (today)"    value="9"  icon="fa-check-circle"  delta="75%"        deltaColor="#0E5087" sparkData={[5, 6, 7, 8, 7, 8, 9]} />
        <KpiTile label="No-shows · 7 days"    value="3"  icon="fa-user-clock"    delta="−40% vs prev" deltaColor="#3a8b5e" sparkData={[7, 6, 5, 5, 4, 4, 3]} sparkColor="#EE344E" />
        <KpiTile label="New patients · week"  value="18" icon="fa-user-plus"     delta="+5 vs prev" deltaColor="#3a8b5e" sparkData={[2, 3, 4, 3, 4, 5, 6]} sparkColor="#0E5087" />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[2fr_1fr]">
        <div className="rounded-[12px] border border-border bg-white">
          <div className="flex flex-wrap items-center gap-3 border-b border-border px-5 py-4">
            <h3 className="text-[16px] font-semibold text-heading">Today&rsquo;s schedule</h3>
            <span className="text-[12px] text-[#9aa9b8]">
              · {totalCount} appointment{totalCount === 1 ? "" : "s"}
              {doctors.size > 0 && doctors.size < ALL_DOCTORS.length && (
                <> (filtered)</>
              )}
            </span>
            <div className="ml-auto flex gap-2">
              <DoctorFilter selected={doctors} onChange={setDoctors} />
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-pill border border-border bg-white px-3 py-1.5 text-[12px] text-heading hover:border-link-hover"
              >
                <i className="fas fa-print text-[10px]" /> Print
              </button>
            </div>
          </div>
          <div className="px-5 pb-5 pt-3">
            {filtered.length === 0 ? (
              <div className="grid place-items-center px-4 py-16 text-center text-[13px] text-muted">
                <i className="fas fa-filter text-[24px] text-[#cdd9e4]" />
                <span className="mt-2">No appointments for the selected doctor{doctors.size > 1 ? "s" : ""}.</span>
                <button
                  type="button"
                  onClick={() => setDoctors(new Set())}
                  className="mt-2 text-link-hover underline"
                >
                  Show all doctors
                </button>
              </div>
            ) : (
              filtered.map((group) => (
                <div key={group.hour} className="mt-3.5 grid grid-cols-[44px_1fr] gap-3.5 md:grid-cols-[56px_1fr]">
                  <div className="pt-4 text-[12px] font-semibold tracking-[0.08em] text-[#9aa9b8]">
                    {group.hour}
                  </div>
                  <div className="flex flex-col gap-2">
                    {group.items.map((a) => <TimelineRow key={a.time + a.name} a={a} />)}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <WaFeed />
      </div>
    </div>
  );
}
