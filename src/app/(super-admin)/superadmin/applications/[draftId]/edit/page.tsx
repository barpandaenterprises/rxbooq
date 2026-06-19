import { notFound } from "next/navigation";

import { SuperAdminLayout } from "@/components/layouts/SuperAdminLayout";
import { serviceClient } from "@/lib/supabase/server";
import { DraftEditForm, type EditableDraft, type PlanOption } from "./DraftEditForm";

export const metadata = {
  title: "Edit draft · Super-admin",
};

export default async function SaEditDraftPage({
  params,
}: {
  params: Promise<{ draftId: string }>;
}) {
  const { draftId } = await params;

  const supabase = serviceClient();
  const [{ data: draft }, { data: plans }] = await Promise.all([
    supabase
      .from("clinic_applications")
      .select(`
        id, status,
        clinic_name, suggested_slug, address, city, state, pincode,
        primary_phone, primary_email,
        doctor_full_name, doctor_registration_no, doctor_qualifications,
        doctor_primary_specialty, doctor_years_experience,
        selected_plan_id, requested_doctor_seats
      `)
      .eq("id", draftId)
      .maybeSingle(),
    supabase
      .from("subscription_plans")
      .select("id, display_name, monthly_price_inr")
      .eq("is_active", true)
      .order("sort_order", { ascending: true }),
  ]);

  if (!draft || draft.status !== "draft") notFound();

  return (
    <SuperAdminLayout active="Drafts">
      <DraftEditForm draft={draft as EditableDraft} plans={(plans ?? []) as PlanOption[]} />
    </SuperAdminLayout>
  );
}
