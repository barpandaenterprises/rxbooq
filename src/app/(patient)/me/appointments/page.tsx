import { Suspense } from "react";
import { redirect } from "next/navigation";
import { PatientPortalLayout } from "@/components/layouts/PatientPortalLayout";
import { PatientPortal } from "@/components/compositions/PatientPortal";
import { getSignedInPatient } from "@/lib/auth/current-patient";
import { getPatientChart } from "@/lib/data/admin-patient-chart";
import { useMockData } from "@/lib/feature-flags";

export const metadata = {
  title: "My records",
};

export default async function MyAppointmentsPage() {
  // In mock mode we let the PatientPortal fall back to its built-in DEMO_PATIENT_ID
  // — no auth required.
  if (useMockData()) {
    return (
      <PatientPortalLayout>
        <Suspense fallback={null}>
          <PatientPortal />
        </Suspense>
      </PatientPortalLayout>
    );
  }

  const me = await getSignedInPatient();
  if (!me) {
    redirect("/me/login?next=/me/appointments");
  }

  const chart = await getPatientChart(me.patientId);

  return (
    <PatientPortalLayout>
      <Suspense fallback={null}>
        <PatientPortal initialChart={chart} />
      </Suspense>
    </PatientPortalLayout>
  );
}
