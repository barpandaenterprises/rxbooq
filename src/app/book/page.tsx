import { notFound } from "next/navigation";
import { BookingLayout } from "@/components/layouts/BookingLayout";
import { BookingServicePicker } from "@/components/compositions/BookingServicePicker";
import { getCurrentClinic } from "@/lib/booking/current-clinic";
import { getPublicDoctors, getPublicServices } from "@/lib/data/public-booking";

export const metadata = {
  title: "Book a visit",
};

export default async function BookPage() {
  const clinic = await getCurrentClinic();
  if (!clinic) notFound();

  const [services, doctors] = await Promise.all([
    getPublicServices(clinic.id),
    getPublicDoctors(clinic.id),
  ]);

  return (
    <BookingLayout>
      <BookingServicePicker
        clinicName={clinic.name}
        services={services}
        doctors={doctors}
      />
    </BookingLayout>
  );
}
