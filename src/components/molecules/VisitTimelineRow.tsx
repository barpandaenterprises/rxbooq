"use client";

import { useState } from "react";
import {
  ATTACHMENT_META,
  formatFileSize,
  formatVisitDate,
  type Prescription,
  type Visit,
  type VisitStatus,
} from "@/lib/patient-history-data";

const STATUS_STYLE: Record<VisitStatus, { bg: string; fg: string; label: string }> = {
  completed: { bg: "#E6F4EC", fg: "#3a8b5e", label: "Completed" },
  cancelled: { bg: "#F4F5F7", fg: "#9aa9b8", label: "Cancelled" },
  no_show:   { bg: "#FFE7EC", fg: "#EE344E", label: "No-show" },
};

type Props = {
  visit: Visit;
  defaultOpen?: boolean;
  onOpenPrescription?: (rx: Prescription) => void;
  /** Hide doctor-facing fields (exam findings, diagnosis) for patient-portal use. */
  patientView?: boolean;
};

export function VisitTimelineRow({ visit, defaultOpen, onOpenPrescription, patientView }: Props) {
  const [open, setOpen] = useState(Boolean(defaultOpen));
  const { appointment, note, prescriptions, attachments, toothTreatments } = visit;
  const statusStyle = STATUS_STYLE[appointment.status];

  return (
    <article
      className="overflow-hidden rounded-[12px] border border-border bg-white shadow-sm"
      style={{ borderLeft: `4px solid ${statusStyle.fg}` }}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-start gap-3.5 px-4 py-3.5 text-left hover:bg-[#FAFAFB]"
      >
        <div className="flex-none rounded-md border border-border bg-surface-muted px-3 py-1.5 text-center">
          <div className="text-[10px] font-semibold uppercase tracking-[0.06em] text-[#9aa9b8]">
            {formatVisitDate(appointment.date).split(",")[0]}
          </div>
          <div className="text-[15px] font-bold leading-[18px] text-heading">
            {appointment.date.slice(8, 10)}
          </div>
          <div className="text-[10px] text-muted">{appointment.date.slice(0, 4)}</div>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className="inline-flex items-center rounded-pill px-2 py-0.5 text-[11px] font-semibold"
              style={{ background: statusStyle.bg, color: statusStyle.fg }}
            >
              {statusStyle.label}
            </span>
            <span className="text-[12px] text-[#9aa9b8]">
              · {appointment.durationMinutes} min
            </span>
          </div>
          <div className="mt-1 text-[15px] font-semibold leading-[20px] text-heading">
            {appointment.service}
          </div>
          <div className="mt-0.5 flex items-center gap-1.5 text-[13px] text-muted">
            <i className="fas fa-user-md text-[11px] text-[#9aa9b8]" />
            {appointment.doctor}
          </div>

          {/* At-a-glance summary line when collapsed */}
          {!open && (
            <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-[#9aa9b8]">
              {note?.diagnosis && (
                <span>
                  <i className="fas fa-stethoscope mr-1" />
                  {note.diagnosis}
                </span>
              )}
              {prescriptions.length > 0 && (
                <span>
                  <i className="fas fa-prescription mr-1" />
                  {prescriptions.length} Rx
                </span>
              )}
              {attachments.length > 0 && (
                <span>
                  <i className="fas fa-paperclip mr-1" />
                  {attachments.length} file{attachments.length === 1 ? "" : "s"}
                </span>
              )}
            </div>
          )}
        </div>

        <i
          className={
            "fas mt-1 flex-none text-[12px] text-muted transition-transform " +
            (open ? "fa-chevron-up" : "fa-chevron-down")
          }
        />
      </button>

      {open && (
        <div className="border-t border-[#F4F5F7] bg-[#FAFBFC] px-4 py-4">
          {/* Note */}
          {note ? (
            <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {note.chiefComplaint && (
                <NoteField icon="fa-comment-medical" label="Chief complaint" value={note.chiefComplaint} />
              )}
              {!patientView && note.examFindings && (
                <NoteField icon="fa-search" label="Exam findings" value={note.examFindings} />
              )}
              {!patientView && note.diagnosis && (
                <NoteField icon="fa-stethoscope" label="Diagnosis" value={note.diagnosis} />
              )}
              {note.treatmentDone && (
                <NoteField icon="fa-tools" label="Treatment done" value={note.treatmentDone} />
              )}
              {note.nextVisitAdvice && (
                <div className="sm:col-span-2">
                  <NoteField icon="fa-arrow-right" label="Next-visit advice" value={note.nextVisitAdvice} />
                </div>
              )}
            </dl>
          ) : (
            <div className="rounded-md border border-dashed border-[#cdd9e4] bg-white px-3.5 py-2.5 text-[12px] text-muted">
              <i className="fas fa-info-circle mr-1.5 text-[#9aa9b8]" />
              No clinical note recorded for this visit.
            </div>
          )}

          {/* Tooth treatments */}
          {toothTreatments.length > 0 && (
            <div className="mt-4">
              <SectionHeader icon="fa-tooth" label="Tooth treatments (FDI)" />
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {toothTreatments.map((t) => (
                  <span
                    key={t.id}
                    title={t.notes}
                    className="inline-flex items-center gap-2 rounded-md border border-[#cdd9e4] bg-white px-2.5 py-1 text-[12px] text-heading"
                  >
                    <span className="grid h-5 w-5 place-items-center rounded-pill bg-brand text-[10px] font-bold text-white">
                      {t.toothFdi}
                    </span>
                    {t.surface && (
                      <code className="font-mono text-[10px] text-muted">{t.surface}</code>
                    )}
                    <span>{t.procedure}</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Prescriptions */}
          {prescriptions.length > 0 && (
            <div className="mt-4">
              <SectionHeader icon="fa-prescription" label={`Prescriptions (${prescriptions.length})`} />
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {prescriptions.map((rx) => (
                  <button
                    key={rx.id}
                    type="button"
                    onClick={() => onOpenPrescription?.(rx)}
                    disabled={!onOpenPrescription}
                    className="inline-flex items-center gap-2 rounded-pill border border-border bg-white px-3 py-1.5 text-[12px] text-heading transition-colors hover:border-link-hover disabled:cursor-default"
                  >
                    <span className="grid h-6 w-6 place-items-center rounded-pill bg-[#E6F1FA] text-[11px] text-link-hover">
                      <i className="fas fa-prescription" />
                    </span>
                    <span className="font-medium">
                      {rx.items[0]?.medication ?? "Rx"}
                      {rx.items.length > 1 && (
                        <span className="ml-1 text-[10px] text-[#9aa9b8]">
                          +{rx.items.length - 1} more
                        </span>
                      )}
                    </span>
                    {onOpenPrescription && (
                      <i className="fas fa-arrow-right text-[9px] text-muted" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Attachments */}
          {attachments.length > 0 && (
            <div className="mt-4">
              <SectionHeader icon="fa-paperclip" label={`Attachments (${attachments.length})`} />
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {attachments.map((f) => {
                  const meta = ATTACHMENT_META[f.kind];
                  return (
                    <a
                      key={f.id}
                      href="#"
                      title={`${f.fileName} · ${formatFileSize(f.fileSizeBytes)}`}
                      className="inline-flex items-center gap-2 rounded-pill border border-border bg-white py-1 pl-1 pr-3 text-[12px] font-medium text-heading no-underline hover:border-link-hover"
                    >
                      <span
                        className="grid h-6 w-6 place-items-center rounded-pill text-[11px]"
                        style={{ background: meta.bg, color: meta.fg }}
                      >
                        <i className={`fas ${meta.icon}`} />
                      </span>
                      <span className="max-w-[180px] truncate">{f.fileName}</span>
                      <i className="fas fa-download text-[10px] text-[#9aa9b8]" />
                    </a>
                  );
                })}
              </div>
            </div>
          )}

          {!patientView && (
            <div className="mt-4 flex flex-wrap gap-2 border-t border-[#F4F5F7] pt-3">
              <button
                type="button"
                className="inline-flex items-center gap-1.5 rounded-md border border-border bg-white px-3 py-1.5 text-[12px] font-medium text-heading hover:border-link-hover"
              >
                <i className="fas fa-pencil-alt text-[10px]" /> Edit note
              </button>
              <button
                type="button"
                className="inline-flex items-center gap-1.5 rounded-md border border-border bg-white px-3 py-1.5 text-[12px] font-medium text-heading hover:border-link-hover"
              >
                <i className="fas fa-upload text-[10px]" /> Attach file
              </button>
              <button
                type="button"
                className="inline-flex items-center gap-1.5 rounded-md border border-border bg-white px-3 py-1.5 text-[12px] font-medium text-heading hover:border-link-hover"
              >
                <i className="fas fa-print text-[10px]" /> Print summary
              </button>
            </div>
          )}
        </div>
      )}
    </article>
  );
}

function SectionHeader({ icon, label }: { icon: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-[#9aa9b8]">
      <i className={`fas ${icon} text-[10px]`} />
      {label}
    </div>
  );
}

function NoteField({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2.5">
      <span className="grid h-7 w-7 flex-none place-items-center rounded-md bg-white text-[12px] text-link-hover">
        <i className={`fas ${icon}`} />
      </span>
      <div className="flex-1">
        <dt className="text-[10px] font-semibold uppercase tracking-[0.06em] text-[#9aa9b8]">{label}</dt>
        <dd className="mt-0.5 text-[13px] leading-[18px] text-heading">{value}</dd>
      </div>
    </div>
  );
}
