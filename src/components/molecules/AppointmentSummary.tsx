import { LangPicker, type Locale } from "@/components/molecules/LangPicker";
import {
  formatLongDate,
  formatSlotLabel,
  type BookingDoctor,
  type BookingService,
} from "@/lib/booking-data";

type Props = {
  service: BookingService;
  doctor: BookingDoctor | null;
  date: string;
  slot: string;
  locale: Locale;
  onLocaleChange: (locale: Locale) => void;
  compact?: boolean;
};

const CLINIC_NAME = "Mahakur Poly Dental";
const CLINIC_ADDRESS = "Modipara Main Rd, Sambalpur";

export function AppointmentSummary({
  service,
  doctor,
  date,
  slot,
  locale,
  onLocaleChange,
  compact,
}: Props) {
  const rows: Array<[string, string, string]> = [
    ["Clinic", CLINIC_NAME, CLINIC_ADDRESS],
    ["Service", service.name, `${service.duration} · ${service.fee}`],
    [
      "Doctor",
      doctor?.name ?? "Any available doctor",
      doctor?.credential ?? "Will be assigned at clinic",
    ],
    [
      "When",
      `${formatLongDate(date)} · ${formatSlotLabel(slot)}`,
      "Arrive 10 min early",
    ],
  ];

  return (
    <div
      className={
        "rounded-[12px] border border-border bg-surface-muted " +
        (compact ? "p-4" : "p-6")
      }
    >
      <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.06em] text-[#9aa9b8]">
        Your appointment
      </div>

      {rows.map(([k, v, sub]) => (
        <div
          key={k}
          className="flex items-start justify-between gap-3 border-b border-border py-2.5"
        >
          <div className="w-16 flex-none text-[12px] font-medium text-[#9aa9b8]">
            {k}
          </div>
          <div className="flex-1 text-right">
            <div className="text-[14px] font-semibold leading-[18px] text-heading">
              {v}
            </div>
            <div className="mt-0.5 text-[12px] text-muted">{sub}</div>
          </div>
        </div>
      ))}

      <div className="flex items-center justify-between pt-3.5">
        <div className="text-[12px] font-medium text-[#9aa9b8]">To pay at clinic</div>
        <div className="text-[18px] font-bold text-link-hover">{service.fee}</div>
      </div>

      <div className="mt-3.5 border-t border-border pt-3.5">
        <div className="mb-2 text-[12px] font-medium text-heading">
          Communication language
        </div>
        <LangPicker value={locale} onChange={onLocaleChange} />
        <div className="mt-2 text-[11px] text-[#9aa9b8]">
          <i className="fas fa-info-circle mr-1" />
          Defaults to clinic locale (हिंदी for Sambalpur).
        </div>
      </div>
    </div>
  );
}
