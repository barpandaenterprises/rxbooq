"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { BookingStepperHeader } from "@/components/molecules/BookingStepperHeader";
import {
  FormField,
  TEXT_INPUT_CLASS,
  TEXT_INPUT_ERROR_CLASS,
} from "@/components/molecules/FormField";
import { ConsentCheckbox } from "@/components/molecules/ConsentCheckbox";
import { AppointmentSummary } from "@/components/molecules/AppointmentSummary";
import { WhatsAppOptInCard } from "@/components/molecules/WhatsAppOptInCard";
import { OtpModal } from "@/components/molecules/OtpModal";
import type { Locale } from "@/components/molecules/LangPicker";
import { formatLongDate, formatSlotLabel } from "@/lib/booking-data";
import { createPublicBookingAction } from "@/app/book/actions";
import type { PublicDoctor, PublicService } from "@/lib/data/public-booking";

const schema = z.object({
  fullName: z.string().min(2, "Please enter your full name."),
  mobile: z
    .string()
    .min(1, "Mobile number is required.")
    .refine(
      (v) => /^[6-9]\d{9}$/.test(v.replace(/\s+/g, "")),
      "Enter a valid 10-digit Indian mobile number.",
    ),
  email: z
    .string()
    .optional()
    .refine(
      (v) => !v || /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v),
      "Enter a valid email address.",
    ),
  reason: z.string().optional(),
  verifyNumber: z.boolean(),
  consent: z.literal(true, {
    errorMap: () => ({
      message: "You must agree to the consent before booking.",
    }),
  }),
});

type FormValues = z.infer<typeof schema>;

type Props = {
  service: PublicService;
  doctor:  PublicDoctor | null;
  date:    string;
  slot:    string;
  clinicName?:    string;
  clinicAddress?: string;
};

export function BookingPatientForm({ service, doctor, date, slot, clinicName, clinicAddress }: Props) {
  const router = useRouter();
  const [locale, setLocale] = useState<Locale>("hi");
  const [otpOpen, setOtpOpen] = useState(false);
  const [pendingPhone, setPendingPhone] = useState<string>("");
  const [summaryOpen, setSummaryOpen] = useState(true);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [pendingValues, setPendingValues] = useState<FormValues | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
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
  const consent = watch("consent");

  const finalize = (values: FormValues, mobile: string) => {
    if (!doctor) {
      setSubmitError("Doctor missing. Please go back and pick a service again.");
      return;
    }
    const phoneE164 = `+91${mobile.replace(/\D/g, "")}`;
    const startsAtIso = `${date}T${slot}:00+05:30`;

    setSubmitError(null);
    startTransition(async () => {
      const result = await createPublicBookingAction({
        fullName:  values.fullName,
        phoneE164,
        language:  locale,
        serviceId: service.id,
        doctorId:  doctor.id,
        startsAt:  startsAtIso,
        notes:     values.reason || undefined,
      });

      if (!result.ok) {
        setSubmitError(result.error);
        return;
      }

      const params = new URLSearchParams({
        service: service.id,
        date,
        slot,
        ...(doctor ? { doctor: doctor.id } : {}),
        mobile:  mobile.replace(/\s+/g, ""),
        locale,
        ref: result.bookingRef,
        id:  result.appointmentId,
      });
      router.push(`/book/success?${params.toString()}`);
    });
  };

  const onSubmit = (values: FormValues) => {
    if (isPending) return;
    const cleanedMobile = values.mobile.replace(/\s+/g, "");
    if (values.verifyNumber) {
      setPendingPhone(`+91 ${cleanedMobile}`);
      setPendingValues(values);
      setOtpOpen(true);
      return;
    }
    finalize(values, cleanedMobile);
  };

  return (
    <>
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="mx-auto max-w-[960px] overflow-hidden rounded-lg bg-white shadow-md">
          <div className="px-5 pb-6 pt-8 md:px-12 md:pb-8 md:pt-10">
            <BookingStepperHeader step={3} />

            {/* Mobile collapsible summary */}
            <div className="mb-5 overflow-hidden rounded-[12px] border border-border bg-white md:hidden">
              <button
                type="button"
                onClick={() => setSummaryOpen((v) => !v)}
                className="flex w-full items-center justify-between bg-white px-4 py-3.5"
                aria-expanded={summaryOpen}
              >
                <span className="flex items-center gap-2.5">
                  <span className="grid h-8 w-8 place-items-center rounded-md bg-[#FFE7EC] text-[14px] text-cta">
                    <i className="fas fa-calendar-check" />
                  </span>
                  <span className="text-left">
                    <span className="block text-[14px] font-semibold text-heading">
                      Your appointment
                    </span>
                    <span className="text-[12px] text-muted">
                      {formatLongDate(date)} · {formatSlotLabel(slot)} · {service.feeLabel}
                    </span>
                  </span>
                </span>
                <i
                  className={`fas fa-chevron-${summaryOpen ? "up" : "down"} text-[11px] text-muted`}
                />
              </button>
              {summaryOpen && (
                <div className="px-4 pb-4">
                  <AppointmentSummary
                    service={service}
                    doctor={doctor}
                    date={date}
                    slot={slot}
                    locale={locale}
                    onLocaleChange={setLocale}
                    compact
                    clinicName={clinicName}
                    clinicAddress={clinicAddress}
                  />
                </div>
              )}
            </div>

            <h2 className="mb-2 text-[22px] font-semibold leading-[28px] text-heading md:text-[28px] md:leading-[34px]">
              <span className="hidden md:inline">Almost done — your details</span>
              <span className="md:hidden">Your details</span>
            </h2>
            <p className="mb-6 text-[14px] leading-[22px] text-muted md:mb-8 md:text-paragraph">
              We&rsquo;ll only use these to confirm your appointment.
            </p>

            <div className="grid grid-cols-1 gap-10 md:grid-cols-[1.2fr_1fr]">
              {/* LEFT — form */}
              <div>
                <FormField
                  label="Full name"
                  htmlFor="fullName"
                  required
                  error={errors.fullName?.message}
                >
                  <input
                    id="fullName"
                    {...register("fullName")}
                    className={
                      errors.fullName ? TEXT_INPUT_ERROR_CLASS : TEXT_INPUT_CLASS
                    }
                    placeholder="Priya Sahu"
                  />
                </FormField>

                <FormField
                  label="Mobile number"
                  htmlFor="mobile"
                  required
                  error={errors.mobile?.message}
                >
                  <div className="flex gap-2">
                    <div
                      className={
                        "flex w-24 flex-none cursor-pointer items-center gap-1.5 rounded-md border-[1.5px] bg-white px-3 py-3 text-[15px] text-heading " +
                        (errors.mobile ? "border-cta" : "border-border")
                      }
                    >
                      <span className="text-[14px]">🇮🇳</span> +91
                      <i className="fas fa-chevron-down ml-auto text-[10px] text-[#9aa9b8]" />
                    </div>
                    <input
                      id="mobile"
                      inputMode="numeric"
                      {...register("mobile")}
                      className={
                        "flex-1 " +
                        (errors.mobile ? TEXT_INPUT_ERROR_CLASS : TEXT_INPUT_CLASS)
                      }
                      placeholder="98765 43210"
                    />
                  </div>
                </FormField>

                <FormField
                  label="Email"
                  htmlFor="email"
                  hint="Optional · we'll email a copy of your booking."
                  error={errors.email?.message}
                >
                  <input
                    id="email"
                    type="email"
                    {...register("email")}
                    className={errors.email ? TEXT_INPUT_ERROR_CLASS : TEXT_INPUT_CLASS}
                    placeholder="you@email.com"
                  />
                </FormField>

                <FormField
                  label="Reason for visit"
                  htmlFor="reason"
                  hint="A short note helps the doctor prepare. Optional."
                >
                  <textarea
                    id="reason"
                    {...register("reason")}
                    rows={3}
                    className={`${TEXT_INPUT_CLASS} min-h-[88px] resize-y leading-[22px]`}
                    placeholder="Tooth pain, sensitivity, swelling…"
                  />
                </FormField>

                <WhatsAppOptInCard
                  checked={verifyNumber}
                  onChange={(c) => setValue("verifyNumber", c)}
                />

                <div className="mt-5">
                  <ConsentCheckbox
                    checked={consent === true}
                    onChange={(c) =>
                      setValue("consent", (c ? true : undefined) as true, {
                        shouldValidate: true,
                      })
                    }
                  >
                    I agree to receive appointment messages on WhatsApp and SMS, and
                    accept the{" "}
                    <a href="#" className="text-link-hover">
                      Privacy Policy
                    </a>{" "}
                    &amp;{" "}
                    <a href="#" className="text-link-hover">
                      Terms
                    </a>
                    . <span className="text-[#9aa9b8]">(DPDP 2023)</span>
                  </ConsentCheckbox>
                  {errors.consent && (
                    <div className="mt-2 flex items-center gap-1.5 text-[12px] text-cta">
                      <i className="fas fa-exclamation-circle text-[11px]" />
                      {errors.consent.message}
                    </div>
                  )}
                </div>
              </div>

              {/* RIGHT — sticky summary (desktop only) */}
              <div className="hidden self-start md:sticky md:top-6 md:block">
                <AppointmentSummary
                  service={service}
                  doctor={doctor}
                  date={date}
                  slot={slot}
                  locale={locale}
                  onLocaleChange={setLocale}
                  clinicName={clinicName}
                  clinicAddress={clinicAddress}
                />
              </div>
            </div>
          </div>

          {submitError && (
            <div role="alert" className="border-t border-border bg-red-50 px-5 py-3 text-[13px] text-danger md:px-12">
              <i className="fas fa-exclamation-triangle mr-1.5" />
              {submitError}
            </div>
          )}

          {/* Desktop sticky footer */}
          <div className="hidden items-center justify-between border-t border-border bg-surface-muted px-12 py-4 md:flex">
            <Link
              href={`/book/slot?service=${service.id}${doctor ? `&doctor=${doctor.id}` : ""}`}
              className="inline-flex items-center gap-2 text-[14px] text-muted no-underline hover:text-link-hover"
            >
              <i className="fas fa-arrow-left text-[11px]" /> Back
            </Link>
            <div className="flex items-center gap-4">
              <span className="text-[13px] text-[#9aa9b8]">
                <i className="fas fa-lock mr-1.5" />
                Secure · No card needed
              </span>
              <button
                type="submit"
                disabled={isPending}
                className={
                  "inline-flex cursor-pointer items-center gap-2 rounded-md bg-cta px-6 py-3 text-[15px] font-medium text-cta-fg transition-colors hover:bg-[#d92843] " +
                  (isPending ? "cursor-not-allowed opacity-60 hover:bg-cta" : "")
                }
              >
                {isPending ? (
                  <>
                    <i className="fas fa-spinner fa-spin text-[11px]" /> Booking…
                  </>
                ) : (
                  <>
                    Confirm booking <i className="fas fa-arrow-right text-[11px]" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile sticky bottom bar */}
        <div className="fixed inset-x-0 bottom-0 z-30 flex items-center gap-3 border-t border-border bg-white px-4 py-3 shadow-[0_-4px_12px_rgba(0,0,0,0.05)] md:hidden">
          <Link
            href={`/book/slot?service=${service.id}${doctor ? `&doctor=${doctor.id}` : ""}`}
            className="inline-flex items-center gap-1.5 px-2 py-3 text-[14px] text-muted no-underline"
          >
            <i className="fas fa-arrow-left text-[11px]" /> Back
          </Link>
          <button
            type="submit"
            className="inline-flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-md bg-cta px-6 py-3 text-[15px] font-medium text-cta-fg transition-colors hover:bg-[#d92843]"
          >
            Confirm booking <i className="fas fa-arrow-right text-[11px]" />
          </button>
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
