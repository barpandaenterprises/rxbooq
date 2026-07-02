import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSignedInClinicUser, type SignedInClinicUser } from "@/lib/auth/current-user";

export type SuperAdminNavKey =
  | "Clinics"
  | "Onboarding queue"
  | "Drafts"
  | "Verifications"
  | "Plans"
  | "Subscriptions"
  | "Coupons"
  | "Usage"
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
  { ic: "fa-building",       label: "Clinics",          href: "/superadmin/clinics" },
  { ic: "fa-user-plus",      label: "Onboarding queue", href: "/superadmin/clinics/new" },
  { ic: "fa-clipboard-list", label: "Drafts",           href: "/superadmin/applications" },
  { ic: "fa-shield-alt",     label: "Verifications",    href: "/superadmin/verifications" },
  { ic: "fa-layer-group",    label: "Plans",            href: "/superadmin/plans" },
  { ic: "fa-rupee-sign",     label: "Subscriptions",    href: "/superadmin/subscriptions" },
  { ic: "fa-tag",            label: "Coupons",          href: "/superadmin/coupons" },
  { ic: "fa-chart-area",     label: "Usage",            href: "#" },
  { ic: "fa-comment-dots",   label: "Templates",        href: "#" },
  { ic: "fa-history",        label: "Audit log",        href: "#" },
  { ic: "fa-cog",            label: "Settings",         href: "#" },
];

export function SuperAdminTopBar() {
  return (
    <header className="flex items-center gap-6 border-b-[3px] border-link-hover bg-brand px-5 py-3 text-white md:px-8">
      <div className="flex items-center gap-3">
        <Image
          src="/images/logo/rxbooq-logo-white.png"
          alt="Rxbooq"
          width={150}
          height={39}
          priority
          className="h-7 w-auto"
        />
        <span className="hidden border-l border-white/25 pl-3 text-[10px] uppercase tracking-[0.06em] text-white/70 sm:block">
          Super-admin console
        </span>
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
        <Link
          href="/superadmin/clinics/new"
          className="inline-flex items-center gap-2 rounded-md bg-cta px-4 py-2 text-[14px] font-medium text-cta-fg no-underline hover:bg-[#d92843]"
        >
          <i className="fas fa-plus" />
          <span className="hidden md:inline">Onboard clinic</span>
        </Link>
        <span className="grid h-8 w-8 place-items-center rounded-pill bg-white text-[12px] font-semibold text-brand">
          RA
        </span>
      </div>
    </header>
  );
}

function SuperAdminSidebar({ active, user }: { active: SuperAdminNavKey; user: SignedInClinicUser | null }) {
  const displayName = user?.displayName ?? "Signed in";
  const initials    = initialsOf(displayName);
  return (
    <aside className="hidden w-60 flex-none flex-col border-r border-border bg-white p-3 md:flex">
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

      <div className="mt-auto flex items-center gap-2.5 border-t border-border px-2 pt-3.5">
        <span className="grid h-8 w-8 flex-none place-items-center rounded-pill bg-[#E6F1FA] text-[11px] font-semibold text-link-hover">
          {initials}
        </span>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[13px] font-medium text-heading">{displayName}</div>
          <div className="text-[11px] text-muted">Superadmin</div>
        </div>
        <Link
          href="/logout"
          prefetch={false}
          aria-label="Sign out"
          title="Sign out"
          className="grid h-7 w-7 place-items-center rounded-md text-muted hover:bg-surface-muted hover:text-heading"
        >
          <i className="fas fa-sign-out-alt text-[13px]" />
        </Link>
      </div>
    </aside>
  );
}

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/);
  const a = parts[0]?.[0] ?? "?";
  const b = parts[1]?.[0] ?? "";
  return (a + b).toUpperCase();
}

type Props = {
  active: SuperAdminNavKey;
  children: React.ReactNode;
  /** When true (e.g. for the wizard), hides the sidebar and uses a slimmer top bar. */
  slim?: boolean;
};

export async function SuperAdminLayout({ active, children, slim }: Props) {
  // Role gate — middleware already enforces "must be signed in" on /superadmin/*,
  // but doesn't check role. Without this, a regular clinic user typing the URL
  // would land on the layout (the actions guard writes; this guards reads too).
  const user = await getSignedInClinicUser();
  if (!user || user.role !== "superadmin") {
    redirect("/login?next=/superadmin/clinics");
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#F4F5F7]">
      {slim ? <SuperAdminTopBarSlim /> : <SuperAdminTopBar />}
      <div className="flex min-h-0 flex-1">
        {!slim && <SuperAdminSidebar active={active} user={user} />}
        <main className="flex min-w-0 flex-1 flex-col">{children}</main>
      </div>
    </div>
  );
}

function SuperAdminTopBarSlim() {
  return (
    <header className="flex items-center gap-3.5 border-b-[3px] border-link-hover bg-brand px-5 py-2.5 text-[13px] text-white md:px-8">
      <Image
        src="/images/logo/rxbooq-logo-white.png"
        alt="Rxbooq"
        width={110}
        height={28}
        className="h-[22px] w-auto"
      />
      <span className="text-white/70">·</span>
      <span className="text-white/85">Onboarding</span>
      <i className="fas fa-chevron-right text-[9px] text-white/55" />
      <span className="text-white">Mahima Dental &amp; Implants</span>
      <span className="ml-2 hidden rounded-pill bg-[#FFE7EC] px-2.5 py-0.5 text-[11px] font-semibold text-cta md:inline">
        Draft · auto-saved 1s ago
      </span>
      <div className="flex-1" />
      <Link
        href="/logout"
        prefetch={false}
        aria-label="Sign out"
        title="Sign out"
        className="grid h-[26px] w-[26px] place-items-center rounded-pill bg-white/15 text-[11px] text-white/85 hover:bg-white/25"
      >
        <i className="fas fa-sign-out-alt text-[11px]" />
      </Link>
    </header>
  );
}
