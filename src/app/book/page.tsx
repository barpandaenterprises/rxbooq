import { notFound } from "next/navigation";
import { BookingLayout } from "@/components/layouts/BookingLayout";
import { BookingComposer } from "@/components/compositions/BookingComposer";
import { getCurrentClinic } from "@/lib/booking/current-clinic";
import { getPublicDepartments, getPublicDoctors } from "@/lib/data/public-booking";

export const metadata = {
  title: "Book a visit",
};

export default async function BookPage() {
  const clinic = await getCurrentClinic();
  if (!clinic) notFound();

  const [doctors, departments] = await Promise.all([
    getPublicDoctors(clinic.id),
    getPublicDepartments(clinic.id),
  ]);

  return (
    <BookingLayout>
      <BookingComposer
        clinicName={clinic.name}
        doctors={doctors}
        departments={departments}
      />
    </BookingLayout>
  );
}
