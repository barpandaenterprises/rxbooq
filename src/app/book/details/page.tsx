import { BookingLayout } from "@/components/layouts/BookingLayout";
import { BookingPatientForm } from "@/components/compositions/BookingPatientForm";
import { findDoctor, findService } from "@/lib/booking-data";

export const metadata = {
  title: "Your details",
};

type SearchParams = Promise<{
  service?: string;
  doctor?: string;
  date?: string;
  slot?: string;
}>;

export default async function DetailsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const service = findService(params.service);
  const doctor = findDoctor(params.doctor);
  const date = params.date ?? "";
  const slot = params.slot ?? "";

  return (
    <BookingLayout>
      <BookingPatientForm
        service={service}
        doctor={doctor}
        date={date}
        slot={slot}
      />
    </BookingLayout>
  );
}
