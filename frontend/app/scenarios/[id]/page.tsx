"use client";

import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, AlertTriangle, CheckCircle2, Database, Download, Loader2, MoreHorizontal, Plus, Trash2, Upload } from "lucide-react";
import Link from "next/link";
import { useParams, usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import { EmptyState, PageHeader } from "@/components/blocks";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { DecisionBar } from "@/components/decision/desk-chrome";
import { GenerateDialog } from "@/components/decision/generate-dialog";
import { DecisionPanel, type WorkspaceCtx } from "@/components/decision/sections";
import { useI18n } from "@/components/i18n-provider";
import { BtpSection } from "@/components/master-data/btp";
import { HistorySection } from "@/components/master-data/history";
import { MachinesSection } from "@/components/master-data/machines";
import { OrdersSection } from "@/components/master-data/orders";
import { DemandPanel, HorizonPanel, KeyFigures, ProcessFlow, ReadinessPanel, RevisionPanel, tabLabel } from "@/components/master-data/overview";
import { ProductsSection } from "@/components/master-data/products";
import { SettingsSection } from "@/components/master-data/settings";
import { DatasetProvider, ScenarioMetaProvider } from "@/components/master-data/shared";
import { AnalysisView, DeskSummary, OptionSheet, OptionsView, ScheduleView } from "@/components/scenario/desk-views";
import { RunMatrix } from "@/components/scenario/run-matrix";
import { DataV5, OverviewV5, V5_DATA_TABS, v5Counts, v5DataLabel, type V5DataTab } from "@/components/scenario/v5-views";
import { useToast } from "@/components/toast-provider";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ErrorState, SkeletonCards, SkeletonTable } from "@/components/ui-states";
import { algorithmInfo } from "@/lib/algorithms";
import { ApiError, apiErrorMessage, deleteMasterDataset, getMasterDataset, getScheduleRun, listAllScheduleRuns, replaceMasterDataset } from "@/lib/api";
import { deliveriesOf, fmtN, fmtScore, policyOf, score, shortlist, toAlternative, type Alternative } from "@/lib/decision";
import { useDecisionLog } from "@/lib/decision-log";
import { readScheduleInputFile } from "@/lib/files";
import { formatDateTime, formatDay, formatInputName } from "@/lib/format";
import { adviseChecks, readinessIssues, type MdTab } from "@/lib/master-data";
import { isV5, type MasterDatasetDetail, type MasterDatasetDetailV4, type ScheduleRunDetail, type ScheduleRunSummary } from "@/lib/types";
import { cn } from "@/lib/utils";

const MAX_DETAILS = 40;

/* One scenario = one page, aspects as tabs (Databricks object page). `?tab=` keeps the old factory-data values
   (products, btp, machines, orders, settings, history) so every deep link into the data still resolves. */
type View = "overview" | "options" | "schedule" | "decide" | "analysis" | "data" | "history";
const DATA_TABS = ["products", "btp", "machines", "orders", "settings"] as const satisfies readonly MdTab[];
type DataTab = (typeof DATA_TABS)[number] | V5DataTab;
const ANY_DATA_TAB = new Set<string>([...DATA_TABS, ...V5_DATA_TABS]);

/** Products / machines / orders / lots of either production model (also for a not-yet-validated JSON file). */
function figuresOf(doc: unknown): { products?: number; machines?: number; orders?: number; lots?: number } {
  if (!doc || typeof doc !== "object") return {};
  const d = doc as Record<string, unknown>;
  const size = (value: unknown) => (Array.isArray(value) ? value.length : value && typeof value === "object" ? Object.keys(value).length : undefined);
  const runs = Array.isArray(d.runs) ? (d.runs as Array<{ stage?: string }>) : null;
  const stages = Array.isArray(d.stages) ? (d.stages as string[]) : [];
  return {
    products: size(d.products), machines: size(d.machines), orders: size(d.orders),
    lots: runs ? runs.filter((run) => run.stage === stages[stages.length - 1]).length : size(d.lots),
  };
}
const DESK_VIEWS = new Set<string>(["options", "schedule", "decide", "analysis", "history"]);

function viewOf(tab: string | null): View {
  if (tab && ANY_DATA_TAB.has(tab)) return "data";
  return tab && DESK_VIEWS.has(tab) ? (tab as View) : "overview";
}

/** URL state without a router round-trip (history API, like the factory-data tabs it absorbs). */
function useScenarioUrl() {
  const params = useSearchParams();
  const pathname = usePathname();
  const set = useCallback((patch: Record<string, string | null>, mode: "push" | "replace" = "replace") => {
    const query = new URLSearchParams(window.location.search);
    for (const [key, value] of Object.entries(patch)) { if (value == null) query.delete(key); else query.set(key, value); }
    if (query.get("tab") === "overview") query.delete("tab");
    const url = `${pathname}${query.size ? `?${query.toString()}` : ""}`;
    if (mode === "push") window.history.pushState(null, "", url);
    else window.history.replaceState(null, "", url);
  }, [pathname]);
  return { params, set };
}

function Scenario() {
  const { id } = useParams<{ id: string }>();
  const { t, locale } = useI18n();
  const router = useRouter();
  const queryClient = useQueryClient();
  const showToast = useToast();
  const { params, set } = useScenarioUrl();
  const { entries, append } = useDecisionLog(id);
  const [generateOpen, setGenerateOpen] = useState(false);
  const [peekId, setPeekId] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [pendingReplace, setPendingReplace] = useState<{ file: string; input: unknown } | null>(null);
  const [replaceFileError, setReplaceFileError] = useState("");
  const replaceInputRef = useRef<HTMLInputElement>(null);

  const tabParam = params.get("tab");
  const view = viewOf(tabParam);
  const dataTab: DataTab = ANY_DATA_TAB.has(tabParam ?? "") ? (tabParam as DataTab) : "products";
  const item = params.get("item");
  const dueRaw = params.get("due");
  const due = dueRaw != null && /^\d+$/.test(dueRaw) ? Number(dueRaw) : null;

  /* ---------- data ---------- */
  const dataset = useQuery({ queryKey: ["master-dataset", id], queryFn: () => getMasterDataset(id) });
  const runs = useQuery({
    queryKey: ["dataset-runs", id],
    queryFn: async () => (await listAllScheduleRuns()).filter((run) => run.dataset_id === id),
    refetchInterval: (state) => (state.state.data?.some((run) => run.status === "QUEUED" || run.status === "RUNNING") ? 3000 : 30_000),
  });
  const applyUpdate = useCallback((updated: MasterDatasetDetail) => {
    queryClient.setQueryData(["master-dataset", id], updated);
    void queryClient.invalidateQueries({ queryKey: ["master-datasets"] });
    void queryClient.invalidateQueries({ queryKey: ["audit-events", "master_dataset", id] });
  }, [id, queryClient]);
  const remove = useMutation({ mutationFn: () => deleteMasterDataset(id), onSuccess: async () => { showToast(t("Đã xóa kịch bản.", "Scenario deleted.")); await queryClient.invalidateQueries({ queryKey: ["master-datasets"] }); router.push("/scenarios"); } });
  const replace = useMutation({
    mutationFn: (input: unknown) => replaceMasterDataset(id, input, dataset.data!.revision),
    onSuccess: (updated) => { setPendingReplace(null); applyUpdate(updated); showToast(t(`Đã thay dữ liệu — revision ${updated.revision}.`, `Data replaced — revision ${updated.revision}.`)); },
    onError: () => setPendingReplace(null),
  });

  /* ---------- schedule options of the selected data snapshot ---------- */
  const snapshots = useMemo(() => {
    const groups = new Map<string, ScheduleRunSummary[]>();
    for (const run of runs.data ?? []) groups.set(run.input_hash, [...(groups.get(run.input_hash) ?? []), run]);
    return [...groups.entries()].map(([hash, list]) => ({ hash, list, revision: list[0].dataset_revision, latest: list[0].created_at }));
  }, [runs.data]);
  const snapParam = params.get("snap");
  const snapshot = snapshots.find((item) => item.hash.startsWith(snapParam ?? "\u0000")) ?? snapshots[0];
  const groupRuns = useMemo(() => (snapshot?.list ?? []).filter((run) => run.status === "SUCCEEDED" || run.status === "FAILED").slice(0, MAX_DETAILS), [snapshot]);
  const pending = (snapshot?.list ?? []).filter((run) => run.status === "QUEUED" || run.status === "RUNNING");
  const details = useQueries({ queries: groupRuns.map((run) => ({ queryKey: ["schedule-run", run.id], queryFn: () => getScheduleRun(run.id), staleTime: Infinity })) });
  const detailRuns = details.map((query) => query.data).filter((run): run is ScheduleRunDetail => Boolean(run));
  const detailsLoading = details.some((query) => query.isLoading);
  const input = dataset.data?.input;

  const alts = useMemo(() => detailRuns.map((run) => toAlternative(run, input, detailRuns)).filter((alt): alt is Alternative => Boolean(alt)), [detailRuns, input]);
  const byId = useMemo(() => new Map(alts.map((alt) => [alt.id, alt])), [alts]);
  const weights = useMemo(() => input?.weights ?? {}, [input]);
  const policy = policyOf(params.get("policy")).key;
  // locale is a dependency because shortlist names are localised.
  const list = useMemo(() => shortlist(alts, weights, policy), [alts, weights, policy, locale]); // eslint-disable-line react-hooks/exhaustive-deps
  const displayName = useCallback((runId: string) => list.name[runId] ?? byId.get(runId)?.label ?? runId.slice(0, 8), [list, byId]);

  const current = byId.get(params.get("run") ?? "") ?? byId.get(list.keys[0] ?? "") ?? null;
  const cmpParam = params.get("cmp");
  const compareId = cmpParam === "none" ? null : cmpParam && byId.has(cmpParam) && cmpParam !== current?.id ? cmpParam : list.keys.find((key) => key !== current?.id) ?? null;
  const compare = compareId ? byId.get(compareId) ?? null : null;
  const lastDecision = entries.length ? entries[entries.length - 1] : null;
  const decided = lastDecision?.runId ?? null;

  // "+ New → Generate options for …" lands here with ?generate=1.
  const wantsGenerate = params.get("generate") === "1";
  const ready = dataset.data?.is_ready ?? false;
  useEffect(() => {
    if (!wantsGenerate || !dataset.data) return;
    set({ generate: null });
    if (ready) { const timer = window.setTimeout(() => setGenerateOpen(true), 0); return () => window.clearTimeout(timer); }
  }, [wantsGenerate, ready, dataset.data, set]);

  const issues = useMemo(() => {
    const input = dataset.data?.input;
    if (!dataset.data || !input || isV5(input)) return [];
    return [...readinessIssues(dataset.data.readiness_errors, input), ...adviseChecks(input)];
  }, [dataset.data]);

  if (dataset.isLoading) return <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-5"><SkeletonCards count={4} /><SkeletonTable rows={6} /></div>;
  if (dataset.isError || !dataset.data || !input) {
    const missing = dataset.error instanceof ApiError && dataset.error.status === 404;
    return missing
      ? <EmptyState icon={<Database />} title={t("Không tìm thấy kịch bản", "Scenario not found")} description={t("Kịch bản có thể đã bị xóa. Các lần chạy cũ vẫn giữ snapshot riêng.", "It may have been deleted. Earlier runs keep their own snapshots.")} action={<Button asChild><Link href="/scenarios">{t("Về danh sách kịch bản", "Back to scenarios")}</Link></Button>} />
      : <ErrorState message={t("Không thể tải kịch bản này. Kiểm tra kết nối backend.", "Could not load this scenario. Check the backend connection.")} onRetry={() => void dataset.refetch()} />;
  }
  const data = dataset.data;

  /* ---------- navigation ---------- */
  // A new tab starts at its top, just under the sticky tab bar (only when we are already below it).
  const toTabTop = () => window.requestAnimationFrame(() => {
    const header = document.querySelector("main header");
    const top = header ? header.getBoundingClientRect().bottom + window.scrollY - 48 : 0; // 48 = sticky top bar
    if (window.scrollY > top) window.scrollTo({ top });
  });
  const goView = (next: View) => { set({ tab: next === "data" ? dataTab : next, item: null, due: null }, "push"); toTabTop(); };
  const goData = (tab: MdTab, record?: string) => set({ tab, item: record ?? null, due: null }, "push");
  const openItem = (tab: MdTab) => (record: string) => set({ tab, item: record }, "push");
  const closeItem = () => set({ item: null });
  // Clicking an option only peeks at it; "View schedule" in the panel makes it the one being viewed.
  const pick = (runId: string) => setPeekId(runId);
  const commitFlow = (runId?: string) => {
    if (runId) set({ run: runId });
    setPeekId(null);
    set({ tab: "decide" }, "push");
    toTabTop();
    window.setTimeout(() => document.getElementById("decision-reason")?.focus(), 80);
  };

  const ctx: WorkspaceCtx = { alts, byId, weights, policy, list, displayName, input, origin: snapshot?.list[0]?.time_origin ?? input.origin, nOrders: input.orders.length };
  const deliveries = current ? deliveriesOf(input, current.run.operations) : [];
  const staleSnapshot = Boolean(snapshot && snapshot.revision != null && snapshot.revision !== data.revision);
  const rankOf = (runId: string) => { const index = list.keys.indexOf(runId); return index >= 0 ? index + 1 : null; };
  const peek = peekId ? byId.get(peekId) ?? null : null;

  const errorCount = (tab: MdTab) => issues.filter((issue) => issue.tab === tab && issue.severity === "error").length;
  const dataErrors = DATA_TABS.reduce((sum, tab) => sum + errorCount(tab), 0);
  const v5 = isV5(input) ? input : null;
  const dataTabs: readonly DataTab[] = v5 ? V5_DATA_TABS : DATA_TABS;
  const activeDataTab: DataTab = dataTabs.includes(dataTab) ? dataTab : "products";
  const counts: Partial<Record<DataTab, number | undefined>> = isV5(input) ? v5Counts(input) : { products: input.products.length, btp: input.btp_codes.length, machines: Object.keys(input.machines).length, orders: input.orders.length, settings: undefined };
  const shown = figuresOf(input);

  /* ---------- JSON actions (kept from the factory-data page) ---------- */
  function exportJson() {
    const blob = new Blob([JSON.stringify(input, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${data.name.replace(/[^a-zA-Z0-9_-]+/g, "-")}-r${data.revision}.json`;
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
  const next = pendingReplace?.input;
  const diffLine = (label: string, before: number | undefined, after: number | undefined) => `${label} ${before ?? "?"} → ${after ?? "?"}`;
  const incoming = figuresOf(next);
  const replaceSummary = next ? [
    diffLine(t("sản phẩm", "products"), shown.products, incoming.products),
    diffLine(t("máy", "machines"), shown.machines, incoming.machines),
    diffLine(t("đơn", "orders"), shown.orders, incoming.orders),
    diffLine(t("lô", "lots"), shown.lots, incoming.lots),
    (next as { schema_version?: number }).schema_version !== input.schema_version ? t(`mô hình ${input.schema_version} → ${(next as { schema_version?: number }).schema_version}`, `model ${input.schema_version} → ${(next as { schema_version?: number }).schema_version}`) : null,
  ].filter(Boolean).join(" · ") : "";

  const tabCount = (value: ReactNode, tone: "muted" | "danger" = "muted") => (
    <span className={cn("ml-1 rounded-full px-1.5 text-[11px] tabular-nums", tone === "danger" ? "bg-destructive text-white" : "bg-muted text-muted-foreground")}>{value}</span>
  );

  const body = (
      <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-4">
        <PageHeader back={{ href: "/scenarios", label: t("Kịch bản", "Scenarios") }} crumb={formatInputName(data.name)} title={formatInputName(data.name)}
          meta={<>
            <Badge variant={data.is_ready ? "success" : "danger"}>{data.is_ready ? t("Sẵn sàng", "Ready") : t("Chưa sẵn sàng", "Not ready")}</Badge>
            <SnapshotPill snapshots={snapshots} hash={snapshot?.hash ?? null} revision={data.revision} stale={staleSnapshot} onChange={(hash) => set({ snap: hash.slice(0, 12), run: null, cmp: null })} />
          </>}
          description={`${formatDay(data.origin, 0)} → ${formatDay(data.origin, input.horizon - 1)} · ${v5 ? t(`${v5.stages.length} công đoạn · ${v5.runs.length} mẻ`, `${v5.stages.length} stages · ${v5.runs.length} runs`) : `${shown.lots} ${t("lô", "lots")}`} · ${shown.orders} ${t("đơn", "orders")} · ${shown.machines} ${t("máy", "machines")} · ${t("cập nhật", "updated")} ${formatDateTime(data.updated_at)}`}
          actions={<>
            <input ref={replaceInputRef} className="sr-only" type="file" accept="application/json,.json" tabIndex={-1} aria-hidden disabled={replace.isPending} onChange={(event) => void pickReplaceFile(event.target.files?.[0])} />
            <DropdownMenu>
              <DropdownMenuTrigger asChild><Button variant="outline" aria-label={t("Thao tác khác", "More actions")}>{replace.isPending ? <Loader2 className="animate-spin" /> : <MoreHorizontal />}{t("Thêm", "More")}</Button></DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-60">
                <DropdownMenuLabel>{t("Dữ liệu JSON", "JSON data")}</DropdownMenuLabel>
                <DropdownMenuItem onSelect={exportJson}><Download />{t(`Tải JSON (revision ${data.revision})`, `Download JSON (revision ${data.revision})`)}</DropdownMenuItem>
                <DropdownMenuItem disabled={replace.isPending} onSelect={() => replaceInputRef.current?.click()}><Upload />{t("Thay bằng file JSON…", "Replace from JSON file…")}</DropdownMenuItem>
                <DropdownMenuItem onSelect={() => router.push(`/runs/new?datasetId=${data.id}`)}><Plus />{t("Lần chạy đơn…", "Single run…")}</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive" onSelect={() => setDeleteOpen(true)}><Trash2 />{t("Xóa kịch bản…", "Delete scenario…")}</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button onClick={() => setGenerateOpen(true)} disabled={!data.is_ready}><Plus />{t("Sinh phương án", "Generate options")}</Button>
          </>} />

        {(replaceFileError || replace.isError) && <Alert variant="destructive"><AlertCircle /><AlertDescription>{replaceFileError || apiErrorMessage(replace.error, t("Không thể cập nhật. Dữ liệu cũ chưa bị thay đổi.", "Could not update. The existing data was not changed."))}</AlertDescription></Alert>}
        {pending.length > 0 && <Alert className="border-primary/30 bg-info-soft text-primary"><Loader2 className="animate-spin" /><AlertDescription className="text-primary">{t(`Đang giải ${pending.length} phương án`, `Solving ${pending.length} options`)} ({[...new Set(pending.map((run) => algorithmInfo(run.algorithm).short))].join(", ")}). {t("Trang tự cập nhật khi xong.", "The page updates when they finish.")}</AlertDescription></Alert>}
        {staleSnapshot && <Alert className="border-warning/40 bg-warning-soft text-warning"><AlertTriangle /><AlertDescription className="text-warning">{t(`Các lịch đang xem chạy trên revision ${snapshot!.revision}; dữ liệu hiện tại là revision ${data.revision}.`, `The schedules shown ran on revision ${snapshot!.revision}; the current data is revision ${data.revision}.`)} <button type="button" className="font-semibold underline" onClick={() => setGenerateOpen(true)}>{t("Sinh phương án cho revision mới", "Generate options for the new revision")}</button></AlertDescription></Alert>}

        <Tabs value={view} onValueChange={(value) => goView(value as View)} className="min-w-0 gap-4">
          <div className="sticky top-12 z-30 -mx-4 border-b bg-background/90 px-4 backdrop-blur md:-mx-6 md:px-6 lg:-mx-8 lg:px-8">
            {/* Fade on the right on narrow screens: tells the user the tab row scrolls. */}
            <div className="overflow-x-auto [mask-image:linear-gradient(to_right,black_85%,transparent)] [scrollbar-width:none] lg:[mask-image:none]">
              <TabsList variant="line" className="h-10">
                <TabsTrigger value="overview" className="px-2.5">{t("Tổng quan", "Overview")}</TabsTrigger>
                <TabsTrigger value="options" className="px-2.5">{t("Phương án", "Options")}{pending.length ? <Loader2 className="ml-1 size-3.5 animate-spin text-primary" /> : alts.length > 0 && tabCount(alts.length)}</TabsTrigger>
                <TabsTrigger value="schedule" className="px-2.5">{t("Lịch & so sánh", "Schedule & compare")}</TabsTrigger>
                <TabsTrigger value="decide" className="px-2.5">{t("Chốt", "Commit")}{decided && <CheckCircle2 className="ml-1 size-3.5 text-success" />}</TabsTrigger>
                <TabsTrigger value="analysis" className="px-2.5">{t("Phân tích", "Analysis")}</TabsTrigger>
                <span className="mx-1 h-5 w-px bg-border" aria-hidden />
                <TabsTrigger value="data" className="px-2.5">{t("Dữ liệu", "Data")}{dataErrors > 0 && tabCount(dataErrors, "danger")}</TabsTrigger>
                <TabsTrigger value="history" className="px-2.5">{t("Lịch sử", "History")}</TabsTrigger>
              </TabsList>
            </div>
          </div>

          <TabsContent value="overview" className="grid min-w-0 gap-4"><h2 className="sr-only">{t("Tổng quan", "Overview")}</h2>
            <DeskSummary ctx={ctx} pending={pending.length} decided={lastDecision} onOpen={goView} onGenerate={() => setGenerateOpen(true)} canGenerate={data.is_ready} />
            {v5 ? (
              <OverviewV5 input={v5} go={goData} onDay={(day) => set({ tab: "orders", item: null, due: String(day) }, "push")}>
                <RevisionPanel runs={runs.data} go={goData} />
              </OverviewV5>
            ) : <>
              <ReadinessPanel issues={issues} go={goData} />
              <KeyFigures go={goData} />
              <ProcessFlow go={goData} />
              <HorizonPanel onDay={(day) => set({ tab: "orders", item: null, due: String(day) }, "push")} />
              <div className="grid min-w-0 gap-4 lg:grid-cols-2">
                <DemandPanel go={goData} />
                <RevisionPanel runs={runs.data} go={goData} />
              </div>
            </>}
          </TabsContent>

          <TabsContent value="options" className="min-w-0"><h2 className="sr-only">{t("Phương án", "Options")}</h2>
            <OptionsView ctx={ctx} policy={policy} onPolicy={(value) => set({ policy: value, run: null })} current={current?.id ?? null} decided={decided}
              loading={detailsLoading || runs.isLoading} onPick={pick} onGenerate={() => setGenerateOpen(true)} canGenerate={data.is_ready} />
          </TabsContent>

          <TabsContent value="schedule" className="min-w-0"><h2 className="sr-only">{t("Lịch & so sánh", "Schedule & compare")}</h2>
            <ScheduleView ctx={ctx} current={current} compare={compare} deliveries={deliveries}
              onPick={(runId) => set({ run: runId, cmp: compareId === runId ? null : params.get("cmp") })} onCompare={(runId) => set({ cmp: runId ?? "none" })} />
          </TabsContent>

          <TabsContent value="decide" forceMount className="min-w-0 data-[state=inactive]:hidden"><h2 className="sr-only">{t("Chốt", "Commit")}</h2>
            {current ? (
              <DecisionPanel ctx={ctx} alt={current} entries={entries} onChangeOption={() => goView("options")} onSave={async (reason) => {
                const ok = await append({
                  run_id: current.id, alternative: displayName(current.id), policy: policyOf(policy).name,
                  score: fmtScore(score(current, weights, policy), policy), late: current.late, shortfall: current.metrics.safety_shortfall ?? 0, shifts: current.shifts.size, reason,
                });
                if (ok) showToast(t(`Đã chốt “${displayName(current.id)}”.`, `Committed “${displayName(current.id)}”.`), "success");
                return ok;
              }} />
            ) : <EmptyState icon={<CheckCircle2 />} title={t("Chưa có phương án để chốt", "Nothing to commit yet")} description={t("Sinh và so sánh phương án trước.", "Generate and compare options first.")} action={<Button onClick={() => goView("options")}>{t("Tới tab Phương án", "Go to Options")}</Button>} />}
          </TabsContent>

          <TabsContent value="analysis" className="min-w-0"><h2 className="sr-only">{t("Phân tích", "Analysis")}</h2>
            <AnalysisView ctx={ctx} runs={detailRuns} current={current?.id ?? null} onPick={pick} truncatedAt={groupRuns.length >= MAX_DETAILS ? MAX_DETAILS : null}
              matrix={(runs.data?.length ?? 0) > 0 && <RunMatrix runs={runs.data!} snapshotHash={snapshot?.hash ?? null} recommended={new Set(list.keys)} decidedId={decided}
                onOpen={(run) => (byId.has(run.id) ? pick(run.id) : router.push(`/runs/${run.id}`))} />} />
          </TabsContent>

          <TabsContent value="data" className="min-w-0"><h2 className="sr-only">{t("Dữ liệu", "Data")}</h2>
            <div className="grid min-w-0 gap-4 md:grid-cols-[200px_minmax(0,1fr)]">
              <nav aria-label={t("Nhóm dữ liệu", "Data groups")} className="flex gap-1 overflow-x-auto md:sticky md:top-28 md:flex-col md:self-start">
                {dataTabs.map((tab) => {
                  const active = tab === activeDataTab;
                  const errors = errorCount(tab);
                  return (
                    <button key={tab} type="button" aria-current={active ? "page" : undefined} onClick={() => goData(tab)}
                      className={cn("flex shrink-0 items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                        active ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground")}>
                      <span className="flex-1 whitespace-nowrap">{t(...(v5 ? v5DataLabel(tab as V5DataTab) : tabLabel(tab)))}</span>
                      {counts[tab] !== undefined && <span className="text-xs tabular-nums">{counts[tab]}</span>}
                      {errors > 0 && <span className="grid size-4 place-items-center rounded-full bg-destructive text-[10px] font-semibold text-white" aria-label={t(`${errors} lỗi`, `${errors} errors`)}>{errors}</span>}
                    </button>
                  );
                })}
              </nav>
              <div className="min-w-0">
                {v5 ? <DataV5 input={v5} tab={activeDataTab as V5DataTab} item={item} due={due} onClearDue={() => set({ due: null })} /> : <>
                  {activeDataTab === "products" && <ProductsSection item={item} onOpen={openItem("products")} onClose={closeItem} />}
                  {activeDataTab === "btp" && <BtpSection item={item} onOpen={openItem("btp")} onClose={closeItem} />}
                  {activeDataTab === "machines" && <MachinesSection item={item} onOpen={openItem("machines")} onClose={closeItem} />}
                  {activeDataTab === "orders" && <OrdersSection item={item} due={due} onOpen={openItem("orders")} onClose={closeItem} onClearDue={() => set({ due: null })} />}
                  {activeDataTab === "settings" && <SettingsSection onDelete={() => setDeleteOpen(true)} />}
                </>}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="history" className="min-w-0"><h2 className="sr-only">{t("Lịch sử", "History")}</h2><HistorySection runs={runs.data} go={goData} /></TabsContent>
        </Tabs>

        {current && (view === "options" || view === "schedule") && (
          <DecisionBar name={displayName(current.id)} rank={rankOf(current.id)} committed={current.id === decided} compareName={view === "schedule" && compare ? displayName(compare.id) : null}
            onView={() => goView("schedule")} onCommit={() => commitFlow()}
            metrics={[
              [t("Đúng hạn", "On time"), `${ctx.nOrders - current.late}/${ctx.nOrders}`, current.late > 0],
              [t("Thiếu tồn", "Shortfall"), fmtN(current.metrics.safety_shortfall ?? 0), (current.metrics.safety_shortfall ?? 0) > 0],
              [t("Ca-máy", "Machine-shifts"), String(current.shifts.size)],
              [t("Điểm", "Score"), fmtScore(score(current, weights, policy), policy)],
            ]} />
        )}

        <OptionSheet ctx={ctx} alt={peek} rank={peek ? rankOf(peek.id) : null} committed={peek?.id === decided} viewingId={current?.id ?? null} onClose={() => setPeekId(null)}
          onSchedule={(runId) => { setPeekId(null); set({ tab: "schedule", run: runId, cmp: compareId === runId ? null : params.get("cmp") }, "push"); toTabTop(); }}
          onCompare={(runId) => { setPeekId(null); set({ tab: "schedule", cmp: runId }, "push"); toTabTop(); }}
          onCommit={(runId) => commitFlow(runId)} />
        <GenerateDialog datasetId={id} schemaVersion={input.schema_version} open={generateOpen} onClose={() => setGenerateOpen(false)} />
        <ConfirmDialog open={pendingReplace !== null} title={t("Thay toàn bộ dữ liệu bằng file này?", "Replace all data with this file?")}
          description={t(`File “${pendingReplace?.file}”: ${replaceSummary}. Dữ liệu được kiểm tra trước khi ghi; nếu hợp lệ sẽ tạo revision ${data.revision + 1}. Lần chạy cũ giữ snapshot riêng.`, `File “${pendingReplace?.file}”: ${replaceSummary}. The data is validated before writing; if valid it becomes revision ${data.revision + 1}. Earlier runs keep their own snapshots.`)}
          confirmLabel={t("Thay dữ liệu", "Replace data")} pending={replace.isPending} onCancel={() => setPendingReplace(null)} onConfirm={() => replace.mutate(pendingReplace!.input)} />
        <ConfirmDialog open={deleteOpen} title={t("Xóa kịch bản này?", "Delete this scenario?")} description={t(`“${formatInputName(data.name)}” và mọi revision sẽ bị xóa. Lần chạy và snapshot đã tạo vẫn được giữ. Không thể hoàn tác.`, `“${formatInputName(data.name)}” and all its revisions will be deleted. Runs and snapshots already created are kept. This cannot be undone.`)} confirmLabel={t("Xóa kịch bản", "Delete scenario")} pending={remove.isPending} onCancel={() => setDeleteOpen(false)} onConfirm={() => remove.mutate()} />
        {remove.isError && <Alert variant="destructive"><AlertCircle /><AlertDescription>{apiErrorMessage(remove.error, t("Không thể xóa kịch bản.", "Could not delete the scenario."))}</AlertDescription></Alert>}
      </div>
  );
  return (
    <ScenarioMetaProvider value={{ id: data.id, revision: data.revision }}>
      {v5 ? body : <DatasetProvider value={{ dataset: data as MasterDatasetDetailV4, onUpdated: applyUpdate, reload: () => void dataset.refetch() }}>{body}</DatasetProvider>}
    </ScenarioMetaProvider>
  );
}

/** Which data snapshot the schedules come from — always visible next to the title, like an attached cluster. */
function SnapshotPill({ snapshots, hash, revision, stale, onChange }: {
  snapshots: Array<{ hash: string; list: ScheduleRunSummary[]; revision: number | null; latest: string }>; hash: string | null; revision: number; stale: boolean; onChange: (hash: string) => void;
}) {
  const { t } = useI18n();
  if (snapshots.length <= 1) return <Badge variant="outline" className={cn(stale && "border-warning/50 text-warning")}>rev {snapshots[0]?.revision ?? revision}</Badge>;
  return (
    <Tooltip>
      <Select value={hash ?? ""} onValueChange={onChange}>
        <TooltipTrigger asChild>
          <SelectTrigger size="sm" aria-label={t("Phiên bản dữ liệu của các lịch", "Data version of the schedules")}
            className={cn("h-6 w-auto gap-1 rounded-full px-2.5 text-xs", stale && "border-warning/50 text-warning")}><SelectValue /></SelectTrigger>
        </TooltipTrigger>
        <SelectContent>{snapshots.map((item) => <SelectItem key={item.hash} value={item.hash}>Rev {item.revision ?? "?"} · {item.list.length} {t("lịch", "schedules")} · {formatDateTime(item.latest)}</SelectItem>)}</SelectContent>
      </Select>
      <TooltipContent>{t("Phiên bản dữ liệu mà các lịch được sinh từ đó", "The data version the schedules were generated from")}</TooltipContent>
    </Tooltip>
  );
}

export default function ScenarioPage() {
  return <Suspense fallback={<SkeletonCards count={4} />}><Scenario /></Suspense>;
}
