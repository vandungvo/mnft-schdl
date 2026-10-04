"use client";

import { CheckCircle2, ChevronDown } from "lucide-react";
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
  compareScore, fmtN, fmtScore, fmtSeconds, historyOf, hours, median, movedOperations, opsCost, policyOf, runSeconds, score, signed,
  termsOf, tierKeys, type Alternative, type Delivery, type PolicyKey, type Shortlist,
} from "@/lib/decision";
import type { DecisionEntry } from "@/lib/decision-log";
import { formatClock, formatDateTime, formatDuration, productLabel } from "@/lib/format";
import type { ScheduleRunDetail, SchedulingInputDocument } from "@/lib/types";
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
  input?: SchedulingInputDocument;
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
      <CollapsibleTrigger className="group inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline">
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

function Metric({ label, children, warn }: { label: string; children: ReactNode; warn?: boolean }) {
  return <span className="grid gap-0.5 bg-card px-2.5 py-2"><span className="text-[11px] text-muted-foreground">{label}</span><b className={cn("font-semibold tabular-nums", warn && "text-warning")}>{children}</b></span>;
}

export function AlternativeCards({ ctx, current, decided, onPick }: { ctx: WorkspaceCtx; current: string | null; decided: string | null; onPick: (id: string) => void }) {
  const { t } = useI18n();
  const base = ctx.byId.get(ctx.list.front[0]);
  return (
    <div className="grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(min(280px,100%),1fr))]" role="group" aria-label={t("Phương án đề xuất", "Recommended options")}>
      {ctx.list.keys.map((id, index) => {
        const alt = ctx.byId.get(id)!;
        const twins = ctx.list.twins[id] ?? [];
        const active = id === current;
        let trade = t("Rẻ nhất trong các phương án đề xuất.", "Cheapest of the recommended options.");
        if (base && id !== base.id) {
          const shiftDelta = signed(alt.shifts.size - base.shifts.size);
          const shortfallDelta = signed((alt.metrics.safety_shortfall ?? 0) - (base.metrics.safety_shortfall ?? 0));
          const costDelta = signed(opsCost(alt, ctx.weights) - opsCost(base, ctx.weights));
          trade = t(`So với “${ctx.displayName(base.id)}”: ${shiftDelta} ca-máy, ${shortfallDelta} thiếu tồn, ${costDelta} chi phí.`, `Versus “${ctx.displayName(base.id)}”: ${shiftDelta} machine-shifts, ${shortfallDelta} shortfall, ${costDelta} cost.`);
        }
        return (
          <button type="button" key={id} aria-pressed={active} onClick={() => onPick(id)}
            className={cn("group relative flex min-w-0 flex-col gap-3 rounded-lg border bg-card p-4 text-left shadow-card transition-[border-color,box-shadow] hover:border-primary/60 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
              active && "border-primary ring-1 ring-primary")}>
            <span className="flex items-start gap-2.5">
              <span className={cn("grid size-7 shrink-0 place-items-center rounded-md text-xs font-bold tabular-nums", index ? "bg-muted text-muted-foreground" : "bg-success-soft text-success")} aria-label={`${t("Hạng", "Rank")} ${index + 1}`}>#{index + 1}</span>
              <span className="grid min-w-0 flex-1">
                <span className="text-[15px] leading-tight font-semibold">{ctx.list.name[id]}</span>
                <span className="truncate text-xs text-muted-foreground">{algorithmInfo(alt.algorithm).label} · seed {alt.run.seed}</span>
              </span>
              {id === decided && <Badge variant="info"><CheckCircle2 />{t("Đã chốt", "Committed")}</Badge>}
            </span>
            <span className="grid grid-cols-2 gap-px overflow-hidden rounded-md border bg-border text-[13px]">
              <Metric label={t("Giao đúng hạn", "On-time")} warn={alt.late > 0}>{ctx.nOrders - alt.late}/{ctx.nOrders}</Metric>
              <Metric label={t("Thiếu tồn an toàn", "Safety shortfall")} warn={(alt.metrics.safety_shortfall ?? 0) > 0}>{fmtN(alt.metrics.safety_shortfall ?? 0)}</Metric>
              <Metric label={t("Ca-máy bật", "Machine-shifts")}>{alt.shifts.size}</Metric>
              <Metric label={t("Chi phí vận hành", "Operating cost")}>{fmtN(opsCost(alt, ctx.weights))}</Metric>
            </span>
            <span className="text-[13px] leading-snug text-muted-foreground">{trade}</span>
            <span className="mt-auto flex items-center justify-between gap-2 border-t pt-2.5 text-xs">
              <span className="text-muted-foreground">{t("Điểm", "Score")} <b className="font-semibold text-foreground tabular-nums">{fmtScore(score(alt, ctx.weights, ctx.policy), ctx.policy)}</b></span>
              {active ? <span className="font-semibold text-primary">{t("Đang xem", "Viewing")}</span> : <span className="font-medium text-muted-foreground group-hover:text-primary">{t("Xem lịch", "View schedule")} →</span>}
            </span>
            {twins.length > 0 && <span className="text-xs text-muted-foreground">{t("Trùng kết quả với", "Same result as")} {twins.map(ctx.displayName).join(", ")}</span>}
          </button>
        );
      })}
    </div>
  );
}

/* ---------- schedule stats & compare ---------- */

export function StatTiles({ ctx, alt }: { ctx: WorkspaceCtx; alt: Alternative }) {
  const { t } = useI18n();
  const m = alt.metrics;
  const items: Array<[string, string, Tone]> = [
    [t("Đơn trễ", "Late orders"), `${alt.late} / ${ctx.nOrders}`, alt.late ? "warn" : "ok"],
    [t("Ca-máy bật", "Machine-shifts open"), String(alt.shifts.size), "default"],
    [t("Thời gian rảnh", "Idle time"), formatDuration(m.idle_minutes ?? 0), "default"],
    ["Setup", formatDuration(m.setup_minutes ?? 0), "default"],
    [t("Lô bắt buộc cuối xong", "Last required lot done"), formatClock(ctx.origin, m.makespan ?? 0), "default"],
    [t("Thiếu tồn an toàn", "Safety-stock shortfall"), fmtN(m.safety_shortfall ?? 0), m.safety_shortfall ? "warn" : "ok"],
    [`${t("Điểm", "Score")} (${policyOf(ctx.policy).name.toLowerCase()})`, fmtScore(score(alt, ctx.weights, ctx.policy), ctx.policy), "default"],
  ];
  return <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-7">{items.map(([label, value, tone]) => <StatTile key={label} label={label} value={value} tone={tone} className="[&>div:nth-child(2)]:text-lg" />)}</div>;
}

export function DiffCard({ ctx, a, b }: { ctx: WorkspaceCtx; a: Alternative; b: Alternative }) {
  const { t } = useI18n();
  const nA = ctx.displayName(a.id), nB = ctx.displayName(b.id);
  const rows: Array<[string, (x: Alternative) => number, ((v: number) => string)?]> = [
    [t("Đơn trễ", "Late orders"), (x) => x.late],
    [t("Trễ có trọng số", "Weighted tardiness"), (x) => x.metrics.weighted_tardiness ?? 0],
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
          <TableRow><TableCell>{t("Điểm", "Score")} ({policyOf(ctx.policy).name.toLowerCase()})</TableCell><TableCell className={N}>{fmtScore(score(a, ctx.weights, ctx.policy), ctx.policy)}</TableCell><TableCell className={N}>{fmtScore(score(b, ctx.weights, ctx.policy), ctx.policy)}</TableCell>
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
      <div className="max-h-[440px] overflow-y-auto">
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
  const input = ctx.input;
  if (!input) return null;
  return (
    <Panel title={t("Tồn thành phẩm cuối kỳ", "Closing finished-goods stock")}>
      <Table>
        <TableHeader><TableRow><TableHead>{t("Sản phẩm", "Product")}</TableHead><TableHead className={N}>{t("Đầu kỳ", "Opening")}</TableHead><TableHead className={N}>{t("Cuối kỳ", "Closing")}</TableHead><TableHead className={N}>{t("An toàn", "Safety")}</TableHead><TableHead className="w-32">{t("So với an toàn", "Versus safety")}</TableHead></TableRow></TableHeader>
        <TableBody>{input.products.map((p) => {
          const value = end[p] ?? 0, safe = input.safety_stock[p] ?? 0;
          const ratio = Math.min(1.5, safe ? value / safe : 1.5);
          return <TableRow key={p}><TableCell><span className="inline-flex items-center gap-2"><i className="size-2.5 rounded-xs" style={{ background: productColor(p, input.products)[0] }} />{productLabel(p)}</span></TableCell>
            <TableCell className={N}>{fmtN(input.initial_inventory[p] ?? 0)}</TableCell><TableCell className={cn(N, "font-semibold", value < safe && "text-warning")}>{fmtN(value)}</TableCell><TableCell className={N}>{fmtN(safe)}</TableCell>
            <TableCell><Meter value={ratio / 1.5} marker={1 / 1.5} tone={value < safe ? "warn" : "ok"} label={`${fmtN(value)} / ${fmtN(safe)}`} /></TableCell></TableRow>;
        })}</TableBody>
      </Table>
      <Hint>{t(`Tồn an toàn được đo ở ${input.checkpoints.length} mốc cuối ngày; bảng này chỉ là mốc cuối kỳ. Vạch dọc trên thanh là mức tồn an toàn.`, `Safety stock is measured at ${input.checkpoints.length} end-of-day checkpoints; this table shows only the final one. The vertical tick on each bar marks the safety level.`)}</Hint>
    </Panel>
  );
}

export function WhyCards({ ctx, alt }: { ctx: WorkspaceCtx; alt: Alternative }) {
  const { t } = useI18n();
  const info = algorithmInfo(alt.algorithm);
  const items: Array<[string, string]> = [[`${ctx.displayName(alt.id)} — ${info.label}`, info.note], ...familyWhy(info.family)];
  if (alt.run.solver_status) items.push([t("Trạng thái solver", "Solver status"), `${alt.run.solver_status}${alt.run.validation ? ` · ${t("bộ kiểm độc lập", "independent validator")}: ${alt.run.validation.valid ? t("hợp lệ", "valid") : t("lỗi", "invalid")} (${alt.run.validation.operations_checked ?? alt.run.operations.length} ${t("lượt", "operations")})` : ""}.`]);
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
    return { algorithm, list, ok, best, bestAt, seconds: median(list.map(runSeconds).filter((v): v is number => v != null)), statuses: [...new Set(list.map((run) => run.solver_status ?? run.status))] };
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
      <Panel title={t("Điểm tốt nhất tìm được theo thời gian", "Best score found over time")}>
        <div className="overflow-x-auto"><ConvergenceChart series={series} budget={budget} /></div>
        <Hint>{t("Mỗi đường là lần chạy tốt nhất của một thuật toán: điểm tốt nhất tìm được tới thời điểm đó (bậc thang, chỉ đi xuống). Luật điều độ dựng lịch một lần nên không có đường.", "Each line is an algorithm's best run: the best score found up to that time (a step line that only goes down). Dispatching rules build once, so they have no line.")}</Hint>
      </Panel>
      <Panel title={t("Thời gian và chất lượng theo thuật toán", "Time and quality by algorithm")}>
        <Table>
          <TableHeader><TableRow><TableHead>{t("Thuật toán", "Algorithm")}</TableHead><TableHead className={N}>{t("Có lịch / lần chạy", "Schedules / runs")}</TableHead><TableHead className={N}>{t("Thời gian / lần", "Time / run")}</TableHead><TableHead className={N}>{t("Đạt lịch tốt nhất sau", "Best found after")}</TableHead><TableHead className={N}>{t("Điểm tốt nhất", "Best score")}</TableHead><TableHead className={N}>{t("Điểm trung vị", "Median score")}</TableHead><TableHead className={N}>{t("Đơn trễ", "Late orders")}</TableHead><TableHead>{t("Trạng thái", "Status")}</TableHead></TableRow></TableHeader>
          <TableBody>{groups.map((g) => {
            const objectives = g.ok.map((run) => ctx.byId.get(run.id)?.metrics.objective).filter((v): v is number => typeof v === "number");
            return <TableRow key={g.algorithm}>
              <TableCell className="font-semibold">{algorithmInfo(g.algorithm).label}</TableCell>
              <TableCell className={cn(N, g.ok.length < g.list.length && "font-semibold text-warning")}>{g.ok.length} / {g.list.length}</TableCell>
              <TableCell className={N}>{fmtSeconds(g.seconds)}</TableCell>
              <TableCell className={N}>{g.best ? <>{fmtSeconds(g.bestAt)}<span className="block text-xs text-muted-foreground">seed {g.best.run.seed}</span></> : "—"}</TableCell>
              <TableCell className={N}>{g.best ? fmtScore(score(g.best, ctx.weights, ctx.policy), ctx.policy) : "—"}</TableCell>
              <TableCell className={N}>{objectives.length ? fmtN(median(objectives)!) : "—"}</TableCell>
              <TableCell className={N}>{g.best ? `${g.best.late} / ${ctx.nOrders}` : "—"}</TableCell>
              <TableCell className="text-xs text-muted-foreground">{g.statuses.join(", ")}</TableCell>
            </TableRow>;
          })}</TableBody>
        </Table>
        <Hint>{t("Thời gian là thời gian thuật toán chạy trên worker (tính cả dựng mô hình). “Điểm trung vị” là tổng mục tiêu có trọng số qua các seed có lịch.", "Time is the algorithm's run time on the worker (including model building). “Median score” is the weighted objective across seeds that produced a schedule.")}</Hint>
      </Panel>
    </div>
  );
}

/* ---------- decision ---------- */

export function DecisionPanel({ ctx, alt, entries, onSave }: { ctx: WorkspaceCtx; alt: Alternative; entries: DecisionEntry[]; onSave: (reason: string) => boolean }) {
  const { t } = useI18n();
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState("");
  return (
    <Panel>
      <p className="mb-4 text-sm leading-relaxed">{t("Bạn đang chốt", "You are committing")}: <b>{ctx.displayName(alt.id)}</b> <span className="text-muted-foreground">({algorithmInfo(alt.algorithm).label}, seed {alt.run.seed})</span> · {t("chính sách", "policy")} <b>{policyOf(ctx.policy).name}</b> · {t("giao đúng hạn", "on time")} {ctx.nOrders - alt.late}/{ctx.nOrders} · {t("thiếu tồn", "shortfall")} {fmtN(alt.metrics.safety_shortfall ?? 0)} · {alt.shifts.size} {t("ca-máy", "machine-shifts")}. <a href="#sec-choose" className="font-semibold text-primary hover:underline">{t("Đổi phương án", "Change option")}</a></p>
      <label className="grid gap-1.5">
        <span className="text-xs font-semibold text-muted-foreground">{t("Lý do chọn", "Reason")}</span>
        <Textarea id="decision-reason" rows={3} value={reason} onChange={(event) => { setReason(event.target.value); setMessage(""); }} placeholder={t("Ví dụ: chấp nhận bật thêm 3 ca để giữ đủ tồn an toàn F bạc cho đơn dài hạn.", "Example: accept 3 extra shifts to keep enough F silver safety stock for long-dated orders.")} />
      </label>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Button onClick={() => {
          if (!reason.trim()) { setMessage(t("Nhập lý do trước khi chốt — quyết định cần giải thích được.", "Enter a reason before committing — the decision must be explainable.")); return; }
          const ok = onSave(reason.trim());
          setMessage(ok ? t("Đã chốt phương án.", "Option committed.") : t("Trình duyệt không cho lưu; quyết định chưa được ghi.", "The browser blocked saving; the decision was not recorded."));
          if (ok) setReason("");
        }}><CheckCircle2 />{t("Chốt phương án này", "Commit this option")}</Button>
        <Button variant="outline" asChild><Link href={`/runs/${alt.id}`}>{t("Mở chi tiết lần chạy", "Open run details")}</Link></Button>
        <span className="text-sm text-muted-foreground" role="status">{message}</span>
      </div>
      {entries.length ? (
        <div className="mt-5">
          <Table>
            <TableHeader><TableRow><TableHead>{t("Thời điểm", "Time")}</TableHead><TableHead>{t("Phương án", "Option")}</TableHead><TableHead>{t("Chính sách", "Policy")}</TableHead><TableHead className={N}>{t("Đơn trễ", "Late orders")}</TableHead><TableHead className={N}>{t("Thiếu tồn", "Shortfall")}</TableHead><TableHead className={N}>{t("Ca-máy", "Machine-shifts")}</TableHead><TableHead>{t("Lý do", "Reason")}</TableHead></TableRow></TableHeader>
            <TableBody>{[...entries].reverse().map((entry) => (
              <TableRow key={entry.at + entry.runId}>
                <TableCell>{formatDateTime(entry.at)}</TableCell>
                <TableCell><Link className="font-semibold text-primary hover:underline" href={`/runs/${entry.runId}`}>{entry.alternative}</Link><span className="block text-xs text-muted-foreground">{entry.algorithm}</span></TableCell>
                <TableCell>{entry.policy}<span className="block text-xs text-muted-foreground">{entry.score}</span></TableCell>
                <TableCell className={N}>{entry.late}</TableCell><TableCell className={N}>{entry.shortfall}</TableCell><TableCell className={N}>{entry.shifts}</TableCell>
                <TableCell className={cn(WRAP, "min-w-60")}>{entry.reason}</TableCell>
              </TableRow>
            ))}</TableBody>
          </Table>
        </div>
      ) : <Hint>{t("Chưa chốt phương án nào cho bộ dữ liệu này.", "No option has been committed for this dataset yet.")}</Hint>}
      <Hint>{t("Nhật ký quyết định hiện lưu trên thiết bị này. Bước tiếp theo của sản phẩm: lưu vào cơ sở dữ liệu cùng snapshot, chính sách và người chọn.", "The decision log is stored on this device for now. Next product step: save it in the database with the snapshot, policy and who chose it.")}</Hint>
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
          <TableCell className={N}>{fmtSeconds(runSeconds(alt.run))}</TableCell><TableCell className="text-xs text-muted-foreground">{alt.run.solver_status}</TableCell>
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
