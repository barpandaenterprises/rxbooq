"use client";

import { useMemo, useState } from "react";

export type DraftRow = {
  id:                       string;
  phone_e164:               string | null;
  clinic_name:              string | null;
  suggested_slug:           string | null;
  address:                  string | null;
  city:                     string | null;
  state:                    string | null;
  pincode:                  string | null;
  primary_phone:            string | null;
  primary_email:            string | null;
  doctor_full_name:         string | null;
  doctor_primary_specialty: string | null;
  doctor_registration_no:   string | null;
  doctor_qualifications:    string | null;
  doctor_years_experience:  number | null;
  doctor_languages:         string[] | null;
  registration_cert_path:   string | null;
  clinic_license_path:      string | null;
  selected_plan_id:         string | null;
  requested_doctor_seats:   number | null;
  applied_coupon_id:        string | null;
  last_step_completed:      string | null;
  created_at:               string;
  updated_at:               string;
  plan:                     { code: string; display_name: string; monthly_price_inr: number } | null;
};

// Weight each field by how much it represents progress. Tuned so a fully
// completed account-step draft (which is rare — usually they convert) sits
// at ~100%, and a phone-only draft at ~10%.
const FIELD_WEIGHTS: { field: keyof DraftRow; weight: number }[] = [
  { field: "phone_e164",               weight: 1 },
  { field: "doctor_full_name",         weight: 2 },
  { field: "doctor_registration_no",   weight: 2 },
  { field: "doctor_primary_specialty", weight: 1 },
  { field: "clinic_name",              weight: 2 },
  { field: "address",                  weight: 1 },
  { field: "city",                     weight: 1 },
  { field: "state",                    weight: 1 },
  { field: "pincode",                  weight: 1 },
  { field: "primary_email",            weight: 1 },
  { field: "registration_cert_path",   weight: 1 },
  { field: "selected_plan_id",         weight: 2 },
];

function completeness(d: DraftRow): number {
  const total  = FIELD_WEIGHTS.reduce((s, f) => s + f.weight, 0);
  const earned = FIELD_WEIGHTS.reduce((s, f) => s + (d[f.field] ? f.weight : 0), 0);
  return Math.round((earned / total) * 100);
}

function timeAgo(iso: string): string {
  const ms  = Date.now() - new Date(iso).getTime();
  const m   = Math.floor(ms / 60_000);
  if (m < 1)  return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

const STEP_ORDER = ["phone", "profile", "practice", "docs", "plan", "account"] as const;
type Step = (typeof STEP_ORDER)[number];

export function ApplicationsList({ drafts }: { drafts: DraftRow[] }) {
  const [query,    setQuery]    = useState("");
  const [stepFilt, setStepFilt] = useState<Step | "all">("all");
  const [staleFilt, setStaleFilt] = useState<"all" | "24h" | "7d">("all");
  const [openId,   setOpenId]   = useState<string | null>(null);

  const stats = useMemo(() => {
    const now24 = Date.now() - 24 * 3600_000;
    const now7d = Date.now() -  7 * 24 * 3600_000;
    let last24 = 0;
    let stale  = 0;
    for (const d of drafts) {
      const t = new Date(d.updated_at).getTime();
      if (t > now24) last24++;
      if (t < now7d) stale++;
    }
    return { total: drafts.length, last24, stale };
  }, [drafts]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const now24 = Date.now() - 24 * 3600_000;
    const now7d = Date.now() -  7 * 24 * 3600_000;
    return drafts.filter((d) => {
      if (stepFilt !== "all" && (d.last_step_completed ?? "phone") !== stepFilt) return false;
      if (staleFilt === "24h" && new Date(d.updated_at).getTime() <= now24) return false;
      if (staleFilt === "7d"  && new Date(d.updated_at).getTime() >= now7d) return false;
      if (!q) return true;
      const hay = [
        d.phone_e164, d.clinic_name, d.suggested_slug,
        d.doctor_full_name, d.doctor_registration_no,
        d.city, d.state, d.primary_email,
      ].join(" ").toLowerCase();
      return hay.includes(q);
    });
  }, [drafts, query, stepFilt, staleFilt]);

  return (
    <div className="space-y-4">
      {/* Stat cards */}
      <div className="grid grid-cols-3 gap-3">
        <Stat label="Total drafts"       value={String(stats.total)} />
        <Stat label="Active (last 24h)"  value={String(stats.last24)} tone="ok" />
        <Stat label="Stale (>7 days)"    value={String(stats.stale)}  tone={stats.stale > 0 ? "warn" : undefined} />
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-2 rounded-lg border border-border bg-white p-3 md:flex-row md:items-center">
        <input
          className="flex-1 rounded-md border-[1.5px] border-border bg-white px-3 py-2 text-[13px] outline-none focus-visible:border-cta"
          placeholder="Search by phone, clinic, doctor, city, email…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <div className="flex flex-wrap gap-1.5">
          <Chip active={stepFilt === "all"} onClick={() => setStepFilt("all")}>All steps</Chip>
          {STEP_ORDER.map((s) => (
            <Chip key={s} active={stepFilt === s} onClick={() => setStepFilt(s)}>{s}</Chip>
          ))}
        </div>
        <div className="flex gap-1.5">
          <Chip active={staleFilt === "all"} onClick={() => setStaleFilt("all")}>Any time</Chip>
          <Chip active={staleFilt === "24h"} onClick={() => setStaleFilt("24h")}>&lt; 24h</Chip>
          <Chip active={staleFilt === "7d"}  onClick={() => setStaleFilt("7d")}>Stale</Chip>
        </div>
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-white p-10 text-center text-[13px] text-muted">
          {drafts.length === 0 ? "No drafts in flight." : "No drafts match the current filters."}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((d) => (
            <DraftCard
              key={d.id}
              draft={d}
              open={openId === d.id}
              onToggle={() => setOpenId((cur) => cur === d.id ? null : d.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "ok" | "warn" }) {
  const toneClass =
    tone === "ok"   ? "text-[#1f7a3a]"
  : tone === "warn" ? "text-[#a86a00]"
  :                   "text-heading";
  return (
    <div className="rounded-lg border border-border bg-white p-4">
      <div className="text-[11px] uppercase tracking-wide text-muted">{label}</div>
      <div className={"mt-1 text-[22px] font-semibold " + toneClass}>{value}</div>
    </div>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        "rounded-pill border px-2.5 py-1 text-[11px] capitalize " +
        (active
          ? "border-cta bg-cta text-cta-fg"
          : "border-border bg-white text-muted hover:text-heading")
      }
    >{children}</button>
  );
}

function DraftCard({ draft, open, onToggle }: { draft: DraftRow; open: boolean; onToggle: () => void }) {
  const pct        = completeness(draft);
  const phone      = draft.phone_e164 ?? draft.primary_phone ?? null;
  const phoneClean = phone?.replace(/[^0-9+]/g, "");
  const wa         = phoneClean ? `https://wa.me/${phoneClean.replace(/^\+/, "")}` : null;

  return (
    <div className="rounded-lg border border-border bg-white">
      <button type="button" onClick={onToggle} className="w-full p-4 text-left">
        <div className="flex flex-wrap items-start gap-4">
          {/* Identity */}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-baseline gap-2">
              <span className="text-[15px] font-semibold text-heading">
                {draft.clinic_name ?? <span className="font-normal text-muted">(clinic name not set)</span>}
              </span>
              {draft.suggested_slug && <span className="font-mono text-[11px] text-muted">/{draft.suggested_slug}</span>}
            </div>
            <div className="mt-1 text-[12px] text-body">
              {draft.doctor_full_name ?? <span className="text-muted">(doctor not set)</span>}
              {draft.doctor_primary_specialty && <span className="text-muted"> · {draft.doctor_primary_specialty}</span>}
              {draft.doctor_registration_no   && <span className="text-muted"> · Reg #{draft.doctor_registration_no}</span>}
            </div>
            <div className="mt-1 text-[11px] text-muted">
              {phone && <><i className="fas fa-phone mr-1 text-[10px]" />{phone}</>}
              {draft.primary_email && <span className="ml-3"><i className="fas fa-envelope mr-1 text-[10px]" />{draft.primary_email}</span>}
              {draft.city && <span className="ml-3"><i className="fas fa-map-marker-alt mr-1 text-[10px]" />{draft.city}{draft.state ? `, ${draft.state}` : ""}</span>}
            </div>
          </div>

          {/* Plan + docs */}
          <div className="flex flex-col gap-1.5 text-[11px]">
            {draft.plan ? (
              <span className="inline-flex items-center gap-1 rounded-pill bg-[#eef3fb] px-2 py-0.5 font-medium text-link-hover">
                {draft.plan.display_name}
                {draft.requested_doctor_seats && draft.requested_doctor_seats > 1 && (
                  <span className="text-muted"> · {draft.requested_doctor_seats} seats</span>
                )}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-pill bg-[#f4f5f7] px-2 py-0.5 text-muted">No plan yet</span>
            )}
            {draft.applied_coupon_id && (
              <span className="inline-flex items-center gap-1 rounded-pill bg-[#e6f3ec] px-2 py-0.5 text-[#1f7a3a]">
                <i className="fas fa-tag text-[9px]" /> Coupon applied
              </span>
            )}
            <span className="text-muted">
              <DocDot ok={!!draft.registration_cert_path} /> Reg cert
              <span className="ml-3"><DocDot ok={!!draft.clinic_license_path} /> License</span>
            </span>
          </div>

          {/* Progress + activity */}
          <div className="flex flex-col items-end gap-1.5 text-right">
            <div className="flex items-center gap-2">
              <div className="h-1.5 w-24 overflow-hidden rounded-pill bg-border">
                <div className={"h-full " + (pct >= 80 ? "bg-[#1f7a3a]" : pct >= 50 ? "bg-cta" : "bg-[#a86a00]")} style={{ width: `${pct}%` }} />
              </div>
              <span className="text-[11px] font-semibold text-heading">{pct}%</span>
            </div>
            <div className="text-[11px] text-muted">
              Step: <span className="capitalize text-heading">{draft.last_step_completed ?? "phone"}</span>
            </div>
            <div className="text-[11px] text-muted">
              Updated {timeAgo(draft.updated_at)}
            </div>
          </div>
        </div>
      </button>

      {open && (
        <div className="border-t border-border bg-[#fafbfc] p-4">
          <div className="grid gap-3 md:grid-cols-3">
            <DetailGroup title="Doctor">
              <Detail label="Name"            value={draft.doctor_full_name} />
              <Detail label="Specialty"       value={draft.doctor_primary_specialty} />
              <Detail label="Registration #"  value={draft.doctor_registration_no} />
              <Detail label="Qualifications"  value={draft.doctor_qualifications} />
              <Detail label="Experience"      value={draft.doctor_years_experience ? `${draft.doctor_years_experience} yrs` : null} />
              <Detail label="Languages"       value={draft.doctor_languages?.join(", ")} />
            </DetailGroup>

            <DetailGroup title="Clinic">
              <Detail label="Name"     value={draft.clinic_name} />
              <Detail label="Slug"     value={draft.suggested_slug} />
              <Detail label="Address"  value={draft.address} />
              <Detail label="City"     value={[draft.city, draft.state].filter(Boolean).join(", ")} />
              <Detail label="Pincode"  value={draft.pincode} />
              <Detail label="Email"    value={draft.primary_email} />
            </DetailGroup>

            <DetailGroup title="Plan + docs">
              <Detail label="Tier"     value={draft.plan?.display_name ?? null} />
              <Detail label="Seats"    value={draft.requested_doctor_seats?.toString()} />
              <Detail label="Coupon"   value={draft.applied_coupon_id ? "Applied" : null} />
              <Detail label="Reg cert" value={draft.registration_cert_path ? "Uploaded" : null} />
              <Detail label="License"  value={draft.clinic_license_path ? "Uploaded" : null} />
              <Detail label="Started"  value={new Date(draft.created_at).toLocaleString("en-IN")} />
            </DetailGroup>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-border pt-3">
            {phoneClean && (
              <a href={`tel:${phoneClean}`} className="rounded-md border border-border bg-white px-3 py-1.5 text-[12px] text-heading no-underline hover:bg-white">
                <i className="fas fa-phone mr-1.5 text-[10px] text-muted" /> Call
              </a>
            )}
            {wa && (
              <a href={wa} target="_blank" rel="noopener noreferrer" className="rounded-md border border-border bg-white px-3 py-1.5 text-[12px] text-heading no-underline hover:bg-white">
                <i className="fab fa-whatsapp mr-1.5 text-[10px] text-[#25D366]" /> WhatsApp
              </a>
            )}
            {draft.primary_email && (
              <a href={`mailto:${draft.primary_email}`} className="rounded-md border border-border bg-white px-3 py-1.5 text-[12px] text-heading no-underline hover:bg-white">
                <i className="fas fa-envelope mr-1.5 text-[10px] text-muted" /> Email
              </a>
            )}
            <span className="ml-auto font-mono text-[10px] text-[#9aa9b8]">{draft.id}</span>
          </div>
        </div>
      )}
    </div>
  );
}

function DocDot({ ok }: { ok: boolean }) {
  return (
    <i className={
      "mr-1 text-[9px] " +
      (ok ? "fas fa-check-circle text-[#1f7a3a]" : "far fa-circle text-[#9aa9b8]")
    } />
  );
}

function DetailGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted">{title}</div>
      <dl className="space-y-1">{children}</dl>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string | number | null | undefined }) {
  return (
    <div className="flex items-baseline justify-between gap-2 text-[12px]">
      <dt className="text-muted">{label}</dt>
      <dd className="truncate text-right text-heading">{value || <span className="text-[#9aa9b8]">—</span>}</dd>
    </div>
  );
}
