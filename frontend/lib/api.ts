import { tr } from "./locale";
import type {
  ApiErrorBody,
  AuditEventList,
  HealthResponse,
  MasterDatasetDetail,
  MasterDatasetList,
  ProductionPlanDetail,
  ProductionPlanList,
  ScheduleRunDetail,
  ScheduleRunList,
  ScheduleRunSummary,
} from "./types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";
const API_TOKEN = process.env.NEXT_PUBLIC_API_TOKEN;

export class ApiError extends Error {
  constructor(
    message: string,
    readonly code: string,
    readonly status: number,
    readonly requestId?: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export function getHealth(): Promise<HealthResponse> {
  return apiRequest("/health");
}

export function listAuditEvents(filters?: {
  resourceType?: string;
  resourceId?: string;
  limit?: number;
}): Promise<AuditEventList> {
  const params = new URLSearchParams({
    limit: String(filters?.limit ?? 50),
    offset: "0",
  });
  if (filters?.resourceType) params.set("resource_type", filters.resourceType);
  if (filters?.resourceId) params.set("resource_id", filters.resourceId);
  return apiRequest(`/audit-events?${params.toString()}`);
}

async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(API_TOKEN ? { Authorization: `Bearer ${API_TOKEN}` } : {}),
      ...init?.headers,
    },
  });
  if (!response.ok) {
    let body: ApiErrorBody | undefined;
    try {
      body = (await response.json()) as ApiErrorBody;
    } catch {
      // Preserve the HTTP fallback when an intermediary returns a non-JSON error.
    }
    throw new ApiError(
      body?.error.message ?? `Request failed with status ${response.status}`,
      body?.error.code ?? "HTTP_ERROR",
      response.status,
      body?.error.request_id,
      body?.error.details,
    );
  }
  return (await response.json()) as T;
}

export function apiErrorMessage(error: unknown, fallback: string): string {
  if (!(error instanceof ApiError)) return fallback;
  if (Array.isArray(error.details) && error.details.length > 0) {
    const first = error.details[0];
    if (typeof first === "string") return first;
    if (first && typeof first === "object" && "msg" in first && typeof first.msg === "string") {
      return first.msg.replace(/^Value error, /, "");
    }
  }
  return error.message || fallback;
}

export function listScheduleRuns(filters?: {
  limit?: number;
  offset?: number;
  status?: string;
  algorithm?: string;
  search?: string;
}): Promise<ScheduleRunList> {
  const params = new URLSearchParams({
    limit: String(filters?.limit ?? 100),
    offset: String(filters?.offset ?? 0),
  });
  if (filters?.status && filters.status !== "ALL") params.set("status", filters.status);
  if (filters?.algorithm && filters.algorithm !== "ALL") params.set("algorithm", filters.algorithm);
  if (filters?.search?.trim()) params.set("search", filters.search.trim());
  return apiRequest(`/schedule-runs?${params.toString()}`);
}

/** Pages through the run list (the API caps a page at 100) up to `max` runs, newest first. */
export async function listAllScheduleRuns(max = 500): Promise<ScheduleRunSummary[]> {
  const items: ScheduleRunSummary[] = [];
  for (let offset = 0; offset < max; offset += 100) {
    const page = await listScheduleRuns({ limit: 100, offset });
    items.push(...page.items);
    if (items.length >= page.total || page.items.length < 100) break;
  }
  return items;
}

export function getScheduleRun(id: string): Promise<ScheduleRunDetail> {
  return apiRequest(`/schedule-runs/${encodeURIComponent(id)}`);
}

export function createScheduleRun(payload: unknown, idempotencyKey: string): Promise<ScheduleRunSummary> {
  return apiRequest("/schedule-runs", {
    method: "POST",
    headers: { "Idempotency-Key": idempotencyKey },
    body: JSON.stringify(payload),
  });
}

export function retryScheduleRun(
  id: string,
  payload: { algorithm?: string; seed?: number; time_budget_seconds?: number } = {},
  idempotencyKey = crypto.randomUUID(),
): Promise<ScheduleRunSummary> {
  return apiRequest(`/schedule-runs/${encodeURIComponent(id)}/retry`, {
    method: "POST",
    headers: { "Idempotency-Key": idempotencyKey },
    body: JSON.stringify(payload),
  });
}

export function listProductionPlans(filters?: { limit?: number; offset?: number; status?: string; search?: string }): Promise<ProductionPlanList> {
  const params = new URLSearchParams({ limit: String(filters?.limit ?? 100), offset: String(filters?.offset ?? 0) });
  if (filters?.status && filters.status !== "all") params.set("status", filters.status);
  if (filters?.search?.trim()) params.set("search", filters.search.trim());
  return apiRequest(`/production-plans?${params.toString()}`);
}

export function getProductionPlan(id: string): Promise<ProductionPlanDetail> {
  return apiRequest(`/production-plans/${encodeURIComponent(id)}`);
}

export function createProductionPlan(payload: {
  dataset_id: string;
  period_start: number;
  period_end?: number;
  bucket_minutes: 1440 | 10080;
}): Promise<ProductionPlanDetail> {
  return apiRequest("/production-plans", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function listMasterDatasets(filters?: { limit?: number; offset?: number; search?: string }): Promise<MasterDatasetList> {
  const params = new URLSearchParams({ limit: String(filters?.limit ?? 100), offset: String(filters?.offset ?? 0) });
  if (filters?.search?.trim()) params.set("search", filters.search.trim());
  return apiRequest(`/master-data/datasets?${params.toString()}`);
}

export function getMasterDataset(id: string): Promise<MasterDatasetDetail> {
  return apiRequest(`/master-data/datasets/${encodeURIComponent(id)}`);
}

export function importMasterDataset(input: unknown): Promise<MasterDatasetDetail> {
  return apiRequest("/master-data/datasets/import", {
    method: "POST",
    body: JSON.stringify({ input }),
  });
}

export function replaceMasterDataset(id: string, input: unknown, expectedRevision: number): Promise<MasterDatasetDetail> {
  return apiRequest(`/master-data/datasets/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: JSON.stringify({ input, expected_revision: expectedRevision }),
  });
}

export function updateMasterProduct(
  datasetId: string,
  productCode: string,
  payload: { expected_revision: number; color: string; line: string; initial_inventory: number; safety_stock: number },
): Promise<MasterDatasetDetail> {
  return apiRequest(`/master-data/datasets/${encodeURIComponent(datasetId)}/products/${encodeURIComponent(productCode)}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function createMasterProduct(
  datasetId: string,
  payload: { expected_revision: number; code: string; color: string; line: string; initial_inventory: number; safety_stock: number },
): Promise<MasterDatasetDetail> {
  return apiRequest(`/master-data/datasets/${encodeURIComponent(datasetId)}/products`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function deleteMasterProduct(datasetId: string, productCode: string, expectedRevision: number): Promise<MasterDatasetDetail> {
  return apiRequest(`/master-data/datasets/${encodeURIComponent(datasetId)}/products/${encodeURIComponent(productCode)}?expected_revision=${expectedRevision}`, { method: "DELETE" });
}

export function createBtpCode(
  datasetId: string,
  payload: { expected_revision: number; code: string },
): Promise<MasterDatasetDetail> {
  return apiRequest(`/master-data/datasets/${encodeURIComponent(datasetId)}/btp-codes`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function renameBtpCode(
  datasetId: string,
  btpCode: string,
  payload: { expected_revision: number; code: string },
): Promise<MasterDatasetDetail> {
  return apiRequest(`/master-data/datasets/${encodeURIComponent(datasetId)}/btp-codes/${encodeURIComponent(btpCode)}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function deleteBtpCode(datasetId: string, btpCode: string, expectedRevision: number): Promise<MasterDatasetDetail> {
  return apiRequest(`/master-data/datasets/${encodeURIComponent(datasetId)}/btp-codes/${encodeURIComponent(btpCode)}?expected_revision=${expectedRevision}`, { method: "DELETE" });
}

export function upsertBtpInventory(
  datasetId: string,
  btpCode: string,
  payload: { expected_revision: number; initial_qty: number; capacity: number | null },
): Promise<MasterDatasetDetail> {
  return apiRequest(`/master-data/datasets/${encodeURIComponent(datasetId)}/btp-codes/${encodeURIComponent(btpCode)}/inventory`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export function deleteBtpInventory(datasetId: string, btpCode: string, expectedRevision: number): Promise<MasterDatasetDetail> {
  return apiRequest(`/master-data/datasets/${encodeURIComponent(datasetId)}/btp-codes/${encodeURIComponent(btpCode)}/inventory?expected_revision=${expectedRevision}`, { method: "DELETE" });
}

export function setBtpRouting(
  datasetId: string,
  productCode: string,
  stage: string,
  payload: { expected_revision: number; btp_code: string },
): Promise<MasterDatasetDetail> {
  return apiRequest(`/master-data/datasets/${encodeURIComponent(datasetId)}/products/${encodeURIComponent(productCode)}/routing/${encodeURIComponent(stage)}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export function updateMasterOrder(
  datasetId: string,
  orderCode: string,
  payload: Record<string, unknown>,
): Promise<MasterDatasetDetail> {
  return apiRequest(`/master-data/datasets/${encodeURIComponent(datasetId)}/orders/${encodeURIComponent(orderCode)}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function deleteMasterOrder(datasetId: string, orderCode: string, expectedRevision: number): Promise<MasterDatasetDetail> {
  return apiRequest(`/master-data/datasets/${encodeURIComponent(datasetId)}/orders/${encodeURIComponent(orderCode)}?expected_revision=${expectedRevision}`, { method: "DELETE" });
}

export function replaceMasterMachine(
  datasetId: string,
  machineCode: string,
  expectedRevision: number,
  machine: unknown,
): Promise<MasterDatasetDetail> {
  return apiRequest(`/master-data/datasets/${encodeURIComponent(datasetId)}/machines/${encodeURIComponent(machineCode)}`, {
    method: "PUT",
    body: JSON.stringify({ expected_revision: expectedRevision, machine }),
  });
}

export function deleteMasterMachine(datasetId: string, machineCode: string, expectedRevision: number): Promise<MasterDatasetDetail> {
  return apiRequest(`/master-data/datasets/${encodeURIComponent(datasetId)}/machines/${encodeURIComponent(machineCode)}?expected_revision=${expectedRevision}`, { method: "DELETE" });
}

export async function deleteMasterDataset(id: string): Promise<void> {
  const response = await fetch(`${API_URL}/master-data/datasets/${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: API_TOKEN ? { Authorization: `Bearer ${API_TOKEN}` } : undefined,
  });
  if (!response.ok) {
    throw new ApiError(tr("Không thể xóa bộ dữ liệu", "Could not delete the dataset"), "DELETE_FAILED", response.status);
  }
}
