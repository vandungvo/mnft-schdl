import { algorithmInfo } from "./algorithms";
import { intlLocale, tr } from "./locale";
import { plantOf } from "./plant";
import type { AnySchedulingInput, ScheduleOperation, ScheduleRunDetail } from "./types";

/* ---------- objective terms & policies ---------- */

export interface Term { key: string; label: string; help: string }

/** key → [[label vi, label en], [help vi, help en]] */
const TERM_TEXT: Record<string, [[string, string], [string, string]]> = {
  weighted_tardiness: [["Trễ có trọng số", "Weighted tardiness"], ["Σ ưu tiên đơn × số phút trễ hạn", "Σ order priority × minutes late"]],
  safety_shortfall: [["Thiếu tồn an toàn", "Safety-stock shortfall"], ["số đơn vị thiếu so với tồn an toàn, cộng qua các mốc cuối ngày", "units below safety stock, summed over end-of-day checkpoints"]],
  makespan: [["Hoàn tất lô bắt buộc", "Required-lot completion"], ["phút từ đầu horizon tới khi lô bắt buộc cuối cùng xong QC", "minutes from horizon start until the last required lot clears QC"]],
  setup_minutes: [["Chuẩn bị máy", "Setup"], ["phút đổi việc trên máy", "changeover minutes on machines"]],
  idle_minutes: [["Thời gian rảnh", "Idle time"], ["phút khả dụng không dùng trong các ca máy có bật", "available minutes left unused in opened machine shifts"]],
  maintenance_minutes: [["Bảo trì khuôn", "Mold maintenance"], ["phút bảo trì — hao mòn khuôn", "maintenance minutes — mold wear"]],
  surplus_holding: [["Dư tồn", "Surplus stock"], ["số đơn vị vượt tồn an toàn, cộng qua các mốc", "units above safety stock, summed over checkpoints"]],
  // schema 5 (5-stage line, fixed runs)
  nonproductive_minutes: [["Thời gian không sản xuất", "Non-productive time"], ["phút của các ca đã bật mà máy không gia công (rảnh, chuẩn bị, bảo trì)", "minutes of opened shifts not spent processing (idle, setup, maintenance)"]],
  reserve_units: [["Sản xuất dự trữ", "Reserve production"], ["số đơn vị làm trước cho nhu cầu dài hạn (phương án dự trữ được chọn)", "units pulled ahead for long-term demand (chosen reserve options)"]],
  btp_end_units: [["BTP tồn cuối kỳ", "Semi-finished at end"], ["tổng đơn vị bán thành phẩm còn lại cuối horizon", "semi-finished units left at the end of the horizon"]],
};

export const SERVICE_KEYS = ["weighted_tardiness", "safety_shortfall"];

export type PolicyKey = "service" | "balanced" | "cost";

export interface Policy { key: PolicyKey; name: string; note: string }

function policy(key: PolicyKey, name: [string, string], note: [string, string]): Policy {
  return { key, get name() { return tr(...name); }, get note() { return tr(...note); } };
}

export const POLICIES: Policy[] = [
  policy("service", ["Giao hàng trước", "Service first"],
    ["Mặc định của đề tài: trễ hạn và thiếu tồn an toàn xét trước; bằng nhau mới xét chi phí vận hành.", "Default: lateness and safety-stock shortfall are compared first; operating cost only breaks ties."]),
  policy("balanced", ["Cân bằng", "Balanced"],
    ["Cộng mọi thành phần theo trọng số thành một điểm: chấp nhận đổi một ít tồn an toàn lấy chi phí thấp hơn nếu trọng số cho phép.", "Adds every weighted term into one score: trades a little safety stock for lower cost when the weights allow it."]),
  policy("cost", ["Chi phí trước", "Cost first"],
    ["Chi phí vận hành xét trước; trễ và thiếu tồn chỉ để phân định khi chi phí bằng nhau. Dùng khi đơn có thể lùi hạn.", "Operating cost is compared first; lateness and shortfall only break ties. Use when orders can slip."]),
];

export function policyOf(key: string | null | undefined): Policy {
  return POLICIES.find((policy) => policy.key === key) ?? POLICIES[0];
}

export function termsOf(weights: Record<string, number>): Term[] {
  return Object.keys(weights)
    .filter((key) => weights[key] > 0)
    .map((key) => ({ key, label: TERM_TEXT[key] ? tr(...TERM_TEXT[key][0]) : key.replaceAll("_", " "), help: TERM_TEXT[key] ? tr(...TERM_TEXT[key][1]) : "" }));
}

export function tierKeys(policy: PolicyKey, terms: Term[]): { tier1: string[]; tier2: string[] } | null {
  const keys = terms.map((term) => term.key);
  const service = keys.filter((key) => SERVICE_KEYS.includes(key));
  const ops = keys.filter((key) => !SERVICE_KEYS.includes(key));
  if (policy === "balanced") return null;
  return policy === "service" ? { tier1: service, tier2: ops } : { tier1: ops, tier2: service };
}

/* ---------- alternatives ---------- */

export interface Alternative {
  run: ScheduleRunDetail;
  id: string;
  metrics: Record<string, number>;
  /** "SA · seed 47" — algorithm + seed, unique within a snapshot. */
  label: string;
  algorithm: string;
  shifts: Set<string>;
  late: number;
}

export function toAlternative(run: ScheduleRunDetail, input: AnySchedulingInput | undefined, all: ScheduleRunDetail[]): Alternative | null {
  if (run.status !== "SUCCEEDED" || !run.metrics) return null;
  const info = algorithmInfo(run.algorithm);
  const sameAlgo = all.filter((item) => item.algorithm === run.algorithm && item.status === "SUCCEEDED").length;
  const metrics = run.metrics as Record<string, number>;
  return {
    run,
    id: run.id,
    metrics,
    algorithm: run.algorithm,
    label: run.algorithm === "manual" ? manualLabel(run) : sameAlgo > 1 ? `${info.short} · seed ${run.seed}` : info.short,
    // Machines running around the clock (shift null) open no rostered shift.
    shifts: new Set(run.operations.filter((op) => op.shift != null).map((op) => `${op.machine}|${op.shift}`)),
    late: typeof metrics.late_orders === "number" ? metrics.late_orders : input ? deliveriesOf(input, run.operations).filter((d) => d.tardiness > 0).length : 0,
  };
}

/** "Chỉnh tay · <planner's label>" (or the run's short id when unnamed). */
function manualLabel(run: ScheduleRunDetail): string {
  const label = run.solver_metadata?.label;
  return `${tr("Chỉnh tay", "Manual")} · ${typeof label === "string" && label.trim() ? label.trim() : run.id.slice(0, 6)}`;
}

/** Operating cost of a metrics record (the weighted terms outside service). */
export function opsCostOf(metrics: Record<string, number>, weights: Record<string, number>): number {
  return Object.keys(weights).filter((key) => !SERVICE_KEYS.includes(key)).reduce((sum, key) => sum + (weights[key] ?? 0) * (metrics[key] ?? 0), 0);
}

export function weightedSum(alt: Alternative, weights: Record<string, number>, keys: string[]): number {
  return keys.reduce((sum, key) => sum + (weights[key] ?? 0) * (alt.metrics[key] ?? 0), 0);
}

export function opsCost(alt: Alternative, weights: Record<string, number>): number {
  return opsCostOf(alt.metrics, weights);
}

export function score(alt: Alternative, weights: Record<string, number>, policy: PolicyKey): [number, number] {
  const tiers = tierKeys(policy, termsOf(weights));
  if (!tiers) return [0, weightedSum(alt, weights, Object.keys(weights))];
  return [weightedSum(alt, weights, tiers.tier1), weightedSum(alt, weights, tiers.tier2)];
}

export function compareScore(a: Alternative, b: Alternative, weights: Record<string, number>, policy: PolicyKey): number {
  const x = score(a, weights, policy);
  const y = score(b, weights, policy);
  return x[0] - y[0] || x[1] - y[1] || a.run.created_at.localeCompare(b.run.created_at);
}

const vector = (alt: Alternative, weights: Record<string, number>) => [alt.metrics.weighted_tardiness ?? 0, alt.metrics.safety_shortfall ?? 0, Math.round(opsCost(alt, weights))];

/** What an option on the front is best at, by `vector` axis. */
// Axis 0 is priority-weighted lateness, so the name says so: such an option can still have more raw hours late (on low-priority orders).
const STRENGTHS: Array<[string, string]> = [["Ít trễ đơn ưu tiên", "Protects priority orders"], ["Ít thiếu tồn nhất", "Least shortfall"], ["Chi phí thấp nhất", "Lowest cost"]];

/** Minutes late summed over orders (solver metric when present, else recomputed from the deliveries). */
export function lateMinutes(alt: Alternative, input: AnySchedulingInput | undefined): number {
  if (typeof alt.metrics.total_tardiness === "number") return alt.metrics.total_tardiness;
  return input ? deliveriesOf(input, alt.run.operations).reduce((sum, d) => sum + (Number.isFinite(d.tardiness) ? d.tardiness : 0), 0) : 0;
}

/** Where `alt` is better / worse than `ref`, as short phrases, on the axes the ranking uses (lateness, shortfall, cost). */
export function tradesVs(alt: Alternative, ref: Alternative, weights: Record<string, number>): { gains: string[]; losses: string[] } {
  const gains: string[] = [], losses: string[] = [];
  const pct = (a: number, b: number) => { const r = (Math.abs(a - b) / Math.max(Math.abs(b), 1)) * 100; return `${decimal(r, r < 10 ? 1 : 0)}%`; };
  const units = (a: number, b: number) => fmtN(Math.abs(a - b));
  const axes: Array<[number, number, (a: number, b: number) => [string, string]]> = [
    [alt.metrics.weighted_tardiness ?? 0, ref.metrics.weighted_tardiness ?? 0, (a, b) => [tr(`trễ theo ưu tiên đơn ít hơn ${pct(a, b)}`, `${pct(a, b)} less priority-weighted lateness`), tr(`trễ theo ưu tiên đơn nhiều hơn ${pct(a, b)}`, `${pct(a, b)} more priority-weighted lateness`)]],
    [alt.metrics.safety_shortfall ?? 0, ref.metrics.safety_shortfall ?? 0, (a, b) => [tr(`thiếu tồn ít hơn ${units(a, b)} sp`, `${units(a, b)} fewer units short`), tr(`thiếu tồn nhiều hơn ${units(a, b)} sp`, `${units(a, b)} more units short`)]],
    [opsCost(alt, weights), opsCost(ref, weights), (a, b) => [tr(`rẻ hơn ${pct(a, b)}`, `${pct(a, b)} cheaper`), tr(`đắt hơn ${pct(a, b)}`, `${pct(a, b)} costlier`)]],
  ];
  for (const [a, b, phrase] of axes) {
    if (Math.round(a) === Math.round(b)) continue;
    const [better, worse] = phrase(a, b);
    if (a < b) gains.push(better); else losses.push(worse);
  }
  return { gains, losses };
}

/** b is at least as good as a on every axis and strictly better on one. */
export function dominates(b: Alternative, a: Alternative, weights: Record<string, number>): boolean {
  const x = vector(a, weights);
  const y = vector(b, weights);
  return y.every((value, index) => value <= x[index]) && y.some((value, index) => value < x[index]);
}

export interface Shortlist {
  /** Recommended ids, ordered by the active policy. */
  keys: string[];
  /** Pareto front ordered by operating cost (cheap → safe). */
  front: string[];
  name: Record<string, string>;
  /** id → id of a recommended alternative that dominates it. */
  dominatedBy: Record<string, string>;
  /** id → ids of schedules with identical service/cost vector folded into it. */
  twins: Record<string, string[]>;
}

export function shortlist(alts: Alternative[], weights: Record<string, number>, policy: PolicyKey): Shortlist {
  const ordered = [...alts].sort((a, b) => compareScore(a, b, weights, policy));
  const twins: Record<string, string[]> = {};
  const unique: Alternative[] = [];
  for (const alt of ordered) {
    const key = vector(alt, weights).join("|");
    const twin = unique.find((item) => vector(item, weights).join("|") === key);
    if (twin) (twins[twin.id] ??= []).push(alt.id);
    else unique.push(alt);
  }
  const frontAlts = unique.filter((alt) => !unique.some((other) => other !== alt && dominates(other, alt, weights)));
  const byCost = [...frontAlts].sort((a, b) => opsCost(a, weights) - opsCost(b, weights));
  // Named after what each option is actually best at (Google Flights' "Cheapest / Best" tags), not its position on the
  // cost axis: the most expensive option is not necessarily the one with the best service.
  const best = [0, 1, 2].map((i) => Math.min(...byCost.map((alt) => vector(alt, weights)[i])));
  const name: Record<string, string> = {};
  const used = new Map<string, number>();
  byCost.forEach((alt) => {
    const wins = [0, 1, 2].filter((i) => vector(alt, weights)[i] === best[i]);
    const base = byCost.length === 1 ? tr("Tốt nhất mọi mặt", "Best on every axis")
      : wins.length ? wins.map((i) => tr(...STRENGTHS[i])).join(" · ") : tr("Trung gian", "Middle ground");
    const seen = (used.get(base) ?? 0) + 1;
    used.set(base, seen);
    name[alt.id] = seen > 1 ? `${base} ${seen}` : base;
  });
  const dominatedBy: Record<string, string> = {};
  for (const alt of unique) {
    if (name[alt.id]) continue;
    const winner = byCost.find((front) => dominates(front, alt, weights));
    if (winner) dominatedBy[alt.id] = winner.id;
  }
  return {
    keys: [...frontAlts].sort((a, b) => compareScore(a, b, weights, policy)).map((alt) => alt.id),
    front: byCost.map((alt) => alt.id),
    name,
    dominatedBy,
    twins,
  };
}

/* ---------- deliveries, stock, shifts ---------- */

export interface Delivery { order: string; product: string; quantity: number; time: number; due: number; tardiness: number; priority: number; urgent: boolean }

export function deliveriesOf(input: AnySchedulingInput, operations: ScheduleOperation[]): Delivery[] {
  const plant = plantOf(input);
  const qc = new Map<string, number>();
  for (const op of operations) if (op.stage === plant.lastStage) qc.set(op.lot, op.end);
  return plant.orders.map((order) => {
    const ends = Object.keys(order.lot_allocations).map((lot) => qc.get(lot) ?? Number.POSITIVE_INFINITY);
    const time = Math.max(order.release, ...ends);
    return { order: order.id, product: order.product, quantity: order.quantity, time, due: order.due, tardiness: Math.max(0, time - order.due), priority: order.priority, urgent: order.urgent };
  });
}

export function activeShifts(input: AnySchedulingInput | undefined, operations: ScheduleOperation[]): Array<{ machine: string; shift: string; start: number; end: number }> {
  const plant = input ? plantOf(input) : null;
  const keys = new Set(operations.filter((op) => op.shift != null).map((op) => `${op.machine}|${op.shift}`));
  const out: Array<{ machine: string; shift: string; start: number; end: number }> = [];
  for (const key of keys) {
    const [machine, shift] = key.split("|");
    const def = plant?.machine(machine)?.shifts.find((item) => item.id === shift);
    if (def) out.push({ machine, shift, start: def.start, end: def.end });
    else {
      const ops = operations.filter((op) => op.machine === machine && op.shift === shift);
      out.push({ machine, shift, start: Math.min(...ops.map((op) => op.block_start)), end: Math.max(...ops.map((op) => op.end)) });
    }
  }
  return out.sort((a, b) => a.start - b.start);
}

export function movedOperations(a: Alternative, b: Alternative): number {
  const index = new Map(a.run.operations.map((op) => [`${op.lot}|${op.stage}`, op]));
  return b.run.operations.filter((op) => {
    const other = index.get(`${op.lot}|${op.stage}`);
    return other && (other.machine !== op.machine || other.start !== op.start);
  }).length;
}

/* ---------- algorithm speed ---------- */

export interface HistoryPoint { seconds: number; objective: number }

export function historyOf(run: ScheduleRunDetail): HistoryPoint[] {
  const raw = run.solver_metadata?.history;
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((point): point is HistoryPoint => typeof point === "object" && point !== null && typeof (point as HistoryPoint).seconds === "number" && typeof (point as HistoryPoint).objective === "number")
    .map((point) => ({ seconds: point.seconds, objective: point.objective }))
    .sort((a, b) => a.seconds - b.seconds);
}

export function runSeconds(run: ScheduleRunDetail): number | null {
  const value = run.solver_metadata?.algorithm_seconds;
  if (typeof value === "number") return value;
  if (run.started_at && run.finished_at) return (new Date(run.finished_at).getTime() - new Date(run.started_at).getTime()) / 1000;
  return null;
}

export function median(values: number[]): number | null {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/* ---------- formatting ---------- */

const numberFormats = new Map<string, Intl.NumberFormat>();

function numberFormat(): Intl.NumberFormat {
  const locale = intlLocale();
  let format = numberFormats.get(locale);
  if (!format) numberFormats.set(locale, format = new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }));
  return format;
}

const decimal = (value: number, digits: number) => new Intl.NumberFormat(intlLocale(), { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(value);

export const fmtN = (value: number) => numberFormat().format(Math.round(value));
export const signed = (value: number) => (value > 0 ? "+" : value < 0 ? "−" : "±") + fmtN(Math.abs(value));

export function fmtSeconds(value: number | null | undefined): string {
  if (value == null) return "—";
  if (value < 0.1) return `${Math.max(1, Math.round(value * 1000))} ms`;
  if (value < 10) return `${decimal(value, 2)} s`;
  return `${Math.round(value)} s`;
}

export function fmtScore(pair: [number, number], policy: PolicyKey): string {
  return policy === "balanced" ? fmtN(pair[1]) : `${fmtN(pair[0])} · ${fmtN(pair[1])}`;
}

export const hours = (minutes: number) => `${decimal(minutes / 60, 1)} ${tr("giờ", "h")}`;
