import Link from "next/link";
import { LanguageSwitcher } from "@/components/molecules/LanguageSwitcher";
import { MobileNavDrawer } from "@/components/molecules/MobileNavDrawer";
import { getLocale } from "@/lib/locale-server";

type NavItem = { label: string; href: string; active?: boolean };

const NAV_ITEMS: NavItem[] = [
  { label: "Home", href: "/", active: true },
  { label: "Services", href: "/#services" },
  { label: "Doctors", href: "/#doctor" },
  { label: "About", href: "/#about" },
  { label: "Contact", href: "/#contact" },
];

export async function PublicSiteHeader() {
  const locale = await getLocale();

  return (
    <nav className="sticky top-0 z-30 flex h-16 items-center border-b border-border bg-white md:h-[72px]">
      <div className="mx-auto flex w-full max-w-[1200px] items-center gap-3 px-4 md:gap-8 md:px-8">
        <Link
          href="/"
          className="flex items-center gap-2 text-[16px] font-bold leading-tight text-heading no-underline md:gap-2.5 md:text-[18px]"
        >
          <span className="grid h-8 w-8 flex-none place-items-center rounded-md bg-brand text-[14px] text-white md:h-9 md:w-9 md:text-[18px]">
            <i className="fas fa-tooth" />
          </span>
          <span className="leading-tight">
            <span className="md:hidden">Mahakur Poly Dental</span>
            <span className="hidden md:inline">
              Mahakur Poly
              <br />
              <span className="text-[11px] font-normal text-[#578]">Dental Clinic</span>
            </span>
          </span>
        </Link>

        {/* Desktop nav */}
        <div className="ml-6 hidden items-center gap-7 md:flex">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className={
                "border-b-2 border-transparent py-1.5 text-[15px] font-normal no-underline transition-colors " +
                (item.active
                  ? "border-cta font-medium text-link-hover"
                  : "text-link hover:text-link-hover")
              }
            >
              {item.label}
            </Link>
          ))}
        </div>

        {/* Desktop right cluster */}
        <div className="ml-auto hidden items-center gap-4 md:flex">
          <LanguageSwitcher current={locale} />
          <Link
            href="/book"
            className="inline-flex items-center gap-2 whitespace-nowrap rounded-md bg-cta px-[18px] py-2 text-[14px] font-medium text-cta-fg no-underline transition-colors hover:bg-[#d92843]"
          >
            <i className="fas fa-calendar-check" />
            Book Appointment
          </Link>
        </div>

        {/* Mobile right cluster: language pill (compact) + hamburger */}
        <div className="ml-auto flex items-center gap-2 md:hidden">
          <LanguageSwitcher current={locale} />
          <MobileNavDrawer locale={locale} />
        </div>
      </div>
    </nav>
  );
}
