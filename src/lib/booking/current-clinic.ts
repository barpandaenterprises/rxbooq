import { cache } from "react";
import { headers } from "next/headers";
import { getClinicByHostOrSlug, type Clinic } from "@/lib/supabase/clinics";

/**
 * Resolve the tenant clinic for the current request from middleware-set
 * headers (`x-clinic-slug` / `x-host`). Cached per request.
 */
export const getCurrentClinic = cache(async (): Promise<Clinic | null> => {
  const h    = await headers();
  const slug = h.get("x-clinic-slug");
  const host = h.get("x-host");
  if (!slug && !host) return null;
  return getClinicByHostOrSlug({ slug, host });
});
