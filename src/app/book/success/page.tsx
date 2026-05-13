import Link from "next/link";
import { notFound } from "next/navigation";
import { BookingLayout } from "@/components/layouts/BookingLayout";
import { BookingSuccess } from "@/components/compositions/BookingSuccess";
import { getCurrentClinic } from "@/lib/booking/current-clinic";
import {
  findPublicDoctorById,
  findPublicServiceById,
  getPublicDoctors,
} from "@/lib/data/public-booking";

export const metadata = {
  title: "You're booked",
};

type SearchParams = Promise<{
  service?: string;
  doctor?:  string;
  date?:    string;
  slot?:    string;
  mobile?:  string;
  /** Booking reference returned by the action (e.g. DK-2026-ABCDE). */
  ref?:     string;
  /** Appointment row id (UUID) returned by the action. */
  id?:      string;
}>;

/** Stable 5-digit booking ref derived from inputs — fallback when the action
 *  didn't supply one (mock mode or pre-form refreshes). */
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
  const clinic = await getCurrentClinic();
  if (!clinic) notFound();

  const service = await findPublicServiceById(clinic.id, params.service);
  if (!service) notFound();

  let doctor = await findPublicDoctorById(clinic.id, params.doctor);
  if (!doctor) {
    const all = await getPublicDoctors(clinic.id);
    doctor = all[0] ?? null;
  }

  const date = params.date ?? "";
  const slot = params.slot ?? "";

  const yearFromDate = date ? date.slice(2, 4) : String(new Date().getFullYear()).slice(-2);
  const bookingRef = params.ref ?? buildBookingRef(
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
        clinicName={clinic.name}
      />
    </BookingLayout>
  );
}
