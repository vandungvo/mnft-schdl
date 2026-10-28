"use client";

import { useMemo, useState, type KeyboardEvent, type MouseEvent, type PointerEvent } from "react";

import { useI18n } from "@/components/i18n-provider";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { activeShifts, type Delivery } from "@/lib/decision";
import { formatClock, formatDay, formatDuration, formatHour, productLabel, stageLabel } from "@/lib/format";
import { plantOf } from "@/lib/plant";
import { cn } from "@/lib/utils";
import type { AnySchedulingInput, ScheduleOperation } from "@/lib/types";

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
  input?: AnySchedulingInput;
  origin: string;
  horizon: number;
  deliveries?: Delivery[];
  compare?: { operations: ScheduleOperation[]; label: string } | null;
  /** Edit mode: bars can be selected and dragged to another machine row or time. */
  edit?: GanttEdit;
}

export interface GanttEdit {
  /** Run (op.lot) being edited. */
  selected: string | null;
  /** Runs whose machine or start differ from the schedule being edited. */
  changed: Set<string>;
  /** Runs the planner locked (kept as they are when the rest is re-optimised). */
  locked: Set<string>;
  onSelect: (lot: string) => void;
  /** A bar dropped on a machine row, at the minute its block would start. */
  onDrop: (lot: string, machine: string, minute: number) => void;
  canDrop: (lot: string, machine: string) => boolean;
}

const SNAP = 15;
const DRAG_THRESHOLD = 4;

const LEFT = 132;
const ROW = 42;
const TOP = 46;
const SHIP = 60;
const TICKS = [60, 120, 240, 360, 480, 720, 1440];

export function ScheduleGantt({ operations, input, origin, horizon, deliveries, compare, edit }: Props) {
  const { t } = useI18n();
  const [zoom, setZoom] = useState(1);
  const [drag, setDrag] = useState<{ op: ScheduleOperation; row: number; x0: number; y0: number; dx: number; dy: number } | null>(null);
  const [highlight, setHighlight] = useState<string | null>(null);
  const [focusId, setFocusId] = useState<number | null>(null);
  const [tip, setTip] = useState<{ x: number; y: number; title: string; lines: string[] } | null>(null);

  const plant = useMemo(() => (input ? plantOf(input) : null), [input]);
  const fallbackProduct = (op: ScheduleOperation) => (op.item ?? op.lot).replace(/-.*$/, "");
  const productsOf = (op: ScheduleOperation) => plant?.productsOf(op) ?? [fallbackProduct(op)];
  const products = useMemo(() => plant?.products ?? [...new Set(operations.map(fallbackProduct))], [plant, operations]);
  const lineOf = (op: ScheduleOperation) => plant?.lineOf(op) ?? fallbackProduct(op);
  // A row for a semi-finished item shared by several products (schema 5, e.g. F_CAST) gets their colours as stripes.
  const mixes = useMemo(() => {
    const seen = new Map<string, string[]>();
    for (const op of operations) {
      const owners = plant?.productsOf(op) ?? [];
      if (owners.length > 1) seen.set(owners.join("+"), owners);
    }
    return [...seen.entries()];
  }, [plant, operations]);
  const fillOf = (op: ScheduleOperation): [string, string] => {
    const owners = productsOf(op);
    if (owners.length > 1) return [`url(#mix-${owners.join("+")})`, "var(--on-dark)"];
    return productColor(owners[0] ?? fallbackProduct(op), products);
  };

  const machines = useMemo(() => {
    const present = new Set(operations.map((op) => op.machine));
    if (!plant) return [...present];
    return plant.machines.filter((machine) => present.has(machine.id) || plant.stages.includes(machine.stage)).map((machine) => machine.id);
  }, [plant, operations]);

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
  const shiftKey = (s: { machine: string; shift: string | null }) => `${s.machine}|${s.shift}`;
  const mine = new Set(shifts.map(shiftKey));
  const theirs = new Set(compareShifts.map(shiftKey));

  const sorted = useMemo(() => [...operations].sort((a, b) => a.start - b.start), [operations]);
  const activeId = focusId ?? sorted[0]?.id;

  function describe(op: ScheduleOperation) {
    const lines = [
      `${op.machine} · ${stageLabel(op.stage)} · ${op.shift ? `${t("ca", "shift")} ${op.shift}` : t("chạy liên tục", "continuous")}${op.mold ? ` · ${t("khuôn", "mold")} ${op.mold}` : ""}`,
      `${formatClock(origin, op.block_start)} → ${formatClock(origin, op.end)}`,
      `${t("Chạy", "Run")} ${formatDuration(op.end - op.start)}${op.setup_minutes ? ` · setup ${op.setup_minutes}'` : ""}${op.maintenance_minutes ? ` · ${t("bảo trì khuôn", "mold maintenance")} ${op.maintenance_minutes}'` : ""}`,
    ];
    const quantity = plant?.quantityOf(op);
    const order = plant?.orderOfLot(op.lot);
    const owners = productsOf(op);
    const what = [op.item && op.item !== owners[0] ? op.item : null, owners.map(productLabel).join(" / ")].filter(Boolean).join(" → ");
    lines.push([what, quantity != null ? `${quantity} ${t("đơn vị", "units")}` : null, order ? `${t("đơn", "order")} ${order}` : null].filter(Boolean).join(" · "));
    return { title: op.lot, lines };
  }

  function showTip(event: MouseEvent, op: ScheduleOperation) {
    const { title, lines } = describe(op);
    setTip({ x: event.clientX, y: event.clientY, title, lines });
  }

  function onKey(event: KeyboardEvent, op: ScheduleOperation) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      if (edit) edit.onSelect(op.lot);
      else setHighlight((current) => (current === lineOf(op) ? null : lineOf(op)));
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

  // Drag: where the bar would land (row under the pointer, start snapped to 15 minutes).
  const target = drag ? (() => {
    const row = Math.min(machines.length - 1, Math.max(0, drag.row + Math.round(drag.dy / ROW)));
    const minute = Math.max(0, Math.round((drag.op.block_start + drag.dx / scale) / SNAP) * SNAP);
    const machine = machines[row];
    return { row, minute, machine, ok: edit?.canDrop(drag.op.lot, machine) ?? false };
  })() : null;
  const dragging = Boolean(drag && Math.abs(drag.dx) + Math.abs(drag.dy) >= DRAG_THRESHOLD);
  function startDrag(event: PointerEvent<SVGGElement>, op: ScheduleOperation) {
    if (!edit || event.button !== 0) return;
    event.currentTarget.ownerSVGElement?.setPointerCapture(event.pointerId);
    setTip(null);
    setDrag({ op, row: machines.indexOf(op.machine), x0: event.clientX, y0: event.clientY, dx: 0, dy: 0 });
  }
  function moveDrag(event: PointerEvent<SVGSVGElement>) {
    if (drag) setDrag({ ...drag, dx: event.clientX - drag.x0, dy: event.clientY - drag.y0 });
  }
  function endDrag() {
    if (!drag || !edit) return;
    if (!dragging) edit.onSelect(drag.op.lot);
    else if (target?.ok && (target.machine !== drag.op.machine || target.minute !== drag.op.block_start)) edit.onDrop(drag.op.lot, target.machine, target.minute);
    setDrag(null);
  }

  return (
    <div className="min-w-0">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2.5 px-4 pt-4 pb-3">
        <div className="flex flex-wrap gap-x-3.5 gap-y-1.5 text-[12.5px] text-muted-foreground" aria-label={t("Chú giải", "Legend")}>
          {products.map((product) => <span key={product} className="inline-flex items-center gap-1.5"><i className="inline-block h-2.5 w-3.5 rounded-xs" style={{ background: productColor(product, products)[0] }} />{productLabel(product)}</span>)}
          {mixes.length > 0 && <span className="inline-flex items-center gap-1.5"><i className="inline-block h-2.5 w-3.5 rounded-xs" style={{ background: `repeating-linear-gradient(135deg, ${productColor(mixes[0][1][0], products)[0]} 0 3px, ${productColor(mixes[0][1][1], products)[0]} 3px 6px)` }} />{t("BTP dùng chung nhiều sản phẩm", "Semi-finished shared by products")}</span>}
          <span className="inline-flex items-center gap-1.5"><i className="inline-block h-2.5 w-3.5 rounded-xs bg-setup" />{t("Chuẩn bị máy", "Setup")}</span>
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
        <svg width={LEFT + plotWidth + 16} height={height} role="group" aria-label={t(`Biểu đồ Gantt: ${operations.length} lượt trên ${machines.length} máy`, `Gantt chart: ${operations.length} operations on ${machines.length} machines`)}
          className={cn("viz block", highlight && "is-dimmed", edit && "is-editable", dragging && "is-dragging")}
          onPointerMove={edit ? moveDrag : undefined} onPointerUp={edit ? endDrag : undefined} onPointerCancel={() => setDrag(null)}>
          <defs>
            <pattern id="gantt-hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <rect width="6" height="6" style={{ fill: "var(--setup)" }} />
              <line x1="0" y1="0" x2="0" y2="6" style={{ stroke: "var(--maint)" }} strokeWidth="3" />
            </pattern>
            {mixes.map(([key, owners]) => (
              <pattern key={key} id={`mix-${key}`} width={owners.length * 4} height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                {owners.map((owner, index) => <rect key={owner} x={index * 4} width="4" height="8" style={{ fill: productColor(owner, products)[0] }} />)}
              </pattern>
            ))}
          </defs>
          {machines.map((machine, index) => {
            const y = TOP + index * ROW;
            const def = plant?.machine(machine);
            return <g key={machine}>
              {index > 0 && <line x1={LEFT} x2={LEFT + plotWidth} y1={y} y2={y} className="g-row" />}
              {def?.continuous && <rect x={x(0)} y={y + 3} width={Math.max(1, x(plant!.horizon) - x(0))} height={ROW - 6} rx={3} className="g-shift"><title>{t("Chạy liên tục 24/7 (không theo ca)", "Runs around the clock (no shifts)")}</title></rect>}
              {shifts.filter((s) => s.machine === machine).map((s) => <rect key={s.shift} x={x(s.start)} y={y + 3} width={Math.max(1, x(s.end) - x(s.start))} height={ROW - 6} rx={3} className="g-shift" />)}
              {(def?.downtime ?? []).map(([a, z]) => <rect key={`d${a}`} x={x(a)} y={y + 3} width={Math.max(1, x(z) - x(a))} height={ROW - 6} rx={3} className="g-down"><title>{`${t("Dừng máy", "Downtime")} ${formatClock(origin, a)} → ${formatClock(origin, z)}`}</title></rect>)}
              {compare && compareShifts.filter((s) => s.machine === machine && !mine.has(shiftKey(s))).map((s) => <rect key={`t${s.shift}`} x={x(s.start) + 1} y={y + 4} width={Math.max(1, x(s.end) - x(s.start) - 2)} height={ROW - 8} rx={3} className="g-only-theirs" />)}
              {compare && shifts.filter((s) => s.machine === machine && !theirs.has(shiftKey(s))).map((s) => <rect key={`m${s.shift}`} x={x(s.start) + 1} y={y + 4} width={Math.max(1, x(s.end) - x(s.start) - 2)} height={ROW - 8} rx={3} className="g-only-mine" />)}
              <text x={6} y={y + ROW / 2 - 1} className="g-machine">{machine}</text>
              {def && <text x={6} y={y + ROW / 2 + 13} className="g-stage">{stageLabel(def.stage)}{def.continuous ? ` · ${t("liên tục", "24/7")}` : ""}</text>}
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
              const [fill, ink] = fillOf(op);
              const prep = op.block_start;
              const maintEnd = prep + op.maintenance_minutes;
              const width = Math.max(2, x(op.end) - x(op.start) - 1);
              const on = highlight && lineOf(op) === highlight;
              return <g key={op.id} data-op={op.id} className={cn("g-bar", on && "is-on", edit?.selected === op.lot && "is-selected", edit?.changed.has(op.lot) && "is-changed", drag?.op.id === op.id && dragging && "is-lifted")} tabIndex={op.id === activeId ? 0 : -1} role="button"
                aria-label={t(`${op.lot} trên ${op.machine}, ${formatClock(origin, op.start)} đến ${formatClock(origin, op.end)}`, `${op.lot} on ${op.machine}, ${formatClock(origin, op.start)} to ${formatClock(origin, op.end)}`)}
                onMouseMove={(event) => { if (!drag) showTip(event, op); }} onMouseLeave={() => setTip(null)}
                onPointerDown={edit ? (event) => startDrag(event, op) : undefined}
                onFocus={(event) => { const r = event.currentTarget.getBoundingClientRect(); const { title, lines } = describe(op); setTip({ x: r.left, y: r.bottom, title, lines }); }}
                onBlur={() => setTip(null)}
                onClick={edit ? undefined : () => setHighlight((current) => (current === lineOf(op) ? null : lineOf(op)))}
                onKeyDown={(event) => onKey(event, op)}>
                {op.maintenance_minutes > 0 && <rect x={x(prep)} y={y} width={Math.max(1, x(maintEnd) - x(prep))} height={h} fill="url(#gantt-hatch)" />}
                {op.setup_minutes > 0 && <rect x={x(maintEnd)} y={y} width={Math.max(1, x(op.start) - x(maintEnd))} height={h} style={{ fill: "var(--setup)" }} />}
                <rect x={x(op.start)} y={y} width={width} height={h} rx={2.5} className="g-run" style={{ fill }} />
                {width > op.lot.length * 6.4 + 6 && <text x={x(op.start) + width / 2} y={y + h / 2 + 4} textAnchor="middle" className="g-label" style={{ fill: ink }}>{op.lot}</text>}
                {edit?.locked.has(op.lot) && <g className="g-lock" transform={`translate(${x(op.block_start) + 1} ${y - 7})`}><path d="M1.5 4 V2.5 a2.5 2.5 0 0 1 5 0 V4" /><rect y={4} width={8} height={5.5} rx={1} /><title>{t("Đã khoá", "Locked")}</title></g>}
              </g>;
            })}
          </g>
          {drag && dragging && target && (() => {
            const y = TOP + target.row * ROW;
            const width = Math.max(2, x(drag.op.end) - x(drag.op.block_start));
            return <g className={target.ok ? "g-drop" : "g-drop is-bad"} pointerEvents="none">
              <rect x={LEFT} y={y + 1} width={plotWidth} height={ROW - 2} className="g-drop-row" />
              <rect x={x(target.minute)} y={y + 8} width={width} height={ROW - 16} rx={2.5} className="g-ghost" />
              <text x={x(target.minute)} y={y + 6} className="g-ghost-label">{target.ok ? `${target.machine} · ${formatClock(origin, target.minute)}` : t(`${target.machine} không làm được lượt này`, `${target.machine} cannot make this run`)}</text>
            </g>;
          })()}
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
      {edit ? <p className="px-4 pt-2.5 pb-3.5 text-[13px] text-muted-foreground">{t("Kéo một thanh sang máy khác hoặc sang giờ khác (bước 15 phút); bấm hoặc Enter để chọn lượt và sửa trong bảng chi tiết lượt. Viền nét đứt = lượt đã đổi so với bản gốc.", "Drag a bar to another machine or time (15-minute steps); click or press Enter to select a run and edit it in the run panel. Dashed outline = changed from the original.")}</p>
      : <p className="px-4 pt-2.5 pb-3.5 text-[13px] text-muted-foreground">{t("Rê chuột lên thanh để xem chi tiết; bấm (hoặc Enter) để làm nổi cả dòng sản phẩm, dùng phím ← → để chuyển lượt.", "Hover a bar for details; click (or press Enter) to highlight the whole product line, and use ← → to move between operations.")}{highlight && <> {t("Đang làm nổi dòng", "Highlighting line")} <b>{highlight}</b> · <button type="button" className="font-semibold text-primary hover:underline" onClick={() => setHighlight(null)}>{t("bỏ làm nổi", "clear highlight")}</button></>}</p>}
      {tip && <div className="pointer-events-none fixed z-[60] grid max-w-[min(340px,92vw)] gap-0.5 rounded-lg bg-foreground px-3 py-2 text-[12.5px] leading-snug text-background shadow-lg" role="tooltip" style={{ left: Math.min(tip.x + 14, (typeof window !== "undefined" ? window.innerWidth : 1200) - 320), top: Math.min(tip.y + 14, (typeof window !== "undefined" ? window.innerHeight : 800) - 120) }}><strong className="text-[13px]">{tip.title}</strong>{tip.lines.map((line) => <span key={line}>{line}</span>)}</div>}
    </div>
  );
}
