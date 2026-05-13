import {
  WhatsAppMessagePreview,
  WhatsAppQuickReplies,
} from "@/components/molecules/WhatsAppMessagePreview";

type FrameService = { id: string; name: string };
type FrameDoctor  = { id: string; name: string };

type Props = {
  service: FrameService;
  doctor:  FrameDoctor | null;
  date:    string;
  slot:    string;
};

const CHAT_BG_PATTERN =
  "radial-gradient(circle at 20% 10%, rgba(0,0,0,0.04) 1px, transparent 1px), radial-gradient(circle at 70% 60%, rgba(0,0,0,0.04) 1px, transparent 1px)";

export function WhatsAppPhoneFrame({ service, doctor, date, slot }: Props) {
  return (
    <div className="h-[600px] w-[300px] rounded-[42px] bg-[#0a0a0a] p-2.5 shadow-[0_30px_60px_-20px_rgba(0,0,0,0.30),0_0_0_1px_rgba(255,255,255,0.05)_inset]">
      <div className="relative flex h-full w-full flex-col overflow-hidden rounded-[34px] bg-[#ECE5DD]">
        {/* Notch */}
        <span
          aria-hidden
          className="absolute left-1/2 top-2 z-[5] h-[22px] w-[90px] -translate-x-1/2 rounded-[14px] bg-[#0a0a0a]"
        />

        {/* WhatsApp top bar */}
        <div className="flex items-center gap-2.5 bg-[#075E54] px-3.5 pb-2.5 pt-[34px] text-white">
          <i className="fas fa-arrow-left text-[14px]" />
          <div className="grid h-[34px] w-[34px] place-items-center rounded-pill bg-white text-[14px] text-brand">
            <i className="fas fa-tooth" />
          </div>
          <div className="flex-1 text-[13px]">
            <div className="flex items-center gap-1.5 font-semibold">
              Mahakur Poly Dental
              <i className="fas fa-check-circle text-[11px] text-[#25D366]" />
            </div>
            <div className="text-[10px] opacity-80">online</div>
          </div>
          <i className="fas fa-video text-[14px]" />
          <i className="fas fa-phone text-[13px]" />
          <i className="fas fa-ellipsis-v text-[14px]" />
        </div>

        {/* Chat body */}
        <div
          className="flex flex-1 flex-col gap-1.5 overflow-hidden bg-[#ECE5DD] px-3 py-3.5"
          style={{
            backgroundImage: CHAT_BG_PATTERN,
            backgroundSize: "12px 12px, 18px 18px",
          }}
        >
          <div className="text-center">
            <span className="rounded-sm bg-[rgba(225,245,254,0.9)] px-2.5 py-0.5 text-[10px] text-heading">
              TODAY · 10:02 AM
            </span>
          </div>

          <WhatsAppMessagePreview
            service={service}
            doctor={doctor}
            date={date}
            slot={slot}
            inFrame
          />
          <WhatsAppQuickReplies />

          <div className="flex-1" />

          <div className="flex items-center gap-2 rounded-pill bg-white px-3 py-2 text-[12px] text-[#9aa9b8]">
            <i className="far fa-smile" />
            <span className="flex-1">Message</span>
            <i className="fas fa-paperclip" />
            <i className="fas fa-camera" />
          </div>
        </div>
      </div>
    </div>
  );
}
