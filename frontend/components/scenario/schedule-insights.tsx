"use client";

import { AlertTriangle, CheckCircle2, Clock, Pencil, Sparkles, X } from "lucide-react";
import { useMemo, type ReactNode } from "react";

import { Hint, Panel, StatTile } from "@/components/blocks";
import type { WorkspaceCtx } from "@/components/decision/sections";
import { useI18n } from "@/components/i18n-provider";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { fmtN, hours, isPlannerRun, lateMinutes, opsCost, type Alternative } from "@/lib/decision";
import type { DecisionEntry } from "@/lib/decision-log";
import { explainOrder, machineLoad, optimiserVerdict, type Cause } from "@/lib/explain";
import { formatClock, formatDay, formatDuration, formatNumber, productLabel, runLabel, stageLabel } from "@/lib/format";
import { tr as t2 } from "@/lib/locale";
import { plantOf } from "@/lib/plant";
import { cn } from "@/lib/utils";

const N = "text-right tabular-nums";

/* ---------- why an order is late (or on time) ---------- */

export function WhyOrderPanel({ ctx, alt, order, onClose, onEdit }: { ctx: WorkspaceCtx; alt: Alternative; order: string; onClose: () => void; onEdit?: () => void }) {
  const { t } = useI18n();
  const why = useMemo(() => (ctx.input ? explainOrder(ctx.input, alt.run.operations, order) : null), [ctx.input, alt, order]);
  if (!why) return null;
  const { delivery: d, critical } = why;
  const late = d.tardiness > 0;
  const causeText = (cause: Cause): ReactNode => {
    switch (cause.kind) {
      case "wait": {
        const parts = [
          cause.busyWith.length ? t(`máy bận với ${cause.busyWith.length} lượt khác (${cause.busyWith.slice(0, 3).join(", ")}${cause.busyWith.length > 3 ? "…" : ""})`, `the machine was busy with ${cause.busyWith.length} other runs (${cause.busyWith.slice(0, 3).join(", ")}${cause.busyWith.length > 3 ? "…" : ""})`) : null,
          cause.offShift >= 60 ? t(`${hours(cause.offShift)} nằm ngoài ca đang mở`, `${hours(cause.offShift)} fell outside open shifts`) : null,
        ].filter(Boolean).join("; ");
        return <>{t(`Hàng chờ lâu nhất ở ${stageLabel(cause.stage)} (${cause.machine}): ${hours(cause.wait)} từ lúc bán thành phẩm sẵn sàng tới lúc bắt đầu`, `Longest wait at ${stageLabel(cause.stage)} (${cause.machine}): ${hours(cause.wait)} from material ready to start`)}{parts ? ` — ${parts}.` : "."}
          {cause.closedShifts > 0 && <> <b>{t(`Còn ${cause.closedShifts} ca của ${cause.machine} chưa mở trong khoảng chờ này`, `${cause.closedShifts} shifts of ${cause.machine} stay closed during that wait`)}</b>{t(": mở thêm ca hoặc dời lượt sang máy khác có thể rút ngắn trễ.", ": opening one or moving the run to another machine may cut the delay.")}</>}</>;
      }
      case "load": return t(`${stageLabel(cause.stage)} dùng ${Math.round(cause.ratio * 100)}% thời gian ca trong lúc đơn chờ (${formatDay(ctx.origin, cause.from)} → ${formatDay(ctx.origin, cause.to)}) — đây là công đoạn nghẽn đơn này phải chen vào.`, `${stageLabel(cause.stage)} uses ${Math.round(cause.ratio * 100)}% of its shift time while the order was open (${formatDay(ctx.origin, cause.from)} → ${formatDay(ctx.origin, cause.to)}) — the bottleneck this order competes for.`);
      case "overtaken": return t(`${cause.count} lượt của đơn có hạn muộn hơn được làm trước ở công đoạn cuối (${cause.machines.join(", ")}).`, `${cause.count} runs of orders due later went first at the last stage (${cause.machines.join(", ")}).`);
      case "release": return t(`Đơn phát hành lúc ${formatClock(ctx.origin, cause.release)}; riêng thời gian gia công chuỗi cấp hàng đã là ${hours(cause.processing)}, nên dù không chờ cũng khó kịp hạn.`, `Released at ${formatClock(ctx.origin, cause.release)}; the supply chain alone takes ${hours(cause.processing)} of processing, so it can hardly make the due date even with no waiting.`);
    }
  };
  return (
    <Panel title={<span className="flex items-center gap-2">{late ? <AlertTriangle className="size-4 text-destructive" /> : <CheckCircle2 className="size-4 text-success" />}
      {late ? t(`Vì sao đơn ${d.order} trễ ${hours(d.tardiness)}?`, `Why is order ${d.order} ${hours(d.tardiness)} late?`) : t(`Đơn ${d.order} kịp hạn`, `Order ${d.order} is on time`)}</span>}
      description={`${productLabel(d.product)} · ${fmtN(d.quantity)} · ${t("hạn", "due")} ${formatClock(ctx.origin, d.due)} · ${Number.isFinite(d.time) ? `${t("giao", "delivered")} ${formatClock(ctx.origin, d.time)}` : t("chưa xếp", "not scheduled")}${why.lots > 1 ? ` · ${why.lots} ${t("lô", "lots")}` : ""}`}
      actions={<div className="flex gap-2">
        {onEdit && <Button size="sm" variant="outline" onClick={onEdit}><Pencil />{t("Sửa lịch bằng tay", "Edit by hand")}</Button>}
        <Button size="icon" variant="ghost" className="size-8" onClick={onClose} aria-label={t("Đóng", "Close")}><X /></Button>
      </div>}>
      {late && (why.causes.length ? <ul className="mb-3 grid gap-1.5 text-sm">{why.causes.map((cause, index) => <li key={index} className="flex gap-2"><span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-destructive" aria-hidden /><span>{causeText(cause)}</span></li>)}</ul>
        : <p className="mb-3 text-sm text-muted-foreground">{t("Không thấy chỗ chờ lớn nào: chuỗi cấp hàng chạy liền mạch nhưng vẫn xong sau hạn.", "No long wait found: the supply chain runs back to back but still ends after the due date.")}</p>)}
      {critical.length > 0 && <>
        <h4 className="mb-1 text-xs font-semibold text-muted-foreground">{t("Chuỗi cấp hàng của lô xong muộn nhất", "Supply chain of the lot that finished last")}</h4>
        <Table>
          <TableHeader><TableRow><TableHead>{t("Công đoạn", "Stage")}</TableHead><TableHead>{t("Lượt", "Run")}</TableHead><TableHead>{t("Máy", "Machine")}</TableHead><TableHead>{t("Bắt đầu → xong", "Start → end")}</TableHead><TableHead className={N}>{t("Chờ trước đó", "Waited before")}</TableHead></TableRow></TableHeader>
          <TableBody>{critical.map((step) => (
            <TableRow key={step.op.id}>
              <TableCell>{stageLabel(step.op.stage)}</TableCell>
              <TableCell>{runLabel(step.op.lot, step.op.item)}</TableCell>
              <TableCell>{step.op.machine}</TableCell>
              <TableCell className="whitespace-nowrap">{formatClock(ctx.origin, step.op.block_start)} → {formatClock(ctx.origin, step.op.end)}</TableCell>
              <TableCell className={cn(N, step.wait >= 8 * 60 && "font-semibold text-destructive")}>{step.ready == null ? "—" : step.wait ? hours(step.wait) : t("không chờ", "none")}</TableCell>
            </TableRow>
          ))}</TableBody>
        </Table>
      </>}
      <Hint>{t("Ở mô hình 5 công đoạn, bán thành phẩm không gắn sẵn với đơn: mỗi bước lấy lượt gần nhất của mã cần dùng đã xong trước khi bước sau bắt đầu. Đây là gợi ý để biết nên sửa ở đâu, không phải ràng buộc của solver.", "In the 5-stage model semi-finished stock is not pegged to orders: each step takes the latest run of the needed item that finished before the next step started. This points at where to act; it is not a solver constraint.")}</Hint>
    </Panel>
  );
}

/* ---------- machine × day load ---------- */

export function LoadHeatmap({ ctx, alt, embedded }: { ctx: WorkspaceCtx; alt: Alternative; /** Drawn inside another panel: no frame of its own. */ embedded?: boolean }) {
  const { t } = useI18n();
  const rows = useMemo(() => (ctx.input ? machineLoad(plantOf(ctx.input), alt.run.operations, alt.run.horizon_minutes) : []), [ctx.input, alt]);
  if (!rows.length) return null;
  const days = rows[0].days.length;
  const cell = (busy: number, capacity: number) => {
    if (!capacity) return { background: "var(--muted)", text: "—" };
    const ratio = busy / capacity;
    return { background: `color-mix(in srgb, ${ratio >= 0.9 ? "var(--warning)" : "var(--primary)"} ${Math.round(8 + Math.min(1, ratio) * 72)}%, var(--card))`, text: `${Math.round(ratio * 100)}`, strong: ratio >= 0.5 };
  };
  return (
    <Panel className={cn(embedded && "border-0 p-0 shadow-none sm:p-0")} title={t("Tải máy theo ngày", "Machine load by day")} description={t("Phần trăm thời gian ca máy bận (gồm chuẩn bị và bảo trì). Ô cam ≥ 90%: máy gần kín — nút cổ chai.", "Share of rostered time each machine is busy (setup and maintenance included). Orange ≥ 90%: nearly full — a bottleneck.")}>
      <div className="overflow-x-auto">
        <table className="w-full border-separate border-spacing-0.5 text-[11px] tabular-nums">
          <thead><tr><th className="sticky left-0 bg-card pr-2 text-left font-semibold text-muted-foreground">{t("Máy", "Machine")}</th>
            {Array.from({ length: days }, (_, day) => <th key={day} className="min-w-9 font-medium text-muted-foreground">{formatDay(ctx.origin, day * 1440).replace(/^.*?,\s*/, "")}</th>)}
            <th className="pl-2 text-right font-semibold text-muted-foreground">{t("Cả kỳ", "Period")}</th></tr></thead>
          <tbody>{rows.map((row) => {
            const total = cell(row.total.busy, row.total.capacity);
            return <tr key={row.machine}>
              <th className="sticky left-0 bg-card pr-2 text-left font-semibold whitespace-nowrap">{row.machine} <span className="font-normal text-muted-foreground">{stageLabel(row.stage)}</span></th>
              {row.days.map((day, index) => { const c = cell(day.busy, day.capacity); return <td key={index} className={cn("h-7 rounded-sm text-center", c.strong && "font-semibold")} style={{ background: c.background }} title={`${row.machine} · ${formatDay(ctx.origin, index * 1440)}: ${formatDuration(day.busy)} / ${formatDuration(day.capacity)}`}>{c.text}</td>; })}
              <td className="pl-2 text-right font-semibold">{total.text}%</td>
            </tr>;
          })}</tbody>
        </table>
      </div>
    </Panel>
  );
}

/* ---------- did the optimiser earn its time? ---------- */

export function OptimiserNotice({ ctx, onThorough }: { ctx: WorkspaceCtx; onThorough?: () => void }) {
  const { t } = useI18n();
  const verdict = optimiserVerdict(ctx.alts, ctx.weights, ctx.policy);
  if (!verdict || verdict.improved) return null;
  return (
    <Alert className="border-warning/40 bg-warning-soft text-warning">
      <Sparkles />
      <AlertDescription className="flex flex-wrap items-center gap-x-3 gap-y-2 text-warning">
        <span className="min-w-0 flex-1">
          <b>{t(`Bộ tối ưu chưa tìm được lịch tốt hơn luật điều độ (ngân sách ${verdict.budget} giây).`, `The optimiser found nothing better than the dispatching rules (budget ${verdict.budget} s).`)}</b>{" "}
          {verdict.fallback ? t("CP-SAT hết giờ trước khi cải thiện nên giữ lịch EDD. ", "CP-SAT ran out of time before improving, so the EDD schedule was kept. ") : ""}
          {t("Với kỳ 2 tuần, CP-SAT thường cần từ 2 phút mỗi lần chạy; mức “Kỹ” cho nó 5 phút và thêm thuật toán tìm kiếm.", "For a 2-week period CP-SAT usually needs 2 minutes or more per run; “Thorough” gives it 5 minutes and adds search methods.")}
        </span>
        {onThorough && <Button size="sm" variant="outline" className="bg-card/60" onClick={onThorough}><Sparkles />{t("Sinh với mức Kỹ", "Generate with Thorough")}</Button>}
      </AlertDescription>
    </Alert>
  );
}

/** One line on what really separates the recommended options, so a 0.07 % cost gap does not look like a choice. */
export function differenceNote(ctx: WorkspaceCtx): string | null {
  const shown = ctx.list.keys.map((id) => ctx.byId.get(id)).filter((alt): alt is Alternative => Boolean(alt));
  if (shown.length < 2) return null;
  const axes: Array<{ name: [string, string]; values: number[]; fmt: (v: number) => string }> = [
    { name: ["số đơn trễ", "late orders"], values: shown.map((alt) => alt.late), fmt: (v) => fmtN(v) },
    { name: ["tổng trễ", "total lateness"], values: shown.map((alt) => lateMinutes(alt, ctx.input)), fmt: hours },
    { name: ["thiếu tồn an toàn", "safety shortfall"], values: shown.map((alt) => alt.metrics.safety_shortfall ?? 0), fmt: (v) => `${fmtN(v)} ${t2("sp", "units")}` },
    { name: ["chi phí vận hành", "operating cost"], values: shown.map((alt) => opsCost(alt, ctx.weights)), fmt: fmtN },
  ];
  const same: string[] = [], differ: string[] = [];
  for (const axis of axes) {
    const lo = Math.min(...axis.values), hi = Math.max(...axis.values);
    const rel = (hi - lo) / Math.max(Math.abs(hi), 1);
    if (rel < 0.01) same.push(hi === lo ? `${t2(...axis.name)} (${axis.fmt(hi)})` : `${t2(...axis.name)} (${t2("chênh", "within")} ${formatNumber(rel * 100, { maximumFractionDigits: 2 })}%)`);
    else differ.push(`${t2(...axis.name)} (${axis.fmt(lo)} – ${axis.fmt(hi)})`);
  }
  if (!same.length) return null;
  return differ.length
    ? t2(`Các đề xuất gần như bằng nhau về ${same.join(", ")}; khác nhau thật ở ${differ.join(", ")}.`, `The recommended options are practically equal on ${same.join(", ")}; they really differ on ${differ.join(", ")}.`)
    : t2(`Các đề xuất gần như bằng nhau ở mọi mặt (${same.join(", ")}).`, `The recommended options are practically equal on every axis (${same.join(", ")}).`);
}


/* ---------- how the period's scheduling went (product metrics) ---------- */

export function PeriodMetrics({ ctx, entries }: { ctx: WorkspaceCtx; entries: DecisionEntry[] }) {
  const { t } = useI18n();
  const runs = ctx.alts.map((alt) => alt.run);
  if (!runs.length) return null;
  const first = Math.min(...runs.map((run) => new Date(run.created_at).getTime()));
  const decided = entries.length ? new Date(entries[0].at).getTime() : null;
  const manual = ctx.alts.filter((alt) => isPlannerRun(alt.algorithm)).length;
  const verdict = optimiserVerdict(ctx.alts, ctx.weights, ctx.policy);
  const minutes = decided != null ? Math.max(0, (decided - first) / 60_000) : null;
  return (
    <div className="grid gap-2">
      <h3 className="text-sm font-semibold">{t("Kỳ này lập lịch thế nào", "How this period's scheduling went")}</h3>
      <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
        <StatTile label={<span className="inline-flex items-center gap-1"><Clock className="size-3.5" />{t("Từ lần sinh đầu tới lúc chốt", "First generation to commit")}</span>} value={minutes == null ? t("chưa chốt", "not yet") : minutes < 120 ? `${Math.round(minutes)} ${t("phút", "min")}` : hours(minutes)} />
        <StatTile label={t("Lần chốt", "Commits")} value={String(entries.length)} hint={entries.length > 1 ? t("có chốt lại", "re-committed") : undefined} />
        <StatTile label={t("Bản sửa tay / tối ưu quanh bản sửa", "Hand edits / re-optimisations")} value={String(manual)} />
        <StatTile label={t("Bộ tối ưu hơn luật?", "Optimiser beat the rules?")} tone={verdict == null ? "default" : verdict.improved ? "ok" : "warn"} value={verdict == null ? "—" : verdict.improved ? t("Có", "Yes") : t("Chưa", "Not yet")} />
      </div>
      <Hint className="mt-0">{t("Ba câu hỏi để biết công cụ có giúp được người lập lịch: ra quyết định nhanh không, có phải sửa tay nhiều không, và thời gian chạy tối ưu có đáng không.", "Three questions on whether the tool helps: is the decision quick, does the planner have to edit a lot, and is the optimiser's time worth it.")}</Hint>
    </div>
  );
}
