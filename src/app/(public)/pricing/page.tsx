import Link from "next/link";
import { serviceClient } from "@/lib/supabase/server";
import { formatInr } from "@/lib/billing/pricing";
import { PlatformSiteLayout } from "@/components/layouts/PlatformSiteLayout";

export const metadata = {
  title:       "Pricing — Rxbooq",
  description: "Three plans that grow with your practice — Essential, Advanced, and Complete Care. 14-day free trial on every plan.",
};

type Plan = {
  id:                    string;
  code:                  string;
  display_name:          string;
  tagline:               string | null;
  monthly_price_inr:     number;
  included_doctor_seats: number;
  extra_seat_price_inr:  number;
  features:              Record<string, boolean | string | number>;
  is_popular:            boolean;
  sort_order:            number;
};

// Full marketing comparison matrix. Order matches the active plans by
// sort_order: [Essential, Advanced, Complete]. `true` = included, `false` = not
// included, string = qualified value.
const COMPARE_ROWS: { label: string; values: (boolean | string)[] }[] = [
  { label: "Rxbooq Public Profile",       values: [true, true, true] },
  { label: "Verified Doctor/Clinic Badge", values: [true, true, true] },
  { label: "Online Appointment Booking",  values: [true, true, true] },
  { label: "Branded Appointment Link",    values: [true, true, true] },
  { label: "Patient Records (EMR)",       values: [true, true, true] },
  { label: "Personalized Website",        values: [false, true, true] },
  { label: "Custom Domain",               values: [false, true, true] },
  { label: "Hosting Included",            values: [false, true, true] },
  { label: "SSL Certificate",             values: [false, true, true] },
  { label: "Google Business Profile",     values: [false, true, true] },
  { label: "SEO Optimization",            values: [false, "Basic", "Advanced"] },
  { label: "Digital Marketing",           values: [false, "Basic", "Advanced"] },
  { label: "Reputation Management",       values: [false, false, true] },
  { label: "Dedicated Success Manager",   values: [false, false, true] },
  { label: "Support",                     values: ["Email", "Priority", "Dedicated"] },
];

// Annual pricing is billed at 40% off the monthly rate (₹599 / ₹2,999 / ₹5,999
// per month × 12).
const annualPriceInr = (monthly: number) => Math.round(monthly * 0.6) * 12;

export default async function PricingPage() {
  const supabase = serviceClient();
  const { data } = await supabase
    .from("subscription_plans")
    .select("id, code, display_name, tagline, monthly_price_inr, included_doctor_seats, extra_seat_price_inr, features, is_popular, sort_order")
    .eq("is_active", true)
    .order("sort_order");
  const plans = (data ?? []) as Plan[];

  return (
    <PlatformSiteLayout>
      <div className="bg-[#fafbfc] pb-16 text-body">
      <section className="mx-auto max-w-6xl px-4 pt-12 text-center">
        <p className="text-[12px] font-semibold uppercase tracking-wide text-cta">Pricing</p>
        <h1 className="mt-1 text-[32px] font-semibold leading-tight text-heading md:text-[40px]">
          Plans that grow with your practice.
        </h1>
        <p className="mx-auto mt-3 max-w-2xl text-[15px] text-muted">
          From getting discovered online to a complete digital clinic with marketing and reputation management — pick the tier that fits, with a 14-day free trial on every plan.
        </p>
      </section>

      <section className="mx-auto mt-10 grid max-w-5xl grid-cols-1 items-stretch gap-5 px-4 sm:grid-cols-3">
        {plans.map((p) => (
          <PlanCard key={p.id} plan={p} />
        ))}
      </section>

      <section className="mx-auto mt-16 max-w-5xl px-4">
        <h2 className="mb-6 text-center text-[22px] font-semibold text-heading">Compare plans</h2>
        <div className="overflow-x-auto rounded-lg border border-border bg-white">
          <table className="w-full min-w-[640px] text-[13px]">
            <thead>
              <tr className="border-b border-border bg-[#fafbfc]">
                <th className="px-4 py-4 text-left text-[12px] font-medium uppercase tracking-wide text-muted">
                  Features
                </th>
                {plans.map((p) => (
                  <th key={p.id} className="px-4 py-4 text-center align-bottom">
                    <div className="flex items-center justify-center gap-1.5 text-[14px] font-semibold text-heading">
                      {p.display_name}
                      {p.is_popular && <i className="fas fa-star text-[11px] text-[#f5a623]" />}
                    </div>
                    {p.is_popular && (
                      <div className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide text-cta">
                        Most Popular
                      </div>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr className="border-t border-border">
                <td className="px-4 py-3 font-medium text-body">Monthly Price</td>
                {plans.map((p) => (
                  <td key={p.id} className="px-4 py-3 text-center font-semibold text-heading">
                    {formatInr(p.monthly_price_inr)}
                  </td>
                ))}
              </tr>
              <tr className="border-t border-border">
                <td className="px-4 py-3 font-medium text-body">
                  Annual Price{" "}
                  <span className="text-[11px] font-semibold text-[#1f7a3a]">(40% OFF)</span>
                </td>
                {plans.map((p) => (
                  <td key={p.id} className="px-4 py-3 text-center text-body">
                    {formatInr(annualPriceInr(p.monthly_price_inr))}
                  </td>
                ))}
              </tr>
              {COMPARE_ROWS.map((row) => (
                <tr key={row.label} className="border-t border-border">
                  <td className="px-4 py-3 text-body">{row.label}</td>
                  {row.values.map((v, i) => (
                    <td key={i} className="px-4 py-3 text-center">
                      <CompareCell value={v} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mx-auto mt-16 max-w-3xl px-4">
        <h2 className="mb-6 text-center text-[22px] font-semibold text-heading">Common questions</h2>
        <div className="space-y-3">
          <Faq q="Do I need a credit card to start?">
            No. Sign up with your phone, set up your clinic, and your public profile goes live immediately. Paid plans start with a 14-day free trial — we only ask for payment when you explicitly upgrade.
          </Faq>
          <Faq q="What happens after the trial?">
            Your card is charged for the plan you picked and your practice keeps running without interruption. You can change or cancel your plan anytime from your admin.
          </Faq>
          <Faq q="Can I cancel anytime?">
            Yes. Cancellation takes effect at the end of your current billing cycle, and you keep access until then.
          </Faq>
          <Faq q="Is my data secure?">
            Your clinical records are stored in encrypted Supabase Postgres with row-level security; verification documents are private and only visible to you and Rxbooq&apos;s review team.
          </Faq>
        </div>
      </section>
      </div>
    </PlatformSiteLayout>
  );
}

function PlanCard({ plan }: { plan: Plan }) {
  return (
    <div className={
      "relative flex h-full flex-col rounded-lg border-[1.5px] bg-white p-6 " +
      (plan.is_popular ? "border-cta shadow-[0_8px_24px_-12px_rgba(238,52,78,0.30)]" : "border-border")
    }>
      {plan.is_popular && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-pill bg-cta px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-cta-fg">
          Most popular
        </span>
      )}
      <div className="text-[16px] font-semibold text-heading">{plan.display_name}</div>
      <p className="mt-1 min-h-[36px] text-[12px] text-muted">{plan.tagline}</p>
      <div className="mt-3 text-[32px] font-semibold text-heading">
        {plan.monthly_price_inr === 0 ? "Free" : formatInr(plan.monthly_price_inr)}
        {plan.monthly_price_inr > 0 && <span className="ml-1 text-[12px] font-normal text-muted">/month</span>}
      </div>
      <p className="mt-1 min-h-[32px] text-[11px] text-muted">
        {plan.included_doctor_seats} seat{plan.included_doctor_seats === 1 ? "" : "s"} included
        {plan.extra_seat_price_inr > 0 && ` · ${formatInr(plan.extra_seat_price_inr)}/mo per extra seat`}
      </p>
      <Link
        href={`/get-started?plan=${plan.code}`}
        className={
          "mt-auto inline-flex w-full items-center justify-center rounded-md px-4 py-2.5 text-[13px] font-medium no-underline " +
          (plan.is_popular
            ? "bg-cta text-cta-fg hover:bg-[#d92843]"
            : "border border-border bg-white text-heading hover:bg-[#fafbfc]")
        }
      >
        {plan.monthly_price_inr === 0 ? "Start free" : "Start 14-day trial"}
      </Link>
    </div>
  );
}

function CompareCell({ value }: { value: boolean | string }) {
  if (value === true) {
    return (
      <span className="grid h-5 w-5 mx-auto place-items-center rounded-pill bg-[#1f7a3a]/10 text-[10px] text-[#1f7a3a]">
        <i className="fas fa-check" />
      </span>
    );
  }
  if (value === false) return <span className="text-[#cbd5e1]">—</span>;
  return <span className="font-medium text-body">{value}</span>;
}

function Faq({ q, children }: { q: string; children: React.ReactNode }) {
  return (
    <details className="rounded-md border border-border bg-white p-4">
      <summary className="cursor-pointer list-none text-[14px] font-medium text-heading">
        {q}
        <i className="fas fa-chevron-down float-right text-[11px] text-muted" />
      </summary>
      <p className="mt-2 text-[13px] text-muted">{children}</p>
    </details>
  );
}
