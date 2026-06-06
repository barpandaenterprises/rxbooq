import Link from "next/link";
import { notFound } from "next/navigation";
import { BookingLayout } from "@/components/layouts/BookingLayout";
import { BookingSuccess } from "@/components/compositions/BookingSuccess";
import { isReservedSlug } from "@/lib/routing/reserved-slugs";
import { getClinicByHostOrSlug } from "@/lib/supabase/clinics";
import {
  findPublicDoctorById,
  findPublicServiceById,
  getPublicDoctors,
} from "@/lib/data/public-booking";

export const metadata = {
  title: "You're booked",
};

type Params       = Promise<{ clinicSlug: string }>;
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
  params,
  searchParams,
}: {
  params:       Params;
  searchParams: SearchParams;
}) {
  const { clinicSlug } = await params;
  const q              = await searchParams;
  if (isReservedSlug(clinicSlug)) notFound();

  const clinic = await getClinicByHostOrSlug({ slug: clinicSlug });
  if (!clinic) notFound();

  // After the Department-first redesign the booking flow no longer carries a
  // serviceId through the URL. If absent, fall back to a generic consultation
  // label rather than 404-ing on success.
  const service = (await findPublicServiceById(clinic.id, q.service)) ?? {
    id:              "consultation",
    name:            "Consultation",
    description:     "",
    durationMinutes: 30,
    feeLabel:        "—",
    icon:            "fa-tooth",
  };

  let doctor = await findPublicDoctorById(clinic.id, q.doctor);
  if (!doctor) {
    const all = await getPublicDoctors(clinic.id);
    doctor = all[0] ?? null;
  }

  const date = q.date ?? "";
  const slot = q.slot ?? "";

  const yearFromDate = date ? date.slice(2, 4) : String(new Date().getFullYear()).slice(-2);
  const bookingRef = q.ref ?? buildBookingRef(
    `${service.id}|${date}|${slot}|${q.mobile ?? ""}`,
    yearFromDate,
  );
  const maskedMobile = maskMobile(q.mobile);

  const headerAction = (
    <Link
      href={`/${clinic.slug}`}
      className="text-[14px] text-link-hover no-underline"
    >
      <i className="fas fa-home mr-1.5 text-[12px] md:mr-2" />
      <span className="hidden md:inline">Back to clinic</span>
    </Link>
  );

  return (
    <BookingLayout clinicName={clinic.name} clinicSlug={clinic.slug} widthClass="max-w-[1080px]" headerAction={headerAction}>
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
