export type RunStatus = "QUEUED" | "RUNNING" | "SUCCEEDED" | "FAILED" | "CANCELLED";
export type Algorithm = "fifo" | "edd" | "spt" | "simulated_annealing" | "genetic_algorithm" | "cp_sat" | "cp_sat_hint" | "cp_lns";

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
  algorithm: Algorithm;
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
  lot: string;
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
  shift: string;
}

export interface ScheduleRunDetail extends ScheduleRunSummary {
  solver_metadata: Record<string, unknown> | null;
  validation: { valid: boolean; errors: string[]; operations_checked?: number } | null;
  metrics: Record<string, number> | null;
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
  schema_version: number;
  name: string;
  seed: number;
  origin: string;
  time_unit: "minute";
  horizon: number;
  working_days: number[];
  stages: string[];
  products: string[];
  initial_inventory: Record<string, number>;
  safety_stock: Record<string, number>;
  checkpoints: number[];
  minimum_lot: number;
  max_surplus: number;
  machines: Record<string, MachineInput>;
  orders: OrderInput[];
  lots: Array<{ id: string; order: string; product: string; quantity: number; release: number }>;
  weights: Record<string, number>;
  assumptions: string[];
}

export interface MasterDatasetDetail extends MasterDatasetSummary {
  input: SchedulingInputDocument;
}

export interface MasterDatasetList {
  items: MasterDatasetSummary[];
  total: number;
  limit: number;
  offset: number;
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
