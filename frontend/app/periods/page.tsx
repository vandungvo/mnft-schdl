"use client";

import { useQuery } from "@tanstack/react-query";
import { CalendarRange, Check, Factory, GitBranch, Plus, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

import { EmptyState, PageHeader, SectionHeading } from "@/components/blocks";
import { DataTable, type Column } from "@/components/data-table";
import { useI18n } from "@/components/i18n-provider";
import { NewPeriodDialog } from "@/components/period/new-period-dialog";
import { PeriodStatusBadge } from "@/components/period/shared";
import { Button } from "@/components/ui/button";
import { ErrorState, SkeletonTable } from "@/components/ui-states";
import { listPeriods } from "@/lib/api";
import { fmtRange, PERIOD_STATUS, useCurrentFactory } from "@/lib/factory";
import type { PeriodSummary } from "@/lib/factory-types";
import { formatDateTime } from "@/lib/format";

function Periods() {
  const { t } = useI18n();
  const router = useRouter();
  const params = useSearchParams();
  const { factory, isLoading: factoryLoading } = useCurrentFactory();
  const query = useQuery({ queryKey: ["periods", factory?.id], queryFn: () => listPeriods(factory!.id), enabled: Boolean(factory), refetchInterval: 20_000 });
  // "+ New → New planning period" lands here with ?new=1.
  const [open, setOpen] = useState(() => params.get("new") === "1");
  const deepLink = params.get("new");
  useEffect(() => { if (deepLink) router.replace("/periods"); }, [deepLink, router]);

  const all = query.data?.items ?? [];
  const regular = all.filter((p) => p.kind === "regular");
  const children = (p: PeriodSummary) => all.filter((c) => c.parent_id === p.id || all.some((m) => m.parent_id === p.id && c.parent_id === m.id));
  const active = regular.filter((p) => p.status !== "closed");
  const closed = regular.filter((p) => p.status === "closed");

  const columns: Column<PeriodSummary>[] = [
    { id: "name", header: t("Kỳ", "Period"), sortValue: (p) => p.start_date, cell: (p) => {
      const kids = children(p);
      return <>
        <Link href={`/periods/${p.id}`} className="font-medium hover:underline">{p.name}</Link>
        <span className="block text-xs text-muted-foreground">{fmtRange(p.start_date, p.end_date)} · {t(`${p.days} ngày`, `${p.days} days`)}</span>
        {kids.length > 0 && <span className="mt-1 flex flex-wrap gap-1">{kids.map((k) => (
          <Link key={k.id} href={`/periods/${k.id}`} onClick={(event) => event.stopPropagation()} className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] text-muted-foreground hover:border-primary/60 hover:text-foreground">
            {k.kind === "variant" ? <GitBranch className="size-3" /> : <RefreshCw className="size-3" />}{k.variant_label}{k.decision && <Check className="size-3 text-success" />}
          </Link>
        ))}</span>}
      </>;
    } },
    { id: "status", header: t("Trạng thái", "Status"), sortValue: (p) => Object.keys(PERIOD_STATUS).indexOf(p.status), cell: (p) => <><PeriodStatusBadge status={p.status} /><span className="mt-1 block text-xs text-muted-foreground">{t(...PERIOD_STATUS[p.status].next)}</span></> },
    { id: "orders", header: t("Đơn", "Orders"), align: "right", sortValue: (p) => p.counts.scheduled, cell: (p) => <>{p.counts.scheduled}{p.counts.long_term > 0 && <span className="block text-xs text-muted-foreground">+{p.counts.long_term} {t("sau kỳ", "after")}</span>}</> },
    { id: "options", header: t("Phương án", "Options"), align: "right", sortValue: (p) => p.runs.succeeded, cell: (p) => p.runs.active ? <span className="text-warning">{t(`đang giải ${p.runs.active}`, `solving ${p.runs.active}`)}</span> : p.runs.succeeded || "—" },
    { id: "decision", header: t("Lịch đã chốt", "Committed"), cell: (p) => p.decision ? <span className="inline-flex max-w-56 flex-col"><span className="truncate font-medium">{p.decision.alternative}</span><span className="text-xs text-muted-foreground">{formatDateTime(p.decision.decided_at)}</span></span> : <span className="text-muted-foreground">—</span> },
    { id: "updated", header: t("Cập nhật", "Updated"), sortValue: (p) => p.updated_at, cell: (p) => <span className="text-muted-foreground">{formatDateTime(p.updated_at)}</span> },
  ];

  if (!factoryLoading && !factory) {
    return <>
      <PageHeader title={t("Kỳ lập lịch", "Planning periods")} />
      <EmptyState icon={<Factory />} title={t("Chưa có nhà máy", "No factory yet")} description={t("Khai báo nhà máy một lần (sản phẩm, máy, ca) rồi mỗi kỳ chỉ cần đơn hàng.", "Set up the plant once (products, machines, shifts); after that each period only needs orders.")} action={<Button asChild><Link href="/factory">{t("Thiết lập nhà máy", "Set up the factory")}</Link></Button>} />
    </>;
  }
  return (
    <>
      <PageHeader title={t("Kỳ lập lịch", "Planning periods")}
        description={t("Mỗi kỳ (thường 2 tuần) lấy cấu hình nhà máy và đơn còn mở, bạn kiểm tra đầu kỳ, sinh và chốt lịch, rồi chuyển sang kỳ sau.", "Each period (usually 2 weeks) takes the plant set-up and open orders; you check the opening, generate and commit a schedule, then roll over.")}
        actions={<Button onClick={() => setOpen(true)}><Plus />{t("Lập lịch kỳ mới", "Plan a new period")}</Button>} />
      {query.isError && <ErrorState message={t("Không tải được danh sách kỳ.", "Could not load the periods.")} onRetry={() => void query.refetch()} />}
      {(query.isLoading || factoryLoading) && <SkeletonTable rows={4} />}
      {query.data && (all.length === 0 ? (
        <EmptyState icon={<CalendarRange />} title={t("Chưa có kỳ nào", "No periods yet")} description={t("Tạo kỳ đầu tiên: chọn ngày bắt đầu, hệ thống lấy đơn còn mở từ sổ đơn hàng.", "Create the first period: pick a start date and the open orders come from the order book.")} action={<Button onClick={() => setOpen(true)}><Plus />{t("Lập lịch kỳ đầu tiên", "Plan the first period")}</Button>} />
      ) : <>
        <SectionHeading className="mt-0" title={t(`Đang thực hiện & sắp tới · ${active.length}`, `Current & upcoming · ${active.length}`)} />
        <DataTable rows={active} columns={columns} rowKey={(p) => p.id} rowHref={(p) => `/periods/${p.id}`} initialSort={{ id: "name", desc: true }} label={t("Kỳ đang mở", "Open periods")}
          empty={<EmptyState title={t("Không có kỳ đang mở", "No open period")} description={t("Mọi kỳ đã đóng.", "Every period is closed.")} action={<Button onClick={() => setOpen(true)}><Plus />{t("Lập lịch kỳ mới", "Plan a new period")}</Button>} />} />
        {closed.length > 0 && <>
          <SectionHeading title={t(`Đã đóng · ${closed.length}`, `Closed · ${closed.length}`)} />
          <DataTable rows={closed} columns={columns} rowKey={(p) => p.id} rowHref={(p) => `/periods/${p.id}`} initialSort={{ id: "name", desc: true }} pageSize={10} label={t("Kỳ đã đóng", "Closed periods")} />
        </>}
      </>)}
      {factory && <NewPeriodDialog open={open} onClose={() => setOpen(false)} factoryId={factory.id} periods={all} />}
    </>
  );
}

export default function PeriodsPage() {
  return <Suspense fallback={<SkeletonTable rows={4} />}><Periods /></Suspense>;
}
