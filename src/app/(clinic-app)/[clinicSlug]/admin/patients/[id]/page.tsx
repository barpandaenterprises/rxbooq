import { notFound } from "next/navigation";
import { ClinicAppLayout } from "@/components/layouts/ClinicAppLayout";
import { PatientChart } from "@/components/compositions/PatientChart";
import { getPatientChart } from "@/lib/data/admin-patient-chart";
import { getClinicDoctorOptions } from "@/lib/data/admin-team";
import { getActiveMembership } from "@/lib/auth/current-user";

type Params = Promise<{ id: string }>;

export async function generateMetadata({ params }: { params: Params }) {
  const { id } = await params;
  const chart = await getPatientChart(id);
  return {
    title: chart ? `${chart.patient.name} · Chart` : "Patient · Not found",
  };
}

export default async function PatientChartPage({ params }: { params: Params }) {
  const { id } = await params;
  const [chart, membership] = await Promise.all([
    getPatientChart(id),
    getActiveMembership(),
  ]);
  if (!chart) {
    notFound();
  }
  // Admins/receptionists can (re)assign the primary doctor from the chart.
  const canAssign = Boolean(membership && membership.role !== "doctor");
  const doctors = canAssign ? await getClinicDoctorOptions() : [];
  return (
    <ClinicAppLayout active="Patients">
      <PatientChart chart={chart} doctors={doctors} canAssign={canAssign} />
    </ClinicAppLayout>
  );
}
