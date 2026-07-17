"use client";

import { useMemo, useState } from "react";

import {
  type Lead,
  type LeadStatus,
  summarizeUtm,
  orderedTrackingEntries,
} from "@/lib/data/leads";

/**
 * Searchable + sortable lead table for the super-admin console, with a detail
 * drawer and a one-click Excel (CSV) export. Pure client-side over the full row
 * set the server handed down — the volume here (marketing leads) is small
 * enough that in-memory filter/sort keeps the UX instant and the code simple.
 */

type SortKey = "name" | "phone" | "email" | "landing_page_url" | "utm" | "created_at";
type SortDir = "asc" | "desc";

const STATUS_STYLES: Record<LeadStatus, { bg: string; fg: string }> = {
  new:       { bg: "#E6F1FA", fg: "#0E5087" },
  contacted: { bg: "#FFF8EC", fg: "#7a5c2b" },
  qualified: { bg: "#EDEBFB", fg: "#4f46e5" },
  converted: { bg: "#E6F4EC", fg: "#3a8b5e" },
  archived:  { bg: "#F4F5F7", fg: "#9aa9b8" },
};

function fmtDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

export function LeadsTable({ leads }: { leads: Lead[] }) {
  const [query, setQuery]     = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("created_at");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [selected, setSelected] = useState<Lead | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const rows = leads.filter((l) => {
      if (!q) return true;
      const haystack = [
        l.name, l.phone, l.email, l.landing_page_url, l.referrer,
        l.ip_address, summarizeUtm(l.utm), l.status,
        ...Object.entries(l.utm).map(([k, v]) => `${k} ${v}`),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });

    const dir = sortDir === "asc" ? 1 : -1;
    const val = (l: Lead): string => {
      switch (sortKey) {
        case "utm":        return summarizeUtm(l.utm);
        case "created_at": return l.created_at;
        default:           return (l[sortKey] ?? "") as string;
      }
    };
    return [...rows].sort((a, b) =>
      val(a).localeCompare(val(b), undefined, { numeric: true }) * dir,
    );
  }, [leads, query, sortKey, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "created_at" ? "desc" : "asc");
    }
  };

  const exportExcel = () => downloadCsv(filtered);

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 rounded-md border border-border bg-white px-3 py-2 md:min-w-[360px]">
          <i className="fas fa-search text-[13px] text-muted" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name, phone, email, page, UTM…"
            className="w-full bg-transparent text-[13px] text-heading outline-none placeholder:text-[#9aa9b8]"
          />
          {query && (
            <button type="button" onClick={() => setQuery("")} aria-label="Clear search" className="text-muted hover:text-heading">
              <i className="fas fa-times text-[12px]" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-3">
          <span className="text-[13px] text-muted">
            {filtered.length} of {leads.length} lead{leads.length === 1 ? "" : "s"}
          </span>
          <button
            type="button"
            onClick={exportExcel}
            disabled={filtered.length === 0}
            className="inline-flex items-center gap-2 rounded-md bg-cta px-4 py-2 text-[13px] font-medium text-cta-fg disabled:opacity-50"
          >
            <i className="fas fa-file-excel text-[12px]" /> Export to Excel
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-[12px] border border-border bg-white">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-heading text-white">
                <SortableTh label="Name"      col="name"             sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                <SortableTh label="Phone"     col="phone"            sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                <SortableTh label="Email"     col="email"            sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                <SortableTh label="Page URL"  col="landing_page_url" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                <SortableTh label="UTM Details" col="utm"            sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                <SortableTh label="Submitted" col="created_at"       sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                <th className="px-3 py-3 pr-4 text-right text-[11px] font-semibold uppercase tracking-[0.06em]">Details</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-14 text-center text-[13px] text-muted">
                    {leads.length === 0
                      ? "No leads yet. Submissions from the home-page form will appear here."
                      : "No leads match your search."}
                  </td>
                </tr>
              ) : (
                filtered.map((l, i) => (
                  <tr
                    key={l.id}
                    className="cursor-pointer border-b border-[#F4F5F7] hover:bg-[#F4F8FB]"
                    style={{ background: i % 2 === 0 ? "#fff" : "#F9F9F9" }}
                    onClick={() => setSelected(l)}
                  >
                    <td className="px-3 py-3 pl-4 text-[13px] font-semibold text-heading">{l.name}</td>
                    <td className="px-3 py-3 text-[13px] text-body">{l.phone}</td>
                    <td className="px-3 py-3 text-[13px] text-body">{l.email ?? <span className="text-[#9aa9b8]">—</span>}</td>
                    <td className="max-w-[220px] truncate px-3 py-3 text-[12px] text-muted" title={l.landing_page_url ?? ""}>
                      {l.landing_page_url ?? <span className="text-[#9aa9b8]">—</span>}
                    </td>
                    <td className="max-w-[220px] truncate px-3 py-3 text-[12px] text-body" title={summarizeUtm(l.utm)}>
                      {summarizeUtm(l.utm)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 text-[12px] text-muted">{fmtDateTime(l.created_at)}</td>
                    <td className="px-3 py-3 pr-4 text-right">
                      <span className="text-[12px] font-medium text-link-hover">View</span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selected && <LeadDetailDrawer lead={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

function SortableTh({
  label, col, sortKey, sortDir, onSort,
}: {
  label: string;
  col: SortKey;
  sortKey: SortKey;
  sortDir: SortDir;
  onSort: (k: SortKey) => void;
}) {
  const active = sortKey === col;
  return (
    <th className="px-3 py-3 first:pl-4 text-left text-[11px] font-semibold uppercase tracking-[0.06em]">
      <button type="button" onClick={() => onSort(col)} className="inline-flex items-center gap-1.5 text-white/95 hover:text-white">
        {label}
        <i
          className={
            "fas text-[9px] " +
            (active ? (sortDir === "asc" ? "fa-arrow-up" : "fa-arrow-down") : "fa-sort opacity-40")
          }
        />
      </button>
    </th>
  );
}

function LeadDetailDrawer({ lead, onClose }: { lead: Lead; onClose: () => void }) {
  const utmRows = orderedTrackingEntries(lead.utm);
  const badge = STATUS_STYLES[lead.status];

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/30" onClick={onClose}>
      <div
        className="flex h-full w-full max-w-[460px] flex-col bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between border-b border-border px-6 py-5">
          <div>
            <h3 className="text-[18px] font-semibold text-heading">{lead.name}</h3>
            <span
              className="mt-1.5 inline-block rounded-pill px-2.5 py-0.5 text-[11px] font-semibold capitalize"
              style={{ background: badge.bg, color: badge.fg }}
            >
              {lead.status}
            </span>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="grid h-8 w-8 place-items-center rounded-md text-muted hover:bg-surface-muted hover:text-heading">
            <i className="fas fa-times" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          <Section title="Contact">
            <Detail label="Phone" value={lead.phone} />
            <Detail label="Email" value={lead.email} />
          </Section>

          <Section title="Attribution">
            <Detail label="Submitted" value={fmtDateTime(lead.created_at)} />
            <Detail label="Landing page" value={lead.landing_page_url} mono breakAll />
            <Detail label="Referrer" value={lead.referrer || "Direct / none"} mono breakAll />
            <Detail label="IP address" value={lead.ip_address} mono />
          </Section>

          <Section title="UTM / tracking">
            {utmRows.length === 0 ? (
              <p className="text-[13px] text-muted">No tracking parameters captured (direct visit).</p>
            ) : (
              <dl className="space-y-2">
                {utmRows.map((r) => (
                  <div key={r.key} className="flex items-baseline justify-between gap-3">
                    <dt className="text-[12px] text-muted">{r.label}</dt>
                    <dd className="max-w-[62%] break-all text-right font-mono text-[12px] text-heading">{r.value}</dd>
                  </div>
                ))}
              </dl>
            )}
          </Section>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <div className="mb-2.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-[#9aa9b8]">{title}</div>
      <div className="space-y-2.5">{children}</div>
    </div>
  );
}

function Detail({ label, value, mono, breakAll }: { label: string; value: string | null; mono?: boolean; breakAll?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="flex-none text-[12px] text-muted">{label}</span>
      <span className={"text-right text-[13px] text-heading " + (mono ? "font-mono text-[12px] " : "") + (breakAll ? "max-w-[62%] break-all" : "")}>
        {value ? value : <span className="text-[#9aa9b8]">—</span>}
      </span>
    </div>
  );
}

// =============================================================================
// Excel export — CSV with a UTF-8 BOM so Excel opens it with correct encoding.
// Flattens each captured UTM key into its own column, unioned across all rows,
// so a new tracked param appears automatically without touching this code.
// =============================================================================

function downloadCsv(rows: Lead[]) {
  const utmKeys = Array.from(
    rows.reduce((set, l) => {
      Object.keys(l.utm).forEach((k) => set.add(k));
      return set;
    }, new Set<string>()),
  ).sort();

  const header = [
    "Name", "Phone", "Email", "Status", "Submitted",
    "Landing Page URL", "Referrer", "IP Address",
    ...utmKeys,
  ];

  const body = rows.map((l) => [
    l.name,
    l.phone,
    l.email ?? "",
    l.status,
    new Date(l.created_at).toLocaleString("en-IN"),
    l.landing_page_url ?? "",
    l.referrer ?? "",
    l.ip_address ?? "",
    ...utmKeys.map((k) => l.utm[k] ?? ""),
  ]);

  const csv = [header, ...body]
    .map((cols) => cols.map(csvCell).join(","))
    .join("\r\n");

  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  const stamp = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `rxbooq-leads-${stamp}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/** Quote a CSV cell, escaping embedded quotes; guard against formula injection. */
function csvCell(value: string): string {
  let v = value ?? "";
  // Neutralise spreadsheet formula injection (=, +, -, @ leading chars).
  if (/^[=+\-@]/.test(v)) v = "'" + v;
  return `"${v.replace(/"/g, '""')}"`;
}
