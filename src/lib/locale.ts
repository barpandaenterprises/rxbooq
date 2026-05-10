/**
 * Pure types + constants for locale handling. Safe to import from both
 * client and server components — must not pull in any server-only API
 * (e.g. `next/headers`). Server-side reading lives in `locale-server.ts`.
 */

export type Locale = "en" | "hi" | "or";

export const LOCALES: Locale[] = ["en", "hi", "or"];
export const DEFAULT_LOCALE: Locale = "en";
export const LOCALE_COOKIE = "NEXT_LOCALE";

export const LOCALE_LABELS: Record<Locale, { abbr: string; full: string }> = {
  en: { abbr: "EN", full: "English" },
  hi: { abbr: "हिं", full: "हिंदी" },
  or: { abbr: "ଓଡ଼ିଆ", full: "ଓଡ଼ିଆ" },
};
