"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { blockDoctorDatesAction } from "@/app/(clinic-app)/[clinicSlug]/admin/doctors/actions";

type Props = {
  trigger?:    React.ReactNode;
  doctorId:    string;
  doctorName:  string;
  /** Optional controlled-mode — open state owned by the parent. */
  open?:         boolean;
  onOpenChange?: (open: boolean) => void;
};

// =============================================================================
// Schema
// =============================================================================

const todayIso = () => new Date().toISOString().slice(0, 10);

const blockSchema = z
  .object({
    dates:     z.array(z.string().regex(/^\d{4}-\d{2}-\d{2}$/))
                 .min(1, "Pick at least one date"),
    wholeDay:  z.boolean(),
    startTime: z.string(),
    endTime:   z.string(),
    reason:    z.string(),
  })
  .superRefine((v, ctx) => {
    if (!v.wholeDay) {
      if (!/^\d{2}:\d{2}$/.test(v.startTime)) {
        ctx.addIssue({ code: "custom", message: "Enter a start time (HH:mm)", path: ["startTime"] });
      }
      if (!/^\d{2}:\d{2}$/.test(v.endTime)) {
        ctx.addIssue({ code: "custom", message: "Enter an end time (HH:mm)", path: ["endTime"] });
      }
      if (v.startTime && v.endTime && v.endTime <= v.startTime) {
        ctx.addIssue({ code: "custom", message: "End time must be after start time", path: ["endTime"] });
      }
    }
  });

type BlockFormValues = z.infer<typeof blockSchema>;

const DEFAULT_VALUES: BlockFormValues = {
  dates:     [todayIso()],
  wholeDay:  true,
  startTime: "09:00",
  endTime:   "18:00",
  reason:    "",
};

// =============================================================================
// Component
// =============================================================================

export function BlockDatesDialog({
  trigger,
  doctorId,
  doctorName,
  open: controlledOpen,
  onOpenChange,
}: Props) {
  const router = useRouter();
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const open = controlledOpen ?? uncontrolledOpen;
  const setOpen = (next: boolean) => {
    if (controlledOpen === undefined) setUncontrolledOpen(next);
    onOpenChange?.(next);
  };
  const [isPending, startTransition] = useTransition();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const {
    register,
    control,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<BlockFormValues>({
    resolver:      zodResolver(blockSchema),
    defaultValues: DEFAULT_VALUES,
    mode:          "onBlur",
  });

  const wholeDay = watch("wholeDay");

  const onSubmit = (values: BlockFormValues) => {
    if (isPending) return;
    setSubmitError(null);
    setSuccessMsg(null);

    startTransition(async () => {
      const result = await blockDoctorDatesAction({
        doctorId,
        dates:     values.dates,
        startTime: values.wholeDay ? undefined : values.startTime,
        endTime:   values.wholeDay ? undefined : values.endTime,
        reason:    values.reason.trim() || undefined,
      });

      if (!result.ok) {
        setSubmitError(result.error);
        return;
      }

      setSuccessMsg(
        `Blocked ${result.inserted} ${result.inserted === 1 ? "day" : "days"} for ${doctorName}.`,
      );
      router.refresh();
      window.setTimeout(() => {
        setOpen(false);
        reset(DEFAULT_VALUES);
        setSuccessMsg(null);
      }, 900);
    });
  };

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) window.setTimeout(() => {
          reset(DEFAULT_VALUES);
          setSubmitError(null);
          setSuccessMsg(null);
        }, 200);
      }}
    >
      {trigger && <Dialog.Trigger asChild>{trigger}</Dialog.Trigger>}
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-[rgba(16,24,40,0.55)]" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 flex max-h-[92vh] w-[calc(100%-1.5rem)] max-w-[520px] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-lg bg-white shadow-[0_24px_60px_-12px_rgba(16,24,40,0.30)] focus:outline-none">
          <div className="flex items-start justify-between gap-3 border-b border-border bg-white px-5 py-4">
            <div>
              <Dialog.Title className="text-[18px] font-semibold text-heading">Block dates</Dialog.Title>
              <Dialog.Description className="mt-0.5 text-[12px] text-muted">
                Mark days {doctorName} is off so the booking flow hides those slots.
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
              <Section label="Dates" required>
                <Controller
                  control={control}
                  name="dates"
                  render={({ field }) => <DateMultiPicker value={field.value} onChange={field.onChange} />}
                />
                {errors.dates && (
                  <p role="alert" className="mt-1 text-[12px] text-danger">{errors.dates.message}</p>
                )}
              </Section>

              <Section label="Window">
                <Controller
                  control={control}
                  name="wholeDay"
                  render={({ field }) => (
                    <div className="flex flex-wrap gap-1.5">
                      <button
                        type="button"
                        onClick={() => field.onChange(true)}
                        className={
                          "rounded-pill px-3 py-1.5 text-[12px] font-medium " +
                          (field.value ? "bg-brand text-white" : "border border-border bg-white text-heading")
                        }
                      >
                        Full day
                      </button>
                      <button
                        type="button"
                        onClick={() => field.onChange(false)}
                        className={
                          "rounded-pill px-3 py-1.5 text-[12px] font-medium " +
                          (!field.value ? "bg-brand text-white" : "border border-border bg-white text-heading")
                        }
                      >
                        Time range
                      </button>
                    </div>
                  )}
                />

                {!wholeDay && (
                  <div className="mt-3 flex flex-wrap items-center gap-2 rounded-md border border-border bg-white p-2">
                    <input
                      type="time"
                      {...register("startTime")}
                      className="rounded-sm border border-border bg-white px-2 py-1 text-[12px] text-heading outline-none focus:border-link-hover"
                    />
                    <span className="text-[12px] text-muted">to</span>
                    <input
                      type="time"
                      {...register("endTime")}
                      className="rounded-sm border border-border bg-white px-2 py-1 text-[12px] text-heading outline-none focus:border-link-hover"
                    />
                    {(errors.startTime || errors.endTime) && (
                      <p role="alert" className="w-full text-[12px] text-danger">
                        {errors.startTime?.message ?? errors.endTime?.message}
                      </p>
                    )}
                  </div>
                )}
              </Section>

              <Section label="Reason (optional)">
                <input
                  {...register("reason")}
                  placeholder="e.g. CME workshop · personal leave · public holiday"
                  className="w-full rounded-md border border-border bg-white px-3 py-2.5 text-[14px] text-heading outline-none focus:border-link-hover"
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
              {successMsg && (
                <span role="status" className="order-last w-full text-[12px] text-[#1f5e3a] sm:order-none sm:w-auto">
                  <i className="fas fa-check-circle mr-1" /> {successMsg}
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
                    Blocking…
                  </>
                ) : (
                  <>
                    <i className="fas fa-calendar-times text-[12px]" />
                    Block dates
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
// Date picker — pick a single date, then "+ Add another" for multiple.
// =============================================================================

function DateMultiPicker({
  value,
  onChange,
}: {
  value:    string[];
  onChange: (v: string[]) => void;
}) {
  const setAt = (idx: number, iso: string) => {
    const next = [...value];
    next[idx] = iso;
    onChange(next);
  };
  const removeAt = (idx: number) => onChange(value.filter((_, i) => i !== idx));
  const addAnother = () => onChange([...value, todayIso()]);

  return (
    <div className="space-y-1.5">
      {value.map((iso, idx) => (
        <div key={idx} className="flex items-center gap-2">
          <input
            type="date"
            value={iso}
            min={todayIso()}
            onChange={(e) => setAt(idx, e.target.value)}
            className="w-full rounded-md border border-border bg-white px-3 py-2 text-[14px] text-heading outline-none focus:border-link-hover"
          />
          {value.length > 1 && (
            <button
              type="button"
              onClick={() => removeAt(idx)}
              aria-label="Remove date"
              className="grid h-9 w-9 flex-none cursor-pointer place-items-center rounded-md border border-border bg-white text-muted hover:border-danger hover:text-danger"
            >
              <i className="fas fa-times text-[12px]" />
            </button>
          )}
        </div>
      ))}
      <button
        type="button"
        onClick={addAnother}
        className="inline-flex items-center gap-1.5 rounded-md border border-dashed border-border bg-white px-3 py-1.5 text-[12px] text-link-hover hover:border-link-hover"
      >
        <i className="fas fa-plus text-[10px]" /> Add another date
      </button>
    </div>
  );
}

// =============================================================================
// Small bits
// =============================================================================

function Section({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="mb-5 last:mb-0">
      <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.06em] text-[#9aa9b8]">
        {label}
        {required && <span className="ml-1 text-cta">*</span>}
      </div>
      <div>{children}</div>
    </div>
  );
}
