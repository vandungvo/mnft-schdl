export type RunStatus = "QUEUED" | "RUNNING" | "SUCCEEDED" | "FAILED" | "CANCELLED";
export type Algorithm = "fifo" | "edd" | "spt" | "simulated_annealing" | "genetic_algorithm" | "cp_sat" | "cp_sat_hint" | "cp_lns" | "cp_rolling";

export interface HealthResponse {
  status: "ok";
  service: string;
  environment: string;
  master_data_status: "ready" | "empty";
  master_dataset_count: number;
  production_plan_count: number;
  plans_needing_attention: number;
  schedule_run_count: number;
  solver_default_budget_seconds: number;
  solver_max_budget_seconds: number;
  supported_algorithms: Algorithm[];
  database_latency_ms: number;
  queued_runs: number;
  running_runs: number;
  failed_runs_24h: number;
  latest_run_finished_at: string | null;
}

export interface ScheduleRunSummary {
  id: string;
  dataset_id: string | null;
  dataset_revision: number | null;
  plan_id: string | null;
  retry_of_id: string | null;
  status: RunStatus;
  /** "manual": a planner's edit of another run (stored by the edit endpoint, never solved). */
  algorithm: Algorithm | "manual";
  seed: number;
  time_budget_seconds: number;
  input_name: string;
  time_origin: string;
  horizon_minutes: number;
  input_hash: string;
  solver_status: string | null;
  error_code: string | null;
  error_message: string | null;
  created_at: string;
  started_at: string | null;
  finished_at: string | null;
  updated_at: string;
}

export interface ScheduleOperation {
  id: number;
  /** Schema 4: the lot. Schema 5: the run id (a lot is a run of the last stage). */
  lot: string;
  /** Schema 5: what the run makes (semi-finished code or product). */
  item?: string | null;
  stage: string;
  machine: string;
  block_start: number;
  start: number;
  end: number;
  setup_minutes: number;
  maintenance_minutes: number;
  cycles_after: number;
  mold: string | null;
  window: number;
  /** null on a machine that runs around the clock (schema 5 heat treatment). */
  shift: string | null;
}

export interface ScheduleRunDetail extends ScheduleRunSummary {
  solver_metadata: Record<string, unknown> | null;
  validation: { valid: boolean; errors: string[]; operations_checked?: number } | null;
  metrics: Record<string, number> | null;
  operations: ScheduleOperation[];
}

/** A planner's edit of a succeeded schema-5 run (backend ScheduleEditRequest). */
export interface ScheduleEditRequest {
  /** Full run order per machine: moving a run takes it out of one list and into another. */
  sequence: Record<string, string[]>;
  /** Runs the planner moved: they go as early as their new place allows (the rest keep their old start as a lower bound). */
  moved: string[];
  /** Earliest start per run, in horizon minutes. */
  not_before: Record<string, number>;
  compact: boolean;
  label?: string | null;
  note?: string | null;
}

export interface ScheduleEditIssue { code: string; subject: string | null; minute: number | null; raw: string; runs: string[] }

export interface ScheduleEditPreview {
  valid: boolean;
  issues: ScheduleEditIssue[];
  metrics: Record<string, number> | null;
  base_metrics: Record<string, number>;
  changes: Array<{ run: string; stage: string; from_machine: string; to_machine: string; from_start: number; to_start: number }>;
  operations: ScheduleOperation[];
}

export interface ScheduleRunList {
  items: ScheduleRunSummary[];
  total: number;
  limit: number;
  offset: number;
}

export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    request_id?: string;
    details?: unknown;
  };
}

export interface MasterDatasetCounts {
  products: number;
  machines: number;
  orders: number;
  lots: number;
  /** Schema 5: fixed runs over every stage (lots = runs of the last stage). */
  runs?: number;
}

export interface MasterDatasetSummary {
  id: string;
  name: string;
  source_hash: string;
  schema_version: number;
  revision: number;
  origin: string;
  horizon: number;
  is_ready: boolean;
  readiness_errors: string[];
  counts: MasterDatasetCounts;
  /** Set when a planning period compiled this scenario: it is edited through that period. */
  owner_period_id?: string | null;
  created_at: string;
  updated_at: string;
}

export interface MachineInput {
  stage: string;
  minutes_per_unit: Record<string, number>;
  fixed_minutes: number;
  initial_product: string;
  setup: Record<string, Record<string, number>>;
  windows: Array<{ id: number; shift: string; start: number; end: number }>;
  shifts: Array<{ id: string; day: number; start: number; end: number; available_minutes: number }>;
  downtime: Array<[number, number]>;
  mold?: {
    id: string;
    cavities: number;
    limit_cycles: number;
    initial_cycles: number;
    maintenance_minutes: number;
    after_maintenance: string;
  };
}

export interface OrderInput {
  id: string;
  product: string;
  release: number;
  due: number;
  priority: number;
  urgent: boolean;
  quantity: number;
  initial_allocated: number;
  lot_allocations: Record<string, number>;
  deadline?: number;
}

export interface SchedulingInputDocument {
  schema_version: 4;
  name: string;
  seed: number;
  origin: string;
  time_unit: "minute";
  horizon: number;
  working_days: number[];
  stages: string[];
  products: string[];
  product_color: Record<string, string>;
  product_line: Record<string, string>;
  initial_inventory: Record<string, number>;
  safety_stock: Record<string, number>;
  /** BTP (semi-finished) code catalog — a free-standing identity, distinct from
   * finished product codes, that one or more (product, stage) routings can share. */
  btp_codes: string[];
  /** {product: {stage: btp_code}} — which BTP code a (product, stage in cast/cnc/paint) resolves to. */
  btp_routing: Record<string, Record<string, string>>;
  /** Flat by BTP code. */
  inventory_btp: Record<string, number>;
  /** Sparse: a missing btp_code entry means unlimited capacity. */
  btp_capacity: Record<string, number>;
  max_surplus_btp: number;
  /** Fixed handoff lag: BTP is only usable downstream this many minutes after the producing run ends. */
  transfer_minutes: number;
  checkpoints: number[];
  minimum_lot: number;
  max_surplus: number;
  machines: Record<string, MachineInput>;
  orders: OrderInput[];
  lots: Array<{ id: string; order: string; product: string; quantity: number; release: number }>;
  weights: Record<string, number>;
  assumptions: string[];
}

/** Schema 5: fixed-size runs per stage on a 5-stage line (models/common/stage_runs). */
export interface SchedulingInputV5 {
  schema_version: 5;
  derived_from?: string;
  name: string;
  origin: string;
  time_unit: "minute";
  horizon: number;
  stages: string[];
  run_size: Record<string, number>;
  transfer_minutes: Record<string, number>;
  checkpoints: number[];
  machine_initial_state: string;
  shift_template: Record<string, { start: number; end: number; breaks?: Array<[number, number]> }>;
  /** route: {stage: item made at that stage}, the last stage makes the product itself. */
  products: Record<string, { route: Record<string, string>; initial_stock: number; safety_stock: number; stock_cap: number }>;
  btp: Record<string, { initial_stock: number; capacity?: number }>;
  machines: Record<string, {
    stage: string;
    minutes_per_unit: Record<string, number>;
    fixed_minutes: number;
    setup: Record<string, Record<string, number>>;
    mold_change_minutes?: number;
    downtime?: Array<[number, number]>;
    calendar?: "shifts" | "continuous";
  }>;
  molds?: Record<string, { item: string; cavities: number; limit_cycles: number; initial_cycles: number; maintenance_minutes: number; after_maintenance: string }>;
  orders: Array<{ id: string; product: string; quantity: number; due: number; priority: number; release: number; initial_allocated: number; lot_allocations: Record<string, number> }>;
  long_term_orders?: Array<{ id: string; product: string; quantity: number; due: number }>;
  weights: Record<string, number>;
  objective_tiers?: { tier1?: string[]; scale?: number };
  reserve_options?: Record<string, { pull_ahead_for: string }>;
  runs: Array<{ id: string; stage: string; item: string; reserve_option?: string }>;
}

export type AnySchedulingInput = SchedulingInputDocument | SchedulingInputV5;

export function isV5(input: AnySchedulingInput | null | undefined): input is SchedulingInputV5 {
  return input?.schema_version === 5;
}

export interface MasterDatasetDetail extends MasterDatasetSummary {
  input: AnySchedulingInput;
}

/** A schema-4 scenario: the record-level editors (products, BTP, machines, orders) work on this. */
export type MasterDatasetDetailV4 = MasterDatasetDetail & { input: SchedulingInputDocument };

export interface MasterDatasetList {
  items: MasterDatasetSummary[];
  total: number;
  limit: number;
  offset: number;
}

/** A committed schedule (server-side, append-only). Figures are as shown when it was committed. */
export interface ScheduleDecision {
  id: string;
  dataset_id: string | null;
  run_id: string | null;
  dataset_revision: number | null;
  input_hash: string;
  algorithm: Algorithm | "manual";
  seed: number;
  alternative: string;
  policy: string;
  score: string;
  late: number;
  shortfall: number;
  shifts: number;
  reason: string;
  actor: string;
  decided_at: string;
  created_at: string;
}

export interface ScheduleDecisionList {
  items: ScheduleDecision[];
  total: number;
  limit: number;
  offset: number;
}

export interface ScheduleDecisionCreate {
  run_id: string;
  alternative: string;
  policy: string;
  score: string;
  late: number;
  shortfall: number;
  shifts: number;
  reason: string;
  /** Only with legacy_key: importing a decision recorded in the browser before the server stored them. */
  decided_at?: string;
  legacy_key?: string;
}

export interface ProductionPlanSummary {
  id: string;
  dataset_id: string | null;
  dataset_revision: number;
  input_hash: string;
  period_start: number;
  period_end: number;
  bucket_minutes: 1440 | 10080;
  status: "READY" | "NEEDS_ATTENTION";
  created_at: string;
  time_origin: string;
  input_name: string;
}

export interface AuditEvent {
  id: number;
  actor: string;
  action: string;
  resource_type: string;
  resource_id: string | null;
  details: Record<string, unknown>;
  created_at: string;
}

export interface AuditEventList {
  items: AuditEvent[];
  total: number;
  limit: number;
  offset: number;
}

export interface ProductionPlanProduct {
  product: string;
  demand_qty: number;
  initial_inventory: number;
  inventory_allocated: number;
  required_production_qty: number;
  planned_lot_qty: number;
  projected_ending_inventory: number;
  safety_stock: number;
  safety_shortfall: number;
}

export interface ProductionPlanStage {
  stage: string;
  lot_count: number;
  required_minutes: number;
  available_minutes: number;
  load_ratio: number | null;
  overloaded: boolean;
}

export interface ProductionPlanDetail extends ProductionPlanSummary {
  result: {
    order_count: number;
    lot_count: number;
    products: ProductionPlanProduct[];
    stages: ProductionPlanStage[];
    buckets: Array<{
      start: number;
      end: number;
      products: Array<{ product: string; demand_qty: number; production_qty: number }>;
    }>;
    warnings: string[];
    assumptions: string[];
  };
}

export interface ProductionPlanList {
  items: ProductionPlanSummary[];
  total: number;
  limit: number;
  offset: number;
}
