"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BarChart3, Search } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useDeferredValue, useEffect, useState, type FormEvent } from "react";

import { DescList, EmptyState, Field, FilterBar, FormStep, PageHeader, Pagination, SectionHeading } from "@/components/blocks";
import { useI18n } from "@/components/i18n-provider";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState, SkeletonCards } from "@/components/ui-states";
import { apiErrorMessage, createProductionPlan, listMasterDatasets, listProductionPlans } from "@/lib/api";
import { dateInputToMinute, formatDate, formatDateTime, formatDuration, formatInputName, minuteToDate, minuteToDateInput } from "@/lib/format";

function dateLabel(origin: string, day: number) {
  return formatDate(minuteToDate(origin, day * 1440));
}

function PlanningContent() {
  const { t } = useI18n();
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
  const periodError = !Number.isInteger(startDay) || !Number.isInteger(effectiveEndDay) ? t("Kỳ kế hoạch phải được nhập theo ngày nguyên.", "The planning period must be whole days.") : startDay < 0 || effectiveEndDay <= startDay || effectiveEndDay > horizonDays ? t(`Kỳ kế hoạch phải nằm trong khoảng ngày 0 đến ${horizonDays}.`, `The planning period must fall between day 0 and day ${horizonDays}.`) : "";

  useEffect(() => {
    const saved = window.localStorage.getItem("planning-filters");
    if (!saved || params.get("status")) return;
    const timer = window.setTimeout(() => { try { const value = JSON.parse(saved) as { search?: string; status?: string }; setSearch(value.search ?? ""); setStatus(value.status ?? "all"); } catch { /* ignore legacy value */ } }, 0);
    return () => window.clearTimeout(timer);
  }, [params]);
  useEffect(() => { window.localStorage.setItem("planning-filters", JSON.stringify({ search, status })); }, [search, status]);

  const items = plans.data?.items ?? [];
  const filtered = Boolean(search || status !== "all");
  const mutation = useMutation({ mutationFn: () => createProductionPlan({ dataset_id: effectiveDatasetId, period_start: startDay * 1440, period_end: effectiveEndDay * 1440, bucket_minutes: bucketMinutes }), onSuccess: async (plan) => { await queryClient.invalidateQueries({ queryKey: ["production-plans"] }); router.push(`/planning/${plan.id}`); } });
  function selectDataset(value: string) { setDatasetId(value); setStartDay(0); setEndDay(null); }
  function submit(event: FormEvent) { event.preventDefault(); if (effectiveDatasetId && selectedDataset?.is_ready && !periodError) mutation.mutate(); }

  return (
    <>
      <PageHeader title={t("Kế hoạch tổng hợp", "Aggregate planning")} description={t("Cân đối nhu cầu với công suất theo kỳ (tháng/quý) trước khi lập lịch chi tiết. Chọn kỳ, độ phân giải và revision dữ liệu.", "Balance demand against capacity per period (month/quarter) before detailed scheduling. Choose the period, granularity and data revision.")} />
      <SectionHeading title={t("Tạo kế hoạch mới", "Create a new plan")} className="mt-0" />
      <form className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_320px]" onSubmit={submit} noValidate>
        <div className="grid gap-4">
          <FormStep step="1" title={t("Nguồn kế hoạch", "Plan source")} description={t("Kế hoạch được khóa theo revision hiện tại của master data.", "The plan is locked to the current master data revision.")}>
            {datasets.isLoading ? <Skeleton className="h-9" /> : datasets.isError ? <ErrorState compact title={t("Không tải được master data", "Could not load master data")} message={t("Vui lòng thử lại.", "Please try again.")} onRetry={() => void datasets.refetch()} /> : datasets.data?.items.length ? (
              <Field label={t("Bộ dữ liệu", "Dataset")} hint={t(`${selectedDataset?.counts.products} sản phẩm · ${selectedDataset?.counts.machines} máy · ${selectedDataset?.counts.lots} lô`, `${selectedDataset?.counts.products} products · ${selectedDataset?.counts.machines} machines · ${selectedDataset?.counts.lots} lots`)}>
                <Select value={effectiveDatasetId} onValueChange={selectDataset}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>{datasets.data.items.map((dataset) => <SelectItem key={dataset.id} value={dataset.id}>{formatInputName(dataset.name)} · rev {dataset.revision} · {dataset.counts.orders} {t("đơn", "orders")}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
            ) : <Alert className="border-warning/40 bg-warning-soft"><AlertDescription>{t("Chưa có dữ liệu.", "No data yet.")} <Link href="/master-data" className="font-semibold text-primary hover:underline">{t("Mở quản lý master data", "Open master data management")}</Link></AlertDescription></Alert>}
          </FormStep>
          <FormStep step="2" title={t("Kỳ và độ phân giải", "Period and granularity")} description={t("Giới hạn phạm vi để tập trung vào nhu cầu cần ra quyết định.", "Narrow the scope to the demand that needs a decision.")}>
            <div className="grid gap-4 md:grid-cols-3">
              <Field label={t("Ngày bắt đầu", "Start date")} hint={t("Múi giờ Asia/Ho_Chi_Minh.", "Time zone Asia/Ho_Chi_Minh.")}>
                <Input type="date" required min={selectedDataset ? minuteToDateInput(selectedDataset.origin, 0) : undefined} max={selectedDataset ? minuteToDateInput(selectedDataset.origin, Math.max(0, selectedDataset.horizon - 1440)) : undefined} value={selectedDataset ? minuteToDateInput(selectedDataset.origin, startDay * 1440) : ""} onChange={(event) => { if (selectedDataset && event.target.value) setStartDay(dateInputToMinute(selectedDataset.origin, event.target.value) / 1440); }} />
              </Field>
              <Field label={t("Ngày kết thúc", "End date")} hint={t(`Tối đa ${horizonDays} ngày từ mốc dữ liệu.`, `Up to ${horizonDays} days from the data origin.`)}>
                <Input type="date" required min={selectedDataset ? minuteToDateInput(selectedDataset.origin, 1440) : undefined} max={selectedDataset ? minuteToDateInput(selectedDataset.origin, selectedDataset.horizon) : undefined} value={selectedDataset ? minuteToDateInput(selectedDataset.origin, effectiveEndDay * 1440) : ""} onChange={(event) => { if (selectedDataset && event.target.value) setEndDay(dateInputToMinute(selectedDataset.origin, event.target.value) / 1440); }} />
              </Field>
              <Field label={t("Chu kỳ tổng hợp", "Bucket size")} hint={t("Gom nhu cầu theo hạn giao.", "Demand is grouped by due date.")}>
                <Select value={String(bucketMinutes)} onValueChange={(value) => setBucketMinutes(Number(value) as 1440 | 10080)}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="1440">{t("Theo ngày", "Daily")}</SelectItem><SelectItem value="10080">{t("Theo tuần", "Weekly")}</SelectItem></SelectContent>
                </Select>
              </Field>
            </div>
            {periodError && selectedDataset && <p role="alert" className="mt-3 rounded-md bg-danger-soft px-3 py-2 text-sm text-destructive">{periodError}</p>}
          </FormStep>
        </div>
        <aside className="rounded-lg border bg-card p-5 shadow-card lg:sticky lg:top-20">
          <span className="mb-1 block text-xs font-semibold text-muted-foreground">{t("Tóm tắt", "Summary")}</span>
          <h2 className="mb-3 text-lg font-semibold">{t("Kỳ kế hoạch", "Planning period")}</h2>
          {selectedDataset ? <>
            <div className="mb-3 flex items-baseline gap-2 rounded-lg bg-accent p-4 text-primary"><strong className="text-3xl leading-none font-bold tracking-tight">{effectiveEndDay - startDay}</strong><span className="text-xs text-muted-foreground">{t("ngày sản xuất", "production days")}</span></div>
            <DescList items={[[t("Bắt đầu", "Start"), dateLabel(selectedDataset.origin, startDay)], [t("Kết thúc", "End"), dateLabel(selectedDataset.origin, effectiveEndDay)], [t("Chu kỳ", "Bucket"), bucketMinutes === 1440 ? t("Hằng ngày", "Daily") : t("Hằng tuần", "Weekly")], ["Revision", selectedDataset.revision]]} />
          </> : <p className="text-sm text-muted-foreground">{t("Chọn một bộ dữ liệu để xem kỳ kế hoạch.", "Choose a dataset to see the planning period.")}</p>}
          {mutation.isError && <p role="alert" className="mt-3 rounded-md bg-danger-soft px-3 py-2 text-sm text-destructive">{apiErrorMessage(mutation.error, t("Không thể tạo kế hoạch.", "Could not create the plan."))}</p>}
          <Button type="submit" className="mt-4 w-full" disabled={mutation.isPending || !effectiveDatasetId || !selectedDataset?.is_ready || Boolean(periodError)}><BarChart3 />{mutation.isPending ? t("Đang tính công suất…", "Calculating capacity…") : t("Tạo kế hoạch", "Create plan")}</Button>
          <p className="mt-2 text-center text-xs text-muted-foreground">{t("Kết quả là snapshot bất biến, dùng trực tiếp để lập lịch.", "The result is an immutable snapshot, ready for detailed scheduling.")}</p>
        </aside>
      </form>

      <SectionHeading title={t("Các kế hoạch đã tạo", "Plans created")} aside={<span className="text-sm text-muted-foreground">{plans.data?.total ?? 0} {t("kế hoạch", "plans")}</span>} />
      <FilterBar>
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input aria-label={t("Tìm kế hoạch", "Search plans")} className="pl-8" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder={t("Tên dữ liệu hoặc mã kế hoạch", "Dataset name or plan ID")} />
        </div>
        <Select value={status} onValueChange={(value) => { setStatus(value); setPage(1); }}>
          <SelectTrigger className="w-full md:w-48" aria-label={t("Trạng thái", "Status")}><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="all">{t("Tất cả trạng thái", "All statuses")}</SelectItem><SelectItem value="READY">{t("Sẵn sàng", "Ready")}</SelectItem><SelectItem value="NEEDS_ATTENTION">{t("Cần xem xét", "Needs review")}</SelectItem></SelectContent>
        </Select>
        {filtered && <Button variant="ghost" onClick={() => { setSearch(""); setStatus("all"); setPage(1); }}>{t("Xóa lọc", "Clear filters")}</Button>}
      </FilterBar>
      {plans.isLoading && <SkeletonCards count={3} />}
      {plans.isError && <ErrorState title={t("Không thể tải danh sách kế hoạch", "Could not load plans")} message={t("Dữ liệu hiện chưa sẵn sàng.", "The data is not available right now.")} onRetry={() => void plans.refetch()} />}
      {plans.data && items.length === 0 && <EmptyState icon={<BarChart3 />} title={filtered ? t("Không có kết quả phù hợp", "No matching results") : t("Chưa có kế hoạch tổng hợp", "No aggregate plans yet")} description={filtered ? t("Thử thay đổi từ khóa hoặc trạng thái.", "Try another keyword or status.") : t("Hoàn tất biểu mẫu phía trên để tạo kế hoạch đầu tiên.", "Complete the form above to create the first plan.")} />}
      {items.length > 0 && <>
        <div className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(min(300px,100%),1fr))]">
          {items.map((plan) => (
            <Link href={`/planning/${plan.id}`} key={plan.id} className="flex flex-col gap-2 rounded-lg border bg-card p-5 shadow-card transition-[border-color,transform] hover:-translate-y-0.5 hover:border-primary">
              <div className="flex items-center justify-between gap-2"><span className="text-xs font-medium text-muted-foreground">Revision {plan.dataset_revision}</span><Badge variant={plan.status === "READY" ? "success" : "warning"}>{plan.status === "READY" ? t("Sẵn sàng", "Ready") : t("Cần xem xét", "Needs review")}</Badge></div>
              <h3 className="text-lg leading-snug font-semibold">{formatInputName(plan.input_name)}</h3>
              <p className="text-sm text-muted-foreground">{formatDuration(plan.period_end - plan.period_start)} · {plan.bucket_minutes === 1440 ? t("theo ngày", "daily") : t("theo tuần", "weekly")}</p>
              <small className="text-xs text-muted-foreground">{dateLabel(plan.time_origin, plan.period_start / 1440)} – {dateLabel(plan.time_origin, plan.period_end / 1440)} · {t("tạo", "created")} {formatDateTime(plan.created_at)}</small>
            </Link>
          ))}
        </div>
        <Pagination page={page} pageCount={Math.max(1, Math.ceil((plans.data?.total ?? 0) / pageSize))} busy={plans.isFetching} onChange={setPage} label={t("Phân trang kế hoạch", "Plan pagination")} />
      </>}
    </>
  );
}

export default function ProductionPlanningPage() { return <Suspense fallback={<SkeletonCards count={3} />}><PlanningContent /></Suspense>; }
