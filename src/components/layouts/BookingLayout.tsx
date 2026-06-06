import Link from "next/link";

type Props = {
  children: React.ReactNode;
  /** Clinic name shown in the top-bar brand. Required so the booking surface
   *  carries the tenant's identity instead of the legacy hardcoded clinic. */
  clinicName: string;
  /** Where the brand mark clicks back to. Defaults to the clinic's public
   *  profile (/d/{slug}) when supplied; otherwise to the platform home. */
  clinicSlug?: string;
  /** Tailwind max-w utility for the top-bar / trust-footer container width.
   *  Defaults to "max-w-[720px]" (matches steps 1–3); use "max-w-[1080px]"
   *  for the wider success layout. */
  widthClass?: string;
  /** Optional override for the right-side action in the top bar.
   *  Defaults to the platform support phone link. */
  headerAction?: React.ReactNode;
};

const DEFAULT_HEADER_ACTION = (
  <a
    href="tel:+918260222828"
    className="text-[14px] text-link-hover no-underline"
  >
    <i className="fas fa-phone-alt mr-1.5 text-[12px] md:mr-2" />
    <span className="hidden md:inline">Need help? +91 82602 22828</span>
  </a>
);

export function BookingLayout({
  children,
  clinicName,
  clinicSlug,
  widthClass = "max-w-[720px]",
  headerAction = DEFAULT_HEADER_ACTION,
}: Props) {
  const homeHref = clinicSlug ? `/${clinicSlug}` : "/";
  return (
    <div className="min-h-screen bg-surface-muted px-4 py-8 md:px-0 md:py-14">
      {/* Mini top bar */}
      <div className={`mx-auto mb-6 flex items-center justify-between ${widthClass}`}>
        <Link
          href={homeHref}
          className="flex items-center gap-2.5 text-[16px] font-semibold text-heading no-underline"
        >
          <span className="grid h-9 w-9 place-items-center rounded-md bg-brand text-[18px] text-white">
            <i className="fas fa-clinic-medical" />
          </span>
          <span className="truncate">{clinicName}</span>
        </Link>

        {headerAction}
      </div>

      {children}

      {/* Trust footer */}
      <div className={`mx-auto mt-6 text-center text-[12px] text-[#9aa9b8] ${widthClass}`}>
        <i className="fas fa-lock mr-1.5" />
        Secure booking · Powered by Rxbooq
      </div>
    </div>
  );
}
