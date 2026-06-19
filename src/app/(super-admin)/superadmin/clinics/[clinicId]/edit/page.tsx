import { notFound } from "next/navigation";

import { SuperAdminLayout } from "@/components/layouts/SuperAdminLayout";
import { serviceClient } from "@/lib/supabase/server";
import { EditClinicForm, type EditableClinic } from "./EditClinicForm";

export const metadata = {
  title: "Edit clinic · Super-admin",
};

export default async function SaEditClinicPage({
  params,
}: {
  params: Promise<{ clinicId: string }>;
}) {
  const { clinicId } = await params;

  const supabase = serviceClient();
  const { data: clinic } = await supabase
    .from("clinics")
    .select("id, name, slug, status, whatsapp_number, custom_domain")
    .eq("id", clinicId)
    .maybeSingle();

  if (!clinic) notFound();

  return (
    <SuperAdminLayout active="Clinics">
      <EditClinicForm clinic={clinic as EditableClinic} />
    </SuperAdminLayout>
  );
}
