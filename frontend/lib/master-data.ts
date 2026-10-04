/* Derived views and advisory checks over a factory dataset (SchedulingInputDocument).
   Pure functions only — the backend remains the source of truth for validation (readiness_errors);
   these checks are hints that point the planner at the record to fix. */
import { ApiError } from "./api";
import { stageLabel } from "./format";
import { tr } from "./locale";
import type { MachineInput, SchedulingInputDocument } from "./types";

export const MD_TABS = ["overview", "products", "btp", "machines", "orders", "settings", "history"] as const;
export type MdTab = (typeof MD_TABS)[number];

export function isMdTab(value: string | null): value is MdTab {
  return Boolean(value) && (MD_TABS as readonly string[]).includes(value!);
}

export const BTP_STAGES = ["cast", "cnc", "paint"] as const;
export const CODE_PATTERN = /^[A-Z0-9][A-Z0-9_-]*$/;

export type Severity = "error" | "warning" | "info";

export interface DataIssue {
  id: string;
  severity: Severity;
  tab: MdTab;
  /** Record to open in the tab's detail drawer, when the issue is about one record. */
  item?: string;
  title: string;
  detail?: string;
  /** "backend" = readiness error returned by the API (blocks scheduling); "check" = client-side hint. */
  source: "backend" | "check";
}

export const sum = (values: number[]) => values.reduce((a, b) => a + b, 0);

/** Item code a machine at `stage` processes for `product`: the routed BTP code, or the product itself at QC. */
export function stageItem(input: SchedulingInputDocument, product: string, stage: string): string | undefined {
  if ((BTP_STAGES as readonly string[]).includes(stage)) return input.btp_routing[product]?.[stage];
  return product;
}

export function machinesByStage(input: SchedulingInputDocument): Array<{ stage: string; machines: Array<[string, MachineInput]> }> {
  const entries = Object.entries(input.machines);
  return input.stages.map((stage) => ({ stage, machines: entries.filter(([, machine]) => machine.stage === stage).sort((a, b) => a[0].localeCompare(b[0])) }));
}

/** Products (and stages) that route to a BTP code — "used by" for the BTP catalog. */
export function btpUsage(input: SchedulingInputDocument): Record<string, Array<{ product: string; stage: string }>> {
  const usage: Record<string, Array<{ product: string; stage: string }>> = Object.fromEntries(input.btp_codes.map((code) => [code, []]));
  for (const product of input.products) {
    for (const stage of BTP_STAGES) {
      const code = input.btp_routing[product]?.[stage];
      if (code) (usage[code] ??= []).push({ product, stage });
    }
  }
  return usage;
}

/** Machines able to process an item code (minutes_per_unit has it). */
export function capableMachines(input: SchedulingInputDocument, item: string): string[] {
  return Object.entries(input.machines).filter(([, machine]) => item in machine.minutes_per_unit).map(([id]) => id);
}

export interface ProductDemand {
  product: string;
  orders: number;
  urgent: number;
  quantity: number;
  fromStock: number;
  lotQty: number;
}

export function demandByProduct(input: SchedulingInputDocument): ProductDemand[] {
  return input.products.map((product) => {
    const orders = input.orders.filter((order) => order.product === product);
    return {
      product,
      orders: orders.length,
      urgent: orders.filter((order) => order.urgent).length,
      quantity: sum(orders.map((order) => order.quantity)),
      fromStock: sum(orders.map((order) => order.initial_allocated)),
      lotQty: sum(input.lots.filter((lot) => lot.product === product).map((lot) => lot.quantity)),
    };
  });
}

export function availableMinutes(machine: MachineInput): number {
  return sum(machine.shifts.map((shift) => shift.available_minutes));
}

export function downtimeMinutes(machine: MachineInput): number {
  return sum(machine.downtime.map(([a, z]) => Math.max(0, z - a)));
}

export interface StageLoad {
  stage: string;
  machines: number;
  required: number;
  available: number;
  ratio: number | null;
}

/** Rough-cut load per stage: lot quantity × fastest capable minutes/unit + fixed minutes, against shift minutes minus downtime.
    Excludes setup and mold maintenance, so a ratio near 100% already means trouble. */
export function stageLoads(input: SchedulingInputDocument): StageLoad[] {
  return machinesByStage(input).map(({ stage, machines }) => {
    let required = 0;
    for (const lot of input.lots) {
      const item = stageItem(input, lot.product, stage);
      if (!item) continue;
      const options = machines.map(([, machine]) => machine).filter((machine) => item in machine.minutes_per_unit);
      if (!options.length) continue;
      required += Math.min(...options.map((machine) => machine.minutes_per_unit[item] * lot.quantity + machine.fixed_minutes));
    }
    const available = sum(machines.map(([, machine]) => Math.max(0, availableMinutes(machine) - downtimeMinutes(machine))));
    return { stage, machines: machines.length, required, available, ratio: available > 0 ? required / available : null };
  });
}

export function lotsOfOrder(input: SchedulingInputDocument, orderId: string) {
  const order = input.orders.find((item) => item.id === orderId);
  return Object.entries(order?.lot_allocations ?? {}).map(([lotId, allocated]) => {
    const lot = input.lots.find((item) => item.id === lotId);
    return { lotId, allocated, quantity: lot?.quantity ?? 0, release: lot?.release ?? 0, sharedWith: input.orders.filter((other) => other.id !== orderId && lotId in other.lot_allocations).map((other) => other.id) };
  });
}

/* ---------- readiness / advisory checks ---------- */

function guessTab(message: string): MdTab {
  const text = message.toLowerCase();
  if (/(btp|semi|routing|inventory_btp|capacity)/.test(text)) return "btp";
  if (/(machine|mold|shift|downtime|setup|window|minutes_per_unit)/.test(text)) return "machines";
  if (/(order|lot|due|release|deadline|allocat)/.test(text)) return "orders";
  if (/(product|safety|initial_inventory|color|line)/.test(text)) return "products";
  return "settings";
}

/** Map backend readiness errors (free-text validation messages) to the tab — and record, if a known code is named — to fix them. */
export function readinessIssues(errors: string[], input: SchedulingInputDocument): DataIssue[] {
  const codes: Array<[string, MdTab]> = [
    ...Object.keys(input.machines).map((code) => [code, "machines"] as [string, MdTab]),
    ...input.orders.map((order) => [order.id, "orders"] as [string, MdTab]),
    ...input.btp_codes.map((code) => [code, "btp"] as [string, MdTab]),
    ...input.products.map((code) => [code, "products"] as [string, MdTab]),
  ].sort((a, b) => b[0].length - a[0].length);
  return errors.map((message, index) => {
    const hit = codes.find(([code]) => new RegExp(`(^|[^A-Z0-9_])${code}([^A-Z0-9_]|$)`).test(message));
    return { id: `backend-${index}`, severity: "error", source: "backend", tab: hit?.[1] ?? guessTab(message), item: hit?.[0], title: message };
  });
}

export function adviseChecks(input: SchedulingInputDocument): DataIssue[] {
  const issues: DataIssue[] = [];
  const push = (issue: Omit<DataIssue, "source">) => issues.push({ ...issue, source: "check" });

  // Routing completeness and processability: every lot needs a code at every BTP stage and a machine able to run it.
  for (const product of input.products) {
    const hasDemand = input.lots.some((lot) => lot.product === product);
    for (const stage of input.stages) {
      const item = stageItem(input, product, stage);
      if (!item) {
        push({ id: `route-${product}-${stage}`, severity: hasDemand ? "error" : "warning", tab: "btp", item: product, title: tr(`${product} chưa có mã BTP ở công đoạn ${stageLabel(stage)}`, `${product} has no semi-finished code at stage ${stageLabel(stage)}`) });
        continue;
      }
      if (hasDemand && !Object.values(input.machines).some((machine) => machine.stage === stage && item in machine.minutes_per_unit)) {
        push({ id: `cap-${product}-${stage}`, severity: "error", tab: "machines", title: tr(`Không máy ${stageLabel(stage)} nào xử lý được ${item}`, `No ${stageLabel(stage)} machine can process ${item}`), detail: tr(`Lô của ${product} sẽ không xếp được lịch.`, `Lots of ${product} cannot be scheduled.`) });
      }
    }
  }

  for (const product of input.products) {
    const opening = input.initial_inventory[product] ?? 0;
    const safety = input.safety_stock[product] ?? 0;
    if (safety > 0 && opening < safety) {
      push({ id: `safety-${product}`, severity: "info", tab: "products", item: product, title: tr(`${product} bắt đầu dưới tồn an toàn (${opening}/${safety})`, `${product} starts below safety stock (${opening}/${safety})`), detail: tr("Sẽ bị tính thiếu tồn ở các mốc đo cho tới khi sản xuất bù.", "Shortfall is counted at checkpoints until production catches up.") });
    }
  }

  const usage = btpUsage(input);
  for (const code of input.btp_codes) {
    if (!usage[code]?.length) push({ id: `unused-${code}`, severity: "info", tab: "btp", item: code, title: tr(`Mã BTP ${code} chưa được sản phẩm nào dùng`, `Semi-finished code ${code} is not used by any product`) });
    const capacity = input.btp_capacity[code];
    const qty = input.inventory_btp[code] ?? 0;
    if (capacity != null && qty > capacity) push({ id: `btpcap-${code}`, severity: "error", tab: "btp", item: code, title: tr(`Tồn đầu ${code} (${qty}) vượt sức chứa ${capacity}`, `Opening stock of ${code} (${qty}) exceeds capacity ${capacity}`) });
  }

  for (const [id, machine] of Object.entries(input.machines)) {
    if (!machine.shifts.length) push({ id: `shift-${id}`, severity: "warning", tab: "machines", item: id, title: tr(`Máy ${id} không có ca làm việc`, `Machine ${id} has no shifts`) });
    if (!Object.keys(machine.minutes_per_unit).length) push({ id: `mpu-${id}`, severity: "warning", tab: "machines", item: id, title: tr(`Máy ${id} chưa khai báo mã nào xử lý được`, `Machine ${id} has no items it can process`) });
    if (machine.mold) {
      const used = machine.mold.initial_cycles / Math.max(1, machine.mold.limit_cycles);
      if (used >= 0.8) push({ id: `mold-${id}`, severity: "warning", tab: "machines", item: id, title: tr(`Khuôn ${machine.mold.id} đã dùng ${Math.round(used * 100)}% chu kỳ`, `Mold ${machine.mold.id} is at ${Math.round(used * 100)}% of its cycle limit`), detail: tr("Sắp phải bảo trì — lịch sẽ chèn thời gian bảo trì sớm.", "Maintenance is due soon — schedules will insert it early.") });
    }
  }

  for (const order of input.orders) {
    if (order.due < order.release) push({ id: `due-${order.id}`, severity: "error", tab: "orders", item: order.id, title: tr(`Đơn ${order.id}: hạn giao trước thời điểm phát hành`, `Order ${order.id}: due before release`) });
    const covered = order.initial_allocated + sum(Object.values(order.lot_allocations));
    if (covered < order.quantity) push({ id: `alloc-${order.id}`, severity: "error", tab: "orders", item: order.id, title: tr(`Đơn ${order.id} mới được phân bổ ${covered}/${order.quantity}`, `Order ${order.id} is only allocated ${covered}/${order.quantity}`) });
  }
  for (const lot of input.lots) {
    const allocated = sum(input.orders.map((order) => order.lot_allocations[lot.id] ?? 0));
    if (allocated > lot.quantity) push({ id: `lot-${lot.id}`, severity: "error", tab: "orders", item: lot.order, title: tr(`Lô ${lot.id} bị phân bổ ${allocated} > ${lot.quantity}`, `Lot ${lot.id} is over-allocated ${allocated} > ${lot.quantity}`) });
  }

  for (const load of stageLoads(input)) {
    if (load.ratio != null && load.ratio > 1) push({ id: `load-${load.stage}`, severity: "warning", tab: "machines", title: tr(`Công đoạn ${stageLabel(load.stage)} cần ${Math.round(load.ratio * 100)}% thời gian ca`, `Stage ${stageLabel(load.stage)} needs ${Math.round(load.ratio * 100)}% of shift time`), detail: tr("Ước lượng thô (chưa gồm setup) — có thể không đủ năng lực trong horizon.", "Rough estimate (setup excluded) — capacity may be insufficient within the horizon.") });
  }

  const rank: Record<Severity, number> = { error: 0, warning: 1, info: 2 };
  return issues.sort((a, b) => rank[a.severity] - rank[b.severity]);
}

/* ---------- API errors ---------- */

export function isRevisionConflict(error: unknown): boolean {
  return error instanceof ApiError && (error.code === "REVISION_CONFLICT" || error.status === 409);
}

/* ---------- audit events ---------- */

export const AUDIT_LABELS: Record<string, readonly [string, string]> = {
  "master_data.imported": ["Import bộ dữ liệu", "Dataset imported"],
  "master_data.replaced": ["Thay thế toàn bộ dữ liệu", "Dataset replaced"],
  "product.created": ["Thêm sản phẩm", "Product added"],
  "product.updated": ["Cập nhật sản phẩm", "Product updated"],
  "product.deleted": ["Xóa sản phẩm", "Product deleted"],
  "btp_code.created": ["Thêm mã bán thành phẩm", "Semi-finished code added"],
  "btp_code.renamed": ["Đổi tên mã bán thành phẩm", "Semi-finished code renamed"],
  "btp_code.deleted": ["Xóa mã bán thành phẩm", "Semi-finished code deleted"],
  "btp_routing.updated": ["Đổi ánh xạ bán thành phẩm", "Semi-finished mapping changed"],
  "btp_inventory.updated": ["Cập nhật tồn bán thành phẩm", "Semi-finished stock updated"],
  "btp_inventory.deleted": ["Xóa tồn bán thành phẩm", "Semi-finished stock deleted"],
  "machine.updated": ["Cập nhật máy", "Machine updated"],
  "machine.deleted": ["Xóa máy", "Machine deleted"],
  "order.updated": ["Cập nhật đơn hàng", "Order updated"],
  "order.deleted": ["Xóa đơn hàng", "Order deleted"],
};

/** Which tab an audit action belongs to, so history rows can link to the record. */
export function auditTab(action: string): MdTab | null {
  const kind = action.split(".")[0];
  if (kind === "product") return "products";
  if (kind.startsWith("btp")) return "btp";
  if (kind === "machine") return "machines";
  if (kind === "order") return "orders";
  return null;
}
