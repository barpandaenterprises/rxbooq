"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { FormField, TEXT_INPUT_CLASS } from "@/components/molecules/FormField";
import { updateDraftAction } from "@/app/(super-admin)/superadmin/applications/actions";

export type PlanOption = { id: string; display_name: string; monthly_price_inr: number };

export type EditableDraft = {
  id:                       string;
  clinic_name:              string | null;
  suggested_slug:           string | null;
  address:                  string | null;
  city:                     string | null;
  state:                    string | null;
  pincode:                  string | null;
  primary_phone:            string | null;
  primary_email:            string | null;
  doctor_full_name:         string | null;
  doctor_registration_no:   string | null;
  doctor_qualifications:    string | null;
  doctor_primary_specialty: string | null;
  doctor_years_experience:  number | null;
  selected_plan_id:         string | null;
  requested_doctor_seats:   number | null;
};

function localTenDigits(v: string | null): string {
  if (!v) return "";
  const digits = v.replace(/\D/g, "");
  const local = digits.length > 10 && digits.startsWith("91") ? digits.slice(2) : digits;
  return local.slice(-10);
}

export function DraftEditForm({ draft, plans }: { draft: EditableDraft; plans: PlanOption[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const [name, setName]       = useState(draft.clinic_name ?? "");
  const [slug, setSlug]       = useState(draft.suggested_slug ?? "");
  const [address, setAddress] = useState(draft.address ?? "");
  const [state, setState]     = useState(draft.state ?? "");
  const [city, setCity]       = useState(draft.city ?? "");
  const [pincode, setPincode] = useState(draft.pincode ?? "");
  const [phoneDigits, setPhoneDigits] = useState(() => localTenDigits(draft.primary_phone));
  const [email, setEmail]     = useState(draft.primary_email ?? "");

  const [docName, setDocName]       = useState(draft.doctor_full_name ?? "");
  const [docReg, setDocReg]         = useState(draft.doctor_registration_no ?? "");
  const [docQual, setDocQual]       = useState(draft.doctor_qualifications ?? "");
  const [docSpecialty, setDocSpecialty] = useState(draft.doctor_primary_specialty ?? "");
  const [docYears, setDocYears]     = useState(draft.doctor_years_experience != null ? String(draft.doctor_years_experience) : "");

  const [planId, setPlanId]   = useState(draft.selected_plan_id ?? "");
  const [seats, setSeats]     = useState(String(draft.requested_doctor_seats ?? 1));

  const clearErr = (key: string) =>
    setFieldErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });

  const validate = (): Record<string, string> => {
    const e: Record<string, string> = {};
    if (slug.trim() && !/^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(slug.trim())) e.suggested_slug = "Use lowercase letters, digits, and hyphens.";
    if (pincode.trim() && !/^[0-9]{6}$/.test(pincode.trim())) e.pincode = "Enter a valid 6-digit pincode.";
    if (phoneDigits && phoneDigits.length !== 10) e.primary_phone = "Enter the 10-digit number, or leave it blank.";
    if (email.trim() && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) e.primary_email = "Enter a valid email address.";
    if (docYears && !/^\d{1,2}$/.test(docYears)) e.doctor_years_experience = "Enter a number of years.";
    return e;
  };

  const submit = () => {
    setError(null);
    setSaved(false);
    const v = validate();
    setFieldErrors(v);
    if (Object.keys(v).length > 0) return;

    startTransition(async () => {
      const res = await updateDraftAction(draft.id, {
        clinic_name:    name.trim() || undefined,
        suggested_slug: slug.trim(),
        address:        address.trim() || undefined,
        city:           city.trim() || undefined,
        state:          state.trim() || undefined,
        pincode:        pincode.trim(),
        primary_phone:  phoneDigits ? `+91${phoneDigits}` : "",
        primary_email:  email.trim() || "",
        doctor_full_name:         docName.trim() || undefined,
        doctor_registration_no:   docReg.trim() || undefined,
        doctor_qualifications:    docQual.trim() || undefined,
        doctor_primary_specialty: docSpecialty.trim() || undefined,
        doctor_years_experience:  docYears ? Number(docYears) : null,
        selected_plan_id:         planId || null,
        requested_doctor_seats:   Math.max(1, Number(seats) || 1),
      });
      if (!res.ok) {
        if (res.fieldErrors && Object.keys(res.fieldErrors).length > 0) setFieldErrors(res.fieldErrors);
        else setError(res.error);
        return;
      }
      setSaved(true);
      router.refresh();
    });
  };

  return (
    <div className="mx-auto w-full max-w-[860px] px-5 py-8 md:px-8">
      <div className="mb-6 flex items-center gap-3">
        <Link href="/superadmin/applications" className="grid h-8 w-8 place-items-center rounded-md border border-border text-muted no-underline hover:bg-surface-muted" title="Back to drafts">
          <i className="fas fa-arrow-left text-[12px]" />
        </Link>
        <div>
          <h1 className="text-[22px] font-semibold text-heading">Edit draft</h1>
          <p className="mt-0.5 text-[13px] text-muted">In-flight onboarding application · all fields optional.</p>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-md border border-[#f3d3d8] bg-[#fff5f6] px-3 py-2 text-[13px] text-heading">{error}</div>
      )}
      {saved && (
        <div className="mb-4 rounded-md border border-[#cfe8d8] bg-[#f0f9f3] px-3 py-2 text-[13px] text-[#1f7a3a]">
          <i className="fas fa-check-circle mr-1.5 text-[11px]" /> Changes saved.
        </div>
      )}

      <Section title="Clinic">
        <div className="grid gap-x-4 md:grid-cols-2">
          <FormField label="Clinic name" error={fieldErrors.clinic_name}>
            <input className={TEXT_INPUT_CLASS} value={name} onChange={(e) => { setName(e.target.value); clearErr("clinic_name"); }} placeholder="Mahakur Poly Dental Clinic" />
          </FormField>
          <FormField label="URL slug" error={fieldErrors.suggested_slug} hint={slug ? `rxbooq.com/${slug}` : "Lowercase letters, digits, hyphens"}>
            <input className={TEXT_INPUT_CLASS} value={slug} onChange={(e) => { setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "")); clearErr("suggested_slug"); }} placeholder="mahakur" />
          </FormField>
          <div className="md:col-span-2">
            <FormField label="Street address" error={fieldErrors.address}>
              <input className={TEXT_INPUT_CLASS} value={address} onChange={(e) => { setAddress(e.target.value); clearErr("address"); }} placeholder="Plot 12, MG Road" />
            </FormField>
          </div>
          <FormField label="State" error={fieldErrors.state}>
            <input className={TEXT_INPUT_CLASS} value={state} onChange={(e) => { setState(e.target.value); clearErr("state"); }} placeholder="Odisha" />
          </FormField>
          <FormField label="City" error={fieldErrors.city}>
            <input className={TEXT_INPUT_CLASS} value={city} onChange={(e) => { setCity(e.target.value); clearErr("city"); }} placeholder="Sambalpur" />
          </FormField>
          <FormField label="Pincode" error={fieldErrors.pincode}>
            <input className={TEXT_INPUT_CLASS} inputMode="numeric" maxLength={6} value={pincode} onChange={(e) => { setPincode(e.target.value.replace(/\D/g, "")); clearErr("pincode"); }} placeholder="768001" />
          </FormField>
          <FormField label="Contact phone" error={fieldErrors.primary_phone}>
            <div className="flex gap-2">
              <span className="grid w-[60px] shrink-0 place-items-center rounded-md border-[1.5px] border-border bg-surface-muted text-[15px] text-muted">+91</span>
              <input className={TEXT_INPUT_CLASS} type="tel" inputMode="numeric" maxLength={10} value={phoneDigits} onChange={(e) => { setPhoneDigits(e.target.value.replace(/\D/g, "").slice(0, 10)); clearErr("primary_phone"); }} placeholder="9999900001" />
            </div>
          </FormField>
          <FormField label="Contact email" error={fieldErrors.primary_email}>
            <input className={TEXT_INPUT_CLASS} type="email" value={email} onChange={(e) => { setEmail(e.target.value); clearErr("primary_email"); }} placeholder="owner@clinic.in" />
          </FormField>
        </div>
      </Section>

      <Section title="Founding doctor">
        <div className="grid gap-x-4 md:grid-cols-2">
          <FormField label="Full name" error={fieldErrors.doctor_full_name}>
            <input className={TEXT_INPUT_CLASS} value={docName} onChange={(e) => { setDocName(e.target.value); clearErr("doctor_full_name"); }} placeholder="Dr. P. Mahakur" />
          </FormField>
          <FormField label="Registration no." error={fieldErrors.doctor_registration_no}>
            <input className={TEXT_INPUT_CLASS} value={docReg} onChange={(e) => { setDocReg(e.target.value); clearErr("doctor_registration_no"); }} placeholder="OD-12345" />
          </FormField>
          <FormField label="Qualifications" error={fieldErrors.doctor_qualifications}>
            <input className={TEXT_INPUT_CLASS} value={docQual} onChange={(e) => setDocQual(e.target.value)} placeholder="BDS, MDS" />
          </FormField>
          <FormField label="Primary specialty" error={fieldErrors.doctor_primary_specialty}>
            <input className={TEXT_INPUT_CLASS} value={docSpecialty} onChange={(e) => setDocSpecialty(e.target.value)} placeholder="Prosthodontics" />
          </FormField>
          <FormField label="Years of experience" error={fieldErrors.doctor_years_experience}>
            <input className={TEXT_INPUT_CLASS} inputMode="numeric" maxLength={2} value={docYears} onChange={(e) => { setDocYears(e.target.value.replace(/\D/g, "").slice(0, 2)); clearErr("doctor_years_experience"); }} placeholder="20" />
          </FormField>
        </div>
      </Section>

      <Section title="Plan">
        <div className="grid gap-x-4 md:grid-cols-2">
          <FormField label="Subscription plan" error={fieldErrors.selected_plan_id} hint="Leave as “No plan” if they haven't chosen yet.">
            <select className={TEXT_INPUT_CLASS} value={planId} onChange={(e) => { setPlanId(e.target.value); clearErr("selected_plan_id"); }}>
              <option value="">No plan yet</option>
              {plans.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.display_name}{p.monthly_price_inr > 0 ? ` — ₹${p.monthly_price_inr}/mo` : " — Free"}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label="Doctor seats">
            <input className={TEXT_INPUT_CLASS} inputMode="numeric" maxLength={2} value={seats} onChange={(e) => setSeats(e.target.value.replace(/\D/g, "").slice(0, 2))} placeholder="1" />
          </FormField>
        </div>
      </Section>

      <div className="mt-6 flex items-center justify-end gap-3">
        <Link href="/superadmin/applications" className="text-[13px] text-muted no-underline hover:text-heading">Cancel</Link>
        <button
          type="button"
          disabled={pending}
          onClick={submit}
          className="inline-flex items-center gap-2 rounded-md bg-cta px-6 py-3 text-[15px] font-medium text-cta-fg transition-colors hover:bg-[#d92843] disabled:opacity-60"
        >
          {pending ? "Saving…" : "Save changes"}
          {!pending && <i className="fas fa-check text-[11px]" />}
        </button>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-5 rounded-lg border border-border bg-white p-6">
      <h2 className="mb-4 text-[15px] font-semibold text-heading">{title}</h2>
      {children}
    </section>
  );
}
