import Link from "next/link";

export const metadata = {
  title: "Page not found",
};

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-surface-muted px-4 py-12">
      <div className="w-full max-w-md rounded-lg border border-border bg-surface p-8 text-center shadow-sm md:p-10">
        {/* Visual hero — broken-tooth glyph */}
        <div className="relative mx-auto mb-6 grid h-20 w-20 place-items-center rounded-pill bg-[#E6F1FA]">
          <i className="fas fa-tooth text-[34px] text-brand" />
          <span className="absolute -right-1 -top-1 grid h-8 w-8 place-items-center rounded-pill border-2 border-surface bg-cta text-[12px] font-bold text-white">
            <i className="fas fa-exclamation" />
          </span>
        </div>

        <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-cta">
          404 · Not found
        </p>
        <h1 className="mt-2 text-h3 text-heading">
          We couldn&rsquo;t find that page
        </h1>
        <p className="mt-2 text-small text-muted">
          The link may be broken or the page may have moved. Try one of these
          instead.
        </p>

        <div className="mt-6 flex flex-col items-stretch gap-2.5 sm:flex-row sm:justify-center">
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 rounded-md bg-brand px-4 py-2.5 text-small font-medium text-brand-fg shadow-sm hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-brand focus:ring-offset-2"
          >
            <i className="fas fa-home text-[12px]" />
            Go to home
          </Link>
          <Link
            href="/book"
            className="inline-flex items-center justify-center gap-2 rounded-md border border-border bg-surface px-4 py-2.5 text-small font-medium text-heading hover:border-link-hover hover:text-link-hover"
          >
            <i className="fas fa-calendar-plus text-[12px]" />
            Book a visit
          </Link>
        </div>

        <div className="mt-6 border-t border-border pt-5 text-small text-muted">
          Already a patient?{" "}
          <Link href="/me/appointments" className="text-link-hover hover:underline">
            View your appointments
          </Link>
          .
        </div>
      </div>
    </main>
  );
}
