import Link from "next/link";
import { SuperAdminLayout } from "@/components/layouts/SuperAdminLayout";
import { serviceClient } from "@/lib/supabase/server";
import { PlansTable, type PlanRow } from "@/components/compositions/PlansTable";
import { SyncPlansButton } from "@/components/compositions/SyncPlansButton";

export const metadata = { title: "Subscription plans" };

export default async function PlansPage() {
  const supabase = serviceClient();
  const { data: plans } = await supabase
    .from("subscription_plans")
    .select("id, code, display_name, tagline, monthly_price_inr, included_doctor_seats, extra_seat_price_inr, features, razorpay_plan_id, is_active, is_popular, sort_order")
    .order("sort_order");

  return (
    <SuperAdminLayout active="Plans">
      <div className="mx-auto max-w-6xl space-y-5 p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-[22px] font-semibold text-heading">Subscription plans</h1>
            <p className="mt-1 text-[13px] text-muted">
              Tiers shown on <Link href="/pricing" className="text-link-hover no-underline">/pricing</Link> and the onboarding plan picker. Free is the auto-downgrade target when a trial expires.
            </p>
          </div>
          <Link href="/superadmin/plans/new" className="rounded-md bg-cta px-4 py-2 text-[13px] font-medium text-cta-fg no-underline">
            <i className="fas fa-plus mr-2 text-[11px]" /> New plan
          </Link>
        </div>

        <PlansTable plans={(plans ?? []) as PlanRow[]} />

        <div className="rounded-lg border border-border bg-white p-5">
          <h2 className="text-[15px] font-semibold text-heading">Sync to Razorpay</h2>
          <p className="mt-1 mb-3 text-[12px] text-muted">
            Mirror paid tiers into Razorpay Plans (idempotent). Run once per environment, and again whenever you create a plan or change a paid tier&apos;s price/seat count.
          </p>
          <SyncPlansButton />
        </div>
      </div>
    </SuperAdminLayout>
  );
}
