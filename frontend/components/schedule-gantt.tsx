"use client";

import { useMemo, useState, type KeyboardEvent, type MouseEvent } from "react";

import { useI18n } from "@/components/i18n-provider";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { activeShifts, type Delivery } from "@/lib/decision";
import { formatClock, formatDay, formatDuration, formatHour, productLabel, stageLabel } from "@/lib/format";
import type { ScheduleOperation, SchedulingInputDocument } from "@/lib/types";

const KNOWN_PRODUCT_COLORS: Record<string, [string, string]> = {
  F_SILVER: ["var(--p-f-silver)", "var(--on-light)"],
  F_BLACK: ["var(--p-f-black)", "var(--on-dark)"],
  R_SILVER: ["var(--p-r-silver)", "var(--on-light)"],
  R_BLACK: ["var(--p-r-black)", "var(--on-dark)"],
};
const PALETTE = ["var(--s1)", "var(--s2)", "var(--s3)", "var(--s4)", "var(--s5)", "var(--s6)"];

export function productColor(product: string, products: string[]): [string, string] {
  return KNOWN_PRODUCT_COLORS[product] ?? [PALETTE[Math.max(0, products.indexOf(product)) % PALETTE.length], "var(--on-dark)"];
}

interface Props {
  operations: ScheduleOperation[];
  input?: SchedulingInputDocument;
  origin: string;
  horizon: number;
  deliveries?: Delivery[];
  compare?: { operations: ScheduleOperation[]; label: string } | null;
}

const LEFT = 132;
const ROW = 42;
const TOP = 46;
const SHIP = 60;
const TICKS = [60, 120, 240, 360, 480, 720, 1440];

export function ScheduleGantt({ operations, input, origin, horizon, deliveries, compare }: Props) {
  const { t } = useI18n();
  const [zoom, setZoom] = useState(1);
  const [highlight, setHighlight] = useState<string | null>(null);
  const [focusId, setFocusId] = useState<number | null>(null);
  const [tip, setTip] = useState<{ x: number; y: number; title: string; lines: string[] } | null>(null);

  const lotIndex = useMemo(() => new Map((input?.lots ?? []).map((lot) => [lot.id, lot])), [input]);
  const productOf = (lot: string) => lotIndex.get(lot)?.product ?? lot.replace(/-.*$/, "");
  const products = useMemo(() => input?.products ?? [...new Set(operations.map((op) => productOf(op.lot)))], [input, operations]); // eslint-disable-line react-hooks/exhaustive-deps
  const lineOf = (lot: string) => input?.product_line[productOf(lot)] ?? productOf(lot);

  const machines = useMemo(() => {
    const present = new Set(operations.map((op) => op.machine));
    if (!input) return [...present];
    const stageOrder = input.stages;
    return Object.entries(input.machines)
      .filter(([id]) => present.has(id) || stageOrder.includes(input.machines[id].stage))
      .sort((a, b) => stageOrder.indexOf(a[1].stage) - stageOrder.indexOf(b[1].stage) || a[0].localeCompare(b[0]))
      .map(([id]) => id);
  }, [input, operations]);

  const end = Math.max(horizon, ...operations.map((op) => op.end), ...(deliveries ?? []).map((d) => (Number.isFinite(d.time) ? d.time : 0)));
  const days = Math.max(1, Math.ceil(end / 1440));
  const plotWidth = Math.max(860, days * (days <= 4 ? 360 : 150)) * zoom;
  const scale = plotWidth / (days * 1440);
  const x = (t: number) => LEFT + t * scale;
  const tick = TICKS.find((step) => step * scale >= 46) ?? 1440;
  const showShip = Boolean(deliveries?.length);
  const height = TOP + machines.length * ROW + (showShip ? SHIP : 8);
  const rowsBottom = TOP + machines.length * ROW;

  const shifts = useMemo(() => activeShifts(input, operations), [input, operations]);
  const compareShifts = useMemo(() => (compare ? activeShifts(input, compare.operations) : []), [compare, input]);
  const shiftKey = (s: { machine: string; shift: string }) => `${s.machine}|${s.shift}`;
  const mine = new Set(shifts.map(shiftKey));
  const theirs = new Set(compareShifts.map(shiftKey));

  const sorted = useMemo(() => [...operations].sort((a, b) => a.start - b.start), [operations]);
  const activeId = focusId ?? sorted[0]?.id;

  function describe(op: ScheduleOperation) {
    const lot = lotIndex.get(op.lot);
    const lines = [
      `${op.machine} · ${stageLabel(op.stage)} · ${t("ca", "shift")} ${op.shift}${op.mold ? ` · ${t("khuôn", "mold")} ${op.mold}` : ""}`,
      `${formatClock(origin, op.block_start)} → ${formatClock(origin, op.end)}`,
      `${t("Chạy", "Run")} ${formatDuration(op.end - op.start)}${op.setup_minutes ? ` · setup ${op.setup_minutes}'` : ""}${op.maintenance_minutes ? ` · ${t("bảo trì khuôn", "mold maintenance")} ${op.maintenance_minutes}'` : ""}`,
    ];
    if (lot) lines.push(`${productLabel(lot.product)} · ${lot.quantity} ${t("đơn vị", "units")} · ${t("đơn", "order")} ${lot.order}`);
    return { title: op.lot, lines };
  }

  function showTip(event: MouseEvent, op: ScheduleOperation) {
    const { title, lines } = describe(op);
    setTip({ x: event.clientX, y: event.clientY, title, lines });
  }

  function onKey(event: KeyboardEvent, op: ScheduleOperation) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      setHighlight((current) => (current === lineOf(op.lot) ? null : lineOf(op.lot)));
    }
    if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
      event.preventDefault();
      const index = sorted.findIndex((item) => item.id === op.id);
      const next = sorted[(index + (event.key === "ArrowRight" ? 1 : -1) + sorted.length) % sorted.length];
      setFocusId(next.id);
      const element = document.querySelector<SVGGElement>(`[data-op="${next.id}"]`);
      element?.focus();
    }
  }

  const ticks: number[] = [];
  for (let t = 0; t <= days * 1440; t += tick) ticks.push(t);

  return (
    <div className="min-w-0">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2.5 px-4 pt-4 pb-3">
        <div className="flex flex-wrap gap-x-3.5 gap-y-1.5 text-[12.5px] text-muted-foreground" aria-label={t("Chú giải", "Legend")}>
          {products.map((product) => <span key={product} className="inline-flex items-center gap-1.5"><i className="inline-block h-2.5 w-3.5 rounded-xs" style={{ background: productColor(product, products)[0] }} />{productLabel(product)}</span>)}
          <span className="inline-flex items-center gap-1.5"><i className="inline-block h-2.5 w-3.5 rounded-xs bg-setup" />Setup</span>
          <span className="inline-flex items-center gap-1.5"><i className="hatch-maint inline-block h-2.5 w-3.5 rounded-xs" />{t("Bảo trì khuôn", "Mold maintenance")}</span>
          <span className="inline-flex items-center gap-1.5"><i className="inline-block h-2.5 w-3.5 rounded-xs border bg-shift" />{t("Ca đang bật", "Open shift")}</span>
          {compare && <>
            <span className="inline-flex items-center gap-1.5"><i className="inline-block h-2.5 w-3.5 rounded-xs border-[1.8px] border-primary" />{t("Ca chỉ lịch này bật", "Shift open only in this schedule")}</span>
            <span className="inline-flex items-center gap-1.5"><i className="inline-block h-2.5 w-3.5 rounded-xs border-[1.8px] border-dashed border-warning" />{t("Ca chỉ", "Shift open only in")} “{compare.label}”{t(" bật", "")}</span>
          </>}
        </div>
        <ToggleGroup type="single" variant="outline" size="sm" value={String(zoom)} onValueChange={(value) => value && setZoom(Number(value))} aria-label={t("Thu phóng", "Zoom")}>
          {[0.75, 1, 2, 4].map((level) => <ToggleGroupItem key={level} value={String(level)} className="px-2.5 text-xs">{level}×</ToggleGroupItem>)}
        </ToggleGroup>
      </div>
      <div className="overflow-x-auto border-t bg-card" onMouseLeave={() => setTip(null)}>
        <svg width={LEFT + plotWidth + 16} height={height} role="img" aria-label={t(`Biểu đồ Gantt: ${operations.length} lượt trên ${machines.length} máy`, `Gantt chart: ${operations.length} operations on ${machines.length} machines`)} className={highlight ? "viz block is-dimmed" : "viz block"}>
          <defs>
            <pattern id="gantt-hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <rect width="6" height="6" style={{ fill: "var(--setup)" }} />
              <line x1="0" y1="0" x2="0" y2="6" style={{ stroke: "var(--maint)" }} strokeWidth="3" />
            </pattern>
          </defs>
          {machines.map((machine, index) => {
            const y = TOP + index * ROW;
            const def = input?.machines[machine];
            return <g key={machine}>
              {index > 0 && <line x1={LEFT} x2={LEFT + plotWidth} y1={y} y2={y} className="g-row" />}
              {shifts.filter((s) => s.machine === machine).map((s) => <rect key={s.shift} x={x(s.start)} y={y + 3} width={Math.max(1, x(s.end) - x(s.start))} height={ROW - 6} rx={3} className="g-shift" />)}
              {(def?.downtime ?? []).map(([a, z]) => <rect key={`d${a}`} x={x(a)} y={y + 3} width={Math.max(1, x(z) - x(a))} height={ROW - 6} rx={3} className="g-down"><title>{`${t("Dừng máy", "Downtime")} ${formatClock(origin, a)} → ${formatClock(origin, z)}`}</title></rect>)}
              {compare && compareShifts.filter((s) => s.machine === machine && !mine.has(shiftKey(s))).map((s) => <rect key={`t${s.shift}`} x={x(s.start) + 1} y={y + 4} width={Math.max(1, x(s.end) - x(s.start) - 2)} height={ROW - 8} rx={3} className="g-only-theirs" />)}
              {compare && shifts.filter((s) => s.machine === machine && !theirs.has(shiftKey(s))).map((s) => <rect key={`m${s.shift}`} x={x(s.start) + 1} y={y + 4} width={Math.max(1, x(s.end) - x(s.start) - 2)} height={ROW - 8} rx={3} className="g-only-mine" />)}
              <text x={6} y={y + ROW / 2 - 1} className="g-machine">{machine}</text>
              {def && <text x={6} y={y + ROW / 2 + 13} className="g-stage">{stageLabel(def.stage)}</text>}
            </g>;
          })}
          {ticks.map((t) => {
            const isDay = t % 1440 === 0;
            return <g key={t}>
              <line x1={x(t)} x2={x(t)} y1={isDay ? TOP - 38 : TOP - 4} y2={rowsBottom} className={isDay ? "g-day" : "grid-line"} />
              {isDay && t < days * 1440 && <text x={x(t) + 5} y={TOP - 26} className="g-dayname">{formatDay(origin, t)}</text>}
              {!isDay && <text x={x(t)} y={TOP - 9} textAnchor="middle" className="tick">{formatHour(origin, t)}</text>}
            </g>;
          })}
          <g>
            {operations.map((op) => {
              const row = machines.indexOf(op.machine);
              if (row < 0) return null;
              const y = TOP + row * ROW + 8;
              const h = ROW - 16;
              const product = productOf(op.lot);
              const [fill, ink] = productColor(product, products);
              const prep = op.block_start;
              const maintEnd = prep + op.maintenance_minutes;
              const width = Math.max(2, x(op.end) - x(op.start) - 1);
              const on = highlight && lineOf(op.lot) === highlight;
              return <g key={op.id} data-op={op.id} className={on ? "g-bar is-on" : "g-bar"} tabIndex={op.id === activeId ? 0 : -1} role="button"
                aria-label={t(`${op.lot} trên ${op.machine}, ${formatClock(origin, op.start)} đến ${formatClock(origin, op.end)}`, `${op.lot} on ${op.machine}, ${formatClock(origin, op.start)} to ${formatClock(origin, op.end)}`)}
                onMouseMove={(event) => showTip(event, op)} onMouseLeave={() => setTip(null)}
                onFocus={(event) => { const r = event.currentTarget.getBoundingClientRect(); const { title, lines } = describe(op); setTip({ x: r.left, y: r.bottom, title, lines }); }}
                onBlur={() => setTip(null)}
                onClick={() => setHighlight((current) => (current === lineOf(op.lot) ? null : lineOf(op.lot)))}
                onKeyDown={(event) => onKey(event, op)}>
                {op.maintenance_minutes > 0 && <rect x={x(prep)} y={y} width={Math.max(1, x(maintEnd) - x(prep))} height={h} fill="url(#gantt-hatch)" />}
                {op.setup_minutes > 0 && <rect x={x(maintEnd)} y={y} width={Math.max(1, x(op.start) - x(maintEnd))} height={h} style={{ fill: "var(--setup)" }} />}
                <rect x={x(op.start)} y={y} width={width} height={h} rx={2.5} className="g-run" style={{ fill }} />
                {width > op.lot.length * 6.4 + 6 && <text x={x(op.start) + width / 2} y={y + h / 2 + 4} textAnchor="middle" className="g-label" style={{ fill: ink }}>{op.lot}</text>}
              </g>;
            })}
          </g>
          {showShip && <g>
            <text x={6} y={rowsBottom + SHIP / 2 + 4} className="g-machine">{t("Giao hàng", "Deliveries")}</text>
            {[...deliveries!].filter((d) => Number.isFinite(d.time)).sort((a, b) => a.time - b.time).map((d, index) => {
              const ly = rowsBottom + 12 + (index % 4) * 12;
              const late = d.tardiness > 0;
              return <g key={d.order}>
                <line x1={x(d.time)} x2={x(d.time)} y1={rowsBottom - 6} y2={ly} className={late ? "g-ship is-late" : "g-ship"} />
                <circle cx={x(d.time)} cy={ly} r={3} className={late ? "g-ship-dot is-late" : "g-ship-dot"} />
                <text x={x(d.time) + 6} y={ly + 3.5} className={late ? "g-ship-label is-late" : "g-ship-label"}>{d.order}</text>
                <title>{`${d.order} · ${productLabel(d.product)} ${d.quantity}\n${t("Giao", "Delivered")} ${formatClock(origin, d.time)} · ${t("hạn", "due")} ${formatClock(origin, d.due)}${late ? `\n${t("Trễ", "Late")} ${formatDuration(d.tardiness)}` : ""}`}</title>
              </g>;
            })}
          </g>}
        </svg>
      </div>
      <p className="px-4 pt-2.5 pb-3.5 text-[13px] text-muted-foreground">{t("Rê chuột lên thanh để xem chi tiết; bấm (hoặc Enter) để làm nổi cả dòng sản phẩm, dùng phím ← → để chuyển lượt.", "Hover a bar for details; click (or press Enter) to highlight the whole product line, and use ← → to move between operations.")}{highlight && <> {t("Đang làm nổi dòng", "Highlighting line")} <b>{highlight}</b> · <button type="button" className="font-semibold text-primary hover:underline" onClick={() => setHighlight(null)}>{t("bỏ làm nổi", "clear highlight")}</button></>}</p>
      {tip && <div className="pointer-events-none fixed z-[60] grid max-w-[min(340px,92vw)] gap-0.5 rounded-lg bg-foreground px-3 py-2 text-[12.5px] leading-snug text-background shadow-lg" role="tooltip" style={{ left: Math.min(tip.x + 14, (typeof window !== "undefined" ? window.innerWidth : 1200) - 320), top: Math.min(tip.y + 14, (typeof window !== "undefined" ? window.innerHeight : 800) - 120) }}><strong className="text-[13px]">{tip.title}</strong>{tip.lines.map((line) => <span key={line}>{line}</span>)}</div>}
    </div>
  );
}
