import Link from "next/link";
import {
  CLINIC_PHONE_DISPLAY,
  TEL_HREF,
  waLink,
} from "@/lib/contact";

type QuickService = {
  id: string;
  emoji: string;
  icon: string;
  title: string;
  hint: string;
  /** First-person phrase used in the prefilled WhatsApp message. */
  prefillIntent: string;
};

const SERVICES: QuickService[] = [
  {
    id: "pain",
    emoji: "🦷",
    icon: "fa-tooth",
    title: "Tooth pain or emergency",
    hint: "We'll see you as soon as possible — same day if there's a slot.",
    prefillIntent: "I have tooth pain and need to see a dentist soon",
  },
  {
    id: "rct",
    emoji: "🩺",
    icon: "fa-tooth",
    title: "Root canal / treatment",
    hint: "Single-sitting RCT with painless rotary endodontics.",
    prefillIntent: "I'd like to book a Root Canal consultation",
  },
  {
    id: "cleaning",
    emoji: "✨",
    icon: "fa-magic",
    title: "Cleaning / whitening",
    hint: "Routine scaling, polishing or whitening.",
    prefillIntent: "I'd like to book a cleaning or whitening session",
  },
  {
    id: "kids",
    emoji: "👶",
    icon: "fa-baby",
    title: "Kids dentistry",
    hint: "Gentle pediatric care in a fear-free environment.",
    prefillIntent: "I'd like to book a pediatric dental appointment for my child",
  },
  {
    id: "implant",
    emoji: "🦷",
    icon: "fa-teeth",
    title: "Implants or braces",
    hint: "Initial consultation with X-ray review and a care plan.",
    prefillIntent: "I'd like to book a consultation for dental implants or braces",
  },
  {
    id: "other",
    emoji: "💬",
    icon: "fa-comment",
    title: "Something else",
    hint: "Not sure what you need? Tap and chat with us.",
    prefillIntent: "I'd like to ask about an appointment at Mahakur Poly Dental",
  },
];

function buildPrefill(intent: string): string {
  return `${intent}.\n\n— Sent from mahakurdental.in`;
}

export function QuickBook({ clinicSlug }: { clinicSlug: string }) {
  return (
    <div className="mx-auto max-w-[640px] px-4 pb-10 pt-4 md:pb-16 md:pt-10">
      {/* Hero */}
      <div className="rounded-[16px] bg-surface-warm p-5 md:p-7">
        <div className="mb-3 inline-flex items-center gap-1.5 rounded-pill bg-white px-3 py-1 text-[12px] font-semibold uppercase tracking-[0.06em] text-[#b8253a]">
          <i className="fab fa-whatsapp text-[12px] text-[#25D366]" />
          Easy booking
        </div>
        <h1 className="text-[26px] font-semibold leading-8 text-heading md:text-[28px] md:leading-9">
          Tap once. We&rsquo;ll do the rest on WhatsApp.
        </h1>
        <p className="mt-2 text-[14px] leading-[22px] text-muted md:text-[15px]">
          Pick what you need below — we&rsquo;ll open WhatsApp with a short
          message ready. Send it, and our reception will confirm a slot in
          minutes. Reply in English, हिंदी or ଓଡ଼ିଆ.
        </p>
      </div>

      {/* Service tiles — large tap targets, ≥ 80px tall */}
      <div className="mt-5 flex flex-col gap-2.5 md:mt-7 md:gap-3">
        {SERVICES.map((s) => (
          <a
            key={s.id}
            href={waLink(buildPrefill(s.prefillIntent))}
            target="_blank"
            rel="noreferrer"
            className="group flex items-center gap-3.5 rounded-[12px] border border-border bg-white p-4 text-left no-underline shadow-sm transition-[border-color,box-shadow,transform] duration-150 hover:-translate-y-0.5 hover:border-[#cdebd5] hover:shadow-md md:p-5"
          >
            <span
              aria-hidden
              className="grid h-12 w-12 flex-none place-items-center rounded-pill bg-[#E6F4EC] text-[20px] md:h-14 md:w-14"
            >
              {s.emoji}
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-[16px] font-semibold leading-[20px] text-heading md:text-[17px] md:leading-[22px]">
                {s.title}
              </div>
              <div className="mt-0.5 text-[13px] leading-[19px] text-muted">
                {s.hint}
              </div>
            </div>
            <span className="ml-1 grid h-9 w-9 flex-none place-items-center rounded-pill bg-[#25D366] text-[14px] text-white md:h-10 md:w-10 md:text-[16px]">
              <i className="fab fa-whatsapp" />
            </span>
          </a>
        ))}
      </div>

      {/* Phone fallback — equally prominent for users who prefer voice */}
      <div className="mt-6 rounded-[12px] border-[1.5px] border-link-hover bg-[#E6F1FA] p-5 md:mt-7 md:p-6">
        <div className="flex items-center gap-3.5">
          <span className="grid h-12 w-12 flex-none place-items-center rounded-pill bg-link-hover text-[18px] text-white md:h-14 md:w-14 md:text-[20px]">
            <i className="fas fa-phone-alt" />
          </span>
          <div className="flex-1">
            <div className="text-[16px] font-semibold text-heading md:text-[17px]">
              Prefer to talk?
            </div>
            <div className="text-[13px] text-muted">
              Reception answers Mon – Sat, 8:00 AM – 8:00 PM.
            </div>
          </div>
        </div>
        <a
          href={TEL_HREF}
          className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-md bg-link-hover px-5 py-3.5 text-[16px] font-semibold text-white no-underline"
        >
          <i className="fas fa-phone-alt text-[14px]" />
          Call {CLINIC_PHONE_DISPLAY}
        </a>
      </div>

      {/* Online form escape hatch */}
      <div className="mt-7 border-t border-border pt-5 text-center">
        <div className="text-[13px] text-muted">
          Comfortable filling a form?
        </div>
        <Link
          href={`/${clinicSlug}/book`}
          className="mt-1 inline-flex items-center gap-1.5 text-[14px] font-medium text-link-hover no-underline"
        >
          <i className="fas fa-edit text-[11px]" />
          Use the 3-step online form instead
          <i className="fas fa-arrow-right text-[10px]" />
        </Link>
      </div>

      {/* Trust footer */}
      <div className="mt-6 text-center text-[11px] text-[#9aa9b8] md:mt-8">
        <i className="fas fa-lock mr-1.5" />
        Your number stays with the clinic. No spam, no card, no app to install.
      </div>
    </div>
  );
}
