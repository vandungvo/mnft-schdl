"use client";

import { useI18n } from "@/components/i18n-provider";
import { formatClock, formatDay, formatDuration, stageLabel } from "@/lib/format";
import { machinesByStage } from "@/lib/master-data";
import type { MachineInput, SchedulingInputDocument } from "@/lib/types";
import { cn } from "@/lib/utils";

const DAY = 1440;

/** One cell per calendar day of the horizon: working/non-working, safety-stock checkpoints, orders due and downtime that day.
    Pattern: APS "horizon bar" (Kinaxis/Asprova) — the planner sees the shape of the period before any table. */
export function HorizonStrip({ input, origin, onDay }: { input: SchedulingInputDocument; origin: string; onDay?: (day: number) => void }) {
  const { t } = useI18n();
  const days = Math.max(1, Math.ceil(input.horizon / DAY));
  const working = new Set(input.working_days);
  const due = Array.from({ length: days }, (_, day) => input.orders.filter((order) => Math.min(days - 1, Math.floor(order.due / DAY)) === day));
  const maxDue = Math.max(1, ...due.map((list) => list.length));
  const checkpoint = new Set(input.checkpoints.map((minute) => Math.max(0, Math.ceil(minute / DAY) - 1)));
  const down = Array.from({ length: days }, (_, day) => Object.entries(input.machines).filter(([, machine]) => machine.downtime.some(([a, z]) => a < (day + 1) * DAY && z > day * DAY)).map(([id]) => id));
  return (
    <div className="overflow-x-auto pb-1">
      <ol className="grid min-w-[560px] gap-1" style={{ gridTemplateColumns: `repeat(${days}, minmax(40px, 1fr))` }} aria-label={t("Các ngày trong horizon", "Days in the horizon")}>
        {Array.from({ length: days }, (_, day) => {
          const isWorking = working.has(day);
          const label = `${formatDay(origin, day * DAY)} · ${isWorking ? t("ngày làm việc", "working day") : t("nghỉ", "off")} · ${due[day].length} ${t("đơn đến hạn", "orders due")}${down[day].length ? ` · ${t("dừng máy", "downtime")}: ${down[day].join(", ")}` : ""}${checkpoint.has(day) ? ` · ${t("mốc đo tồn cuối ngày", "end-of-day checkpoint")}` : ""}`;
          const body = (
            <>
              <span className="text-[10.5px] leading-tight text-muted-foreground">{formatDay(origin, day * DAY)}</span>
              <span className="mt-auto flex h-9 items-end justify-center" aria-hidden>
                {due[day].length > 0 && <span className={cn("w-3.5 rounded-t-sm", due[day].some((order) => order.urgent) ? "bg-brand" : "bg-primary")} style={{ height: `${Math.max(18, (due[day].length / maxDue) * 100)}%` }} />}
              </span>
              <span className="text-xs font-semibold tabular-nums">{due[day].length || ""}</span>
              <span className="flex h-1.5 w-full gap-0.5 px-1" aria-hidden>
                {checkpoint.has(day) && <i className="h-1.5 flex-1 rounded-full bg-success/70" />}
                {down[day].length > 0 && <i className="h-1.5 flex-1 rounded-full bg-destructive/70" />}
              </span>
            </>
          );
          const cls = cn("flex h-[104px] w-full flex-col items-center gap-0.5 rounded-md border px-1 py-1.5 text-center", isWorking ? "bg-card" : "bg-muted/60 [background-image:repeating-linear-gradient(135deg,transparent_0_6px,var(--grid)_6px_8px)]");
          return (
            <li key={day} className="min-w-0">
              {onDay ? <button type="button" className={cn(cls, "hover:border-primary/60 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none")} title={label} aria-label={label} onClick={() => onDay(day)}>{body}</button> : <div className={cls} title={label} aria-label={label} role="img">{body}</div>}
            </li>
          );
        })}
      </ol>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground" aria-hidden>
        <span className="inline-flex items-center gap-1.5"><i className="size-2.5 rounded-sm bg-primary" />{t("Đơn đến hạn", "Orders due")}</span>
        <span className="inline-flex items-center gap-1.5"><i className="size-2.5 rounded-sm bg-brand" />{t("Có đơn gấp", "Includes urgent")}</span>
        <span className="inline-flex items-center gap-1.5"><i className="h-1.5 w-3 rounded-full bg-success/70" />{t("Mốc đo tồn an toàn", "Safety-stock checkpoint")}</span>
        <span className="inline-flex items-center gap-1.5"><i className="h-1.5 w-3 rounded-full bg-destructive/70" />{t("Có máy dừng", "Machine downtime")}</span>
        <span className="inline-flex items-center gap-1.5"><i className="size-2.5 rounded-sm border bg-muted [background-image:repeating-linear-gradient(135deg,transparent_0_3px,var(--grid)_3px_5px)]" />{t("Ngày nghỉ", "Non-working day")}</span>
      </div>
    </div>
  );
}

const LEFT = 116;
const ROW = 30;
const TOP = 36;

/** Resource calendar (Opcenter/Asprova style): one row per machine, shift blocks and downtime across the horizon. */
export function MachineCalendar({ input, origin, onMachine, only }: { input: SchedulingInputDocument; origin: string; onMachine?: (id: string) => void; only?: string }) {
  const { t } = useI18n();
  const days = Math.max(1, Math.ceil(input.horizon / DAY));
  const dayW = only ? 56 : 64;
  const W = LEFT + days * dayW + 8;
  const rows: Array<{ stage: string; id: string; machine: MachineInput }> = machinesByStage(input).flatMap(({ stage, machines }) => machines.map(([id, machine]) => ({ stage, id, machine }))).filter((row) => !only || row.id === only);
  const H = TOP + rows.length * ROW + 6;
  const X = (minute: number) => LEFT + (minute / DAY) * dayW;
  const working = new Set(input.working_days);
  const step = days > 31 ? 7 : days > 16 ? 2 : 1;
  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} className="viz block max-w-none" role="img" aria-label={only ? t(`Lịch ca và dừng máy của ${only}`, `Shift and downtime calendar of ${only}`) : t("Lịch ca và dừng máy của mọi máy", "Shift and downtime calendar of every machine")}>
        {Array.from({ length: days }, (_, day) => (
          <g key={day}>
            {!working.has(day) && <rect x={X(day * DAY)} y={TOP - 4} width={dayW} height={H - TOP} fill="var(--muted)" opacity={0.6} />}
            <line x1={X(day * DAY)} x2={X(day * DAY)} y1={TOP - 4} y2={H} className="grid-line" />
            {day % step === 0 && (() => { const [weekday, date] = formatDay(origin, day * DAY).split(", "); return <text x={X(day * DAY) + 4} y={13} className="tick"><tspan x={X(day * DAY) + 4}>{weekday}</tspan><tspan x={X(day * DAY) + 4} dy={12}>{date ?? ""}</tspan></text>; })()}
          </g>
        ))}
        {rows.map((row, index) => {
          const y = TOP + index * ROW;
          const label = `${row.id} · ${stageLabel(row.stage)}`;
          return (
            <g key={row.id}>
              <line x1={0} x2={W} y1={y + ROW} y2={y + ROW} className="g-row" />
              {onMachine
                ? <g role="button" tabIndex={0} className="cursor-pointer outline-none [&:focus-visible>text]:underline" aria-label={t(`Mở máy ${row.id}`, `Open machine ${row.id}`)} onClick={() => onMachine(row.id)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onMachine(row.id); } }}>
                    <text x={6} y={y + 13} className="g-machine">{row.id}</text>
                    <text x={6} y={y + 25} className="g-stage">{stageLabel(row.stage)}</text>
                  </g>
                : <><text x={6} y={y + 13} className="g-machine">{row.id}</text><text x={6} y={y + 25} className="g-stage">{stageLabel(row.stage)}</text></>}
              {row.machine.shifts.map((shift) => (
                <rect key={shift.id} x={X(shift.start)} y={y + 6} width={Math.max(1, X(shift.end) - X(shift.start))} height={ROW - 12} rx={2} className="g-shift">
                  <title>{`${label}\n${shift.id}: ${formatClock(origin, shift.start)} → ${formatClock(origin, shift.end)} · ${formatDuration(shift.available_minutes)} ${t("khả dụng", "available")}`}</title>
                </rect>
              ))}
              {row.machine.downtime.map(([a, z]) => (
                <rect key={`${a}-${z}`} x={X(a)} y={y + 3} width={Math.max(2, X(z) - X(a))} height={ROW - 6} rx={2} fill="var(--destructive)" opacity={0.75}>
                  <title>{`${label}\n${t("Dừng máy", "Downtime")}: ${formatClock(origin, a)} → ${formatClock(origin, z)} (${formatDuration(z - a)})`}</title>
                </rect>
              ))}
            </g>
          );
        })}
      </svg>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground" aria-hidden>
        <span className="inline-flex items-center gap-1.5"><i className="h-2.5 w-4 rounded-sm bg-shift ring-1 ring-primary/20" />{t("Ca làm việc", "Shift")}</span>
        <span className="inline-flex items-center gap-1.5"><i className="h-2.5 w-4 rounded-sm bg-destructive/75" />{t("Dừng máy", "Downtime")}</span>
        <span className="inline-flex items-center gap-1.5"><i className="h-2.5 w-4 rounded-sm bg-muted" />{t("Ngày nghỉ", "Non-working day")}</span>
      </div>
    </div>
  );
}
