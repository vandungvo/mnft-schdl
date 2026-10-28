"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarRange, Plus } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Suspense, useCallback } from "react";

import { EmptyState } from "@/components/blocks";
import { useI18n } from "@/components/i18n-provider";
import { ExecuteView } from "@/components/period/execute-view";
import { PeriodHeader, periodSteps } from "@/components/period/period-header";
import { PrepareView } from "@/components/period/prepare-view";
import { usePeriodConfig } from "@/components/period/shared";
import { ScenarioWorkspace } from "@/components/scenario/workspace";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ErrorState, SkeletonCards } from "@/components/ui-states";
import { ApiError, getPeriod } from "@/lib/api";
import type { PeriodDetail, PeriodStatus } from "@/lib/factory-types";

const DEFAULT_TAB: Record<PeriodStatus, string> = {
  draft: "prepare", needs_fix: "prepare", ready: "options", solving: "options", options: "options", committed: "execute", closed: "execute",
};

/* One period = one page. Prepare (inputs) → the scheduling desk (options, compare, commit) → Execute
   (work orders, incidents, roll over). The desk is the same one scenarios use; the period owns its data. */
function Period() {
  const { id } = useParams<{ id: string }>();
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ["period", id],
    queryFn: () => getPeriod(id),
    refetchInterval: (state) => (state.state.data?.runs.active ? 4000 : 30_000),
  });
  const period = query.data;
  const config = usePeriodConfig(period?.factory_id, period?.factory_version);

  const onChanged = useCallback((updated: PeriodDetail) => {
    queryClient.setQueryData(["period", updated.id], updated);
    void queryClient.invalidateQueries({ queryKey: ["periods"] });
    if (updated.dataset_id) {
      void queryClient.invalidateQueries({ queryKey: ["master-dataset", updated.dataset_id] });
      void queryClient.invalidateQueries({ queryKey: ["dataset-runs", updated.dataset_id] });
    }
  }, [queryClient]);
  const refresh = useCallback(() => { void queryClient.invalidateQueries({ queryKey: ["period", id] }); void queryClient.invalidateQueries({ queryKey: ["periods"] }); }, [queryClient, id]);

  if (query.isLoading || (period && config.isLoading)) return <SkeletonCards count={4} />;
  if (query.isError || !period) {
    const missing = query.error instanceof ApiError && query.error.status === 404;
    return missing
      ? <EmptyState icon={<CalendarRange />} title={t("Không tìm thấy kỳ", "Period not found")} description={t("Kỳ có thể đã bị xóa.", "It may have been deleted.")} action={<Button asChild><Link href="/periods">{t("Về danh sách kỳ", "Back to periods")}</Link></Button>} />
      : <ErrorState message={t("Không tải được kỳ lập lịch.", "Could not load the period.")} onRetry={() => void query.refetch()} />;
  }
  if (config.isError || !config.data) return <ErrorState message={t("Không tải được cấu hình nhà máy của kỳ.", "Could not load the period's factory set-up.")} onRetry={() => void config.refetch()} />;

  const prepare = <PrepareView key={period.id} period={period} config={config.data} onSaved={onChanged} />;
  const blocked = period.counts.errors > 0 && period.compiled_revision !== period.revision;
  const generate = (open: () => void, canGenerate: boolean) => {
    const disabled = !canGenerate || period.status === "closed" || blocked;
    // Primary only while generating is the next step; once options exist the next-step banner carries the primary action.
    const button = <Button variant={period.runs.succeeded ? "outline" : "default"} onClick={open} disabled={disabled}><Plus />{period.runs.succeeded ? t("Sinh thêm", "Generate more") : t("Sinh phương án", "Generate options")}</Button>;
    return disabled ? <Tooltip><TooltipTrigger asChild><span tabIndex={0}>{button}</span></TooltipTrigger><TooltipContent>{period.status === "closed" ? t("Kỳ đã đóng", "The period is closed") : t("Sửa lỗi ở bước Chuẩn bị trước", "Fix the errors under Prepare first")}</TooltipContent></Tooltip> : button;
  };

  if (!period.dataset_id) {
    return (
      <div className="grid min-w-0 gap-4">
        <PeriodHeader period={period} onChanged={onChanged} actions={generate(() => undefined, false)} />
        {prepare}
      </div>
    );
  }
  return (
    <ScenarioWorkspace key={period.dataset_id} id={period.dataset_id} embed={{
      header: ({ openGenerate, canGenerate, snapshot }) => <PeriodHeader period={period} onChanged={onChanged} snapshot={snapshot} actions={generate(openGenerate, canGenerate)} />,
      before: { value: "prepare", label: <>{t("Chuẩn bị", "Prepare")}{period.counts.errors > 0 && <span className="ml-1 size-2 rounded-full bg-destructive" aria-label={t("có lỗi", "has errors")} />}</>, content: prepare },
      after: { value: "execute", label: t("Thực hiện", "Execute"), content: <ExecuteView period={period} config={config.data} /> },
      defaultView: DEFAULT_TAB[period.status],
      steps: periodSteps(period),
      readOnly: period.status === "closed",
      commitNote: <ul className="grid gap-1 rounded-lg border border-dashed px-3 py-2.5">
        <li>• {t("Lịch được chốt dùng để phát lệnh sản xuất ở bước Thực hiện.", "The committed schedule is the one work orders are issued from under Execute.")}</li>
        <li>• {t("Tồn cuối kỳ dự kiến của lịch này thành tồn đầu kỳ của kỳ sau.", "Its projected closing stock becomes the next period's opening stock.")}</li>
        <li>• {t("Có thể chốt lại phương án khác trước khi đóng kỳ; mỗi lần chốt đều được ghi nhật ký.", "You can commit another option until the period is closed; every commit is logged.")}</li>
      </ul>,
      onCommitted: refresh,
    }} />
  );
}

export default function PeriodPage() {
  return <Suspense fallback={<SkeletonCards count={4} />}><Period /></Suspense>;
}
