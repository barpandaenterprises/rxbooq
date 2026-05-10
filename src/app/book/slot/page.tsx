import { BookingLayout } from "@/components/layouts/BookingLayout";
import { BookingSlotPicker } from "@/components/compositions/BookingSlotPicker";
import { findService } from "@/lib/booking-data";

export const metadata = {
  title: "Choose a time",
};

type SearchParams = Promise<{ service?: string; doctor?: string }>;

export default async function SlotPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const service = findService(params.service);

  return (
    <BookingLayout>
      <BookingSlotPicker service={service} doctorId={params.doctor ?? null} />
    </BookingLayout>
  );
}
