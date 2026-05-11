"use client";

import * as Tabs from "@radix-ui/react-tabs";
import Link from "next/link";
import { useMemo, useState } from "react";
import { MedicalAlertsBanner } from "@/components/molecules/MedicalAlertsBanner";
import { PrescriptionDialog } from "@/components/molecules/PrescriptionDialog";
import { RxEntryDialog } from "@/components/molecules/RxEntryDialog";
import { VisitTimelineRow } from "@/components/molecules/VisitTimelineRow";
import { TEL_HREF, waLink } from "@/lib/contact";
import {
  ATTACHMENT_META,
  formatFileSize,
  formatVisitDate,
  type AttachmentKind,
  type Chart,
  type Prescription,
  type VisitAttachment,
} from "@/lib/patient-history-data";

type Props = {
  chart: Chart;
};

const TABS: Array<{ value: string; label: string; icon: string }> = [
  { value: "visits",      label: "Visits",         icon: "fa-history" },
  { value: "files",       label: "Files",          icon: "fa-folder-open" },
  { value: "prescriptions", label: "Prescriptions", icon: "fa-prescription" },
  { value: "communication", label: "Communication", icon: "fa-comments" },
  { value: "billing",     label: "Billing",        icon: "fa-rupee-sign" },
];

const LANG_PILL: Record<"EN" | "HI" | "OR", { bg: string; fg: string; label: string }> = {
  EN: { bg: "#F4F5F7", fg: "#575757", label: "English" },
  HI: { bg: "#FFF1D6", fg: "#7a5c2b", label: "हिंदी" },
  OR: { bg: "#E6F1FA", fg: "#0E5087", label: "ଓଡ଼ିଆ" },
};

const TAG_COLOR: Record<string, { bg: string; fg: string }> = {
  "VIP":         { bg: "#FFE7EC", fg: "#EE344E" },
  "Root canal":  { bg: "#E6F1FA", fg: "#0168B3" },
  "New":         { bg: "#E6F4EC", fg: "#3a8b5e" },
  "No-show":     { bg: "#FFF1D6", fg: "#7a5c2b" },
  "Implants":    { bg: "#E6F1FA", fg: "#0E5087" },
  "Pediatric":   { bg: "#F4E5FA", fg: "#6b3aa1" },
  "Braces":      { bg: "#FFF1D6", fg: "#7a5c2b" },
};

export function PatientChart({ chart }: Props) {
  const { patient, medicalHistory, visits, communications, billing } = chart;
  const [openRx, setOpenRx] = useState<Prescription | null>(null);
  const [fileFilter, setFileFilter] = useState<AttachmentKind | "all">("all");

  // Rx added in this session via RxEntryDialog. Mock-only — wiped on refresh.
  const [newPrescriptions, setNewPrescriptions] = useState<Prescription[]>([]);

  const allFiles = useMemo(() => {
    return visits
      .flatMap((v) => v.attachments.map((a) => ({ ...a, visitDate: v.appointment.date, service: v.appointment.service })))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [visits]);

  const filteredFiles = useMemo(() => {
    return fileFilter === "all" ? allFiles : allFiles.filter((f) => f.kind === fileFilter);
  }, [allFiles, fileFilter]);

  const allPrescriptions = useMemo(() => {
    const existing = visits.flatMap((v) =>
      v.prescriptions.map((rx) => ({ ...rx, visitDate: v.appointment.date, service: v.appointment.service })),
    );
    // Newly-added Rx aren't linked to an existing visit; surface them with a clear marker.
    const fresh = newPrescriptions.map((rx) => ({
      ...rx,
      visitDate: rx.createdAt.slice(0, 10),
      service: "Newly added",
    }));
    return [...fresh, ...existing].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [visits, newPrescriptions]);

  const lang = LANG_PILL[patient.language];
  const phoneDigits = patient.phone.replace(/\D/g, "");

  return (
    <div className="px-5 pt-5 md:px-8 md:pt-6">
      {/* Breadcrumb */}
      <div className="mb-3 text-[12px] text-muted">
        <Link href="/admin/patients" className="text-link-hover no-underline">Patients</Link>
        <i className="fas fa-chevron-right mx-1.5 text-[9px] text-[#cdd9e4]" />
        <span>{patient.name}</span>
      </div>

      {/* Header card */}
      <div className="rounded-[12px] border border-border bg-white p-5">
        <div className="flex flex-wrap items-start gap-4">
          <span
            className="grid h-16 w-16 flex-none place-items-center rounded-pill text-[22px] font-semibold"
            style={{ background: patient.avatarBg, color: patient.avatarFg }}
          >
            {patient.initials}
          </span>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-[22px] font-semibold leading-7 text-heading md:text-[24px]">
                {patient.name}
              </h1>
              {patient.verified && (
                <span className="inline-flex items-center gap-1 rounded-pill bg-[#E6F1FA] px-2 py-0.5 text-[11px] font-semibold text-link-hover">
                  <i className="fas fa-shield-alt text-[9px]" />
                  Verified
                </span>
              )}
              <span
                className="rounded-sm px-2 py-0.5 text-[11px] font-semibold"
                style={{ background: lang.bg, color: lang.fg }}
                title={lang.label}
              >
                {patient.language}
              </span>
            </div>

            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-muted">
              <span>
                <i className="fas fa-id-card mr-1.5 text-[11px] text-[#9aa9b8]" />
                <code className="font-mono text-[11px]">{patient.id}</code>
              </span>
              <span>
                <i className="fas fa-user mr-1.5 text-[11px] text-[#9aa9b8]" />
                {patient.age} yrs · {patient.gender === "F" ? "Female" : patient.gender === "M" ? "Male" : "Other"}
              </span>
              <a href={TEL_HREF} className="no-underline hover:text-link-hover">
                <i className="fas fa-phone mr-1.5 text-[11px] text-[#9aa9b8]" />
                {patient.phone}
                {patient.whatsappOptIn && (
                  <i className="fab fa-whatsapp ml-1.5 text-[13px] text-[#25D366]" />
                )}
              </a>
              <span>
                <i className="fas fa-calendar-plus mr-1.5 text-[11px] text-[#9aa9b8]" />
                Patient since {formatVisitDate(patient.registeredOn)}
              </span>
            </div>

            {patient.tags.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {patient.tags.map((t) => {
                  const c = TAG_COLOR[t] ?? { bg: "#F4F5F7", fg: "#575757" };
                  return (
                    <span
                      key={t}
                      className="rounded-pill px-2 py-0.5 text-[11px] font-semibold"
                      style={{ background: c.bg, color: c.fg }}
                    >
                      {t}
                    </span>
                  );
                })}
              </div>
            )}
          </div>

          {/* Quick action cluster */}
          <div className="flex flex-wrap gap-2">
            <Link
              href={`/book?patient=${patient.id}`}
              className="inline-flex items-center gap-2 rounded-md bg-cta px-3.5 py-2 text-[13px] font-medium text-cta-fg no-underline hover:bg-[#d92843]"
            >
              <i className="fas fa-calendar-plus text-[11px]" /> New appointment
            </Link>
            <a
              href={waLink(`Hi ${patient.name},`)}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-md border border-border bg-white px-3 py-2 text-[13px] font-medium text-heading no-underline hover:border-[#25D366]"
            >
              <i className="fab fa-whatsapp text-[12px] text-[#25D366]" /> WhatsApp
            </a>
            <RxEntryDialog
              patientId={patient.id}
              patientName={patient.name}
              onSaved={(rx) => setNewPrescriptions((prev) => [rx, ...prev])}
              trigger={
                <button
                  type="button"
                  className="inline-flex cursor-pointer items-center gap-2 rounded-md border-[1.5px] border-cta bg-white px-3 py-2 text-[13px] font-medium text-cta hover:bg-cta hover:text-white"
                >
                  <i className="fas fa-prescription text-[11px]" /> Add Rx
                </button>
              }
            />
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-md border border-border bg-white px-3 py-2 text-[13px] font-medium text-heading hover:border-link-hover"
            >
              <i className="fas fa-upload text-[11px]" /> Upload file
            </button>
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-md border border-border bg-white px-3 py-2 text-[13px] font-medium text-heading hover:border-link-hover"
            >
              <i className="fas fa-notes-medical text-[11px]" /> Add note
            </button>
          </div>
        </div>

        {/* Vitals row */}
        <div className="mt-4 grid grid-cols-2 gap-3 border-t border-border pt-4 sm:grid-cols-4">
          <Vital label="Total visits"  value={String(visits.length)} icon="fa-tooth" />
          <Vital label="Last visit"    value={visits[0] ? formatVisitDate(visits[0].appointment.date) : "—"} icon="fa-calendar-check" />
          <Vital label="Lifetime value" value={`₹${billing.lifetimeValue.toLocaleString("en-IN")}`} icon="fa-rupee-sign" />
          <Vital
            label="Outstanding"
            value={billing.outstanding === 0 ? "Settled" : `₹${billing.outstanding.toLocaleString("en-IN")}`}
            icon="fa-wallet"
            accent={billing.outstanding > 0 ? "cta" : "ok"}
          />
        </div>
      </div>

      {/* Medical alerts */}
      <div className="mt-4">
        <MedicalAlertsBanner history={medicalHistory} />
      </div>

      {/* Tabs */}
      <Tabs.Root defaultValue="visits" className="mt-5">
        <Tabs.List
          aria-label="Patient chart sections"
          className="-mx-1 mb-4 flex gap-1 overflow-x-auto border-b border-border px-1 pb-px"
        >
          {TABS.map((t) => (
            <Tabs.Trigger
              key={t.value}
              value={t.value}
              className="inline-flex cursor-pointer items-center gap-1.5 whitespace-nowrap border-b-2 border-transparent px-3 py-2 text-[13px] font-medium text-muted transition-colors hover:text-heading data-[state=active]:border-cta data-[state=active]:text-link-hover"
            >
              <i className={`fas ${t.icon} text-[12px]`} />
              {t.label}
            </Tabs.Trigger>
          ))}
        </Tabs.List>

        {/* VISITS */}
        <Tabs.Content value="visits" className="focus:outline-none">
          {visits.length === 0 ? (
            <EmptyState icon="fa-history" label="No visits yet" hint="When this patient's first appointment is marked completed, it'll show up here." />
          ) : (
            <div className="flex flex-col gap-3">
              {visits.map((v, i) => (
                <VisitTimelineRow
                  key={v.appointment.id}
                  visit={v}
                  defaultOpen={i === 0}
                  onOpenPrescription={setOpenRx}
                />
              ))}
            </div>
          )}
        </Tabs.Content>

        {/* FILES */}
        <Tabs.Content value="files" className="focus:outline-none">
          <div className="mb-3 flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => setFileFilter("all")}
              className={
                "rounded-pill px-3 py-1.5 text-[12px] font-medium transition-colors " +
                (fileFilter === "all"
                  ? "bg-brand text-white"
                  : "border border-border bg-white text-heading hover:border-link-hover")
              }
            >
              All <span className={fileFilter === "all" ? "text-white/80" : "text-[#9aa9b8]"}> · {allFiles.length}</span>
            </button>
            {(Object.entries(ATTACHMENT_META) as [AttachmentKind, typeof ATTACHMENT_META[AttachmentKind]][]).map(([kind, meta]) => {
              const count = allFiles.filter((f) => f.kind === kind).length;
              if (count === 0) return null;
              const active = fileFilter === kind;
              return (
                <button
                  key={kind}
                  type="button"
                  onClick={() => setFileFilter(kind)}
                  className={
                    "inline-flex items-center gap-1.5 rounded-pill px-3 py-1.5 text-[12px] font-medium transition-colors " +
                    (active ? "bg-brand text-white" : "border border-border bg-white text-heading hover:border-link-hover")
                  }
                >
                  <i className={`fas ${meta.icon} text-[10px]`} />
                  {meta.label}
                  <span className={active ? "text-white/80" : "text-[#9aa9b8]"}>· {count}</span>
                </button>
              );
            })}
          </div>

          {filteredFiles.length === 0 ? (
            <EmptyState icon="fa-folder-open" label="No files yet" hint="Upload X-rays, prescriptions or receipts from any visit." />
          ) : (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {filteredFiles.map((f) => <FileCard key={f.id} file={f} />)}
            </div>
          )}
        </Tabs.Content>

        {/* PRESCRIPTIONS */}
        <Tabs.Content value="prescriptions" className="focus:outline-none">
          <div className="mb-3 flex items-center justify-between">
            <div className="text-[13px] text-muted">
              <strong className="text-heading">{allPrescriptions.length}</strong> on file
              {newPrescriptions.length > 0 && (
                <span className="ml-2 inline-flex items-center gap-1 rounded-pill bg-[#E6F4EC] px-2 py-0.5 text-[11px] font-semibold text-[#3a8b5e]">
                  <i className="fas fa-circle text-[6px]" />
                  {newPrescriptions.length} added today
                </span>
              )}
            </div>
            <RxEntryDialog
              patientId={patient.id}
              patientName={patient.name}
              onSaved={(rx) => setNewPrescriptions((prev) => [rx, ...prev])}
              trigger={
                <button
                  type="button"
                  className="inline-flex cursor-pointer items-center gap-2 rounded-md bg-cta px-4 py-2 text-[13px] font-medium text-cta-fg hover:bg-[#d92843]"
                >
                  <i className="fas fa-plus text-[11px]" /> Add prescription
                </button>
              }
            />
          </div>
          {allPrescriptions.length === 0 ? (
            <EmptyState icon="fa-prescription" label="No prescriptions yet" hint="Use the Add prescription button above to capture a paper Rx or start from a template." />
          ) : (
            <div className="overflow-hidden rounded-[12px] border border-border bg-white">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-border bg-surface-muted">
                    <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-[#9aa9b8]">Date</th>
                    <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-[#9aa9b8]">Doctor</th>
                    <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-[#9aa9b8]">Medications</th>
                    <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-[#9aa9b8]">Visit</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {allPrescriptions.map((rx) => (
                    <tr key={rx.id} className="border-b border-[#F4F5F7] last:border-b-0">
                      <td className="px-3 py-3 text-[13px] text-heading">{formatVisitDate(rx.visitDate)}</td>
                      <td className="px-3 py-3 text-[13px] text-heading">{rx.doctorName}</td>
                      <td className="px-3 py-3 text-[13px] text-muted">
                        {rx.items.slice(0, 2).map((m) => m.medication).join(" · ")}
                        {rx.items.length > 2 && <span className="text-[11px] text-[#9aa9b8]"> +{rx.items.length - 2} more</span>}
                      </td>
                      <td className="px-3 py-3 text-[12px] text-muted">{rx.service}</td>
                      <td className="px-3 py-3 pr-3 text-right">
                        <button
                          type="button"
                          onClick={() => setOpenRx(rx)}
                          className="inline-flex items-center gap-1.5 rounded-md border border-border bg-white px-3 py-1 text-[12px] font-medium text-link-hover hover:border-link-hover"
                        >
                          Open <i className="fas fa-arrow-right text-[10px]" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Tabs.Content>

        {/* COMMUNICATION */}
        <Tabs.Content value="communication" className="focus:outline-none">
          {communications.length === 0 ? (
            <EmptyState icon="fa-comments" label="No conversations yet" hint="WhatsApp threads with this patient will appear here." />
          ) : (
            <div className="overflow-hidden rounded-[12px] border border-border bg-white">
              {communications.map((c, i) => (
                <Link
                  key={c.threadId + i}
                  href="/admin/messages"
                  className="flex items-center gap-3 border-b border-[#F4F5F7] px-4 py-3.5 no-underline last:border-b-0 hover:bg-[#FAFAFB]"
                >
                  <span className="grid h-9 w-9 flex-none place-items-center rounded-pill bg-[#E6F4EC] text-[14px] text-[#25D366]">
                    <i className="fab fa-whatsapp" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <code className="rounded-sm bg-[#F4F5F7] px-1.5 py-0.5 font-mono text-[10px] text-muted">{c.lastTemplate}</code>
                      <span className="text-[11px] text-[#9aa9b8]">{c.ts}</span>
                    </div>
                    <div className="mt-0.5 truncate text-[13px] text-heading">{c.preview}</div>
                  </div>
                  <i className="fas fa-arrow-right text-[11px] text-muted" />
                </Link>
              ))}
              <div className="px-4 py-3 text-center">
                <Link href="/admin/messages" className="text-[13px] text-link-hover no-underline">
                  Open full inbox <i className="fas fa-arrow-right ml-1 text-[10px]" />
                </Link>
              </div>
            </div>
          )}
        </Tabs.Content>

        {/* BILLING */}
        <Tabs.Content value="billing" className="focus:outline-none">
          <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <BillingCard label="Lifetime value" value={`₹${billing.lifetimeValue.toLocaleString("en-IN")}`} accent="ok" />
            <BillingCard
              label="Outstanding"
              value={billing.outstanding === 0 ? "Settled" : `₹${billing.outstanding.toLocaleString("en-IN")}`}
              accent={billing.outstanding > 0 ? "cta" : "muted"}
            />
            <BillingCard label="Last 90 days" value={`₹${billing.last90Days.toLocaleString("en-IN")}`} accent="muted" />
          </div>

          {billing.receipts.length === 0 ? (
            <EmptyState icon="fa-receipt" label="No receipts on file" hint="Receipts upload during a visit will appear here." />
          ) : (
            <div className="overflow-hidden rounded-[12px] border border-border bg-white">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-border bg-surface-muted">
                    <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-[#9aa9b8]">Date</th>
                    <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-[#9aa9b8]">Receipt</th>
                    <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-[#9aa9b8]">Note</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {billing.receipts.map((r) => (
                    <tr key={r.id} className="border-b border-[#F4F5F7] last:border-b-0">
                      <td className="px-3 py-3 text-[13px] text-heading">{formatVisitDate(r.createdAt.slice(0, 10))}</td>
                      <td className="px-3 py-3 text-[13px] text-heading">{r.fileName}</td>
                      <td className="px-3 py-3 text-[12px] text-muted">{r.notes ?? "—"}</td>
                      <td className="px-3 py-3 pr-3 text-right">
                        <button
                          type="button"
                          className="inline-flex items-center gap-1.5 rounded-md border border-border bg-white px-3 py-1 text-[12px] font-medium text-link-hover hover:border-link-hover"
                        >
                          <i className="fas fa-download text-[10px]" /> Download
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Tabs.Content>
      </Tabs.Root>

      <PrescriptionDialog prescription={openRx} patientName={patient.name} onClose={() => setOpenRx(null)} />

      {/* Spacer to keep last row above the mobile tab bar */}
      <div className="h-12" />
    </div>
  );
}

function Vital({
  label,
  value,
  icon,
  accent,
}: {
  label: string;
  value: string;
  icon: string;
  accent?: "cta" | "ok";
}) {
  const valueColor =
    accent === "cta" ? "text-cta" : accent === "ok" ? "text-[#3a8b5e]" : "text-heading";
  return (
    <div className="flex items-center gap-2.5">
      <span className="grid h-8 w-8 flex-none place-items-center rounded-md bg-[#E6F1FA] text-[12px] text-brand">
        <i className={`fas ${icon}`} />
      </span>
      <div>
        <div className="text-[10px] font-semibold uppercase tracking-[0.06em] text-[#9aa9b8]">{label}</div>
        <div className={"mt-0.5 text-[14px] font-semibold " + valueColor}>{value}</div>
      </div>
    </div>
  );
}

function EmptyState({ icon, label, hint }: { icon: string; label: string; hint: string }) {
  return (
    <div className="grid place-items-center rounded-[12px] border border-border bg-white px-6 py-16 text-center">
      <span className="grid h-12 w-12 place-items-center rounded-pill bg-surface-muted text-[18px] text-[#cdd9e4]">
        <i className={`fas ${icon}`} />
      </span>
      <div className="mt-3 text-[14px] font-semibold text-heading">{label}</div>
      <div className="mt-1 text-[12px] text-muted">{hint}</div>
    </div>
  );
}

function FileCard({ file }: { file: VisitAttachment & { visitDate: string; service: string } }) {
  const meta = ATTACHMENT_META[file.kind];
  return (
    <a
      href="#"
      className="flex items-start gap-3 rounded-md border border-border bg-white p-3 no-underline transition-colors hover:border-link-hover"
    >
      <span
        className="grid h-10 w-10 flex-none place-items-center rounded-md text-[14px]"
        style={{ background: meta.bg, color: meta.fg }}
      >
        <i className={`fas ${meta.icon}`} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[13px] font-medium text-heading">{file.fileName}</div>
        <div className="mt-0.5 text-[11px] text-muted">
          {meta.label} · {formatFileSize(file.fileSizeBytes)}
        </div>
        <div className="mt-0.5 text-[11px] text-[#9aa9b8]">
          {formatVisitDate(file.visitDate)} · {file.service}
        </div>
      </div>
      <i className="fas fa-download mt-1 text-[11px] text-[#9aa9b8]" />
    </a>
  );
}

function BillingCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent: "ok" | "cta" | "muted";
}) {
  const fg = accent === "cta" ? "text-cta" : accent === "ok" ? "text-[#3a8b5e]" : "text-heading";
  return (
    <div className="rounded-[12px] border border-border bg-white p-4">
      <div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[#9aa9b8]">{label}</div>
      <div className={"mt-1 text-[22px] font-bold leading-7 " + fg}>{value}</div>
    </div>
  );
}
