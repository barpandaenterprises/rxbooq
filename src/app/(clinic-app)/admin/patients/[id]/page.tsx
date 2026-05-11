import { notFound } from "next/navigation";
import { ClinicAppLayout } from "@/components/layouts/ClinicAppLayout";
import { PatientChart } from "@/components/compositions/PatientChart";
import { findChart } from "@/lib/patient-history-data";

type Params = Promise<{ id: string }>;

export async function generateMetadata({ params }: { params: Params }) {
  const { id } = await params;
  const chart = findChart(id);
  return {
    title: chart ? `${chart.patient.name} · Chart` : "Patient · Not found",
  };
}

export default async function PatientChartPage({ params }: { params: Params }) {
  const { id } = await params;
  const chart = findChart(id);
  if (!chart) {
    notFound();
  }
  return (
    <ClinicAppLayout active="Patients">
      <PatientChart chart={chart} />
    </ClinicAppLayout>
  );
}
