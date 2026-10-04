"use client";

import { ArrowRight, CheckCircle2, Loader2 } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { useDecisionLog } from "@/lib/decision-log";
import { formatDateTime, formatInputName } from "@/lib/format";
import type { MasterDatasetSummary, ScheduleRunSummary } from "@/lib/types";
import { useI18n } from "./i18n-provider";

/** One scenario (factory dataset) as an entry point into the scheduling desk, with its live pipeline state. */
export function ScenarioCard({ dataset, runs }: { dataset: MasterDatasetSummary; runs: ScheduleRunSummary[] }) {
  const { t } = useI18n();
  const { entries } = useDecisionLog(dataset.id);
  const own = runs.filter((run) => run.dataset_id === dataset.id);
  const ok = own.filter((run) => run.status === "SUCCEEDED").length;
  const active = own.filter((run) => run.status === "QUEUED" || run.status === "RUNNING").length;
  const failed = own.filter((run) => run.status === "FAILED").length;
  const last = entries[entries.length - 1];
  const next = !dataset.is_ready
    ? t("Bổ sung dữ liệu còn thiếu", "Complete the missing data")
    : !ok ? t("Sinh các phương án đầu tiên", "Generate the first options")
      : last ? t("Xem lại hoặc chốt lịch mới", "Review or commit a new schedule") : t("So sánh và chốt một phương án", "Compare and commit an option");

  return (
    <Link href={`/decide/${dataset.id}`}
      className="group flex flex-col gap-3 rounded-lg border bg-card p-4 shadow-card transition-colors hover:border-primary/60 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-[15px] font-semibold">{formatInputName(dataset.name)}</h3>
          <p className="text-xs text-muted-foreground">rev {dataset.revision} · {Math.round(dataset.horizon / 1440)} {t("ngày", "days")} · {dataset.counts.orders} {t("đơn", "orders")} · {dataset.counts.lots} {t("lô", "lots")} · {dataset.counts.machines} {t("máy", "machines")}</p>
        </div>
        <Badge variant={dataset.is_ready ? "success" : "warning"}>{dataset.is_ready ? t("Sẵn sàng", "Ready") : t("Cần bổ sung", "Incomplete")}</Badge>
      </div>
      <div className="flex flex-wrap gap-1.5">
        <Badge variant="secondary">{ok} {t("lịch khả thi", "feasible schedules")}</Badge>
        {active > 0 && <Badge variant="info"><Loader2 className="animate-spin" />{active} {t("đang giải", "solving")}</Badge>}
        {failed > 0 && <Badge variant="danger">{failed} {t("thất bại", "failed")}</Badge>}
      </div>
      <div className="rounded-md bg-surface-2 px-3 py-2 text-[13px]">
        {last
          ? <span className="flex items-start gap-1.5"><CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-success" /><span className="min-w-0"><b className="font-semibold">{t("Đã chốt", "Committed")}: {last.alternative}</b> <span className="text-muted-foreground">· {formatDateTime(last.at)}</span><span className="block truncate text-muted-foreground">“{last.reason}”</span></span></span>
          : <span className="text-muted-foreground">{t("Chưa chốt lịch nào cho kịch bản này.", "No schedule committed for this scenario yet.")}</span>}
      </div>
      <span className="mt-auto flex items-center justify-between gap-2 text-sm">
        <span className="text-muted-foreground">{t("Tiếp theo", "Next")}: <span className="font-medium text-foreground">{next}</span></span>
        <ArrowRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
      </span>
    </Link>
  );
}
