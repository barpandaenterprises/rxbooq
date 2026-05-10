import Link from "next/link";

type Props = {
  children: React.ReactNode;
  /** Tailwind max-w utility for the top-bar / trust-footer container width.
   *  Defaults to "max-w-[720px]" (matches steps 1–3); use "max-w-[1080px]" for the wider success layout. */
  widthClass?: string;
  /** Optional override for the right-side action in the top bar.
   *  Defaults to the "Need help? +91 …" phone link. */
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
  widthClass = "max-w-[720px]",
  headerAction = DEFAULT_HEADER_ACTION,
}: Props) {
  return (
    <div className="min-h-screen bg-surface-muted px-4 py-8 md:px-0 md:py-14">
      {/* Mini top bar */}
      <div className={`mx-auto mb-6 flex items-center justify-between ${widthClass}`}>
        <Link
          href="/"
          className="flex items-center gap-2.5 text-[16px] font-semibold text-heading no-underline"
        >
          <span className="grid h-9 w-9 place-items-center rounded-md bg-brand text-[18px] text-white">
            <i className="fas fa-tooth" />
          </span>
          <span className="hidden md:inline">Mahakur Poly Dental</span>
          <span className="text-[14px] md:hidden">Mahakur Poly Dental</span>
        </Link>

        {headerAction}
      </div>

      {children}

      {/* Trust footer */}
      <div className={`mx-auto mt-6 text-center text-[12px] text-[#9aa9b8] ${widthClass}`}>
        <i className="fas fa-lock mr-1.5" />
        Secure booking · Powered by Doctor Kart
      </div>
    </div>
  );
}
