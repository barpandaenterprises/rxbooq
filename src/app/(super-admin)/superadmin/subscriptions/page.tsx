import { SuperAdminLayout } from "@/components/layouts/SuperAdminLayout";
import { serviceClient } from "@/lib/supabase/server";
import { formatInr } from "@/lib/billing/pricing";

export const metadata = { title: "Subscriptions" };

type SubRow = {
  id:                       string;
  status:                   string;
  trial_ends_at:            string | null;
  current_period_end:       string | null;
  extra_seats:              number;
  razorpay_subscription_id: string | null;
  clinic: { id: string; name: string; slug: string; verification_status: string } | null;
  plan:   { display_name: string; monthly_price_inr: number } | null;
};

export default async function SuperAdminSubscriptionsPage() {
  const supabase = serviceClient();
  const { data } = await supabase
    .from("subscriptions")
    .select(`
      id, status, trial_ends_at, current_period_end, extra_seats, razorpay_subscription_id,
      clinic:clinics!inner ( id, name, slug, verification_status ),
      plan:subscription_plans!inner ( display_name, monthly_price_inr )
    `)
    .order("created_at", { ascending: false });

  const rows = (data ?? []) as unknown as SubRow[];

  return (
    <SuperAdminLayout active="Subscriptions">
      <div className="mx-auto max-w-6xl space-y-5 p-6">
        <div>
          <h1 className="text-[22px] font-semibold text-heading">Subscriptions</h1>
          <p className="mt-1 text-[13px] text-muted">All clinic subscriptions across tiers and lifecycle states.</p>
        </div>

        <div className="overflow-hidden rounded-lg border border-border bg-white">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="bg-[#fafbfc] text-left text-[12px] uppercase tracking-wide text-muted">
                <th className="px-4 py-2 font-medium">Clinic</th>
                <th className="px-4 py-2 font-medium">Plan</th>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2 font-medium">Seats</th>
                <th className="px-4 py-2 font-medium">Trial ends</th>
                <th className="px-4 py-2 font-medium">Razorpay</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-10 text-center text-muted">No subscriptions yet.</td></tr>
              ) : rows.map((r) => (
                <tr key={r.id} className="border-t border-border">
                  <td className="px-4 py-2">
                    <div className="font-medium text-heading">{r.clinic?.name}</div>
                    <div className="text-[11px] text-muted">/{r.clinic?.slug}</div>
                  </td>
                  <td className="px-4 py-2">
                    {r.plan?.display_name}
                    {r.plan && <div className="text-[11px] text-muted">{formatInr(r.plan.monthly_price_inr)}/mo</div>}
                  </td>
                  <td className="px-4 py-2">
                    <span className={
                      "rounded-pill px-2 py-0.5 text-[11px] font-semibold capitalize " +
                      (r.status === "active"   ? "bg-[#e6f3ec] text-[#1f7a3a]"
                       : r.status === "trialing" ? "bg-[#fff5e6] text-[#a86a00]"
                       : r.status === "past_due" ? "bg-[#fde9eb] text-cta"
                       : "bg-[#f4f5f7] text-muted")
                    }>
                      {r.status}
                    </span>
                  </td>
                  <td className="px-4 py-2">+ {r.extra_seats}</td>
                  <td className="px-4 py-2">{r.trial_ends_at ? new Date(r.trial_ends_at).toLocaleDateString("en-IN") : "—"}</td>
                  <td className="px-4 py-2 font-mono text-[11px] text-muted">{r.razorpay_subscription_id ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </SuperAdminLayout>
  );
}
