"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { useEffect, useRef, useState } from "react";

type Props = {
  open: boolean;
  phone: string;
  onClose: () => void;
  onVerified: () => void;
};

const DIGIT_COUNT = 6;

export function OtpModal({ open, phone, onClose, onVerified }: Props) {
  const [digits, setDigits] = useState<string[]>(() =>
    Array.from({ length: DIGIT_COUNT }, () => ""),
  );
  const [error, setError] = useState<string | null>(null);
  const [seconds, setSeconds] = useState(60);
  const inputs = useRef<Array<HTMLInputElement | null>>([]);

  useEffect(() => {
    if (!open) {
      setDigits(Array.from({ length: DIGIT_COUNT }, () => ""));
      setError(null);
      setSeconds(60);
      return;
    }
    inputs.current[0]?.focus();
    const id = window.setInterval(() => {
      setSeconds((s) => (s > 0 ? s - 1 : 0));
    }, 1000);
    return () => window.clearInterval(id);
  }, [open]);

  const handleChange = (i: number, raw: string) => {
    const ch = raw.replace(/\D/g, "").slice(-1);
    setError(null);
    setDigits((prev) => {
      const next = [...prev];
      next[i] = ch;
      return next;
    });
    if (ch && i < DIGIT_COUNT - 1) {
      inputs.current[i + 1]?.focus();
    }
  };

  const handleKeyDown = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !digits[i] && i > 0) {
      inputs.current[i - 1]?.focus();
    }
  };

  const handleVerify = () => {
    const code = digits.join("");
    if (code.length < DIGIT_COUNT) {
      setError("Enter all 6 digits.");
      return;
    }
    onVerified();
  };

  const mins = String(Math.floor(seconds / 60));
  const secs = String(seconds % 60).padStart(2, "0");

  return (
    <Dialog.Root open={open} onOpenChange={(v) => !v && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-[rgba(16,24,40,0.55)] data-[state=open]:animate-in data-[state=open]:fade-in" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-[440px] -translate-x-1/2 -translate-y-1/2 rounded-lg bg-white p-8 pb-7 shadow-[0_24px_60px_-12px_rgba(16,24,40,0.30)] focus:outline-none">
          <Dialog.Close
            className="absolute right-4 top-4 grid h-8 w-8 cursor-pointer place-items-center rounded-pill border-0 bg-[#F4F5F7] text-muted hover:bg-border"
            aria-label="Close"
          >
            <i className="fas fa-times text-[12px]" />
          </Dialog.Close>

          <div className="mb-4 grid h-14 w-14 place-items-center rounded-pill bg-[#25D366] text-[24px] text-white">
            <i className="fab fa-whatsapp" />
          </div>

          <Dialog.Title className="mb-1.5 text-[22px] font-semibold text-heading">
            Enter the 6-digit code
          </Dialog.Title>
          <Dialog.Description className="mb-6 text-[14px] leading-[22px] text-muted">
            We sent a one-time code to{" "}
            <strong className="font-semibold text-heading">{phone}</strong> on WhatsApp.
          </Dialog.Description>

          {error && (
            <div className="mb-3 flex items-center gap-3 rounded-[12px] border border-[#f3d3d8] bg-white px-4 py-3.5">
              <i className="fas fa-exclamation-circle text-[18px] text-cta" />
              <div className="text-[13px] text-heading">
                <strong className="font-semibold">{error}</strong>
              </div>
            </div>
          )}

          <div className="mb-2 flex gap-1.5 sm:gap-2">
            {digits.map((d, i) => (
              <input
                key={i}
                ref={(el) => {
                  inputs.current[i] = el;
                }}
                value={d}
                inputMode="numeric"
                maxLength={1}
                size={1}
                onChange={(e) => handleChange(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)}
                aria-label={`Digit ${i + 1} of 6`}
                className={
                  "h-14 w-0 min-w-0 flex-1 rounded-md p-0 text-center text-[24px] font-semibold text-heading outline-none " +
                  "border-[1.5px] " +
                  (d ? "border-brand " : "border-border ") +
                  "focus:border-cta focus:shadow-[0_0_0_3px_rgba(238,52,78,0.18)]"
                }
              />
            ))}
          </div>

          <div className="mb-6 text-[12px] text-[#9aa9b8]">
            {seconds > 0 ? (
              <>
                Resend in{" "}
                <strong className="font-semibold text-heading">
                  {mins}:{secs}
                </strong>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setSeconds(60)}
                className="text-link-hover no-underline"
              >
                Resend code
              </button>
            )}
            <span className="mx-2 text-border">·</span>
            <a href="#" className="text-link-hover no-underline">
              Use SMS instead
            </a>
          </div>

          <button
            type="button"
            onClick={handleVerify}
            className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-cta px-6 py-3 text-[15px] font-medium text-cta-fg transition-colors hover:bg-[#d92843]"
          >
            Verify &amp; confirm <i className="fas fa-arrow-right text-[11px]" />
          </button>

          <div className="mt-3 text-center text-[12px] text-[#9aa9b8]">
            <i className="fas fa-lock mr-1" />
            Code expires in 5 minutes.
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
