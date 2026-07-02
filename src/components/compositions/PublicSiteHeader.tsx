import Image from "next/image";
import Link from "next/link";
import { MobileNavDrawer } from "@/components/molecules/MobileNavDrawer";

type NavItem = { label: string; href: string; active?: boolean };

const NAV_ITEMS: NavItem[] = [
  { label: "Home", href: "/", active: true },
  { label: "Services", href: "/#services" },
  { label: "Doctors", href: "/#doctor" },
  { label: "About", href: "/#about" },
  { label: "Contact", href: "/#contact" },
];

// LanguageSwitcher was removed: the marketing site copy is English-only for v1.
// Patients still pick their preferred language for WhatsApp comms in the booking
// form — see BookingPatientForm + patients.language. To bring back a real
// language switcher, wire next-intl (already installed) and ship translations
// per the "Multilingual UI" decision in docs/client-questions/operating-model.md.

export async function PublicSiteHeader() {
  return (
    <nav className="sticky top-0 z-30 flex h-16 items-center border-b border-border bg-white md:h-[72px]">
      <div className="mx-auto flex w-full max-w-[1200px] items-center gap-3 px-4 md:gap-8 md:px-8">
        <Link href="/" className="flex flex-none items-center no-underline">
          <Image
            src="/images/logo/rxbooq-logo.png"
            alt="Rxbooq"
            width={170}
            height={44}
            priority
            className="h-8 w-auto md:h-9"
          />
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
          <Link
            href="/get-started"
            className="text-[13px] font-medium text-muted no-underline hover:text-heading"
          >
            For clinics
          </Link>
          <Link
            href="/book"
            className="inline-flex items-center gap-2 whitespace-nowrap rounded-md bg-cta px-[18px] py-2 text-[14px] font-medium text-cta-fg no-underline transition-colors hover:bg-[#d92843]"
          >
            <i className="fas fa-calendar-check" />
            Book Appointment
          </Link>
        </div>

        {/* Mobile right cluster: hamburger */}
        <div className="ml-auto flex items-center gap-2 md:hidden">
          <MobileNavDrawer />
        </div>
      </div>
    </nav>
  );
}
