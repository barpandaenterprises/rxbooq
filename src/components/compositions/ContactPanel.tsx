import {
  CLINIC_NAME_FULL,
  CLINIC_ADDRESS,
  CLINIC_PHONE_DISPLAY,
  CLINIC_EMAIL,
  GOOGLE_MAPS_EMBED_HREF,
  GOOGLE_MAPS_HREF,
  MAILTO_HREF,
  TEL_HREF,
  waLink,
} from "@/lib/contact";

type ContactRow = {
  icon: string;
  label: string;
  value: string;
  href: string;
  external?: boolean;
};

const CONTACTS: ContactRow[] = [
  {
    icon: "fas fa-phone-alt",
    label: "Reception",
    value: CLINIC_PHONE_DISPLAY,
    href: TEL_HREF,
  },
  {
    icon: "fab fa-whatsapp",
    label: "WhatsApp booking",
    value: CLINIC_PHONE_DISPLAY,
    href: waLink("Hi, I'd like to book an appointment at Mahakur Poly Dental."),
    external: true,
  },
  {
    icon: "fas fa-envelope",
    label: "Email",
    value: CLINIC_EMAIL,
    href: MAILTO_HREF,
  },
];

export function ContactPanel() {
  return (
    <section id="contact" className="scroll-mt-24 py-24">
      <div className="mx-auto max-w-[1200px] px-8">
        <header className="mb-8 max-w-none text-left">
          <span className="mb-5 inline-flex items-center rounded-pill bg-[#E6F1FA] px-3.5 py-1.5 text-[13px] font-medium text-link-hover">
            Visit us
          </span>
          <h2 className="text-h2 tracking-[-0.01em]">Find the clinic</h2>
        </header>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-[1.2fr_1fr]">
          <div className="relative h-[440px] overflow-hidden rounded-lg border border-border">
            <iframe
              src={GOOGLE_MAPS_EMBED_HREF}
              title={`Map showing ${CLINIC_NAME_FULL}`}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              allowFullScreen
              className="block h-full w-full border-0"
            />
            <a
              href={GOOGLE_MAPS_HREF}
              target="_blank"
              rel="noreferrer"
              aria-label={`Open directions to ${CLINIC_NAME_FULL} on Google Maps`}
              className="absolute bottom-4 right-4 inline-flex items-center gap-1.5 rounded-pill bg-white px-3.5 py-2 text-[13px] font-medium text-link-hover shadow-md transition-colors hover:bg-surface-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cta"
            >
              <i className="fas fa-directions text-[12px]" />
              Get directions
            </a>
          </div>

          <div className="rounded-lg border border-border bg-white p-8 shadow-sm">
            <h3 className="mb-2 text-h3">{CLINIC_NAME_FULL}</h3>
            <p className="mb-2 text-body text-muted">{CLINIC_ADDRESS}</p>

            {CONTACTS.map((c) => (
              <a
                key={c.label}
                href={c.href}
                {...(c.external ? { target: "_blank", rel: "noreferrer" } : {})}
                className="flex gap-4 border-b border-border py-4 no-underline transition-colors last:border-b-0 hover:bg-surface-muted/40"
              >
                <div className="grid h-10 w-10 flex-none place-items-center rounded-pill bg-[#E6F1FA] text-[16px] text-brand">
                  <i className={c.icon} />
                </div>
                <div>
                  <div className="mb-0.5 text-[13px] text-muted">{c.label}</div>
                  <div className="text-[15px] font-medium leading-[22px] text-heading">
                    {c.value}
                  </div>
                </div>
              </a>
            ))}

            <div className="flex gap-4 py-4">
              <div className="grid h-10 w-10 flex-none place-items-center rounded-pill bg-[#E6F1FA] text-[16px] text-brand">
                <i className="fas fa-clock" />
              </div>
              <div className="flex-1">
                <div className="mb-0.5 text-[13px] text-muted">Hours</div>
                <div className="mt-2 grid grid-cols-[1fr_auto] gap-y-1.5 text-[14px] text-body">
                  <span>Mon – Fri</span>
                  <span>8:00 AM – 8:00 PM</span>
                  <span>Saturday</span>
                  <span>8:00 AM – 6:00 PM</span>
                  <span>Sunday</span>
                  <span className="text-cta">Closed</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
