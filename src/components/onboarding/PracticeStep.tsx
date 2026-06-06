"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { FormField, TEXT_INPUT_CLASS } from "@/components/molecules/FormField";
import {
  checkSlugAvailabilityAction,
  saveOnboardingStepAction,
} from "@/app/(onboarding)/get-started/actions";

type Draft = {
  clinic_name:    string | null;
  suggested_slug: string | null;
  address:        string | null;
  city:           string | null;
  state:          string | null;
  pincode:        string | null;
  primary_phone:  string | null;
  primary_email:  string | null;
  pitch:          string | null;
  phone_e164:     string | null;
};

function slugify(s: string): string {
  return s.toLowerCase().trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 60);
}

type SlugCheck =
  | { state: "idle" }
  | { state: "checking" }
  | { state: "available" }
  | { state: "taken"; reason: string; suggestion?: string }
  | { state: "invalid"; reason: string };

export function PracticeStep({ draft, draftId }: { draft: Draft; draftId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [name,    setName]    = useState(draft.clinic_name ?? "");
  const [slug,    setSlug]    = useState(draft.suggested_slug ?? "");
  const [address, setAddress] = useState(draft.address ?? "");
  const [city,    setCity]    = useState(draft.city ?? "");
  const [state,   setState]   = useState(draft.state ?? "");
  const [pincode, setPincode] = useState(draft.pincode ?? "");
  const [phone,   setPhone]   = useState(draft.primary_phone ?? draft.phone_e164 ?? "");
  const [email,   setEmail]   = useState(draft.primary_email ?? "");
  const [pitch,   setPitch]   = useState(draft.pitch ?? "");

  // The slug we last checked against the server. When the field changes we
  // reset the check; on blur (or "Check now") we run it again.
  const [slugCheck, setSlugCheck] = useState<SlugCheck>(() =>
    // If we loaded a draft with the same slug it already had, we can assume
    // it's still ours — no need to flag as unknown.
    draft.suggested_slug ? { state: "available" } : { state: "idle" }
  );

  const onNameChange = (v: string) => {
    setName(v);
    if (!draft.suggested_slug) {
      const next = slugify(v);
      setSlug(next);
      setSlugCheck({ state: "idle" });
    }
  };

  const onSlugChange = (v: string) => {
    const cleaned = v.toLowerCase().replace(/[^a-z0-9-]/g, "");
    setSlug(cleaned);
    setSlugCheck({ state: "idle" });
  };

  const runSlugCheck = async (override?: string) => {
    const target = (override ?? slug).trim();
    // If unchanged from the draft's stored slug, assume still ours.
    if (target === (draft.suggested_slug ?? "")) {
      setSlugCheck({ state: "available" });
      return;
    }
    if (target.length < 2) {
      setSlugCheck({ state: "invalid", reason: "Too short." });
      return;
    }
    setSlugCheck({ state: "checking" });
    const res = await checkSlugAvailabilityAction(target, city);
    if (!res.ok) {
      setSlugCheck({ state: "invalid", reason: res.error });
      return;
    }
    if (res.available) {
      setSlugCheck({ state: "available" });
    } else {
      setSlugCheck({ state: "taken", reason: res.reason, suggestion: res.suggestion });
    }
  };

  const useSuggestion = (s: string) => {
    setSlug(s);
    setSlugCheck({ state: "available" });
  };

  const submit = () => {
    setError(null);
    startTransition(async () => {
      const res = await saveOnboardingStepAction({
        clinic_name:    name,
        suggested_slug: slug,
        address, city, state, pincode,
        primary_phone:  phone,
        primary_email:  email,
        pitch:          pitch || undefined,
        last_step_completed: "practice",
      });
      if (!res.ok) { setError(res.error); return; }
      router.push(`/get-started/${draftId}?step=docs`);
    });
  };

  // Disable Continue if we know the slug is taken or invalid. Idle / checking
  // states still allow submit — the server re-checks and fails clearly there
  // if needed.
  const slugBlocksSubmit = slugCheck.state === "taken" || slugCheck.state === "invalid";

  return (
    <div className="rounded-lg border border-border bg-white p-6 md:p-8">
      <h2 className="mb-1 text-[20px] font-semibold text-heading">About your clinic</h2>
      <p className="mb-6 text-[13px] text-muted">
        Where you practise, how patients reach you. You can update any of this later.
      </p>

      {error && (
        <div className="mb-4 rounded-md border border-[#f3d3d8] bg-[#fff5f6] px-3 py-2 text-[13px] text-heading">
          {error}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <FormField label="Clinic name" required>
          <input className={TEXT_INPUT_CLASS} value={name} onChange={(e) => onNameChange(e.target.value)} placeholder="Mahakur Clinic" />
        </FormField>
        <FormField label="URL slug" required hint={`rxbooq.com/${slug || "your-slug"}`}>
          <input
            className={TEXT_INPUT_CLASS}
            value={slug}
            onChange={(e) => onSlugChange(e.target.value)}
            onBlur={() => runSlugCheck()}
            placeholder="mahakur-clinic"
          />
          <SlugCheckIndicator check={slugCheck} onUseSuggestion={useSuggestion} />
        </FormField>
        <FormField label="Street address" required>
          <input className={TEXT_INPUT_CLASS} value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Plot 12, MG Road" />
        </FormField>
        <FormField label="City" required>
          <input className={TEXT_INPUT_CLASS} value={city} onChange={(e) => setCity(e.target.value)} placeholder="Bhubaneswar" />
        </FormField>
        <FormField label="State" required>
          <input className={TEXT_INPUT_CLASS} value={state} onChange={(e) => setState(e.target.value)} placeholder="Odisha" />
        </FormField>
        <FormField label="Pincode" required>
          <input className={TEXT_INPUT_CLASS} inputMode="numeric" maxLength={6} value={pincode} onChange={(e) => setPincode(e.target.value.replace(/\D/g, ""))} placeholder="751001" />
        </FormField>
        <FormField label="Contact phone" required hint="Shown on your public profile">
          <input className={TEXT_INPUT_CLASS} type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+919999900001" />
        </FormField>
        <FormField label="Contact email" required>
          <input className={TEXT_INPUT_CLASS} type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="hello@yourclinic.in" />
        </FormField>
      </div>

      <FormField label="Short pitch (optional)" hint="One-paragraph intro that appears on your profile">
        <textarea
          className={TEXT_INPUT_CLASS + " min-h-[80px] resize-y"}
          value={pitch}
          onChange={(e) => setPitch(e.target.value)}
          placeholder="Family-run dental clinic since 2008 — gentle care for kids and adults."
        />
      </FormField>

      <div className="mt-6 flex justify-between">
        <button type="button" onClick={() => router.push(`/get-started/${draftId}?step=profile`)} className="text-[13px] text-muted hover:text-heading">
          <i className="fas fa-arrow-left mr-1 text-[11px]" /> Back
        </button>
        <button
          type="button"
          disabled={pending || slugBlocksSubmit || !name || !slug || !address || !city || !state || !pincode || !phone || !email}
          onClick={submit}
          className="inline-flex items-center gap-2 rounded-md bg-cta px-6 py-3 text-[15px] font-medium text-cta-fg transition-colors hover:bg-[#d92843] disabled:opacity-60"
        >
          {pending ? "Saving…" : "Continue"}
          {!pending && <i className="fas fa-arrow-right text-[11px]" />}
        </button>
      </div>
    </div>
  );
}

function SlugCheckIndicator({
  check,
  onUseSuggestion,
}: {
  check: SlugCheck;
  onUseSuggestion: (s: string) => void;
}) {
  if (check.state === "idle")     return null;
  if (check.state === "checking") {
    return (
      <div className="mt-1.5 text-[12px] text-muted">
        <i className="fas fa-spinner fa-spin mr-1.5 text-[10px]" /> Checking availability…
      </div>
    );
  }
  if (check.state === "available") {
    return (
      <div className="mt-1.5 text-[12px] font-medium text-[#1f7a3a]">
        <i className="fas fa-check-circle mr-1.5 text-[11px]" /> Available
      </div>
    );
  }
  if (check.state === "invalid") {
    return (
      <div className="mt-1.5 text-[12px] text-cta">
        <i className="fas fa-exclamation-circle mr-1.5 text-[11px]" /> {check.reason}
      </div>
    );
  }
  // taken
  return (
    <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[12px]">
      <span className="text-cta">
        <i className="fas fa-times-circle mr-1.5 text-[11px]" /> {check.reason}
      </span>
      {check.suggestion && (
        <button
          type="button"
          onClick={() => onUseSuggestion(check.suggestion!)}
          className="rounded-pill border border-link-hover bg-white px-2.5 py-0.5 text-[11px] font-medium text-link-hover hover:bg-link-hover hover:text-white"
        >
          Use &ldquo;{check.suggestion}&rdquo;
        </button>
      )}
    </div>
  );
}
