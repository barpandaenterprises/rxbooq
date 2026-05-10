import Link from "next/link";
import { BookingLayout } from "@/components/layouts/BookingLayout";
import { QuickBook } from "@/components/compositions/QuickBook";

export const metadata = {
  title: "Quick book",
  description: "Book your dental appointment in one tap on WhatsApp.",
};

export default function QuickBookPage() {
  const headerAction = (
    <Link
      href="/"
      className="text-[14px] text-link-hover no-underline"
    >
      <i className="fas fa-home mr-1.5 text-[12px] md:mr-2" />
      <span className="hidden md:inline">Back to home</span>
    </Link>
  );

  return (
    <BookingLayout widthClass="max-w-[640px]" headerAction={headerAction}>
      <QuickBook />
    </BookingLayout>
  );
}
