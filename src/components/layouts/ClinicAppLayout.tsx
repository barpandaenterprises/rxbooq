import Link from "next/link";
import { NewAppointmentDialog } from "@/components/compositions/NewAppointmentDialog";

export type AdminNavKey =
  | "Today"
  | "Calendar"
  | "Patients"
  | "Doctors"
  | "Messages"
  | "Analytics"
  | "Content"
  | "Settings";

const NAV_ITEMS: Array<{
  ic: string;
  label: AdminNavKey;
  href: string;
  badge?: string;
  badgeCoral?: boolean;
}> = [
  { ic: "fa-calendar-day", label: "Today", href: "/admin/today", badge: "12" },
  { ic: "fa-calendar-alt", label: "Calendar", href: "/admin/calendar" },
  { ic: "fa-users", label: "Patients", href: "/admin/patients" },
  { ic: "fa-user-md", label: "Doctors", href: "/admin/doctors" },
  { ic: "fa-comments", label: "Messages", href: "/admin/messages", badge: "3", badgeCoral: true },
  { ic: "fa-chart-line", label: "Analytics", href: "/admin/analytics" },
  { ic: "fa-file-alt", label: "Content", href: "#" },
  { ic: "fa-cog", label: "Settings", href: "#" },
];

const MOBILE_TABS: Array<{ ic: string; label: string; href?: string; key: AdminNavKey | "More"; badge?: number }> = [
  { ic: "fa-calendar-day", label: "Today", href: "/admin/today", key: "Today" },
  { ic: "fa-calendar-alt", label: "Calendar", href: "/admin/calendar", key: "Calendar" },
  { ic: "fa-users", label: "Patients", href: "/admin/patients", key: "Patients" },
  { ic: "fa-comments", label: "Messages", href: "/admin/messages", key: "Messages", badge: 3 },
  { ic: "fa-ellipsis-h", label: "More", key: "More" },
];

function ClinicSidebar({ active }: { active: AdminNavKey }) {
  return (
    <aside className="hidden w-60 flex-none flex-col bg-[#0a2742] p-3 text-[#c9d4df] md:flex">
      <div className="mb-3.5 flex items-center gap-2.5 border-b border-white/10 px-2 pb-4 pt-1">
        <span className="grid h-9 w-9 flex-none place-items-center rounded-md bg-brand text-[16px] text-white">
          <i className="fas fa-tooth" />
        </span>
        <div>
          <div className="text-[14px] font-semibold leading-4 text-white">Mahakur Poly</div>
          <div className="text-[11px] text-[#8aa0b6]">Sambalpur · Admin</div>
        </div>
      </div>

      <nav className="flex flex-1 flex-col gap-0.5">
        {NAV_ITEMS.map((it) => {
          const isActive = it.label === active;
          return (
            <Link
              key={it.label}
              href={it.href}
              className={
                "relative flex items-center gap-3 rounded-md px-3 py-2.5 text-[14px] no-underline " +
                (isActive
                  ? "bg-brand/20 font-medium text-white"
                  : "font-normal text-[#c9d4df] hover:bg-white/5")
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
                      : "bg-white/10 text-white")
                  }
                >
                  {it.badge}
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
          RR
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-[13px] font-medium text-white">Reema R.</div>
          <div className="text-[11px] text-[#8aa0b6]">Receptionist</div>
        </div>
        <i className="fas fa-ellipsis-h text-[12px] text-[#8aa0b6]" />
      </div>
    </aside>
  );
}

function ClinicTopBar({ subtitle, dayLabel, dateLabel }: { subtitle?: string; dayLabel?: string; dateLabel?: string }) {
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

function ClinicMobileTabBar({ active }: { active: AdminNavKey }) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 flex justify-around border-t border-border bg-white pt-2 pb-3 shadow-[0_-4px_12px_rgba(0,0,0,0.05)] md:hidden">
      {MOBILE_TABS.map((t) => {
        const isActive = t.key === active;
        const content = (
          <div className="relative flex flex-col items-center gap-0.5 px-2 py-1">
            <i className={`fas ${t.ic} text-[18px] ${isActive ? "text-cta" : "text-muted"}`} />
            <span className={`text-[10px] ${isActive ? "font-semibold text-cta" : "text-muted"}`}>{t.label}</span>
            {t.badge && (
              <span className="absolute -right-0.5 top-0 rounded-pill bg-cta px-1.5 py-px text-[9px] font-semibold text-white">
                {t.badge}
              </span>
            )}
          </div>
        );
        return t.href ? (
          <Link key={t.label} href={t.href} className="cursor-pointer no-underline">
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
  active: AdminNavKey;
  children: React.ReactNode;
  topBarSubtitle?: string;
  dayLabel?: string;
  dateLabel?: string;
};

export function ClinicAppLayout({ active, children, topBarSubtitle, dayLabel, dateLabel }: Props) {
  return (
    <div className="flex min-h-screen items-stretch bg-[#F4F5F7]">
      <ClinicSidebar active={active} />
      <div className="flex min-w-0 flex-1 flex-col">
        <ClinicTopBar subtitle={topBarSubtitle} dayLabel={dayLabel} dateLabel={dateLabel} />
        <main className="flex-1 pb-24 md:pb-10">{children}</main>
      </div>
      <ClinicMobileTabBar active={active} />
    </div>
  );
}
