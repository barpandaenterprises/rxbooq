import Image from "next/image";
import Link from "next/link";

const COLUMNS: { title: string; links: { label: string; href: string }[] }[] = [
  {
    title: "Product",
    links: [
      { label: "Features",     href: "/#features" },
      { label: "Pricing",      href: "/pricing" },
      { label: "Get started",  href: "/get-started" },
      { label: "Sign in",      href: "/login" },
    ],
  },
  {
    title: "For patients",
    links: [
      { label: "Featured clinics", href: "/#featured-clinics" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About",   href: "/about" },
      { label: "Contact", href: "/contact" },
      { label: "Legal",   href: "/legal" },
    ],
  },
];

export function PlatformSiteFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="border-t border-border bg-white">
      <div className="mx-auto max-w-[1200px] px-5 py-10 md:px-8 md:py-14">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="inline-flex items-center no-underline">
              <Image
                src="/images/logo/rxbooq-logo.png"
                alt="Rxbooq"
                width={180}
                height={46}
                className="h-9 w-auto"
              />
            </Link>
            <p className="mt-3 text-[13px] leading-[20px] text-muted">
              Modern clinic software for India — public profile, online booking, EMR, and WhatsApp engagement.
            </p>
          </div>

          {COLUMNS.map((col) => (
            <div key={col.title}>
              <h3 className="mb-2.5 text-[11px] font-semibold uppercase tracking-wide text-[#9aa9b8]">{col.title}</h3>
              <ul className="space-y-1.5">
                {col.links.map((l) => (
                  <li key={l.label}>
                    <Link href={l.href} className="text-[13px] text-body no-underline hover:text-heading">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-10 flex flex-col items-start justify-between gap-2 border-t border-border pt-6 text-[12px] text-muted md:flex-row md:items-center">
          <div>© {year} Rxbooq. All rights reserved.</div>
          <div className="flex items-center gap-3">
            <i className="fas fa-lock text-[11px]" />
            <span>Secure · DPDP-friendly · Razorpay billing</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
