"use client";

import { Panel } from "@/components/blocks";
import { useI18n } from "@/components/i18n-provider";
import { ALGORITHMS, algorithmInfo } from "@/lib/algorithms";
import { formatDateTime, solverStatusLabel } from "@/lib/format";
import type { RunStatus, ScheduleRunSummary } from "@/lib/types";
import { cn } from "@/lib/utils";

/* Databricks Jobs "matrix view": columns are batches (one "Generate options" click = runs on the same snapshot
   created within a couple of minutes), rows are algorithms, each cell the run's status. */

const BATCH_GAP_MS = 120_000;
const MAX_BATCHES = 16;

interface Batch { hash: string; revision: number | null; at: string; runs: ScheduleRunSummary[] }

function batchesOf(runs: ScheduleRunSummary[]): Batch[] {
  const sorted = [...runs].sort((a, b) => a.created_at.localeCompare(b.created_at));
  const batches: Batch[] = [];
  for (const run of sorted) {
    const last = batches[batches.length - 1];
    if (last && last.hash === run.input_hash && new Date(run.created_at).getTime() - new Date(last.at).getTime() <= BATCH_GAP_MS) last.runs.push(run);
    else batches.push({ hash: run.input_hash, revision: run.dataset_revision, at: run.created_at, runs: [run] });
  }
  return batches.slice(-MAX_BATCHES);
}

const STATUS_CLASS: Record<RunStatus, string> = {
  SUCCEEDED: "bg-success",
  FAILED: "bg-destructive",
  RUNNING: "bg-primary animate-pulse",
  QUEUED: "bg-muted-foreground/40",
  CANCELLED: "border border-dashed border-muted-foreground bg-transparent",
};
const STATUS_LABEL: Record<RunStatus, [string, string]> = {
  SUCCEEDED: ["Hoàn tất", "Succeeded"], FAILED: ["Thất bại", "Failed"], RUNNING: ["Đang giải", "Solving"], QUEUED: ["Đang chờ", "Queued"], CANCELLED: ["Đã hủy", "Cancelled"],
};

export function RunMatrix({ runs, snapshotHash, recommended, decidedId, onOpen }: {
  runs: ScheduleRunSummary[]; snapshotHash: string | null; recommended: Set<string>; decidedId: string | null; onOpen: (run: ScheduleRunSummary) => void;
}) {
  const { t } = useI18n();
  if (!runs.length) return null;
  const batches = batchesOf(runs);
  const algorithms = ALGORITHMS.filter((info) => runs.some((run) => run.algorithm === info.value));
  const failed = runs.filter((run) => run.status === "FAILED").length;
  const cols = `10rem repeat(${batches.length}, 6.5rem)`; // fixed widths: reads left→right like a timeline
  return (
    <Panel title={t("Ma trận lần chạy", "Run matrix")}
      description={t(`${runs.length} lần chạy · ${batches.length} đợt sinh${failed ? ` · ${failed} thất bại` : ""}. Mỗi cột là một lần bấm "Sinh phương án"; bấm ô để xem lần chạy.`, `${runs.length} runs · ${batches.length} batches${failed ? ` · ${failed} failed` : ""}. Each column is one "Generate options" click; click a cell to open the run.`)}>
      <div className="overflow-x-auto" role="region" aria-label={t("Ma trận lần chạy (cuộn được)", "Run matrix (scrollable)")} tabIndex={0}>
        <div className="grid w-fit gap-px text-xs" style={{ gridTemplateColumns: cols }} role="table" aria-label={t("Thuật toán theo đợt sinh", "Algorithms by batch")}>
          <div role="row" className="contents">
            <span role="columnheader" className="sticky left-0 z-10 bg-card px-2 py-1.5 font-medium text-muted-foreground">{t("Thuật toán", "Algorithm")}</span>
            {batches.map((batch) => {
              const current = batch.hash === snapshotHash;
              return (
                <span key={batch.at + batch.hash} role="columnheader" className={cn("rounded-t-md px-1.5 py-1.5 text-center leading-tight", current ? "bg-accent text-accent-foreground" : "text-muted-foreground")}>
                  <span className="block font-medium tabular-nums">{formatDateTime(batch.at).replace(/,? \d{4}$/, "")}</span>
                  <span className="block">rev {batch.revision ?? "?"}{current && <span className="sr-only"> · {t("đang xem", "viewing")}</span>}</span>
                </span>
              );
            })}
          </div>
          {algorithms.map((info) => (
            <div key={info.value} role="row" className="contents">
              <span role="rowheader" className="sticky left-0 z-10 truncate bg-card px-2 py-1.5 font-medium" title={info.label}>{info.label}</span>
              {batches.map((batch) => {
                const cell = batch.runs.filter((run) => run.algorithm === info.value);
                const current = batch.hash === snapshotHash;
                return (
                  <span key={batch.at + info.value} role="cell" className={cn("flex min-h-8 items-center justify-center gap-1 px-1", current && "bg-accent/50")}>
                    {cell.length === 0 ? <span className="text-muted-foreground/50" aria-label={t("không chạy", "not run")}>·</span> : cell.map((run) => <Cell key={run.id} run={run} star={recommended.has(run.id)} committed={run.id === decidedId} onOpen={onOpen} />)}
                  </span>
                );
              })}
            </div>
          ))}
        </div>
      </div>
      <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground" aria-label={t("Chú thích", "Legend")}>
        {(["SUCCEEDED", "FAILED", "RUNNING", "QUEUED", "CANCELLED"] as RunStatus[]).map((status) => (
          <li key={status} className="flex items-center gap-1.5"><i className={cn("inline-block size-3 rounded-sm", STATUS_CLASS[status].replace("animate-pulse", ""))} />{t(...STATUS_LABEL[status])}</li>
        ))}
        <li className="flex items-center gap-1.5"><span className="font-semibold text-foreground">★</span>{t("được đề xuất", "recommended")}</li>
        <li className="flex items-center gap-1.5"><i className="inline-block size-3 rounded-sm bg-success ring-2 ring-primary ring-offset-1 ring-offset-card" />{t("đã chốt", "committed")}</li>
      </ul>
    </Panel>
  );
}

function Cell({ run, star, committed, onOpen }: { run: ScheduleRunSummary; star: boolean; committed: boolean; onOpen: (run: ScheduleRunSummary) => void }) {
  const { t } = useI18n();
  const status = t(...STATUS_LABEL[run.status]);
  const label = `${algorithmInfo(run.algorithm).label} · seed ${run.seed} · ${status}${run.solver_status ? ` · ${solverStatusLabel(run.solver_status)}` : ""}${run.error_code ? ` · ${run.error_code}` : ""}${star ? ` · ${t("được đề xuất", "recommended")}` : ""}${committed ? ` · ${t("đã chốt", "committed")}` : ""}`;
  return (
    <button type="button" onClick={() => onOpen(run)} title={label} aria-label={label}
      className={cn("relative grid size-6 place-items-center rounded-sm text-[11px] leading-none font-bold text-white transition-transform hover:scale-110 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:outline-none dark:text-background",
        STATUS_CLASS[run.status], committed && "ring-2 ring-primary ring-offset-1 ring-offset-card")}>
      {star && "★"}
    </button>
  );
}
