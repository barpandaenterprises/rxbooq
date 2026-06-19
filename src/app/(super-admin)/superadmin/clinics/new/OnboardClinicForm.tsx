"use client";

import Link from "next/link";
import { useState, useTransition } from "react";

import { FormField, TEXT_INPUT_CLASS } from "@/components/molecules/FormField";
import { checkSlugAvailabilityAction } from "@/app/(onboarding)/get-started/actions";
import { createClinicAction } from "./actions";

export type PlanOption = {
  id:                string;
  code:              string;
  display_name:      string;
  monthly_price_inr: number;
};

function slugify(s: string): string {
  return s.toLowerCase().trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 60);
}

/** Crypto-random temp password the superadmin shares with the founder. */
function genPassword(): string {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  const arr = new Uint32Array(14);
  crypto.getRandomValues(arr);
  return Array.from(arr, (n) => chars[n % chars.length]).join("");
}

type SlugCheck =
  | { state: "idle" }
  | { state: "checking" }
  | { state: "available" }
  | { state: "taken"; reason: string; suggestion?: string }
  | { state: "invalid"; reason: string };

type Created = { clinicSlug: string; email: string; password: string };

export function OnboardClinicForm({ plans }: { plans: PlanOption[] }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [created, setCreated] = useState<Created | null>(null);

  // Clinic
  const [name, setName]       = useState("");
  const [slug, setSlug]       = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [address, setAddress] = useState("");
  const [state, setState]     = useState("");
  const [city, setCity]       = useState("");
  const [pincode, setPincode] = useState("");
  const [phoneDigits, setPhoneDigits] = useState("");
  const [email, setEmail]     = useState("");

  // Founding doctor
  const [docName, setDocName]       = useState("");
  const [docReg, setDocReg]         = useState("");
  const [docQual, setDocQual]       = useState("");
  const [docSpecialty, setDocSpecialty] = useState("");
  const [docYears, setDocYears]     = useState("");

  // Plan & access
  const [planId, setPlanId]   = useState(plans[0]?.id ?? "");
  const [seats, setSeats]     = useState("1");
  const [password, setPassword] = useState(() => genPassword());

  const [slugCheck, setSlugCheck] = useState<SlugCheck>({ state: "idle" });

  const clearErr = (key: string) =>
    setFieldErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });

  const onNameChange = (v: string) => {
    setName(v);
    if (!slugTouched) {
      setSlug(slugify(v));
      setSlugCheck({ state: "idle" });
      clearErr("suggested_slug");
    }
  };

  const onSlugChange = (v: string) => {
    setSlugTouched(true);
    setSlug(v.toLowerCase().replace(/[^a-z0-9-]/g, ""));
    setSlugCheck({ state: "idle" });
  };

  const runSlugCheck = async () => {
    const target = slug.trim();
    if (target.length < 2) {
      setSlugCheck({ state: "invalid", reason: "Too short." });
      return;
    }
    setSlugCheck({ state: "checking" });
    const res = await checkSlugAvailabilityAction(target, city || undefined);
    if (!res.ok) { setSlugCheck({ state: "invalid", reason: res.error }); return; }
    if (res.available) { setSlugCheck({ state: "available" }); }
    else { setSlugCheck({ state: "taken", reason: res.reason, suggestion: res.suggestion }); }
  };

  const validate = (): Record<string, string> => {
    const e: Record<string, string> = {};
    if (name.trim().length < 2)      e.clinic_name    = "Clinic name must be at least 2 characters.";
    if (slug.trim().length < 2)      e.suggested_slug = "URL slug must be at least 2 characters.";
    else if (!/^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(slug.trim())) e.suggested_slug = "Use lowercase letters, digits, and hyphens.";
    if (address.trim().length < 5)   e.address        = "Street address must be at least 5 characters.";
    if (state.trim().length < 2)     e.state          = "Enter the state.";
    if (city.trim().length < 2)      e.city           = "Enter the city.";
    if (!/^[0-9]{6}$/.test(pincode)) e.pincode        = "Enter a valid 6-digit pincode.";
    if (phoneDigits.length !== 10)   e.primary_phone  = "Enter the 10-digit phone number.";
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) e.primary_email = "Enter a valid email address.";
    if (docName.trim().length < 2)   e.doctor_full_name = "Enter the doctor's full name.";
    if (docReg.trim().length < 2)    e.doctor_registration_no = "Enter the registration number.";
    if (docYears && !/^\d{1,2}$/.test(docYears)) e.doctor_years_experience = "Enter a number of years.";
    if (!planId)                     e.planId         = "Pick a plan.";
    if (password.length < 8)         e.password       = "Password must be at least 8 characters.";
    return e;
  };

  const submit = () => {
    setError(null);
    const v = validate();
    setFieldErrors(v);
    if (Object.keys(v).length > 0) return;
    if (slugCheck.state === "taken") {
      setFieldErrors((p) => ({ ...p, suggested_slug: slugCheck.reason }));
      return;
    }

    startTransition(async () => {
      const res = await createClinicAction({
        clinic_name:    name.trim(),
        suggested_slug: slug.trim(),
        address:        address.trim(),
        city:           city.trim(),
        state:          state.trim(),
        pincode,
        primary_phone:  `+91${phoneDigits}`,
        primary_email:  email.trim().toLowerCase(),
        doctor_full_name:        docName.trim(),
        doctor_registration_no:  docReg.trim(),
        doctor_qualifications:   docQual.trim() || undefined,
        doctor_primary_specialty: docSpecialty.trim() || undefined,
        doctor_years_experience: docYears ? Number(docYears) : undefined,
        planId,
        requested_doctor_seats:  Math.max(1, Number(seats) || 1),
        password,
      });
      if (!res.ok) {
        if (res.fieldErrors && Object.keys(res.fieldErrors).length > 0) setFieldErrors(res.fieldErrors);
        else setError(res.error);
        return;
      }
      setCreated({ clinicSlug: res.clinicSlug, email: email.trim().toLowerCase(), password });
    });
  };

  if (created) {
    return <SuccessPanel created={created} />;
  }

  return (
    <div className="mx-auto w-full max-w-[860px] px-5 py-8 md:px-8">
      <div className="mb-6">
        <h1 className="text-[24px] font-semibold text-heading">Onboard a clinic</h1>
        <p className="mt-1 text-[13px] text-muted">
          Creates a live clinic, founding clinic-admin login, founding doctor, and a subscription on the chosen plan.
        </p>
      </div>

      {error && (
        <div className="mb-4 rounded-md border border-[#f3d3d8] bg-[#fff5f6] px-3 py-2 text-[13px] text-heading">
          {error}
        </div>
      )}

      {/* Clinic --------------------------------------------------------------- */}
      <Section title="Clinic">
        <div className="grid gap-x-4 md:grid-cols-2">
          <FormField label="Clinic name" required error={fieldErrors.clinic_name}>
            <input className={TEXT_INPUT_CLASS} value={name} onChange={(e) => { onNameChange(e.target.value); clearErr("clinic_name"); }} placeholder="Mahakur Poly Dental Clinic" />
          </FormField>
          <FormField label="URL slug" required error={fieldErrors.suggested_slug} hint={`rxbooq.com/${slug || "your-slug"}`}>
            <input
              className={TEXT_INPUT_CLASS}
              value={slug}
              onChange={(e) => { onSlugChange(e.target.value); clearErr("suggested_slug"); }}
              onBlur={runSlugCheck}
              placeholder="mahakur"
            />
            <SlugCheckIndicator check={slugCheck} onUseSuggestion={(s) => { setSlug(s); setSlugCheck({ state: "available" }); }} />
          </FormField>
          <div className="md:col-span-2">
            <FormField label="Street address" required error={fieldErrors.address}>
              <input className={TEXT_INPUT_CLASS} value={address} onChange={(e) => { setAddress(e.target.value); clearErr("address"); }} placeholder="Plot 12, MG Road" />
            </FormField>
          </div>
          <FormField label="State" required error={fieldErrors.state}>
            <input className={TEXT_INPUT_CLASS} value={state} onChange={(e) => { setState(e.target.value); clearErr("state"); }} placeholder="Odisha" />
          </FormField>
          <FormField label="City" required error={fieldErrors.city}>
            <input className={TEXT_INPUT_CLASS} value={city} onChange={(e) => { setCity(e.target.value); clearErr("city"); }} placeholder="Sambalpur" />
          </FormField>
          <FormField label="Pincode" required error={fieldErrors.pincode}>
            <input className={TEXT_INPUT_CLASS} inputMode="numeric" maxLength={6} value={pincode} onChange={(e) => { setPincode(e.target.value.replace(/\D/g, "")); clearErr("pincode"); }} placeholder="768001" />
          </FormField>
          <FormField label="Contact phone" required error={fieldErrors.primary_phone} hint={fieldErrors.primary_phone ? undefined : "Shown on the public profile"}>
            <div className="flex gap-2">
              <span className="grid w-[60px] shrink-0 place-items-center rounded-md border-[1.5px] border-border bg-surface-muted text-[15px] text-muted">+91</span>
              <input className={TEXT_INPUT_CLASS} type="tel" inputMode="numeric" maxLength={10} value={phoneDigits} onChange={(e) => { setPhoneDigits(e.target.value.replace(/\D/g, "").slice(0, 10)); clearErr("primary_phone"); }} placeholder="9999900001" />
            </div>
          </FormField>
          <FormField label="Contact email" required error={fieldErrors.primary_email} hint={fieldErrors.primary_email ? undefined : "Doubles as the founder's login"}>
            <input className={TEXT_INPUT_CLASS} type="email" value={email} onChange={(e) => { setEmail(e.target.value); clearErr("primary_email"); }} placeholder="owner@clinic.in" />
          </FormField>
        </div>
      </Section>

      {/* Founding doctor ------------------------------------------------------ */}
      <Section title="Founding doctor">
        <div className="grid gap-x-4 md:grid-cols-2">
          <FormField label="Full name" required error={fieldErrors.doctor_full_name}>
            <input className={TEXT_INPUT_CLASS} value={docName} onChange={(e) => { setDocName(e.target.value); clearErr("doctor_full_name"); }} placeholder="Dr. P. Mahakur" />
          </FormField>
          <FormField label="Registration no." required error={fieldErrors.doctor_registration_no}>
            <input className={TEXT_INPUT_CLASS} value={docReg} onChange={(e) => { setDocReg(e.target.value); clearErr("doctor_registration_no"); }} placeholder="OD-12345" />
          </FormField>
          <FormField label="Qualifications" error={fieldErrors.doctor_qualifications}>
            <input className={TEXT_INPUT_CLASS} value={docQual} onChange={(e) => setDocQual(e.target.value)} placeholder="BDS, MDS (Prosthodontics)" />
          </FormField>
          <FormField label="Primary specialty" error={fieldErrors.doctor_primary_specialty}>
            <input className={TEXT_INPUT_CLASS} value={docSpecialty} onChange={(e) => setDocSpecialty(e.target.value)} placeholder="Prosthodontics" />
          </FormField>
          <FormField label="Years of experience" error={fieldErrors.doctor_years_experience}>
            <input className={TEXT_INPUT_CLASS} inputMode="numeric" maxLength={2} value={docYears} onChange={(e) => { setDocYears(e.target.value.replace(/\D/g, "").slice(0, 2)); clearErr("doctor_years_experience"); }} placeholder="20" />
          </FormField>
        </div>
      </Section>

      {/* Plan & access -------------------------------------------------------- */}
      <Section title="Plan & access">
        <div className="grid gap-x-4 md:grid-cols-2">
          <FormField label="Subscription plan" required error={fieldErrors.planId} hint="Paid plans start a 14-day trial; Free is active immediately.">
            <select className={TEXT_INPUT_CLASS} value={planId} onChange={(e) => { setPlanId(e.target.value); clearErr("planId"); }}>
              {plans.length === 0 && <option value="">No plans available</option>}
              {plans.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.display_name}{p.monthly_price_inr > 0 ? ` — ₹${p.monthly_price_inr}/mo` : " — Free"}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label="Doctor seats" hint="Seats beyond the plan's included count add to the subscription.">
            <input className={TEXT_INPUT_CLASS} inputMode="numeric" maxLength={2} value={seats} onChange={(e) => setSeats(e.target.value.replace(/\D/g, "").slice(0, 2))} placeholder="1" />
          </FormField>
          <div className="md:col-span-2">
            <FormField label="Temporary password" required error={fieldErrors.password} hint="Share this with the founder; they sign in with the contact email above.">
              <div className="flex gap-2">
                <input className={TEXT_INPUT_CLASS + " flex-1 font-mono"} value={password} onChange={(e) => { setPassword(e.target.value); clearErr("password"); }} />
                <button type="button" onClick={() => { setPassword(genPassword()); clearErr("password"); }} className="shrink-0 rounded-md border-[1.5px] border-border bg-white px-3.5 text-[13px] font-medium text-heading hover:bg-surface-muted">
                  <i className="fas fa-random mr-1.5 text-[11px]" /> Generate
                </button>
              </div>
            </FormField>
          </div>
        </div>
      </Section>

      <div className="mt-6 flex items-center justify-end gap-3">
        <Link href="/superadmin/clinics" className="text-[13px] text-muted no-underline hover:text-heading">Cancel</Link>
        <button
          type="button"
          disabled={pending || plans.length === 0}
          onClick={submit}
          className="inline-flex items-center gap-2 rounded-md bg-cta px-6 py-3 text-[15px] font-medium text-cta-fg transition-colors hover:bg-[#d92843] disabled:opacity-60"
        >
          {pending ? "Creating…" : "Create clinic"}
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

function SuccessPanel({ created }: { created: Created }) {
  return (
    <div className="mx-auto w-full max-w-[640px] px-5 py-10 md:px-8">
      <div className="rounded-lg border border-border bg-white p-7 text-center">
        <span className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-pill bg-[#e8f6ee] text-[20px] text-[#1f7a3a]">
          <i className="fas fa-check" />
        </span>
        <h1 className="text-[20px] font-semibold text-heading">Clinic created</h1>
        <p className="mt-1 text-[13px] text-muted">The founder can sign in now with these credentials.</p>

        <dl className="mt-5 space-y-2 rounded-md border border-border bg-surface-muted p-4 text-left text-[13px]">
          <Row label="Public URL" value={`rxbooq.com/${created.clinicSlug}`} />
          <Row label="Login email" value={created.email} />
          <Row label="Temp password" value={created.password} mono />
        </dl>

        <div className="mt-6 flex items-center justify-center gap-3">
          <Link href="/superadmin/clinics" className="inline-flex items-center gap-2 rounded-md bg-cta px-5 py-2.5 text-[14px] font-medium text-cta-fg no-underline hover:bg-[#d92843]">
            View clinics
          </Link>
          <button type="button" onClick={() => window.location.assign("/superadmin/clinics/new")} className="inline-flex items-center gap-2 rounded-md border-[1.5px] border-border bg-white px-5 py-2.5 text-[14px] font-medium text-heading hover:bg-surface-muted">
            Onboard another
          </button>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-muted">{label}</dt>
      <dd className={"font-medium text-heading" + (mono ? " font-mono" : "")}>{value}</dd>
    </div>
  );
}

function SlugCheckIndicator({ check, onUseSuggestion }: { check: SlugCheck; onUseSuggestion: (s: string) => void }) {
  if (check.state === "idle") return null;
  if (check.state === "checking") return <div className="mt-1.5 text-[12px] text-muted"><i className="fas fa-spinner fa-spin mr-1.5 text-[10px]" /> Checking availability…</div>;
  if (check.state === "available") return <div className="mt-1.5 text-[12px] font-medium text-[#1f7a3a]"><i className="fas fa-check-circle mr-1.5 text-[11px]" /> Available</div>;
  if (check.state === "invalid") return <div className="mt-1.5 text-[12px] text-cta"><i className="fas fa-exclamation-circle mr-1.5 text-[11px]" /> {check.reason}</div>;
  return (
    <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[12px]">
      <span className="text-cta"><i className="fas fa-times-circle mr-1.5 text-[11px]" /> {check.reason}</span>
      {check.suggestion && (
        <button type="button" onClick={() => onUseSuggestion(check.suggestion!)} className="rounded-pill border border-link-hover bg-white px-2.5 py-0.5 text-[11px] font-medium text-link-hover hover:bg-link-hover hover:text-white">
          Use &ldquo;{check.suggestion}&rdquo;
        </button>
      )}
    </div>
  );
}
