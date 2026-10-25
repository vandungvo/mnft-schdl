import { isV5, type AnySchedulingInput, type ScheduleOperation } from "./types";

/* One read model over both production models, for everything that draws or counts a schedule
   (Gantt, deliveries, stock, active shifts). Schema 4: lots on a 4-stage line, shifts listed per
   machine. Schema 5: fixed-size runs per stage on a 5-stage line, a daily shift template, heat
   treatment running around the clock, semi-finished items shared by several products. */

export interface PlantMachine {
  id: string;
  stage: string;
  /** Rostered shifts over the horizon; empty for a machine that runs around the clock. */
  shifts: Array<{ id: string; start: number; end: number }>;
  downtime: Array<[number, number]>;
  continuous: boolean;
}

export interface PlantOrder {
  id: string;
  product: string;
  quantity: number;
  due: number;
  priority: number;
  release: number;
  urgent: boolean;
  lot_allocations: Record<string, number>;
}

export interface PlantView {
  schema: 4 | 5;
  stages: string[];
  lastStage: string;
  horizon: number;
  checkpoints: number[];
  products: string[];
  /** Machines in stage order, then by id. */
  machines: PlantMachine[];
  machine: (id: string) => PlantMachine | undefined;
  orders: PlantOrder[];
  safetyStock: Record<string, number>;
  initialStock: Record<string, number>;
  /** Products a scheduled row works for: one for a lot or a product-specific item, several for a shared item (e.g. F_CAST). */
  productsOf: (op: Pick<ScheduleOperation, "lot" | "item">) => string[];
  /** Highlight group of a row (a product line, e.g. all F wheels). */
  lineOf: (op: Pick<ScheduleOperation, "lot" | "item">) => string;
  /** Units made by one row. */
  quantityOf: (op: Pick<ScheduleOperation, "lot" | "stage">) => number | null;
  /** Order a last-stage lot is allocated to, if any. */
  orderOfLot: (lot: string) => string | null;
}

const cache = new WeakMap<AnySchedulingInput, PlantView>();

export function plantOf(input: AnySchedulingInput): PlantView {
  let view = cache.get(input);
  if (!view) cache.set(input, view = isV5(input) ? fromV5(input) : fromV4(input));
  return view;
}

function sortMachines(stages: string[], machines: PlantMachine[]): PlantMachine[] {
  return machines.sort((a, b) => stages.indexOf(a.stage) - stages.indexOf(b.stage) || a.id.localeCompare(b.id));
}

function lotOrders(orders: PlantOrder[]): Map<string, string> {
  return new Map(orders.flatMap((order) => Object.keys(order.lot_allocations).map((lot) => [lot, order.id] as [string, string])));
}

function fromV4(input: Extract<AnySchedulingInput, { schema_version: 4 }>): PlantView {
  const lots = new Map(input.lots.map((lot) => [lot.id, lot]));
  const productOf = (lot: string) => lots.get(lot)?.product ?? lot.replace(/-.*$/, "");
  const machines = sortMachines(input.stages, Object.entries(input.machines).map(([id, spec]) => ({
    id, stage: spec.stage, shifts: spec.shifts.map(({ id: shift, start, end }) => ({ id: shift, start, end })), downtime: spec.downtime ?? [], continuous: false,
  })));
  const byId = new Map(machines.map((machine) => [machine.id, machine]));
  const orders = input.orders.map((order) => ({ ...order, urgent: order.urgent }));
  const lotOrder = lotOrders(orders);
  return {
    schema: 4,
    stages: input.stages,
    lastStage: input.stages[input.stages.length - 1],
    horizon: input.horizon,
    checkpoints: input.checkpoints,
    products: input.products,
    machines,
    machine: (id) => byId.get(id),
    orders,
    safetyStock: input.safety_stock,
    initialStock: input.initial_inventory,
    productsOf: (op) => [productOf(op.lot)],
    lineOf: (op) => input.product_line[productOf(op.lot)] ?? productOf(op.lot),
    quantityOf: (op) => lots.get(op.lot)?.quantity ?? null,
    orderOfLot: (lot) => lotOrder.get(lot) ?? lots.get(lot)?.order ?? null,
  };
}

function fromV5(input: Extract<AnySchedulingInput, { schema_version: 5 }>): PlantView {
  const stages = input.stages;
  const lastStage = stages[stages.length - 1];
  const products = Object.keys(input.products);
  const days = Math.floor(input.horizon / 1440);
  const template = Object.entries(input.shift_template);
  const machines = sortMachines(stages, Object.entries(input.machines).map(([id, spec]) => {
    const continuous = spec.calendar === "continuous";
    const shifts = continuous ? [] : Array.from({ length: days }, (_, day) => template.map(([key, shift]) => ({
      // Same id the engine writes on each row: D01_S1, D01_S2, …
      id: `D${String(day + 1).padStart(2, "0")}_${key}`, start: day * 1440 + shift.start, end: day * 1440 + shift.end,
    }))).flat();
    return { id, stage: spec.stage, shifts, downtime: spec.downtime ?? [], continuous };
  }));
  const byId = new Map(machines.map((machine) => [machine.id, machine]));
  // item -> products whose route passes through it (a product is its own last-stage item)
  const users = new Map<string, string[]>();
  for (const [product, spec] of Object.entries(input.products)) {
    for (const item of [...Object.values(spec.route), product]) users.set(item, [...new Set([...(users.get(item) ?? []), product])]);
  }
  const runs = new Map(input.runs.map((run) => [run.id, run]));
  const itemOf = (op: Pick<ScheduleOperation, "lot" | "item">) => op.item ?? runs.get(op.lot)?.item ?? op.lot;
  const lineKey = (product: string) => input.products[product]?.route[stages[0]] ?? product;
  const orders = input.orders.map((order) => ({ ...order, urgent: false }));
  const lotOrder = lotOrders(orders);
  return {
    schema: 5,
    stages,
    lastStage,
    horizon: input.horizon,
    checkpoints: input.checkpoints,
    products,
    machines,
    machine: (id) => byId.get(id),
    orders,
    safetyStock: Object.fromEntries(products.map((product) => [product, input.products[product].safety_stock])),
    initialStock: Object.fromEntries(products.map((product) => [product, input.products[product].initial_stock])),
    productsOf: (op) => users.get(itemOf(op)) ?? [],
    lineOf: (op) => {
      const owners = users.get(itemOf(op)) ?? [];
      return owners.length ? lineKey(owners[0]) : itemOf(op);
    },
    quantityOf: (op) => input.run_size[op.stage] ?? null,
    orderOfLot: (lot) => lotOrder.get(lot) ?? null,
  };
}
