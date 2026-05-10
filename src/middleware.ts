import { NextRequest, NextResponse } from "next/server";

/**
 * Tenant resolution middleware.
 *
 * Maps an incoming request to exactly one clinic before any application code
 * runs. The clinic id + slug are stashed into request headers so every Server
 * Component, Server Action, and route handler can read them via headers().
 *
 * Resolution order:
 *   1. Custom domain match  (drmahakur.com)
 *   2. Subdomain match      (mahakur.doctorkart.in)
 *   3. Apex / marketing site (doctorkart.in or local dev)
 *
 * In dev you can also pass ?clinic=mahakur to simulate a tenant.
 */

const APEX_HOSTS = new Set([
  "doctorkart.in",
  "www.doctorkart.in",
  "doctorkart.local",
  "localhost:3000",
  "localhost",
]);

const PLATFORM_DOMAIN = "doctorkart.in";

export async function middleware(req: NextRequest) {
  const url = req.nextUrl;
  const host = req.headers.get("host")?.toLowerCase() ?? "";

  // Marketing apex — pass through with no tenant
  if (APEX_HOSTS.has(host)) {
    return NextResponse.next();
  }

  // Dev override: ?clinic=<slug>
  const devSlug =
    process.env.NODE_ENV !== "production"
      ? url.searchParams.get("clinic")
      : null;

  let slug: string | null = devSlug;

  if (!slug) {
    // Subdomain match: mahakur.doctorkart.in -> "mahakur"
    if (host.endsWith(`.${PLATFORM_DOMAIN}`)) {
      slug = host.slice(0, -1 * (PLATFORM_DOMAIN.length + 1));
    }
  }

  // For now, we identify the tenant by slug only. The DB lookup (which also
  // handles custom domains and 404s) is performed in src/lib/supabase/clinics.ts
  // via the layout. The middleware just propagates what it knows.
  const res = NextResponse.next();
  if (slug) {
    res.headers.set("x-clinic-slug", slug);
  }
  // x-clinic-id is set later, after the layout fetches the clinic record by
  // slug or by host (for custom domains).
  if (host && !APEX_HOSTS.has(host)) {
    res.headers.set("x-host", host);
  }
  return res;
}

export const config = {
  matcher: [
    // Run on every path except static assets, _next internals, the health
    // endpoint, and static files (favicon etc).
    "/((?!_next/static|_next/image|favicon.ico|api/health|fonts/|robots.txt|sitemap.xml).*)",
  ],
};
