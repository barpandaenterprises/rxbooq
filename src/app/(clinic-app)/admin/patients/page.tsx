import { ClinicAppLayout } from "@/components/layouts/ClinicAppLayout";
import { AdminPatients } from "@/components/compositions/AdminPatients";

export const metadata = {
  title: "Patients",
};

export default function AdminPatientsPage() {
  return (
    <ClinicAppLayout active="Patients">
      <AdminPatients />
    </ClinicAppLayout>
  );
}
