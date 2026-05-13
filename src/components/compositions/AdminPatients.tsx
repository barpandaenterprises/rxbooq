"use client";

import * as Popover from "@radix-ui/react-popover";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import Link from "next/link";
import { useMemo, useState } from "react";
import type { PatientLang, PatientRow } from "@/lib/data/admin-patients";

type Lang = PatientLang;
type Patient = PatientRow;

const ALL_TAGS = ["VIP", "New", "No-show", "Root canal", "Implants", "Pediatric", "Braces", "Cancelled"];

const TAG_COLOR: Record<string, { bg: string; fg: string }> = {
  "VIP":         { bg: "#FFE7EC", fg: "#EE344E" },
  "Root canal":  { bg: "#E6F1FA", fg: "#0168B3" },
  "New":         { bg: "#E6F4EC", fg: "#3a8b5e" },
  "No-show":     { bg: "#FFF1D6", fg: "#7a5c2b" },
  "Implants":    { bg: "#E6F1FA", fg: "#0E5087" },
  "Pediatric":   { bg: "#F4E5FA", fg: "#6b3aa1" },
  "Braces":      { bg: "#FFF1D6", fg: "#7a5c2b" },
  "Cancelled":   { bg: "#F4F5F7", fg: "#9aa9b8" },
};

const LANG_PILL: Record<Lang, { bg: string; fg: string }> = {
  EN: { bg: "#F4F5F7", fg: "#575757" },
  HI: { bg: "#FFF1D6", fg: "#7a5c2b" },
  OR: { bg: "#E6F1FA", fg: "#0E5087" },
};

const LANG_OPTIONS: Array<{ value: Lang | "all"; label: string }> = [
  { value: "all", label: "All languages" },
  { value: "EN", label: "English" },
  { value: "HI", label: "हिंदी" },
  { value: "OR", label: "ଓଡ଼ିଆ" },
];

const VISIT_OPTIONS: Array<{ value: VisitWindow; label: string }> = [
  { value: "any",  label: "Any time" },
  { value: "30d",  label: "Last 30 days" },
  { value: "90d",  label: "Last 90 days" },
  { value: "180d", label: "Last 6 months" },
];

type VisitWindow = "any" | "30d" | "90d" | "180d";
type SortKey = "name" | "lastVisit" | "visits" | "ltv";
type SortDir = "asc" | "desc";

const PAGE_SIZE = 5;

function visitWithinWindow(iso: string, window: VisitWindow): boolean {
  if (window === "any") return true;
  const days = window === "30d" ? 30 : window === "90d" ? 90 : 180;
  const visit = new Date(iso);
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  return visit >= cutoff;
}

function TagChip({ t }: { t: string }) {
  const c = TAG_COLOR[t] ?? { bg: "#F4F5F7", fg: "#575757" };
  return (
    <span
      className="rounded-pill px-2 py-0.5 text-[11px] font-semibold"
      style={{ background: c.bg, color: c.fg }}
    >
      {t}
    </span>
  );
}

function LangPill({ l }: { l: Lang }) {
  const c = LANG_PILL[l];
  return (
    <span
      className="rounded-sm px-2 py-0.5 text-[11px] font-semibold"
      style={{ background: c.bg, color: c.fg }}
    >
      {l}
    </span>
  );
}

function PatientRowMenu({ patientId, patientName }: { patientId: string; patientName: string }) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          aria-label={`Actions for ${patientName}`}
          className="grid h-8 w-8 cursor-pointer place-items-center rounded-md border border-border bg-white text-muted hover:text-link-hover"
        >
          <i className="fas fa-ellipsis-v text-[13px]" />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={4}
          className="z-50 w-[200px] rounded-md border border-border bg-white p-1.5 shadow-md"
        >
          <DropdownMenu.Item asChild>
            <Link
              href={`/admin/patients/${patientId}`}
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
            <i className="fab fa-whatsapp w-4 text-center text-[12px] text-[#25D366]" />
            Send WhatsApp
          </DropdownMenu.Item>
          <DropdownMenu.Item className="flex cursor-pointer items-center gap-2.5 rounded-sm px-2.5 py-2 text-[13px] text-heading outline-none hover:bg-surface-muted">
            <i className="fas fa-tag w-4 text-center text-[12px] text-muted" />
            Add tag
          </DropdownMenu.Item>
          <DropdownMenu.Item className="flex cursor-pointer items-center gap-2.5 rounded-sm px-2.5 py-2 text-[13px] text-cta outline-none hover:bg-surface-muted">
            <i className="fas fa-archive w-4 text-center text-[12px] text-cta" />
            Archive
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

function FilterPill({
  label,
  value,
  active,
  open,
  onOpenChange,
  children,
}: {
  label: string;
  value: string;
  active?: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}) {
  return (
    <Popover.Root open={open} onOpenChange={onOpenChange}>
      <Popover.Trigger asChild>
        <button
          type="button"
          className={
            "inline-flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-[13px] " +
            (active
              ? "border-[1.5px] border-brand bg-[#E6F1FA] font-medium text-link-hover"
              : "border border-border bg-white text-heading hover:border-link-hover")
          }
        >
          <span className="text-[#9aa9b8]">{label}:</span>
          <span>{value}</span>
          <i className="fas fa-chevron-down text-[10px] text-[#9aa9b8]" />
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="start"
          sideOffset={6}
          className="z-50 w-[220px] rounded-md border border-border bg-white p-1.5 shadow-md"
        >
          {children}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

export function AdminPatients({ initialPatients }: { initialPatients: Patient[] }) {
  const patients = initialPatients;
  const [search, setSearch] = useState("");
  const [lang, setLang] = useState<Lang | "all">("all");
  const [tags, setTags] = useState<Set<string>>(new Set());
  const [visitWindow, setVisitWindow] = useState<VisitWindow>("any");
  const [waOnly, setWaOnly] = useState(false);
  const [sortBy, setSortBy] = useState<SortKey>("lastVisit");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [page, setPage] = useState(1);

  const [openLang, setOpenLang] = useState(false);
  const [openTags, setOpenTags] = useState(false);
  const [openVisit, setOpenVisit] = useState(false);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const qDigits = search.replace(/\D/g, "");
    return patients.filter((p) => {
      if (q.length > 0) {
        const matchesName = p.name.toLowerCase().includes(q);
        const matchesPhone = qDigits.length > 0 && p.phone.replace(/\D/g, "").includes(qDigits);
        if (!matchesName && !matchesPhone) return false;
      }
      if (lang !== "all" && p.lang !== lang) return false;
      if (tags.size > 0 && !p.tags.some((t) => tags.has(t))) return false;
      if (visitWindow !== "any" && !p.lastVisit) return false;
      if (!visitWithinWindow(p.lastVisit, visitWindow)) return false;
      if (waOnly && !p.wa) return false;
      return true;
    });
  }, [patients, search, lang, tags, visitWindow, waOnly]);

  const sorted = useMemo(() => {
    const arr = [...filtered];
    const dir = sortDir === "asc" ? 1 : -1;
    arr.sort((a, b) => {
      switch (sortBy) {
        case "name":      return dir * a.name.localeCompare(b.name);
        case "lastVisit": return dir * a.lastVisit.localeCompare(b.lastVisit);
        case "visits":    return dir * (a.visits - b.visits);
        case "ltv":       return dir * (a.ltv - b.ltv);
      }
    });
    return arr;
  }, [filtered, sortBy, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * PAGE_SIZE;
  const visible = sorted.slice(start, start + PAGE_SIZE);

  const activeFilterCount =
    (lang !== "all" ? 1 : 0) +
    (tags.size > 0 ? 1 : 0) +
    (visitWindow !== "any" ? 1 : 0) +
    (waOnly ? 1 : 0);

  const toggleSort = (key: SortKey) => {
    if (sortBy === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(key);
      setSortDir(key === "name" ? "asc" : "desc");
    }
    setPage(1);
  };

  const toggleTag = (t: string) => {
    setTags((prev) => {
      const next = new Set(prev);
      if (next.has(t)) next.delete(t);
      else next.add(t);
      return next;
    });
    setPage(1);
  };

  const clearAll = () => {
    setSearch("");
    setLang("all");
    setTags(new Set());
    setVisitWindow("any");
    setWaOnly(false);
    setPage(1);
  };

  return (
    <div className="px-5 pt-7 md:px-8 md:pt-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-[28px] font-semibold leading-[36px] text-heading md:text-[32px] md:leading-10">
            Patients
          </h2>
          <div className="mt-1 text-[14px] text-muted">
            <strong className="text-heading">{patients.length} patients</strong>
            <span className="mx-2 text-[#9aa9b8]">·</span>
            18 added this week
            <span className="mx-2 text-[#9aa9b8]">·</span>
            76% on WhatsApp
          </div>
        </div>
        <div className="flex gap-2.5">
          <button
            type="button"
            className="hidden items-center gap-2 rounded-md border-[1.5px] border-link-hover bg-transparent px-3.5 py-2 text-[14px] font-medium text-link-hover hover:bg-link-hover hover:text-white md:inline-flex"
          >
            <i className="fas fa-file-export" /> Export CSV
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-md bg-cta px-4 py-2 text-[14px] font-medium text-cta-fg hover:bg-[#d92843]"
          >
            <i className="fas fa-user-plus" /> Add patient
          </button>
        </div>
      </div>

      {/* Filter row (desktop) */}
      <div className="mb-4 hidden flex-wrap items-center gap-2.5 md:flex">
        <div className="flex w-[280px] items-center gap-2.5 rounded-md border border-border bg-white px-3.5 py-2.5 focus-within:border-link-hover">
          <i className="fas fa-search text-[13px] text-[#9aa9b8]" />
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search by name or phone…"
            className="w-full bg-transparent text-[14px] text-heading outline-none placeholder:text-[#9aa9b8]"
          />
          {search && (
            <button
              type="button"
              onClick={() => {
                setSearch("");
                setPage(1);
              }}
              className="text-[12px] text-muted hover:text-heading"
              aria-label="Clear search"
            >
              <i className="fas fa-times" />
            </button>
          )}
        </div>

        <FilterPill
          label="Language"
          value={LANG_OPTIONS.find((o) => o.value === lang)?.label ?? "All"}
          active={lang !== "all"}
          open={openLang}
          onOpenChange={setOpenLang}
        >
          {LANG_OPTIONS.map((o) => (
            <button
              key={o.value}
              type="button"
              onClick={() => {
                setLang(o.value);
                setOpenLang(false);
                setPage(1);
              }}
              className={
                "flex w-full cursor-pointer items-center justify-between rounded-sm px-2.5 py-2 text-left text-[13px] hover:bg-surface-muted " +
                (lang === o.value ? "font-semibold text-link-hover" : "text-heading")
              }
            >
              {o.label}
              {lang === o.value && <i className="fas fa-check text-[11px] text-link-hover" />}
            </button>
          ))}
        </FilterPill>

        <FilterPill
          label="Tags"
          value={tags.size === 0 ? "Any" : `${tags.size} selected`}
          active={tags.size > 0}
          open={openTags}
          onOpenChange={setOpenTags}
        >
          <div className="mb-1 flex items-center justify-between px-2 pt-1">
            <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[#9aa9b8]">Tags</span>
            {tags.size > 0 && (
              <button
                type="button"
                onClick={() => {
                  setTags(new Set());
                  setPage(1);
                }}
                className="text-[11px] text-link-hover"
              >
                Clear
              </button>
            )}
          </div>
          <div className="max-h-60 overflow-y-auto">
            {ALL_TAGS.map((t) => {
              const checked = tags.has(t);
              return (
                <label
                  key={t}
                  className="flex cursor-pointer items-center gap-2 rounded-sm px-2.5 py-1.5 text-[13px] hover:bg-surface-muted"
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleTag(t)}
                    className="h-4 w-4 cursor-pointer accent-brand"
                  />
                  <TagChip t={t} />
                </label>
              );
            })}
          </div>
        </FilterPill>

        <FilterPill
          label="Last visit"
          value={VISIT_OPTIONS.find((o) => o.value === visitWindow)?.label ?? "Any"}
          active={visitWindow !== "any"}
          open={openVisit}
          onOpenChange={setOpenVisit}
        >
          {VISIT_OPTIONS.map((o) => (
            <button
              key={o.value}
              type="button"
              onClick={() => {
                setVisitWindow(o.value);
                setOpenVisit(false);
                setPage(1);
              }}
              className={
                "flex w-full cursor-pointer items-center justify-between rounded-sm px-2.5 py-2 text-left text-[13px] hover:bg-surface-muted " +
                (visitWindow === o.value ? "font-semibold text-link-hover" : "text-heading")
              }
            >
              {o.label}
              {visitWindow === o.value && <i className="fas fa-check text-[11px] text-link-hover" />}
            </button>
          ))}
        </FilterPill>

        <label className="inline-flex cursor-pointer items-center gap-2.5 rounded-md border border-border bg-white px-3 py-2 text-[13px] text-heading">
          <span
            className={
              "relative h-[18px] w-8 rounded-pill transition-colors " +
              (waOnly ? "bg-[#25D366]" : "bg-[#cdd9e4]")
            }
            onClick={() => {
              setWaOnly((v) => !v);
              setPage(1);
            }}
          >
            <span
              className="absolute top-0.5 h-3.5 w-3.5 rounded-pill bg-white shadow-[0_1px_3px_rgba(0,0,0,0.2)] transition-[left]"
              style={{ left: waOnly ? "16px" : "2px" }}
            />
          </span>
          <i className="fab fa-whatsapp text-[#25D366]" />
          Has WhatsApp opt-in
        </label>

        {(activeFilterCount > 0 || search.length > 0) && (
          <button
            type="button"
            onClick={clearAll}
            className="text-[13px] text-link-hover underline underline-offset-[3px]"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Mobile search + active chips */}
      <div className="mb-3 flex items-center gap-2 md:hidden">
        <div className="flex flex-1 items-center gap-2 rounded-md border border-border bg-white px-3 py-2">
          <i className="fas fa-search text-[12px] text-[#9aa9b8]" />
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search…"
            className="w-full bg-transparent text-[13px] text-heading outline-none"
          />
        </div>
        {(activeFilterCount > 0 || search.length > 0) && (
          <button
            type="button"
            onClick={clearAll}
            className="text-[12px] text-link-hover underline underline-offset-[3px]"
          >
            Clear
          </button>
        )}
      </div>

      {/* Desktop table */}
      <div className="hidden overflow-hidden rounded-[12px] border border-border bg-white md:block">
        <div className="flex items-center gap-3 border-b border-[#FFE7EC] bg-[#FFFAFB] px-4 py-2.5 text-[13px]">
          <i className="fas fa-info-circle text-[13px] text-cta" />
          <span>
            <strong>{visible.length} of {sorted.length}</strong>
            {sorted.length !== patients.length && (
              <> matching · <button type="button" onClick={clearAll} className="text-link-hover underline">show all {patients.length}</button></>
            )}
          </span>
          <span className="ml-auto text-[12px] text-[#9aa9b8]">
            Page {safePage} of {totalPages}
          </span>
        </div>

        <table className="w-full table-fixed border-collapse">
          <colgroup>
            <col style={{ width: 48 }} />
            <col />
            <col style={{ width: 170 }} />
            <col style={{ width: 60 }} />
            <col style={{ width: 120 }} />
            <col style={{ width: 80 }} />
            <col style={{ width: 120 }} />
            <col style={{ width: 200 }} />
            <col style={{ width: 60 }} />
          </colgroup>
          <thead>
            <tr className="border-b border-border bg-surface-muted">
              <th className="px-3 py-3 pl-4 text-left">
                <span className="inline-block h-[18px] w-[18px] rounded-sm border-[1.5px] border-[#cdd9e4]" />
              </th>
              <SortHeader label="Patient"   sortKey="name"      currentKey={sortBy} dir={sortDir} onClick={toggleSort} />
              <th className="px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-[#9aa9b8]">Phone</th>
              <th className="px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-[#9aa9b8]">Lang</th>
              <SortHeader label="Last visit" sortKey="lastVisit" currentKey={sortBy} dir={sortDir} onClick={toggleSort} />
              <SortHeader label="Visits"    sortKey="visits"    currentKey={sortBy} dir={sortDir} onClick={toggleSort} align="right" />
              <SortHeader label="LTV"       sortKey="ltv"       currentKey={sortBy} dir={sortDir} onClick={toggleSort} align="right" />
              <th className="px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-[#9aa9b8]">Tags</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {visible.map((p) => (
              <tr key={p.id} className="border-b border-[#F4F5F7] bg-white hover:bg-[#FAFAFB]">
                <td className="w-8 px-3 py-3.5 pl-4">
                  <span className="inline-block h-[18px] w-[18px] rounded-sm border-[1.5px] border-[#cdd9e4]" />
                </td>
                <td className="px-3 py-3">
                  <div className="flex items-center gap-2.5">
                    <span
                      className="grid h-9 w-9 place-items-center rounded-pill text-[13px] font-semibold"
                      style={{ background: p.avatarBg, color: p.avatarFg }}
                    >
                      {p.initials}
                    </span>
                    <div>
                      <div className="text-[14px] font-semibold text-heading">{p.name}</div>
                      <div className="font-mono text-[11px] text-[#9aa9b8]">{p.displayId}</div>
                    </div>
                  </div>
                </td>
                <td className="px-3 py-3 text-[13px] text-heading">
                  <div className="flex items-center gap-1.5">
                    {p.phone}
                    {p.wa && <i className="fab fa-whatsapp text-[13px] text-[#25D366]" />}
                  </div>
                </td>
                <td className="px-3 py-3"><LangPill l={p.lang} /></td>
                <td className="px-3 py-3 text-[13px] text-muted">{p.lastVisitLabel}</td>
                <td className="px-3 py-3 text-right text-[13px] text-heading">{p.visits}</td>
                <td className="px-3 py-3 text-right text-[13px] font-semibold text-heading">₹{p.ltv.toLocaleString("en-IN")}</td>
                <td className="px-3 py-3">
                  <div className="flex flex-wrap gap-1">
                    {p.tags.length === 0 ? (
                      <span className="text-[12px] text-[#cdd9e4]">—</span>
                    ) : (
                      p.tags.map((t) => <TagChip key={t} t={t} />)
                    )}
                  </div>
                </td>
                <td className="px-3 py-3 pr-4 text-right">
                  <PatientRowMenu patientId={p.id} patientName={p.name} />
                </td>
              </tr>
            ))}
            {visible.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-12 text-center">
                  <div className="inline-flex flex-col items-center gap-2 text-[13px] text-muted">
                    <i className="fas fa-search text-[24px] text-[#cdd9e4]" />
                    No patients match these filters.
                    <button
                      type="button"
                      onClick={clearAll}
                      className="text-[13px] text-link-hover underline"
                    >
                      Clear all filters
                    </button>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>

        <div className="flex items-center justify-between border-t border-border px-4 py-3.5 text-[13px] text-muted">
          <div>
            {sorted.length > 0 ? `${start + 1}–${start + visible.length}` : "0"} of{" "}
            <strong className="text-heading">{sorted.length.toLocaleString("en-IN")}</strong>
          </div>
          <div className="flex gap-1.5">
            <PageBtn ic="fa-angle-double-left" onClick={() => setPage(1)} disabled={safePage === 1} />
            <PageBtn ic="fa-angle-left" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={safePage === 1} />
            <span className="grid h-8 min-w-[60px] place-items-center text-[12px]">
              Page <strong className="mx-1 text-heading">{safePage}</strong>/{totalPages}
            </span>
            <PageBtn ic="fa-angle-right" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={safePage === totalPages} />
            <PageBtn ic="fa-angle-double-right" onClick={() => setPage(totalPages)} disabled={safePage === totalPages} />
          </div>
        </div>
      </div>

      {/* Mobile list */}
      <div className="flex flex-col gap-2.5 md:hidden">
        {visible.length === 0 ? (
          <div className="rounded-[12px] border border-border bg-white p-8 text-center text-[13px] text-muted">
            No patients match these filters.
          </div>
        ) : (
          visible.map((p) => (
            <div key={p.id} className="flex items-start gap-3 rounded-[12px] border border-border bg-white p-3.5">
              <span
                className="grid h-10 w-10 flex-none place-items-center rounded-pill text-[14px] font-semibold"
                style={{ background: p.avatarBg, color: p.avatarFg }}
              >
                {p.initials}
              </span>
              <div className="min-w-0 flex-1">
                <div className="mb-0.5 flex items-center gap-2">
                  <div className="text-[14px] font-semibold text-heading">{p.name}</div>
                  {p.wa && <i className="fab fa-whatsapp text-[12px] text-[#25D366]" />}
                  <LangPill l={p.lang} />
                </div>
                <div className="flex items-center gap-1.5 text-[12px] text-muted">
                  <i className="fas fa-phone text-[10px] text-[#9aa9b8]" />
                  {p.phone}
                </div>
                <div className="mt-0.5 text-[11px] text-[#9aa9b8]">
                  Last visit · {p.lastVisitLabel} · {p.visits} visits
                </div>
                {p.tags.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {p.tags.map((t) => <TagChip key={t} t={t} />)}
                  </div>
                )}
              </div>
              <PatientRowMenu patientId={p.id} patientName={p.name} />
            </div>
          ))
        )}

        {sorted.length > PAGE_SIZE && (
          <div className="mt-1 flex items-center justify-between px-1">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={safePage === 1}
              className="text-[13px] font-medium text-link-hover disabled:text-[#cdd9e4]"
            >
              ← Prev
            </button>
            <span className="text-[12px] text-muted">
              {safePage} / {totalPages}
            </span>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={safePage === totalPages}
              className="text-[13px] font-medium text-link-hover disabled:text-[#cdd9e4]"
            >
              Next →
            </button>
          </div>
        )}
      </div>
    </div>
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

function PageBtn({ ic, onClick, disabled }: { ic: string; onClick: () => void; disabled: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={ic}
      className={
        "grid h-8 w-8 place-items-center rounded-sm border border-border bg-white text-[12px] " +
        (disabled ? "cursor-not-allowed text-[#cdd9e4]" : "cursor-pointer text-heading hover:border-link-hover hover:text-link-hover")
      }
    >
      <i className={`fas ${ic}`} />
    </button>
  );
}
