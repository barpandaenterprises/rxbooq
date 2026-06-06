"use client";

import { useState, useTransition } from "react";
import { upgradePlanAction } from "@/app/(clinic-app)/[clinicSlug]/admin/settings/billing/actions";
import { formatInr } from "@/lib/billing/pricing";

type Plan = {
  id:                    string;
  code:                  string;
  display_name:          string;
  tagline:               string | null;
  monthly_price_inr:     number;
  included_doctor_seats: number;
  extra_seat_price_inr:  number;
  is_popular:            boolean;
  sort_order:            number;
  razorpay_plan_id:      string | null;
};

export function BillingPanel({
  plans,
  currentPlanId,
}: {
  plans:         Plan[];
  currentPlanId: string | null;
}) {
  const [pending, startTransition] = useTransition();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [extraSeats, setExtraSeats] = useState(0);
  const [coupon,    setCoupon]    = useState("");
  const [error,     setError]     = useState<string | null>(null);
  const [info,      setInfo]      = useState<string | null>(null);

  const upgrade = () => {
    if (!selectedId) return;
    setError(null);
    setInfo(null);
    startTransition(async () => {
      const res = await upgradePlanAction({
        planId:     selectedId,
        extraSeats,
        couponCode: coupon.trim() || undefined,
      });
      if (!res.ok) { setError(res.error); return; }
      setInfo("Redirecting to secure payment…");
      window.location.href = res.hostedUrl;
    });
  };

  return (
    <div className="space-y-4">
      <h2 className="text-[15px] font-semibold text-heading">Change plan</h2>

      <div className="grid gap-3 md:grid-cols-2">
        {plans.filter((p) => p.code !== "free").map((p) => {
          const isCurrent  = p.id === currentPlanId;
          const isSelected = p.id === selectedId;
          const disabled   = !p.razorpay_plan_id;
          return (
            <button
              key={p.id}
              type="button"
              disabled={disabled}
              onClick={() => setSelectedId(p.id)}
              className={
                "relative flex flex-col rounded-md border-[1.5px] p-4 text-left transition-colors disabled:opacity-50 " +
                (isSelected ? "border-cta bg-[#fff5f6]"
                 : isCurrent ? "border-[#cce4d6] bg-[#f1faf4]"
                 : "border-border bg-white hover:border-[#cbd5e0]")
              }
            >
              <div className="flex items-baseline justify-between">
                <span className="text-[14px] font-semibold text-heading">{p.display_name}</span>
                <span className="text-[14px] font-semibold text-heading">{formatInr(p.monthly_price_inr)}/mo</span>
              </div>
              {p.tagline && <p className="mt-1 text-[12px] text-muted">{p.tagline}</p>}
              <p className="mt-2 text-[11px] text-muted">
                {p.included_doctor_seats} seat{p.included_doctor_seats === 1 ? "" : "s"} included
                {p.extra_seat_price_inr > 0 && ` · ${formatInr(p.extra_seat_price_inr)}/mo extra`}
              </p>
              {isCurrent && <span className="mt-2 inline-block text-[11px] font-semibold text-[#1f7a3a]">Current plan</span>}
              {disabled && <span className="mt-2 inline-block text-[11px] text-[#9aa9b8]">Not yet synced to Razorpay</span>}
            </button>
          );
        })}
      </div>

      {selectedId && (
        <div className="rounded-md border border-border bg-white p-4">
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label className="block text-[12px] font-medium text-heading">Extra doctor seats</label>
              <div className="mt-1 flex items-center gap-2">
                <button type="button" onClick={() => setExtraSeats(Math.max(0, extraSeats - 1))} className="grid h-9 w-9 place-items-center rounded-md border border-border bg-white">−</button>
                <span className="w-8 text-center text-[14px] font-semibold text-heading">{extraSeats}</span>
                <button type="button" onClick={() => setExtraSeats(Math.min(50, extraSeats + 1))} className="grid h-9 w-9 place-items-center rounded-md border border-border bg-white">+</button>
              </div>
            </div>
            <div className="flex-1 min-w-[200px]">
              <label className="block text-[12px] font-medium text-heading">Coupon (optional)</label>
              <input
                className="mt-1 w-full rounded-md border-[1.5px] border-border bg-white px-3 py-2 text-[13px]"
                value={coupon}
                onChange={(e) => setCoupon(e.target.value)}
                placeholder="LAUNCH50"
              />
            </div>
            <button
              type="button"
              disabled={pending}
              onClick={upgrade}
              className="rounded-md bg-cta px-5 py-2.5 text-[13px] font-medium text-cta-fg disabled:opacity-60"
            >
              {pending ? "Setting up…" : "Continue to payment"}
            </button>
          </div>
          {error && <div className="mt-3 text-[12px] text-cta">{error}</div>}
          {info  && <div className="mt-3 text-[12px] text-[#1f7a3a]">{info}</div>}
        </div>
      )}
    </div>
  );
}
