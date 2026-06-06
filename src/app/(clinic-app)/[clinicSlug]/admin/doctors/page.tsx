import { ClinicAppLayout } from "@/components/layouts/ClinicAppLayout";
import { AdminDoctors } from "@/components/compositions/AdminDoctors";
import { getAdminDoctorsData } from "@/lib/data/admin-doctors";
import { listActiveDepartments } from "@/lib/data/departments";
import { getActiveMembership } from "@/lib/auth/current-user";

export const metadata = {
  title: "Doctors",
};

export default async function AdminDoctorsPage() {
  const [initialDoctors, departments, membership] = await Promise.all([
    getAdminDoctorsData(),
    listActiveDepartments(),
    getActiveMembership(),
  ]);
  // Doctor-role logins get a read-only view (no add / edit / reorder / login).
  const canManage = !membership || membership.role !== "doctor";
  return (
    <ClinicAppLayout active="Doctors">
      <AdminDoctors initialDoctors={initialDoctors} departments={departments} canManage={canManage} />
    </ClinicAppLayout>
  );
}
