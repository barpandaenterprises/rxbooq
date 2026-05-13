"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { serverClient } from "@/lib/supabase/server";
import { useMockData } from "@/lib/feature-flags";
import { sendWaSession } from "@/lib/wa/send";

const replySchema = z.object({
  patientId: z.string().min(1),
  text:      z.string().trim().min(1, "Type a message before sending"),
});

export type SendReplyInput = z.infer<typeof replySchema>;

export type SendReplyResult =
  | { ok: true;  mock: true }
  | { ok: true;  mock: false; providerMessageId: string }
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

  if (useMockData()) return { ok: true, mock: true };

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

  revalidatePath("/admin/messages");

  if (result.mock) return { ok: true, mock: true };
  return { ok: true, mock: false, providerMessageId: result.providerMessageId };
}
