"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  deletePlanAction,
  togglePlanActiveAction,
} from "@/app/(super-admin)/superadmin/plans/actions";
import { formatInr } from "@/lib/billing/pricing";

export type PlanRow = {
  id:                    string;
  code:                  string;
  display_name:          string;
  tagline:               string | null;
  monthly_price_inr:     number;
  included_doctor_seats: number;
  extra_seat_price_inr:  number;
  features:              Record<string, unknown>;
  razorpay_plan_id:      string | null;
  is_active:             boolean;
  is_popular:            boolean;
  sort_order:            number;
};

export function PlansTable({ plans }: { plans: PlanRow[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const toggleActive = (id: string, next: boolean) => {
    setError(null);
    startTransition(async () => {
      const res = await togglePlanActiveAction(id, next);
      if (!res.ok) setError(res.error);
      else router.refresh();
    });
  };

  const hardDelete = (id: string) => {
    setError(null);
    startTransition(async () => {
      const res = await deletePlanAction(id);
      if (!res.ok) { setError(res.error); setConfirmId(null); return; }
      setConfirmId(null);
      router.refresh();
    });
  };

  if (plans.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-white p-10 text-center text-[13px] text-muted">
        No plans yet. Create one to get started.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {error && (
        <div className="rounded-md border border-[#f3d3d8] bg-[#fff5f6] px-3 py-2 text-[13px] text-heading">{error}</div>
      )}

      <div className="overflow-hidden rounded-lg border border-border bg-white">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="bg-[#fafbfc] text-left text-[12px] uppercase tracking-wide text-muted">
              <th className="px-4 py-2 font-medium">Plan</th>
              <th className="px-4 py-2 font-medium">Price</th>
              <th className="px-4 py-2 font-medium">Seats</th>
              <th className="px-4 py-2 font-medium">Razorpay</th>
              <th className="px-4 py-2 font-medium">Status</th>
              <th className="px-4 py-2 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {plans.map((p) => {
              const isFree    = p.monthly_price_inr === 0;
              const isConfirm = confirmId === p.id;
              return (
                <tr key={p.id} className="border-t border-border">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-heading">{p.display_name}</span>
                      {p.is_popular && <span className="rounded-pill bg-cta px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-cta-fg">Popular</span>}
                    </div>
                    <div className="mt-0.5 font-mono text-[11px] text-muted">{p.code}</div>
                    {p.tagline && <div className="mt-1 text-[12px] text-muted">{p.tagline}</div>}
                  </td>
                  <td className="px-4 py-3 text-[13px] text-heading">
                    {isFree ? "Free" : `${formatInr(p.monthly_price_inr)}/mo`}
                  </td>
                  <td className="px-4 py-3 text-[12px]">
                    <div>{p.included_doctor_seats} incl.</div>
                    {p.extra_seat_price_inr > 0 && (
                      <div className="text-muted">+ {formatInr(p.extra_seat_price_inr)}/mo each</div>
                    )}
                  </td>
                  <td className="px-4 py-3 font-mono text-[11px]">
                    {isFree
                      ? <span className="text-muted">n/a</span>
                      : p.razorpay_plan_id
                        ? <span className="text-[#1f7a3a]">{p.razorpay_plan_id}</span>
                        : <span className="text-[#a86a00]">not synced</span>}
                  </td>
                  <td className="px-4 py-3">
                    {p.is_active
                      ? <span className="rounded-pill bg-[#e6f3ec] px-2 py-0.5 text-[11px] font-semibold text-[#1f7a3a]">Active</span>
                      : <span className="rounded-pill bg-[#f4f5f7] px-2 py-0.5 text-[11px] font-semibold text-muted">Disabled</span>}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1.5">
                      <Link
                        href={`/superadmin/plans/${p.id}/edit`}
                        className="rounded-md border border-border bg-white px-2.5 py-1.5 text-[12px] text-heading no-underline hover:bg-[#fafbfc]"
                      >
                        Edit
                      </Link>
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => toggleActive(p.id, !p.is_active)}
                        className="rounded-md border border-border bg-white px-2.5 py-1.5 text-[12px] text-muted hover:text-heading disabled:opacity-60"
                      >
                        {p.is_active ? "Deactivate" : "Activate"}
                      </button>
                      {isConfirm ? (
                        <>
                          <button
                            type="button"
                            disabled={pending}
                            onClick={() => hardDelete(p.id)}
                            className="rounded-md bg-cta px-2.5 py-1.5 text-[12px] font-medium text-cta-fg disabled:opacity-60"
                          >
                            Confirm delete
                          </button>
                          <button
                            type="button"
                            disabled={pending}
                            onClick={() => setConfirmId(null)}
                            className="rounded-md border border-border bg-white px-2.5 py-1.5 text-[12px] text-muted hover:text-heading"
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          disabled={pending}
                          onClick={() => setConfirmId(p.id)}
                          className="rounded-md border border-border bg-white px-2.5 py-1.5 text-[12px] text-cta hover:bg-[#fff5f6] disabled:opacity-60"
                          title="Hard delete (only if no references). Prefer Deactivate."
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="text-[11px] text-muted">
        <i className="fas fa-info-circle mr-1" />
        <strong>Deactivate</strong> hides the plan from /pricing and the onboarding picker but keeps existing subscriptions running.
        <strong className="ml-1">Delete</strong> only works if no clinic, draft, or subscription references it — otherwise deactivate.
      </p>
    </div>
  );
}
