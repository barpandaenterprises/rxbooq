/**
 * High-level WhatsApp send-and-log helper.
 *
 * Every outbound WhatsApp message goes through this function so that:
 *  - the provider call (Interakt) and the DB log are atomic from the caller's
 *    perspective — one helper, one return shape
 *  - failures are logged with status='failed' so they show up in /admin/messages
 *  - patient opt-outs are respected
 *  - MOCK_DATA mode short-circuits to no-op (returns ok with a fake id) so the
 *    booking flow stays usable without Interakt credentials in dev
 */

import { serviceClient } from "@/lib/supabase/server";
import { useMockData } from "@/lib/feature-flags";
import { interakt } from "./interakt";
import type { WaLocale } from "./types";

export type SendTemplateOpts = {
  clinicId:        string;
  patientId:       string;
  appointmentId?:  string;
  /** Canonical template name registered with Interakt + wa_templates. */
  template:        string;
  language:        WaLocale;
  variables:       string[];
  /** E.164. The recipient. */
  to:              string;
  /** When true, skip the send if patients.whatsapp_opt_in is false. Default true. */
  respectOptOut?:  boolean;
};

export type SendTemplateResult =
  | { ok: true;  providerMessageId: string }
  | { ok: false; error: string; skipped?: "optout" };

export async function sendWaTemplate(opts: SendTemplateOpts): Promise<SendTemplateResult> {
  const supabase = serviceClient();
  const mock     = useMockData();

  // Opt-out gate.
  if (opts.respectOptOut !== false) {
    const { data: patient } = await supabase
      .from("patients")
      .select("whatsapp_opt_in")
      .eq("id", opts.patientId)
      .maybeSingle();
    if (patient && patient.whatsapp_opt_in === false) {
      // Log the skip so it shows up in audit/inbox.
      await supabase.from("wa_messages").insert({
        clinic_id:      opts.clinicId,
        patient_id:     opts.patientId,
        appointment_id: opts.appointmentId ?? null,
        template_name:  opts.template,
        direction:      "out",
        payload:        { variables: opts.variables },
        status:         "skipped_optout",
      });
      return { ok: false, error: "Patient has opted out of WhatsApp.", skipped: "optout" };
    }
  }

  let providerMessageId = "";
  let sendError: string | null = null;
  if (mock) {
    // Mock mode skips the Interakt round-trip — we still record the message
    // in wa_messages so the inbox and audit logs look realistic in dev.
    providerMessageId = `mock-${Date.now()}`;
  } else {
    try {
      const result = await interakt.sendTemplate({
        to:        opts.to,
        template:  opts.template,
        language:  opts.language,
        variables: opts.variables,
        contextRef: opts.appointmentId
          ? { type: "appointment", id: opts.appointmentId }
          : { type: "patient", id: opts.patientId },
      });
      providerMessageId = result.providerMessageId;
    } catch (err) {
      sendError = err instanceof Error ? err.message : String(err);
    }
  }

  await supabase.from("wa_messages").insert({
    clinic_id:           opts.clinicId,
    patient_id:          opts.patientId,
    appointment_id:      opts.appointmentId ?? null,
    template_name:       opts.template,
    direction:           "out",
    payload:             { variables: opts.variables, body: composeBody(opts) },
    status:              sendError ? "failed" : "queued",
    provider_message_id: providerMessageId || null,
    error:               sendError,
  });

  if (sendError) return { ok: false, error: sendError };
  return { ok: true, providerMessageId };
}

function composeBody(opts: SendTemplateOpts): string {
  // Best-effort preview body for the /admin/messages thread view. The real
  // body lives in Interakt's template; we mirror the variables here.
  return `[${opts.template}] ${opts.variables.join(" · ")}`;
}

// =============================================================================
// Free-form session reply — within Meta's 24-hour customer-care window.
// =============================================================================

export type SendSessionOpts = {
  clinicId:       string;
  patientId:      string;
  appointmentId?: string;
  to:             string;
  text:           string;
};

export async function sendWaSession(opts: SendSessionOpts): Promise<SendTemplateResult> {
  const supabase = serviceClient();
  const mock     = useMockData();

  let providerMessageId = "";
  let sendError: string | null = null;
  if (mock) {
    providerMessageId = `mock-${Date.now()}`;
  } else {
    try {
      const result = await interakt.sendSession({ to: opts.to, text: opts.text });
      providerMessageId = result.providerMessageId;
    } catch (err) {
      sendError = err instanceof Error ? err.message : String(err);
    }
  }

  await supabase.from("wa_messages").insert({
    clinic_id:           opts.clinicId,
    patient_id:          opts.patientId,
    appointment_id:      opts.appointmentId ?? null,
    template_name:       null,
    direction:           "out",
    payload:             { body: opts.text },
    status:              sendError ? "failed" : "queued",
    provider_message_id: providerMessageId || null,
    error:               sendError,
  });

  if (sendError) return { ok: false, error: sendError };
  return { ok: true, providerMessageId };
}
