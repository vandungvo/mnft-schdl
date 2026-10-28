/* Factories, order book and planning periods — mirrors backend/app/factory_schemas.py and factory_model.py. */

export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6; // 0 = Monday

export interface FactoryShift { name?: string | null; start: number; end: number; breaks: Array<[number, number]> }
export interface FactoryProduct { name?: string | null; color?: string | null; line?: string | null; route: Record<string, string>; safety_stock: number; stock_cap: number }
export interface FactoryBtp { name?: string | null; capacity?: number | null }
export interface FactoryMachine {
  name?: string | null;
  stage: string;
  calendar: "shifts" | "continuous";
  minutes_per_unit: Record<string, number>;
  fixed_minutes: number;
  setup: Record<string, Record<string, number>>;
  mold_change_minutes?: number | null;
}
export interface FactoryMold { item: string; cavities: number; limit_cycles: number; maintenance_minutes: number; after_maintenance: string }
export interface MaintenanceRule { machine: string; weekday: number; start: number; end: number; note?: string | null }
export interface ObjectivePolicy { key: string; name: string; description?: string | null; weights: Record<string, number>; tier1: string[]; scale: number }

export interface FactoryConfig {
  utc_offset: string;
  stages: string[];
  stage_names: Record<string, string>;
  run_size: Record<string, number>;
  transfer_minutes: Record<string, number>;
  machine_initial_state: string;
  shift_template: Record<string, FactoryShift>;
  weekly_off: number[];
  holidays: string[];
  maintenance_rules: MaintenanceRule[];
  default_due_time: string;
  lookahead_days: number;
  period_days: number;
  products: Record<string, FactoryProduct>;
  btp: Record<string, FactoryBtp>;
  machines: Record<string, FactoryMachine>;
  molds: Record<string, FactoryMold>;
  policies: ObjectivePolicy[];
  default_policy: string;
}

export interface ConfigChange { path: string; before: unknown; after: unknown }

export interface FactoryVersion { version: number; effective_from: string | null; note: string | null; changes: ConfigChange[]; actor: string; created_at: string }

export interface FactorySummary {
  id: string;
  name: string;
  current_version: number;
  counts: { products: number; machines: number; open_orders: number; periods: number };
  created_at: string;
  updated_at: string;
}

export interface FactoryDetail extends FactorySummary { config: FactoryConfig; versions: FactoryVersion[] }

/* ---------- order book ---------- */

export type OrderStatus = "open" | "delivered" | "cancelled";
export type Pickup = "at_due" | "when_ready";

export interface BookOrder {
  code: string;
  product: string;
  quantity: number;
  due: string;
  priority: number;
  pickup: Pickup;
  customer: string | null;
  note: string | null;
  status: OrderStatus;
  delivered_at: string | null;
  delivered_period_id: string | null;
  source: string;
  created_at: string;
  updated_at: string;
}

export interface BookOrderInput {
  code?: string;
  product: string;
  quantity: number;
  due: string;
  priority: number;
  pickup: Pickup;
  customer: string | null;
  note: string | null;
  status?: OrderStatus;
}

export interface Bilingual { vi: string; en: string }

export interface OrderImportRow {
  row: number;
  values: Partial<BookOrderInput> & { code?: string };
  action: "add" | "update" | "unchanged" | "invalid" | "locked";
  errors: Bilingual[];
  warnings: Bilingual[];
  changes: string[];
}

export interface OrderImportResult {
  columns: Record<string, string>;
  unmatched_headers: string[];
  missing_columns: string[];
  rows: OrderImportRow[];
  cancel: string[];
  summary: { add: number; update: number; unchanged: number; invalid: number; locked: number; cancel: number };
  committed: boolean;
}

export interface OutlookStage { stage: string; need_minutes: number; available_minutes: number; ratio: number | null }
export interface OutlookWeek { start: string; end: string; orders: number; demand: Record<string, number>; stages: OutlookStage[] }
export interface Outlook { weeks: OutlookWeek[]; overdue_orders: number; open_orders: number; unscheduled_soon: number }

/* ---------- planning periods ---------- */

export type PeriodStatus = "draft" | "needs_fix" | "ready" | "solving" | "options" | "committed" | "closed";
export type PeriodKind = "regular" | "variant" | "reschedule";

export interface PeriodOrder {
  code: string;
  product: string;
  quantity: number;
  due: string;
  priority: number;
  pickup: Pickup;
  from_stock: number | null;
  customer: string | null;
  note: string | null;
  source: "book" | "manual" | "carried";
}

export interface CalendarException {
  id: string;
  machine: string | null;
  start: string;
  end: string;
  kind: "maintenance" | "breakdown" | "closed" | "other";
  note: string | null;
}

export interface StockLevels { finished: Record<string, number>; btp: Record<string, number>; molds: Record<string, number> }
export interface OpeningState extends StockLevels { projected: StockLevels | null; as_of: string | null }
export interface ReservePolicy { finished_lots: number; btp_runs: Record<string, number> }

export interface PeriodInputs {
  orders: PeriodOrder[];
  opening: OpeningState;
  exceptions: CalendarException[];
  policy: string | null;
  reserve_policy: Record<string, ReservePolicy>;
  frozen_until: number | null;
  busy_until: Record<string, number>;
  notes: string[];
}

export interface Issue { severity: "error" | "warning" | "info"; code: string; vi: string; en: string; ref: string | null }
export interface StageLoad { stage: string; need_minutes: number; available_minutes: number; ratio: number | null }

export interface PeriodSummary {
  id: string;
  factory_id: string;
  factory_version: number;
  name: string;
  start_date: string;
  end_date: string;
  days: number;
  kind: PeriodKind;
  parent_id: string | null;
  variant_label: string | null;
  revision: number;
  dataset_id: string | null;
  dataset_revision: number | null;
  compiled_revision: number | null;
  status: PeriodStatus;
  counts: { orders: number; scheduled: number; long_term: number; exceptions: number; errors: number; warnings: number };
  runs: { total: number; current: number; succeeded: number; active: number; failed: number };
  decision: { period_id: string; run_id: string | null; alternative: string; policy: string; decided_at: string; dataset_revision: number | null; current: boolean } | null;
  closed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface PeriodDetail extends PeriodSummary {
  inputs: PeriodInputs;
  issues: Issue[];
  load: StageLoad[];
  factory: { name: string; utc_offset: string; pinned_version: number; applicable_version: number; latest_version: number };
  family: PeriodSummary[];
  changes_vs_parent: ConfigChange[];
  book_sync: { added: string[]; changed: Array<{ code: string; fields: string[] }>; removed: string[] };
}

export interface PeriodState {
  at: string;
  source_period_id: string;
  run_id: string;
  finished: Record<string, number>;
  btp: Record<string, number>;
  molds: Record<string, number>;
  delivered: Record<string, string>;
  earmarked: Record<string, number>;
  busy_until: Record<string, string>;
  in_progress: string[];
  started: number;
  total_runs: number;
}
