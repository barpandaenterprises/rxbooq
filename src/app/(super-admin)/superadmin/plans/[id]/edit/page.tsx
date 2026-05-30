import { notFound } from "next/navigation";
import { SuperAdminLayout } from "@/components/layouts/SuperAdminLayout";
import { serviceClient } from "@/lib/supabase/server";
import { PlanForm } from "@/components/compositions/PlanForm";
import type { PlanFeaturesInput, PlanInput } from "@/app/(super-admin)/superadmin/plans/actions";

export const metadata = { title: "Edit plan" };

export default async function EditPlanPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = serviceClient();
  const { data: plan } = await supabase
    .from("subscription_plans")
    .select("id, code, display_name, tagline, monthly_price_inr, annual_price_inr, included_doctor_seats, extra_seat_price_inr, features, is_active, is_popular, sort_order, razorpay_plan_id")
    .eq("id", id)
    .maybeSingle();

  if (!plan) notFound();

  const initial: PlanInput = {
    code:                  plan.code,
    display_name:          plan.display_name,
    tagline:               plan.tagline,
    monthly_price_inr:     plan.monthly_price_inr,
    annual_price_inr:      plan.annual_price_inr,
    included_doctor_seats: plan.included_doctor_seats,
    extra_seat_price_inr:  plan.extra_seat_price_inr,
    features:              plan.features as unknown as PlanFeaturesInput,
    is_active:             plan.is_active,
    is_popular:            plan.is_popular,
    sort_order:            plan.sort_order,
  };

  return (
    <SuperAdminLayout active="Plans">
      <div className="mx-auto max-w-3xl space-y-5 p-6">
        <div>
          <h1 className="text-[22px] font-semibold text-heading">Edit plan — {plan.display_name}</h1>
          <p className="mt-1 text-[13px] text-muted">
            Changes appear on /pricing immediately.
            {plan.razorpay_plan_id && (
              <> Razorpay plan id is currently <code className="rounded bg-[#fafbfc] px-1 font-mono text-[11px]">{plan.razorpay_plan_id}</code>. Changing price or seat counts will clear it — existing subscribers continue on the current Razorpay plan; you must re-sync before new signups can use the updated pricing.</>
            )}
          </p>
        </div>
        <PlanForm mode={{ edit: plan.id }} initial={initial} />
      </div>
    </SuperAdminLayout>
  );
}
