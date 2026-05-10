import Link from "next/link";
import {
  CLINIC_EMAIL,
  CLINIC_PHONE_DISPLAY,
  GOOGLE_MAPS_HREF,
  MAILTO_HREF,
  TEL_HREF,
  waLink,
} from "@/lib/contact";

const SOCIALS: Array<{ icon: string; label: string; href: string }> = [
  // Real social URLs aren't published yet — the GMB profile is the closest public link.
  { icon: "facebook-f", label: "Facebook",  href: "#" },
  { icon: "instagram",  label: "Instagram", href: "#" },
  { icon: "whatsapp",   label: "WhatsApp",  href: waLink("Hi, I found Mahakur Poly Dental online.") },
  { icon: "google",     label: "Google Business profile", href: GOOGLE_MAPS_HREF },
];

const CLINIC_LINKS = [
  { label: "About us", href: "/#about" },
  { label: "Our doctors", href: "/#doctor" },
  { label: "Testimonials", href: "/#testimonials" },
  { label: "Careers", href: "#" },
];

const SERVICE_LINKS = [
  { label: "Root canal",     href: "/book?service=rct" },
  { label: "Implants",       href: "/book?service=imp" },
  { label: "Braces",         href: "/book?service=brc" },
  { label: "All services",   href: "/#services" },
];

export function PublicSiteFooter() {
  return (
    <footer className="bg-[#0a2742] px-0 pb-6 pt-12 text-[#c9d4df] md:pt-16">
      <div className="mx-auto max-w-[1200px] px-5 md:px-8">
        <div className="mb-10 grid grid-cols-1 gap-8 sm:grid-cols-3 md:mb-12 md:grid-cols-[1.4fr_1fr_1fr_1fr] md:gap-12">
          <div className="sm:col-span-3 md:col-span-1">
            <Link
              href="/"
              className="mb-3 flex items-center gap-2.5 text-[18px] font-bold text-white no-underline"
            >
              <span className="grid h-9 w-9 place-items-center rounded-md bg-brand text-[18px] text-white">
                <i className="fas fa-tooth" />
              </span>
              Mahakur Poly Dental
            </Link>
            <p className="mb-4 text-[14px] leading-6 text-[#9aa9b8]">
              Bhatra Chowk, Cuttack Road, Dhanupali, Sambalpur. MDS-led team,
              modern equipment, gentle hands.
            </p>
            <div className="flex gap-2.5">
              {SOCIALS.map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  {...(s.href.startsWith("http") ? { target: "_blank", rel: "noreferrer" } : {})}
                  aria-label={s.label}
                  className="grid h-9 w-9 place-items-center rounded-pill bg-white/10 text-white no-underline transition-colors hover:bg-white/15"
                >
                  <i className={`fab fa-${s.icon} text-[14px]`} />
                </a>
              ))}
            </div>
          </div>

          <div>
            <h4 className="mb-4 text-[15px] font-semibold text-white">Clinic</h4>
            <ul className="m-0 flex list-none flex-col gap-2.5 p-0">
              {CLINIC_LINKS.map((l) => (
                <li key={l.label}>
                  <Link
                    href={l.href}
                    className="text-[14px] text-[#c9d4df] no-underline hover:text-white"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="mb-4 text-[15px] font-semibold text-white">Services</h4>
            <ul className="m-0 flex list-none flex-col gap-2.5 p-0">
              {SERVICE_LINKS.map((l) => (
                <li key={l.label}>
                  <Link
                    href={l.href}
                    className="text-[14px] text-[#c9d4df] no-underline hover:text-white"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="mb-4 text-[15px] font-semibold text-white">Get in touch</h4>
            <ul className="m-0 flex list-none flex-col gap-2.5 p-0">
              <li>
                <a
                  href={TEL_HREF}
                  className="text-[14px] text-[#c9d4df] no-underline hover:text-white"
                >
                  <i className="fas fa-phone-alt mr-2 text-[12px]" />
                  {CLINIC_PHONE_DISPLAY}
                </a>
              </li>
              <li>
                <a
                  href={waLink("Hi, I'd like to book an appointment at Mahakur Poly Dental.")}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[14px] text-[#c9d4df] no-underline hover:text-white"
                >
                  <i className="fab fa-whatsapp mr-2 text-[12px]" />
                  WhatsApp us
                </a>
              </li>
              <li>
                <a
                  href={MAILTO_HREF}
                  className="text-[14px] text-[#c9d4df] no-underline hover:text-white"
                >
                  <i className="fas fa-envelope mr-2 text-[12px]" />
                  {CLINIC_EMAIL}
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="flex flex-col gap-2 border-t border-white/10 pt-5 text-[12px] text-[#9aa9b8] md:flex-row md:items-center md:justify-between md:pt-6 md:text-[13px]">
          <span>© 2026 Mahakur Poly Dental Clinic. All rights reserved.</span>
          <span>
            Powered by{" "}
            <Link href="/" className="text-white no-underline">
              Doctor Kart
            </Link>
          </span>
        </div>
      </div>
    </footer>
  );
}
