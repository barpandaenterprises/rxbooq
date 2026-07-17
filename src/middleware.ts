import { NextRequest, NextResponse } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { isReservedSlug } from "@/lib/routing/reserved-slugs";

type CookieToSet = { name: string; value: string; options: CookieOptions };

/**
 * Three concerns:
 *
 *   1. Tenant resolution (host → slug + URL → slug). Subdomain / custom
 *      domain map to a clinic slug. The URL form `/[slug]/admin/...` also
 *      carries the slug. Either way, we surface the active clinic slug via
 *      the `x-active-clinic-slug` response header that
 *      getCurrentStaffClinicId() reads server-side.
 *
 *   2. Subdomain → URL rewrite. When the slug came from the host (not the
 *      URL), we internally rewrite `/admin/today` to `/[slug]/admin/today`
 *      so the single `[clinicSlug]` route tree handles both apex and
 *      subdomain. Browser URL stays clean.
 *
 *   3. Supabase session refresh + auth gate. Protected admin paths require
 *      a signed-in user; otherwise redirect to /login?next=...
 *
 * Tenant resolution order (left wins):
 *   1. URL path: `/[slug]/...` where slug is not reserved
 *   2. Custom domain (clinics.custom_domain)
 *   3. Subdomain    (mahakur.rxbooq.com)
 *   4. Apex         (rxbooq.com or local dev) — no tenant
 */

const APEX_HOSTS = new Set([
  "rxbooq.com",
  "www.rxbooq.com",
  "rxbooq.local",
  "localhost:3000",
  "localhost",
]);

const PLATFORM_DOMAIN = "rxbooq.com";

/** Extracts the first path segment if it looks like a clinic slug — otherwise null. */
function extractUrlSlug(pathname: string): string | null {
  const m = pathname.match(/^\/([a-z0-9][a-z0-9-]*)(?:\/|$)/);
  if (!m) return null;
  const seg = m[1]!;
  if (isReservedSlug(seg)) return null;
  return seg;
}

/** Resolves the tenant slug from host (subdomain or `?clinic=` dev override). Null on apex. */
function resolveHostSlug(req: NextRequest): string | null {
  const host = req.headers.get("host")?.toLowerCase() ?? "";
  if (APEX_HOSTS.has(host)) {
    // Dev convenience: `?clinic=foo` on apex acts like the subdomain.
    if (process.env.NODE_ENV !== "production") {
      return req.nextUrl.searchParams.get("clinic");
    }
    return null;
  }
  if (host.endsWith(`.${PLATFORM_DOMAIN}`)) {
    return host.slice(0, -1 * (PLATFORM_DOMAIN.length + 1));
  }
  // Custom domain lookup happens DB-side in getClinicByHostOrSlug; we just
  // pass the host through and let downstream code resolve.
  return null;
}

function isProtectedPath(pathname: string): boolean {
  if (pathname.startsWith("/superadmin")) return true;
  // /[slug]/admin/* — slug already validated as non-reserved by the regex.
  return /^\/[a-z0-9][a-z0-9-]*\/admin(?:\/|$)/.test(pathname);
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const host = req.headers.get("host")?.toLowerCase() ?? "";

  // ---- Subdomain → URL rewrite ----------------------------------------------
  // If the tenant comes from the host AND the URL hasn't already been
  // prefixed with that slug, rewrite internally. The browser sees the clean
  // URL; Next.js route matching uses the prefixed form.
  const urlSlug  = extractUrlSlug(pathname);
  const hostSlug = resolveHostSlug(req);

  if (hostSlug && !urlSlug) {
    const target = pathname === "/" ? `/${hostSlug}` : `/${hostSlug}${pathname}`;
    const rewriteUrl = new URL(target + req.nextUrl.search, req.url);
    const rewriteResponse = NextResponse.rewrite(rewriteUrl);
    rewriteResponse.headers.set("x-active-clinic-slug", hostSlug);
    // Public-page server actions resolve the tenant via getCurrentClinic(),
    // which reads x-clinic-slug. Without this the apex `?clinic=` dev override
    // (and any host-resolved slug) leaves booking actions unable to find the
    // clinic — slots come back empty. Mirror the non-rewrite branch below.
    rewriteResponse.headers.set("x-clinic-slug", hostSlug);
    if (host && !APEX_HOSTS.has(host)) rewriteResponse.headers.set("x-host", host);
    return rewriteResponse;
  }

  // Active clinic for this request: URL wins, host falls back.
  const activeSlug = urlSlug ?? hostSlug;

  // Start with a pass-through response that we'll attach cookies + headers to.
  let response = NextResponse.next({ request: req });

  // ---- Supabase session refresh -------------------------------------------
  // Fail safe: a missing/invalid Supabase env var makes createServerClient
  // throw, and getUser() can fail on a transient network error. Either would
  // otherwise crash the Edge middleware (MIDDLEWARE_INVOCATION_FAILED) and
  // 500 *every* matched route, including public pages. Instead we swallow the
  // error, treat the request as unauthenticated, and let the auth gate below
  // decide: public paths fall through and render, protected paths redirect to
  // /login — so a config outage degrades gracefully instead of downing the site.
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  let user: { id: string } | null = null;

  if (supabaseUrl && supabaseAnonKey) {
    try {
      const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
        cookies: {
          getAll() {
            return req.cookies.getAll();
          },
          setAll(cookiesToSet: CookieToSet[]) {
            cookiesToSet.forEach(({ name, value }) => req.cookies.set(name, value));
            response = NextResponse.next({ request: req });
            cookiesToSet.forEach(({ name, value, options }) =>
              response.cookies.set(name, value, options),
            );
          },
        },
      });

      const { data } = await supabase.auth.getUser();
      user = data.user;
    } catch (err) {
      console.error("[middleware] Supabase session refresh failed:", err);
    }
  } else {
    console.error(
      "[middleware] Missing NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY — treating request as unauthenticated.",
    );
  }

  // ---- Auth gate ----------------------------------------------------------
  if (isProtectedPath(pathname) && !user) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("next", pathname + req.nextUrl.search);
    return NextResponse.redirect(loginUrl);
  }

  // ---- Active-clinic header ----------------------------------------------
  // Read by getCurrentStaffClinicId() and any data loader that needs to know
  // which clinic the user is acting in for the current request.
  if (activeSlug) {
    response.headers.set("x-active-clinic-slug", activeSlug);
  }

  // Legacy header (used by getCurrentClinic() / loadClinicForPublicPage in
  // the per-clinic public page rendering path). Keep populated from host
  // resolution only — the URL-slug case is handled by params in the page.
  if (hostSlug) {
    response.headers.set("x-clinic-slug", hostSlug);
  }
  if (host && !APEX_HOSTS.has(host)) {
    response.headers.set("x-host", host);
  }

  return response;
}

export const config = {
  matcher: [
    // Skip static, image, fonts, healthcheck, well-known files, plus webhook
    // and cron endpoints (they verify their own signatures/secrets and must
    // not invoke Supabase session refresh).
    "/((?!_next/static|_next/image|favicon.ico|api/health|api/webhooks/|api/cron/|fonts/|robots.txt|sitemap.xml).*)",
  ],
};
