import { tr } from "./locale";
import type {
  BookOrder,
  BookOrderInput,
  FactoryConfig,
  FactoryDetail,
  FactorySummary,
  OrderImportResult,
  Outlook,
  PeriodDetail,
  PeriodInputs,
  PeriodOrder,
  PeriodState,
  PeriodSummary,
  CalendarException,
} from "./factory-types";
import type {
  ApiErrorBody,
  AuditEventList,
  HealthResponse,
  MasterDatasetDetail,
  MasterDatasetDetailV4,
  MasterDatasetList,
  ProductionPlanDetail,
  ProductionPlanList,
  ScheduleDecision,
  ScheduleDecisionCreate,
  ScheduleDecisionList,
  ScheduleEditPreview,
  ScheduleEditRequest,
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

/** Rebuild, validate and score an edit of a run; nothing is stored. */
export function previewScheduleEdit(id: string, payload: ScheduleEditRequest, signal?: AbortSignal): Promise<ScheduleEditPreview> {
  return apiRequest(`/schedule-runs/${encodeURIComponent(id)}/edits/preview`, { method: "POST", body: JSON.stringify(payload), signal });
}

/** Store a valid edit as a new run (algorithm "manual") among the options of the same inputs. */
export function saveScheduleEdit(id: string, payload: ScheduleEditRequest, idempotencyKey = crypto.randomUUID()): Promise<ScheduleRunSummary> {
  return apiRequest(`/schedule-runs/${encodeURIComponent(id)}/edits`, {
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

/** Committed schedules of a scenario, newest first. */
export function listScheduleDecisions(datasetId: string, limit = 100): Promise<ScheduleDecisionList> {
  return apiRequest(`/master-data/datasets/${encodeURIComponent(datasetId)}/decisions?limit=${limit}`);
}

export function commitScheduleDecision(datasetId: string, payload: ScheduleDecisionCreate): Promise<ScheduleDecision> {
  return apiRequest(`/master-data/datasets/${encodeURIComponent(datasetId)}/decisions`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
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

export function listMasterDatasets(filters?: { limit?: number; offset?: number; search?: string; owner?: "all" | "standalone" | "periods" }): Promise<MasterDatasetList> {
  const params = new URLSearchParams({ limit: String(filters?.limit ?? 100), offset: String(filters?.offset ?? 0) });
  if (filters?.search?.trim()) params.set("search", filters.search.trim());
  if (filters?.owner) params.set("owner", filters.owner);
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
): Promise<MasterDatasetDetailV4> {
  return apiRequest(`/master-data/datasets/${encodeURIComponent(datasetId)}/products/${encodeURIComponent(productCode)}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function createMasterProduct(
  datasetId: string,
  payload: { expected_revision: number; code: string; color: string; line: string; initial_inventory: number; safety_stock: number },
): Promise<MasterDatasetDetailV4> {
  return apiRequest(`/master-data/datasets/${encodeURIComponent(datasetId)}/products`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function deleteMasterProduct(datasetId: string, productCode: string, expectedRevision: number): Promise<MasterDatasetDetailV4> {
  return apiRequest(`/master-data/datasets/${encodeURIComponent(datasetId)}/products/${encodeURIComponent(productCode)}?expected_revision=${expectedRevision}`, { method: "DELETE" });
}

export function createBtpCode(
  datasetId: string,
  payload: { expected_revision: number; code: string },
): Promise<MasterDatasetDetailV4> {
  return apiRequest(`/master-data/datasets/${encodeURIComponent(datasetId)}/btp-codes`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function renameBtpCode(
  datasetId: string,
  btpCode: string,
  payload: { expected_revision: number; code: string },
): Promise<MasterDatasetDetailV4> {
  return apiRequest(`/master-data/datasets/${encodeURIComponent(datasetId)}/btp-codes/${encodeURIComponent(btpCode)}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function deleteBtpCode(datasetId: string, btpCode: string, expectedRevision: number): Promise<MasterDatasetDetailV4> {
  return apiRequest(`/master-data/datasets/${encodeURIComponent(datasetId)}/btp-codes/${encodeURIComponent(btpCode)}?expected_revision=${expectedRevision}`, { method: "DELETE" });
}

export function upsertBtpInventory(
  datasetId: string,
  btpCode: string,
  payload: { expected_revision: number; initial_qty: number; capacity: number | null },
): Promise<MasterDatasetDetailV4> {
  return apiRequest(`/master-data/datasets/${encodeURIComponent(datasetId)}/btp-codes/${encodeURIComponent(btpCode)}/inventory`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export function deleteBtpInventory(datasetId: string, btpCode: string, expectedRevision: number): Promise<MasterDatasetDetailV4> {
  return apiRequest(`/master-data/datasets/${encodeURIComponent(datasetId)}/btp-codes/${encodeURIComponent(btpCode)}/inventory?expected_revision=${expectedRevision}`, { method: "DELETE" });
}

export function setBtpRouting(
  datasetId: string,
  productCode: string,
  stage: string,
  payload: { expected_revision: number; btp_code: string },
): Promise<MasterDatasetDetailV4> {
  return apiRequest(`/master-data/datasets/${encodeURIComponent(datasetId)}/products/${encodeURIComponent(productCode)}/routing/${encodeURIComponent(stage)}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export function updateMasterOrder(
  datasetId: string,
  orderCode: string,
  payload: Record<string, unknown>,
): Promise<MasterDatasetDetailV4> {
  return apiRequest(`/master-data/datasets/${encodeURIComponent(datasetId)}/orders/${encodeURIComponent(orderCode)}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function deleteMasterOrder(datasetId: string, orderCode: string, expectedRevision: number): Promise<MasterDatasetDetailV4> {
  return apiRequest(`/master-data/datasets/${encodeURIComponent(datasetId)}/orders/${encodeURIComponent(orderCode)}?expected_revision=${expectedRevision}`, { method: "DELETE" });
}

export function replaceMasterMachine(
  datasetId: string,
  machineCode: string,
  expectedRevision: number,
  machine: unknown,
): Promise<MasterDatasetDetailV4> {
  return apiRequest(`/master-data/datasets/${encodeURIComponent(datasetId)}/machines/${encodeURIComponent(machineCode)}`, {
    method: "PUT",
    body: JSON.stringify({ expected_revision: expectedRevision, machine }),
  });
}

export function deleteMasterMachine(datasetId: string, machineCode: string, expectedRevision: number): Promise<MasterDatasetDetailV4> {
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

async function apiDelete(path: string): Promise<void> {
  const response = await fetch(`${API_URL}${path}`, {
    method: "DELETE",
    headers: API_TOKEN ? { Authorization: `Bearer ${API_TOKEN}` } : undefined,
  });
  if (!response.ok) {
    let body: ApiErrorBody | undefined;
    try { body = (await response.json()) as ApiErrorBody; } catch { /* non-JSON error */ }
    throw new ApiError(body?.error.message ?? tr("Không thể xóa", "Could not delete"), body?.error.code ?? "DELETE_FAILED", response.status, body?.error.request_id, body?.error.details);
  }
}

const post = (body: unknown): RequestInit => ({ method: "POST", body: JSON.stringify(body) });
const put = (body: unknown): RequestInit => ({ method: "PUT", body: JSON.stringify(body) });
const enc = encodeURIComponent;

/* ---------- factories ---------- */

export function listFactories(): Promise<{ items: FactorySummary[]; total: number }> {
  return apiRequest("/factories");
}

export function getFactory(id: string): Promise<FactoryDetail> {
  return apiRequest(`/factories/${enc(id)}`);
}

export function importFactory(name: string, document: unknown): Promise<FactoryDetail> {
  return apiRequest("/factories/import", post({ name, document, create_period: true }));
}

export function renameFactory(id: string, name: string): Promise<FactoryDetail> {
  return apiRequest(`/factories/${enc(id)}`, { method: "PATCH", body: JSON.stringify({ name }) });
}

export function updateFactoryConfig(id: string, payload: { expected_version: number; config: FactoryConfig; effective_from: string | null; note: string | null }): Promise<FactoryDetail> {
  return apiRequest(`/factories/${enc(id)}/config`, put(payload));
}

export function getFactoryVersion(id: string, version: number): Promise<FactoryDetail["versions"][number] & { config: FactoryConfig }> {
  return apiRequest(`/factories/${enc(id)}/versions/${version}`);
}

export function getOutlook(id: string, start?: string, weeks = 8): Promise<Outlook> {
  const params = new URLSearchParams({ weeks: String(weeks) });
  if (start) params.set("start", start);
  return apiRequest(`/factories/${enc(id)}/outlook?${params.toString()}`);
}

/* ---------- order book ---------- */

export function listBookOrders(factoryId: string, filters?: { status?: string; search?: string; dueFrom?: string; dueTo?: string }): Promise<{ items: BookOrder[]; total: number }> {
  const params = new URLSearchParams({ limit: "1000" });
  if (filters?.status) params.set("status", filters.status);
  if (filters?.search?.trim()) params.set("search", filters.search.trim());
  if (filters?.dueFrom) params.set("due_from", filters.dueFrom);
  if (filters?.dueTo) params.set("due_to", filters.dueTo);
  return apiRequest(`/factories/${enc(factoryId)}/orders?${params.toString()}`);
}

export function createBookOrder(factoryId: string, order: BookOrderInput): Promise<BookOrder> {
  return apiRequest(`/factories/${enc(factoryId)}/orders`, post(order));
}

export function updateBookOrder(factoryId: string, code: string, order: BookOrderInput): Promise<BookOrder> {
  return apiRequest(`/factories/${enc(factoryId)}/orders/${enc(code)}`, put(order));
}

export function deleteBookOrder(factoryId: string, code: string): Promise<void> {
  return apiDelete(`/factories/${enc(factoryId)}/orders/${enc(code)}`);
}

export function importBookOrders(factoryId: string, payload: { format: "csv" | "tsv" | "xlsx"; content: string; mode: "upsert" | "replace_open"; commit: boolean; skip_invalid: boolean }): Promise<OrderImportResult> {
  return apiRequest(`/factories/${enc(factoryId)}/orders/import`, post(payload));
}

/* ---------- planning periods ---------- */

export function listPeriods(factoryId?: string): Promise<{ items: PeriodSummary[]; total: number }> {
  return apiRequest(`/periods${factoryId ? `?factory_id=${enc(factoryId)}` : ""}`);
}

export function getPeriod(id: string): Promise<PeriodDetail> {
  return apiRequest(`/periods/${enc(id)}`);
}

export function createPeriod(payload: { factory_id: string; start_date: string; days?: number; name?: string; opening: "previous" | "zero"; pull_orders: boolean }): Promise<PeriodDetail> {
  return apiRequest("/periods", post(payload));
}

export function renamePeriod(id: string, name: string, variantLabel?: string | null): Promise<PeriodDetail> {
  return apiRequest(`/periods/${enc(id)}`, { method: "PATCH", body: JSON.stringify({ name, variant_label: variantLabel ?? null }) });
}

export function updatePeriodInputs(id: string, expectedRevision: number, inputs: PeriodInputs): Promise<PeriodDetail> {
  return apiRequest(`/periods/${enc(id)}/inputs`, put({ expected_revision: expectedRevision, inputs }));
}

export function upgradePeriodFactory(id: string): Promise<PeriodDetail> {
  return apiRequest(`/periods/${enc(id)}/upgrade-factory`, { method: "POST" });
}

export function syncPeriodBook(id: string, expectedRevision: number): Promise<PeriodDetail> {
  return apiRequest(`/periods/${enc(id)}/book-sync?expected_revision=${expectedRevision}`, { method: "POST" });
}

export function createPeriodVariant(id: string, label: string): Promise<PeriodDetail> {
  return apiRequest(`/periods/${enc(id)}/variants`, post({ label }));
}

export function getPeriodState(id: string, at?: string): Promise<PeriodState> {
  return apiRequest(`/periods/${enc(id)}/state${at ? `?at=${enc(at)}` : ""}`);
}

export function reschedulePeriod(id: string, payload: { cutoff: string; label?: string | null; exceptions: CalendarException[]; add_orders: PeriodOrder[] }): Promise<PeriodDetail> {
  return apiRequest(`/periods/${enc(id)}/reschedule`, post(payload));
}

export function closePeriod(id: string): Promise<PeriodDetail> {
  return apiRequest(`/periods/${enc(id)}/close`, { method: "POST" });
}

export function rolloverPeriod(id: string, payload: { start_date?: string; days?: number; name?: string } = {}): Promise<PeriodDetail> {
  return apiRequest(`/periods/${enc(id)}/rollover`, post(payload));
}

export function deletePeriod(id: string): Promise<void> {
  return apiDelete(`/periods/${enc(id)}`);
}
