"use client";

import { useMutation } from "@tanstack/react-query";
import { ArrowRight, ChevronRight, Package, Plus, Search, Trash2 } from "lucide-react";
import { useState } from "react";

import { EmptyState, Field, FilterBar, Meter, Panel } from "@/components/blocks";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { useI18n } from "@/components/i18n-provider";
import { useToast } from "@/components/toast-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SheetClose } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { createMasterProduct, deleteMasterProduct, setBtpRouting, updateMasterProduct } from "@/lib/api";
import { formatNumber, productLabel, stageLabel } from "@/lib/format";
import { BTP_STAGES, capableMachines, CODE_PATTERN, demandByProduct, stageItem } from "@/lib/master-data";

import { DirtyHint, FieldError, MutationNotice, numberOrEmpty, ProductDot, RecordSheet, SheetSection, useDataset, useMdLocation } from "./shared";

const N = "text-right tabular-nums";

export function ProductsSection({ item, onOpen, onClose }: { item: string | null; onOpen: (id: string) => void; onClose: () => void }) {
  const { t } = useI18n();
  const { dataset } = useDataset();
  const input = dataset.input;
  const [filter, setFilter] = useState("");
  const demand = Object.fromEntries(demandByProduct(input).map((row) => [row.product, row]));
  const rows = input.products.filter((product) => `${product} ${productLabel(product)} ${input.product_color[product]} ${input.product_line[product]}`.toLowerCase().includes(filter.toLowerCase()));
  const open = item === "@new" || (item != null && input.products.includes(item));
  return (
    <div className="grid gap-4">
      <FilterBar className="mb-0">
        <div className="relative flex-1 md:max-w-sm">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input type="search" aria-label={t("Tìm sản phẩm", "Search products")} className="pl-8" value={filter} onChange={(event) => setFilter(event.target.value)} placeholder={t("Mã, màu hoặc dòng…", "Code, colour or line…")} />
        </div>
        <span className="text-sm text-muted-foreground md:mr-auto">{rows.length}/{input.products.length} {t("sản phẩm", "products")}</span>
        <Button onClick={() => onOpen("@new")}><Plus />{t("Thêm sản phẩm", "Add product")}</Button>
      </FilterBar>
      <Panel flush>
        {rows.length === 0 ? <EmptyState className="m-4 border-0" icon={<Package />} title={t("Không có sản phẩm phù hợp", "No matching products")} /> : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-4">{t("Sản phẩm", "Product")}</TableHead>
                <TableHead>{t("Dòng · màu", "Line · colour")}</TableHead>
                <TableHead className="min-w-44">{t("Tồn đầu / an toàn", "Opening / safety")}</TableHead>
                <TableHead className={N}>{t("Nhu cầu", "Demand")}</TableHead>
                <TableHead>{t("Đường đi BTP", "Semi-finished route")}</TableHead>
                <TableHead className="w-8"><span className="sr-only">{t("Mở", "Open")}</span></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((product) => {
                const opening = input.initial_inventory[product] ?? 0;
                const safety = input.safety_stock[product] ?? 0;
                const row = demand[product];
                return (
                  <TableRow key={product} className="cursor-pointer" onClick={() => onOpen(product)}>
                    <TableCell className="pl-4">
                      <button type="button" className="inline-flex items-center gap-2 text-left font-semibold hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none" onClick={(event) => { event.stopPropagation(); onOpen(product); }}>
                        <ProductDot product={product} products={input.products} />{product}
                      </button>
                      <span className="block pl-[18px] text-xs text-muted-foreground">{productLabel(product)}</span>
                    </TableCell>
                    <TableCell><Badge variant="outline">{input.product_line[product]}</Badge> <Badge variant="secondary">{input.product_color[product]}</Badge></TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="w-16 shrink-0 text-sm tabular-nums"><b>{opening}</b><span className="text-muted-foreground">/{safety}</span></span>
                        <Meter value={safety ? opening / safety : 1} tone={opening < safety ? "warn" : "ok"} label={`${opening}/${safety}`} />
                      </div>
                    </TableCell>
                    <TableCell className={N}><b>{formatNumber(row?.quantity ?? 0)}</b><span className="block text-xs text-muted-foreground">{row?.orders ?? 0} {t("đơn", "orders")}</span></TableCell>
                    <TableCell>
                      <span className="flex flex-wrap items-center gap-1 text-xs">
                        {BTP_STAGES.map((stage, index) => {
                          const code = input.btp_routing[product]?.[stage];
                          return <span key={stage} className="inline-flex items-center gap-1">{index > 0 && <ArrowRight className="size-3 text-muted-foreground" aria-hidden />}<span className={code ? "rounded bg-muted px-1.5 py-0.5 font-mono" : "rounded bg-danger-soft px-1.5 py-0.5 text-destructive"} title={stageLabel(stage)}>{code ?? t("thiếu", "missing")}</span></span>;
                        })}
                      </span>
                    </TableCell>
                    <TableCell className="pr-4 text-muted-foreground"><ChevronRight className="size-4" aria-hidden /></TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Panel>
      {open && <ProductSheet key={item} product={item === "@new" ? null : item} onClose={onClose} onCreated={onOpen} />}
    </div>
  );
}

function ProductSheet({ product, onClose, onCreated }: { product: string | null; onClose: () => void; onCreated: (id: string) => void }) {
  const { t } = useI18n();
  const showToast = useToast();
  const { dataset, onUpdated } = useDataset();
  const input = dataset.input;
  const isNew = product === null;
  const key = product ?? "";
  const initial = {
    code: "",
    color: isNew ? "" : input.product_color[key] ?? "",
    line: isNew ? "" : input.product_line[key] ?? "",
    opening: (isNew ? 0 : input.initial_inventory[key] ?? 0) as number | "",
    safety: (isNew ? 0 : input.safety_stock[key] ?? 0) as number | "",
    routing: Object.fromEntries(BTP_STAGES.map((stage) => [stage, isNew ? "" : input.btp_routing[key]?.[stage] ?? ""])) as Record<string, string>,
  };
  const [form, setForm] = useState(initial);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const code = form.code.trim().toUpperCase();
  const codeError = isNew && form.code && !CODE_PATTERN.test(code) ? t("Chỉ dùng chữ in hoa, số, _ hoặc -", "Use capital letters, digits, _ or - only") : isNew && input.products.includes(code) ? t("Mã đã tồn tại", "Code already exists") : "";
  const numError = (value: number | "") => (value === "" ? t("Bắt buộc", "Required") : value < 0 || !Number.isInteger(value) ? t("Số nguyên ≥ 0", "Whole number ≥ 0") : "");
  const routingChanged = BTP_STAGES.filter((stage) => form.routing[stage] && form.routing[stage] !== initial.routing[stage]);
  const fieldsChanged = form.color !== initial.color || form.line !== initial.line || form.opening !== initial.opening || form.safety !== initial.safety;
  const dirty = (isNew && Boolean(form.code)) || fieldsChanged || routingChanged.length > 0;
  const valid = !codeError && (!isNew || Boolean(code)) && form.color.trim() !== "" && form.line.trim() !== "" && !numError(form.opening) && !numError(form.safety);
  const lineOptions = [...new Set(Object.values(input.product_line))];
  const colorOptions = [...new Set(Object.values(input.product_color))];

  const save = useMutation({
    mutationFn: async () => {
      const values = { color: form.color.trim().toUpperCase(), line: form.line.trim().toUpperCase(), initial_inventory: Number(form.opening), safety_stock: Number(form.safety) };
      if (isNew) {
        const created = await createMasterProduct(dataset.id, { expected_revision: dataset.revision, code, ...values });
        onUpdated(created);
        return { created: code, steps: 1 };
      }
      let current = dataset;
      let steps = 0;
      if (fieldsChanged) { current = await updateMasterProduct(dataset.id, key, { expected_revision: current.revision, ...values }); onUpdated(current); steps++; }
      for (const stage of routingChanged) { current = await setBtpRouting(dataset.id, key, stage, { expected_revision: current.revision, btp_code: form.routing[stage] }); onUpdated(current); steps++; }
      return { created: null, steps };
    },
    onSuccess: ({ created, steps }) => {
      if (created) { showToast(t(`Đã thêm ${created} cùng 3 mã BTP tự tạo.`, `Added ${created} with 3 auto-created semi-finished codes.`)); onCreated(created); }
      else showToast(t(`Đã lưu ${product} (${steps} revision mới).`, `Saved ${product} (${steps} new revisions).`));
    },
  });
  const remove = useMutation({
    mutationFn: () => deleteMasterProduct(dataset.id, product!, dataset.revision),
    onSuccess: (updated) => { setConfirmDelete(false); showToast(t(`Đã xóa sản phẩm ${product}.`, `Deleted product ${product}.`)); onClose(); onUpdated(updated); },
    onError: () => setConfirmDelete(false),
  });
  const busy = save.isPending || remove.isPending;

  return (
    <RecordSheet open onClose={onClose} dirty={dirty && !busy}
      title={isNew ? t("Thêm sản phẩm", "Add product") : <span className="inline-flex items-center gap-2"><ProductDot product={key} products={input.products} />{product}</span>}
      description={isNew ? t("Hệ thống tự tạo 3 mã BTP (đúc, CNC, sơn) cho sản phẩm mới; có thể đổi ánh xạ sau.", "Three semi-finished codes (cast, CNC, paint) are created automatically; you can remap them later.") : `${productLabel(key)} · ${t("revision", "revision")} ${dataset.revision}`}
      footer={<>
        <DirtyHint dirty={dirty} />
        {!isNew && <Button variant="ghost" className="text-destructive hover:bg-danger-soft hover:text-destructive" disabled={busy} onClick={() => setConfirmDelete(true)}><Trash2 />{t("Xóa", "Delete")}</Button>}
        <SheetClose asChild><Button variant="outline" disabled={busy}>{t("Đóng", "Close")}</Button></SheetClose>
        <Button disabled={!dirty || !valid || busy} onClick={() => save.mutate()}>{save.isPending ? t("Đang lưu…", "Saving…") : isNew ? t("Thêm sản phẩm", "Add product") : t("Lưu thay đổi", "Save changes")}</Button>
      </>}>
      <form className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-4" onSubmit={(event) => { event.preventDefault(); if (dirty && valid && !busy) save.mutate(); }}>
        <MutationNotice error={save.error ?? remove.error} fallback={t("Thay đổi bị từ chối.", "The change was rejected.")} />
        <SheetSection title={t("Thông tin", "Details")}>
          <div className="grid gap-3 sm:grid-cols-2">
            {isNew && <Field label={t("Mã sản phẩm", "Product code")} className="sm:col-span-2"><Input autoFocus value={form.code} aria-invalid={Boolean(codeError)} onChange={(event) => setForm({ ...form, code: event.target.value.toUpperCase() })} placeholder="F_RED" /><FieldError>{codeError}</FieldError></Field>}
            <Field label={t("Dòng (trước/sau)", "Line (front/rear)")}><Input list="md-lines" value={form.line} aria-invalid={!form.line.trim()} onChange={(event) => setForm({ ...form, line: event.target.value.toUpperCase() })} placeholder="F" /><datalist id="md-lines">{lineOptions.map((value) => <option key={value} value={value} />)}</datalist></Field>
            <Field label={t("Màu", "Colour")}><Input list="md-colors" value={form.color} aria-invalid={!form.color.trim()} onChange={(event) => setForm({ ...form, color: event.target.value.toUpperCase() })} placeholder="SILVER" /><datalist id="md-colors">{colorOptions.map((value) => <option key={value} value={value} />)}</datalist></Field>
            <Field label={t("Tồn thành phẩm đầu kỳ", "Opening finished stock")} hint={t("Đơn vị", "Units")}><Input type="number" min={0} step={1} inputMode="numeric" value={form.opening} aria-invalid={Boolean(numError(form.opening))} onChange={(event) => setForm({ ...form, opening: numberOrEmpty(event.target.value) })} /><FieldError>{numError(form.opening)}</FieldError></Field>
            <Field label={t("Tồn an toàn", "Safety stock")} hint={t("Đo ở mốc cuối mỗi ngày", "Measured at end-of-day checkpoints")}><Input type="number" min={0} step={1} inputMode="numeric" value={form.safety} aria-invalid={Boolean(numError(form.safety))} onChange={(event) => setForm({ ...form, safety: numberOrEmpty(event.target.value) })} /><FieldError>{numError(form.safety)}</FieldError></Field>
          </div>
        </SheetSection>
        {!isNew && (
          <SheetSection title={t("Đường đi bán thành phẩm", "Semi-finished route")} aside={<span className="text-xs text-muted-foreground">{t("Mỗi ánh xạ đổi tạo 1 revision", "Each mapping change is one revision")}</span>}>
            <ol className="grid gap-2">
              {BTP_STAGES.map((stage) => {
                const value = form.routing[stage];
                const machines = value ? capableMachines(input, value).filter((id) => input.machines[id].stage === stage) : [];
                return (
                  <li key={stage} className="grid items-center gap-1.5 sm:grid-cols-[110px_minmax(0,1fr)]">
                    <span className="text-sm font-medium">{stageLabel(stage)}</span>
                    <div className="grid gap-1">
                      <Select value={value || undefined} onValueChange={(next) => setForm({ ...form, routing: { ...form.routing, [stage]: next } })}>
                        <SelectTrigger size="sm" className="w-full" aria-label={t(`Mã BTP ở ${stageLabel(stage)}`, `Semi-finished code at ${stageLabel(stage)}`)}><SelectValue placeholder={t("Chưa ánh xạ", "Not mapped")} /></SelectTrigger>
                        <SelectContent>{input.btp_codes.map((code) => <SelectItem key={code} value={code}>{code}</SelectItem>)}</SelectContent>
                      </Select>
                      <span className={machines.length ? "text-xs text-muted-foreground" : "text-xs text-destructive"}>{machines.length ? `${t("Máy xử lý được", "Processed by")}: ${machines.join(", ")}` : t("Chưa có máy nào xử lý mã này ở công đoạn này", "No machine processes this code at this stage")}</span>
                    </div>
                  </li>
                );
              })}
              <li className="grid items-center gap-1.5 sm:grid-cols-[110px_minmax(0,1fr)]">
                <span className="text-sm font-medium">{stageLabel("qc")}</span>
                <span className="text-xs text-muted-foreground">{t("Thành phẩm", "Finished product")} {product} · {t("Máy", "Machines")}: {capableMachines(input, stageItem(input, key, "qc") ?? key).join(", ") || "—"}</span>
              </li>
            </ol>
          </SheetSection>
        )}
        {!isNew && <ProductOrders product={key} />}
      </form>
      {!isNew && <ConfirmDialog open={confirmDelete} title={t(`Xóa sản phẩm ${product}?`, `Delete product ${product}?`)} description={t("Chỉ xóa được sản phẩm chưa có đơn, lô hoặc máy dùng tới. Lần chạy và snapshot cũ vẫn được giữ.", "Only products not used by any order, lot or machine can be deleted. Existing runs and snapshots are kept.")} confirmLabel={t("Xóa sản phẩm", "Delete product")} pending={remove.isPending} onCancel={() => setConfirmDelete(false)} onConfirm={() => remove.mutate()} />}
    </RecordSheet>
  );
}

function ProductOrders({ product }: { product: string }) {
  const { t } = useI18n();
  const { dataset } = useDataset();
  const { navigate } = useMdLocation();
  const orders = dataset.input.orders.filter((order) => order.product === product).sort((a, b) => a.due - b.due);
  return (
    <SheetSection title={t(`Đơn hàng (${orders.length})`, `Orders (${orders.length})`)}>
      {orders.length === 0 ? <p className="text-sm text-muted-foreground">{t("Chưa có đơn nào cho sản phẩm này.", "No orders for this product yet.")}</p> : (
        <ul className="flex flex-wrap gap-1.5">
          {orders.map((order) => <li key={order.id}><button type="button" onClick={() => navigate({ tab: "orders", item: order.id })} className="inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs hover:border-primary/60 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none">{order.id} <span className="text-muted-foreground tabular-nums">{order.quantity}</span>{order.urgent && <span className="size-1.5 rounded-full bg-brand" aria-label={t("gấp", "urgent")} />}</button></li>)}
        </ul>
      )}
    </SheetSection>
  );
}
