"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  sendOnboardingOtpAction,
  verifyOnboardingOtpAction,
} from "@/app/(onboarding)/get-started/actions";
import { FormField, TEXT_INPUT_CLASS } from "@/components/molecules/FormField";

type Props = {
  /** "Get started" vs "Resume application" copy. */
  mode?: "start" | "resume";
};

type Channel = "phone" | "email";

function stepFromLast(last: string | null): string {
  switch (last) {
    case "profile":  return "practice";
    case "practice": return "docs";
    case "docs":     return "plan";
    case "plan":     return "account";
    case "account":  return "account";
    case "phone":
    default:         return "profile";
  }
}

export function PhoneOtpStep({ mode = "start" }: Props) {
  const router = useRouter();
  const [channel, setChannel]   = useState<Channel>("phone");
  const [phone, setPhone]       = useState("+91");
  const [email, setEmail]       = useState("");
  const [otpSent, setOtpSent]   = useState(false);
  const [code, setCode]         = useState("");
  const [error, setError]       = useState<string | null>(null);
  const [info, setInfo]         = useState<string | null>(null);
  const [devCode, setDevCode]   = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const contact = channel === "phone" ? phone.trim() : email.trim();

  const switchChannel = (next: Channel) => {
    if (next === channel) return;
    setChannel(next);
    setOtpSent(false);
    setCode("");
    setError(null);
    setInfo(null);
    setDevCode(null);
  };

  const submitContact = () => {
    setError(null);
    setInfo(null);
    setDevCode(null);
    startTransition(async () => {
      const res = await sendOnboardingOtpAction({ channel, contact });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setOtpSent(true);
      setInfo(
        channel === "phone"
          ? `Code sent to ${contact} on WhatsApp. Check your messages.`
          : `Code sent to ${contact}. Check your inbox (and spam).`,
      );
      if (res.devCode) setDevCode(res.devCode);
    });
  };

  const submitOtp = () => {
    setError(null);
    startTransition(async () => {
      const res = await verifyOnboardingOtpAction({ channel, contact, code });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      router.push(`/get-started/${res.draftId}?step=${stepFromLast(res.lastStep)}`);
    });
  };

  return (
    <div className="rounded-lg border border-border bg-white p-6 md:p-8">
      <h1 className="mb-1 text-[24px] font-semibold leading-tight text-heading">
        {mode === "resume" ? "Resume your application" : "Set up your clinic on Rxbooq"}
      </h1>
      <p className="mb-6 text-[14px] text-muted">
        {mode === "resume"
          ? "Enter the mobile number or email you started with. We'll send a code to pick up where you left off."
          : "Start with your mobile number or email. We'll save your progress as you go — you can come back anytime."}
      </p>

      {error && (
        <div className="mb-4 flex items-center gap-2 rounded-md border border-[#f3d3d8] bg-[#fff5f6] px-3 py-2.5 text-[13px] text-heading">
          <i className="fas fa-exclamation-circle text-cta" />
          {error}
        </div>
      )}
      {info && !error && (
        <div className="mb-4 flex items-center gap-2 rounded-md border border-[#cce4d6] bg-[#f1faf4] px-3 py-2.5 text-[13px] text-heading">
          <i className="fas fa-check-circle text-[#1f7a3a]" />
          {info}
        </div>
      )}
      {devCode && (
        <div className="mb-4 rounded-md border border-[#cfe0f3] bg-[#f1f7fe] px-3 py-2.5 text-[13px] text-heading">
          <i className="fas fa-flask mr-1.5 text-link-hover" /> Dev mode — your code is <strong>{devCode}</strong>
        </div>
      )}

      {!otpSent ? (
        <>
          {/* Channel toggle */}
          <div className="mb-4 inline-flex rounded-md border border-border p-0.5 text-[13px]">
            {(["phone", "email"] as Channel[]).map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => switchChannel(c)}
                className={
                  "rounded-[6px] px-4 py-1.5 font-medium transition-colors " +
                  (channel === c ? "bg-cta text-cta-fg" : "text-muted hover:text-heading")
                }
              >
                <i className={`fas ${c === "phone" ? "fa-mobile-screen-button" : "fa-envelope"} mr-1.5 text-[11px]`} />
                {c === "phone" ? "Mobile number" : "Email"}
              </button>
            ))}
          </div>

          {channel === "phone" ? (
            <FormField label="Mobile number" htmlFor="phone" required hint="Use country code, e.g. +919999900001">
              <input
                id="phone"
                className={TEXT_INPUT_CLASS}
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91…"
              />
            </FormField>
          ) : (
            <FormField label="Email" htmlFor="email" required hint="We'll send a 6-digit code to this address">
              <input
                id="email"
                className={TEXT_INPUT_CLASS}
                type="email"
                inputMode="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@clinic.in"
              />
            </FormField>
          )}
          <button
            type="button"
            disabled={pending}
            onClick={submitContact}
            className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-md bg-cta px-6 py-3 text-[15px] font-medium text-cta-fg transition-colors hover:bg-[#d92843] disabled:opacity-60"
          >
            {pending ? "Sending…" : "Send code"}
            {!pending && <i className="fas fa-arrow-right text-[11px]" />}
          </button>
        </>
      ) : (
        <>
          <FormField label="6-digit code" htmlFor="otp" required hint={channel === "phone" ? "Sent to your WhatsApp." : "Sent to your email."}>
            <input
              id="otp"
              className={TEXT_INPUT_CLASS}
              inputMode="numeric"
              maxLength={6}
              autoComplete="one-time-code"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              placeholder="••••••"
            />
          </FormField>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={pending || code.length !== 6}
              onClick={submitOtp}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-md bg-cta px-6 py-3 text-[15px] font-medium text-cta-fg transition-colors hover:bg-[#d92843] disabled:opacity-60"
            >
              {pending ? "Verifying…" : "Verify"}
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => { setOtpSent(false); setCode(""); setDevCode(null); }}
              className="rounded-md border border-border bg-white px-4 py-3 text-[13px] text-muted hover:text-heading"
            >
              Change
            </button>
          </div>
          <button
            type="button"
            disabled={pending}
            onClick={submitContact}
            className="mt-3 w-full text-[12px] text-muted hover:text-heading"
          >
            Didn't get it? Resend code
          </button>
        </>
      )}
    </div>
  );
}
