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
    title: "Company",
    links: [
      { label: "About",   href: "/about" },
      { label: "Contact", href: "/contact" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Terms & Conditions", href: "/terms" },
      { label: "Privacy Policy",     href: "/privacy-policy" },
      { label: "Cookie Policy",      href: "/cookie-policy" },
    ],
  },
];

export function PlatformSiteFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="bg-[#0a2742] text-[#c9d4df]">
      <div className="mx-auto max-w-[1200px] px-5 py-14 md:px-8 md:py-16">
        <div className="grid grid-cols-2 gap-y-10 gap-x-8 md:grid-cols-12 md:gap-12">
          {/* Brand */}
          <div className="col-span-2 md:col-span-4">
            <Link href="/" className="inline-flex items-center no-underline">
              <Image
                src="/images/logo/rxbooq-logo-white.png"
                alt="Rxbooq"
                width={190}
                height={49}
                className="h-9 w-auto"
              />
            </Link>
            <p className="mt-4 max-w-[300px] text-[13.5px] leading-[22px] text-[#9aa9b8]">
              Modern clinic software for India — public profile, online booking, EMR, and WhatsApp
              engagement, wired together and billed in INR.
            </p>
          </div>

          {/* Link columns */}
          {COLUMNS.map((col) => (
            <div key={col.title} className="md:col-span-2">
              <h3 className="mb-3.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-white/50">
                {col.title}
              </h3>
              <ul className="space-y-2.5">
                {col.links.map((l) => (
                  <li key={l.label}>
                    <Link
                      href={l.href}
                      className="text-[13.5px] text-[#c9d4df] no-underline transition-colors hover:text-white"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          {/* Contact */}
          <div className="col-span-2 md:col-span-2">
            <h3 className="mb-3.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-white/50">
              Get in touch
            </h3>
            <ul className="space-y-2.5 text-[13.5px]">
              <li className="flex items-start gap-2.5 text-[#9aa9b8]">
                <i className="fas fa-location-dot mt-1 text-[12px] text-white/50" />
                <span className="leading-[20px]">Banaswadi, Bengaluru, Karnataka 560043</span>
              </li>
              <li>
                <a
                  href="tel:+918660394376"
                  className="flex items-center gap-2.5 text-[#c9d4df] no-underline hover:text-white"
                >
                  <i className="fas fa-phone text-[12px] text-white/50" />
                  +91 86603 94376
                </a>
              </li>
              <li>
                <Link
                  href="/contact"
                  className="flex items-center gap-2.5 text-[#c9d4df] no-underline hover:text-white"
                >
                  <i className="fas fa-paper-plane text-[12px] text-white/50" />
                  Contact us
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-12 flex flex-col items-start justify-between gap-3 border-t border-white/10 pt-6 text-[12px] text-[#9aa9b8] md:flex-row md:items-center">
          <div>© {year} Rxbooq · A product of Barpanda Enterprises Private Limited</div>
          <div className="flex items-center gap-2">
            <i className="fas fa-lock text-[11px] text-white/50" />
            <span>Secure · DPDP-friendly · Razorpay billing</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
