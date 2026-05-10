type Plan = "Gold" | "Silver";
type ClinicStatus = "Active" | "Trial" | "Past due" | "Paused";

type Clinic = {
  id: string;
  name: string;
  city: string;
  plan: Plan;
  status: ClinicStatus;
  mrr: number;
  patients: number;
  lastLogin: string;
  waCredit: number;
  churn: number;
  initials: string;
  col: string;
  fg: string;
  trial?: string;
};

const CLINICS: Clinic[] = [
  { id: "C-0001", name: "Mahakur Poly Dental",        city: "Sambalpur",   plan: "Gold",   status: "Active",   mrr: 4999, patients: 1284, lastLogin: "2 min ago",   waCredit: 2840, churn: 8,  initials: "MD", col: "#FFE7EC", fg: "#EE344E" },
  { id: "C-0002", name: "SmileBright Orthodontics",   city: "Bhubaneswar", plan: "Gold",   status: "Active",   mrr: 4999, patients: 2150, lastLogin: "14 min ago",  waCredit: 5430, churn: 6,  initials: "SB", col: "#E6F1FA", fg: "#0E5087" },
  { id: "C-0003", name: "Care First Multispecialty",  city: "Cuttack",     plan: "Silver", status: "Active",   mrr: 1999, patients: 842,  lastLogin: "2 hr ago",    waCredit: 1240, churn: 34, initials: "CF", col: "#E6F4EC", fg: "#3a8b5e" },
  { id: "C-0004", name: "Jagannath Dental Hub",       city: "Puri",        plan: "Silver", status: "Trial",    mrr: 0,    patients: 74,   lastLogin: "1 day ago",   waCredit: 480,  churn: 0,  initials: "JD", col: "#FFF8EC", fg: "#7a5c2b", trial: "8 days left" },
  { id: "C-0005", name: "Drishti Eye & ENT",          city: "Rourkela",    plan: "Gold",   status: "Active",   mrr: 4999, patients: 1640, lastLogin: "5 hr ago",    waCredit: 3210, churn: 12, initials: "DE", col: "#F4E5FA", fg: "#6b3aa1" },
  { id: "C-0006", name: "Sunshine Pediatrics",        city: "Sambalpur",   plan: "Silver", status: "Active",   mrr: 1999, patients: 512,  lastLogin: "3 hr ago",    waCredit: 920,  churn: 18, initials: "SP", col: "#FFE7EC", fg: "#EE344E" },
  { id: "C-0007", name: "Anand Skin Clinic",          city: "Berhampur",   plan: "Silver", status: "Past due", mrr: 1999, patients: 336,  lastLogin: "12 days ago", waCredit: 0,    churn: 78, initials: "AS", col: "#F4F5F7", fg: "#9aa9b8" },
  { id: "C-0008", name: "NeoLife Physio",             city: "Cuttack",     plan: "Gold",   status: "Active",   mrr: 4999, patients: 920,  lastLogin: "40 min ago",  waCredit: 4150, churn: 9,  initials: "NL", col: "#E6F4EC", fg: "#3a8b5e" },
  { id: "C-0009", name: "Aastha Women's Clinic",      city: "Bhubaneswar", plan: "Gold",   status: "Active",   mrr: 4999, patients: 1180, lastLogin: "1 hr ago",    waCredit: 2780, churn: 14, initials: "AW", col: "#FFE7EC", fg: "#EE344E" },
  { id: "C-0010", name: "Mahima Dental & Implants",   city: "Sundargarh",  plan: "Silver", status: "Trial",    mrr: 0,    patients: 42,   lastLogin: "4 hr ago",    waCredit: 380,  churn: 0,  initials: "MD", col: "#E6F1FA", fg: "#0E5087", trial: "3 days left" },
  { id: "C-0011", name: "Healwell Polyclinic",        city: "Sambalpur",   plan: "Silver", status: "Active",   mrr: 1999, patients: 660,  lastLogin: "6 hr ago",    waCredit: 1480, churn: 22, initials: "HP", col: "#FFF8EC", fg: "#7a5c2b" },
  { id: "C-0012", name: "Surya Diagnostics",          city: "Balasore",    plan: "Gold",   status: "Active",   mrr: 4999, patients: 2280, lastLogin: "18 min ago",  waCredit: 6120, churn: 7,  initials: "SD", col: "#E6F1FA", fg: "#0E5087" },
];

const PLAN_COLOR: Record<Plan, { bg: string; fg: string }> = {
  Gold:   { bg: "#FFE7EC", fg: "#EE344E" },
  Silver: { bg: "#E6F1FA", fg: "#0E5087" },
};

const STATUS_COLOR: Record<ClinicStatus, { bg: string; fg: string; dot: string }> = {
  "Active":   { bg: "#E6F4EC", fg: "#3a8b5e", dot: "#3a8b5e" },
  "Trial":    { bg: "#FFF8EC", fg: "#7a5c2b", dot: "#7a5c2b" },
  "Past due": { bg: "#FFE7EC", fg: "#EE344E", dot: "#EE344E" },
  "Paused":   { bg: "#F4F5F7", fg: "#575757", dot: "#9aa9b8" },
};

function PlanBadge({ plan }: { plan: Plan }) {
  const c = PLAN_COLOR[plan];
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-pill px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-[0.04em]"
      style={{ background: c.bg, color: c.fg }}
    >
      <i className="fas fa-circle text-[7px]" />
      {plan}
    </span>
  );
}

function SaStatus({ status, trial }: { status: ClinicStatus; trial?: string }) {
  const c = STATUS_COLOR[status];
  return (
    <span className="inline-flex items-center gap-1.5 text-[12px] font-medium" style={{ color: c.fg }}>
      <span className="h-[7px] w-[7px] rounded-pill" style={{ background: c.dot }} />
      {status}
      {trial && <span className="text-[11px] text-[#9aa9b8]">· {trial}</span>}
    </span>
  );
}

function ChurnBar({ score }: { score: number }) {
  const color = score >= 60 ? "#EE344E" : score >= 30 ? "#7a5c2b" : "#3a8b5e";
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-16 overflow-hidden rounded-pill bg-[#F4F5F7]">
        <div className="h-full rounded-pill" style={{ width: `${score}%`, background: color }} />
      </div>
      <span className="min-w-6 text-[12px] font-semibold" style={{ color }}>{score}</span>
    </div>
  );
}

function SaKpi({ label, value, sub, ic, accent, deltaUp }: {
  label: string; value: string; sub?: string; ic: string; accent?: "coral"; deltaUp?: boolean;
}) {
  return (
    <div className="rounded-[12px] border border-border bg-white p-4">
      <div className="mb-2.5 flex items-center justify-between">
        <span
          className="grid h-8 w-8 place-items-center rounded-md text-[13px]"
          style={{
            background: accent === "coral" ? "#FFE7EC" : "#E6F1FA",
            color: accent === "coral" ? "#EE344E" : "#0168B3",
          }}
        >
          <i className={`fas ${ic}`} />
        </span>
        <span className="text-[10px] font-semibold uppercase tracking-[0.06em] text-[#9aa9b8]">{label}</span>
      </div>
      <div className="text-[24px] font-bold leading-7 text-heading">{value}</div>
      {sub && (
        <div
          className="mt-1 text-[11px]"
          style={{ color: deltaUp === true ? "#3a8b5e" : deltaUp === false ? "#EE344E" : "#9aa9b8" }}
        >
          {deltaUp != null && <i className={`fas ${deltaUp ? "fa-arrow-up" : "fa-arrow-down"} mr-1 text-[9px]`} />}
          {sub}
        </div>
      )}
    </div>
  );
}

function ClinicTable() {
  const groups: Array<{ label: Plan; rows: Clinic[]; mrr: number }> = (["Gold", "Silver"] as const).map((label) => {
    const rows = CLINICS.filter((c) => c.plan === label);
    return { label, rows, mrr: rows.reduce((s, c) => s + c.mrr, 0) };
  });
  const selected = new Set(["C-0003", "C-0007"]);

  return (
    <div className="overflow-hidden rounded-[12px] border border-border bg-white">
      <div className="flex items-center gap-2.5 border-b border-border bg-white px-4 py-3.5">
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-md border border-border bg-white px-3 py-1.5 text-[13px] text-heading"
        >
          <i className="fas fa-layer-group text-[11px] text-brand" />
          Group: Plan
          <i className="fas fa-chevron-down text-[9px] text-[#9aa9b8]" />
        </button>
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-md border border-border bg-white px-3 py-1.5 text-[13px] text-heading"
        >
          <i className="fas fa-filter text-[11px]" />
          Filters · <span className="font-medium text-link-hover">2 active</span>
        </button>
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-md border border-border bg-white px-3 py-1.5 text-[13px] text-heading"
        >
          <i className="fas fa-columns text-[11px]" />
          Columns
        </button>
        <div className="flex-1" />
        <span className="text-[12px] text-[#9aa9b8]">Showing 12 of 12</span>
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-md border border-border bg-white px-3 py-1.5 text-[13px] text-heading"
        >
          <i className="fas fa-file-csv text-[11px]" /> Export CSV
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full table-fixed border-collapse">
          <colgroup>
            <col style={{ width: 48 }} />
            <col />
            <col style={{ width: 96 }} />
            <col style={{ width: 130 }} />
            <col style={{ width: 96 }} />
            <col style={{ width: 96 }} />
            <col style={{ width: 130 }} />
            <col style={{ width: 110 }} />
            <col style={{ width: 140 }} />
            <col style={{ width: 60 }} />
          </colgroup>
          <thead>
            <tr className="bg-heading text-white">
              <th className="px-3 py-3 pl-4 text-left">
                <span className="inline-block h-[18px] w-[18px] rounded-sm border-[1.5px] border-white/40" />
              </th>
              {(["Clinic","Plan","Status","MRR","Patients","Last login","WA credit","Churn risk",""] as const).map((h, i) => (
                <th
                  key={i}
                  className={
                    "px-3 py-3 text-[11px] font-semibold uppercase tracking-[0.06em] " +
                    (h === "MRR" || h === "Patients" || h === "WA credit" ? "text-right" : "text-left")
                  }
                >
                  <span className="inline-flex items-center gap-1">
                    {h}
                    {h && <i className="fas fa-sort text-[9px] text-white/40" />}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {groups.map((g) => (
              <>
                <tr key={`group-${g.label}`} className="bg-[#F4F5F7]">
                  <td colSpan={10} className="px-4 py-2.5">
                    <div className="flex items-center gap-2.5">
                      <i className="fas fa-chevron-down text-[10px] text-muted" />
                      <PlanBadge plan={g.label} />
                      <span className="text-[13px] font-semibold text-heading">{g.rows.length} clinics</span>
                      <span className="text-[12px] text-[#9aa9b8]">·</span>
                      <span className="text-[12px] text-muted">MRR ₹{g.mrr.toLocaleString("en-IN")}</span>
                    </div>
                  </td>
                </tr>
                {g.rows.map((c, i) => {
                  const isSelected = selected.has(c.id);
                  return (
                    <tr
                      key={c.id}
                      className="border-b border-[#F4F5F7]"
                      style={{ background: isSelected ? "#E6F1FA" : i % 2 === 0 ? "#fff" : "#F9F9F9" }}
                    >
                      <td className="px-3 py-3 pl-4">
                        <span
                          className="inline-grid h-[18px] w-[18px] place-items-center rounded-sm"
                          style={{
                            border: isSelected ? 0 : "1.5px solid #cdd9e4",
                            background: isSelected ? "#0168B3" : "transparent",
                          }}
                        >
                          {isSelected && <i className="fas fa-check text-[10px] text-white" />}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2.5">
                          <span
                            className="grid h-8 w-8 place-items-center rounded-md text-[11px] font-bold"
                            style={{ background: c.col, color: c.fg }}
                          >
                            {c.initials}
                          </span>
                          <div>
                            <div className="text-[14px] font-semibold text-heading">{c.name}</div>
                            <div className="flex items-center gap-1.5 text-[11px] text-[#9aa9b8]">
                              <i className="fas fa-map-marker-alt text-[9px]" />
                              {c.city}
                              <span className="text-[#cdd9e4]">·</span>
                              <code className="font-mono text-[10px]">{c.id}</code>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3"><PlanBadge plan={c.plan} /></td>
                      <td className="px-3 py-3"><SaStatus status={c.status} trial={c.trial} /></td>
                      <td className="px-3 py-3 text-right text-[13px] font-semibold text-heading">
                        {c.mrr === 0 ? <span className="font-normal text-[#9aa9b8]">—</span> : `₹${c.mrr.toLocaleString("en-IN")}`}
                      </td>
                      <td className="px-3 py-3 text-right text-[13px] text-heading">{c.patients.toLocaleString("en-IN")}</td>
                      <td className="px-3 py-3 text-[13px] text-muted">{c.lastLogin}</td>
                      <td
                        className={"px-3 py-3 text-right text-[13px] " + (c.waCredit < 500 ? "font-semibold text-cta" : "text-heading")}
                      >
                        {c.waCredit === 0 ? (
                          <span>
                            <i className="fas fa-exclamation-triangle mr-1 text-[11px]" />0
                          </span>
                        ) : (
                          c.waCredit.toLocaleString("en-IN")
                        )}
                      </td>
                      <td className="px-3 py-3"><ChurnBar score={c.churn} /></td>
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
                })}
              </>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between border-t border-border px-4 py-3 text-[13px] text-muted">
        <div>
          Total MRR · <strong className="text-heading">₹39,983</strong>
          <span className="mx-2.5 text-[#cdd9e4]">|</span>
          12 clinics
        </div>
        <div className="flex items-center gap-2.5">
          <span>Rows: 50</span>
          <button
            type="button"
            aria-label="Previous"
            className="grid h-8 w-8 place-items-center rounded-sm border border-border bg-white text-[#cdd9e4]"
          >
            <i className="fas fa-angle-left text-[12px]" />
          </button>
          <span>1 / 1</span>
          <button
            type="button"
            aria-label="Next"
            className="grid h-8 w-8 place-items-center rounded-sm border border-border bg-white text-[#cdd9e4]"
          >
            <i className="fas fa-angle-right text-[12px]" />
          </button>
        </div>
      </div>
    </div>
  );
}

function BulkActionBar() {
  return (
    <div className="sticky bottom-6 z-10 mt-6 flex flex-wrap items-center gap-3.5 rounded-[12px] bg-heading px-5 py-3.5 text-white shadow-[0_12px_32px_-10px_rgba(16,24,40,0.4)]">
      <span className="inline-flex items-center gap-1.5 rounded-md bg-brand px-3 py-1 text-[12px] font-semibold">
        <i className="fas fa-check text-[10px]" />
        2 selected
      </span>
      <span className="text-[13px] text-white/75">Care First Multispecialty, Anand Skin Clinic</span>
      <div className="flex-1" />
      <button
        type="button"
        className="inline-flex items-center gap-2 rounded-md border border-white/20 bg-white/10 px-3.5 py-1.5 text-[13px] font-medium"
      >
        <i className="fas fa-bullhorn text-[11px]" /> Send announcement
      </button>
      <button
        type="button"
        className="inline-flex items-center gap-2 rounded-md border border-white/20 bg-white/10 px-3.5 py-1.5 text-[13px] font-medium"
      >
        <i className="fas fa-pause text-[11px]" /> Pause
      </button>
      <button
        type="button"
        className="inline-flex items-center gap-2 rounded-md border border-white/20 bg-white/10 px-3.5 py-1.5 text-[13px] font-medium"
      >
        <i className="fas fa-file-csv text-[11px]" /> Export
      </button>
      <button type="button" aria-label="Dismiss" className="ml-1.5 text-white/60">
        <i className="fas fa-times text-[14px]" />
      </button>
    </div>
  );
}

export function SuperAdminClinics() {
  return (
    <div className="px-5 pt-7 md:px-8 md:pt-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-[28px] font-semibold leading-9 text-heading md:text-[32px] md:leading-10">
            Clinics
          </h2>
          <p className="mt-1 text-[14px] text-muted">All tenants on the platform · Updated just now.</p>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3.5 md:grid-cols-3 xl:grid-cols-6">
        <SaKpi label="Active clinics"     value="9"       sub="+1 this week"   deltaUp ic="fa-building" />
        <SaKpi label="Trial clinics"      value="2"       sub="2 closing < 14d"          ic="fa-hourglass-half" accent="coral" />
        <SaKpi label="Silver MRR"         value="₹13,993" sub="+₹2k MoM"       deltaUp ic="fa-circle" />
        <SaKpi label="Gold MRR"           value="₹34,993" sub="+₹5k MoM"       deltaUp ic="fa-crown" accent="coral" />
        <SaKpi label="WA messages · 30d"  value="84,210"  sub="+12% vs prev"   deltaUp ic="fa-comment-dots" />
        <SaKpi label="Churn risk"         value="3"       sub="≥ 60 score"     deltaUp={false} ic="fa-exclamation-triangle" accent="coral" />
      </div>

      <ClinicTable />
      <BulkActionBar />
    </div>
  );
}
