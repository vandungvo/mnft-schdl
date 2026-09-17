// URL gọi từ TRÌNH DUYỆT của người dùng, khác với URL backend gọi nội bộ
// giữa các container (xem docker-compose.yml + NEXT_PUBLIC_API_BASE_URL).
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`${init?.method ?? "GET"} ${path} failed (${res.status}): ${detail}`);
  }
  return res.json() as Promise<T>;
}

export type HealthResponse = { status: string };

export type Order = {
  id: number;
  type: string;
  qty: number;
  due_day: number;
  created_at: string;
};

export type OrderCreate = {
  type: string;
  qty: number;
  due_day: number;
};

export type InventorySnapshot = {
  id: number;
  product_type: string;
  wip_qty: number;
  fg_qty: number;
  wip_min: number;
  fg_min: number;
  snapshot_date: string;
};

export type InventorySnapshotCreate = {
  product_type: string;
  wip_qty: number;
  fg_qty: number;
  wip_min: number;
  fg_min: number;
  snapshot_date: string;
};

export type AggregatePlanEntry = {
  type: string;
  day: number;
  cast: number;
  cnc: number;
  wip: number;
  fg: number;
  backlog: number;
  shipped: number;
  wip_short: number;
  fg_short: number;
};

export type AggregateRunResult = {
  status: string;
  cost_backlog: number;
  cost_safety: number;
  cost_hold: number;
  cost_setup: number;
  cost_end_shortfall: number;
  plan: Record<string, AggregatePlanEntry>;
  end_wip_shortfall: Record<string, number>;
  end_fg_shortfall: Record<string, number>;
};

export type AggregateRun = {
  id: number;
  run_type: string;
  created_at: string;
  result: AggregateRunResult;
};

export type BottleneckResponse = {
  run_id: number;
  lines: string[];
};

export const api = {
  health: () => request<HealthResponse>("/health"),

  listOrders: () => request<Order[]>("/orders"),
  createOrder: (payload: OrderCreate) =>
    request<Order>("/orders", { method: "POST", body: JSON.stringify(payload) }),

  listInventorySnapshots: () => request<InventorySnapshot[]>("/inventory/snapshot"),
  createInventorySnapshot: (payload: InventorySnapshotCreate) =>
    request<InventorySnapshot>("/inventory/snapshot", { method: "POST", body: JSON.stringify(payload) }),

  runAggregatePlanning: () =>
    request<AggregateRun>("/planning/aggregate/run", { method: "POST", body: JSON.stringify({}) }),
  getAggregateRun: (runId: number) => request<AggregateRun>(`/planning/aggregate/${runId}`),

  getBottleneck: (runId: number) => request<BottleneckResponse>(`/explain/bottleneck?run_id=${runId}`),
};
