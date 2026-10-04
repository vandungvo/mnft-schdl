"use client";

import { ArrowDown, ArrowRight, PackageCheck } from "lucide-react";
import { Fragment } from "react";

import { Chip, Hint, Meter, Panel } from "@/components/blocks";
import { useI18n } from "@/components/i18n-provider";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { fmtN } from "@/lib/decision";
import { formatClock, formatDay, formatDuration, productLabel, stageLabel } from "@/lib/format";
import type { SchedulingInputDocument } from "@/lib/types";

const N = "text-right tabular-nums";
const avg = (values: number[]) => (values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0);

export function SituationPanel({ input, origin }: { input: SchedulingInputDocument; origin: string }) {
  const { t } = useI18n();
  const days = Math.round(input.horizon / 1440);
  const total = input.orders.reduce((sum, order) => sum + order.quantity, 0);
  const fromStock = input.orders.reduce((sum, order) => sum + order.initial_allocated, 0);
  const machines = Object.entries(input.machines);
  const molds = machines.filter(([, machine]) => machine.mold).map(([id, machine]) => ({ machine: id, ...machine.mold! }));
  const downtime = machines.flatMap(([id, machine]) => machine.downtime.map(([a, z]) => ({ id, a, z })));
  const btpAfter = (stage: string) => {
    const codes = new Set(input.products.map((product) => input.btp_routing?.[product]?.[stage]).filter(Boolean) as string[]);
    return [...codes].map((code) => ({ code, qty: input.inventory_btp?.[code] ?? 0, cap: input.btp_capacity?.[code] }));
  };
  const setupValues = machines.flatMap(([, machine]) => Object.values(machine.setup).flatMap((row) => Object.values(row))).filter((v) => v > 0);

  return (
    <div className="grid min-w-0 gap-4">
      <div className="flex flex-wrap gap-1.5">
        <Chip><b>{days} {t("ngày", "days")}</b> {formatDay(origin, 0)} → {formatDay(origin, input.horizon - 1)}</Chip>
        <Chip><b>{input.orders.length}</b> {t("đơn", "orders")} · {fmtN(total)} {t("đơn vị", "units")} ({fmtN(fromStock)} {t("lấy từ kho", "from stock")})</Chip>
        <Chip><b>{input.lots.length}</b> {t("lô sản xuất", "production lots")}</Chip>
        <Chip><b>{machines.length}</b> {t("máy", "machines")} · {input.stages.length} {t("công đoạn", "stages")}</Chip>
        <Chip><b>{input.checkpoints.length}</b> {t("mốc đo tồn an toàn", "safety-stock checkpoints")}</Chip>
      </div>

      <Panel title={t("Quy trình và tồn bán thành phẩm đầu kỳ", "Process flow and opening semi-finished stock")}>
        <ol className="flex flex-col gap-1 xl:flex-row xl:items-stretch" aria-label={t("Dòng chảy công đoạn", "Stage flow")}>
          {input.stages.map((stage, index) => {
            const stageMachines = machines.filter(([, machine]) => machine.stage === stage);
            const buffers = btpAfter(stage);
            const last = index === input.stages.length - 1;
            return (
              <Fragment key={stage}>
                <li className="flex min-w-0 flex-col gap-0.5 rounded-lg bg-muted px-3 py-2.5 xl:flex-[1.3]">
                  <span className="mb-1 font-semibold">{stageLabel(stage)}</span>
                  {stageMachines.map(([id, machine]) => (
                    <span key={id} className="flex justify-between gap-2 text-[13px]"><span className="text-muted-foreground">{id}</span><b className="font-semibold">{fmtN(avg(Object.values(machine.minutes_per_unit)) * 100)}′/100</b></span>
                  ))}
                  <span className="mt-auto border-t border-dashed pt-1.5 text-xs text-muted-foreground">{stageMachines.length} {t("máy", "machines")}{stageMachines.some(([, m]) => m.mold) ? t(" · có khuôn", " · with molds") : ""}</span>
                </li>
                {!last ? (
                  <li className="flex min-w-0 items-center gap-3 py-1 pl-4 text-[13px] xl:flex-1 xl:flex-col xl:justify-center xl:gap-1 xl:py-0 xl:pl-0 xl:text-center">
                    <ArrowDown className="size-4 shrink-0 text-muted-foreground xl:hidden" />
                    <span className="text-xs text-muted-foreground">{buffers.length ? t("Kho BTP", "Semi-finished stock") : t("Chuyển tiếp", "Transfer")}</span>
                    <span className="flex flex-wrap gap-x-3 xl:flex-col">{buffers.length ? buffers.map((b) => <span key={b.code} className="break-all">{b.code} <b>{b.qty}</b>{b.cap ? <small className="text-muted-foreground">/{b.cap}</small> : null}</span>) : <span className="text-muted-foreground">{input.transfer_minutes ? `${input.transfer_minutes}′` : "—"}</span>}</span>
                    <ArrowRight className="hidden size-4 text-muted-foreground xl:block" />
                  </li>
                ) : (
                  <li className="mt-2 flex min-w-0 flex-col gap-0.5 rounded-lg border-[1.5px] border-success px-3 py-2.5 text-[13px] xl:mt-0 xl:ml-2 xl:flex-1">
                    <span className="flex items-center gap-1.5 font-semibold text-success"><PackageCheck className="size-4" />{t("Thành phẩm", "Finished goods")}</span>
                    {input.products.map((p) => <span key={p}>{productLabel(p)} <b>{input.initial_inventory[p] ?? 0}</b></span>)}
                  </li>
                )}
              </Fragment>
            );
          })}
        </ol>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {setupValues.length > 0 && <Chip><b>Setup</b> {Math.min(...setupValues)}′–{Math.max(...setupValues)}′ {t("khi đổi sản phẩm", "on product change")}</Chip>}
          {input.transfer_minutes > 0 && <Chip><b>{t("Chuyển công đoạn", "Stage transfer")}</b> {input.transfer_minutes}′</Chip>}
          <Chip><b>{t("Ngày làm việc", "Working days")}</b> {input.working_days.length}/{days}</Chip>
          <Chip><b>{t("Lô tối thiểu", "Minimum lot")}</b> {input.minimum_lot}</Chip>
        </div>
        <Hint>{t("Số trên mỗi máy là thời gian gia công trung bình cho 100 đơn vị (chưa gồm thời gian cố định và setup).", "The figure on each machine is the average processing time per 100 units (excluding fixed time and setup).")}</Hint>
      </Panel>

      <div className="grid min-w-0 gap-4 xl:grid-cols-12">
        <Panel title={t("Đơn hàng trong kỳ", "Orders in the period")} className="xl:col-span-7">
          <div className="max-h-[440px] overflow-y-auto">
            <Table>
              <TableHeader className="sticky top-0 bg-card"><TableRow><TableHead>{t("Đơn", "Order")}</TableHead><TableHead>{t("Sản phẩm", "Product")}</TableHead><TableHead className={N}>{t("Số lượng", "Quantity")}</TableHead><TableHead className={N}>{t("Lấy kho", "From stock")}</TableHead><TableHead className={N}>{t("Lô", "Lots")}</TableHead><TableHead>{t("Hạn", "Due")}</TableHead><TableHead className={N}>{t("Ưu tiên", "Priority")}</TableHead></TableRow></TableHeader>
              <TableBody>{input.orders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell className="font-semibold">{order.id}</TableCell><TableCell>{productLabel(order.product)}</TableCell><TableCell className={N}>{fmtN(order.quantity)}</TableCell>
                  <TableCell className={N}>{order.initial_allocated || "—"}</TableCell><TableCell className={N}>{Object.keys(order.lot_allocations).length}</TableCell>
                  <TableCell>{formatClock(origin, order.due)}</TableCell>
                  <TableCell className={N}>{order.priority}{order.urgent && <Badge variant="brand" className="ml-1.5">{t("gấp", "urgent")}</Badge>}</TableCell>
                </TableRow>
              ))}</TableBody>
              <TableFooter><TableRow><TableCell colSpan={2}>{t("Tổng", "Total")}</TableCell><TableCell className={N}>{fmtN(total)}</TableCell><TableCell className={N}>{fmtN(fromStock)}</TableCell><TableCell className={N}>{input.lots.length}</TableCell><TableCell colSpan={2} /></TableRow></TableFooter>
            </Table>
          </div>
        </Panel>
        <div className="grid min-w-0 content-start gap-4 xl:col-span-5">
          <Panel title={t("Kho thành phẩm", "Finished-goods stock")}>
            <Table>
              <TableHeader><TableRow><TableHead />{input.products.map((p) => <TableHead className={N} key={p}>{productLabel(p)}</TableHead>)}</TableRow></TableHeader>
              <TableBody>
                <TableRow><TableCell>{t("Tồn đầu kỳ", "Opening stock")}</TableCell>{input.products.map((p) => <TableCell className={N} key={p}>{input.initial_inventory[p] ?? 0}</TableCell>)}</TableRow>
                <TableRow><TableCell>{t("Tồn an toàn", "Safety stock")}</TableCell>{input.products.map((p) => <TableCell className={N} key={p}>{input.safety_stock[p] ?? 0}</TableCell>)}</TableRow>
              </TableBody>
            </Table>
          </Panel>
          {molds.length > 0 && (
            <Panel title={t("Khuôn đúc", "Casting molds")}>
              <ul className="grid gap-2.5 text-sm">
                {molds.map((mold) => {
                  const used = mold.initial_cycles / Math.max(1, mold.limit_cycles);
                  return <li key={mold.id} className="grid grid-cols-[7em_minmax(60px,1fr)_auto] items-center gap-3"><span className="font-semibold">{mold.id}</span><Meter value={used} tone={used >= 0.8 ? "warn" : "default"} /><span className="text-xs whitespace-nowrap text-muted-foreground">{mold.initial_cycles}/{mold.limit_cycles} {t("lượt", "cycles")}</span></li>;
                })}
              </ul>
              <Hint>{t("Hết chu kỳ phải bảo trì khuôn", "When the cycle limit is reached the mold needs")} {formatDuration(molds[0].maintenance_minutes)} {t("trước khi chạy tiếp.", "of maintenance before running again.")}</Hint>
            </Panel>
          )}
          {downtime.length > 0 && (
            <Panel title={t("Lịch dừng máy", "Machine downtime")}>
              <ul className="grid gap-1.5 text-sm">{downtime.map((d) => <li key={`${d.id}${d.a}`}><b>{d.id}</b> {formatClock(origin, d.a)} → {formatClock(origin, d.z)}</li>)}</ul>
            </Panel>
          )}
        </div>
      </div>
    </div>
  );
}
