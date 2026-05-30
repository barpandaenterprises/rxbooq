import Link from "next/link";
import { BookingLayout } from "@/components/layouts/BookingLayout";
import { BookingComposer } from "@/components/compositions/BookingComposer";
import { getCurrentClinic } from "@/lib/booking/current-clinic";
import { getPublicDepartments, getPublicDoctors } from "@/lib/data/public-booking";
import { serviceClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Book a visit",
};

export default async function BookPage() {
  const clinic = await getCurrentClinic();

  // Apex with no tenant: render a "Pick a clinic" helper instead of bare 404.
  if (!clinic) {
    return <PickAClinic />;
  }

  const [doctors, departments] = await Promise.all([
    getPublicDoctors(clinic.id),
    getPublicDepartments(clinic.id),
  ]);

  return (
    <BookingLayout>
      <BookingComposer
        clinicName={clinic.name}
        doctors={doctors}
        departments={departments}
      />
    </BookingLayout>
  );
}

async function PickAClinic() {
  // Show 6 active clinics (verified preferred) so the user can jump straight
  // into a clinic's profile and book from there.
  const supabase = serviceClient();
  const { data: verified } = await supabase
    .from("clinics")
    .select("id, slug, name, verification_status, application:clinic_applications!clinic_applications_clinic_id_fkey ( city, state )")
    .eq("status", "active")
    .eq("verification_status", "verified")
    .order("created_at", { ascending: false })
    .limit(6);

  let rows = (verified ?? []) as unknown as Array<{
    id: string; slug: string; name: string; verification_status: string;
    application: Array<{ city: string | null; state: string | null }>;
  }>;
  if (rows.length < 3) {
    const { data: any } = await supabase
      .from("clinics")
      .select("id, slug, name, verification_status, application:clinic_applications!clinic_applications_clinic_id_fkey ( city, state )")
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(6);
    rows = (any ?? []) as typeof rows;
  }

  return (
    <div className="min-h-screen bg-surface-muted px-4 py-10 md:py-16">
      <div className="mx-auto max-w-3xl">
        <div className="mb-6 text-center">
          <Link href="/" className="text-[14px] font-semibold text-link-hover no-underline">
            <i className="fas fa-arrow-left mr-1 text-[11px]" /> DoctorKart
          </Link>
        </div>

        <div className="rounded-lg border border-border bg-white p-8 text-center">
          <span className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-pill bg-[#E6F1FA] text-[18px] text-brand">
            <i className="fas fa-clinic-medical" />
          </span>
          <h1 className="text-[22px] font-semibold text-heading">Pick a clinic to book with</h1>
          <p className="mx-auto mt-2 max-w-md text-[13px] text-muted">
            Booking happens on each clinic&apos;s own page. Choose one below, or browse the home page for more.
          </p>
        </div>

        {rows.length > 0 && (
          <div className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-2">
            {rows.map((c) => {
              const app = c.application?.[0];
              return (
                <Link
                  key={c.id}
                  href={`/d/${c.slug}`}
                  className="flex items-center gap-3 rounded-lg border border-border bg-white p-4 no-underline transition-shadow hover:shadow-md"
                >
                  <span className="grid h-11 w-11 flex-none place-items-center rounded-md bg-[#E6F1FA] text-[14px] font-bold text-[#0E5087]">
                    {c.name.trim().split(/\s+/).slice(0, 2).map((p) => p[0] ?? "").join("").toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[14px] font-semibold text-heading">{c.name}</div>
                    {app?.city && (
                      <div className="truncate text-[12px] text-muted">
                        {app.city}{app.state ? `, ${app.state}` : ""}
                      </div>
                    )}
                  </div>
                  <i className="fas fa-arrow-right text-[12px] text-muted" />
                </Link>
              );
            })}
          </div>
        )}

        <div className="mt-6 text-center text-[12px] text-muted">
          <Link href="/" className="text-link-hover no-underline">Browse all clinics on the home page</Link>
        </div>
      </div>
    </div>
  );
}
