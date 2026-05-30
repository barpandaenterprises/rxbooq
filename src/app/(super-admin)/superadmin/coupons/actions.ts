"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { serverClient, serviceClient } from "@/lib/supabase/server";

const createSchema = z.object({
  code:    z.string().trim().min(2).max(60).regex(/^[a-zA-Z0-9_-]+$/, "Letters, digits, dash, underscore"),
  kind:    z.enum(["percent", "flat"]),
  value:   z.number().int().positive(),
  scope:   z.enum(["first_cycle", "recurring"]),
  partnerUserId: z.string().uuid().nullable().optional(),
  notes:   z.string().max(400).optional(),
});

export type CreateCouponInput  = z.infer<typeof createSchema>;
export type CreateCouponResult = { ok: true; id: string } | { ok: false; error: string };

export async function createCouponAction(input: CreateCouponInput): Promise<CreateCouponResult> {
  const parsed = createSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  if (parsed.data.kind === "percent" && (parsed.data.value < 1 || parsed.data.value > 100)) {
    return { ok: false, error: "Percent value must be 1–100" };
  }

  // Superadmin gate.
  const sess = await serverClient();
  const { data: { user } } = await sess.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };
  const role = (user.app_metadata as Record<string, unknown>)?.role;
  if (role !== "superadmin") return { ok: false, error: "Forbidden." };

  const supabase = serviceClient();
  const { data, error } = await supabase
    .from("coupons")
    .insert({
      code:            parsed.data.code.toLowerCase(),
      kind:            parsed.data.kind,
      value:           parsed.data.value,
      scope:           parsed.data.scope,
      partner_user_id: parsed.data.partnerUserId ?? null,
      notes:           parsed.data.notes ?? null,
      created_by:      user.id,
    })
    .select("id")
    .single();

  if (error) {
    if (error.message.includes("duplicate")) return { ok: false, error: "Code already exists." };
    return { ok: false, error: error.message };
  }

  revalidatePath("/superadmin/coupons");
  return { ok: true, id: data.id };
}

export async function toggleCouponAction(
  couponId: string,
  active:   boolean,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const sess = await serverClient();
  const { data: { user } } = await sess.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };
  const role = (user.app_metadata as Record<string, unknown>)?.role;
  if (role !== "superadmin") return { ok: false, error: "Forbidden." };

  const supabase = serviceClient();
  const { error } = await supabase.from("coupons").update({ is_active: active }).eq("id", couponId);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/superadmin/coupons");
  return { ok: true };
}
