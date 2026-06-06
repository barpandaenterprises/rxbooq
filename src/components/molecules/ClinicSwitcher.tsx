"use client";

import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import Link from "next/link";

export type ClinicMembership = {
  clinicId: string;
  slug:     string;
  name:     string;
  role:     "clinic_admin" | "doctor" | "receptionist";
};

type Props = {
  memberships:  ClinicMembership[];
  currentSlug:  string;
  /** Optional city subtitle (e.g. "Bangalore") for the currently-active clinic. */
  currentCity?: string | null;
  /** Display label for the role under the clinic name in the sidebar header. */
  roleLabel:    string;
};

/**
 * Sidebar brand block + multi-clinic switcher.
 *
 * Single-membership users see a static block (no dropdown affordance).
 * Multi-membership users get a Radix DropdownMenu — selecting another clinic
 * navigates to /[slug]/admin/today.
 */
export function ClinicSwitcher({ memberships, currentSlug, currentCity, roleLabel }: Props) {
  const current = memberships.find((m) => m.slug === currentSlug);
  const others  = memberships.filter((m) => m.slug !== currentSlug);
  const name    = current?.name ?? "(no clinic)";
  const subtitle = [currentCity, roleLabel].filter(Boolean).join(" · ");

  if (others.length === 0) {
    return (
      <div className="flex items-center gap-2.5 border-b border-white/10 px-2 pb-4 pt-1">
        <span className="grid h-9 w-9 flex-none place-items-center rounded-md bg-brand text-[16px] text-white">
          <i className="fas fa-clinic-medical" />
        </span>
        <div className="min-w-0">
          <div className="truncate text-[14px] font-semibold leading-4 text-white">{name}</div>
          <div className="truncate text-[11px] text-[#8aa0b6]">{subtitle || roleLabel}</div>
        </div>
      </div>
    );
  }

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          className="flex w-full items-center gap-2.5 border-b border-white/10 px-2 pb-4 pt-1 text-left hover:bg-white/5"
        >
          <span className="grid h-9 w-9 flex-none place-items-center rounded-md bg-brand text-[16px] text-white">
            <i className="fas fa-clinic-medical" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="truncate text-[14px] font-semibold leading-4 text-white">{name}</div>
            <div className="truncate text-[11px] text-[#8aa0b6]">{subtitle || roleLabel}</div>
          </div>
          <i className="fas fa-chevron-down text-[10px] text-[#8aa0b6]" />
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="start"
          sideOffset={4}
          className="z-50 min-w-[220px] rounded-md border border-border bg-white p-1 shadow-lg"
        >
          <div className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-muted">
            Switch clinic
          </div>
          {others.map((m) => (
            <DropdownMenu.Item key={m.clinicId} asChild>
              <Link
                href={`/${m.slug}/admin/today`}
                className="flex cursor-pointer items-center gap-2 rounded px-3 py-2 text-[13px] text-heading no-underline outline-none data-[highlighted]:bg-surface-muted"
              >
                <span className="grid h-7 w-7 flex-none place-items-center rounded bg-[#E6F1FA] text-[10px] font-bold text-[#0E5087]">
                  {m.name.split(/\s+/).slice(0, 2).map((p) => p[0] ?? "").join("").toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">{m.name}</div>
                  <div className="text-[10px] text-muted">{labelForRole(m.role)}</div>
                </div>
              </Link>
            </DropdownMenu.Item>
          ))}
          <DropdownMenu.Separator className="my-1 h-px bg-border" />
          <DropdownMenu.Item asChild>
            <Link
              href="/get-started"
              className="flex cursor-pointer items-center gap-2 rounded px-3 py-2 text-[12px] text-link-hover no-underline outline-none data-[highlighted]:bg-surface-muted"
            >
              <i className="fas fa-plus text-[10px]" /> Add another clinic
            </Link>
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

function labelForRole(role: ClinicMembership["role"]): string {
  switch (role) {
    case "clinic_admin": return "Admin";
    case "doctor":       return "Doctor";
    case "receptionist": return "Receptionist";
  }
}
