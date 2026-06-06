import { ClinicAppLayout } from "@/components/layouts/ClinicAppLayout";
import { AdminDepartments } from "@/components/compositions/AdminDepartments";
import { listDepartments } from "@/lib/data/departments";

export const metadata = {
  title: "Departments",
};

export default async function AdminDepartmentsPage() {
  const departments = await listDepartments();
  return (
    <ClinicAppLayout active="Settings">
      <AdminDepartments initialDepartments={departments} />
    </ClinicAppLayout>
  );
}
