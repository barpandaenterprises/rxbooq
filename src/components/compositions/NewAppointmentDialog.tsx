"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { formatLongDate, formatSlotLabel, toLocalIso } from "@/lib/booking-data";
import {
  createAppointmentAction,
  getDeptSlotsForDateAction,
  getDoctorSlotsForDateAction,
  getDoctorWorkingDatesAction,
  getDoctorsForSlotAction,
} from "@/app/(clinic-app)/[clinicSlug]/admin/appointments/actions";
import {
  slotsInWindows,
  subtractBooked,
  type WorkingWindow,
} from "@/lib/data/booking-availability";
import type { BookingLookups } from "@/lib/data/booking-lookups";

// =============================================================================
// Form schema
// =============================================================================

const apptFormSchema = z
  .object({
    selectedPatientId: z.string().nullable(),
    phone:             z.string(),
    name:              z.string(),
    mode:              z.enum(["byDept", "byDoctor"]),
    departmentId:      z.string().nullable(),
    doctorId:          z.string().nullable(),
    dateIso:           z.string().min(1),
    slot:              z.string().nullable(),
    sendWhatsApp:      z.boolean(),
    notes:             z.string(),
  })
  .superRefine((v, ctx) => {
    if (!v.selectedPatientId) {
      const digits = v.phone.replace(/\D/g, "");
      if (digits.length !== 10) {
        ctx.addIssue({ code: "custom", message: "Enter a 10-digit phone number", path: ["phone"] });
      }
      if (v.name.trim().length < 2) {
        ctx.addIssue({ code: "custom", message: "Enter the patient's name", path: ["name"] });
      }
    }
    if (v.mode === "byDept" && !v.departmentId) {
      ctx.addIssue({ code: "custom", message: "Pick a department", path: ["departmentId"] });
    }
    if (!v.doctorId) {
      ctx.addIssue({ code: "custom", message: "Pick a doctor", path: ["doctorId"] });
    }
    if (!v.slot) {
      ctx.addIssue({ code: "custom", message: "Pick a time slot", path: ["slot"] });
    }
  });

type ApptFormValues = z.infer<typeof apptFormSchema>;

// =============================================================================
// Date row (30 days)
// =============================================================================

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] as const;

const DATE_RANGE_DAYS = 30;

type DateCell = { iso: string; day: number; month: string; weekday: string; isToday: boolean };

function buildDates(count: number): DateCell[] {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  return Array.from({ length: count }).map((_, i): DateCell => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return {
      iso:      toLocalIso(d),
      day:      d.getDate(),
      month:    MONTH_LABELS[d.getMonth()]!,
      weekday:  DAY_LABELS[d.getDay()]!,
      isToday:  i === 0,
    };
  });
}

function digitsOnly(s: string): string { return s.replace(/\D/g, ""); }

function fmtSlot(short: string): string {
  // "10:30" → "10:30 AM"
  const [hStr, mStr] = short.split(":");
  const h = Number(hStr ?? 0);
  const m = Number(mStr ?? 0);
  const ampm = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, "0")} ${ampm}`;
}

// =============================================================================
// Component
// =============================================================================

type Props = {
  trigger: React.ReactNode;
  lookups: BookingLookups;
};

export function NewAppointmentDialog({ trigger, lookups }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  // Slot picker state — populated from server actions, varies per mode.
  const [workingWindows, setWorkingWindows] = useState<WorkingWindow[]>([]);
  const [bookedSlots,    setBookedSlots]    = useState<Set<string>>(new Set());
  const [deptFreeSlots,  setDeptFreeSlots]  = useState<Set<string>>(new Set());
  const [slotsLoading,   setSlotsLoading]   = useState(false);

  // Doctor dropdown state — for By-Dept flow, populated after slot pick.
  type SlotDoctor = { id: string; displayName: string; qualifications: string | null };
  const [slotDoctors, setSlotDoctors] = useState<SlotDoctor[]>([]);
  const [doctorsLoading, setDoctorsLoading] = useState(false);

  // Working-dates set for By-Doctor flow — greys out non-working dates.
  const [workingDates, setWorkingDates] = useState<Set<string> | null>(null);

  const departments = lookups.departments;
  const doctors     = lookups.doctors;

  const dates = useMemo(() => buildDates(DATE_RANGE_DAYS), []);
  const firstIso = dates[0]!.iso;

  const defaultValues: ApptFormValues = useMemo(() => ({
    selectedPatientId: null,
    phone:             "",
    name:              "",
    mode:              "byDoctor",
    departmentId:      null,
    doctorId:          doctors[0]?.id ?? null,
    dateIso:           firstIso,
    slot:              null,
    sendWhatsApp:      true,
    notes:             "",
  }), [doctors, firstIso]);

  const {
    register,
    watch,
    setValue,
    handleSubmit,
    reset: resetForm,
    formState: { errors },
  } = useForm<ApptFormValues>({
    resolver:      zodResolver(apptFormSchema),
    defaultValues,
    mode:          "onSubmit",
  });

  const phone             = watch("phone");
  const name              = watch("name");
  const selectedPatientId = watch("selectedPatientId");
  const mode              = watch("mode");
  const departmentId      = watch("departmentId");
  const doctorId          = watch("doctorId");
  const dateIso           = watch("dateIso");
  const slot              = watch("slot");
  const sendWhatsApp      = watch("sendWhatsApp");

  const phoneDigits = digitsOnly(phone);
  const selected = useMemo(
    () => (selectedPatientId
      ? { id: selectedPatientId, name: name || "Patient", phone, initials: name.slice(0, 2).toUpperCase() }
      : null),
    [selectedPatientId, name, phone],
  );
  const isExistingPatient = selected !== null;
  const isNewPatientReady = !isExistingPatient && phoneDigits.length === 10 && name.trim().length >= 2;
  const patientReady = isExistingPatient || isNewPatientReady;

  // -----------------------------------------------------------------------
  // Effects: load slot/doctor data as user picks options.
  // -----------------------------------------------------------------------

  // By-Doctor: working dates → grey out non-working days.
  useEffect(() => {
    if (!open || mode !== "byDoctor" || !doctorId) { setWorkingDates(null); return; }
    let cancelled = false;
    getDoctorWorkingDatesAction({ doctorId, fromIso: firstIso, days: DATE_RANGE_DAYS })
      .then((r) => { if (!cancelled && r.ok) setWorkingDates(new Set(r.workingDates)); });
    return () => { cancelled = true; };
  }, [open, mode, doctorId, firstIso]);

  // By-Doctor: slots for the chosen doctor+date.
  useEffect(() => {
    if (!open || mode !== "byDoctor" || !doctorId || !dateIso) return;
    let cancelled = false;
    setSlotsLoading(true);
    getDoctorSlotsForDateAction({ doctorId, dateIso })
      .then((r) => {
        if (cancelled) return;
        if (r.ok) {
          setWorkingWindows(r.workingWindows);
          setBookedSlots(new Set(r.bookedSlots));
        } else {
          setWorkingWindows([]);
          setBookedSlots(new Set());
        }
      })
      .finally(() => { if (!cancelled) setSlotsLoading(false); });
    return () => { cancelled = true; };
  }, [open, mode, doctorId, dateIso]);

  // By-Dept: free slots (union across all dept doctors) for the chosen dept+date.
  useEffect(() => {
    if (!open || mode !== "byDept" || !departmentId || !dateIso) { setDeptFreeSlots(new Set()); return; }
    let cancelled = false;
    setSlotsLoading(true);
    getDeptSlotsForDateAction({ departmentId, dateIso })
      .then((r) => {
        if (cancelled) return;
        if (r.ok) setDeptFreeSlots(new Set(r.freeSlots));
        else      setDeptFreeSlots(new Set());
      })
      .finally(() => { if (!cancelled) setSlotsLoading(false); });
    return () => { cancelled = true; };
  }, [open, mode, departmentId, dateIso]);

  // By-Dept: doctors free at the picked slot.
  useEffect(() => {
    if (!open || mode !== "byDept" || !departmentId || !dateIso || !slot) {
      setSlotDoctors([]);
      return;
    }
    let cancelled = false;
    setDoctorsLoading(true);
    getDoctorsForSlotAction({ departmentId, dateIso, slot })
      .then((r) => {
        if (cancelled) return;
        if (r.ok) setSlotDoctors(r.doctors);
        else      setSlotDoctors([]);
      })
      .finally(() => { if (!cancelled) setDoctorsLoading(false); });
    return () => { cancelled = true; };
  }, [open, mode, departmentId, dateIso, slot]);

  // Reset slot + doctor when mode changes.
  useEffect(() => {
    setValue("slot", null,  { shouldValidate: false });
    setValue("doctorId", mode === "byDoctor" ? (doctors[0]?.id ?? null) : null, { shouldValidate: false });
    setValue("departmentId", null, { shouldValidate: false });
    setSlotDoctors([]);
    setWorkingWindows([]);
    setBookedSlots(new Set());
    setDeptFreeSlots(new Set());
    setWorkingDates(null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  // -----------------------------------------------------------------------
  // Submit
  // -----------------------------------------------------------------------

  const reset = () => {
    resetForm(defaultValues);
    setConfirmed(false);
    setSubmitError(null);
    setSlotDoctors([]);
    setWorkingWindows([]);
    setBookedSlots(new Set());
    setDeptFreeSlots(new Set());
    setWorkingDates(null);
  };

  const onSubmit = (values: ApptFormValues) => {
    if (isPending) return;
    setSubmitError(null);

    const startsAtIso = `${values.dateIso}T${values.slot ?? "00:00"}:00+05:30`;
    const e164        = `+91${digitsOnly(values.phone)}`;
    // Pass the slot length so the server can compute ends_at without a service.
    // By-Doctor flow: read from the working window covering this slot.
    // By-Dept flow: no precise window known here; let the server default (30).
    const slotMinutes =
      mode === "byDoctor"
        ? workingWindows.find((w) => values.slot && w.start <= values.slot && values.slot < w.end)?.slotMinutes
        : undefined;

    startTransition(async () => {
      const result = await createAppointmentAction({
        ...(values.selectedPatientId
          ? { patientId: values.selectedPatientId }
          : { patient: { fullName: values.name.trim(), phoneE164: e164, language: "en" } }),
        doctorId:        values.doctorId!,
        departmentId:    values.departmentId ?? undefined,
        startsAt:        startsAtIso,
        durationMinutes: slotMinutes,
        notes:           values.notes.trim() || undefined,
        sendWhatsApp:    values.sendWhatsApp,
      });

      if (!result.ok) {
        setSubmitError(result.error);
        return;
      }

      router.refresh();
      setConfirmed(true);
    });
  };

  // -----------------------------------------------------------------------
  // Derived display data
  // -----------------------------------------------------------------------

  const doctor = mode === "byDept"
    ? slotDoctors.find((d) => d.id === doctorId)
    : doctors.find((d) => d.id === doctorId);
  const doctorName = doctor
    ? ("name" in doctor ? doctor.name : doctor.displayName)
    : "—";
  const patientName = selected ? selected.name : name.trim() || "this patient";
  const department  = departments.find((d) => d.id === departmentId);

  // Slot grid candidates:
  //   By-Doctor: every slot inside workingWindows, with bookedSlots greyed.
  //   By-Dept:   the freeSlots set from server.
  const slotCandidates = useMemo(() => {
    if (mode === "byDoctor") {
      return slotsInWindows(workingWindows);
    }
    return Array.from(deptFreeSlots).sort();
  }, [mode, workingWindows, deptFreeSlots]);

  const availableSlots = useMemo(() => {
    if (mode === "byDoctor") return subtractBooked(slotCandidates, bookedSlots);
    return slotCandidates;
  }, [mode, slotCandidates, bookedSlots]);

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) window.setTimeout(reset, 200);
      }}
    >
      <Dialog.Trigger asChild>{trigger}</Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-[rgba(16,24,40,0.55)] data-[state=open]:animate-in data-[state=open]:fade-in" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 flex max-h-[92vh] w-[calc(100%-1.5rem)] max-w-[680px] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-lg bg-white shadow-[0_24px_60px_-12px_rgba(16,24,40,0.30)] focus:outline-none">
          {confirmed ? (
            <ConfirmedView
              patientName={patientName}
              dateIso={dateIso}
              slotShort={slot!}
              doctorName={doctorName}
              sendWhatsApp={sendWhatsApp}
              onClose={() => setOpen(false)}
              onAnother={() => {
                setConfirmed(false);
                setValue("slot",  null, { shouldValidate: false });
                setValue("notes", "",   { shouldValidate: false });
              }}
            />
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="flex min-h-0 flex-1 flex-col" noValidate>
              {/* Header */}
              <div className="flex items-start justify-between gap-3 border-b border-border bg-white px-5 py-4">
                <div>
                  <Dialog.Title className="text-[18px] font-semibold text-heading">New appointment</Dialog.Title>
                  <Dialog.Description className="mt-0.5 text-[12px] text-muted">
                    Booking on behalf of a patient who called or walked in.
                  </Dialog.Description>
                </div>
                <Dialog.Close
                  aria-label="Close"
                  className="grid h-8 w-8 cursor-pointer place-items-center rounded-pill bg-surface-muted text-muted hover:bg-border"
                >
                  <i className="fas fa-times text-[12px]" />
                </Dialog.Close>
              </div>

              {/* Body */}
              <div className="flex-1 overflow-y-auto px-5 py-4 md:px-6">
                {/* Patient */}
                <Section label="Patient" required>
                  {isExistingPatient ? (
                    <div className="flex items-center gap-3 rounded-md border border-[#3a8b5e] bg-[#E6F4EC] px-3 py-2.5">
                      <div className="min-w-0 flex-1">
                        <div className="text-[14px] font-semibold text-heading">{selected!.name}</div>
                        <div className="text-[12px] text-muted">+91 {selected!.phone}</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setValue("selectedPatientId", null, { shouldValidate: false });
                          setValue("phone", "",               { shouldValidate: false });
                          setValue("name",  "",               { shouldValidate: false });
                        }}
                        className="rounded-md border border-border bg-white px-2.5 py-1 text-[12px] text-muted hover:text-heading"
                      >
                        Change
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="flex gap-2">
                        <span className="inline-flex items-center gap-1.5 rounded-md border border-border bg-white px-3 text-[14px] text-heading">
                          🇮🇳 +91
                        </span>
                        <input
                          type="tel"
                          inputMode="numeric"
                          autoFocus
                          {...register("phone")}
                          placeholder="Type or paste caller number"
                          className="w-full rounded-md border border-border bg-white px-3 py-2.5 text-[14px] text-heading outline-none focus:border-link-hover"
                        />
                      </div>

                      {phoneDigits.length >= 2 && (
                        <div className="mt-2 rounded-md border border-dashed border-[#cdd9e4] bg-surface-muted p-3">
                          <div className="text-[12px] text-muted">
                            <i className="fas fa-user-plus mr-1.5 text-link-hover" />
                            New patient — enter their name:
                          </div>
                          <input
                            type="text"
                            {...register("name")}
                            placeholder="Patient name (as on records)"
                            className="mt-2 w-full rounded-md border border-border bg-white px-3 py-2 text-[14px] text-heading outline-none focus:border-link-hover"
                          />
                          {errors.name?.message && (
                            <div className="mt-1 text-[11px] text-danger">
                              <i className="fas fa-exclamation-circle mr-1" /> {errors.name.message}
                            </div>
                          )}
                          {phoneDigits.length > 0 && phoneDigits.length < 10 && (
                            <div className="mt-1.5 text-[11px] text-cta">
                              <i className="fas fa-exclamation-circle mr-1" />
                              Enter all 10 digits ({phoneDigits.length} so far).
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </Section>

                {/* Mode toggle */}
                <Section label="Book by">
                  <div className="inline-flex rounded-md border border-border bg-white p-0.5">
                    {(["byDoctor", "byDept"] as const).map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setValue("mode", m, { shouldValidate: false })}
                        className={
                          "rounded-sm px-3 py-1.5 text-[12px] font-medium transition-colors " +
                          (mode === m
                            ? "bg-brand text-white"
                            : "text-muted hover:text-heading")
                        }
                      >
                        <i className={`fas ${m === "byDoctor" ? "fa-user-md" : "fa-sitemap"} mr-1.5 text-[11px]`} />
                        {m === "byDoctor" ? "By doctor" : "By department"}
                      </button>
                    ))}
                  </div>
                </Section>

                {/* Department or Doctor first */}
                {mode === "byDept" ? (
                  <Section label="Department" required>
                    <select
                      value={departmentId ?? ""}
                      onChange={(e) => {
                        setValue("departmentId", e.target.value || null, { shouldValidate: false });
                        setValue("slot",        null,                    { shouldValidate: false });
                        setValue("doctorId",    null,                    { shouldValidate: false });
                      }}
                      className="w-full rounded-md border border-border bg-white px-3 py-2.5 text-[14px] text-heading outline-none focus:border-link-hover"
                    >
                      <option value="">— Pick a department —</option>
                      {departments.map((d) => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                      ))}
                    </select>
                    {errors.departmentId?.message && (
                      <p className="mt-1 text-[11px] text-danger">{errors.departmentId.message}</p>
                    )}
                  </Section>
                ) : (
                  <Section label="Doctor" required>
                    <select
                      value={doctorId ?? ""}
                      onChange={(e) => {
                        setValue("doctorId", e.target.value || null, { shouldValidate: false });
                        setValue("slot",     null,                   { shouldValidate: false });
                      }}
                      className="w-full rounded-md border border-border bg-white px-3 py-2.5 text-[14px] text-heading outline-none focus:border-link-hover"
                    >
                      <option value="">— Pick a doctor —</option>
                      {doctors.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name}{d.credential ? ` — ${d.credential}` : ""}
                        </option>
                      ))}
                    </select>
                    {errors.doctorId?.message && (
                      <p className="mt-1 text-[11px] text-danger">{errors.doctorId.message}</p>
                    )}
                  </Section>
                )}

                {/* When — 30-day date row */}
                <Section label="When" required>
                  <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
                    {dates.map((d) => {
                      const sel = d.iso === dateIso;
                      // By-Doctor: grey out days the doctor isn't working.
                      // By-Dept (or before doctor pick): everything clickable.
                      const isOff = mode === "byDoctor" && workingDates !== null && !workingDates.has(d.iso);
                      return (
                        <button
                          key={d.iso}
                          type="button"
                          disabled={isOff}
                          onClick={() => {
                            setValue("dateIso", d.iso, { shouldValidate: false });
                            setValue("slot",    null,  { shouldValidate: false });
                          }}
                          className={
                            "relative flex w-[60px] flex-none flex-col items-center rounded-md border-[1.5px] py-1.5 transition-colors " +
                            (isOff
                              ? "cursor-not-allowed border-border bg-white text-[#cdd9e4]"
                              : sel
                                ? "border-cta bg-cta text-white"
                                : "border-border bg-white text-heading hover:border-link-hover")
                          }
                        >
                          <span className="text-[10px] font-medium uppercase tracking-[0.06em]">{d.weekday}</span>
                          <span className="text-[18px] font-semibold leading-5">{d.day}</span>
                          <span className="text-[9px] opacity-70">{d.month}</span>
                          {d.isToday && !sel && (
                            <span className="absolute -right-1 -top-1.5 rounded-pill bg-brand px-1 py-px text-[8px] font-semibold text-white">
                              TODAY
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* Slot grid */}
                  {slotsLoading && (
                    <p className="mt-3 text-[11px] text-[#9aa9b8]">
                      <i className="fas fa-spinner fa-spin mr-1.5" />
                      Loading available slots…
                    </p>
                  )}
                  {!slotsLoading && slotCandidates.length === 0 && (
                    <p className="mt-3 rounded-md border border-dashed border-border bg-surface-muted px-3 py-4 text-center text-[12px] text-muted">
                      {mode === "byDept" && !departmentId
                        ? "Pick a department to see available slots."
                        : mode === "byDoctor" && !doctorId
                        ? "Pick a doctor to see available slots."
                        : "No working slots on this day."}
                    </p>
                  )}
                  {!slotsLoading && slotCandidates.length > 0 && (
                    <div className="mt-3 grid grid-cols-4 gap-1.5 sm:grid-cols-5">
                      {slotCandidates.map((s) => {
                        const isBooked = mode === "byDoctor" && bookedSlots.has(s);
                        const isUsable = !isBooked && (mode === "byDept" ? deptFreeSlots.has(s) : true);
                        const isSel = s === slot;
                        return (
                          <button
                            key={s}
                            type="button"
                            disabled={!isUsable}
                            onClick={() => {
                              setValue("slot", s, { shouldValidate: true });
                              if (mode === "byDept") {
                                setValue("doctorId", null, { shouldValidate: false });
                              }
                            }}
                            className={
                              "rounded-md border-[1.5px] py-1.5 text-[12px] font-medium transition-colors " +
                              (!isUsable
                                ? "cursor-not-allowed border-border bg-[#F4F5F7] text-[#9aa9b8] line-through"
                                : isSel
                                  ? "border-cta bg-cta text-white shadow-sm"
                                  : "border-border bg-white text-heading hover:border-link-hover")
                            }
                          >
                            {fmtSlot(s)}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </Section>

                {/* By-Dept: doctor dropdown appears after slot pick */}
                {mode === "byDept" && slot && (
                  <Section label="Doctor" required>
                    {doctorsLoading ? (
                      <div className="text-[12px] text-muted">
                        <i className="fas fa-spinner fa-spin mr-1.5" /> Finding available doctors…
                      </div>
                    ) : slotDoctors.length === 0 ? (
                      <div className="rounded-md border border-dashed border-border bg-surface-muted px-3 py-3 text-[12px] text-muted">
                        No doctor in {department?.name ?? "this department"} is free at {fmtSlot(slot)}. Pick a different slot.
                      </div>
                    ) : (
                      <select
                        value={doctorId ?? ""}
                        onChange={(e) => setValue("doctorId", e.target.value || null, { shouldValidate: false })}
                        className="w-full rounded-md border border-border bg-white px-3 py-2.5 text-[14px] text-heading outline-none focus:border-link-hover"
                      >
                        <option value="">— Pick a doctor —</option>
                        {slotDoctors.map((d) => (
                          <option key={d.id} value={d.id}>
                            {d.displayName}{d.qualifications ? ` — ${d.qualifications}` : ""}
                          </option>
                        ))}
                      </select>
                    )}
                    {errors.doctorId?.message && (
                      <p className="mt-1 text-[11px] text-danger">{errors.doctorId.message}</p>
                    )}
                  </Section>
                )}

                {/* Notify */}
                <Section label="Notify patient">
                  <label className="flex cursor-pointer items-start gap-2.5 rounded-md border border-border bg-white p-3">
                    <input
                      type="checkbox"
                      {...register("sendWhatsApp")}
                      className="mt-0.5 h-4 w-4 cursor-pointer accent-[#25D366]"
                    />
                    <span className="text-[13px] leading-5 text-heading">
                      <strong className="font-semibold">Send WhatsApp confirmation</strong>{" "}
                      <span className="text-muted">
                        — booking_confirmation_v1 template with the slot, doctor and clinic address.
                      </span>
                    </span>
                  </label>
                </Section>

                {/* Notes */}
                <Section label="Note for the doctor (optional)">
                  <textarea
                    {...register("notes")}
                    rows={2}
                    placeholder="e.g. Patient is anxious about RCT — handle gently."
                    className="w-full resize-y rounded-md border border-border bg-white px-3 py-2 text-[13px] text-heading outline-none focus:border-link-hover"
                  />
                </Section>
              </div>

              {/* Footer */}
              <div className="flex items-center gap-2.5 border-t border-border bg-surface-muted px-5 py-3.5">
                <Dialog.Close className="cursor-pointer rounded-md border border-border bg-white px-4 py-2 text-[13px] font-medium text-muted">
                  Cancel
                </Dialog.Close>
                <div className="ml-auto flex items-center gap-3">
                  {!patientReady && (
                    <span className="hidden text-[12px] text-[#9aa9b8] sm:inline">
                      <i className="fas fa-info-circle mr-1" /> Pick or create a patient first
                    </span>
                  )}
                  {patientReady && !slot && !submitError && (
                    <span className="hidden text-[12px] text-[#9aa9b8] sm:inline">
                      <i className="fas fa-info-circle mr-1" /> Pick a time slot
                    </span>
                  )}
                  {submitError && (
                    <span role="alert" className="text-[12px] text-danger">
                      <i className="fas fa-exclamation-triangle mr-1" /> {submitError}
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
                      <><i className="fas fa-spinner fa-spin text-[12px]" /> Booking…</>
                    ) : (
                      <><i className="fas fa-calendar-check text-[12px]" /> Confirm booking</>
                    )}
                  </button>
                </div>
              </div>
            </form>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

// =============================================================================
// Small bits
// =============================================================================

function Section({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="mb-4 last:mb-0">
      <div className="mb-1.5 text-[12px] font-semibold uppercase tracking-[0.06em] text-[#9aa9b8]">
        {label}
        {required && <span className="ml-1 text-cta">*</span>}
      </div>
      {children}
    </div>
  );
}

function ConfirmedView({
  patientName,
  dateIso,
  slotShort,
  doctorName,
  sendWhatsApp,
  onClose,
  onAnother,
}: {
  patientName:  string;
  dateIso:      string;
  slotShort:    string;
  doctorName:   string;
  sendWhatsApp: boolean;
  onClose:      () => void;
  onAnother:    () => void;
}) {
  return (
    <div className="px-6 py-8 text-center">
      <div className="mx-auto grid h-14 w-14 place-items-center rounded-pill bg-[#E6F4EC] text-[26px] text-[#3a8b5e]">
        <i className="fas fa-check-circle" />
      </div>
      <h3 className="mt-3 text-[20px] font-semibold text-heading">Booking confirmed</h3>
      <p className="mt-1.5 text-[14px] leading-[20px] text-muted">
        <strong className="text-heading">{patientName}</strong> is booked with{" "}
        <strong className="text-heading">{doctorName}</strong> on{" "}
        <strong className="text-heading">{formatLongDate(dateIso)} · {formatSlotLabel(slotShort)}</strong>.
      </p>
      <div className="mt-3 inline-flex items-center gap-2 rounded-pill bg-surface-muted px-3 py-1 text-[12px] text-muted">
        {sendWhatsApp ? (
          <><i className="fab fa-whatsapp text-[#25D366]" /> WhatsApp template queued — patient will see it shortly.</>
        ) : (
          <><i className="fas fa-bell-slash" /> No automated message sent (per your toggle).</>
        )}
      </div>

      <div className="mt-6 flex justify-center gap-2.5">
        <button
          type="button"
          onClick={onAnother}
          className="inline-flex items-center gap-2 rounded-md border-[1.5px] border-link-hover bg-white px-4 py-2 text-[14px] font-medium text-link-hover hover:bg-link-hover hover:text-white"
        >
          <i className="fas fa-plus text-[11px]" /> Book another
        </button>
        <button
          type="button"
          onClick={onClose}
          className="inline-flex items-center gap-2 rounded-md bg-cta px-4 py-2 text-[14px] font-semibold text-cta-fg hover:bg-[#d92843]"
        >
          Done
        </button>
      </div>
    </div>
  );
}
