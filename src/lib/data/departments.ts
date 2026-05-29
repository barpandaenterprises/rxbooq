/**
 * Read-only accessor for `public.departments`.
 * RLS (migration 0010) scopes results to the caller's clinic.
 *
 * Server actions (create / update / deactivate) live alongside the page that
 * uses them at `src/app/(clinic-app)/admin/settings/departments/actions.ts`.
 */

import { serverClient } from "@/lib/supabase/server";

export type Department = {
  id:           string;
  clinicId:     string;
  name:         string;
  slug:         string;
  displayOrder: number;
  isActive:     boolean;
  createdAt:    string;
};

type Row = {
  id:            string;
  clinic_id:     string;
  name:          string;
  slug:          string;
  display_order: number;
  is_active:     boolean;
  created_at:    string;
};

function rowToDept(r: Row): Department {
  return {
    id:           r.id,
    clinicId:     r.clinic_id,
    name:         r.name,
    slug:         r.slug,
    displayOrder: r.display_order,
    isActive:     r.is_active,
    createdAt:    r.created_at,
  };
}

const COLUMNS = "id, clinic_id, name, slug, display_order, is_active, created_at";

/** Active + inactive departments for the caller's clinic, ordered for UI. */
export async function listDepartments(): Promise<Department[]> {
  const supabase = await serverClient();
  const { data, error } = await supabase
    .from("departments")
    .select(COLUMNS)
    .order("display_order", { ascending: true })
    .order("name",          { ascending: true });

  if (error) {
    console.error("[departments] list failed:", error.message);
    return [];
  }
  return ((data as unknown as Row[] | null) ?? []).map(rowToDept);
}

/** Just the active departments — for booking dropdowns and doctor pickers. */
export async function listActiveDepartments(): Promise<Department[]> {
  const all = await listDepartments();
  return all.filter((d) => d.isActive);
}
