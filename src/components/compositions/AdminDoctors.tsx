"use client";

import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import * as Popover from "@radix-ui/react-popover";
import Link from "next/link";
import { useMemo, useState } from "react";
import { AddDoctorDialog } from "@/components/molecules/AddDoctorDialog";
import {
  DOCTORS,
  SPECIALTIES,
  STATUS_META,
  summariseSchedule,
  type Doctor,
  type DoctorStatus,
  type Specialty,
} from "@/lib/doctors-data";

type SortKey = "name" | "experience" | "patients" | "rating";
type SortDir = "asc" | "desc";

const STATUS_FILTERS: Array<{ value: DoctorStatus | "all"; label: string }> = [
  { value: "all",      label: "All statuses" },
  { value: "active",   label: "Active" },
  { value: "on_leave", label: "On leave" },
  { value: "inactive", label: "Inactive" },
];

export function AdminDoctors() {
  const [doctors, setDoctors] = useState<Doctor[]>(DOCTORS);
  const [search, setSearch] = useState("");
  const [specialty, setSpecialty] = useState<Specialty | "all">("all");
  const [statusFilter, setStatusFilter] = useState<DoctorStatus | "all">("all");
  const [visitingFilter, setVisitingFilter] = useState<"all" | "everyday" | "visiting">("all");
  const [sortBy, setSortBy] = useState<SortKey>("experience");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [specOpen, setSpecOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return doctors.filter((d) => {
      if (q && !d.name.toLowerCase().includes(q) && !d.qualifications.join(" ").toLowerCase().includes(q) && !d.primarySpecialty.toLowerCase().includes(q)) return false;
      if (specialty !== "all" && d.primarySpecialty !== specialty) return false;
      if (statusFilter !== "all" && d.status !== statusFilter) return false;
      if (visitingFilter !== "all") {
        if (visitingFilter === "everyday" && d.visiting) return false;
        if (visitingFilter === "visiting" && !d.visiting) return false;
      }
      return true;
    });
  }, [doctors, search, specialty, statusFilter, visitingFilter]);

  const sorted = useMemo(() => {
    const arr = [...filtered];
    const dir = sortDir === "asc" ? 1 : -1;
    arr.sort((a, b) => {
      switch (sortBy) {
        case "name":       return dir * a.name.localeCompare(b.name);
        case "experience": return dir * (a.stats.yearsExperience - b.stats.yearsExperience);
        case "patients":   return dir * (a.stats.patientsServed - b.stats.patientsServed);
        case "rating":     return dir * (a.stats.avgRating - b.stats.avgRating);
      }
    });
    return arr;
  }, [filtered, sortBy, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (sortBy === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(key);
      setSortDir(key === "name" ? "asc" : "desc");
    }
  };

  const clearAll = () => {
    setSearch("");
    setSpecialty("all");
    setStatusFilter("all");
    setVisitingFilter("all");
  };

  const activeFilters =
    (specialty !== "all" ? 1 : 0) +
    (statusFilter !== "all" ? 1 : 0) +
    (visitingFilter !== "all" ? 1 : 0);

  const handleAdded = (d: Doctor) => {
    setDoctors((prev) => [d, ...prev]);
  };

  const counts = {
    total: doctors.length,
    active: doctors.filter((d) => d.status === "active").length,
    visiting: doctors.filter((d) => d.visiting).length,
  };

  return (
    <div className="px-5 pt-7 md:px-8 md:pt-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-[28px] font-semibold leading-9 text-heading md:text-[32px]">
            Doctors
          </h2>
          <p className="mt-1 text-[14px] text-muted">
            <strong className="text-heading">{counts.total}</strong> on the team
            <span className="mx-2 text-[#9aa9b8]">·</span>
            {counts.active} active
            <span className="mx-2 text-[#9aa9b8]">·</span>
            {counts.visiting} visiting consultant{counts.visiting === 1 ? "" : "s"}
          </p>
        </div>
        <div className="flex gap-2.5">
          <button
            type="button"
            className="hidden items-center gap-2 rounded-md border-[1.5px] border-link-hover bg-transparent px-3.5 py-2 text-[14px] font-medium text-link-hover hover:bg-link-hover hover:text-white md:inline-flex"
          >
            <i className="fas fa-file-export" /> Export CSV
          </button>
          <AddDoctorDialog
            onAdded={handleAdded}
            trigger={
              <button
                type="button"
                className="inline-flex cursor-pointer items-center gap-2 rounded-md bg-cta px-4 py-2 text-[14px] font-medium text-cta-fg hover:bg-[#d92843]"
              >
                <i className="fas fa-user-md" /> Add doctor
              </button>
            }
          />
        </div>
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-center gap-2.5">
        <div className="flex w-[280px] items-center gap-2.5 rounded-md border border-border bg-white px-3.5 py-2.5 focus-within:border-link-hover">
          <i className="fas fa-search text-[13px] text-[#9aa9b8]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, qual or specialty…"
            className="w-full bg-transparent text-[14px] text-heading outline-none placeholder:text-[#9aa9b8]"
          />
          {search && (
            <button type="button" onClick={() => setSearch("")} className="text-[12px] text-muted" aria-label="Clear search">
              <i className="fas fa-times" />
            </button>
          )}
        </div>

        <Popover.Root open={specOpen} onOpenChange={setSpecOpen}>
          <Popover.Trigger asChild>
            <button
              type="button"
              className={
                "inline-flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-[13px] " +
                (specialty !== "all"
                  ? "border-[1.5px] border-brand bg-[#E6F1FA] font-medium text-link-hover"
                  : "border border-border bg-white text-heading")
              }
            >
              <span className="text-[#9aa9b8]">Specialty:</span>
              <span>{specialty === "all" ? "All" : specialty}</span>
              <i className="fas fa-chevron-down text-[10px] text-[#9aa9b8]" />
            </button>
          </Popover.Trigger>
          <Popover.Portal>
            <Popover.Content align="start" sideOffset={6} className="z-50 w-[260px] rounded-md border border-border bg-white p-1.5 shadow-md">
              <button
                type="button"
                onClick={() => { setSpecialty("all"); setSpecOpen(false); }}
                className={"flex w-full items-center justify-between rounded-sm px-2.5 py-2 text-left text-[13px] hover:bg-surface-muted " + (specialty === "all" ? "font-semibold text-link-hover" : "text-heading")}
              >
                All specialties
                {specialty === "all" && <i className="fas fa-check text-[11px] text-link-hover" />}
              </button>
              {SPECIALTIES.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => { setSpecialty(s); setSpecOpen(false); }}
                  className={"flex w-full items-center justify-between rounded-sm px-2.5 py-2 text-left text-[13px] hover:bg-surface-muted " + (specialty === s ? "font-semibold text-link-hover" : "text-heading")}
                >
                  {s}
                  {specialty === s && <i className="fas fa-check text-[11px] text-link-hover" />}
                </button>
              ))}
            </Popover.Content>
          </Popover.Portal>
        </Popover.Root>

        <Popover.Root open={statusOpen} onOpenChange={setStatusOpen}>
          <Popover.Trigger asChild>
            <button
              type="button"
              className={
                "inline-flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-[13px] " +
                (statusFilter !== "all"
                  ? "border-[1.5px] border-brand bg-[#E6F1FA] font-medium text-link-hover"
                  : "border border-border bg-white text-heading")
              }
            >
              <span className="text-[#9aa9b8]">Status:</span>
              <span>{STATUS_FILTERS.find((s) => s.value === statusFilter)?.label}</span>
              <i className="fas fa-chevron-down text-[10px] text-[#9aa9b8]" />
            </button>
          </Popover.Trigger>
          <Popover.Portal>
            <Popover.Content align="start" sideOffset={6} className="z-50 w-[200px] rounded-md border border-border bg-white p-1.5 shadow-md">
              {STATUS_FILTERS.map((s) => (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => { setStatusFilter(s.value); setStatusOpen(false); }}
                  className={"flex w-full items-center justify-between rounded-sm px-2.5 py-2 text-left text-[13px] hover:bg-surface-muted " + (statusFilter === s.value ? "font-semibold text-link-hover" : "text-heading")}
                >
                  {s.label}
                  {statusFilter === s.value && <i className="fas fa-check text-[11px] text-link-hover" />}
                </button>
              ))}
            </Popover.Content>
          </Popover.Portal>
        </Popover.Root>

        <div className="inline-flex rounded-md border border-border bg-white p-0.5">
          {(["all", "everyday", "visiting"] as const).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setVisitingFilter(v)}
              className={
                "cursor-pointer rounded-sm px-3 py-1.5 text-[12px] font-medium capitalize " +
                (visitingFilter === v ? "bg-brand text-white" : "text-heading hover:bg-surface-muted")
              }
            >
              {v === "all" ? "All" : v}
            </button>
          ))}
        </div>

        {(activeFilters > 0 || search.length > 0) && (
          <button type="button" onClick={clearAll} className="text-[13px] text-link-hover underline underline-offset-[3px]">
            Clear filters
          </button>
        )}
      </div>

      {/* Desktop table */}
      <div className="hidden overflow-hidden rounded-[12px] border border-border bg-white md:block">
        <div className="flex items-center gap-3 border-b border-border bg-surface-muted px-4 py-2.5 text-[13px]">
          <i className="fas fa-info-circle text-[13px] text-link-hover" />
          <span>
            <strong>{sorted.length}</strong> of {doctors.length} doctors
          </span>
        </div>

        <table className="w-full table-fixed border-collapse">
          <colgroup>
            <col />
            <col style={{ width: 180 }} />
            <col style={{ width: 130 }} />
            <col style={{ width: 150 }} />
            <col style={{ width: 110 }} />
            <col style={{ width: 100 }} />
            <col style={{ width: 60 }} />
          </colgroup>
          <thead>
            <tr className="border-b border-border bg-surface-muted">
              <SortHeader label="Doctor"      sortKey="name"       currentKey={sortBy} dir={sortDir} onClick={toggleSort} />
              <th className="px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-[#9aa9b8]">Specialty</th>
              <th className="px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-[#9aa9b8]">Status</th>
              <th className="px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-[#9aa9b8]">Schedule</th>
              <SortHeader label="Experience"  sortKey="experience" currentKey={sortBy} dir={sortDir} onClick={toggleSort} align="right" />
              <SortHeader label="Rating"      sortKey="rating"     currentKey={sortBy} dir={sortDir} onClick={toggleSort} align="right" />
              <th />
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center">
                  <div className="inline-flex flex-col items-center gap-2 text-[13px] text-muted">
                    <i className="fas fa-search text-[24px] text-[#cdd9e4]" />
                    No doctors match these filters.
                    <button type="button" onClick={clearAll} className="text-[13px] text-link-hover underline">
                      Clear all filters
                    </button>
                  </div>
                </td>
              </tr>
            ) : (
              sorted.map((d) => <DoctorRow key={d.id} d={d} />)
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="flex flex-col gap-2.5 md:hidden">
        {sorted.length === 0 ? (
          <div className="rounded-[12px] border border-border bg-white p-8 text-center text-[13px] text-muted">
            No doctors match these filters.
          </div>
        ) : (
          sorted.map((d) => <DoctorCardMobile key={d.id} d={d} />)
        )}
      </div>
    </div>
  );
}

function DoctorRow({ d }: { d: Doctor }) {
  const status = STATUS_META[d.status];
  return (
    <tr className="border-b border-[#F4F5F7] bg-white hover:bg-[#FAFAFB]">
      <td className="px-3 py-3 pl-4">
        <Link href={`/admin/doctors/${d.id}`} className="flex items-center gap-2.5 no-underline">
          <span
            className="grid h-10 w-10 flex-none place-items-center rounded-pill text-[13px] font-semibold"
            style={{ background: d.avatarBg, color: d.avatarFg }}
          >
            {d.initials}
          </span>
          <div>
            <div className="text-[14px] font-semibold text-heading">{d.name}</div>
            <div className="text-[11px] text-muted">{d.qualifications.join(", ")}</div>
          </div>
        </Link>
      </td>
      <td className="px-3 py-3">
        <div className="text-[13px] text-heading">{d.primarySpecialty}</div>
        {d.visiting && (
          <div className="mt-0.5 text-[11px] text-[#7a5c2b]">
            <i className="fas fa-suitcase mr-1 text-[9px]" />
            Visiting
          </div>
        )}
      </td>
      <td className="px-3 py-3">
        <span
          className="inline-flex items-center gap-1.5 rounded-pill px-2.5 py-0.5 text-[11px] font-semibold"
          style={{ background: status.bg, color: status.fg }}
        >
          <span className="h-1.5 w-1.5 rounded-pill" style={{ background: status.dot }} />
          {status.label}
        </span>
      </td>
      <td className="px-3 py-3 text-[13px] text-muted">{summariseSchedule(d.schedule)}</td>
      <td className="px-3 py-3 text-right text-[13px] text-heading">{d.stats.yearsExperience} yrs</td>
      <td className="px-3 py-3 text-right text-[13px]">
        {d.stats.reviewCount > 0 ? (
          <span className="inline-flex items-center gap-1">
            <span className="text-[#F4B400]">★</span>
            <span className="font-semibold text-heading">{d.stats.avgRating.toFixed(1)}</span>
            <span className="text-[10px] text-[#9aa9b8]">({d.stats.reviewCount})</span>
          </span>
        ) : (
          <span className="text-[#cdd9e4]">—</span>
        )}
      </td>
      <td className="px-3 py-3 pr-4 text-right">
        <DoctorRowMenu doctorId={d.id} doctorName={d.name} />
      </td>
    </tr>
  );
}

function DoctorCardMobile({ d }: { d: Doctor }) {
  const status = STATUS_META[d.status];
  return (
    <Link
      href={`/admin/doctors/${d.id}`}
      className="flex items-start gap-3 rounded-[12px] border border-border bg-white p-3.5 no-underline"
    >
      <span
        className="grid h-11 w-11 flex-none place-items-center rounded-pill text-[14px] font-semibold"
        style={{ background: d.avatarBg, color: d.avatarFg }}
      >
        {d.initials}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <div className="text-[14px] font-semibold text-heading">{d.name}</div>
          <span
            className="inline-flex items-center gap-1 rounded-pill px-2 py-0.5 text-[10px] font-semibold"
            style={{ background: status.bg, color: status.fg }}
          >
            <span className="h-1 w-1 rounded-pill" style={{ background: status.dot }} />
            {status.label}
          </span>
        </div>
        <div className="mt-0.5 text-[11px] text-muted">{d.qualifications.join(", ")}</div>
        <div className="mt-1 text-[12px] text-heading">{d.primarySpecialty}</div>
        <div className="mt-1 flex items-center gap-3 text-[11px] text-[#9aa9b8]">
          <span><i className="fas fa-calendar-alt mr-1" />{summariseSchedule(d.schedule)}</span>
          <span><i className="fas fa-clock mr-1" />{d.stats.yearsExperience} yrs</span>
        </div>
      </div>
    </Link>
  );
}

function DoctorRowMenu({ doctorId, doctorName }: { doctorId: string; doctorName: string }) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          aria-label={`Actions for ${doctorName}`}
          className="grid h-8 w-8 cursor-pointer place-items-center rounded-md border border-border bg-white text-muted hover:text-link-hover"
        >
          <i className="fas fa-ellipsis-v text-[13px]" />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content align="end" sideOffset={4} className="z-50 w-[200px] rounded-md border border-border bg-white p-1.5 shadow-md">
          <DropdownMenu.Item asChild>
            <Link
              href={`/admin/doctors/${doctorId}`}
              className="flex cursor-pointer items-center gap-2.5 rounded-sm px-2.5 py-2 text-[13px] text-heading no-underline outline-none hover:bg-surface-muted"
            >
              <i className="fas fa-eye w-4 text-center text-[12px] text-muted" />
              View profile
            </Link>
          </DropdownMenu.Item>
          <DropdownMenu.Item className="flex cursor-pointer items-center gap-2.5 rounded-sm px-2.5 py-2 text-[13px] text-heading outline-none hover:bg-surface-muted">
            <i className="fas fa-pen w-4 text-center text-[12px] text-muted" />
            Edit details
          </DropdownMenu.Item>
          <DropdownMenu.Item className="flex cursor-pointer items-center gap-2.5 rounded-sm px-2.5 py-2 text-[13px] text-heading outline-none hover:bg-surface-muted">
            <i className="fas fa-calendar-times w-4 text-center text-[12px] text-muted" />
            Block dates
          </DropdownMenu.Item>
          <DropdownMenu.Item className="flex cursor-pointer items-center gap-2.5 rounded-sm px-2.5 py-2 text-[13px] text-heading outline-none hover:bg-surface-muted">
            <i className="fab fa-whatsapp w-4 text-center text-[12px] text-[#25D366]" />
            Send WhatsApp
          </DropdownMenu.Item>
          <DropdownMenu.Item className="flex cursor-pointer items-center gap-2.5 rounded-sm px-2.5 py-2 text-[13px] text-cta outline-none hover:bg-surface-muted">
            <i className="fas fa-user-slash w-4 text-center text-[12px] text-cta" />
            Deactivate
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

function SortHeader({
  label,
  sortKey,
  currentKey,
  dir,
  onClick,
  align = "left",
}: {
  label: string;
  sortKey: SortKey;
  currentKey: SortKey;
  dir: SortDir;
  onClick: (k: SortKey) => void;
  align?: "left" | "right";
}) {
  const active = currentKey === sortKey;
  return (
    <th
      className={
        "px-3 py-3 text-[11px] font-semibold uppercase tracking-[0.06em] text-[#9aa9b8] " +
        (align === "right" ? "text-right" : "text-left")
      }
    >
      <button
        type="button"
        onClick={() => onClick(sortKey)}
        className={
          "inline-flex cursor-pointer items-center gap-1 transition-colors hover:text-link-hover " +
          (active ? "text-link-hover" : "")
        }
      >
        {label}
        <i
          className={
            "text-[9px] " +
            (active
              ? dir === "asc"
                ? "fas fa-sort-up text-link-hover"
                : "fas fa-sort-down text-link-hover"
              : "fas fa-sort text-[#cdd9e4]")
          }
        />
      </button>
    </th>
  );
}
