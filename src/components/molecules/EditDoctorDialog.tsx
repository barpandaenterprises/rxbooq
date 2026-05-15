"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { updateDoctorAction } from "@/app/(clinic-app)/admin/doctors/actions";
import { DoctorPhotoField, fileToDataUrl } from "@/components/molecules/DoctorPhotoField";
import {
  SPECIALTIES,
  type Doctor,
  type DoctorStatus,
  type Locale,
  type Specialty,
} from "@/lib/doctors-data";

type Props = {
  trigger: React.ReactNode;
  doctor:  Doctor;
};

// =============================================================================
// Schema
// =============================================================================

const editDoctorSchema = z.object({
  name:               z.string().trim().min(2, "Name must be at least 2 characters"),
  qualifications:     z.string().trim().min(1, "Add at least one qualification"),
  registrationNumber: z.string().trim().min(1, "Registration number is required"),
  yearsExperience:    z
    .string()
    .optional()
    .refine(
      (v) => !v || (/^\d+$/.test(v) && Number(v) >= 0 && Number(v) <= 80),
      "Enter a whole number between 0 and 80",
    ),
  primarySpecialty:   z.enum(SPECIALTIES as unknown as [Specialty, ...Specialty[]]),
  trainedAt:          z.string().trim().optional().default(""),
  phone:              z
    .string()
    .optional()
    .refine(
      (v) => !v || /^\d{10}$/.test(v.replace(/\D/g, "").replace(/^91/, "").slice(-10)),
      "Enter a 10-digit phone number",
    ),
  email:              z
    .string()
    .trim()
    .optional()
    .refine(
      (v) => !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
      "Enter a valid email address",
    ),
  languages:          z.array(z.enum(["EN", "HI", "OR"])).min(1, "Pick at least one language"),
  visiting:           z.boolean(),
  visitingNote:       z.string().optional().default(""),
  status:             z.enum(["active", "on_leave", "inactive"]),
});

type EditDoctorValues = z.infer<typeof editDoctorSchema>;

function stripPrefix(name: string): string {
  return name.replace(/^(Dr\.?\s+)/i, "");
}

function localPhone(formatted: string): string {
  return formatted.replace(/\D/g, "").replace(/^91/, "").slice(-10);
}

// =============================================================================
// Component
// =============================================================================

export function EditDoctorDialog({ trigger, doctor }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoRemoved, setPhotoRemoved] = useState(false);

  const defaultValues: EditDoctorValues = {
    name:               stripPrefix(doctor.name),
    qualifications:     doctor.qualifications.join(", "),
    registrationNumber: doctor.registrationNumber,
    yearsExperience:    doctor.stats.yearsExperience ? String(doctor.stats.yearsExperience) : "",
    primarySpecialty:   doctor.primarySpecialty,
    trainedAt:          doctor.trainedAt && doctor.trainedAt !== "—" ? doctor.trainedAt : "",
    phone:              localPhone(doctor.phone ?? ""),
    email:              doctor.email ?? "",
    languages:          doctor.languages,
    visiting:           doctor.visiting,
    visitingNote:       doctor.visitingNote ?? "",
    status:             doctor.status,
  };

  const {
    register,
    control,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<EditDoctorValues>({
    resolver:      zodResolver(editDoctorSchema),
    defaultValues,
    mode:          "onBlur",
  });

  const visiting = watch("visiting");

  const onSubmit = (values: EditDoctorValues) => {
    if (isPending) return;
    setSubmitError(null);

    const displayName = values.name.startsWith("Dr") ? values.name : `Dr. ${values.name}`;
    const qualsArr    = values.qualifications.split(",").map((q) => q.trim()).filter(Boolean);
    const phoneDigits = (values.phone ?? "").replace(/\D/g, "");
    const yearsExp    = values.yearsExperience ? Number.parseInt(values.yearsExperience, 10) : null;

    startTransition(async () => {
      let photoBase64:   string | undefined;
      let photoMime:     string | undefined;
      let photoFileName: string | undefined;
      if (photoFile) {
        try {
          photoBase64   = await fileToDataUrl(photoFile);
          photoMime     = photoFile.type || "image/jpeg";
          photoFileName = photoFile.name || `doctor-${Date.now()}.jpg`;
        } catch {
          setSubmitError("Couldn't read the photo file. Try again or skip the photo.");
          return;
        }
      }

      const result = await updateDoctorAction({
        id:                 doctor.id,
        displayName,
        qualifications:     qualsArr,
        registrationNumber: values.registrationNumber,
        yearsExperience:    yearsExp,
        trainedAt:          values.trainedAt || null,
        phone:              phoneDigits ? `+91${phoneDigits.slice(-10)}` : null,
        email:              values.email || null,
        primarySpecialty:   values.primarySpecialty,
        visiting:           values.visiting,
        visitingNote:       values.visiting ? (values.visitingNote || null) : null,
        status:             values.status,
        languages:          values.languages.map((l) => l.toLowerCase()),
        photoBase64,
        photoMime,
        photoFileName,
        photoAction:        photoRemoved && !photoFile ? "remove" : "keep",
      });

      if (!result.ok) {
        setSubmitError(result.error);
        return;
      }

      router.refresh();
      setOpen(false);
      setPhotoFile(null);
      setPhotoRemoved(false);
    });
  };

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) window.setTimeout(() => {
          reset(defaultValues);
          setSubmitError(null);
          setPhotoFile(null);
          setPhotoRemoved(false);
        }, 200);
      }}
    >
      <Dialog.Trigger asChild>{trigger}</Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-[rgba(16,24,40,0.55)]" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 flex max-h-[92vh] w-[calc(100%-1.5rem)] max-w-[640px] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-lg bg-white shadow-[0_24px_60px_-12px_rgba(16,24,40,0.30)] focus:outline-none">
          <div className="flex items-start justify-between gap-3 border-b border-border bg-white px-5 py-4">
            <div>
              <Dialog.Title className="text-[18px] font-semibold text-heading">Edit doctor</Dialog.Title>
              <Dialog.Description className="mt-0.5 text-[12px] text-muted">
                Update {doctor.name}&rsquo;s profile. Weekly schedule is managed from the Schedule tab.
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
              <Section label="Photo">
                <DoctorPhotoField
                  existingPhotoUrl={doctor.photoUrl}
                  initials={doctor.initials}
                  bg={doctor.avatarBg}
                  fg={doctor.avatarFg}
                  photoFile={photoFile}
                  onPhotoFileChange={setPhotoFile}
                  removed={photoRemoved}
                  onRemovedChange={setPhotoRemoved}
                />
              </Section>

              <Section label="Basics" required>
                <Field label="Full name" required error={errors.name?.message}>
                  <input {...register("name")} className={inputCls(!!errors.name)} />
                </Field>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Field label="Qualifications" required error={errors.qualifications?.message}>
                    <input {...register("qualifications")} className={inputCls(!!errors.qualifications)} />
                  </Field>
                  <Field label="Registration No." required error={errors.registrationNumber?.message}>
                    <input {...register("registrationNumber")} className={inputCls(!!errors.registrationNumber)} />
                  </Field>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Field label="Primary specialty">
                    <select {...register("primarySpecialty")} className={inputCls(false) + " cursor-pointer"}>
                      {SPECIALTIES.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </Field>
                  <Field label="Years of experience" error={errors.yearsExperience?.message}>
                    <input
                      type="number"
                      min={0}
                      max={80}
                      {...register("yearsExperience")}
                      className={inputCls(!!errors.yearsExperience)}
                    />
                  </Field>
                </div>

                <Field label="Trained at">
                  <input {...register("trainedAt")} className={inputCls(false)} />
                </Field>
              </Section>

              <Section label="Contact">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Field label="Phone" error={errors.phone?.message}>
                    <div className="flex gap-2">
                      <span className="inline-flex items-center gap-1.5 rounded-md border border-border bg-white px-3 text-[14px] text-heading">🇮🇳 +91</span>
                      <input
                        type="tel"
                        inputMode="numeric"
                        {...register("phone")}
                        className={inputCls(!!errors.phone)}
                      />
                    </div>
                  </Field>
                  <Field label="Email" error={errors.email?.message}>
                    <input type="email" {...register("email")} className={inputCls(!!errors.email)} />
                  </Field>
                </div>

                <Field label="Languages" required error={errors.languages?.message}>
                  <Controller
                    control={control}
                    name="languages"
                    render={({ field }) => (
                      <div className="flex flex-wrap gap-1.5">
                        {(["EN", "HI", "OR"] as Locale[]).map((l) => {
                          const active = field.value.includes(l);
                          return (
                            <button
                              key={l}
                              type="button"
                              onClick={() =>
                                field.onChange(
                                  active
                                    ? field.value.filter((v) => v !== l)
                                    : [...field.value, l],
                                )
                              }
                              className={
                                "rounded-pill px-3 py-1.5 text-[12px] font-medium transition-colors " +
                                (active
                                  ? "bg-brand text-white"
                                  : "border border-border bg-white text-heading hover:border-link-hover")
                              }
                            >
                              {l === "EN" ? "English" : l === "HI" ? "हिंदी" : "ଓଡ଼ିଆ"}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  />
                </Field>
              </Section>

              <Section label="Role">
                <Field label="Type">
                  <Controller
                    control={control}
                    name="visiting"
                    render={({ field }) => (
                      <div className="flex flex-wrap gap-1.5">
                        <button
                          type="button"
                          onClick={() => field.onChange(false)}
                          className={
                            "rounded-pill px-3 py-1.5 text-[12px] font-medium " +
                            (!field.value ? "bg-brand text-white" : "border border-border bg-white text-heading")
                          }
                        >
                          Everyday team
                        </button>
                        <button
                          type="button"
                          onClick={() => field.onChange(true)}
                          className={
                            "rounded-pill px-3 py-1.5 text-[12px] font-medium " +
                            (field.value ? "bg-brand text-white" : "border border-border bg-white text-heading")
                          }
                        >
                          Visiting consultant
                        </button>
                      </div>
                    )}
                  />
                </Field>

                {visiting && (
                  <Field label="Visiting note">
                    <input {...register("visitingNote")} className={inputCls(false)} />
                  </Field>
                )}

                <Field label="Status">
                  <Controller
                    control={control}
                    name="status"
                    render={({ field }) => (
                      <div className="flex flex-wrap gap-1.5">
                        {(["active", "on_leave", "inactive"] as DoctorStatus[]).map((s) => (
                          <button
                            key={s}
                            type="button"
                            onClick={() => field.onChange(s)}
                            className={
                              "rounded-pill px-3 py-1.5 text-[12px] font-medium capitalize " +
                              (field.value === s ? "bg-brand text-white" : "border border-border bg-white text-heading")
                            }
                          >
                            {s.replace("_", " ")}
                          </button>
                        ))}
                      </div>
                    )}
                  />
                </Field>
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
                    <i className="fas fa-save text-[12px]" />
                    Save changes
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
        <p role="alert" className="mt-1 text-[12px] text-danger">{error}</p>
      )}
    </div>
  );
}
