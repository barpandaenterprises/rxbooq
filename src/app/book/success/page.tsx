import Link from "next/link";
import { BookingLayout } from "@/components/layouts/BookingLayout";
import { BookingSuccess } from "@/components/compositions/BookingSuccess";
import { findDoctor, findService } from "@/lib/booking-data";

export const metadata = {
  title: "You're booked",
};

type SearchParams = Promise<{
  service?: string;
  doctor?: string;
  date?: string;
  slot?: string;
  mobile?: string;
}>;

/** Stable 5-digit booking ref derived from inputs (so refresh keeps the same number). */
function buildBookingRef(seed: string, year: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  const num = (hash % 90000) + 10000;
  return `DK-${year}-${num}`;
}

function maskMobile(raw: string | undefined): string {
  const digits = (raw ?? "").replace(/\D/g, "").replace(/^91/, "");
  if (digits.length < 3) return "+91 ••••• •••••";
  const last3 = digits.slice(-3);
  return `+91 ••••• ••${last3}`;
}

export default async function SuccessPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const service = findService(params.service);
  const doctor = findDoctor(params.doctor);
  const date = params.date ?? "";
  const slot = params.slot ?? "";

  const yearFromDate = date ? date.slice(2, 4) : String(new Date().getFullYear()).slice(-2);
  const bookingRef = buildBookingRef(
    `${service.id}|${date}|${slot}|${params.mobile ?? ""}`,
    yearFromDate,
  );
  const maskedMobile = maskMobile(params.mobile);

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
    <BookingLayout widthClass="max-w-[1080px]" headerAction={headerAction}>
      <BookingSuccess
        service={service}
        doctor={doctor}
        date={date}
        slot={slot}
        bookingRef={bookingRef}
        maskedMobile={maskedMobile}
      />
    </BookingLayout>
  );
}
