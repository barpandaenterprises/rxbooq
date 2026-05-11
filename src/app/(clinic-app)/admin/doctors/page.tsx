import { ClinicAppLayout } from "@/components/layouts/ClinicAppLayout";
import { AdminDoctors } from "@/components/compositions/AdminDoctors";

export const metadata = {
  title: "Doctors",
};

export default function AdminDoctorsPage() {
  return (
    <ClinicAppLayout active="Doctors">
      <AdminDoctors />
    </ClinicAppLayout>
  );
}
