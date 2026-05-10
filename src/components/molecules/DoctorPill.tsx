import type { BookingDoctor } from "@/lib/booking-data";

type Props = {
  doctor: BookingDoctor;
  selected: boolean;
  onSelect: (id: string) => void;
};

export function DoctorPill({ doctor, selected, onSelect }: Props) {
  return (
    <button
      type="button"
      onClick={() => onSelect(doctor.id)}
      aria-pressed={selected}
      className={
        "inline-flex items-center gap-2.5 rounded-pill border-[1.5px] py-1.5 pl-1.5 pr-4 transition-colors duration-150 " +
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cta " +
        (selected
          ? "border-link-hover bg-link-hover text-white"
          : "border-border bg-white text-body hover:border-link-hover")
      }
    >
      <span
        className={
          "grid h-8 w-8 place-items-center rounded-pill text-[12px] font-semibold " +
          (selected ? "bg-white/20 text-white" : "bg-surface-muted text-link-hover")
        }
      >
        {doctor.initials}
      </span>
      <span className="flex flex-col items-start leading-[14px]">
        <span className="text-[14px] font-medium">{doctor.name}</span>
        <span
          className={
            "mt-0.5 text-[11px] " + (selected ? "text-white/75" : "text-[#9aa9b8]")
          }
        >
          {doctor.credential}
        </span>
      </span>
      {selected && <i className="fas fa-check ml-1 text-[11px]" />}
    </button>
  );
}
