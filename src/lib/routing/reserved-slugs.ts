/**
 * Top-level path segments that must NOT be used as a clinic slug, because
 * they collide with existing static routes under src/app/. If a clinic ever
 * gets one of these slugs, Next.js routing precedence sends the request to
 * the static route and the clinic's URLs (`/<slug>/admin/today`) break.
 *
 * Enforced at three layers:
 *   1. Middleware skips setting `x-active-clinic-slug` when the first path
 *      segment is reserved — keeps the URL extraction safe.
 *   2. `[clinicSlug]/page.tsx` calls notFound() if params.clinicSlug is
 *      reserved — defense-in-depth.
 *   3. Onboarding/edit forms reject these slugs via Zod (see
 *      saveOnboardingStepAction + plan/clinic editors).
 *
 * When you add a new top-level static route under src/app/, add the
 * corresponding segment here.
 */

export const RESERVED_SLUGS = new Set<string>([
  // App routes
  "admin",
  "api",
  "auth",
  "book",
  "d",
  "get-started",
  "login",
  "logout",
  "me",
  "pricing",
  "superadmin",

  // Next.js conventions / static assets at root
  "_next",
  "favicon.ico",
  "robots.txt",
  "sitemap.xml",
  "manifest.json",
]);

export function isReservedSlug(slug: string): boolean {
  return RESERVED_SLUGS.has(slug.toLowerCase());
}
