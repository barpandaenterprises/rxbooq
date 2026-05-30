import Link from "next/link";

type Props = {
  clinicName:      string;
  whatsappNumber:  string | null;
  bookHref:        string;
};

export function ClinicCtaStrip({ clinicName, whatsappNumber, bookHref }: Props) {
  const cleanPhone = whatsappNumber?.replace(/[^0-9+]/g, "");
  const waLink     = cleanPhone ? `https://wa.me/${cleanPhone.replace(/^\+/, "")}` : null;

  return (
    <section className="bg-brand py-10 text-white md:py-14">
      <div className="mx-auto flex max-w-[1200px] flex-col items-start gap-5 px-5 md:flex-row md:items-center md:justify-between md:gap-10 md:px-8">
        <div className="md:max-w-[620px]">
          <h2 className="text-[24px] font-semibold leading-8 text-white md:text-[30px]">
            Book your visit to {clinicName}
          </h2>
          <p className="mt-2 text-[14px] leading-[22px] text-white/85 md:text-[16px] md:leading-[26px]">
            Pick a doctor, choose a time, confirm on WhatsApp. We&apos;ll send a reminder before your visit.
          </p>
        </div>

        <div className="flex w-full flex-shrink-0 flex-col gap-2.5 md:w-auto md:flex-row md:items-center">
          {waLink && (
            <a
              href={waLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex w-full items-center justify-center gap-2.5 whitespace-nowrap rounded-pill bg-white px-6 py-3.5 text-[15px] font-semibold text-[#128C7E] no-underline shadow-md transition-colors hover:bg-[#f3f8fd] md:w-auto md:px-7"
            >
              <span className="grid h-6 w-6 flex-none place-items-center rounded-pill bg-[#25D366] text-[13px] text-white">
                <i className="fab fa-whatsapp" />
              </span>
              Book on WhatsApp
            </a>
          )}
          <Link
            href={bookHref}
            className="inline-flex w-full items-center justify-center gap-2 whitespace-nowrap rounded-pill border-[1.5px] border-white/60 bg-transparent px-6 py-3.5 text-[15px] font-semibold text-white no-underline transition-colors hover:border-white hover:bg-white/10 md:w-auto md:px-7"
          >
            <i className="fas fa-calendar-check text-[13px]" />
            Book online
          </Link>
          {cleanPhone && (
            <a
              href={`tel:${cleanPhone}`}
              className="inline-flex w-full items-center justify-center gap-2 whitespace-nowrap rounded-pill border-[1.5px] border-white/60 bg-transparent px-6 py-3.5 text-[15px] font-semibold text-white no-underline transition-colors hover:border-white hover:bg-white/10 md:w-auto md:px-7"
            >
              <i className="fas fa-phone-alt text-[13px]" />
              Call now
            </a>
          )}
        </div>
      </div>
    </section>
  );
}
