"use client";

import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, CalendarClock, CheckCircle2, ChevronDown, Database } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";

import { Meter, PageHeader, Panel } from "@/components/blocks";
import { useI18n } from "@/components/i18n-provider";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ErrorState, SkeletonCards, SkeletonTable } from "@/components/ui-states";
import { getProductionPlan } from "@/lib/api";
import { formatDate, formatDateTime, formatDuration, formatInputName, formatNumber, minuteToDate, productLabel, stageLabel } from "@/lib/format";
import { cn } from "@/lib/utils";

const N = "text-right tabular-nums";
const fmt = (value: number) => formatNumber(value);

/* Backend messages are English; Vietnamese renderings are shown when the UI is in Vietnamese. */
const warningLabels: Record<string, string> = {
  "At least one stage exceeds its calendar capacity lower bound.": "Ít nhất một công đoạn vượt ngưỡng công suất lịch làm việc.",
  "At least one product ends below its configured safety-stock target.": "Ít nhất một sản phẩm có tồn kho cuối kỳ thấp hơn mức an toàn.",
  "Aggregate capacity excludes sequence-dependent setup and mold maintenance; the validated detailed schedule remains the execution authority.": "Công suất tổng hợp chưa gồm thời gian chuẩn bị theo trình tự và bảo trì khuôn; lịch chi tiết đã kiểm tra mới là căn cứ thực thi.",
};

const assumptionLabels: Record<string, string> = {
  "Demand is bucketed by due date within the selected planning period.": "Nhu cầu được gom theo hạn giao trong kỳ kế hoạch đã chọn.",
  "Initial inventory is allocated to demand before production is planned.": "Tồn kho đầu kỳ được phân bổ cho nhu cầu trước khi tính sản lượng cần làm.",
  "Rough-cut capacity uses per-stage minimum feasible processing time and ignores sequence-dependent setup.": "Công suất sơ bộ dùng thời gian xử lý khả thi tối thiểu theo công đoạn và chưa tính chuẩn bị theo trình tự.",
  "Detailed scheduling remains the source of truth for machine, shift, maintenance, and changeover feasibility.": "Lịch chi tiết là nguồn chính xác cho tính khả thi về máy, ca, bảo trì và chuyển đổi.",
};

function dateLabel(origin: string, minutes: number) {
  return formatDate(minuteToDate(origin, minutes));
}

export default function ProductionPlanDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { t, locale } = useI18n();
  const backendText = (labels: Record<string, string>, text: string) => (locale === "vi" ? labels[text] ?? text : text);
  const query = useQuery({ queryKey: ["production-plan", id], queryFn: () => getProductionPlan(id) });

  if (query.isLoading) return <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-5"><SkeletonCards count={4} /><SkeletonTable rows={6} /></div>;
  if (query.isError || !query.data) return <ErrorState title={t("Không thể tải kế hoạch", "Could not load the plan")} message={t("Kế hoạch không tồn tại hoặc dịch vụ tạm thời không phản hồi.", "The plan does not exist or the service is temporarily unavailable.")} onRetry={() => void query.refetch()} />;

  const plan = query.data;
  const products = plan.result.products;
  const ready = plan.status === "READY";

  return (
    <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-5">
      <PageHeader back={{ href: "/planning", label: t("Kế hoạch tổng hợp", "Aggregate planning") }} crumb={`${dateLabel(plan.time_origin, plan.period_start)} – ${dateLabel(plan.time_origin, plan.period_end)}`} eyebrow={`${t("Kế hoạch", "Plan")} · rev ${plan.dataset_revision}`}
        title={`${dateLabel(plan.time_origin, plan.period_start)} – ${dateLabel(plan.time_origin, plan.period_end)}`}
        description={`${formatInputName(plan.input_name)} · ${plan.result.order_count} ${t("đơn hàng", "orders")} · ${plan.result.lot_count} ${t("lô", "lots")} · ${plan.bucket_minutes === 1440 ? t("theo ngày", "daily") : t("theo tuần", "weekly")}`}
        actions={<>
          {plan.dataset_id && <Button variant="outline" asChild><Link href={`/master-data/${plan.dataset_id}`}><Database />{t("Xem master data", "View master data")}</Link></Button>}
          <Button asChild><Link href={`/runs/new?planId=${plan.id}`}><CalendarClock />{t("Lập lịch chi tiết", "Detailed scheduling")}</Link></Button>
        </>} />

      <Alert className={cn(ready ? "border-success/40 bg-success-soft" : "border-warning/40 bg-warning-soft")}>
        {ready ? <CheckCircle2 className="text-success" /> : <AlertTriangle className="text-warning" />}
        <AlertTitle>{ready ? t("Khả thi ở mức công suất tổng hợp", "Feasible at aggregate capacity") : t("Cần điều chỉnh trước khi phát hành", "Needs adjustment before release")}</AlertTitle>
        <AlertDescription>{t("Lịch chi tiết vẫn phải được kiểm tra trước khi đưa xuống xưởng.", "The detailed schedule must still be validated before it goes to the shop floor.")}</AlertDescription>
      </Alert>
      {plan.result.warnings.map((warning) => <Alert key={warning} className="border-warning/40 bg-warning-soft"><AlertTriangle className="text-warning" /><AlertDescription>{backendText(warningLabels, warning)}</AlertDescription></Alert>)}

      <Panel title={t("Nhu cầu và tồn kho theo sản phẩm", "Demand and inventory by product")}>
        <Table>
          <TableHeader><TableRow><TableHead>{t("Sản phẩm", "Product")}</TableHead><TableHead className={N}>{t("Nhu cầu", "Demand")}</TableHead><TableHead className={N}>{t("Tồn đầu", "Opening stock")}</TableHead><TableHead className={N}>{t("Cần sản xuất", "To produce")}</TableHead><TableHead className={N}>{t("Sản lượng lô", "Lot output")}</TableHead><TableHead className={N}>{t("Tồn cuối dự kiến", "Projected closing stock")}</TableHead><TableHead className={N}>{t("Tồn an toàn", "Safety stock")}</TableHead></TableRow></TableHeader>
          <TableBody>{products.map((product) => (
            <TableRow key={product.product}>
              <TableCell className="font-semibold">{productLabel(product.product)}</TableCell>
              <TableCell className={N}>{fmt(product.demand_qty)}</TableCell><TableCell className={N}>{fmt(product.initial_inventory)}</TableCell><TableCell className={N}>{fmt(product.required_production_qty)}</TableCell><TableCell className={N}>{fmt(product.planned_lot_qty)}</TableCell>
              <TableCell className={cn(N, product.safety_shortfall > 0 && "font-semibold text-destructive")}>{fmt(product.projected_ending_inventory)}</TableCell>
              <TableCell className={N}>{fmt(product.safety_stock)}{product.safety_shortfall > 0 && <span className="block text-xs text-destructive">{t("Thiếu", "Short")} {fmt(product.safety_shortfall)}</span>}</TableCell>
            </TableRow>
          ))}</TableBody>
        </Table>
      </Panel>

      <Panel title={t("Tải công suất theo công đoạn", "Capacity load by stage")}>
        <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(220px,1fr))]">
          {plan.result.stages.map((stage) => {
            const ratio = stage.load_ratio ?? 0;
            return (
              <article key={stage.stage} className="rounded-lg border p-4">
                <div className="flex justify-between gap-2"><strong>{stageLabel(stage.stage)}</strong><span className={cn("font-semibold", stage.overloaded && "text-destructive")}>{stage.load_ratio === null ? t("Không có công suất", "No capacity") : formatNumber(ratio, { style: "percent", minimumFractionDigits: 1, maximumFractionDigits: 1 })}</span></div>
                <div className="my-3"><Meter value={ratio} tone={stage.overloaded ? "warn" : "default"} /></div>
                <small className="text-xs text-muted-foreground">{formatDuration(stage.required_minutes)} {t("cần", "required")} / {formatDuration(stage.available_minutes)} {t("có sẵn", "available")} · {stage.lot_count} {t("lô", "lots")}</small>
              </article>
            );
          })}
        </div>
      </Panel>

      <Panel title={t("Nhu cầu / sản lượng theo thời gian", "Demand / output over time")} description={<><span className="font-medium text-warning">{t("Cam", "Orange")}</span>: {t("nhu cầu", "demand")} · <span className="font-medium text-primary">{t("xanh", "blue")}</span>: {t("sản lượng kế hoạch", "planned output")}.</>}>
        <Table>
          <TableHeader><TableRow><TableHead>{t("Kỳ", "Period")}</TableHead>{products.map((product) => <TableHead key={product.product}><span className="grid">{productLabel(product.product)}<small className="font-normal text-muted-foreground">{t("Nhu cầu / Sản xuất", "Demand / Output")}</small></span></TableHead>)}</TableRow></TableHeader>
          <TableBody>{plan.result.buckets.map((bucket) => (
            <TableRow key={bucket.start}>
              <TableCell className="font-semibold">{dateLabel(plan.time_origin, bucket.start)} – {dateLabel(plan.time_origin, bucket.end)}</TableCell>
              {bucket.products.map((product) => {
                const max = Math.max(product.demand_qty, product.production_qty, 1);
                return (
                  <TableCell key={product.product} className="min-w-28">
                    <div className="flex justify-between gap-2 tabular-nums"><span>{product.demand_qty}</span><strong>{product.production_qty}</strong></div>
                    <div className="mt-1.5 grid gap-1">
                      <span className="block h-1 overflow-hidden rounded-full bg-grid"><i className="block h-full bg-warning" style={{ width: `${(product.demand_qty / max) * 100}%` }} /></span>
                      <span className="block h-1 overflow-hidden rounded-full bg-grid"><i className="block h-full bg-primary" style={{ width: `${(product.production_qty / max) * 100}%` }} /></span>
                    </div>
                  </TableCell>
                );
              })}
            </TableRow>
          ))}</TableBody>
        </Table>
      </Panel>

      <Collapsible className="rounded-lg border bg-card p-4 shadow-card">
        <CollapsibleTrigger className="group flex w-full items-center justify-between font-semibold">{t("Giả định tính toán", "Calculation assumptions")} ({plan.result.assumptions.length})<ChevronDown className="size-4 transition-transform group-data-[state=open]:rotate-180" /></CollapsibleTrigger>
        <CollapsibleContent>
          <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm text-muted-foreground">{plan.result.assumptions.map((assumption) => <li key={assumption}>{backendText(assumptionLabels, assumption)}</li>)}</ul>
          <small className="mt-3 block text-xs text-muted-foreground">{t("Tạo lúc", "Created")} {formatDateTime(plan.created_at)} · {t("snapshot bất biến", "immutable snapshot")}.</small>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
