/**
 * Feature flags read from env. Server-only (no NEXT_PUBLIC_ prefix).
 *
 * MOCK_DATA — when "true", data fetchers return their canned demo data
 *             instead of querying Supabase. Lets us iterate on UI without
 *             needing a fully seeded DB. Default: false.
 */

export function useMockData(): boolean {
  return process.env.MOCK_DATA === "true";
}
