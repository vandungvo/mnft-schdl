"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo } from "react";

import { algorithmInfo } from "./algorithms";
import { ApiError, commitScheduleDecision, listScheduleDecisions } from "./api";
import type { ScheduleDecision, ScheduleDecisionCreate } from "./types";

/** One committed schedule as the UI shows it (oldest → newest in `entries`). */
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
  actor?: string;
}

function toEntry(decision: ScheduleDecision): DecisionEntry {
  return {
    at: decision.decided_at,
    runId: decision.run_id ?? "",
    inputHash: decision.input_hash,
    alternative: decision.alternative,
    algorithm: `${algorithmInfo(decision.algorithm).label} · seed ${decision.seed}`,
    policy: decision.policy,
    score: decision.score,
    late: decision.late,
    shortfall: decision.shortfall,
    shifts: decision.shifts,
    reason: decision.reason,
    actor: decision.actor,
  };
}

/* ---------- one-time import of decisions recorded in this browser before the server stored them ---------- */

const legacyKeyOf = (datasetId: string) => `schedule-os:decisions:${datasetId}`;
const migratedKeyOf = (datasetId: string) => `schedule-os:decisions-migrated:${datasetId}`;
const inFlight = new Map<string, Promise<number>>();

/** Sends each old entry once (the server dedupes by legacy_key), keeping its original time.
 *  The browser copy is left untouched; a flag stops re-sending. Returns how many were sent. */
function migrateLegacy(datasetId: string): Promise<number> {
  const running = inFlight.get(datasetId);
  if (running) return running;
  const task = (async () => {
    let raw: string | null = null;
    try {
      if (window.localStorage.getItem(migratedKeyOf(datasetId))) return 0;
      raw = window.localStorage.getItem(legacyKeyOf(datasetId));
    } catch { return 0; }
    let legacy: DecisionEntry[] = [];
    try { legacy = raw ? (JSON.parse(raw) as DecisionEntry[]) : []; } catch { legacy = []; }
    let sent = 0;
    for (const entry of legacy) {
      if (!entry?.runId || !entry.reason?.trim()) continue;
      try {
        await commitScheduleDecision(datasetId, {
          run_id: entry.runId, alternative: entry.alternative, policy: entry.policy, score: entry.score ?? "",
          late: entry.late ?? 0, shortfall: entry.shortfall ?? 0, shifts: entry.shifts ?? 0, reason: entry.reason,
          decided_at: entry.at, legacy_key: `local:${datasetId}:${entry.at}:${entry.runId}`,
        });
        sent += 1;
      } catch (error) {
        // 4xx = this entry can never be stored (run gone, other scenario…): skip it. Anything else: retry next visit.
        if (!(error instanceof ApiError && error.status >= 400 && error.status < 500)) return sent;
      }
    }
    try { window.localStorage.setItem(migratedKeyOf(datasetId), new Date().toISOString()); } catch { /* storage unavailable */ }
    return sent;
  })().finally(() => inFlight.delete(datasetId));
  inFlight.set(datasetId, task);
  return task;
}

/** Decision journal of a scenario, stored on the server (shared across devices and people). */
export function useDecisionLog(datasetId: string) {
  const queryClient = useQueryClient();
  const queryKey = useMemo(() => ["decisions", datasetId], [datasetId]);
  const query = useQuery({ queryKey, queryFn: () => listScheduleDecisions(datasetId), enabled: Boolean(datasetId) });
  const entries = useMemo(() => [...(query.data?.items ?? [])].reverse().map(toEntry), [query.data]);

  useEffect(() => {
    if (!datasetId) return;
    void migrateLegacy(datasetId).then((sent) => { if (sent) void queryClient.invalidateQueries({ queryKey }); });
  }, [datasetId, queryClient, queryKey]);

  const mutation = useMutation({
    mutationFn: (payload: ScheduleDecisionCreate) => commitScheduleDecision(datasetId, payload),
    onSuccess: async () => {
      // The commit is also an audit event, shown in the scenario's History tab.
      await Promise.all([queryClient.invalidateQueries({ queryKey }), queryClient.invalidateQueries({ queryKey: ["audit-events", "master_dataset", datasetId] })]);
    },
  });
  const { mutateAsync } = mutation;
  /** Resolves true once the server has stored the decision. */
  const append = useCallback(async (payload: ScheduleDecisionCreate): Promise<boolean> => {
    try { await mutateAsync(payload); return true; } catch { return false; }
  }, [mutateAsync]);

  return { entries, append, loading: query.isLoading, loadError: query.isError, saving: mutation.isPending, saveError: mutation.error };
}
