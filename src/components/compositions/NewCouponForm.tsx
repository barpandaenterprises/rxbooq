"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { FormField, TEXT_INPUT_CLASS } from "@/components/molecules/FormField";
import { createCouponAction } from "@/app/(super-admin)/superadmin/coupons/actions";

export function NewCouponForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const [code,   setCode]   = useState("");
  const [kind,   setKind]   = useState<"percent" | "flat">("percent");
  const [value,  setValue]  = useState<string>("");
  const [scope,  setScope]  = useState<"first_cycle" | "recurring">("first_cycle");
  const [partnerId, setPartnerId] = useState<string>("");
  const [notes,  setNotes]  = useState("");
  const [error,  setError]  = useState<string | null>(null);

  const submit = () => {
    setError(null);
    const v = Number(value);
    if (!Number.isFinite(v) || v <= 0) { setError("Enter a positive value."); return; }
    startTransition(async () => {
      const res = await createCouponAction({
        code,
        kind,
        value:         v,
        scope,
        partnerUserId: partnerId.trim() ? partnerId.trim() : null,
        notes:         notes.trim() ? notes.trim() : undefined,
      });
      if (!res.ok) { setError(res.error); return; }
      router.push("/superadmin/coupons");
    });
  };

  return (
    <div className="rounded-lg border border-border bg-white p-6">
      {error && (
        <div className="mb-4 rounded-md border border-[#f3d3d8] bg-[#fff5f6] px-3 py-2 text-[13px] text-heading">{error}</div>
      )}

      <FormField label="Code" required hint="Stored lowercase. Users can type any case.">
        <input className={TEXT_INPUT_CLASS + " font-mono uppercase"} value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="LAUNCH50" />
      </FormField>

      <div className="grid gap-4 md:grid-cols-2">
        <FormField label="Discount type" required>
          <select className={TEXT_INPUT_CLASS} value={kind} onChange={(e) => setKind(e.target.value as "percent" | "flat")}>
            <option value="percent">Percent off</option>
            <option value="flat">Flat ₹ off</option>
          </select>
        </FormField>
        <FormField label={kind === "percent" ? "Percent (1–100)" : "Amount (₹)"} required>
          <input className={TEXT_INPUT_CLASS} inputMode="numeric" value={value} onChange={(e) => setValue(e.target.value.replace(/\D/g, ""))} placeholder={kind === "percent" ? "50" : "1000"} />
        </FormField>
        <FormField label="Scope" required hint="first_cycle = one-shot on first invoice; recurring = every renewal">
          <select className={TEXT_INPUT_CLASS} value={scope} onChange={(e) => setScope(e.target.value as "first_cycle" | "recurring")}>
            <option value="first_cycle">First cycle only</option>
            <option value="recurring">Recurring (every renewal)</option>
          </select>
        </FormField>
        <FormField label="Partner user id (optional)" hint="auth.users.id for referral commission tracking">
          <input className={TEXT_INPUT_CLASS + " font-mono"} value={partnerId} onChange={(e) => setPartnerId(e.target.value)} placeholder="00000000-0000-0000-0000-000000000000" />
        </FormField>
      </div>

      <FormField label="Notes (internal)">
        <textarea className={TEXT_INPUT_CLASS + " min-h-[60px] resize-y"} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Spring launch promo, expires manually" />
      </FormField>

      <div className="mt-4 flex justify-end gap-2">
        <button type="button" onClick={() => router.push("/superadmin/coupons")} className="rounded-md border border-border bg-white px-4 py-2 text-[13px] text-muted hover:text-heading">Cancel</button>
        <button type="button" disabled={pending || !code || !value} onClick={submit} className="rounded-md bg-cta px-5 py-2.5 text-[13px] font-medium text-cta-fg disabled:opacity-60">
          {pending ? "Creating…" : "Create coupon"}
        </button>
      </div>
    </div>
  );
}
