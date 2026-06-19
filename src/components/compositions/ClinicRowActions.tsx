"use client";

import * as Dialog from "@radix-ui/react-dialog";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { deleteClinicAction } from "@/app/(super-admin)/superadmin/clinics/actions";

export function ClinicRowActions({
  clinicId,
  slug,
  name,
}: {
  clinicId: string;
  slug:     string;
  name:     string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const canDelete = confirmText.trim() === slug;

  const onDelete = () => {
    if (!canDelete || pending) return;
    setError(null);
    startTransition(async () => {
      const res = await deleteClinicAction(clinicId);
      if (!res.ok) { setError(res.error); return; }
      setOpen(false);
      router.refresh();
    });
  };

  return (
    <div className="flex items-center justify-end gap-1">
      <Link
        href={`/${slug}`}
        target="_blank"
        rel="noopener noreferrer"
        title="Open public profile"
        className="grid h-7 w-7 place-items-center rounded-md text-link-hover no-underline hover:bg-surface-muted"
      >
        <i className="fas fa-external-link-alt text-[11px]" />
      </Link>
      <Link
        href={`/superadmin/clinics/${clinicId}/edit`}
        title="Edit clinic"
        className="grid h-7 w-7 place-items-center rounded-md text-heading no-underline hover:bg-surface-muted"
      >
        <i className="fas fa-pen text-[11px]" />
      </Link>

      <Dialog.Root
        open={open}
        onOpenChange={(v) => {
          setOpen(v);
          if (!v) { setConfirmText(""); setError(null); }
        }}
      >
        <Dialog.Trigger asChild>
          <button
            type="button"
            title="Delete clinic"
            className="grid h-7 w-7 place-items-center rounded-md text-cta hover:bg-[#FFE7EC]"
          >
            <i className="fas fa-trash text-[11px]" />
          </button>
        </Dialog.Trigger>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-40 bg-[rgba(16,24,40,0.55)]" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-1.5rem)] max-w-[480px] -translate-x-1/2 -translate-y-1/2 rounded-lg bg-white shadow-[0_24px_60px_-12px_rgba(16,24,40,0.30)] focus:outline-none">
            <div className="flex items-start gap-3 border-b border-border px-5 py-4">
              <span className="mt-0.5 grid h-9 w-9 flex-none place-items-center rounded-pill bg-[#FFE7EC] text-[15px] text-cta">
                <i className="fas fa-exclamation-triangle" />
              </span>
              <div>
                <Dialog.Title className="text-[17px] font-semibold text-heading">Delete this clinic?</Dialog.Title>
                <Dialog.Description className="mt-0.5 text-[12px] text-muted">
                  This permanently deletes <strong className="text-heading">{name}</strong> (/{slug}).
                </Dialog.Description>
              </div>
            </div>

            <div className="px-5 py-4">
              <div className="mb-4 rounded-md border border-[#f3d3d8] bg-[#fff5f6] px-3 py-2.5 text-[12px] leading-[18px] text-heading">
                <strong>This cannot be undone.</strong> Every doctor, patient, appointment, prescription,
                visit note, team login, subscription, and coupon redemption for this clinic is removed.
                Logins used only for this clinic are deleted too.
              </div>

              <label className="mb-1.5 block text-[13px] font-medium text-heading">
                Type <span className="font-mono text-cta">{slug}</span> to confirm
              </label>
              <input
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") onDelete(); }}
                autoFocus
                placeholder={slug}
                className="w-full rounded-md border-[1.5px] border-border bg-white px-3.5 py-2.5 text-[14px] text-heading outline-none focus-visible:border-cta focus-visible:shadow-[0_0_0_3px_rgba(238,52,78,0.18)] placeholder:text-[#9aa9b8]"
              />

              {error && (
                <div className="mt-3 rounded-md border border-[#f3d3d8] bg-[#fff5f6] px-3 py-2 text-[12px] text-heading">{error}</div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2.5 border-t border-border px-5 py-3.5">
              <Dialog.Close className="rounded-md border-[1.5px] border-border bg-white px-4 py-2 text-[13px] font-medium text-heading hover:bg-surface-muted">
                Cancel
              </Dialog.Close>
              <button
                type="button"
                disabled={!canDelete || pending}
                onClick={onDelete}
                className="inline-flex items-center gap-2 rounded-md bg-cta px-4 py-2 text-[13px] font-medium text-cta-fg transition-colors hover:bg-[#d92843] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {pending ? "Deleting…" : "Delete clinic"}
                {!pending && <i className="fas fa-trash text-[10px]" />}
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
