"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

import { GanttChart } from "@/components/gantt-chart";
import { RunStatusBadge } from "@/components/run-status";
import { useToast } from "@/components/toast-provider";
import { ErrorState, SkeletonCards, SkeletonTable } from "@/components/ui-states";
import { apiErrorMessage, getScheduleRun, retryScheduleRun } from "@/lib/api";
import { formatDateTime, formatDuration, formatInputName, solverStatusLabel } from "@/lib/format";
import type { ScheduleRunDetail } from "@/lib/types";

const metricLabels: Record<string, string> = {
  objective: "Điểm mục tiêu",
  makespan: "Thời gian hoàn tất",
  weighted_tardiness: "Độ trễ có trọng số",
  setup_minutes: "Thời gian chuẩn bị",
  idle_minutes: "Thời gian nhàn rỗi",
  safety_shortfall: "Thiếu tồn kho an toàn",
  productive_utilization: "Hiệu suất sản xuất",
};

function formatMetric(key: string, value: number) {
  if (key.includes("utilization")) return new Intl.NumberFormat("vi-VN", { style: "percent", maximumFractionDigits: 1 }).format(value);
  if (["makespan", "setup_minutes", "idle_minutes"].includes(key)) return formatDuration(value);
  if (key === "safety_shortfall") return `${new Intl.NumberFormat("vi-VN").format(value)} đơn vị`;
  return new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 2 }).format(value);
}

function Metrics({ run }: { run: ScheduleRunDetail }) {
  if (!run.metrics) return null;
  const preferred = Object.keys(metricLabels).filter((key) => key in run.metrics!);
  return <div className="metric-grid">{preferred.map((key) => <article className="metric-card" key={key}><span>{metricLabels[key]}</span><strong>{formatMetric(key, run.metrics![key])}</strong></article>)}</div>;
}

export default function RunDetailPage() {
  const { id } = useParams<{ id: string }>();
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
  const retry = useMutation({
    mutationFn: () => {
      if (!retryKey.current) retryKey.current = crypto.randomUUID();
      return retryScheduleRun(id, {}, retryKey.current);
    },
    onSuccess: async (created) => {
      showToast("Đã tạo lần chạy mới từ cùng snapshot.", "success");
      await queryClient.invalidateQueries({ queryKey: ["schedule-runs"] });
      router.push(`/runs/${created.id}`);
    },
  });

  useEffect(() => {
    const status = query.data?.status;
    if (status && previousStatus.current && previousStatus.current !== status) {
      if (status === "SUCCEEDED") showToast("Lịch đã hoàn tất và được kiểm tra.", "success");
      if (status === "FAILED") showToast(`Solver không thể tạo lịch: ${query.data?.error_message ?? "Vui lòng kiểm tra dữ liệu đầu vào."}`, "error");
    }
    if (status) previousStatus.current = status;
  }, [query.data?.error_message, query.data?.status, showToast]);

  if (query.isLoading) return <><SkeletonCards count={4} /><div style={{ height: 20 }} /><SkeletonTable rows={6} /></>;
  if (query.isError || !query.data) return <ErrorState title="Không thể tải lần chạy" message="Kết nối đến dịch vụ lập lịch không thành công." onRetry={() => void query.refetch()} />;
  const run = query.data;

  return (
    <section>
      <header className="page-header">
        <div><Link href="/runs" className="back-link">← Danh sách lịch</Link><span className="eyebrow">LẦN CHẠY {run.id.slice(0, 8).toUpperCase()}</span><h1>{formatInputName(run.input_name)}</h1><p>{run.algorithm.replaceAll("_", " ").toUpperCase()} · seed {run.seed} · ngân sách {run.time_budget_seconds} giây</p></div>
        <div className="header-actions"><RunStatusBadge status={run.status} />{["FAILED", "CANCELLED"].includes(run.status) && <button type="button" className="button button-primary" disabled={retry.isPending} onClick={() => retry.mutate()}>{retry.isPending ? "Đang tạo lại…" : "Chạy lại cùng dữ liệu"}</button>}</div>
      </header>

      {(run.status === "RUNNING" || run.status === "QUEUED") && <div className="panel progress-panel"><span className="spinner" /><div><strong>{run.status === "QUEUED" ? "Đang chờ tài nguyên giải" : "Solver đang tìm lịch"}</strong><p>Trang tự cập nhật mỗi 1,5 giây; bạn có thể rời trang an toàn.</p></div></div>}
      {run.status === "FAILED" && <div className="alert alert-error"><strong>{run.error_code ?? "Lập lịch thất bại"}</strong><br />{run.error_message}</div>}
      {retry.isError && <div className="alert alert-error" role="alert">{apiErrorMessage(retry.error, "Không thể tạo lần chạy lại.")}</div>}

      {run.status === "SUCCEEDED" && <><Metrics run={run} /><article className="panel schedule-panel"><div className="panel-heading"><div><span className="eyebrow">LỊCH ĐÃ KIỂM TRA</span><h2>Gantt theo máy</h2><p>Chọn một thanh để xem thời điểm và thông tin vận hành.</p></div><div className="validation-mark">✓ {run.validation?.operations_checked ?? run.operations.length} công đoạn hợp lệ</div></div><div className="legend"><span><i className="legend-cast" />Đúc</span><span><i className="legend-cnc" />CNC</span><span><i className="legend-paint" />Sơn</span><span><i className="legend-qc" />Kiểm tra</span><span><i className="legend-setup" />Chuẩn bị / bảo trì</span></div><GanttChart operations={run.operations} horizonMinutes={run.horizon_minutes} timeOrigin={run.time_origin} /></article></>}

      <article className="panel metadata-panel">
        <h2>Khả năng tái lập</h2>
        <dl>
          <div><dt>Nguồn dữ liệu</dt><dd>{run.plan_id ? <Link href={`/planning/${run.plan_id}`} className="text-link">Kế hoạch tổng hợp · revision {run.dataset_revision}</Link> : run.dataset_id ? <Link href={`/master-data/${run.dataset_id}`} className="text-link">Master data revision {run.dataset_revision}</Link> : run.dataset_revision ? `Snapshot revision ${run.dataset_revision} · nguồn gốc đã xóa` : "JSON dùng một lần"}</dd></div>
          {run.retry_of_id && <div><dt>Lần chạy gốc</dt><dd><Link href={`/runs/${run.retry_of_id}`} className="text-link">{run.retry_of_id.slice(0, 8).toUpperCase()} →</Link></dd></div>}
          <div><dt>Trạng thái solver</dt><dd>{solverStatusLabel(run.solver_status)}</dd></div>
          <div><dt>Mốc thời gian</dt><dd>{formatDateTime(run.time_origin)}</dd></div>
          <div><dt>Thời điểm tạo</dt><dd>{formatDateTime(run.created_at)}</dd></div>
        </dl>
        <details className="technical-disclosure"><summary>Thông tin kỹ thuật</summary><dl><div><dt>Input hash</dt><dd><code>{run.input_hash}</code></dd></div><div><dt>Run ID</dt><dd><code>{run.id}</code></dd></div></dl></details>
      </article>
    </section>
  );
}
