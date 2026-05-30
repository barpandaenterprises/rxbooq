"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { FormField, TEXT_INPUT_CLASS } from "@/components/molecules/FormField";
import { saveOnboardingStepAction } from "@/app/(onboarding)/get-started/actions";

type Draft = {
  doctor_full_name:         string | null;
  doctor_qualifications:    string | null;
  doctor_registration_no:   string | null;
  doctor_primary_specialty: string | null;
  doctor_years_experience:  number | null;
  doctor_languages:         string[] | null;
};

const LANGUAGES = ["en", "hi", "or", "ta", "te", "bn", "kn", "ml"];

export function ProfileStep({ draft, draftId }: { draft: Draft; draftId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [name,    setName]    = useState(draft.doctor_full_name ?? "");
  const [quals,   setQuals]   = useState(draft.doctor_qualifications ?? "");
  const [regNo,   setRegNo]   = useState(draft.doctor_registration_no ?? "");
  const [spec,    setSpec]    = useState(draft.doctor_primary_specialty ?? "");
  const [years,   setYears]   = useState<string>(draft.doctor_years_experience?.toString() ?? "");
  const [langs,   setLangs]   = useState<string[]>(draft.doctor_languages ?? ["en"]);

  const toggleLang = (l: string) => {
    setLangs((prev) => prev.includes(l) ? prev.filter((x) => x !== l) : [...prev, l]);
  };

  const submit = () => {
    setError(null);
    startTransition(async () => {
      const res = await saveOnboardingStepAction({
        doctor_full_name:         name,
        doctor_qualifications:    quals || undefined,
        doctor_registration_no:   regNo,
        doctor_primary_specialty: spec || undefined,
        doctor_years_experience:  years ? Number(years) : undefined,
        doctor_languages:         langs.length > 0 ? langs : ["en"],
        last_step_completed:      "profile",
      });
      if (!res.ok) { setError(res.error); return; }
      router.push(`/get-started/${draftId}?step=practice`);
    });
  };

  return (
    <div className="rounded-lg border border-border bg-white p-6 md:p-8">
      <h2 className="mb-1 text-[20px] font-semibold text-heading">Tell us about you</h2>
      <p className="mb-6 text-[13px] text-muted">
        Your name, MCI/state council registration, and what you practise.
      </p>

      {error && (
        <div className="mb-4 rounded-md border border-[#f3d3d8] bg-[#fff5f6] px-3 py-2 text-[13px] text-heading">
          {error}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <FormField label="Full name" htmlFor="name" required>
          <input id="name" className={TEXT_INPUT_CLASS} value={name} onChange={(e) => setName(e.target.value)} placeholder="Dr. Asha Mahakur" />
        </FormField>
        <FormField label="Primary specialty" htmlFor="spec" hint="E.g., Dental, Psychiatry, Pediatrics">
          <input id="spec" className={TEXT_INPUT_CLASS} value={spec} onChange={(e) => setSpec(e.target.value)} placeholder="Dental" />
        </FormField>
        <FormField label="Registration number" htmlFor="reg" required hint="MCI or state medical council number">
          <input id="reg" className={TEXT_INPUT_CLASS} value={regNo} onChange={(e) => setRegNo(e.target.value)} placeholder="MCI-12345" />
        </FormField>
        <FormField label="Years of experience" htmlFor="years">
          <input id="years" className={TEXT_INPUT_CLASS} inputMode="numeric" value={years} onChange={(e) => setYears(e.target.value.replace(/\D/g, ""))} placeholder="8" />
        </FormField>
        <FormField label="Qualifications" htmlFor="quals" hint="Comma-separated, e.g. BDS, MDS">
          <input id="quals" className={TEXT_INPUT_CLASS} value={quals} onChange={(e) => setQuals(e.target.value)} placeholder="BDS, MDS (Orthodontics)" />
        </FormField>
      </div>

      <div className="mt-2 mb-4">
        <label className="mb-1.5 block text-[13px] font-medium text-heading">Languages you consult in</label>
        <div className="flex flex-wrap gap-2">
          {LANGUAGES.map((l) => (
            <button
              key={l}
              type="button"
              onClick={() => toggleLang(l)}
              className={
                "rounded-pill border px-3 py-1 text-[12px] uppercase tracking-wide " +
                (langs.includes(l)
                  ? "border-cta bg-cta text-cta-fg"
                  : "border-border bg-white text-muted hover:text-heading")
              }
            >
              {l}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6 flex justify-end">
        <button
          type="button"
          disabled={pending || !name || !regNo}
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
