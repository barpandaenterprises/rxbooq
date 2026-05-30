import Link from "next/link";
import type { PublicDoctor } from "@/lib/data/public-clinic-page";

type Props = {
  doctors:  PublicDoctor[];
  bookHref: string;
};

export function ClinicDoctorsSection({ doctors, bookHref }: Props) {
  if (doctors.length === 0) return null;

  return (
    <section id="doctors" className="scroll-mt-20 bg-white py-14 md:py-24">
      <div className="mx-auto max-w-[1200px] px-5 md:px-8">
        <header className="mx-auto mb-8 max-w-[640px] text-center md:mb-12">
          <span className="mb-3 inline-flex items-center rounded-pill bg-[#FFE7EC] px-3 py-1 text-[12px] font-medium text-cta md:mb-5 md:text-[13px]">
            Meet the team
          </span>
          <h2 className="mb-2.5 text-[26px] font-semibold leading-8 tracking-[-0.01em] text-heading md:mb-3 md:text-[36px]">
            {doctors.length === 1 ? "Our doctor" : "Our doctors"}
          </h2>
        </header>

        {doctors.length === 1 ? (
          <SoloDoctor doctor={doctors[0]!} bookHref={bookHref} />
        ) : (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {doctors.map((d) => <DoctorCard key={d.id} doctor={d} bookHref={bookHref} />)}
          </div>
        )}
      </div>
    </section>
  );
}

function SoloDoctor({ doctor, bookHref }: { doctor: PublicDoctor; bookHref: string }) {
  return (
    <div className="grid grid-cols-1 items-center gap-8 md:grid-cols-[1fr_1.2fr] md:gap-14">
      <div className="relative h-72 overflow-hidden rounded-lg bg-[#E6F1FA] shadow-md md:h-[420px]">
        {doctor.photo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={doctor.photo_url} alt={doctor.display_name} className="h-full w-full object-cover object-top" />
        ) : (
          <div className="grid h-full w-full place-items-center text-[80px] text-brand">
            <i className="fas fa-user-md opacity-50" />
          </div>
        )}
      </div>
      <div>
        <h3 className="text-[24px] font-semibold text-heading md:text-[28px]">{doctor.display_name}</h3>
        {doctor.qualifications && <p className="mt-1 text-[14px] text-muted">{doctor.qualifications}</p>}
        {doctor.primary_specialty && <p className="mt-0.5 text-[13px] text-link-hover">{doctor.primary_specialty}</p>}
        {doctor.bio && <p className="mt-4 text-[14px] leading-[22px] text-body">{doctor.bio}</p>}

        <dl className="mt-6 grid grid-cols-2 gap-4 border-t border-border pt-4 text-[13px]">
          {doctor.years_experience != null && (
            <div>
              <dt className="text-[11px] uppercase tracking-wide text-muted">Experience</dt>
              <dd className="text-[14px] font-semibold text-heading">{doctor.years_experience}+ years</dd>
            </div>
          )}
          {doctor.languages && doctor.languages.length > 0 && (
            <div>
              <dt className="text-[11px] uppercase tracking-wide text-muted">Languages</dt>
              <dd className="text-[14px] font-semibold uppercase text-heading">{doctor.languages.join(", ")}</dd>
            </div>
          )}
        </dl>

        <Link
          href={bookHref}
          className="mt-6 inline-flex items-center gap-2 rounded-md bg-cta px-5 py-2.5 text-[14px] font-medium text-cta-fg no-underline transition-colors hover:bg-[#d92843]"
        >
          <i className="fas fa-calendar-check text-[12px]" />
          Book with {doctor.display_name.split(" ")[0]}
        </Link>
      </div>
    </div>
  );
}

function DoctorCard({ doctor, bookHref }: { doctor: PublicDoctor; bookHref: string }) {
  return (
    <article className="flex flex-col rounded-lg border border-border bg-white p-5 transition-shadow hover:shadow-md">
      <div className="flex gap-3">
        {doctor.photo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={doctor.photo_url} alt={doctor.display_name} className="h-16 w-16 flex-none rounded-pill object-cover" />
        ) : (
          <div className="grid h-16 w-16 flex-none place-items-center rounded-pill bg-[#E6F1FA] text-[24px] text-brand">
            <i className="fas fa-user-md" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <h3 className="text-[15px] font-semibold text-heading">{doctor.display_name}</h3>
          {doctor.primary_specialty && <div className="text-[12px] text-link-hover">{doctor.primary_specialty}</div>}
          {doctor.qualifications && <div className="mt-0.5 truncate text-[11px] text-muted">{doctor.qualifications}</div>}
        </div>
      </div>

      {(doctor.years_experience != null || (doctor.languages && doctor.languages.length > 0)) && (
        <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-muted">
          {doctor.years_experience != null && (
            <span className="rounded-pill bg-[#fafbfc] px-2 py-0.5">{doctor.years_experience}+ yrs</span>
          )}
          {doctor.languages?.map((l) => (
            <span key={l} className="rounded-pill bg-[#fafbfc] px-2 py-0.5 uppercase">{l}</span>
          ))}
        </div>
      )}

      <Link
        href={bookHref}
        className="mt-auto pt-4 text-[12px] font-medium text-cta no-underline"
      >
        Book with {doctor.display_name.split(" ")[0]} <i className="fas fa-arrow-right text-[10px]" />
      </Link>
    </article>
  );
}
