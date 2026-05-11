"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { formatVisitDate, type Prescription } from "@/lib/patient-history-data";

type Props = {
  prescription: Prescription | null;
  patientName?: string;
  onClose: () => void;
};

export function PrescriptionDialog({ prescription, patientName, onClose }: Props) {
  const open = prescription !== null;

  return (
    <Dialog.Root open={open} onOpenChange={(v) => !v && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-[rgba(16,24,40,0.55)]" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-[560px] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-lg bg-white shadow-[0_24px_60px_-12px_rgba(16,24,40,0.30)] focus:outline-none">
          {prescription && (
            <>
              <div className="flex items-start justify-between gap-3 border-b border-border px-6 py-4">
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[#9aa9b8]">
                    Prescription · {formatVisitDate(prescription.createdAt.slice(0, 10))}
                  </div>
                  <Dialog.Title className="mt-0.5 text-[18px] font-semibold leading-6 text-heading">
                    {patientName ?? "Patient"}
                  </Dialog.Title>
                  <Dialog.Description className="mt-0.5 text-[13px] text-muted">
                    {prescription.doctorName} · Rx #{prescription.id}
                  </Dialog.Description>
                </div>
                <Dialog.Close
                  aria-label="Close"
                  className="grid h-8 w-8 cursor-pointer place-items-center rounded-pill bg-surface-muted text-muted hover:bg-border"
                >
                  <i className="fas fa-times text-[12px]" />
                </Dialog.Close>
              </div>

              <div className="max-h-[60vh] overflow-y-auto px-6 py-4">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b border-border bg-surface-muted">
                      <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-[#9aa9b8]">
                        Medication
                      </th>
                      <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-[#9aa9b8]">
                        Dosage
                      </th>
                      <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-[#9aa9b8]">
                        Frequency
                      </th>
                      <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-[#9aa9b8]">
                        Duration
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {prescription.items.map((item, i) => (
                      <tr key={i} className="border-b border-[#F4F5F7] last:border-b-0">
                        <td className="px-3 py-3 text-[13px] font-semibold text-heading">
                          {item.medication}
                          {item.instructions && (
                            <div className="mt-0.5 text-[11px] font-normal text-muted">
                              <i className="fas fa-info-circle mr-1 text-[10px] text-[#9aa9b8]" />
                              {item.instructions}
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-3 text-[13px] text-heading">{item.dosage}</td>
                        <td className="px-3 py-3 text-[13px] text-heading">{item.frequency}</td>
                        <td className="px-3 py-3 text-[13px] text-heading">{item.duration}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {prescription.notes && (
                  <div className="mt-4 rounded-md border border-[#F4D9A8] bg-[#FFF8EC] px-3.5 py-2.5 text-[12px] leading-[18px] text-[#7a5c2b]">
                    <i className="fas fa-sticky-note mr-1.5 text-[11px]" />
                    {prescription.notes}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2.5 border-t border-border bg-surface-muted px-6 py-3">
                <Dialog.Close className="cursor-pointer rounded-md border border-border bg-white px-3.5 py-1.5 text-[13px] font-medium text-muted">
                  Close
                </Dialog.Close>
                <button
                  type="button"
                  className="ml-auto inline-flex items-center gap-2 rounded-md border-[1.5px] border-link-hover bg-white px-3.5 py-1.5 text-[13px] font-medium text-link-hover hover:bg-link-hover hover:text-white"
                >
                  <i className="fas fa-print text-[11px]" /> Print
                </button>
                <button
                  type="button"
                  className="inline-flex items-center gap-2 rounded-md bg-cta px-3.5 py-1.5 text-[13px] font-medium text-cta-fg hover:bg-[#d92843]"
                >
                  <i className="fab fa-whatsapp text-[12px]" /> Send to patient
                </button>
              </div>
            </>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
