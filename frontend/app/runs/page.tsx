"use client";

import { useQuery } from "@tanstack/react-query";
import { Layers, Plus, Search } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useDeferredValue, useEffect, useMemo, useState } from "react";

import { EmptyState, PageHeader } from "@/components/blocks";
import { DataTable, FilterChip, matches, TableToolbar, type Column } from "@/components/data-table";
import { useI18n } from "@/components/i18n-provider";
import { RunStatusBadge } from "@/components/run-status";
import { Button } from "@/components/ui/button";
import { ErrorState, SkeletonTable } from "@/components/ui-states";
import { ALGORITHMS, algorithmInfo } from "@/lib/algorithms";
import { listAllScheduleRuns } from "@/lib/api";
import { formatDateTime, formatInputName, solverStatusLabel } from "@/lib/format";
import { tr } from "@/lib/locale";
import type { RunStatus, ScheduleRunSummary } from "@/lib/types";

const MAX_RUNS = 500;
const STATUSES: Array<[RunStatus, string, string]> = [["RUNNING", "Đang giải", "Solving"], ["QUEUED", "Đang chờ", "Queued"], ["SUCCEEDED", "Hoàn tất", "Succeeded"], ["FAILED", "Thất bại", "Failed"], ["CANCELLED", "Đã hủy", "Cancelled"]];
const isStatus = (value: string | null | undefined): value is RunStatus => STATUSES.some(([status]) => status === value);

/** Wall-clock solve time in seconds, or null while the run has not started or finished. */
function solveSeconds(run: ScheduleRunSummary): number | null {
  if (!run.started_at || !run.finished_at) return null;
  const seconds = (new Date(run.finished_at).getTime() - new Date(run.started_at).getTime()) / 1000;
  return Number.isFinite(seconds) && seconds >= 0 ? seconds : null;
}
function formatSeconds(seconds: number | null): string {
  if (seconds == null) return "—";
  return seconds < 90 ? `${seconds.toFixed(seconds < 10 ? 1 : 0)} s` : `${Math.round(seconds / 60)} ${tr("phút", "min")}`;
}

function RunsContent() {
  const { t } = useI18n();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const linkedStatus = searchParams.get("status");
  const [status, setStatus] = useState<RunStatus | null>(isStatus(linkedStatus) ? linkedStatus : null);
  const [algorithm, setAlgorithm] = useState<string | null>(null);
  const [scenario, setScenario] = useState<string | null>(null);
  // Shares the cache with the scenario pages; one fetch feeds the filters, counts and table.
  const query = useQuery({ queryKey: ["schedule-runs", "all"], queryFn: () => listAllScheduleRuns(MAX_RUNS), refetchInterval: 10_000 });

  // Same device-local preference key as before ("ALL" meant no filter).
  useEffect(() => {
    let saved: string | null = null;
    try { saved = window.localStorage.getItem("schedule-run-filters"); } catch { /* storage unavailable */ }
    if (!saved || searchParams.has("status")) return;
    const timer = window.setTimeout(() => {
      try {
        const parsed = JSON.parse(saved) as { status?: string; algorithm?: string };
        if (isStatus(parsed.status)) setStatus(parsed.status);
        if (parsed.algorithm && parsed.algorithm !== "ALL") setAlgorithm(parsed.algorithm);
      } catch { /* Ignore stale local preferences. */ }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [searchParams]);
  useEffect(() => {
    try { window.localStorage.setItem("schedule-run-filters", JSON.stringify({ status: status ?? "ALL", algorithm: algorithm ?? "ALL" })); } catch { /* storage unavailable */ }
  }, [status, algorithm]);

  const all = useMemo(() => query.data ?? [], [query.data]);
  const scenarioKey = (run: ScheduleRunSummary) => run.dataset_id ?? `json:${run.input_name}`;
  // Each chip counts what the *other* filters leave, so a count is what you get when you pick it.
  const passes = (run: ScheduleRunSummary, skip?: "status" | "algorithm" | "scenario") =>
    (skip === "status" || !status || run.status === status)
    && (skip === "algorithm" || !algorithm || run.algorithm === algorithm)
    && (skip === "scenario" || !scenario || scenarioKey(run) === scenario)
    && matches(deferredSearch, run.input_name, run.id, run.input_hash);
  const rows = all.filter((run) => passes(run));
  const countBy = (skip: "status" | "algorithm" | "scenario", key: (run: ScheduleRunSummary) => string) => {
    const counts = new Map<string, number>();
    for (const run of all) if (passes(run, skip)) counts.set(key(run), (counts.get(key(run)) ?? 0) + 1);
    return counts;
  };
  const statusCounts = countBy("status", (run) => run.status);
  const algorithmCounts = countBy("algorithm", (run) => run.algorithm);
  const scenarioCounts = countBy("scenario", scenarioKey);
  const scenarios = [...new Map(all.map((run) => [scenarioKey(run), formatInputName(run.input_name)])).entries()];

  const filtered = Boolean(search || status || algorithm || scenario);
  const clear = () => { setSearch(""); setStatus(null); setAlgorithm(null); setScenario(null); };

  const columns: Column<ScheduleRunSummary>[] = [
    { id: "status", header: t("Trạng thái", "Status"), cell: (run) => <RunStatusBadge status={run.status} />, sortValue: (run) => STATUSES.findIndex(([value]) => value === run.status) },
    { id: "scenario", header: t("Kịch bản", "Scenario"), sortValue: (run) => formatInputName(run.input_name), cell: (run) => <>
      <Link href={`/runs/${run.id}`} className="font-medium hover:underline">{formatInputName(run.input_name)}</Link>
      <span className="block font-mono text-xs text-muted-foreground">{run.id.slice(0, 8).toUpperCase()}{run.retry_of_id ? ` · ${t("chạy lại từ", "retry of")} ${run.retry_of_id.slice(0, 8).toUpperCase()}` : ""}</span>
    </> },
    { id: "algorithm", header: t("Thuật toán", "Algorithm"), sortValue: (run) => algorithmInfo(run.algorithm).label, cell: (run) => <>{algorithmInfo(run.algorithm).label}<span className="block text-xs text-muted-foreground">seed {run.seed} · {run.time_budget_seconds}s</span></> },
    { id: "solver", header: t("Kết quả solver", "Solver result"), sortValue: (run) => solverStatusLabel(run.solver_status), cell: (run) => run.error_code ? <span className="text-destructive">{run.error_code}</span> : solverStatusLabel(run.solver_status) },
    { id: "revision", header: "Rev", align: "right", sortValue: (run) => run.dataset_revision, cell: (run) => run.dataset_revision ?? "—" },
    { id: "elapsed", header: t("Thời gian giải", "Solve time"), align: "right", sortValue: solveSeconds, cell: (run) => formatSeconds(solveSeconds(run)) },
    { id: "created", header: t("Tạo lúc", "Created"), sortValue: (run) => run.created_at, cell: (run) => <span className="text-muted-foreground">{formatDateTime(run.created_at)}</span> },
  ];

  return (
    <>
      <PageHeader title={t("Lần chạy", "Runs")}
        description={t("Hàng đợi solver, lỗi và chi tiết từng lịch. So sánh và chốt ở trang kịch bản.", "Solver queue, failures and each schedule's details. Compare and commit on the scenario page.")}
        actions={<><Button variant="outline" asChild><Link href="/runs/new"><Plus />{t("Tạo lần chạy đơn", "New single run")}</Link></Button><Button asChild><Link href="/scenarios"><Layers />{t("Kịch bản", "Scenarios")}</Link></Button></>} />
      <TableToolbar search={search} onSearch={setSearch} placeholder={t("Tìm theo tên, mã hoặc hash…", "Search by name, ID or hash…")} count={rows.length} busy={query.isFetching && !query.isLoading} onClear={filtered ? clear : undefined}>
        <FilterChip label={t("Trạng thái", "Status")} value={status} onChange={(value) => setStatus(value as RunStatus | null)}
          options={STATUSES.map(([value, vi, en]) => ({ value, label: t(vi, en), count: statusCounts.get(value) ?? 0 }))} />
        <FilterChip label={t("Thuật toán", "Algorithm")} value={algorithm} onChange={setAlgorithm}
          options={ALGORITHMS.map((item) => ({ value: item.value, label: item.label, count: algorithmCounts.get(item.value) ?? 0 }))} />
        {scenarios.length > 1 && <FilterChip label={t("Kịch bản", "Scenario")} value={scenario} onChange={setScenario}
          options={scenarios.map(([value, label]) => ({ value, label, count: scenarioCounts.get(value) ?? 0 }))} />}
      </TableToolbar>
      {query.isLoading && <SkeletonTable rows={6} />}
      {query.isError && <ErrorState message={t("Không thể tải lịch sản xuất từ backend.", "Could not load production schedules from the backend.")} onRetry={() => void query.refetch()} />}
      {query.data && (
        <DataTable rows={rows} columns={columns} rowKey={(run) => run.id} rowHref={(run) => `/runs/${run.id}`} initialSort={{ id: "created", desc: true }} label={t("Danh sách lần chạy", "Run list")} busy={query.isFetching && !query.isLoading}
          empty={<EmptyState icon={<Search />} title={filtered ? t("Không tìm thấy lần chạy phù hợp", "No matching runs") : t("Chưa có lần chạy nào", "No runs yet")} description={filtered ? t("Thử từ khóa khác hoặc bỏ bớt bộ lọc.", "Try another keyword or remove a filter.") : t("Mở một kịch bản để sinh phương án đầu tiên.", "Open a scenario to generate the first options.")} action={filtered ? <Button variant="outline" onClick={clear}>{t("Xóa lọc", "Clear filters")}</Button> : <Button asChild><Link href="/scenarios">{t("Mở kịch bản", "Open a scenario")}</Link></Button>} />} />
      )}
      {all.length >= MAX_RUNS && <p className="mt-2 text-xs text-muted-foreground">{t(`Hiển thị ${MAX_RUNS} lần chạy gần nhất.`, `Showing the ${MAX_RUNS} most recent runs.`)}</p>}
    </>
  );
}

export default function RunsPage() { return <Suspense fallback={<SkeletonTable rows={6} />}><RunsContent /></Suspense>; }
