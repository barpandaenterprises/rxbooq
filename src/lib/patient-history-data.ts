/**
 * Patient history — demo catalog and accessors.
 *
 * Shapes mirror the eventual Supabase tables (visit_notes, prescriptions,
 * visit_attachments, visit_tooth_treatments, medical_history) so when the
 * data layer is wired, only the file paths change — components stay still.
 */

export type AllergySeverity = "mild" | "moderate" | "severe";

export type Allergy = {
  name: string;
  severity: AllergySeverity;
  notes?: string;
};

export type MedicalHistory = {
  patientId: string;
  allergies: Allergy[];
  conditions: string[];
  currentMedications: { name: string; dosage: string }[];
  dentalHistoryNotes?: string;
  bloodThinners: boolean;
};

export type VisitNote = {
  id: string;
  appointmentId: string | null;
  patientId: string;
  visitDate: string; // YYYY-MM-DD
  chiefComplaint?: string;
  examFindings?: string;
  diagnosis?: string;
  treatmentDone?: string;
  nextVisitAdvice?: string;
  createdBy: string;
  createdAt: string;
};

export type PrescriptionItem = {
  medication: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions?: string;
};

export type PrescriptionSource = "handwritten" | "template" | "manual";

export type Prescription = {
  id: string;
  appointmentId: string | null;
  patientId: string;
  doctorId: string;
  doctorName: string;
  items: PrescriptionItem[];
  notes?: string;
  createdAt: string;
  /** How the Rx was captured. Existing demo entries leave this undefined. */
  source?: PrescriptionSource;
  /** Links to a VisitAttachment when source === 'handwritten'. */
  sourcePhotoId?: string;
  /** Which rx-template was used, for analytics + future fine-tuning. */
  templateId?: string;
  /** OCR confidence (0–1) when source === 'handwritten'. */
  ocrConfidence?: number;
};

export type AttachmentKind =
  | "xray"
  | "prescription_pdf"
  | "treatment_plan"
  | "receipt"
  | "lab_report"
  | "consent"
  | "other";

export type VisitAttachment = {
  id: string;
  appointmentId: string | null;
  patientId: string;
  kind: AttachmentKind;
  fileName: string;
  fileSizeBytes: number;
  mimeType: string;
  notes?: string;
  createdAt: string;
};

export type ToothTreatment = {
  id: string;
  appointmentId: string;
  patientId: string;
  toothFdi: number; // 11..48 per FDI notation
  surface?: string;
  procedure: string;
  notes?: string;
};

export type VisitStatus = "completed" | "cancelled" | "no_show";

export type VisitAppointment = {
  id: string;
  patientId: string;
  date: string; // YYYY-MM-DD
  service: string;
  doctor: string;
  status: VisitStatus;
  durationMinutes: number;
};

/** Joined view the chart consumes. */
export type Visit = {
  appointment: VisitAppointment;
  note?: VisitNote;
  prescriptions: Prescription[];
  attachments: VisitAttachment[];
  toothTreatments: ToothTreatment[];
};

export type ChatThreadRef = {
  threadId: string;
  lastTemplate: string;
  status: "delivered" | "read" | "replied" | "failed" | "optout";
  preview: string;
  ts: string;
};

export type BillingSummary = {
  lifetimeValue: number;
  outstanding: number;
  last90Days: number;
  receipts: VisitAttachment[];
};

export type ChartPatient = {
  id: string;
  name: string;
  initials: string;
  avatarBg: string;
  avatarFg: string;
  phone: string;
  language: "EN" | "HI" | "OR";
  age: number;
  gender: "M" | "F" | "O";
  tags: string[];
  whatsappOptIn: boolean;
  verified: boolean;
  registeredOn: string;
  /** Assigned/primary doctor id (patients.assigned_doctor_id), or null.
   *  Optional so mock fixtures don't need to specify it. */
  assignedDoctorId?: string | null;
};

export type Chart = {
  patient: ChartPatient;
  medicalHistory: MedicalHistory | null;
  visits: Visit[]; // sorted desc by visitDate
  communications: ChatThreadRef[];
  billing: BillingSummary;
};

// ---------- Mock catalog ----------

const PATIENTS: ChartPatient[] = [
  {
    id: "P-1284",
    name: "Anita Sahu",
    initials: "AS",
    avatarBg: "#FFE7EC",
    avatarFg: "#EE344E",
    phone: "+91 98765 12342",
    language: "EN",
    age: 34,
    gender: "F",
    tags: ["VIP", "Root canal"],
    whatsappOptIn: true,
    verified: true,
    registeredOn: "2024-08-12",
  },
  {
    id: "P-1265",
    name: "Suresh Pati",
    initials: "SP",
    avatarBg: "#E6F4EC",
    avatarFg: "#3a8b5e",
    phone: "+91 89230 11445",
    language: "OR",
    age: 41,
    gender: "M",
    tags: ["Braces"],
    whatsappOptIn: true,
    verified: true,
    registeredOn: "2023-02-04",
  },
  {
    id: "P-1273",
    name: "Karthik Rao",
    initials: "KR",
    avatarBg: "#FFE7EC",
    avatarFg: "#EE344E",
    phone: "+91 70084 91144",
    language: "EN",
    age: 29,
    gender: "M",
    tags: ["Root canal"],
    whatsappOptIn: true,
    verified: true,
    registeredOn: "2024-11-20",
  },
  {
    id: "P-1283",
    name: "Bidyut Panda",
    initials: "BP",
    avatarBg: "#E6F1FA",
    avatarFg: "#0E5087",
    phone: "+91 96543 22018",
    language: "OR",
    age: 52,
    gender: "M",
    tags: ["New"],
    whatsappOptIn: true,
    verified: false,
    registeredOn: "2026-05-09",
  },
];

const MEDICAL_HISTORY: MedicalHistory[] = [
  {
    patientId: "P-1284",
    allergies: [
      { name: "Penicillin", severity: "severe", notes: "Reported hives in 2022; avoid amoxicillin." },
      { name: "Latex", severity: "mild" },
    ],
    conditions: ["Type 2 Diabetes (controlled)", "Hypertension"],
    currentMedications: [
      { name: "Metformin", dosage: "500mg twice daily" },
      { name: "Amlodipine", dosage: "5mg daily" },
    ],
    dentalHistoryNotes: "Last full mouth scaling 6 months ago. Sensitive lower-right quadrant.",
    bloodThinners: false,
  },
  {
    patientId: "P-1265",
    allergies: [],
    conditions: [],
    currentMedications: [],
    dentalHistoryNotes: "Mid-treatment for metal braces (Dr. Lipsa, ongoing since Oct 2024).",
    bloodThinners: false,
  },
  {
    patientId: "P-1273",
    allergies: [{ name: "Ibuprofen", severity: "moderate", notes: "GI discomfort" }],
    conditions: [],
    currentMedications: [],
    bloodThinners: false,
  },
  // P-1283 (Bidyut, new patient) — no medical history filed yet
];

// ---------- Visits — designed per-patient ----------

const VISITS_BY_PATIENT: Record<string, Visit[]> = {
  "P-1284": [
    {
      appointment: { id: "A-9023", patientId: "P-1284", date: "2026-05-09", service: "Root Canal · Session 2", doctor: "Dr. Manoranjan Mahakur", status: "completed", durationMinutes: 45 },
      note: {
        id: "N-9023", appointmentId: "A-9023", patientId: "P-1284", visitDate: "2026-05-09",
        chiefComplaint: "Pain in lower-right molar (tooth 46), persisting from S1.",
        examFindings: "Tenderness on percussion. No swelling. Pulp partially necrotic.",
        diagnosis: "Pulpal necrosis, tooth 46. Continuing RCT.",
        treatmentDone: "Completed canal preparation. Calcium hydroxide dressing placed. Temporary filling.",
        nextVisitAdvice: "Return in 2 weeks for obturation. Avoid chewing on the right side. Soft food only for 24 hours.",
        createdBy: "U-001", createdAt: "2026-05-09T11:42:00+05:30",
      },
      prescriptions: [
        {
          id: "Rx-7011", appointmentId: "A-9023", patientId: "P-1284", doctorId: "mm", doctorName: "Dr. Manoranjan Mahakur",
          items: [
            { medication: "Cefuroxime axetil 500mg", dosage: "1 tab", frequency: "Twice daily", duration: "5 days", instructions: "After meals" },
            { medication: "Aceclofenac 100mg + Paracetamol 325mg", dosage: "1 tab", frequency: "Twice daily", duration: "3 days", instructions: "Only if pain persists" },
          ],
          notes: "Penicillin-allergic — using cephalosporin alternative. Watch for cross-reactivity.",
          createdAt: "2026-05-09T11:50:00+05:30",
        },
      ],
      attachments: [
        { id: "F-8001", appointmentId: "A-9023", patientId: "P-1284", kind: "xray", fileName: "IOPAR_46_post-prep.jpg", fileSizeBytes: 412000, mimeType: "image/jpeg", notes: "Post canal-preparation IOPA", createdAt: "2026-05-09T11:35:00+05:30" },
        { id: "F-8002", appointmentId: "A-9023", patientId: "P-1284", kind: "prescription_pdf", fileName: "Rx_2026-05-09.pdf", fileSizeBytes: 84000, mimeType: "application/pdf", createdAt: "2026-05-09T11:51:00+05:30" },
        { id: "F-8003", appointmentId: "A-9023", patientId: "P-1284", kind: "receipt", fileName: "Receipt_DK-9023.pdf", fileSizeBytes: 21000, mimeType: "application/pdf", notes: "₹1,500 received", createdAt: "2026-05-09T12:00:00+05:30" },
      ],
      toothTreatments: [
        { id: "T-1001", appointmentId: "A-9023", patientId: "P-1284", toothFdi: 46, surface: "O", procedure: "RCT — canal preparation" },
      ],
    },
    {
      appointment: { id: "A-8901", patientId: "P-1284", date: "2026-04-14", service: "Root Canal · Session 1", doctor: "Dr. Manoranjan Mahakur", status: "completed", durationMinutes: 45 },
      note: {
        id: "N-8901", appointmentId: "A-8901", patientId: "P-1284", visitDate: "2026-04-14",
        chiefComplaint: "Sharp pain in lower-right molar for 3 days. Sensitive to cold.",
        examFindings: "Deep distal caries on tooth 46. Pulp exposure suspected.",
        diagnosis: "Irreversible pulpitis, tooth 46.",
        treatmentDone: "Access opening. Pulp extirpation. Working length determined. Calcium hydroxide intracanal medicament.",
        nextVisitAdvice: "RCT continuation in 3-4 weeks.",
        createdBy: "U-001", createdAt: "2026-04-14T17:20:00+05:30",
      },
      prescriptions: [
        {
          id: "Rx-6840", appointmentId: "A-8901", patientId: "P-1284", doctorId: "mm", doctorName: "Dr. Manoranjan Mahakur",
          items: [
            { medication: "Cefuroxime axetil 500mg", dosage: "1 tab", frequency: "Twice daily", duration: "5 days" },
            { medication: "Aceclofenac + Paracetamol", dosage: "1 tab", frequency: "Thrice daily", duration: "3 days" },
          ],
          createdAt: "2026-04-14T17:30:00+05:30",
        },
      ],
      attachments: [
        { id: "F-7702", appointmentId: "A-8901", patientId: "P-1284", kind: "xray", fileName: "IOPAR_46_diagnostic.jpg", fileSizeBytes: 388000, mimeType: "image/jpeg", createdAt: "2026-04-14T16:50:00+05:30" },
        { id: "F-7703", appointmentId: "A-8901", patientId: "P-1284", kind: "receipt", fileName: "Receipt_DK-8901.pdf", fileSizeBytes: 19000, mimeType: "application/pdf", notes: "₹1,500 received", createdAt: "2026-04-14T18:00:00+05:30" },
      ],
      toothTreatments: [
        { id: "T-0901", appointmentId: "A-8901", patientId: "P-1284", toothFdi: 46, surface: "OD", procedure: "RCT — access + pulp extirpation" },
      ],
    },
    {
      appointment: { id: "A-8722", patientId: "P-1284", date: "2026-04-02", service: "Consultation", doctor: "Dr. Manoranjan Mahakur", status: "completed", durationMinutes: 20 },
      note: {
        id: "N-8722", appointmentId: "A-8722", patientId: "P-1284", visitDate: "2026-04-02",
        chiefComplaint: "Reviewing pain in right lower jaw.",
        examFindings: "Deep caries tooth 46, with pulp involvement.",
        diagnosis: "Recommended RCT for tooth 46.",
        treatmentDone: "Diagnostic IOPA. Treatment plan presented.",
        nextVisitAdvice: "Book RCT Session 1. Discussed cost (₹4,500 total).",
        createdBy: "U-001", createdAt: "2026-04-02T11:00:00+05:30",
      },
      prescriptions: [],
      attachments: [
        { id: "F-7400", appointmentId: "A-8722", patientId: "P-1284", kind: "treatment_plan", fileName: "Treatment_plan_RCT_46.pdf", fileSizeBytes: 64000, mimeType: "application/pdf", createdAt: "2026-04-02T11:15:00+05:30" },
      ],
      toothTreatments: [],
    },
    {
      appointment: { id: "A-7104", patientId: "P-1284", date: "2025-10-18", service: "6-month checkup & cleaning", doctor: "Dr. Lipsa Pradhan", status: "completed", durationMinutes: 30 },
      note: {
        id: "N-7104", appointmentId: "A-7104", patientId: "P-1284", visitDate: "2025-10-18",
        chiefComplaint: "Routine checkup.",
        examFindings: "Generalized mild calculus. No active caries.",
        diagnosis: "Healthy. Mild gingivitis.",
        treatmentDone: "Full-mouth ultrasonic scaling and polishing.",
        nextVisitAdvice: "Next checkup in 6 months (April 2026). Floss daily.",
        createdBy: "U-002", createdAt: "2025-10-18T10:45:00+05:30",
      },
      prescriptions: [],
      attachments: [
        { id: "F-5511", appointmentId: "A-7104", patientId: "P-1284", kind: "receipt", fileName: "Receipt_Oct25.pdf", fileSizeBytes: 18000, mimeType: "application/pdf", notes: "₹600 received", createdAt: "2025-10-18T11:10:00+05:30" },
      ],
      toothTreatments: [],
    },
  ],

  "P-1265": [
    {
      appointment: { id: "A-9011", patientId: "P-1265", date: "2026-04-12", service: "Braces adjustment", doctor: "Dr. Lipsa Pradhan", status: "completed", durationMinutes: 30 },
      note: {
        id: "N-9011", appointmentId: "A-9011", patientId: "P-1265", visitDate: "2026-04-12",
        chiefComplaint: "Routine ortho adjustment.",
        examFindings: "Good oral hygiene. Slight upper-anterior rotation correcting.",
        diagnosis: "Mid-treatment, on schedule.",
        treatmentDone: "Wire upgrade — 16x22 NiTi. Elastic chain placed upper.",
        nextVisitAdvice: "Return in 4 weeks. Continue with elastics 18h/day.",
        createdBy: "U-002", createdAt: "2026-04-12T15:20:00+05:30",
      },
      prescriptions: [],
      attachments: [
        { id: "F-7780", appointmentId: "A-9011", patientId: "P-1265", kind: "receipt", fileName: "Receipt_DK-9011.pdf", fileSizeBytes: 17000, mimeType: "application/pdf", notes: "₹1,200 received (monthly visit)", createdAt: "2026-04-12T15:45:00+05:30" },
      ],
      toothTreatments: [],
    },
    {
      appointment: { id: "A-8500", patientId: "P-1265", date: "2026-03-15", service: "Braces adjustment", doctor: "Dr. Lipsa Pradhan", status: "completed", durationMinutes: 30 },
      note: {
        id: "N-8500", appointmentId: "A-8500", patientId: "P-1265", visitDate: "2026-03-15",
        treatmentDone: "Wire upgrade — 16x16 NiTi. Hygiene reinforcement.",
        nextVisitAdvice: "Return in 4 weeks.",
        createdBy: "U-002", createdAt: "2026-03-15T14:00:00+05:30",
      },
      prescriptions: [],
      attachments: [],
      toothTreatments: [],
    },
    {
      appointment: { id: "A-7220", patientId: "P-1265", date: "2024-10-22", service: "Braces fitting", doctor: "Dr. Lipsa Pradhan", status: "completed", durationMinutes: 90 },
      note: {
        id: "N-7220", appointmentId: "A-7220", patientId: "P-1265", visitDate: "2024-10-22",
        chiefComplaint: "Crowding upper anteriors, mild Class II malocclusion.",
        examFindings: "Cephalometric and OPG reviewed. Treatment plan finalized.",
        treatmentDone: "Bonded upper and lower fixed metal brackets. 014 NiTi initial wire.",
        nextVisitAdvice: "Return in 6 weeks for first adjustment. Diet instructions issued.",
        createdBy: "U-002", createdAt: "2024-10-22T11:30:00+05:30",
      },
      prescriptions: [
        {
          id: "Rx-6020", appointmentId: "A-7220", patientId: "P-1265", doctorId: "lp", doctorName: "Dr. Lipsa Pradhan",
          items: [
            { medication: "Diclofenac 50mg", dosage: "1 tab", frequency: "When needed", duration: "3 days", instructions: "For initial discomfort" },
          ],
          createdAt: "2024-10-22T12:00:00+05:30",
        },
      ],
      attachments: [
        { id: "F-5012", appointmentId: "A-7220", patientId: "P-1265", kind: "treatment_plan", fileName: "Ortho_treatment_plan.pdf", fileSizeBytes: 124000, mimeType: "application/pdf", createdAt: "2024-10-22T10:00:00+05:30" },
        { id: "F-5013", appointmentId: "A-7220", patientId: "P-1265", kind: "xray", fileName: "OPG_pre-treatment.jpg", fileSizeBytes: 920000, mimeType: "image/jpeg", createdAt: "2024-10-22T09:50:00+05:30" },
        { id: "F-5014", appointmentId: "A-7220", patientId: "P-1265", kind: "consent", fileName: "Ortho_consent_signed.pdf", fileSizeBytes: 56000, mimeType: "application/pdf", notes: "Signed consent for fixed appliance therapy", createdAt: "2024-10-22T10:30:00+05:30" },
        { id: "F-5015", appointmentId: "A-7220", patientId: "P-1265", kind: "receipt", fileName: "Receipt_braces_setup.pdf", fileSizeBytes: 28000, mimeType: "application/pdf", notes: "₹18,000 advance received", createdAt: "2024-10-22T12:30:00+05:30" },
      ],
      toothTreatments: [],
    },
  ],

  "P-1273": [
    {
      appointment: { id: "A-8800", patientId: "P-1273", date: "2026-04-20", service: "Root Canal · S1", doctor: "Dr. Manoranjan Mahakur", status: "completed", durationMinutes: 45 },
      note: {
        id: "N-8800", appointmentId: "A-8800", patientId: "P-1273", visitDate: "2026-04-20",
        chiefComplaint: "Severe pain in upper-left first molar.",
        examFindings: "Deep distal caries 26 with pulp involvement.",
        diagnosis: "Irreversible pulpitis 26.",
        treatmentDone: "Access + pulp extirpation. CaOH dressing.",
        nextVisitAdvice: "Crown fitting in 4 weeks.",
        createdBy: "U-001", createdAt: "2026-04-20T11:30:00+05:30",
      },
      prescriptions: [
        {
          id: "Rx-6520", appointmentId: "A-8800", patientId: "P-1273", doctorId: "mm", doctorName: "Dr. Manoranjan Mahakur",
          items: [
            { medication: "Amoxicillin 500mg", dosage: "1 cap", frequency: "Thrice daily", duration: "5 days" },
            { medication: "Paracetamol 650mg", dosage: "1 tab", frequency: "When needed", duration: "3 days", instructions: "Avoid ibuprofen (allergy noted)" },
          ],
          createdAt: "2026-04-20T11:45:00+05:30",
        },
      ],
      attachments: [
        { id: "F-6800", appointmentId: "A-8800", patientId: "P-1273", kind: "xray", fileName: "IOPA_26.jpg", fileSizeBytes: 398000, mimeType: "image/jpeg", createdAt: "2026-04-20T11:00:00+05:30" },
      ],
      toothTreatments: [
        { id: "T-0800", appointmentId: "A-8800", patientId: "P-1273", toothFdi: 26, surface: "OD", procedure: "RCT — pulp extirpation" },
      ],
    },
    {
      appointment: { id: "A-7800", patientId: "P-1273", date: "2026-02-08", service: "Consultation + Cleaning", doctor: "Dr. Lipsa Pradhan", status: "completed", durationMinutes: 45 },
      note: {
        id: "N-7800", appointmentId: "A-7800", patientId: "P-1273", visitDate: "2026-02-08",
        treatmentDone: "Full-mouth scaling. Discussed deep caries on 26.",
        nextVisitAdvice: "Schedule RCT for tooth 26.",
        createdBy: "U-002", createdAt: "2026-02-08T10:30:00+05:30",
      },
      prescriptions: [],
      attachments: [],
      toothTreatments: [],
    },
  ],

  "P-1283": [
    {
      appointment: { id: "A-9100", patientId: "P-1283", date: "2026-05-09", service: "Tooth extraction", doctor: "Dr. Manoranjan Mahakur", status: "completed", durationMinutes: 30 },
      note: {
        id: "N-9100", appointmentId: "A-9100", patientId: "P-1283", visitDate: "2026-05-09",
        chiefComplaint: "Mobile lower-left third molar.",
        examFindings: "Grade 2 mobility 38. Periodontal involvement.",
        diagnosis: "Periodontally compromised 38.",
        treatmentDone: "Extraction of 38 under local anaesthesia. Routine post-op instructions.",
        nextVisitAdvice: "Suture removal in 7 days. Soft food. No spitting/rinsing for 24h.",
        createdBy: "U-001", createdAt: "2026-05-09T16:15:00+05:30",
      },
      prescriptions: [
        {
          id: "Rx-7100", appointmentId: "A-9100", patientId: "P-1283", doctorId: "mm", doctorName: "Dr. Manoranjan Mahakur",
          items: [
            { medication: "Amoxicillin + Clavulanic acid 625mg", dosage: "1 tab", frequency: "Twice daily", duration: "5 days" },
            { medication: "Aceclofenac + Paracetamol", dosage: "1 tab", frequency: "Twice daily", duration: "3 days" },
            { medication: "Chlorhexidine 0.2% mouthwash", dosage: "10 ml", frequency: "Twice daily", duration: "7 days", instructions: "Start 24h after extraction" },
          ],
          createdAt: "2026-05-09T16:25:00+05:30",
        },
      ],
      attachments: [
        { id: "F-7900", appointmentId: "A-9100", patientId: "P-1283", kind: "consent", fileName: "Extraction_consent.pdf", fileSizeBytes: 32000, mimeType: "application/pdf", createdAt: "2026-05-09T15:30:00+05:30" },
        { id: "F-7901", appointmentId: "A-9100", patientId: "P-1283", kind: "receipt", fileName: "Receipt_DK-9100.pdf", fileSizeBytes: 17000, mimeType: "application/pdf", notes: "₹800 received", createdAt: "2026-05-09T16:30:00+05:30" },
      ],
      toothTreatments: [
        { id: "T-1100", appointmentId: "A-9100", patientId: "P-1283", toothFdi: 38, procedure: "Extraction" },
      ],
    },
  ],
};

const COMMS_BY_PATIENT: Record<string, ChatThreadRef[]> = {
  "P-1284": [
    { threadId: "t2", lastTemplate: "reminder_24h_v2",          status: "read",    preview: "See you tomorrow at 5:30 PM", ts: "2m" },
    { threadId: "t2a", lastTemplate: "booking_confirmation_v1", status: "read",    preview: "Confirmed", ts: "2 days ago" },
    { threadId: "t2b", lastTemplate: "noshow_followup_v1",      status: "replied", preview: "Sorry, traffic", ts: "3 weeks ago" },
  ],
  "P-1265": [
    { threadId: "t6", lastTemplate: "reminder_24h_v2",          status: "replied", preview: "Can we move to 4 PM?", ts: "31m" },
  ],
  "P-1273": [
    { threadId: "t4", lastTemplate: "booking_confirmation_v1", status: "read", preview: "Got it, thanks", ts: "18m" },
  ],
  "P-1283": [
    { threadId: "t1", lastTemplate: "booking_confirmation_v1", status: "replied", preview: "Yes please confirm", ts: "just now" },
  ],
};

// ---------- Accessors ----------

export function findChart(patientId: string): Chart | null {
  const patient = PATIENTS.find((p) => p.id === patientId);
  if (!patient) return null;

  const visits = VISITS_BY_PATIENT[patientId] ?? [];
  const medicalHistory = MEDICAL_HISTORY.find((m) => m.patientId === patientId) ?? null;
  const communications = COMMS_BY_PATIENT[patientId] ?? [];

  const receipts = visits.flatMap((v) => v.attachments.filter((a) => a.kind === "receipt"));

  // Demo numbers — in production these come from a billing/payments table.
  const lifetimeValue =
    patientId === "P-1284" ? 12400 :
    patientId === "P-1265" ? 24500 :
    patientId === "P-1273" ? 9750 :
    patientId === "P-1283" ? 1200 :
    0;
  const outstanding = patientId === "P-1284" ? 3000 : 0;
  const last90Days =
    patientId === "P-1284" ? 4500 :
    patientId === "P-1265" ? 2400 :
    patientId === "P-1273" ? 4200 :
    1200;

  return {
    patient,
    medicalHistory,
    visits,
    communications,
    billing: { lifetimeValue, outstanding, last90Days, receipts },
  };
}

export function listChartPatients(): ChartPatient[] {
  return PATIENTS;
}

// ---------- Display helpers ----------

export const ATTACHMENT_META: Record<AttachmentKind, { label: string; icon: string; bg: string; fg: string }> = {
  xray:             { label: "X-ray",          icon: "fa-image",         bg: "#FFF8EC", fg: "#7a5c2b" },
  prescription_pdf: { label: "Prescription",   icon: "fa-prescription",  bg: "#E6F1FA", fg: "#0E5087" },
  treatment_plan:   { label: "Plan",           icon: "fa-clipboard-list", bg: "#E6F1FA", fg: "#0168B3" },
  receipt:          { label: "Receipt",        icon: "fa-receipt",       bg: "#E6F4EC", fg: "#3a8b5e" },
  lab_report:       { label: "Lab report",     icon: "fa-flask",         bg: "#F4E5FA", fg: "#6b3aa1" },
  consent:          { label: "Consent",        icon: "fa-file-signature", bg: "#FFE7EC", fg: "#EE344E" },
  other:            { label: "File",           icon: "fa-file-alt",      bg: "#F4F5F7", fg: "#575757" },
};

export function formatVisitDate(iso: string): string {
  const parts = iso.split("-");
  if (parts.length !== 3) return iso;
  const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
