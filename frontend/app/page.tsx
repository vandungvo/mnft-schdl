"use client";

import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, ArrowRight, BarChart3, CalendarClock, CheckCircle2, Compass, Database, Loader2, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";

import { EmptyState, PageHeader, SectionHeading } from "@/components/blocks";
import { useI18n } from "@/components/i18n-provider";
import { RunStatusBadge } from "@/components/run-status";
import { ScenarioCard } from "@/components/scenario-card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ErrorState, SkeletonCards, SkeletonTable } from "@/components/ui-states";
import { algorithmInfo } from "@/lib/algorithms";
import { getHealth, listAllScheduleRuns, listMasterDatasets, listProductionPlans, listScheduleRuns } from "@/lib/api";
import { formatDateTime, formatInputName, solverStatusLabel } from "@/lib/format";
import { cn } from "@/lib/utils";

function AttentionTile({ href, icon: Icon, label, value, hint, tone }: { href: string; icon: LucideIcon; label: string; value: number; hint: ReactNode; tone: "danger" | "info" | "warn" }) {
  const hot = value > 0;
  return (
    <Link href={href} className="group flex items-center gap-3 rounded-lg border bg-card p-3.5 shadow-card transition-colors hover:border-primary/60 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none">
      <span className={cn("grid size-9 shrink-0 place-items-center rounded-md", !hot ? "bg-muted text-muted-foreground" : tone === "danger" ? "bg-danger-soft text-destructive" : tone === "warn" ? "bg-warning-soft text-warning" : "bg-info-soft text-primary")}>
        <Icon className={cn("size-4", hot && tone === "info" && "animate-spin")} aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-xs text-muted-foreground">{label}</span>
        <span className="block text-sm"><b className="mr-1.5 text-lg font-semibold tabular-nums">{value}</b><span className="text-muted-foreground">{hint}</span></span>
      </span>
      <ArrowRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" aria-hidden />
    </Link>
  );
}

function PipelineStep({ href, icon: Icon, index, title, text, count }: { href: string; icon: LucideIcon; index: number; title: string; text: string; count: ReactNode }) {
  return (
    <li className="min-w-0">
      <Link href={href} className="group flex h-full items-start gap-3 rounded-lg p-3 transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none">
        <span className="grid size-8 shrink-0 place-items-center rounded-md bg-accent text-primary"><Icon className="size-4" aria-hidden /></span>
        <span className="min-w-0">
          <span className="flex items-baseline gap-2"><span className="text-xs text-muted-foreground tabular-nums">{index}.</span><strong className="text-sm font-semibold">{title}</strong><span className="text-xs text-muted-foreground">{count}</span></span>
          <span className="mt-0.5 block text-[13px] leading-snug text-muted-foreground">{text}</span>
        </span>
      </Link>
    </li>
  );
}

export default function DashboardPage() {
  const { t } = useI18n();
  const router = useRouter();
  const health = useQuery({ queryKey: ["health"], queryFn: getHealth, refetchInterval: 30_000 });
  const datasets = useQuery({ queryKey: ["master-datasets"], queryFn: () => listMasterDatasets() });
  const plans = useQuery({ queryKey: ["production-plans"], queryFn: () => listProductionPlans() });
  const runs = useQuery({ queryKey: ["schedule-runs"], queryFn: () => listScheduleRuns(), refetchInterval: 10_000 });
  const allRuns = useQuery({ queryKey: ["schedule-runs", "all"], queryFn: () => listAllScheduleRuns(), refetchInterval: 15_000 });
  const failedRunCount = health.data?.failed_runs_24h ?? runs.data?.items.filter((run) => run.status === "FAILED").length ?? 0;
  const activeRunCount = health.data ? health.data.queued_runs + health.data.running_runs : runs.data?.items.filter((run) => run.status === "QUEUED" || run.status === "RUNNING").length ?? 0;
  const attentionPlanCount = health.data?.plans_needing_attention ?? plans.data?.items.filter((plan) => plan.status !== "READY").length ?? 0;
  const scenarios = datasets.data?.items ?? [];

  return (
    <>
      <PageHeader title={t("Tổng quan", "Overview")}
        description={t("Từ dữ liệu nhà máy đến một lịch được chốt có lý do: hệ thống sinh nhiều lịch khả thi, bạn chọn chính sách và quyết định.", "From factory data to a schedule committed with a reason: the system generates several feasible schedules, you pick the policy and decide.")}
        actions={<Button asChild><Link href="/decide"><Compass />{t("Mở bàn điều độ", "Open scheduling desk")}</Link></Button>} />

      {health.isError && <div className="mb-4"><ErrorState compact title={t("Backend không phản hồi", "Backend not responding")} message={t("Không thể xác nhận database và worker.", "Could not confirm the database and worker.")} onRetry={() => void health.refetch()} /></div>}

      <div className="grid gap-3 md:grid-cols-3" role="group" aria-label={t("Cần xử lý", "Needs attention")}>
        <AttentionTile href="/runs?status=FAILED" icon={AlertTriangle} tone="danger" label={t("Lịch thất bại · 24 giờ", "Failed schedules · 24 h")} value={failedRunCount} hint={failedRunCount ? t("xem nguyên nhân, chạy lại", "see the cause, retry") : t("không có lỗi gần đây", "no recent failures")} />
        <AttentionTile href="/runs?status=RUNNING" icon={activeRunCount ? Loader2 : CalendarClock} tone="info" label={t("Đang xử lý", "In progress")} value={activeRunCount} hint={activeRunCount ? t("solver đang chạy", "solver at work") : t("hàng đợi trống", "queue is empty")} />
        <AttentionTile href="/planning?status=NEEDS_ATTENTION" icon={BarChart3} tone="warn" label={t("Kế hoạch cần chỉnh", "Plans to adjust")} value={attentionPlanCount} hint={attentionPlanCount ? t("thiếu hụt hoặc quá tải", "shortfall or overload") : t("công suất ổn", "capacity is fine")} />
      </div>

      <SectionHeading title={t("Tiếp tục điều độ", "Continue scheduling")} aside={scenarios.length > 0 && <Link href="/decide" className="text-sm font-medium text-primary hover:underline">{t("Mọi kịch bản", "All scenarios")} →</Link>} />
      {datasets.isLoading ? <SkeletonCards count={2} /> : datasets.isError ? <ErrorState compact message={t("Không tải được master data.", "Could not load master data.")} onRetry={() => void datasets.refetch()} /> : scenarios.length ? (
        <div className="grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(min(360px,100%),1fr))]">
          {scenarios.slice(0, 4).map((dataset) => <ScenarioCard key={dataset.id} dataset={dataset} runs={allRuns.data ?? []} />)}
        </div>
      ) : <EmptyState icon={<Database />} title={t("Chưa có dữ liệu nhà máy", "No factory data yet")} description={t("Nhập một file scheduling input JSON để tạo kịch bản đầu tiên.", "Import a scheduling input JSON to create the first scenario.")} action={<Button asChild><Link href="/master-data">{t("Nhập dữ liệu", "Import data")}</Link></Button>} />}

      <SectionHeading title={t("Quy trình điều độ", "Scheduling workflow")} />
      <ol className="grid gap-1 rounded-lg border bg-card p-1.5 shadow-card md:grid-cols-2 xl:grid-cols-4" aria-label={t("Quy trình điều độ", "Scheduling workflow")}>
        <PipelineStep index={1} href="/master-data" icon={Database} title={t("Chuẩn bị dữ liệu", "Prepare data")} count={datasets.data ? t(`${datasets.data.total} bộ`, `${datasets.data.total} sets`) : ""} text={t("Đơn hàng, tồn kho, máy, ca, khuôn — có phiên bản.", "Orders, inventory, machines, shifts, molds — versioned.")} />
        <PipelineStep index={2} href="/planning" icon={BarChart3} title={t("Cân đối công suất", "Balance capacity")} count={health.data ? t(`${health.data.production_plan_count} kế hoạch`, `${health.data.production_plan_count} plans`) : ""} text={t("Kế hoạch tổng hợp theo ngày/tuần (tuỳ chọn).", "Daily/weekly aggregate plan (optional).")} />
        <PipelineStep index={3} href="/decide" icon={Compass} title={t("Sinh & so sánh", "Generate & compare")} count={health.data ? t(`${health.data.schedule_run_count} lịch`, `${health.data.schedule_run_count} schedules`) : ""} text={t("Nhiều thuật toán, đường đánh đổi, Gantt cạnh nhau.", "Several algorithms, trade-off curve, side-by-side Gantt.")} />
        <PipelineStep index={4} href="/decide" icon={CheckCircle2} title={t("Chốt có lý do", "Commit with a reason")} count="" text={t("Ghi lịch được chọn, chính sách và lý do.", "Record the chosen schedule, policy and reason.")} />
      </ol>

      <SectionHeading title={t("Lần chạy mới nhất", "Latest runs")} aside={<Link href="/runs" className="text-sm font-medium text-primary hover:underline">{t("Xem tất cả", "View all")} →</Link>} />
      {runs.isError && <ErrorState compact message={t("Không tải được lịch sản xuất.", "Could not load production schedules.")} onRetry={() => void runs.refetch()} />}
      {runs.isLoading ? <SkeletonTable /> : runs.data?.items.length ? (
        <div className="rounded-lg border bg-card shadow-card">
          <Table>
            <TableHeader><TableRow><TableHead className="pl-4">{t("Trạng thái", "Status")}</TableHead><TableHead>{t("Kịch bản", "Scenario")}</TableHead><TableHead>{t("Thuật toán", "Algorithm")}</TableHead><TableHead>{t("Kết quả solver", "Solver result")}</TableHead><TableHead className="pr-4">{t("Thời điểm", "Time")}</TableHead></TableRow></TableHeader>
            <TableBody>{runs.data.items.slice(0, 5).map((run) => (
              <TableRow key={run.id} className="cursor-pointer" onClick={() => router.push(`/runs/${run.id}`)}>
                <TableCell className="pl-4"><RunStatusBadge status={run.status} /></TableCell>
                <TableCell><Link href={`/runs/${run.id}`} className="font-medium hover:underline" onClick={(event) => event.stopPropagation()}>{formatInputName(run.input_name)}</Link><span className="block font-mono text-xs text-muted-foreground">{run.id.slice(0, 8).toUpperCase()}</span></TableCell>
                <TableCell><span className="font-medium">{algorithmInfo(run.algorithm).label}</span><span className="block text-xs text-muted-foreground">{run.time_budget_seconds}s · seed {run.seed}</span></TableCell>
                <TableCell>{solverStatusLabel(run.solver_status)}</TableCell>
                <TableCell className="pr-4 text-muted-foreground">{formatDateTime(run.created_at)}</TableCell>
              </TableRow>
            ))}</TableBody>
          </Table>
        </div>
      ) : runs.data ? <EmptyState icon={<Compass />} title={t("Chưa có lịch sản xuất", "No production schedules yet")} description={t("Mở bàn điều độ để sinh các phương án đầu tiên.", "Open the scheduling desk to generate the first options.")} action={<Button asChild><Link href="/decide">{t("Mở bàn điều độ", "Open scheduling desk")}</Link></Button>} /> : null}
    </>
  );
}
