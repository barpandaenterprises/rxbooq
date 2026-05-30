import Link from "next/link";

const TRUST = [
  { strong: "5 min",     sub: "to go live" },
  { strong: "0",         sub: "card required" },
  { strong: "WhatsApp",  sub: "native" },
  { strong: "GST-ready", sub: "Razorpay billing" },
];

export function PlatformHero() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-[#F4F8FB] to-white py-12 md:py-20">
      <div className="mx-auto max-w-[1200px] px-5 md:px-8">
        <div className="grid grid-cols-1 items-center gap-10 md:grid-cols-[1.1fr_1fr] md:gap-14">
          {/* Copy + CTAs */}
          <div>
            <span className="mb-4 inline-flex items-center gap-2 rounded-pill bg-[#E6F1FA] px-3 py-1 text-[12px] font-medium text-link-hover md:mb-5 md:px-3.5 md:py-1.5 md:text-[13px]">
              <i className="fas fa-bolt text-[10px] md:text-[11px]" />
              The clinic operating system for India
            </span>
            <h1 className="mb-3 text-[32px] font-semibold leading-[1.1] tracking-[-0.01em] text-heading md:mb-4 md:text-[48px]">
              Run a modern clinic from one place.
            </h1>
            <p className="mb-7 max-w-[540px] text-[15px] leading-[24px] text-muted md:text-[17px] md:leading-[28px]">
              A public profile patients can find, online scheduling, digital prescriptions, and WhatsApp reminders — wired together, billed monthly, in INR.
            </p>

            <div className="mb-6 flex flex-col gap-2.5 md:flex-row md:gap-3">
              <Link
                href="/get-started"
                className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-cta px-6 py-3.5 text-[15px] font-medium text-cta-fg no-underline transition-colors hover:bg-[#d92843] md:w-auto"
              >
                <i className="fas fa-rocket text-[14px]" />
                Start free — 5 min setup
              </Link>
              <Link
                href="/pricing"
                className="inline-flex w-full items-center justify-center gap-2 rounded-md border-[1.5px] border-link-hover bg-white px-[22.5px] py-3 text-[15px] font-medium text-link-hover no-underline transition-colors hover:bg-link-hover hover:text-white md:w-auto md:py-[10.5px]"
              >
                See pricing
                <i className="fas fa-arrow-right text-[11px]" />
              </Link>
            </div>

            <p className="mb-6 text-[12px] text-muted md:mb-8">
              <i className="fas fa-lock mr-1.5 text-[10px]" />
              No card required · 14-day full-feature trial · Cancel anytime
            </p>

            <div className="grid grid-cols-2 items-start gap-4 border-t border-border pt-4 md:grid-cols-4 md:gap-6 md:pt-6">
              {TRUST.map((t) => (
                <div key={t.sub} className="flex flex-col gap-0.5">
                  <div className="text-[15px] font-semibold text-heading md:text-[16px]">{t.strong}</div>
                  <div className="text-[12px] leading-[16px] text-muted md:text-[13px] md:leading-[18px]">{t.sub}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Product preview — Tailwind-composed mockup, no asset shopping */}
          <HeroMockup />
        </div>
      </div>
    </section>
  );
}

function HeroMockup() {
  return (
    <div className="relative">
      {/* Faux browser chrome */}
      <div className="overflow-hidden rounded-lg border border-border bg-white shadow-[0_24px_60px_-12px_rgba(16,24,40,0.18)]">
        <div className="flex items-center gap-2 border-b border-border bg-[#fafbfc] px-3 py-2">
          <span className="h-2.5 w-2.5 rounded-pill bg-[#ff5f57]" />
          <span className="h-2.5 w-2.5 rounded-pill bg-[#febc2e]" />
          <span className="h-2.5 w-2.5 rounded-pill bg-[#28c840]" />
          <span className="ml-3 truncate font-mono text-[10px] text-muted">your-clinic.doctorkart.in/admin/today</span>
        </div>

        {/* Header row */}
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div>
            <div className="text-[11px] uppercase tracking-wide text-muted">Today</div>
            <div className="text-[15px] font-semibold text-heading">Tuesday · 12 appointments</div>
          </div>
          <span className="rounded-pill bg-cta px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-cta-fg">Live</span>
        </div>

        {/* Calendar strip */}
        <div className="space-y-2 p-4">
          {[
            { time: "10:00", patient: "Asha P.",     doctor: "Dr. Kapoor",   chip: "Cleaning",     status: "ok"      },
            { time: "10:30", patient: "Rakesh M.",   doctor: "Dr. Kapoor",   chip: "Consultation", status: "ok"      },
            { time: "11:15", patient: "Sneha B.",    doctor: "Dr. Rao",      chip: "Follow-up",    status: "wa"      },
            { time: "12:00", patient: "Amit S.",     doctor: "Dr. Rao",      chip: "Root canal",   status: "active"  },
            { time: "12:45", patient: "Priya N.",    doctor: "Dr. Kapoor",   chip: "Whitening",    status: "ok"      },
          ].map((row) => (
            <div key={row.time} className="flex items-center gap-3 rounded-md border border-border bg-white px-3 py-2">
              <span className="w-12 text-[11px] font-mono text-muted">{row.time}</span>
              <div className="flex-1 min-w-0">
                <div className="truncate text-[12px] font-medium text-heading">{row.patient}</div>
                <div className="truncate text-[10px] text-muted">{row.doctor}</div>
              </div>
              <span className="rounded-pill bg-[#eef3fb] px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-link-hover">{row.chip}</span>
              {row.status === "active" && <span className="h-2 w-2 rounded-pill bg-cta" />}
              {row.status === "wa"     && <i className="fab fa-whatsapp text-[12px] text-[#25D366]" />}
              {row.status === "ok"     && <i className="fas fa-check-circle text-[11px] text-[#1f7a3a]" />}
            </div>
          ))}
        </div>
      </div>

      {/* Floating WhatsApp card */}
      <div className="absolute -bottom-5 -left-3 hidden w-56 rounded-lg border border-border bg-white p-3 shadow-md md:block">
        <div className="flex items-center gap-2">
          <span className="grid h-7 w-7 place-items-center rounded-pill bg-[#25D366] text-white">
            <i className="fab fa-whatsapp text-[12px]" />
          </span>
          <div className="text-[11px] font-medium text-heading">Reminder sent</div>
        </div>
        <p className="mt-1.5 text-[10px] leading-[14px] text-muted">
          “Hi Asha, your cleaning is tomorrow at 10:00 with Dr. Kapoor. Reply 1 to confirm.”
        </p>
      </div>
    </div>
  );
}
