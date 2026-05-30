"use client";

import { useState, useTransition } from "react";
import { setVerificationStatusAction } from "@/app/(super-admin)/superadmin/verifications/actions";

export function VerificationActions({ clinicId }: { clinicId: string }) {
  const [pending, startTransition] = useTransition();
  const [done, setDone] = useState<"verified" | "rejected" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const act = (status: "verified" | "rejected") => {
    setError(null);
    startTransition(async () => {
      const res = await setVerificationStatusAction(clinicId, status);
      if (!res.ok) { setError(res.error); return; }
      setDone(status);
    });
  };

  if (done) {
    return <span className={"text-[12px] font-semibold " + (done === "verified" ? "text-[#1f7a3a]" : "text-cta")}>
      {done === "verified" ? "Approved" : "Rejected"}
    </span>;
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex gap-2">
        <button type="button" disabled={pending} onClick={() => act("rejected")} className="rounded-md border border-border bg-white px-3 py-1.5 text-[12px] text-muted hover:text-cta disabled:opacity-60">
          Reject
        </button>
        <button type="button" disabled={pending} onClick={() => act("verified")} className="rounded-md bg-cta px-3 py-1.5 text-[12px] font-medium text-cta-fg disabled:opacity-60">
          Approve
        </button>
      </div>
      {error && <div className="text-[11px] text-cta">{error}</div>}
    </div>
  );
}
