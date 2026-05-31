import Link from "next/link";
import { serviceClient } from "@/lib/supabase/server";
import { formatInr } from "@/lib/billing/pricing";

export const metadata = {
  title:       "Pricing — Rxbooq",
  description: "Plans for every clinic — from a free public listing to full practice management. Pay only when you're ready.",
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

const FEATURE_ROWS: { key: string; label: string; kind: "bool" | "number" | "tier" }[] = [
  { key: "public_listing",      label: "Public clinic profile",       kind: "bool" },
  { key: "patient_enquiries",   label: "Patient enquiry form",        kind: "bool" },
  { key: "calendar",            label: "Online appointment scheduling", kind: "bool" },
  { key: "emr",                 label: "Digital prescriptions / EMR", kind: "bool" },
  { key: "whatsapp_templates",  label: "WhatsApp reminders + broadcasts", kind: "bool" },
  { key: "sponsored_placement", label: "Boosted listings",            kind: "bool" },
  { key: "online_consult",      label: "Online consult",              kind: "bool" },
  { key: "custom_domain",       label: "Custom domain",               kind: "bool" },
  { key: "departments_max",     label: "Departments",                 kind: "number" },
  { key: "analytics",           label: "Analytics",                   kind: "tier" },
];

export default async function PricingPage() {
  const supabase = serviceClient();
  const { data } = await supabase
    .from("subscription_plans")
    .select("id, code, display_name, tagline, monthly_price_inr, included_doctor_seats, extra_seat_price_inr, features, is_popular, sort_order")
    .eq("is_active", true)
    .order("sort_order");
  const plans = (data ?? []) as Plan[];

  return (
    <div className="min-h-screen bg-[#fafbfc] pb-16 text-body">
      <header className="border-b border-border bg-white">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <Link href="/" className="text-[17px] font-semibold text-heading no-underline">Rxbooq</Link>
          <div className="flex items-center gap-4 text-[13px]">
            <Link href="/login" className="text-muted no-underline hover:text-heading">Sign in</Link>
            <Link href="/get-started" className="rounded-md bg-cta px-4 py-2 font-medium text-cta-fg no-underline">Get started</Link>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-4 pt-12 text-center">
        <p className="text-[12px] font-semibold uppercase tracking-wide text-cta">Pricing</p>
        <h1 className="mt-1 text-[32px] font-semibold leading-tight text-heading md:text-[40px]">
          Start free. Grow when you&apos;re ready.
        </h1>
        <p className="mx-auto mt-3 max-w-2xl text-[15px] text-muted">
          Every clinic gets a free public profile. Upgrade for online scheduling, EMR, and WhatsApp engagement — with a 14-day free trial on every paid plan.
        </p>
      </section>

      <section className="mx-auto mt-10 grid max-w-6xl grid-cols-1 gap-4 px-4 md:grid-cols-4">
        {plans.map((p) => (
          <PlanCard key={p.id} plan={p} />
        ))}
      </section>

      <section className="mx-auto mt-16 max-w-6xl px-4">
        <h2 className="mb-6 text-center text-[22px] font-semibold text-heading">Compare plans</h2>
        <div className="overflow-hidden rounded-lg border border-border bg-white">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="bg-[#fafbfc] text-left text-[12px] uppercase tracking-wide text-muted">
                <th className="px-4 py-3 font-medium">Feature</th>
                {plans.map((p) => (
                  <th key={p.id} className="px-4 py-3 font-medium text-heading">{p.display_name}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {FEATURE_ROWS.map((row) => (
                <tr key={row.key} className="border-t border-border">
                  <td className="px-4 py-3 text-body">{row.label}</td>
                  {plans.map((p) => (
                    <td key={p.id} className="px-4 py-3">
                      <FeatureCell row={row} value={p.features[row.key]} />
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
            You stay on Free indefinitely — your public profile keeps working. Upgrade anytime from your admin to unlock scheduling, EMR, and WhatsApp.
          </Faq>
          <Faq q="Can I cancel anytime?">
            Yes. Cancellation takes effect at the end of your current billing cycle. Your profile stays live on the Free tier.
          </Faq>
          <Faq q="Is my data secure?">
            Your clinical records are stored in encrypted Supabase Postgres with row-level security; verification documents are private and only visible to you and Rxbooq&apos;s review team.
          </Faq>
        </div>
      </section>
    </div>
  );
}

function PlanCard({ plan }: { plan: Plan }) {
  return (
    <div className={
      "relative flex flex-col rounded-lg border-[1.5px] bg-white p-6 " +
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
      <p className="mt-1 text-[11px] text-muted">
        {plan.included_doctor_seats} seat{plan.included_doctor_seats === 1 ? "" : "s"} included
        {plan.extra_seat_price_inr > 0 && ` · ${formatInr(plan.extra_seat_price_inr)}/mo per extra seat`}
      </p>
      <Link
        href={`/get-started?plan=${plan.code}`}
        className={
          "mt-5 inline-flex w-full items-center justify-center rounded-md px-4 py-2.5 text-[13px] font-medium no-underline " +
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

function FeatureCell({ row, value }: { row: typeof FEATURE_ROWS[number]; value: unknown }) {
  if (row.kind === "bool") {
    return value === true
      ? <i className="fas fa-check text-[#1f7a3a]" />
      : <span className="text-[#9aa9b8]">—</span>;
  }
  if (row.kind === "number") {
    const n = Number(value ?? 0);
    return <span className="text-body">{n === 0 ? "Unlimited" : n}</span>;
  }
  // tier
  const v = String(value ?? "none");
  return <span className="capitalize text-body">{v === "none" ? "—" : v}</span>;
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
