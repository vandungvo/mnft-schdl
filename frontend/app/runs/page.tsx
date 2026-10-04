"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Compass, Plus, Search } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useDeferredValue, useEffect, useState } from "react";

import { EmptyState, FilterBar, PageHeader, Pagination } from "@/components/blocks";
import { useI18n } from "@/components/i18n-provider";
import { RunStatusBadge } from "@/components/run-status";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ErrorState, SkeletonTable } from "@/components/ui-states";
import { ALGORITHMS, algorithmInfo } from "@/lib/algorithms";
import { listScheduleRuns } from "@/lib/api";
import { formatDateTime, formatInputName, solverStatusLabel } from "@/lib/format";
import { tr } from "@/lib/locale";
import type { RunStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 20;

/** Wall-clock solve time; a dash while the run has not started or finished. */
function elapsed(start: string | null, end: string | null): string {
  if (!start || !end) return "—";
  const seconds = (new Date(end).getTime() - new Date(start).getTime()) / 1000;
  if (!Number.isFinite(seconds) || seconds < 0) return "—";
  return seconds < 90 ? `${seconds.toFixed(seconds < 10 ? 1 : 0)} s` : `${Math.round(seconds / 60)} ${tr("phút", "min")}`;
}
const STATUSES: Array<[RunStatus | "ALL", string, string]> = [["ALL", "Tất cả trạng thái", "All statuses"], ["RUNNING", "Đang giải", "Solving"], ["QUEUED", "Đang chờ", "Queued"], ["SUCCEEDED", "Hoàn tất", "Succeeded"], ["FAILED", "Thất bại", "Failed"], ["CANCELLED", "Đã hủy", "Cancelled"]];

function RunsContent() {
  const { t } = useI18n();
  const searchParams = useSearchParams();
  const router = useRouter();
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
  const items = query.data?.items ?? [];
  const filtered = Boolean(search || status !== "ALL" || algorithm !== "ALL");
  function clearFilters() { setSearch(""); setStatus("ALL"); setAlgorithm("ALL"); setPage(1); }

  return (
    <>
      <PageHeader title={t("Lần chạy", "Runs")}
        description={t("Nhật ký mọi lần chạy: theo dõi hàng đợi, xem lỗi và mở từng lịch. So sánh và chốt phương án ở Bàn điều độ.", "Log of every run: track the queue, inspect failures and open each schedule. Compare and commit options at the Scheduling desk.")}
        actions={<><Button variant="outline" asChild><Link href="/runs/new"><Plus />{t("Tạo lần chạy đơn", "New single run")}</Link></Button><Button asChild><Link href="/decide"><Compass />{t("Bàn điều độ", "Scheduling desk")}</Link></Button></>} />
      <div role="group" aria-label={t("Lọc theo trạng thái", "Filter by status")} className="mb-3 flex gap-1 overflow-x-auto border-b [scrollbar-width:none]">
        {STATUSES.map(([value, vi, en]) => (
          <button key={value} type="button" aria-pressed={status === value} onClick={() => { setStatus(value); setPage(1); }}
            className={cn("-mb-px border-b-2 px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none", status === value ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground")}>
            {value === "ALL" ? t("Tất cả", "All") : t(vi, en)}
          </button>
        ))}
      </div>
      <FilterBar>
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input type="search" aria-label={t("Tìm lịch", "Search runs")} className="pl-8" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder={t("Tìm theo tên hoặc hash…", "Search by name or hash…")} />
        </div>
        <Select value={algorithm} onValueChange={(value) => { setAlgorithm(value); setPage(1); }}>
          <SelectTrigger className="w-full md:w-56" aria-label={t("Thuật toán", "Algorithm")}><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="ALL">{t("Tất cả thuật toán", "All algorithms")}</SelectItem>{ALGORITHMS.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}</SelectContent>
        </Select>
        {filtered && <Button variant="ghost" onClick={clearFilters}>{t("Xóa lọc", "Clear filters")}</Button>}
      </FilterBar>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
        <span><strong className="text-foreground">{total}</strong> {t("kết quả", "results")} {query.isFetching && !query.isLoading ? t("· đang cập nhật…", "· updating…") : ""}</span>
        <span className="text-xs">{t("Bộ lọc được lưu trên thiết bị này", "Filters are saved on this device")}</span>
      </div>
      {query.isLoading && <SkeletonTable rows={6} />}
      {query.isError && <ErrorState message={t("Không thể tải lịch sản xuất từ backend.", "Could not load production schedules from the backend.")} onRetry={() => void query.refetch()} />}
      {query.data && items.length === 0 && <EmptyState icon={<Search />} title={t("Không tìm thấy lần chạy phù hợp", "No matching runs")} description={t("Thử thay đổi từ khóa hoặc xóa bộ lọc hiện tại.", "Try another keyword or clear the current filters.")} action={filtered ? <Button variant="outline" onClick={clearFilters}>{t("Xóa lọc", "Clear filters")}</Button> : undefined} />}
      {items.length > 0 && <>
        <div className={cn("rounded-lg border bg-card shadow-card transition-opacity", query.isFetching && "opacity-70")}>
          <Table>
            <TableHeader><TableRow><TableHead className="pl-4">{t("Trạng thái", "Status")}</TableHead><TableHead>{t("Dữ liệu", "Data")}</TableHead><TableHead>{t("Thuật toán", "Algorithm")}</TableHead><TableHead>Solver</TableHead><TableHead className="text-right">{t("Thời gian giải", "Solve time")}</TableHead><TableHead className="pr-4">{t("Tạo lúc", "Created")}</TableHead></TableRow></TableHeader>
            <TableBody>{items.map((run) => (
              <TableRow key={run.id} className="cursor-pointer" onClick={() => router.push(`/runs/${run.id}`)}>
                <TableCell className="pl-4"><RunStatusBadge status={run.status} /></TableCell>
                <TableCell><Link href={`/runs/${run.id}`} onClick={(event) => event.stopPropagation()} className="font-medium hover:underline">{formatInputName(run.input_name)}</Link><span className="block font-mono text-xs text-muted-foreground">{run.id.slice(0, 8).toUpperCase()}</span>{run.retry_of_id && <span className="block text-xs text-muted-foreground">{t("Chạy lại từ", "Retry of")} {run.retry_of_id.slice(0, 8)}</span>}</TableCell>
                <TableCell>{algorithmInfo(run.algorithm).label}<span className="block text-xs text-muted-foreground">seed {run.seed} · {run.time_budget_seconds}s</span></TableCell>
                <TableCell>{solverStatusLabel(run.solver_status)}</TableCell>
                <TableCell className="text-right tabular-nums">{elapsed(run.started_at, run.finished_at)}</TableCell>
                <TableCell className="pr-4 text-muted-foreground">{formatDateTime(run.created_at)}</TableCell>
              </TableRow>
            ))}</TableBody>
          </Table>
        </div>
        <Pagination page={page} pageCount={Math.max(1, Math.ceil(total / PAGE_SIZE))} busy={query.isFetching} onChange={setPage} label={t("Phân trang lịch sản xuất", "Schedule pagination")} />
      </>}
    </>
  );
}

export default function RunsPage() { return <Suspense fallback={<SkeletonTable rows={6} />}><RunsContent /></Suspense>; }
