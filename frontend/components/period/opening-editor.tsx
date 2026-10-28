"use client";

import { RotateCcw } from "lucide-react";
import type { ReactNode } from "react";

import { Hint, Panel } from "@/components/blocks";
import { useI18n } from "@/components/i18n-provider";
import { ProductDot } from "@/components/master-data/shared";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { fmtLocal, productName, stageName } from "@/lib/factory";
import type { FactoryConfig, OpeningState, StockLevels } from "@/lib/factory-types";
import { cn } from "@/lib/utils";

type Group = keyof StockLevels;

/** Opening stock, semi-finished stock and mold counters. When the previous period's committed
    schedule projected them, the projection stays visible so corrections to the actual count stand out. */
export function OpeningEditor({ opening, onChange, config, readOnly }: { opening: OpeningState; onChange: (opening: OpeningState) => void; config: FactoryConfig; readOnly: boolean }) {
  const { t } = useI18n();
  const projected = opening.projected;
  const set = (group: Group, code: string, value: number) => onChange({ ...opening, [group]: { ...opening[group], [code]: Math.max(0, value) } });
  const corrected = projected ? (["finished", "btp", "molds"] as Group[]).reduce((n, group) => n + Object.keys({ ...projected[group], ...opening[group] }).filter((code) => (opening[group][code] ?? 0) !== (projected[group][code] ?? 0)).length, 0) : 0;
  const products = Object.keys(config.products);

  const cell = (group: Group, code: string, extra?: { max?: number }) => {
    const value = opening[group][code] ?? 0;
    const plan = projected?.[group][code];
    const changed = projected != null && value !== (plan ?? 0);
    return (
      <>
        <TableCell className="w-32">
          <Input type="number" min={0} max={extra?.max} disabled={readOnly} value={value} aria-label={code}
            onChange={(event) => set(group, code, event.target.value === "" ? 0 : Number(event.target.value))}
            className={cn("h-8 text-right tabular-nums", changed && "border-warning ring-1 ring-warning/40")} />
        </TableCell>
        {projected && <TableCell className="text-right text-muted-foreground tabular-nums">{plan ?? 0}{changed && <Badge variant="warning" className="ml-1.5">{value > (plan ?? 0) ? "+" : ""}{value - (plan ?? 0)}</Badge>}</TableCell>}
      </>
    );
  };

  const head = (first: ReactNode, rest: ReactNode[] = []) => (
    <TableHeader><TableRow>
      <TableHead className="pl-3">{first}</TableHead>
      <TableHead>{t("Thực tế", "Actual")}</TableHead>
      {projected && <TableHead className="text-right">{t("Dự kiến", "Projected")}</TableHead>}
      {rest.map((item, i) => <TableHead key={i} className="text-right last:pr-3">{item}</TableHead>)}
    </TableRow></TableHeader>
  );

  const btpStages = config.stages.slice(0, -1);
  return (
    <div className="grid gap-4">
      {projected ? (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-info-soft px-4 py-3 text-sm text-primary">
          <span>{t(`Số dự kiến theo lịch đã chốt tới ${fmtLocal(opening.as_of)}. Đếm kho thực tế rồi sửa chỗ khác — ô đã sửa được tô vàng.`, `Projected from the committed schedule up to ${fmtLocal(opening.as_of)}. Count the actual stock and correct what differs — edited cells are highlighted.`)}{corrected > 0 && <b className="ml-1">{t(`${corrected} ô đã chỉnh.`, `${corrected} corrected.`)}</b>}</span>
          {!readOnly && corrected > 0 && <Button size="sm" variant="outline" onClick={() => onChange({ ...opening, finished: { ...projected.finished }, btp: { ...projected.btp }, molds: { ...projected.molds } })}><RotateCcw />{t("Đặt lại theo dự kiến", "Reset to projection")}</Button>}
        </div>
      ) : <Hint className="mt-0">{t("Kỳ này không có lịch đã chốt trước đó để dự kiến tồn — nhập số đếm kho thực tế.", "There is no earlier committed schedule to project from — enter the actual stock counts.")}</Hint>}

      <Panel title={t("Thành phẩm", "Finished goods")} flush>
        <div className="overflow-x-auto border-t">
          <Table>
            {head(t("Sản phẩm", "Product"), [t("An toàn", "Safety"), t("Trần kho", "Cap")])}
            <TableBody>{products.map((code) => {
              const spec = config.products[code];
              const value = opening.finished[code] ?? 0;
              return (
                <TableRow key={code}>
                  <TableCell className="pl-3"><span className="inline-flex items-center gap-1.5"><ProductDot product={code} products={products} />{productName(config, code)}</span>{value < spec.safety_stock && <Badge variant="warning" className="ml-2">{t("dưới mức an toàn", "below safety")}</Badge>}</TableCell>
                  {cell("finished", code)}
                  <TableCell className="text-right tabular-nums">{spec.safety_stock}</TableCell>
                  <TableCell className="pr-3 text-right tabular-nums">{spec.stock_cap}</TableCell>
                </TableRow>
              );
            })}</TableBody>
          </Table>
        </div>
      </Panel>

      <Panel title={t("Bán thành phẩm (WIP)", "Semi-finished (WIP)")} flush>
        <div className="overflow-x-auto border-t">
          <Table>
            {head(t("Mã bán thành phẩm", "Semi-finished code"), [t("Công đoạn", "Stage"), t("Sức chứa", "Capacity")])}
            <TableBody>{btpStages.flatMap((stage) => [...new Set(Object.values(config.products).map((p) => p.route[stage]))].map((code) => (
              <TableRow key={code}>
                <TableCell className="pl-3 font-medium">{config.btp[code]?.name || code}</TableCell>
                {cell("btp", code)}
                <TableCell className="text-right text-muted-foreground">{stageName(config, stage)}</TableCell>
                <TableCell className="pr-3 text-right tabular-nums">{config.btp[code]?.capacity ?? "∞"}</TableCell>
              </TableRow>
            )))}</TableBody>
          </Table>
        </div>
      </Panel>

      {Object.keys(config.molds).length > 0 && (
        <Panel title={t("Khuôn — số chu kỳ đã dùng từ lần bảo dưỡng gần nhất", "Molds — cycles used since the last maintenance")} flush>
          <div className="overflow-x-auto border-t">
            <Table>
              {head(t("Khuôn", "Mold"), [t("Đúc mã", "Casts"), t("Giới hạn", "Limit")])}
              <TableBody>{Object.entries(config.molds).map(([code, mold]) => (
                <TableRow key={code}>
                  <TableCell className="pl-3 font-medium">{code}</TableCell>
                  {cell("molds", code, { max: mold.limit_cycles })}
                  <TableCell className="text-right text-muted-foreground">{mold.item}</TableCell>
                  <TableCell className="pr-3 text-right tabular-nums">{mold.limit_cycles}</TableCell>
                </TableRow>
              ))}</TableBody>
            </Table>
          </div>
        </Panel>
      )}
    </div>
  );
}
