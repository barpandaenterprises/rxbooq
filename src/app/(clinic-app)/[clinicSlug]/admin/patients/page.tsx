import { ClinicAppLayout } from "@/components/layouts/ClinicAppLayout";
import { AdminPatients } from "@/components/compositions/AdminPatients";
import { getAdminPatientsData } from "@/lib/data/admin-patients";
import { getClinicDoctorOptions } from "@/lib/data/admin-team";
import { getActiveMembership } from "@/lib/auth/current-user";

export const metadata = {
  title: "Patients",
};

export default async function AdminPatientsPage() {
  const [initialPatients, membership] = await Promise.all([
    getAdminPatientsData(),
    getActiveMembership(),
  ]);
  // Only admins/receptionists pick the assigned doctor; a doctor's new patients
  // are auto-assigned to themselves server-side, so they don't see the dropdown.
  const doctors =
    membership && membership.role !== "doctor" ? await getClinicDoctorOptions() : [];
  return (
    <ClinicAppLayout active="Patients">
      <AdminPatients initialPatients={initialPatients} doctors={doctors} />
    </ClinicAppLayout>
  );
}
