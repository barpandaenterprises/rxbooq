import { SuperAdminLayout } from "@/components/layouts/SuperAdminLayout";
import { PlanForm } from "@/components/compositions/PlanForm";

export const metadata = { title: "New plan" };

export default function NewPlanPage() {
  return (
    <SuperAdminLayout active="Plans">
      <div className="mx-auto max-w-3xl space-y-5 p-6">
        <div>
          <h1 className="text-[22px] font-semibold text-heading">New subscription plan</h1>
          <p className="mt-1 text-[13px] text-muted">
            Plans go live on /pricing immediately when Active. Paid tiers also need a one-time Razorpay sync before the Upgrade flow can use them.
          </p>
        </div>
        <PlanForm mode="create" />
      </div>
    </SuperAdminLayout>
  );
}
