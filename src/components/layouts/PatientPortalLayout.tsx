import Link from "next/link";

export function PatientPortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-surface-muted">
      <header className="flex items-center gap-4 border-b border-border bg-white px-5 py-3.5 md:px-8">
        <Link href="/" className="flex items-center gap-2.5 text-heading no-underline">
          <span className="grid h-7 w-7 place-items-center rounded-md bg-brand text-[13px] text-white md:h-9 md:w-9 md:text-[18px]">
            <i className="fas fa-tooth" />
          </span>
          <span className="text-[14px] font-semibold md:text-[16px]">
            <span className="md:hidden">Mahakur Poly</span>
            <span className="hidden md:inline">Mahakur Poly Dental</span>
          </span>
        </Link>

        <div className="ml-auto flex items-center gap-3 md:gap-4">
          <button
            type="button"
            className="hidden items-center gap-1.5 rounded-pill border border-border bg-white px-3 py-1.5 text-[14px] text-link md:inline-flex"
          >
            <i className="fas fa-globe text-[11px]" />
            <span className="font-medium text-link-hover">EN</span>
            <span className="text-border">·</span>
            <span>हिं</span>
            <span className="text-border">·</span>
            <span>ଓଡ଼ିଆ</span>
          </button>

          <div className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-pill bg-[#FFE7EC] text-[12px] font-semibold text-cta">
              AS
            </span>
            <span className="hidden text-[14px] font-medium text-heading md:inline">Anita</span>
            <i className="fas fa-chevron-down text-[10px] text-[#9aa9b8]" />
          </div>

          <a href="#" className="hidden text-[14px] text-muted no-underline md:inline">
            <i className="fas fa-sign-out-alt mr-1.5 text-[12px]" />
            Logout
          </a>
        </div>
      </header>

      <main>{children}</main>
    </div>
  );
}
