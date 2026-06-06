"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { updateDoctorScheduleAction } from "@/app/(clinic-app)/[clinicSlug]/admin/doctors/actions";
import {
  WEEKDAY_LABEL,
  WEEKDAYS,
  type TimeRange,
  type Weekday,
  type WeeklySchedule,
} from "@/lib/doctors-data";

type Props = {
  trigger?:    React.ReactNode;
  doctorId:    string;
  doctorName:  string;
  /** Current schedule from the DoctorProfile page (`doctor.schedule`). */
  initialSchedule: WeeklySchedule;
};

const DEFAULT_RANGE: TimeRange = { start: "09:00", end: "18:00" };

/** Postgres weekday convention used by `doctor_availability.weekday`: 0=Sun..6=Sat. */
const PG_WEEKDAY: Record<Weekday, number> = {
  sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6,
};

export function EditScheduleDialog({ trigger, doctorId, doctorName, initialSchedule }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [schedule, setSchedule] = useState<WeeklySchedule>(initialSchedule);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const toggleDay = (d: Weekday) => {
    setSchedule((prev) => {
      const next = { ...prev };
      if (next[d]) delete next[d];
      else next[d] = [DEFAULT_RANGE];
      return next;
    });
  };

  const setRange = (d: Weekday, patch: Partial<TimeRange>) => {
    setSchedule((prev) => {
      const next = { ...prev };
      const existing = next[d]?.[0] ?? DEFAULT_RANGE;
      next[d] = [{ ...existing, ...patch }];
      return next;
    });
  };

  const submit = () => {
    setError(null);

    // Validate: end > start on every active day.
    for (const d of WEEKDAYS) {
      const r = schedule[d]?.[0];
      if (r && r.end <= r.start) {
        setError(`${WEEKDAY_LABEL[d]}: end time must be after start time.`);
        return;
      }
    }

    // Flatten WeeklySchedule into the DB row shape the action expects.
    const rows = (Object.keys(schedule) as Weekday[]).flatMap((d) => {
      const ranges = schedule[d] ?? [];
      return ranges.map((r) => ({
        weekday:    PG_WEEKDAY[d],
        start_time: r.start,
        end_time:   r.end,
      }));
    });

    startTransition(async () => {
      const res = await updateDoctorScheduleAction({ doctorId, rows });
      if (!res.ok) { setError(res.error); return; }
      setOpen(false);
      router.refresh();
    });
  };

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      {trigger && <Dialog.Trigger asChild>{trigger}</Dialog.Trigger>}
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-[rgba(16,24,40,0.55)]" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-[520px] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-lg bg-white shadow-[0_24px_60px_-12px_rgba(16,24,40,0.30)] focus:outline-none">
          <div className="border-b border-border px-6 py-4">
            <Dialog.Title className="text-[18px] font-semibold text-heading">Edit weekly hours</Dialog.Title>
            <Dialog.Description className="mt-0.5 text-[12px] text-muted">
              {doctorName} · Tap a day to toggle it on/off. Set start &amp; end times for working days.
            </Dialog.Description>
          </div>

          <div className="max-h-[60vh] overflow-y-auto px-6 py-4">
            <div className="space-y-1.5">
              {WEEKDAYS.map((d) => {
                const range  = schedule[d]?.[0];
                const active = Boolean(range);
                return (
                  <div key={d} className="flex items-center gap-2 rounded-md border border-border bg-white p-2">
                    <button
                      type="button"
                      onClick={() => toggleDay(d)}
                      className={
                        "w-14 cursor-pointer rounded-md px-2 py-1.5 text-[12px] font-semibold uppercase tracking-[0.06em] " +
                        (active ? "bg-brand text-white" : "bg-surface-muted text-muted")
                      }
                    >
                      {WEEKDAY_LABEL[d]}
                    </button>
                    {active && range ? (
                      <>
                        <input
                          type="time"
                          value={range.start}
                          onChange={(e) => setRange(d, { start: e.target.value })}
                          className="rounded-sm border border-border bg-white px-2 py-1 text-[12px] text-heading outline-none focus:border-link-hover"
                        />
                        <span className="text-[12px] text-muted">to</span>
                        <input
                          type="time"
                          value={range.end}
                          onChange={(e) => setRange(d, { end: e.target.value })}
                          className="rounded-sm border border-border bg-white px-2 py-1 text-[12px] text-heading outline-none focus:border-link-hover"
                        />
                      </>
                    ) : (
                      <span className="text-[12px] italic text-[#9aa9b8]">Off</span>
                    )}
                  </div>
                );
              })}
            </div>

            <p className="mt-3 text-[11px] text-muted">
              <i className="fas fa-info-circle mr-1" />
              Replaces all existing weekly hours for this doctor. Per-date exceptions (leave, extra hours) are managed separately from the &quot;Add leave or extra hours&quot; button.
            </p>

            {error && (
              <div className="mt-3 rounded-md border border-[#f3d3d8] bg-[#fff5f6] px-3 py-2 text-[12px] text-heading">
                {error}
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-border bg-[#fafbfc] px-6 py-3">
            <Dialog.Close asChild>
              <button
                type="button"
                disabled={pending}
                className="rounded-md border border-border bg-white px-4 py-2 text-[13px] font-medium text-muted hover:text-heading disabled:opacity-60"
              >
                Cancel
              </button>
            </Dialog.Close>
            <button
              type="button"
              disabled={pending}
              onClick={submit}
              className="rounded-md bg-cta px-5 py-2 text-[13px] font-medium text-cta-fg hover:bg-[#d92843] disabled:opacity-60"
            >
              {pending ? "Saving…" : "Save hours"}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
