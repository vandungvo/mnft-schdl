"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useDeferredValue, useEffect, useState, type FormEvent } from "react";

import { ErrorState, SkeletonCards } from "@/components/ui-states";
import { apiErrorMessage, createProductionPlan, listMasterDatasets, listProductionPlans } from "@/lib/api";
import { dateInputToMinute, formatDateTime, formatDuration, formatInputName, minuteToDate, minuteToDateInput } from "@/lib/format";

function dateLabel(origin: string, day: number) {
  return new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium" }).format(minuteToDate(origin, day * 1440));
}

function PlanningContent() {
  const router = useRouter();
  const params = useSearchParams();
  const queryClient = useQueryClient();
  const datasets = useQuery({ queryKey: ["master-datasets"], queryFn: () => listMasterDatasets() });
  const [datasetId, setDatasetId] = useState("");
  const [startDay, setStartDay] = useState(0);
  const [endDay, setEndDay] = useState<number | null>(null);
  const [bucketMinutes, setBucketMinutes] = useState<1440 | 10080>(1440);
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [status, setStatus] = useState(params.get("status") ?? "all");
  const [page, setPage] = useState(1);
  const pageSize = 12;
  const plans = useQuery({ queryKey: ["production-plans", { page, status, search: deferredSearch }], queryFn: () => listProductionPlans({ limit: pageSize, offset: (page - 1) * pageSize, status, search: deferredSearch }) });
  const effectiveDatasetId = datasetId || datasets.data?.items[0]?.id || "";
  const selectedDataset = datasets.data?.items.find((item) => item.id === effectiveDatasetId);
  const horizonDays = selectedDataset ? selectedDataset.horizon / 1440 : 0;
  const effectiveEndDay = endDay ?? horizonDays;
  const periodError = !Number.isInteger(startDay) || !Number.isInteger(effectiveEndDay) ? "Kỳ kế hoạch phải được nhập theo ngày nguyên." : startDay < 0 || effectiveEndDay <= startDay || effectiveEndDay > horizonDays ? `Kỳ kế hoạch phải nằm trong khoảng ngày 0 đến ${horizonDays}.` : "";

  useEffect(() => {
    const saved = window.localStorage.getItem("planning-filters");
    if (!saved || params.get("status")) return;
    const timer = window.setTimeout(() => { try { const value = JSON.parse(saved) as { search?: string; status?: string }; setSearch(value.search ?? ""); setStatus(value.status ?? "all"); } catch { /* ignore legacy value */ } }, 0);
    return () => window.clearTimeout(timer);
  }, [params]);
  useEffect(() => { window.localStorage.setItem("planning-filters", JSON.stringify({ search, status })); }, [search, status]);

  const filteredPlans = plans.data?.items ?? [];
  const planPageCount = Math.max(1, Math.ceil((plans.data?.total ?? 0) / pageSize));

  const mutation = useMutation({ mutationFn: () => createProductionPlan({ dataset_id: effectiveDatasetId, period_start: startDay * 1440, period_end: effectiveEndDay * 1440, bucket_minutes: bucketMinutes }), onSuccess: async (plan) => { await queryClient.invalidateQueries({ queryKey: ["production-plans"] }); router.push(`/planning/${plan.id}`); } });
  function selectDataset(value: string) { setDatasetId(value); setStartDay(0); setEndDay(null); }
  function submit(event: FormEvent) { event.preventDefault(); if (effectiveDatasetId && selectedDataset?.is_ready && !periodError) mutation.mutate(); }

  return <section>
    <header className="page-header"><div><span className="eyebrow">KẾ HOẠCH SẢN XUẤT</span><h1>Kế hoạch sản xuất tổng hợp</h1><p>Chọn kỳ nhu cầu, độ phân giải và revision dữ liệu trước khi cân đối công suất.</p></div></header>
    <form className="form-layout plan-form-layout" onSubmit={submit} noValidate>
      <div className="form-main">
        <article className="panel form-section"><div className="form-section-heading"><span className="step-number">1</span><div><h2>Nguồn kế hoạch</h2><p>Kế hoạch được khóa theo revision hiện tại của master data.</p></div></div>{datasets.isLoading ? <div className="field-skeleton">Đang tải dữ liệu nhà máy…</div> : datasets.isError ? <ErrorState title="Không tải được master data" message="Vui lòng thử lại." onRetry={() => void datasets.refetch()} /> : datasets.data?.items.length ? <label className="form-field"><span>Bộ dữ liệu</span><select value={effectiveDatasetId} onChange={(event) => selectDataset(event.target.value)}>{datasets.data.items.map((dataset) => <option key={dataset.id} value={dataset.id}>{formatInputName(dataset.name)} · rev {dataset.revision} · {dataset.counts.orders} đơn</option>)}</select><small>{selectedDataset?.counts.products} sản phẩm · {selectedDataset?.counts.machines} máy · {selectedDataset?.counts.lots} lô</small></label> : <div className="alert alert-warning">Chưa có dữ liệu. <Link href="/master-data" className="text-link">Mở quản lý master data</Link></div>}</article>
        <article className="panel form-section"><div className="form-section-heading"><span className="step-number">2</span><div><h2>Kỳ và độ phân giải</h2><p>Giới hạn phạm vi để tập trung vào nhu cầu cần ra quyết định.</p></div></div><div className="planning-fields"><label className="form-field"><span>Ngày bắt đầu</span><input type="date" required min={selectedDataset ? minuteToDateInput(selectedDataset.origin, 0) : undefined} max={selectedDataset ? minuteToDateInput(selectedDataset.origin, Math.max(0, selectedDataset.horizon - 1440)) : undefined} value={selectedDataset ? minuteToDateInput(selectedDataset.origin, startDay * 1440) : ""} onChange={(event) => { if (selectedDataset && event.target.value) setStartDay(dateInputToMinute(selectedDataset.origin, event.target.value) / 1440); }} /><small>Múi giờ Asia/Ho_Chi_Minh.</small></label><label className="form-field"><span>Ngày kết thúc</span><input type="date" required min={selectedDataset ? minuteToDateInput(selectedDataset.origin, 1440) : undefined} max={selectedDataset ? minuteToDateInput(selectedDataset.origin, selectedDataset.horizon) : undefined} value={selectedDataset ? minuteToDateInput(selectedDataset.origin, effectiveEndDay * 1440) : ""} onChange={(event) => { if (selectedDataset && event.target.value) setEndDay(dateInputToMinute(selectedDataset.origin, event.target.value) / 1440); }} /><small>Tối đa {horizonDays} ngày từ mốc dữ liệu.</small></label><label className="form-field"><span>Chu kỳ tổng hợp</span><select value={bucketMinutes} onChange={(event) => setBucketMinutes(Number(event.target.value) as 1440 | 10080)}><option value={1440}>Theo ngày</option><option value={10080}>Theo tuần</option></select><small>Gom nhu cầu theo hạn giao.</small></label></div>{periodError && selectedDataset && <div className="field-error" role="alert">{periodError}</div>}</article>
      </div>
      <aside className="panel form-summary"><span className="eyebrow">TÓM TẮT</span><h2>Kỳ kế hoạch</h2>{selectedDataset ? <><div className="period-visual"><strong>{effectiveEndDay - startDay}</strong><span>ngày sản xuất</span></div><dl><div><dt>Bắt đầu</dt><dd>{dateLabel(selectedDataset.origin, startDay)}</dd></div><div><dt>Kết thúc</dt><dd>{dateLabel(selectedDataset.origin, effectiveEndDay)}</dd></div><div><dt>Chu kỳ</dt><dd>{bucketMinutes === 1440 ? "Hằng ngày" : "Hằng tuần"}</dd></div><div><dt>Revision</dt><dd>{selectedDataset.revision}</dd></div></dl></> : <p>Chọn một bộ dữ liệu để xem kỳ kế hoạch.</p>}{mutation.isError && <div className="alert alert-error" role="alert">{apiErrorMessage(mutation.error, "Không thể tạo kế hoạch.")}</div>}<button type="submit" className="button button-primary button-wide" disabled={mutation.isPending || !effectiveDatasetId || !selectedDataset?.is_ready || Boolean(periodError)}>{mutation.isPending ? "Đang tính công suất…" : "Tạo kế hoạch"}</button><small className="submit-help">Kết quả là snapshot bất biến, dùng trực tiếp để lập lịch.</small></aside>
    </form>

    <div className="section-heading"><div><span className="eyebrow">LỊCH SỬ</span><h2>Các kế hoạch đã tạo</h2></div><span className="muted-label">{plans.data?.total ?? 0} kế hoạch</span></div>
    <div className="panel toolbar"><label className="form-field search-field"><span>Tìm kiếm</span><input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Tên dữ liệu hoặc mã kế hoạch" /></label><label className="form-field"><span>Trạng thái</span><select value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }}><option value="all">Tất cả</option><option value="READY">Sẵn sàng</option><option value="NEEDS_ATTENTION">Cần xem xét</option></select></label>{(search || status !== "all") && <button type="button" className="button button-quiet" onClick={() => { setSearch(""); setStatus("all"); setPage(1); }}>Xóa lọc</button>}</div>
    {plans.isLoading && <SkeletonCards count={3} />}{plans.isError && <ErrorState title="Không thể tải danh sách kế hoạch" message="Dữ liệu hiện chưa sẵn sàng." onRetry={() => void plans.refetch()} />}
    {plans.data && filteredPlans.length === 0 && <div className="panel empty compact-empty"><h2>{search || status !== "all" ? "Không có kết quả phù hợp" : "Chưa có kế hoạch tổng hợp"}</h2><p>{search || status !== "all" ? "Thử thay đổi từ khóa hoặc trạng thái." : "Hoàn tất biểu mẫu phía trên để tạo kế hoạch đầu tiên."}</p></div>}
    {filteredPlans.length > 0 && <><div className="result-summary"><span>Trang {page}: {filteredPlans.length} / {plans.data?.total ?? 0}</span><span className="saved-filter-note">Bộ lọc được lưu trên thiết bị này</span></div><div className="dataset-grid">{filteredPlans.map((plan) => <Link href={`/planning/${plan.id}`} className="panel dataset-card" key={plan.id}><div className="dataset-card-top"><span className="eyebrow">REVISION {plan.dataset_revision}</span><span className={plan.status === "READY" ? "readiness-ready" : "readiness-error"}>{plan.status === "READY" ? "Sẵn sàng" : "Cần xem xét"}</span></div><h2>{formatInputName(plan.input_name)}</h2><p>{formatDuration(plan.period_end - plan.period_start)} · theo {plan.bucket_minutes === 1440 ? "ngày" : "tuần"}</p><small>{dateLabel(plan.time_origin, plan.period_start)} – {dateLabel(plan.time_origin, plan.period_end)} · tạo {formatDateTime(plan.created_at)}</small></Link>)}</div>{planPageCount > 1 && <nav className="pagination" aria-label="Phân trang kế hoạch"><button type="button" className="button button-small" disabled={page === 1 || plans.isFetching} onClick={() => setPage((value) => value - 1)}>← Trước</button><span>Trang <strong>{page}</strong> / {planPageCount}</span><button type="button" className="button button-small" disabled={page >= planPageCount || plans.isFetching} onClick={() => setPage((value) => value + 1)}>Sau →</button></nav>}</>}
  </section>;
}

export default function ProductionPlanningPage() { return <Suspense fallback={<SkeletonCards count={3} />}><PlanningContent /></Suspense>; }
