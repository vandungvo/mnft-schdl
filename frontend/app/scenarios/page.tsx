"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, CheckCircle2, Compass, FileJson, Loader2, Search, Upload } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useDeferredValue, useRef, useState, type DragEvent } from "react";

import { EmptyState, PageHeader } from "@/components/blocks";
import { DataTable, FilterChip, matches, TableToolbar, type Column } from "@/components/data-table";
import { useI18n } from "@/components/i18n-provider";
import { useToast } from "@/components/toast-provider";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ErrorState, SkeletonTable } from "@/components/ui-states";
import { apiErrorMessage, importMasterDataset, listAllScheduleRuns, listMasterDatasets } from "@/lib/api";
import { useDecisionLog } from "@/lib/decision-log";
import { readScheduleInputFile } from "@/lib/files";
import { formatDateTime, formatDay, formatInputName } from "@/lib/format";
import type { MasterDatasetSummary, ScheduleRunSummary } from "@/lib/types";
import { cn } from "@/lib/utils";

export default function ScenariosPage() {
  const router = useRouter();
  const { t } = useI18n();
  const showToast = useToast();
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileError, setFileError] = useState("");
  const [dragging, setDragging] = useState(false);
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [ready, setReady] = useState<string | null>(null);
  // Scenarios a planning period compiled live with their period; this list is for standalone JSON datasets.
  const query = useQuery({ queryKey: ["master-datasets", "standalone"], queryFn: () => listMasterDatasets({ owner: "standalone" }) });
  // Shares the run-list cache key so the run counts cost nothing extra when switching pages.
  const runs = useQuery({ queryKey: ["schedule-runs", "all"], queryFn: () => listAllScheduleRuns(), refetchInterval: 15_000 });
  const mutation = useMutation({ mutationFn: importMasterDataset, onSuccess: async (dataset) => { await queryClient.invalidateQueries({ queryKey: ["master-datasets"] }); showToast(t(`Import thành công: ${formatInputName(dataset.name)} (revision ${dataset.revision}).`, `Import succeeded: ${formatInputName(dataset.name)} (revision ${dataset.revision}).`), "success"); router.push(`/scenarios/${dataset.id}`); } });

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

  const all = query.data?.items ?? [];
  const rows = all.filter((dataset) => (!ready || (ready === "ready") === dataset.is_ready) && matches(deferredSearch, dataset.name, formatInputName(dataset.name), dataset.id));
  const ownRuns = (dataset: MasterDatasetSummary) => (runs.data ?? []).filter((run) => run.dataset_id === dataset.id);
  const filtered = Boolean(search || ready);

  const columns: Column<MasterDatasetSummary>[] = [
    { id: "name", header: t("Kịch bản", "Scenario"), sortValue: (dataset) => formatInputName(dataset.name), cell: (dataset) => <>
      <Link href={`/scenarios/${dataset.id}`} className="font-medium hover:underline">{formatInputName(dataset.name)}</Link>
      {dataset.schema_version === 5 && <Badge variant="info" className="ml-2 align-middle">{t("5 công đoạn · mẻ cố định", "5 stages · fixed runs")}</Badge>}
      <span className="block text-xs text-muted-foreground">{formatDay(dataset.origin, 0)} → {formatDay(dataset.origin, dataset.horizon - 1)} · {Math.round(dataset.horizon / 1440)} {t("ngày", "days")}</span>
    </> },
    { id: "ready", header: t("Trạng thái", "Status"), sortValue: (dataset) => (dataset.is_ready ? 0 : 1), cell: (dataset) => <Badge variant={dataset.is_ready ? "success" : "danger"}>{dataset.is_ready ? t("Sẵn sàng", "Ready") : t("Cần sửa", "Needs fixes")}</Badge> },
    { id: "revision", header: "Rev", align: "right", sortValue: (dataset) => dataset.revision, cell: (dataset) => dataset.revision },
    { id: "orders", header: t("Đơn", "Orders"), align: "right", sortValue: (dataset) => dataset.counts.orders, cell: (dataset) => dataset.counts.orders },
    { id: "lots", header: t("Lô / mẻ", "Lots / runs"), align: "right", sortValue: (dataset) => dataset.counts.runs ?? dataset.counts.lots, cell: (dataset) => dataset.counts.runs != null ? <span title={t(`${dataset.counts.lots} lô QC trong ${dataset.counts.runs} mẻ`, `${dataset.counts.lots} QC lots in ${dataset.counts.runs} runs`)}>{dataset.counts.runs} {t("mẻ", "runs")}</span> : dataset.counts.lots },
    { id: "machines", header: t("Máy", "Machines"), align: "right", sortValue: (dataset) => dataset.counts.machines, cell: (dataset) => dataset.counts.machines },
    { id: "runs", header: t("Lần chạy", "Runs"), align: "right", sortValue: (dataset) => ownRuns(dataset).length, cell: (dataset) => <RunCount runs={runs.data === undefined ? undefined : ownRuns(dataset)} revision={dataset.revision} /> },
    { id: "decision", header: t("Quyết định", "Decision"), cell: (dataset) => <DecisionCell datasetId={dataset.id} /> },
    { id: "updated", header: t("Cập nhật", "Updated"), sortValue: (dataset) => dataset.updated_at, cell: (dataset) => <span className="text-muted-foreground">{formatDateTime(dataset.updated_at)}</span> },
    { id: "open", header: <span className="sr-only">{t("Thao tác", "Actions")}</span>, className: "w-0", cell: (dataset) => <Button variant="outline" size="sm" asChild><Link href={`/scenarios/${dataset.id}?tab=options`}><Compass />{t("Phương án", "Options")}</Link></Button> },
  ];

  return (
    <div {...dropProps} className="relative">
      <PageHeader title={t("Kịch bản JSON", "JSON scenarios")} description={<>{t("Bộ dữ liệu nhập nguyên khối từ file JSON (schema 4 hoặc 5), dùng cho thực nghiệm và so sánh thuật toán. Lập lịch sản xuất hằng kỳ nên dùng ", "Whole datasets imported from JSON files (schema 4 or 5), for experiments and algorithm comparisons. For day-to-day production scheduling use ")}<Link href="/periods" className="font-medium text-primary hover:underline">{t("Kỳ lập lịch", "Planning periods")}</Link>{t(" — chỉ cần nhập đơn hàng.", " — they only need orders.")}</>}
        actions={<>
          <input ref={inputRef} className="sr-only" type="file" accept="application/json,.json" tabIndex={-1} aria-hidden disabled={mutation.isPending} onChange={(event) => void importFile(event.target.files?.[0])} />
          <Button disabled={mutation.isPending} onClick={pick}>{mutation.isPending ? <Loader2 className="animate-spin" /> : <Upload />}{importLabel}</Button>
        </>} />
      {(fileError || mutation.isError) && <Alert variant="destructive" className="mb-4"><AlertCircle /><AlertDescription>{fileError || apiErrorMessage(mutation.error, t("Không thể import dữ liệu. Không có gì được ghi.", "Could not import the data. Nothing was written."))}</AlertDescription></Alert>}
      {query.isLoading && <SkeletonTable rows={3} />}
      {query.isError && <ErrorState title={t("Không thể tải kịch bản", "Could not load scenarios")} message={t("Không kết nối được tới backend.", "Could not reach the backend.")} onRetry={() => void query.refetch()} />}
      {query.data && all.length === 0 && (
        <button type="button" onClick={pick} disabled={mutation.isPending} className={cn("flex w-full flex-col items-center rounded-lg border-2 border-dashed bg-card px-6 py-14 text-center transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none", dragging ? "border-primary bg-accent" : "hover:border-primary/60")}>
          <span className="mb-3 grid size-11 place-items-center rounded-lg bg-accent text-primary"><FileJson className="size-5" /></span>
          <span className="text-base font-semibold">{t("Chưa có kịch bản", "No scenarios yet")}</span>
          <span className="mt-1 max-w-[60ch] text-sm text-muted-foreground">{t("Kéo thả file scheduling input JSON vào đây hoặc bấm để chọn. Mọi quan hệ được kiểm tra trước khi ghi vào database.", "Drop a scheduling input JSON here or click to choose one. Every relation is validated before anything is written.")}</span>
          <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-primary">{mutation.isPending ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}{importLabel}</span>
        </button>
      )}
      {query.data && all.length > 0 && <>
        <TableToolbar search={search} onSearch={setSearch} placeholder={t("Tìm kịch bản…", "Search scenarios…")} count={rows.length} onClear={filtered ? () => { setSearch(""); setReady(null); } : undefined}>
          <FilterChip label={t("Trạng thái", "Status")} value={ready} onChange={setReady}
            options={[{ value: "ready", label: t("Sẵn sàng", "Ready"), count: all.filter((dataset) => dataset.is_ready).length }, { value: "blocked", label: t("Cần sửa", "Needs fixes"), count: all.filter((dataset) => !dataset.is_ready).length }]} />
          <span className="hidden text-xs text-muted-foreground lg:inline">{t("Mẹo: kéo thả file JSON vào trang để nhập.", "Tip: drop a JSON file onto the page to import.")}</span>
        </TableToolbar>
        <DataTable rows={rows} columns={columns} rowKey={(dataset) => dataset.id} rowHref={(dataset) => `/scenarios/${dataset.id}`} initialSort={{ id: "updated", desc: true }} label={t("Danh sách kịch bản", "Scenario list")} busy={query.isFetching && !query.isLoading}
          empty={<EmptyState icon={<Search />} title={t("Không có kết quả phù hợp", "No matching results")} description={t("Thử một từ khóa khác.", "Try another keyword.")} action={<Button variant="outline" onClick={() => { setSearch(""); setReady(null); }}>{t("Xóa lọc", "Clear filters")}</Button>} />} />
      </>}
      {dragging && (
        <div className="pointer-events-none fixed inset-0 z-40 grid place-items-center bg-background/70 backdrop-blur-[1px]" aria-hidden>
          <div className="rounded-lg border-2 border-dashed border-primary bg-card px-8 py-6 text-center shadow-float"><FileJson className="mx-auto mb-2 size-6 text-primary" /><p className="font-semibold">{t("Thả để nhập kịch bản", "Drop to import the scenario")}</p></div>
        </div>
      )}
    </div>
  );
}

function RunCount({ runs, revision }: { runs: ScheduleRunSummary[] | undefined; revision: number }) {
  const { t } = useI18n();
  if (runs === undefined) return <span className="text-muted-foreground">…</span>;
  const current = runs.filter((run) => run.dataset_revision === revision).length;
  return <span title={t(`${current} trên revision hiện hành`, `${current} on the current revision`)}>{runs.length}{runs.length > current && <span className="text-xs text-muted-foreground"> ({current} rev {revision})</span>}</span>;
}

/** Own component: the decision log is a hook (device-local store), one per row. */
function DecisionCell({ datasetId }: { datasetId: string }) {
  const { t } = useI18n();
  const { entries } = useDecisionLog(datasetId);
  const last = entries[entries.length - 1];
  if (!last) return <span className="text-muted-foreground">{t("Chưa chốt", "Not committed")}</span>;
  return <span className="inline-flex max-w-56 items-center gap-1.5" title={`“${last.reason}” · ${formatDateTime(last.at)}`}><CheckCircle2 className="size-3.5 shrink-0 text-success" /><span className="truncate font-medium">{last.alternative}</span></span>;
}
