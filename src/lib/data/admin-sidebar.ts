/**
 * Live counts for the admin sidebar nav badges (Today, Messages).
 *
 * Scoped exactly like the pages they mirror: by the active clinic, and—for a
 * doctor login—by that doctor's own appointments / patients. Returns 0 when
 * there's nothing to show so the UI can hide the badge entirely (no "0" pill).
 */

import { serverClient } from "@/lib/supabase/server";
import { getActiveMembership } from "@/lib/auth/current-user";
import { doctorPatientIds } from "@/lib/data/doctor-scope";
import { useMockData } from "@/lib/feature-flags";

export type SidebarBadges = {
  /** Today's non-cancelled appointments for the active clinic / doctor. */
  today:    number;
  /** Conversations awaiting a reply (latest message is inbound). */
  messages: number;
};

const IST = "Asia/Kolkata";

function startOfTodayIST(): Date {
  const now      = new Date();
  const istParts = new Intl.DateTimeFormat("en-CA", {
    timeZone: IST, year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(now);
  const get = (t: string) => istParts.find((p) => p.type === t)?.value ?? "00";
  return new Date(`${get("year")}-${get("month")}-${get("day")}T00:00:00+05:30`);
}

export async function getAdminSidebarBadges(): Promise<SidebarBadges> {
  // Keep the demo screen's familiar numbers when running on mock data.
  if (useMockData()) return { today: 12, messages: 3 };

  const membership = await getActiveMembership();
  if (!membership) return { today: 0, messages: 0 };

  const clinicId      = membership.clinicId;
  const scopeDoctorId = membership.role === "doctor" ? membership.doctorId : null;
  // A doctor login not yet linked to a profile sees nothing (fail-closed).
  if (membership.role === "doctor" && !scopeDoctorId) return { today: 0, messages: 0 };

  const supabase = await serverClient();

  // ---- Today's appointments (exclude cancelled) ------------------------------
  const start = startOfTodayIST();
  const end   = new Date(start.getTime() + 24 * 60 * 60 * 1000);

  let apptQuery = supabase
    .from("appointments")
    .select("id", { count: "exact", head: true })
    .eq("clinic_id", clinicId)
    .neq("status", "cancelled")
    .gte("starts_at", start.toISOString())
    .lt("starts_at", end.toISOString());
  if (scopeDoctorId) apptQuery = apptQuery.eq("doctor_id", scopeDoctorId);
  const { count: todayCount } = await apptQuery;

  // ---- Messages awaiting reply ----------------------------------------------
  // wa_messages has no read flag, so "unread" is approximated as conversations
  // whose most recent message came from the patient (direction='in').
  let msgQuery = supabase
    .from("wa_messages")
    .select("patient_id, direction, created_at")
    .eq("clinic_id", clinicId)
    .order("created_at", { ascending: false });

  if (scopeDoctorId) {
    const ids = await doctorPatientIds(supabase, clinicId, scopeDoctorId);
    if (ids.size === 0) return { today: todayCount ?? 0, messages: 0 };
    msgQuery = msgQuery.in("patient_id", Array.from(ids));
  }

  const { data: msgs } = await msgQuery;
  // First row seen per patient is the latest (rows are sorted newest-first).
  const latestDir = new Map<string, string>();
  for (const m of msgs ?? []) {
    if (m.patient_id && !latestDir.has(m.patient_id)) latestDir.set(m.patient_id, m.direction);
  }
  let messages = 0;
  for (const dir of latestDir.values()) if (dir === "in") messages += 1;

  return { today: todayCount ?? 0, messages };
}
