import Link from "next/link";

export function PlatformCtaStrip() {
  return (
    <section className="bg-brand py-12 text-white md:py-16">
      <div className="mx-auto flex max-w-[1200px] flex-col items-start gap-6 px-5 md:flex-row md:items-center md:justify-between md:gap-10 md:px-8">
        <div className="md:max-w-[640px]">
          <h2 className="text-[26px] font-semibold leading-tight text-white md:text-[32px]">
            List your clinic in 5 minutes.
          </h2>
          <p className="mt-2 text-[14px] leading-[22px] text-white/85 md:text-[16px] md:leading-[26px]">
            Phone OTP, fill your profile, go live. Free public listing, paid features when you need them.
          </p>
        </div>

        <div className="flex w-full flex-shrink-0 flex-col gap-2.5 md:w-auto md:flex-row md:items-center">
          <Link
            href="/get-started"
            className="inline-flex w-full items-center justify-center gap-2 whitespace-nowrap rounded-md bg-white px-6 py-3.5 text-[15px] font-semibold text-brand no-underline shadow-md transition-colors hover:bg-[#f3f8fd] md:w-auto md:px-7"
          >
            <i className="fas fa-rocket text-[13px]" />
            Get started — free
          </Link>
          <Link
            href="/pricing"
            className="inline-flex w-full items-center justify-center gap-2 whitespace-nowrap rounded-md border-[1.5px] border-white/60 bg-transparent px-6 py-3.5 text-[15px] font-semibold text-white no-underline transition-colors hover:border-white hover:bg-white/10 md:w-auto md:px-7"
          >
            See pricing
          </Link>
        </div>
      </div>
    </section>
  );
}
