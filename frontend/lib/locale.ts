export type Locale = "vi" | "en";

export const LOCALES: Locale[] = ["vi", "en"];
export const DEFAULT_LOCALE: Locale = "vi";
export const LOCALE_COOKIE = "planwise-locale";

export function isLocale(value: unknown): value is Locale {
  return value === "vi" || value === "en";
}

/* Active UI locale for plain library helpers (formatters, labels). The I18nProvider sets it
   during render, so components that read the locale through useI18n() see consistent text. */
let active: Locale = DEFAULT_LOCALE;

export function setActiveLocale(locale: Locale) {
  active = locale;
}

export function getLocale(): Locale {
  return active;
}

/** Pick the Vietnamese or English variant of a string for the active locale. */
export function tr(vi: string, en: string): string {
  return active === "en" ? en : vi;
}

/** BCP 47 tag for Intl formatters. */
export function intlLocale(locale: Locale = active): string {
  return locale === "en" ? "en-US" : "vi-VN";
}
