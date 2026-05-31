import { formatLongDate, formatSlotLabel } from "@/lib/booking-data";

type CardService = { id: string; name: string; durationMinutes: number; feeLabel: string };
type CardDoctor  = { id: string; name: string; credential: string };

type Props = {
  service: CardService;
  doctor:  CardDoctor | null;
  date:    string;
  slot:    string;
  compact?: boolean;
  clinicName?:    string;
  clinicAddress?: string;
};

export function AppointmentConfirmedCard({
  service,
  doctor,
  date,
  slot,
  compact,
  clinicName    = "Rxbooq Clinic",
  clinicAddress = "",
}: Props) {
  const CLINIC_NAME    = clinicName;
  const CLINIC_ADDRESS = clinicAddress;
  const rows: Array<[string, string, string, string]> = [
    ["fa-tooth", "Service", service.name, `${service.durationMinutes} min · ${service.feeLabel}`],
    [
      "fa-user-md",
      "Doctor",
      doctor?.name ?? "Any available doctor",
      doctor?.credential ?? "Will be assigned at clinic",
    ],
    [
      "fa-calendar-check",
      "When",
      `${formatLongDate(date)} · ${formatSlotLabel(slot)}`,
      "Arrive 10 min early",
    ],
  ];

  return (
    <div
      className={
        "rounded-lg border border-border bg-white " +
        (compact ? "p-[18px]" : "p-6")
      }
    >
      <div className="mb-3.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-[#9aa9b8]">
        Appointment summary
      </div>

      <div className="grid grid-cols-[auto_1fr] gap-x-3.5 gap-y-3.5">
        {rows.map(([ic, k, v, sub]) => (
          <Row key={k} icon={ic} label={k} value={v} sub={sub} accent="brand" />
        ))}
        <Row
          icon="fa-map-marker-alt"
          label="Where"
          value={CLINIC_NAME}
          sub={CLINIC_ADDRESS}
          accent="cta"
          extra={
            <a
              href={`https://www.google.com/maps/search/${encodeURIComponent(`${CLINIC_NAME} ${CLINIC_ADDRESS}`)}`}
              target="_blank"
              rel="noreferrer"
              className="mt-1 inline-flex items-center gap-1.5 text-[13px] font-medium text-link-hover no-underline"
            >
              <i className="fas fa-directions text-[12px]" />
              Get directions
            </a>
          }
        />
      </div>

      <div className="mt-[18px] flex flex-wrap gap-2 border-t border-border pt-4">
        <a
          href="#"
          className="inline-flex items-center gap-2 rounded-md border-[1.5px] border-link-hover bg-white px-3.5 py-2 text-[13px] font-medium text-link-hover no-underline"
        >
          <i className="fas fa-download text-[11px]" />
          Download .ics
        </a>
        {[
          ["fab fa-google", "Google"],
          ["fab fa-apple", "Apple"],
          ["fab fa-microsoft", "Outlook"],
        ].map(([ic, name]) => (
          <a
            key={name}
            href="#"
            className="inline-flex items-center gap-2 rounded-md border border-border bg-surface-muted px-3.5 py-2 text-[13px] font-medium text-heading no-underline"
          >
            <i className={`${ic} text-[12px] text-muted`} />
            {name}
          </a>
        ))}
      </div>
    </div>
  );
}

type RowProps = {
  icon: string;
  label: string;
  value: string;
  sub: string;
  accent: "brand" | "cta";
  extra?: React.ReactNode;
};

function Row({ icon, label, value, sub, accent, extra }: RowProps) {
  const iconClasses =
    accent === "cta"
      ? "bg-[#FFE7EC] text-cta"
      : "bg-[#E6F1FA] text-brand";
  return (
    <>
      <div
        className={`grid h-9 w-9 place-items-center self-start rounded-pill text-[14px] ${iconClasses}`}
      >
        <i className={`fas ${icon}`} />
      </div>
      <div>
        <div className="text-[11px] font-medium uppercase tracking-[0.06em] text-[#9aa9b8]">
          {label}
        </div>
        <div className="mt-0.5 text-[15px] font-semibold text-heading">{value}</div>
        <div className="text-[13px] text-muted">{sub}</div>
        {extra}
      </div>
    </>
  );
}
