type Lang = "EN" | "HI" | "OR";

type Patient = {
  id: string;
  name: string;
  initials: string;
  avatarBg: string;
  avatarFg: string;
  phone: string;
  lang: Lang;
  lastVisit: string;
  visits: number;
  ltv: string;
  tags: string[];
  wa: boolean;
};

const PATIENTS: Patient[] = [
  { id: "P-1284", name: "Anita Sahu",      initials: "AS", avatarBg: "#FFE7EC", avatarFg: "#EE344E", phone: "+91 98••• ••342", lang: "EN", lastVisit: "9 May 2026",  visits: 7,  ltv: "12,400", tags: ["VIP", "Root canal"], wa: true },
  { id: "P-1283", name: "Bidyut Panda",    initials: "BP", avatarBg: "#E6F1FA", avatarFg: "#0E5087", phone: "+91 96••• ••018", lang: "OR", lastVisit: "9 May 2026",  visits: 1,  ltv: "1,200",  tags: ["New"],          wa: true },
  { id: "P-1281", name: "Sarita Mahanti",  initials: "SM", avatarBg: "#FFF8EC", avatarFg: "#7a5c2b", phone: "+91 99••• ••445", lang: "HI", lastVisit: "2 May 2026",  visits: 4,  ltv: "8,600",  tags: ["No-show"],      wa: true },
  { id: "P-1278", name: "Manoj Behera",    initials: "MB", avatarBg: "#E6F4EC", avatarFg: "#3a8b5e", phone: "+91 95••• ••111", lang: "OR", lastVisit: "28 Apr 2026", visits: 2,  ltv: "4,200",  tags: ["Implants"],     wa: true },
  { id: "P-1276", name: "Rajesh Mishra",   initials: "RM", avatarBg: "#F4E5FA", avatarFg: "#6b3aa1", phone: "+91 94••• ••111", lang: "HI", lastVisit: "24 Apr 2026", visits: 3,  ltv: "3,800",  tags: [],               wa: false },
  { id: "P-1273", name: "Karthik Rao",     initials: "KR", avatarBg: "#FFE7EC", avatarFg: "#EE344E", phone: "+91 70••• ••144", lang: "EN", lastVisit: "20 Apr 2026", visits: 5,  ltv: "9,750",  tags: ["Root canal"],   wa: true },
  { id: "P-1271", name: "Pinky Sahu",      initials: "PS", avatarBg: "#E6F1FA", avatarFg: "#0E5087", phone: "+91 87••• ••501", lang: "OR", lastVisit: "18 Apr 2026", visits: 6,  ltv: "2,100",  tags: ["Pediatric"],    wa: true },
  { id: "P-1268", name: "Susmita Dash",    initials: "SD", avatarBg: "#FFF8EC", avatarFg: "#7a5c2b", phone: "+91 99••• ••015", lang: "EN", lastVisit: "15 Apr 2026", visits: 9,  ltv: "18,300", tags: ["VIP"],          wa: true },
  { id: "P-1265", name: "Suresh Pati",     initials: "SP", avatarBg: "#E6F4EC", avatarFg: "#3a8b5e", phone: "+91 89••• ••445", lang: "OR", lastVisit: "12 Apr 2026", visits: 14, ltv: "24,500", tags: ["Braces"],       wa: true },
  { id: "P-1262", name: "Laxmi Pradhan",   initials: "LP", avatarBg: "#F4E5FA", avatarFg: "#6b3aa1", phone: "+91 90••• ••512", lang: "HI", lastVisit: "8 Apr 2026",  visits: 2,  ltv: "2,800",  tags: ["Cancelled"],    wa: false },
  { id: "P-1259", name: "Priya Sahu",      initials: "PS", avatarBg: "#FFE7EC", avatarFg: "#EE344E", phone: "+91 93••• ••901", lang: "OR", lastVisit: "7 Apr 2026",  visits: 3,  ltv: "5,400",  tags: ["Root canal"],   wa: true },
  { id: "P-1257", name: "Anita Mohanti",   initials: "AM", avatarBg: "#E6F1FA", avatarFg: "#0E5087", phone: "+91 98••• ••611", lang: "EN", lastVisit: "5 Apr 2026",  visits: 8,  ltv: "14,200", tags: [],               wa: true },
];

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

function FilterPill({ label, value, active }: { label: string; value: string; active?: boolean }) {
  return (
    <button
      type="button"
      className={
        "inline-flex items-center gap-2 rounded-md px-3 py-2 text-[13px] " +
        (active
          ? "border-[1.5px] border-brand bg-[#E6F1FA] font-medium text-link-hover"
          : "border border-border bg-white text-heading")
      }
    >
      <span className="text-[#9aa9b8]">{label}:</span>
      <span>{value}</span>
      <i className="fas fa-chevron-down text-[10px] text-[#9aa9b8]" />
    </button>
  );
}

function FilterToggle({ on, label }: { on: boolean; label: React.ReactNode }) {
  return (
    <label className="inline-flex cursor-pointer items-center gap-2.5 rounded-md border border-border bg-white px-3 py-2 text-[13px] text-heading">
      <span
        className="relative h-[18px] w-8 rounded-pill transition-colors"
        style={{ background: on ? "#0168B3" : "#cdd9e4" }}
      >
        <span
          className="absolute top-0.5 h-3.5 w-3.5 rounded-pill bg-white shadow-[0_1px_3px_rgba(0,0,0,0.2)] transition-[left]"
          style={{ left: on ? "16px" : "2px" }}
        />
      </span>
      {label}
    </label>
  );
}

function PatientRow({ p, hover }: { p: Patient; hover?: boolean }) {
  return (
    <tr
      className="border-b border-[#F4F5F7]"
      style={{
        background: hover ? "#FFFAFB" : "#fff",
        boxShadow: hover ? "inset 3px 0 0 #EE344E" : "none",
      }}
    >
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
            <div className="font-mono text-[11px] text-[#9aa9b8]">{p.id}</div>
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
      <td className="px-3 py-3 text-[13px] text-muted">{p.lastVisit}</td>
      <td className="px-3 py-3 text-right text-[13px] text-heading">{p.visits}</td>
      <td className="px-3 py-3 text-right text-[13px] font-semibold text-heading">₹{p.ltv}</td>
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
        <button
          type="button"
          aria-label="More"
          className="grid h-8 w-8 place-items-center rounded-md border border-border bg-white text-muted"
        >
          <i className="fas fa-ellipsis-v text-[13px]" />
        </button>
      </td>
    </tr>
  );
}

function MobileCard({ p }: { p: Patient }) {
  return (
    <div className="flex items-start gap-3 rounded-[12px] border border-border bg-white p-3.5">
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
          Last visit · {p.lastVisit} · {p.visits} visits
        </div>
        {p.tags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {p.tags.map((t) => <TagChip key={t} t={t} />)}
          </div>
        )}
      </div>
      <button
        type="button"
        aria-label="More"
        className="grid h-8 w-8 flex-none place-items-center rounded-md border border-border bg-white text-muted"
      >
        <i className="fas fa-ellipsis-v text-[12px]" />
      </button>
    </div>
  );
}

export function AdminPatients() {
  return (
    <div className="px-5 pt-7 md:px-8 md:pt-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-[28px] font-semibold leading-[36px] text-heading md:text-[32px] md:leading-10">
            Patients
          </h2>
          <div className="mt-1 text-[14px] text-muted">
            <strong className="text-heading">1,284 patients</strong>
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
        <div className="flex w-[280px] items-center gap-2.5 rounded-md border border-border bg-white px-3.5 py-2.5">
          <i className="fas fa-search text-[13px] text-[#9aa9b8]" />
          <span className="text-[14px] text-[#9aa9b8]">Search by name or phone…</span>
        </div>
        <FilterPill label="Language" value="All" />
        <FilterPill label="Tags" value="2 selected" active />
        <FilterPill label="Last visit" value="Last 90 days" />
        <FilterToggle
          on
          label={
            <span>
              <i className="fab fa-whatsapp mr-1.5 text-[#25D366]" />
              Has WhatsApp opt-in
            </span>
          }
        />
        <button type="button" className="text-[13px] text-link-hover underline underline-offset-[3px]">
          Clear filters
        </button>
      </div>

      {/* Mobile filter row */}
      <div className="mb-3 flex items-center gap-2 overflow-x-auto md:hidden">
        <button
          type="button"
          className="inline-flex items-center gap-2 whitespace-nowrap rounded-pill border-[1.5px] border-brand bg-white px-3.5 py-1.5 text-[13px] font-medium text-link-hover"
        >
          <i className="fas fa-sliders-h text-[11px]" />
          Filters
          <span className="rounded-pill bg-brand px-1.5 py-0.5 text-[10px] font-semibold text-white">3</span>
        </button>
        {["Has WhatsApp", "OR · HI", "VIP"].map((t) => (
          <span
            key={t}
            className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-pill bg-[#E6F1FA] px-2.5 py-1 text-[12px] text-link-hover"
          >
            {t}
            <i className="fas fa-times text-[9px]" />
          </span>
        ))}
      </div>

      {/* Desktop table */}
      <div className="hidden overflow-hidden rounded-[12px] border border-border bg-white md:block">
        <div className="flex items-center gap-3 border-b border-[#FFE7EC] bg-[#FFFAFB] px-4 py-2.5 text-[13px]">
          <i className="fas fa-info-circle text-[13px] text-cta" />
          <span>
            <strong>0 selected</strong> · Select rows to send a WhatsApp campaign or add a tag in bulk.
          </span>
          <span className="ml-auto text-[12px] text-[#9aa9b8]">Showing 12 of 1,284</span>
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
              {(["Patient","Phone","Lang","Last visit","Visits","LTV","Tags",""] as const).map((h) => (
                <th
                  key={h}
                  className={
                    "px-3 py-3 text-[11px] font-semibold uppercase tracking-[0.06em] text-[#9aa9b8] " +
                    (h === "Visits" || h === "LTV" ? "text-right" : "text-left")
                  }
                >
                  <span className="inline-flex items-center gap-1">
                    {h}
                    {(["Patient","Last visit","Visits","LTV"] as const).includes(h as never) && (
                      <i className="fas fa-sort text-[9px] text-[#cdd9e4]" />
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <PatientRow p={PATIENTS[0]!} hover />
            {PATIENTS.slice(1).map((p) => <PatientRow key={p.id} p={p} />)}
          </tbody>
        </table>

        <div className="flex items-center justify-between border-t border-border px-4 py-3.5 text-[13px] text-muted">
          <div className="flex items-center gap-2.5">
            <span>Rows per page:</span>
            <select className="rounded-sm border border-border bg-white px-2 py-1 text-[13px]">
              <option>25</option>
              <option>50</option>
              <option>100</option>
            </select>
          </div>
          <div>1–12 of <strong className="text-heading">1,284</strong></div>
          <div className="flex gap-1.5">
            {["fa-angle-double-left", "fa-angle-left", "fa-angle-right", "fa-angle-double-right"].map((ic, i) => (
              <button
                key={ic}
                type="button"
                disabled={i < 2}
                aria-label={ic}
                className={
                  "grid h-8 w-8 place-items-center rounded-sm border border-border bg-white text-[12px] " +
                  (i < 2 ? "cursor-not-allowed text-[#cdd9e4]" : "text-heading")
                }
              >
                <i className={`fas ${ic}`} />
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Mobile list */}
      <div className="flex flex-col gap-2.5 md:hidden">
        {PATIENTS.slice(0, 8).map((p) => <MobileCard key={p.id} p={p} />)}
        <button
          type="button"
          className="mt-1.5 rounded-[12px] border border-border bg-white px-3.5 py-3.5 text-[13px] font-medium text-link-hover"
        >
          Load 1,272 more <i className="fas fa-arrow-down ml-1.5 text-[11px]" />
        </button>
      </div>
    </div>
  );
}
