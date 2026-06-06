import Link from "next/link";

type Props = {
  clinicName:  string;
  clinicSlug:  string;
  /** When true, the page is being rendered on the tenant subdomain root or
   *  custom domain — the booking link can be the plain "/book". Otherwise we
   *  thread the clinic slug as ?clinic= so /d/{slug} works on the apex. */
  isTenantRoot?: boolean;
};

const NAV_ITEMS = [
  { label: "About",     anchor: "#about" },
  { label: "Doctors",   anchor: "#doctors" },
  { label: "Services",  anchor: "#services" },
  { label: "Contact",   anchor: "#contact" },
];

export function ClinicSiteHeader({ clinicName, clinicSlug, isTenantRoot }: Props) {
  const bookHref = isTenantRoot ? "/book" : `/book?clinic=${clinicSlug}`;

  return (
    <nav className="sticky top-0 z-30 flex h-16 items-center border-b border-border bg-white md:h-[72px]">
      <div className="mx-auto flex w-full max-w-[1200px] items-center gap-3 px-4 md:gap-8 md:px-8">
        <Link
          href={isTenantRoot ? "/" : `/${clinicSlug}`}
          className="flex items-center gap-2 text-[16px] font-bold leading-tight text-heading no-underline md:gap-2.5 md:text-[18px]"
        >
          <span className="grid h-8 w-8 flex-none place-items-center rounded-md bg-brand text-[14px] text-white md:h-9 md:w-9 md:text-[16px]">
            <i className="fas fa-clinic-medical" />
          </span>
          <span className="truncate leading-tight">{clinicName}</span>
        </Link>

        <div className="ml-6 hidden items-center gap-7 md:flex">
          {NAV_ITEMS.map((item) => (
            <a
              key={item.label}
              href={item.anchor}
              className="border-b-2 border-transparent py-1.5 text-[15px] font-normal text-link no-underline transition-colors hover:text-link-hover"
            >
              {item.label}
            </a>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-3">
          <Link
            href={bookHref}
            className="inline-flex items-center gap-2 whitespace-nowrap rounded-md bg-cta px-[18px] py-2 text-[14px] font-medium text-cta-fg no-underline transition-colors hover:bg-[#d92843]"
          >
            <i className="fas fa-calendar-check" />
            <span className="hidden md:inline">Book Appointment</span>
            <span className="md:hidden">Book</span>
          </Link>
        </div>
      </div>
    </nav>
  );
}
