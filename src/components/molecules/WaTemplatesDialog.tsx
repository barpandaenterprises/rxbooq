"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { useEffect, useState } from "react";
import {
  getWaTemplatesAction,
  type WaTemplateRow,
} from "@/app/(clinic-app)/admin/messages/actions";

type Props = {
  trigger?:      React.ReactNode;
  open?:         boolean;
  onOpenChange?: (open: boolean) => void;
};

const STATUS_META: Record<WaTemplateRow["status"], { bg: string; fg: string; label: string }> = {
  approved: { bg: "#E6F4EC", fg: "#3a8b5e", label: "Approved" },
  pending:  { bg: "#FFF8EC", fg: "#7a5c2b", label: "Pending"  },
  rejected: { bg: "#FFE7EC", fg: "#EE344E", label: "Rejected" },
};

const LANG_LABEL: Record<string, string> = {
  en: "English",
  hi: "हिंदी",
  or: "ଓଡ଼ିଆ",
};

export function WaTemplatesDialog({ trigger, open: controlledOpen, onOpenChange }: Props) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const open = controlledOpen ?? uncontrolledOpen;
  const setOpen = (next: boolean) => {
    if (controlledOpen === undefined) setUncontrolledOpen(next);
    onOpenChange?.(next);
  };

  const [templates, setTemplates] = useState<WaTemplateRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setError(null);
    getWaTemplatesAction()
      .then((r) => {
        if (r.ok) setTemplates(r.templates);
        else      setError(r.error);
      })
      .finally(() => setLoading(false));
  }, [open]);

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      {trigger && <Dialog.Trigger asChild>{trigger}</Dialog.Trigger>}
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-[rgba(16,24,40,0.55)]" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 flex max-h-[88vh] w-[calc(100%-1.5rem)] max-w-[720px] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-lg bg-white shadow-[0_24px_60px_-12px_rgba(16,24,40,0.30)] focus:outline-none">
          <div className="flex items-start justify-between gap-3 border-b border-border bg-white px-5 py-4">
            <div>
              <Dialog.Title className="text-[18px] font-semibold text-heading">WhatsApp templates</Dialog.Title>
              <Dialog.Description className="mt-0.5 text-[12px] text-muted">
                Read-only catalog. Template content is registered with Meta via Interakt.
              </Dialog.Description>
            </div>
            <Dialog.Close
              aria-label="Close"
              className="grid h-8 w-8 cursor-pointer place-items-center rounded-pill bg-surface-muted text-muted hover:bg-border"
            >
              <i className="fas fa-times text-[12px]" />
            </Dialog.Close>
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-4 md:px-6">
            {loading ? (
              <div className="grid place-items-center px-4 py-16 text-[13px] text-muted">
                <i className="fas fa-spinner fa-spin text-[20px]" />
                <span className="mt-2">Loading templates…</span>
              </div>
            ) : error ? (
              <div role="alert" className="rounded-md border border-danger/30 bg-red-50 px-3 py-2 text-[13px] text-danger">
                <i className="fas fa-exclamation-triangle mr-1.5" /> {error}
              </div>
            ) : templates.length === 0 ? (
              <div className="grid place-items-center px-4 py-16 text-center text-[13px] text-muted">
                <i className="fas fa-comment-slash text-[24px] text-[#cdd9e4]" />
                <span className="mt-2">No templates registered yet.</span>
              </div>
            ) : (
              <table className="w-full border-collapse text-[13px]">
                <thead>
                  <tr className="bg-surface-muted">
                    <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-[#9aa9b8]">Template</th>
                    <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-[#9aa9b8]">Language</th>
                    <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-[#9aa9b8]">Variables</th>
                    <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-[#9aa9b8]">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {templates.map((t) => {
                    const status = STATUS_META[t.status];
                    return (
                      <tr key={t.id} className="border-b border-[#F4F5F7] hover:bg-[#FAFAFB]">
                        <td className="px-3 py-2.5">
                          <code className="rounded-sm bg-[#F4F5F7] px-1.5 py-0.5 font-mono text-[12px] text-heading">{t.name}</code>
                        </td>
                        <td className="px-3 py-2.5 text-muted">{LANG_LABEL[t.language] ?? t.language}</td>
                        <td className="px-3 py-2.5">
                          {t.variables.length === 0 ? (
                            <span className="text-[#cdd9e4]">—</span>
                          ) : (
                            <div className="flex flex-wrap gap-1">
                              {t.variables.map((v) => (
                                <code key={v} className="rounded-sm bg-[#E6F1FA] px-1.5 py-0.5 font-mono text-[10px] text-link-hover">
                                  {`{${v}}`}
                                </code>
                              ))}
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-2.5">
                          <span
                            className="inline-flex items-center gap-1.5 rounded-pill px-2.5 py-0.5 text-[11px] font-semibold"
                            style={{ background: status.bg, color: status.fg }}
                          >
                            {status.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          <div className="border-t border-border bg-surface-muted px-5 py-3 text-[12px] text-muted">
            <i className="fas fa-info-circle mr-1.5 text-link-hover" />
            New templates need Meta approval and are added by Doctor Kart support. Contact us to request one.
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
