/**
 * Data accessor for /admin/messages — WhatsApp inbox.
 *
 * Live path groups `wa_messages` by patient into thread shapes the UI expects.
 * Context (the linked appointment chip) is left empty for now — wire when
 * we ship Phase E (WhatsApp integration).
 */

import { serverClient } from "@/lib/supabase/server";
import { getCurrentStaffClinicId } from "@/lib/auth/current-user";
import { useMockData } from "@/lib/feature-flags";

export type ThreadStatus = "delivered" | "read" | "replied" | "failed" | "optout";

export type Bubble =
  | { kind: "out"; tpl: string; status: ThreadStatus; ts: string; body: string; failed?: boolean }
  | { kind: "in";  ts: string; body: string };

export type Thread = {
  id:        string;
  name:      string;
  initials:  string;
  avatarBg:  string;
  avatarFg:  string;
  phone:     string;
  lastTpl:   string;
  status:    ThreadStatus;
  ts:        string;
  preview:   string;
  unread?:   boolean;
  failed?:   boolean;
  optout?:   boolean;
  bubbles:   Bubble[];
  context?:  { service: string; date: string; doctor: string; bookingId: string };
};

// =============================================================================
// Mock data
// =============================================================================

const MOCK_THREADS: Thread[] = [
  {
    id: "t1",
    name: "Bidyut Panda",
    initials: "BP",
    avatarBg: "#E6F1FA",
    avatarFg: "#0E5087",
    phone: "+91 96••• ••018",
    lastTpl: "booking_confirmation_v1",
    status: "replied",
    ts: "just now",
    preview: "Yes please confirm",
    unread: true,
    context: {
      service: "Tooth extraction · 9 May 2026, 3:30 PM",
      date: "9 May 2026",
      doctor: "Dr. Manoranjan Mahakur · 30 min",
      bookingId: "DK-3942",
    },
    bubbles: [
      { kind: "out", tpl: "booking_confirmation_v1", status: "read", ts: "3:31 PM",
        body: `Hi Bidyut, your appointment at Mahakur Poly Dental is booked.\nTooth extraction · 9 May 2026, 3:30 PM with Dr. Manoranjan Mahakur.\n\nPlease reply YES to confirm or RESCHEDULE.` },
      { kind: "in",  ts: "3:32 PM", body: "YES" },
      { kind: "out", tpl: "reminder_24h_v2", status: "read", ts: "2:30 PM",
        body: `Reminder: your appointment is in 1 hour at Mahakur Poly Dental, Bhatra Chowk.\nReply 1 to confirm, 2 to reschedule.` },
      { kind: "in", ts: "2:33 PM", body: "Yes please confirm" },
      { kind: "out", tpl: "customer_care_reply", status: "failed", ts: "3:01 PM", failed: true,
        body: "Thanks Bidyut! See you at 3:30 PM. Please arrive 5 min early." },
    ],
  },
  {
    id: "t2",
    name: "Anita Sahu",
    initials: "AS",
    avatarBg: "#FFE7EC",
    avatarFg: "#EE344E",
    phone: "+91 98••• ••342",
    lastTpl: "reminder_24h_v2",
    status: "read",
    ts: "2m",
    preview: "See you tomorrow at 5:30 PM",
    bubbles: [
      { kind: "out", tpl: "reminder_24h_v2", status: "read", ts: "Yesterday 5:30 PM",
        body: "Reminder: your Root Canal · S2 visit with Dr. Manoranjan is tomorrow at 5:30 PM. Reply 1 to confirm." },
      { kind: "in", ts: "Yesterday 5:32 PM", body: "1" },
      { kind: "in", ts: "2 min ago", body: "See you tomorrow at 5:30 PM" },
    ],
  },
  {
    id: "t3",
    name: "Sarita Mahanti",
    initials: "SM",
    avatarBg: "#FFF8EC",
    avatarFg: "#7a5c2b",
    phone: "+91 99••• ••445",
    lastTpl: "noshow_followup_v1",
    status: "failed",
    ts: "14m",
    preview: "undelivered · phone unreachable",
    failed: true,
    bubbles: [
      { kind: "out", tpl: "noshow_followup_v1", status: "failed", ts: "14 min ago", failed: true,
        body: "Hi Sarita, we missed you at your Whitening appointment today. Reply 2 to reschedule." },
    ],
  },
];

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

function relativeTime(iso: string): string {
  const t = new Date(iso).getTime();
  const diffMs = Date.now() - t;
  const min = Math.floor(diffMs / 60000);
  if (min < 1)         return "just now";
  if (min < 60)        return `${min}m`;
  const hr = Math.floor(min / 60);
  if (hr < 24)         return `${hr}h`;
  const days = Math.floor(hr / 24);
  if (days < 7)        return `${days}d`;
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

function timeOfDay(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false });
}

function dbStatusToUi(s: string | null): ThreadStatus {
  switch (s) {
    case "delivered": return "delivered";
    case "read":      return "read";
    case "replied":   return "replied";
    case "failed":    return "failed";
    default:          return "delivered";
  }
}

// =============================================================================
// Live fetcher
// =============================================================================

type DbMessage = {
  id:             string;
  patient_id:     string;
  template_name:  string | null;
  direction:      "in" | "out";
  payload:        { body?: string } | null;
  status:         string | null;
  error:          string | null;
  created_at:     string;
  patient: {
    full_name:        string;
    phone_e164:       string;
    whatsapp_opt_in:  boolean;
  } | { full_name: string; phone_e164: string; whatsapp_opt_in: boolean }[] | null;
};

async function getLiveThreads(): Promise<Thread[]> {
  const clinicId = await getCurrentStaffClinicId();
  if (!clinicId) return [];

  const supabase = await serverClient();

  const { data: rows, error } = await supabase
    .from("wa_messages")
    .select(`
      id, patient_id, template_name, direction, payload, status, error, created_at,
      patient:patients ( full_name, phone_e164, whatsapp_opt_in )
    `)
    .eq("clinic_id", clinicId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("[admin-messages] wa_messages query failed:", error.message);
    return [];
  }

  type Agg = {
    patient_id: string;
    name:       string;
    phoneE164:  string;
    optout:     boolean;
    bubbles:    Bubble[];
    lastTpl:    string;
    lastStatus: ThreadStatus;
    lastTs:     string;
    preview:    string;
    failed:     boolean;
    hasReply:   boolean;
  };

  const byPatient = new Map<string, Agg>();
  for (const m of (rows ?? []) as DbMessage[]) {
    if (!m.patient_id) continue;
    const patient = Array.isArray(m.patient) ? m.patient[0] : m.patient;
    if (!patient) continue;

    const body = m.payload?.body ?? m.template_name ?? "";
    const ts   = timeOfDay(m.created_at);

    const bubble: Bubble = m.direction === "in"
      ? { kind: "in",  ts, body }
      : {
          kind:   "out",
          tpl:    m.template_name ?? "",
          status: dbStatusToUi(m.status),
          ts,
          body,
          ...(m.status === "failed" ? { failed: true } : {}),
        };

    const existing = byPatient.get(m.patient_id) ?? {
      patient_id: m.patient_id,
      name:       patient.full_name,
      phoneE164:  patient.phone_e164,
      optout:     !patient.whatsapp_opt_in,
      bubbles:    [],
      lastTpl:    "",
      lastStatus: "delivered",
      lastTs:     m.created_at,
      preview:    "",
      failed:     false,
      hasReply:   false,
    };
    existing.bubbles.push(bubble);
    existing.lastTpl    = m.template_name ?? existing.lastTpl;
    existing.lastStatus = dbStatusToUi(m.status);
    existing.lastTs     = m.created_at;
    existing.preview    = body.slice(0, 80);
    if (m.status === "failed") existing.failed = true;
    if (m.direction === "in")  existing.hasReply = true;
    byPatient.set(m.patient_id, existing);
  }

  return Array.from(byPatient.values())
    .sort((a, b) => b.lastTs.localeCompare(a.lastTs))
    .map((a): Thread => {
      const palette = avatarFor(a.patient_id);
      const status: ThreadStatus = a.optout
        ? "optout"
        : a.failed
          ? "failed"
          : a.hasReply
            ? "replied"
            : a.lastStatus;
      return {
        id:       a.patient_id,
        name:     a.name,
        initials: initialsOf(a.name),
        avatarBg: palette.bg,
        avatarFg: palette.fg,
        phone:    maskPhone(a.phoneE164),
        lastTpl:  a.lastTpl,
        status,
        ts:       relativeTime(a.lastTs),
        preview:  a.preview || "—",
        ...(a.optout ? { optout: true } : {}),
        ...(a.failed ? { failed: true } : {}),
        bubbles:  a.bubbles,
      };
    });
}

// =============================================================================
// Public entry point
// =============================================================================

export async function getAdminMessagesData(): Promise<Thread[]> {
  if (useMockData()) return MOCK_THREADS;
  return getLiveThreads();
}
