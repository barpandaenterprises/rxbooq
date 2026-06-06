"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { FormField, TEXT_INPUT_CLASS } from "@/components/molecules/FormField";
import {
  createPlanAction,
  updatePlanAction,
  type PlanFeaturesInput,
  type PlanInput,
} from "@/app/(super-admin)/superadmin/plans/actions";

type Mode = "create" | { edit: string };

type Props = {
  mode:     Mode;
  /** Pre-fill values (edit mode) or sensible defaults (create). */
  initial?: Partial<PlanInput>;
};

const DEFAULT_FEATURES: PlanFeaturesInput = {
  public_listing:      true,
  patient_enquiries:   true,
  calendar:            false,
  emr:                 false,
  whatsapp_templates:  false,
  sponsored_placement: false,
  online_consult:      false,
  custom_domain:       false,
  departments_max:     1,
  analytics:           "none",
};

const FEATURE_BOOL_KEYS: { key: keyof PlanFeaturesInput; label: string; hint?: string }[] = [
  { key: "public_listing",      label: "Public clinic profile",         hint: "Show on /{slug}" },
  { key: "patient_enquiries",   label: "Patient enquiry form",          hint: "Public 'request callback' on the profile" },
  { key: "calendar",            label: "Online appointment scheduling" },
  { key: "emr",                 label: "Digital prescriptions / EMR" },
  { key: "whatsapp_templates",  label: "WhatsApp reminders + broadcasts" },
  { key: "sponsored_placement", label: "Boosted listings",              hint: "Priority on directory/specialty pages" },
  { key: "online_consult",      label: "Online consult",                hint: "Telemedicine toggle on profile" },
  { key: "custom_domain",       label: "Custom domain" },
];

export function PlanForm({ mode, initial }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const isEdit = typeof mode === "object";

  const [code,         setCode]         = useState(initial?.code ?? "");
  const [displayName,  setDisplayName]  = useState(initial?.display_name ?? "");
  const [tagline,      setTagline]      = useState(initial?.tagline ?? "");
  const [monthly,      setMonthly]      = useState(String(initial?.monthly_price_inr ?? ""));
  const [annual,       setAnnual]       = useState(initial?.annual_price_inr != null ? String(initial.annual_price_inr) : "");
  const [includedSeats, setIncluded]    = useState(String(initial?.included_doctor_seats ?? "1"));
  const [extraSeat,    setExtraSeat]    = useState(String(initial?.extra_seat_price_inr ?? "0"));
  const [features,     setFeatures]     = useState<PlanFeaturesInput>(initial?.features ?? DEFAULT_FEATURES);
  const [isActive,     setIsActive]     = useState(initial?.is_active ?? true);
  const [isPopular,    setIsPopular]    = useState(initial?.is_popular ?? false);
  const [sortOrder,    setSortOrder]    = useState(String(initial?.sort_order ?? 100));

  const [error,    setError]    = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);

  const setFeature = <K extends keyof PlanFeaturesInput>(key: K, value: PlanFeaturesInput[K]) => {
    setFeatures((prev) => ({ ...prev, [key]: value }));
  };

  const submit = () => {
    setError(null);
    setWarnings([]);
    const payload: PlanInput = {
      code:                  code.toLowerCase().trim(),
      display_name:          displayName.trim(),
      tagline:               tagline.trim() ? tagline.trim() : null,
      monthly_price_inr:     Number(monthly || 0),
      annual_price_inr:      annual.trim() ? Number(annual) : null,
      included_doctor_seats: Number(includedSeats || 0),
      extra_seat_price_inr:  Number(extraSeat || 0),
      features,
      is_active:             isActive,
      is_popular:            isPopular,
      sort_order:            Number(sortOrder || 0),
    };

    startTransition(async () => {
      const res = isEdit
        ? await updatePlanAction({ ...payload, id: mode.edit })
        : await createPlanAction(payload);
      if (!res.ok) { setError(res.error); return; }
      if (res.warnings && res.warnings.length > 0) setWarnings(res.warnings);
      router.push("/superadmin/plans");
    });
  };

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-md border border-[#f3d3d8] bg-[#fff5f6] px-3 py-2 text-[13px] text-heading">{error}</div>
      )}
      {warnings.length > 0 && (
        <div className="space-y-1 rounded-md border border-[#f5e3c0] bg-[#fff8ec] px-3 py-2 text-[13px] text-heading">
          {warnings.map((w, i) => <div key={i}><i className="fas fa-exclamation-triangle mr-1.5 text-[11px] text-[#a86a00]" />{w}</div>)}
        </div>
      )}

      {/* Basics */}
      <Section title="Basics">
        <div className="grid gap-4 md:grid-cols-2">
          <FormField label="Code" required hint="Lowercase identifier used in URLs (?plan=growth)">
            <input className={TEXT_INPUT_CLASS + " font-mono"} value={code} onChange={(e) => setCode(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))} placeholder="growth" />
          </FormField>
          <FormField label="Display name" required>
            <input className={TEXT_INPUT_CLASS} value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Growth" />
          </FormField>
        </div>
        <FormField label="Tagline" hint="One-line description shown on /pricing and the plan picker">
          <input className={TEXT_INPUT_CLASS} value={tagline} onChange={(e) => setTagline(e.target.value)} placeholder="Be seen first on specialty and city searches." />
        </FormField>
      </Section>

      {/* Pricing */}
      <Section title="Pricing">
        <div className="grid gap-4 md:grid-cols-3">
          <FormField label="Monthly price (₹)" required hint="0 = Free tier">
            <input className={TEXT_INPUT_CLASS} inputMode="numeric" value={monthly} onChange={(e) => setMonthly(e.target.value.replace(/\D/g, ""))} placeholder="999" />
          </FormField>
          <FormField label="Annual price (₹, optional)">
            <input className={TEXT_INPUT_CLASS} inputMode="numeric" value={annual} onChange={(e) => setAnnual(e.target.value.replace(/\D/g, ""))} placeholder="9990" />
          </FormField>
          <FormField label="Sort order" hint="Lower = earlier in /pricing">
            <input className={TEXT_INPUT_CLASS} inputMode="numeric" value={sortOrder} onChange={(e) => setSortOrder(e.target.value.replace(/\D/g, ""))} placeholder="100" />
          </FormField>
          <FormField label="Doctor seats included" required>
            <input className={TEXT_INPUT_CLASS} inputMode="numeric" value={includedSeats} onChange={(e) => setIncluded(e.target.value.replace(/\D/g, ""))} placeholder="3" />
          </FormField>
          <FormField label="Extra seat price (₹/mo)" hint="0 if no seat add-on available">
            <input className={TEXT_INPUT_CLASS} inputMode="numeric" value={extraSeat} onChange={(e) => setExtraSeat(e.target.value.replace(/\D/g, ""))} placeholder="499" />
          </FormField>
        </div>
      </Section>

      {/* Features */}
      <Section title="Features">
        <div className="grid gap-2 md:grid-cols-2">
          {FEATURE_BOOL_KEYS.map((f) => (
            <label key={f.key} className="flex cursor-pointer items-start gap-2 rounded-md border border-border bg-white p-3">
              <input
                type="checkbox"
                checked={Boolean(features[f.key])}
                onChange={(e) => setFeature(f.key, e.target.checked as never)}
                className="mt-0.5"
              />
              <div>
                <div className="text-[13px] font-medium text-heading">{f.label}</div>
                {f.hint && <div className="text-[11px] text-muted">{f.hint}</div>}
              </div>
            </label>
          ))}
        </div>
        <div className="mt-3 grid gap-4 md:grid-cols-2">
          <FormField label="Departments cap" hint="0 = unlimited">
            <input className={TEXT_INPUT_CLASS} inputMode="numeric" value={String(features.departments_max)} onChange={(e) => setFeature("departments_max", Number(e.target.value.replace(/\D/g, "")) || 0)} />
          </FormField>
          <FormField label="Analytics tier">
            <select className={TEXT_INPUT_CLASS} value={features.analytics} onChange={(e) => setFeature("analytics", e.target.value as "none" | "basic" | "full")}>
              <option value="none">None</option>
              <option value="basic">Basic</option>
              <option value="full">Full</option>
            </select>
          </FormField>
        </div>
      </Section>

      {/* Visibility */}
      <Section title="Visibility">
        <div className="flex flex-wrap gap-4">
          <label className="flex cursor-pointer items-center gap-2 text-[13px] text-heading">
            <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
            Active <span className="text-[11px] text-muted">(shows on /pricing and the picker)</span>
          </label>
          <label className="flex cursor-pointer items-center gap-2 text-[13px] text-heading">
            <input type="checkbox" checked={isPopular} onChange={(e) => setIsPopular(e.target.checked)} />
            &quot;Most popular&quot; badge
          </label>
        </div>
      </Section>

      <div className="flex justify-end gap-2">
        <button type="button" onClick={() => router.push("/superadmin/plans")} className="rounded-md border border-border bg-white px-4 py-2 text-[13px] text-muted hover:text-heading">Cancel</button>
        <button
          type="button"
          disabled={pending || !code || !displayName || !monthly}
          onClick={submit}
          className="rounded-md bg-cta px-5 py-2.5 text-[13px] font-medium text-cta-fg disabled:opacity-60"
        >
          {pending ? "Saving…" : (isEdit ? "Save changes" : "Create plan")}
        </button>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-white p-5">
      <h3 className="mb-3 text-[14px] font-semibold text-heading">{title}</h3>
      {children}
    </div>
  );
}
