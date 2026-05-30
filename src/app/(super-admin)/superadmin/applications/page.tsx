import { SuperAdminLayout } from "@/components/layouts/SuperAdminLayout";
import { serviceClient } from "@/lib/supabase/server";
import { ApplicationsList, type DraftRow } from "@/components/compositions/ApplicationsList";

export const metadata = { title: "Onboarding drafts" };

export default async function ApplicationsPage() {
  const supabase = serviceClient();
  const { data: drafts } = await supabase
    .from("clinic_applications")
    .select(`
      id, phone_e164,
      clinic_name, suggested_slug, address, city, state, pincode,
      primary_phone, primary_email,
      doctor_full_name, doctor_primary_specialty, doctor_registration_no,
      doctor_qualifications, doctor_years_experience, doctor_languages,
      registration_cert_path, clinic_license_path,
      selected_plan_id, requested_doctor_seats, applied_coupon_id,
      last_step_completed,
      created_at, updated_at,
      plan:subscription_plans ( code, display_name, monthly_price_inr )
    `)
    .eq("status", "draft")
    .order("updated_at", { ascending: false });

  return (
    <SuperAdminLayout active="Drafts">
      <div className="mx-auto max-w-6xl space-y-5 p-6">
        <div>
          <h1 className="text-[22px] font-semibold text-heading">Onboarding drafts</h1>
          <p className="mt-1 text-[13px] text-muted">
            In-flight applications. Use this list to phone-follow-up drop-offs — sorted by most-recent activity.
          </p>
        </div>

        <ApplicationsList drafts={(drafts ?? []) as unknown as DraftRow[]} />
      </div>
    </SuperAdminLayout>
  );
}
