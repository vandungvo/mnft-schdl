"use client";

import { AlertTriangle } from "lucide-react";
import Link from "next/link";

import { Panel } from "@/components/blocks";
import { useI18n } from "@/components/i18n-provider";
import { fmtLocal, stageName } from "@/lib/factory";
import type { FactoryConfig, Outlook } from "@/lib/factory-types";
import { cn } from "@/lib/utils";

/** Rough-cut capacity: open orders' demand per week against each stage's calendar. */
export function OutlookPanel({ outlook, config, bare }: { outlook: Outlook; config?: FactoryConfig; bare?: boolean }) {
  const { t } = useI18n();
  const stages = config?.stages ?? outlook.weeks[0]?.stages.map((s) => s.stage) ?? [];
  return (
    <div className="grid gap-3">
      {(outlook.overdue_orders > 0 || outlook.unscheduled_soon > 0) && (
        <div className="flex flex-wrap gap-2">
          {outlook.overdue_orders > 0 && <span className="inline-flex items-center gap-2 rounded-lg border border-destructive/30 bg-danger-soft px-3 py-2 text-sm text-destructive"><AlertTriangle className="size-4" />{t(`${outlook.overdue_orders} đơn đang mở đã quá hạn`, `${outlook.overdue_orders} open orders are overdue`)}</span>}
          {outlook.unscheduled_soon > 0 && <Link href="/periods" className="inline-flex items-center gap-2 rounded-lg border border-warning/40 bg-warning-soft px-3 py-2 text-sm text-warning hover:underline"><AlertTriangle className="size-4" />{t(`${outlook.unscheduled_soon} đơn hạn trong 7 ngày chưa thuộc kỳ nào đang mở`, `${outlook.unscheduled_soon} orders due within 7 days are in no open period`)}</Link>}
        </div>
      )}
      <Panel title={bare ? undefined : t(`Tải dự kiến ${outlook.weeks.length} tuần tới`, `Expected load, next ${outlook.weeks.length} weeks`)} description={t("Nhu cầu của đơn đang mở quy ra giờ máy từng công đoạn (máy nhanh nhất, chưa tính setup) so với lịch làm việc. Trên 85% là căng.", "Open orders' demand as machine-hours per stage (fastest machine, setups excluded) against the working calendar. Above 85% is tight.")} flush>
        <div className="overflow-x-auto border-t">
          <table className="w-full text-sm">
            <thead><tr className="border-b text-xs text-muted-foreground">
              <th className="px-4 py-2 text-left font-medium">{t("Công đoạn", "Stage")}</th>
              {outlook.weeks.map((week) => <th key={week.start} className="px-2 py-2 text-center font-medium whitespace-nowrap">{fmtLocal(week.start)}<span className="block font-normal">{t(`${week.orders} đơn`, `${week.orders} orders`)}</span></th>)}
            </tr></thead>
            <tbody>{stages.map((stage) => (
              <tr key={stage} className="border-b last:border-0">
                <th scope="row" className="px-4 py-2 text-left font-medium whitespace-nowrap">{stageName(config, stage)}</th>
                {outlook.weeks.map((week) => {
                  const cell = week.stages.find((s) => s.stage === stage);
                  const ratio = cell?.ratio ?? 0;
                  return (
                    <td key={week.start} className="px-1 py-1 text-center">
                      <span title={t(`${Math.round((cell?.need_minutes ?? 0) / 60)} / ${Math.round((cell?.available_minutes ?? 0) / 60)} giờ máy`, `${Math.round((cell?.need_minutes ?? 0) / 60)} / ${Math.round((cell?.available_minutes ?? 0) / 60)} machine-hours`)}
                        className={cn("block rounded px-1 py-1 text-xs font-semibold tabular-nums", ratio === 0 ? "text-muted-foreground" : ratio > 1 ? "bg-destructive text-white" : ratio > 0.85 ? "bg-warning-soft text-warning" : ratio > 0.5 ? "bg-info-soft text-primary" : "bg-success-soft text-success")}>
                        {ratio === 0 ? "—" : `${Math.round(ratio * 100)}%`}
                      </span>
                    </td>
                  );
                })}
              </tr>
            ))}</tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}
