import Link from "next/link";

const NAV_ITEMS = [
  { label: "Features",  href: "/#features" },
  { label: "Pricing",   href: "/pricing" },
  { label: "For Patients", href: "/#featured-clinics" },
];

export function PlatformSiteHeader() {
  return (
    <nav className="sticky top-0 z-30 flex h-16 items-center border-b border-border bg-white/95 backdrop-blur md:h-[72px]">
      <div className="mx-auto flex w-full max-w-[1200px] items-center gap-3 px-4 md:gap-8 md:px-8">
        <Link
          href="/"
          className="flex items-center gap-2 text-[16px] font-bold leading-tight text-heading no-underline md:gap-2.5 md:text-[18px]"
        >
          <span className="grid h-8 w-8 flex-none place-items-center rounded-md bg-brand text-[14px] text-white md:h-9 md:w-9 md:text-[16px]">
            <i className="fas fa-heartbeat" />
          </span>
          <span className="leading-tight">DoctorKart</span>
        </Link>

        <div className="ml-6 hidden items-center gap-7 md:flex">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className="border-b-2 border-transparent py-1.5 text-[15px] font-normal text-link no-underline transition-colors hover:text-link-hover"
            >
              {item.label}
            </Link>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-3 md:gap-4">
          <Link
            href="/login"
            prefetch={false}
            className="hidden text-[13px] font-medium text-muted no-underline hover:text-heading md:inline"
          >
            Sign in
          </Link>
          <Link
            href="/get-started"
            className="inline-flex items-center gap-2 whitespace-nowrap rounded-md bg-cta px-[18px] py-2 text-[14px] font-medium text-cta-fg no-underline transition-colors hover:bg-[#d92843]"
          >
            <i className="fas fa-rocket text-[12px]" />
            Get started
          </Link>
        </div>
      </div>
    </nav>
  );
}
