export type BookingDate = {
  iso: string;
  day: number;
  month: string;
  weekdayLabel: string;
  weekend: boolean;
  closed: boolean;
  isToday: boolean;
};

type Props = {
  date: BookingDate;
  selected: boolean;
  onSelect: (iso: string) => void;
};

export function DateStripPill({ date, selected, onSelect }: Props) {
  const baseColor = date.closed
    ? "text-[#9aa9b8]"
    : date.weekend
      ? "text-muted"
      : "text-heading";

  const fillClasses = selected
    ? "bg-cta border-cta text-white"
    : `bg-white border-border ${baseColor} hover:border-link-hover`;

  return (
    <div className="relative flex-none">
      <button
        type="button"
        disabled={date.closed}
        onClick={() => !date.closed && onSelect(date.iso)}
        className={
          "flex w-[72px] flex-col items-center gap-0.5 rounded-[12px] border-[1.5px] py-2.5 transition-colors duration-150 " +
          "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cta " +
          (date.closed ? "cursor-not-allowed line-through opacity-65 " : "cursor-pointer ") +
          fillClasses
        }
      >
        <span
          className={
            "text-[11px] font-medium uppercase tracking-[0.06em] " +
            (date.weekend && !selected ? "opacity-70" : "")
          }
        >
          {date.weekdayLabel}
        </span>
        <span className="text-[20px] font-semibold leading-6">{date.day}</span>
        <span className="text-[10px] opacity-70">{date.month}</span>
      </button>
      {date.isToday && !selected && (
        <span className="absolute -right-1.5 -top-1.5 rounded-pill bg-brand px-1.5 py-0.5 text-[9px] font-semibold tracking-[0.04em] text-white">
          TODAY
        </span>
      )}
    </div>
  );
}
