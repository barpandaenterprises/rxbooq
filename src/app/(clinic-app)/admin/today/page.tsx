import { ClinicAppLayout } from "@/components/layouts/ClinicAppLayout";
import { AdminToday } from "@/components/compositions/AdminToday";

export const metadata = {
  title: "Today",
};

export default function AdminTodayPage() {
  return (
    <ClinicAppLayout active="Today">
      <AdminToday />
    </ClinicAppLayout>
  );
}
