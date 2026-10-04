"use client";

import { useQuery } from "@tanstack/react-query";
import { ChevronRight, Compass, History } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { EmptyState, Panel } from "@/components/blocks";
import { useI18n } from "@/components/i18n-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ErrorState, SkeletonTable } from "@/components/ui-states";
import { listAuditEvents } from "@/lib/api";
import { formatDate, formatDateTime, stageLabel } from "@/lib/format";
import { AUDIT_LABELS, auditTab, type MdTab } from "@/lib/master-data";
import type { AuditEvent, ScheduleRunSummary } from "@/lib/types";
import { cn } from "@/lib/utils";

import { useDataset } from "./shared";

type Kind = "all" | "products" | "btp" | "machines" | "orders" | "dataset";

function kindOf(action: string): Kind {
  return (auditTab(action) as Kind | null) ?? "dataset";
}

/** GitHub-style activity feed: one line per change, the revision it produced and a link to the record. */
export function HistorySection({ runs, go }: { runs: ScheduleRunSummary[] | undefined; go: (tab: MdTab, item?: string) => void }) {
  const { t } = useI18n();
  const { dataset } = useDataset();
  const [kind, setKind] = useState<Kind>("all");
  const audit = useQuery({ queryKey: ["audit-events", "master_dataset", dataset.id], queryFn: () => listAuditEvents({ resourceType: "master_dataset", resourceId: dataset.id, limit: 100 }) });
  const events = (audit.data?.items ?? []).filter((event) => kind === "all" || kindOf(event.action) === kind);
  const groups = new Map<string, AuditEvent[]>();
  for (const event of events) {
    const day = formatDate(new Date(event.created_at));
    groups.set(day, [...(groups.get(day) ?? []), event]);
  }
  const kinds: Array<[Kind, string]> = [["all", t("Tất cả", "All")], ["dataset", t("Bộ dữ liệu", "Dataset")], ["products", t("Sản phẩm", "Products")], ["btp", t("BTP", "Semi-finished")], ["machines", t("Máy", "Machines")], ["orders", t("Đơn hàng", "Orders")]];
  const byRevision = new Map<number, ScheduleRunSummary[]>();
  for (const run of runs ?? []) if (run.dataset_revision != null) byRevision.set(run.dataset_revision, [...(byRevision.get(run.dataset_revision) ?? []), run]);

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
      <Panel title={t("Nhật ký thay đổi", "Change log")} description={t("Mỗi thay đổi hợp lệ tạo một revision. Nhật ký ghi đối tượng và revision; API chưa lưu giá trị trước/sau nên chưa hiển thị diff từng trường.", "Every valid change creates a revision. The log records the object and revision; the API does not store before/after values, so field-level diffs are not shown yet.")}>
        <div className="mb-3 flex flex-wrap gap-1.5" role="group" aria-label={t("Lọc theo loại", "Filter by kind")}>
          {kinds.map(([value, label]) => <Button key={value} size="xs" variant={kind === value ? "default" : "outline"} aria-pressed={kind === value} onClick={() => setKind(value)}>{label}</Button>)}
        </div>
        {audit.isLoading && <SkeletonTable rows={4} />}
        {audit.isError && <ErrorState compact message={t("Không thể tải lịch sử thay đổi.", "Could not load the change history.")} onRetry={() => void audit.refetch()} />}
        {audit.data && events.length === 0 && (
          <EmptyState className="border-0 py-8" icon={<History />} title={kind === "all" ? t("Chưa có thay đổi nào được ghi", "No changes recorded yet") : t("Không có thay đổi loại này", "No changes of this kind")}
            description={kind === "all" ? t(`Revision ${dataset.revision} là bản gốc của bộ dữ liệu (nạp sẵn hoặc import trước khi có nhật ký).`, `Revision ${dataset.revision} is the dataset's original version (bootstrapped or imported before logging existed).`) : undefined} />
        )}
        {[...groups.entries()].map(([day, list]) => (
          <section key={day} className="mb-4 last:mb-0">
            <h3 className="mb-2 text-xs font-semibold text-muted-foreground">{day}</h3>
            <ol className="relative ml-1.5 border-l">
              {list.map((event) => <EventRow key={event.id} event={event} current={dataset.revision} go={go} />)}
            </ol>
          </section>
        ))}
      </Panel>
      <Panel title={t("Lần chạy theo revision", "Runs by revision")} description={t("Mỗi lần chạy giữ snapshot riêng của revision đã dùng.", "Every run keeps its own snapshot of the revision it used.")}>
        {runs === undefined ? <SkeletonTable rows={2} /> : byRevision.size === 0 ? <p className="text-sm text-muted-foreground">{t("Chưa có lần chạy nào từ bộ dữ liệu này.", "No runs from this dataset yet.")}</p> : (
          <ul className="grid gap-2">
            {[...byRevision.entries()].sort((a, b) => b[0] - a[0]).map(([revision, list]) => (
              <li key={revision} className="flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm">
                <span className="flex items-center gap-2"><Badge variant={revision === dataset.revision ? "success" : "secondary"}>r{revision}</Badge>{revision === dataset.revision ? t("hiện hành", "current") : t("cũ hơn", "older")}</span>
                <span className="text-muted-foreground tabular-nums">{list.length} {t("lần chạy", "runs")}</span>
              </li>
            ))}
          </ul>
        )}
        <Button asChild variant="outline" size="sm" className="mt-3 w-full"><Link href={`/decide/${dataset.id}`}><Compass />{t("Xem trên bàn điều độ", "View on the desk")}</Link></Button>
      </Panel>
    </div>
  );
}

function EventRow({ event, current, go }: { event: AuditEvent; current: number; go: (tab: MdTab, item?: string) => void }) {
  const { t } = useI18n();
  const details = event.details as Record<string, unknown>;
  const code = typeof details.code === "string" ? details.code : undefined;
  const revision = typeof details.revision === "number" ? details.revision : undefined;
  const tab = auditTab(event.action);
  const deleted = event.action.endsWith(".deleted");
  const target = event.action === "btp_code.renamed" && typeof details.new_code === "string" ? details.new_code : event.action === "btp_routing.updated" ? undefined : code;
  const label = AUDIT_LABELS[event.action] ? t(...AUDIT_LABELS[event.action]) : event.action;
  let summary = code ?? "";
  if (event.action === "btp_code.renamed") summary = `${code} → ${String(details.new_code)}`;
  if (event.action === "btp_routing.updated") summary = `${code} · ${stageLabel(String(details.stage))} → ${String(details.btp_code)}`;
  return (
    <li className="relative pb-3 pl-5 last:pb-0">
      <span className={cn("absolute top-1.5 -left-[5px] size-2.5 rounded-full ring-4 ring-card", deleted ? "bg-destructive" : "bg-primary")} aria-hidden />
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <strong className="text-sm">{label}</strong>
        {summary && (tab && target && !deleted
          ? <button type="button" className="inline-flex items-center gap-0.5 font-mono text-xs text-primary hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none" onClick={() => go(tab, target)}>{summary}<ChevronRight className="size-3" /></button>
          : <span className="font-mono text-xs text-muted-foreground">{summary}</span>)}
        {revision != null && <Badge variant={revision === current ? "success" : "secondary"}>r{revision}</Badge>}
      </div>
      <p className="text-xs text-muted-foreground">{event.actor} · {formatDateTime(event.created_at)}</p>
    </li>
  );
}
