import { NextRequest, NextResponse } from "next/server";
import { serverClient } from "@/lib/supabase/server";

/**
 * Auth callback for email confirmation, magic links, and password reset.
 * Supabase redirects here with a `?code=...` PKCE token which we exchange for
 * a session cookie, then forward the user to `next` (or /admin/today).
 */
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const nextRaw = url.searchParams.get("next") ?? "/admin/today";

  // Whitelist internal paths only — prevents open-redirect via callback URL.
  const next = nextRaw.startsWith("/") && !nextRaw.startsWith("//")
    ? nextRaw
    : "/admin/today";

  if (!code) {
    return NextResponse.redirect(new URL("/login?error=Missing+auth+code", url.origin));
  }

  const supabase = await serverClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(error.message)}`, url.origin),
    );
  }

  return NextResponse.redirect(new URL(next, url.origin));
}
