"use client";

import { useCallback, useSyncExternalStore } from "react";

export interface DecisionEntry {
  at: string;
  runId: string;
  inputHash: string;
  alternative: string;
  algorithm: string;
  policy: string;
  score: string;
  late: number;
  shortfall: number;
  shifts: number;
  reason: string;
}

const listeners = new Set<() => void>();
const cache = new Map<string, { raw: string | null; value: DecisionEntry[] }>();
const EMPTY: DecisionEntry[] = [];
const keyOf = (datasetId: string) => `schedule-os:decisions:${datasetId}`;

function read(datasetId: string): DecisionEntry[] {
  let raw: string | null = null;
  try { raw = window.localStorage.getItem(keyOf(datasetId)); } catch { return EMPTY; }
  const hit = cache.get(datasetId);
  if (hit && hit.raw === raw) return hit.value;
  let value: DecisionEntry[] = EMPTY;
  try { value = raw ? (JSON.parse(raw) as DecisionEntry[]) : EMPTY; } catch { value = EMPTY; }
  cache.set(datasetId, { raw, value });
  return value;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => { if (event.key?.startsWith("schedule-os:decisions:")) listener(); };
  window.addEventListener("storage", onStorage);
  return () => { listeners.delete(listener); window.removeEventListener("storage", onStorage); };
}

/** Decision journal per dataset. Stored on this device until the backend exposes a decisions endpoint. */
export function useDecisionLog(datasetId: string) {
  const entries = useSyncExternalStore(subscribe, () => read(datasetId), () => EMPTY);
  const append = useCallback((entry: DecisionEntry): boolean => {
    try {
      window.localStorage.setItem(keyOf(datasetId), JSON.stringify([...read(datasetId), entry]));
    } catch {
      return false;
    }
    listeners.forEach((listener) => listener());
    return true;
  }, [datasetId]);
  return { entries, append };
}
