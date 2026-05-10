"use client";

import * as Popover from "@radix-ui/react-popover";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { setLocale } from "@/app/actions/set-locale";
import { LOCALE_LABELS, LOCALES, type Locale } from "@/lib/locale";

export function LanguageSwitcher({ current }: { current: Locale }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);

  const handleSelect = (locale: Locale) => {
    if (locale === current || pending) return;
    startTransition(async () => {
      await setLocale(locale);
      setOpen(false);
      router.refresh();
    });
  };

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button
          type="button"
          aria-label="Select language"
          className="inline-flex cursor-pointer items-center gap-1.5 rounded-pill border border-border bg-white px-3 py-1.5 text-[14px] text-link transition-colors hover:border-link-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cta data-[state=open]:border-link-hover"
        >
          <i className="fas fa-globe text-[11px]" />
          {LOCALES.map((l, i) => (
            <span key={l} className="contents">
              {i > 0 && <span className="text-border">·</span>}
              <span className={l === current ? "font-medium text-link-hover" : ""}>
                {LOCALE_LABELS[l].abbr}
              </span>
            </span>
          ))}
          <i className="fas fa-chevron-down ml-0.5 text-[9px] text-[#9aa9b8]" />
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="end"
          sideOffset={8}
          className="z-50 w-[220px] rounded-md border border-border bg-white p-1.5 shadow-md"
        >
          <div className="mb-1 px-2.5 pt-1 text-[11px] font-semibold uppercase tracking-[0.06em] text-[#9aa9b8]">
            Language
          </div>
          {LOCALES.map((l) => {
            const meta = LOCALE_LABELS[l];
            const active = l === current;
            return (
              <button
                key={l}
                type="button"
                disabled={pending}
                onClick={() => handleSelect(l)}
                className={
                  "flex w-full cursor-pointer items-center gap-3 rounded-sm px-2.5 py-2 text-left text-[14px] transition-colors disabled:cursor-wait " +
                  (active
                    ? "bg-[#E6F1FA] font-semibold text-link-hover"
                    : "text-heading hover:bg-surface-muted")
                }
              >
                <span className="w-12 text-[14px]">{meta.abbr}</span>
                <span className="flex-1 text-[13px] text-muted">{meta.full}</span>
                {active && <i className="fas fa-check text-[12px] text-link-hover" />}
              </button>
            );
          })}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
