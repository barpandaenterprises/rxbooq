"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { FormField, TEXT_INPUT_CLASS } from "@/components/molecules/FormField";
import {
  applyCouponAction,
  previewQuoteAction,
  saveOnboardingStepAction,
} from "@/app/(onboarding)/get-started/actions";
import { formatInr, type PriceQuote } from "@/lib/billing/pricing";

type Plan = {
  id:                    string;
  code:                  string;
  display_name:          string;
  tagline:               string | null;
  monthly_price_inr:     number;
  included_doctor_seats: number;
  extra_seat_price_inr:  number;
  features:              Record<string, unknown>;
  is_popular:            boolean;
  sort_order:            number;
};

type Draft = {
  selected_plan_id:       string | null;
  requested_doctor_seats: number | null;
  applied_coupon_id:      string | null;
};

export function PlanPickerStep({
  draft,
  draftId,
  plans,
}: {
  draft:   Draft;
  draftId: string;
  plans:   Plan[];
}) {
  const router  = useRouter();
  const [pending, startTransition] = useTransition();

  // Default to Practice (most popular) if no draft selection; fall back to Free.
  const defaultPlanId = useMemo(() => {
    if (draft.selected_plan_id) return draft.selected_plan_id;
    return plans.find((p) => p.is_popular)?.id ?? plans[0]?.id;
  }, [draft.selected_plan_id, plans]);

  const [selectedId, setSelectedId] = useState<string | undefined>(defaultPlanId);
  const [extraSeats, setExtraSeats] = useState<number>(
    Math.max(0, (draft.requested_doctor_seats ?? 1) - 1),
  );
  const [coupon, setCoupon]         = useState<string>("");
  const [quote, setQuote]           = useState<PriceQuote | null>(null);
  const [error, setError]           = useState<string | null>(null);

  const selected = plans.find((p) => p.id === selectedId);

  // Live preview quote — re-fetch when plan or seats change.
  useEffect(() => {
    if (!selectedId) return;
    let cancelled = false;
    (async () => {
      const res = await previewQuoteAction({ planId: selectedId, extraSeats });
      if (!cancelled && res.ok) setQuote(res.quote);
    })();
    return () => { cancelled = true; };
  }, [selectedId, extraSeats]);

  const applyCoupon = () => {
    if (!selectedId || !coupon.trim()) return;
    setError(null);
    startTransition(async () => {
      const res = await applyCouponAction({
        code:       coupon.trim(),
        planId:     selectedId,
        extraSeats,
      });
      if (!res.ok) { setError(res.error); return; }
      setQuote(res.quote);
    });
  };

  const removeCoupon = () => {
    setCoupon("");
    if (selectedId) {
      startTransition(async () => {
        const res = await previewQuoteAction({ planId: selectedId, extraSeats });
        if (res.ok) setQuote(res.quote);
      });
    }
  };

  const next = () => {
    if (!selectedId) { setError("Pick a plan to continue."); return; }
    setError(null);
    startTransition(async () => {
      const res = await saveOnboardingStepAction({
        selected_plan_id:       selectedId,
        requested_doctor_seats: 1 + extraSeats,
        applied_coupon_id:      quote?.appliedCoupon?.id ?? null,
        last_step_completed:    "plan",
      });
      if (!res.ok) { setError(res.error); return; }
      router.push(`/get-started/${draftId}?step=account`);
    });
  };

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-border bg-white p-6 md:p-8">
        <h2 className="mb-1 text-[20px] font-semibold text-heading">Pick your plan</h2>
        <p className="mb-6 text-[13px] text-muted">
          You can change or cancel anytime. Paid plans start with a 14-day free trial — no card today.
        </p>

        <div className="grid gap-3 md:grid-cols-2">
          {plans.map((p) => {
            const isSelected = p.id === selectedId;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => setSelectedId(p.id)}
                className={
                  "relative flex flex-col rounded-md border-[1.5px] p-4 text-left transition-colors " +
                  (isSelected ? "border-cta bg-[#fff5f6]" : "border-border bg-white hover:border-[#cbd5e0]")
                }
              >
                {p.is_popular && (
                  <span className="absolute -top-2 right-3 rounded-pill bg-cta px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-cta-fg">
                    Most popular
                  </span>
                )}
                <div className="flex items-baseline justify-between">
                  <span className="text-[16px] font-semibold text-heading">{p.display_name}</span>
                  <span className="text-[18px] font-semibold text-heading">
                    {p.monthly_price_inr === 0 ? "Free" : `${formatInr(p.monthly_price_inr)}/mo`}
                  </span>
                </div>
                {p.tagline && <p className="mt-1 text-[12px] text-muted">{p.tagline}</p>}
                <ul className="mt-3 space-y-1 text-[12px] text-body">
                  <li>{p.included_doctor_seats} doctor seat{p.included_doctor_seats === 1 ? "" : "s"} included</li>
                  {p.extra_seat_price_inr > 0 && (
                    <li>+ {formatInr(p.extra_seat_price_inr)}/mo per extra seat</li>
                  )}
                  {(p.features as Record<string, unknown>).calendar === true   && <li><i className="fas fa-check mr-1.5 text-[10px] text-[#1f7a3a]" />Online scheduling</li>}
                  {(p.features as Record<string, unknown>).emr === true        && <li><i className="fas fa-check mr-1.5 text-[10px] text-[#1f7a3a]" />Digital prescriptions / EMR</li>}
                  {(p.features as Record<string, unknown>).whatsapp_templates === true && <li><i className="fas fa-check mr-1.5 text-[10px] text-[#1f7a3a]" />WhatsApp reminders + broadcasts</li>}
                  {(p.features as Record<string, unknown>).sponsored_placement === true && <li><i className="fas fa-check mr-1.5 text-[10px] text-[#1f7a3a]" />Boosted search placement</li>}
                </ul>
              </button>
            );
          })}
        </div>
      </div>

      {selected && selected.monthly_price_inr > 0 && (
        <div className="rounded-lg border border-border bg-white p-6 md:p-8">
          <h3 className="mb-3 text-[15px] font-semibold text-heading">Extra doctor seats</h3>
          <p className="mb-3 text-[12px] text-muted">
            {selected.display_name} includes {selected.included_doctor_seats} seat{selected.included_doctor_seats === 1 ? "" : "s"}. Add more at {formatInr(selected.extra_seat_price_inr)}/mo each.
          </p>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setExtraSeats(Math.max(0, extraSeats - 1))}
              className="grid h-9 w-9 place-items-center rounded-md border border-border bg-white text-muted hover:text-heading"
            >−</button>
            <span className="min-w-[3ch] text-center text-[15px] font-semibold text-heading">{extraSeats}</span>
            <button
              type="button"
              onClick={() => setExtraSeats(Math.min(50, extraSeats + 1))}
              className="grid h-9 w-9 place-items-center rounded-md border border-border bg-white text-muted hover:text-heading"
            >+</button>
          </div>
        </div>
      )}

      {selected && selected.monthly_price_inr > 0 && (
        <div className="rounded-lg border border-border bg-white p-6 md:p-8">
          <h3 className="mb-3 text-[15px] font-semibold text-heading">Have a coupon?</h3>
          <div className="flex gap-2">
            <input
              className={TEXT_INPUT_CLASS}
              value={coupon}
              onChange={(e) => setCoupon(e.target.value)}
              placeholder="LAUNCH50"
            />
            {quote?.appliedCoupon ? (
              <button type="button" onClick={removeCoupon} className="rounded-md border border-border px-4 text-[13px] text-muted hover:text-heading">Remove</button>
            ) : (
              <button type="button" disabled={pending || !coupon.trim()} onClick={applyCoupon} className="rounded-md bg-heading px-4 text-[13px] font-medium text-white disabled:opacity-60">Apply</button>
            )}
          </div>
          {quote?.appliedCoupon && (
            <div className="mt-2 text-[12px] text-[#1f7a3a]">
              <i className="fas fa-check-circle mr-1" />
              {quote.appliedCoupon.code.toUpperCase()} applied — {quote.appliedCoupon.scope === "first_cycle" ? "first cycle only" : "every renewal"}
            </div>
          )}
        </div>
      )}

      {quote && selected && (
        <div className="rounded-lg border border-border bg-white p-6 md:p-8">
          <h3 className="mb-3 text-[15px] font-semibold text-heading">Summary</h3>
          <dl className="space-y-1.5 text-[13px]">
            <Row label={`${selected.display_name} plan`} value={formatInr(selected.monthly_price_inr)} />
            {quote.extraSeats > 0 && (
              <Row label={`${quote.extraSeats} extra seat${quote.extraSeats === 1 ? "" : "s"}`} value={formatInr(quote.extraSeats * selected.extra_seat_price_inr)} />
            )}
            {quote.discountInr > 0 && (
              <Row label="Coupon discount" value={`−${formatInr(quote.discountInr)}`} valueClass="text-[#1f7a3a]" />
            )}
            <div className="my-2 border-t border-border" />
            <Row label="Due after trial (per month)" value={formatInr(quote.totalInr)} bold />
          </dl>
          <p className="mt-3 text-[12px] text-muted">
            <i className="fas fa-lock mr-1" />
            Nothing charged today. 14-day free trial; we'll ask for payment only when you upgrade from your admin.
          </p>
        </div>
      )}

      {error && (
        <div className="rounded-md border border-[#f3d3d8] bg-[#fff5f6] px-3 py-2 text-[13px] text-heading">
          {error}
        </div>
      )}

      <div className="flex justify-between">
        <button type="button" onClick={() => router.push(`/get-started/${draftId}?step=docs`)} className="text-[13px] text-muted hover:text-heading">
          <i className="fas fa-arrow-left mr-1 text-[11px]" /> Back
        </button>
        <button
          type="button"
          disabled={pending || !selectedId}
          onClick={next}
          className="inline-flex items-center gap-2 rounded-md bg-cta px-6 py-3 text-[15px] font-medium text-cta-fg transition-colors hover:bg-[#d92843] disabled:opacity-60"
        >
          {pending ? "Saving…" : "Continue"}
          {!pending && <i className="fas fa-arrow-right text-[11px]" />}
        </button>
      </div>
    </div>
  );
}

function Row({ label, value, bold, valueClass }: {
  label: string; value: string; bold?: boolean; valueClass?: string;
}) {
  return (
    <div className="flex items-baseline justify-between">
      <dt className={"text-[13px] " + (bold ? "font-semibold text-heading" : "text-body")}>{label}</dt>
      <dd className={"text-[13px] " + (bold ? "font-semibold text-heading" : "") + " " + (valueClass ?? "")}>{value}</dd>
    </div>
  );
}
