import { notFound } from "next/navigation";
import { BookingLayout } from "@/components/layouts/BookingLayout";
import { BookingPatientForm } from "@/components/compositions/BookingPatientForm";
import { getCurrentClinic } from "@/lib/booking/current-clinic";
import {
  findPublicDoctorById,
  findPublicServiceById,
  getPublicDoctors,
} from "@/lib/data/public-booking";

export const metadata = {
  title: "Your details",
};

type SearchParams = Promise<{
  service?: string;
  doctor?:  string;
  date?:    string;
  slot?:    string;
}>;

export default async function DetailsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const clinic = await getCurrentClinic();
  if (!clinic) notFound();

  const service = await findPublicServiceById(clinic.id, params.service);
  if (!service) notFound();

  // Resolve doctor — either the one passed via URL, or default to the first
  // active doctor so the booking action has a valid doctor_id.
  let doctor = await findPublicDoctorById(clinic.id, params.doctor);
  if (!doctor) {
    const all = await getPublicDoctors(clinic.id);
    doctor = all[0] ?? null;
  }

  return (
    <BookingLayout>
      <BookingPatientForm
        service={service}
        doctor={doctor}
        date={params.date ?? ""}
        slot={params.slot ?? ""}
        clinicName={clinic.name}
      />
    </BookingLayout>
  );
}
