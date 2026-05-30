"use server";

import { revalidatePath } from "next/cache";

import { serverClient, serviceClient } from "@/lib/supabase/server";

export async function setVerificationStatusAction(
  clinicId: string,
  status:   "verified" | "rejected",
): Promise<{ ok: true } | { ok: false; error: string }> {
  const sess = await serverClient();
  const { data: { user } } = await sess.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };
  const role = (user.app_metadata as Record<string, unknown>)?.role;
  if (role !== "superadmin") return { ok: false, error: "Forbidden." };

  const supabase = serviceClient();
  const { error } = await supabase
    .from("clinics")
    .update({
      verification_status: status,
      verified_at:         new Date().toISOString(),
      verified_by:         user.id,
    })
    .eq("id", clinicId);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/superadmin/verifications");
  return { ok: true };
}
