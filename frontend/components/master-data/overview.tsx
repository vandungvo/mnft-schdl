"use client";

import { AlertTriangle, ArrowDown, ArrowRight, CheckCircle2, ChevronRight, Compass, Info, PackageCheck, Wrench, XCircle } from "lucide-react";
import Link from "next/link";
import { Fragment, useState } from "react";

import { Hint, Meter, Panel, StatTile } from "@/components/blocks";
import { useI18n } from "@/components/i18n-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDay, formatNumber, productLabel, stageLabel } from "@/lib/format";
import { BTP_STAGES, demandByProduct, machinesByStage, stageLoads, sum, type DataIssue, type MdTab } from "@/lib/master-data";
import type { ScheduleRunSummary } from "@/lib/types";
import { cn } from "@/lib/utils";

import { ProductDot, SeverityDot, useDataset } from "./shared";
import { HorizonStrip } from "./timelines";

type Go = (tab: MdTab, item?: string) => void;

const TAB_LABEL: Record<MdTab, readonly [string, string]> = {
  overview: ["Tổng quan", "Overview"],
  products: ["Sản phẩm & tồn kho", "Products & stock"],
  btp: ["Bán thành phẩm", "Semi-finished"],
  machines: ["Máy & lịch ca", "Machines & calendar"],
  orders: ["Đơn hàng & lô", "Orders & lots"],
  settings: ["Thiết lập & chính sách", "Settings & policy"],
  history: ["Lịch sử", "History"],
};
export const tabLabel = (tab: MdTab) => TAB_LABEL[tab];

/** Readiness first (Stripe "action required" pattern): what blocks scheduling, what is merely worth a look, and where to fix it. */
export function ReadinessPanel({ issues, go }: { issues: DataIssue[]; go: Go }) {
  const { t } = useI18n();
  const { dataset } = useDataset();
  const [all, setAll] = useState(false);
  const errors = issues.filter((issue) => issue.severity === "error");
  const warnings = issues.filter((issue) => issue.severity === "warning");
  const infos = issues.filter((issue) => issue.severity === "info");
  const shown = all ? issues : issues.slice(0, 5);
  const blocked = !dataset.is_ready;
  return (
    <Panel className={cn(blocked ? "border-destructive/40" : errors.length ? "border-warning/40" : "")}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <span className={cn("grid size-9 shrink-0 place-items-center rounded-lg", blocked ? "bg-danger-soft text-destructive" : errors.length || warnings.length ? "bg-warning-soft text-warning" : "bg-success-soft text-success")}>
            {blocked ? <XCircle className="size-5" /> : errors.length || warnings.length ? <AlertTriangle className="size-5" /> : <CheckCircle2 className="size-5" />}
          </span>
          <div>
            <h2 className="text-base font-semibold">
              {blocked ? t("Chưa thể lập lịch", "Not ready to schedule") : errors.length || warnings.length ? t("Sẵn sàng lập lịch — có điểm cần xem", "Ready to schedule — a few things to check") : t("Sẵn sàng lập lịch", "Ready to schedule")}
            </h2>
            <p className="text-sm text-muted-foreground">
              {blocked
                ? t(`Backend báo ${dataset.readiness_errors.length} lỗi kiểm tra. Sửa các mục dưới đây rồi quay lại bàn điều độ.`, `The backend reports ${dataset.readiness_errors.length} validation errors. Fix the items below, then return to the desk.`)
                : t("Dữ liệu đã qua kiểm tra của backend. Các gợi ý dưới đây do giao diện tự phân tích, không chặn việc lập lịch.", "The data passed backend validation. The hints below come from the interface's own analysis and do not block scheduling.")}
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {errors.length > 0 && <Badge variant="danger">{errors.length} {t("lỗi", "errors")}</Badge>}
              {warnings.length > 0 && <Badge variant="warning">{warnings.length} {t("cảnh báo", "warnings")}</Badge>}
              {infos.length > 0 && <Badge variant="info">{infos.length} {t("lưu ý", "notes")}</Badge>}
            </div>
          </div>
        </div>
        {!blocked && <Button asChild className="shrink-0"><Link href={`/decide/${dataset.id}`}><Compass />{t("Lập lịch trên bàn điều độ", "Schedule on the desk")}</Link></Button>}
      </div>
      {issues.length > 0 && (
        <ul className="mt-4 divide-y rounded-md border">
          {shown.map((issue) => (
            <li key={issue.id} className="flex items-start gap-3 px-3 py-2.5">
              <SeverityDot severity={issue.severity} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium break-words">{issue.title}</p>
                <p className="text-xs text-muted-foreground">
                  {issue.source === "backend" ? t("Kiểm tra backend · chặn lập lịch", "Backend validation · blocks scheduling") : t("Gợi ý của giao diện", "Interface hint")}
                  {issue.detail ? ` · ${issue.detail}` : ""}
                </p>
              </div>
              <Button size="sm" variant="ghost" className="shrink-0" onClick={() => go(issue.tab, issue.item)} aria-label={`${t("Đi tới", "Go to")} ${t(TAB_LABEL[issue.tab])}${issue.item ? ` · ${issue.item}` : ""}`}>
                {issue.severity === "error" ? t("Sửa", "Fix") : t("Xem", "View")}<ChevronRight />
              </Button>
            </li>
          ))}
        </ul>
      )}
      {issues.length > 5 && <Button variant="link" size="sm" className="mt-1 px-0" onClick={() => setAll(!all)}>{all ? t("Thu gọn", "Show fewer") : t(`Xem tất cả ${issues.length} mục`, `Show all ${issues.length} items`)}</Button>}
    </Panel>
  );
}

export function KeyFigures({ go }: { go: Go }) {
  const { t } = useI18n();
  const { dataset } = useDataset();
  const input = dataset.input;
  const units = sum(input.orders.map((order) => order.quantity));
  const fromStock = sum(input.orders.map((order) => order.initial_allocated));
  const urgent = input.orders.filter((order) => order.urgent).length;
  const days = Math.round(input.horizon / 1440);
  const tiles: Array<{ tab: MdTab; label: string; value: string; hint: string }> = [
    { tab: "orders", label: t("Đơn hàng", "Orders"), value: formatNumber(input.orders.length), hint: t(`${formatNumber(units)} đơn vị · ${urgent} gấp`, `${formatNumber(units)} units · ${urgent} urgent`) },
    { tab: "orders", label: t("Lô sản xuất", "Production lots"), value: formatNumber(input.lots.length), hint: t(`${formatNumber(fromStock)} đơn vị lấy từ kho`, `${formatNumber(fromStock)} units from stock`) },
    { tab: "products", label: t("Sản phẩm", "Products"), value: formatNumber(input.products.length), hint: t(`${new Set(Object.values(input.product_line)).size} dòng · ${new Set(Object.values(input.product_color)).size} màu`, `${new Set(Object.values(input.product_line)).size} lines · ${new Set(Object.values(input.product_color)).size} colours`) },
    { tab: "btp", label: t("Mã BTP", "Semi-finished codes"), value: formatNumber(input.btp_codes.length), hint: t(`${formatNumber(sum(Object.values(input.inventory_btp)))} đơn vị tồn đầu`, `${formatNumber(sum(Object.values(input.inventory_btp)))} units opening stock`) },
    { tab: "machines", label: t("Máy", "Machines"), value: formatNumber(Object.keys(input.machines).length), hint: t(`${input.stages.length} công đoạn · ${Object.values(input.machines).filter((machine) => machine.mold).length} khuôn`, `${input.stages.length} stages · ${Object.values(input.machines).filter((machine) => machine.mold).length} molds`) },
    { tab: "settings", label: t("Horizon", "Horizon"), value: t(`${days} ngày`, `${days} days`), hint: t(`${input.working_days.length} ngày làm việc`, `${input.working_days.length} working days`) },
  ];
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
      {tiles.map((tile) => (
        <button key={tile.label} type="button" onClick={() => go(tile.tab)} className="rounded-lg text-left transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none [&>div]:hover:border-primary/50">
          <StatTile label={tile.label} value={tile.value} hint={tile.hint} className="h-full" />
        </button>
      ))}
    </div>
  );
}

export function HorizonPanel({ onDay }: { onDay: (day: number) => void }) {
  const { t } = useI18n();
  const { dataset } = useDataset();
  const input = dataset.input;
  return (
    <Panel title={t("Horizon lập lịch", "Scheduling horizon")} description={`${formatDay(dataset.origin, 0)} → ${formatDay(dataset.origin, input.horizon - 1)} · ${t("bấm một ngày để xem các đơn đến hạn", "click a day to see the orders due")}`}>
      <HorizonStrip input={input} origin={dataset.origin} onDay={onDay} />
    </Panel>
  );
}

/** Routing diagram cast → CNC → paint → QC with machines, BTP buffers and finished goods; machines open their drawer. */
export function ProcessFlow({ go }: { go: Go }) {
  const { t } = useI18n();
  const { dataset } = useDataset();
  const input = dataset.input;
  const groups = machinesByStage(input);
  const loads = Object.fromEntries(stageLoads(input).map((load) => [load.stage, load]));
  const buffersAfter = (stage: string) => {
    if (!(BTP_STAGES as readonly string[]).includes(stage)) return [];
    const codes = [...new Set(input.products.map((product) => input.btp_routing[product]?.[stage]).filter(Boolean) as string[])];
    return codes.map((code) => ({ code, qty: input.inventory_btp[code] ?? 0, cap: input.btp_capacity[code] }));
  };
  return (
    <Panel title={t("Dòng chảy sản xuất", "Production flow")} description={t("Máy theo công đoạn, kho bán thành phẩm giữa các công đoạn và tải thô so với thời gian ca.", "Machines per stage, semi-finished buffers between stages and rough load against shift time.")}>
      <ol className="flex flex-col gap-1 xl:flex-row xl:items-stretch" aria-label={t("Dòng chảy công đoạn", "Stage flow")}>
        {groups.map(({ stage, machines }, index) => {
          const load = loads[stage];
          const buffers = buffersAfter(stage);
          const last = index === groups.length - 1;
          const ratio = load?.ratio ?? 0;
          return (
            <Fragment key={stage}>
              <li className="flex min-w-0 flex-col gap-1.5 rounded-lg border bg-surface-2 p-3 xl:flex-[1.4]">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="font-semibold">{stageLabel(stage)}</span>
                  <span className="text-xs text-muted-foreground">{machines.length} {t("máy", "machines")}</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {machines.map(([id, machine]) => (
                    <button key={id} type="button" onClick={() => go("machines", id)} className="inline-flex items-center gap-1 rounded-md border bg-card px-2 py-0.5 text-[13px] font-medium hover:border-primary/60 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none">
                      {id}
                      {machine.mold && <Wrench className="size-3 text-muted-foreground" aria-label={t("có khuôn", "has mold")} />}
                      {machine.downtime.length > 0 && <span className="size-1.5 rounded-full bg-destructive" aria-label={t("có lịch dừng", "has downtime")} />}
                    </button>
                  ))}
                </div>
                {load && (
                  <div className="mt-auto pt-1">
                    <div className="mb-1 flex justify-between text-xs text-muted-foreground"><span>{t("Tải thô", "Rough load")}</span><b className={cn("font-semibold tabular-nums", ratio > 1 ? "text-destructive" : ratio > 0.85 ? "text-warning" : "text-foreground")}>{load.ratio == null ? "—" : `${Math.round(ratio * 100)}%`}</b></div>
                    <Meter value={Math.min(1, ratio)} tone={ratio > 0.85 ? "warn" : "default"} label={`${Math.round(ratio * 100)}%`} />
                  </div>
                )}
              </li>
              {!last ? (
                <li className="flex min-w-0 items-center gap-3 py-1 pl-4 text-[13px] xl:flex-[0.8] xl:flex-col xl:justify-center xl:gap-1 xl:py-0 xl:pl-0 xl:text-center">
                  <ArrowDown className="size-4 shrink-0 text-muted-foreground xl:hidden" aria-hidden />
                  {buffers.length ? (
                    <button type="button" onClick={() => go("btp")} className="flex min-w-0 flex-col gap-0.5 rounded-md px-1 py-0.5 text-left hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none xl:text-center">
                      <span className="text-xs text-muted-foreground">{t("Kho BTP sau", "Buffer after")} {stageLabel(stage)}</span>
                      <span className="tabular-nums"><b>{formatNumber(sum(buffers.map((b) => b.qty)))}</b> <span className="text-muted-foreground">{t("đơn vị", "units")} · {buffers.length} {t("mã", "codes")}</span></span>
                      {input.transfer_minutes > 0 && <span className="text-xs text-muted-foreground">+{input.transfer_minutes}′ {t("chuyển", "transfer")}</span>}
                    </button>
                  ) : <span className="text-xs text-muted-foreground">{t("Chuyển tiếp", "Hand-off")}</span>}
                  <ArrowRight className="hidden size-4 text-muted-foreground xl:block" aria-hidden />
                </li>
              ) : (
                <li className="mt-2 flex min-w-0 flex-col gap-0.5 rounded-lg border-[1.5px] border-success/70 p-3 text-[13px] xl:mt-0 xl:ml-2 xl:flex-[1.3]">
                  <button type="button" onClick={() => go("products")} className="flex items-center gap-1.5 text-left font-semibold text-success hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"><PackageCheck className="size-4" />{t("Thành phẩm", "Finished goods")}</button>
                  {input.products.map((product) => (
                    <span key={product} className="flex items-center justify-between gap-2"><span className="inline-flex items-center gap-1.5 whitespace-nowrap"><ProductDot product={product} products={input.products} />{productLabel(product)}</span><span className="tabular-nums"><b>{input.initial_inventory[product] ?? 0}</b><span className="text-muted-foreground">/{input.safety_stock[product] ?? 0}</span></span></span>
                  ))}
                  <span className="mt-1 text-xs text-muted-foreground">{t("tồn đầu / tồn an toàn", "opening / safety stock")}</span>
                </li>
              )}
            </Fragment>
          );
        })}
      </ol>
      <Hint>{t("Tải thô = Σ(số lượng lô × phút/đơn vị nhanh nhất + phút cố định) ÷ (phút ca − dừng máy). Chưa gồm setup và bảo trì khuôn.", "Rough load = Σ(lot quantity × fastest minutes/unit + fixed minutes) ÷ (shift minutes − downtime). Setup and mold maintenance excluded.")}</Hint>
    </Panel>
  );
}

export function DemandPanel({ go }: { go: Go }) {
  const { t } = useI18n();
  const { dataset } = useDataset();
  const input = dataset.input;
  const rows = demandByProduct(input);
  const max = Math.max(1, ...rows.map((row) => row.quantity));
  return (
    <Panel title={t("Nhu cầu theo sản phẩm", "Demand by product")} actions={<Button size="sm" variant="ghost" onClick={() => go("orders")}>{t("Mở đơn hàng", "Open orders")}<ChevronRight /></Button>}>
      <ul className="grid gap-3">
        {rows.map((row) => (
          <li key={row.product} className="grid gap-1">
            <div className="flex items-center justify-between gap-2 text-sm">
              <button type="button" className="inline-flex items-center gap-1.5 font-medium hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none" onClick={() => go("products", row.product)}><ProductDot product={row.product} products={input.products} />{productLabel(row.product)}</button>
              <span className="text-xs text-muted-foreground tabular-nums">{row.orders} {t("đơn", "orders")}{row.urgent ? ` · ${row.urgent} ${t("gấp", "urgent")}` : ""} · <b className="text-foreground">{formatNumber(row.quantity)}</b></span>
            </div>
            <span className="flex h-2.5 overflow-hidden rounded-full bg-grid" role="img" aria-label={t(`${row.product}: ${row.quantity} đơn vị, ${row.fromStock} lấy từ kho`, `${row.product}: ${row.quantity} units, ${row.fromStock} from stock`)}>
              <i className="h-full bg-success/70" style={{ width: `${(row.fromStock / max) * 100}%` }} />
              <i className="h-full bg-primary" style={{ width: `${((row.quantity - row.fromStock) / max) * 100}%` }} />
            </span>
          </li>
        ))}
      </ul>
      <div className="mt-3 flex gap-4 text-xs text-muted-foreground" aria-hidden>
        <span className="inline-flex items-center gap-1.5"><i className="size-2.5 rounded-sm bg-success/70" />{t("Lấy từ kho", "From stock")}</span>
        <span className="inline-flex items-center gap-1.5"><i className="size-2.5 rounded-sm bg-primary" />{t("Cần sản xuất", "To produce")}</span>
      </div>
    </Panel>
  );
}

/** Revision context (GitHub "this commit is used by…"): which revisions existing runs were made from. */
export function RevisionPanel({ runs, go }: { runs: ScheduleRunSummary[] | undefined; go: Go }) {
  const { t } = useI18n();
  const { dataset } = useDataset();
  const byRevision = new Map<number, number>();
  for (const run of runs ?? []) if (run.dataset_revision != null) byRevision.set(run.dataset_revision, (byRevision.get(run.dataset_revision) ?? 0) + 1);
  const current = byRevision.get(dataset.revision) ?? 0;
  const older = sum([...byRevision.entries()].filter(([rev]) => rev !== dataset.revision).map(([, count]) => count));
  return (
    <Panel title={t("Revision & lần chạy", "Revision & runs")} actions={<Button size="sm" variant="ghost" onClick={() => go("history")}>{t("Lịch sử", "History")}<ChevronRight /></Button>}>
      <div className="flex items-start gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-accent text-sm font-semibold text-primary">r{dataset.revision}</span>
        <div className="text-sm">
          <p><b>{t(`Revision ${dataset.revision}`, `Revision ${dataset.revision}`)}</b> <span className="text-muted-foreground">· {t("hiện hành", "current")}</span></p>
          <p className="text-muted-foreground">{runs === undefined ? t("Đang đếm lần chạy…", "Counting runs…") : t(`${current} lần chạy dùng revision này · ${older} lần chạy dùng revision cũ hơn (giữ snapshot riêng)`, `${current} runs use this revision · ${older} runs use older revisions (with their own snapshots)`)}</p>
        </div>
      </div>
      <p className="mt-3 flex items-start gap-2 rounded-md bg-surface-2 px-3 py-2 text-xs text-muted-foreground"><Info className="mt-0.5 size-3.5 shrink-0" />{t("Mỗi thay đổi hợp lệ tạo revision mới. Lần chạy cũ không bị ảnh hưởng; bàn điều độ sẽ báo khi lịch được sinh từ revision cũ.", "Every valid change creates a new revision. Earlier runs are unaffected; the desk flags schedules generated from an older revision.")}</p>
    </Panel>
  );
}
