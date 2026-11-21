"use client";

import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type MouseEvent, type PointerEvent } from "react";

import { useI18n } from "@/components/i18n-provider";
import { Checkbox } from "@/components/ui/checkbox";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { activeShifts, type Delivery } from "@/lib/decision";
import { machineLoad, peggedOrders } from "@/lib/explain";
import { formatClock, formatDay, formatDuration, formatHour, nowMinute, productLabel, runLabel, stageLabel } from "@/lib/format";
import { plantOf } from "@/lib/plant";
import { useStoredPreference } from "@/lib/stored-preference";
import { cn } from "@/lib/utils";
import type { AnySchedulingInput, ScheduleOperation } from "@/lib/types";

/* Hue = product line (F blue, R orange), lightness = finish; a run shared by one line takes the line's middle tone. */
const KNOWN_PRODUCT_COLORS: Record<string, [string, string]> = {
  F_SILVER: ["var(--p-f-silver)", "var(--on-light)"],
  F_BLACK: ["var(--p-f-black)", "var(--on-dark)"],
  R_SILVER: ["var(--p-r-silver)", "var(--on-light)"],
  R_BLACK: ["var(--p-r-black)", "var(--on-dark)"],
};
const LINE_COLORS: Record<string, [string, string]> = { F: ["var(--p-f)", "var(--on-dark)"], R: ["var(--p-r)", "var(--on-light)"] };
const PALETTE = ["var(--s1)", "var(--s2)", "var(--s3)", "var(--s4)", "var(--s5)", "var(--s6)"];

export function productColor(product: string, products: string[]): [string, string] {
  return KNOWN_PRODUCT_COLORS[product] ?? [PALETTE[Math.max(0, products.indexOf(product)) % PALETTE.length], "var(--on-dark)"];
}

/** Colour of a run made for several products: their line's tone when they share one, else a neutral one. */
export function sharedColor(owners: string[]): [string, string] {
  const lines = new Set(owners.map((owner) => (KNOWN_PRODUCT_COLORS[owner] ? owner.split("_")[0] : owner)));
  const [line] = lines;
  return lines.size === 1 && LINE_COLORS[line] ? LINE_COLORS[line] : ["var(--p-shared)", "var(--on-dark)"];
}

interface Props {
  operations: ScheduleOperation[];
  input?: AnySchedulingInput;
  origin: string;
  horizon: number;
  deliveries?: Delivery[];
  /** Another schedule drawn as outlines where its runs sit elsewhere (`original` = the schedule being edited). */
  compare?: { operations: ScheduleOperation[]; label: string; original?: boolean } | null;
  /** Edit mode: bars can be selected and dragged to another machine row or time. */
  edit?: GanttEdit;
  /** Runs starting before this minute are fixed (a reschedule keeps what already ran). */
  frozenUntil?: number | null;
  /** Order brought forward: the runs that feed it stay lit, the rest dims. */
  focusOrder?: string | null;
  onOrder?: (order: string | null) => void;
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

const LEFT = 150;
const ROW = 42;
const TOP = 46;
const TICKS = [60, 120, 240, 360, 480, 720, 1440];

/* Zoom by what the planner wants to read, not by a factor: the whole period, days, shifts or hours. */
type Zoom = "fit" | "day" | "shift" | "hour";
const ZOOMS: Zoom[] = ["fit", "day", "shift", "hour"];
const PX_PER_DAY: Record<Exclude<Zoom, "fit">, number> = { day: 150, shift: 480, hour: 1440 };
type ColorBy = "product" | "status" | "priority";
const COLOR_MODES: ColorBy[] = ["product", "status", "priority"];


function useWidth() {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(1100);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => setWidth(Math.round(entry.contentRect.width)));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return { ref, width };
}

export function ScheduleGantt({ operations, input, origin, horizon, deliveries, compare, edit, frozenUntil, focusOrder, onOrder }: Props) {
  const { t } = useI18n();
  const [zoom, setZoom] = useStoredPreference<Zoom>("planwise:gantt-zoom", "fit", ZOOMS);
  const [colorBy, setColorBy] = useStoredPreference<ColorBy>("planwise:gantt-color", "product", COLOR_MODES);
  const [showCompare, setShowCompare] = useState(true);
  const [drag, setDrag] = useState<{ op: ScheduleOperation; row: number; x0: number; y0: number; dx: number; dy: number } | null>(null);
  const [highlight, setHighlight] = useState<string | null>(null);
  const [focusId, setFocusId] = useState<number | null>(null);
  const [tip, setTip] = useState<{ x: number; y: number; title: string; lines: string[] } | null>(null);
  const { ref: frame, width } = useWidth();
  const scroller = useRef<HTMLDivElement>(null);

  const plant = useMemo(() => (input ? plantOf(input) : null), [input]);
  const fallbackProduct = (op: ScheduleOperation) => (op.item ?? op.lot).replace(/-.*$/, "");
  const productsOf = (op: ScheduleOperation) => plant?.productsOf(op) ?? [fallbackProduct(op)];
  const products = useMemo(() => plant?.products ?? [...new Set(operations.map(fallbackProduct))], [plant, operations]);
  const lineOf = (op: ScheduleOperation) => plant?.lineOf(op) ?? fallbackProduct(op);
  const shared = useMemo(() => operations.some((op) => (plant?.productsOf(op).length ?? 0) > 1), [plant, operations]);

  // Which orders each run feeds (needed to colour by status/priority and to light up one order).
  const pegs = useMemo(() => (input && (colorBy !== "product" || focusOrder) ? peggedOrders(input, operations) : null), [input, operations, colorBy, focusOrder]);
  const deliveryOf = useMemo(() => new Map((deliveries ?? []).map((d) => [d.order, d])), [deliveries]);
  const maxPriority = useMemo(() => Math.max(1, ...(plant?.orders ?? []).map((order) => order.priority)), [plant]);
  const priorityOf = useMemo(() => new Map((plant?.orders ?? []).map((order) => [order.id, order.priority])), [plant]);

  const fillOf = (op: ScheduleOperation): [string, string] => {
    if (colorBy !== "product") {
      const orders = pegs?.get(op.id) ?? [];
      if (!orders.length) return ["var(--st-none)", "var(--on-light)"];
      if (colorBy === "status") return orders.some((order) => (deliveryOf.get(order)?.tardiness ?? 0) > 0) ? ["var(--destructive)", "var(--on-dark)"] : ["var(--st-ok)", "var(--on-dark)"];
      const ratio = Math.max(...orders.map((order) => priorityOf.get(order) ?? 1)) / maxPriority;
      return [`color-mix(in srgb, var(--primary) ${Math.round(25 + 75 * ratio)}%, var(--card))`, ratio > 0.5 ? "var(--on-dark)" : "var(--on-light)"];
    }
    const owners = productsOf(op);
    return owners.length > 1 ? sharedColor(owners) : productColor(owners[0] ?? fallbackProduct(op), products);
  };

  const machines = useMemo(() => {
    const present = new Set(operations.map((op) => op.machine));
    if (!plant) return [...present];
    return plant.machines.filter((machine) => present.has(machine.id) || plant.stages.includes(machine.stage)).map((machine) => machine.id);
  }, [plant, operations]);
  const load = useMemo(() => new Map((plant ? machineLoad(plant, operations, horizon) : []).map((row) => [row.machine, row.total.capacity ? row.total.busy / row.total.capacity : null])), [plant, operations, horizon]);

  const end = Math.max(horizon, ...operations.map((op) => op.end), ...(deliveries ?? []).map((d) => (Number.isFinite(d.time) ? d.time : 0)));
  const days = Math.max(1, Math.ceil(end / 1440));
  const perDay = zoom === "fit" ? Math.max(40, (Math.max(320, width - LEFT - 20)) / days) : PX_PER_DAY[zoom] * (zoom === "day" && days <= 4 ? 2.4 : 1);
  const plotWidth = days * perDay;
  const scale = plotWidth / (days * 1440);
  const x = (t: number) => LEFT + t * scale;
  const tick = TICKS.find((step) => step * scale >= 46) ?? 1440;
  const rowsBottom = TOP + machines.length * ROW;

  // Delivery markers in lanes so labels never overlap.
  const ships = useMemo(() => {
    const lanes: number[] = [];
    return [...(deliveries ?? [])].filter((d) => Number.isFinite(d.time)).sort((a, b) => a.time - b.time).map((d) => {
      const px = LEFT + d.time * scale;
      let lane = lanes.findIndex((right) => right < px - 4);
      if (lane < 0) { lane = lanes.length; lanes.push(0); }
      lanes[lane] = px + d.order.length * 6.4 + 14;
      return { ...d, px, lane };
    });
  }, [deliveries, scale]);
  const laneCount = ships.reduce((max, d) => Math.max(max, d.lane + 1), 0);
  const shipHeight = ships.length ? 22 + laneCount * 13 : 8;
  const height = rowsBottom + shipHeight;

  const shifts = useMemo(() => activeShifts(input, operations), [input, operations]);
  const compareShifts = useMemo(() => (compare ? activeShifts(input, compare.operations) : []), [compare, input]);
  const shiftKey = (s: { machine: string; shift: string | null }) => `${s.machine}|${s.shift}`;
  const mine = new Set(shifts.map(shiftKey));
  const theirs = new Set(compareShifts.map(shiftKey));
  // Runs of the other schedule that sit on another machine or at another time: drawn as outlines.
  const ghosts = useMemo(() => {
    if (!compare) return [];
    const here = new Map(operations.map((op) => [`${op.lot}|${op.stage}`, op]));
    return compare.operations.filter((op) => { const own = here.get(`${op.lot}|${op.stage}`); return !own || own.machine !== op.machine || own.start !== op.start; });
  }, [compare, operations]);

  const sorted = useMemo(() => [...operations].sort((a, b) => a.start - b.start), [operations]);
  const activeId = focusId ?? sorted[0]?.id;
  // One order (its supply chain) or one product line lit; everything else dimmed.
  const lit = useMemo(() => {
    if (focusOrder && pegs) return new Set(operations.filter((op) => pegs.get(op.id)?.includes(focusOrder)).map((op) => op.id));
    if (highlight) return new Set(operations.filter((op) => lineOf(op) === highlight).map((op) => op.id));
    return null;
  }, [focusOrder, pegs, highlight, operations]); // eslint-disable-line react-hooks/exhaustive-deps

  // Bring the lit order into view when the chart scrolls sideways.
  useEffect(() => {
    if (!focusOrder || !lit?.size || !scroller.current) return;
    const first = Math.min(...operations.filter((op) => lit.has(op.id)).map((op) => op.block_start));
    scroller.current.scrollTo({ left: Math.max(0, LEFT + first * scale - LEFT - 40), behavior: "smooth" });
  }, [focusOrder, lit, operations, scale]);

  const now = nowMinute(origin);
  const showNow = now > 0 && now < end;

  function shiftText(op: ScheduleOperation): string {
    if (!op.shift) return t("chạy liên tục 24/7", "runs around the clock");
    const def = plant?.machine(op.machine)?.shifts.find((s) => s.id === op.shift);
    return def ? `${t("ca", "shift")} ${formatHour(origin, def.start)}–${formatHour(origin, def.end)}` : `${t("ca", "shift")} ${op.shift}`;
  }

  function describe(op: ScheduleOperation) {
    const owners = productsOf(op);
    const orders = pegs?.get(op.id) ?? (plant?.orderOfLot(op.lot) ? [plant.orderOfLot(op.lot)!] : []);
    const quantity = plant?.quantityOf(op);
    const lines = [
      `${op.machine} · ${stageLabel(op.stage)} · ${shiftText(op)}${op.mold ? ` · ${t("khuôn", "mold")} ${op.mold}` : ""}`,
      `${formatClock(origin, op.block_start)} → ${formatClock(origin, op.end)}`,
      `${t("Chạy", "Run")} ${formatDuration(op.end - op.start)}${op.setup_minutes ? ` · ${t("chuẩn bị", "setup")} ${formatDuration(op.setup_minutes)}` : ""}${op.maintenance_minutes ? ` · ${t("bảo trì khuôn", "mold maintenance")} ${formatDuration(op.maintenance_minutes)}` : ""}`,
      [owners.length ? `${t("cho", "for")} ${owners.map(productLabel).join(" / ")}` : null, quantity != null ? `${quantity} ${t("đơn vị", "units")}` : null, orders.length ? `${t("đơn", "order")} ${orders.join(", ")}` : null].filter(Boolean).join(" · "),
      `${t("Mã lượt", "Run code")}: ${op.lot}`,
    ];
    return { title: plant?.schema === 5 ? runLabel(op.lot, op.item) : `${t("Lô", "Lot")} ${op.lot}`, lines };
  }

  function showTip(event: MouseEvent, op: ScheduleOperation) {
    const { title, lines } = describe(op);
    setTip({ x: event.clientX, y: event.clientY, title, lines });
  }

  function onKey(event: KeyboardEvent, op: ScheduleOperation) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      if (edit) edit.onSelect(op.lot);
      else toggleLine(op);
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
  function toggleLine(op: ScheduleOperation) {
    if (focusOrder) onOrder?.(null);
    setHighlight((current) => (current === lineOf(op) ? null : lineOf(op)));
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

  const swatch = (background: string, extra?: string) => <i className={cn("inline-block h-2.5 w-3.5 rounded-xs", extra)} style={{ background }} />;
  const dayLabel = (minute: number) => (perDay >= 84 ? formatDay(origin, minute) : formatDay(origin, minute).replace(/^.*?,\s*/, ""));
  const legend = (
    <div className="flex flex-wrap gap-x-3.5 gap-y-1.5 text-[12.5px] text-muted-foreground" aria-label={t("Chú giải", "Legend")}>
      {colorBy === "product" && <>
        {products.map((product) => <span key={product} className="inline-flex items-center gap-1.5">{swatch(productColor(product, products)[0])}{productLabel(product)}</span>)}
        {shared && <span className="inline-flex items-center gap-1.5">{swatch("var(--p-f)")}{swatch("var(--p-r)", "-ml-1")}{t("Bán thành phẩm dùng chung của dòng", "Semi-finished shared by a line")}</span>}
      </>}
      {colorBy === "status" && <>
        <span className="inline-flex items-center gap-1.5">{swatch("var(--destructive)")}{t("Cấp cho đơn trễ", "Feeds a late order")}</span>
        <span className="inline-flex items-center gap-1.5">{swatch("var(--st-ok)")}{t("Cấp cho đơn đúng hạn", "Feeds on-time orders")}</span>
        <span className="inline-flex items-center gap-1.5">{swatch("var(--st-none)")}{t("Chưa gắn đơn (làm trước, dự trữ)", "Not tied to an order (build-ahead, reserve)")}</span>
      </>}
      {colorBy === "priority" && <>
        <span className="inline-flex items-center gap-1.5">{swatch("color-mix(in srgb, var(--primary) 30%, var(--card))")}→{swatch("var(--primary)")}{t("Ưu tiên đơn thấp → cao", "Order priority low → high")}</span>
        <span className="inline-flex items-center gap-1.5">{swatch("var(--st-none)")}{t("Chưa gắn đơn", "Not tied to an order")}</span>
      </>}
      <span className="inline-flex items-center gap-1.5">{swatch("var(--setup)")}{t("Chuẩn bị máy", "Setup")}</span>
      <span className="inline-flex items-center gap-1.5"><i className="hatch-maint inline-block h-2.5 w-3.5 rounded-xs" />{t("Bảo trì khuôn", "Mold maintenance")}</span>
      <span className="inline-flex items-center gap-1.5"><i className="inline-block h-2.5 w-3.5 rounded-xs border bg-shift" />{t("Ca đang mở", "Open shift")}</span>
      {compare && <>
        <span className="inline-flex items-center gap-1.5"><i className="inline-block h-2.5 w-3.5 rounded-xs border-[1.8px] border-primary" />{compare.original ? t("Ca mới mở thêm", "Shift newly opened") : t("Ca chỉ lịch này mở", "Shift open only in this schedule")}</span>
        <span className="inline-flex items-center gap-1.5"><i className="inline-block h-2.5 w-3.5 rounded-xs border-[1.8px] border-dashed border-warning" />{compare.original ? t("Ca bản gốc có, bản sửa đã tắt", "Shift the original had, now closed") : t("Ca chỉ phương án so sánh mở", "Shift open only in the compared option")}</span>
        {showCompare && ghosts.length > 0 && <span className="inline-flex items-center gap-1.5"><i className="inline-block h-2.5 w-3.5 rounded-xs border-[1.5px] border-dashed border-warning" />{compare.original ? t("Vị trí cũ của lượt đã dời", "Where a moved run was") : t("Vị trí lượt ở phương án so sánh", "Where the run sits in the compared option")}</span>}
      </>}
      {edit && <span className="inline-flex items-center gap-1.5"><i className="inline-block h-2.5 w-3.5 rounded-xs border-[1.5px] border-dashed border-foreground" />{t("Lượt bị đổi do bản sửa", "Run changed by the edit")}</span>}
      {ships.some((d) => d.tardiness > 0) && <span className="inline-flex items-center gap-1.5 text-destructive"><svg width="10" height="10" aria-hidden><path d="M5 0 L10 5 L5 10 L0 5 Z" fill="currentColor" /></svg>{t("Đơn giao trễ", "Late delivery")}</span>}
    </div>
  );

  return (
    <div ref={frame} className="min-w-0">
      <div className="grid gap-2.5 px-4 pt-4 pb-3">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <span className="text-xs font-semibold text-muted-foreground">{t("Tô màu theo", "Colour by")}</span>
          <ToggleGroup type="single" variant="outline" size="sm" className="-ml-2" value={colorBy} onValueChange={(value) => value && setColorBy(value as ColorBy)} aria-label={t("Tô màu theo", "Colour by")}>
            <ToggleGroupItem value="product" className="px-2.5 text-xs">{t("Sản phẩm", "Product")}</ToggleGroupItem>
            <ToggleGroupItem value="status" className="px-2.5 text-xs">{t("Trễ hạn", "Lateness")}</ToggleGroupItem>
            <ToggleGroupItem value="priority" className="px-2.5 text-xs">{t("Ưu tiên đơn", "Priority")}</ToggleGroupItem>
          </ToggleGroup>
          {compare && ghosts.length > 0 && (
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              <Checkbox checked={showCompare} onCheckedChange={(value) => setShowCompare(value === true)} />
              {compare.original ? t(`Hiện vị trí cũ (${ghosts.length})`, `Show old positions (${ghosts.length})`) : t(`Hiện vị trí ở phương án so sánh (${ghosts.length} lượt khác)`, `Show positions in the compared option (${ghosts.length} differ)`)}
            </label>
          )}
          <ToggleGroup type="single" variant="outline" size="sm" className="ml-auto" value={zoom} onValueChange={(value) => value && setZoom(value as Zoom)} aria-label={t("Thu phóng", "Zoom")}>
            <ToggleGroupItem value="fit" className="px-2.5 text-xs" title={t("Cả kỳ vừa một màn hình", "The whole period on one screen")}>{t("Vừa kỳ", "Fit")}</ToggleGroupItem>
            <ToggleGroupItem value="day" className="px-2.5 text-xs">{t("Ngày", "Days")}</ToggleGroupItem>
            <ToggleGroupItem value="shift" className="px-2.5 text-xs">{t("Ca", "Shifts")}</ToggleGroupItem>
            <ToggleGroupItem value="hour" className="px-2.5 text-xs">{t("Giờ", "Hours")}</ToggleGroupItem>
          </ToggleGroup>
        </div>
        {legend}
      </div>
      <div ref={scroller} className="overflow-x-auto border-t bg-card" onMouseLeave={() => setTip(null)}>
        <svg width={LEFT + plotWidth + 16} height={height} role="group" aria-label={t(`Biểu đồ Gantt: ${operations.length} lượt trên ${machines.length} máy`, `Gantt chart: ${operations.length} operations on ${machines.length} machines`)}
          className={cn("viz block", lit && "is-dimmed", edit && "is-editable", dragging && "is-dragging")}
          onPointerMove={edit ? moveDrag : undefined} onPointerUp={edit ? endDrag : undefined} onPointerCancel={() => setDrag(null)}>
          <defs>
            <pattern id="gantt-hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <rect width="6" height="6" style={{ fill: "var(--setup)" }} />
              <line x1="0" y1="0" x2="0" y2="6" style={{ stroke: "var(--maint)" }} strokeWidth="3" />
            </pattern>
          </defs>
          {frozenUntil != null && frozenUntil > 0 && <g>
            <rect x={x(0)} y={TOP - 4} width={Math.max(0, x(Math.min(frozenUntil, end)) - x(0))} height={rowsBottom - TOP + 4} className="g-frozen" />
            <line x1={x(frozenUntil)} x2={x(frozenUntil)} y1={TOP - 4} y2={rowsBottom} className="g-frozen-edge" />
            <text x={x(frozenUntil) - 4} y={rowsBottom - 4} textAnchor="end" className="g-frozen-label">{t("Đã cố định", "Fixed")}</text>
          </g>}
          {machines.map((machine, index) => {
            const y = TOP + index * ROW;
            const def = plant?.machine(machine);
            const ratio = load.get(machine);
            return <g key={machine}>
              {index > 0 && <line x1={LEFT} x2={LEFT + plotWidth} y1={y} y2={y} className="g-row" />}
              {def?.continuous && <rect x={x(0)} y={y + 3} width={Math.max(1, x(plant!.horizon) - x(0))} height={ROW - 6} rx={3} className="g-shift"><title>{t("Chạy liên tục 24/7 (không theo ca)", "Runs around the clock (no shifts)")}</title></rect>}
              {shifts.filter((s) => s.machine === machine).map((s) => <rect key={s.shift} x={x(s.start)} y={y + 3} width={Math.max(1, x(s.end) - x(s.start))} height={ROW - 6} rx={3} className="g-shift" />)}
              {(def?.downtime ?? []).map(([a, z]) => <rect key={`d${a}`} x={x(a)} y={y + 3} width={Math.max(1, x(z) - x(a))} height={ROW - 6} rx={3} className="g-down"><title>{`${t("Dừng máy", "Downtime")} ${formatClock(origin, a)} → ${formatClock(origin, z)}`}</title></rect>)}
              {compare && compareShifts.filter((s) => s.machine === machine && !mine.has(shiftKey(s))).map((s) => <rect key={`t${s.shift}`} x={x(s.start) + 1} y={y + 4} width={Math.max(1, x(s.end) - x(s.start) - 2)} height={ROW - 8} rx={3} className="g-only-theirs" />)}
              {compare && shifts.filter((s) => s.machine === machine && !theirs.has(shiftKey(s))).map((s) => <rect key={`m${s.shift}`} x={x(s.start) + 1} y={y + 4} width={Math.max(1, x(s.end) - x(s.start) - 2)} height={ROW - 8} rx={3} className="g-only-mine" />)}
              <text x={6} y={y + ROW / 2 - 1} className="g-machine">{machine}</text>
              {def && <text x={6} y={y + ROW / 2 + 13} className="g-stage">{stageLabel(def.stage)}{def.continuous ? " · 24/7" : ""}
                {ratio != null && <tspan className={cn("g-util", ratio >= 0.9 && "is-high")}> · {Math.round(ratio * 100)}%</tspan>}
                <title>{t("Phần trăm = thời gian máy bận (cả chuẩn bị, bảo trì) trên thời gian ca cả kỳ", "Percentage = busy time (setup and maintenance included) over rostered time for the period")}</title>
              </text>}
            </g>;
          })}
          {ticks.map((t) => {
            const isDay = t % 1440 === 0;
            return <g key={t}>
              <line x1={x(t)} x2={x(t)} y1={isDay ? TOP - 38 : TOP - 4} y2={rowsBottom} className={isDay ? "g-day" : "grid-line"} />
              {isDay && t < days * 1440 && <text x={x(t) + 5} y={TOP - 26} className="g-dayname">{dayLabel(t)}</text>}
              {!isDay && <text x={x(t)} y={TOP - 9} textAnchor="middle" className="tick">{formatHour(origin, t)}</text>}
            </g>;
          })}
          {compare && showCompare && ghosts.map((op) => {
            const row = machines.indexOf(op.machine);
            if (row < 0) return null;
            return <rect key={`g${op.id}`} x={x(op.start)} y={TOP + row * ROW + 6} width={Math.max(2, x(op.end) - x(op.start) - 1)} height={ROW - 12} rx={2.5} className="g-cmp" />;
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
              const owners = colorBy === "product" ? productsOf(op) : [];
              const label = op.lot.slice(op.lot.lastIndexOf("-") + 1);
              return <g key={op.id} data-op={op.id} className={cn("g-bar", lit?.has(op.id) && "is-on", edit?.selected === op.lot && "is-selected", edit?.changed.has(op.lot) && "is-changed", drag?.op.id === op.id && dragging && "is-lifted")} tabIndex={op.id === activeId ? 0 : -1} role="button"
                aria-label={t(`${op.lot} trên ${op.machine}, ${formatClock(origin, op.start)} đến ${formatClock(origin, op.end)}`, `${op.lot} on ${op.machine}, ${formatClock(origin, op.start)} to ${formatClock(origin, op.end)}`)}
                onMouseMove={(event) => { if (!drag) showTip(event, op); }} onMouseLeave={() => setTip(null)}
                onPointerDown={edit ? (event) => startDrag(event, op) : undefined}
                onFocus={(event) => { const r = event.currentTarget.getBoundingClientRect(); const { title, lines } = describe(op); setTip({ x: r.left, y: r.bottom, title, lines }); }}
                onBlur={() => setTip(null)}
                onClick={edit ? undefined : () => toggleLine(op)}
                onKeyDown={(event) => onKey(event, op)}>
                {op.maintenance_minutes > 0 && <rect x={x(prep)} y={y} width={Math.max(1, x(maintEnd) - x(prep))} height={h} fill="url(#gantt-hatch)" />}
                {op.setup_minutes > 0 && <rect x={x(maintEnd)} y={y} width={Math.max(1, x(op.start) - x(maintEnd))} height={h} style={{ fill: "var(--setup)" }} />}
                <rect x={x(op.start)} y={y} width={width} height={h} rx={2.5} className="g-run" style={{ fill }} />
                {/* A shared run carries a thin band per product it feeds, instead of stripes over the whole bar. */}
                {owners.length > 1 && width > 8 && owners.map((owner, i) => <rect key={owner} x={x(op.start) + 1 + (i * (width - 2)) / owners.length} y={y + h - 4} width={(width - 2) / owners.length} height={3} style={{ fill: productColor(owner, products)[0] }} pointerEvents="none" />)}
                {width > label.length * 6.4 + 8 && <text x={x(op.start) + width / 2} y={y + h / 2 + 3} textAnchor="middle" className="g-label" style={{ fill: ink }}>{label}</text>}
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
          {showNow && <g pointerEvents="none">
            <line x1={x(now)} x2={x(now)} y1={TOP - 38} y2={rowsBottom} className="g-now" />
            <text x={x(now) + 4} y={TOP - 12} className="g-now-label">{t("Bây giờ", "Now")}</text>
          </g>}
          {ships.length > 0 && <g>
            <text x={6} y={rowsBottom + 18} className="g-machine">{t("Giao hàng", "Deliveries")}</text>
            {ships.map((d) => {
              const ly = rowsBottom + 14 + d.lane * 13;
              const late = d.tardiness > 0;
              const focus = focusOrder === d.order;
              const select = () => onOrder?.(focus ? null : d.order);
              const text = `${d.order} · ${productLabel(d.product)} ${d.quantity}\n${t("Giao", "Delivered")} ${formatClock(origin, d.time)} · ${t("hạn", "due")} ${formatClock(origin, d.due)}${late ? `\n${t("Trễ", "Late")} ${formatDuration(d.tardiness)}` : ""}`;
              return <g key={d.order} className={cn(onOrder && "g-ship-hit", focus && "is-focus")} role={onOrder ? "button" : undefined} tabIndex={onOrder ? 0 : undefined}
                aria-label={onOrder ? t(`Đơn ${d.order}${late ? `, trễ ${formatDuration(d.tardiness)}` : ""}: xem chuỗi lượt`, `Order ${d.order}${late ? `, ${formatDuration(d.tardiness)} late` : ""}: show its runs`) : undefined}
                onClick={onOrder ? select : undefined} onKeyDown={onOrder ? (event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); select(); } } : undefined}>
                <line x1={d.px} x2={d.px} y1={rowsBottom - 6} y2={ly} className={late ? "g-ship is-late" : "g-ship"} />
                {late ? <path d={`M ${d.px} ${ly - 4.5} L ${d.px + 4.5} ${ly} L ${d.px} ${ly + 4.5} L ${d.px - 4.5} ${ly} Z`} className="g-ship-dot is-late" /> : <circle cx={d.px} cy={ly} r={3} className="g-ship-dot" />}
                <text x={d.px + 7} y={ly + 3.5} className={late ? "g-ship-label is-late" : "g-ship-label"}>{d.order}</text>
                <title>{text}</title>
              </g>;
            })}
          </g>}
        </svg>
      </div>
      {edit ? <p className="px-4 pt-2.5 pb-3.5 text-[13px] text-muted-foreground">{t("Kéo một thanh sang máy khác hoặc sang giờ khác (bước 15 phút); bấm hoặc Enter để chọn lượt và sửa trong bảng chi tiết lượt. Nhấn ? để xem phím tắt.", "Drag a bar to another machine or time (15-minute steps); click or press Enter to select a run and edit it in the run panel. Press ? for shortcuts.")}</p>
      : <p className="px-4 pt-2.5 pb-3.5 text-[13px] text-muted-foreground">{t("Rê chuột lên thanh để xem chi tiết; bấm thanh để làm nổi cả dòng sản phẩm; bấm mốc giao hàng để xem các lượt cấp cho đơn đó. Phím ← → chuyển lượt, ? xem phím tắt.", "Hover a bar for details; click it to highlight its product line; click a delivery to see the runs that feed that order. ← → move between runs, ? shows shortcuts.")}{highlight && !focusOrder && <> {t("Đang làm nổi dòng", "Highlighting line")} <b>{highlight}</b> · <button type="button" className="font-semibold text-primary hover:underline" onClick={() => setHighlight(null)}>{t("bỏ làm nổi", "clear highlight")}</button></>}</p>}
      {tip && <div className="pointer-events-none fixed z-[60] grid max-w-[min(360px,92vw)] gap-0.5 rounded-lg bg-foreground px-3 py-2 text-[12.5px] leading-snug text-background shadow-lg" role="tooltip" style={{ left: Math.min(tip.x + 14, (typeof window !== "undefined" ? window.innerWidth : 1200) - 340), top: Math.min(tip.y + 14, (typeof window !== "undefined" ? window.innerHeight : 800) - 140) }}><strong className="text-[13px]">{tip.title}</strong>{tip.lines.map((line, index) => <span key={line} className={cn(index === tip.lines.length - 1 && "text-[11px] opacity-70")}>{line}</span>)}</div>}
    </div>
  );
}
