import { Suspense } from "react";
import { PatientPortalLayout } from "@/components/layouts/PatientPortalLayout";
import { PatientPortal } from "@/components/compositions/PatientPortal";

export const metadata = {
  title: "My records",
};

export default function MyAppointmentsPage() {
  return (
    <PatientPortalLayout>
      {/* PatientPortal reads ?tab= via useSearchParams — wrap so the page can
          still be statically rendered. */}
      <Suspense fallback={null}>
        <PatientPortal />
      </Suspense>
    </PatientPortalLayout>
  );
}
