"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useRef, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { submitLeadAction } from "@/app/(public)/lead-actions";
import { collectTracking } from "@/lib/data/leads";
import { isIndianMobile } from "@/lib/phone";

/**
 * "Need support?" lead-capture section that sits between the CTA strip and the
 * footer on the apex home page (matches the approved design).
 *
 * Tracking is captured on mount from the *current* landing URL and persisted to
 * sessionStorage, so params survive if the visitor clicks around the marketing
 * site before submitting. The three visible fields plus the captured
 * landing-URL / referrer / UTM bag are handed to the server action, which adds
 * the IP address and stores the row.
 *
 * Form state uses react-hook-form + zodResolver, matching the rest of the app
 * (AddPatientDialog, login-form, …) for inline per-field validation.
 */

const TRACK_KEY = "rxbooq_lead_tracking";

// Only name + phone are mandatory; email is optional but must be valid if given.
const leadFormSchema = z.object({
  name:  z.string().trim().min(1, "Please enter your name").max(120),
  phone: z
    .string()
    .trim()
    .min(1, "Please enter your phone number")
    .refine(isIndianMobile, "Enter a valid 10-digit mobile number"),
  email: z.string().trim().email("Please enter a valid email address").max(200).or(z.literal("")),
});

type LeadFormValues = z.infer<typeof leadFormSchema>;

const DEFAULT_VALUES: LeadFormValues = { name: "", phone: "", email: "" };

type Tracking = {
  landingPageUrl: string;
  referrer:       string;
  utm:            Record<string, string>;
};

function loadTracking(): Tracking {
  // Prefer a previously-captured landing context (first page the visitor hit).
  try {
    const stored = sessionStorage.getItem(TRACK_KEY);
    if (stored) return JSON.parse(stored) as Tracking;
  } catch {
    /* sessionStorage unavailable — fall through to live capture */
  }
  const utm = collectTracking(new URLSearchParams(window.location.search));
  const tracking: Tracking = {
    landingPageUrl: window.location.href,
    referrer:       document.referrer || "",
    utm,
  };
  try {
    sessionStorage.setItem(TRACK_KEY, JSON.stringify(tracking));
  } catch {
    /* ignore */
  }
  return tracking;
}

export function PlatformLeadCapture() {
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [done, setDone]   = useState(false);
  const [pending, startTransition] = useTransition();
  const tracking = useRef<Tracking | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<LeadFormValues>({
    resolver:      zodResolver(leadFormSchema),
    defaultValues: DEFAULT_VALUES,
    mode:          "onBlur",
  });

  useEffect(() => {
    tracking.current = loadTracking();
  }, []);

  const onSubmit = (values: LeadFormValues) => {
    if (pending) return;
    setSubmitError(null);

    startTransition(async () => {
      const t = tracking.current;
      const res = await submitLeadAction({
        name:           values.name.trim(),
        phone:          values.phone.trim(),
        email:          values.email.trim() || null,
        landingPageUrl: t?.landingPageUrl,
        referrer:       t?.referrer || undefined,
        utm:            t?.utm,
      });
      if (!res.ok) { setSubmitError(res.error); return; }
      setDone(true);
      reset(DEFAULT_VALUES);
    });
  };

  return (
    <section id="lead-form" className="scroll-mt-20 border-t border-border bg-white py-14 md:scroll-mt-24 md:py-20">
      <div className="mx-auto max-w-[1120px] px-5 md:px-8">
        <div className="grid grid-cols-1 gap-8 rounded-2xl border border-border bg-white p-6 shadow-[0_10px_30px_-18px_rgba(16,24,40,0.18)] md:grid-cols-[1fr_1.1fr] md:gap-12 md:p-10">
          {/* Left — support pitch */}
          <div className="flex flex-col justify-center">
            <span className="grid h-20 w-20 place-items-center rounded-full bg-[#EDEBFB] text-[30px] text-brand">
              <i className="fas fa-headset" />
            </span>
            <h2 className="mt-6 text-[24px] font-semibold leading-tight text-heading md:text-[26px]">
              Need support?
              <br />
              We love speaking to our partners. <span className="text-brand">💜</span>
            </h2>
            <p className="mt-3 max-w-[360px] text-[14px] leading-[23px] text-muted">
              Fill this form and our team will get in touch to help you with anything you need.
            </p>
          </div>

          {/* Right — capture form */}
          <div>
            {done ? (
              <div className="flex h-full flex-col items-center justify-center rounded-xl border border-[#cfe8d8] bg-[#f2fbf5] px-6 py-12 text-center">
                <span className="grid h-12 w-12 place-items-center rounded-full bg-[#1f7a3a] text-[20px] text-white">
                  <i className="fas fa-check" />
                </span>
                <h3 className="mt-4 text-[18px] font-semibold text-heading">Request received</h3>
                <p className="mt-1.5 text-[14px] text-muted">
                  Thanks! Our team will reach out to you shortly.
                </p>
                <button
                  type="button"
                  onClick={() => setDone(false)}
                  className="mt-5 text-[13px] font-medium text-link-hover hover:underline"
                >
                  Submit another request
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit(onSubmit)} noValidate>
                {submitError && (
                  <div role="alert" className="mb-4 rounded-md border border-[#f3d3d8] bg-[#fff5f6] px-3 py-2 text-[13px] text-heading">
                    {submitError}
                  </div>
                )}

                <Field label="Name" required error={errors.name?.message}>
                  <IconInput icon="fa-user" invalid={!!errors.name}>
                    <input
                      {...register("name")}
                      placeholder="Enter your full name"
                      autoComplete="name"
                      className={INPUT_CLASS}
                    />
                  </IconInput>
                </Field>

                <Field label="Phone number" required error={errors.phone?.message}>
                  <IconInput icon="fa-phone" invalid={!!errors.phone}>
                    <input
                      {...register("phone")}
                      placeholder="Enter your phone number"
                      inputMode="tel"
                      autoComplete="tel"
                      className={INPUT_CLASS}
                    />
                  </IconInput>
                </Field>

                <Field label="Email" error={errors.email?.message}>
                  <IconInput icon="fa-envelope" invalid={!!errors.email}>
                    <input
                      {...register("email")}
                      placeholder="Enter your email address"
                      inputMode="email"
                      autoComplete="email"
                      type="email"
                      className={INPUT_CLASS}
                    />
                  </IconInput>
                </Field>

                <button
                  type="submit"
                  disabled={pending}
                  className="mt-1 flex w-full items-center justify-center gap-2 rounded-md bg-brand px-6 py-3.5 text-[15px] font-semibold text-white transition-colors hover:bg-link-hover disabled:opacity-60"
                >
                  <i className="fas fa-paper-plane text-[13px]" />
                  {pending ? "Sending…" : "Send request"}
                </button>

                <p className="mt-3 flex items-center justify-center gap-1.5 text-[12px] text-muted">
                  <i className="fas fa-lock text-[10px]" />
                  Your information is safe with us. We never share your details.
                </p>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

const INPUT_CLASS =
  "w-full bg-transparent text-[15px] text-heading outline-none placeholder:text-[#9aa9b8]";

function Field({
  label,
  required,
  error,
  children,
}: {
  label:     string;
  required?: boolean;
  error?:    string;
  children:  React.ReactNode;
}) {
  return (
    <div className="mb-4">
      <label className="mb-1.5 block text-[13px] font-medium text-heading">
        {label}
        {required && <span className="ml-0.5 text-cta">*</span>}
      </label>
      {children}
      {error && (
        <p role="alert" className="mt-1.5 flex items-center gap-1.5 text-[12px] text-cta">
          <i className="fas fa-exclamation-circle text-[11px]" />
          {error}
        </p>
      )}
    </div>
  );
}

function IconInput({
  icon,
  invalid,
  children,
}: {
  icon:     string;
  invalid?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className={
        "flex items-center gap-2.5 rounded-md border-[1.5px] bg-white px-3.5 py-3 " +
        (invalid
          ? "border-cta focus-within:shadow-[0_0_0_3px_rgba(238,52,78,0.18)]"
          : "border-border focus-within:border-brand focus-within:shadow-[0_0_0_3px_rgba(79,70,229,0.14)]")
      }
    >
      <i className={`fas ${icon} text-[13px] text-brand`} />
      {children}
    </div>
  );
}
