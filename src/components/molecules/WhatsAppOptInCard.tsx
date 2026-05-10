import { ConsentCheckbox } from "@/components/molecules/ConsentCheckbox";

type Props = {
  checked: boolean;
  onChange: (checked: boolean) => void;
};

export function WhatsAppOptInCard({ checked, onChange }: Props) {
  return (
    <div className="mt-6 flex items-start gap-3.5 rounded-[12px] border border-[#f3d3d8] bg-surface-warm px-5 py-4">
      <div className="grid h-10 w-10 flex-none place-items-center rounded-pill bg-[#25D366] text-[18px] text-white">
        <i className="fab fa-whatsapp" />
      </div>
      <div className="flex-1">
        <div className="mb-1 text-[15px] font-semibold text-heading">
          Get reminders &amp; history on WhatsApp
        </div>
        <div className="mb-2.5 text-[13px] leading-5 text-muted">
          Confirm in 2 taps next time. We&rsquo;ll send appointment reminders,
          prescriptions and care tips — straight to your chat.
        </div>
        <ConsentCheckbox checked={checked} onChange={onChange}>
          <span className="text-[14px] leading-5 text-heading">
            <strong className="font-semibold">Verify my number</strong> — we&rsquo;ll
            send a one-time code on WhatsApp.
            <span className="mt-0.5 block text-[12px] text-[#9aa9b8]">
              Optional. Skip to book as guest.
            </span>
          </span>
        </ConsentCheckbox>
      </div>
    </div>
  );
}
