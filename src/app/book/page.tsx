import { BookingLayout } from "@/components/layouts/BookingLayout";
import { BookingServicePicker } from "@/components/compositions/BookingServicePicker";

export const metadata = {
  title: "Book a visit",
};

export default function BookPage() {
  return (
    <BookingLayout>
      <BookingServicePicker />
    </BookingLayout>
  );
}
