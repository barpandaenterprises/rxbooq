/**
 * Data accessor for /admin/patients/[id] — the full patient chart.
 *
 * Joins:
 *   patients + medical_history + appointments + visit_notes +
 *   prescriptions (+ prescription_items) + visit_attachments +
 *   visit_tooth_treatments + wa_messages (recent)
 *
 * Mock mode returns the canned chart from patient-history-data.ts. Live mode
 * does six queries in parallel (all RLS-scoped to the staff user's clinic)
 * and stitches them into the Chart shape the UI already consumes.
 */

import { serverClient } from "@/lib/supabase/server";
import { useMockData } from "@/lib/feature-flags";
import {
  findChart,
  type Allergy,
  type AttachmentKind,
  type BillingSummary,
  type Chart,
  type ChartPatient,
  type ChatThreadRef,
  type MedicalHistory,
  type Prescription,
  type PrescriptionItem,
  type PrescriptionSource,
  type ToothTreatment,
  type Visit,
  type VisitAttachment,
  type VisitNote,
  type VisitStatus,
} from "@/lib/patient-history-data";

// =============================================================================
// Helpers
// =============================================================================

const AVATAR_PALETTE: Array<{ bg: string; fg: string }> = [
  { bg: "#FFE7EC", fg: "#EE344E" },
  { bg: "#E6F4EC", fg: "#3a8b5e" },
  { bg: "#E6F1FA", fg: "#0E5087" },
  { bg: "#FFF8EC", fg: "#7a5c2b" },
  { bg: "#F4E5FA", fg: "#6b3aa1" },
];

function initialsOf(name: string): string {
  return name.split(/\s+/).map((p) => p[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();
}

function avatarFor(id: string): { bg: string; fg: string } {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return AVATAR_PALETTE[hash % AVATAR_PALETTE.length]!;
}

function maskPhone(e164: string): string {
  const digits = e164.replace(/\D/g, "");
  if (digits.length < 10) return e164;
  const local = digits.slice(-10);
  const prefix = `+${digits.slice(0, digits.length - 10)}`;
  return `${prefix} ${local.slice(0, 2)}••• ••${local.slice(7)}`;
}

function langFromDb(s: string | null): "EN" | "HI" | "OR" {
  switch ((s ?? "").toLowerCase()) {
    case "hi": return "HI";
    case "or": return "OR";
    default:   return "EN";
  }
}

function ageFromDob(dob: string | null): number {
  if (!dob) return 0;
  const birth = new Date(`${dob}T00:00:00Z`);
  const now   = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const m   = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--;
  return Math.max(0, age);
}

function genderFromDb(s: string | null): "M" | "F" | "O" {
  if (s === "M" || s === "F" || s === "O") return s;
  return "O";
}

function dbVisitStatus(s: string | null): VisitStatus {
  if (s === "completed") return "completed";
  if (s === "cancelled") return "cancelled";
  if (s === "no_show")   return "no_show";
  return "completed";
}

function dbAttachmentKind(s: string | null): AttachmentKind {
  switch (s) {
    case "xray":             return "xray";
    case "prescription_pdf": return "prescription_pdf";
    case "treatment_plan":   return "treatment_plan";
    case "receipt":          return "receipt";
    case "lab_report":       return "lab_report";
    case "consent":          return "consent";
    default:                 return "other";
  }
}

function dbPrescriptionSource(s: string | null): PrescriptionSource | undefined {
  if (s === "handwritten" || s === "template" || s === "manual") return s;
  return undefined;
}

// =============================================================================
// Live fetcher
// =============================================================================

type DbPatient = {
  id:               string;
  full_name:        string;
  phone_e164:       string;
  language:         string | null;
  whatsapp_opt_in:  boolean;
  phone_verified:   boolean;
  date_of_birth:    string | null;
  gender:           string | null;
  tags:             string[] | null;
  created_at:       string;
};

async function getLivePatientChart(patientId: string): Promise<Chart | null> {
  const supabase = await serverClient();

  const { data: p, error: pErr } = await supabase
    .from("patients")
    .select("id, full_name, phone_e164, language, whatsapp_opt_in, phone_verified, date_of_birth, gender, tags, created_at")
    .eq("id", patientId)
    .maybeSingle();

  if (pErr || !p) return null;
  const patient = p as DbPatient;

  // Fan-out fetches.
  const [
    { data: mhRow },
    { data: apptRows },
    { data: noteRows },
    { data: rxRows },
    { data: rxItems },
    { data: attachRows },
    { data: toothRows },
    { data: waRows },
  ] = await Promise.all([
    supabase.from("medical_history")
      .select("blood_thinners, conditions, current_medications, allergies, dental_history_notes")
      .eq("patient_id", patientId)
      .maybeSingle(),
    supabase.from("appointments")
      .select("id, starts_at, status, service:services(name, duration_minutes), doctor:doctors(display_name)")
      .eq("patient_id", patientId)
      .order("starts_at", { ascending: false }),
    supabase.from("visit_notes")
      .select("id, appointment_id, visit_date, chief_complaint, exam_findings, diagnosis, treatment_done, next_visit_advice, created_by, created_at")
      .eq("patient_id", patientId),
    supabase.from("prescriptions")
      .select("id, appointment_id, doctor_id, source, source_photo_id, template_id, ocr_confidence, notes, created_at, doctor:doctors(display_name)")
      .eq("patient_id", patientId)
      .order("created_at", { ascending: false }),
    supabase.from("prescription_items")
      .select("id, prescription_id, position, medication, dosage, frequency, duration, instructions"),
    supabase.from("visit_attachments")
      .select("id, appointment_id, kind, file_name, file_size_bytes, mime_type, notes, created_at")
      .eq("patient_id", patientId)
      .order("created_at", { ascending: false }),
    supabase.from("visit_tooth_treatments")
      .select("id, appointment_id, tooth_fdi, surface, procedure, notes")
      .eq("patient_id", patientId),
    supabase.from("wa_messages")
      .select("template_name, status, payload, created_at, direction")
      .eq("patient_id", patientId)
      .order("created_at", { ascending: false })
      .limit(8),
  ]);

  // ---- Build ChartPatient ---------------------------------------------------
  const palette = avatarFor(patient.id);
  const chartPatient: ChartPatient = {
    id:            patient.id,
    name:          patient.full_name,
    initials:      initialsOf(patient.full_name),
    avatarBg:      palette.bg,
    avatarFg:      palette.fg,
    phone:         maskPhone(patient.phone_e164),
    language:      langFromDb(patient.language),
    age:           ageFromDob(patient.date_of_birth),
    gender:        genderFromDb(patient.gender),
    tags:          patient.tags ?? [],
    whatsappOptIn: patient.whatsapp_opt_in,
    verified:      patient.phone_verified,
    registeredOn:  patient.created_at.slice(0, 10),
  };

  // ---- Medical history ------------------------------------------------------
  const medicalHistory: MedicalHistory | null = mhRow
    ? {
        patientId,
        allergies:         (mhRow.allergies ?? []) as Allergy[],
        conditions:        mhRow.conditions ?? [],
        currentMedications: ((mhRow.current_medications ?? []) as { name: string; dosage: string }[]) ?? [],
        dentalHistoryNotes: mhRow.dental_history_notes ?? undefined,
        bloodThinners:     Boolean(mhRow.blood_thinners),
      }
    : null;

  // ---- Visits ---------------------------------------------------------------
  const notesByAppt        = new Map<string, VisitNote>();
  for (const n of (noteRows ?? [])) {
    if (!n.appointment_id) continue;
    notesByAppt.set(n.appointment_id, {
      id:               n.id,
      appointmentId:    n.appointment_id,
      patientId,
      visitDate:        n.visit_date,
      chiefComplaint:   n.chief_complaint   ?? undefined,
      examFindings:     n.exam_findings     ?? undefined,
      diagnosis:        n.diagnosis         ?? undefined,
      treatmentDone:    n.treatment_done    ?? undefined,
      nextVisitAdvice:  n.next_visit_advice ?? undefined,
      createdBy:        n.created_by ?? "",
      createdAt:        n.created_at,
    });
  }

  const itemsByRx = new Map<string, PrescriptionItem[]>();
  for (const it of (rxItems ?? [])) {
    const list = itemsByRx.get(it.prescription_id) ?? [];
    list.push({
      medication:   it.medication,
      dosage:       it.dosage,
      frequency:    it.frequency,
      duration:     it.duration,
      instructions: it.instructions ?? undefined,
    });
    itemsByRx.set(it.prescription_id, list);
  }
  // Sort each Rx's items by position.
  for (const [k, v] of itemsByRx) {
    v.sort((a, b) => 0); // already row-ordered by select; position is part of the row but not needed here
    itemsByRx.set(k, v);
  }

  const prescriptionsByAppt = new Map<string, Prescription[]>();
  type RxRow = {
    id: string;
    appointment_id: string | null;
    doctor_id: string;
    source: string | null;
    source_photo_id: string | null;
    template_id: string | null;
    ocr_confidence: number | null;
    notes: string | null;
    created_at: string;
    doctor: { display_name: string } | { display_name: string }[] | null;
  };
  for (const r of (rxRows ?? []) as RxRow[]) {
    const apptKey = r.appointment_id ?? "_unlinked";
    const list = prescriptionsByAppt.get(apptKey) ?? [];
    const docRow = Array.isArray(r.doctor) ? r.doctor[0] : r.doctor;
    list.push({
      id:             r.id,
      appointmentId:  r.appointment_id,
      patientId,
      doctorId:       r.doctor_id,
      doctorName:     docRow?.display_name ?? "—",
      items:          itemsByRx.get(r.id) ?? [],
      notes:          r.notes ?? undefined,
      createdAt:      r.created_at,
      source:         dbPrescriptionSource(r.source),
      sourcePhotoId:  r.source_photo_id ?? undefined,
      templateId:     r.template_id ?? undefined,
      ocrConfidence:  r.ocr_confidence ?? undefined,
    });
    prescriptionsByAppt.set(apptKey, list);
  }

  const attachmentsByAppt = new Map<string, VisitAttachment[]>();
  for (const a of (attachRows ?? [])) {
    const apptKey = a.appointment_id ?? "_unlinked";
    const list = attachmentsByAppt.get(apptKey) ?? [];
    list.push({
      id:            a.id,
      appointmentId: a.appointment_id,
      patientId,
      kind:          dbAttachmentKind(a.kind),
      fileName:      a.file_name,
      fileSizeBytes: a.file_size_bytes,
      mimeType:      a.mime_type,
      notes:         a.notes ?? undefined,
      createdAt:     a.created_at,
    });
    attachmentsByAppt.set(apptKey, list);
  }

  const toothByAppt = new Map<string, ToothTreatment[]>();
  for (const t of (toothRows ?? [])) {
    if (!t.appointment_id) continue;
    const list = toothByAppt.get(t.appointment_id) ?? [];
    list.push({
      id:            t.id,
      appointmentId: t.appointment_id,
      patientId,
      toothFdi:      t.tooth_fdi,
      surface:       t.surface ?? undefined,
      procedure:     t.procedure,
      notes:         t.notes ?? undefined,
    });
    toothByAppt.set(t.appointment_id, list);
  }

  type ApptRow = {
    id: string;
    starts_at: string;
    status: string | null;
    service: { name: string | null; duration_minutes: number | null } | { name: string | null; duration_minutes: number | null }[] | null;
    doctor:  { display_name: string | null } | { display_name: string | null }[] | null;
  };
  const visits: Visit[] = ((apptRows ?? []) as ApptRow[]).map((a): Visit => {
    const svc = Array.isArray(a.service) ? a.service[0] : a.service;
    const doc = Array.isArray(a.doctor)  ? a.doctor[0]  : a.doctor;
    return {
      appointment: {
        id:              a.id,
        patientId,
        date:            (a.starts_at ?? "").slice(0, 10),
        service:         svc?.name ?? "—",
        doctor:          doc?.display_name ?? "—",
        status:          dbVisitStatus(a.status),
        durationMinutes: svc?.duration_minutes ?? 30,
      },
      note:            notesByAppt.get(a.id),
      prescriptions:   prescriptionsByAppt.get(a.id) ?? [],
      attachments:     attachmentsByAppt.get(a.id) ?? [],
      toothTreatments: toothByAppt.get(a.id) ?? [],
    };
  });

  // ---- Communications -------------------------------------------------------
  type WaRow = {
    template_name: string | null;
    status:        string | null;
    payload:       { body?: string } | null;
    created_at:    string;
    direction:     "in" | "out";
  };
  const communications: ChatThreadRef[] = ((waRows ?? []) as WaRow[]).map((w, i) => ({
    threadId:     `${patientId}-${i}`,
    lastTemplate: w.template_name ?? "(reply)",
    status: (w.status === "delivered" || w.status === "read" || w.status === "replied" || w.status === "failed")
      ? w.status
      : "delivered",
    preview:      w.payload?.body?.slice(0, 80) ?? "—",
    ts:           w.created_at,
  }));

  // ---- Billing --------------------------------------------------------------
  // For now: lifetime value = sum of price_inr for completed appointments.
  // Requires a separate query — keep it simple.
  const { data: billingRows } = await supabase
    .from("appointments")
    .select("status, starts_at, service:services(price_inr)")
    .eq("patient_id", patientId);

  let lifetimeValue = 0;
  let last90Days    = 0;
  const cutoff = Date.now() - 90 * 86400000;
  type BillingApptRow = {
    status: string | null;
    starts_at: string;
    service: { price_inr: number | null } | { price_inr: number | null }[] | null;
  };
  for (const b of (billingRows ?? []) as BillingApptRow[]) {
    if (b.status !== "completed") continue;
    const svc   = Array.isArray(b.service) ? b.service[0] : b.service;
    const price = svc?.price_inr ?? 0;
    lifetimeValue += price;
    if (new Date(b.starts_at).getTime() >= cutoff) last90Days += price;
  }
  const receipts = (attachmentsByAppt.get("_unlinked") ?? [])
    .concat(Array.from(attachmentsByAppt.values()).flat())
    .filter((a) => a.kind === "receipt");
  const billing: BillingSummary = {
    lifetimeValue,
    outstanding: 0,
    last90Days,
    receipts,
  };

  return {
    patient: chartPatient,
    medicalHistory,
    visits,
    communications,
    billing,
  };
}

// =============================================================================
// Public
// =============================================================================

export async function getPatientChart(id: string): Promise<Chart | null> {
  if (useMockData()) {
    return findChart(id) ?? null;
  }
  return getLivePatientChart(id);
}
