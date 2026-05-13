import { NextRequest, NextResponse } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

type CookieToSet = { name: string; value: string; options: CookieOptions };

/**
 * Combines two concerns:
 *
 *   1. Tenant resolution — maps host/subdomain (or ?clinic= override in dev)
 *      to a clinic slug and stashes it on request headers so server components
 *      can read it. The DB lookup happens in src/lib/supabase/clinics.ts.
 *
 *   2. Supabase session refresh + auth gate — the @supabase/ssr middleware
 *      pattern. Reads cookies, refreshes the access token if needed, writes
 *      the new cookies back onto the response. Protected paths
 *      (/admin/*, /superadmin/*) require a signed-in user; otherwise we
 *      redirect to /login?next=<original>.
 *
 * Resolution order (tenant):
 *   1. Custom domain (drmahakur.com)
 *   2. Subdomain     (mahakur.doctorkart.in)
 *   3. Apex          (doctorkart.in or local dev) — no tenant
 */

const APEX_HOSTS = new Set([
  "doctorkart.in",
  "www.doctorkart.in",
  "doctorkart.local",
  "localhost:3000",
  "localhost",
]);

const PLATFORM_DOMAIN = "doctorkart.in";

function resolveTenantSlug(req: NextRequest): string | null {
  const host = req.headers.get("host")?.toLowerCase() ?? "";
  if (APEX_HOSTS.has(host)) return null;

  const devSlug =
    process.env.NODE_ENV !== "production"
      ? req.nextUrl.searchParams.get("clinic")
      : null;
  if (devSlug) return devSlug;

  if (host.endsWith(`.${PLATFORM_DOMAIN}`)) {
    return host.slice(0, -1 * (PLATFORM_DOMAIN.length + 1));
  }
  return null;
}

function isProtectedPath(pathname: string): boolean {
  return pathname.startsWith("/admin") || pathname.startsWith("/superadmin");
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const host = req.headers.get("host")?.toLowerCase() ?? "";

  // Start with a pass-through response that we'll attach cookies + headers to.
  let response = NextResponse.next({ request: req });

  // ---- Supabase session refresh -------------------------------------------
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          // Update both the incoming request (so downstream RSCs read fresh
          // cookies) and the outgoing response (so the browser stores them).
          cookiesToSet.forEach(({ name, value }) => req.cookies.set(name, value));
          response = NextResponse.next({ request: req });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // getUser() validates the token with the Supabase server and refreshes if
  // needed. Cheap when the token is fresh.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // ---- Auth gate ----------------------------------------------------------
  if (isProtectedPath(pathname) && !user) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("next", pathname + req.nextUrl.search);
    return NextResponse.redirect(loginUrl);
  }

  // ---- Tenant resolution headers (preserve previous behavior) -------------
  const slug = resolveTenantSlug(req);
  if (slug) {
    response.headers.set("x-clinic-slug", slug);
  }
  if (host && !APEX_HOSTS.has(host)) {
    response.headers.set("x-host", host);
  }

  return response;
}

export const config = {
  matcher: [
    // Skip static, image, fonts, healthcheck, and well-known files.
    "/((?!_next/static|_next/image|favicon.ico|api/health|fonts/|robots.txt|sitemap.xml).*)",
  ],
};
