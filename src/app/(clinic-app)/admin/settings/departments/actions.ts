"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { serverClient } from "@/lib/supabase/server";

// =============================================================================
// Helpers
// =============================================================================

async function requireClinicAdmin(): Promise<
  | { ok: true; clinicId: string }
  | { ok: false; error: string }
> {
  const supabase = await serverClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const { data: cu } = await supabase
    .from("clinic_users")
    .select("clinic_id, role")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (!cu?.clinic_id) return { ok: false, error: "Your account is not linked to a clinic." };
  if (cu.role !== "clinic_admin") return { ok: false, error: "Only clinic admins can manage departments." };
  return { ok: true, clinicId: cu.clinic_id };
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

// =============================================================================
// Create
// =============================================================================

const createSchema = z.object({
  name: z.string().trim().min(2, "Department name is required").max(60),
});

export type CreateDepartmentInput = z.infer<typeof createSchema>;

export async function createDepartmentAction(
  rawInput: CreateDepartmentInput,
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const parsed = createSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const gate = await requireClinicAdmin();
  if (!gate.ok) return gate;

  const slug = slugify(parsed.data.name);
  if (slug.length < 2) {
    return { ok: false, error: "Name must contain at least 2 letters/digits." };
  }

  const supabase = await serverClient();

  // Pick display_order = max + 1 so new depts append to the list.
  const { data: maxRow } = await supabase
    .from("departments")
    .select("display_order")
    .order("display_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  const displayOrder = ((maxRow?.display_order as number | undefined) ?? 0) + 1;

  const { data, error } = await supabase
    .from("departments")
    .insert({
      clinic_id:     gate.clinicId,
      name:          parsed.data.name,
      slug,
      display_order: displayOrder,
      is_active:     true,
    })
    .select("id")
    .single();

  if (error) {
    if ((error as { code?: string }).code === "23505") {
      return { ok: false, error: "A department with that name already exists." };
    }
    return { ok: false, error: error.message };
  }

  revalidatePath("/admin/settings/departments");
  return { ok: true, id: (data as { id: string }).id };
}

// =============================================================================
// Update (rename + reorder + active toggle)
// =============================================================================

const updateSchema = z.object({
  id:           z.string().uuid(),
  name:         z.string().trim().min(2).max(60).optional(),
  displayOrder: z.number().int().min(0).optional(),
  isActive:     z.boolean().optional(),
});

export type UpdateDepartmentInput = z.infer<typeof updateSchema>;

export async function updateDepartmentAction(
  rawInput: UpdateDepartmentInput,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const parsed = updateSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const gate = await requireClinicAdmin();
  if (!gate.ok) return gate;

  const { id, ...rest } = parsed.data;
  const patch: Record<string, unknown> = {};
  if (rest.name !== undefined)         patch.name          = rest.name;
  if (rest.displayOrder !== undefined) patch.display_order = rest.displayOrder;
  if (rest.isActive !== undefined)     patch.is_active     = rest.isActive;
  if (Object.keys(patch).length === 0) return { ok: true };

  const supabase = await serverClient();
  const { error } = await supabase
    .from("departments")
    .update(patch)
    .eq("id", id)
    .eq("clinic_id", gate.clinicId);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin/settings/departments");
  return { ok: true };
}

// =============================================================================
// Soft delete (deactivate) — doctors keep their FK; the dept just hides from
// active listings. Hard delete would orphan doctors (department_id → null via
// the FK ON DELETE SET NULL clause), which is recoverable but noisy.
// =============================================================================

const deactivateSchema = z.object({ id: z.string().uuid() });

export async function deactivateDepartmentAction(
  rawInput: z.infer<typeof deactivateSchema>,
): Promise<{ ok: true } | { ok: false; error: string }> {
  return updateDepartmentAction({ id: rawInput.id, isActive: false });
}

export async function reactivateDepartmentAction(
  rawInput: z.infer<typeof deactivateSchema>,
): Promise<{ ok: true } | { ok: false; error: string }> {
  return updateDepartmentAction({ id: rawInput.id, isActive: true });
}
