"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";

import { RunStatusBadge } from "@/components/run-status";
import { ErrorState, SkeletonCards, SkeletonTable } from "@/components/ui-states";
import { getHealth, listMasterDatasets, listProductionPlans, listScheduleRuns } from "@/lib/api";
import { formatDateTime, formatInputName, solverStatusLabel } from "@/lib/format";

export default function DashboardPage() {
  const health = useQuery({ queryKey: ["health"], queryFn: getHealth, refetchInterval: 30_000 });
  const datasets = useQuery({ queryKey: ["master-datasets"], queryFn: () => listMasterDatasets() });
  const plans = useQuery({ queryKey: ["production-plans"], queryFn: () => listProductionPlans() });
  const runs = useQuery({ queryKey: ["schedule-runs"], queryFn: () => listScheduleRuns(), refetchInterval: 10_000 });
  const machineCount = datasets.data?.items.reduce((total, item) => total + item.counts.machines, 0) ?? 0;
  const failedRuns = runs.data?.items.filter((run) => run.status === "FAILED") ?? [];
  const activeRuns = runs.data?.items.filter((run) => run.status === "QUEUED" || run.status === "RUNNING") ?? [];
  const attentionPlans = plans.data?.items.filter((plan) => plan.status !== "READY") ?? [];
  const failedRunCount = health.data?.failed_runs_24h ?? failedRuns.length;
  const activeRunCount = health.data ? health.data.queued_runs + health.data.running_runs : activeRuns.length;
  const attentionPlanCount = health.data?.plans_needing_attention ?? attentionPlans.length;
  const exceptions = failedRunCount + activeRunCount + attentionPlanCount;

  return <section>
    <header className="page-header dashboard-header"><div><span className="eyebrow">ĐIỀU HÀNH SẢN XUẤT</span><h1>Tổng quan vận hành</h1><p>Ưu tiên ngoại lệ, theo dõi công suất và chuyển nhanh từ dữ liệu sang lịch khả thi.</p></div><div className="header-actions"><Link href="/master-data" className="button">Quản lý dữ liệu</Link><Link href="/runs/new" className="button button-primary">Tạo lịch sản xuất</Link></div></header>

    {health.isLoading && <div className="system-banner system-banner-loading"><span className="spinner" /> Đang kiểm tra dịch vụ…</div>}
    {health.isError && <ErrorState compact title="Backend không phản hồi" message="Không thể xác nhận database và worker." onRetry={() => void health.refetch()} />}
    {health.data && <div className="system-banner"><div className="system-status"><span className="status-pulse" /><div><strong>Hệ thống đang hoạt động</strong><small>Database {health.data.database_latency_ms} ms · {health.data.running_runs} đang giải · {health.data.queued_runs} đang chờ</small></div></div><div className="system-data-state"><span>Dữ liệu nền</span><strong>{health.data.master_data_status === "ready" ? "Sẵn sàng" : "Chưa có dữ liệu"}</strong></div></div>}

    <div className="dashboard-section-heading exception-heading"><div><span className="eyebrow">CẦN XỬ LÝ</span><h2>{exceptions ? `${exceptions} ngoại lệ cần chú ý` : "Không có ngoại lệ đang mở"}</h2></div><span className={exceptions ? "attention-indicator" : "healthy-indicator"}>{exceptions ? "Cần xem xét" : "Vận hành ổn định"}</span></div>
    <div className="exception-grid">
      <Link href="/runs?status=FAILED" className={failedRunCount ? "exception-card exception-card-danger" : "exception-card"}><span>Lịch thất bại · 24 giờ</span><strong>{failedRunCount}</strong><small>{failedRunCount ? "Xem nguyên nhân và chạy lại" : "Không có lỗi gần đây"}</small></Link>
      <Link href="/runs?status=RUNNING" className={activeRunCount ? "exception-card exception-card-active" : "exception-card"}><span>Đang xử lý</span><strong>{activeRunCount}</strong><small>{activeRunCount ? "Theo dõi solver và hàng đợi" : "Hàng đợi đang trống"}</small></Link>
      <Link href="/planning?status=NEEDS_ATTENTION" className={attentionPlanCount ? "exception-card exception-card-warning" : "exception-card"}><span>Kế hoạch cần chỉnh</span><strong>{attentionPlanCount}</strong><small>{attentionPlanCount ? "Có thiếu hụt hoặc quá tải" : "Công suất tổng hợp ổn định"}</small></Link>
    </div>

    {datasets.isLoading || plans.isLoading || runs.isLoading ? <SkeletonCards /> : <div className="overview-grid">
      <Link href="/master-data" className="overview-card"><span>Bộ dữ liệu</span><strong>{datasets.data?.total ?? "—"}</strong><small>{machineCount} máy đã cấu hình</small></Link>
      <Link href="/planning" className="overview-card"><span>Kế hoạch tổng hợp</span><strong>{health.data?.production_plan_count ?? plans.data?.total ?? "—"}</strong><small>{attentionPlanCount} kế hoạch cần xem xét</small></Link>
      <Link href="/runs" className="overview-card"><span>Lịch đã tạo</span><strong>{health.data?.schedule_run_count ?? runs.data?.total ?? "—"}</strong><small>{failedRunCount} thất bại trong 24 giờ</small></Link>
      <article className="overview-card"><span>Độ trễ database</span><strong>{health.data?.database_latency_ms ?? "—"}<em> ms</em></strong><small>{health.data?.latest_run_finished_at ? `Lịch gần nhất ${formatDateTime(health.data.latest_run_finished_at)}` : "Chưa có lần hoàn tất"}</small></article>
    </div>}

    {(datasets.isError || plans.isError || runs.isError) && <div className="widget-errors">{datasets.isError && <ErrorState compact message="Không tải được master data." onRetry={() => void datasets.refetch()} />}{plans.isError && <ErrorState compact message="Không tải được kế hoạch." onRetry={() => void plans.refetch()} />}{runs.isError && <ErrorState compact message="Không tải được lịch sản xuất." onRetry={() => void runs.refetch()} />}</div>}

    <div className="dashboard-section-heading recent-heading"><div><span className="eyebrow">HOẠT ĐỘNG GẦN ĐÂY</span><h2>Lịch sản xuất mới nhất</h2></div><Link href="/runs" className="text-link">Xem tất cả →</Link></div>
    {runs.isLoading ? <SkeletonTable /> : runs.data?.items.length ? <div className="panel table-wrap"><table><caption className="visually-hidden">Các lần lập lịch gần đây</caption><thead><tr><th>Trạng thái</th><th>Kịch bản</th><th>Thuật toán</th><th>Kết quả solver</th><th>Thời điểm</th><th /></tr></thead><tbody>{runs.data.items.slice(0, 5).map((run) => <tr key={run.id}><td><RunStatusBadge status={run.status} /></td><td><strong>{formatInputName(run.input_name)}</strong><small>{run.input_hash.slice(0, 12)}</small></td><td><span className="algorithm-label">{run.algorithm.replaceAll("_", " ")}</span><small>{run.time_budget_seconds}s · seed {run.seed}</small></td><td>{solverStatusLabel(run.solver_status)}</td><td>{formatDateTime(run.created_at)}</td><td><Link href={`/runs/${run.id}`} className="text-link">Chi tiết →</Link></td></tr>)}</tbody></table></div> : <div className="panel empty compact-empty"><h2>Chưa có lịch sản xuất</h2><p>Dữ liệu chuẩn đã sẵn sàng. Tạo lần chạy đầu tiên để bắt đầu.</p><Link href="/runs/new" className="button button-primary">Tạo lịch đầu tiên</Link></div>}
  </section>;
}
