"use client";

import * as Dialog from "@radix-ui/react-dialog";
import Image from "next/image";
import Link from "next/link";
import { CLINIC_PHONE_DISPLAY, TEL_HREF, waLink } from "@/lib/contact";

const META: Array<{ label: string; value: string }> = [
  { label: "Specialties", value: "Conservative Dentistry · Cosmetology · Implantology" },
  { label: "Trained at", value: "BCB Dental College, Cuttack" },
  { label: "Registration", value: "OCDS Reg. No. 446/A" },
  { label: "Clinic hours", value: "Last Saturday each month, 9:00 AM – 2:00 PM" },
  { label: "Languages", value: "English · हिंदी · ଓଡ଼ିଆ" },
];

const HIGHLIGHTS = [
  { n: "20+", l: "Years experience" },
  { n: "8,400+", l: "Patients treated" },
  { n: "1,200+", l: "Implants & RCTs" },
];

type Props = {
  trigger: React.ReactNode;
  /** When the doctor's id is wired into the booking catalog, deep-link to /book pre-selecting them. */
  bookHref?: string;
};

export function DoctorProfileDialog({ trigger, bookHref = "/book?doctor=mm" }: Props) {
  return (
    <Dialog.Root>
      <Dialog.Trigger asChild>{trigger}</Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-[rgba(16,24,40,0.55)] data-[state=open]:animate-in data-[state=open]:fade-in" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-[680px] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-lg bg-white shadow-[0_24px_60px_-12px_rgba(16,24,40,0.30)] focus:outline-none">
          <Dialog.Close
            className="absolute right-4 top-4 z-10 grid h-8 w-8 cursor-pointer place-items-center rounded-pill bg-white/95 text-muted shadow-sm hover:bg-border"
            aria-label="Close"
          >
            <i className="fas fa-times text-[12px]" />
          </Dialog.Close>

          <div className="grid grid-cols-1 md:grid-cols-[220px_1fr]">
            <div className="relative h-56 overflow-hidden bg-surface-warm md:h-auto">
              <Image
                src="/images/dr-manoranjan-mahakur.jpg"
                alt="Dr. Manoranjan Mahakur"
                fill
                sizes="(min-width: 768px) 220px, 100vw"
                className="object-cover object-top"
              />
            </div>

            <div className="p-6 pr-8 md:p-7">
              <span className="inline-flex items-center rounded-pill bg-surface-warm px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.06em] text-[#b8253a]">
                Lead Dental Surgeon
              </span>
              <Dialog.Title className="mt-2.5 text-[24px] font-semibold leading-7 text-heading">
                Dr. Manoranjan Mahakur
              </Dialog.Title>
              <div className="mt-1 text-[14px] font-medium text-link-hover">
                MDS, MPH, PHDMC · Reg. No. 446/A
              </div>

              <Dialog.Description className="mt-3 text-[14px] leading-[22px] text-muted">
                Senior dental surgeon trained at BCB Dental College, Cuttack. Consultant
                Cosmetologist and Implantologist with a focus on painless root canals,
                smile makeovers and dental implants — supported by an everyday team led by
                Dr. Lipsa Pradhan (MDS).
              </Dialog.Description>

              <div className="mt-4 grid grid-cols-3 gap-2 rounded-md border border-border bg-surface-muted p-3">
                {HIGHLIGHTS.map((h) => (
                  <div key={h.l} className="text-center">
                    <div className="text-[18px] font-bold text-link-hover">{h.n}</div>
                    <div className="text-[11px] leading-tight text-muted">{h.l}</div>
                  </div>
                ))}
              </div>

              <dl className="mt-4 space-y-2 text-[13px]">
                {META.map((m) => (
                  <div key={m.label} className="grid grid-cols-[110px_1fr] gap-3">
                    <dt className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[#9aa9b8]">
                      {m.label}
                    </dt>
                    <dd className="text-heading">{m.value}</dd>
                  </div>
                ))}
              </dl>

              <div className="mt-5 flex flex-wrap gap-2.5">
                <Link
                  href={bookHref}
                  className="inline-flex items-center gap-2 rounded-md bg-cta px-5 py-2.5 text-[14px] font-medium text-cta-fg no-underline hover:bg-[#d92843]"
                >
                  <i className="fas fa-calendar-check text-[12px]" />
                  Book with this doctor
                </Link>
                <a
                  href={waLink("Hi, I'd like to know more about Dr. Manoranjan Mahakur's appointments.")}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-md border-[1.5px] border-link-hover bg-transparent px-4 py-2 text-[14px] font-medium text-link-hover no-underline transition-colors hover:bg-link-hover hover:text-white"
                >
                  <i className="fab fa-whatsapp" />
                  Ask on WhatsApp
                </a>
                <a
                  href={TEL_HREF}
                  className="inline-flex items-center gap-2 rounded-md border-[1.5px] border-border bg-white px-4 py-2 text-[14px] font-medium text-heading no-underline hover:border-link-hover hover:text-link-hover"
                >
                  <i className="fas fa-phone-alt text-[12px]" />
                  {CLINIC_PHONE_DISPLAY}
                </a>
              </div>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
