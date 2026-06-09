"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  saveOnboardingStepAction,
  uploadOnboardingDocAction,
} from "@/app/(onboarding)/get-started/actions";

type Draft = {
  registration_cert_path: string | null;
  clinic_license_path:    string | null;
};

type DocKind = "registration_cert" | "clinic_license";

const DOCS: { kind: DocKind; label: string; hint: string }[] = [
  {
    kind:  "registration_cert",
    label: "Medical registration certificate",
    hint:  "Issued by MCI or your state council. PDF, JPG, or PNG (≤10 MB).",
  },
  {
    kind:  "clinic_license",
    label: "Clinic license (optional for solo doctors)",
    hint:  "Shops & Establishments, Clinical Establishments Act, or equivalent.",
  },
];

export function DocsUploadStep({ draft, draftId }: { draft: Draft; draftId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [paths, setPaths] = useState<Record<DocKind, string | null>>({
    registration_cert: draft.registration_cert_path,
    clinic_license:    draft.clinic_license_path,
  });
  const [error, setError] = useState<string | null>(null);

  const onFile = (kind: DocKind, file: File) => {
    setError(null);
    const reader = new FileReader();
    reader.onload = () => {
      startTransition(async () => {
        const base64 = (reader.result as string).replace(/^data:[^;]+;base64,/, "");
        const res = await uploadOnboardingDocAction({
          kind,
          base64,
          mime:     file.type,
          fileName: file.name,
        });
        if (!res.ok) { setError(res.error); return; }
        setPaths((p) => ({ ...p, [kind]: res.path }));
      });
    };
    reader.readAsDataURL(file);
  };

  const next = () => {
    startTransition(async () => {
      await saveOnboardingStepAction({ last_step_completed: "docs" });
      router.push(`/get-started/${draftId}?step=account`);
    });
  };

  return (
    <div className="rounded-lg border border-border bg-white p-6 md:p-8">
      <h2 className="mb-1 text-[20px] font-semibold text-heading">Verification documents</h2>
      <p className="mb-6 text-[13px] text-muted">
        Upload now to earn a "Verified" badge on your public profile. You can skip and add these later from your admin.
      </p>

      {error && (
        <div className="mb-4 rounded-md border border-[#f3d3d8] bg-[#fff5f6] px-3 py-2 text-[13px] text-heading">
          {error}
        </div>
      )}

      <div className="space-y-3">
        {DOCS.map((d) => {
          const uploaded = paths[d.kind];
          return (
            <label
              key={d.kind}
              className={
                "flex cursor-pointer items-start gap-3 rounded-md border-[1.5px] p-4 transition-colors " +
                (uploaded ? "border-[#cce4d6] bg-[#f1faf4]" : "border-border bg-white hover:border-cta")
              }
            >
              <i className={
                "mt-0.5 text-[18px] " +
                (uploaded ? "fas fa-check-circle text-[#1f7a3a]" : "fas fa-cloud-upload-alt text-muted")
              } />
              <div className="flex-1">
                <div className="text-[14px] font-medium text-heading">{d.label}</div>
                <div className="text-[12px] text-muted">{d.hint}</div>
                {uploaded && (
                  <div className="mt-1 truncate text-[11px] text-[#1f7a3a]">
                    Uploaded · {uploaded.split("/").pop()}
                  </div>
                )}
              </div>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,application/pdf"
                className="sr-only"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) onFile(d.kind, f);
                }}
              />
            </label>
          );
        })}
      </div>

      <div className="mt-6 flex justify-between">
        <button type="button" onClick={() => router.push(`/get-started/${draftId}?step=practice`)} className="text-[13px] text-muted hover:text-heading">
          <i className="fas fa-arrow-left mr-1 text-[11px]" /> Back
        </button>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={pending}
            onClick={next}
            className="rounded-md border border-border bg-white px-4 py-3 text-[13px] text-muted hover:text-heading disabled:opacity-60"
          >
            Skip for now
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={next}
            className="inline-flex items-center gap-2 rounded-md bg-cta px-6 py-3 text-[15px] font-medium text-cta-fg transition-colors hover:bg-[#d92843] disabled:opacity-60"
          >
            {pending ? "Saving…" : "Continue"}
            {!pending && <i className="fas fa-arrow-right text-[11px]" />}
          </button>
        </div>
      </div>
    </div>
  );
}
