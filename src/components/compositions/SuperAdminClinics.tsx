import Link from "next/link";
import { serviceClient } from "@/lib/supabase/server";
import { formatInr } from "@/lib/billing/pricing";

/**
 * Cross-tenant clinic overview for superadmins. All numbers come from the live
 * DB — no mock arrays. Layout mirrors the original design but only renders
 * columns we actually have data for; cosmetic-only cells (churn-risk score,
 * "WA credit") were removed until the underlying signal exists.
 */

type ClinicRow = {
  id:                  string;
  name:                string;
  slug:                string;
  status:              string;             // active | onboarding | suspended
  verification_status: string;
  created_at:          string;
  updated_at:          string;
  subscription: {
    status:            string;             // trialing | active | past_due | …
    trial_ends_at:     string | null;
    extra_seats:       number;
    plan: {
      id:                    string;
      code:                  string;
      display_name:          string;
      monthly_price_inr:     number;
      included_doctor_seats: number;
      extra_seat_price_inr:  number;
    } | null;
  } | null;
  patient_count: number;
};

type Kpis = {
  active:        number;
  trialing:      number;
  past_due:      number;
  totalMrrInr:   number;
  waMessages30d: number;
  pendingVerif:  number;
};

export async function SuperAdminClinics() {
  const supabase = serviceClient();

  // ---- 1. Pull clinics + their active subscription + plan in one round-trip.
  const { data: rawClinics } = await supabase
    .from("clinics")
    .select(`
      id, name, slug, status, verification_status, created_at, updated_at,
      subscription:subscriptions (
        status, trial_ends_at, extra_seats,
        plan:subscription_plans ( id, code, display_name, monthly_price_inr, included_doctor_seats, extra_seat_price_inr )
      )
    `)
    .order("created_at", { ascending: false });

  // ---- 2. Patient counts per clinic. One query, grouped client-side.
  const { data: patientRows } = await supabase
    .from("patients")
    .select("clinic_id");
  const patientCount = new Map<string, number>();
  for (const r of patientRows ?? []) {
    patientCount.set(r.clinic_id, (patientCount.get(r.clinic_id) ?? 0) + 1);
  }

  // The Supabase typings turn the embedded 1:N joins into arrays; coerce + pick
  // the single in-flight subscription per clinic (RLS + the partial unique
  // index in 0015 already guarantee at most one active row).
  type RawSub = {
    status:        string;
    trial_ends_at: string | null;
    extra_seats:   number;
    plan:          ClinicRow["subscription"] extends infer S
                    ? (S extends null ? never : S extends { plan: infer P } ? P : never)
                    : never
                   | Array<NonNullable<ClinicRow["subscription"]>["plan"]>;
  };
  const clinics: ClinicRow[] = (rawClinics ?? []).map((c) => {
    const subs = (c.subscription ?? []) as unknown as RawSub[];
    const sub  = subs.find((s) => ["trialing", "active", "past_due"].includes(s.status)) ?? subs[0] ?? null;
    return {
      id:                  c.id,
      name:                c.name,
      slug:                c.slug,
      status:              c.status,
      verification_status: c.verification_status,
      created_at:          c.created_at,
      updated_at:          c.updated_at,
      subscription: sub
        ? {
            status:        sub.status,
            trial_ends_at: sub.trial_ends_at,
            extra_seats:   sub.extra_seats,
            // PostgREST embeds 1:1 joins as either an array or single object
            // depending on the relationship hint — flatten defensively.
            plan:          Array.isArray(sub.plan) ? (sub.plan[0] ?? null) : (sub.plan ?? null),
          }
        : null,
      patient_count: patientCount.get(c.id) ?? 0,
    };
  });

  // ---- 3. KPIs.
  const kpis: Kpis = {
    active:        0,
    trialing:      0,
    past_due:      0,
    totalMrrInr:   0,
    waMessages30d: 0,
    pendingVerif:  0,
  };
  for (const c of clinics) {
    const sub  = c.subscription;
    const plan = sub?.plan;
    if (sub?.status === "active")    kpis.active   += 1;
    if (sub?.status === "trialing")  kpis.trialing += 1;
    if (sub?.status === "past_due")  kpis.past_due += 1;
    if (sub?.status === "active" && plan) {
      kpis.totalMrrInr +=
        plan.monthly_price_inr + (sub.extra_seats ?? 0) * plan.extra_seat_price_inr;
    }
    if (c.verification_status === "pending") kpis.pendingVerif += 1;
  }

  // wa_messages 30d count — single head-only query.
  const since30 = new Date(Date.now() - 30 * 24 * 3600_000).toISOString();
  const { count: waCount } = await supabase
    .from("wa_messages")
    .select("*", { count: "exact", head: true })
    .gte("created_at", since30);
  kpis.waMessages30d = waCount ?? 0;

  // ---- 4. Group rows by plan for the visual breakdown.
  const groupsMap = new Map<string, { label: string; code: string; rows: ClinicRow[]; mrr: number }>();
  for (const c of clinics) {
    const code  = c.subscription?.plan?.code ?? "unassigned";
    const label = c.subscription?.plan?.display_name ?? "No active subscription";
    if (!groupsMap.has(code)) groupsMap.set(code, { label, code, rows: [], mrr: 0 });
    const g = groupsMap.get(code)!;
    g.rows.push(c);
    if (c.subscription?.status === "active" && c.subscription?.plan) {
      g.mrr +=
        c.subscription.plan.monthly_price_inr +
        (c.subscription.extra_seats ?? 0) * c.subscription.plan.extra_seat_price_inr;
    }
  }
  const groups = Array.from(groupsMap.values()).sort((a, b) => b.mrr - a.mrr);

  return (
    <div className="px-5 pt-7 md:px-8 md:pt-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-[28px] font-semibold leading-9 text-heading md:text-[32px] md:leading-10">Clinics</h2>
          <p className="mt-1 text-[14px] text-muted">All tenants on the platform · Live data.</p>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3.5 md:grid-cols-3 xl:grid-cols-6">
        <SaKpi label="Active"             value={String(kpis.active)}                 ic="fa-building" />
        <SaKpi label="Trialing"           value={String(kpis.trialing)}               ic="fa-hourglass-half" accent="coral" />
        <SaKpi label="Past due"           value={String(kpis.past_due)}               ic="fa-exclamation-triangle" accent="coral" />
        <SaKpi label="MRR (active)"       value={formatInr(kpis.totalMrrInr)}         ic="fa-rupee-sign" />
        <SaKpi label="WA messages · 30d"  value={kpis.waMessages30d.toLocaleString("en-IN")} ic="fa-comment-dots" />
        <SaKpi label="Pending reviews"    value={String(kpis.pendingVerif)}           ic="fa-shield-alt" accent="coral" />
      </div>

      <ClinicTable groups={groups} totalMrr={kpis.totalMrrInr} totalClinics={clinics.length} />
    </div>
  );
}

// =============================================================================
// Presentation
// =============================================================================

function SaKpi({ label, value, ic, accent }: {
  label: string; value: string; ic: string; accent?: "coral";
}) {
  return (
    <div className="rounded-[12px] border border-border bg-white p-4">
      <div className="mb-2.5 flex items-center justify-between">
        <span
          className="grid h-8 w-8 place-items-center rounded-md text-[13px]"
          style={{
            background: accent === "coral" ? "#FFE7EC" : "#E6F1FA",
            color:      accent === "coral" ? "#EE344E" : "#0168B3",
          }}
        >
          <i className={`fas ${ic}`} />
        </span>
        <span className="text-[10px] font-semibold uppercase tracking-[0.06em] text-[#9aa9b8]">{label}</span>
      </div>
      <div className="text-[24px] font-bold leading-7 text-heading">{value}</div>
    </div>
  );
}

function PlanBadge({ label, code }: { label: string; code: string }) {
  const colours: Record<string, { bg: string; fg: string }> = {
    free:        { bg: "#F4F5F7", fg: "#575757" },
    visibility:  { bg: "#E6F1FA", fg: "#0E5087" },
    practice:    { bg: "#FFE7EC", fg: "#EE344E" },
    pro:         { bg: "#F4E5FA", fg: "#6b3aa1" },
    unassigned:  { bg: "#F4F5F7", fg: "#9aa9b8" },
  };
  const c = colours[code] ?? { bg: "#F4F5F7", fg: "#575757" };
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-pill px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-[0.04em]"
      style={{ background: c.bg, color: c.fg }}
    >
      <i className="fas fa-circle text-[7px]" />
      {label}
    </span>
  );
}

function StatusPill({ status, trialEndsAt }: { status: string | undefined; trialEndsAt: string | null }) {
  if (!status) return <span className="text-[12px] text-[#9aa9b8]">No subscription</span>;
  const colours: Record<string, { bg: string; fg: string; dot: string }> = {
    active:    { bg: "#E6F4EC", fg: "#3a8b5e", dot: "#3a8b5e" },
    trialing:  { bg: "#FFF8EC", fg: "#7a5c2b", dot: "#7a5c2b" },
    past_due:  { bg: "#FFE7EC", fg: "#EE344E", dot: "#EE344E" },
    cancelled: { bg: "#F4F5F7", fg: "#575757", dot: "#9aa9b8" },
    paused:    { bg: "#F4F5F7", fg: "#575757", dot: "#9aa9b8" },
  };
  const c = colours[status] ?? { bg: "#F4F5F7", fg: "#575757", dot: "#9aa9b8" };
  return (
    <span className="inline-flex items-center gap-1.5 text-[12px] font-medium capitalize" style={{ color: c.fg }}>
      <span className="h-[7px] w-[7px] rounded-pill" style={{ background: c.dot }} />
      {status.replace("_", " ")}
      {status === "trialing" && trialEndsAt && (
        <span className="text-[11px] text-[#9aa9b8]">· ends {new Date(trialEndsAt).toLocaleDateString("en-IN")}</span>
      )}
    </span>
  );
}

function VerifBadge({ status }: { status: string }) {
  if (status === "verified")  return <span className="rounded-pill bg-[#E6F4EC] px-2 py-0.5 text-[10px] font-semibold text-[#3a8b5e]">Verified</span>;
  if (status === "pending")   return <span className="rounded-pill bg-[#FFF8EC] px-2 py-0.5 text-[10px] font-semibold text-[#7a5c2b]">Pending</span>;
  if (status === "rejected")  return <span className="rounded-pill bg-[#FFE7EC] px-2 py-0.5 text-[10px] font-semibold text-cta">Rejected</span>;
  return <span className="rounded-pill bg-[#F4F5F7] px-2 py-0.5 text-[10px] font-semibold text-[#9aa9b8]">—</span>;
}

function ClinicTable({
  groups,
  totalMrr,
  totalClinics,
}: {
  groups:       Array<{ label: string; code: string; rows: ClinicRow[]; mrr: number }>;
  totalMrr:     number;
  totalClinics: number;
}) {
  if (totalClinics === 0) {
    return (
      <div className="rounded-[12px] border border-dashed border-border bg-white p-12 text-center text-[13px] text-muted">
        No clinics yet. New signups will appear here as they finalize onboarding.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-[12px] border border-border bg-white">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-heading text-white">
              <th className="px-3 py-3 pl-4 text-left text-[11px] font-semibold uppercase tracking-[0.06em]">Clinic</th>
              <th className="px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.06em]">Plan</th>
              <th className="px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.06em]">Status</th>
              <th className="px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.06em]">Verification</th>
              <th className="px-3 py-3 text-right text-[11px] font-semibold uppercase tracking-[0.06em]">MRR</th>
              <th className="px-3 py-3 text-right text-[11px] font-semibold uppercase tracking-[0.06em]">Patients</th>
              <th className="px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.06em]">Joined</th>
              <th className="px-3 py-3 pr-4 text-right text-[11px] font-semibold uppercase tracking-[0.06em]">View</th>
            </tr>
          </thead>
          <tbody>
            {groups.map((g) => (
              <PlanGroup key={g.code} group={g} />
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between border-t border-border px-4 py-3 text-[13px] text-muted">
        <div>
          Total MRR · <strong className="text-heading">{formatInr(totalMrr)}</strong>
          <span className="mx-2.5 text-[#cdd9e4]">|</span>
          {totalClinics} clinic{totalClinics === 1 ? "" : "s"}
        </div>
      </div>
    </div>
  );
}

function PlanGroup({ group }: { group: { label: string; code: string; rows: ClinicRow[]; mrr: number } }) {
  return (
    <>
      <tr className="bg-[#F4F5F7]">
        <td colSpan={8} className="px-4 py-2.5">
          <div className="flex items-center gap-2.5">
            <PlanBadge label={group.label} code={group.code} />
            <span className="text-[13px] font-semibold text-heading">{group.rows.length} clinic{group.rows.length === 1 ? "" : "s"}</span>
            {group.mrr > 0 && (
              <>
                <span className="text-[12px] text-[#9aa9b8]">·</span>
                <span className="text-[12px] text-muted">MRR {formatInr(group.mrr)}</span>
              </>
            )}
          </div>
        </td>
      </tr>
      {group.rows.map((c, i) => {
        const sub  = c.subscription;
        const plan = sub?.plan;
        const mrr  = sub?.status === "active" && plan
          ? plan.monthly_price_inr + (sub.extra_seats ?? 0) * plan.extra_seat_price_inr
          : 0;
        return (
          <tr key={c.id} className="border-b border-[#F4F5F7]" style={{ background: i % 2 === 0 ? "#fff" : "#F9F9F9" }}>
            <td className="px-3 py-3 pl-4">
              <div className="flex items-center gap-2.5">
                <span className="grid h-8 w-8 place-items-center rounded-md bg-[#E6F1FA] text-[11px] font-bold text-[#0E5087]">
                  {initialsOf(c.name)}
                </span>
                <div>
                  <div className="text-[14px] font-semibold text-heading">{c.name}</div>
                  <div className="flex items-center gap-1.5 text-[11px] text-[#9aa9b8]">
                    <span className="font-mono">/{c.slug}</span>
                  </div>
                </div>
              </div>
            </td>
            <td className="px-3 py-3">
              {plan
                ? <PlanBadge label={plan.display_name} code={plan.code} />
                : <span className="text-[12px] text-[#9aa9b8]">—</span>}
              {sub && sub.extra_seats > 0 && <div className="mt-0.5 text-[10px] text-muted">+{sub.extra_seats} seat{sub.extra_seats === 1 ? "" : "s"}</div>}
            </td>
            <td className="px-3 py-3"><StatusPill status={sub?.status} trialEndsAt={sub?.trial_ends_at ?? null} /></td>
            <td className="px-3 py-3"><VerifBadge status={c.verification_status} /></td>
            <td className="px-3 py-3 text-right text-[13px] font-semibold text-heading">
              {mrr === 0 ? <span className="font-normal text-[#9aa9b8]">—</span> : formatInr(mrr)}
            </td>
            <td className="px-3 py-3 text-right text-[13px] text-heading">{c.patient_count.toLocaleString("en-IN")}</td>
            <td className="px-3 py-3 text-[12px] text-muted">{new Date(c.created_at).toLocaleDateString("en-IN")}</td>
            <td className="px-3 py-3 pr-4 text-right">
              <Link href={`/d/${c.slug}`} target="_blank" rel="noopener noreferrer" className="text-[12px] text-link-hover no-underline" title="Open public profile">
                <i className="fas fa-external-link-alt text-[11px]" />
              </Link>
            </td>
          </tr>
        );
      })}
    </>
  );
}

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0] ?? "").join("").toUpperCase();
}
