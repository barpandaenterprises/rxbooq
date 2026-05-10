"use client";

import * as Dialog from "@radix-ui/react-dialog";
import Link from "next/link";
import { useState } from "react";
import { LanguageSwitcher } from "@/components/molecules/LanguageSwitcher";
import { TEL_HREF, waLink, CLINIC_PHONE_DISPLAY } from "@/lib/contact";
import type { Locale } from "@/lib/locale";

const NAV_ITEMS = [
  { label: "Home", href: "/" },
  { label: "Services", href: "/#services" },
  { label: "Doctors", href: "/#doctor" },
  { label: "About", href: "/#about" },
  { label: "Contact", href: "/#contact" },
];

export function MobileNavDrawer({ locale }: { locale: Locale }) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <button
          type="button"
          aria-label="Open menu"
          className="grid h-10 w-10 cursor-pointer place-items-center rounded-md border border-border bg-white text-link"
        >
          <i className="fas fa-bars text-[16px]" />
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-[rgba(16,24,40,0.55)] data-[state=open]:animate-in data-[state=open]:fade-in" />
        <Dialog.Content className="fixed inset-y-0 right-0 z-50 flex w-full max-w-[340px] flex-col bg-white shadow-[0_24px_60px_-12px_rgba(16,24,40,0.30)] focus:outline-none">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <Link
              href="/"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 text-[16px] font-semibold text-heading no-underline"
            >
              <span className="grid h-8 w-8 place-items-center rounded-md bg-brand text-[14px] text-white">
                <i className="fas fa-tooth" />
              </span>
              Mahakur Poly Dental
            </Link>
            <Dialog.Close
              className="grid h-9 w-9 cursor-pointer place-items-center rounded-pill bg-surface-muted text-muted hover:bg-border"
              aria-label="Close menu"
            >
              <i className="fas fa-times text-[12px]" />
            </Dialog.Close>
          </div>

          <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-4 py-4">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                onClick={() => setOpen(false)}
                className="rounded-md px-3 py-3 text-[16px] font-medium text-heading no-underline transition-colors hover:bg-surface-muted"
              >
                {item.label}
              </Link>
            ))}

            <div className="mt-3 border-t border-border pt-4">
              <div className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-[0.06em] text-[#9aa9b8]">
                Language
              </div>
              <div className="px-3">
                <LanguageSwitcher current={locale} />
              </div>
            </div>
          </nav>

          <div className="flex flex-col gap-2.5 border-t border-border bg-surface-muted px-5 py-4">
            <Link
              href="/book"
              onClick={() => setOpen(false)}
              className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-cta px-5 py-3 text-[15px] font-medium text-cta-fg no-underline transition-colors hover:bg-[#d92843]"
            >
              <i className="fas fa-calendar-check" />
              Book Appointment
            </Link>
            <a
              href={waLink("Hi, I'd like to book an appointment at Mahakur Poly Dental.")}
              target="_blank"
              rel="noreferrer"
              onClick={() => setOpen(false)}
              className="inline-flex w-full items-center justify-center gap-2 rounded-md border-[1.5px] border-[#25D366] bg-white px-5 py-2.5 text-[14px] font-medium text-[#128C7E] no-underline"
            >
              <i className="fab fa-whatsapp text-[16px] text-[#25D366]" />
              Book on WhatsApp
            </a>
            <a
              href={TEL_HREF}
              onClick={() => setOpen(false)}
              className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-border bg-white px-5 py-2.5 text-[14px] font-medium text-heading no-underline"
            >
              <i className="fas fa-phone-alt text-[12px]" />
              {CLINIC_PHONE_DISPLAY}
            </a>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
