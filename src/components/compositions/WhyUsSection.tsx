type Why = { icon: string; name: string; desc: string };

const WHYS: Why[] = [
  {
    icon: "fa-microscope",
    name: "Modern equipment",
    desc: "Digital X-rays, intra-oral cameras and sterilised single-use kits on every visit.",
  },
  {
    icon: "fa-hand-holding-heart",
    name: "Painless treatment",
    desc: "Calibrated anaesthesia and gentle techniques designed around anxious patients.",
  },
  {
    icon: "fa-mobile-alt",
    name: "Book on WhatsApp",
    desc: "Skip the phone queue. Confirm slots, get reminders and reschedule in chat.",
  },
];

export function WhyUsSection() {
  return (
    <section id="about" className="scroll-mt-20 pb-14 md:pb-24">
      <div className="mx-auto max-w-[1200px] px-5 md:px-8">
        <header className="mx-auto mb-8 max-w-[640px] text-center md:mb-12">
          <span className="mb-3 inline-flex items-center rounded-pill bg-surface-warm px-3 py-1 text-[12px] font-medium text-[#b8253a] md:mb-5 md:px-3.5 md:py-1.5 md:text-[13px]">
            Why patients choose us
          </span>
          <h2 className="text-[26px] font-semibold leading-8 tracking-[-0.01em] text-heading md:text-h2">
            Care that feels modern and personal
          </h2>
        </header>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3 md:gap-8">
          {WHYS.map((w) => (
            <div key={w.name} className="flex items-start gap-4 md:gap-5">
              <div className="grid h-12 w-12 flex-none place-items-center rounded-pill bg-brand text-[18px] text-white md:h-14 md:w-14 md:text-[20px]">
                <i className={`fas ${w.icon}`} />
              </div>
              <div>
                <h3 className="mb-1 text-[17px] font-semibold text-heading md:mb-1.5 md:text-h3">
                  {w.name}
                </h3>
                <p className="text-[14px] leading-[22px] text-muted md:text-body">{w.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
