import { notFound } from "next/navigation";
import { BookingLayout } from "@/components/layouts/BookingLayout";
import { BookingComposer } from "@/components/compositions/BookingComposer";
import { isReservedSlug } from "@/lib/routing/reserved-slugs";
import { getClinicByHostOrSlug } from "@/lib/supabase/clinics";
import { getPublicDepartments, getPublicDoctors } from "@/lib/data/public-booking";

export const metadata = {
  title: "Book a visit",
};

type Params = Promise<{ clinicSlug: string }>;

export default async function ClinicBookPage({ params }: { params: Params }) {
  const { clinicSlug } = await params;

  // Guard against /[reserved]/book ever resolving here.
  if (isReservedSlug(clinicSlug)) notFound();

  const clinic = await getClinicByHostOrSlug({ slug: clinicSlug });
  if (!clinic) notFound();

  const [doctors, departments] = await Promise.all([
    getPublicDoctors(clinic.id),
    getPublicDepartments(clinic.id),
  ]);

  return (
    <BookingLayout clinicName={clinic.name} clinicSlug={clinic.slug}>
      <BookingComposer
        clinicName={clinic.name}
        doctors={doctors}
        departments={departments}
      />
    </BookingLayout>
  );
}
