"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { FormField, TEXT_INPUT_CLASS } from "@/components/molecules/FormField";
import { finalizeOnboardingAction } from "@/app/(onboarding)/get-started/actions";

type Draft = {
  primary_email:    string | null;
  doctor_full_name: string | null;
  clinic_name:      string | null;
};

export function AccountStep({ draft }: { draft: Draft }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [email,    setEmail]    = useState(draft.primary_email ?? "");
  const [password, setPassword] = useState("");
  const [tos,      setTos]      = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = () => {
    setError(null);
    startTransition(async () => {
      const res = await finalizeOnboardingAction({ email, password, acceptTos: tos });
      if (!res.ok) { setError(res.error); return; }
      router.push(`/${res.clinicSlug}/admin/today?welcome=1`);
    });
  };

  return (
    <div className="rounded-lg border border-border bg-white p-6 md:p-8">
      <h2 className="mb-1 text-[20px] font-semibold text-heading">Create your login</h2>
      <p className="mb-6 text-[13px] text-muted">
        One last step. We&apos;ll send your receipts and patient enquiries here.
      </p>

      {error && (
        <div className="mb-4 rounded-md border border-[#f3d3d8] bg-[#fff5f6] px-3 py-2 text-[13px] text-heading">
          {error}
        </div>
      )}

      <FormField label="Email" required>
        <input className={TEXT_INPUT_CLASS} type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@yourclinic.in" />
      </FormField>
      <FormField label="Password" required hint="At least 8 characters">
        <input className={TEXT_INPUT_CLASS} type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
      </FormField>

      <label className="mt-2 flex cursor-pointer items-start gap-2 text-[13px] text-body">
        <input type="checkbox" className="mt-1" checked={tos} onChange={(e) => setTos(e.target.checked)} />
        <span>
          I agree to the <a href="/terms" className="text-link-hover no-underline">Terms</a> and{" "}
          <a href="/privacy" className="text-link-hover no-underline">Privacy Policy</a>, and confirm I am authorised to publish this clinic.
        </span>
      </label>

      <div className="mt-6 flex justify-end">
        <button
          type="button"
          disabled={pending || !email || password.length < 8 || !tos}
          onClick={submit}
          className="inline-flex items-center gap-2 rounded-md bg-cta px-6 py-3 text-[15px] font-medium text-cta-fg transition-colors hover:bg-[#d92843] disabled:opacity-60"
        >
          {pending ? "Setting things up…" : "Finalize & launch"}
          {!pending && <i className="fas fa-rocket text-[11px]" />}
        </button>
      </div>
    </div>
  );
}
