/**
 * Shared helpers for one-off ops scripts under scripts/*.ts.
 *
 * Scripts are invoked via:
 *   npx tsx --env-file=.env.local scripts/<name>.ts <args…>
 *
 * Node 20+ reads .env.local natively via --env-file, so we don't depend on
 * dotenv. The Supabase service role bypasses RLS — these scripts are
 * privileged operator tools, never for runtime use.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let _client: SupabaseClient | null = null;

/** Memoised service-role client. */
export function svc(): SupabaseClient {
  if (_client) return _client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    die("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Did you pass --env-file=.env.local?");
  }
  _client = createClient(url, key, { auth: { persistSession: false } });
  return _client;
}

// =============================================================================
// Output helpers — keep stdout consistent across scripts.
// =============================================================================

export function ok(msg: string): void {
  console.log(`✓ ${msg}`);
}

export function warn(msg: string): void {
  console.warn(`⚠ ${msg}`);
}

export function info(msg: string): void {
  console.log(`  ${msg}`);
}

export function die(msg: string): never {
  console.error(`✗ ${msg}`);
  process.exit(1);
}

/**
 * Wrap a script's async body. Avoids top-level await (esbuild + CJS) and
 * centralises uncaught error handling so every script gets a consistent
 * `✗ <message>` line + exit 1 on failure.
 */
export function run(fn: () => Promise<void>): void {
  fn().catch((e) => die(e instanceof Error ? e.message : String(e)));
}

// =============================================================================
// Positional arg parser. Names are used for the usage line if any are missing.
// =============================================================================

export function args(names: string[]): string[] {
  const a = process.argv.slice(2);
  if (a.length < names.length) {
    const script = process.argv[1]?.split(/[\\/]/).pop() ?? "script.ts";
    die(`Usage: ${script} <${names.join("> <")}>`);
  }
  return a.slice(0, names.length);
}

// =============================================================================
// Common lookups — every script uses these.
// =============================================================================

export type AuthUser = { id: string; email: string | null; phone: string | null };

export async function findAuthUserByEmail(email: string): Promise<AuthUser | null> {
  const sb = svc();
  // The auth admin API doesn't expose a 'where email=' query; paginate and match.
  // For small dev tenants this is fine; for prod (>1000 users) we'd page until match.
  const { data, error } = await sb.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (error) die(`auth.admin.listUsers failed: ${error.message}`);
  const u = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
  return u ? { id: u.id, email: u.email ?? null, phone: u.phone ?? null } : null;
}

export type ClinicLite = { id: string; slug: string; name: string };

export async function findClinicBySlug(slug: string): Promise<ClinicLite | null> {
  const { data, error } = await svc()
    .from("clinics")
    .select("id, slug, name")
    .eq("slug", slug)
    .maybeSingle();
  if (error) die(`clinic lookup failed: ${error.message}`);
  return data ?? null;
}
