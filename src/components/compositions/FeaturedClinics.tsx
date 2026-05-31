import Link from "next/link";
import { serviceClient } from "@/lib/supabase/server";

type Card = {
  id:                  string;
  slug:                string;
  name:                string;
  city:                string | null;
  state:               string | null;
  primary_specialty:   string | null;
  verification_status: string;
};

export async function FeaturedClinics() {
  const supabase = serviceClient();

  // Prefer verified clinics; fall back to active-only if too few are verified yet.
  const { data: verified } = await supabase
    .from("clinics")
    .select("id, slug, name, verification_status, application:clinic_applications!clinic_applications_clinic_id_fkey ( city, state, doctor_primary_specialty )")
    .eq("status", "active")
    .eq("verification_status", "verified")
    .order("created_at", { ascending: false })
    .limit(6);

  let rows = (verified ?? []) as unknown as Array<{
    id: string; slug: string; name: string; verification_status: string;
    application: Array<{ city: string | null; state: string | null; doctor_primary_specialty: string | null }>;
  }>;

  if (rows.length < 3) {
    const { data: any } = await supabase
      .from("clinics")
      .select("id, slug, name, verification_status, application:clinic_applications!clinic_applications_clinic_id_fkey ( city, state, doctor_primary_specialty )")
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(6);
    rows = (any ?? []) as typeof rows;
  }

  const cards: Card[] = rows.map((r) => {
    const app = r.application?.[0];
    return {
      id:                  r.id,
      slug:                r.slug,
      name:                r.name,
      city:                app?.city ?? null,
      state:               app?.state ?? null,
      primary_specialty:   app?.doctor_primary_specialty ?? null,
      verification_status: r.verification_status,
    };
  });

  return (
    <section id="featured-clinics" className="scroll-mt-20 bg-[#fafbfc] py-14 md:py-24">
      <div className="mx-auto max-w-[1200px] px-5 md:px-8">
        <header className="mx-auto mb-10 max-w-[640px] text-center md:mb-12">
          <span className="mb-3 inline-flex items-center rounded-pill bg-[#e6f3ec] px-3 py-1 text-[12px] font-medium text-[#1f7a3a] md:text-[13px]">
            For patients
          </span>
          <h2 className="mb-2.5 text-[28px] font-semibold leading-[1.15] tracking-[-0.01em] text-heading md:text-[36px]">
            Find a clinic near you.
          </h2>
          <p className="text-[14px] leading-[22px] text-muted md:text-[16px]">
            Browse some of the clinics live on Rxbooq. Book directly from their profile.
          </p>
        </header>

        {cards.length === 0 ? (
          <div className="mx-auto max-w-md rounded-lg border border-dashed border-border bg-white p-8 text-center text-[13px] text-muted">
            New clinics are joining Rxbooq every week — check back soon.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {cards.map((c) => (
              <Link
                key={c.id}
                href={`/d/${c.slug}`}
                className="group flex flex-col rounded-lg border border-border bg-white p-5 no-underline transition-shadow hover:shadow-md"
              >
                <div className="mb-3 flex items-start justify-between gap-3">
                  <span className="grid h-11 w-11 flex-none place-items-center rounded-md bg-[#E6F1FA] text-[14px] font-bold text-[#0E5087]">
                    {initialsOf(c.name)}
                  </span>
                  {c.verification_status === "verified" && (
                    <span className="inline-flex items-center gap-1 rounded-pill bg-[#e6f3ec] px-2 py-0.5 text-[10px] font-semibold text-[#1f7a3a]">
                      <i className="fas fa-check-circle text-[9px]" /> Verified
                    </span>
                  )}
                </div>
                <div className="text-[16px] font-semibold text-heading group-hover:text-link-hover">{c.name}</div>
                <div className="mt-1 text-[12px] text-muted">
                  {c.primary_specialty ?? "Multi-specialty"}
                  {c.city && <> · {c.city}{c.state ? `, ${c.state}` : ""}</>}
                </div>
                <div className="mt-4 inline-flex items-center gap-1.5 text-[12px] font-medium text-cta">
                  View profile <i className="fas fa-arrow-right text-[10px]" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function initialsOf(name: string): string {
  return name.trim().split(/\s+/).slice(0, 2).map((p) => p[0] ?? "").join("").toUpperCase();
}
