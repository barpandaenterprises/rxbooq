"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { FormField, TEXT_INPUT_CLASS } from "@/components/molecules/FormField";
import {
  checkSlugAvailabilityAction,
  saveOnboardingStepAction,
} from "@/app/(onboarding)/get-started/actions";
import {
  CUSTOM_STATE_ISO,
  loadIndiaCities,
  loadIndiaStates,
  type GeoState,
} from "@/lib/geo/india";

/** Strip a phone value down to its local 10-digit part (drops a +91 prefix). */
function localTenDigits(v: string): string {
  const digits = v.replace(/\D/g, "");
  const local = digits.length > 10 && digits.startsWith("91") ? digits.slice(2) : digits;
  return local.slice(-10);
}

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
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const clearErr = (key: string) =>
    setFieldErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });

  const [name,    setName]    = useState(draft.clinic_name ?? "");
  const [slug,    setSlug]    = useState(draft.suggested_slug ?? "");
  const [address, setAddress] = useState(draft.address ?? "");
  const [city,    setCity]    = useState(draft.city ?? "");
  const [state,   setState]   = useState(draft.state ?? "");
  const [pincode, setPincode] = useState(draft.pincode ?? "");
  const [phoneDigits, setPhoneDigits] = useState(() =>
    localTenDigits(draft.primary_phone ?? draft.phone_e164 ?? ""),
  );
  const [email,   setEmail]   = useState(draft.primary_email ?? "");
  const [pitch,   setPitch]   = useState(draft.pitch ?? "");

  // --- State / city dropdowns (lazy-loaded India dataset) --------------------
  const [states,        setStates]        = useState<GeoState[]>([]);
  const [stateIso,      setStateIso]      = useState("");
  const [cities,        setCities]        = useState<string[]>([]);
  const [citiesLoading, setCitiesLoading] = useState(false);

  // Load the state list once; resolve the draft's saved state name to an iso so
  // the dropdown reflects it. A legacy free-text state that isn't in the
  // dataset becomes a synthetic "custom" option so we never lose the value.
  useEffect(() => {
    let active = true;
    loadIndiaStates().then((all) => {
      if (!active) return;
      const saved = (draft.state ?? "").trim().toLowerCase();
      const match = saved ? all.find((s) => s.name.toLowerCase() === saved) : undefined;
      if (match) {
        setStates(all);
        setStateIso(match.iso);
        setState(match.name);
      } else if (saved) {
        setStates([{ name: draft.state!, iso: CUSTOM_STATE_ISO }, ...all]);
        setStateIso(CUSTOM_STATE_ISO);
      } else {
        setStates(all);
      }
    });
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load cities whenever the selected state changes.
  useEffect(() => {
    if (!stateIso || stateIso === CUSTOM_STATE_ISO) { setCities([]); return; }
    let active = true;
    setCitiesLoading(true);
    loadIndiaCities(stateIso).then((c) => {
      if (!active) return;
      setCities(c);
      setCitiesLoading(false);
    });
    return () => { active = false; };
  }, [stateIso]);

  const onStateChange = (iso: string) => {
    setStateIso(iso);
    setState(states.find((s) => s.iso === iso)?.name ?? "");
    setCity(""); // a new state invalidates the previously picked city
  };

  // Free-text city fallback: custom state, or a state the dataset has no cities
  // for. Otherwise we drive city from the dependent dropdown.
  const cityAsDropdown = !!stateIso && stateIso !== CUSTOM_STATE_ISO && cities.length > 0;
  // Preserve a saved/legacy city that isn't in the fetched list.
  const cityOptions = city && !cities.includes(city) ? [city, ...cities] : cities;

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
      // The slug just changed (derived from the name) — drop any stale slug
      // error so it doesn't linger next to an now-valid value.
      clearErr("suggested_slug");
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

  // Client-side validation, mirroring the server schema, so each message renders
  // under its own field instead of as one generic banner.
  const validate = (): Record<string, string> => {
    const e: Record<string, string> = {};
    if (name.trim().length < 2)    e.clinic_name    = "Clinic name must be at least 2 characters.";
    if (slug.trim().length < 2)    e.suggested_slug = "URL slug must be at least 2 characters.";
    if (address.trim().length < 5) e.address        = "Street address must be at least 5 characters.";
    if (!state)                    e.state          = "Select your state.";
    if (city.trim().length < 2)    e.city           = "Select or enter your city.";
    if (!/^[0-9]{6}$/.test(pincode)) e.pincode      = "Enter a valid 6-digit pincode.";
    if (phoneDigits.length !== 10) e.primary_phone  = "Enter the 10-digit mobile number.";
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) e.primary_email = "Enter a valid email address.";
    return e;
  };

  const submit = () => {
    setError(null);
    const v = validate();
    setFieldErrors(v);
    if (Object.keys(v).length > 0) return;

    startTransition(async () => {
      const res = await saveOnboardingStepAction({
        clinic_name:    name,
        suggested_slug: slug,
        address, city, state, pincode,
        primary_phone:  phoneDigits ? `+91${phoneDigits}` : "",
        primary_email:  email,
        pitch:          pitch || undefined,
        last_step_completed: "practice",
      });
      if (!res.ok) {
        // Prefer per-field placement; fall back to the banner for global errors.
        if (res.fieldErrors && Object.keys(res.fieldErrors).length > 0) {
          setFieldErrors(res.fieldErrors);
        } else {
          setError(res.error);
        }
        return;
      }
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
        <FormField label="Clinic name" required error={fieldErrors.clinic_name}>
          <input className={TEXT_INPUT_CLASS} value={name} onChange={(e) => { onNameChange(e.target.value); clearErr("clinic_name"); }} placeholder="Mahakur Clinic" />
        </FormField>
        <FormField
          label="URL slug"
          required
          error={fieldErrors.suggested_slug}
          hint={`rxbooq.com/${slug || "your-slug"}`}
        >
          <input
            className={TEXT_INPUT_CLASS}
            value={slug}
            onChange={(e) => { onSlugChange(e.target.value); clearErr("suggested_slug"); }}
            onBlur={() => runSlugCheck()}
            placeholder="mahakur-clinic"
          />
          <SlugCheckIndicator check={slugCheck} onUseSuggestion={useSuggestion} />
        </FormField>
        <FormField label="Street address" required error={fieldErrors.address}>
          <input className={TEXT_INPUT_CLASS} value={address} onChange={(e) => { setAddress(e.target.value); clearErr("address"); }} placeholder="Plot 12, MG Road" />
        </FormField>
        <FormField
          label="State"
          required
          error={fieldErrors.state}
          hint={states.length === 0 ? "Loading states…" : undefined}
        >
          <select
            className={TEXT_INPUT_CLASS}
            value={stateIso}
            disabled={states.length === 0}
            onChange={(e) => { onStateChange(e.target.value); clearErr("state"); clearErr("city"); }}
          >
            <option value="" disabled>Select a state</option>
            {states.map((s) => (
              <option key={s.iso} value={s.iso}>{s.name}</option>
            ))}
          </select>
        </FormField>
        <FormField
          label="City"
          required
          error={fieldErrors.city}
          hint={!stateIso ? "Pick a state first" : citiesLoading ? "Loading cities…" : undefined}
        >
          {cityAsDropdown ? (
            <select
              className={TEXT_INPUT_CLASS}
              value={city}
              onChange={(e) => { setCity(e.target.value); clearErr("city"); }}
            >
              <option value="" disabled>Select a city</option>
              {cityOptions.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          ) : (
            <input
              className={TEXT_INPUT_CLASS}
              value={city}
              disabled={!stateIso || citiesLoading}
              onChange={(e) => { setCity(e.target.value); clearErr("city"); }}
              placeholder="Bhubaneswar"
            />
          )}
        </FormField>
        <FormField label="Pincode" required error={fieldErrors.pincode}>
          <input className={TEXT_INPUT_CLASS} inputMode="numeric" maxLength={6} value={pincode} onChange={(e) => { setPincode(e.target.value.replace(/\D/g, "")); clearErr("pincode"); }} placeholder="751001" />
        </FormField>
        <FormField
          label="Contact phone"
          required
          error={fieldErrors.primary_phone}
          hint={fieldErrors.primary_phone ? undefined : "Shown on your public profile"}
        >
          <div className="flex gap-2">
            <span className="grid w-[60px] shrink-0 place-items-center rounded-md border-[1.5px] border-border bg-surface-muted text-[15px] text-muted">
              +91
            </span>
            <input
              className={TEXT_INPUT_CLASS}
              type="tel"
              inputMode="numeric"
              maxLength={10}
              value={phoneDigits}
              onChange={(e) => { setPhoneDigits(e.target.value.replace(/\D/g, "").slice(0, 10)); clearErr("primary_phone"); }}
              placeholder="9999900001"
            />
          </div>
        </FormField>
        <FormField label="Contact email" required error={fieldErrors.primary_email}>
          <input className={TEXT_INPUT_CLASS} type="email" value={email} onChange={(e) => { setEmail(e.target.value); clearErr("primary_email"); }} placeholder="hello@yourclinic.in" />
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
          disabled={pending || slugBlocksSubmit}
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
