import Link from "next/link";

export type SettingsTabKey = "team" | "departments";

const TABS: Array<{ key: SettingsTabKey; label: string; href: string; icon: string }> = [
  { key: "team",        label: "Team",        href: "/admin/settings/team",        icon: "fa-users" },
  { key: "departments", label: "Departments", href: "/admin/settings/departments", icon: "fa-sitemap" },
];

export function SettingsTabs({ active }: { active: SettingsTabKey }) {
  return (
    <nav className="mb-5 flex items-center gap-1 border-b border-border text-small">
      {TABS.map((t) => {
        const isActive = t.key === active;
        return (
          <Link
            key={t.key}
            href={t.href}
            className={
              "inline-flex items-center gap-2 border-b-2 px-3 py-2 -mb-px no-underline " +
              (isActive
                ? "border-brand font-medium text-heading"
                : "border-transparent text-muted hover:text-heading")
            }
          >
            <i className={`fas ${t.icon} text-[12px]`} />
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
