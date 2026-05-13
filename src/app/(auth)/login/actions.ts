"use server";

import { redirect } from "next/navigation";
import { serverClient } from "@/lib/supabase/server";

/**
 * Server action: email + password sign-in for clinic staff.
 *
 * Form fields: email, password, next (optional redirect target).
 * On success redirects to `next` (whitelisted to internal paths) or /admin/today.
 * On failure throws — the page catches it via the `error` search param pattern.
 */
export async function signInWithPassword(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const nextRaw = String(formData.get("next") ?? "");

  // Only allow internal redirects to avoid open-redirect.
  const next = nextRaw.startsWith("/") && !nextRaw.startsWith("//")
    ? nextRaw
    : "/admin/today";

  if (!email || !password) {
    redirect(`/login?error=${encodeURIComponent("Email and password are required.")}&next=${encodeURIComponent(next)}`);
  }

  const supabase = await serverClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}&next=${encodeURIComponent(next)}`);
  }

  redirect(next);
}
