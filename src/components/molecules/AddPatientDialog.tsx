"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { createPatientAction } from "@/app/(clinic-app)/admin/patients/actions";

type Props = {
  trigger: React.ReactNode;
};

const TAG_PRESETS = ["VIP", "New", "Root canal", "Implants", "Pediatric", "Braces"];

// =============================================================================
// Schema
// =============================================================================

const patientFormSchema = z.object({
  fullName: z.string().trim().min(2, "Name must be at least 2 characters"),
  phone: z
    .string()
    .refine(
      (v) => /^\d{10}$/.test(v.replace(/\D/g, "")),
      "Enter a 10-digit phone number",
    ),
  language:      z.enum(["en", "hi", "or"]),
  dateOfBirth:   z.string().regex(/^\d{4}-\d{2}-\d{2}$/).or(z.literal("")).optional(),
  gender:        z.enum(["M", "F", "O", ""]).optional(),
  tags:          z.array(z.string()),
  whatsappOptIn: z.boolean(),
  notes:         z.string().optional(),
});

type PatientFormValues = z.infer<typeof patientFormSchema>;

const DEFAULT_VALUES: PatientFormValues = {
  fullName:      "",
  phone:         "",
  language:      "en",
  dateOfBirth:   "",
  gender:        "",
  tags:          [],
  whatsappOptIn: true,
  notes:         "",
};

// =============================================================================
// Component
// =============================================================================

export function AddPatientDialog({ trigger }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<PatientFormValues>({
    resolver:      zodResolver(patientFormSchema),
    defaultValues: DEFAULT_VALUES,
    mode:          "onBlur",
  });

  const onSubmit = (values: PatientFormValues) => {
    if (isPending) return;
    setSubmitError(null);

    const phoneDigits = values.phone.replace(/\D/g, "").slice(-10);
    const phoneE164   = `+91${phoneDigits}`;

    startTransition(async () => {
      const result = await createPatientAction({
        fullName:      values.fullName.trim(),
        phoneE164,
        language:      values.language,
        dateOfBirth:   values.dateOfBirth || undefined,
        gender:        values.gender ? (values.gender as "M" | "F" | "O") : undefined,
        tags:          values.tags,
        whatsappOptIn: values.whatsappOptIn,
        notes:         values.notes?.trim() || undefined,
      });

      if (!result.ok) {
        setSubmitError(result.error);
        return;
      }

      router.refresh();
      setOpen(false);
      window.setTimeout(() => { reset(DEFAULT_VALUES); setSubmitError(null); }, 200);
    });
  };

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) window.setTimeout(() => { reset(DEFAULT_VALUES); setSubmitError(null); }, 200);
      }}
    >
      <Dialog.Trigger asChild>{trigger}</Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-[rgba(16,24,40,0.55)]" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 flex max-h-[92vh] w-[calc(100%-1.5rem)] max-w-[560px] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-lg bg-white shadow-[0_24px_60px_-12px_rgba(16,24,40,0.30)] focus:outline-none">
          <div className="flex items-start justify-between gap-3 border-b border-border bg-white px-5 py-4">
            <div>
              <Dialog.Title className="text-[18px] font-semibold text-heading">Add patient</Dialog.Title>
              <Dialog.Description className="mt-0.5 text-[12px] text-muted">
                Register a new patient. Required fields are name and phone.
              </Dialog.Description>
            </div>
            <Dialog.Close
              aria-label="Close"
              className="grid h-8 w-8 cursor-pointer place-items-center rounded-pill bg-surface-muted text-muted hover:bg-border"
            >
              <i className="fas fa-times text-[12px]" />
            </Dialog.Close>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="flex min-h-0 flex-1 flex-col" noValidate>
            <div className="flex-1 overflow-y-auto px-5 py-4 md:px-6">
              <Section label="Basics" required>
                <Field label="Full name" required error={errors.fullName?.message}>
                  <input
                    {...register("fullName")}
                    autoFocus
                    placeholder="Anita Sahu"
                    className={inputCls(!!errors.fullName)}
                  />
                </Field>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Field label="Phone" required error={errors.phone?.message}>
                    <div className="flex gap-2">
                      <span className="inline-flex items-center gap-1.5 rounded-md border border-border bg-white px-3 text-[14px] text-heading">🇮🇳 +91</span>
                      <input
                        type="tel"
                        inputMode="numeric"
                        {...register("phone")}
                        placeholder="98765 43210"
                        className={inputCls(!!errors.phone)}
                      />
                    </div>
                  </Field>

                  <Field label="Preferred language">
                    <select {...register("language")} className={inputCls(false) + " cursor-pointer"}>
                      <option value="en">English</option>
                      <option value="hi">हिंदी</option>
                      <option value="or">ଓଡ଼ିଆ</option>
                    </select>
                  </Field>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Field label="Date of birth" error={errors.dateOfBirth?.message}>
                    <input
                      type="date"
                      {...register("dateOfBirth")}
                      className={inputCls(!!errors.dateOfBirth)}
                    />
                  </Field>

                  <Field label="Gender">
                    <select {...register("gender")} className={inputCls(false) + " cursor-pointer"}>
                      <option value="">—</option>
                      <option value="F">Female</option>
                      <option value="M">Male</option>
                      <option value="O">Other</option>
                    </select>
                  </Field>
                </div>
              </Section>

              <Section label="Tags">
                <Controller
                  control={control}
                  name="tags"
                  render={({ field }) => (
                    <div className="flex flex-wrap gap-1.5">
                      {TAG_PRESETS.map((t) => {
                        const active = field.value.includes(t);
                        return (
                          <button
                            key={t}
                            type="button"
                            onClick={() => {
                              const next = active
                                ? field.value.filter((v) => v !== t)
                                : [...field.value, t];
                              field.onChange(next);
                            }}
                            className={
                              "rounded-pill px-3 py-1.5 text-[12px] font-medium transition-colors " +
                              (active
                                ? "bg-brand text-white"
                                : "border border-border bg-white text-heading hover:border-link-hover")
                            }
                          >
                            {t}
                          </button>
                        );
                      })}
                    </div>
                  )}
                />
              </Section>

              <Section label="Communication">
                <Controller
                  control={control}
                  name="whatsappOptIn"
                  render={({ field }) => (
                    <label className="flex cursor-pointer items-start gap-2.5 rounded-md border border-border bg-white p-3">
                      <input
                        type="checkbox"
                        checked={field.value}
                        onChange={(e) => field.onChange(e.target.checked)}
                        className="mt-0.5 h-4 w-4 cursor-pointer accent-[#25D366]"
                      />
                      <span className="text-[13px] leading-5 text-heading">
                        <strong className="font-semibold">Send reminders on WhatsApp</strong>{" "}
                        <span className="text-muted">
                          — booking confirmations and 24-hour reminders go to this number. Uncheck for SMS-only or no notifications.
                        </span>
                      </span>
                    </label>
                  )}
                />
              </Section>

              <Section label="Note (optional)">
                <textarea
                  {...register("notes")}
                  rows={2}
                  placeholder="e.g. Allergic to penicillin. Nervous about extractions."
                  className="w-full resize-y rounded-md border border-border bg-white px-3 py-2 text-[13px] text-heading outline-none focus:border-link-hover"
                />
              </Section>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 border-t border-border bg-surface-muted px-5 py-3.5">
              <Dialog.Close
                disabled={isPending}
                className="cursor-pointer rounded-md border border-border bg-white px-4 py-2 text-[13px] font-medium text-muted disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cancel
              </Dialog.Close>
              {submitError && (
                <span role="alert" className="order-last w-full text-[12px] text-danger sm:order-none sm:w-auto">
                  <i className="fas fa-exclamation-triangle mr-1" /> {submitError}
                </span>
              )}
              <button
                type="submit"
                disabled={isPending}
                className={
                  "ml-auto inline-flex cursor-pointer items-center gap-2 rounded-md bg-cta px-5 py-2 text-[14px] font-semibold text-cta-fg transition-colors hover:bg-[#d92843] " +
                  (isPending ? "cursor-not-allowed opacity-50 hover:bg-cta" : "")
                }
              >
                {isPending ? (
                  <>
                    <i className="fas fa-spinner fa-spin text-[12px]" />
                    Saving…
                  </>
                ) : (
                  <>
                    <i className="fas fa-user-plus text-[12px]" />
                    Add patient
                  </>
                )}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

// =============================================================================
// Small bits
// =============================================================================

function inputCls(hasError: boolean): string {
  const base =
    "w-full rounded-md border bg-white px-3 py-2.5 text-[14px] text-heading outline-none focus:border-link-hover";
  return hasError ? `${base} border-danger focus:border-danger` : `${base} border-border`;
}

function Section({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="mb-5 last:mb-0">
      <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.06em] text-[#9aa9b8]">
        {label}
        {required && <span className="ml-1 text-cta">*</span>}
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function Field({
  label,
  required,
  error,
  children,
}: {
  label:    string;
  required?: boolean;
  error?:    string;
  children:  React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-[12px] font-medium text-heading">
        {label}
        {required && <span className="ml-1 text-cta">*</span>}
      </label>
      {children}
      {error && (
        <p role="alert" className="mt-1 text-[12px] text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
