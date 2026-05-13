import { ClinicAppLayout } from "@/components/layouts/ClinicAppLayout";
import { AdminDoctors } from "@/components/compositions/AdminDoctors";
import { getAdminDoctorsData } from "@/lib/data/admin-doctors";

export const metadata = {
  title: "Doctors",
};

export default async function AdminDoctorsPage() {
  const initialDoctors = await getAdminDoctorsData();
  return (
    <ClinicAppLayout active="Doctors">
      <AdminDoctors initialDoctors={initialDoctors} />
    </ClinicAppLayout>
  );
}
