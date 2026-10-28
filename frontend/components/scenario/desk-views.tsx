"use client";

import { ArrowRight, CalendarRange, CheckCircle2, GitCompare, Plus } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { EmptyState, Hint, Panel } from "@/components/blocks";
import { TradeoffChart } from "@/components/decision/charts";
import {
  AlternativeCards, DeliveriesTable, DiffCard, FormulaDetails, PartsTable, RankingTable, rankReason, SpeedSection, StatTiles, StockCard, WhyCards,
  type WorkspaceCtx,
} from "@/components/decision/sections";
import { useI18n } from "@/components/i18n-provider";
import { ScheduleGantt } from "@/components/schedule-gantt";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectSeparator, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { SkeletonCards } from "@/components/ui-states";
import { algorithmInfo } from "@/lib/algorithms";
import { fmtN, hours, lateMinutes, opsCost, POLICIES, policyOf, type Alternative, type Delivery, type PolicyKey } from "@/lib/decision";
import type { DecisionEntry } from "@/lib/decision-log";
import { formatDateTime, formatDuration, solverStatusLabel } from "@/lib/format";
import type { ScheduleRunDetail } from "@/lib/types";
import { cn } from "@/lib/utils";

const NONE = "__none__";

/* ---------- overview: where the scenario stands (Databricks object "Overview" header card) ---------- */

export function DeskSummary({ ctx, pending, decided, onOpen, onGenerate, canGenerate }: {
  ctx: WorkspaceCtx; pending: number; decided: DecisionEntry | null; onOpen: (view: "options" | "decide") => void; onGenerate: () => void; canGenerate: boolean;
}) {
  const { t } = useI18n();
  const best = ctx.byId.get(ctx.list.keys[0] ?? "");
  return (
    <Panel title={t("Điều độ", "Scheduling")} description={t("Phương án đã sinh trên revision này và quyết định gần nhất.", "Options generated on this revision and the latest decision.")}
      actions={<Button size="sm" variant="outline" onClick={onGenerate} disabled={!canGenerate}><Plus />{t("Sinh phương án", "Generate options")}</Button>}>
      <dl className="grid gap-px overflow-hidden rounded-md border bg-border sm:grid-cols-3">
        <SummaryCell label={t("Phương án", "Options")} action={ctx.alts.length > 0 && <LinkButton onClick={() => onOpen("options")}>{t("So sánh", "Compare")}</LinkButton>}>
          <b className="text-lg font-semibold tabular-nums">{ctx.alts.length}</b> <span className="text-muted-foreground">{t("lịch khả thi", "feasible")} · {ctx.list.keys.length} {t("đề xuất", "recommended")}</span>
          {pending > 0 && <span className="block text-xs text-primary">{t(`Đang giải ${pending}…`, `Solving ${pending}…`)}</span>}
        </SummaryCell>
        <SummaryCell label={t(`Đề xuất #1 · ${policyOf(ctx.policy).name}`, `Recommended #1 · ${policyOf(ctx.policy).name}`)}>
          {best ? <>
            <b className="font-semibold">{ctx.displayName(best.id)}</b>
            <span className="block text-xs text-muted-foreground">{t("đúng hạn", "on time")} {ctx.nOrders - best.late}/{ctx.nOrders} · {t("thiếu tồn", "shortfall")} {fmtN(best.metrics.safety_shortfall ?? 0)} · {best.shifts.size} {t("ca-máy", "machine-shifts")}</span>
          </> : <span className="text-muted-foreground">{t("Chưa có phương án", "No options yet")}</span>}
        </SummaryCell>
        <SummaryCell label={t("Quyết định", "Decision")} action={ctx.alts.length > 0 && <LinkButton onClick={() => onOpen("decide")}>{decided ? t("Nhật ký", "Log") : t("Chốt", "Commit")}</LinkButton>}>
          {decided ? <>
            <span className="flex items-center gap-1.5 font-semibold"><CheckCircle2 className="size-3.5 text-success" />{decided.alternative}</span>
            <span className="block truncate text-xs text-muted-foreground">{formatDateTime(decided.at)} · “{decided.reason}”</span>
          </> : <span className="text-muted-foreground">{t("Chưa chốt", "Not committed")}</span>}
        </SummaryCell>
      </dl>
    </Panel>
  );
}

function SummaryCell({ label, action, children }: { label: string; action?: ReactNode; children: ReactNode }) {
  return (
    <div className="min-w-0 bg-card px-3.5 py-3">
      <dt className="mb-1 flex items-center justify-between gap-2 text-xs text-muted-foreground">{label}{action}</dt>
      <dd className="min-w-0">{children}</dd>
    </div>
  );
}

function LinkButton({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return <button type="button" onClick={onClick} className="inline-flex items-center gap-0.5 font-medium text-primary hover:underline">{children}<ArrowRight className="size-3" /></button>;
}

/* ---------- options: policy, recommended cards, trade-off chart ---------- */

export function OptionsView({ ctx, policy, onPolicy, current, decided, loading, onPick, onGenerate, canGenerate }: {
  ctx: WorkspaceCtx; policy: PolicyKey; onPolicy: (policy: PolicyKey) => void; current: string | null; decided: string | null; loading: boolean;
  onPick: (id: string) => void; onGenerate: () => void; canGenerate: boolean;
}) {
  const { t } = useI18n();
  if (loading && !ctx.alts.length) return <SkeletonCards count={3} />;
  if (!ctx.alts.length) {
    return <EmptyState icon={<Plus />} title={t("Chưa có phương án lịch nào", "No schedule options yet")}
      description={t("Hệ thống chạy vài thuật toán trên cùng dữ liệu rồi đề xuất các lịch đáng cân nhắc để bạn so sánh và chốt. Mức “Nhanh” cho kết quả trong khoảng 1 phút.", "The system runs a few algorithms on the same data and recommends the schedules worth considering, for you to compare and commit. “Quick” returns results in about a minute.")}
      action={<Button onClick={onGenerate} disabled={!canGenerate}>{t("Sinh phương án đầu tiên", "Generate the first options")}</Button>} />;
  }
  return (
    <div className="grid min-w-0 gap-4">
      <Panel>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="font-semibold">{t("Kỳ này ưu tiên gì?", "What matters most this period?")}</h3>
          <ToggleGroup type="single" variant="outline" size="sm" value={policy} onValueChange={(value) => value && onPolicy(value as PolicyKey)} aria-label={t("Chính sách xếp hạng", "Ranking policy")}>
            {POLICIES.map((item) => <ToggleGroupItem key={item.key} value={item.key} className="px-3 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">{item.name}</ToggleGroupItem>)}
          </ToggleGroup>
        </div>
        <Hint>{policyOf(policy).note}</Hint>
        <FormulaDetails ctx={ctx} />
      </Panel>
      <AlternativeCards ctx={ctx} current={current} decided={decided} onPick={onPick} />
      <Hint className="mt-0">{t(`Đề xuất ${ctx.list.keys.length} trong ${ctx.alts.length} lịch: các lịch còn lại đều thua ít nhất một lịch đề xuất ở cả ba mặt (trễ hạn, thiếu tồn an toàn, chi phí vận hành). Bấm một thẻ để xem nhanh.`, `Recommending ${ctx.list.keys.length} of ${ctx.alts.length} schedules: every other schedule is beaten by a recommended one on all three axes (lateness, safety-stock shortfall, operating cost). Click a card for a quick look.`)}</Hint>
      {ctx.alts.length > 1 && <Panel title={t("Đánh đổi: chi phí vận hành ↔ thiếu tồn an toàn", "Trade-off: operating cost ↔ safety-stock shortfall")}>
        <TradeoffChart alternatives={ctx.alts} weights={ctx.weights} list={ctx.list} current={current} displayName={ctx.displayName} onPick={onPick} />
        <Hint>{t("Càng gần góc dưới bên trái càng tốt. Chấm xanh có tên là phương án đề xuất, chấm xám là các lịch khác (xem tab Phân tích); đường nét đứt nối các phương án đề xuất.", "Closer to the bottom-left corner is better. Named green dots are recommended options, grey dots are other schedules (see the Analysis tab); the dashed line joins the recommended options.")}</Hint>
      </Panel>}
    </div>
  );
}

/* ---------- schedule: one option in depth, optionally against another ---------- */

export function ScheduleView({ ctx, current, compare, deliveries, onPick, onCompare }: {
  ctx: WorkspaceCtx; current: Alternative | null; compare: Alternative | null; deliveries: Delivery[]; onPick: (id: string) => void; onCompare: (id: string | null) => void;
}) {
  const { t } = useI18n();
  if (!current) return <EmptyState icon={<CalendarRange />} title={t("Chưa có lịch để xem", "No schedule to view")} description={t("Sinh phương án ở tab Phương án trước.", "Generate options in the Options tab first.")} />;
  const others = ctx.alts.filter((alt) => !ctx.list.name[alt.id]);
  const optionItems = (disabledId: string | null, suffix: string) => <>
    <SelectGroup><SelectLabel>{t("Phương án đề xuất", "Recommended options")}</SelectLabel>{ctx.list.keys.map((id) => <SelectItem key={id} value={id} disabled={id === disabledId}>{ctx.displayName(id)}{id === disabledId ? suffix : ""}</SelectItem>)}</SelectGroup>
    {others.length > 0 && <SelectGroup><SelectLabel>{t("Lịch khác", "Other schedules")}</SelectLabel>{others.map((alt) => <SelectItem key={alt.id} value={alt.id} disabled={alt.id === disabledId}>{alt.label}</SelectItem>)}</SelectGroup>}
  </>;
  return (
    <div className="grid min-w-0 gap-4">
      <div className="flex flex-wrap items-end gap-3">
        <label className="grid gap-1">
          <span className="text-xs font-semibold text-muted-foreground">{t("Phương án", "Option")}</span>
          <Select value={current.id} onValueChange={onPick}><SelectTrigger size="sm" className="w-full sm:w-64"><SelectValue /></SelectTrigger><SelectContent>{optionItems(null, "")}</SelectContent></Select>
        </label>
        <label className="grid gap-1">
          <span className="text-xs font-semibold text-muted-foreground">{t("So với", "Compare with")}</span>
          <Select value={compare?.id ?? NONE} onValueChange={(value) => onCompare(value === NONE ? null : value)}>
            <SelectTrigger size="sm" className="w-full sm:w-64"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value={NONE}>— {t("không so sánh", "no comparison")} —</SelectItem><SelectSeparator />{optionItems(current.id, t(" (đang xem)", " (viewing)"))}</SelectContent>
          </Select>
        </label>
        <p className="text-xs text-muted-foreground sm:ml-auto">{algorithmInfo(current.algorithm).label} · seed {current.run.seed} · {current.run.time_budget_seconds}s · {solverStatusLabel(current.run.solver_status)} · {formatDateTime(current.run.created_at)}</p>
      </div>
      <StatTiles ctx={ctx} alt={current} />
      <Panel flush>
        <ScheduleGantt operations={current.run.operations} input={ctx.input} origin={ctx.origin} horizon={current.run.horizon_minutes} deliveries={deliveries}
          compare={compare ? { operations: compare.run.operations, label: ctx.displayName(compare.id) } : null} />
      </Panel>
      {compare && <DiffCard ctx={ctx} a={current} b={compare} />}
      <div className="grid min-w-0 gap-4 xl:grid-cols-12">
        <div className="min-w-0 xl:col-span-7"><DeliveriesTable ctx={ctx} deliveries={deliveries} /></div>
        <div className="min-w-0 xl:col-span-5"><StockCard ctx={ctx} alt={current} /></div>
      </div>
      <details className="group rounded-lg border bg-card px-4 py-3 shadow-card">
        <summary className="cursor-pointer text-sm font-semibold">{t("Thuật toán đã dựng lịch này thế nào", "How the algorithm built this schedule")}</summary>
        <div className="mt-3"><WhyCards ctx={ctx} alt={current} /></div>
      </details>
    </div>
  );
}

/* ---------- analysis: every schedule, algorithm speed ---------- */

export function AnalysisView({ ctx, runs, current, onPick, truncatedAt, matrix }: { ctx: WorkspaceCtx; runs: ScheduleRunDetail[]; current: string | null; onPick: (id: string) => void; truncatedAt: number | null; matrix: ReactNode }) {
  const { t } = useI18n();
  if (!ctx.alts.length) return matrix ? <div className="grid min-w-0 gap-4">{matrix}</div> : <EmptyState icon={<CalendarRange />} title={t("Chưa có gì để phân tích", "Nothing to analyse yet")} description={t("Phân tích xuất hiện sau khi có ít nhất một lần chạy.", "Analysis appears once there is at least one run.")} />;
  return (
    <div className="grid min-w-0 gap-4">
      {matrix}
      <Panel title={t("Xếp hạng mọi lịch theo chính sách đang chọn", "Every schedule ranked under the selected policy")}>
        <RankingTable ctx={ctx} current={current} onPick={onPick} />
        <Hint>{t("Bấm một dòng để xem nhanh lịch đó.", "Click a row for a quick look at that schedule.")} {truncatedAt ? t(`Hiển thị ${truncatedAt} lần chạy gần nhất.`, `Showing the ${truncatedAt} most recent runs.`) : ""}</Hint>
      </Panel>
      <Panel title={t("Điểm tách theo thành phần", "Score by component")}>
        <PartsTable ctx={ctx} />
        <Hint>{t("Mỗi ô là điểm đóng góp = trọng số × giá trị (giá trị ghi nhỏ bên dưới). Cộng các ô của từng tầng ra đúng điểm tầng đó.", "Each cell is the contribution = weight × value (value shown small below). The cells of a tier add up to that tier's score.")}</Hint>
      </Panel>
      {runs.length > 0 && <>
        <h3 className="mt-2 text-sm font-semibold">{t(`Tốc độ thuật toán · ${new Set(runs.map((run) => run.algorithm)).size} thuật toán · ${runs.length} lần chạy`, `Algorithm speed · ${new Set(runs.map((run) => run.algorithm)).size} algorithms · ${runs.length} runs`)}</h3>
        <SpeedSection ctx={ctx} runs={runs} />
      </>}
    </div>
  );
}

/* ---------- quick look: a right-side panel instead of scrolling away (Databricks detail pane) ---------- */

export function OptionSheet({ ctx, alt, rank, committed, viewingId, onClose, onSchedule, onCompare, onCommit }: {
  ctx: WorkspaceCtx; alt: Alternative | null; rank: number | null; committed: boolean; viewingId: string | null;
  onClose: () => void; onSchedule: (id: string) => void; onCompare: (id: string) => void; onCommit: (id: string) => void;
}) {
  const { t } = useI18n();
  return (
    <Sheet open={alt !== null} onOpenChange={(open) => { if (!open) onClose(); }}>
      <SheetContent side="right" className="w-full gap-0 sm:max-w-md">
        {alt && <>
          <SheetHeader className="border-b">
            <div className="flex items-center gap-2">
              {rank != null ? <Badge variant={rank === 1 ? "success" : "secondary"}>#{rank}</Badge> : <Badge variant="outline">{t("ngoài đề xuất", "not recommended")}</Badge>}
              {committed && <Badge variant="info"><CheckCircle2 />{t("Đã chốt", "Committed")}</Badge>}
            </div>
            <SheetTitle className="text-lg">{ctx.displayName(alt.id)}</SheetTitle>
            <SheetDescription>{algorithmInfo(alt.algorithm).label} · seed {alt.run.seed} · {alt.run.time_budget_seconds}s · {solverStatusLabel(alt.run.solver_status)}</SheetDescription>
          </SheetHeader>
          <div className="grid gap-4 overflow-y-auto p-4">
            <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-md border bg-border">
              <Fact label={t("Đúng hạn", "On time")} warn={alt.late > 0}>{ctx.nOrders - alt.late}/{ctx.nOrders}</Fact>
              <Fact label={t("Tổng trễ", "Total lateness")} warn={alt.late > 0}>{hours(lateMinutes(alt, ctx.input))}</Fact>
              <Fact label={t("Thiếu tồn an toàn", "Safety shortfall")} warn={(alt.metrics.safety_shortfall ?? 0) > 0}>{fmtN(alt.metrics.safety_shortfall ?? 0)}</Fact>
              <Fact label={t("Chi phí vận hành", "Operating cost")}>{fmtN(opsCost(alt, ctx.weights))}</Fact>
              <Fact label={t("Ca-máy bật", "Machine-shifts")}>{alt.shifts.size}</Fact>
              <Fact label={t("Chuẩn bị máy", "Setup")}>{formatDuration(alt.metrics.setup_minutes ?? 0)}</Fact>
            </dl>
            {rank != null && <p className="text-sm text-muted-foreground">{rankReason(ctx, alt.id)}</p>}
            <section className="grid gap-1">
              <h4 className="text-xs font-semibold text-muted-foreground">{t("Thuật toán", "Algorithm")}</h4>
              <p className="text-sm text-muted-foreground">{algorithmInfo(alt.algorithm).note}</p>
            </section>
            {alt.run.validation && (
              <p className={cn("rounded-md px-3 py-2 text-sm", alt.run.validation.valid ? "bg-success-soft text-success" : "bg-danger-soft text-destructive")}>
                {alt.run.validation.valid ? t("Qua bộ kiểm độc lập", "Passed the independent validator") : t("Không qua bộ kiểm độc lập", "Failed the independent validator")} · {alt.run.validation.operations_checked ?? alt.run.operations.length} {t("lượt", "operations")}
              </p>
            )}
            <Link href={`/runs/${alt.id}`} className="text-sm font-medium text-primary hover:underline">{t("Mở chi tiết lần chạy", "Open run details")} →</Link>
          </div>
          <SheetFooter className="mt-auto flex-row flex-wrap border-t">
            <Button onClick={() => onSchedule(alt.id)}><CalendarRange />{t("Xem lịch", "View schedule")}</Button>
            {viewingId && viewingId !== alt.id && <Button variant="outline" onClick={() => onCompare(alt.id)}><GitCompare />{t("So với lịch đang xem", "Compare with current")}</Button>}
            <Button variant="outline" onClick={() => onCommit(alt.id)}><CheckCircle2 />{t("Chốt", "Commit")}</Button>
          </SheetFooter>
        </>}
      </SheetContent>
    </Sheet>
  );
}

function Fact({ label, warn, children }: { label: string; warn?: boolean; children: ReactNode }) {
  return (
    <div className="bg-card px-3 py-2">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className={cn("text-base font-semibold tabular-nums", warn && "text-warning")}>{children}</dd>
    </div>
  );
}
