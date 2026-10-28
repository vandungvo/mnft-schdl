"use client";

import { Pencil, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import { Field, Hint, Panel } from "@/components/blocks";
import { useI18n } from "@/components/i18n-provider";
import { ProductDot, RecordSheet } from "@/components/master-data/shared";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { addDays, fmtLocal, pickupLabel, priorityLabel, priorityTone, productName } from "@/lib/factory";
import type { FactoryConfig, Issue, PeriodOrder } from "@/lib/factory-types";
import { cn } from "@/lib/utils";

const EMPTY: PeriodOrder = { code: "", product: "", quantity: 0, due: "", priority: 2, pickup: "at_due", from_stock: null, customer: null, note: null, source: "manual" };

/** Orders of one period: due inside it (scheduled) and after it (long-term, only feed pull-ahead). */
export function OrdersEditor({ orders, onChange, config, endDate, issues, readOnly }: {
  orders: PeriodOrder[];
  onChange: (orders: PeriodOrder[]) => void;
  config: FactoryConfig;
  endDate: string;
  issues: Issue[];
  readOnly: boolean;
}) {
  const { t } = useI18n();
  const [editing, setEditing] = useState<{ index: number | null; order: PeriodOrder } | null>(null);
  const horizon = `${addDays(endDate, 1)}T00:00`;
  const products = Object.keys(config.products);
  const flagged = useMemo(() => new Map(issues.filter((i) => i.ref).map((i) => [i.ref!, i.severity])), [issues]);
  const indexed = orders.map((order, index) => ({ order, index }));
  const inPeriod = indexed.filter(({ order }) => order.due <= horizon).sort((a, b) => a.order.due.localeCompare(b.order.due) || a.order.code.localeCompare(b.order.code));
  const later = indexed.filter(({ order }) => order.due > horizon).sort((a, b) => a.order.due.localeCompare(b.order.due));
  const totals = inPeriod.reduce<Record<string, number>>((acc, { order }) => ({ ...acc, [order.product]: (acc[order.product] ?? 0) + order.quantity }), {});

  const remove = (index: number) => onChange(orders.filter((_, i) => i !== index));
  const save = (order: PeriodOrder, index: number | null) => {
    onChange(index == null ? [...orders, order] : orders.map((item, i) => (i === index ? order : item)));
    setEditing(null);
  };

  const table = (rows: typeof indexed, longTerm: boolean) => (
    <div className="overflow-x-auto rounded-lg border">
      <Table>
        <TableHeader><TableRow>
          <TableHead className="pl-3">{t("Mã đơn", "Order")}</TableHead>
          <TableHead>{t("Sản phẩm", "Product")}</TableHead>
          <TableHead className="text-right">{t("Số lượng", "Qty")}</TableHead>
          <TableHead>{t("Hạn giao", "Due")}</TableHead>
          {!longTerm && <TableHead>{t("Ưu tiên", "Priority")}</TableHead>}
          {!longTerm && <TableHead className="text-right">{t("Lấy từ kho", "From stock")}</TableHead>}
          <TableHead>{t("Khách hàng", "Customer")}</TableHead>
          {!readOnly && <TableHead className="w-0 pr-3"><span className="sr-only">{t("Thao tác", "Actions")}</span></TableHead>}
        </TableRow></TableHeader>
        <TableBody>
          {rows.map(({ order, index }) => {
            const flag = flagged.get(order.code);
            return (
              <TableRow key={`${order.code}-${index}`} className={cn(flag === "error" && "bg-danger-soft/60", flag === "warning" && "bg-warning-soft/50")}>
                <TableCell className="pl-3 font-medium">
                  {order.code}
                  {order.source !== "book" && <Badge variant="outline" className="ml-1.5">{order.source === "carried" ? t("chuyển kỳ", "carried") : t("riêng kỳ", "period only")}</Badge>}
                </TableCell>
                <TableCell><span className="inline-flex items-center gap-1.5"><ProductDot product={order.product} products={products} />{productName(config, order.product)}</span></TableCell>
                <TableCell className="text-right tabular-nums">{order.quantity}</TableCell>
                <TableCell className="whitespace-nowrap">{fmtLocal(order.due, { weekday: true })}<span className="block text-xs text-muted-foreground">{pickupLabel(order.pickup)}</span></TableCell>
                {!longTerm && <TableCell><Badge variant={priorityTone(order.priority)}>{priorityLabel(order.priority)}</Badge></TableCell>}
                {!longTerm && <TableCell className="text-right tabular-nums">{order.from_stock == null ? <span className="text-muted-foreground">{t("tự động", "auto")}</span> : order.from_stock}</TableCell>}
                <TableCell className="max-w-40 truncate text-muted-foreground">{order.customer ?? "—"}</TableCell>
                {!readOnly && (
                  <TableCell className="pr-3">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" className="size-8" aria-label={t(`Sửa ${order.code}`, `Edit ${order.code}`)} onClick={() => setEditing({ index, order })}><Pencil /></Button>
                      <Button variant="ghost" size="icon" className="size-8 text-destructive" aria-label={t(`Bỏ ${order.code} khỏi kỳ`, `Remove ${order.code} from the period`)} onClick={() => remove(index)}><Trash2 /></Button>
                    </div>
                  </TableCell>
                )}
              </TableRow>
            );
          })}
          {!rows.length && <TableRow><TableCell colSpan={8} className="py-6 text-center text-sm text-muted-foreground">{longTerm ? t("Không có đơn sau kỳ.", "No orders after the period.") : t("Chưa có đơn nào trong kỳ.", "No orders in this period yet.")}</TableCell></TableRow>}
        </TableBody>
      </Table>
    </div>
  );

  return (
    <div className="grid gap-4">
      <Panel title={t(`Đơn có hạn trong kỳ · ${inPeriod.length}`, `Orders due in the period · ${inPeriod.length}`)}
        description={Object.entries(totals).map(([p, q]) => `${productName(config, p)} ${q}`).join(" · ") || undefined}
        actions={!readOnly && <Button size="sm" variant="outline" onClick={() => setEditing({ index: null, order: { ...EMPTY, product: products[0], due: `${endDate}T${config.default_due_time}` } })}><Plus />{t("Thêm đơn riêng kỳ", "Add a period-only order")}</Button>}>
        {table(inPeriod, false)}
        <Hint>{t("Đơn lấy từ Sổ đơn hàng. Sửa ở đây chỉ áp dụng cho kỳ này (ví dụ đổi ưu tiên); muốn sửa đơn gốc hoặc nhập thêm từ Excel, dùng ", "Orders come from the Order book. Edits here only apply to this period (e.g. a priority change); to change the original or import more from Excel, use the ")}<Link href="/orders" className="font-medium text-primary hover:underline">{t("Sổ đơn hàng", "Order book")}</Link>. {t("“Lấy từ kho” để trống = hệ thống tự phân bổ tồn trên mức an toàn cho đơn sớm nhất.", "“From stock” left blank = stock above the safety level is allocated automatically, earliest due first.")}</Hint>
      </Panel>
      <Panel title={t(`Đơn sau kỳ · ${later.length}`, `Orders after the period · ${later.length}`)}
        description={t(`Hạn trong ${config.lookahead_days} ngày sau kỳ: không phải giao trong kỳ, chỉ dùng để quyết định có làm trước hay không.`, `Due within ${config.lookahead_days} days after the period: not delivered in it, only used to decide on pulling work ahead.`)}>
        {table(later, true)}
      </Panel>
      {editing && <OrderSheet key={editing.index ?? "new"} initial={editing.order} config={config} existing={orders.filter((_, i) => i !== editing.index).map((o) => o.code)}
        onClose={() => setEditing(null)} onSave={(order) => save(order, editing.index)} />}
    </div>
  );
}

function OrderSheet({ initial, config, existing, onClose, onSave }: { initial: PeriodOrder; config: FactoryConfig; existing: string[]; onClose: () => void; onSave: (order: PeriodOrder) => void }) {
  const { t } = useI18n();
  const [order, setOrder] = useState(initial);
  const isNew = !initial.code;
  const dirty = JSON.stringify(order) !== JSON.stringify(initial);
  const codeTaken = order.code.trim() !== "" && existing.includes(order.code.trim());
  const valid = order.code.trim() !== "" && !codeTaken && order.product !== "" && order.quantity > 0 && order.due !== "" && (order.from_stock == null || order.from_stock <= order.quantity);
  const set = (patch: Partial<PeriodOrder>) => setOrder((current) => ({ ...current, ...patch }));
  return (
    <RecordSheet open onClose={onClose} dirty={dirty} title={isNew ? t("Thêm đơn riêng kỳ", "Add a period-only order") : t(`Đơn ${initial.code}`, `Order ${initial.code}`)}
      description={isNew ? t("Đơn này chỉ có trong kỳ này (không vào sổ đơn hàng).", "This order exists in this period only (not in the order book).") : t("Thay đổi chỉ áp dụng cho kỳ này.", "Changes apply to this period only.")}
      footer={<><Button variant="outline" onClick={onClose}>{t("Hủy", "Cancel")}</Button><Button disabled={!valid} onClick={() => onSave({ ...order, code: order.code.trim() })}>{t("Áp dụng", "Apply")}</Button></>}>
      <div className="grid gap-4">
        <Field label={t("Mã đơn", "Order code")} hint={codeTaken ? t("Mã này đã có trong kỳ.", "This code is already in the period.") : undefined}>
          <Input value={order.code} disabled={!isNew} onChange={(event) => set({ code: event.target.value })} aria-invalid={codeTaken} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t("Sản phẩm", "Product")}>
            <Select value={order.product} onValueChange={(value) => set({ product: value })}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>{Object.keys(config.products).map((code) => <SelectItem key={code} value={code}>{productName(config, code)} ({code})</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label={t("Số lượng", "Quantity")}><Input type="number" min={1} value={order.quantity || ""} onChange={(event) => set({ quantity: Number(event.target.value) })} /></Field>
          <Field label={t("Hạn giao", "Due")}><Input type="datetime-local" value={order.due} onChange={(event) => set({ due: event.target.value })} /></Field>
          <Field label={t("Ưu tiên", "Priority")}>
            <Select value={String(order.priority)} onValueChange={(value) => set({ priority: Number(value) })}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>{[1, 2, 3, 4].map((n) => <SelectItem key={n} value={String(n)}>{priorityLabel(n)}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label={t("Cách giao", "Pickup")}>
            <Select value={order.pickup} onValueChange={(value) => set({ pickup: value as PeriodOrder["pickup"] })}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="at_due">{pickupLabel("at_due")}</SelectItem><SelectItem value="when_ready">{pickupLabel("when_ready")}</SelectItem></SelectContent>
            </Select>
          </Field>
          <Field label={t("Lấy từ kho", "From stock")} hint={t("Để trống = tự động", "Blank = automatic")}>
            <Input type="number" min={0} value={order.from_stock ?? ""} onChange={(event) => set({ from_stock: event.target.value === "" ? null : Number(event.target.value) })} />
          </Field>
        </div>
        <Field label={t("Khách hàng", "Customer")}><Input value={order.customer ?? ""} onChange={(event) => set({ customer: event.target.value || null })} /></Field>
        <Field label={t("Ghi chú", "Note")}><Textarea rows={2} value={order.note ?? ""} onChange={(event) => set({ note: event.target.value || null })} /></Field>
      </div>
    </RecordSheet>
  );
}
