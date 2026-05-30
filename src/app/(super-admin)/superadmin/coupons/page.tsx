import Link from "next/link";
import { SuperAdminLayout } from "@/components/layouts/SuperAdminLayout";
import { serviceClient } from "@/lib/supabase/server";
import { formatInr } from "@/lib/billing/pricing";

export const metadata = { title: "Coupons" };

export default async function SuperAdminCouponsPage() {
  const supabase = serviceClient();
  const { data: coupons } = await supabase
    .from("coupons")
    .select("id, code, kind, value, scope, partner_user_id, is_active, notes, created_at")
    .order("created_at", { ascending: false });

  // Redemption counts per coupon.
  const ids = (coupons ?? []).map((c) => c.id);
  let counts: Record<string, { redemptions: number; off_total: number }> = {};
  if (ids.length > 0) {
    const { data: rows } = await supabase
      .from("coupon_redemptions")
      .select("coupon_id, amount_inr_off")
      .in("coupon_id", ids);
    counts = (rows ?? []).reduce((acc, r) => {
      const slot = acc[r.coupon_id] ?? { redemptions: 0, off_total: 0 };
      slot.redemptions += 1;
      slot.off_total   += r.amount_inr_off;
      acc[r.coupon_id]  = slot;
      return acc;
    }, {} as Record<string, { redemptions: number; off_total: number }>);
  }

  return (
    <SuperAdminLayout active="Coupons">
      <div className="mx-auto max-w-6xl space-y-5 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[22px] font-semibold text-heading">Coupons</h1>
            <p className="mt-1 text-[13px] text-muted">Promo + partner referral codes. Drives onboarding-funnel discounts and admin upgrade discounts.</p>
          </div>
          <Link href="/superadmin/coupons/new" className="rounded-md bg-cta px-4 py-2 text-[13px] font-medium text-cta-fg no-underline">
            <i className="fas fa-plus mr-2 text-[11px]" /> New coupon
          </Link>
        </div>

        <div className="overflow-hidden rounded-lg border border-border bg-white">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="bg-[#fafbfc] text-left text-[12px] uppercase tracking-wide text-muted">
                <th className="px-4 py-2 font-medium">Code</th>
                <th className="px-4 py-2 font-medium">Discount</th>
                <th className="px-4 py-2 font-medium">Scope</th>
                <th className="px-4 py-2 font-medium">Partner</th>
                <th className="px-4 py-2 font-medium">Redemptions</th>
                <th className="px-4 py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {(coupons ?? []).length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-10 text-center text-muted">No coupons yet. Create one to get started.</td></tr>
              ) : (coupons ?? []).map((c) => {
                const stats = counts[c.id] ?? { redemptions: 0, off_total: 0 };
                return (
                  <tr key={c.id} className="border-t border-border">
                    <td className="px-4 py-2 font-mono font-medium text-heading">{c.code.toUpperCase()}</td>
                    <td className="px-4 py-2">{c.kind === "percent" ? `${c.value}%` : formatInr(c.value)}</td>
                    <td className="px-4 py-2 capitalize">{c.scope.replace("_", " ")}</td>
                    <td className="px-4 py-2 text-muted">{c.partner_user_id ? <span className="text-heading">Referral</span> : "—"}</td>
                    <td className="px-4 py-2">{stats.redemptions} {stats.off_total > 0 && <span className="text-muted">· {formatInr(stats.off_total)} off</span>}</td>
                    <td className="px-4 py-2">
                      {c.is_active
                        ? <span className="rounded-pill bg-[#e6f3ec] px-2 py-0.5 text-[11px] font-semibold text-[#1f7a3a]">Active</span>
                        : <span className="rounded-pill bg-[#f4f5f7] px-2 py-0.5 text-[11px] font-semibold text-muted">Disabled</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </SuperAdminLayout>
  );
}
