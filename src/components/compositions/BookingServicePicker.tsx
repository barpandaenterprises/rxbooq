"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { BookingStepperHeader } from "@/components/molecules/BookingStepperHeader";
import { BookingServiceTile } from "@/components/molecules/BookingServiceTile";
import { DoctorPill } from "@/components/molecules/DoctorPill";
import type { PublicDoctor, PublicService } from "@/lib/data/public-booking";

type Props = {
  clinicName: string;
  services:   PublicService[];
  doctors:    PublicDoctor[];
};

export function BookingServicePicker({ clinicName, services, doctors }: Props) {
  const router = useRouter();
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [selectedDoctor, setSelectedDoctor] = useState<string | null>(null);

  const continueDisabled = !selectedService;

  const handleContinue = () => {
    if (continueDisabled) return;
    const params = new URLSearchParams({
      service: selectedService!,
      ...(selectedDoctor ? { doctor: selectedDoctor } : {}),
    });
    router.push(`/book/slot?${params.toString()}`);
  };

  return (
    <>
      <div className="mx-auto max-w-[720px] overflow-hidden rounded-lg bg-white shadow-md">
        <div className="px-5 pb-6 pt-8 md:px-12 md:pb-8 md:pt-10">
          <BookingStepperHeader step={1} />

          <h2 className="mb-2 text-[22px] font-semibold leading-[28px] text-heading md:text-[28px] md:leading-[34px]">
            Book your visit at {clinicName}
          </h2>
          <p className="mb-6 text-[14px] leading-[22px] text-muted md:mb-8 md:text-paragraph">
            Pick a service to see open slots.
          </p>

          <div className="mb-6 grid grid-cols-1 gap-3 md:mb-8 md:grid-cols-2 md:gap-4">
            {services.length === 0 ? (
              <div className="rounded-md border border-border bg-surface-muted px-4 py-8 text-center text-[13px] text-muted">
                No services available right now. Please call the clinic.
              </div>
            ) : (
              services.map((s) => (
                <BookingServiceTile
                  key={s.id}
                  service={{
                    id:          s.id,
                    icon:        s.icon,
                    name:        s.name,
                    duration:    `${s.durationMinutes} min`,
                    fee:         s.feeLabel,
                    description: s.description,
                  }}
                  selected={s.id === selectedService}
                  onSelect={setSelectedService}
                />
              ))
            )}
          </div>

          {doctors.length > 1 && (
            <div className="border-t border-border pt-5 md:pt-6">
              <div className="mb-2.5 text-[12px] font-medium uppercase tracking-[0.06em] text-heading md:mb-3 md:text-[13px]">
                Choose your doctor
              </div>
              <div className="flex flex-col gap-2 md:flex-row md:flex-wrap md:gap-2.5">
                {doctors.map((d) => (
                  <DoctorPill
                    key={d.id}
                    doctor={d}
                    selected={d.id === selectedDoctor}
                    onSelect={(id) =>
                      setSelectedDoctor((curr) => (curr === id ? null : id))
                    }
                  />
                ))}
              </div>
              <div className="mt-2.5 text-[12px] text-[#9aa9b8]">
                <i className="fas fa-info-circle mr-1.5" />
                Pick a doctor or leave blank to book with the next available.
              </div>
            </div>
          )}
        </div>

        {/* Sticky footer (desktop) — below the card on mobile we render a fixed bottom bar instead */}
        <div className="hidden items-center justify-between border-t border-border bg-surface-muted px-12 py-4 md:flex">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-[14px] text-muted no-underline hover:text-link-hover"
          >
            <i className="fas fa-arrow-left text-[11px]" /> Back
          </Link>
          <button
            type="button"
            disabled={continueDisabled}
            onClick={handleContinue}
            className={
              "inline-flex items-center gap-2 rounded-md bg-cta px-6 py-3 text-[15px] font-medium text-cta-fg transition-colors " +
              (continueDisabled
                ? "cursor-not-allowed opacity-50"
                : "cursor-pointer hover:bg-[#d92843]")
            }
          >
            Continue <i className="fas fa-arrow-right text-[11px]" />
          </button>
        </div>
      </div>

      {/* Mobile sticky bottom bar */}
      <div className="fixed inset-x-0 bottom-0 flex items-center gap-3 border-t border-border bg-white px-4 py-3 shadow-[0_-4px_12px_rgba(0,0,0,0.05)] md:hidden">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 px-2 py-3 text-[14px] text-muted no-underline"
        >
          <i className="fas fa-arrow-left text-[11px]" /> Back
        </Link>
        <button
          type="button"
          disabled={continueDisabled}
          onClick={handleContinue}
          className={
            "inline-flex flex-1 items-center justify-center gap-2 rounded-md bg-cta px-6 py-3 text-[15px] font-medium text-cta-fg transition-colors " +
            (continueDisabled ? "cursor-not-allowed opacity-50" : "cursor-pointer hover:bg-[#d92843]")
          }
        >
          Continue <i className="fas fa-arrow-right text-[11px]" />
        </button>
      </div>
    </>
  );
}
