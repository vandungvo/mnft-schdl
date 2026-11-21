import { activeShifts, compareScore, deliveriesOf, score, type Alternative, type Delivery, type PolicyKey } from "./decision";
import { formatNumber } from "./format";
import { tr } from "./locale";
import { plantOf, type PlantView } from "./plant";
import { isV5, type AnySchedulingInput, type ScheduleOperation, type ScheduleRunDetail } from "./types";

/* Read-only explanations of a schedule, computed in the browser from what the run already holds:
   which runs feed an order, why it is late, how loaded each machine is, how far a solver is from
   its bound. Nothing here changes a schedule; it only points the planner at the cause. */

/* ---------- supply chains ---------- */

export interface ChainStep {
  op: ScheduleOperation;
  /** When the material it needs was ready (end of the feeding run), or null at the first stage. */
  ready: number | null;
  /** Minutes between the material being ready and this run starting (its preparation included). */
  wait: number;
}

/** What a schema-5 run at `stage` consumes: the item the previous stage makes for the same product. */
function inputItem(input: Extract<AnySchedulingInput, { schema_version: 5 }>, stage: string, item: string): string | null {
  const index = input.stages.indexOf(stage);
  if (index <= 0) return null;
  const last = index === input.stages.length - 1;
  const product = Object.entries(input.products).find(([id, spec]) => (last ? id === item : spec.route[stage] === item));
  return product ? product[1].route[input.stages[index - 1]] ?? null : null;
}

/** The runs that made what a last-stage run ships, earliest stage first.
    Schema 4 lots keep one id across stages. Schema 5 runs are not pegged to orders, so each step takes
    the latest run of the needed item that finished before it started (the nearest supply). */
export function supplyChain(input: AnySchedulingInput, operations: ScheduleOperation[], lot: string): ChainStep[] {
  const plant = plantOf(input);
  const last = operations.find((op) => op.lot === lot && op.stage === plant.lastStage);
  if (!last) return [];
  if (!isV5(input)) {
    const ops = operations.filter((op) => op.lot === lot).sort((a, b) => plant.stages.indexOf(a.stage) - plant.stages.indexOf(b.stage));
    return ops.map((op, index) => ({ op, ready: index ? ops[index - 1].end : null, wait: index ? Math.max(0, op.block_start - ops[index - 1].end) : 0 }));
  }
  const chain: ChainStep[] = [];
  let current: ScheduleOperation | undefined = last;
  while (current) {
    const need = inputItem(input, current.stage, current.item ?? "");
    const stage: string | undefined = plant.stages[plant.stages.indexOf(current.stage) - 1];
    const start: number = current.block_start;
    const feeder: ScheduleOperation | undefined = need ? operations
      .filter((op): boolean => op.stage === stage && op.item === need && op.end <= start)
      .sort((a, b) => b.end - a.end)[0] : undefined;
    chain.unshift({ op: current, ready: feeder ? feeder.end : null, wait: feeder ? Math.max(0, start - feeder.end) : 0 });
    current = feeder;
  }
  return chain;
}

/** order id → ids of the operations in the supply chains of its lots. */
export function peggedOrders(input: AnySchedulingInput, operations: ScheduleOperation[]): Map<number, string[]> {
  const out = new Map<number, string[]>();
  for (const order of plantOf(input).orders) {
    for (const lot of Object.keys(order.lot_allocations)) {
      for (const step of supplyChain(input, operations, lot)) out.set(step.op.id, [...new Set([...(out.get(step.op.id) ?? []), order.id])]);
    }
  }
  return out;
}

/* ---------- why an order is (or is not) late ---------- */

export type Cause =
  | { kind: "wait"; stage: string; machine: string; wait: number; busyWith: string[]; offShift: number; closedShifts: number }
  | { kind: "load"; stage: string; ratio: number; from: number; to: number }
  | { kind: "overtaken"; count: number; machines: string[] }
  | { kind: "release"; release: number; due: number; processing: number };

export interface OrderExplanation {
  delivery: Delivery;
  /** Supply chain of the lot that finished last (the one that set the delivery time). */
  critical: ChainStep[];
  lots: number;
  causes: Cause[];
}

const overlap = (a0: number, a1: number, b0: number, b1: number) => Math.max(0, Math.min(a1, b1) - Math.max(a0, b0));

export function explainOrder(input: AnySchedulingInput, operations: ScheduleOperation[], orderId: string): OrderExplanation | null {
  const plant = plantOf(input);
  const order = plant.orders.find((item) => item.id === orderId);
  const delivery = deliveriesOf(input, operations).find((item) => item.order === orderId);
  if (!order || !delivery) return null;
  const lots = Object.keys(order.lot_allocations);
  const chains = lots.map((lot) => supplyChain(input, operations, lot)).filter((chain) => chain.length > 0);
  const critical = chains.sort((a, b) => b[b.length - 1].op.end - a[a.length - 1].op.end)[0] ?? [];
  const causes: Cause[] = [];
  const shifts = activeShifts(input, operations);

  // Longest wait in the critical chain: what held the material back.
  const worst = [...critical].sort((a, b) => b.wait - a.wait)[0];
  if (worst && worst.wait >= 60 && worst.ready != null) {
    const from = worst.ready, to = worst.op.block_start, machine = worst.op.machine;
    const busyWith = operations.filter((op) => op.machine === machine && op.id !== worst.op.id && overlap(op.block_start, op.end, from, to) > 0).map((op) => op.lot);
    const def = plant.machine(machine);
    const open = def?.continuous ? [[from, to]] as Array<[number, number]> : shifts.filter((s) => s.machine === machine).map((s) => [s.start, s.end] as [number, number]);
    const covered = open.reduce((sum, [a, b]) => sum + overlap(a, b, from, to), 0);
    const opened = new Set(shifts.filter((s) => s.machine === machine).map((s) => s.shift));
    const closedShifts = (def?.shifts ?? []).filter((s) => !opened.has(s.id) && overlap(s.start, s.end, from, to) > 0).length;
    causes.push({ kind: "wait", stage: worst.op.stage, machine, wait: worst.wait, busyWith: [...new Set(busyWith)], offShift: Math.max(0, to - from - covered), closedShifts });
  }

  // The most loaded stage while the order was open (release → due, or → delivery when late): the bottleneck it competed for.
  const from = order.release, to = Number.isFinite(delivery.time) ? Math.max(order.due, delivery.time) : order.due;
  const loads = plant.stages.map((stage) => {
    const machines = plant.machines.filter((m) => m.stage === stage);
    const busy = operations.filter((op) => op.stage === stage).reduce((sum, op) => sum + overlap(op.block_start, op.end, from, to), 0);
    const capacity = machines.reduce((sum, m) => sum + (m.continuous ? to - from : m.shifts.reduce((s, x) => s + overlap(x.start, x.end, from, to), 0)), 0);
    return { stage, ratio: capacity ? busy / capacity : 0 };
  }).sort((a, b) => b.ratio - a.ratio);
  if (to - from >= 8 * 60 && loads[0] && loads[0].ratio >= 0.6) causes.push({ kind: "load", stage: loads[0].stage, ratio: loads[0].ratio, from, to });

  // Last-stage runs of orders due later that went first.
  const end = critical[critical.length - 1]?.op;
  if (end && delivery.tardiness > 0) {
    const dueOf = new Map(plant.orders.map((item) => [item.id, item.due]));
    const ahead = operations.filter((op) => op.stage === plant.lastStage && op.start < end.start && op.start >= order.release && !lots.includes(op.lot)).filter((op) => {
      const other = plant.orderOfLot(op.lot);
      return other != null && (dueOf.get(other) ?? 0) > order.due;
    });
    if (ahead.length) causes.push({ kind: "overtaken", count: ahead.length, machines: [...new Set(ahead.map((op) => op.machine))] });
  }

  // Released too late to make it even with no waiting at all.
  const processing = critical.reduce((sum, step) => sum + (step.op.end - step.op.block_start), 0);
  if (delivery.tardiness > 0 && order.release + processing > order.due) causes.push({ kind: "release", release: order.release, due: order.due, processing });

  return { delivery, critical, lots: lots.length, causes };
}

/* ---------- machine load ---------- */

export interface MachineLoad { machine: string; stage: string; days: Array<{ busy: number; capacity: number }>; total: { busy: number; capacity: number } }

/** Busy minutes (setup and maintenance included) against rostered capacity, per machine and day. */
export function machineLoad(plant: PlantView, operations: ScheduleOperation[], horizon: number): MachineLoad[] {
  const days = Math.max(1, Math.ceil(horizon / 1440));
  return plant.machines.map((machine) => {
    const ops = operations.filter((op) => op.machine === machine.id);
    const perDay = Array.from({ length: days }, (_, day) => {
      const a = day * 1440, b = a + 1440;
      const busy = ops.reduce((sum, op) => sum + overlap(op.block_start, op.end, a, b), 0);
      const rostered = machine.continuous ? 1440 : machine.shifts.reduce((sum, s) => sum + overlap(s.start, s.end, a, b), 0);
      const down = machine.downtime.reduce((sum, [x, y]) => sum + overlap(x, y, a, b), 0);
      return { busy, capacity: Math.max(0, rostered - down) };
    });
    const total = perDay.reduce((sum, day) => ({ busy: sum.busy + day.busy, capacity: sum.capacity + day.capacity }), { busy: 0, capacity: 0 });
    return { machine: machine.id, stage: machine.stage, days: perDay, total };
  });
}

/* ---------- solver quality ---------- */

/** Relative distance between the schedule and the solver's proven bound (0 = optimal); null when no global bound. */
export function optimalityGap(run: ScheduleRunDetail): number | null {
  const meta = run.solver_metadata ?? {};
  const objective = (run.metrics as Record<string, number> | null)?.objective;
  if (meta.solver_status === "OPTIMAL" || (run.solver_status === "OPTIMAL" && run.algorithm.startsWith("cp"))) return 0;
  const bound = meta.bound;
  if (typeof bound !== "number" || typeof objective !== "number" || meta.bound_scope === "neighborhood" || meta.status === "HEURISTIC_FALLBACK") return null;
  return Math.max(0, (objective - bound) / Math.max(1, Math.abs(objective)));
}

/** "≤ 1,2%", "0% · tối ưu", or "cận còn yếu" when the bound is too loose to say anything (early in the search). */
export function gapText(gap: number | null): string {
  if (gap == null) return "—";
  if (gap === 0) return tr("0% · tối ưu", "0% · optimal");
  if (gap >= 0.5) return tr("cận còn yếu", "weak bound");
  return `≤ ${formatNumber(gap * 100, { maximumFractionDigits: gap < 0.01 ? 2 : 1 })}%`;
}

const RULES = new Set(["fifo", "edd", "spt"]);
const SOLVERS = new Set(["cp_sat", "cp_sat_hint", "cp_lns", "cp_rolling", "hybrid"]);

/** Did any optimiser run beat the best dispatching rule? null when one of the two kinds is missing. */
export function optimiserVerdict(alts: Alternative[], weights: Record<string, number>, policy: PolicyKey): { improved: boolean; budget: number; fallback: boolean } | null {
  const rules = alts.filter((alt) => RULES.has(alt.algorithm)).sort((a, b) => compareScore(a, b, weights, policy));
  const solvers = alts.filter((alt) => SOLVERS.has(alt.algorithm));
  if (!rules.length || !solvers.length) return null;
  const [r1, r2] = score(rules[0], weights, policy);
  // Strictly better score: an equal score ordered first by the creation-time tie-break is no improvement.
  const improved = solvers.some((alt) => { const [s1, s2] = score(alt, weights, policy); return s1 < r1 || (s1 === r1 && s2 < r2); });
  return { improved, budget: Math.max(...solvers.map((alt) => alt.run.time_budget_seconds)), fallback: solvers.some((alt) => alt.run.solver_status === "HEURISTIC_FALLBACK") };
}
