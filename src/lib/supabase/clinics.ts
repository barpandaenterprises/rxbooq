import { cache } from "react";
import { serviceClient } from "./server";

export type ClinicTheme = {
  brand?: string;
  brandDark?: string;
  logoUrl?: string;
};

export type Clinic = {
  id: string;
  slug: string;
  custom_domain: string | null;
  name: string;
  plan: "silver" | "gold";
  status: "active" | "suspended" | "onboarding";
  theme: ClinicTheme | null;
  locale_default: string;
  locales: string[];
  whatsapp_number: string | null;
};

/**
 * Resolve a clinic by id. Cached per request (React `cache`) so the layout
 * and any downstream component sharing the same id only hits the DB once.
 */
export const getClinicById = cache(async (id: string): Promise<Clinic | null> => {
  if (!id) return null;
  const sb = serviceClient();
  const { data, error } = await sb
    .from("clinics")
    .select("id, slug, custom_domain, name, plan, status, theme, locale_default, locales, whatsapp_number")
    .eq("id", id)
    .maybeSingle();
  if (error) {
    console.error("getClinicById error", error);
    return null;
  }
  return data as unknown as Clinic | null;
});

/**
 * Resolve a clinic by slug or custom domain. Used inside the route layouts
 * after the middleware passes us x-clinic-slug or x-host.
 */
export const getClinicByHostOrSlug = cache(async (params: { slug?: string | null; host?: string | null }) => {
  const { slug, host } = params;
  if (!slug && !host) return null;
  const sb = serviceClient();

  if (slug) {
    const { data } = await sb
      .from("clinics")
      .select("id, slug, custom_domain, name, plan, status, theme, locale_default, locales, whatsapp_number")
      .eq("slug", slug)
      .maybeSingle();
    if (data) return data as unknown as Clinic;
  }

  if (host) {
    const { data } = await sb
      .from("clinics")
      .select("id, slug, custom_domain, name, plan, status, theme, locale_default, locales, whatsapp_number")
      .eq("custom_domain", host)
      .maybeSingle();
    if (data) return data as unknown as Clinic;
  }

  return null;
});
