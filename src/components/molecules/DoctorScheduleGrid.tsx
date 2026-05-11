import {
  WEEKDAYS,
  WEEKDAY_LABEL,
  type WeeklySchedule,
} from "@/lib/doctors-data";

const HOUR_START = 8;  // 8 AM
const HOUR_END = 21;   // 9 PM
const HOURS = Array.from({ length: HOUR_END - HOUR_START }, (_, i) => HOUR_START + i);

function fmtHour(h: number): string {
  const ampm = h >= 12 ? "PM" : "AM";
  const hour12 = h > 12 ? h - 12 : h === 0 ? 12 : h;
  return `${hour12} ${ampm}`;
}

function timeToOffset(time: string): number {
  const [hStr, mStr] = time.split(":");
  return (Number(hStr) - HOUR_START) * 60 + Number(mStr);
}

const ROW_HEIGHT = 24; // px per hour

export function DoctorScheduleGrid({ schedule }: { schedule: WeeklySchedule }) {
  return (
    <div className="overflow-hidden rounded-md border border-border bg-white">
      <div className="grid grid-cols-[48px_repeat(7,1fr)]">
        {/* Header row */}
        <div className="border-b border-border bg-surface-muted" />
        {WEEKDAYS.map((d) => {
          const hasHours = (schedule[d]?.length ?? 0) > 0;
          return (
            <div
              key={d}
              className={
                "border-b border-l border-border py-1.5 text-center text-[11px] font-semibold uppercase tracking-[0.06em] " +
                (hasHours ? "text-heading" : "text-[#cdd9e4]")
              }
            >
              {WEEKDAY_LABEL[d]}
            </div>
          );
        })}

        {/* Time axis */}
        <div
          className="col-start-1 border-r border-border bg-surface-muted"
          style={{ height: HOURS.length * ROW_HEIGHT }}
        >
          {HOURS.map((h) => (
            <div
              key={h}
              style={{ height: ROW_HEIGHT }}
              className="flex items-start justify-end pr-1.5 pt-0.5 text-[9px] text-muted"
            >
              {fmtHour(h)}
            </div>
          ))}
        </div>

        {/* Day columns */}
        {WEEKDAYS.map((d) => {
          const ranges = schedule[d] ?? [];
          return (
            <div
              key={d}
              className="relative border-l border-border"
              style={{ height: HOURS.length * ROW_HEIGHT }}
            >
              {/* Hour grid lines */}
              {HOURS.map((_, i) => (
                <div
                  key={i}
                  style={{ top: i * ROW_HEIGHT, height: ROW_HEIGHT }}
                  className={
                    "absolute inset-x-0 " +
                    (i === 0 ? "" : "border-t border-dashed border-[#F4F5F7]")
                  }
                />
              ))}
              {/* Range blocks */}
              {ranges.map((r, i) => {
                const startMin = timeToOffset(r.start);
                const endMin = timeToOffset(r.end);
                const top = (startMin / 60) * ROW_HEIGHT;
                const height = Math.max(((endMin - startMin) / 60) * ROW_HEIGHT, 18);
                return (
                  <div
                    key={i}
                    style={{ top, height }}
                    className="absolute left-1 right-1 z-[1] rounded-sm border-l-[3px] border-link-hover bg-[#E6F1FA] px-1 py-0.5 text-[9px] font-medium leading-[12px] text-link-hover"
                  >
                    {r.start}<br />{r.end}
                  </div>
                );
              })}
              {ranges.length === 0 && (
                <div className="absolute inset-0 grid place-items-center text-[10px] text-[#cdd9e4]">
                  —
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="border-t border-border bg-surface-muted px-3 py-2 text-[11px] text-muted">
        <i className="fas fa-info-circle mr-1.5 text-[10px] text-[#9aa9b8]" />
        Hours shown in clinic timezone (IST). Edit schedule from the Schedule tab.
      </div>
    </div>
  );
}
