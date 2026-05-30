"use server";

import { revalidatePath } from "next/cache";
import { serverClient } from "@/lib/supabase/server";
import { syncPlans, type SyncPlansResult } from "@/lib/razorpay/plans";

export type RunSyncResult =
  | { ok: true; result: SyncPlansResult }
  | { ok: false; error: string };

export async function runSyncPlansAction(): Promise<RunSyncResult> {
  const sess = await serverClient();
  const { data: { user } } = await sess.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };
  const role = (user.app_metadata as Record<string, unknown>)?.role;
  if (role !== "superadmin") return { ok: false, error: "Forbidden." };

  try {
    const result = await syncPlans();
    revalidatePath("/superadmin/billing/sync-plans");
    return { ok: true, result };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}
