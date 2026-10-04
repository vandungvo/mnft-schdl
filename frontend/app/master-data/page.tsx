"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, ArrowRight, Compass, FileJson, Loader2, Search, Upload } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useDeferredValue, useRef, useState, type DragEvent } from "react";

import { EmptyState, FilterBar, PageHeader, Pagination } from "@/components/blocks";
import { useI18n } from "@/components/i18n-provider";
import { useToast } from "@/components/toast-provider";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ErrorState, SkeletonCards } from "@/components/ui-states";
import { apiErrorMessage, importMasterDataset, listAllScheduleRuns, listMasterDatasets } from "@/lib/api";
import { readScheduleInputFile } from "@/lib/files";
import { formatDateTime, formatDay, formatInputName, formatNumber } from "@/lib/format";
import type { MasterDatasetSummary, ScheduleRunSummary } from "@/lib/types";
import { cn } from "@/lib/utils";

export default function MasterDataPage() {
  const router = useRouter();
  const { t } = useI18n();
  const showToast = useToast();
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileError, setFileError] = useState("");
  const [dragging, setDragging] = useState(false);
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [page, setPage] = useState(1);
  const pageSize = 12;
  const query = useQuery({ queryKey: ["master-datasets", { page, search: deferredSearch }], queryFn: () => listMasterDatasets({ limit: pageSize, offset: (page - 1) * pageSize, search: deferredSearch }) });
  // Shares the scheduling-desk cache key so the run counts cost nothing extra when switching pages.
  const runs = useQuery({ queryKey: ["schedule-runs", "all"], queryFn: () => listAllScheduleRuns(), refetchInterval: 15_000 });
  const mutation = useMutation({ mutationFn: importMasterDataset, onSuccess: async (dataset) => { await queryClient.invalidateQueries({ queryKey: ["master-datasets"] }); showToast(t(`Import thành công: ${formatInputName(dataset.name)} (revision ${dataset.revision}).`, `Import succeeded: ${formatInputName(dataset.name)} (revision ${dataset.revision}).`), "success"); router.push(`/master-data/${dataset.id}`); } });
  const items = query.data?.items ?? [];

  async function importFile(file?: File) {
    if (!file) return;
    setFileError("");
    try { mutation.mutate(await readScheduleInputFile(file)); }
    catch (error) { setFileError(error instanceof Error ? error.message : t("Không thể đọc file JSON.", "Could not read the JSON file.")); }
    finally { if (inputRef.current) inputRef.current.value = ""; }
  }
  const dropProps = {
    onDragOver: (event: DragEvent) => { event.preventDefault(); setDragging(true); },
    onDragLeave: () => setDragging(false),
    onDrop: (event: DragEvent) => { event.preventDefault(); setDragging(false); void importFile(event.dataTransfer.files?.[0]); },
  };
  const pick = () => inputRef.current?.click();
  const importLabel = mutation.isPending ? t("Đang kiểm tra…", "Validating…") : t("Nhập JSON", "Import JSON");

  return (
    <div {...dropProps} className="relative">
      <PageHeader title={t("Dữ liệu nhà máy", "Factory data")} description={t("Mỗi bộ dữ liệu là một kịch bản: sản phẩm, bán thành phẩm, máy và lịch ca, đơn hàng — có revision để truy vết.", "Each dataset is a scenario: products, semi-finished stock, machines and shifts, orders — revisioned for traceability.")}
        actions={<>
          <input ref={inputRef} className="sr-only" type="file" accept="application/json,.json" tabIndex={-1} aria-hidden disabled={mutation.isPending} onChange={(event) => void importFile(event.target.files?.[0])} />
          <Button disabled={mutation.isPending} onClick={pick}>{mutation.isPending ? <Loader2 className="animate-spin" /> : <Upload />}{importLabel}</Button>
        </>} />
      {(fileError || mutation.isError) && <Alert variant="destructive" className="mb-4"><AlertCircle /><AlertDescription>{fileError || apiErrorMessage(mutation.error, t("Không thể import dữ liệu. Không có gì được ghi.", "Could not import the data. Nothing was written."))}</AlertDescription></Alert>}
      {query.isLoading && <SkeletonCards count={3} />}
      {query.isError && <ErrorState title={t("Không thể tải dữ liệu nhà máy", "Could not load factory data")} message={t("Không kết nối được tới backend.", "Could not reach the backend.")} onRetry={() => void query.refetch()} />}
      {query.data?.total === 0 && !search && (
        <button type="button" onClick={pick} disabled={mutation.isPending} className={cn("flex w-full flex-col items-center rounded-lg border-2 border-dashed bg-card px-6 py-14 text-center transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none", dragging ? "border-primary bg-accent" : "hover:border-primary/60")}>
          <span className="mb-3 grid size-11 place-items-center rounded-lg bg-accent text-primary"><FileJson className="size-5" /></span>
          <span className="text-base font-semibold">{t("Chưa có dữ liệu nhà máy", "No factory data yet")}</span>
          <span className="mt-1 max-w-[60ch] text-sm text-muted-foreground">{t("Kéo thả file scheduling input JSON vào đây hoặc bấm để chọn. Mọi quan hệ được kiểm tra trước khi ghi vào database.", "Drop a scheduling input JSON here or click to choose one. Every relation is validated before anything is written.")}</span>
          <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-primary">{mutation.isPending ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}{importLabel}</span>
        </button>
      )}
      {query.data && (query.data.total > 0 || search) && <>
        <FilterBar>
          <div className="relative flex-1 md:max-w-md">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input type="search" aria-label={t("Tìm bộ dữ liệu", "Search datasets")} className="pl-8" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder={t("Tên nhà máy hoặc bộ dữ liệu", "Factory or dataset name")} />
          </div>
          <span className="text-sm text-muted-foreground"><strong className="text-foreground">{query.data.total}</strong> {t("bộ dữ liệu", "datasets")}{query.isFetching ? t(" · đang cập nhật…", " · updating…") : ""}</span>
          <span className="hidden text-xs text-muted-foreground md:ml-auto md:inline">{t("Mẹo: kéo thả file JSON vào trang để nhập.", "Tip: drop a JSON file onto the page to import.")}</span>
        </FilterBar>
        {items.length === 0 ? <EmptyState icon={<Search />} title={t("Không có kết quả phù hợp", "No matching results")} description={t("Thử một từ khóa khác.", "Try another keyword.")} action={<Button variant="outline" onClick={() => { setSearch(""); setPage(1); }}>{t("Xóa tìm kiếm", "Clear search")}</Button>} /> : <>
          <div className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(min(340px,100%),1fr))]">
            {items.map((dataset) => <DatasetCard key={dataset.id} dataset={dataset} runs={runs.data} />)}
          </div>
          <Pagination page={page} pageCount={Math.max(1, Math.ceil(query.data.total / pageSize))} busy={query.isFetching} onChange={setPage} label={t("Phân trang dữ liệu nhà máy", "Factory data pagination")} />
        </>}
      </>}
      {dragging && (
        <div className="pointer-events-none fixed inset-0 z-40 grid place-items-center bg-background/70 backdrop-blur-[1px]" aria-hidden>
          <div className="rounded-lg border-2 border-dashed border-primary bg-card px-8 py-6 text-center shadow-float"><FileJson className="mx-auto mb-2 size-6 text-primary" /><p className="font-semibold">{t("Thả để nhập bộ dữ liệu", "Drop to import the dataset")}</p></div>
        </div>
      )}
    </div>
  );
}

function DatasetCard({ dataset, runs }: { dataset: MasterDatasetSummary; runs: ScheduleRunSummary[] | undefined }) {
  const { t } = useI18n();
  const own = (runs ?? []).filter((run) => run.dataset_id === dataset.id);
  const current = own.filter((run) => run.dataset_revision === dataset.revision).length;
  const days = Math.round(dataset.horizon / 1440);
  const figures: Array<[number, string]> = [[dataset.counts.products, t("sản phẩm", "products")], [dataset.counts.machines, t("máy", "machines")], [dataset.counts.orders, t("đơn", "orders")], [dataset.counts.lots, t("lô", "lots")]];
  return (
    <article className="group relative flex flex-col gap-3 rounded-lg border bg-card p-4 shadow-card transition-colors focus-within:border-primary/60 hover:border-primary/60">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-[15px] leading-snug font-semibold">
            <Link href={`/master-data/${dataset.id}`} className="after:absolute after:inset-0 after:rounded-lg focus-visible:outline-none">{formatInputName(dataset.name)}</Link>
          </h2>
          <p className="text-xs text-muted-foreground">{formatDay(dataset.origin, 0)} → {formatDay(dataset.origin, dataset.horizon - 1)} · {days} {t("ngày", "days")}</p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <Badge variant={dataset.is_ready ? "success" : "danger"}>{dataset.is_ready ? t("Sẵn sàng", "Ready") : t("Cần sửa", "Needs fixes")}</Badge>
          <span className="text-xs text-muted-foreground">rev {dataset.revision}</span>
        </div>
      </div>
      <dl className="grid grid-cols-4 gap-2 rounded-md bg-surface-2 px-3 py-2.5 text-xs text-muted-foreground">
        {figures.map(([value, label]) => <div key={label}><dt className="sr-only">{label}</dt><dd><strong className="block text-lg font-semibold text-foreground tabular-nums">{formatNumber(value)}</strong>{label}</dd></div>)}
      </dl>
      <p className="text-xs text-muted-foreground">
        {runs === undefined ? t("Đang đếm lần chạy…", "Counting runs…") : own.length === 0 ? t("Chưa có lần chạy nào", "No runs yet") : t(`${own.length} lần chạy · ${current} trên revision hiện hành`, `${own.length} runs · ${current} on the current revision`)}
        {" · "}{t("cập nhật", "updated")} {formatDateTime(dataset.updated_at)}
      </p>
      <div className="relative z-10 mt-auto flex items-center justify-between gap-2 border-t pt-3">
        <Button variant="outline" size="sm" asChild><Link href={`/decide/${dataset.id}`}><Compass />{t("Bàn điều độ", "Scheduling desk")}</Link></Button>
        <span className="pointer-events-none inline-flex items-center gap-1 text-sm font-medium text-primary">{t("Xem dữ liệu", "View data")}<ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" /></span>
      </div>
    </article>
  );
}
