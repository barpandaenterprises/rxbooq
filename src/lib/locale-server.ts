import "server-only";
import { cookies } from "next/headers";
import { DEFAULT_LOCALE, LOCALE_COOKIE, type Locale } from "./locale";

/** Read the active locale from the request cookie. Defaults when missing or invalid. */
export async function getLocale(): Promise<Locale> {
  const store = await cookies();
  const value = store.get(LOCALE_COOKIE)?.value;
  return value === "hi" || value === "or" ? value : DEFAULT_LOCALE;
}
