"use server";

import { revalidateActiveClinicPath } from "@/lib/routing/active-slug";
import { z } from "zod";
import { serverClient } from "@/lib/supabase/server";
import { sendWaSession, sendWaTemplate } from "@/lib/wa/send";
import type { WaLocale } from "@/lib/wa/types";

const replySchema = z.object({
  patientId: z.string().min(1),
  text:      z.string().trim().min(1, "Type a message before sending"),
});

export type SendReplyInput = z.infer<typeof replySchema>;

export type SendReplyResult =
  | { ok: true;  providerMessageId: string }
  | { ok: false; error: string };

/**
 * Send a free-form WhatsApp reply from /admin/messages.
 *
 * Constraints:
 *  - Caller must be authenticated and belong to a clinic (RLS gate).
 *  - The patient must belong to the same clinic (RLS scope).
 *  - WhatsApp only allows free-form session messages within the 24-hour
 *    customer-care window. For older threads, callers should use a template.
 */
export async function sendInboxReplyAction(
  rawInput: SendReplyInput,
): Promise<SendReplyResult> {
  const parsed = replySchema.safeParse(rawInput);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const input = parsed.data;

  const supabase = await serverClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  // RLS scopes the patient lookup to the caller's clinic; if the patient isn't
  // visible, the row comes back null and we refuse.
  const { data: patient } = await supabase
    .from("patients")
    .select("id, clinic_id, phone_e164, whatsapp_opt_in")
    .eq("id", input.patientId)
    .maybeSingle();
  if (!patient) {
    return { ok: false, error: "Patient not visible to this clinic." };
  }
  if (!patient.whatsapp_opt_in) {
    return { ok: false, error: "Patient has opted out of WhatsApp." };
  }

  const result = await sendWaSession({
    clinicId:  patient.clinic_id,
    patientId: patient.id,
    to:        patient.phone_e164,
    text:      input.text,
  });

  if (!result.ok) {
    return { ok: false, error: result.error };
  }

  await revalidateActiveClinicPath("/admin/messages");

  return {
    ok: true,
    providerMessageId: result.providerMessageId,
  };
}

// =============================================================================
// Templates catalog — read-only listing of approved WA templates.
// `wa_templates` is globally readable; super-admins manage approval status
// at the platform level (not from the clinic admin UI).
// =============================================================================

export type WaTemplateRow = {
  id:        string;
  name:      string;
  language:  "en" | "hi" | "or";
  variables: string[];
  status:    "approved" | "pending" | "rejected";
};

export async function getWaTemplatesAction(): Promise<
  | { ok: true; templates: WaTemplateRow[] }
  | { ok: false; error: string }
> {
  const supabase = await serverClient();
  const { data, error } = await supabase
    .from("wa_templates")
    .select("id, name, language, variables, status")
    .order("name", { ascending: true });
  if (error) return { ok: false, error: error.message };

  return {
    ok: true,
    templates: (data ?? []).map((r) => ({
      id:        r.id,
      name:      r.name,
      language:  (r.language as WaLocale),
      variables: (r.variables ?? []),
      status:    (r.status as WaTemplateRow["status"]),
    })),
  };
}

// =============================================================================
// Broadcast — send a chosen template to every patient matching an audience filter.
// =============================================================================

const audienceSchema = z.object({
  optedInOnly:        z.boolean().default(true),
  language:           z.enum(["all", "en", "hi", "or"]).default("all"),
  /** Match patients whose tags contain ANY of these strings. Empty = no filter. */
  tags:               z.array(z.string()).default([]),
  /** Restrict to patients with an appointment in the last N days. 0 = no filter. */
  lastVisitWithinDays: z.number().int().min(0).max(365).default(0),
});

export type BroadcastAudienceInput = z.infer<typeof audienceSchema>;

const broadcastSchema = z.object({
  templateName:  z.string().min(1, "Pick a template"),
  language:      z.enum(["en", "hi", "or"]),
  audience:      audienceSchema,
  /**
   * Manual values for any template variables that aren't auto-derivable from
   * the patient or clinic row. Key = variable name, value = string.
   * Auto-derived: patient_name → patients.full_name, clinic_name → clinics.name.
   */
  defaultValues: z.record(z.string(), z.string()).default({}),
});

export type BroadcastInput = z.infer<typeof broadcastSchema>;

export type BroadcastResult =
  | { ok: true;  sent: number; skipped: number; failed: number; failures: string[] }
  | { ok: false; error: string };

async function resolveCallerClinic(): Promise<
  | { ok: true; clinicId: string; clinicName: string }
  | { ok: false; error: string }
> {
  const supabase = await serverClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const { data: cu } = await supabase
    .from("clinic_users")
    .select("clinic_id")
    .eq("auth_user_id", user.id)
    .maybeSingle();
  if (!cu?.clinic_id) return { ok: false, error: "Your account is not linked to a clinic." };

  const { data: clinic } = await supabase
    .from("clinics")
    .select("name")
    .eq("id", cu.clinic_id)
    .maybeSingle();
  return {
    ok: true,
    clinicId:   cu.clinic_id,
    clinicName: clinic?.name ?? "Our clinic",
  };
}

type PatientLite = {
  id:         string;
  full_name:  string;
  phone_e164: string;
  language:   "en" | "hi" | "or";
  tags:       string[];
  whatsapp_opt_in: boolean;
};

async function fetchAudience(audience: BroadcastAudienceInput): Promise<PatientLite[]> {
  const supabase = await serverClient();
  let query = supabase
    .from("patients")
    .select("id, full_name, phone_e164, language, tags, whatsapp_opt_in");
  if (audience.optedInOnly) {
    query = query.eq("whatsapp_opt_in", true);
  }
  if (audience.language !== "all") {
    query = query.eq("language", audience.language);
  }
  // Tag overlap filter via PostgREST array operator. tags column is text[].
  if (audience.tags.length > 0) {
    query = query.overlaps("tags", audience.tags);
  }

  const { data, error } = await query;
  if (error) {
    console.error("[broadcast] audience query failed:", error.message);
    return [];
  }

  let rows = (data ?? []) as unknown as PatientLite[];

  // Last-visit filter — requires a join through appointments. Do this in JS to
  // keep the query layer simple; for high-volume clinics we'd push it to SQL.
  if (audience.lastVisitWithinDays > 0) {
    const cutoffMs = Date.now() - audience.lastVisitWithinDays * 24 * 60 * 60 * 1000;
    const ids     = rows.map((r) => r.id);
    if (ids.length > 0) {
      const { data: appts } = await supabase
        .from("appointments")
        .select("patient_id, starts_at")
        .in("patient_id", ids)
        .gte("starts_at", new Date(cutoffMs).toISOString());
      const recent = new Set((appts ?? []).map((a) => a.patient_id));
      rows = rows.filter((r) => recent.has(r.id));
    }
  }

  return rows;
}

// Returns the audience size for the preview screen.
export async function previewBroadcastAudienceAction(
  rawInput: BroadcastAudienceInput,
): Promise<{ ok: true; count: number } | { ok: false; error: string }> {
  const parsed = audienceSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const gate = await resolveCallerClinic();
  if (!gate.ok) return gate;

  const rows = await fetchAudience(parsed.data);
  return { ok: true, count: rows.length };
}

// Fire the broadcast. Synchronous loop for v1; large audiences should be queued.
export async function broadcastWaAction(
  rawInput: BroadcastInput,
): Promise<BroadcastResult> {
  const parsed = broadcastSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const input = parsed.data;

  const gate = await resolveCallerClinic();
  if (!gate.ok) return gate;

  const audience = await fetchAudience(input.audience);
  if (audience.length === 0) {
    return { ok: true, sent: 0, skipped: 0, failed: 0, failures: [] };
  }

  let sent     = 0;
  let skipped  = 0;
  let failed   = 0;
  const failures: string[] = [];

  // Discover the variable order from wa_templates so we substitute in the
  // order Meta expects.
  const supabase = await serverClient();
  const { data: tplRow } = await supabase
    .from("wa_templates")
    .select("variables")
    .eq("name", input.templateName)
    .eq("language", input.language)
    .maybeSingle();
  const orderedVars: string[] = (tplRow?.variables ?? []) as string[];

  // Send sequentially. Parallel sends can trip Interakt rate limits on free plans.
  for (const p of audience) {
    if (input.audience.optedInOnly && !p.whatsapp_opt_in) {
      skipped++;
      continue;
    }
    const variables = orderedVars.map((name) => {
      if (name === "patient_name") return p.full_name;
      if (name === "clinic_name")  return gate.clinicName;
      return input.defaultValues[name] ?? "";
    });

    const result = await sendWaTemplate({
      clinicId:      gate.clinicId,
      patientId:     p.id,
      template:      input.templateName,
      language:      input.language,
      variables,
      to:            p.phone_e164,
      respectOptOut: input.audience.optedInOnly,
    });

    if (result.ok) {
      sent++;
    } else if (result.skipped === "optout") {
      skipped++;
    } else {
      failed++;
      if (failures.length < 5) failures.push(`${p.full_name}: ${result.error}`);
    }
  }

  await revalidateActiveClinicPath("/admin/messages");
  return { ok: true, sent, skipped, failed, failures };
}
