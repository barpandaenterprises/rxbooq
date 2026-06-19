import { SuperAdminLayout } from "@/components/layouts/SuperAdminLayout";
import { serviceClient } from "@/lib/supabase/server";
import { OnboardClinicForm, type PlanOption } from "./OnboardClinicForm";

export const metadata = {
  title: "Onboard clinic · Super-admin",
};

export default async function SaOnboardPage() {
  const supabase = serviceClient();
  const { data: plans } = await supabase
    .from("subscription_plans")
    .select("id, code, display_name, monthly_price_inr")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  return (
    <SuperAdminLayout active="Onboarding queue">
      <OnboardClinicForm plans={(plans ?? []) as PlanOption[]} />
    </SuperAdminLayout>
  );
}
