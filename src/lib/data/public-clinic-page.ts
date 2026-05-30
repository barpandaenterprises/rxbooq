import { cache } from "react";
import { serviceClient } from "@/lib/supabase/server";

/**
 * Single shared loader for the rich per-clinic public page (the one rendered
 * at /d/{slug} AND at the tenant-resolved apex).
 *
 * Uses serviceClient because anon RLS on clinics is deny-by-default and these
 * are server-only reads with a tightly-scoped projection.
 */

export type PublicClinic = {
  id:                  string;
  slug:                string;
  name:                string;
  whatsapp_number:     string | null;
  verification_status: "unverified" | "pending" | "verified" | "rejected";
  address:             string;
  city:                string;
  state:               string;
  pincode:             string;
  pitch:               string | null;
  /** Founding doctor years_experience — surfaced as a trust badge. */
  founding_years:      number | null;
};

export type PublicDoctor = {
  id:                 string;
  display_name:       string;
  qualifications:     string | null;
  photo_url:          string | null;
  primary_specialty:  string | null;
  years_experience:   number | null;
  languages:          string[] | null;
  bio:                string | null;
};

export type PublicService = {
  id:               string;
  name:             string;
  description:      string | null;
  duration_minutes: number;
  price_inr:        number | null;
};

export type PublicDepartment = {
  id:    string;
  name:  string;
  slug:  string;
};

export type PublicClinicPage = {
  clinic:       PublicClinic;
  doctors:      PublicDoctor[];
  services:     PublicService[];
  departments:  PublicDepartment[];
};

export const loadClinicForPublicPage = cache(
  async (lookup: { slug?: string; id?: string }): Promise<PublicClinicPage | null> => {
    const supabase = serviceClient();

    // 1. Clinic header row.
    const baseQ = supabase
      .from("clinics")
      .select("id, slug, name, whatsapp_number, verification_status")
      .eq("status", "active");
    const { data: clinic } = lookup.id
      ? await baseQ.eq("id", lookup.id).maybeSingle()
      : await baseQ.eq("slug", lookup.slug!).maybeSingle();
    if (!clinic) return null;

    // 2. Address fields live on the activated clinic_applications row.
    const { data: app } = await supabase
      .from("clinic_applications")
      .select("address, city, state, pincode, pitch, doctor_years_experience")
      .eq("clinic_id", clinic.id)
      .eq("status", "active")
      .maybeSingle();

    // 3. Doctors, services, departments — parallel.
    const [{ data: doctors }, { data: services }, { data: departments }] = await Promise.all([
      supabase
        .from("doctors")
        .select("id, display_name, qualifications, photo_url, primary_specialty, years_experience, languages, bio")
        .eq("clinic_id", clinic.id)
        .eq("status", "active")
        .order("display_order"),
      supabase
        .from("services")
        .select("id, name, description, duration_minutes, price_inr")
        .eq("clinic_id", clinic.id)
        .eq("is_active", true)
        .order("display_order"),
      supabase
        .from("departments")
        .select("id, name, slug")
        .eq("clinic_id", clinic.id)
        .eq("is_active", true)
        .order("display_order"),
    ]);

    return {
      clinic: {
        id:                  clinic.id,
        slug:                clinic.slug,
        name:                clinic.name,
        whatsapp_number:     clinic.whatsapp_number,
        verification_status: clinic.verification_status,
        address:             app?.address ?? "",
        city:                app?.city ?? "",
        state:               app?.state ?? "",
        pincode:             app?.pincode ?? "",
        pitch:               app?.pitch ?? null,
        founding_years:      app?.doctor_years_experience ?? null,
      },
      doctors:     (doctors ?? []) as PublicDoctor[],
      services:    (services ?? []) as PublicService[],
      departments: (departments ?? []) as PublicDepartment[],
    };
  },
);
