"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useDeferredValue, useEffect, useState } from "react";

import { RunStatusBadge } from "@/components/run-status";
import { ErrorState, SkeletonTable } from "@/components/ui-states";
import { listScheduleRuns } from "@/lib/api";
import { formatDateTime, formatInputName, solverStatusLabel } from "@/lib/format";
import type { Algorithm, RunStatus } from "@/lib/types";

const PAGE_SIZE = 20;
const algorithms: Algorithm[] = ["fifo", "edd", "spt", "simulated_annealing", "genetic_algorithm", "cp_sat", "cp_sat_hint", "cp_lns"];

function RunsContent() {
  const searchParams = useSearchParams();
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [status, setStatus] = useState<RunStatus | "ALL">((searchParams.get("status") as RunStatus) || "ALL");
  const [algorithm, setAlgorithm] = useState("ALL");
  const [page, setPage] = useState(1);
  const query = useQuery({
    queryKey: ["schedule-runs", { page, status, algorithm, search: deferredSearch }],
    queryFn: () => listScheduleRuns({ limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE, status, algorithm, search: deferredSearch }),
    placeholderData: keepPreviousData,
    refetchInterval: 10_000,
  });

  useEffect(() => {
    const saved = window.localStorage.getItem("schedule-run-filters");
    if (!saved || searchParams.has("status")) return;
    const timer = window.setTimeout(() => {
      try {
        const parsed = JSON.parse(saved) as { status?: RunStatus | "ALL"; algorithm?: string };
        if (parsed.status) setStatus(parsed.status);
        if (parsed.algorithm) setAlgorithm(parsed.algorithm);
      } catch { /* Ignore stale local preferences. */ }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [searchParams]);
  useEffect(() => { window.localStorage.setItem("schedule-run-filters", JSON.stringify({ status, algorithm })); }, [status, algorithm]);

  const total = query.data?.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const items = query.data?.items ?? [];
  function clearFilters() { setSearch(""); setStatus("ALL"); setAlgorithm("ALL"); setPage(1); }

  return <section>
    <header className="page-header"><div><span className="eyebrow">LẬP LỊCH SẢN XUẤT</span><h1>Lịch sản xuất</h1><p>Tìm kiếm toàn bộ lịch đã lưu, theo dõi solver và kiểm tra kết quả.</p></div><Link href="/runs/new" className="button button-primary">Tạo lịch mới</Link></header>
    <div className="panel filter-bar"><label className="search-field"><span className="visually-hidden">Tìm lịch</span><input type="search" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Tìm theo tên hoặc hash…" /></label><label><span>Trạng thái</span><select value={status} onChange={(event) => { setStatus(event.target.value as RunStatus | "ALL"); setPage(1); }}><option value="ALL">Tất cả</option><option value="RUNNING">Đang giải</option><option value="QUEUED">Đang chờ</option><option value="SUCCEEDED">Hoàn tất</option><option value="FAILED">Thất bại</option><option value="CANCELLED">Đã hủy</option></select></label><label><span>Thuật toán</span><select value={algorithm} onChange={(event) => { setAlgorithm(event.target.value); setPage(1); }}><option value="ALL">Tất cả</option>{algorithms.map((item) => <option value={item} key={item}>{item.replaceAll("_", " ")}</option>)}</select></label><button type="button" className="button button-small" onClick={clearFilters}>Xóa lọc</button></div>
    <div className="result-summary"><span><strong>{total}</strong> kết quả {query.isFetching && !query.isLoading ? "· đang cập nhật…" : ""}</span><span className="saved-filter-note">Bộ lọc được lưu trên thiết bị này</span></div>
    {query.isLoading && <SkeletonTable rows={6} />}
    {query.isError && <ErrorState message="Không thể tải lịch sản xuất từ backend." onRetry={() => void query.refetch()} />}
    {query.data && items.length === 0 && <div className="panel empty compact-empty"><h2>Không tìm thấy lịch phù hợp</h2><p>Thử thay đổi từ khóa hoặc xóa bộ lọc hiện tại.</p></div>}
    {items.length > 0 && <><div className={`panel table-wrap ${query.isFetching ? "content-updating" : ""}`}><table><caption className="visually-hidden">Danh sách lịch sản xuất</caption><thead><tr><th>Trạng thái</th><th>Dữ liệu</th><th>Thuật toán</th><th>Solver</th><th>Tạo lúc</th><th /></tr></thead><tbody>{items.map((run) => <tr key={run.id}><td><RunStatusBadge status={run.status} /></td><td><strong>{formatInputName(run.input_name)}</strong>{run.retry_of_id && <small>Chạy lại từ {run.retry_of_id.slice(0, 8)}</small>}</td><td>{run.algorithm.replaceAll("_", " ")}<small>seed {run.seed} · {run.time_budget_seconds}s</small></td><td>{solverStatusLabel(run.solver_status)}</td><td>{formatDateTime(run.created_at)}</td><td><Link href={`/runs/${run.id}`} className="text-link">Xem lịch →</Link></td></tr>)}</tbody></table></div><nav className="pagination" aria-label="Phân trang lịch sản xuất"><button type="button" className="button button-small" disabled={page === 1 || query.isFetching} onClick={() => setPage((value) => value - 1)}>← Trước</button><span>Trang <strong>{page}</strong> / {pageCount}</span><button type="button" className="button button-small" disabled={page >= pageCount || query.isFetching} onClick={() => setPage((value) => value + 1)}>Sau →</button></nav></>}
  </section>;
}

export default function RunsPage() { return <Suspense fallback={<SkeletonTable rows={6} />}><RunsContent /></Suspense>; }
