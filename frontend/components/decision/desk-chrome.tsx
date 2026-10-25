"use client";

import { CheckCircle2 } from "lucide-react";

import { useI18n } from "@/components/i18n-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface DecisionBarProps {
  name: string;
  rank: number | null;
  committed: boolean;
  metrics: Array<[string, string, boolean?]>;
  compareName: string | null;
  onCommit: () => void;
  onView: () => void;
}

/** Sticky bottom bar: what you are looking at and the one primary action, always in reach. */
export function DecisionBar({ name, rank, committed, metrics, compareName, onCommit, onView }: DecisionBarProps) {
  const { t } = useI18n();
  return (
    <div className="sticky bottom-3 z-30 mt-2" role="region" aria-label={t("Phương án đang xem", "Option being viewed")}>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border bg-popover/95 px-3 py-2 shadow-float backdrop-blur sm:px-4">
        <button type="button" onClick={onView} className="flex min-w-0 items-center gap-2 rounded-md text-left focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none">
          <span className="text-xs text-muted-foreground">{t("Đang xem", "Viewing")}</span>
          {rank != null && <Badge variant={rank === 1 ? "success" : "secondary"}>#{rank}</Badge>}
          <strong className="truncate text-sm font-semibold">{name}</strong>
          {committed && <Badge variant="info"><CheckCircle2 />{t("Đã chốt", "Committed")}</Badge>}
        </button>
        <dl className="hidden items-center gap-4 text-xs xl:flex">
          {metrics.map(([label, value, warn]) => (
            <div key={label} className="flex items-baseline gap-1.5"><dt className="text-muted-foreground">{label}</dt><dd className={cn("font-semibold tabular-nums", warn && "text-warning")}>{value}</dd></div>
          ))}
        </dl>
        {compareName && <span className="hidden text-xs text-muted-foreground 2xl:inline">{t("so với", "vs")} <b className="font-medium text-foreground">{compareName}</b></span>}
        <Button size="sm" className="ml-auto" onClick={onCommit}><CheckCircle2 />{committed ? t("Chốt lại", "Commit again") : t("Chốt phương án", "Commit option")}</Button>
      </div>
    </div>
  );
}
