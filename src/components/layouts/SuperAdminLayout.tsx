import Link from "next/link";

export type SuperAdminNavKey =
  | "Clinics"
  | "Onboarding queue"
  | "Usage"
  | "Billing"
  | "Templates"
  | "Audit log"
  | "Settings";

const NAV_ITEMS: Array<{
  ic: string;
  label: SuperAdminNavKey;
  href: string;
  badge?: string;
  badgeCoral?: boolean;
}> = [
  { ic: "fa-building", label: "Clinics", href: "/superadmin/clinics", badge: "12" },
  { ic: "fa-user-plus", label: "Onboarding queue", href: "/superadmin/clinics/new", badge: "4", badgeCoral: true },
  { ic: "fa-chart-area", label: "Usage", href: "#" },
  { ic: "fa-rupee-sign", label: "Billing", href: "#" },
  { ic: "fa-comment-dots", label: "Templates", href: "#" },
  { ic: "fa-history", label: "Audit log", href: "#" },
  { ic: "fa-cog", label: "Settings", href: "#" },
];

export function SuperAdminTopBar() {
  return (
    <header className="flex items-center gap-6 border-b-[3px] border-link-hover bg-brand px-5 py-3 text-white md:px-8">
      <div className="flex items-center gap-2.5">
        <span className="grid h-8 w-8 place-items-center rounded-md bg-white text-[14px] text-brand">
          <i className="fas fa-bolt" />
        </span>
        <div>
          <div className="text-[15px] font-bold leading-[17px]">Doctor Kart</div>
          <div className="text-[10px] uppercase tracking-[0.06em] text-white/70">
            Super-admin console
          </div>
        </div>
      </div>

      <div className="ml-0 flex flex-1 items-center gap-2.5 rounded-md border border-white/20 bg-white/15 px-3.5 py-2 md:ml-6 md:max-w-[520px]">
        <i className="fas fa-search text-[13px] text-white/70" />
        <span className="flex-1 truncate text-[13px] text-white/70 md:text-[14px]">
          Search clinics, owners, phone numbers, domains…
        </span>
        <span className="ml-auto hidden rounded-sm border border-white/20 bg-white/10 px-1.5 py-0.5 text-[11px] text-white/70 md:inline">
          ⌘ K
        </span>
      </div>

      <div className="ml-auto flex items-center gap-3.5">
        <button
          type="button"
          className="hidden items-center gap-1.5 rounded-pill border border-white/20 bg-white/10 px-3.5 py-2 text-[13px] font-medium md:inline-flex"
        >
          <i className="fas fa-life-ring text-[11px]" /> Help
        </button>
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-md bg-cta px-4 py-2 text-[14px] font-medium text-cta-fg hover:bg-[#d92843]"
        >
          <i className="fas fa-plus" />
          <span className="hidden md:inline">Onboard clinic</span>
        </button>
        <span className="grid h-8 w-8 place-items-center rounded-pill bg-white text-[12px] font-semibold text-brand">
          RA
        </span>
      </div>
    </header>
  );
}

function SuperAdminSidebar({ active }: { active: SuperAdminNavKey }) {
  return (
    <aside className="hidden w-60 flex-none border-r border-border bg-white p-3 md:block">
      <nav className="flex flex-col gap-0.5">
        {NAV_ITEMS.map((it) => {
          const isActive = it.label === active;
          return (
            <Link
              key={it.label}
              href={it.href}
              className={
                "flex items-center gap-3 rounded-md px-3 py-2.5 text-[14px] no-underline " +
                (isActive
                  ? "bg-[#E6F1FA] font-medium text-link-hover"
                  : "font-normal text-heading hover:bg-surface-muted")
              }
            >
              <i className={`fas ${it.ic} w-[18px] text-center text-[14px]`} />
              <span className="flex-1">{it.label}</span>
              {it.badge && (
                <span
                  className={
                    "rounded-pill px-2 py-0.5 text-[10px] font-semibold " +
                    (it.badgeCoral
                      ? "bg-cta text-white"
                      : "bg-[#F4F5F7] text-muted")
                  }
                >
                  {it.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

type Props = {
  active: SuperAdminNavKey;
  children: React.ReactNode;
  /** When true (e.g. for the wizard), hides the sidebar and uses a slimmer top bar. */
  slim?: boolean;
};

export function SuperAdminLayout({ active, children, slim }: Props) {
  return (
    <div className="flex min-h-screen flex-col bg-[#F4F5F7]">
      {slim ? <SuperAdminTopBarSlim /> : <SuperAdminTopBar />}
      <div className="flex min-h-0 flex-1">
        {!slim && <SuperAdminSidebar active={active} />}
        <main className="flex min-w-0 flex-1 flex-col">{children}</main>
      </div>
    </div>
  );
}

function SuperAdminTopBarSlim() {
  return (
    <header className="flex items-center gap-3.5 border-b-[3px] border-link-hover bg-brand px-5 py-2.5 text-[13px] text-white md:px-8">
      <span className="grid h-[26px] w-[26px] place-items-center rounded-sm bg-white text-[11px] text-brand">
        <i className="fas fa-bolt" />
      </span>
      <span className="font-semibold">Doctor Kart</span>
      <span className="text-white/70">·</span>
      <span className="text-white/85">Onboarding</span>
      <i className="fas fa-chevron-right text-[9px] text-white/55" />
      <span className="text-white">Mahima Dental &amp; Implants</span>
      <span className="ml-2 hidden rounded-pill bg-[#FFE7EC] px-2.5 py-0.5 text-[11px] font-semibold text-cta md:inline">
        Draft · auto-saved 1s ago
      </span>
      <div className="flex-1" />
      <span className="grid h-[26px] w-[26px] place-items-center rounded-pill bg-white text-[11px] font-semibold text-brand">
        RA
      </span>
    </header>
  );
}
