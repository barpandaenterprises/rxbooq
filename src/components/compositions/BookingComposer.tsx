"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { ConsentCheckbox } from "@/components/molecules/ConsentCheckbox";
import { FormField, TEXT_INPUT_CLASS, TEXT_INPUT_ERROR_CLASS } from "@/components/molecules/FormField";
import { LangPicker, type Locale } from "@/components/molecules/LangPicker";
import { OtpModal } from "@/components/molecules/OtpModal";
import { WhatsAppOptInCard } from "@/components/molecules/WhatsAppOptInCard";

import {
  createPublicBookingAction,
  getPublicDeptSlotsForDateAction,
  getPublicDoctorSlotsForDateAction,
  getPublicDoctorWorkingDatesAction,
  getPublicDoctorsForSlotAction,
} from "@/app/(clinic-app)/[clinicSlug]/book/actions";
import {
  slotsInWindows,
  subtractBooked,
  type WorkingWindow,
} from "@/lib/data/booking-availability";
import { formatLongDate, formatSlotLabel, toLocalIso } from "@/lib/booking-data";
import type { PublicDepartment, PublicDoctor } from "@/lib/data/public-booking";

// =============================================================================
// Form schema — patient details only; mode/dept/doctor/date/slot live in
// component state since they don't need validation rules at submit time.
// =============================================================================

const patientSchema = z.object({
  fullName: z.string().min(2, "Please enter your full name."),
  mobile:   z.string().refine(
              (v) => /^[6-9]\d{9}$/.test(v.replace(/\s+/g, "")),
              "Enter a valid 10-digit Indian mobile number.",
            ),
  email:    z.string().optional().refine(
              (v) => !v || /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v),
              "Enter a valid email address.",
            ),
  reason:   z.string().optional(),
  verifyNumber: z.boolean(),
  consent:  z.literal(true, {
              errorMap: () => ({ message: "You must agree to the consent before booking." }),
            }),
});

type PatientValues = z.infer<typeof patientSchema>;

// =============================================================================
// Date row (30 days)
// =============================================================================

const DAY_LABELS   = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
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
      iso:     toLocalIso(d),
      day:     d.getDate(),
      month:   MONTH_LABELS[d.getMonth()]!,
      weekday: DAY_LABELS[d.getDay()]!,
      isToday: i === 0,
    };
  });
}

function fmtSlot(short: string): string {
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

type Mode = "byDept" | "byDoctor";

type Props = {
  clinicName:    string;
  clinicAddress?: string;
  doctors:       PublicDoctor[];
  departments:   PublicDepartment[];
};

export function BookingComposer({ clinicName, doctors, departments }: Props) {
  const router = useRouter();
  const params = useParams<{ clinicSlug: string }>();
  const slug   = params?.clinicSlug ?? "";
  const [isPending, startTransition] = useTransition();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [mode,         setMode]         = useState<Mode>("byDoctor");
  const [departmentId, setDepartmentId] = useState<string | null>(null);
  const [doctorId,     setDoctorId]     = useState<string | null>(doctors[0]?.id ?? null);
  const [dateIso,      setDateIso]      = useState<string>(() => buildDates(1)[0]!.iso);
  const [slot,         setSlot]         = useState<string | null>(null);
  const [locale,       setLocale]       = useState<Locale>("hi");

  const [workingWindows, setWorkingWindows] = useState<WorkingWindow[]>([]);
  const [bookedSlots,    setBookedSlots]    = useState<Set<string>>(new Set());
  const [deptFreeSlots,  setDeptFreeSlots]  = useState<Set<string>>(new Set());
  const [slotsLoading,   setSlotsLoading]   = useState(false);

  type SlotDoctor = { id: string; displayName: string; qualifications: string | null };
  const [slotDoctors,    setSlotDoctors]    = useState<SlotDoctor[]>([]);
  const [doctorsLoading, setDoctorsLoading] = useState(false);

  const [workingDates,   setWorkingDates]   = useState<Set<string> | null>(null);

  const [otpOpen, setOtpOpen] = useState(false);
  const [pendingPhone, setPendingPhone] = useState("");
  const [pendingValues, setPendingValues] = useState<PatientValues | null>(null);

  const dates = useMemo(() => buildDates(DATE_RANGE_DAYS), []);
  const firstIso = dates[0]!.iso;

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<PatientValues>({
    resolver: zodResolver(patientSchema),
    mode: "onSubmit",
    defaultValues: {
      fullName: "",
      mobile: "",
      email: "",
      reason: "",
      verifyNumber: true,
      consent: undefined as unknown as true,
    },
  });

  const verifyNumber = watch("verifyNumber");
  const consent      = watch("consent");

  // -----------------------------------------------------------------------
  // Effects
  // -----------------------------------------------------------------------

  // By-Doctor: working dates for the 30-day window.
  useEffect(() => {
    if (mode !== "byDoctor" || !doctorId) { setWorkingDates(null); return; }
    let cancelled = false;
    getPublicDoctorWorkingDatesAction({ doctorId, fromIso: firstIso, days: DATE_RANGE_DAYS })
      .then((r) => { if (!cancelled && r.ok) setWorkingDates(new Set(r.workingDates)); });
    return () => { cancelled = true; };
  }, [mode, doctorId, firstIso]);

  // By-Doctor: slots for chosen doctor+date.
  useEffect(() => {
    if (mode !== "byDoctor" || !doctorId || !dateIso) return;
    let cancelled = false;
    setSlotsLoading(true);
    getPublicDoctorSlotsForDateAction({ doctorId, dateIso })
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
  }, [mode, doctorId, dateIso]);

  // By-Dept: free slots for chosen dept+date.
  useEffect(() => {
    if (mode !== "byDept" || !departmentId || !dateIso) { setDeptFreeSlots(new Set()); return; }
    let cancelled = false;
    setSlotsLoading(true);
    getPublicDeptSlotsForDateAction({ departmentId, dateIso })
      .then((r) => {
        if (cancelled) return;
        if (r.ok) setDeptFreeSlots(new Set(r.freeSlots));
        else      setDeptFreeSlots(new Set());
      })
      .finally(() => { if (!cancelled) setSlotsLoading(false); });
    return () => { cancelled = true; };
  }, [mode, departmentId, dateIso]);

  // By-Dept: doctors free at the picked slot.
  useEffect(() => {
    if (mode !== "byDept" || !departmentId || !dateIso || !slot) {
      setSlotDoctors([]);
      return;
    }
    let cancelled = false;
    setDoctorsLoading(true);
    getPublicDoctorsForSlotAction({ departmentId, dateIso, slot })
      .then((r) => {
        if (cancelled) return;
        if (r.ok) setSlotDoctors(r.doctors);
        else      setSlotDoctors([]);
      })
      .finally(() => { if (!cancelled) setDoctorsLoading(false); });
    return () => { cancelled = true; };
  }, [mode, departmentId, dateIso, slot]);

  // Reset slot + doctor when mode changes.
  useEffect(() => {
    setSlot(null);
    setDoctorId(mode === "byDoctor" ? (doctors[0]?.id ?? null) : null);
    setDepartmentId(null);
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

  const finalize = (values: PatientValues, mobile: string) => {
    if (!doctorId)  { setSubmitError("Pick a doctor first."); return; }
    if (!slot)      { setSubmitError("Pick a time slot.");    return; }

    const phoneE164   = `+91${mobile.replace(/\D/g, "")}`;
    const startsAtIso = `${dateIso}T${slot}:00+05:30`;
    // Slot length for the By-Doctor flow; By-Dept lets the server default to 30.
    const slotMinutes =
      mode === "byDoctor"
        ? workingWindows.find((w) => w.start <= slot && slot < w.end)?.slotMinutes
        : undefined;

    setSubmitError(null);
    startTransition(async () => {
      const result = await createPublicBookingAction({
        fullName:        values.fullName,
        phoneE164,
        language:        locale,
        doctorId,
        departmentId:    departmentId ?? undefined,
        startsAt:        startsAtIso,
        durationMinutes: slotMinutes,
        notes:           values.reason || undefined,
      });
      if (!result.ok) {
        setSubmitError(result.error);
        return;
      }
      const params = new URLSearchParams({
        date:   dateIso,
        slot,
        doctor: doctorId,
        mobile: mobile.replace(/\s+/g, ""),
        locale,
        ref:    result.bookingRef,
        id:     result.appointmentId,
      });
      router.push(`/${slug}/book/success?${params.toString()}`);
    });
  };

  const onSubmit = (values: PatientValues) => {
    if (isPending) return;
    if (!doctorId || !slot) {
      setSubmitError(!doctorId ? "Pick a doctor first." : "Pick a time slot.");
      return;
    }
    const cleanedMobile = values.mobile.replace(/\s+/g, "");
    if (values.verifyNumber) {
      setPendingPhone(`+91 ${cleanedMobile}`);
      setPendingValues(values);
      setOtpOpen(true);
      return;
    }
    finalize(values, cleanedMobile);
  };

  // -----------------------------------------------------------------------
  // Derived display
  // -----------------------------------------------------------------------

  const slotCandidates = useMemo(() => {
    if (mode === "byDoctor") return slotsInWindows(workingWindows);
    return Array.from(deptFreeSlots).sort();
  }, [mode, workingWindows, deptFreeSlots]);

  const availableSlots = useMemo(() => {
    if (mode === "byDoctor") return subtractBooked(slotCandidates, bookedSlots);
    return slotCandidates;
  }, [mode, slotCandidates, bookedSlots]);

  const department = departments.find((d) => d.id === departmentId);
  const selectedDoctor = mode === "byDept"
    ? slotDoctors.find((d) => d.id === doctorId)
    : doctors.find((d) => d.id === doctorId);
  const selectedDoctorName = selectedDoctor
    ? ("name" in selectedDoctor ? selectedDoctor.name : selectedDoctor.displayName)
    : null;

  const canSubmit = Boolean(doctorId && slot);

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

  return (
    <>
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="mx-auto max-w-[720px] overflow-hidden rounded-lg bg-white shadow-md">
          <div className="px-5 pb-6 pt-8 md:px-10 md:pb-8 md:pt-10">
            <h1 className="text-[24px] font-semibold leading-[30px] text-heading md:text-[28px] md:leading-[36px]">
              Book a visit at {clinicName}
            </h1>
            <p className="mt-1.5 text-[14px] text-muted">
              Pick a department or a specific doctor, choose a time, and we&rsquo;ll confirm on WhatsApp.
            </p>

            {/* Mode toggle */}
            <Section label="Book by" className="mt-6">
              <div className="inline-flex rounded-md border border-border bg-white p-0.5">
                {(["byDoctor", "byDept"] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMode(m)}
                    className={
                      "rounded-sm px-3.5 py-2 text-[13px] font-medium transition-colors " +
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

            {/* Dept or Doctor picker */}
            {mode === "byDept" ? (
              <Section label="Department" required>
                <select
                  value={departmentId ?? ""}
                  onChange={(e) => {
                    setDepartmentId(e.target.value || null);
                    setSlot(null);
                    setDoctorId(null);
                  }}
                  className="w-full rounded-md border border-border bg-white px-3 py-2.5 text-[14px] text-heading outline-none focus:border-link-hover"
                >
                  <option value="">— Pick a department —</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </Section>
            ) : (
              <Section label="Doctor" required>
                <select
                  value={doctorId ?? ""}
                  onChange={(e) => { setDoctorId(e.target.value || null); setSlot(null); }}
                  className="w-full rounded-md border border-border bg-white px-3 py-2.5 text-[14px] text-heading outline-none focus:border-link-hover"
                >
                  <option value="">— Pick a doctor —</option>
                  {doctors.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}{d.credential ? ` — ${d.credential}` : ""}
                    </option>
                  ))}
                </select>
              </Section>
            )}

            {/* When — 30 days + slot grid */}
            <Section label="When" required>
              <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
                {dates.map((d) => {
                  const sel = d.iso === dateIso;
                  const isOff = mode === "byDoctor" && workingDates !== null && !workingDates.has(d.iso);
                  return (
                    <button
                      key={d.iso}
                      type="button"
                      disabled={isOff}
                      onClick={() => { setDateIso(d.iso); setSlot(null); }}
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
                        <span className="absolute -right-1 -top-1.5 rounded-pill bg-brand px-1 py-px text-[8px] font-semibold text-white">TODAY</span>
                      )}
                    </button>
                  );
                })}
              </div>

              {slotsLoading && (
                <p className="mt-3 text-[12px] text-muted">
                  <i className="fas fa-spinner fa-spin mr-1.5" /> Loading available slots…
                </p>
              )}
              {!slotsLoading && slotCandidates.length === 0 && (
                <p className="mt-3 rounded-md border border-dashed border-border bg-surface-muted px-3 py-4 text-center text-[13px] text-muted">
                  {mode === "byDept" && !departmentId
                    ? "Pick a department to see available slots."
                    : mode === "byDoctor" && !doctorId
                    ? "Pick a doctor to see available slots."
                    : "No working slots on this day. Try another date."}
                </p>
              )}
              {!slotsLoading && slotCandidates.length > 0 && (
                <div className="mt-3 grid grid-cols-3 gap-1.5 sm:grid-cols-5">
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
                          setSlot(s);
                          if (mode === "byDept") setDoctorId(null);
                        }}
                        className={
                          "rounded-md border-[1.5px] py-2 text-[12px] font-medium transition-colors " +
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

            {/* By-Dept: doctor sub-picker */}
            {mode === "byDept" && slot && (
              <Section label="Doctor" required>
                {doctorsLoading ? (
                  <div className="text-[12px] text-muted">
                    <i className="fas fa-spinner fa-spin mr-1.5" /> Finding available doctors…
                  </div>
                ) : slotDoctors.length === 0 ? (
                  <div className="rounded-md border border-dashed border-border bg-surface-muted px-3 py-3 text-[13px] text-muted">
                    No doctor in {department?.name ?? "this department"} is free at {fmtSlot(slot)}. Try a different slot.
                  </div>
                ) : (
                  <select
                    value={doctorId ?? ""}
                    onChange={(e) => setDoctorId(e.target.value || null)}
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
              </Section>
            )}

            {/* Patient details — only show once slot+doctor picked */}
            {canSubmit && (
              <div className="mt-6 border-t border-border pt-6">
                <h2 className="mb-1 text-[18px] font-semibold text-heading">Your details</h2>
                <p className="mb-5 text-[13px] text-muted">
                  We&rsquo;ll only use these to confirm your appointment with{" "}
                  <strong className="text-heading">{selectedDoctorName ?? "the doctor"}</strong> on{" "}
                  <strong className="text-heading">{formatLongDate(dateIso)} · {formatSlotLabel(slot!)}</strong>.
                </p>

                <FormField label="Full name" htmlFor="fullName" required error={errors.fullName?.message}>
                  <input
                    id="fullName"
                    {...register("fullName")}
                    className={errors.fullName ? TEXT_INPUT_ERROR_CLASS : TEXT_INPUT_CLASS}
                    placeholder="Priya Sahu"
                  />
                </FormField>

                <FormField label="Mobile number" htmlFor="mobile" required error={errors.mobile?.message}>
                  <div className="flex gap-2">
                    <div
                      className={
                        "flex w-24 flex-none items-center gap-1.5 rounded-md border-[1.5px] bg-white px-3 py-3 text-[15px] text-heading " +
                        (errors.mobile ? "border-cta" : "border-border")
                      }
                    >
                      <span className="text-[14px]">🇮🇳</span> +91
                    </div>
                    <input
                      id="mobile"
                      inputMode="numeric"
                      {...register("mobile")}
                      className={"flex-1 " + (errors.mobile ? TEXT_INPUT_ERROR_CLASS : TEXT_INPUT_CLASS)}
                      placeholder="98765 43210"
                    />
                  </div>
                </FormField>

                <FormField label="Email" htmlFor="email" hint="Optional · we'll email a copy." error={errors.email?.message}>
                  <input
                    id="email"
                    type="email"
                    {...register("email")}
                    className={errors.email ? TEXT_INPUT_ERROR_CLASS : TEXT_INPUT_CLASS}
                    placeholder="you@email.com"
                  />
                </FormField>

                <FormField label="Reason for visit" htmlFor="reason" hint="A short note helps the doctor prepare. Optional.">
                  <textarea
                    id="reason"
                    {...register("reason")}
                    rows={3}
                    className={`${TEXT_INPUT_CLASS} min-h-[88px] resize-y leading-[22px]`}
                    placeholder="Tooth pain, swelling, follow-up…"
                  />
                </FormField>

                <FormField label="Preferred language">
                  <LangPicker value={locale} onChange={setLocale} />
                </FormField>

                <WhatsAppOptInCard
                  checked={verifyNumber}
                  onChange={(c) => setValue("verifyNumber", c)}
                />

                <div className="mt-5">
                  <ConsentCheckbox
                    checked={consent === true}
                    onChange={(c) =>
                      setValue("consent", (c ? true : undefined) as true, { shouldValidate: true })
                    }
                  >
                    I agree to receive appointment messages on WhatsApp and SMS, and accept the{" "}
                    <a href="#" className="text-link-hover">Privacy Policy</a> &amp;{" "}
                    <a href="#" className="text-link-hover">Terms</a>.{" "}
                    <span className="text-[#9aa9b8]">(DPDP 2023)</span>
                  </ConsentCheckbox>
                  {errors.consent && (
                    <div className="mt-2 flex items-center gap-1.5 text-[12px] text-cta">
                      <i className="fas fa-exclamation-circle text-[11px]" />
                      {errors.consent.message}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {submitError && (
            <div role="alert" className="border-t border-border bg-red-50 px-5 py-3 text-[13px] text-danger md:px-10">
              <i className="fas fa-exclamation-triangle mr-1.5" />
              {submitError}
            </div>
          )}

          {/* Submit bar */}
          <div className="flex items-center justify-between gap-3 border-t border-border bg-surface-muted px-5 py-4 md:px-10">
            <span className="text-[12px] text-[#9aa9b8]">
              <i className="fas fa-lock mr-1.5" /> Secure · No card needed
            </span>
            <button
              type="submit"
              disabled={isPending || !canSubmit}
              className={
                "inline-flex cursor-pointer items-center gap-2 rounded-md bg-cta px-6 py-3 text-[15px] font-medium text-cta-fg transition-colors hover:bg-[#d92843] " +
                (isPending || !canSubmit ? "cursor-not-allowed opacity-50 hover:bg-cta" : "")
              }
            >
              {isPending ? (
                <><i className="fas fa-spinner fa-spin text-[11px]" /> Booking…</>
              ) : (
                <>Confirm booking <i className="fas fa-arrow-right text-[11px]" /></>
              )}
            </button>
          </div>
        </div>
      </form>

      <OtpModal
        open={otpOpen}
        phone={pendingPhone}
        onClose={() => setOtpOpen(false)}
        onVerified={() => {
          setOtpOpen(false);
          if (pendingValues) {
            const cleanedMobile = pendingValues.mobile.replace(/\s+/g, "");
            finalize(pendingValues, cleanedMobile);
          }
        }}
      />
    </>
  );
}

// =============================================================================
// Section helper
// =============================================================================

function Section({
  label,
  required,
  className,
  children,
}: {
  label:    string;
  required?: boolean;
  className?: string;
  children:  React.ReactNode;
}) {
  return (
    <div className={"mt-5 " + (className ?? "")}>
      <div className="mb-1.5 text-[12px] font-semibold uppercase tracking-[0.06em] text-[#9aa9b8]">
        {label}
        {required && <span className="ml-1 text-cta">*</span>}
      </div>
      {children}
    </div>
  );
}
