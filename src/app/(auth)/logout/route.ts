import { NextRequest, NextResponse } from "next/server";
import { serverClient } from "@/lib/supabase/server";

/**
 * Sign out the current user and redirect to /login.
 * POST is the standard for state-changing actions; we also accept GET so a
 * plain anchor link works as a sign-out trigger from the admin UI.
 */
async function handle(req: NextRequest) {
  const supabase = await serverClient();
  await supabase.auth.signOut();

  const url = new URL("/login", req.url);
  return NextResponse.redirect(url);
}

export const POST = handle;
export const GET  = handle;
