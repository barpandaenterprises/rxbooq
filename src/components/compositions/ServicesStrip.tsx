import Link from "next/link";

type Service = { id: string; icon: string; name: string; desc: string };

// `id` matches the booking catalog so Read More deep-links straight into /book.
const SERVICES: Service[] = [
  { id: "rct", icon: "fa-tooth", name: "Root Canal", desc: "Single-sitting RCT with rotary endodontics, no pain." },
  { id: "imp", icon: "fa-teeth", name: "Dental Implants", desc: "Titanium implants from globally certified brands." },
  { id: "brc", icon: "fa-grip-lines", name: "Braces & Aligners", desc: "Metal, ceramic and clear aligners for every age." },
  { id: "wht", icon: "fa-magic", name: "Teeth Whitening", desc: "In-clinic and take-home whitening, visible results." },
  { id: "kid", icon: "fa-baby", name: "Kids Dentistry", desc: "Gentle pediatric care in a fear-free environment." },
  { id: "gen", icon: "fa-stethoscope", name: "General Checkup", desc: "Full oral exam, cleaning and personalised plan." },
];

export function ServicesStrip() {
  return (
    <section id="services" className="scroll-mt-20 py-14 md:py-24">
      <div className="mx-auto max-w-[1200px] px-5 md:px-8">
        <header className="mx-auto mb-8 max-w-[640px] text-center md:mb-12">
          <span className="mb-3 inline-flex items-center rounded-pill bg-[#E6F1FA] px-3 py-1 text-[12px] font-medium text-link-hover md:mb-5 md:px-3.5 md:py-1.5 md:text-[13px]">
            Our Services
          </span>
          <h2 className="mb-2.5 text-[26px] font-semibold leading-8 tracking-[-0.01em] text-heading md:mb-3 md:text-h2">
            Complete dental care under one roof
          </h2>
          <p className="text-[14px] leading-[22px] text-muted md:text-paragraph">
            From routine cleaning to complex surgery — all delivered with modern
            equipment and warm bedside manner.
          </p>
        </header>

        {/* Mobile: horizontal scroll-snap with -20px page bleed (per design spec). */}
        <div className="-mx-5 flex snap-x snap-mandatory gap-3.5 overflow-x-auto px-5 pb-3 md:hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {SERVICES.map((s) => (
            <article
              key={s.name}
              className="flex w-[240px] flex-none snap-start flex-col rounded-md border border-border bg-white p-5 shadow-sm"
            >
              <div className="mb-3.5 grid h-12 w-12 place-items-center rounded-[12px] bg-[#E6F1FA] text-[20px] text-brand">
                <i className={`fas ${s.icon}`} />
              </div>
              <h3 className="mb-1.5 text-[17px] font-semibold text-heading">{s.name}</h3>
              <p className="mb-3 text-[13px] leading-[20px] text-muted">{s.desc}</p>
              <Link
                href={`/book?service=${s.id}`}
                className="mt-auto inline-flex items-center gap-1.5 text-[13px] font-medium text-cta no-underline"
              >
                Read More <i className="fas fa-arrow-right text-[11px]" />
              </Link>
            </article>
          ))}
        </div>

        {/* Tablet+ desktop: grid */}
        <div className="hidden grid-cols-2 gap-6 md:grid lg:grid-cols-3">
          {SERVICES.map((s) => (
            <article
              key={s.name}
              className="rounded-md border border-border bg-white px-7 py-8 shadow-sm transition-[transform,box-shadow,border-color] duration-150 hover:-translate-y-0.5 hover:border-[#d6e6f3] hover:shadow-md"
            >
              <div className="mb-5 grid h-14 w-14 place-items-center rounded-[12px] bg-[#E6F1FA] text-[22px] text-brand">
                <i className={`fas ${s.icon}`} />
              </div>
              <h3 className="mb-2 text-h3">{s.name}</h3>
              <p className="mb-4 min-h-[52px] text-body text-muted">{s.desc}</p>
              <Link
                href={`/book?service=${s.id}`}
                className="inline-flex items-center gap-1.5 text-[14px] font-medium text-cta no-underline hover:text-[#d92843]"
              >
                Read More <i className="fas fa-arrow-right text-[11px]" />
              </Link>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
