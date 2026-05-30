import Link from "next/link";
import type { PublicService } from "@/lib/data/public-clinic-page";
import { formatInr } from "@/lib/billing/pricing";

type Props = {
  services: PublicService[];
  bookHref: string;
};

export function ClinicServicesStrip({ services, bookHref }: Props) {
  if (services.length === 0) return null;

  return (
    <section id="services" className="scroll-mt-20 bg-[#fafbfc] py-14 md:py-24">
      <div className="mx-auto max-w-[1200px] px-5 md:px-8">
        <header className="mx-auto mb-8 max-w-[640px] text-center md:mb-12">
          <span className="mb-3 inline-flex items-center rounded-pill bg-[#E6F1FA] px-3 py-1 text-[12px] font-medium text-link-hover md:mb-5 md:px-3.5 md:py-1.5 md:text-[13px]">
            Services
          </span>
          <h2 className="mb-2.5 text-[26px] font-semibold leading-8 tracking-[-0.01em] text-heading md:mb-3 md:text-[36px]">
            What we offer
          </h2>
          <p className="text-[14px] leading-[22px] text-muted md:text-[16px]">
            Book any of these online, on WhatsApp, or call us.
          </p>
        </header>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {services.map((s) => (
            <article
              key={s.id}
              className="flex flex-col rounded-md border border-border bg-white p-5 transition-shadow hover:shadow-md"
            >
              <div className="mb-3 grid h-12 w-12 place-items-center rounded-[12px] bg-[#E6F1FA] text-[20px] text-brand">
                <i className="fas fa-stethoscope" />
              </div>
              <h3 className="text-[16px] font-semibold text-heading">{s.name}</h3>
              {s.description && (
                <p className="mt-1.5 text-[13px] leading-[20px] text-muted">{s.description}</p>
              )}
              <div className="mt-3 flex items-center justify-between text-[12px] text-muted">
                <span><i className="fas fa-clock mr-1.5 text-[10px]" />{s.duration_minutes} min</span>
                {typeof s.price_inr === "number" && s.price_inr > 0 && (
                  <span className="font-semibold text-heading">{formatInr(s.price_inr)}</span>
                )}
              </div>
              <Link
                href={`${bookHref}${bookHref.includes("?") ? "&" : "?"}service=${s.id}`}
                className="mt-4 inline-flex items-center gap-1.5 text-[13px] font-medium text-cta no-underline"
              >
                Book this <i className="fas fa-arrow-right text-[11px]" />
              </Link>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
