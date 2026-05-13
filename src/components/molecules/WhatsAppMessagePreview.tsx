import { formatLongDate, formatSlotLabel } from "@/lib/booking-data";

type PreviewService = { id: string; name: string };
type PreviewDoctor  = { id: string; name: string };

type Props = {
  service: PreviewService;
  doctor:  PreviewDoctor | null;
  date:    string;
  slot:    string;
  /** Render with the narrower bubble width used inside the phone frame. */
  inFrame?: boolean;
};

export function WhatsAppMessagePreview({
  service,
  doctor,
  date,
  slot,
  inFrame,
}: Props) {
  return (
    <div
      className={
        "relative rounded-[12px] bg-white px-3.5 py-3 shadow-[0_1px_0_rgba(0,0,0,0.05)] " +
        (inFrame ? "max-w-[240px]" : "w-full")
      }
    >
      {/* Tail */}
      <span
        aria-hidden
        className="absolute -left-[7px] top-2 h-0 w-0 border-y-[8px] border-r-[10px] border-y-transparent border-r-white"
      />

      <div className="mb-1.5 flex items-center gap-1 text-[11px] font-semibold text-brand">
        Mahakur Poly Dental
        <i className="fas fa-check-circle text-[11px] text-[#25D366]" />
      </div>

      <div className="mb-1.5 text-[13px] leading-[19px] text-[#111]">
        <span className="font-semibold">Hi there 👋</span>
        <br />
        Your appointment at <strong>Mahakur Poly Dental</strong> is confirmed.
      </div>

      <div className="mb-2 rounded-sm border-l-[3px] border-[#F4B400] bg-[#FFF8EC] px-2.5 py-2 text-[12px] leading-[18px] text-heading">
        🦷 <strong>{service.name}</strong>
        {doctor ? <> with {doctor.name}</> : null}
        <br />
        📅 {formatLongDate(date)} · {formatSlotLabel(slot)}
        <br />
        📍 Bhatra Chowk, Sambalpur
      </div>

      <div className="text-[12px] leading-[18px] text-body">
        Reply <strong>1</strong> to confirm, <strong>2</strong> to reschedule.
      </div>

      <div className="mt-1.5 flex items-center justify-end gap-1 text-[10px] text-[#888]">
        10:02 AM
        <i className="fas fa-check-double text-[10px] text-[#34B7F1]" />
      </div>
    </div>
  );
}

export function WhatsAppQuickReplies() {
  return (
    <div className="mt-2 flex flex-col gap-1.5">
      {[
        [1, "Confirm"],
        [2, "Reschedule"],
      ].map(([n, label]) => (
        <button
          key={label}
          type="button"
          className="rounded-md border-0 bg-white px-3 py-2.5 text-center text-[13px] font-medium text-[#0099CC] shadow-[0_1px_0_rgba(0,0,0,0.06)]"
        >
          <i className="fas fa-reply mr-1.5 text-[11px]" />
          {label}
        </button>
      ))}
    </div>
  );
}
