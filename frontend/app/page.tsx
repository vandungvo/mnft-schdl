"use client";

import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, ArrowRight, BarChart3, CalendarClock, Compass, Database, Layers, Loader2, type LucideIcon } from "lucide-react";
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
        description={t("Việc cần xử lý, kịch bản đang điều độ và các lần chạy gần nhất.", "What needs attention, scenarios in progress and the latest runs.")}
        actions={<Button asChild><Link href="/scenarios"><Layers />{t("Mọi kịch bản", "All scenarios")}</Link></Button>} />

      {health.isError && <div className="mb-4"><ErrorState compact title={t("Backend không phản hồi", "Backend not responding")} message={t("Không thể xác nhận database và worker.", "Could not confirm the database and worker.")} onRetry={() => void health.refetch()} /></div>}

      <div className="grid gap-3 md:grid-cols-3" role="group" aria-label={t("Cần xử lý", "Needs attention")}>
        <AttentionTile href="/runs?status=FAILED" icon={AlertTriangle} tone="danger" label={t("Lịch thất bại · 24 giờ", "Failed schedules · 24 h")} value={failedRunCount} hint={failedRunCount ? t("xem nguyên nhân, chạy lại", "see the cause, retry") : t("không có lỗi gần đây", "no recent failures")} />
        <AttentionTile href="/runs?status=RUNNING" icon={activeRunCount ? Loader2 : CalendarClock} tone="info" label={t("Đang xử lý", "In progress")} value={activeRunCount} hint={activeRunCount ? t("solver đang chạy", "solver at work") : t("hàng đợi trống", "queue is empty")} />
        <AttentionTile href="/planning?status=NEEDS_ATTENTION" icon={BarChart3} tone="warn" label={t("Kế hoạch cần chỉnh", "Plans to adjust")} value={attentionPlanCount} hint={attentionPlanCount ? t("thiếu hụt hoặc quá tải", "shortfall or overload") : t("công suất ổn", "capacity is fine")} />
      </div>

      <SectionHeading title={t("Tiếp tục điều độ", "Continue scheduling")} aside={scenarios.length > 0 && <Link href="/scenarios" className="text-sm font-medium text-primary hover:underline">{t("Mọi kịch bản", "All scenarios")} →</Link>} />
      {datasets.isLoading ? <SkeletonCards count={2} /> : datasets.isError ? <ErrorState compact message={t("Không tải được master data.", "Could not load master data.")} onRetry={() => void datasets.refetch()} /> : scenarios.length ? (
        <div className="grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(min(360px,100%),1fr))]">
          {scenarios.slice(0, 4).map((dataset) => <ScenarioCard key={dataset.id} dataset={dataset} runs={allRuns.data ?? []} />)}
        </div>
      ) : <EmptyState icon={<Database />} title={t("Chưa có dữ liệu nhà máy", "No factory data yet")} description={t("Nhập một file scheduling input JSON để tạo kịch bản đầu tiên.", "Import a scheduling input JSON to create the first scenario.")} action={<Button asChild><Link href="/scenarios">{t("Nhập dữ liệu", "Import data")}</Link></Button>} />}

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
      ) : runs.data ? <EmptyState icon={<Compass />} title={t("Chưa có lịch sản xuất", "No production schedules yet")} description={t("Mở một kịch bản để sinh các phương án đầu tiên.", "Open a scenario to generate the first options.")} action={<Button asChild><Link href="/scenarios">{t("Mở kịch bản", "Open a scenario")}</Link></Button>} /> : null}
    </>
  );
}
