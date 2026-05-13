"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { BookingStepperHeader } from "@/components/molecules/BookingStepperHeader";
import {
  DateStripPill,
  type BookingDate,
} from "@/components/molecules/DateStripPill";
import { SlotPill, type SlotState } from "@/components/molecules/SlotPill";
import { formatLongDate, formatSlotLabel, toLocalIso } from "@/lib/booking-data";
import type { PublicService } from "@/lib/data/public-booking";

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_LABELS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

const DESKTOP_PAGE_SIZE = 9;
const TOTAL_DAYS = 14;

const LUNCH_SLOTS = new Set(["14:00", "14:30"]);

type Props = {
  service:        PublicService;
  doctorId?:      string | null;
  /** Map of ISO date → list of "HH:mm" slots already taken (booked + held). */
  bookedByDate?:  Record<string, string[]>;
};

function buildDates(): BookingDate[] {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  return Array.from({ length: TOTAL_DAYS }).map((_, i): BookingDate => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const dow = d.getDay();
    return {
      iso: toLocalIso(d),
      day: d.getDate(),
      month: MONTH_LABELS[d.getMonth()]!,
      weekdayLabel: DAY_LABELS[dow]!,
      weekend: dow === 0 || dow === 6,
      closed: dow === 0,
      isToday: i === 0,
    };
  });
}

function buildSlots() {
  const out: { short: string; label: string }[] = [];
  for (let h = 9; h < 19; h++) {
    for (const m of [0, 30]) {
      const ampm = h >= 12 ? "PM" : "AM";
      const hour12 = h > 12 ? h - 12 : h;
      out.push({
        short: `${String(h).padStart(2, "0")}:${m === 0 ? "00" : "30"}`,
        label: `${hour12}:${m === 0 ? "00" : "30"} ${ampm}`,
      });
    }
  }
  return out;
}

export function BookingSlotPicker({ service, doctorId, bookedByDate = {} }: Props) {
  const router = useRouter();
  const dates = useMemo(buildDates, []);
  const slots = useMemo(buildSlots, []);

  const firstOpenIso = dates.find((d) => !d.closed)?.iso ?? dates[0]!.iso;
  const [selectedDate, setSelectedDate] = useState<string>(firstOpenIso);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [pageOffset, setPageOffset] = useState(0);

  const continueDisabled = !selectedSlot;

  const visibleDates = dates.slice(
    pageOffset,
    Math.min(pageOffset + DESKTOP_PAGE_SIZE, TOTAL_DAYS),
  );

  const bookedForDate = useMemo(
    () => new Set(bookedByDate[selectedDate] ?? []),
    [bookedByDate, selectedDate],
  );

  const openSlotCount = slots.filter(
    (s) => !bookedForDate.has(s.short) && !LUNCH_SLOTS.has(s.short),
  ).length;

  const handleContinue = () => {
    if (continueDisabled) return;
    const params = new URLSearchParams({
      service: service.id,
      date: selectedDate,
      slot: selectedSlot!,
      ...(doctorId ? { doctor: doctorId } : {}),
    });
    router.push(`/book/details?${params.toString()}`);
  };

  return (
    <>
      <div className="mx-auto max-w-[720px] overflow-visible rounded-lg bg-white shadow-md">
        <div className="px-5 pb-6 pt-8 md:px-12 md:pb-8 md:pt-10">
          <BookingStepperHeader step={2} />

          {/* Service summary chip */}
          <div className="mb-4 inline-flex w-full items-center gap-3 rounded-pill border border-[#f3d3d8] bg-surface-warm py-2 pl-4 pr-2 md:mb-6 md:w-auto">
            <span className="grid h-7 w-7 flex-none place-items-center rounded-pill bg-white text-[13px] text-cta">
              <i className={`fas ${service.icon}`} />
            </span>
            <span className="flex-1 text-[14px] font-medium text-heading">
              {service.name}
              <span className="mx-1.5 text-[#9aa9b8]">·</span>
              <span className="font-normal text-muted">{service.durationMinutes} min</span>
              <span className="mx-1.5 text-[#9aa9b8]">·</span>
              <span className="font-semibold text-link-hover">{service.feeLabel}</span>
            </span>
            <Link
              href="/book"
              className="rounded-pill border border-[#f3d3d8] bg-white px-3.5 py-1.5 text-[13px] font-medium text-cta no-underline"
            >
              Change
            </Link>
          </div>

          <h2 className="mb-2 text-[22px] font-semibold leading-[28px] text-heading md:text-[28px] md:leading-[34px]">
            Choose a time
          </h2>
          <p className="mb-5 text-[14px] leading-[22px] text-muted md:mb-6 md:text-paragraph">
            Showing slots in your local time. Sundays are closed.
          </p>

          {/* Desktop date strip with prev/next */}
          <div className="mb-2 hidden items-center gap-2 md:flex">
            <button
              type="button"
              aria-label="Earlier days"
              disabled={pageOffset === 0}
              onClick={() => setPageOffset((p) => Math.max(0, p - 7))}
              className="grid h-9 w-9 flex-none cursor-pointer place-items-center rounded-pill border border-border bg-white text-muted disabled:cursor-not-allowed disabled:opacity-50"
            >
              <i className="fas fa-chevron-left text-[11px]" />
            </button>
            <div className="flex flex-1 gap-2.5 overflow-x-auto px-1 py-2">
              {visibleDates.map((d) => (
                <DateStripPill
                  key={d.iso}
                  date={d}
                  selected={d.iso === selectedDate}
                  onSelect={setSelectedDate}
                />
              ))}
            </div>
            <button
              type="button"
              aria-label="Later days"
              disabled={pageOffset + DESKTOP_PAGE_SIZE >= TOTAL_DAYS}
              onClick={() =>
                setPageOffset((p) =>
                  Math.min(TOTAL_DAYS - DESKTOP_PAGE_SIZE, p + 7),
                )
              }
              className="grid h-9 w-9 flex-none cursor-pointer place-items-center rounded-pill border border-border bg-white text-muted disabled:cursor-not-allowed disabled:opacity-50"
            >
              <i className="fas fa-chevron-right text-[11px]" />
            </button>
          </div>
          <div className="mb-6 hidden text-[12px] text-[#9aa9b8] md:block">
            Showing {visibleDates.length} of {TOTAL_DAYS} days · Scroll →
          </div>

          {/* Mobile date strip — full horizontal scroll */}
          <div className="-mx-5 mb-3 flex gap-2 overflow-x-auto px-5 py-1 md:hidden">
            {dates.map((d) => (
              <DateStripPill
                key={d.iso}
                date={d}
                selected={d.iso === selectedDate}
                onSelect={setSelectedDate}
              />
            ))}
          </div>

          {/* Header row */}
          <div className="mb-3 flex items-baseline justify-between">
            <div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-heading md:text-[13px]">
              {formatLongDate(selectedDate)} —{" "}
              <span className="hidden md:inline">Available slots</span>
              <span className="md:hidden">{openSlotCount} slots open</span>
            </div>
            <div className="hidden gap-3.5 text-[11px] text-[#9aa9b8] md:flex">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm border-[1.5px] border-border bg-white" />
                Open
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm border-[1.5px] border-border bg-[#F4F5F7]" />
                Booked
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm bg-cta" />
                Selected
              </span>
            </div>
          </div>

          {/* Time grid */}
          <div className="grid grid-cols-3 gap-2 md:grid-cols-4 md:gap-2.5">
            {slots.map((slot) => {
              if (LUNCH_SLOTS.has(slot.short)) {
                return (
                  <div
                    key={slot.short}
                    className="grid min-h-[44px] place-items-center rounded-md border-[1.5px] border-dashed border-border bg-[#FBFBFC] px-2 py-3 text-center text-[11px] text-[#9aa9b8] md:text-[12px]"
                  >
                    <span>
                      <i className="fas fa-utensils mr-1" /> Lunch
                    </span>
                  </div>
                );
              }

              let state: SlotState = "available";
              if (bookedForDate.has(slot.short)) state = "booked";
              else if (slot.short === selectedSlot) state = "selected";

              return (
                <SlotPill
                  key={slot.short}
                  slot={slot}
                  state={state}
                  onSelect={setSelectedSlot}
                />
              );
            })}
          </div>

          {/* Mobile-only info note */}
          <div className="mt-5 flex gap-2 rounded-md border border-[#F4D9A8] bg-[#FFF8EC] px-3.5 py-3 text-[12px] text-[#7a5c2b] md:hidden">
            <i className="fas fa-info-circle mt-0.5" />
            <span>
              Slots refresh every 60 seconds. We hold your selection for 5 minutes.
            </span>
          </div>
        </div>

        {/* Desktop sticky footer */}
        <div className="hidden items-center justify-between border-t border-border bg-surface-muted px-12 py-4 md:flex">
          <Link
            href="/book"
            className="inline-flex items-center gap-2 text-[14px] text-muted no-underline hover:text-link-hover"
          >
            <i className="fas fa-arrow-left text-[11px]" /> Back
          </Link>
          <div className="flex items-center gap-4">
            {selectedSlot && (
              <span className="text-[13px] text-muted">
                <i className="fas fa-calendar-check mr-1.5 text-link-hover" />
                <strong className="font-semibold text-heading">
                  {formatLongDate(selectedDate)}
                </strong>{" "}
                · {formatSlotLabel(selectedSlot)}
              </span>
            )}
            <button
              type="button"
              disabled={continueDisabled}
              onClick={handleContinue}
              className={
                "inline-flex items-center gap-2 rounded-md bg-cta px-6 py-3 text-[15px] font-medium text-cta-fg transition-colors " +
                (continueDisabled
                  ? "cursor-not-allowed opacity-50"
                  : "cursor-pointer hover:bg-[#d92843]")
              }
            >
              Continue <i className="fas fa-arrow-right text-[11px]" />
            </button>
          </div>
        </div>
      </div>

      {/* Mobile sticky bottom bar */}
      <div className="fixed inset-x-0 bottom-0 flex items-center gap-3 border-t border-border bg-white px-4 py-3 shadow-[0_-4px_12px_rgba(0,0,0,0.05)] md:hidden">
        <Link
          href="/book"
          className="inline-flex items-center gap-1.5 px-2 py-3 text-[14px] text-muted no-underline"
        >
          <i className="fas fa-arrow-left text-[11px]" /> Back
        </Link>
        <button
          type="button"
          disabled={continueDisabled}
          onClick={handleContinue}
          className={
            "inline-flex flex-1 items-center justify-center gap-2 rounded-md bg-cta px-6 py-3 text-[15px] font-medium text-cta-fg transition-colors " +
            (continueDisabled
              ? "cursor-not-allowed opacity-50"
              : "cursor-pointer hover:bg-[#d92843]")
          }
        >
          {selectedSlot ? `Continue · ${formatSlotLabel(selectedSlot)}` : "Continue"}{" "}
          <i className="fas fa-arrow-right text-[11px]" />
        </button>
      </div>
    </>
  );
}
