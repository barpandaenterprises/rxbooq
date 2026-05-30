"use client";

import { useState, useTransition } from "react";
import { runSyncPlansAction, type RunSyncResult } from "@/app/(super-admin)/superadmin/billing/sync-plans/actions";

export function SyncPlansButton() {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<RunSyncResult | null>(null);

  const run = () => {
    setResult(null);
    startTransition(async () => {
      const r = await runSyncPlansAction();
      setResult(r);
    });
  };

  return (
    <div className="rounded-lg border border-border bg-white p-5">
      <button
        type="button"
        disabled={pending}
        onClick={run}
        className="rounded-md bg-cta px-5 py-2.5 text-[13px] font-medium text-cta-fg disabled:opacity-60"
      >
        {pending ? "Syncing…" : "Run sync"}
      </button>

      {result && (
        <div className="mt-3 text-[12px]">
          {result.ok ? (
            <div className="space-y-1">
              {result.result.created.length > 0 && (
                <div className="text-[#1f7a3a]"><i className="fas fa-check mr-1" /> Created: {result.result.created.join(", ")}</div>
              )}
              {result.result.skipped.length > 0 && (
                <div className="text-muted">Skipped (already synced or free): {result.result.skipped.join(", ")}</div>
              )}
              {result.result.errors.length > 0 && (
                <div className="text-cta">Errors: {result.result.errors.map((e) => `${e.planCode}: ${e.error}`).join("; ")}</div>
              )}
              {result.result.created.length === 0 && result.result.errors.length === 0 && (
                <div className="text-muted">Nothing to do — all paid plans already synced.</div>
              )}
            </div>
          ) : (
            <div className="text-cta"><i className="fas fa-exclamation-circle mr-1" /> {result.error}</div>
          )}
        </div>
      )}
    </div>
  );
}
