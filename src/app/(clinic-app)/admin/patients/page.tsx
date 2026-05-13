import { ClinicAppLayout } from "@/components/layouts/ClinicAppLayout";
import { AdminPatients } from "@/components/compositions/AdminPatients";
import { getAdminPatientsData } from "@/lib/data/admin-patients";

export const metadata = {
  title: "Patients",
};

export default async function AdminPatientsPage() {
  const initialPatients = await getAdminPatientsData();
  return (
    <ClinicAppLayout active="Patients">
      <AdminPatients initialPatients={initialPatients} />
    </ClinicAppLayout>
  );
}
