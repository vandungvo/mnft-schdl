"use client";

import { AlertTriangle, ArrowRight, CheckCircle2, ChevronRight, FileJson, Flame, Info } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";

import { Hint, Meter, Panel, StatTile } from "@/components/blocks";
import { DataTable, FilterChip, matches, TableToolbar, type Column } from "@/components/data-table";
import { useI18n } from "@/components/i18n-provider";
import { tabLabel } from "@/components/master-data/overview";
import { ProductDot } from "@/components/master-data/shared";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { fmtN, termsOf } from "@/lib/decision";
import { formatClock, formatDay, formatDuration, productLabel, stageLabel } from "@/lib/format";
import type { MdTab } from "@/lib/master-data";
import type { SchedulingInputV5 } from "@/lib/types";
import { cn } from "@/lib/utils";

/* Schema-5 scenario (5-stage line, fixed runs per stage): overview and read-only data views.
   Editing goes through the JSON document (More → Replace from JSON file); the backend
   validates it with the stage_runs engine's own contract. */

type Go = (tab: MdTab, record?: string) => void;
type Input = SchedulingInputV5;

/* ---------- derived facts (same conventions as models/common/stage_runs/instance.py) ---------- */

function spansOf(input: Input, machineId: string): Array<[number, number]> {
  const spec = input.machines[machineId];
  const cut = (spans: Array<[number, number]>, holes: Array<[number, number]>) =>
    holes.reduce((acc, [a0, a1]) => acc.flatMap(([s, e]) => [[s, Math.min(e, a0)], [Math.max(s, a1), e]] as Array<[number, number]>).filter(([s, e]) => e > s), spans);
  const downtime = spec.downtime ?? [];
  if (spec.calendar === "continuous") return cut([[0, input.horizon]], downtime);
  const out: Array<[number, number]> = [];
  for (let day = 0; day < Math.floor(input.horizon / 1440); day++) {
    for (const shift of Object.values(input.shift_template)) {
      const base = day * 1440;
      const breaks = (shift.breaks ?? []).map(([a, b]) => [base + a, base + b] as [number, number]);
      out.push(...cut(cut([[base + shift.start, base + shift.end]], breaks), downtime));
    }
  }
  return out;
}

const available = (input: Input, machineId: string) => spansOf(input, machineId).reduce((sum, [s, e]) => sum + e - s, 0);

function duration(input: Input, run: Input["runs"][number], machineId: string): number {
  const spec = input.machines[machineId];
  return Math.ceil(input.run_size[run.stage] * spec.minutes_per_unit[run.item] + spec.fixed_minutes);
}

function eligible(input: Input, run: Input["runs"][number]): string[] {
  return Object.entries(input.machines).filter(([, spec]) => spec.stage === run.stage && run.item in spec.minutes_per_unit).map(([id]) => id);
}

/** Stage -> items it makes, in product order. */
function itemsByStage(input: Input): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  const last = input.stages[input.stages.length - 1];
  for (const [product, spec] of Object.entries(input.products)) {
    for (const stage of input.stages) {
      const item = stage === last ? product : spec.route[stage];
      if (item && !(out[stage] ??= []).includes(item)) out[stage].push(item);
    }
  }
  return out;
}

/** Item -> products whose route passes through it. */
function usersOf(input: Input): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const [product, spec] of Object.entries(input.products)) {
    for (const item of [...Object.values(spec.route), product]) {
      const list = (out[item] ??= []);
      if (!list.includes(product)) list.push(product);
    }
  }
  return out;
}

const mandatory = (input: Input) => input.runs.filter((run) => !run.reserve_option);

/* ---------- overview ---------- */

interface Note { id: string; level: "warning" | "info"; title: string; detail: string; tab: MdTab; item?: string }

function notesOf(input: Input, t: (vi: string, en: string) => string): Note[] {
  const notes: Note[] = [];
  for (const [product, spec] of Object.entries(input.products)) {
    if (spec.initial_stock < spec.safety_stock) notes.push({ id: `stock-${product}`, level: "warning", title: t(`${productLabel(product)} bắt đầu dưới tồn an toàn (${spec.initial_stock}/${spec.safety_stock})`, `${productLabel(product)} starts below safety stock (${spec.initial_stock}/${spec.safety_stock})`), detail: t("Sẽ tính thiếu tồn ở các mốc đo cho tới khi sản xuất bù.", "Shortfall counts at checkpoints until production catches up."), tab: "products", item: product });
  }
  for (const [mold, spec] of Object.entries(input.molds ?? {})) {
    const used = spec.initial_cycles / spec.limit_cycles;
    if (used >= 0.6) notes.push({ id: `mold-${mold}`, level: used >= 0.8 ? "warning" : "info", title: t(`Khuôn ${mold} đã dùng ${Math.round(used * 100)}% chu kỳ`, `Mold ${mold} at ${Math.round(used * 100)}% of its cycles`), detail: t(`Còn ${spec.limit_cycles - spec.initial_cycles} chu kỳ trước khi bảo trì ${spec.maintenance_minutes} phút.`, `${spec.limit_cycles - spec.initial_cycles} cycles left before ${spec.maintenance_minutes}-minute maintenance.`), tab: "machines", item: mold });
  }
  const reserve = Object.keys(input.reserve_options ?? {}).length;
  if (reserve) notes.push({ id: "reserve", level: "info", title: t(`${reserve} phương án dự trữ cho nhu cầu dài hạn`, `${reserve} reserve options for long-term demand`), detail: t("Mỗi phương án là một nhóm mẻ làm trước, chọn cả nhóm hoặc không (thuật toán quyết định).", "Each option is a group of runs made ahead, all or nothing (the algorithm decides)."), tab: "runs" });
  return notes;
}

export function OverviewV5({ input, go, onDay, children }: { input: Input; go: Go; onDay: (day: number) => void; children?: ReactNode }) {
  const { t } = useI18n();
  const notes = useMemo(() => notesOf(input, t), [input, t]);
  return (
    <>
      <Panel>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-success-soft text-success"><CheckCircle2 className="size-5" /></span>
            <div>
              <h3 className="text-base font-semibold">{t("Sẵn sàng lập lịch — mô hình 5 công đoạn", "Ready to schedule — 5-stage model")}</h3>
              <p className="text-sm text-muted-foreground">{t("Dữ liệu đã qua bộ kiểm hợp đồng của engine mẻ cố định (schema 5). Mục dưới là gợi ý do giao diện phân tích, không chặn lập lịch.", "The data passed the fixed-run engine's contract check (schema 5). The items below are interface hints and do not block scheduling.")}</p>
              {input.derived_from && <p className="mt-1 text-xs text-muted-foreground">{t("Sinh từ", "Derived from")} <code className="font-mono">{input.derived_from}</code></p>}
            </div>
          </div>
          <Button className="shrink-0" onClick={() => go("settings")} variant="outline"><FileJson />{t("Thiết lập mô hình", "Model settings")}</Button>
        </div>
        {notes.length > 0 && (
          <ul className="mt-4 divide-y rounded-md border">
            {notes.map((note) => (
              <li key={note.id} className="flex items-start gap-3 px-3 py-2.5">
                {note.level === "warning" ? <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden /> : <Info className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />}
                <div className="min-w-0 flex-1"><p className="text-sm font-medium">{note.title}</p><p className="text-xs text-muted-foreground">{note.detail}</p></div>
                <Button size="sm" variant="ghost" className="shrink-0" onClick={() => go(note.tab, note.item)} aria-label={`${t("Đi tới", "Go to")} ${t(...tabLabel(note.tab))}`}>{t("Xem", "View")}<ChevronRight /></Button>
              </li>
            ))}
          </ul>
        )}
      </Panel>
      <KeyFiguresV5 input={input} go={go} />
      <FlowV5 input={input} go={go} />
      <HorizonV5 input={input} onDay={onDay} />
      <div className="grid min-w-0 gap-4 lg:grid-cols-2">
        <DemandV5 input={input} go={go} />
        {children}
      </div>
    </>
  );
}

function Figure({ label, value, hint, onClick }: { label: string; value: ReactNode; hint: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="text-left focus-visible:outline-none [&:focus-visible>div]:ring-2 [&:focus-visible>div]:ring-ring [&>div]:transition-colors hover:[&>div]:border-primary/60">
      <StatTile label={label} value={value} hint={hint} className="h-full" />
    </button>
  );
}

function KeyFiguresV5({ input, go }: { input: Input; go: Go }) {
  const { t } = useI18n();
  const units = input.orders.reduce((sum, order) => sum + order.quantity, 0);
  const btpUnits = Object.values(input.btp).reduce((sum, item) => sum + item.initial_stock, 0);
  const continuous = Object.values(input.machines).filter((spec) => spec.calendar === "continuous").length;
  const reserveRuns = input.runs.filter((run) => run.reserve_option).length;
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-7">
      <Figure label={t("Đơn hàng", "Orders")} value={input.orders.length} hint={t(`${fmtN(units)} đơn vị · ${input.long_term_orders?.length ?? 0} dài hạn`, `${fmtN(units)} units · ${input.long_term_orders?.length ?? 0} long-term`)} onClick={() => go("orders")} />
      <Figure label={t("Mẻ chạy", "Runs")} value={input.runs.length} hint={t(`${reserveRuns} mẻ dự trữ (tuỳ chọn)`, `${reserveRuns} optional reserve runs`)} onClick={() => go("runs")} />
      <Figure label={t("Sản phẩm", "Products")} value={Object.keys(input.products).length} hint={t(`${input.stages.length} công đoạn mỗi sản phẩm`, `${input.stages.length} stages each`)} onClick={() => go("products")} />
      <Figure label={t("Mã BTP", "Semi-finished")} value={Object.keys(input.btp).length} hint={t(`${fmtN(btpUnits)} đơn vị tồn đầu`, `${fmtN(btpUnits)} units in stock`)} onClick={() => go("btp")} />
      <Figure label={t("Máy", "Machines")} value={Object.keys(input.machines).length} hint={continuous ? t(`${continuous} chạy liên tục 24/7`, `${continuous} run 24/7`) : t("theo ca", "on shifts")} onClick={() => go("machines")} />
      <Figure label={t("Khuôn", "Molds")} value={Object.keys(input.molds ?? {}).length} hint={t("dùng chung giữa máy đúc", "shared by casting machines")} onClick={() => go("machines")} />
      <Figure label={t("Tầm kế hoạch", "Horizon")} value={t(`${Math.round(input.horizon / 1440)} ngày`, `${Math.round(input.horizon / 1440)} days`)} hint={t(`${Object.keys(input.shift_template).length} ca/ngày`, `${Object.keys(input.shift_template).length} shifts/day`)} onClick={() => go("settings")} />
    </div>
  );
}

function FlowV5({ input, go }: { input: Input; go: Go }) {
  const { t } = useI18n();
  const items = itemsByStage(input);
  const runs = mandatory(input);
  return (
    <Panel title={t("Dòng chảy sản xuất", "Production flow")} description={t("Máy theo công đoạn, cỡ mẻ, kho bán thành phẩm và thời gian chuyển giữa các công đoạn, tải thô so với giờ máy.", "Machines per stage, run size, semi-finished stock and transfer time between stages, rough load versus machine hours.")}>
      <ol className="flex gap-2 overflow-x-auto pb-1">
        {input.stages.map((stage, index) => {
          const machines = Object.entries(input.machines).filter(([, spec]) => spec.stage === stage);
          const stageRuns = runs.filter((run) => run.stage === stage);
          const need = stageRuns.reduce((sum, run) => sum + Math.min(...eligible(input, run).map((m) => duration(input, run, m))), 0);
          const cap = machines.reduce((sum, [id]) => sum + available(input, id), 0);
          const load = cap ? need / cap : 0;
          const stock = index < input.stages.length - 1 ? (items[stage] ?? []).reduce((sum, item) => sum + (input.btp[item]?.initial_stock ?? 0), 0) : null;
          return (
            <li key={stage} className="flex min-w-0 shrink-0 items-stretch gap-2">
              {index > 0 && (
                <span className="flex w-12 flex-col items-center justify-center text-center text-[11px] leading-tight text-muted-foreground">
                  <ArrowRight className="mb-1 size-4" aria-hidden />{t("chuyển", "transfer")} {input.transfer_minutes[input.stages[index - 1]] ?? 0}′
                </span>
              )}
              <div className="flex w-40 flex-col gap-2 rounded-lg border bg-surface-2 p-3">
                <div className="flex items-baseline justify-between gap-2"><strong className="text-sm">{stageLabel(stage)}</strong><span className="text-xs text-muted-foreground">{t(`mẻ ${input.run_size[stage]}`, `run ${input.run_size[stage]}`)}</span></div>
                <div className="flex flex-wrap gap-1">
                  {machines.map(([id, spec]) => (
                    <button key={id} type="button" onClick={() => go("machines", id)} className="inline-flex items-center gap-1 rounded-md border bg-card px-1.5 py-0.5 font-mono text-xs hover:border-primary/60 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none">
                      {spec.calendar === "continuous" && <Flame className="size-3 text-brand" aria-label={t("liên tục", "continuous")} />}{id}
                    </button>
                  ))}
                </div>
                <span className="text-xs text-muted-foreground">{stageRuns.length} {t("mẻ bắt buộc", "required runs")}{stock != null ? ` · ${t("BTP", "BTP")} ${fmtN(stock)}` : ""}</span>
                <div className="mt-auto">
                  <div className="mb-1 flex justify-between text-xs"><span className="text-muted-foreground">{t("Tải thô", "Rough load")}</span><b className={cn("tabular-nums", load > 1 && "text-destructive", load > 0.85 && load <= 1 && "text-warning")}>{Math.round(load * 100)}%</b></div>
                  <Meter value={Math.min(1, load)} tone={load > 0.85 ? "warn" : "default"} label={`${Math.round(load * 100)}%`} />
                </div>
              </div>
            </li>
          );
        })}
      </ol>
      <Hint>{t("Tải thô = Σ(thời lượng mẻ bắt buộc trên máy nhanh nhất) ÷ giờ máy khả dụng (ca trừ giờ nghỉ và lịch dừng; lò liên tục tính cả ngày). Chưa gồm chuẩn bị máy và bảo trì khuôn.", "Rough load = Σ(required run duration on the fastest machine) ÷ available machine time (shifts minus breaks and downtime; continuous furnaces count the whole day). Excludes setup and mold maintenance.")}</Hint>
    </Panel>
  );
}

function HorizonV5({ input, onDay }: { input: Input; onDay: (day: number) => void }) {
  const { t } = useI18n();
  const days = Math.floor(input.horizon / 1440);
  const cells = Array.from({ length: days }, (_, day) => {
    const due = input.orders.filter((order) => Math.floor(order.due / 1440) === day);
    const down = Object.entries(input.machines).filter(([, spec]) => (spec.downtime ?? []).some(([a, z]) => a < (day + 1) * 1440 && z > day * 1440)).map(([id]) => id);
    return { day, due, down, checkpoint: input.checkpoints.includes((day + 1) * 1440) };
  });
  const max = Math.max(1, ...cells.map((cell) => cell.due.length));
  return (
    <Panel title={t("Dải horizon", "Horizon strip")} description={t("Số đơn đến hạn mỗi ngày, ngày có máy dừng và mốc đo tồn. Bấm một ngày để lọc đơn.", "Orders due per day, days with downtime and stock checkpoints. Click a day to filter orders.")}>
      <div className="grid gap-1 overflow-x-auto pb-1" style={{ gridTemplateColumns: `repeat(${days}, minmax(3.25rem, 1fr))` }}>
        {cells.map((cell) => (
          <button key={cell.day} type="button" onClick={() => onDay(cell.day)} disabled={!cell.due.length}
            aria-label={t(`${formatDay(input.origin, cell.day * 1440)}: ${cell.due.length} đơn đến hạn`, `${formatDay(input.origin, cell.day * 1440)}: ${cell.due.length} orders due`)}
            className="flex flex-col items-center gap-1 rounded-md border bg-card px-1 py-2 text-xs enabled:hover:border-primary/60 disabled:opacity-60 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none">
            <span className="grid text-center leading-tight text-muted-foreground">{formatDay(input.origin, cell.day * 1440).split(/,\s*/).map((part) => <span key={part}>{part}</span>)}</span>
            <span className="flex h-10 w-3 items-end rounded-sm bg-grid"><i className="block w-full rounded-sm bg-primary" style={{ height: `${(cell.due.length / max) * 100}%` }} /></span>
            <b className="tabular-nums">{cell.due.length}</b>
            <span className="flex h-3 gap-0.5">
              {cell.down.length > 0 && <i className="size-2 rounded-full bg-[var(--break)] ring-1 ring-warning" title={t(`Máy dừng: ${cell.down.join(", ")}`, `Downtime: ${cell.down.join(", ")}`)} />}
              {cell.checkpoint && <i className="size-2 rounded-full bg-success" title={t("Mốc đo tồn cuối ngày", "End-of-day stock checkpoint")} />}
            </span>
          </button>
        ))}
      </div>
      <p className="mt-2 flex flex-wrap gap-x-4 text-xs text-muted-foreground"><span className="inline-flex items-center gap-1.5"><i className="size-2 rounded-full bg-[var(--break)] ring-1 ring-warning" />{t("có máy dừng", "machine downtime")}</span><span className="inline-flex items-center gap-1.5"><i className="size-2 rounded-full bg-success" />{t("mốc đo tồn", "stock checkpoint")}</span></p>
    </Panel>
  );
}

function DemandV5({ input, go }: { input: Input; go: Go }) {
  const { t } = useI18n();
  const products = Object.entries(input.products);
  const rows = products.map(([product, spec]) => ({
    product, spec,
    orders: input.orders.filter((order) => order.product === product).reduce((sum, order) => sum + order.quantity, 0),
    longTerm: (input.long_term_orders ?? []).filter((order) => order.product === product).reduce((sum, order) => sum + order.quantity, 0),
  }));
  const max = Math.max(1, ...rows.map((row) => row.orders + row.longTerm));
  const names = products.map(([product]) => product);
  return (
    <Panel title={t("Nhu cầu theo sản phẩm", "Demand by product")} description={t("Đơn trong horizon và đơn dài hạn (đáp ứng bằng phương án dự trữ).", "Orders inside the horizon and long-term orders (met by reserve options).")}>
      <ul className="grid gap-3">
        {rows.map(({ product, spec, orders, longTerm }) => (
          <li key={product}>
            <button type="button" onClick={() => go("products", product)} className="w-full text-left focus-visible:outline-none [&:focus-visible]:rounded-md [&:focus-visible]:ring-2 [&:focus-visible]:ring-ring">
              <span className="mb-1 flex items-center justify-between gap-2 text-sm"><span className="inline-flex items-center gap-2"><ProductDot product={product} products={names} />{productLabel(product)}</span><span className="text-xs text-muted-foreground tabular-nums">{fmtN(orders)} + {fmtN(longTerm)} {t("dài hạn", "long-term")} · {t("tồn", "stock")} {spec.initial_stock}/{spec.safety_stock}</span></span>
              <span className="flex h-2 overflow-hidden rounded-full bg-grid"><i className="block bg-primary" style={{ width: `${(orders / max) * 100}%` }} /><i className="block bg-primary/40" style={{ width: `${(longTerm / max) * 100}%` }} /></span>
            </button>
          </li>
        ))}
      </ul>
    </Panel>
  );
}

/* ---------- data tab (read-only) ---------- */

export const V5_DATA_TABS = ["products", "btp", "machines", "orders", "runs", "settings"] as const satisfies readonly MdTab[];
export type V5DataTab = (typeof V5_DATA_TABS)[number];

export function v5DataLabel(tab: V5DataTab): readonly [string, string] {
  const labels: Record<V5DataTab, readonly [string, string]> = {
    products: ["Sản phẩm & tuyến", "Products & routes"], btp: ["Bán thành phẩm", "Semi-finished"], machines: ["Máy, khuôn & lịch", "Machines, molds & calendar"],
    orders: ["Đơn hàng", "Orders"], runs: ["Mẻ chạy", "Runs"], settings: ["Thiết lập & mục tiêu", "Settings & objective"],
  };
  return labels[tab];
}

export function v5Counts(input: Input): Record<V5DataTab, number | undefined> {
  return { products: Object.keys(input.products).length, btp: Object.keys(input.btp).length, machines: Object.keys(input.machines).length, orders: input.orders.length, runs: input.runs.length, settings: undefined };
}

export function DataV5({ input, tab, item, due, onClearDue }: { input: Input; tab: V5DataTab; item: string | null; due: number | null; onClearDue: () => void }) {
  const { t } = useI18n();
  return (
    <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-4">
      <p className="flex items-start gap-2 rounded-md bg-surface-2 px-3 py-2 text-xs text-muted-foreground"><FileJson className="mt-0.5 size-3.5 shrink-0" />{t("Kịch bản 5 công đoạn được xem tại đây và sửa bằng cách thay file JSON (nút Thêm → Thay bằng file JSON…). Mỗi lần thay tạo một revision mới; lần chạy cũ giữ snapshot riêng.", "A 5-stage scenario is viewed here and edited by replacing its JSON file (More → Replace from JSON file…). Each replacement creates a new revision; earlier runs keep their own snapshot.")}</p>
      {tab === "products" && <ProductsV5 input={input} item={item} />}
      {tab === "btp" && <BtpV5 input={input} item={item} />}
      {tab === "machines" && <MachinesV5 input={input} item={item} />}
      {tab === "orders" && <OrdersV5 input={input} item={item} due={due} onClearDue={onClearDue} />}
      {tab === "runs" && <RunsV5 input={input} item={item} />}
      {tab === "settings" && <SettingsV5 input={input} />}
    </div>
  );
}

function ProductsV5({ input, item }: { input: Input; item: string | null }) {
  const { t } = useI18n();
  const names = Object.keys(input.products);
  const last = input.stages[input.stages.length - 1];
  type Row = { product: string } & Input["products"][string] & { demand: number };
  const rows: Row[] = names.map((product) => ({ product, ...input.products[product], demand: input.orders.filter((order) => order.product === product).reduce((sum, order) => sum + order.quantity, 0) }));
  const columns: Column<Row>[] = [
    { id: "product", header: t("Sản phẩm", "Product"), sortValue: (row) => row.product, cell: (row) => <span className="inline-flex items-center gap-2 font-medium"><ProductDot product={row.product} products={names} />{productLabel(row.product)}<code className="font-mono text-xs text-muted-foreground">{row.product}</code></span> },
    { id: "route", header: t("Tuyến qua các công đoạn", "Route through the stages"), cell: (row) => <span className="flex flex-wrap items-center gap-1 text-xs">{input.stages.map((stage, index) => <span key={stage} className="inline-flex items-center gap-1">{index > 0 && <ChevronRight className="size-3 text-muted-foreground" />}<span className="rounded border px-1 font-mono" title={stageLabel(stage)}>{stage === last ? row.product : row.route[stage]}</span></span>)}</span> },
    { id: "initial", header: t("Tồn đầu", "Opening"), align: "right", sortValue: (row) => row.initial_stock, cell: (row) => <span className={cn(row.initial_stock < row.safety_stock && "font-semibold text-warning")}>{row.initial_stock}</span> },
    { id: "safety", header: t("Tồn an toàn", "Safety"), align: "right", sortValue: (row) => row.safety_stock, cell: (row) => row.safety_stock },
    { id: "cap", header: t("Trần tồn", "Stock cap"), align: "right", sortValue: (row) => row.stock_cap, cell: (row) => row.stock_cap },
    { id: "demand", header: t("Nhu cầu đơn", "Order demand"), align: "right", sortValue: (row) => row.demand, cell: (row) => fmtN(row.demand) },
  ];
  return <DataTable rows={rows} columns={columns} rowKey={(row) => row.product} selectedKey={item} label={t("Sản phẩm", "Products")} />;
}

function BtpV5({ input, item }: { input: Input; item: string | null }) {
  const { t } = useI18n();
  const users = usersOf(input);
  const stageOf = Object.fromEntries(Object.entries(itemsByStage(input)).flatMap(([stage, list]) => list.map((code) => [code, stage])));
  type Row = { code: string; stage: string; users: string[]; initial: number; capacity?: number };
  const rows: Row[] = Object.entries(input.btp).map(([code, spec]) => ({ code, stage: stageOf[code] ?? "—", users: users[code] ?? [], initial: spec.initial_stock, capacity: spec.capacity }));
  const columns: Column<Row>[] = [
    { id: "code", header: t("Mã BTP", "Code"), sortValue: (row) => row.code, cell: (row) => <code className="font-mono font-medium">{row.code}</code> },
    { id: "stage", header: t("Tạo ra ở", "Made at"), sortValue: (row) => input.stages.indexOf(row.stage), cell: (row) => stageLabel(row.stage) },
    { id: "users", header: t("Dùng cho", "Used for"), sortValue: (row) => row.users.length, cell: (row) => <span className="flex flex-wrap gap-1">{row.users.map((product) => <Badge key={product} variant="secondary">{productLabel(product)}</Badge>)}{row.users.length > 1 && <span className="text-xs text-muted-foreground">{t("· dùng chung", "· shared")}</span>}</span> },
    { id: "initial", header: t("Tồn đầu", "Opening"), align: "right", sortValue: (row) => row.initial, cell: (row) => row.initial },
    { id: "capacity", header: t("Sức chứa", "Capacity"), align: "right", sortValue: (row) => row.capacity ?? null, cell: (row) => row.capacity ?? t("không giới hạn", "unlimited") },
  ];
  return <DataTable rows={rows} columns={columns} rowKey={(row) => row.code} selectedKey={item} initialSort={{ id: "stage", desc: false }} label={t("Bán thành phẩm", "Semi-finished")} />;
}

function MachinesV5({ input, item }: { input: Input; item: string | null }) {
  const { t } = useI18n();
  type MRow = { id: string } & Input["machines"][string] & { available: number };
  const rows: MRow[] = Object.entries(input.machines).map(([id, spec]) => ({ id, ...spec, available: available(input, id) }));
  const machineColumns: Column<MRow>[] = [
    { id: "id", header: t("Máy", "Machine"), sortValue: (row) => row.id, cell: (row) => <span className="font-mono font-medium">{row.id}</span> },
    { id: "stage", header: t("Công đoạn", "Stage"), sortValue: (row) => input.stages.indexOf(row.stage), cell: (row) => stageLabel(row.stage) },
    { id: "calendar", header: t("Lịch", "Calendar"), cell: (row) => row.calendar === "continuous" ? <Badge variant="warning"><Flame />{t("liên tục 24/7", "24/7")}</Badge> : <Badge variant="secondary">{t(`${Object.keys(input.shift_template).length} ca/ngày`, `${Object.keys(input.shift_template).length} shifts/day`)}</Badge> },
    { id: "rates", header: t("Phút/đơn vị · cố định", "Min/unit · fixed"), cell: (row) => <span className="text-xs">{Object.entries(row.minutes_per_unit).map(([code, rate]) => <span key={code} className="mr-2 whitespace-nowrap"><code className="font-mono">{code}</code> {rate}</span>)}<span className="text-muted-foreground">+ {row.fixed_minutes}′</span></span> },
    { id: "mold", header: t("Đổi khuôn", "Mold change"), align: "right", sortValue: (row) => row.mold_change_minutes ?? null, cell: (row) => (row.mold_change_minutes != null ? `${row.mold_change_minutes}′` : "—") },
    { id: "down", header: t("Lịch dừng", "Downtime"), cell: (row) => (row.downtime ?? []).length ? <span className="text-xs">{(row.downtime ?? []).map(([a, z]) => `${formatClock(input.origin, a)} → ${formatClock(input.origin, z)}`).join("; ")}</span> : <span className="text-muted-foreground">—</span> },
    { id: "available", header: t("Giờ khả dụng", "Available"), align: "right", sortValue: (row) => row.available, cell: (row) => formatDuration(row.available) },
  ];
  type KRow = { id: string } & NonNullable<Input["molds"]>[string];
  const molds: KRow[] = Object.entries(input.molds ?? {}).map(([id, spec]) => ({ id, ...spec }));
  const moldColumns: Column<KRow>[] = [
    { id: "id", header: t("Khuôn", "Mold"), sortValue: (row) => row.id, cell: (row) => <span className="font-mono font-medium">{row.id}</span> },
    { id: "item", header: t("Đúc mã", "Casts"), sortValue: (row) => row.item, cell: (row) => <code className="font-mono">{row.item}</code> },
    { id: "cavities", header: t("Lòng khuôn", "Cavities"), align: "right", sortValue: (row) => row.cavities, cell: (row) => row.cavities },
    { id: "cycles", header: t("Chu kỳ đã dùng", "Cycles used"), sortValue: (row) => row.initial_cycles / row.limit_cycles, cell: (row) => <span className="flex items-center gap-2"><Meter value={row.initial_cycles / row.limit_cycles} tone={row.initial_cycles / row.limit_cycles >= 0.8 ? "warn" : "default"} /><span className="text-xs tabular-nums">{row.initial_cycles}/{row.limit_cycles}</span></span> },
    { id: "maint", header: t("Bảo trì", "Maintenance"), align: "right", sortValue: (row) => row.maintenance_minutes, cell: (row) => `${row.maintenance_minutes}′` },
    { id: "after", header: t("Trạng thái sau bảo trì", "State after maintenance"), cell: (row) => <code className="font-mono text-xs">{row.after_maintenance}</code> },
  ];
  return (
    <>
      <DataTable rows={rows} columns={machineColumns} rowKey={(row) => row.id} selectedKey={item} initialSort={{ id: "stage", desc: false }} label={t("Máy", "Machines")} />
      {molds.length > 0 && <Panel flush title={t("Khuôn (dùng chung giữa các máy đúc)", "Molds (shared by casting machines)")}><DataTable rows={molds} columns={moldColumns} rowKey={(row) => row.id} selectedKey={item} label={t("Khuôn", "Molds")} /></Panel>}
      <Panel title={t("Mẫu ca mỗi ngày", "Daily shift template")} description={t(`Máy theo ca làm mọi ca của mẫu này mỗi ngày; trạng thái máy ban đầu: ${input.machine_initial_state}.`, `Shift machines work every shift of this template each day; initial machine state: ${input.machine_initial_state}.`)}>
        <ul className="flex flex-wrap gap-2 text-sm">
          {Object.entries(input.shift_template).map(([key, shift]) => <li key={key} className="rounded-md border px-3 py-1.5"><b>{key}</b> <span className="tabular-nums">{formatClock(input.origin, shift.start).replace(/ .*$/, "")}–{formatClock(input.origin, shift.end % 1440).replace(/ .*$/, "")}</span>{(shift.breaks ?? []).length > 0 && <span className="text-xs text-muted-foreground"> · {t("nghỉ", "break")} {(shift.breaks ?? []).map(([a, b]) => `${b - a}′`).join(", ")}</span>}</li>)}
        </ul>
      </Panel>
    </>
  );
}

function OrdersV5({ input, item, due, onClearDue }: { input: Input; item: string | null; due: number | null; onClearDue: () => void }) {
  const { t } = useI18n();
  const [search, setSearch] = useState("");
  const [product, setProduct] = useState<string | null>(null);
  const names = Object.keys(input.products);
  type Row = Input["orders"][number];
  const rows = input.orders.filter((order) => (!product || order.product === product) && (due == null || Math.floor(order.due / 1440) === due) && matches(search, order.id, ...Object.keys(order.lot_allocations)));
  const columns: Column<Row>[] = [
    { id: "id", header: t("Đơn", "Order"), sortValue: (row) => row.id, cell: (row) => <span className="font-mono font-medium">{row.id}</span> },
    { id: "product", header: t("Sản phẩm", "Product"), sortValue: (row) => row.product, cell: (row) => <span className="inline-flex items-center gap-2"><ProductDot product={row.product} products={names} />{productLabel(row.product)}</span> },
    { id: "quantity", header: t("Số lượng", "Quantity"), align: "right", sortValue: (row) => row.quantity, cell: (row) => row.quantity },
    { id: "release", header: t("Phát hành", "Release"), sortValue: (row) => row.release, cell: (row) => <span className="text-muted-foreground">{formatClock(input.origin, row.release)}</span> },
    { id: "due", header: t("Hạn", "Due"), sortValue: (row) => row.due, cell: (row) => formatClock(input.origin, row.due) },
    { id: "priority", header: t("Ưu tiên", "Priority"), align: "right", sortValue: (row) => row.priority, cell: (row) => row.priority },
    { id: "lots", header: t("Lô QC phân bổ", "QC lots allocated"), cell: (row) => <span className="flex flex-wrap gap-1">{Object.entries(row.lot_allocations).map(([lot, quantity]) => <span key={lot} className="rounded border px-1 font-mono text-xs">{lot}<span className="text-muted-foreground"> ×{quantity}</span></span>)}{row.initial_allocated > 0 && <span className="text-xs text-muted-foreground">+{row.initial_allocated} {t("từ kho", "from stock")}</span>}</span> },
  ];
  const longTerm = input.long_term_orders ?? [];
  return (
    <>
      <TableToolbar search={search} onSearch={setSearch} placeholder={t("Tìm mã đơn hoặc mã lô…", "Search order or lot…")} count={rows.length} onClear={search || product || due != null ? () => { setSearch(""); setProduct(null); onClearDue(); } : undefined}>
        <FilterChip label={t("Sản phẩm", "Product")} value={product} onChange={setProduct} options={names.map((name) => ({ value: name, label: productLabel(name), count: input.orders.filter((order) => order.product === name).length }))} />
        {due != null && <Badge variant="info">{t("Hạn ngày", "Due on")} {formatDay(input.origin, due * 1440)}<button type="button" onClick={onClearDue} className="ml-1 font-semibold" aria-label={t("Bỏ lọc ngày", "Clear day filter")}>×</button></Badge>}
      </TableToolbar>
      <DataTable rows={rows} columns={columns} rowKey={(row) => row.id} selectedKey={item} initialSort={{ id: "due", desc: false }} label={t("Đơn hàng", "Orders")} />
      {longTerm.length > 0 && (
        <Panel title={t("Đơn dài hạn (ngoài horizon)", "Long-term orders (beyond the horizon)")} description={t("Không xếp lịch trực tiếp; đáp ứng bằng các phương án dự trữ làm trước trong horizon.", "Not scheduled directly; met by reserve options made ahead inside the horizon.")}>
          <ul className="grid gap-1.5 text-sm">{longTerm.map((order) => <li key={order.id} className="flex flex-wrap items-center gap-2"><span className="font-mono font-medium">{order.id}</span><ProductDot product={order.product} products={names} />{productLabel(order.product)}<span className="text-muted-foreground">· {fmtN(order.quantity)} {t("đơn vị", "units")} · {t("hạn", "due")} {formatClock(input.origin, order.due)}</span></li>)}</ul>
        </Panel>
      )}
    </>
  );
}

function RunsV5({ input, item }: { input: Input; item: string | null }) {
  const { t } = useI18n();
  const [search, setSearch] = useState("");
  const [stage, setStage] = useState<string | null>(null);
  const [kind, setKind] = useState<string | null>(null);
  const lotOrder = new Map(input.orders.flatMap((order) => Object.keys(order.lot_allocations).map((lot) => [lot, order.id] as [string, string])));
  type Row = Input["runs"][number];
  const rows = input.runs.filter((run) => (!stage || run.stage === stage) && (!kind || (kind === "reserve") === Boolean(run.reserve_option)) && matches(search, run.id, run.item, run.reserve_option));
  const columns: Column<Row>[] = [
    { id: "id", header: t("Mẻ", "Run"), sortValue: (row) => row.id, cell: (row) => <span className="font-mono font-medium">{row.id}</span> },
    { id: "stage", header: t("Công đoạn", "Stage"), sortValue: (row) => input.stages.indexOf(row.stage), cell: (row) => stageLabel(row.stage) },
    { id: "item", header: t("Làm ra", "Makes"), sortValue: (row) => row.item, cell: (row) => <code className="font-mono text-xs">{row.item}</code> },
    { id: "size", header: t("Cỡ mẻ", "Size"), align: "right", sortValue: (row) => input.run_size[row.stage], cell: (row) => input.run_size[row.stage] },
    { id: "for", header: t("Phục vụ", "Serves"), cell: (row) => row.reserve_option ? <Badge variant="info">{t("dự trữ", "reserve")} {row.reserve_option} → {productLabel(input.reserve_options?.[row.reserve_option]?.pull_ahead_for ?? "")}</Badge> : lotOrder.get(row.id) ? <span className="text-sm">{t("đơn", "order")} <span className="font-mono">{lotOrder.get(row.id)}</span></span> : <span className="text-muted-foreground">{t("bắt buộc", "required")}</span> },
  ];
  return (
    <>
      <TableToolbar search={search} onSearch={setSearch} placeholder={t("Tìm mã mẻ, mã hàng…", "Search run or item…")} count={rows.length} onClear={search || stage || kind ? () => { setSearch(""); setStage(null); setKind(null); } : undefined}>
        <FilterChip label={t("Công đoạn", "Stage")} value={stage} onChange={setStage} options={input.stages.map((value) => ({ value, label: stageLabel(value), count: input.runs.filter((run) => run.stage === value).length }))} />
        <FilterChip label={t("Loại", "Kind")} value={kind} onChange={setKind} options={[{ value: "required", label: t("Bắt buộc", "Required"), count: input.runs.filter((run) => !run.reserve_option).length }, { value: "reserve", label: t("Dự trữ (tuỳ chọn)", "Reserve (optional)"), count: input.runs.filter((run) => run.reserve_option).length }]} />
      </TableToolbar>
      <DataTable rows={rows} columns={columns} rowKey={(row) => row.id} selectedKey={item} pageSize={25} label={t("Mẻ chạy", "Runs")} />
      <Hint>{t("Mẻ bắt buộc phải xếp hết; mẻ dự trữ đi theo nhóm (một phương án dự trữ) — chọn cả nhóm hoặc không. Thời lượng mẻ = ⌈cỡ mẻ × phút/đơn vị + phút cố định⌉ trên máy được chọn.", "Required runs must all be scheduled; reserve runs come in groups (one reserve option) — all or nothing. Run duration = ⌈size × min/unit + fixed minutes⌉ on the chosen machine.")}</Hint>
    </>
  );
}

function SettingsV5({ input }: { input: Input }) {
  const { t } = useI18n();
  const tier1 = new Set(input.objective_tiers?.tier1 ?? []);
  const terms = termsOf(input.weights);
  return (
    <div className="grid min-w-0 gap-4 lg:grid-cols-2">
      <Panel title={t("Mục tiêu (phân tầng)", "Objective (tiered)")} description={t(`Tầng 1 (dịch vụ) xét trước, tầng 2 (chi phí vận hành) chỉ phân định khi tầng 1 bằng nhau; hệ số tầng = ${fmtN(input.objective_tiers?.scale ?? 1)}.`, `Tier 1 (service) first, tier 2 (operating cost) only breaks ties; tier scale = ${fmtN(input.objective_tiers?.scale ?? 1)}.`)}>
        <ul className="grid gap-2 text-sm">
          {terms.map((term) => <li key={term.key} className="flex items-start justify-between gap-3"><span><b className="font-medium">{term.label}</b>{term.help && <span className="block text-xs text-muted-foreground">{term.help}</span>}</span><span className="flex shrink-0 items-center gap-2"><Badge variant={tier1.has(term.key) ? "warning" : "secondary"}>{tier1.has(term.key) ? t("tầng 1", "tier 1") : t("tầng 2", "tier 2")}</Badge><b className="tabular-nums">×{input.weights[term.key]}</b></span></li>)}
        </ul>
      </Panel>
      <Panel title={t("Quy tắc mô hình", "Model rules")}>
        <dl className="divide-y text-sm">
          {input.stages.map((stage, index) => (
            <div key={stage} className="grid grid-cols-[minmax(0,1fr)_auto_auto] gap-3 py-2">
              <dt>{stageLabel(stage)}</dt>
              <dd className="text-muted-foreground">{t("cỡ mẻ", "run size")} <b className="text-foreground tabular-nums">{input.run_size[stage]}</b></dd>
              <dd className="text-muted-foreground">{index < input.stages.length - 1 ? <>{t("chuyển", "transfer")} <b className="text-foreground tabular-nums">{input.transfer_minutes[stage] ?? 0}′</b></> : "—"}</dd>
            </div>
          ))}
          <div className="flex justify-between py-2"><dt>{t("Mốc đo tồn", "Stock checkpoints")}</dt><dd>{input.checkpoints.length} {t("mốc cuối ngày", "end-of-day")}</dd></div>
          <div className="flex justify-between py-2"><dt>{t("Phương án dự trữ", "Reserve options")}</dt><dd className="text-right">{Object.entries(input.reserve_options ?? {}).map(([id, option]) => <span key={id} className="ml-2 whitespace-nowrap"><span className="font-mono">{id}</span> → {productLabel(option.pull_ahead_for)}</span>)}</dd></div>
          <div className="flex justify-between py-2"><dt>{t("Mô hình", "Model")}</dt><dd>schema {input.schema_version} · {t("mẻ cố định theo công đoạn", "fixed runs per stage")}</dd></div>
        </dl>
      </Panel>
    </div>
  );
}
