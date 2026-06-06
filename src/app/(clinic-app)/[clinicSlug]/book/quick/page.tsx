import Link from "next/link";
import { notFound } from "next/navigation";
import { BookingLayout } from "@/components/layouts/BookingLayout";
import { QuickBook } from "@/components/compositions/QuickBook";
import { isReservedSlug } from "@/lib/routing/reserved-slugs";
import { getClinicByHostOrSlug } from "@/lib/supabase/clinics";

export const metadata = {
  title: "Quick book",
  description: "Book your appointment in one tap on WhatsApp.",
};

type Params = Promise<{ clinicSlug: string }>;

export default async function QuickBookPage({ params }: { params: Params }) {
  const { clinicSlug } = await params;
  if (isReservedSlug(clinicSlug)) notFound();

  const clinic = await getClinicByHostOrSlug({ slug: clinicSlug });
  if (!clinic) notFound();

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
    <BookingLayout clinicName={clinic.name} clinicSlug={clinic.slug} widthClass="max-w-[640px]" headerAction={headerAction}>
      <QuickBook clinicSlug={clinic.slug} />
    </BookingLayout>
  );
}
