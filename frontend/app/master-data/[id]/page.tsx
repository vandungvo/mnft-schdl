"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, CalendarClock, Compass, Database, Download, Loader2, MoreHorizontal, Trash2, Upload } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Suspense, useCallback, useMemo, useRef, useState } from "react";

import { EmptyState, PageHeader } from "@/components/blocks";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { useI18n } from "@/components/i18n-provider";
import { BtpSection } from "@/components/master-data/btp";
import { HistorySection } from "@/components/master-data/history";
import { MachinesSection } from "@/components/master-data/machines";
import { OrdersSection } from "@/components/master-data/orders";
import { DemandPanel, HorizonPanel, KeyFigures, ProcessFlow, ReadinessPanel, RevisionPanel, tabLabel } from "@/components/master-data/overview";
import { ProductsSection } from "@/components/master-data/products";
import { SettingsSection } from "@/components/master-data/settings";
import { DatasetProvider, useMdLocation } from "@/components/master-data/shared";
import { useToast } from "@/components/toast-provider";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ErrorState, SkeletonTable } from "@/components/ui-states";
import { ApiError, apiErrorMessage, deleteMasterDataset, getMasterDataset, listAllScheduleRuns, replaceMasterDataset } from "@/lib/api";
import { readScheduleInputFile } from "@/lib/files";
import { formatDateTime, formatDay, formatInputName } from "@/lib/format";
import { adviseChecks, MD_TABS, readinessIssues, type MdTab } from "@/lib/master-data";
import type { MasterDatasetDetail, SchedulingInputDocument } from "@/lib/types";

function Detail() {
  const { id } = useParams<{ id: string }>();
  const { t } = useI18n();
  const router = useRouter();
  const queryClient = useQueryClient();
  const showToast = useToast();
  const { tab, item, due, navigate } = useMdLocation();
  const replaceInputRef = useRef<HTMLInputElement>(null);
  const [replaceFileError, setReplaceFileError] = useState("");
  const [pendingReplace, setPendingReplace] = useState<{ file: string; input: unknown } | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const query = useQuery({ queryKey: ["master-dataset", id], queryFn: () => getMasterDataset(id) });
  // Same cache key as the scheduling desk, so switching between the two does not refetch.
  const runs = useQuery({ queryKey: ["dataset-runs", id], queryFn: async () => (await listAllScheduleRuns()).filter((run) => run.dataset_id === id) });
  const applyUpdate = useCallback((updated: MasterDatasetDetail) => {
    queryClient.setQueryData(["master-dataset", id], updated);
    void queryClient.invalidateQueries({ queryKey: ["master-datasets"] });
    void queryClient.invalidateQueries({ queryKey: ["audit-events", "master_dataset", id] });
  }, [id, queryClient]);
  const remove = useMutation({ mutationFn: () => deleteMasterDataset(id), onSuccess: async () => { showToast(t("Đã xóa bộ dữ liệu.", "Dataset deleted.")); await queryClient.invalidateQueries({ queryKey: ["master-datasets"] }); router.push("/master-data"); } });
  const replace = useMutation({
    mutationFn: (input: unknown) => replaceMasterDataset(id, input, query.data!.revision),
    onSuccess: (updated) => { setPendingReplace(null); applyUpdate(updated); showToast(t(`Đã thay dữ liệu — revision ${updated.revision}.`, `Data replaced — revision ${updated.revision}.`)); },
    onError: () => setPendingReplace(null),
  });

  const dataset = query.data;
  const issues = useMemo(() => (dataset ? [...readinessIssues(dataset.readiness_errors, dataset.input), ...adviseChecks(dataset.input)] : []), [dataset]);

  if (query.isLoading) return <SkeletonTable rows={7} />;
  if (query.isError || !dataset) {
    const missing = query.error instanceof ApiError && query.error.status === 404;
    return missing
      ? <EmptyState icon={<Database />} title={t("Không tìm thấy bộ dữ liệu", "Dataset not found")} description={t("Bộ dữ liệu có thể đã bị xóa. Các lần chạy cũ vẫn giữ snapshot riêng.", "It may have been deleted. Earlier runs keep their own snapshots.")} action={<Button asChild><Link href="/master-data">{t("Về danh sách dữ liệu", "Back to factory data")}</Link></Button>} />
      : <ErrorState message={t("Không thể tải bộ dữ liệu này.", "Could not load this dataset.")} onRetry={() => void query.refetch()} />;
  }
  const input = dataset.input;
  const go = (next: MdTab, record?: string) => navigate({ tab: next, item: record ?? null });

  function exportJson() {
    const blob = new Blob([JSON.stringify(input, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${dataset!.name.replace(/[^a-zA-Z0-9_-]+/g, "-")}-r${dataset!.revision}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    showToast(t("Đã tải snapshot JSON.", "Snapshot JSON downloaded."), "info");
  }

  async function pickReplaceFile(file?: File) {
    if (!file) return;
    setReplaceFileError("");
    replace.reset();
    try { setPendingReplace({ file: file.name, input: await readScheduleInputFile(file) }); }
    catch (error) { setReplaceFileError(error instanceof Error ? error.message : t("Không thể đọc file JSON.", "Could not read the JSON file.")); }
    finally { if (replaceInputRef.current) replaceInputRef.current.value = ""; }
  }

  const next = pendingReplace?.input as Partial<SchedulingInputDocument> | undefined;
  const diffLine = (label: string, before: number, after: number | undefined) => `${label} ${before} → ${after ?? "?"}`;
  const replaceSummary = next ? [
    diffLine(t("sản phẩm", "products"), input.products.length, next.products?.length),
    diffLine(t("máy", "machines"), Object.keys(input.machines).length, next.machines ? Object.keys(next.machines).length : undefined),
    diffLine(t("đơn", "orders"), input.orders.length, next.orders?.length),
    diffLine(t("lô", "lots"), input.lots.length, next.lots?.length),
  ].join(" · ") : "";

  const errorsByTab = (target: MdTab) => issues.filter((issue) => issue.tab === target && issue.severity === "error").length;
  const counts: Partial<Record<MdTab, number>> = { products: input.products.length, btp: input.btp_codes.length, machines: Object.keys(input.machines).length, orders: input.orders.length };
  const closeItem = () => navigate({ item: null }, "replace");
  const openItem = (target: MdTab) => (record: string) => navigate({ tab: target, item: record });

  return (
    <DatasetProvider value={{ dataset, onUpdated: applyUpdate, reload: () => void query.refetch() }}>
      <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-4">
        <PageHeader back={{ href: "/master-data", label: t("Dữ liệu nhà máy", "Factory data") }} crumb={formatInputName(dataset.name)} title={formatInputName(dataset.name)}
          meta={<>
            <Badge variant={dataset.is_ready ? "success" : "danger"}>{dataset.is_ready ? t("Sẵn sàng", "Ready") : t("Chưa sẵn sàng", "Not ready")}</Badge>
            <Badge variant="outline" title={t("Revision hiện hành", "Current revision")}>rev {dataset.revision}</Badge>
          </>}
          description={`${formatDay(dataset.origin, 0)} → ${formatDay(dataset.origin, input.horizon - 1)} · ${t("cập nhật", "updated")} ${formatDateTime(dataset.updated_at)}`}
          actions={<>
            <input ref={replaceInputRef} className="sr-only" type="file" accept="application/json,.json" tabIndex={-1} aria-hidden disabled={replace.isPending} onChange={(event) => void pickReplaceFile(event.target.files?.[0])} />
            <DropdownMenu>
              <DropdownMenuTrigger asChild><Button variant="outline" aria-label={t("Thao tác khác", "More actions")}>{replace.isPending ? <Loader2 className="animate-spin" /> : <MoreHorizontal />}<span className="sm:inline">{t("Thêm", "More")}</span></Button></DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-60">
                <DropdownMenuLabel>{t("Dữ liệu JSON", "JSON data")}</DropdownMenuLabel>
                <DropdownMenuItem onSelect={exportJson}><Download />{t(`Tải JSON (revision ${dataset.revision})`, `Download JSON (revision ${dataset.revision})`)}</DropdownMenuItem>
                <DropdownMenuItem disabled={replace.isPending} onSelect={() => replaceInputRef.current?.click()}><Upload />{t("Thay bằng file JSON…", "Replace from JSON file…")}</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive" onSelect={() => setDeleteOpen(true)}><Trash2 />{t("Xóa bộ dữ liệu…", "Delete dataset…")}</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button variant="outline" asChild><Link href={`/runs/new?datasetId=${dataset.id}`}><CalendarClock />{t("Tạo lần chạy", "New run")}</Link></Button>
            <Button asChild><Link href={`/decide/${dataset.id}`}><Compass />{t("Mở bàn điều độ", "Open scheduling desk")}</Link></Button>
          </>} />
        {(replaceFileError || replace.isError) && <Alert variant="destructive"><AlertCircle /><AlertDescription>{replaceFileError || apiErrorMessage(replace.error, t("Không thể cập nhật. Dữ liệu cũ chưa bị thay đổi.", "Could not update. The existing data was not changed."))}</AlertDescription></Alert>}

        <Tabs value={tab} onValueChange={(value) => navigate({ tab: value as MdTab, item: null })} className="min-w-0 gap-4">
          <div className="-mx-1 overflow-x-auto px-1 pb-1">
            <TabsList className="h-auto">
              {MD_TABS.map((value) => {
                const errors = value === "overview" ? issues.filter((issue) => issue.severity === "error").length : errorsByTab(value);
                return (
                  <TabsTrigger key={value} value={value} className="px-3 py-1.5">
                    {t(tabLabel(value))}
                    {counts[value] !== undefined && <span className="ml-1.5 rounded-full bg-muted px-1.5 text-[11px] text-muted-foreground tabular-nums">{counts[value]}</span>}
                    {errors > 0 && <span className="ml-1 inline-flex size-4 items-center justify-center rounded-full bg-destructive text-[10px] font-semibold text-white" aria-label={t(`${errors} lỗi`, `${errors} errors`)}>{errors}</span>}
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </div>

          <TabsContent value="overview" className="grid min-w-0 gap-4">
            <ReadinessPanel issues={issues} go={go} />
            <KeyFigures go={go} />
            <ProcessFlow go={go} />
            <HorizonPanel onDay={(day) => navigate({ tab: "orders", item: null, due: day })} />
            <div className="grid min-w-0 gap-4 lg:grid-cols-2">
              <DemandPanel go={go} />
              <RevisionPanel runs={runs.data} go={go} />
            </div>
          </TabsContent>
          <TabsContent value="products" className="min-w-0"><ProductsSection item={tab === "products" ? item : null} onOpen={openItem("products")} onClose={closeItem} /></TabsContent>
          <TabsContent value="btp" className="min-w-0"><BtpSection item={tab === "btp" ? item : null} onOpen={openItem("btp")} onClose={closeItem} /></TabsContent>
          <TabsContent value="machines" className="min-w-0"><MachinesSection item={tab === "machines" ? item : null} onOpen={openItem("machines")} onClose={closeItem} /></TabsContent>
          <TabsContent value="orders" className="min-w-0"><OrdersSection item={tab === "orders" ? item : null} due={due} onOpen={openItem("orders")} onClose={closeItem} onClearDue={() => navigate({ due: null }, "replace")} /></TabsContent>
          <TabsContent value="settings" className="min-w-0"><SettingsSection onDelete={() => setDeleteOpen(true)} /></TabsContent>
          <TabsContent value="history" className="min-w-0"><HistorySection runs={runs.data} go={go} /></TabsContent>
        </Tabs>

        <ConfirmDialog open={pendingReplace !== null} title={t("Thay toàn bộ dữ liệu bằng file này?", "Replace all data with this file?")}
          description={t(`File “${pendingReplace?.file}”: ${replaceSummary}. Dữ liệu được kiểm tra trước khi ghi; nếu hợp lệ sẽ tạo revision ${dataset.revision + 1}. Lần chạy cũ giữ snapshot riêng.`, `File “${pendingReplace?.file}”: ${replaceSummary}. The data is validated before writing; if valid it becomes revision ${dataset.revision + 1}. Earlier runs keep their own snapshots.`)}
          confirmLabel={t("Thay dữ liệu", "Replace data")} pending={replace.isPending} onCancel={() => setPendingReplace(null)} onConfirm={() => replace.mutate(pendingReplace!.input)} />
        <ConfirmDialog open={deleteOpen} title={t("Xóa bộ dữ liệu này?", "Delete this dataset?")} description={t(`“${formatInputName(dataset.name)}” và mọi revision sẽ bị xóa. Lần chạy và snapshot đã tạo vẫn được giữ. Không thể hoàn tác.`, `“${formatInputName(dataset.name)}” and all its revisions will be deleted. Runs and snapshots already created are kept. This cannot be undone.`)} confirmLabel={t("Xóa bộ dữ liệu", "Delete dataset")} pending={remove.isPending} onCancel={() => setDeleteOpen(false)} onConfirm={() => remove.mutate()} />
        {remove.isError && <Alert variant="destructive"><AlertCircle /><AlertDescription>{apiErrorMessage(remove.error, t("Không thể xóa bộ dữ liệu.", "Could not delete the dataset."))}</AlertDescription></Alert>}
      </div>
    </DatasetProvider>
  );
}

export default function MasterDatasetDetailPage() {
  return <Suspense fallback={<SkeletonTable rows={7} />}><Detail /></Suspense>;
}
