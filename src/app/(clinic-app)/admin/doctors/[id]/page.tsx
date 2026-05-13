import { notFound } from "next/navigation";
import { ClinicAppLayout } from "@/components/layouts/ClinicAppLayout";
import { DoctorProfile } from "@/components/compositions/DoctorProfile";
import { getAdminDoctorById } from "@/lib/data/admin-doctors";

type Params = Promise<{ id: string }>;

export async function generateMetadata({ params }: { params: Params }) {
  const { id } = await params;
  const doctor = await getAdminDoctorById(id);
  return {
    title: doctor ? `${doctor.name} · Doctor profile` : "Doctor · Not found",
  };
}

export default async function DoctorProfilePage({ params }: { params: Params }) {
  const { id } = await params;
  const doctor = await getAdminDoctorById(id);
  if (!doctor) {
    notFound();
  }
  return (
    <ClinicAppLayout active="Doctors">
      <DoctorProfile doctor={doctor} />
    </ClinicAppLayout>
  );
}
