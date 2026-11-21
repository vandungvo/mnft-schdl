"use client";

import { useCallback, useSyncExternalStore } from "react";

/* A per-viewer preference kept in localStorage (storage may be blocked: it then falls back silently).
   The server snapshot is always the fallback, so the first client render matches the SSR HTML and
   the stored value is applied right after hydration — reading storage in a useState initializer
   instead makes server and client disagree and React throws a hydration error. */

const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  window.addEventListener("storage", listener);
  return () => { listeners.delete(listener); window.removeEventListener("storage", listener); };
}

function read(key: string): string | null {
  try { return window.localStorage.getItem(key); } catch { return null; }
}

export function useStoredPreference<T extends string>(key: string, fallback: T, allowed: readonly T[]): [T, (value: T) => void] {
  const stored = useSyncExternalStore(subscribe, () => read(key), () => null);
  const value = stored !== null && allowed.includes(stored as T) ? (stored as T) : fallback;
  const set = useCallback((next: T) => {
    try { window.localStorage.setItem(key, next); } catch { /* per-viewer convenience only */ }
    listeners.forEach((listener) => listener());
  }, [key]);
  return [value, set];
}
