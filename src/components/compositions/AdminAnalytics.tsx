"use client";

// Admin · /admin/analytics — KPI strip, line chart, top services, language donut, microsite, no-show table

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo } from "react";
import type {
  AdminAnalyticsData,
  AnalyticsPeriod,
  BookingPoint,
  LangSlice,
  MicrositeTile,
  NoShowRow,
  ServiceBar,
} from "@/lib/data/admin-analytics";

type Period = AnalyticsPeriod | "custom";

const PERIOD_LABEL: Record<Period, string> = {
  "7d": "Last 7 days",
  "30d": "Last 30 days",
  "90d": "Last 90 days",
  "custom": "Custom range",
};

function KpiAnal({ label, value, delta, deltaUp, ic }: { label: string; value: string; delta: string; deltaUp: boolean; ic: string }) {
  return (
    <div className="rounded-[12px] border border-border bg-white p-5">
      <div className="mb-3.5 flex items-center justify-between">
        <span className="grid h-9 w-9 place-items-center rounded-md bg-[#E6F1FA] text-[14px] text-brand">
          <i className={`fas ${ic}`} />
        </span>
        <span className="text-[11px] font-medium uppercase tracking-[0.06em] text-[#9aa9b8]">{label}</span>
      </div>
      <div className="text-[28px] font-bold leading-9 text-heading md:text-[32px] md:leading-9">{value}</div>
      <div
        className="mt-2 inline-flex items-center gap-1.5 rounded-pill px-2.5 py-0.5 text-[12px] font-semibold"
        style={{
          background: deltaUp ? "#E6F4EC" : "#FFE7EC",
          color: deltaUp ? "#3a8b5e" : "#EE344E",
        }}
      >
        <i className={`fas ${deltaUp ? "fa-arrow-up" : "fa-arrow-down"} text-[9px]`} />
        {delta}
        <span className="ml-1 font-normal text-[#9aa9b8]">vs prev 30d</span>
      </div>
    </div>
  );
}

function LineChart({ data: rawData }: { data: BookingPoint[] }) {
  // Defensive — if the data layer returned zero points, show at least one tick.
  const data = useMemo(() => (rawData.length > 0 ? rawData : [{ d: "—", online: 0, walkin: 0, phone: 0 }]), [rawData]);

  const W = 880, H = 280;
  const P = { l: 40, r: 20, t: 20, b: 36 };
  const innerW = W - P.l - P.r;
  const innerH = H - P.t - P.b;
  const max = 56;
  const step = data.length > 1 ? innerW / (data.length - 1) : innerW;
  const yT = (v: number) => P.t + innerH - (v / max) * innerH;
  const xT = (i: number) => P.l + i * step;
  const line = (key: "online" | "walkin" | "phone") =>
    data.map((d, i) => `${i === 0 ? "M" : "L"}${xT(i).toFixed(1)} ${yT(d[key]).toFixed(1)}`).join(" ");
  const area = `${line("online")} L ${xT(data.length - 1)} ${P.t + innerH} L ${xT(0)} ${P.t + innerH} Z`;
  const yTicks = [0, 14, 28, 42, 56];

  // Tooltip pinned to the second-to-last point (always present after a slice).
  const tipIdx = Math.max(0, data.length - 2);
  const tip = data[tipIdx]!;
  const labelEvery = data.length > 8 ? 2 : 1;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="block w-full">
      {yTicks.map((t) => (
        <g key={t}>
          <line x1={P.l} x2={P.l + innerW} y1={yT(t)} y2={yT(t)} stroke="#F4F5F7" strokeWidth="1" />
          <text x={P.l - 8} y={yT(t) + 4} fontSize="11" fill="#9aa9b8" textAnchor="end" fontFamily="Poppins">{t}</text>
        </g>
      ))}
      {data.map((d, i) =>
        i % labelEvery === 0 ? (
          <text key={i} x={xT(i)} y={H - 12} fontSize="11" fill="#9aa9b8" textAnchor="middle" fontFamily="Poppins">
            {d.d}
          </text>
        ) : null,
      )}
      <path d={area} fill="#0168B3" fillOpacity="0.08" />
      <path d={line("online")} fill="none" stroke="#0168B3" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      <path d={line("walkin")} fill="none" stroke="#EE344E" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      <path d={line("phone")} fill="none" stroke="#0E5087" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="4 4" />
      {/* Tooltip */}
      <line x1={xT(tipIdx)} x2={xT(tipIdx)} y1={P.t} y2={P.t + innerH} stroke="#cdd9e4" strokeDasharray="3 3" strokeWidth="1" />
      <circle cx={xT(tipIdx)} cy={yT(tip.online)} r="5" fill="#fff" stroke="#0168B3" strokeWidth="2.4" />
      <circle cx={xT(tipIdx)} cy={yT(tip.walkin)}  r="4" fill="#fff" stroke="#EE344E" strokeWidth="2.2" />
      <circle cx={xT(tipIdx)} cy={yT(tip.phone)}  r="4" fill="#fff" stroke="#0E5087" strokeWidth="2" />
      <g transform={`translate(${xT(tipIdx) + 12}, ${yT(tip.online) - 58})`}>
        <rect width="156" height="78" rx="8" fill="#272B41" />
        <text x="14" y="20" fontSize="11" fill="#9aa9b8" fontFamily="Poppins">{tip.d}, 2026</text>
        <circle cx="18" cy="36" r="4" fill="#0168B3" />
        <text x="28" y="40" fontSize="12" fill="#fff" fontFamily="Poppins">Online · {tip.online}</text>
        <circle cx="18" cy="54" r="4" fill="#EE344E" />
        <text x="28" y="58" fontSize="12" fill="#fff" fontFamily="Poppins">Walk-in · {tip.walkin}</text>
        <circle cx="18" cy="70" r="4" fill="#0E5087" />
        <text x="28" y="74" fontSize="12" fill="#fff" fontFamily="Poppins">Phone · {tip.phone}</text>
      </g>
    </svg>
  );
}

function Legend({ items }: { items: Array<{ label: string; color: string; checked: boolean }> }) {
  return (
    <div className="flex flex-wrap gap-3.5">
      {items.map((it) => (
        <label key={it.label} className="inline-flex cursor-pointer items-center gap-2 text-[13px] text-heading">
          <span
            className="relative h-3.5 w-3.5 rounded-sm border-[1.5px] border-[#cdd9e4]"
            style={{ background: it.checked ? it.color : "#fff" }}
          >
            {it.checked && <i className="fas fa-check absolute left-0.5 top-0.5 text-[9px] text-white" />}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block h-0.5 w-2.5 rounded-pill" style={{ background: it.color }} />
            {it.label}
          </span>
        </label>
      ))}
    </div>
  );
}

function StackedBar({ services }: { services: ServiceBar[] }) {
  const max = Math.max(80, ...services.map((s) => s.conf + s.comp));
  return (
    <div className="flex flex-col gap-3">
      {services.length === 0 && (
        <div className="rounded-md border border-dashed border-border bg-surface-muted py-6 text-center text-[13px] text-muted">
          No service activity for this window.
        </div>
      )}
      {services.map((s) => {
        const total = s.conf + s.comp;
        return (
          <div key={s.name} className="grid grid-cols-[100px_1fr_56px] items-center gap-3 md:grid-cols-[120px_1fr_56px]">
            <span className="text-[13px] font-medium text-heading">{s.name}</span>
            <div className="flex h-[18px] overflow-hidden rounded-pill bg-[#F4F5F7]">
              <div className="bg-brand" style={{ width: `${(s.conf / max) * 100}%` }} />
              <div className="bg-[#7AB6E0]" style={{ width: `${(s.comp / max) * 100}%` }} />
            </div>
            <span className="text-right text-[13px] font-semibold text-heading">{total}</span>
          </div>
        );
      })}
    </div>
  );
}

function Donut({ slices }: { slices: LangSlice[] }) {
  const total = slices.reduce((s, d) => s + d.value, 0) || 1;
  const r = 70, cx = 110, cy = 110, sw = 26;
  const C = 2 * Math.PI * r;
  let acc = -Math.PI / 2;
  return (
    <svg width="220" height="220" viewBox="0 0 220 220">
      {slices.map((d) => {
        const frac = d.value / total;
        const len = C * frac;
        const seg = (
          <circle
            key={d.label}
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke={d.color}
            strokeWidth={sw}
            strokeDasharray={`${len} ${C - len}`}
            strokeDashoffset={-((acc + Math.PI / 2) / (2 * Math.PI)) * C}
            transform={`rotate(-90 ${cx} ${cy})`}
            strokeLinecap="butt"
          />
        );
        acc += frac * 2 * Math.PI;
        return seg;
      })}
      <text x={cx} y={cy - 2} textAnchor="middle" fontSize="32" fontWeight="700" fill="#272B41" fontFamily="Poppins">
        {total}%
      </text>
      <text x={cx} y={cy + 18} textAnchor="middle" fontSize="11" fill="#9aa9b8" fontFamily="Poppins">
        of patients
      </text>
    </svg>
  );
}

function MiniChart({ data, color }: { data: number[]; color: string }) {
  const W = 240, H = 80;
  const max = Math.max(...data), min = Math.min(...data);
  const span = max - min || 1;
  const pts = data.map((v, i) => [(i / (data.length - 1)) * W, H - ((v - min) / span) * (H - 8) - 4] as const);
  const d = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(" ");
  return (
    <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
      <path d={`${d} L ${W} ${H} L 0 ${H} Z`} fill={color} fillOpacity="0.10" />
      <path d={d} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function MiniCard({ m }: { m: MicrositeTile }) {
  return (
    <div className="rounded-[12px] border border-border bg-white p-4">
      <div className="flex items-baseline justify-between">
        <span className="text-[12px] font-medium text-[#9aa9b8]">{m.label}</span>
        <span className={"text-[11px] font-semibold " + (m.up ? "text-[#3a8b5e]" : "text-cta")}>{m.delta}</span>
      </div>
      <div className="mb-2 mt-1 text-[24px] font-bold text-heading">{m.value}</div>
      <MiniChart data={m.data} color={m.up ? "#0168B3" : "#EE344E"} />
    </div>
  );
}

const PERIOD_RANGE_LABEL: Record<Period, string> = {
  "7d":     "3 May — 9 May 2026",
  "30d":    "10 Apr — 9 May 2026",
  "90d":    "9 Feb — 9 May 2026",
  "custom": "Pick range…",
};

type FilterBarProps = {
  period: Period;
  onPeriodChange: (p: Period) => void;
  doctor: string;
  onDoctorChange: (d: string) => void;
  service: string;
  onServiceChange: (s: string) => void;
};

function FilterBar({
  period,
  onPeriodChange,
  doctor,
  onDoctorChange,
  service,
  onServiceChange,
}: FilterBarProps) {
  const PILLS: Array<{ key: Period; label: string }> = [
    { key: "7d",     label: "7d" },
    { key: "30d",    label: "30d" },
    { key: "90d",    label: "90d" },
    { key: "custom", label: "Custom" },
  ];

  return (
    <div className="mb-6 flex flex-wrap items-center gap-2.5">
      <div className="inline-flex rounded-pill border border-border bg-white p-1">
        {PILLS.map((p) => {
          const active = period === p.key;
          return (
            <button
              key={p.key}
              type="button"
              onClick={() => onPeriodChange(p.key)}
              className={
                "cursor-pointer rounded-pill px-3.5 py-1.5 text-[13px] font-medium transition-colors " +
                (active ? "bg-brand text-white" : "bg-transparent text-heading hover:bg-surface-muted")
              }
            >
              {p.key === "custom" ? (
                <span className="inline-flex items-center gap-1.5">
                  <i className="fas fa-calendar text-[11px]" />
                  {p.label}
                </span>
              ) : (
                p.label
              )}
            </button>
          );
        })}
      </div>
      <span className="text-[13px] text-[#9aa9b8]">{PERIOD_RANGE_LABEL[period]}</span>
      <div className="flex-1" />
      <select
        value={doctor}
        onChange={(e) => onDoctorChange(e.target.value)}
        className="cursor-pointer rounded-md border border-border bg-white px-3 py-2 text-[13px] text-heading hover:border-link-hover"
      >
        <option value="all">All doctors</option>
        <option value="manoranjan">Dr. Manoranjan Mahakur</option>
        <option value="lipsa">Dr. Lipsa Pradhan</option>
        <option value="rashmita">Dr. Rashmita Sahoo</option>
      </select>
      <select
        value={service}
        onChange={(e) => onServiceChange(e.target.value)}
        className="cursor-pointer rounded-md border border-border bg-white px-3 py-2 text-[13px] text-heading hover:border-link-hover"
      >
        <option value="all">All services</option>
        <option value="rct">Root Canal</option>
        <option value="cleaning">Cleaning</option>
        <option value="braces">Braces</option>
      </select>
      <button
        type="button"
        className="hidden items-center gap-2 rounded-md border-[1.5px] border-link-hover bg-transparent px-3.5 py-2 text-[14px] font-medium text-link-hover hover:bg-link-hover hover:text-white md:inline-flex"
        onClick={() => alert("CSV export will be wired to a server action.")}
      >
        <i className="fas fa-download" /> Export
      </button>
    </div>
  );
}

function NoShowTable({ rows }: { rows: NoShowRow[] }) {
  return (
    <div className="overflow-hidden rounded-[12px] border border-border bg-white">
      <div className="flex items-baseline justify-between border-b border-border px-5 py-4">
        <div>
          <h3 className="text-[16px] font-semibold text-heading">Top no-show patients</h3>
          <p className="mt-0.5 text-[12px] text-muted">Last 30 days · sorted by repeat misses</p>
        </div>
        <a href="#" className="text-[13px] text-link-hover no-underline">View all 12</a>
      </div>
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-surface-muted">
            {["Patient", "No-shows", "Last contact", ""].map((h) => (
              <th
                key={h}
                className={
                  "px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-[#9aa9b8] " +
                  (h === "No-shows" ? "text-center" : "text-left")
                }
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr>
              <td colSpan={4} className="px-4 py-8 text-center text-[13px] text-muted">
                No repeat no-shows in this window — nice work.
              </td>
            </tr>
          )}
          {rows.map((p) => (
            <tr key={p.name} className="border-t border-[#F4F5F7]">
              <td className="px-4 py-3">
                <div className="flex items-center gap-2.5">
                  <span
                    className="grid h-8 w-8 place-items-center rounded-pill text-[11px] font-semibold"
                    style={{ background: p.avBg, color: p.avFg }}
                  >
                    {p.initials}
                  </span>
                  <span className="text-[14px] font-medium text-heading">{p.name}</span>
                </div>
              </td>
              <td className="px-4 py-3 text-center">
                <span className="rounded-pill bg-[#FFE7EC] px-2.5 py-0.5 text-[12px] font-semibold text-cta">
                  {p.count}×
                </span>
              </td>
              <td className="px-4 py-3 text-[13px] text-muted">{p.last}</td>
              <td className="px-4 py-3 text-right">
                <Link
                  href="/admin/messages"
                  className="inline-flex items-center gap-1.5 rounded-md bg-cta px-3.5 py-1.5 text-[13px] font-medium text-cta-fg no-underline hover:bg-[#d92843]"
                >
                  <i className="fab fa-whatsapp text-[12px]" /> Send reminder
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function AdminAnalytics({ data }: { data: AdminAnalyticsData }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const period = data.period;

  // Doctor + service filters stay client-side for now — they're not yet wired
  // through the data layer (would require re-fetching with the filter applied).
  const doctor  = searchParams.get("doctor")  ?? "all";
  const service = searchParams.get("service") ?? "all";

  const setPeriod = (next: Period) => {
    const params = new URLSearchParams(Array.from(searchParams.entries()));
    if (next === "custom") {
      // Custom range not modeled yet — fall back to 30d for the data load.
      params.set("period", "30d");
    } else {
      params.set("period", next);
    }
    router.push(`/admin/analytics?${params.toString()}`);
  };
  const setDoctor  = (next: string) => updateParam("doctor", next);
  const setService = (next: string) => updateParam("service", next);
  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(Array.from(searchParams.entries()));
    if (!value || value === "all") params.delete(key);
    else params.set(key, value);
    router.push(`/admin/analytics?${params.toString()}`);
  }

  const k = data.kpis;
  const kpi = {
    newPatients: k.newPatients.value,
    bookings:    k.bookings.value,
    noShow:      k.noShowRate.value,
    revenue:     k.revenue.value,
    deltas: {
      newPatients: k.newPatients.deltaLabel,
      bookings:    k.bookings.deltaLabel,
      noShow:      k.noShowRate.deltaLabel,
      revenue:     k.revenue.deltaLabel,
    },
  };
  const filtersActive = doctor !== "all" || service !== "all";

  return (
    <div className="px-5 pt-7 md:px-8 md:pt-8">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-[28px] font-semibold leading-9 text-heading md:text-[32px]">Analytics</h2>
          <p className="mt-1 text-[14px] text-muted">
            {PERIOD_LABEL[period]}
            {filtersActive && (
              <>
                <span className="mx-2 text-[#9aa9b8]">·</span>
                Filtered
                {doctor !== "all" && <> by {doctor === "manoranjan" ? "Dr. Manoranjan" : doctor === "lipsa" ? "Dr. Lipsa" : "Dr. Rashmita"}</>}
                {service !== "all" && <> · {service === "rct" ? "Root Canal" : service === "cleaning" ? "Cleaning" : "Braces"}</>}
              </>
            )}
          </p>
        </div>
      </div>

      <FilterBar
        period={period}
        onPeriodChange={setPeriod}
        doctor={doctor}
        onDoctorChange={setDoctor}
        service={service}
        onServiceChange={setService}
      />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiAnal label="New patients"  value={kpi.newPatients} delta={kpi.deltas.newPatients} deltaUp ic="fa-user-plus" />
        <KpiAnal label="Bookings"      value={kpi.bookings}    delta={kpi.deltas.bookings}    deltaUp ic="fa-calendar-check" />
        <KpiAnal label="No-show rate"  value={kpi.noShow}      delta={kpi.deltas.noShow}      deltaUp ic="fa-user-clock" />
        <KpiAnal label="Total revenue" value={kpi.revenue}     delta={kpi.deltas.revenue}     deltaUp ic="fa-rupee-sign" />
      </div>

      <div className="mb-6 rounded-[12px] border border-border bg-white p-5 md:p-6">
        <div className="mb-3.5 flex flex-wrap items-baseline justify-between gap-3">
          <div>
            <h3 className="text-[18px] font-semibold text-heading">Bookings over time</h3>
            <p className="mt-0.5 text-[12px] text-muted">{PERIOD_LABEL[period]}</p>
          </div>
          <Legend
            items={[
              { label: "Online",  color: "#0168B3", checked: true },
              { label: "Walk-in", color: "#EE344E", checked: true },
              { label: "Phone",   color: "#0E5087", checked: true },
            ]}
          />
        </div>
        <LineChart data={data.bookingTimeline} />
      </div>

      <div className="mb-6 grid grid-cols-1 gap-5 lg:grid-cols-[1.4fr_1fr]">
        <div className="rounded-[12px] border border-border bg-white p-5 md:p-6">
          <div className="mb-4 flex flex-wrap items-baseline justify-between gap-3">
            <div>
              <h3 className="text-[18px] font-semibold text-heading">Top services by bookings</h3>
              <p className="mt-0.5 text-[12px] text-muted">Confirmed + completed</p>
            </div>
            <Legend
              items={[
                { label: "Confirmed", color: "#0168B3", checked: true },
                { label: "Completed", color: "#7AB6E0", checked: true },
              ]}
            />
          </div>
          <StackedBar services={data.topServices} />
        </div>

        <div className="rounded-[12px] border border-border bg-white p-5 md:p-6">
          <h3 className="text-[18px] font-semibold text-heading">Patients by language</h3>
          <p className="mb-4 mt-0.5 text-[12px] text-muted">Used at booking</p>
          <div className="flex flex-col items-center gap-6 md:flex-row">
            <Donut slices={data.languageMix} />
            <div className="flex w-full flex-1 flex-col gap-3.5">
              {data.languageMix.map((d) => (
                <div key={d.label}>
                  <div className="mb-1 flex justify-between text-[13px] text-heading">
                    <span className="inline-flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-pill" style={{ background: d.color }} />
                      {d.label}
                    </span>
                    <strong>{d.value}%</strong>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-pill bg-[#F4F5F7]">
                    <div className="h-full" style={{ width: `${d.value}%`, background: d.color }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="mb-6 rounded-[12px] border border-border bg-white p-5 md:p-6">
        <div className="mb-4 flex flex-wrap items-baseline justify-between gap-3">
          <div>
            <h3 className="text-[18px] font-semibold text-heading">Microsite analytics</h3>
            <p className="mt-0.5 text-[12px] text-muted">Pulled from Google Analytics 4 + Google Business Profile.</p>
          </div>
          <span className="rounded-pill bg-[#E6F4EC] px-2.5 py-0.5 text-[11px] font-semibold text-[#3a8b5e]">
            <i className="fas fa-link mr-1 text-[9px]" /> Connected
          </span>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {data.microsite.map((m) => <MiniCard key={m.label} m={m} />)}
        </div>
      </div>

      <NoShowTable rows={data.noShows} />
    </div>
  );
}
