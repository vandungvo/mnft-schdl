"use client";

import { useMutation } from "@tanstack/react-query";
import { ChevronDown, ChevronRight, ClipboardList, Pencil, Search, Trash2, X } from "lucide-react";
import { Fragment, useMemo, useState } from "react";

import { EmptyState, Field, FilterBar, Panel } from "@/components/blocks";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { useI18n } from "@/components/i18n-provider";
import { useToast } from "@/components/toast-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { SheetClose } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { deleteMasterOrder, updateMasterOrder } from "@/lib/api";
import { dateTimeInputToMinute, formatClock, formatDay, formatDuration, formatNumber, minuteToDateTimeInput, productLabel } from "@/lib/format";
import { demandByProduct, lotsOfOrder, sum } from "@/lib/master-data";
import type { OrderInput } from "@/lib/types";
import { cn } from "@/lib/utils";

import { DirtyHint, FieldError, MutationNotice, ProductDot, RecordSheet, SheetSection, useDataset } from "./shared";

const N = "text-right tabular-nums";
type Sort = "due" | "priority" | "quantity" | "id";

export function OrdersSection({ item, due, onOpen, onClose, onClearDue }: { item: string | null; due: number | null; onOpen: (id: string) => void; onClose: () => void; onClearDue: () => void }) {
  const { t } = useI18n();
  const { dataset } = useDataset();
  const input = dataset.input;
  const [search, setSearch] = useState("");
  const [product, setProduct] = useState<string>("all");
  const [urgentOnly, setUrgentOnly] = useState(false);
  const [sort, setSort] = useState<Sort>("due");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const days = Math.ceil(input.horizon / 1440);

  const rows = useMemo(() => {
    const list = input.orders.filter((order) =>
      (product === "all" || order.product === product)
      && (!urgentOnly || order.urgent)
      && (due == null || Math.min(days - 1, Math.floor(order.due / 1440)) === due)
      && `${order.id} ${order.product} ${Object.keys(order.lot_allocations).join(" ")}`.toLowerCase().includes(search.toLowerCase()));
    const by: Record<Sort, (a: OrderInput, b: OrderInput) => number> = {
      due: (a, b) => a.due - b.due || a.id.localeCompare(b.id),
      priority: (a, b) => b.priority - a.priority || Number(b.urgent) - Number(a.urgent) || a.due - b.due,
      quantity: (a, b) => b.quantity - a.quantity,
      id: (a, b) => a.id.localeCompare(b.id),
    };
    return list.sort(by[sort]);
  }, [input.orders, product, urgentOnly, due, days, search, sort]);

  const demand = demandByProduct(input);
  const open = item != null && input.orders.some((order) => order.id === item);
  const toggle = (id: string) => setExpanded((current) => { const next = new Set(current); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  const filtered = product !== "all" || urgentOnly || due != null || search;

  return (
    <div className="grid gap-4">
      <div className="flex gap-2 overflow-x-auto pb-1" role="group" aria-label={t("Lọc theo sản phẩm", "Filter by product")}>
        <ProductChip active={product === "all"} onClick={() => setProduct("all")} label={t("Tất cả", "All")} count={input.orders.length} units={sum(input.orders.map((order) => order.quantity))} />
        {demand.map((row) => <ProductChip key={row.product} active={product === row.product} onClick={() => setProduct(product === row.product ? "all" : row.product)} label={productLabel(row.product)} dot={<ProductDot product={row.product} products={input.products} />} count={row.orders} units={row.quantity} />)}
      </div>

      <FilterBar className="mb-0 flex-wrap">
        <div className="relative flex-1 md:max-w-xs">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input type="search" aria-label={t("Tìm đơn hoặc lô", "Search orders or lots")} className="pl-8" value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t("Mã đơn, sản phẩm, lô…", "Order, product, lot…")} />
        </div>
        <ToggleGroup type="single" variant="outline" size="sm" value={urgentOnly ? "urgent" : "all"} onValueChange={(value) => value && setUrgentOnly(value === "urgent")} aria-label={t("Lọc đơn gấp", "Urgent filter")}>
          <ToggleGroupItem value="all">{t("Mọi đơn", "All orders")}</ToggleGroupItem>
          <ToggleGroupItem value="urgent">{t("Chỉ đơn gấp", "Urgent only")} ({input.orders.filter((order) => order.urgent).length})</ToggleGroupItem>
        </ToggleGroup>
        {due != null && <Badge variant="info" className="h-8 gap-1.5 px-2.5 text-sm">{t("Hạn", "Due")}: {formatDay(dataset.origin, due * 1440)}<button type="button" aria-label={t("Bỏ lọc ngày", "Clear day filter")} className="rounded hover:bg-primary/10" onClick={onClearDue}><X className="size-3.5" /></button></Badge>}
        <Select value={sort} onValueChange={(value) => setSort(value as Sort)}>
          <SelectTrigger size="sm" className="w-44" aria-label={t("Sắp xếp", "Sort")}><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="due">{t("Hạn giao sớm nhất", "Earliest due")}</SelectItem>
            <SelectItem value="priority">{t("Ưu tiên cao nhất", "Highest priority")}</SelectItem>
            <SelectItem value="quantity">{t("Số lượng lớn nhất", "Largest quantity")}</SelectItem>
            <SelectItem value="id">{t("Mã đơn", "Order code")}</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-sm text-muted-foreground md:ml-auto">{rows.length}/{input.orders.length} {t("đơn", "orders")} · {formatNumber(sum(rows.map((order) => order.quantity)))} {t("đơn vị", "units")}</span>
      </FilterBar>

      <Panel flush>
        {rows.length === 0 ? (
          <EmptyState className="m-4 border-0" icon={<ClipboardList />} title={t("Không có đơn phù hợp", "No matching orders")} action={filtered ? <Button variant="outline" onClick={() => { setSearch(""); setProduct("all"); setUrgentOnly(false); onClearDue(); }}>{t("Xóa bộ lọc", "Clear filters")}</Button> : undefined} />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8 pl-3"><span className="sr-only">{t("Mở rộng", "Expand")}</span></TableHead>
                <TableHead>{t("Đơn", "Order")}</TableHead>
                <TableHead>{t("Sản phẩm", "Product")}</TableHead>
                <TableHead className={N}>{t("Số lượng", "Quantity")}</TableHead>
                <TableHead className="min-w-48">{t("Cửa sổ phát hành → hạn", "Release → due window")}</TableHead>
                <TableHead>{t("Hạn giao", "Due")}</TableHead>
                <TableHead className={N}>{t("Ưu tiên", "Priority")}</TableHead>
                <TableHead className="w-10"><span className="sr-only">{t("Sửa", "Edit")}</span></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((order) => {
                const isOpen = expanded.has(order.id);
                const lots = Object.keys(order.lot_allocations).length;
                return (
                  <Fragment key={order.id}>
                    <TableRow className={cn(isOpen && "border-b-0 bg-surface-2")}>
                      <TableCell className="pl-3">
                        <Button variant="ghost" size="icon-xs" aria-expanded={isOpen} aria-controls={`lots-${order.id}`} aria-label={t(`Lô của ${order.id}`, `Lots of ${order.id}`)} onClick={() => toggle(order.id)}>{isOpen ? <ChevronDown /> : <ChevronRight />}</Button>
                      </TableCell>
                      <TableCell><button type="button" className="font-semibold hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none" onClick={() => onOpen(order.id)}>{order.id}</button>{order.urgent && <Badge variant="brand" className="ml-1.5">{t("gấp", "urgent")}</Badge>}</TableCell>
                      <TableCell><span className="inline-flex items-center gap-1.5"><ProductDot product={order.product} products={input.products} />{productLabel(order.product)}</span></TableCell>
                      <TableCell className={N}><b>{formatNumber(order.quantity)}</b><span className="block text-xs text-muted-foreground">{order.initial_allocated ? `${order.initial_allocated} ${t("kho", "stock")} · ` : ""}{lots} {t("lô", "lots")}</span></TableCell>
                      <TableCell><WindowBar release={order.release} due={order.due} deadline={order.deadline} horizon={input.horizon} urgent={order.urgent} /></TableCell>
                      <TableCell className="text-sm whitespace-nowrap">{formatClock(dataset.origin, order.due)}</TableCell>
                      <TableCell className={N}>{order.priority}</TableCell>
                      <TableCell className="pr-3"><Button variant="ghost" size="icon-sm" aria-label={t(`Sửa đơn ${order.id}`, `Edit order ${order.id}`)} onClick={() => onOpen(order.id)}><Pencil /></Button></TableCell>
                    </TableRow>
                    {isOpen && (
                      <TableRow id={`lots-${order.id}`} className="bg-surface-2 hover:bg-surface-2">
                        <TableCell />
                        <TableCell colSpan={7} className="pb-3"><LotTable orderId={order.id} initialAllocated={order.initial_allocated} quantity={order.quantity} /></TableCell>
                      </TableRow>
                    )}
                  </Fragment>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Panel>
      <p className="text-xs text-muted-foreground">{t("Số lượng, lô và phân bổ lô chỉ xem ở đây (API chưa hỗ trợ sửa riêng); muốn đổi hãy cập nhật từ JSON.", "Quantities, lots and lot allocations are read-only here (the API has no endpoint to edit them); update from JSON to change them.")}</p>
      {open && <OrderSheet key={item} orderId={item} onClose={onClose} />}
    </div>
  );
}

function ProductChip({ active, onClick, label, dot, count, units }: { active: boolean; onClick: () => void; label: string; dot?: React.ReactNode; count: number; units: number }) {
  const { t } = useI18n();
  return (
    <button type="button" aria-pressed={active} onClick={onClick} className={cn("flex shrink-0 flex-col rounded-lg border bg-card px-3 py-2 text-left transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none", active ? "border-primary ring-1 ring-primary" : "hover:border-primary/50")}>
      <span className="inline-flex items-center gap-1.5 text-sm font-medium">{dot}{label}</span>
      <span className="text-xs text-muted-foreground tabular-nums">{count} {t("đơn", "orders")} · {formatNumber(units)} {t("đv", "u")}</span>
    </button>
  );
}

/** Release→due bar positioned on the horizon (Gantt-lite), deadline as a tick. */
function WindowBar({ release, due, deadline, horizon, urgent }: { release: number; due: number; deadline?: number; horizon: number; urgent: boolean }) {
  const { t } = useI18n();
  const pct = (minute: number) => `${Math.max(0, Math.min(100, (minute / horizon) * 100))}%`;
  return (
    <span className="relative block h-3 min-w-40 rounded-full bg-grid" role="img" aria-label={t(`Cửa sổ ${formatDuration(due - release)}`, `Window ${formatDuration(due - release)}`)} title={formatDuration(due - release)}>
      <i className={cn("absolute inset-y-0.5 rounded-full", urgent ? "bg-brand/80" : "bg-primary/70")} style={{ left: pct(release), width: `calc(${pct(due)} - ${pct(release)})`, minWidth: 3 }} />
      {deadline != null && <i className="absolute -inset-y-0.5 w-0.5 bg-destructive" style={{ left: pct(deadline) }} />}
    </span>
  );
}

function LotTable({ orderId, initialAllocated, quantity }: { orderId: string; initialAllocated: number; quantity: number }) {
  const { t } = useI18n();
  const { dataset } = useDataset();
  const lots = lotsOfOrder(dataset.input, orderId);
  const covered = initialAllocated + sum(lots.map((lot) => lot.allocated));
  return (
    <div className="rounded-md border bg-card">
      <Table>
        <TableHeader><TableRow><TableHead className="pl-3">{t("Lô", "Lot")}</TableHead><TableHead className={N}>{t("Cỡ lô", "Lot size")}</TableHead><TableHead className={N}>{t("Phân bổ cho đơn", "Allocated to order")}</TableHead><TableHead className={N}>{t("Dư", "Surplus")}</TableHead><TableHead>{t("Phát hành", "Release")}</TableHead><TableHead>{t("Dùng chung với", "Shared with")}</TableHead></TableRow></TableHeader>
        <TableBody>
          {initialAllocated > 0 && <TableRow><TableCell className="pl-3 text-muted-foreground">{t("Tồn kho thành phẩm", "Finished stock")}</TableCell><TableCell className={N}>—</TableCell><TableCell className={N}>{initialAllocated}</TableCell><TableCell className={N}>—</TableCell><TableCell>—</TableCell><TableCell>—</TableCell></TableRow>}
          {lots.map((lot) => {
            const surplus = lot.quantity - sum(dataset.input.orders.map((order) => order.lot_allocations[lot.lotId] ?? 0));
            return <TableRow key={lot.lotId}><TableCell className="pl-3 font-mono text-xs">{lot.lotId}</TableCell><TableCell className={N}>{lot.quantity}</TableCell><TableCell className={N}>{lot.allocated}</TableCell><TableCell className={cn(N, surplus < 0 && "text-destructive")}>{surplus || "—"}</TableCell><TableCell className="text-xs">{formatClock(dataset.origin, lot.release)}</TableCell><TableCell className="text-xs">{lot.sharedWith.join(", ") || "—"}</TableCell></TableRow>;
          })}
        </TableBody>
      </Table>
      <p className={cn("border-t px-3 py-1.5 text-xs", covered < quantity ? "text-destructive" : "text-muted-foreground")}>{t(`Đã phủ ${covered}/${quantity} đơn vị`, `Covered ${covered}/${quantity} units`)}</p>
    </div>
  );
}

function OrderSheet({ orderId, onClose }: { orderId: string; onClose: () => void }) {
  const { t } = useI18n();
  const showToast = useToast();
  const { dataset, onUpdated } = useDataset();
  const order = dataset.input.orders.find((item) => item.id === orderId)!;
  const [release, setRelease] = useState(order.release);
  const [due, setDue] = useState(order.due);
  const [priority, setPriority] = useState<number | "">(order.priority);
  const [urgent, setUrgent] = useState(order.urgent);
  const [deadline, setDeadline] = useState<number | null>(order.deadline ?? null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const dirty = release !== order.release || due !== order.due || priority !== order.priority || urgent !== order.urgent || deadline !== (order.deadline ?? null);
  const timingError = release > due ? t("Phát hành không được sau hạn giao", "Release cannot be after the due date") : due > dataset.horizon ? t("Hạn giao vượt quá horizon", "Due date is beyond the horizon") : "";
  const deadlineError = deadline != null && deadline < due ? t("Hạn chót phải sau hạn giao", "The hard deadline must be after the due date") : "";
  const priorityError = priority === "" || priority < 1 || !Number.isInteger(priority) ? t("Số nguyên ≥ 1", "Whole number ≥ 1") : "";
  const min = minuteToDateTimeInput(dataset.origin, 0);
  const max = minuteToDateTimeInput(dataset.origin, dataset.horizon);

  const save = useMutation({
    mutationFn: () => updateMasterOrder(dataset.id, orderId, { expected_revision: dataset.revision, release, due, priority, urgent, deadline }),
    onSuccess: (updated) => { onUpdated(updated); showToast(t(`Đã lưu đơn ${orderId} (revision ${updated.revision}).`, `Saved order ${orderId} (revision ${updated.revision}).`)); },
  });
  const remove = useMutation({
    mutationFn: () => deleteMasterOrder(dataset.id, orderId, dataset.revision),
    onSuccess: (updated) => { setConfirmDelete(false); showToast(t(`Đã xóa đơn ${orderId}.`, `Deleted order ${orderId}.`)); onClose(); onUpdated(updated); },
    onError: () => setConfirmDelete(false),
  });
  const busy = save.isPending || remove.isPending;

  return (
    <RecordSheet open onClose={onClose} dirty={dirty && !busy}
      title={<span className="flex flex-wrap items-center gap-2">{t("Đơn", "Order")} {orderId}{order.urgent && <Badge variant="brand">{t("gấp", "urgent")}</Badge>}</span>}
      description={<span className="inline-flex items-center gap-1.5"><ProductDot product={order.product} products={dataset.input.products} />{productLabel(order.product)} · {formatNumber(order.quantity)} {t("đơn vị", "units")} · {t("revision", "revision")} {dataset.revision}</span>}
      footer={<>
        <DirtyHint dirty={dirty} />
        <Button variant="ghost" className="text-destructive hover:bg-danger-soft hover:text-destructive" disabled={busy} onClick={() => setConfirmDelete(true)}><Trash2 />{t("Xóa đơn", "Delete order")}</Button>
        <SheetClose asChild><Button variant="outline" disabled={busy}>{t("Đóng", "Close")}</Button></SheetClose>
        <Button disabled={!dirty || Boolean(timingError || deadlineError || priorityError) || busy} onClick={() => save.mutate()}>{save.isPending ? t("Đang lưu…", "Saving…") : t("Lưu thay đổi", "Save changes")}</Button>
      </>}>
      <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-4">
        <MutationNotice error={save.error ?? remove.error} fallback={t("Thay đổi bị từ chối.", "The change was rejected.")} />
        <SheetSection title={t("Thời gian & ưu tiên", "Timing & priority")} aside={<span className="text-xs text-muted-foreground">{t("Giờ nhà máy (GMT+7)", "Factory time (GMT+7)")}</span>}>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label={t("Phát hành", "Release")}><Input type="datetime-local" required min={min} max={max} aria-invalid={Boolean(timingError)} value={minuteToDateTimeInput(dataset.origin, release)} onChange={(event) => { if (event.target.value) setRelease(dateTimeInputToMinute(dataset.origin, event.target.value)); }} /></Field>
            <Field label={t("Hạn giao", "Due")}><Input type="datetime-local" required min={min} max={max} aria-invalid={Boolean(timingError)} value={minuteToDateTimeInput(dataset.origin, due)} onChange={(event) => { if (event.target.value) setDue(dateTimeInputToMinute(dataset.origin, event.target.value)); }} /></Field>
            <div className="sm:col-span-2"><FieldError>{timingError}</FieldError></div>
            <Field label={t("Hạn chót cứng (tùy chọn)", "Hard deadline (optional)")} hint={t("Để trống nếu không có", "Leave empty if none")}>
              <span className="flex gap-1.5"><Input type="datetime-local" min={min} aria-invalid={Boolean(deadlineError)} value={deadline == null ? "" : minuteToDateTimeInput(dataset.origin, deadline)} onChange={(event) => setDeadline(event.target.value ? dateTimeInputToMinute(dataset.origin, event.target.value) : null)} />{deadline != null && <Button variant="ghost" size="icon" aria-label={t("Bỏ hạn chót", "Clear deadline")} onClick={() => setDeadline(null)}><X /></Button>}</span>
              <FieldError>{deadlineError}</FieldError>
            </Field>
            <Field label={t("Ưu tiên", "Priority")} hint={t("Số lớn = quan trọng hơn (trọng số trễ hạn)", "Higher = more important (tardiness weight)")}><Input type="number" min={1} step={1} value={priority} aria-invalid={Boolean(priorityError)} onChange={(event) => setPriority(event.target.value === "" ? "" : Number(event.target.value))} /><FieldError>{priorityError}</FieldError></Field>
            <label className="flex items-center gap-2 text-sm sm:col-span-2"><Checkbox checked={urgent} onCheckedChange={(value) => setUrgent(value === true)} />{t("Đơn gấp (ưu tiên xếp trước)", "Urgent order (scheduled first)")}</label>
          </div>
          <div className="mt-3"><WindowBar release={release} due={due} deadline={deadline ?? undefined} horizon={dataset.input.horizon} urgent={urgent} /></div>
        </SheetSection>
        <SheetSection title={t("Lô & phân bổ", "Lots & allocation")}>
          <LotTable orderId={orderId} initialAllocated={order.initial_allocated} quantity={order.quantity} />
        </SheetSection>
      </div>
      <ConfirmDialog open={confirmDelete} title={t(`Xóa đơn ${orderId}?`, `Delete order ${orderId}?`)} description={t("Toàn bộ lô trực thuộc cũng bị xóa. Lần chạy và snapshot cũ vẫn được giữ.", "All of its lots are deleted too. Existing runs and snapshots are kept.")} confirmLabel={t("Xóa đơn", "Delete order")} pending={remove.isPending} onCancel={() => setConfirmDelete(false)} onConfirm={() => remove.mutate()} />
    </RecordSheet>
  );
}
