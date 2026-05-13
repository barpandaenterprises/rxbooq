import { ClinicAppLayout } from "@/components/layouts/ClinicAppLayout";
import { AdminToday } from "@/components/compositions/AdminToday";
import { getAdminTodayData } from "@/lib/data/admin-today";

export const metadata = {
  title: "Today",
};

export default async function AdminTodayPage() {
  const data = await getAdminTodayData();
  return (
    <ClinicAppLayout active="Today">
      <AdminToday data={data} />
    </ClinicAppLayout>
  );
}
