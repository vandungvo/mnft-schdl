"use client";

import { Hint, Panel } from "@/components/blocks";
import { useI18n } from "@/components/i18n-provider";
import { ProductDot } from "@/components/master-data/shared";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { productName, stageName, weightLabel } from "@/lib/factory";
import type { FactoryConfig, PeriodInputs, ReservePolicy } from "@/lib/factory-types";
import { cn } from "@/lib/utils";

/** Which objective policy the period is scheduled under, and how much work may be pulled ahead
    for long-term orders (each option is all-or-nothing; the solver decides whether to use it). */
export function PolicyEditor({ inputs, onChange, config, longTermDemand, readOnly }: {
  inputs: PeriodInputs;
  onChange: (patch: Partial<PeriodInputs>) => void;
  config: FactoryConfig;
  longTermDemand: Record<string, number>;
  readOnly: boolean;
}) {
  const { t } = useI18n();
  const current = inputs.policy ?? config.default_policy;
  const products = Object.keys(config.products);
  const btpStages = config.stages.slice(0, -1);
  const setReserve = (product: string, patch: Partial<ReservePolicy>) => {
    const next = { ...(inputs.reserve_policy[product] ?? { finished_lots: 0, btp_runs: {} }), ...patch };
    const cleaned = { ...next, btp_runs: Object.fromEntries(Object.entries(next.btp_runs).filter(([, n]) => n > 0)) };
    const rest = { ...inputs.reserve_policy };
    if (cleaned.finished_lots || Object.keys(cleaned.btp_runs).length) rest[product] = cleaned; else delete rest[product];
    onChange({ reserve_policy: rest });
  };

  return (
    <div className="grid gap-4">
      <Panel title={t("Mục tiêu ưu tiên", "Objective policy")} description={t("Cách cân các mục tiêu khi chấm điểm lịch. Chính sách được định nghĩa ở trang Nhà máy.", "How the objectives are weighed when scoring schedules. Policies are defined on the Factory page.")}>
        <div role="radiogroup" className="grid gap-2 md:grid-cols-2">
          {config.policies.map((policy) => {
            const on = policy.key === current;
            const top = Object.entries(policy.weights).sort((a, b) => b[1] - a[1]).slice(0, 3);
            return (
              <button key={policy.key} type="button" role="radio" aria-checked={on} disabled={readOnly} onClick={() => onChange({ policy: policy.key })}
                className={cn("grid gap-1 rounded-lg border p-3 text-left transition-colors hover:border-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:cursor-default", on && "border-primary bg-accent")}>
                <span className="flex items-center gap-2"><strong className="text-sm font-semibold">{policy.name}</strong>{policy.key === config.default_policy && <Badge variant="outline">{t("mặc định", "default")}</Badge>}</span>
                {policy.description && <span className="text-xs text-muted-foreground">{policy.description}</span>}
                <span className="text-xs text-muted-foreground">
                  {policy.tier1.length > 0 && <>{t("Ưu tiên tuyệt đối: ", "Strictly first: ")}<b>{policy.tier1.map(weightLabel).join(", ")}</b> · </>}
                  {top.map(([key, w]) => `${weightLabel(key)} ×${w}`).join(" · ")}
                </span>
              </button>
            );
          })}
        </div>
      </Panel>

      <Panel title={t("Làm trước cho đơn dài hạn", "Pull ahead for long-term orders")}
        description={t("Cho phép dùng năng lực rảnh để làm sẵn một phần đơn sau kỳ. Mỗi lô/lượt là một lựa chọn: solver chỉ làm khi có lợi.", "Lets idle capacity make part of the after-period orders early. Each lot/run is an option: the solver only uses it when it pays off.")} flush>
        <div className="overflow-x-auto border-t">
          <Table>
            <TableHeader><TableRow>
              <TableHead className="pl-3">{t("Sản phẩm", "Product")}</TableHead>
              <TableHead className="text-right">{t("Nhu cầu sau kỳ", "Demand after period")}</TableHead>
              <TableHead>{t(`Lô thành phẩm (${config.run_size[config.stages[config.stages.length - 1]]}/lô)`, `Finished lots (${config.run_size[config.stages[config.stages.length - 1]]} each)`)}</TableHead>
              {btpStages.map((stage) => <TableHead key={stage}>{t(`Lượt ${stageName(config, stage).toLowerCase()}`, `${stageName(config, stage)} runs`)}</TableHead>)}
            </TableRow></TableHeader>
            <TableBody>{products.map((product) => {
              const reserve = inputs.reserve_policy[product];
              const demand = longTermDemand[product] ?? 0;
              return (
                <TableRow key={product}>
                  <TableCell className="pl-3"><span className="inline-flex items-center gap-1.5"><ProductDot product={product} products={products} />{productName(config, product)}</span></TableCell>
                  <TableCell className="text-right tabular-nums">{demand || "—"}</TableCell>
                  <TableCell className="w-28"><Input type="number" min={0} className="h-8" disabled={readOnly || !demand} value={reserve?.finished_lots ?? 0} onChange={(event) => setReserve(product, { finished_lots: Math.max(0, Number(event.target.value) || 0) })} /></TableCell>
                  {btpStages.map((stage) => (
                    <TableCell key={stage} className="w-28"><Input type="number" min={0} className="h-8" disabled={readOnly || !demand} value={reserve?.btp_runs[stage] ?? 0}
                      onChange={(event) => setReserve(product, { btp_runs: { ...(reserve?.btp_runs ?? {}), [stage]: Math.max(0, Number(event.target.value) || 0) } })} /></TableCell>
                  ))}
                </TableRow>
              );
            })}</TableBody>
          </Table>
        </div>
      </Panel>
      <Hint className="mt-0">{t("Chỉ sản phẩm có đơn sau kỳ mới làm trước được; tổng làm trước không vượt nhu cầu đó (hệ thống kiểm tra khi lưu).", "Only products with after-period orders can be pulled ahead, and never beyond that demand (checked on save).")}</Hint>
    </div>
  );
}
