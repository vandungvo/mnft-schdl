"use client";

import { useQuery } from "@tanstack/react-query";
import { AlertCircle, AlertTriangle, CheckCircle2, Info } from "lucide-react";
import type { ReactNode } from "react";

import { Meter } from "@/components/blocks";
import { useI18n } from "@/components/i18n-provider";
import { Badge } from "@/components/ui/badge";
import { getFactoryVersion } from "@/lib/api";
import { issueText, kindLabel, PERIOD_STATUS, stageName } from "@/lib/factory";
import type { FactoryConfig, Issue, PeriodKind, PeriodStatus, StageLoad } from "@/lib/factory-types";
import { cn } from "@/lib/utils";

export function PeriodStatusBadge({ status }: { status: PeriodStatus }) {
  const { t } = useI18n();
  const item = PERIOD_STATUS[status];
  return <Badge variant={item.variant}>{status === "solving" && <span className="size-1.5 animate-pulse rounded-full bg-current" />}{t(...item.label)}</Badge>;
}

export function KindBadge({ kind, label }: { kind: PeriodKind; label?: string | null }) {
  if (kind === "regular") return null;
  return <Badge variant={kind === "variant" ? "info" : "warning"}>{kindLabel(kind)}{label ? ` · ${label}` : ""}</Badge>;
}

/** Plant configuration a period was planned with (immutable per version, cached forever). */
export function usePeriodConfig(factoryId: string | undefined, version: number | undefined) {
  return useQuery({
    queryKey: ["factory-version", factoryId, version],
    queryFn: () => getFactoryVersion(factoryId!, version!),
    enabled: Boolean(factoryId && version),
    staleTime: Infinity,
    select: (data) => data.config as FactoryConfig,
  });
}

const ICONS = { error: AlertCircle, warning: AlertTriangle, info: Info };

/** Compile problems of a period, worst first; each says what to do. */
export function IssueList({ issues, empty, className, onSelect }: { issues: Issue[]; empty?: ReactNode; className?: string; onSelect?: (issue: Issue) => void }) {
  const { t } = useI18n();
  if (!issues.length) {
    return empty === undefined ? (
      <p className={cn("flex items-center gap-2 text-sm text-success", className)}><CheckCircle2 className="size-4" />{t("Đầu vào hợp lệ — có thể sinh lịch.", "Inputs are valid — schedules can be generated.")}</p>
    ) : <>{empty}</>;
  }
  const order = { error: 0, warning: 1, info: 2 };
  return (
    <ul className={cn("grid gap-1.5", className)}>
      {[...issues].sort((a, b) => order[a.severity] - order[b.severity]).map((issue, index) => {
        const Icon = ICONS[issue.severity];
        const body = <><Icon className={cn("mt-0.5 size-4 shrink-0", issue.severity === "error" ? "text-destructive" : issue.severity === "warning" ? "text-warning" : "text-primary")} /><span>{issueText(issue)}</span></>;
        return (
          <li key={`${issue.code}-${index}`}>
            {onSelect && issue.ref ? (
              <button type="button" onClick={() => onSelect(issue)} className="flex w-full items-start gap-2 rounded-md px-1 py-0.5 text-left text-sm hover:bg-muted">{body}</button>
            ) : <div className="flex items-start gap-2 px-1 py-0.5 text-sm">{body}</div>}
          </li>
        );
      })}
    </ul>
  );
}

/** Rough-cut load per stage (processing on the fastest machine vs calendar minutes). */
export function LoadBars({ load, config }: { load: StageLoad[]; config?: FactoryConfig | null }) {
  const { t } = useI18n();
  if (!load.length) return <p className="text-sm text-muted-foreground">{t("Chưa tính được — đầu vào còn lỗi.", "Not available — the inputs still have errors.")}</p>;
  return (
    <dl className="grid gap-2">
      {load.map((row) => {
        const ratio = row.ratio ?? 0;
        return (
          <div key={row.stage} className="grid grid-cols-[minmax(84px,120px)_minmax(0,1fr)_48px] items-center gap-3 text-sm">
            <dt className="truncate text-muted-foreground">{stageName(config, row.stage)}</dt>
            <dd><Meter value={ratio} tone={ratio > 0.85 ? "warn" : "ok"} label={t(`${Math.round(row.need_minutes / 60)} / ${Math.round(row.available_minutes / 60)} giờ máy`, `${Math.round(row.need_minutes / 60)} / ${Math.round(row.available_minutes / 60)} machine-hours`)} /></dd>
            <dd className={cn("text-right tabular-nums", ratio > 0.85 && "font-semibold text-warning")}>{Math.round(ratio * 100)}%</dd>
          </div>
        );
      })}
    </dl>
  );
}
