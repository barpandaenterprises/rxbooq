import { cache } from "react";
import { serverClient } from "@/lib/supabase/server";

export type SignedInPatient = {
  authUserId: string;
  patientId:  string;
  clinicId:   string;
  phoneE164:  string;
};

/**
 * Resolves the signed-in patient (or null when unauthenticated / not linked).
 * Cached per request.
 */
export const getSignedInPatient = cache(async (): Promise<SignedInPatient | null> => {
  const supabase = await serverClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  // RLS lets a patient see their own patient_users row via patient_users_self.
  const { data: row } = await supabase
    .from("patient_users")
    .select("patient_id, clinic_id, phone_e164")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (!row?.patient_id) return null;

  return {
    authUserId: user.id,
    patientId:  row.patient_id,
    clinicId:   row.clinic_id,
    phoneE164:  row.phone_e164,
  };
});
