"use client";

import { useQueries, useQuery } from "@tanstack/react-query";
import { AlertTriangle, Loader2, Pencil, Plus } from "lucide-react";
import Link from "next/link";
import { useParams, usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useMemo, useState } from "react";

import { EmptyState, Hint, PageHeader, Panel } from "@/components/blocks";
import { TradeoffChart } from "@/components/decision/charts";
import { GenerateDialog } from "@/components/decision/generate-dialog";
import { DecisionBar, DeskProgress, scrollToSection, useActiveSection, useInView, type DeskStep } from "@/components/decision/desk-chrome";
import { openSection, Section } from "@/components/decision/section";
import {
  AlternativeCards, DecisionPanel, DeliveriesTable, DiffCard, FormulaDetails, PartsTable, RankingTable, SpeedSection, StatTiles, StockCard, WhyCards,
  type WorkspaceCtx,
} from "@/components/decision/sections";
import { SituationPanel } from "@/components/decision/situation-panel";
import { useI18n } from "@/components/i18n-provider";
import { ScheduleGantt } from "@/components/schedule-gantt";
import { useToast } from "@/components/toast-provider";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectSeparator, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { ErrorState, SkeletonCards, SkeletonTable } from "@/components/ui-states";
import { algorithmInfo } from "@/lib/algorithms";
import { getMasterDataset, getScheduleRun, listAllScheduleRuns } from "@/lib/api";
import { deliveriesOf, fmtN, fmtScore, POLICIES, policyOf, score, shortlist, toAlternative, type Alternative, type PolicyKey } from "@/lib/decision";
import { useDecisionLog } from "@/lib/decision-log";
import { formatDateTime, formatInputName } from "@/lib/format";
import type { ScheduleRunDetail, ScheduleRunSummary } from "@/lib/types";

const MAX_DETAILS = 40;
const NONE = "__none__";
const SPY = ["sec-input", "sec-choose", "sec-schedule", "sec-decide", "sec-speed", "sec-appendix"];

function Workspace() {
  const { datasetId } = useParams<{ datasetId: string }>();
  const { t, locale } = useI18n();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const showToast = useToast();
  const [generateOpen, setGenerateOpen] = useState(false);
  const { entries, append } = useDecisionLog(datasetId);

  const dataset = useQuery({ queryKey: ["master-dataset", datasetId], queryFn: () => getMasterDataset(datasetId) });
  const runs = useQuery({
    queryKey: ["dataset-runs", datasetId],
    queryFn: async () => (await listAllScheduleRuns()).filter((run) => run.dataset_id === datasetId),
    refetchInterval: (state) => (state.state.data?.some((run) => run.status === "QUEUED" || run.status === "RUNNING") ? 3000 : 30_000),
  });

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
  const displayName = useCallback((id: string) => list.name[id] ?? byId.get(id)?.label ?? id.slice(0, 8), [list, byId]);

  const current = byId.get(params.get("run") ?? "") ?? byId.get(list.keys[0] ?? "") ?? null;
  const cmpParam = params.get("cmp");
  const compareId = cmpParam === "none" ? null : cmpParam && byId.has(cmpParam) && cmpParam !== current?.id ? cmpParam : list.keys.find((id) => id !== current?.id) ?? null;
  const compare = compareId ? byId.get(compareId) ?? null : null;
  const decided = entries.length ? entries[entries.length - 1].runId : null;

  const update = useCallback((patch: Record<string, string | null>, scrollTo?: string) => {
    const next = new URLSearchParams(params.toString());
    for (const [key, value] of Object.entries(patch)) { if (value == null) next.delete(key); else next.set(key, value); }
    router.replace(`${pathname}?${next.toString()}`, { scroll: false });
    if (scrollTo) document.getElementById(scrollTo)?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
  }, [params, pathname, router]);

  const layoutKey = `${dataset.isSuccess}-${alts.length}-${current?.id ?? ""}-${detailRuns.length > 0}`;
  const activeSection = useActiveSection(SPY, layoutKey);
  const commitInView = useInView("sec-decide", layoutKey);

  if (dataset.isLoading || runs.isLoading) return <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-5"><SkeletonCards count={4} /><SkeletonTable rows={6} /></div>;
  if (dataset.isError || !dataset.data || !input) return <ErrorState title={t("Không thể mở bàn điều độ", "Could not open the scheduling desk")} message={t("Không tải được bộ dữ liệu nhà máy. Kiểm tra kết nối backend.", "Could not load the factory dataset. Check the backend connection.")} onRetry={() => void dataset.refetch()} />;

  const ctx: WorkspaceCtx = { alts, byId, weights, policy, list, displayName, input, origin: snapshot?.list[0]?.time_origin ?? input.origin, nOrders: input.orders.length };
  const deliveries = current ? deliveriesOf(input, current.run.operations) : [];
  const staleSnapshot = snapshot && snapshot.revision != null && snapshot.revision !== dataset.data.revision;
  const pick = (id: string, scrollTo?: string) => update({ run: id, cmp: compareId === id ? null : params.get("cmp") }, scrollTo);
  const others = alts.filter((alt) => !list.name[alt.id]);

  const hasSchedules = (runs.data ?? []).some((run) => run.status === "SUCCEEDED");
  const rankOf = (id: string) => { const index = list.keys.indexOf(id); return index >= 0 ? index + 1 : null; };
  const commit = () => {
    openSection("sec-decide");
    window.setTimeout(() => { scrollToSection("sec-decide"); document.getElementById("decision-reason")?.focus({ preventScroll: true }); }, 60);
  };
  const steps: DeskStep[] = [
    { id: "sec-input", label: t("Tình huống", "Scenario"), detail: dataset.data.is_ready ? t(`${input.orders.length} đơn · ${input.lots.length} lô`, `${input.orders.length} orders · ${input.lots.length} lots`) : t("Dữ liệu chưa đủ", "Data incomplete"), state: dataset.data.is_ready ? "done" : "todo" },
    { id: "sec-choose", label: t("Sinh & đề xuất", "Generate & rank"), detail: pending.length ? t(`Đang giải ${pending.length}…`, `Solving ${pending.length}…`) : alts.length ? t(`${list.keys.length} đề xuất / ${alts.length} lịch`, `${list.keys.length} recommended / ${alts.length} schedules`) : t("Chưa có phương án", "No options yet"), state: pending.length ? "busy" : alts.length ? "done" : "todo" },
    { id: "sec-schedule", label: t("Xem & so sánh", "Review & compare"), detail: current ? (compare ? `${displayName(current.id)} ↔ ${displayName(compare.id)}` : displayName(current.id)) : "—", state: current && (compare || alts.length < 2) ? "done" : "todo" },
    { id: "sec-decide", label: t("Chốt", "Commit"), detail: decided ? t(`Đã chốt: ${entries[entries.length - 1].alternative}`, `Committed: ${entries[entries.length - 1].alternative}`) : t("Chưa chốt", "Not committed"), state: decided ? "done" : "todo" },
  ];

  return (
    <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-5">
      <PageHeader
        back={{ href: "/decide", label: t("Các kịch bản", "Scenarios") }}
        crumb={formatInputName(dataset.data.name)}
        title={formatInputName(dataset.data.name)}
        meta={<>
          <Badge variant={dataset.data.is_ready ? "success" : "warning"}>{dataset.data.is_ready ? t("Sẵn sàng lập lịch", "Ready to schedule") : t("Cần bổ sung dữ liệu", "Data incomplete")}</Badge>
          <span className="text-xs text-muted-foreground">rev {dataset.data.revision}</span>
        </>}
        description={t("Sinh nhiều lịch khả thi trên cùng dữ liệu, chọn chính sách, so sánh rồi chốt một lịch kèm lý do. Mọi lịch đều qua cùng một bộ kiểm tra độc lập.", "Generate several feasible schedules from the same data, pick a policy, compare, then commit one with a reason. Every schedule passes the same independent validator.")}
        actions={<>
          {snapshots.length > 1 && (
          <div className="flex w-full items-center gap-2 sm:w-auto">
            <span className="hidden text-xs font-medium whitespace-nowrap text-muted-foreground xl:inline">{t("Phiên bản dữ liệu", "Data version")}</span>
            <Select value={snapshot?.hash ?? ""} onValueChange={(value) => update({ snap: value.slice(0, 12), run: null, cmp: null })}>
              <SelectTrigger className="w-full sm:w-56" aria-label={t("Phiên bản dữ liệu", "Data version")}><SelectValue /></SelectTrigger>
              <SelectContent>{snapshots.map((item) => <SelectItem key={item.hash} value={item.hash}>Rev {item.revision ?? "?"} · {item.list.length} {t("lịch", "schedules")} · {formatDateTime(item.latest)}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          )}
          <Button variant="outline" asChild><Link href={`/master-data/${datasetId}`}><Pencil />{t("Sửa dữ liệu", "Edit data")}</Link></Button>
          <Button onClick={() => setGenerateOpen(true)} disabled={!dataset.data.is_ready}><Plus />{t("Sinh thêm phương án", "Generate more options")}</Button>
        </>}
      />

      <DeskProgress steps={steps} active={activeSection} />

      {pending.length > 0 && <Alert className="border-primary/30 bg-info-soft text-primary"><Loader2 className="animate-spin" /><AlertDescription className="text-primary">{t(`Đang giải ${pending.length} phương án`, `Solving ${pending.length} options`)} ({[...new Set(pending.map((run) => algorithmInfo(run.algorithm).short))].join(", ")}). {t("Trang tự cập nhật khi xong.", "The page updates when they finish.")}</AlertDescription></Alert>}
      {staleSnapshot && <Alert className="border-warning/40 bg-warning-soft text-warning"><AlertTriangle /><AlertDescription className="text-warning">{t(`Các lịch dưới đây chạy trên revision ${snapshot!.revision}; dữ liệu hiện tại là revision ${dataset.data.revision}. Phần tình huống hiển thị revision hiện tại.`, `The schedules below ran on revision ${snapshot!.revision}; the current data is revision ${dataset.data.revision}. The scenario section shows the current revision.`)} <button type="button" className="font-semibold underline" onClick={() => setGenerateOpen(true)}>{t("Sinh phương án cho revision mới", "Generate options for the new revision")}</button></AlertDescription></Alert>}
      {!dataset.data.is_ready && <Alert className="border-warning/40 bg-warning-soft text-warning"><AlertTriangle /><AlertDescription className="text-warning">{t("Bộ dữ liệu chưa sẵn sàng để lập lịch", "The dataset is not ready for scheduling")}: {dataset.data.readiness_errors.join("; ")}</AlertDescription></Alert>}

      <Section id="sec-input" step="1" done={dataset.data.is_ready} defaultOpen={!hasSchedules} title={t("Tình huống", "Scenario")} subtitle={t("đơn hàng, tồn kho, năng lực — giống nhau cho mọi phương án", "orders, inventory, capacity — the same for every option")}>
        <SituationPanel input={input} origin={ctx.origin} />
      </Section>

      <Section id="sec-choose" step="2" done={alts.length > 0} title={t("Chọn chính sách và phương án", "Choose a policy and an option")} subtitle={t("hệ thống đề xuất, bạn chọn theo ưu tiên của kỳ này", "the system recommends, you choose by this period's priorities")}>
        <Panel>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="font-semibold">{t("Kỳ này ưu tiên gì?", "What matters most this period?")}</h3>
            <ToggleGroup type="single" variant="outline" value={policy} onValueChange={(value) => value && update({ policy: value as PolicyKey, run: null })} aria-label={t("Chính sách xếp hạng", "Ranking policy")}>
              {POLICIES.map((item) => <ToggleGroupItem key={item.key} value={item.key} className="px-3 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">{item.name}</ToggleGroupItem>)}
            </ToggleGroup>
          </div>
          <Hint>{policyOf(policy).note}</Hint>
          <FormulaDetails ctx={ctx} />
        </Panel>
        {detailsLoading && !alts.length ? <SkeletonCards count={3} /> : alts.length ? <>
          <AlternativeCards ctx={ctx} current={current?.id ?? null} decided={decided} onPick={(id) => pick(id)} />
          <Hint className="mt-0">{t(`Đề xuất ${list.keys.length} trong ${alts.length} lịch đã sinh: chỉ giữ lịch không bị lịch nào khác hơn ở cả ba mặt (trễ hạn, thiếu tồn an toàn, chi phí vận hành). Thứ hạng theo chính sách “${policyOf(policy).name}”; tên thẻ theo vị trí trên đường đánh đổi.`, `Recommending ${list.keys.length} of ${alts.length} generated schedules: only those no other schedule beats on all three axes (lateness, safety-stock shortfall, operating cost). Ranked by the “${policyOf(policy).name}” policy; card names follow their position on the trade-off curve.`)}</Hint>
          <Panel title={t("Đồ thị đánh đổi: chi phí vận hành ↔ thiếu tồn an toàn", "Trade-off chart: operating cost ↔ safety-stock shortfall")}>
            <div className="overflow-x-auto"><TradeoffChart alternatives={alts} weights={weights} list={list} current={current?.id ?? null} displayName={displayName} onPick={(id) => pick(id)} /></div>
            <Hint>{t("Chấm xanh lá có tên là phương án đề xuất; chấm xám là các lịch khác (xem bảng xếp hạng ở mục Phân tích). Đường nét đứt nối các phương án không bị lịch nào khác hơn: muốn bớt thiếu tồn thì phải trả thêm chi phí. Bấm chấm để xem lịch đó.", "Named green dots are recommended options; grey dots are other schedules (see the ranking under Analysis). The dashed line joins options no other schedule beats: reducing shortfall costs more. Click a dot to view that schedule.")}</Hint>
          </Panel>
        </> : (
          <EmptyState icon={<Plus />} title={t("Chưa có lịch nào cho bộ dữ liệu này", "No schedules for this dataset yet")}
            description={t("Sinh vài phương án bằng các thuật toán khác nhau (luật điều độ, metaheuristic, CP-SAT) để hệ thống đề xuất và bạn so sánh.", "Generate a few options with different algorithms (dispatching rules, metaheuristics, CP-SAT) so the system can recommend and you can compare.")}
            action={<Button onClick={() => setGenerateOpen(true)} disabled={!dataset.data.is_ready}>{t("Sinh phương án đầu tiên", "Generate the first options")}</Button>} />
        )}
      </Section>

      {current && (
        <Section id="sec-schedule" step="3" done={Boolean(compare) || alts.length < 2} title={<>{t("Lịch", "Schedule")}: {displayName(current.id)}{!list.name[current.id] && <span className="text-sm font-normal text-muted-foreground"> {t("(ngoài đề xuất)", "(not recommended)")}</span>}</>}
          actions={
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold whitespace-nowrap text-muted-foreground">{t("So với", "Compare with")}</span>
              <Select value={compareId ?? NONE} onValueChange={(value) => update({ cmp: value === NONE ? "none" : value })}>
                <SelectTrigger size="sm" className="w-full sm:w-64"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>— {t("không so sánh", "no comparison")} —</SelectItem>
                  <SelectSeparator />
                  <SelectGroup><SelectLabel>{t("Phương án đề xuất", "Recommended options")}</SelectLabel>{list.keys.map((id) => <SelectItem key={id} value={id} disabled={id === current.id}>{displayName(id)}{id === current.id ? t(" (đang xem)", " (viewing)") : ""}</SelectItem>)}</SelectGroup>
                  {others.length > 0 && <SelectGroup><SelectLabel>{t("Lịch khác", "Other schedules")}</SelectLabel>{others.map((alt) => <SelectItem key={alt.id} value={alt.id} disabled={alt.id === current.id}>{alt.label}</SelectItem>)}</SelectGroup>}
                </SelectContent>
              </Select>
            </div>
          }>
          <p className="-mt-1 text-[13px] text-muted-foreground">{algorithmInfo(current.algorithm).label} · seed {current.run.seed} · {current.run.time_budget_seconds}s · {t("trạng thái", "status")} {current.run.solver_status} · {t("tạo", "created")} {formatDateTime(current.run.created_at)}</p>
          <StatTiles ctx={ctx} alt={current} />
          <Panel flush>
            <ScheduleGantt operations={current.run.operations} input={input} origin={ctx.origin} horizon={current.run.horizon_minutes} deliveries={deliveries}
              compare={compare ? { operations: compare.run.operations, label: displayName(compare.id) } : null} />
          </Panel>
          {compare && <DiffCard ctx={ctx} a={current} b={compare} />}
          <div className="grid min-w-0 gap-4 xl:grid-cols-12">
            <div className="min-w-0 xl:col-span-7"><DeliveriesTable ctx={ctx} deliveries={deliveries} /></div>
            <div className="min-w-0 xl:col-span-5"><StockCard ctx={ctx} alt={current} /></div>
          </div>
          <h3 className="mt-1 text-sm font-semibold text-muted-foreground">{t("Vì sao xếp như vậy", "Why it is scheduled this way")}</h3>
          <WhyCards ctx={ctx} alt={current} />
        </Section>
      )}

      {current && (
        <Section id="sec-decide" step="4" done={Boolean(decided)} title={t("Chốt phương án", "Commit an option")} subtitle={t("ghi lịch được chọn, theo chính sách nào, vì sao", "record the chosen schedule, the policy and the reason")}>
          <DecisionPanel ctx={ctx} alt={current} entries={entries} onSave={(reason) => {
            const ok = append({
              at: new Date().toISOString(), runId: current.id, inputHash: current.run.input_hash, alternative: displayName(current.id),
              algorithm: `${algorithmInfo(current.algorithm).label} · seed ${current.run.seed}`, policy: policyOf(policy).name,
              score: fmtScore(score(current, weights, policy), policy), late: current.late, shortfall: current.metrics.safety_shortfall ?? 0, shifts: current.shifts.size, reason,
            });
            if (ok) showToast(t(`Đã chốt “${displayName(current.id)}”.`, `Committed “${displayName(current.id)}”.`), "success");
            return ok;
          }} />
        </Section>
      )}

      {detailRuns.length > 0 && (
        <Section id="sec-speed" defaultOpen={false} title={t("Phân tích: tốc độ thuật toán", "Analysis: algorithm speed")} subtitle={t(`${new Set(detailRuns.map((run) => run.algorithm)).size} thuật toán · ${detailRuns.length} lần chạy`, `${new Set(detailRuns.map((run) => run.algorithm)).size} algorithms · ${detailRuns.length} runs`)}>
          <SpeedSection ctx={ctx} runs={detailRuns} />
        </Section>
      )}

      {alts.length > 0 && (
        <Section id="sec-appendix" title={t("Phân tích: xếp hạng mọi lịch", "Analysis: ranking of every schedule")} subtitle={t("mọi lịch đã sinh, kể cả lịch không được đề xuất", "every generated schedule, including those not recommended")} defaultOpen={false}>
          <Panel title={t("Xếp hạng theo chính sách đang chọn", "Ranking under the selected policy")}>
            <RankingTable ctx={ctx} current={current?.id ?? null} onPick={(id) => pick(id, "sec-schedule")} />
            <Hint>{t("Bấm một dòng để xem lịch đó ở bước 3.", "Click a row to view that schedule in step 3.")} {groupRuns.length >= MAX_DETAILS ? t(`Hiển thị ${MAX_DETAILS} lần chạy gần nhất.`, `Showing the ${MAX_DETAILS} most recent runs.`) : ""}</Hint>
          </Panel>
          <Panel title={t("Điểm tách theo thành phần", "Score by component")}>
            <PartsTable ctx={ctx} />
            <Hint>{t("Mỗi ô là điểm đóng góp = trọng số × giá trị (giá trị ghi nhỏ bên dưới). Cộng các ô của từng tầng ra đúng điểm tầng đó.", "Each cell is the contribution = weight × value (value shown small below). The cells of a tier add up to that tier's score.")}</Hint>
          </Panel>
        </Section>
      )}

      {current && !commitInView && (
        <DecisionBar name={displayName(current.id)} rank={rankOf(current.id)} committed={current.id === decided} compareName={compare ? displayName(compare.id) : null}
          onView={() => scrollToSection("sec-schedule")} onCommit={commit}
          metrics={[
            [t("Đúng hạn", "On time"), `${ctx.nOrders - current.late}/${ctx.nOrders}`, current.late > 0],
            [t("Thiếu tồn", "Shortfall"), fmtN(current.metrics.safety_shortfall ?? 0), (current.metrics.safety_shortfall ?? 0) > 0],
            [t("Ca-máy", "Machine-shifts"), String(current.shifts.size)],
            [t("Điểm", "Score"), fmtScore(score(current, weights, policy), policy)],
          ]} />
      )}

      <GenerateDialog datasetId={datasetId} open={generateOpen} onClose={() => setGenerateOpen(false)} />
    </div>
  );
}

export default function DecidePage() {
  return <Suspense fallback={<SkeletonCards count={4} />}><Workspace /></Suspense>;
}
