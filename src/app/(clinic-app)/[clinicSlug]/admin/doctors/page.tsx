import { ClinicAppLayout } from "@/components/layouts/ClinicAppLayout";
import { AdminDoctors } from "@/components/compositions/AdminDoctors";
import { getAdminDoctorsData } from "@/lib/data/admin-doctors";
import { listActiveDepartments } from "@/lib/data/departments";

export const metadata = {
  title: "Doctors",
};

export default async function AdminDoctorsPage() {
  const [initialDoctors, departments] = await Promise.all([
    getAdminDoctorsData(),
    listActiveDepartments(),
  ]);
  return (
    <ClinicAppLayout active="Doctors">
      <AdminDoctors initialDoctors={initialDoctors} departments={departments} />
    </ClinicAppLayout>
  );
}
