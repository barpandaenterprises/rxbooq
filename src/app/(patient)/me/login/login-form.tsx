"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

const phoneSchema = z.object({
  phone: z
    .string()
    .trim()
    .refine(
      (v) => /^\d{10}$/.test(v.replace(/\D/g, "").replace(/^91/, "").slice(-10)),
      "Enter a 10-digit Indian mobile number",
    ),
});
type PhoneValues = z.infer<typeof phoneSchema>;

const codeSchema = z.object({
  code: z.string().trim().regex(/^\d{6}$/, "Enter the 6-digit code"),
});
type CodeValues = z.infer<typeof codeSchema>;

type Step = "phone" | "code" | "success";

type SendResponse =
  | { ok: true; sent: true; mock?: boolean; code?: string }
  | { ok: false; error: string };

type VerifyResponse =
  | { ok: true; mock: true; next: string }
  | { ok: true; mock: false; actionLink: string; next: string }
  | { ok: false; error: string };

function inputCls(hasError: boolean): string {
  const base =
    "block w-full rounded-md border bg-surface px-3 py-2 text-body shadow-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand";
  return hasError ? `${base} border-danger focus:border-danger focus:ring-danger` : `${base} border-border`;
}

export function PatientLoginForm({ next }: { next?: string }) {
  const [step, setStep] = useState<Step>("phone");
  const [phoneE164, setPhoneE164] = useState<string>("");
  const [maskedPhone, setMaskedPhone] = useState<string>("");
  const [bannerError, setBannerError] = useState<string | null>(null);
  const [devCode, setDevCode] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const phoneForm = useForm<PhoneValues>({
    resolver:      zodResolver(phoneSchema),
    defaultValues: { phone: "" },
    mode:          "onSubmit",
  });
  const codeForm = useForm<CodeValues>({
    resolver:      zodResolver(codeSchema),
    defaultValues: { code: "" },
    mode:          "onSubmit",
  });

  const onSendOtp = (values: PhoneValues) => {
    if (isPending) return;
    const local = values.phone.replace(/\D/g, "").replace(/^91/, "").slice(-10);
    const e164  = `+91${local}`;
    setPhoneE164(e164);
    setMaskedPhone(`+91 ${local.slice(0, 2)}••• ••${local.slice(7)}`);
    setBannerError(null);
    setDevCode(null);

    startTransition(async () => {
      const res = await fetch("/api/auth/wa-otp/send", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ phone: e164 }),
      });
      const json = (await res.json().catch(() => null)) as SendResponse | null;
      if (!json || !json.ok) {
        setBannerError(json && "error" in json ? json.error : "Could not send code.");
        return;
      }
      if (json.mock && json.code) setDevCode(json.code);
      setStep("code");
    });
  };

  const onVerifyOtp = (values: CodeValues) => {
    if (isPending) return;
    setBannerError(null);

    startTransition(async () => {
      const res = await fetch("/api/auth/wa-otp/verify", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ phone: phoneE164, code: values.code, next: next ?? "/me/appointments" }),
      });
      const json = (await res.json().catch(() => null)) as VerifyResponse | null;
      if (!json || !json.ok) {
        setBannerError(json && "error" in json ? json.error : "Verification failed.");
        return;
      }

      if (json.mock) {
        // No real session to issue; just navigate.
        window.location.href = json.next;
        return;
      }

      // Browser must navigate to the Supabase-hosted action link, which sets
      // the session cookies and redirects to `next`.
      window.location.href = json.actionLink;
    });
  };

  return (
    <>
      {bannerError && (
        <div role="alert" className="mb-4 rounded-md border border-danger/30 bg-red-50 px-3 py-2 text-small text-danger">
          {bannerError}
        </div>
      )}
      {devCode && (
        <div className="mb-4 rounded-md border border-[#F4D9A8] bg-[#FFF8EC] px-3 py-2 text-small text-[#7a5c2b]">
          <strong>Mock mode:</strong> your code is <code className="rounded-sm bg-white px-1 font-mono">{devCode}</code>
        </div>
      )}

      {step === "phone" && (
        <form onSubmit={phoneForm.handleSubmit(onSendOtp)} className="space-y-4" noValidate>
          <div>
            <label htmlFor="phone" className="block text-small font-medium text-body">
              Mobile number
            </label>
            <div className="mt-1 flex gap-2">
              <span className="inline-flex items-center rounded-md border border-border bg-surface px-3 text-body">
                🇮🇳 +91
              </span>
              <input
                id="phone"
                type="tel"
                inputMode="numeric"
                autoFocus
                placeholder="98765 12342"
                {...phoneForm.register("phone")}
                className={inputCls(!!phoneForm.formState.errors.phone)}
              />
            </div>
            {phoneForm.formState.errors.phone && (
              <p className="mt-1 text-[12px] text-danger">{phoneForm.formState.errors.phone.message}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={isPending}
            className={
              "inline-flex w-full items-center justify-center gap-2 rounded-md bg-brand px-3 py-2 text-small font-medium text-brand-fg shadow-sm hover:opacity-90 " +
              (isPending ? "cursor-not-allowed opacity-60" : "")
            }
          >
            {isPending ? (
              <>
                <i className="fas fa-spinner fa-spin text-[12px]" /> Sending…
              </>
            ) : (
              <>
                <i className="fab fa-whatsapp" /> Send code on WhatsApp
              </>
            )}
          </button>
        </form>
      )}

      {step === "code" && (
        <form onSubmit={codeForm.handleSubmit(onVerifyOtp)} className="space-y-4" noValidate>
          <p className="text-small text-muted">
            Code sent to <strong className="text-body">{maskedPhone}</strong>.
          </p>
          <div>
            <label htmlFor="code" className="block text-small font-medium text-body">
              6-digit code
            </label>
            <input
              id="code"
              type="text"
              inputMode="numeric"
              autoFocus
              maxLength={6}
              placeholder="123456"
              {...codeForm.register("code")}
              className={inputCls(!!codeForm.formState.errors.code) + " mt-1 text-center text-[20px] font-semibold tracking-[0.4em]"}
            />
            {codeForm.formState.errors.code && (
              <p className="mt-1 text-[12px] text-danger">{codeForm.formState.errors.code.message}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={isPending}
            className={
              "inline-flex w-full items-center justify-center gap-2 rounded-md bg-brand px-3 py-2 text-small font-medium text-brand-fg shadow-sm hover:opacity-90 " +
              (isPending ? "cursor-not-allowed opacity-60" : "")
            }
          >
            {isPending ? (
              <>
                <i className="fas fa-spinner fa-spin text-[12px]" /> Verifying…
              </>
            ) : (
              "Verify and continue"
            )}
          </button>

          <button
            type="button"
            onClick={() => { setStep("phone"); setDevCode(null); setBannerError(null); }}
            className="block w-full text-center text-[12px] text-link-hover hover:underline"
          >
            Use a different number
          </button>
        </form>
      )}
    </>
  );
}
