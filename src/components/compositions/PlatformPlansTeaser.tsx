import Link from "next/link";
import { serviceClient } from "@/lib/supabase/server";
import { formatInr } from "@/lib/billing/pricing";

type Plan = {
  id:                    string;
  code:                  string;
  display_name:          string;
  tagline:               string | null;
  monthly_price_inr:     number;
  included_doctor_seats: number;
  is_popular:            boolean;
  sort_order:            number;
};

export async function PlatformPlansTeaser() {
  const supabase = serviceClient();
  const { data } = await supabase
    .from("subscription_plans")
    .select("id, code, display_name, tagline, monthly_price_inr, included_doctor_seats, is_popular, sort_order")
    .eq("is_active", true)
    .order("sort_order");
  const plans = (data ?? []) as Plan[];

  return (
    <section id="pricing-teaser" className="bg-white py-14 md:py-24">
      <div className="mx-auto max-w-[1200px] px-5 md:px-8">
        <header className="mx-auto mb-10 max-w-[640px] text-center md:mb-12">
          <span className="mb-3 inline-flex items-center rounded-pill bg-[#E6F1FA] px-3 py-1 text-[12px] font-medium text-link-hover md:text-[13px]">
            Pricing
          </span>
          <h2 className="mb-2.5 text-[28px] font-semibold leading-[1.15] tracking-[-0.01em] text-heading md:text-[36px]">
            Start free. Grow when you&apos;re ready.
          </h2>
          <p className="text-[14px] leading-[22px] text-muted md:text-[16px]">
            Every clinic gets a free public profile. Upgrade for online scheduling, EMR, and WhatsApp.
          </p>
        </header>

        {plans.length === 0 ? (
          <div className="mx-auto max-w-md rounded-lg border border-dashed border-border bg-white p-8 text-center text-[13px] text-muted">
            Plans haven&apos;t been seeded yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            {plans.map((p) => (
              <article
                key={p.id}
                className={
                  "relative flex flex-col rounded-lg border-[1.5px] bg-white p-6 " +
                  (p.is_popular ? "border-cta shadow-[0_8px_24px_-12px_rgba(238,52,78,0.30)]" : "border-border")
                }
              >
                {p.is_popular && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-pill bg-cta px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-cta-fg">
                    Most popular
                  </span>
                )}
                <div className="text-[15px] font-semibold text-heading">{p.display_name}</div>
                <p className="mt-1 min-h-[36px] text-[12px] text-muted">{p.tagline}</p>
                <div className="mt-3 text-[28px] font-semibold text-heading">
                  {p.monthly_price_inr === 0 ? "Free" : formatInr(p.monthly_price_inr)}
                  {p.monthly_price_inr > 0 && <span className="ml-1 text-[12px] font-normal text-muted">/mo</span>}
                </div>
                <p className="mt-1 text-[11px] text-muted">
                  {p.included_doctor_seats} seat{p.included_doctor_seats === 1 ? "" : "s"} included
                </p>
                <Link
                  href={`/get-started?plan=${p.code}`}
                  className={
                    "mt-4 inline-flex w-full items-center justify-center rounded-md px-4 py-2 text-[13px] font-medium no-underline " +
                    (p.is_popular
                      ? "bg-cta text-cta-fg hover:bg-[#d92843]"
                      : "border border-border bg-white text-heading hover:bg-[#fafbfc]")
                  }
                >
                  {p.monthly_price_inr === 0 ? "Start free" : "Start trial"}
                </Link>
              </article>
            ))}
          </div>
        )}

        <div className="mt-8 text-center">
          <Link href="/pricing" className="inline-flex items-center gap-1.5 text-[14px] font-medium text-link-hover no-underline">
            See full comparison
            <i className="fas fa-arrow-right text-[11px]" />
          </Link>
        </div>
      </div>
    </section>
  );
}
