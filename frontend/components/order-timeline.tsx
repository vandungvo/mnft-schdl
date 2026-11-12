"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { useI18n } from "@/components/i18n-provider";
import { hours, type Delivery } from "@/lib/decision";
import { supplyChain } from "@/lib/explain";
import { formatClock, formatDay, formatDuration, productLabel, stageLabel } from "@/lib/format";
import { plantOf } from "@/lib/plant";
import type { AnySchedulingInput, ScheduleOperation } from "@/lib/types";
import { cn } from "@/lib/utils";

const LEFT = 170;
const RIGHT = 96;
const ROW = 30;
const TOP = 30;
const STAGE_COLORS = ["var(--chart-1)", "var(--chart-4)", "var(--chart-3)", "var(--chart-5)", "var(--chart-6)", "var(--chart-2)"];

/** Order-centric view of a schedule (one row per order): its window from release to due, the runs that
    feed it, and where it lands against the due date. The machine Gantt answers "what does each machine do";
    this answers "where is my order". */
export function OrderTimeline({ input, operations, origin, horizon, deliveries, focusOrder, onOrder }: {
  input: AnySchedulingInput; operations: ScheduleOperation[]; origin: string; horizon: number; deliveries: Delivery[];
  focusOrder: string | null; onOrder: (order: string | null) => void;
}) {
  const { t } = useI18n();
  const frame = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(1100);
  useEffect(() => {
    const el = frame.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => setWidth(Math.round(entry.contentRect.width)));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  const plant = plantOf(input);
  const [lateFirst, setLateFirst] = useState(false);

  const rows = useMemo(() => {
    const release = new Map(plant.orders.map((order) => [order.id, order]));
    return deliveries.map((d) => {
      const order = release.get(d.order);
      const steps = Object.keys(order?.lot_allocations ?? {}).flatMap((lot) => supplyChain(input, operations, lot));
      const ops = [...new Map(steps.map((step) => [step.op.id, step.op])).values()];
      return { d, release: order?.release ?? 0, ops };
    }).sort((a, b) => (lateFirst ? b.d.tardiness - a.d.tardiness : 0) || a.d.due - b.d.due);
  }, [deliveries, input, operations, plant, lateFirst]);

  const end = Math.max(horizon, ...deliveries.map((d) => (Number.isFinite(d.time) ? d.time : 0)));
  const days = Math.max(1, Math.ceil(end / 1440));
  const plotWidth = Math.max(days * 40, width - LEFT - RIGHT - 8);
  const scale = plotWidth / (days * 1440);
  const x = (minute: number) => LEFT + minute * scale;
  const height = TOP + rows.length * ROW + 8;
  const late = deliveries.filter((d) => d.tardiness > 0).length;

  return (
    <div ref={frame} className="min-w-0">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 pt-4 pb-3 text-[12.5px] text-muted-foreground">
        {plant.stages.map((stage, index) => <span key={stage} className="inline-flex items-center gap-1.5"><i className="inline-block h-2.5 w-3.5 rounded-xs" style={{ background: STAGE_COLORS[index % STAGE_COLORS.length] }} />{stageLabel(stage)}</span>)}
        <span className="inline-flex items-center gap-1.5"><i className="inline-block h-2.5 w-3.5 rounded-xs bg-shift" />{t("Từ phát hành tới hạn", "Release to due")}</span>
        <span className="inline-flex items-center gap-1.5"><i className="inline-block h-2.5 w-3.5 rounded-xs bg-destructive/20" />{t("Phần trễ", "Late part")}</span>
        <label className="ml-auto flex items-center gap-2"><input type="checkbox" className="accent-[var(--primary)]" checked={lateFirst} onChange={(event) => setLateFirst(event.target.checked)} />{t(`Đơn trễ lên đầu (${late})`, `Late orders first (${late})`)}</label>
      </div>
      <div className="overflow-x-auto border-t bg-card">
        <svg width={LEFT + plotWidth + RIGHT} height={height} className="viz block" role="group" aria-label={t(`Tiến độ ${rows.length} đơn hàng`, `Progress of ${rows.length} orders`)}>
          {Array.from({ length: days + 1 }, (_, day) => (
            <g key={day}>
              <line x1={x(day * 1440)} x2={x(day * 1440)} y1={TOP - 8} y2={height - 8} className={day % 7 === 0 ? "g-day" : "grid-line"} />
              {day < days && scale * 1440 >= 34 && <text x={x(day * 1440) + 3} y={TOP - 12} className="tick">{formatDay(origin, day * 1440).replace(/^.*?,\s*/, "")}</text>}
            </g>
          ))}
          {rows.map(({ d, release, ops }, index) => {
            const y = TOP + index * ROW;
            const isLate = d.tardiness > 0;
            const focus = focusOrder === d.order;
            const select = () => onOrder(focus ? null : d.order);
            return (
              <g key={d.order} className={cn("o-row", focus && "is-focus")} role="button" tabIndex={0}
                aria-label={t(`Đơn ${d.order}, ${productLabel(d.product)} ${d.quantity}, hạn ${formatClock(origin, d.due)}${isLate ? `, trễ ${formatDuration(d.tardiness)}` : ""}`, `Order ${d.order}, ${productLabel(d.product)} ${d.quantity}, due ${formatClock(origin, d.due)}${isLate ? `, ${formatDuration(d.tardiness)} late` : ""}`)}
                onClick={select} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); select(); } }}>
                <rect x={0} y={y} width={LEFT + plotWidth + RIGHT} height={ROW} className="o-hover" />
                <text x={6} y={y + ROW / 2 + 4} className="g-machine">{d.order}<tspan className="g-stage" dx={6}>{productLabel(d.product)} · {d.quantity}</tspan></text>
                <rect x={x(release)} y={y + 6} width={Math.max(1, x(d.due) - x(release))} height={ROW - 12} rx={3} className="o-window" />
                {isLate && Number.isFinite(d.time) && <rect x={x(d.due)} y={y + 6} width={Math.max(1, x(d.time) - x(d.due))} height={ROW - 12} rx={2} className="o-late" />}
                {ops.map((op) => <rect key={op.id} x={x(op.block_start)} y={y + 10} width={Math.max(1.5, x(op.end) - x(op.block_start))} height={ROW - 20} rx={1.5}
                  style={{ fill: STAGE_COLORS[plant.stages.indexOf(op.stage) % STAGE_COLORS.length] }}><title>{`${stageLabel(op.stage)} · ${op.machine}\n${formatClock(origin, op.block_start)} → ${formatClock(origin, op.end)}\n${op.lot}`}</title></rect>)}
                <line x1={x(d.due)} x2={x(d.due)} y1={y + 3} y2={y + ROW - 3} className="o-due" />
                {Number.isFinite(d.time) && (isLate
                  ? <path d={`M ${x(d.time)} ${y + ROW / 2 - 5} L ${x(d.time) + 5} ${y + ROW / 2} L ${x(d.time)} ${y + ROW / 2 + 5} L ${x(d.time) - 5} ${y + ROW / 2} Z`} className="g-ship-dot is-late" />
                  : <circle cx={x(d.time)} cy={y + ROW / 2} r={3.5} className="g-ship-dot" />)}
                <text x={LEFT + plotWidth + 8} y={y + ROW / 2 + 4} className={isLate ? "g-ship-label is-late" : "g-ship-label"}>{isLate ? `${t("trễ", "late")} ${hours(d.tardiness)}` : Number.isFinite(d.time) ? t("đúng hạn", "on time") : t("chưa xếp", "unscheduled")}</text>
              </g>
            );
          })}
        </svg>
      </div>
      <p className="px-4 pt-2.5 pb-3.5 text-[13px] text-muted-foreground">{t("Mỗi dòng là một đơn: nền xanh nhạt từ lúc phát hành tới hạn, vạch đậm là hạn giao, thanh màu là các lượt cấp hàng theo công đoạn (lượt gần nhất của từng mã bán thành phẩm). Bấm một dòng để xem vì sao đơn đó trễ hoặc kịp hạn.", "One row per order: pale band from release to due, the thick tick is the due date, coloured bars are the runs feeding it by stage (the nearest run of each semi-finished item). Click a row to see why it is late or on time.")}</p>
    </div>
  );
}
