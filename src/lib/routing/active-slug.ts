/**
 * Server-only helper for actions/loaders that need the slug from the active
 * clinic URL — e.g. to build a `revalidatePath()` argument or to redirect to
 * a slug-prefixed path.
 *
 * The middleware sets `x-active-clinic-slug` on every request that maps to
 * a clinic-scoped URL (`/[slug]/admin/*`, `/[slug]/book/*`, `/[slug]`). This
 * helper just reads it back via `next/headers`.
 *
 * Returns null when the action was triggered from a non-clinic context
 * (apex marketing, /superadmin/*, etc.) — callers decide what to do.
 */

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";

export async function getActiveClinicSlug(): Promise<string | null> {
  const h = await headers();
  return h.get("x-active-clinic-slug");
}

/**
 * `revalidatePath()` wrapper that prepends the active clinic slug. Use from
 * server actions inside /[slug]/admin/* — keeps each callsite to one line
 * instead of inlining the await + slug interpolation.
 *
 * Falls back to the bare path when there's no active slug; that's a no-op
 * for cache invalidation purposes (the slug-prefixed path is what's cached).
 */
export async function revalidateActiveClinicPath(path: string): Promise<void> {
  const slug = await getActiveClinicSlug();
  revalidatePath(slug ? `/${slug}${path}` : path);
}
