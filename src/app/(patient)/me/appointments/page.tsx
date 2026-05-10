import { PatientPortalLayout } from "@/components/layouts/PatientPortalLayout";
import { PatientPortal } from "@/components/compositions/PatientPortal";

export const metadata = {
  title: "My appointments",
};

export default function MyAppointmentsPage() {
  return (
    <PatientPortalLayout>
      <PatientPortal />
    </PatientPortalLayout>
  );
}
