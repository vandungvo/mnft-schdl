"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

import { LOCALE_COOKIE, setActiveLocale, type Locale } from "@/lib/locale";

interface I18nValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  /** Inline translation: t("Tổng quan", "Overview") or t(["Tổng quan", "Overview"]). */
  t: Translate;
}

interface Translate {
  (vi: string, en: string): string;
  (pair: readonly [string, string]): string;
}

const I18nContext = createContext<I18nValue | null>(null);

export function I18nProvider({ initialLocale, children }: { initialLocale: Locale; children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale);
  setActiveLocale(locale);

  const setLocale = useCallback((next: Locale) => {
    setActiveLocale(next);
    document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
    document.documentElement.lang = next;
    setLocaleState(next);
  }, []);

  const value = useMemo<I18nValue>(() => {
    const t = ((vi: string | readonly [string, string], en?: string) => {
      const pair = typeof vi === "string" ? [vi, en ?? vi] : vi;
      return locale === "en" ? pair[1] : pair[0];
    }) as Translate;
    return { locale, setLocale, t };
  }, [locale, setLocale]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const value = useContext(I18nContext);
  if (!value) throw new Error("useI18n must be used inside I18nProvider");
  return value;
}
