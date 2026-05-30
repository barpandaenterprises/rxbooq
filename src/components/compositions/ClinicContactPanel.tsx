import type { PublicClinic } from "@/lib/data/public-clinic-page";

type Props = {
  clinic: PublicClinic;
};

export function ClinicContactPanel({ clinic }: Props) {
  const fullAddress = [clinic.address, clinic.city, clinic.state, clinic.pincode]
    .filter(Boolean)
    .join(", ");
  const mapsHref = fullAddress
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fullAddress)}`
    : null;
  const cleanPhone = clinic.whatsapp_number?.replace(/[^0-9+]/g, "");

  return (
    <section id="contact" className="scroll-mt-20 bg-[#fafbfc] py-14 md:py-24">
      <div className="mx-auto max-w-[1200px] px-5 md:px-8">
        <header className="mx-auto mb-8 max-w-[640px] text-center md:mb-12">
          <span className="mb-3 inline-flex items-center rounded-pill bg-[#E6F1FA] px-3 py-1 text-[12px] font-medium text-link-hover md:mb-5 md:text-[13px]">
            Contact us
          </span>
          <h2 className="mb-2.5 text-[26px] font-semibold leading-8 tracking-[-0.01em] text-heading md:mb-3 md:text-[36px]">
            Visit {clinic.name}
          </h2>
        </header>

        <div className="mx-auto grid max-w-[840px] grid-cols-1 gap-4 md:grid-cols-2">
          <div className="rounded-lg border border-border bg-white p-5">
            <div className="mb-2 flex items-center gap-2">
              <span className="grid h-9 w-9 place-items-center rounded-md bg-[#E6F1FA] text-[14px] text-brand">
                <i className="fas fa-map-marker-alt" />
              </span>
              <h3 className="text-[15px] font-semibold text-heading">Address</h3>
            </div>
            {fullAddress ? (
              <>
                <p className="text-[13px] leading-[20px] text-body">{fullAddress}</p>
                {mapsHref && (
                  <a
                    href={mapsHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 inline-flex items-center gap-1.5 text-[12px] font-medium text-link-hover no-underline"
                  >
                    <i className="fas fa-external-link-alt text-[10px]" />
                    Open in Google Maps
                  </a>
                )}
              </>
            ) : (
              <p className="text-[13px] text-muted">Address not yet listed.</p>
            )}
          </div>

          <div className="rounded-lg border border-border bg-white p-5">
            <div className="mb-2 flex items-center gap-2">
              <span className="grid h-9 w-9 place-items-center rounded-md bg-[#FFE7EC] text-[14px] text-cta">
                <i className="fas fa-phone-alt" />
              </span>
              <h3 className="text-[15px] font-semibold text-heading">Phone &amp; WhatsApp</h3>
            </div>
            {cleanPhone ? (
              <>
                <p className="font-mono text-[15px] font-semibold text-heading">{clinic.whatsapp_number}</p>
                <div className="mt-3 flex gap-2 text-[12px]">
                  <a
                    href={`tel:${cleanPhone}`}
                    className="rounded-md border border-border bg-white px-3 py-1.5 text-heading no-underline hover:bg-[#fafbfc]"
                  >
                    Call
                  </a>
                  <a
                    href={`https://wa.me/${cleanPhone.replace(/^\+/, "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-md bg-[#25D366] px-3 py-1.5 font-medium text-white no-underline hover:bg-[#1ebd58]"
                  >
                    <i className="fab fa-whatsapp mr-1.5 text-[12px]" />
                    Chat on WhatsApp
                  </a>
                </div>
              </>
            ) : (
              <p className="text-[13px] text-muted">Phone not yet listed.</p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
