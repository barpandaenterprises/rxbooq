import Link from "next/link";
import { SuccessIllo } from "@/components/atoms/SuccessIllo";
import { AppointmentConfirmedCard } from "@/components/molecules/AppointmentConfirmedCard";
import {
  WhatsAppMessagePreview,
  WhatsAppQuickReplies,
} from "@/components/molecules/WhatsAppMessagePreview";
import { WhatsAppPhoneFrame } from "@/components/molecules/WhatsAppPhoneFrame";
type SuccessService = { id: string; name: string; durationMinutes: number; feeLabel: string };
type SuccessDoctor  = { id: string; name: string; credential: string };

type Props = {
  service:      SuccessService;
  doctor:       SuccessDoctor | null;
  date:         string;
  slot:         string;
  bookingRef:   string;
  maskedMobile: string;
  clinicName?:    string;
  clinicAddress?: string;
};

const CHAT_BG_PATTERN =
  "radial-gradient(circle at 20% 10%, rgba(0,0,0,0.05) 1px, transparent 1px), radial-gradient(circle at 70% 60%, rgba(0,0,0,0.05) 1px, transparent 1px)";

export function BookingSuccess({
  service,
  doctor,
  date,
  slot,
  bookingRef,
  maskedMobile,
  clinicName,
  clinicAddress,
}: Props) {
  return (
    <div className="mx-auto max-w-[1080px] overflow-hidden rounded-lg bg-white shadow-md">
      <div className="grid grid-cols-1 md:grid-cols-[1.2fr_1fr]">
        {/* LEFT — confirmation copy + summary */}
        <div className="px-5 pb-10 pt-8 md:px-14 md:pb-12 md:pt-14">
          <div className="flex justify-center md:block">
            <SuccessIllo size={140} />
          </div>

          <div className="mt-2 flex justify-center md:justify-start">
            <span className="inline-flex items-center gap-1.5 rounded-pill bg-[#E6F1FA] px-3 py-1 text-[11px] font-medium text-brand md:text-[12px]">
              <i className="fas fa-check-circle text-[11px] md:text-[12px]" />
              Booking #{bookingRef}
            </span>
          </div>

          <h2 className="mb-2.5 mt-2.5 text-center text-[26px] font-semibold leading-[32px] text-heading md:mt-3 md:text-left md:text-h2">
            You&rsquo;re booked!
          </h2>

          <p className="mb-5 max-w-[440px] text-center text-[14px] leading-[22px] text-muted md:mb-8 md:text-left md:text-paragraph">
            We&rsquo;ve sent a confirmation to your WhatsApp at{" "}
            <strong className="text-heading">{maskedMobile}</strong>. See you on{" "}
            {/* Day name is part of the When row in the summary; keep copy generic. */}
            schedule — we&rsquo;ll send a gentle reminder the night before.
          </p>

          {/* Mobile-only inline WhatsApp preview */}
          <div
            className="mb-5 rounded-lg p-3.5 md:hidden"
            style={{
              backgroundColor: "#ECE5DD",
              backgroundImage: CHAT_BG_PATTERN,
              backgroundSize: "12px 12px, 18px 18px",
            }}
          >
            <div className="-mx-3.5 -mt-3.5 mb-3.5 flex items-center gap-2.5 rounded-t-lg bg-[#075E54] px-3.5 py-2.5 text-[13px] text-white">
              <div className="grid h-8 w-8 place-items-center rounded-pill bg-white text-[13px] text-brand">
                <i className="fas fa-tooth" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-1.5 font-semibold">
                  Mahakur Poly Dental
                  <i className="fas fa-check-circle text-[11px] text-[#25D366]" />
                </div>
                <div className="text-[10px] opacity-80">WhatsApp Business</div>
              </div>
            </div>
            <div className="mb-2.5 text-center">
              <span className="rounded-sm bg-[rgba(225,245,254,0.9)] px-2.5 py-0.5 text-[10px] text-heading">
                TODAY · 10:02 AM
              </span>
            </div>
            <WhatsAppMessagePreview
              service={service}
              doctor={doctor}
              date={date}
              slot={slot}
            />
            <WhatsAppQuickReplies />
          </div>

          <AppointmentConfirmedCard
            service={service}
            doctor={doctor}
            date={date}
            slot={slot}
            clinicName={clinicName}
            clinicAddress={clinicAddress}
          />

          <div className="mt-5 flex flex-wrap items-center justify-between gap-4 border-t border-border pt-5 md:mt-6">
            <a
              href="tel:+918260222828"
              className="inline-flex items-center gap-2 text-[14px] text-muted no-underline hover:text-link-hover"
            >
              <i className="fas fa-phone-alt text-[11px]" />
              Need help? Call clinic — +91 82602 22828
            </a>
            <a
              href="#"
              className="inline-flex items-center gap-2 rounded-md bg-cta px-6 py-3 text-[15px] font-medium text-cta-fg no-underline transition-colors hover:bg-[#d92843]"
            >
              <i className="fab fa-whatsapp" />
              Open WhatsApp chat
            </a>
          </div>

          {/* Mobile-only secondary CTAs row */}
          <div className="mt-3 flex flex-col gap-2.5 md:hidden">
            <Link
              href="/"
              className="inline-flex items-center justify-center gap-2 rounded-md border-[1.5px] border-link-hover bg-transparent px-6 py-3 text-[15px] font-medium text-link-hover no-underline"
            >
              <i className="fas fa-home" />
              Back to home
            </Link>
          </div>
        </div>

        {/* RIGHT — desktop phone frame */}
        <div
          className="relative hidden flex-col items-center justify-center gap-4 px-8 py-14 md:flex"
          style={{
            background: "linear-gradient(180deg, #FFF5F5 0%, #FFEAEE 100%)",
          }}
        >
          <span className="rounded-pill border border-[#f3d3d8] bg-white px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#b8253a]">
            <i className="fab fa-whatsapp mr-1.5 text-[#25D366]" />
            Sent to your phone
          </span>
          <WhatsAppPhoneFrame
            service={service}
            doctor={doctor}
            date={date}
            slot={slot}
          />
          <p className="max-w-[260px] text-center text-[12px] leading-[18px] text-[#9aa9b8]">
            Reply <strong className="text-heading">1</strong> to confirm or{" "}
            <strong className="text-heading">2</strong> to reschedule, anytime.
          </p>
        </div>
      </div>
    </div>
  );
}
