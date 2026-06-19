"use client";

import * as Dialog from "@radix-ui/react-dialog";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { deleteDraftAction } from "@/app/(super-admin)/superadmin/applications/actions";

export function DraftRowActions({
  draftId,
  label,
}: {
  draftId: string;
  /** Human label for the warning copy (clinic name, phone, or email). */
  label:   string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const onDelete = () => {
    if (pending) return;
    setError(null);
    startTransition(async () => {
      const res = await deleteDraftAction(draftId);
      if (!res.ok) { setError(res.error); return; }
      setOpen(false);
      router.refresh();
    });
  };

  return (
    <>
      <Link
        href={`/superadmin/applications/${draftId}/edit`}
        className="rounded-md border border-border bg-white px-3 py-1.5 text-[12px] text-heading no-underline hover:bg-surface-muted"
      >
        <i className="fas fa-pen mr-1.5 text-[10px] text-muted" /> Edit
      </Link>

      <Dialog.Root open={open} onOpenChange={(v) => { setOpen(v); if (!v) setError(null); }}>
        <Dialog.Trigger asChild>
          <button
            type="button"
            className="rounded-md border border-[#f3d3d8] bg-white px-3 py-1.5 text-[12px] text-cta hover:bg-[#fff5f6]"
          >
            <i className="fas fa-trash mr-1.5 text-[10px]" /> Delete
          </button>
        </Dialog.Trigger>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-40 bg-[rgba(16,24,40,0.55)]" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-1.5rem)] max-w-[440px] -translate-x-1/2 -translate-y-1/2 rounded-lg bg-white shadow-[0_24px_60px_-12px_rgba(16,24,40,0.30)] focus:outline-none">
            <div className="flex items-start gap-3 border-b border-border px-5 py-4">
              <span className="mt-0.5 grid h-9 w-9 flex-none place-items-center rounded-pill bg-[#FFE7EC] text-[15px] text-cta">
                <i className="fas fa-exclamation-triangle" />
              </span>
              <div>
                <Dialog.Title className="text-[17px] font-semibold text-heading">Delete this draft?</Dialog.Title>
                <Dialog.Description className="mt-0.5 text-[12px] text-muted">
                  {label}
                </Dialog.Description>
              </div>
            </div>

            <div className="px-5 py-4">
              <div className="rounded-md border border-[#f3d3d8] bg-[#fff5f6] px-3 py-2.5 text-[12px] leading-[18px] text-heading">
                <strong>This cannot be undone.</strong> The in-flight application and any uploaded
                verification documents are permanently removed. The applicant could still start over from scratch.
              </div>
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
                disabled={pending}
                onClick={onDelete}
                className="inline-flex items-center gap-2 rounded-md bg-cta px-4 py-2 text-[13px] font-medium text-cta-fg transition-colors hover:bg-[#d92843] disabled:opacity-50"
              >
                {pending ? "Deleting…" : "Delete draft"}
                {!pending && <i className="fas fa-trash text-[10px]" />}
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}
