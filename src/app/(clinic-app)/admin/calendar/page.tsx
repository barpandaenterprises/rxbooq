import { ClinicAppLayout } from "@/components/layouts/ClinicAppLayout";
import { AdminCalendar } from "@/components/compositions/AdminCalendar";

export const metadata = {
  title: "Calendar",
};

export default function AdminCalendarPage() {
  return (
    <ClinicAppLayout active="Calendar">
      <AdminCalendar />
    </ClinicAppLayout>
  );
}
