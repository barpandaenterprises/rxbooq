import type { BookingService } from "@/lib/booking-data";

type Props = {
  service: BookingService;
  selected: boolean;
  onSelect: (id: string) => void;
};

export function BookingServiceTile({ service, selected, onSelect }: Props) {
  return (
    <button
      type="button"
      onClick={() => onSelect(service.id)}
      aria-pressed={selected}
      className={
        "group relative w-full rounded-md border-[1.5px] bg-white p-4 text-left shadow-sm transition-[border-color,box-shadow] duration-150 md:p-5 " +
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cta " +
        (selected
          ? "border-cta shadow-[0_1px_2px_rgba(238,52,78,0.10),0_4px_12px_rgba(238,52,78,0.08)]"
          : "border-border hover:border-[#d6e6f3] hover:shadow-md")
      }
    >
      <div className="flex items-start gap-3">
        <div
          className={
            "grid h-10 w-10 flex-none place-items-center rounded-md text-[16px] " +
            (selected ? "bg-[#FFE7EC] text-cta" : "bg-[#E6F1FA] text-brand group-hover:bg-[#dbeaf5]")
          }
        >
          <i className={`fas ${service.icon}`} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="text-[15px] font-semibold leading-[20px] text-heading md:text-[16px] md:leading-[22px]">
              {service.name}
            </div>
            <div
              className={
                "grid h-5 w-5 flex-none place-items-center rounded-pill text-white md:h-[22px] md:w-[22px] " +
                (selected ? "bg-cta" : "border-[1.5px] border-border bg-white")
              }
            >
              {selected && <i className="fas fa-check text-[10px] md:text-[11px]" />}
            </div>
          </div>

          <div className="mt-0.5 text-[12px] text-muted md:text-[13px]">
            <i className="far fa-clock mr-1 text-[10px] md:text-[11px]" />
            {service.duration}
            <span className="mx-1.5 text-border md:mx-2">·</span>
            <span className="font-medium text-link-hover">{service.fee}</span>
          </div>

          <div className="mt-2 text-[13px] leading-[19px] text-muted md:leading-5">
            {service.description}
          </div>
        </div>
      </div>
    </button>
  );
}
