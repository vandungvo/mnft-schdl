"use client";

import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, ArrowRight, CalendarClock, CalendarRange, ClipboardList, Factory, Loader2, Plus, Upload, type LucideIcon } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { EmptyState, PageHeader, SectionHeading, StatTile } from "@/components/blocks";
import { useI18n } from "@/components/i18n-provider";
import { OutlookPanel } from "@/components/orders/outlook-panel";
import { PeriodStatusBadge } from "@/components/period/shared";
import { RunStatusBadge } from "@/components/run-status";
import { Button } from "@/components/ui/button";
import { ErrorState, SkeletonCards } from "@/components/ui-states";
import { algorithmInfo } from "@/lib/algorithms";
import { getFactory, getHealth, getOutlook, listPeriods, listScheduleRuns } from "@/lib/api";
import { fmtLocal, fmtRange, PERIOD_STATUS, todayIso, useCurrentFactory } from "@/lib/factory";
import type { PeriodSummary } from "@/lib/factory-types";
import { formatDateTime, formatInputName } from "@/lib/format";
import { cn } from "@/lib/utils";

function AttentionTile({ href, icon: Icon, label, value, hint, tone }: { href: string; icon: LucideIcon; label: string; value: number; hint: ReactNode; tone: "danger" | "info" | "warn" }) {
  const hot = value > 0;
  return (
    <Link href={href} className="group flex items-center gap-3 rounded-lg border bg-card p-3.5 shadow-card transition-colors hover:border-primary/60 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none">
      <span className={cn("grid size-9 shrink-0 place-items-center rounded-md", !hot ? "bg-muted text-muted-foreground" : tone === "danger" ? "bg-danger-soft text-destructive" : tone === "warn" ? "bg-warning-soft text-warning" : "bg-info-soft text-primary")}>
        <Icon className={cn("size-4", hot && tone === "info" && "animate-spin")} aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-xs text-muted-foreground">{label}</span>
        <span className="block text-sm"><b className="mr-1.5 text-lg font-semibold tabular-nums">{value}</b><span className="text-muted-foreground">{hint}</span></span>
      </span>
      <ArrowRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" aria-hidden />
    </Link>
  );
}

/** The period the planner works on now: the open one covering today, else the next one, else the latest. */
function currentPeriod(periods: PeriodSummary[]): PeriodSummary | null {
  const today = todayIso();
  const open = periods.filter((p) => p.kind === "regular" && p.status !== "closed").sort((a, b) => a.start_date.localeCompare(b.start_date));
  return open.find((p) => p.start_date <= today && p.end_date >= today) ?? open.find((p) => p.start_date > today) ?? open[open.length - 1] ?? null;
}

const NEXT: Record<string, { tab: string; label: [string, string] }> = {
  draft: { tab: "prepare", label: ["Kiểm tra đầu vào", "Check the inputs"] },
  needs_fix: { tab: "prepare", label: ["Sửa đầu vào", "Fix the inputs"] },
  ready: { tab: "options", label: ["Sinh phương án", "Generate options"] },
  solving: { tab: "options", label: ["Xem tiến độ giải", "Watch the solver"] },
  options: { tab: "options", label: ["So sánh & chốt", "Compare & commit"] },
  committed: { tab: "execute", label: ["Lệnh sản xuất hôm nay", "Today's work orders"] },
  closed: { tab: "execute", label: ["Xem kỳ", "Open the period"] },
};

export default function TodayPage() {
  const { t } = useI18n();
  const { factory, isLoading: factoryLoading, isError: factoryError, refetch } = useCurrentFactory();
  const factoryId = factory?.id;
  const detail = useQuery({ queryKey: ["factory", factoryId], queryFn: () => getFactory(factoryId!), enabled: Boolean(factoryId) });
  const periods = useQuery({ queryKey: ["periods", factoryId], queryFn: () => listPeriods(factoryId!), enabled: Boolean(factoryId), refetchInterval: 20_000 });
  const outlook = useQuery({ queryKey: ["outlook", factoryId], queryFn: () => getOutlook(factoryId!, todayIso(), 6), enabled: Boolean(factoryId) });
  const health = useQuery({ queryKey: ["health"], queryFn: getHealth, refetchInterval: 30_000 });
  const runs = useQuery({ queryKey: ["schedule-runs"], queryFn: () => listScheduleRuns({ limit: 5 }), refetchInterval: 15_000 });

  const all = periods.data?.items ?? [];
  const current = currentPeriod(all);
  const family = current ? all.filter((p) => p.parent_id === current.id) : [];
  const upcoming = all.filter((p) => p.kind === "regular" && p.status !== "closed" && p.id !== current?.id).sort((a, b) => a.start_date.localeCompare(b.start_date));
  const needsFix = all.filter((p) => p.status === "needs_fix").length;
  const active = (health.data?.queued_runs ?? 0) + (health.data?.running_runs ?? 0);
  const next = current ? NEXT[current.status] : null;

  if (factoryError) return <ErrorState message={t("Không kết nối được backend.", "Could not reach the backend.")} onRetry={() => void refetch()} />;
  if (!factoryLoading && !factory) {
    return <>
      <PageHeader title={t("Hôm nay", "Today")} />
      <EmptyState icon={<Factory />} title={t("Bắt đầu: thiết lập nhà máy", "Start by setting up the factory")}
        description={t("Khai báo một lần sản phẩm, máy, ca và lịch nghỉ. Sau đó mỗi kỳ bạn chỉ cần nhập đơn hàng.", "Enter products, machines, shifts and rest days once. After that each period only needs orders.")}
        action={<Button asChild><Link href="/factory">{t("Thiết lập nhà máy", "Set up the factory")}</Link></Button>} />
    </>;
  }
  return (
    <>
      <PageHeader title={t("Hôm nay", "Today")} description={`${fmtLocal(todayIso(), { weekday: true, year: true })} · ${factory?.name ?? ""}`}
        actions={<>
          <Button variant="outline" asChild><Link href="/orders?import=1"><Upload />{t("Nhập đơn hàng", "Import orders")}</Link></Button>
          <Button asChild><Link href="/periods?new=1"><Plus />{t("Lập lịch kỳ mới", "Plan a new period")}</Link></Button>
        </>} />

      {(periods.isLoading || factoryLoading) ? <SkeletonCards count={2} /> : current ? (
        <section aria-label={t("Kỳ hiện tại", "Current period")} className="rounded-lg border bg-card p-4 shadow-card sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <span className="text-xs font-semibold text-muted-foreground">{current.start_date > todayIso() ? t("Kỳ tiếp theo", "Next period") : current.end_date >= todayIso() ? t("Kỳ đang thực hiện", "Period in progress") : t("Kỳ đã qua nhưng chưa đóng", "Past period not closed yet")}</span>
              <h2 className="mt-0.5 flex flex-wrap items-center gap-2 text-xl font-semibold"><Link href={`/periods/${current.id}`} className="hover:underline">{current.name}</Link><PeriodStatusBadge status={current.status} /></h2>
              <p className="text-sm text-muted-foreground">{fmtRange(current.start_date, current.end_date)} · {t(...PERIOD_STATUS[current.status].next)}</p>
            </div>
            {next && <Button asChild><Link href={`/periods/${current.id}?tab=${next.tab}`}>{t(...next.label)}<ArrowRight /></Link></Button>}
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
            <StatTile label={t("Đơn trong kỳ", "Orders in period")} value={current.counts.scheduled} hint={current.counts.long_term ? t(`+${current.counts.long_term} đơn sau kỳ`, `+${current.counts.long_term} after`) : undefined} />
            <StatTile label={t("Lỗi đầu vào", "Input errors")} value={current.counts.errors} tone={current.counts.errors ? "danger" : "ok"} hint={current.counts.warnings ? t(`${current.counts.warnings} cảnh báo`, `${current.counts.warnings} warnings`) : undefined} />
            <StatTile label={t("Phương án", "Options")} value={current.runs.active ? <span className="inline-flex items-center gap-1.5"><Loader2 className="size-4 animate-spin" />{current.runs.active}</span> : current.runs.succeeded} hint={current.runs.active ? t("đang giải", "solving") : undefined} />
            <StatTile label={t("Lịch đã chốt", "Committed")} value={current.decision ? current.decision.alternative : "—"} tone={current.decision?.current ? "ok" : "default"} hint={current.decision ? formatDateTime(current.decision.decided_at) : undefined} />
          </div>
          {family.length > 0 && <p className="mt-3 text-sm text-muted-foreground">{t("Phiên bản khác: ", "Other versions: ")}{family.map((p, i) => <span key={p.id}>{i > 0 && " · "}<Link href={`/periods/${p.id}`} className="font-medium text-foreground hover:underline">{p.variant_label}</Link></span>)}</p>}
        </section>
      ) : (
        <EmptyState icon={<CalendarRange />} title={t("Chưa có kỳ đang mở", "No open period")} description={t("Tạo kỳ lập lịch: hệ thống lấy cấu hình nhà máy và đơn còn mở.", "Create a planning period: it takes the plant set-up and the open orders.")} action={<Button asChild><Link href="/periods?new=1"><Plus />{t("Lập lịch kỳ mới", "Plan a new period")}</Link></Button>} />
      )}

      <div className="mt-4 grid gap-3 md:grid-cols-3" role="group" aria-label={t("Cần chú ý", "Needs attention")}>
        <AttentionTile href="/orders" icon={AlertTriangle} tone="danger" label={t("Đơn quá hạn còn mở", "Overdue open orders")} value={outlook.data?.overdue_orders ?? 0} hint={outlook.data?.overdue_orders ? t("cần đưa vào kỳ, báo khách", "schedule them, tell the customer") : t("không có", "none")} />
        <AttentionTile href="/orders" icon={ClipboardList} tone="warn" label={t("Đơn ≤ 7 ngày chưa có kỳ", "Orders due ≤ 7 days, no period")} value={outlook.data?.unscheduled_soon ?? 0} hint={outlook.data?.unscheduled_soon ? t("tạo kỳ hoặc cập nhật kỳ", "create or update a period") : t("đều đã có kỳ", "all covered")} />
        <AttentionTile href={needsFix ? "/periods" : "/runs?status=RUNNING"} icon={needsFix ? AlertTriangle : active ? Loader2 : CalendarClock} tone={needsFix ? "danger" : "info"}
          label={needsFix ? t("Kỳ cần sửa đầu vào", "Periods with input errors") : t("Solver đang chạy", "Solver at work")} value={needsFix || active} hint={needsFix ? t("mở để xem lỗi", "open to see the errors") : active ? t("lần chạy trong hàng đợi", "runs queued") : t("hàng đợi trống", "queue is empty")} />
      </div>

      {outlook.data && <><SectionHeading title={t(`Tải ${outlook.data.weeks.length} tuần tới`, `Load, next ${outlook.data.weeks.length} weeks`)} aside={<Link href="/orders" className="text-sm font-medium text-primary hover:underline">{t("Sổ đơn hàng", "Order book")} →</Link>} /><OutlookPanel outlook={{ ...outlook.data, overdue_orders: 0, unscheduled_soon: 0 }} config={detail.data?.config} bare /></>}

      {upcoming.length > 0 && <>
        <SectionHeading title={t("Các kỳ khác đang mở", "Other open periods")} aside={<Link href="/periods" className="text-sm font-medium text-primary hover:underline">{t("Mọi kỳ", "All periods")} →</Link>} />
        <ul className="grid gap-2">{upcoming.slice(0, 4).map((p) => (
          <li key={p.id}><Link href={`/periods/${p.id}`} className="flex flex-wrap items-center gap-3 rounded-lg border bg-card px-4 py-2.5 text-sm shadow-card hover:border-primary/60">
            <b>{p.name}</b><span className="text-muted-foreground">{fmtRange(p.start_date, p.end_date)}</span><PeriodStatusBadge status={p.status} /><ArrowRight className="ml-auto size-4 text-muted-foreground" />
          </Link></li>
        ))}</ul>
      </>}

      <SectionHeading title={t("Lần chạy solver gần nhất", "Latest solver runs")} aside={<Link href="/runs" className="text-sm font-medium text-primary hover:underline">{t("Xem tất cả", "View all")} →</Link>} />
      {runs.data?.items.length ? (
        <ul className="grid gap-1.5">{runs.data.items.map((run) => (
          <li key={run.id}><Link href={`/runs/${run.id}`} className="flex flex-wrap items-center gap-3 rounded-md border bg-card px-3 py-2 text-sm hover:border-primary/60">
            <RunStatusBadge status={run.status} /><span className="font-medium">{algorithmInfo(run.algorithm).label}</span><span className="min-w-0 truncate text-muted-foreground">{formatInputName(run.input_name)}</span><span className="ml-auto text-xs text-muted-foreground">{formatDateTime(run.created_at)}</span>
          </Link></li>
        ))}</ul>
      ) : <p className="text-sm text-muted-foreground">{t("Chưa có lần chạy nào.", "No runs yet.")}</p>}
    </>
  );
}
