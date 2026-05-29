"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { addDoctorAction, type AddDoctorScheduleRow } from "@/app/(clinic-app)/admin/doctors/actions";
import { DoctorPhotoField, fileToDataUrl } from "@/components/molecules/DoctorPhotoField";
import type { Department } from "@/lib/data/departments";
import {
  SPECIALTIES,
  WEEKDAYS,
  WEEKDAY_LABEL,
  type DoctorStatus,
  type Locale,
  type Specialty,
  type Weekday,
  type WeeklySchedule,
} from "@/lib/doctors-data";

type Props = {
  trigger: React.ReactNode;
  departments?: Department[];
};

const DEFAULT_RANGE = { start: "09:00", end: "18:00" };

// Postgres weekday: 0=Sun, 1=Mon, ... 6=Sat. Our enum starts at Monday.
const WEEKDAY_TO_PG: Record<Weekday, number> = {
  mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6, sun: 0,
};

// =============================================================================
// Schema
// =============================================================================

const TIME = z.string().regex(/^\d{2}:\d{2}$/, "Use HH:mm");

const scheduleSchema = z
  .record(
    z.enum(WEEKDAYS as unknown as [Weekday, ...Weekday[]]),
    z.array(z.object({ start: TIME, end: TIME })),
  )
  .refine(
    (s) => Object.values(s).every((ranges) => (ranges ?? []).every((r) => r.end > r.start)),
    "End time must be after start time",
  );

const doctorFormSchema = z.object({
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
  departmentId:       z.string().uuid().optional().or(z.literal("")),
  primarySpecialty:   z.enum(SPECIALTIES as unknown as [Specialty, ...Specialty[]]),
  trainedAt:          z.string().trim().optional().default(""),
  phone:              z.string().refine(
    (v) => /^\d{10}$/.test(v.replace(/\D/g, "")),
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
  schedule:           scheduleSchema,
});

type DoctorFormValues = z.infer<typeof doctorFormSchema>;

const DEFAULT_VALUES: DoctorFormValues = {
  name:               "",
  qualifications:     "",
  registrationNumber: "",
  yearsExperience:    "",
  departmentId:       "",
  primarySpecialty:   "General Dentistry",
  trainedAt:          "",
  phone:              "",
  email:              "",
  languages:          ["EN"],
  visiting:           false,
  visitingNote:       "",
  status:             "active",
  schedule: {
    mon: [DEFAULT_RANGE], tue: [DEFAULT_RANGE], wed: [DEFAULT_RANGE],
    thu: [DEFAULT_RANGE], fri: [DEFAULT_RANGE], sat: [DEFAULT_RANGE],
  },
};

// =============================================================================
// Component
// =============================================================================

export function AddDoctorDialog({ trigger, departments = [] }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [open, setOpen] = useState(false);

  const form = useForm<DoctorFormValues>({
    resolver:      zodResolver(doctorFormSchema),
    defaultValues: DEFAULT_VALUES,
    mode:          "onBlur",
  });

  const {
    register,
    control,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isValid },
  } = form;

  const visiting = watch("visiting");

  const onSubmit = (values: DoctorFormValues) => {
    if (isPending) return;
    setSubmitError(null);

    const displayName    = values.name.startsWith("Dr") ? values.name : `Dr. ${values.name}`;
    const qualsArr       = values.qualifications.split(",").map((q) => q.trim()).filter(Boolean);
    const phoneDigits    = values.phone.replace(/\D/g, "");
    const yearsExp       = values.yearsExperience ? Number.parseInt(values.yearsExperience, 10) : null;
    const scheduleRows: AddDoctorScheduleRow[] = (Object.keys(values.schedule) as Weekday[]).flatMap(
      (day) => (values.schedule[day] ?? []).map((range) => ({
        weekday:    WEEKDAY_TO_PG[day],
        start_time: range.start,
        end_time:   range.end,
      })),
    );

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

      const result = await addDoctorAction({
        displayName,
        qualifications:     qualsArr,
        registrationNumber: values.registrationNumber,
        yearsExperience:    yearsExp,
        trainedAt:          values.trainedAt || null,
        phone:              phoneDigits ? `+91${phoneDigits}` : null,
        email:              values.email || null,
        primarySpecialty:   values.primarySpecialty,
        departmentId:       values.departmentId || null,
        visiting:           values.visiting,
        visitingNote:       values.visiting ? (values.visitingNote || null) : null,
        status:             values.status,
        languages:          values.languages.map((l) => l.toLowerCase()),
        schedule:           scheduleRows,
        photoBase64,
        photoMime,
        photoFileName,
      });

      if (!result.ok) {
        setSubmitError(result.error);
        return;
      }

      // Writes always go to the DB regardless of MOCK_DATA, so we just refresh
      // the route tree to pull the freshly-inserted row into the list.
      router.refresh();
      setPhotoFile(null);

      setOpen(false);
      window.setTimeout(() => { reset(DEFAULT_VALUES); setSubmitError(null); }, 200);
    });
  };

  return (
    <Dialog.Root open={open} onOpenChange={(v) => {
      setOpen(v);
      if (!v) window.setTimeout(() => { reset(DEFAULT_VALUES); setSubmitError(null); }, 200);
    }}>
      <Dialog.Trigger asChild>{trigger}</Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-[rgba(16,24,40,0.55)]" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 flex max-h-[92vh] w-[calc(100%-1.5rem)] max-w-[640px] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-lg bg-white shadow-[0_24px_60px_-12px_rgba(16,24,40,0.30)] focus:outline-none">
          <div className="flex items-start justify-between gap-3 border-b border-border bg-white px-5 py-4">
            <div>
              <Dialog.Title className="text-[18px] font-semibold text-heading">Add doctor</Dialog.Title>
              <Dialog.Description className="mt-0.5 text-[12px] text-muted">
                Onboard a new doctor to the team. They&rsquo;ll appear in the booking flow once active.
              </Dialog.Description>
            </div>
            <Dialog.Close
              aria-label="Close"
              className="grid h-8 w-8 cursor-pointer place-items-center rounded-pill bg-surface-muted text-muted hover:bg-border"
            >
              <i className="fas fa-times text-[12px]" />
            </Dialog.Close>
          </div>

          <form
            onSubmit={handleSubmit(onSubmit)}
            className="flex min-h-0 flex-1 flex-col"
            noValidate
          >
            <div className="flex-1 overflow-y-auto px-5 py-4 md:px-6">
              <Section label="Photo">
                <DoctorPhotoField
                  initials={initialsFromName(watch("name"))}
                  bg="#E6F1FA"
                  fg="#0E5087"
                  photoFile={photoFile}
                  onPhotoFileChange={setPhotoFile}
                  removed={false}
                  onRemovedChange={() => {}}
                />
              </Section>

              <Section label="Basics" required>
                <Field label="Full name" required error={errors.name?.message}>
                  <input
                    {...register("name")}
                    placeholder="Manoranjan Mahakur"
                    autoFocus
                    className={inputCls(!!errors.name)}
                  />
                  <p className="mt-1 text-[11px] text-[#9aa9b8]">We&rsquo;ll add the &ldquo;Dr.&rdquo; prefix automatically if missing.</p>
                </Field>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Field label="Qualifications" required error={errors.qualifications?.message}>
                    <input
                      {...register("qualifications")}
                      placeholder="MDS, MPH"
                      className={inputCls(!!errors.qualifications)}
                    />
                    <p className="mt-1 text-[11px] text-[#9aa9b8]">Comma-separated</p>
                  </Field>
                  <Field label="Registration No." required error={errors.registrationNumber?.message}>
                    <input
                      {...register("registrationNumber")}
                      placeholder="446/A"
                      className={inputCls(!!errors.registrationNumber)}
                    />
                  </Field>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Field label="Department" error={errors.departmentId?.message}>
                    <select
                      {...register("departmentId")}
                      className={inputCls(!!errors.departmentId) + " cursor-pointer"}
                      disabled={departments.length === 0}
                    >
                      <option value="">— Unassigned —</option>
                      {departments.map((d) => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                      ))}
                    </select>
                    {departments.length === 0 && (
                      <p className="mt-1 text-[11px] text-[#9aa9b8]">
                        No departments yet — add one in <a href="/admin/settings/departments" className="text-link-hover hover:underline">Settings → Departments</a>.
                      </p>
                    )}
                  </Field>
                  <Field label="Primary specialty">
                    <select
                      {...register("primarySpecialty")}
                      className={inputCls(false) + " cursor-pointer"}
                    >
                      {SPECIALTIES.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </Field>
                </div>
                <Field label="Years of experience" error={errors.yearsExperience?.message}>
                  <input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    max={80}
                    {...register("yearsExperience")}
                    placeholder="12"
                    className={inputCls(!!errors.yearsExperience)}
                  />
                </Field>

                <Field label="Trained at" error={errors.trainedAt?.message}>
                  <input
                    {...register("trainedAt")}
                    placeholder="BCB Dental College, Cuttack"
                    className={inputCls(!!errors.trainedAt)}
                  />
                </Field>
              </Section>

              <Section label="Contact">
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
                  <Field label="Email" error={errors.email?.message}>
                    <input
                      type="email"
                      {...register("email")}
                      placeholder="dr.name@clinic.in"
                      className={inputCls(!!errors.email)}
                    />
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
                              onClick={() => {
                                const next = active
                                  ? field.value.filter((v) => v !== l)
                                  : [...field.value, l];
                                field.onChange(next);
                              }}
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
                  <Field label="Visiting note" error={errors.visitingNote?.message}>
                    <input
                      {...register("visitingNote")}
                      placeholder="Last Saturday each month · 9:00 AM – 2:00 PM"
                      className={inputCls(!!errors.visitingNote)}
                    />
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

              <Section label="Weekly hours">
                <p className="-mt-1 mb-2 text-[11px] text-[#9aa9b8]">
                  Tap a day to toggle. Set start &amp; end times for active days. Fine-tune later from the Schedule tab.
                </p>
                <Controller
                  control={control}
                  name="schedule"
                  render={({ field }) => (
                    <div className="space-y-1.5">
                      {WEEKDAYS.map((d) => {
                        const ranges = (field.value as WeeklySchedule)[d];
                        const range  = ranges?.[0];
                        const active = Boolean(range);
                        return (
                          <div key={d} className="flex items-center gap-2 rounded-md border border-border bg-white p-2">
                            <button
                              type="button"
                              onClick={() => {
                                const next = { ...(field.value as WeeklySchedule) };
                                if (active) delete next[d];
                                else next[d] = [DEFAULT_RANGE];
                                field.onChange(next);
                              }}
                              className={
                                "w-14 cursor-pointer rounded-md px-2 py-1.5 text-[12px] font-semibold uppercase tracking-[0.06em] " +
                                (active ? "bg-brand text-white" : "bg-surface-muted text-muted")
                              }
                            >
                              {WEEKDAY_LABEL[d]}
                            </button>
                            {active && range ? (
                              <>
                                <input
                                  type="time"
                                  value={range.start}
                                  onChange={(e) => {
                                    const next = { ...(field.value as WeeklySchedule) };
                                    next[d] = [{ start: e.target.value, end: range.end }];
                                    field.onChange(next);
                                  }}
                                  className="rounded-sm border border-border bg-white px-2 py-1 text-[12px] text-heading outline-none focus:border-link-hover"
                                />
                                <span className="text-[12px] text-muted">to</span>
                                <input
                                  type="time"
                                  value={range.end}
                                  onChange={(e) => {
                                    const next = { ...(field.value as WeeklySchedule) };
                                    next[d] = [{ start: range.start, end: e.target.value }];
                                    field.onChange(next);
                                  }}
                                  className="rounded-sm border border-border bg-white px-2 py-1 text-[12px] text-heading outline-none focus:border-link-hover"
                                />
                              </>
                            ) : (
                              <span className="text-[12px] italic text-[#9aa9b8]">Off</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                />
                {errors.schedule?.message && (
                  <p className="mt-1 text-[12px] text-danger">{errors.schedule.message}</p>
                )}
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
                  <i className="fas fa-exclamation-triangle mr-1" />
                  {submitError}
                </span>
              )}
              <div className="ml-auto flex items-center gap-3">
                {!isValid && !isPending && (
                  <span className="hidden text-[12px] text-[#9aa9b8] sm:inline">
                    <i className="fas fa-info-circle mr-1" />
                    Fix the highlighted fields to submit
                  </span>
                )}
                <button
                  type="submit"
                  disabled={isPending}
                  className={
                    "inline-flex cursor-pointer items-center gap-2 rounded-md bg-cta px-5 py-2 text-[14px] font-semibold text-cta-fg transition-colors hover:bg-[#d92843] " +
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
                      <i className="fas fa-user-md text-[12px]" />
                      Add doctor
                    </>
                  )}
                </button>
              </div>
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

function initialsFromName(name: string): string {
  const cleaned = name.replace(/^Dr\.?\s+/i, "").trim();
  if (!cleaned) return "DR";
  return cleaned
    .split(/\s+/)
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
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
