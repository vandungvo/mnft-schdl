"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useParams } from "next/navigation";

import { ErrorState, SkeletonCards, SkeletonTable } from "@/components/ui-states";
import { getProductionPlan } from "@/lib/api";
import { formatDateTime, formatDuration, formatInputName, minuteToDate } from "@/lib/format";

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

const stageLabels: Record<string, string> = { cast: "Đúc", cnc: "CNC", paint: "Sơn", qc: "Kiểm tra chất lượng" };

function dateLabel(origin: string, minutes: number) {
  return new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium" }).format(minuteToDate(origin, minutes));
}

export default function ProductionPlanDetailPage() {
  const { id } = useParams<{ id: string }>();
  const query = useQuery({ queryKey: ["production-plan", id], queryFn: () => getProductionPlan(id) });

  if (query.isLoading) return <><SkeletonCards count={4} /><div style={{ height: 20 }} /><SkeletonTable rows={6} /></>;
  if (query.isError || !query.data) return <ErrorState title="Không thể tải kế hoạch" message="Kế hoạch không tồn tại hoặc dịch vụ tạm thời không phản hồi." onRetry={() => void query.refetch()} />;

  const plan = query.data;
  const products = plan.result.products;

  return (
    <section>
      <header className="page-header">
        <div><Link href="/planning" className="back-link">← Kế hoạch tổng hợp</Link><span className="eyebrow">KẾ HOẠCH · REV {plan.dataset_revision}</span><h1>{dateLabel(plan.time_origin, plan.period_start)} – {dateLabel(plan.time_origin, plan.period_end)}</h1><p>{formatInputName(plan.input_name)} · {plan.result.order_count} đơn hàng · {plan.result.lot_count} lô · theo {plan.bucket_minutes === 1440 ? "ngày" : "tuần"}</p></div>
        <div className="header-actions">{plan.dataset_id && <Link href={`/master-data/${plan.dataset_id}`} className="button">Xem master data</Link>}<Link href={`/runs/new?planId=${plan.id}`} className="button button-primary">Lập lịch chi tiết</Link></div>
      </header>

      <div className={plan.status === "READY" ? "plan-banner plan-ready" : "plan-banner plan-warning"}><strong>{plan.status === "READY" ? "Khả thi ở mức công suất tổng hợp" : "Cần điều chỉnh trước khi phát hành"}</strong><span>Lịch chi tiết vẫn phải được kiểm tra trước khi đưa xuống xưởng.</span></div>
      {plan.result.warnings.map((warning) => <div className="alert alert-warning" key={warning}>{warningLabels[warning] ?? warning}</div>)}

      <section className="panel data-section">
        <div className="panel-heading"><div><span className="eyebrow">KẾ HOẠCH VẬT TƯ</span><h2>Nhu cầu và tồn kho theo sản phẩm</h2></div></div>
        <div className="table-wrap"><table><thead><tr><th>Sản phẩm</th><th>Nhu cầu</th><th>Tồn đầu</th><th>Cần sản xuất</th><th>Sản lượng lô</th><th>Tồn cuối dự kiến</th><th>Tồn an toàn</th></tr></thead><tbody>{products.map((product) => <tr key={product.product}><td><strong>{product.product}</strong></td><td>{product.demand_qty.toLocaleString("vi-VN")}</td><td>{product.initial_inventory.toLocaleString("vi-VN")}</td><td>{product.required_production_qty.toLocaleString("vi-VN")}</td><td>{product.planned_lot_qty.toLocaleString("vi-VN")}</td><td className={product.safety_shortfall ? "error-label" : ""}>{product.projected_ending_inventory.toLocaleString("vi-VN")}</td><td>{product.safety_stock.toLocaleString("vi-VN")}{product.safety_shortfall > 0 && <small>Thiếu {product.safety_shortfall.toLocaleString("vi-VN")}</small>}</td></tr>)}</tbody></table></div>
      </section>

      <section className="panel data-section"><div className="panel-heading"><div><span className="eyebrow">CÔNG SUẤT SƠ BỘ</span><h2>Tải công suất theo công đoạn</h2></div></div><div className="capacity-grid">{plan.result.stages.map((stage) => {
        const percent = (stage.load_ratio ?? 0) * 100;
        return <article className="capacity-card" key={stage.stage}><div><strong>{stageLabels[stage.stage] ?? stage.stage}</strong><span className={stage.overloaded ? "error-label" : ""}>{stage.load_ratio === null ? "Không có công suất" : `${percent.toFixed(1)}%`}</span></div><div className="capacity-track"><i className={stage.overloaded ? "capacity-over" : ""} style={{ width: `${Math.min(percent, 100)}%` }} /></div><small>{formatDuration(stage.required_minutes)} cần / {formatDuration(stage.available_minutes)} có sẵn · {stage.lot_count} lô</small></article>;
      })}</div></section>

      <section className="panel data-section">
        <div className="panel-heading"><div><span className="eyebrow">THEO KỲ</span><h2>Nhu cầu / sản lượng theo thời gian</h2><p>Cam: nhu cầu · xanh: sản lượng kế hoạch.</p></div></div>
        <div className="table-wrap"><table><thead><tr><th>Kỳ</th>{products.map((product) => <th key={product.product}><span className="bucket-heading">{product.product}<small>Nhu cầu / Sản xuất</small></span></th>)}</tr></thead><tbody>{plan.result.buckets.map((bucket) => <tr key={bucket.start}><td><strong>{dateLabel(plan.time_origin, bucket.start)} – {dateLabel(plan.time_origin, bucket.end)}</strong></td>{bucket.products.map((product) => {
          const max = Math.max(product.demand_qty, product.production_qty, 1);
          return <td className="bucket-cell" key={product.product}><div className="bucket-values"><span>{product.demand_qty}</span><strong>{product.production_qty}</strong></div><div className="bucket-bars"><span className="bucket-bar"><i style={{ width: `${product.demand_qty / max * 100}%` }} /></span><span className="bucket-bar bucket-bar-production"><i style={{ width: `${product.production_qty / max * 100}%` }} /></span></div></td>;
        })}</tr>)}</tbody></table></div>
      </section>

      <details className="panel assumptions-panel"><summary>Giả định tính toán ({plan.result.assumptions.length})</summary><ul>{plan.result.assumptions.map((assumption) => <li key={assumption}>{assumptionLabels[assumption] ?? assumption}</li>)}</ul><small>Tạo lúc {formatDateTime(plan.created_at)} · snapshot bất biến.</small></details>
    </section>
  );
}
