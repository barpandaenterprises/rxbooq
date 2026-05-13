"use client";

import * as Dialog from "@radix-ui/react-dialog";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toLocalIso } from "@/lib/booking-data";
import type { CalendarAppt, CalendarApptStatus } from "@/lib/data/admin-calendar";

const HOUR_START = 9;       // 9 AM
const HOUR_END = 19;        // 7 PM (last visible row = 6:30 PM)
const SLOTS_PER_HOUR = 2;   // 30-min slots
const SLOT_HEIGHT = 36;     // px
const TOTAL_SLOTS = (HOUR_END - HOUR_START) * SLOTS_PER_HOUR; // 20

const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

type ApptStatus = CalendarApptStatus;
type Appt = CalendarAppt;

const STATUS_STYLE: Record<ApptStatus, { bg: string; border: string; fg: string }> = {
  completed: { bg: "#E6F4EC", border: "#3a8b5e", fg: "#1f5e3a" },
  confirmed: { bg: "#E6F1FA", border: "#0E5087", fg: "#0E5087" },
  booked:    { bg: "#E6F1FA", border: "#0168B3", fg: "#0E5087" },
  noshow:    { bg: "#FFE7EC", border: "#EE344E", fg: "#b8253a" },
  cancelled: { bg: "#F4F5F7", border: "#cdd9e4", fg: "#9aa9b8" },
};

const STATUS_LABEL: Record<ApptStatus, string> = {
  completed: "Completed",
  confirmed: "Confirmed",
  booked:    "Booked",
  noshow:    "No-show",
  cancelled: "Cancelled",
};

function fmtTimeFromSlot(slotIdx: number): string {
  const h = Math.floor(slotIdx / SLOTS_PER_HOUR) + HOUR_START;
  const m = slotIdx % SLOTS_PER_HOUR === 0 ? 0 : 30;
  const ampm = h >= 12 ? "PM" : "AM";
  const hour12 = h > 12 ? h - 12 : h === 0 ? 12 : h;
  return `${hour12}:${m === 0 ? "00" : "30"} ${ampm}`;
}

function timeStringToSlot(time: string): number {
  const parts = time.split(":");
  const h = Number(parts[0]);
  const m = Number(parts[1]);
  return (h - HOUR_START) * SLOTS_PER_HOUR + (m >= 30 ? 1 : 0);
}

function weekRangeLabel(monday: Date): string {
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const fmt = (d: Date) =>
    d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
  return `${fmt(monday)} – ${fmt(sunday)}, ${monday.getFullYear()}`;
}

function isoFromDate(d: Date): string {
  return toLocalIso(d);
}

function addDaysIso(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + days);
  return isoFromDate(d);
}

type Props = {
  /** Monday of the visible week, YYYY-MM-DD. */
  weekStartIso: string;
  appointments: Appt[];
};

export function AdminCalendar({ weekStartIso, appointments }: Props) {
  const router = useRouter();
  const weekStart = useMemo(() => new Date(`${weekStartIso}T00:00:00`), [weekStartIso]);
  const [selectedAppt, setSelectedAppt] = useState<Appt | null>(null);

  const todayIso = toLocalIso(new Date());

  const days = useMemo(() => {
    return Array.from({ length: 7 }).map((_, i) => {
      const d = new Date(weekStart);
      d.setDate(weekStart.getDate() + i);
      return {
        iso: toLocalIso(d),
        weekday: WEEKDAY_LABELS[i]!,
        day: d.getDate(),
        month: d.toLocaleString("en-IN", { month: "short" }),
        isToday: toLocalIso(d) === todayIso,
        isSunday: i === 6,
      };
    });
  }, [weekStart, todayIso]);

  const apptCount = appointments.length;

  const navigateToWeek = (iso: string) => {
    router.push(`/admin/calendar?week=${iso}`);
  };
  const goPrev   = () => navigateToWeek(addDaysIso(weekStartIso, -7));
  const goNext   = () => navigateToWeek(addDaysIso(weekStartIso, 7));
  const goToday  = () => router.push("/admin/calendar");

  return (
    <div className="px-5 pt-7 md:px-8 md:pt-8">
      {/* Header */}
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-[28px] font-semibold leading-9 text-heading md:text-[32px]">
            Calendar
          </h2>
          <p className="mt-1 text-[14px] text-muted">
            {weekRangeLabel(weekStart)}{" "}
            <span className="text-[#9aa9b8]">· {apptCount} appointments this week</span>
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={goPrev}
            aria-label="Previous week"
            className="grid h-9 w-9 cursor-pointer place-items-center rounded-md border border-border bg-white text-muted hover:text-link-hover"
          >
            <i className="fas fa-chevron-left text-[12px]" />
          </button>
          <button
            type="button"
            onClick={goToday}
            className="cursor-pointer rounded-md border border-border bg-white px-3 py-1.5 text-[13px] font-medium text-heading hover:border-link-hover"
          >
            Today
          </button>
          <button
            type="button"
            onClick={goNext}
            aria-label="Next week"
            className="grid h-9 w-9 cursor-pointer place-items-center rounded-md border border-border bg-white text-muted hover:text-link-hover"
          >
            <i className="fas fa-chevron-right text-[12px]" />
          </button>
        </div>
      </div>

      {/* Week grid (horizontally scrollable on narrow viewports) */}
      <div className="overflow-hidden rounded-[12px] border border-border bg-white">
        <div className="overflow-x-auto">
          <div className="grid min-w-[840px] grid-cols-[60px_repeat(7,1fr)] md:min-w-0">
            {/* Header row */}
            <div className="border-b border-border bg-surface-muted" />
            {days.map((d) => (
              <div
                key={d.iso}
                className={
                  "flex flex-col items-center justify-center border-b border-l border-border py-3 " +
                  (d.isToday ? "bg-[#FFF8EC]" : d.isSunday ? "bg-[#FAFAFB]" : "")
                }
              >
                <div
                  className={
                    "text-[11px] font-semibold uppercase tracking-[0.06em] " +
                    (d.isToday ? "text-cta" : "text-[#9aa9b8]")
                  }
                >
                  {d.weekday}
                </div>
                <div
                  className={
                    "mt-0.5 text-[20px] font-bold leading-6 " +
                    (d.isToday ? "text-cta" : d.isSunday ? "text-[#cdd9e4]" : "text-heading")
                  }
                >
                  {d.day}
                </div>
                <div
                  className={
                    "text-[10px] " +
                    (d.isToday ? "text-[#7a5c2b]" : "text-[#9aa9b8]")
                  }
                >
                  {d.month}
                </div>
              </div>
            ))}

            {/* Body row: time labels */}
            <div
              className="col-start-1 border-r border-border bg-surface-muted"
              style={{ height: TOTAL_SLOTS * SLOT_HEIGHT }}
            >
              {Array.from({ length: TOTAL_SLOTS }).map((_, i) => {
                const isHourMark = i % 2 === 0;
                return (
                  <div
                    key={i}
                    style={{ height: SLOT_HEIGHT }}
                    className={
                      "flex items-start justify-end pr-2 pt-0.5 text-[10px] " +
                      (isHourMark ? "text-muted" : "text-transparent")
                    }
                  >
                    {isHourMark ? fmtTimeFromSlot(i) : "·"}
                  </div>
                );
              })}
            </div>

            {/* Day columns */}
            {days.map((d, dIdx) => {
              const dayAppts = appointments.filter((a) => a.dayOffset === dIdx);
              return (
                <div
                  key={d.iso}
                  className={
                    "relative border-l border-border " +
                    (d.isSunday ? "bg-[#FAFAFB]" : d.isToday ? "bg-[#FFFCF0]" : "")
                  }
                  style={{ height: TOTAL_SLOTS * SLOT_HEIGHT }}
                >
                  {/* Hour grid lines */}
                  {Array.from({ length: TOTAL_SLOTS }).map((_, i) => (
                    <div
                      key={i}
                      style={{ top: i * SLOT_HEIGHT, height: SLOT_HEIGHT }}
                      className={
                        "absolute inset-x-0 " +
                        (i === 0
                          ? ""
                          : i % 2 === 0
                            ? "border-t border-border"
                            : "border-t border-dashed border-[#F4F5F7]")
                      }
                    />
                  ))}

                  {/* "Closed" overlay for Sunday */}
                  {d.isSunday && (
                    <div className="pointer-events-none absolute inset-0 grid place-items-center">
                      <span className="-rotate-12 rounded-full border border-[#cdd9e4] bg-white px-3 py-1 text-[12px] font-medium text-[#9aa9b8]">
                        Sunday · Closed
                      </span>
                    </div>
                  )}

                  {/* Appointments */}
                  {!d.isSunday &&
                    dayAppts.map((a) => {
                      const startSlot = timeStringToSlot(a.start);
                      const endSlot = timeStringToSlot(a.end);
                      const top = startSlot * SLOT_HEIGHT;
                      const height = Math.max(
                        (endSlot - startSlot) * SLOT_HEIGHT,
                        SLOT_HEIGHT - 4,
                      );
                      const style = STATUS_STYLE[a.status];
                      return (
                        <button
                          key={a.id}
                          type="button"
                          onClick={() => setSelectedAppt(a)}
                          title={`${a.patient} · ${a.service} · ${a.doctor} · ${STATUS_LABEL[a.status]}`}
                          style={{
                            top,
                            height,
                            background: style.bg,
                            borderColor: style.border,
                            color: style.fg,
                          }}
                          className={
                            "absolute left-1 right-1 z-[1] cursor-pointer overflow-hidden rounded-sm border border-l-[3px] px-1.5 py-1 text-left text-[11px] leading-[14px] transition-shadow hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-cta " +
                            (a.status === "cancelled" ? "line-through opacity-70" : "")
                          }
                        >
                          <div className="truncate font-semibold">
                            {a.start} {a.patient}
                          </div>
                          <div className="truncate opacity-80">{a.service}</div>
                        </button>
                      );
                    })}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-[12px] text-muted">
        {(Object.keys(STATUS_STYLE) as ApptStatus[]).map((k) => (
          <div key={k} className="inline-flex items-center gap-1.5">
            <span
              className="h-2.5 w-2.5 rounded-sm"
              style={{ background: STATUS_STYLE[k].border }}
            />
            {STATUS_LABEL[k]}
          </div>
        ))}
        <div className="ml-auto text-[12px] text-[#9aa9b8]">
          <i className="fas fa-info-circle mr-1" />
          Click any appointment to see full details
        </div>
      </div>

      <ApptDetailDialog
        appt={selectedAppt}
        weekStart={weekStart}
        onClose={() => setSelectedAppt(null)}
      />
    </div>
  );
}

function ApptDetailDialog({
  appt,
  weekStart,
  onClose,
}: {
  appt: Appt | null;
  weekStart: Date;
  onClose: () => void;
}) {
  const open = appt !== null;

  // Compute the actual ISO date from dayOffset + weekStart
  const isoDate = useMemo(() => {
    if (!appt) return "";
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + appt.dayOffset);
    return d.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  }, [appt, weekStart]);

  return (
    <Dialog.Root open={open} onOpenChange={(v) => !v && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-[rgba(16,24,40,0.55)]" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-[480px] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-lg bg-white shadow-[0_24px_60px_-12px_rgba(16,24,40,0.30)] focus:outline-none">
          {appt && (
            <>
              {/* Status accent strip */}
              <div
                className="h-1.5 w-full"
                style={{ background: STATUS_STYLE[appt.status].border }}
              />

              <div className="px-6 pb-6 pt-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span
                      className="inline-flex items-center gap-1.5 rounded-pill px-2.5 py-0.5 text-[11px] font-semibold"
                      style={{
                        background: STATUS_STYLE[appt.status].bg,
                        color: STATUS_STYLE[appt.status].fg,
                      }}
                    >
                      <span
                        className="h-1.5 w-1.5 rounded-pill"
                        style={{ background: STATUS_STYLE[appt.status].border }}
                      />
                      {STATUS_LABEL[appt.status]}
                    </span>
                    <Dialog.Title className="mt-2 text-[20px] font-semibold leading-7 text-heading">
                      {appt.patient}
                    </Dialog.Title>
                    <Dialog.Description className="mt-0.5 text-[13px] text-muted">
                      Booking #{appt.id.padStart(4, "0")}
                    </Dialog.Description>
                  </div>
                  <Dialog.Close
                    aria-label="Close"
                    className="grid h-8 w-8 cursor-pointer place-items-center rounded-pill bg-surface-muted text-muted hover:bg-border"
                  >
                    <i className="fas fa-times text-[12px]" />
                  </Dialog.Close>
                </div>

                <dl className="mt-4 space-y-3 text-[13px]">
                  <Row icon="fa-tooth" label="Service" value={appt.service} />
                  <Row icon="fa-user-md" label="Doctor" value={appt.doctor} />
                  <Row
                    icon="fa-calendar-check"
                    label="When"
                    value={`${isoDate} · ${appt.start} – ${appt.end}`}
                  />
                </dl>

                <div className="mt-5 flex flex-wrap gap-2.5">
                  <button
                    type="button"
                    className="inline-flex items-center gap-2 rounded-md bg-cta px-4 py-2 text-[13px] font-medium text-cta-fg hover:bg-[#d92843]"
                  >
                    <i className="fas fa-pencil-alt text-[11px]" /> Edit
                  </button>
                  <button
                    type="button"
                    className="inline-flex items-center gap-2 rounded-md border-[1.5px] border-link-hover bg-white px-4 py-2 text-[13px] font-medium text-link-hover hover:bg-link-hover hover:text-white"
                  >
                    <i className="fas fa-clock text-[11px]" /> Reschedule
                  </button>
                  <Link
                    href="/admin/messages"
                    className="inline-flex items-center gap-2 rounded-md border border-border bg-white px-4 py-2 text-[13px] font-medium text-heading no-underline hover:border-link-hover hover:text-link-hover"
                  >
                    <i className="fab fa-whatsapp text-[12px] text-[#25D366]" /> Chat
                  </Link>
                  {appt.status !== "cancelled" && (
                    <button
                      type="button"
                      className="ml-auto inline-flex items-center gap-2 rounded-md bg-white px-4 py-2 text-[13px] font-medium text-cta hover:bg-[#FFE7EC]"
                    >
                      <i className="fas fa-times-circle text-[11px]" /> Cancel
                    </button>
                  )}
                </div>
              </div>
            </>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function Row({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="grid h-8 w-8 flex-none place-items-center rounded-md bg-[#E6F1FA] text-[12px] text-brand">
        <i className={`fas ${icon}`} />
      </span>
      <div className="flex-1">
        <dt className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[#9aa9b8]">{label}</dt>
        <dd className="mt-0.5 text-[14px] text-heading">{value}</dd>
      </div>
    </div>
  );
}
