import Link from "next/link";
import { NewAppointmentDialog } from "@/components/compositions/NewAppointmentDialog";
import { ClinicSwitcher, type ClinicMembership } from "@/components/molecules/ClinicSwitcher";
import {
  getActiveMembership,
  getMyClinicMemberships,
  getSignedInClinicUser,
  type SignedInClinicUser,
} from "@/lib/auth/current-user";
import { getActiveClinicSlug } from "@/lib/routing/active-slug";
import { getBookingLookups, type BookingLookups } from "@/lib/data/booking-lookups";
import { getAdminSidebarBadges, type SidebarBadges } from "@/lib/data/admin-sidebar";
import { serviceClient } from "@/lib/supabase/server";

type ClinicHeader = { name: string; city: string | null };

/**
 * Load just enough to render the sidebar brand (clinic name + city).
 * clinics table doesn't carry address — the city comes from the activated
 * clinic_applications row.
 */
async function loadClinicHeader(clinicId: string): Promise<ClinicHeader | null> {
  const supabase = serviceClient();
  const [{ data: c }, { data: app }] = await Promise.all([
    supabase.from("clinics").select("name").eq("id", clinicId).maybeSingle(),
    supabase
      .from("clinic_applications")
      .select("city")
      .eq("clinic_id", clinicId)
      .eq("status", "active")
      .maybeSingle(),
  ]);
  if (!c) return null;
  return { name: c.name, city: app?.city ?? null };
}

export type AdminNavKey =
  | "Today"
  | "Calendar"
  | "Patients"
  | "Doctors"
  | "Messages"
  | "Analytics"
  | "Content"
  | "Settings";

type StaffRole = "clinic_admin" | "doctor" | "receptionist";

type BadgeKey = "today" | "messages";

type NavSpec = {
  ic: string;
  label: AdminNavKey;
  /** Path under /[slug]/admin (e.g. "/today"). Bare "#" if not wired yet. */
  path: string;
  /** Which live count (if any) drives this item's badge. */
  badgeKey?: BadgeKey;
  badgeCoral?: boolean;
  /** If set, only these roles see the item (superadmin always does). */
  roles?: StaffRole[];
};

const NAV_ITEMS: NavSpec[] = [
  { ic: "fa-calendar-day", label: "Today",     path: "/today",            badgeKey: "today" },
  { ic: "fa-calendar-alt", label: "Calendar",  path: "/calendar" },
  { ic: "fa-users",        label: "Patients",  path: "/patients" },
  { ic: "fa-user-md",      label: "Doctors",   path: "/doctors" },
  { ic: "fa-comments",     label: "Messages",  path: "/messages",         badgeKey: "messages", badgeCoral: true },
  { ic: "fa-chart-line",   label: "Analytics", path: "/analytics" },
  { ic: "fa-file-alt",     label: "Content",   path: "#" },
  // Clinic configuration is admin-only; doctors and receptionists don't see it.
  { ic: "fa-cog",          label: "Settings",  path: "/settings/team",    roles: ["clinic_admin"] },
];

/** Whether a nav item is visible for the given active-clinic role. */
function navVisibleFor(item: NavSpec, role: StaffRole | "superadmin" | null): boolean {
  if (!item.roles) return true;
  if (role === "superadmin") return true;
  return role !== null && item.roles.includes(role as StaffRole);
}

type MobileTabSpec = { ic: string; label: string; path?: string; key: AdminNavKey | "More"; badgeKey?: BadgeKey };

const MOBILE_TABS: MobileTabSpec[] = [
  { ic: "fa-calendar-day", label: "Today",    path: "/today",    key: "Today" },
  { ic: "fa-calendar-alt", label: "Calendar", path: "/calendar", key: "Calendar" },
  { ic: "fa-users",        label: "Patients", path: "/patients", key: "Patients" },
  { ic: "fa-comments",     label: "Messages", path: "/messages", key: "Messages", badgeKey: "messages" },
  { ic: "fa-ellipsis-h",   label: "More",                       key: "More" },
];

/** Build an absolute admin URL given the active clinic slug. */
function adminHref(slug: string, path: string): string {
  if (path === "#") return "#";
  return `/${slug}/admin${path}`;
}

function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function roleLabel(role: string | null): string {
  switch (role) {
    case "clinic_admin": return "Admin";
    case "doctor":       return "Doctor";
    case "receptionist": return "Receptionist";
    case "superadmin":   return "Super-admin";
    default:             return "Staff";
  }
}

function ClinicSidebar({
  active,
  user,
  clinic,
  slug,
  memberships,
  navRole,
  badges,
}: {
  active:      AdminNavKey;
  user:        SignedInClinicUser | null;
  clinic:      ClinicHeader | null;
  slug:        string;
  memberships: ClinicMembership[];
  navRole:     StaffRole | "superadmin" | null;
  badges:      SidebarBadges;
}) {
  const displayName = user?.displayName ?? "Signed in";
  const initials    = user?.displayName ? initialsOf(user.displayName) : "?";
  const role        = roleLabel(user?.role ?? null);

  return (
    <aside className="hidden w-60 flex-none flex-col bg-[#0a2742] p-3 text-[#c9d4df] md:flex">
      <div className="mb-3.5">
        <ClinicSwitcher
          memberships={memberships}
          currentSlug={slug}
          currentCity={clinic?.city ?? null}
          roleLabel={role}
        />
      </div>

      <nav className="flex flex-1 flex-col gap-0.5">
        {NAV_ITEMS.filter((it) => navVisibleFor(it, navRole)).map((it) => {
          const isActive = it.label === active;
          const badgeCount = it.badgeKey ? badges[it.badgeKey] : 0;
          return (
            <Link
              key={it.label}
              href={adminHref(slug, it.path)}
              className={
                "relative flex items-center gap-3 rounded-md px-3 py-2.5 text-[14px] no-underline " +
                (isActive
                  ? "bg-brand/20 font-medium text-white"
                  : "font-normal text-[#c9d4df] hover:bg-white/5")
              }
            >
              <i className={`fas ${it.ic} w-[18px] text-center text-[14px]`} />
              <span className="flex-1">{it.label}</span>
              {badgeCount > 0 && (
                <span
                  className={
                    "rounded-pill px-2 py-0.5 text-[10px] font-semibold " +
                    (it.badgeCoral
                      ? "bg-cta text-white"
                      : "bg-white/10 text-white")
                  }
                >
                  {badgeCount}
                </span>
              )}
              {isActive && (
                <span className="absolute -left-3 top-1.5 bottom-1.5 w-[3px] rounded-r bg-cta" />
              )}
            </Link>
          );
        })}
      </nav>

      <div className="mt-3.5 flex items-center gap-2.5 border-t border-white/10 px-2 pt-3.5">
        <span className="grid h-8 w-8 flex-none place-items-center rounded-pill bg-[#FFE7EC] text-[11px] font-semibold text-cta">
          {initials}
        </span>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[13px] font-medium text-white">{displayName}</div>
          <div className="text-[11px] text-[#8aa0b6]">{role}</div>
        </div>
        <Link
          href="/logout"
          prefetch={false}
          aria-label="Sign out"
          title="Sign out"
          className="grid h-7 w-7 place-items-center rounded-md text-[#8aa0b6] hover:bg-white/5 hover:text-white"
        >
          <i className="fas fa-sign-out-alt text-[13px]" />
        </Link>
      </div>
    </aside>
  );
}

function ClinicTopBar({
  subtitle,
  dayLabel,
  dateLabel,
  lookups,
  restrictToDoctorId,
}: {
  subtitle?: string;
  dayLabel?: string;
  dateLabel?: string;
  lookups: BookingLookups;
  restrictToDoctorId?: string | null;
}) {
  return (
    <header className="flex items-center gap-6 border-b border-border bg-white px-5 py-3.5 md:px-8">
      {/* Mobile menu trigger */}
      <button type="button" className="text-heading md:hidden" aria-label="Open menu">
        <i className="fas fa-bars text-[16px]" />
      </button>

      <div className="hidden md:block">
        <div className="text-[13px] text-[#9aa9b8]">{dayLabel ?? "Today"}</div>
        <div className="text-[18px] font-semibold leading-[22px] text-heading">
          {dateLabel ?? new Date().toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
        </div>
      </div>

      <div className="ml-0 flex flex-1 items-center gap-2.5 rounded-md border border-border bg-surface-muted px-3.5 py-2.5 md:ml-6 md:max-w-[520px]">
        <i className="fas fa-search text-[13px] text-[#9aa9b8]" />
        <span className="flex-1 truncate text-[13px] text-[#9aa9b8] md:text-[14px]">
          {subtitle ?? "Search patients, phone numbers, appointment IDs…"}
        </span>
        <span className="ml-auto hidden rounded-sm border border-border bg-white px-1.5 py-0.5 text-[11px] text-[#9aa9b8] md:inline">
          ⌘ K
        </span>
      </div>

      <div className="ml-auto flex items-center gap-3.5">
        <button
          type="button"
          aria-label="Notifications"
          className="relative grid h-10 w-10 place-items-center rounded-pill border border-border bg-white text-muted hover:text-link-hover"
        >
          <i className="fas fa-bell text-[14px]" />
          <span className="absolute right-2 top-1.5 h-2 w-2 rounded-pill border-[1.5px] border-white bg-cta" />
        </button>
        <NewAppointmentDialog
          lookups={lookups}
          restrictToDoctorId={restrictToDoctorId}
          trigger={
            <button
              type="button"
              className="hidden cursor-pointer items-center gap-2 rounded-md bg-cta px-4 py-2 text-[14px] font-medium text-cta-fg hover:bg-[#d92843] md:inline-flex"
            >
              <i className="fas fa-plus" /> New appointment
            </button>
          }
        />
        <NewAppointmentDialog
          lookups={lookups}
          restrictToDoctorId={restrictToDoctorId}
          trigger={
            <button
              type="button"
              aria-label="New appointment"
              className="grid h-10 w-10 cursor-pointer place-items-center rounded-md bg-cta text-cta-fg md:hidden"
            >
              <i className="fas fa-plus text-[14px]" />
            </button>
          }
        />
      </div>
    </header>
  );
}

function ClinicMobileTabBar({ active, slug, badges }: { active: AdminNavKey; slug: string; badges: SidebarBadges }) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 flex justify-around border-t border-border bg-white pt-2 pb-3 shadow-[0_-4px_12px_rgba(0,0,0,0.05)] md:hidden">
      {MOBILE_TABS.map((t) => {
        const isActive = t.key === active;
        const badgeCount = t.badgeKey ? badges[t.badgeKey] : 0;
        const content = (
          <div className="relative flex flex-col items-center gap-0.5 px-2 py-1">
            <i className={`fas ${t.ic} text-[18px] ${isActive ? "text-cta" : "text-muted"}`} />
            <span className={`text-[10px] ${isActive ? "font-semibold text-cta" : "text-muted"}`}>{t.label}</span>
            {badgeCount > 0 && (
              <span className="absolute -right-0.5 top-0 rounded-pill bg-cta px-1.5 py-px text-[9px] font-semibold text-white">
                {badgeCount}
              </span>
            )}
          </div>
        );
        return t.path ? (
          <Link key={t.label} href={adminHref(slug, t.path)} className="cursor-pointer no-underline">
            {content}
          </Link>
        ) : (
          <button key={t.label} type="button" className="cursor-pointer border-0 bg-transparent">
            {content}
          </button>
        );
      })}
    </nav>
  );
}

type Props = {
  active:   AdminNavKey;
  children: React.ReactNode;
  topBarSubtitle?: string;
  dayLabel?: string;
  dateLabel?: string;
};

export async function ClinicAppLayout({ active, children, topBarSubtitle, dayLabel, dateLabel }: Props) {
  const [user, lookups, memberships, urlSlug, activeMembership, badges] = await Promise.all([
    getSignedInClinicUser(),
    getBookingLookups(),
    getMyClinicMemberships(),
    getActiveClinicSlug(),
    getActiveMembership(),
    getAdminSidebarBadges(),
  ]);
  // Active-clinic role drives nav gating (a user can have different roles per
  // clinic). Fall back to the platform/display role for superadmins.
  const navRole: StaffRole | "superadmin" | null =
    activeMembership?.role ?? (user?.role === "superadmin" ? "superadmin" : null);
  // Doctors book only for themselves — lock the New Appointment doctor field.
  // `undefined` for admins/receptionists (no restriction).
  const restrictToDoctorId =
    activeMembership?.role === "doctor" ? activeMembership.doctorId : undefined;
  // The URL slug (set by middleware on /[slug]/admin/*) drives which clinic
  // the sidebar shows. Pages don't have to pass it — every admin page lives
  // under the same /[slug]/ root, so the header is always set when this
  // layout renders.
  const slug = urlSlug ?? memberships[0]?.slug ?? "";
  const membership = memberships.find((m) => m.slug === slug);
  const clinic     = membership ? await loadClinicHeader(membership.clinicId) : null;
  return (
    <div className="flex min-h-screen items-stretch bg-[#F4F5F7]">
      <ClinicSidebar
        active={active}
        user={user}
        clinic={clinic}
        slug={slug}
        memberships={memberships}
        navRole={navRole}
        badges={badges}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <ClinicTopBar subtitle={topBarSubtitle} dayLabel={dayLabel} dateLabel={dateLabel} lookups={lookups} restrictToDoctorId={restrictToDoctorId} />
        <main className="flex-1 pb-24 md:pb-10">{children}</main>
      </div>
      <ClinicMobileTabBar active={active} slug={slug} badges={badges} />
    </div>
  );
}
