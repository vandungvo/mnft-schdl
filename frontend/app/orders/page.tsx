"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ClipboardList, Download, Factory, Plus, Search, Upload } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useDeferredValue, useEffect, useState } from "react";

import { EmptyState, Field, PageHeader, SectionHeading } from "@/components/blocks";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { DataTable, FilterChip, matches, TableToolbar, type Column } from "@/components/data-table";
import { useI18n } from "@/components/i18n-provider";
import { MutationNotice, ProductDot, RecordSheet } from "@/components/master-data/shared";
import { downloadOrderTemplate, ImportOrdersDialog } from "@/components/orders/import-dialog";
import { OutlookPanel } from "@/components/orders/outlook-panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ErrorState, SkeletonTable } from "@/components/ui-states";
import { createBookOrder, deleteBookOrder, getFactory, getOutlook, listBookOrders, updateBookOrder } from "@/lib/api";
import { fmtLocal, nowLocal, pickupLabel, priorityLabel, priorityTone, productName, todayIso, useCurrentFactory } from "@/lib/factory";
import type { BookOrder, BookOrderInput, FactoryConfig, OrderStatus } from "@/lib/factory-types";
import { cn } from "@/lib/utils";

const STATUS: Record<OrderStatus, { label: [string, string]; variant: "info" | "success" | "secondary" }> = {
  open: { label: ["Đang mở", "Open"], variant: "info" },
  delivered: { label: ["Đã giao", "Delivered"], variant: "success" },
  cancelled: { label: ["Đã huỷ", "Cancelled"], variant: "secondary" },
};

/* Orders are entered once, here, whatever period they end up in. A period takes the open ones due
   in its window; delivering (closing a period) or cancelling takes them out of the book. */
function Orders() {
  const { t } = useI18n();
  const router = useRouter();
  const params = useSearchParams();
  const { factory, isLoading: factoryLoading } = useCurrentFactory();
  const factoryId = factory?.id;
  const detail = useQuery({ queryKey: ["factory", factoryId], queryFn: () => getFactory(factoryId!), enabled: Boolean(factoryId) });
  const config = detail.data?.config;
  const orders = useQuery({ queryKey: ["book-orders", factoryId], queryFn: () => listBookOrders(factoryId!), enabled: Boolean(factoryId) });
  const outlook = useQuery({ queryKey: ["outlook", factoryId], queryFn: () => getOutlook(factoryId!, todayIso(), 8), enabled: Boolean(factoryId) });
  const [status, setStatus] = useState<string | null>("open");
  const [search, setSearch] = useState("");
  const deferred = useDeferredValue(search);
  // "+ New → Import orders / Add one order" land here with ?import=1 / ?new=1.
  const [importOpen, setImportOpen] = useState(() => params.get("import") === "1");
  const [editing, setEditing] = useState<BookOrder | "new" | null>(() => (params.get("new") === "1" ? "new" : null));
  const deepLink = params.get("import") ?? params.get("new");
  useEffect(() => { if (deepLink) router.replace("/orders"); }, [deepLink, router]);

  const all = orders.data?.items ?? [];
  const now = nowLocal();
  const rows = all.filter((o) => (!status || o.status === status) && matches(deferred, o.code, o.product, o.customer));
  const products = Object.keys(config?.products ?? {});

  const columns: Column<BookOrder>[] = [
    { id: "code", header: t("Mã đơn", "Order"), sortValue: (o) => o.code, cell: (o) => <button type="button" className="font-medium hover:underline" onClick={(event) => { event.stopPropagation(); setEditing(o); }}>{o.code}</button> },
    { id: "product", header: t("Sản phẩm", "Product"), sortValue: (o) => o.product, cell: (o) => <span className="inline-flex items-center gap-1.5"><ProductDot product={o.product} products={products} />{productName(config, o.product)}</span> },
    { id: "qty", header: t("Số lượng", "Qty"), align: "right", sortValue: (o) => o.quantity, cell: (o) => o.quantity },
    { id: "due", header: t("Hạn giao", "Due"), sortValue: (o) => o.due, cell: (o) => <span className={cn("whitespace-nowrap", o.status === "open" && o.due < now && "font-medium text-destructive")}>{fmtLocal(o.due, { weekday: true })}{o.status === "open" && o.due < now && <span className="block text-xs">{t("quá hạn", "overdue")}</span>}</span> },
    { id: "priority", header: t("Ưu tiên", "Priority"), sortValue: (o) => -o.priority, cell: (o) => <Badge variant={priorityTone(o.priority)}>{priorityLabel(o.priority)}</Badge> },
    { id: "customer", header: t("Khách hàng", "Customer"), sortValue: (o) => o.customer ?? "", cell: (o) => <span className="text-muted-foreground">{o.customer ?? "—"}</span> },
    { id: "status", header: t("Trạng thái", "Status"), sortValue: (o) => o.status, cell: (o) => <><Badge variant={STATUS[o.status].variant}>{t(...STATUS[o.status].label)}</Badge>{o.delivered_at && <span className="block text-xs text-muted-foreground">{fmtLocal(o.delivered_at)}</span>}</> },
  ];

  if (!factoryLoading && !factory) {
    return <><PageHeader title={t("Sổ đơn hàng", "Order book")} /><EmptyState icon={<Factory />} title={t("Chưa có nhà máy", "No factory yet")} action={<Button asChild><Link href="/factory">{t("Thiết lập nhà máy", "Set up the factory")}</Link></Button>} /></>;
  }
  return (
    <>
      <PageHeader title={t("Sổ đơn hàng", "Order book")}
        description={t("Nhập đơn một lần ở đây. Mỗi kỳ lập lịch tự lấy đơn còn mở có hạn trong kỳ; đơn được đánh dấu đã giao khi đóng kỳ.", "Enter orders once, here. Each planning period takes the open orders due in it; orders are marked delivered when the period closes.")}
        actions={<>
          <Button variant="outline" onClick={() => downloadOrderTemplate(config)}><Download />{t("File mẫu", "Template")}</Button>
          <Button variant="outline" onClick={() => setImportOpen(true)}><Upload />{t("Nhập từ Excel", "Import from Excel")}</Button>
          <Button onClick={() => setEditing("new")}><Plus />{t("Thêm đơn", "Add order")}</Button>
        </>} />

      {outlook.data && <OutlookPanel outlook={outlook.data} config={config} />}

      <SectionHeading title={t("Đơn hàng", "Orders")} />
      {orders.isError && <ErrorState compact message={t("Không tải được sổ đơn.", "Could not load the order book.")} onRetry={() => void orders.refetch()} />}
      {(orders.isLoading || factoryLoading) && <SkeletonTable rows={5} />}
      {orders.data && <>
        <TableToolbar search={search} onSearch={setSearch} placeholder={t("Mã đơn, sản phẩm, khách hàng…", "Order, product, customer…")} count={rows.length} onClear={search || status !== "open" ? () => { setSearch(""); setStatus("open"); } : undefined}>
          <FilterChip label={t("Trạng thái", "Status")} value={status} onChange={setStatus}
            options={(Object.keys(STATUS) as OrderStatus[]).map((key) => ({ value: key, label: t(...STATUS[key].label), count: all.filter((o) => o.status === key).length }))} />
        </TableToolbar>
        <DataTable rows={rows} columns={columns} rowKey={(o) => o.code} initialSort={{ id: "due", desc: false }} pageSize={50} label={t("Sổ đơn hàng", "Order book")}
          empty={all.length ? <EmptyState icon={<Search />} title={t("Không có đơn phù hợp", "No matching orders")} /> : <EmptyState icon={<ClipboardList />} title={t("Sổ đơn còn trống", "The order book is empty")} description={t("Nhập từ Excel hoặc thêm từng đơn.", "Import from Excel or add orders one by one.")} action={<Button onClick={() => setImportOpen(true)}><Upload />{t("Nhập từ Excel", "Import from Excel")}</Button>} />} />
      </>}

      {factory && <ImportOrdersDialog open={importOpen} onClose={() => setImportOpen(false)} factoryId={factory.id} config={config} />}
      {factory && config && editing && <OrderSheet key={editing === "new" ? "new" : editing.code} factoryId={factory.id} config={config} order={editing === "new" ? null : editing} existing={all.map((o) => o.code)} onClose={() => setEditing(null)} />}
    </>
  );
}

function OrderSheet({ factoryId, config, order, existing, onClose }: { factoryId: string; config: FactoryConfig; order: BookOrder | null; existing: string[]; onClose: () => void }) {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const initial: BookOrderInput & { code: string } = order
    ? { code: order.code, product: order.product, quantity: order.quantity, due: order.due, priority: order.priority, pickup: order.pickup, customer: order.customer, note: order.note, status: order.status }
    : { code: "", product: Object.keys(config.products)[0], quantity: 0, due: `${todayIso()}T${config.default_due_time}`, priority: 2, pickup: "at_due", customer: null, note: null, status: "open" };
  const [value, setValue] = useState(initial);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const set = (patch: Partial<typeof value>) => setValue((current) => ({ ...current, ...patch }));
  const dirty = JSON.stringify(value) !== JSON.stringify(initial);
  const taken = !order && existing.includes(value.code.trim());
  const valid = value.code.trim() !== "" && !taken && value.quantity > 0 && value.due !== "";
  const done = async () => { await queryClient.invalidateQueries({ queryKey: ["book-orders"] }); void queryClient.invalidateQueries({ queryKey: ["outlook"] }); void queryClient.invalidateQueries({ queryKey: ["period"] }); onClose(); };
  const save = useMutation({
    mutationFn: () => {
      const { code, ...rest } = value;
      return order ? updateBookOrder(factoryId, order.code, rest) : createBookOrder(factoryId, { ...rest, code: code.trim(), status: undefined });
    },
    onSuccess: done,
  });
  const remove = useMutation({ mutationFn: () => deleteBookOrder(factoryId, order!.code), onSuccess: done });
  return (
    <RecordSheet open onClose={onClose} dirty={dirty} title={order ? t(`Đơn ${order.code}`, `Order ${order.code}`) : t("Thêm đơn hàng", "Add an order")}
      description={order?.delivered_at ? t(`Đã giao ${fmtLocal(order.delivered_at)}.`, `Delivered ${fmtLocal(order.delivered_at)}.`) : t("Kỳ đang mở thấy thay đổi và hỏi bạn có cập nhật vào kỳ không.", "Open periods see the change and offer to take it in.")}
      footer={<>
        {order && order.status !== "delivered" && <Button variant="ghost" className="mr-auto text-destructive" onClick={() => setConfirmDelete(true)}>{t("Xóa", "Delete")}</Button>}
        <Button variant="outline" onClick={onClose}>{t("Hủy", "Cancel")}</Button>
        <Button disabled={!valid || !dirty || save.isPending} onClick={() => save.mutate()}>{t("Lưu", "Save")}</Button>
      </>}>
      <div className="grid gap-4">
        <Field label={t("Mã đơn", "Order code")} hint={taken ? t("Mã đã tồn tại.", "This code exists.") : undefined}><Input value={value.code} disabled={Boolean(order)} onChange={(event) => set({ code: event.target.value })} /></Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t("Sản phẩm", "Product")}>
            <Select value={value.product} onValueChange={(product) => set({ product })}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>{Object.keys(config.products).map((code) => <SelectItem key={code} value={code}>{productName(config, code)} ({code})</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label={t("Số lượng", "Quantity")}><Input type="number" min={1} value={value.quantity || ""} onChange={(event) => set({ quantity: Number(event.target.value) })} /></Field>
          <Field label={t("Hạn giao", "Due")}><Input type="datetime-local" value={value.due} onChange={(event) => set({ due: event.target.value })} /></Field>
          <Field label={t("Ưu tiên", "Priority")}>
            <Select value={String(value.priority)} onValueChange={(priority) => set({ priority: Number(priority) })}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>{[1, 2, 3, 4].map((n) => <SelectItem key={n} value={String(n)}>{priorityLabel(n)}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label={t("Cách giao", "Pickup")}>
            <Select value={value.pickup} onValueChange={(pickup) => set({ pickup: pickup as BookOrderInput["pickup"] })}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="at_due">{pickupLabel("at_due")}</SelectItem><SelectItem value="when_ready">{pickupLabel("when_ready")}</SelectItem></SelectContent>
            </Select>
          </Field>
          {order && <Field label={t("Trạng thái", "Status")}>
            <Select value={value.status} onValueChange={(status) => set({ status: status as OrderStatus })}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>{(Object.keys(STATUS) as OrderStatus[]).map((key) => <SelectItem key={key} value={key}>{t(...STATUS[key].label)}</SelectItem>)}</SelectContent>
            </Select>
          </Field>}
        </div>
        <Field label={t("Khách hàng", "Customer")}><Input value={value.customer ?? ""} onChange={(event) => set({ customer: event.target.value || null })} /></Field>
        <Field label={t("Ghi chú", "Note")}><Textarea rows={2} value={value.note ?? ""} onChange={(event) => set({ note: event.target.value || null })} /></Field>
        <MutationNotice error={save.error ?? remove.error} fallback={t("Không lưu được.", "Could not save.")} />
      </div>
      <ConfirmDialog open={confirmDelete} title={t("Xóa đơn này?", "Delete this order?")} description={t("Đơn sẽ biến mất khỏi sổ; kỳ đang dùng đơn sẽ được nhắc cập nhật. Muốn giữ lịch sử, hãy đổi trạng thái sang Đã huỷ.", "The order leaves the book; periods using it will be prompted to update. To keep a record, set it to Cancelled instead.")}
        confirmLabel={t("Xóa", "Delete")} pending={remove.isPending} onCancel={() => setConfirmDelete(false)} onConfirm={() => { setConfirmDelete(false); remove.mutate(); }} />
    </RecordSheet>
  );
}

export default function OrdersPage() {
  return <Suspense fallback={<SkeletonTable rows={5} />}><Orders /></Suspense>;
}
