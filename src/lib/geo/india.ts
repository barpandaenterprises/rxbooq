/**
 * India state + city lookups for the onboarding "About your clinic" step.
 *
 * Backed by the `country-state-city` dataset. That package bundles a large
 * worldwide cities table, so we pull it via dynamic import() — this keeps it
 * code-split out of the main client bundle and only loaded when the Practice
 * step actually mounts.
 */

export type GeoState = { name: string; iso: string };

/** Sentinel iso for a legacy/free-text state value that isn't in the dataset. */
export const CUSTOM_STATE_ISO = "__custom__";

let _statesCache: GeoState[] | null = null;

/** All Indian states + union territories, alphabetical. Cached after first load. */
export async function loadIndiaStates(): Promise<GeoState[]> {
  if (_statesCache) return _statesCache;
  const { State } = await import("country-state-city");
  _statesCache = State.getStatesOfCountry("IN")
    .map((s) => ({ name: s.name, iso: s.isoCode }))
    .sort((a, b) => a.name.localeCompare(b.name));
  return _statesCache;
}

/** Distinct city names for a state iso code, alphabetical. Empty if unknown. */
export async function loadIndiaCities(stateIso: string): Promise<string[]> {
  if (!stateIso || stateIso === CUSTOM_STATE_ISO) return [];
  const { City } = await import("country-state-city");
  const seen = new Set<string>();
  const out: string[] = [];
  for (const c of City.getCitiesOfState("IN", stateIso)) {
    if (seen.has(c.name)) continue;
    seen.add(c.name);
    out.push(c.name);
  }
  return out.sort((a, b) => a.localeCompare(b));
}
