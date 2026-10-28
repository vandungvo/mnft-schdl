"use client";

import { CheckCircle2, ChevronDown, Loader2 } from "lucide-react";
import Link from "next/link";
import { useState, type ReactNode } from "react";

import { Hint, Meter, Panel, StatTile, type Tone } from "@/components/blocks";
import { useI18n } from "@/components/i18n-provider";
import { productColor } from "@/components/schedule-gantt";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { algorithmInfo, familyWhy } from "@/lib/algorithms";
import {
  compareScore, fmtN, fmtScore, fmtSeconds, historyOf, hours, lateMinutes, median, movedOperations, opsCost, policyOf, runSeconds, score, signed,
  termsOf, tierKeys, tradesVs, type Alternative, type Delivery, type PolicyKey, type Shortlist,
} from "@/lib/decision";
import type { DecisionEntry } from "@/lib/decision-log";
import { formatClock, formatDateTime, formatDuration, productLabel, solverStatusLabel } from "@/lib/format";
import { tr } from "@/lib/locale";
import { plantOf } from "@/lib/plant";
import type { AnySchedulingInput, ScheduleRunDetail } from "@/lib/types";
import { cn } from "@/lib/utils";
import { ConvergenceChart, type ConvergenceSeries } from "./charts";

const N = "text-right tabular-nums";
const WRAP = "whitespace-normal";

export interface WorkspaceCtx {
  alts: Alternative[];
  byId: Map<string, Alternative>;
  weights: Record<string, number>;
  policy: PolicyKey;
  list: Shortlist;
  displayName: (id: string) => string;
  input?: AnySchedulingInput;
  origin: string;
  nOrders: number;
}

/* ---------- policy ---------- */

export function FormulaDetails({ ctx }: { ctx: WorkspaceCtx }) {
  const { t } = useI18n();
  const terms = termsOf(ctx.weights);
  const tiers = tierKeys(ctx.policy, terms);
  const part = (keys: string[]) => terms.filter((term) => keys.includes(term.key)).map((term, i) => <span key={term.key}>{i ? " + " : ""}<b className="text-primary">{ctx.weights[term.key]}</b>×{term.label}</span>);
  return (
    <Collapsible className="mt-3">
      <CollapsibleTrigger className="group inline-flex min-h-6 items-center gap-1 py-1 text-sm font-semibold text-primary hover:underline">
        {t("Cách tính điểm theo chính sách này", "How this policy scores schedules")}<ChevronDown className="size-4 transition-transform group-data-[state=open]:rotate-180" />
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-3 space-y-2 text-sm leading-7">
        {tiers ? <>
          <p><b>{t("Tầng 1", "Tier 1")}</b> = {part(tiers.tier1)}</p>
          <p><b>{t("Tầng 2", "Tier 2")}</b> = {part(tiers.tier2)}</p>
          <p className="text-muted-foreground">{t("So sánh tầng 1 trước; bằng nhau mới xét tầng 2. Điểm ghi dạng", "Tier 1 is compared first; tier 2 only breaks ties. Scores read")} <b>{t("tầng 1 · tầng 2", "tier 1 · tier 2")}</b>{t(", càng thấp càng tốt.", "; lower is better.")}</p>
        </> : <>
          <p><b>{t("Điểm", "Score")}</b> = {part(terms.map((term) => term.key))}</p>
          <p className="text-muted-foreground">{t("Một tổng duy nhất, càng thấp càng tốt.", "A single sum; lower is better.")}</p>
        </>}
        <ul className="grid gap-x-5 gap-y-1 sm:grid-cols-2">
          {terms.map((term) => <li key={term.key} className="flex items-baseline gap-2"><b className="min-w-10 text-right text-primary">×{ctx.weights[term.key]}</b><span><b>{term.label}</b> <span className="text-muted-foreground">— {term.help}</span></span></li>)}
        </ul>
        <Hint>{t("Trọng số lấy từ dữ liệu nhà máy. Chính sách chỉ đổi", "Weights come from the factory data. A policy only changes the")} <b>{t("thứ tự ưu tiên", "priority order")}</b>{t(", không đổi trọng số.", ", not the weights.")}</Hint>
      </CollapsibleContent>
    </Collapsible>
  );
}

/* ---------- alternatives ---------- */

function Metric({ label, children, best }: { label: string; children: ReactNode; best?: boolean }) {
  return (
    <span className="grid gap-0.5 bg-card px-2.5 py-2">
      <span className="text-[11px] text-muted-foreground">{label}</span>
      <b className={cn("inline-flex items-center gap-1 font-semibold tabular-nums", best && "text-success")}>{children}{best && <span className="sr-only"> ({tr("tốt nhất", "best")})</span>}</b>
    </span>
  );
}

/** One sentence on why an option sits where it does: what it wins and gives up against its neighbour in the ranking. */
export function rankReason(ctx: WorkspaceCtx, id: string): string {
  const index = ctx.list.keys.indexOf(id);
  const alt = ctx.byId.get(id);
  if (!alt) return "";
  if (index < 0) {
    // Not recommended (e.g. a manual edit): say which option beats it and where.
    const winner = ctx.byId.get(ctx.list.dominatedBy[id] ?? "");
    if (!winner) return tr("Trùng kết quả với một phương án đề xuất.", "Same result as a recommended option.");
    const { losses } = tradesVs(alt, winner, ctx.weights);
    return tr(`Không vào đề xuất vì “${ctx.displayName(winner.id)}” tốt bằng hoặc hơn ở mọi mặt${losses.length ? ` (lịch này ${losses.join(", ")})` : ""}.`,
      `Not recommended: “${ctx.displayName(winner.id)}” is as good or better on every axis${losses.length ? ` (this one: ${losses.join(", ")})` : ""}.`);
  }
  if (ctx.list.keys.length === 1) return tr("Không lịch nào khác tốt hơn ở bất kỳ mặt nào.", "No other schedule is better on any axis.");
  const join = (items: string[]) => items.join(", ");
  const ref = ctx.byId.get(ctx.list.keys[index === 0 ? 1 : 0])!;
  const { gains, losses } = tradesVs(alt, ref, ctx.weights);
  const lead = index === 0
    ? tr(`Đứng đầu khi ưu tiên “${policyOf(ctx.policy).name}”. So với #2: ${join(gains) || "bằng nhau"}${losses.length ? `; đổi lại ${join(losses)}` : ""}.`,
      `First under “${policyOf(ctx.policy).name}”. Versus #2: ${join(gains) || "equal"}${losses.length ? `; in exchange ${join(losses)}` : ""}.`)
    : tr(`So với #1: ${join(gains) || "không hơn mặt nào"}${losses.length ? `; đổi lại ${join(losses)}` : ""}.`,
      `Versus #1: ${join(gains) || "better on nothing"}${losses.length ? `; in exchange ${join(losses)}` : ""}.`);
  // The ranking weighs lateness by order priority; when raw hours point the other way, say where the lateness falls.
  const weighted = (alt.metrics.weighted_tardiness ?? 0) - (ref.metrics.weighted_tardiness ?? 0);
  const raw = lateMinutes(alt, ctx.input) - lateMinutes(ref, ctx.input);
  if (Math.sign(weighted) * Math.sign(raw) >= 0) return lead;
  return `${lead} ${raw > 0
    ? tr(`Tổng giờ trễ nhiều hơn ${hours(raw)} nhưng dồn vào đơn ưu tiên thấp.`, `${hours(raw)} more late in total, but on low-priority orders.`)
    : tr(`Tổng giờ trễ ít hơn ${hours(-raw)} nhưng rơi vào đơn ưu tiên cao hơn.`, `${hours(-raw)} less late in total, but on higher-priority orders.`)}`;
}

export function AlternativeCards({ ctx, current, decided, onPick, ids, label }: {
  ctx: WorkspaceCtx; current: string | null; decided: string | null; onPick: (id: string) => void;
  /** Cards to show (default: the recommended options, in rank order). */
  ids?: string[]; label?: string;
}) {
  const { t } = useI18n();
  const shown = (ids ?? ctx.list.keys).map((id) => ctx.byId.get(id)!).filter(Boolean);
  // Best value of each figure across the cards, highlighted like a product comparison table.
  const figures = (alt: Alternative) => [alt.late, lateMinutes(alt, ctx.input), alt.metrics.safety_shortfall ?? 0, opsCost(alt, ctx.weights)].map(Math.round);
  const best = shown.length > 1 ? [0, 1, 2, 3].map((i) => Math.min(...shown.map((alt) => figures(alt)[i]))) : null;
  return (
    <div className="grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(min(300px,100%),1fr))]" role="group" aria-label={label ?? t("Phương án đề xuất", "Recommended options")}>
      {shown.map((alt) => {
        const id = alt.id;
        const index = ctx.list.keys.indexOf(id);
        const twins = ctx.list.twins[id] ?? [];
        const active = id === current;
        const values = figures(alt);
        const isBest = (i: number) => best != null && values[i] === best[i];
        return (
          <button type="button" key={id} aria-pressed={active} onClick={() => onPick(id)}
            className={cn("group relative flex min-w-0 flex-col gap-3 rounded-lg border bg-card p-4 text-left shadow-card transition-[border-color,box-shadow] hover:border-primary/60 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
              active && "border-primary ring-1 ring-primary")}>
            <span className="flex items-start gap-2.5">
              {index >= 0
                ? <span className={cn("grid size-7 shrink-0 place-items-center rounded-md text-xs font-bold tabular-nums", index ? "bg-muted text-muted-foreground" : "bg-success-soft text-success")} aria-label={`${t("Hạng", "Rank")} ${index + 1}`}>#{index + 1}</span>
                : <span className="grid h-7 shrink-0 place-items-center rounded-md border border-dashed px-1.5 text-[11px] font-semibold text-muted-foreground">{t("ngoài", "other")}</span>}
              <span className="grid min-w-0 flex-1">
                <span className="text-[15px] leading-tight font-semibold">{ctx.list.name[id] ?? alt.label}</span>
                <span className="truncate text-xs text-muted-foreground">{alt.algorithm === "manual" ? t("Bản sửa tay", "Manual edit") : alt.algorithm === "cp_repair" ? t("Tối ưu quanh bản sửa", "Optimised around an edit") : `${t("Thuật toán", "Algorithm")}: ${alt.label}`}</span>
              </span>
              {id === decided && <Badge variant="info"><CheckCircle2 />{t("Đã chốt", "Committed")}</Badge>}
            </span>
            <span className="grid grid-cols-2 gap-px overflow-hidden rounded-md border bg-border text-[13px]">
              <Metric label={t("Đúng hạn", "On time")} best={isBest(0)}>{ctx.nOrders - alt.late}/{ctx.nOrders}</Metric>
              <Metric label={t("Tổng trễ", "Total lateness")} best={isBest(1)}>{hours(values[1])}</Metric>
              <Metric label={t("Thiếu tồn an toàn", "Safety shortfall")} best={isBest(2)}>{fmtN(values[2])} {t("sp", "units")}</Metric>
              <Metric label={t("Chi phí vận hành", "Operating cost")} best={isBest(3)}>{fmtN(values[3])}</Metric>
            </span>
            <span className="text-[13px] leading-snug text-muted-foreground">{rankReason(ctx, id)}</span>
            <span className="mt-auto flex items-center justify-end gap-2 border-t pt-2.5 text-xs">
              {active ? <span className="font-semibold text-primary">{t("Đang xem", "Viewing")}</span> : <span className="font-medium text-muted-foreground group-hover:text-primary">{t("Xem nhanh", "Quick look")} →</span>}
            </span>
            {twins.length > 0 && <span className="text-xs text-muted-foreground">{t("Trùng kết quả với", "Same result as")} {twins.map(ctx.displayName).join(", ")}</span>}
          </button>
        );
      })}
      {best && <p className="col-span-full text-xs text-muted-foreground"><span className="font-semibold text-success">{t("Số màu xanh", "Green figures")}</span> {t("= tốt nhất trong các phương án đề xuất.", "= best among the recommended options.")}</p>}
    </div>
  );
}

/* ---------- schedule stats & compare ---------- */

export function StatTiles({ ctx, alt }: { ctx: WorkspaceCtx; alt: Alternative }) {
  const { t } = useI18n();
  const m = alt.metrics;
  const items: Array<[string, string, Tone]> = [
    [t("Đúng hạn", "On time"), `${ctx.nOrders - alt.late} / ${ctx.nOrders}`, alt.late ? "warn" : "ok"],
    [t("Tổng trễ", "Total lateness"), hours(lateMinutes(alt, ctx.input)), alt.late ? "warn" : "ok"],
    [t("Ca-máy bật", "Machine-shifts open"), String(alt.shifts.size), "default"],
    [t("Thời gian rảnh", "Idle time"), formatDuration(m.idle_minutes ?? 0), "default"],
    [t("Chuẩn bị máy", "Setup"), formatDuration(m.setup_minutes ?? 0), "default"],
    [t("Lô bắt buộc cuối xong", "Last required lot done"), formatClock(ctx.origin, m.makespan ?? 0), "default"],
    [t("Thiếu tồn an toàn", "Safety-stock shortfall"), fmtN(m.safety_shortfall ?? 0), m.safety_shortfall ? "warn" : "ok"],
    [t("Chi phí vận hành", "Operating cost"), fmtN(opsCost(alt, ctx.weights)), "default"],
  ];
  return <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-7">{items.map(([label, value, tone]) => <StatTile key={label} label={label} value={value} tone={tone} className="[&>div:nth-child(2)]:text-lg" />)}</div>;
}

function rankLabel(ctx: WorkspaceCtx, id: string): string {
  const index = ctx.list.keys.indexOf(id);
  return index >= 0 ? `#${index + 1}` : tr("ngoài đề xuất", "not recommended");
}

export function DiffCard({ ctx, a, b }: { ctx: WorkspaceCtx; a: Alternative; b: Alternative }) {
  const { t } = useI18n();
  const nA = ctx.displayName(a.id), nB = ctx.displayName(b.id);
  const rows: Array<[string, (x: Alternative) => number, ((v: number) => string)?]> = [
    [t("Đơn trễ", "Late orders"), (x) => x.late],
    [t("Tổng trễ (phút)", "Total lateness (min)"), (x) => lateMinutes(x, ctx.input)],
    [t("Trễ theo ưu tiên đơn", "Priority-weighted lateness"), (x) => x.metrics.weighted_tardiness ?? 0],
    [t("Thiếu tồn an toàn", "Safety-stock shortfall"), (x) => x.metrics.safety_shortfall ?? 0],
    [t("Chi phí vận hành", "Operating cost"), (x) => opsCost(x, ctx.weights)],
    [t("Ca-máy bật", "Machine-shifts open"), (x) => x.shifts.size],
    [t("Thời gian rảnh (phút)", "Idle time (min)"), (x) => x.metrics.idle_minutes ?? 0],
    [t("Setup (phút)", "Setup (min)"), (x) => x.metrics.setup_minutes ?? 0],
    [t("Bảo trì khuôn (phút)", "Mold maintenance (min)"), (x) => x.metrics.maintenance_minutes ?? 0],
    [t("Lô bắt buộc cuối xong", "Last required lot done"), (x) => x.metrics.makespan ?? 0, (v) => formatClock(ctx.origin, v)],
  ];
  const better = compareScore(b, a, ctx.weights, ctx.policy);
  const onlyA = [...a.shifts].filter((s) => !b.shifts.has(s));
  const onlyB = [...b.shifts].filter((s) => !a.shifts.has(s));
  const fmtShift = (key: string) => key.replace("|", " · ");
  return (
    <Panel title={t(`Đổi từ “${nA}” sang “${nB}” thì được gì, mất gì`, `Switching from “${nA}” to “${nB}”: what you gain and lose`)}>
      <Table>
        <TableHeader><TableRow><TableHead>{t("Chỉ số", "Metric")}</TableHead><TableHead className={N}>{t("Đang xem", "Viewing")}: {nA}</TableHead><TableHead className={N}>{nB}</TableHead><TableHead className={N}>{t("Nếu đổi sang", "If switched to")} {nB}</TableHead></TableRow></TableHeader>
        <TableBody>
          <TableRow><TableCell>{t("Xếp hạng", "Ranking")} · {policyOf(ctx.policy).name.toLowerCase()}</TableCell><TableCell className={N}>{rankLabel(ctx, a.id)}</TableCell><TableCell className={N}>{rankLabel(ctx, b.id)}</TableCell>
            <TableCell className={N}>{better < 0 ? <span className="font-semibold text-success">{t("tốt hơn", "better")}</span> : better > 0 ? <span className="font-semibold text-warning">{t("kém hơn", "worse")}</span> : t("bằng", "equal")}</TableCell></TableRow>
          {rows.map(([label, f, fmt]) => {
            const va = f(a), vb = f(b), diff = vb - va;
            const shown = diff === 0 ? t("bằng", "equal") : fmt ? `${diff > 0 ? "+" : "−"}${hours(Math.abs(diff))}` : signed(diff);
            return <TableRow key={label}><TableCell>{label}</TableCell><TableCell className={N}>{fmt ? fmt(va) : fmtN(va)}</TableCell><TableCell className={N}>{fmt ? fmt(vb) : fmtN(vb)}</TableCell>
              <TableCell className={N}><span className={cn(diff !== 0 && "font-semibold", diff < 0 ? "text-success" : diff > 0 ? "text-warning" : "")}>{shown}</span></TableCell></TableRow>;
          })}
        </TableBody>
      </Table>
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        {[[t(`Ca chỉ lịch đang xem bật (${onlyA.length})`, `Shifts open only in the viewed schedule (${onlyA.length})`), onlyA.map(fmtShift).join(", ") || "—"], [t(`Ca chỉ “${nB}” bật (${onlyB.length})`, `Shifts open only in “${nB}” (${onlyB.length})`), onlyB.map(fmtShift).join(", ") || "—"],
          [t("Lượt thay đổi", "Moved operations"), t(`${movedOperations(a, b)} lượt chung đổi máy hoặc giờ bắt đầu; ${a.shifts.size - onlyA.length} ca-máy dùng chung.`, `${movedOperations(a, b)} shared operations change machine or start time; ${a.shifts.size - onlyA.length} machine-shifts in common.`)]].map(([title, body]) => (
          <div key={title} className="rounded-lg bg-surface-2 p-3"><h4 className="mb-1 text-[13px] font-semibold">{title}</h4><p className="text-[13px] leading-relaxed break-words text-muted-foreground">{body}</p></div>
        ))}
      </div>
    </Panel>
  );
}

/* ---------- deliveries, stock, why ---------- */

export function DeliveriesTable({ ctx, deliveries }: { ctx: WorkspaceCtx; deliveries: Delivery[] }) {
  const { t } = useI18n();
  const sorted = [...deliveries].sort((a, b) => a.time - b.time);
  return (
    <Panel title={t("Giao hàng", "Deliveries")}>
      <div className="max-h-[440px] overflow-y-auto rounded-md focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none" tabIndex={0} role="region" aria-label={t("Bảng giao hàng (cuộn được)", "Deliveries table (scrollable)")}>
        <Table>
          <TableHeader className="sticky top-0 bg-card"><TableRow><TableHead>{t("Đơn", "Order")}</TableHead><TableHead>{t("Sản phẩm", "Product")}</TableHead><TableHead className={N}>{t("Số lượng", "Quantity")}</TableHead><TableHead>{t("Giao lúc", "Delivered")}</TableHead><TableHead>{t("Hạn", "Due")}</TableHead><TableHead className={N}>{t("Còn dư", "Slack")}</TableHead></TableRow></TableHeader>
          <TableBody>{sorted.map((d) => {
            const slack = d.due - d.time;
            return <TableRow key={d.order}><TableCell className="font-semibold">{d.order}{d.urgent && <Badge variant="brand" className="ml-1.5">{t("gấp", "urgent")}</Badge>}</TableCell><TableCell>{productLabel(d.product)}</TableCell><TableCell className={N}>{fmtN(d.quantity)}</TableCell>
              <TableCell>{Number.isFinite(d.time) ? formatClock(ctx.origin, d.time) : t("chưa xếp", "not scheduled")}</TableCell><TableCell>{formatClock(ctx.origin, d.due)}</TableCell>
              <TableCell className={cn(N, slack < 0 && "font-semibold text-warning")}>{slack < 0 ? `${t("trễ", "late")} ${hours(-slack)}` : hours(slack)}</TableCell></TableRow>;
          })}</TableBody>
        </Table>
      </div>
    </Panel>
  );
}

export function StockCard({ ctx, alt }: { ctx: WorkspaceCtx; alt: Alternative }) {
  const { t } = useI18n();
  const end = (alt.run.metrics?.end_inventory ?? {}) as unknown as Record<string, number>;
  if (!ctx.input) return null;
  const plant = plantOf(ctx.input);
  return (
    <Panel title={t("Tồn thành phẩm cuối kỳ", "Closing finished-goods stock")}>
      <Table>
        <TableHeader><TableRow><TableHead>{t("Sản phẩm", "Product")}</TableHead><TableHead className={N}>{t("Đầu kỳ", "Opening")}</TableHead><TableHead className={N}>{t("Cuối kỳ", "Closing")}</TableHead><TableHead className={N}>{t("An toàn", "Safety")}</TableHead><TableHead className="w-32">{t("So với an toàn", "Versus safety")}</TableHead></TableRow></TableHeader>
        <TableBody>{plant.products.map((p) => {
          const value = end[p] ?? 0, safe = plant.safetyStock[p] ?? 0;
          const ratio = Math.min(1.5, safe ? value / safe : 1.5);
          return <TableRow key={p}><TableCell><span className="inline-flex items-center gap-2"><i className="size-2.5 rounded-xs" style={{ background: productColor(p, plant.products)[0] }} />{productLabel(p)}</span></TableCell>
            <TableCell className={N}>{fmtN(plant.initialStock[p] ?? 0)}</TableCell><TableCell className={cn(N, "font-semibold", value < safe && "text-warning")}>{fmtN(value)}</TableCell><TableCell className={N}>{fmtN(safe)}</TableCell>
            <TableCell><Meter value={ratio / 1.5} marker={1 / 1.5} tone={value < safe ? "warn" : "ok"} label={`${fmtN(value)} / ${fmtN(safe)}`} /></TableCell></TableRow>;
        })}</TableBody>
      </Table>
      <Hint>{t(`Tồn an toàn được đo ở ${plant.checkpoints.length} mốc cuối ngày; bảng này chỉ là mốc cuối kỳ. Vạch dọc trên thanh là mức tồn an toàn.`, `Safety stock is measured at ${plant.checkpoints.length} end-of-day checkpoints; this table shows only the final one. The vertical tick on each bar marks the safety level.`)}</Hint>
    </Panel>
  );
}

export function WhyCards({ ctx, alt }: { ctx: WorkspaceCtx; alt: Alternative }) {
  const { t } = useI18n();
  const info = algorithmInfo(alt.algorithm);
  const items: Array<[string, string]> = [[`${ctx.displayName(alt.id)} — ${info.label}`, info.note], ...familyWhy(info.family)];
  if (alt.run.solver_status) items.push([t("Trạng thái solver", "Solver status"), `${solverStatusLabel(alt.run.solver_status)}${alt.run.validation ? ` · ${t("bộ kiểm độc lập", "independent validator")}: ${alt.run.validation.valid ? t("hợp lệ", "valid") : t("lỗi", "invalid")} (${alt.run.validation.operations_checked ?? alt.run.operations.length} ${t("lượt", "operations")})` : ""}.`]);
  return <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(min(280px,100%),1fr))]">{items.map(([h, p]) => <Panel key={h} title={h}><p className="text-[13.5px] text-muted-foreground">{p}</p></Panel>)}</div>;
}

/* ---------- speed ---------- */

const SERIES_COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)", "var(--chart-6)"];

export function SpeedSection({ ctx, runs }: { ctx: WorkspaceCtx; runs: ScheduleRunDetail[] }) {
  const { t } = useI18n();
  const groups = [...new Set(runs.map((run) => run.algorithm))].map((algorithm) => {
    const list = runs.filter((run) => run.algorithm === algorithm);
    const ok = list.filter((run) => run.status === "SUCCEEDED");
    const best = ok.map((run) => ctx.byId.get(run.id)).filter((alt): alt is Alternative => Boolean(alt)).sort((a, b) => compareScore(a, b, ctx.weights, ctx.policy))[0];
    const bestHistory = best ? historyOf(best.run) : [];
    const bestAt = bestHistory.length ? bestHistory[bestHistory.length - 1].seconds : best ? runSeconds(best.run) : null;
    return { algorithm, list, ok, best, bestAt, seconds: median(list.map(runSeconds).filter((v): v is number => v != null)), statuses: [...new Set(list.map((run) => run.solver_status ? solverStatusLabel(run.solver_status) : run.status))] };
  }).sort((a, b) => (a.best && b.best ? compareScore(a.best, b.best, ctx.weights, ctx.policy) : a.best ? -1 : 1));
  const fastest = groups.filter((g) => g.seconds != null).sort((a, b) => a.seconds! - b.seconds!)[0];
  const winner = groups.find((g) => g.best);
  const failed = runs.filter((run) => run.status === "FAILED").length;
  const series: ConvergenceSeries[] = groups.filter((g) => g.best && historyOf(g.best.run).length > 1).map((g, i) => ({
    id: g.algorithm, name: `${algorithmInfo(g.algorithm).short} · seed ${g.best!.run.seed}`, color: SERIES_COLORS[i % SERIES_COLORS.length], points: historyOf(g.best!.run), end: runSeconds(g.best!.run) ?? 0,
  }));
  const budget = median(runs.map((run) => run.time_budget_seconds));
  return (
    <div className="grid min-w-0 gap-4">
      <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
        <StatTile label={t("Nhanh nhất", "Fastest")} value={fastest ? `${algorithmInfo(fastest.algorithm).short} · ${fmtSeconds(fastest.seconds)}` : "—"} />
        <StatTile label={t("Lịch tốt nhất", "Best schedule")} tone="ok" value={winner ? `${algorithmInfo(winner.algorithm).short}${winner.bestAt != null ? ` · ${t("sau", "after")} ${fmtSeconds(winner.bestAt)}` : ""}` : "—"} />
        <StatTile label={t("Lần chạy thất bại", "Failed runs")} tone={failed ? "warn" : "default"} value={`${failed} / ${runs.length}`} />
        <StatTile label={t("Ngân sách trung vị", "Median budget")} value={budget != null ? `${budget} s` : "—"} />
      </div>
      {series.length > 0 && <Panel title={t("Điểm tốt nhất tìm được theo thời gian", "Best score found over time")}>
        <div className="overflow-x-auto"><ConvergenceChart series={series} budget={budget} /></div>
        <Hint>{t("Mỗi đường là lần chạy tốt nhất của một thuật toán: điểm tốt nhất tìm được tới thời điểm đó (bậc thang, chỉ đi xuống). Luật điều độ dựng lịch một lần nên không có đường.", "Each line is an algorithm's best run: the best score found up to that time (a step line that only goes down). Dispatching rules build once, so they have no line.")}</Hint>
      </Panel>}
      <Panel title={t("Thời gian và chất lượng theo thuật toán", "Time and quality by algorithm")}>
        <Table>
          <TableHeader><TableRow><TableHead>{t("Thuật toán", "Algorithm")}</TableHead><TableHead className={N}>{t("Có lịch / lần chạy", "Schedules / runs")}</TableHead><TableHead className={N}>{t("Thời gian / lần", "Time / run")}</TableHead><TableHead className={N}>{t("Đạt lịch tốt nhất sau", "Best found after")}</TableHead><TableHead className={N}>{t("Điểm tốt nhất", "Best score")}</TableHead><TableHead className={N}>{t("Điểm trung vị", "Median score")}</TableHead><TableHead className={N}>{t("Đơn trễ", "Late orders")}</TableHead><TableHead>{t("Trạng thái", "Status")}</TableHead></TableRow></TableHeader>
          <TableBody>{groups.map((g) => {
            const scores = g.ok.map((run) => ctx.byId.get(run.id)).filter((alt): alt is Alternative => Boolean(alt)).map((alt) => score(alt, ctx.weights, ctx.policy));
            return <TableRow key={g.algorithm}>
              <TableCell className="font-semibold">{algorithmInfo(g.algorithm).label}</TableCell>
              <TableCell className={cn(N, g.ok.length < g.list.length && "font-semibold text-warning")}>{g.ok.length} / {g.list.length}</TableCell>
              <TableCell className={N}>{fmtSeconds(g.seconds)}</TableCell>
              <TableCell className={N}>{g.best ? <>{fmtSeconds(g.bestAt)}<span className="block text-xs text-muted-foreground">seed {g.best.run.seed}</span></> : "—"}</TableCell>
              <TableCell className={N}>{g.best ? fmtScore(score(g.best, ctx.weights, ctx.policy), ctx.policy) : "—"}</TableCell>
              <TableCell className={N}>{scores.length ? fmtScore([median(scores.map((pair) => pair[0]))!, median(scores.map((pair) => pair[1]))!], ctx.policy) : "—"}</TableCell>
              <TableCell className={N}>{g.best ? `${g.best.late} / ${ctx.nOrders}` : "—"}</TableCell>
              <TableCell className="text-xs text-muted-foreground">{g.statuses.join(", ")}</TableCell>
            </TableRow>;
          })}</TableBody>
        </Table>
        <Hint>{t("Thời gian là thời gian thuật toán chạy trên worker (tính cả dựng mô hình). “Điểm trung vị” là trung vị điểm (tầng 1 · tầng 2) qua các seed có lịch; càng thấp càng tốt.", "Time is the algorithm's run time on the worker (including model building). “Median score” is the median score (tier 1 · tier 2) across seeds that produced a schedule; lower is better.")}</Hint>
      </Panel>
    </div>
  );
}

/* ---------- decision ---------- */

export function DecisionPanel({ ctx, alt, entries, onSave, onChangeOption, note }: { ctx: WorkspaceCtx; alt: Alternative; entries: DecisionEntry[]; onSave: (reason: string) => Promise<boolean>; onChangeOption: () => void; note?: ReactNode }) {
  const { t } = useI18n();
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  return (
    <Panel>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3 rounded-lg bg-surface-2 p-3">
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">{t("Bạn đang chốt", "You are committing")}</p>
          <p className="font-semibold">{ctx.displayName(alt.id)} <span className="text-sm font-normal text-muted-foreground">· {alt.label}</span></p>
          <p className="mt-1 text-sm text-muted-foreground">{t("Đúng hạn", "On time")} <b className="text-foreground tabular-nums">{ctx.nOrders - alt.late}/{ctx.nOrders}</b> · {t("tổng trễ", "lateness")} <b className="text-foreground tabular-nums">{hours(lateMinutes(alt, ctx.input))}</b> · {t("thiếu tồn", "shortfall")} <b className="text-foreground tabular-nums">{fmtN(alt.metrics.safety_shortfall ?? 0)}</b> · {t("chính sách", "policy")} <b className="text-foreground">{policyOf(ctx.policy).name}</b></p>
        </div>
        <Button size="sm" variant="outline" onClick={onChangeOption}>{t("Đổi phương án", "Change option")}</Button>
      </div>
      {note && <div className="mb-4 text-sm text-muted-foreground">{note}</div>}
      <label className="grid gap-1.5">
        <span className="text-xs font-semibold text-muted-foreground">{t("Lý do chọn", "Reason")} <span className="text-destructive" aria-hidden>*</span><span className="sr-only">({t("bắt buộc", "required")})</span></span>
        <Textarea id="decision-reason" rows={3} required aria-required value={reason} onChange={(event) => { setReason(event.target.value); setMessage(""); }} placeholder={t("Ví dụ: chấp nhận bật thêm 3 ca để giữ đủ tồn an toàn F bạc cho đơn dài hạn.", "Example: accept 3 extra shifts to keep enough F silver safety stock for long-dated orders.")} />
      </label>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Button disabled={saving} onClick={async () => {
          if (!reason.trim()) { setMessage(t("Nhập lý do trước khi chốt — quyết định cần giải thích được.", "Enter a reason before committing — the decision must be explainable.")); return; }
          setSaving(true);
          setMessage("");
          const ok = await onSave(reason.trim());
          setSaving(false);
          setMessage(ok ? t("Đã chốt phương án.", "Option committed.") : t("Không lưu được lên máy chủ; quyết định chưa được ghi. Lý do vẫn còn trong ô, thử lại sau.", "Could not save to the server; the decision was not recorded. Your reason is still in the box — try again."));
          if (ok) setReason("");
        }}>{saving ? <Loader2 className="animate-spin" /> : <CheckCircle2 />}{saving ? t("Đang lưu…", "Saving…") : t("Chốt phương án này", "Commit this option")}</Button>
        <Link href={`/runs/${alt.id}`} className="px-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:underline">{t("Chi tiết kỹ thuật lần chạy", "Technical run details")}</Link>
        <span className="text-sm text-muted-foreground" role="status">{message}</span>
      </div>
      {entries.length ? (
        <div className="mt-5">
          <Table>
            <TableHeader><TableRow><TableHead>{t("Thời điểm", "Time")}</TableHead><TableHead>{t("Phương án", "Option")}</TableHead><TableHead>{t("Chính sách", "Policy")}</TableHead><TableHead className={N}>{t("Đơn trễ", "Late orders")}</TableHead><TableHead className={N}>{t("Thiếu tồn", "Shortfall")}</TableHead><TableHead className={N}>{t("Ca-máy", "Machine-shifts")}</TableHead><TableHead>{t("Lý do", "Reason")}</TableHead><TableHead>{t("Người chốt", "Committed by")}</TableHead></TableRow></TableHeader>
            <TableBody>{[...entries].reverse().map((entry) => (
              <TableRow key={entry.at + entry.runId}>
                <TableCell>{formatDateTime(entry.at)}</TableCell>
                <TableCell><Link className="font-semibold text-primary hover:underline" href={`/runs/${entry.runId}`}>{entry.alternative}</Link><span className="block text-xs text-muted-foreground">{entry.algorithm}</span></TableCell>
                <TableCell>{entry.policy}<span className="block text-xs text-muted-foreground">{entry.score}</span></TableCell>
                <TableCell className={N}>{entry.late}</TableCell><TableCell className={N}>{entry.shortfall}</TableCell><TableCell className={N}>{entry.shifts}</TableCell>
                <TableCell className={cn(WRAP, "min-w-60")}>{entry.reason}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{entry.actor ?? "—"}</TableCell>
              </TableRow>
            ))}</TableBody>
          </Table>
        </div>
      ) : <Hint>{t("Chưa chốt phương án nào.", "Nothing has been committed yet.")}</Hint>}
      <Hint>{t("Nhật ký lưu trên máy chủ, chỉ ghi thêm (không sửa, không xóa): mỗi lần chốt giữ lần chạy, snapshot dữ liệu, chính sách, số liệu lúc chốt và người chốt. Chốt lại sẽ tạo dòng mới thay cho quyết định trước.", "The log is stored on the server and is append-only (never edited or deleted): each commit keeps the run, data snapshot, policy, the figures at that moment and who committed. Committing again adds a new row that supersedes the previous one.")}</Hint>
    </Panel>
  );
}

/* ---------- appendix ---------- */

export function RankingTable({ ctx, current, onPick }: { ctx: WorkspaceCtx; current: string | null; onPick: (id: string) => void }) {
  const { t } = useI18n();
  const sorted = [...ctx.alts].sort((a, b) => compareScore(a, b, ctx.weights, ctx.policy));
  return (
    <Table>
      <TableHeader><TableRow><TableHead>{t("Phương án", "Option")}</TableHead><TableHead className={N}>{t("Hạng", "Rank")}</TableHead><TableHead className={N}>{t("Điểm", "Score")}</TableHead><TableHead className={N}>{t("Đơn trễ", "Late orders")}</TableHead><TableHead className={N}>{t("Thiếu tồn", "Shortfall")}</TableHead><TableHead className={N}>{t("Chi phí vận hành", "Operating cost")}</TableHead><TableHead className={N}>{t("Ca-máy", "Machine-shifts")}</TableHead><TableHead className={N}>{t("Rảnh (phút)", "Idle (min)")}</TableHead><TableHead>{t("Lô cuối xong", "Last lot done")}</TableHead><TableHead className={N}>{t("Thời gian chạy", "Run time")}</TableHead><TableHead>{t("Trạng thái", "Status")}</TableHead></TableRow></TableHeader>
      <TableBody>{sorted.map((alt, index) => (
        <TableRow key={alt.id} data-state={alt.id === current ? "selected" : undefined} tabIndex={0} className="cursor-pointer" onClick={() => onPick(alt.id)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onPick(alt.id); } }}>
          <TableCell className="font-semibold">{alt.label}{ctx.list.name[alt.id] && <span className="block text-xs font-normal text-muted-foreground">{t("đề xuất", "recommended")}: {ctx.list.name[alt.id]}</span>}{ctx.list.dominatedBy[alt.id] && <span className="block text-xs font-normal text-muted-foreground">{t("kém hơn", "dominated by")} “{ctx.displayName(ctx.list.dominatedBy[alt.id])}”</span>}</TableCell>
          <TableCell className={N}>{index + 1}</TableCell>
          <TableCell className={cn(N, index === 0 && "font-semibold text-success")}>{fmtScore(score(alt, ctx.weights, ctx.policy), ctx.policy)}</TableCell>
          <TableCell className={N}>{alt.late}</TableCell><TableCell className={N}>{fmtN(alt.metrics.safety_shortfall ?? 0)}</TableCell><TableCell className={N}>{fmtN(opsCost(alt, ctx.weights))}</TableCell>
          <TableCell className={N}>{alt.shifts.size}</TableCell><TableCell className={N}>{fmtN(alt.metrics.idle_minutes ?? 0)}</TableCell><TableCell>{formatClock(ctx.origin, alt.metrics.makespan ?? 0)}</TableCell>
          <TableCell className={N}>{fmtSeconds(runSeconds(alt.run))}</TableCell><TableCell className="text-xs text-muted-foreground">{solverStatusLabel(alt.run.solver_status)}</TableCell>
        </TableRow>
      ))}</TableBody>
    </Table>
  );
}

export function PartsTable({ ctx }: { ctx: WorkspaceCtx }) {
  const { t } = useI18n();
  const terms = termsOf(ctx.weights);
  const tiers = tierKeys(ctx.policy, terms);
  const t1 = tiers ? terms.filter((term) => tiers.tier1.includes(term.key)) : [];
  const t2 = tiers ? terms.filter((term) => tiers.tier2.includes(term.key)) : terms;
  const sorted = [...ctx.alts].sort((a, b) => compareScore(a, b, ctx.weights, ctx.policy));
  const cell = (alt: Alternative, key: string) => { const v = alt.metrics[key] ?? 0; return <TableCell className={N} key={key}>{fmtN(ctx.weights[key] * v)}<span className="block text-xs text-muted-foreground">{fmtN(v)}</span></TableCell>; };
  return (
    <Table>
      <TableHeader><TableRow><TableHead>{t("Phương án", "Option")}</TableHead>{t1.map((term) => <TableHead className={N} key={term.key}>{term.label} ×{ctx.weights[term.key]}</TableHead>)}{t1.length > 0 && <TableHead className={N}>{t("Tầng 1", "Tier 1")}</TableHead>}{t2.map((term) => <TableHead className={N} key={term.key}>{term.label} ×{ctx.weights[term.key]}</TableHead>)}<TableHead className={N}>{t1.length ? t("Tầng 2", "Tier 2") : t("Điểm", "Score")}</TableHead></TableRow></TableHeader>
      <TableBody>{sorted.map((alt) => {
        const [s1, s2] = score(alt, ctx.weights, ctx.policy);
        return <TableRow key={alt.id}><TableCell className="font-semibold">{alt.label}</TableCell>{t1.map((term) => cell(alt, term.key))}{t1.length > 0 && <TableCell className={cn(N, "font-semibold")}>{fmtN(s1)}</TableCell>}{t2.map((term) => cell(alt, term.key))}<TableCell className={cn(N, "font-semibold")}>{fmtN(s2)}</TableCell></TableRow>;
      })}</TableBody>
    </Table>
  );
}
