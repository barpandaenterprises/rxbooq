import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "./database.types";

/**
 * Server-side Supabase client. Uses the user's session cookies so RLS applies
 * with their JWT (which carries clinic_id + role for clinic staff).
 *
 * Use this from Server Components, Server Actions, and Route Handlers.
 *
 * NOTE: `cookies()` is async in Next.js 15+ (continues in Next 16), so this
 *       function is async too. Always `await serverClient()` at the call site.
 */
export async function serverClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // Server Components cannot set cookies — middleware refreshes them.
          }
        },
      },
    },
  );
}

/**
 * Service-role Supabase client. Bypasses RLS — use ONLY in trusted code paths
 * such as webhook handlers and cron jobs that explicitly need cross-tenant
 * access. Never expose this client or its key to the browser.
 *
 * No cookies, no async — safe to call from any server context.
 */
export function serviceClient() {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set");
  }
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      cookies: {
        getAll: () => [],
        setAll: () => {},
      },
    },
  );
}
