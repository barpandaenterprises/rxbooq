import Link from "next/link";

const STEPS: { ic: string; title: string; desc: string }[] = [
  {
    ic:    "fa-mobile-alt",
    title: "Verify your phone",
    desc:  "Enter your mobile number, confirm with a one-time code. No password yet — we save your progress as you go.",
  },
  {
    ic:    "fa-user-md",
    title: "Add your profile",
    desc:  "Doctor details, clinic address, services, photos, and (optional) verification documents.",
  },
  {
    ic:    "fa-globe",
    title: "Go live",
    desc:  "Pick a plan (Free is fine to start), launch your public profile, and start taking bookings the same day.",
  },
];

export function PlatformHowItWorks() {
  return (
    <section className="bg-[#fafbfc] py-14 md:py-24">
      <div className="mx-auto max-w-[1200px] px-5 md:px-8">
        <header className="mx-auto mb-10 max-w-[640px] text-center md:mb-14">
          <span className="mb-3 inline-flex items-center rounded-pill bg-[#FFE7EC] px-3 py-1 text-[12px] font-medium text-cta md:text-[13px]">
            How it works
          </span>
          <h2 className="mb-2.5 text-[28px] font-semibold leading-[1.15] tracking-[-0.01em] text-heading md:text-[36px]">
            From zero to live in under 5 minutes.
          </h2>
          <p className="text-[14px] leading-[22px] text-muted md:text-[16px]">
            No demos to sit through. No setup fee. No credit card to start.
          </p>
        </header>

        <ol className="relative grid gap-6 md:grid-cols-3 md:gap-8">
          {STEPS.map((s, i) => (
            <li key={s.title} className="relative rounded-lg border border-border bg-white p-6">
              <div className="mb-4 flex items-center justify-between">
                <span className="grid h-11 w-11 place-items-center rounded-[12px] bg-cta text-[18px] text-cta-fg">
                  <i className={`fas ${s.ic}`} />
                </span>
                <span className="text-[42px] font-bold leading-none text-[#eef3fb]">
                  0{i + 1}
                </span>
              </div>
              <h3 className="mb-1.5 text-[17px] font-semibold text-heading">{s.title}</h3>
              <p className="text-[13px] leading-[20px] text-muted">{s.desc}</p>
            </li>
          ))}
        </ol>

        <div className="mt-10 text-center md:mt-12">
          <Link
            href="/get-started"
            className="inline-flex items-center gap-2 rounded-md bg-cta px-6 py-3 text-[15px] font-medium text-cta-fg no-underline transition-colors hover:bg-[#d92843]"
          >
            <i className="fas fa-rocket text-[12px]" />
            Start your clinic profile
          </Link>
        </div>
      </div>
    </section>
  );
}
