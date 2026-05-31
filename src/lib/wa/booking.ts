/**
 * Booking-related WhatsApp messages — assembles the variables a template
 * expects from an appointment id, then hands off to sendWaTemplate.
 *
 * Templates we use today (all registered in wa_templates seed):
 *   - booking_confirmation_v1: {patient_name, clinic_name, date, time, clinic_address}
 *   - reminder_evening_before_v1: {patient_name, clinic_name, date, time}
 *   - reminder_one_hour_v1:       {patient_name, clinic_name, time}
 */

import { serviceClient } from "@/lib/supabase/server";
import { sendWaTemplate } from "./send";
import type { WaLocale } from "./types";

const IST = "Asia/Kolkata";

function langFromDb(s: string | null): WaLocale {
  switch ((s ?? "").toLowerCase()) {
    case "hi": return "hi";
    case "or": return "or";
    default:   return "en";
  }
}

function formatIstDate(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: IST,
    day:   "numeric",
    month: "short",
    year:  "numeric",
  }).format(new Date(iso));
}

function formatIstTime(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: IST,
    hour:   "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(iso));
}

type AppointmentRow = {
  id:         string;
  clinic_id:  string;
  starts_at:  string;
  patient: {
    id:              string;
    full_name:       string;
    phone_e164:      string;
    language:        string | null;
    whatsapp_opt_in: boolean;
  } | { id: string; full_name: string; phone_e164: string; language: string | null; whatsapp_opt_in: boolean }[] | null;
  clinic: { name: string } | { name: string }[] | null;
};

async function loadAppointmentContext(appointmentId: string): Promise<AppointmentRow | null> {
  const supabase = serviceClient();
  const { data } = await supabase
    .from("appointments")
    .select(`
      id, clinic_id, starts_at,
      patient:patients ( id, full_name, phone_e164, language, whatsapp_opt_in ),
      clinic:clinics  ( name )
    `)
    .eq("id", appointmentId)
    .maybeSingle();
  return (data as AppointmentRow | null) ?? null;
}

function unwrap<T>(v: T | T[] | null): T | null {
  if (!v) return null;
  return Array.isArray(v) ? (v[0] ?? null) : v;
}

// =============================================================================
// Booking confirmation
// =============================================================================

export async function sendBookingConfirmation(appointmentId: string): Promise<void> {
  const ctx = await loadAppointmentContext(appointmentId);
  if (!ctx) return;

  const patient = unwrap(ctx.patient);
  const clinic  = unwrap(ctx.clinic);
  if (!patient) return;

  await sendWaTemplate({
    clinicId:      ctx.clinic_id,
    patientId:     patient.id,
    appointmentId: ctx.id,
    template:      "booking_confirmation_v1",
    language:      langFromDb(patient.language),
    variables: [
      patient.full_name,
      clinic?.name ?? "Rxbooq",
      formatIstDate(ctx.starts_at),
      formatIstTime(ctx.starts_at),
      "",  // clinic_address — clinics table doesn't carry one yet
    ],
    to: patient.phone_e164,
  });
}

// =============================================================================
// Reminders
// =============================================================================

export async function sendReminderEveningBefore(appointmentId: string): Promise<void> {
  const ctx = await loadAppointmentContext(appointmentId);
  if (!ctx) return;

  const patient = unwrap(ctx.patient);
  const clinic  = unwrap(ctx.clinic);
  if (!patient) return;

  await sendWaTemplate({
    clinicId:      ctx.clinic_id,
    patientId:     patient.id,
    appointmentId: ctx.id,
    template:      "reminder_evening_before_v1",
    language:      langFromDb(patient.language),
    variables: [
      patient.full_name,
      clinic?.name ?? "Rxbooq",
      formatIstDate(ctx.starts_at),
      formatIstTime(ctx.starts_at),
    ],
    to: patient.phone_e164,
  });
}

export async function sendReminderOneHour(appointmentId: string): Promise<void> {
  const ctx = await loadAppointmentContext(appointmentId);
  if (!ctx) return;

  const patient = unwrap(ctx.patient);
  const clinic  = unwrap(ctx.clinic);
  if (!patient) return;

  await sendWaTemplate({
    clinicId:      ctx.clinic_id,
    patientId:     patient.id,
    appointmentId: ctx.id,
    template:      "reminder_one_hour_v1",
    language:      langFromDb(patient.language),
    variables: [
      patient.full_name,
      clinic?.name ?? "Rxbooq",
      formatIstTime(ctx.starts_at),
    ],
    to: patient.phone_e164,
  });
}
