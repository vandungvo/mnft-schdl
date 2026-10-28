/* Editing helpers for the plant configuration. They keep the structural rules of the preparation step
   (models/common/stage_runs/prepare.py check_raw) true while a planner edits, with sensible defaults,
   so the server only has to reject genuinely wrong numbers. */

import type { ConfigChange, FactoryConfig, FactoryMachine } from "./factory-types";

export const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

/** Items a stage makes: semi-finished codes routed there, or products at the last stage. */
export function itemsOfStage(config: FactoryConfig, stage: string): string[] {
  const last = config.stages[config.stages.length - 1];
  if (stage === last) return Object.keys(config.products);
  return [...new Set(Object.values(config.products).map((p) => p.route[stage]).filter(Boolean))];
}

/** Machine states that are not items: the initial state and mold after-maintenance states. */
export function machineStates(config: FactoryConfig, machine: FactoryMachine): string[] {
  const states = [config.machine_initial_state];
  const items = new Set(Object.keys(machine.minutes_per_unit));
  for (const mold of Object.values(config.molds)) if (items.has(mold.item) && !states.includes(mold.after_maintenance)) states.push(mold.after_maintenance);
  return states;
}

function average(values: number[], fallback: number): number {
  return values.length ? Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 100) / 100 : fallback;
}

/** Make every machine of `stage` able to make `item` (rate = average of its other items) with setup rows/columns. */
export function ensureItemOnStage(config: FactoryConfig, stage: string, item: string): void {
  for (const machine of Object.values(config.machines)) {
    if (machine.stage !== stage) continue;
    if (!(item in machine.minutes_per_unit)) machine.minutes_per_unit[item] = average(Object.values(machine.minutes_per_unit), 1);
    const changeovers = Object.values(machine.setup).flatMap((row) => Object.values(row)).filter((v) => v > 0);
    const typical = changeovers.length ? Math.max(...changeovers) : 0;
    for (const row of Object.values(machine.setup)) if (!(item in row)) row[item] = typical;
    if (!machine.setup[item]) machine.setup[item] = Object.fromEntries(Object.keys(machine.minutes_per_unit).map((other) => [other, other === item ? 0 : typical]));
  }
  if (stage !== config.stages[config.stages.length - 1] && !config.btp[item]) config.btp[item] = { name: null, capacity: null };
}

/** Drop semi-finished codes no route uses any more (from the catalogue and every machine). */
export function prune(config: FactoryConfig): void {
  const used = new Set(Object.values(config.products).flatMap((p) => Object.values(p.route)));
  const products = new Set(Object.keys(config.products));
  for (const code of Object.keys(config.btp)) if (!used.has(code)) delete config.btp[code];
  for (const machine of Object.values(config.machines)) {
    const keep = (item: string) => used.has(item) || products.has(item);
    for (const item of Object.keys(machine.minutes_per_unit)) if (!keep(item)) delete machine.minutes_per_unit[item];
    for (const [state, row] of Object.entries(machine.setup)) {
      if (!keep(state) && state !== config.machine_initial_state && !Object.values(config.molds).some((m) => m.after_maintenance === state)) { delete machine.setup[state]; continue; }
      for (const item of Object.keys(row)) if (!(item in machine.minutes_per_unit)) delete row[item];
    }
  }
  for (const [code, mold] of Object.entries(config.molds)) if (!used.has(mold.item) && !products.has(mold.item)) delete config.molds[code];
}

/** Rows a machine's setup matrix must have, in display order (states first, then items). */
export function setupRows(config: FactoryConfig, machine: FactoryMachine): string[] {
  return [...machineStates(config, machine), ...Object.keys(machine.minutes_per_unit)];
}

/** Fill missing setup cells (new state rows, new columns) with 0 so the matrix is complete. */
export function completeSetup(config: FactoryConfig, machine: FactoryMachine): void {
  for (const row of setupRows(config, machine)) {
    machine.setup[row] ??= {};
    for (const item of Object.keys(machine.minutes_per_unit)) machine.setup[row][item] ??= 0;
  }
}

export function countChanges(a: unknown, b: unknown): number {
  if (JSON.stringify(a) === JSON.stringify(b)) return 0;
  if (a && b && typeof a === "object" && typeof b === "object" && !Array.isArray(a) && !Array.isArray(b)) {
    const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
    let n = 0;
    for (const key of keys) n += countChanges((a as Record<string, unknown>)[key], (b as Record<string, unknown>)[key]);
    return n;
  }
  return 1;
}

/* ---------- page sections, draft diff and client-side checks ---------- */

export type FactorySection = "process" | "products" | "machines" | "molds" | "calendar" | "policies" | "versions";

export const FACTORY_SECTIONS: FactorySection[] = ["process", "products", "machines", "molds", "calendar", "policies", "versions"];

export function isFactorySection(value: unknown): value is FactorySection {
  return typeof value === "string" && (FACTORY_SECTIONS as string[]).includes(value);
}

/** Which config keys each section edits (for "changed" dots in the section menu). */
const SECTION_KEYS: Record<Exclude<FactorySection, "versions">, Array<keyof FactoryConfig>> = {
  process: ["stages", "stage_names", "run_size", "transfer_minutes", "period_days", "lookahead_days", "default_due_time", "utc_offset"],
  products: ["products", "btp"],
  machines: ["machines"],
  molds: ["molds"],
  calendar: ["shift_template", "weekly_off", "holidays", "maintenance_rules"],
  policies: ["policies", "default_policy"],
};

export function changedSections(base: FactoryConfig, draft: FactoryConfig): Set<FactorySection> {
  const out = new Set<FactorySection>();
  for (const [section, keys] of Object.entries(SECTION_KEYS) as Array<[FactorySection, Array<keyof FactoryConfig>]>) {
    if (keys.some((key) => JSON.stringify(base[key]) !== JSON.stringify(draft[key]))) out.add(section);
  }
  return out;
}

/** Value at a dotted path (`products.F_SILVER.safety_stock`), undefined when missing. */
export function valueAt(source: unknown, path: Array<string | number>): unknown {
  let current: unknown = source;
  for (const key of path) {
    if (current == null || typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[key];
  }
  return current;
}

/** Whether the value at `path` differs between the saved config and the draft. */
export function isChangedAt(base: FactoryConfig | null, draft: FactoryConfig, path: Array<string | number>): boolean {
  if (!base) return false;
  return JSON.stringify(valueAt(base, path)) !== JSON.stringify(valueAt(draft, path));
}

export interface ConfigIssue {
  section: Exclude<FactorySection, "versions">;
  /** Record the issue is about (product code, shift key, machine…), for inline messages. */
  ref?: string;
  /** Field within the record (`cap`, `end`, `breaks`, …). */
  field?: string;
  vi: string;
  en: string;
}

const hm = (minute: number) => `${String(Math.floor(minute / 60)).padStart(2, "0")}:${String(minute % 60).padStart(2, "0")}`;

/** Checks the server would reject, so the planner sees them next to the field before saving
    (mirrors backend/app/factory_model.py FactoryShift.check_times and factory_errors). */
export function configIssues(config: FactoryConfig): ConfigIssue[] {
  const issues: ConfigIssue[] = [];
  for (const [code, product] of Object.entries(config.products)) {
    if (product.safety_stock > product.stock_cap) issues.push({ section: "products", ref: code, field: "cap", vi: `${code}: trần kho (${product.stock_cap}) thấp hơn tồn an toàn (${product.safety_stock}).`, en: `${code}: stock cap (${product.stock_cap}) is below safety stock (${product.safety_stock}).` });
  }
  const btpStages = config.stages.slice(0, -1);
  const parent = new Map<string, [string, string]>();
  for (const [product, spec] of Object.entries(config.products)) {
    for (let k = 1; k < btpStages.length; k++) {
      const code = spec.route[btpStages[k]], up = spec.route[btpStages[k - 1]];
      const seen = parent.get(code);
      if (!seen) parent.set(code, [up, product]);
      else if (seen[0] !== up) issues.push({ section: "products", ref: product, field: "route", vi: `${code} dùng chung cho ${seen[1]} và ${product} nhưng được làm từ hai mã khác nhau (${seen[0]}, ${up}) — dùng mã riêng cho mỗi nhánh.`, en: `${code} is shared by ${seen[1]} and ${product} but made from two different codes (${seen[0]}, ${up}) — use one code per branch.` });
    }
  }
  const shifts = Object.entries(config.shift_template);
  for (const [key, shift] of shifts) {
    if (shift.end <= shift.start) issues.push({ section: "calendar", ref: key, field: "end", vi: `Ca ${key}: giờ kết thúc phải sau giờ bắt đầu (ca không vắt qua nửa đêm).`, en: `Shift ${key}: must end after it starts (no shift crosses midnight).` });
    const breaks = [...shift.breaks].sort((a, b) => a[0] - b[0]);
    breaks.forEach(([a, b], index) => {
      if (b <= a) issues.push({ section: "calendar", ref: key, field: `break-${index}`, vi: `Ca ${key}: giờ nghỉ ${hm(a)}–${hm(b)} phải kết thúc sau khi bắt đầu.`, en: `Shift ${key}: break ${hm(a)}–${hm(b)} must end after it starts.` });
      else if (a < shift.start || b > shift.end) issues.push({ section: "calendar", ref: key, field: `break-${index}`, vi: `Ca ${key}: giờ nghỉ ${hm(a)}–${hm(b)} nằm ngoài ca (${hm(shift.start)}–${hm(shift.end)}).`, en: `Shift ${key}: break ${hm(a)}–${hm(b)} lies outside the shift (${hm(shift.start)}–${hm(shift.end)}).` });
      const next = breaks[index + 1];
      if (next && next[0] < b) issues.push({ section: "calendar", ref: key, field: "breaks", vi: `Ca ${key}: hai giờ nghỉ chồng nhau.`, en: `Shift ${key}: two breaks overlap.` });
    });
  }
  const sorted = shifts.filter(([, s]) => s.end > s.start).sort((a, b) => a[1].start - b[1].start);
  for (let i = 1; i < sorted.length; i++) {
    const [prevKey, prev] = sorted[i - 1];
    const [key, shift] = sorted[i];
    if (prev.end > shift.start) issues.push({ section: "calendar", ref: key, field: "start", vi: `Ca ${prevKey} và ${key} chồng nhau (${hm(shift.start)}–${hm(Math.min(prev.end, shift.end))}).`, en: `Shifts ${prevKey} and ${key} overlap (${hm(shift.start)}–${hm(Math.min(prev.end, shift.end))}).` });
  }
  config.maintenance_rules.forEach((rule, index) => {
    if (rule.end <= rule.start) issues.push({ section: "calendar", ref: `rule-${index}`, field: "end", vi: `Bảo trì ${rule.machine}: giờ kết thúc phải sau giờ bắt đầu.`, en: `Maintenance on ${rule.machine}: must end after it starts.` });
    if (!config.machines[rule.machine]) issues.push({ section: "calendar", ref: `rule-${index}`, field: "machine", vi: `Bảo trì định kỳ trỏ tới máy không còn tồn tại (${rule.machine}).`, en: `Recurring maintenance names a machine that no longer exists (${rule.machine}).` });
  });
  for (const policy of config.policies) {
    if (!policy.name.trim()) issues.push({ section: "policies", ref: policy.key, field: "name", vi: `Chính sách ${policy.key}: chưa có tên.`, en: `Policy ${policy.key}: has no name.` });
    if (!Object.values(policy.weights).some((w) => w > 0)) issues.push({ section: "policies", ref: policy.key, field: "weights", vi: `Chính sách ${policy.name || policy.key}: cần ít nhất một trọng số > 0.`, en: `Policy ${policy.name || policy.key}: needs at least one weight above 0.` });
  }
  return issues;
}

/* ---------- version changes: readable labels for `products.F_SILVER.safety_stock`-style paths ---------- */

/** Same flat diff as backend describe_changes (depth 3), for comparing a version with the current one. */
export function describeChanges(before: unknown, after: unknown, depth = 3): ConfigChange[] {
  const out: ConfigChange[] = [];
  const walk = (a: unknown, b: unknown, path: string[], level: number) => {
    if (JSON.stringify(a) === JSON.stringify(b)) return;
    const isObj = (v: unknown) => v != null && typeof v === "object" && !Array.isArray(v);
    if (isObj(a) && isObj(b) && level < depth) {
      const keys = [...new Set([...Object.keys(a as object), ...Object.keys(b as object)])];
      for (const key of keys) walk((a as Record<string, unknown>)[key], (b as Record<string, unknown>)[key], [...path, key], level + 1);
      return;
    }
    out.push({ path: path.join("."), before: a ?? null, after: b ?? null });
  };
  walk(before ?? {}, after, [], 0);
  return out;
}

const TOP_LABELS: Record<string, [string, string]> = {
  stages: ["Danh sách công đoạn", "Stages"], stage_names: ["Tên công đoạn", "Stage name"], run_size: ["Cỡ lượt", "Run size"], transfer_minutes: ["Thời gian chuyển", "Transfer time"],
  machine_initial_state: ["Trạng thái máy đầu kỳ", "Initial machine state"], shift_template: ["Ca", "Shift"], weekly_off: ["Ngày nghỉ hằng tuần", "Weekly rest days"], holidays: ["Ngày lễ", "Holidays"],
  maintenance_rules: ["Bảo trì định kỳ", "Recurring maintenance"], default_due_time: ["Giờ giao mặc định", "Default due time"], lookahead_days: ["Nhìn trước đơn dài hạn", "Look-ahead"],
  period_days: ["Độ dài kỳ", "Period length"], products: ["Sản phẩm", "Product"], btp: ["Mã bán thành phẩm", "Semi-finished code"], machines: ["Máy", "Machine"], molds: ["Khuôn", "Mold"],
  policies: ["Chính sách", "Policies"], default_policy: ["Chính sách mặc định", "Default policy"], utc_offset: ["Múi giờ", "Time zone"],
};

const FIELD_LABELS: Record<string, [string, string]> = {
  name: ["tên", "name"], safety_stock: ["tồn an toàn", "safety stock"], stock_cap: ["trần kho", "stock cap"], route: ["quy trình", "route"], color: ["màu", "color"], line: ["dây chuyền", "line"],
  capacity: ["sức chứa", "capacity"], stage: ["công đoạn", "stage"], calendar: ["lịch làm việc", "calendar"], minutes_per_unit: ["định mức", "rates"], fixed_minutes: ["thời gian cố định", "fixed time"],
  setup: ["thời gian chuyển đổi", "changeovers"], mold_change_minutes: ["thay khuôn tối thiểu", "mold change"], item: ["mã đúc", "item"], cavities: ["số lòng", "cavities"],
  limit_cycles: ["giới hạn chu kỳ", "cycle limit"], maintenance_minutes: ["thời gian bảo dưỡng", "service time"], after_maintenance: ["trạng thái sau bảo dưỡng", "state after service"],
  start: ["bắt đầu", "start"], end: ["kết thúc", "end"], breaks: ["giờ nghỉ", "breaks"],
};

export function changeLabel(path: string, tr: (vi: string, en: string) => string): string {
  const [top, record, field] = path.split(".");
  const head = TOP_LABELS[top] ? tr(...TOP_LABELS[top]) : top;
  const parts = [record ? `${head} ${record}` : head];
  if (field) parts.push(FIELD_LABELS[field] ? tr(...FIELD_LABELS[field]) : field);
  return parts.join(" · ");
}

const hhmm = (v: number) => `${String(Math.floor(v / 60)).padStart(2, "0")}:${String(v % 60).padStart(2, "0")}`;
const WEEKDAYS: Array<[string, string]> = [["T2", "Mon"], ["T3", "Tue"], ["T4", "Wed"], ["T5", "Thu"], ["T6", "Fri"], ["T7", "Sat"], ["CN", "Sun"]];

/** Short text for one side of a change; `full` is the complete JSON when the text is a summary. */
export function changeValue(path: string, value: unknown, tr: (vi: string, en: string) => string): { text: string; full?: string } {
  if (value === null || value === undefined) return { text: "—" };
  const field = path.split(".").at(-1) ?? "";
  if ((field === "start" || field === "end") && typeof value === "number") return { text: hhmm(value) };
  if (path === "weekly_off" && Array.isArray(value)) return { text: value.length ? value.map((d: number) => tr(...WEEKDAYS[d] ?? [String(d), String(d)])).join(", ") : tr("không", "none") };
  if (path === "holidays" && Array.isArray(value)) return { text: value.length ? value.map((d: string) => `${d.slice(8, 10)}/${d.slice(5, 7)}`).join(", ") : tr("không", "none") };
  if (field === "breaks" && Array.isArray(value)) return { text: value.length ? value.map(([a, b]: [number, number]) => `${hhmm(a)}–${hhmm(b)}`).join(", ") : tr("không", "none") };
  if (typeof value !== "object") return { text: String(value) };
  const full = JSON.stringify(value);
  if (Array.isArray(value)) {
    const simple = value.every((v) => typeof v !== "object");
    const text = simple ? value.join(", ") : tr(`${value.length} mục`, `${value.length} entries`);
    return { text: text.length > 60 ? `${text.slice(0, 57)}…` : text, full };
  }
  const entries = Object.entries(value as Record<string, unknown>);
  const text = entries.map(([k, v]) => `${k}: ${typeof v === "object" && v !== null ? "{…}" : String(v)}`).join(", ");
  return { text: text.length > 60 ? `${text.slice(0, 57)}…` : text || "{}", full };
}

/* ---------- stage list: add, remove, reorder (the route stays one shared sequence for every product) ----------
   Items of a stage before the last are semi-finished codes (product.route[stage]); the last stage makes the
   products themselves. So any change that moves the last stage re-keys that stage's machines between
   product codes and semi-finished codes. The engine finds the last/feeding stage by position
   (models/common/stage_runs/prepare.py last_stage/feed_stage), not by name. */

export const STAGE_CODE = /^[a-z][a-z0-9_]*$/;

/** "Đánh bóng" → "danh_bong" (stage codes are lower-case ASCII). */
export function slugStage(name: string): string {
  const slug = name.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D")
    .toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
  return /^[a-z]/.test(slug) ? slug : slug ? `s_${slug}` : "";
}

/** Stage whose items have molds (null when the plant uses none). */
export function moldStage(config: FactoryConfig): string | null {
  const items = new Set(Object.values(config.molds).map((m) => m.item));
  return config.stages.find((stage) => itemsOfStage(config, stage).some((item) => items.has(item))) ?? null;
}

function uniqueCode(base: string, taken: Set<string>): string {
  let code = base, n = 2;
  while (taken.has(code)) code = `${base}_${n++}`;
  taken.add(code);
  return code;
}

export interface StageCodeGroup { code: string; products: string[] }

/** Semi-finished codes a new stage at `index` would create. A middle/first stage gets one code per group of
    products sharing the incoming code (they share the outgoing one too); appending a stage after the last one
    gives the current last stage one output code per product. */
export function suggestStageCodes(config: FactoryConfig, index: number, stageCode: string): StageCodeGroup[] {
  const products = Object.keys(config.products);
  const taken = new Set([...products, ...Object.keys(config.btp)]);
  const n = config.stages.length;
  if (index >= n) {
    const last = config.stages[n - 1].toUpperCase();
    return products.map((p) => ({ code: uniqueCode(`${p}_${last}`, taken), products: [p] }));
  }
  const suffix = (stageCode || "new").toUpperCase();
  const groupStage = config.stages[index > 0 ? index - 1 : 0];
  const groups = new Map<string, string[]>();
  for (const p of products) {
    const key = config.products[p].route[groupStage] ?? p;
    groups.set(key, [...(groups.get(key) ?? []), p]);
  }
  return [...groups].map(([base, members]) => ({ code: uniqueCode(`${base}_${suffix}`, taken), products: members }));
}

/** Re-key the items a stage's machines (and molds) make: old item → new items. Two new items that came from
    the same old item get a 0-minute changeover, as before. */
function rekeyStage(config: FactoryConfig, stage: string, mapping: Record<string, string[]>): void {
  const map = (key: string) => mapping[key] ?? [key];
  for (const machine of Object.values(config.machines)) {
    if (machine.stage !== stage) continue;
    const rates: Record<string, number> = {};
    for (const [item, rate] of Object.entries(machine.minutes_per_unit)) for (const next of map(item)) rates[next] = rate;
    const setup: Record<string, Record<string, number>> = {};
    for (const [row, cols] of Object.entries(machine.setup)) {
      for (const nextRow of map(row)) {
        setup[nextRow] ??= {};
        for (const [col, value] of Object.entries(cols)) for (const nextCol of map(col)) setup[nextRow][nextCol] = row === col ? 0 : value;
      }
    }
    machine.minutes_per_unit = rates;
    machine.setup = setup;
  }
  for (const mold of Object.values(config.molds)) {
    const next = mapping[mold.item];
    if (next?.length === 1) mold.item = next[0];
  }
}

/** The last stage starts making semi-finished codes (one per product) instead of products. */
function demoteLast(config: FactoryConfig, codes: Record<string, string>): void {
  const last = config.stages[config.stages.length - 1];
  for (const [product, code] of Object.entries(codes)) {
    config.products[product].route[last] = code;
    config.btp[code] ??= { name: null, capacity: null };
  }
  rekeyStage(config, last, Object.fromEntries(Object.entries(codes).map(([p, c]) => [p, [c]])));
}

/** A semi-finished stage becomes the last one: its machines make the products that used its codes. */
function promoteToLast(config: FactoryConfig, stage: string): void {
  const mapping: Record<string, string[]> = {};
  for (const [product, spec] of Object.entries(config.products)) {
    const code = spec.route[stage];
    if (code) (mapping[code] ??= []).push(product);
    delete spec.route[stage];
  }
  rekeyStage(config, stage, mapping);
  for (const code of Object.keys(mapping)) delete config.btp[code];
}

export interface NewStage {
  code: string;
  name: string;
  /** Position in `stages` (stages.length = after the current last stage). */
  index: number;
  runSize: number;
  /** Minutes to move goods out of the new stage (or, when appended, out of the previous last stage). */
  transfer: number;
  /** Product → semi-finished code (see suggestStageCodes). */
  codes: Record<string, string>;
  machines: { count: number; calendar: "shifts" | "continuous"; rate: number; fixed: number; changeover: number };
}

export function insertStage(config: FactoryConfig, spec: NewStage): string[] {
  const n = config.stages.length;
  if (spec.index >= n) {
    const previous = config.stages[n - 1];
    demoteLast(config, spec.codes);
    config.transfer_minutes[previous] = spec.transfer;
  } else {
    for (const [product, code] of Object.entries(spec.codes)) {
      config.products[product].route[spec.code] = code;
      config.btp[code] ??= { name: null, capacity: null };
    }
    config.transfer_minutes[spec.code] = spec.transfer;
  }
  config.stages.splice(Math.min(spec.index, n), 0, spec.code);
  config.run_size[spec.code] = spec.runSize;
  config.stage_names[spec.code] = spec.name;
  const items = itemsOfStage(config, spec.code);
  const taken = new Set(Object.keys(config.machines));
  const created: string[] = [];
  for (let k = 1; k <= spec.machines.count; k++) {
    const code = uniqueCode(`${spec.code.toUpperCase()}_${k}`, taken);
    const machine: FactoryMachine = { name: null, stage: spec.code, calendar: spec.machines.calendar, minutes_per_unit: Object.fromEntries(items.map((i) => [i, spec.machines.rate])), fixed_minutes: spec.machines.fixed, setup: {} };
    completeSetup(config, machine);
    for (const [row, cols] of Object.entries(machine.setup)) for (const col of Object.keys(cols)) cols[col] = row === col ? 0 : spec.machines.changeover;
    config.machines[code] = machine;
    created.push(code);
  }
  return created;
}

/** Why a stage cannot be removed, or null. */
export function removeStageBlock(config: FactoryConfig, stage: string): [string, string] | null {
  const n = config.stages.length;
  if (n <= 2) return ["Nhà máy cần ít nhất 2 công đoạn.", "The plant needs at least 2 stages."];
  if (stage === config.stages[n - 1] && moldStage(config) === config.stages[n - 2]) return ["Công đoạn trước dùng khuôn nên không thể thành công đoạn cuối.", "The stage before uses molds, so it cannot become the last stage."];
  return null;
}

/** What removing a stage takes with it (for the confirmation). */
export function stageFootprint(config: FactoryConfig, stage: string) {
  const machines = Object.keys(config.machines).filter((m) => config.machines[m].stage === stage);
  const last = stage === config.stages[config.stages.length - 1];
  const codes = last ? [] : itemsOfStage(config, stage);
  return {
    machines,
    codes,
    molds: Object.keys(config.molds).filter((m) => codes.includes(config.molds[m].item) || (last && config.molds[m].item in config.products)),
    rules: config.maintenance_rules.filter((r) => machines.includes(r.machine)).length,
  };
}

export function removeStage(config: FactoryConfig, stage: string): void {
  const n = config.stages.length;
  const index = config.stages.indexOf(stage);
  if (index < 0) return;
  const last = index === n - 1;
  if (last) {
    const footprint = stageFootprint(config, stage);
    for (const mold of footprint.molds) delete config.molds[mold];
    promoteToLast(config, config.stages[n - 2]);
  }
  for (const [code, machine] of Object.entries(config.machines)) if (machine.stage === stage) delete config.machines[code];
  config.maintenance_rules = config.maintenance_rules.filter((r) => config.machines[r.machine]);
  for (const product of Object.values(config.products)) delete product.route[stage];
  delete config.run_size[stage];
  delete config.transfer_minutes[stage];
  delete config.stage_names[stage];
  config.stages.splice(index, 1);
  if (last) delete config.transfer_minutes[config.stages[config.stages.length - 1]];
  prune(config);
}

/** Why a stage cannot move from `from` to `to`, or null. */
export function moveStageBlock(config: FactoryConfig, from: number, to: number): [string, string] | null {
  const order = [...config.stages];
  const [stage] = order.splice(from, 1);
  order.splice(to, 0, stage);
  const newLast = order[order.length - 1];
  if (newLast !== config.stages[config.stages.length - 1] && moldStage(config) === newLast) return ["Công đoạn dùng khuôn không thể là công đoạn cuối.", "A stage with molds cannot be the last stage."];
  const moldItems = new Set(Object.values(config.molds).map((m) => m.item));
  const split = moveStage(clone(config), from, to).split.filter((s) => moldItems.has(s.code));
  if (split.length) return [`Đổi chỗ này buộc tách mã có khuôn (${split.map((s) => s.code).join(", ")}) — sửa khuôn trước.`, `This move would split codes that have molds (${split.map((s) => s.code).join(", ")}) — change the molds first.`];
  return null;
}

export interface MoveReport {
  /** [previous last stage, new last stage] when the move changes which stage makes the products. */
  lastChanged: [string, string] | null;
  /** Shared codes split because their products now arrive from different codes. */
  split: Array<{ code: string; into: string[] }>;
}

export function moveStage(config: FactoryConfig, from: number, to: number): MoveReport {
  const order = [...config.stages];
  const [stage] = order.splice(from, 1);
  order.splice(to, 0, stage);
  const oldLast = config.stages[config.stages.length - 1];
  const newLast = order[order.length - 1];
  if (newLast !== oldLast) {
    const taken = new Set([...Object.keys(config.products), ...Object.keys(config.btp)]);
    demoteLast(config, Object.fromEntries(Object.keys(config.products).map((p) => [p, uniqueCode(`${p}_${oldLast.toUpperCase()}`, taken)])));
    promoteToLast(config, newLast);
    config.transfer_minutes[oldLast] = config.transfer_minutes[newLast] ?? 0;
    delete config.transfer_minutes[newLast];
  }
  config.stages = order;
  return { lastChanged: newLast !== oldLast ? [oldLast, newLast] : null, split: splitMergedCodes(config) };
}

/** Routes only branch downstream: a shared code must be made from a single code. After a reorder,
    split every code whose products now arrive from different codes (one new code per upstream code). */
function splitMergedCodes(config: FactoryConfig): Array<{ code: string; into: string[] }> {
  const btpStages = config.stages.slice(0, -1);
  const out: Array<{ code: string; into: string[] }> = [];
  for (let k = 1; k < btpStages.length; k++) {
    const stage = btpStages[k], before = btpStages[k - 1];
    const byCode = new Map<string, Map<string, string[]>>();
    for (const [product, spec] of Object.entries(config.products)) {
      const ups = byCode.get(spec.route[stage]) ?? new Map<string, string[]>();
      ups.set(spec.route[before], [...(ups.get(spec.route[before]) ?? []), product]);
      byCode.set(spec.route[stage], ups);
    }
    for (const [code, ups] of byCode) {
      if (ups.size <= 1) continue;
      const taken = new Set([...Object.keys(config.products), ...Object.keys(config.btp)]);
      const into: string[] = [];
      for (const [up, members] of ups) {
        const next = uniqueCode(`${up}_${stage.toUpperCase()}`, taken);
        config.btp[next] = { ...config.btp[code] };
        for (const product of members) config.products[product].route[stage] = next;
        into.push(next);
      }
      rekeyStage(config, stage, { [code]: into });
      delete config.btp[code];
      out.push({ code, into });
    }
  }
  return out;
}
