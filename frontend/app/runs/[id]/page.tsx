"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, Check, CheckCircle2, ChevronDown, Compass, Loader2, RotateCw, X } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

import { DescList, PageHeader, Panel, StatTile } from "@/components/blocks";
import { useI18n } from "@/components/i18n-provider";
import { RunStatusBadge } from "@/components/run-status";
import { ScheduleGantt } from "@/components/schedule-gantt";
import { useToast } from "@/components/toast-provider";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ErrorState, SkeletonCards, SkeletonTable } from "@/components/ui-states";
import { algorithmInfo } from "@/lib/algorithms";
import { apiErrorMessage, getMasterDataset, getScheduleRun, retryScheduleRun } from "@/lib/api";
import { deliveriesOf } from "@/lib/decision";
import { formatDateTime, formatDuration, formatInputName, formatNumber, solverStatusLabel } from "@/lib/format";
import type { ScheduleRunDetail } from "@/lib/types";
import { cn } from "@/lib/utils";

const metricLabels: Record<string, [string, string]> = {
  objective: ["Điểm mục tiêu", "Objective score"],
  makespan: ["Hoàn tất lô bắt buộc", "Required-lot completion"],
  schedule_end: ["Kết thúc lịch (gồm làm trước)", "Schedule end (incl. build-ahead)"],
  weighted_tardiness: ["Độ trễ có trọng số", "Weighted tardiness"],
  setup_minutes: ["Thời gian chuẩn bị", "Setup time"],
  idle_minutes: ["Thời gian nhàn rỗi", "Idle time"],
  safety_shortfall: ["Thiếu tồn kho an toàn", "Safety-stock shortfall"],
  productive_utilization: ["Hiệu suất sản xuất", "Productive utilisation"],
};

function formatMetric(key: string, value: number, t: (vi: string, en: string) => string) {
  if (key.includes("utilization")) return formatNumber(value, { style: "percent", maximumFractionDigits: 1 });
  if (["makespan", "schedule_end", "setup_minutes", "idle_minutes"].includes(key)) return formatDuration(value);
  if (key === "safety_shortfall") return `${formatNumber(value)} ${t("đơn vị", "units")}`;
  return formatNumber(value, { maximumFractionDigits: 2 });
}

function Metrics({ run }: { run: ScheduleRunDetail }) {
  const { t } = useI18n();
  if (!run.metrics) return null;
  const preferred = Object.keys(metricLabels).filter((key) => key in run.metrics!);
  return <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-4">{preferred.map((key) => <StatTile key={key} label={t(...metricLabels[key])} value={formatMetric(key, run.metrics![key], t)} />)}</div>;
}

function seconds(from: string | null, to: string | null) {
  if (!from || !to) return null;
  const value = (new Date(to).getTime() - new Date(from).getTime()) / 1000;
  return Number.isFinite(value) && value >= 0 ? value : null;
}

/** Lifecycle of a run (queued → solving → validated), in the spirit of a CI job timeline. */
function RunTimeline({ run }: { run: ScheduleRunDetail }) {
  const { t } = useI18n();
  const fmt = (value: number | null) => value == null ? "" : value < 90 ? `${value.toFixed(value < 10 ? 1 : 0)} s` : `${Math.round(value / 60)} ${t("phút", "min")}`;
  const failed = run.status === "FAILED" || run.status === "CANCELLED";
  const steps: Array<{ label: string; at: string | null; note: string; state: "done" | "active" | "todo" | "error" }> = [
    { label: t("Đưa vào hàng đợi", "Queued"), at: run.created_at, note: "", state: "done" },
    { label: t("Solver bắt đầu", "Solver started"), at: run.started_at, note: run.started_at ? `${t("chờ", "waited")} ${fmt(seconds(run.created_at, run.started_at))}` : "", state: run.started_at ? "done" : run.status === "QUEUED" ? "active" : failed ? "error" : "todo" },
    { label: failed ? (run.status === "CANCELLED" ? t("Đã hủy", "Cancelled") : t("Thất bại", "Failed")) : t("Hoàn tất & kiểm tra", "Finished & validated"), at: run.finished_at, note: run.finished_at ? `${t("giải", "solved in")} ${fmt(seconds(run.started_at, run.finished_at))}` : "", state: failed ? "error" : run.finished_at ? "done" : run.status === "RUNNING" ? "active" : "todo" },
  ];
  return (
    <ol className="mb-5 grid gap-3 rounded-lg border bg-card p-4 shadow-card sm:grid-cols-3" aria-label={t("Tiến trình lần chạy", "Run progress")}>
      {steps.map((step) => (
        <li key={step.label} className="flex items-start gap-2.5">
          <span className={cn("mt-0.5 grid size-5 shrink-0 place-items-center rounded-full", step.state === "done" ? "bg-success text-white dark:text-background" : step.state === "error" ? "bg-destructive text-white" : step.state === "active" ? "bg-info-soft text-primary" : "border text-muted-foreground")}>
            {step.state === "done" ? <Check className="size-3" strokeWidth={3} /> : step.state === "error" ? <X className="size-3" strokeWidth={3} /> : step.state === "active" ? <Loader2 className="size-3 animate-spin" /> : null}
          </span>
          <span className="min-w-0 text-sm">
            <strong className="block font-medium">{step.label}</strong>
            <span className="block text-xs text-muted-foreground">{step.at ? formatDateTime(step.at) : "—"}{step.note && ` · ${step.note}`}</span>
          </span>
        </li>
      ))}
    </ol>
  );
}

export default function RunDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { t } = useI18n();
  const router = useRouter();
  const queryClient = useQueryClient();
  const showToast = useToast();
  const previousStatus = useRef<string | null>(null);
  const retryKey = useRef("");
  const query = useQuery({
    queryKey: ["schedule-run", id],
    queryFn: () => getScheduleRun(id),
    refetchInterval: (state) => ["QUEUED", "RUNNING"].includes(state.state.data?.status ?? "") ? 1500 : false,
  });
  const datasetId = query.data?.dataset_id ?? null;
  const dataset = useQuery({ queryKey: ["master-dataset", datasetId], queryFn: () => getMasterDataset(datasetId!), enabled: Boolean(datasetId) && query.data?.status === "SUCCEEDED" });
  const retry = useMutation({
    mutationFn: () => {
      if (!retryKey.current) retryKey.current = crypto.randomUUID();
      return retryScheduleRun(id, {}, retryKey.current);
    },
    onSuccess: async (created) => {
      showToast(t("Đã tạo lần chạy mới từ cùng snapshot.", "Created a new run from the same snapshot."), "success");
      await queryClient.invalidateQueries({ queryKey: ["schedule-runs"] });
      router.push(`/runs/${created.id}`);
    },
  });

  useEffect(() => {
    const status = query.data?.status;
    if (status && previousStatus.current && previousStatus.current !== status) {
      if (status === "SUCCEEDED") showToast(t("Lịch đã hoàn tất và được kiểm tra.", "The schedule finished and passed validation."), "success");
      if (status === "FAILED") showToast(`${t("Solver không thể tạo lịch", "The solver could not build a schedule")}: ${query.data?.error_message ?? t("Vui lòng kiểm tra dữ liệu đầu vào.", "Please check the input data.")}`, "error");
    }
    if (status) previousStatus.current = status;
  }, [query.data?.error_message, query.data?.status, showToast, t]);

  if (query.isLoading) return <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-5"><SkeletonCards count={4} /><SkeletonTable rows={6} /></div>;
  if (query.isError || !query.data) return <ErrorState title={t("Không thể tải lần chạy", "Could not load the run")} message={t("Kết nối đến dịch vụ lập lịch không thành công.", "Could not reach the scheduling service.")} onRetry={() => void query.refetch()} />;
  const run = query.data;
  const input = dataset.data && dataset.data.revision === run.dataset_revision ? dataset.data.input : undefined;
  const link = "font-semibold text-primary hover:underline";

  return (
    <>
      <PageHeader back={{ href: "/runs", label: t("Danh sách lần chạy", "All runs") }} crumb={run.id.slice(0, 8).toUpperCase()} eyebrow={`${t("Lần chạy", "Run")} ${run.id.slice(0, 8).toUpperCase()}`} title={formatInputName(run.input_name)}
        meta={<RunStatusBadge status={run.status} />}
        description={`${algorithmInfo(run.algorithm).label} · seed ${run.seed} · ${t(`ngân sách ${run.time_budget_seconds} giây`, `budget ${run.time_budget_seconds} s`)}`}
        actions={<>
          {run.dataset_id && run.status === "SUCCEEDED" && <Button variant="outline" asChild><Link href={`/decide/${run.dataset_id}?run=${run.id}&snap=${run.input_hash.slice(0, 12)}`}><Compass />{t("Mở trong bàn điều độ", "Open in scheduling desk")}</Link></Button>}
          {["FAILED", "CANCELLED"].includes(run.status) && <Button disabled={retry.isPending} onClick={() => retry.mutate()}><RotateCw />{retry.isPending ? t("Đang tạo lại…", "Retrying…") : t("Chạy lại cùng dữ liệu", "Retry with the same data")}</Button>}
        </>} />

      {(run.status === "RUNNING" || run.status === "QUEUED") && (
        <Alert className="mb-5 border-primary/30 bg-info-soft"><Loader2 className="animate-spin" /><AlertTitle>{run.status === "QUEUED" ? t("Đang chờ tài nguyên giải", "Waiting for a solver slot") : t("Solver đang tìm lịch", "The solver is searching")}</AlertTitle><AlertDescription>{t("Trang tự cập nhật mỗi 1,5 giây; bạn có thể rời trang an toàn.", "This page refreshes every 1.5 seconds; it is safe to leave.")}</AlertDescription></Alert>
      )}
      {run.status === "FAILED" && <Alert variant="destructive" className="mb-5 border-destructive/30 bg-danger-soft"><AlertCircle /><AlertTitle>{run.error_code ?? t("Lập lịch thất bại", "Scheduling failed")}</AlertTitle><AlertDescription>{run.error_message}</AlertDescription></Alert>}
      {retry.isError && <Alert variant="destructive" className="mb-5"><AlertCircle /><AlertDescription>{apiErrorMessage(retry.error, t("Không thể tạo lần chạy lại.", "Could not create the retry run."))}</AlertDescription></Alert>}

      <RunTimeline run={run} />

      {run.status === "SUCCEEDED" && <>
        <Metrics run={run} />
        <Panel flush className="mb-5" title={t("Gantt theo máy", "Gantt by machine")} description={t("Rê chuột lên một thanh để xem thời điểm và thông tin vận hành.", "Hover a bar to see its timing and operating details.")}
          actions={<Badge variant="success"><CheckCircle2 />{run.validation?.operations_checked ?? run.operations.length} {t("công đoạn hợp lệ", "valid operations")}</Badge>}>
          <ScheduleGantt operations={run.operations} input={dataset.data?.input} origin={run.time_origin} horizon={run.horizon_minutes} deliveries={input ? deliveriesOf(input, run.operations) : undefined} />
        </Panel>
      </>}

      <Panel title={t("Khả năng tái lập", "Reproducibility")}>
        <DescList items={[
          [t("Nguồn dữ liệu", "Data source"), run.plan_id ? <Link href={`/planning/${run.plan_id}`} className={link}>{t("Kế hoạch tổng hợp", "Aggregate plan")} · revision {run.dataset_revision}</Link> : run.dataset_id ? <Link href={`/master-data/${run.dataset_id}`} className={link}>Master data revision {run.dataset_revision}</Link> : run.dataset_revision ? t(`Snapshot revision ${run.dataset_revision} · nguồn gốc đã xóa`, `Snapshot revision ${run.dataset_revision} · source deleted`) : t("JSON dùng một lần", "One-off JSON")],
          ...(run.retry_of_id ? [[t("Lần chạy gốc", "Original run"), <Link key="retry" href={`/runs/${run.retry_of_id}`} className={link}>{run.retry_of_id.slice(0, 8).toUpperCase()} →</Link>] as [string, React.ReactNode]] : []),
          [t("Trạng thái solver", "Solver status"), solverStatusLabel(run.solver_status)],
          [t("Mốc thời gian", "Time origin"), formatDateTime(run.time_origin)],
          [t("Thời điểm tạo", "Created"), formatDateTime(run.created_at)],
        ]} />
        <Collapsible className="mt-3">
          <CollapsibleTrigger className="group inline-flex items-center gap-1 text-sm font-semibold text-primary">{t("Thông tin kỹ thuật", "Technical details")}<ChevronDown className="size-4 transition-transform group-data-[state=open]:rotate-180" /></CollapsibleTrigger>
          <CollapsibleContent><DescList items={[["Input hash", <code key="h" className="font-mono text-xs">{run.input_hash}</code>], ["Run ID", <code key="r" className="font-mono text-xs">{run.id}</code>]]} /></CollapsibleContent>
        </Collapsible>
      </Panel>
    </>
  );
}
