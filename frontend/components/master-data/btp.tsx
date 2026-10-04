"use client";

import { useMutation } from "@tanstack/react-query";
import { ChevronRight, Layers, Pencil, Plus, Search, Trash2 } from "lucide-react";
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
import { createBtpCode, deleteBtpCode, renameBtpCode, setBtpRouting, upsertBtpInventory } from "@/lib/api";
import { formatNumber, stageLabel } from "@/lib/format";
import { BTP_STAGES, btpUsage, capableMachines, CODE_PATTERN } from "@/lib/master-data";

import { DirtyHint, FieldError, MutationNotice, numberOrEmpty, ProductDot, RecordSheet, SheetSection, useDataset } from "./shared";

const N = "text-right tabular-nums";

export function BtpSection({ item, onOpen, onClose }: { item: string | null; onOpen: (id: string) => void; onClose: () => void }) {
  const { t } = useI18n();
  const { dataset } = useDataset();
  const input = dataset.input;
  const [filter, setFilter] = useState("");
  const usage = btpUsage(input);
  const codes = input.btp_codes.filter((code) => `${code} ${(usage[code] ?? []).map((use) => use.product).join(" ")}`.toLowerCase().includes(filter.toLowerCase()));
  const shared = input.btp_codes.filter((code) => new Set((usage[code] ?? []).map((use) => use.product)).size > 1).length;
  const unused = input.btp_codes.filter((code) => !(usage[code] ?? []).length).length;
  const open = item === "@new" || (item != null && input.btp_codes.includes(item));
  return (
    <div className="grid gap-4">
      <FilterBar className="mb-0">
        <div className="relative flex-1 md:max-w-sm">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input type="search" aria-label={t("Tìm mã BTP", "Search semi-finished codes")} className="pl-8" value={filter} onChange={(event) => setFilter(event.target.value)} placeholder={t("Mã BTP hoặc sản phẩm…", "Code or product…")} />
        </div>
        <span className="flex flex-wrap gap-1.5 text-sm text-muted-foreground md:mr-auto">
          {codes.length}/{input.btp_codes.length} {t("mã", "codes")}
          {shared > 0 && <Badge variant="info">{shared} {t("dùng chung", "shared")}</Badge>}
          {unused > 0 && <Badge variant="warning">{unused} {t("chưa dùng", "unused")}</Badge>}
        </span>
        <Button onClick={() => onOpen("@new")}><Plus />{t("Thêm mã BTP", "Add code")}</Button>
      </FilterBar>

      <Panel flush title={t("Danh mục mã bán thành phẩm", "Semi-finished code catalog")} description={t("Mã BTP là định danh riêng, không phải mã thành phẩm; một mã có thể dùng chung cho nhiều sản phẩm. Sức chứa trống = không giới hạn.", "A semi-finished code is its own identity, not a product code; one code can be shared by several products. Empty capacity = unlimited.")}>
        <div className="border-t">
          {codes.length === 0 ? <EmptyState className="m-4 border-0" icon={<Layers />} title={t("Không có mã phù hợp", "No matching codes")} /> : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-4">{t("Mã BTP", "Code")}</TableHead>
                  <TableHead>{t("Dùng bởi", "Used by")}</TableHead>
                  <TableHead>{t("Máy xử lý", "Processed by")}</TableHead>
                  <TableHead className={N}>{t("Tồn đầu", "Opening")}</TableHead>
                  <TableHead className="min-w-36">{t("Sức chứa", "Capacity")}</TableHead>
                  <TableHead className="w-8"><span className="sr-only">{t("Mở", "Open")}</span></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {codes.map((code) => {
                  const uses = usage[code] ?? [];
                  const qty = input.inventory_btp[code] ?? 0;
                  const cap = input.btp_capacity[code];
                  const machines = capableMachines(input, code);
                  return (
                    <TableRow key={code} className="cursor-pointer" onClick={() => onOpen(code)}>
                      <TableCell className="pl-4"><button type="button" className="font-mono text-[13px] font-semibold hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none" onClick={(event) => { event.stopPropagation(); onOpen(code); }}>{code}</button></TableCell>
                      <TableCell>
                        {uses.length === 0 ? <Badge variant="warning">{t("chưa dùng", "unused")}</Badge> : (
                          <span className="flex flex-wrap gap-1">{uses.map((use) => <span key={`${use.product}-${use.stage}`} className="inline-flex items-center gap-1 rounded bg-muted px-1.5 py-0.5 text-xs"><ProductDot product={use.product} products={input.products} className="size-2" />{use.product}<span className="text-muted-foreground">· {stageLabel(use.stage)}</span></span>)}</span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs">{machines.length ? machines.join(", ") : <span className="text-destructive">{t("không có", "none")}</span>}</TableCell>
                      <TableCell className={N}>{formatNumber(qty)}</TableCell>
                      <TableCell>
                        {cap == null ? <span className="text-xs text-muted-foreground">{t("Không giới hạn", "Unlimited")}</span> : (
                          <div className="flex items-center gap-2"><Meter value={qty / cap} tone={qty / cap > 0.9 ? "warn" : "default"} label={`${qty}/${cap}`} /><span className="text-xs whitespace-nowrap tabular-nums">{qty}/{cap}</span></div>
                        )}
                      </TableCell>
                      <TableCell className="pr-4 text-muted-foreground"><ChevronRight className="size-4" aria-hidden /></TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </div>
      </Panel>

      <RoutingMatrix />
      {open && <BtpSheet key={item} code={item === "@new" ? null : item} onClose={onClose} onCreated={onOpen} />}
    </div>
  );
}

/** Product × stage mapping board. Each change applies immediately as its own revision (same behaviour as before the redesign). */
function RoutingMatrix() {
  const { t } = useI18n();
  const { dataset } = useDataset();
  const input = dataset.input;
  const usage = btpUsage(input);
  return (
    <Panel flush title={t("Ánh xạ sản phẩm → mã BTP theo công đoạn", "Product → semi-finished code by stage")} description={t("Đổi ô nào là lưu ngay ô đó (1 revision mỗi lần). Mã có nhãn “chung” đang được nhiều sản phẩm dùng.", "Each cell saves on change (one revision per change). Codes marked “shared” are used by several products.")}>
      <div className="overflow-x-auto border-t">
        <Table>
          <TableHeader><TableRow><TableHead className="pl-4">{t("Sản phẩm", "Product")}</TableHead>{BTP_STAGES.map((stage) => <TableHead key={stage}>{stageLabel(stage)}</TableHead>)}</TableRow></TableHeader>
          <TableBody>
            {input.products.map((product) => (
              <TableRow key={product}>
                <TableCell className="pl-4 align-top font-semibold"><span className="inline-flex items-center gap-2"><ProductDot product={product} products={input.products} />{product}</span></TableCell>
                {BTP_STAGES.map((stage) => {
                  const code = input.btp_routing[product]?.[stage];
                  const isShared = code ? new Set((usage[code] ?? []).map((use) => use.product)).size > 1 : false;
                  return <TableCell key={stage} className="align-top"><RoutingCell product={product} stage={stage} shared={isShared} /></TableCell>;
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </Panel>
  );
}

function RoutingCell({ product, stage, shared }: { product: string; stage: string; shared: boolean }) {
  const { t } = useI18n();
  const showToast = useToast();
  const { dataset, onUpdated } = useDataset();
  const current = dataset.input.btp_routing[product]?.[stage] ?? "";
  const mutation = useMutation({
    mutationFn: (btpCode: string) => setBtpRouting(dataset.id, product, stage, { expected_revision: dataset.revision, btp_code: btpCode }),
    onSuccess: (updated) => { onUpdated(updated); showToast(t(`Đã đổi ánh xạ ${product} · ${stageLabel(stage)}.`, `Changed mapping ${product} · ${stageLabel(stage)}.`)); },
  });
  return (
    <div className="grid min-w-48 gap-1">
      <div className="flex items-center gap-1.5">
        <Select value={current || undefined} disabled={mutation.isPending} onValueChange={(value) => mutation.mutate(value)}>
          <SelectTrigger size="sm" className="w-full" aria-label={t(`Mã BTP cho ${product} ở ${stageLabel(stage)}`, `Semi-finished code for ${product} at ${stageLabel(stage)}`)}><SelectValue placeholder={t("Chưa ánh xạ", "Not mapped")} /></SelectTrigger>
          <SelectContent>{dataset.input.btp_codes.map((code) => <SelectItem key={code} value={code}>{code}</SelectItem>)}</SelectContent>
        </Select>
        {shared && <Badge variant="info">{t("chung", "shared")}</Badge>}
      </div>
      <MutationNotice error={mutation.error} fallback={t("Không thể đổi ánh xạ.", "Could not change the mapping.")} className="py-2 text-xs" />
    </div>
  );
}

function BtpSheet({ code, onClose, onCreated }: { code: string | null; onClose: () => void; onCreated: (id: string) => void }) {
  const { t } = useI18n();
  const showToast = useToast();
  const { dataset, onUpdated } = useDataset();
  const input = dataset.input;
  const isNew = code === null;
  const key = code ?? "";
  const savedQty = isNew ? 0 : input.inventory_btp[key] ?? 0;
  const savedCap: number | "" = isNew ? "" : input.btp_capacity[key] ?? "";
  const [newCode, setNewCode] = useState("");
  const [qty, setQty] = useState<number | "">(savedQty);
  const [cap, setCap] = useState<number | "">(savedCap);
  const [renaming, setRenaming] = useState(false);
  const [rename, setRename] = useState(code ?? "");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const normalized = (isNew ? newCode : rename).trim().toUpperCase();
  const codeError = (isNew ? newCode : renaming ? rename : "") && !CODE_PATTERN.test(normalized) ? t("Chỉ dùng chữ in hoa, số, _ hoặc -", "Use capital letters, digits, _ or - only") : (isNew || renaming) && normalized !== code && input.btp_codes.includes(normalized) ? t("Mã đã tồn tại", "Code already exists") : "";
  const qtyError = qty === "" ? t("Bắt buộc", "Required") : qty < 0 || !Number.isInteger(qty) ? t("Số nguyên ≥ 0", "Whole number ≥ 0") : "";
  const capError = cap !== "" && (cap < 1 || !Number.isInteger(cap)) ? t("Số nguyên ≥ 1, hoặc để trống", "Whole number ≥ 1, or leave empty") : cap !== "" && qty !== "" && qty > cap ? t("Nhỏ hơn tồn đầu", "Below opening stock") : "";
  const dirty = isNew ? Boolean(newCode) : qty !== savedQty || cap !== savedCap;
  const usage = isNew ? [] : btpUsage(input)[key] ?? [];
  const machines = isNew ? [] : Object.entries(input.machines).filter(([, machine]) => key in machine.minutes_per_unit);

  const save = useMutation({
    mutationFn: async () => {
      if (isNew) { const created = await createBtpCode(dataset.id, { expected_revision: dataset.revision, code: normalized }); onUpdated(created); return normalized; }
      const updated = await upsertBtpInventory(dataset.id, key, { expected_revision: dataset.revision, initial_qty: Number(qty), capacity: cap === "" ? null : Number(cap) });
      onUpdated(updated);
      return null;
    },
    onSuccess: (created) => {
      if (created) { showToast(t(`Đã thêm mã ${created}.`, `Added code ${created}.`)); onCreated(created); }
      else showToast(t(`Đã lưu tồn của ${code}.`, `Saved stock of ${code}.`));
    },
  });
  const renameMutation = useMutation({
    mutationFn: () => renameBtpCode(dataset.id, code!, { expected_revision: dataset.revision, code: normalized }),
    onSuccess: (updated) => { showToast(t(`Đã đổi tên thành ${normalized}.`, `Renamed to ${normalized}.`)); onUpdated(updated); onCreated(normalized); },
  });
  const remove = useMutation({
    mutationFn: () => deleteBtpCode(dataset.id, code!, dataset.revision),
    onSuccess: (updated) => { setConfirmDelete(false); showToast(t(`Đã xóa mã ${code}.`, `Deleted code ${code}.`)); onClose(); onUpdated(updated); },
    onError: () => setConfirmDelete(false),
  });
  const busy = save.isPending || remove.isPending || renameMutation.isPending;

  return (
    <RecordSheet open onClose={onClose} dirty={dirty && !busy}
      title={isNew ? t("Thêm mã bán thành phẩm", "Add semi-finished code") : <span className="font-mono">{code}</span>}
      description={isNew ? t("Sau khi thêm, ánh xạ mã này cho sản phẩm ở bảng ánh xạ và khai báo máy xử lý được nó.", "After adding, map it to products in the mapping table and declare which machines process it.") : t(`Bán thành phẩm · revision ${dataset.revision}`, `Semi-finished · revision ${dataset.revision}`)}
      footer={<>
        <DirtyHint dirty={dirty} />
        {!isNew && <Button variant="ghost" className="text-destructive hover:bg-danger-soft hover:text-destructive" disabled={busy} onClick={() => setConfirmDelete(true)}><Trash2 />{t("Xóa", "Delete")}</Button>}
        <SheetClose asChild><Button variant="outline" disabled={busy}>{t("Đóng", "Close")}</Button></SheetClose>
        <Button disabled={!dirty || busy || Boolean(isNew ? codeError || !normalized : qtyError || capError)} onClick={() => save.mutate()}>{save.isPending ? t("Đang lưu…", "Saving…") : isNew ? t("Thêm mã", "Add code") : t("Lưu tồn", "Save stock")}</Button>
      </>}>
      <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-4">
        <MutationNotice error={save.error ?? renameMutation.error ?? remove.error} fallback={t("Thay đổi bị từ chối.", "The change was rejected.")} />
        {isNew ? (
          <Field label={t("Mã BTP", "Code")}><Input autoFocus value={newCode} aria-invalid={Boolean(codeError)} onChange={(event) => setNewCode(event.target.value.toUpperCase())} placeholder="F_SILVER_CAST" onKeyDown={(event) => { if (event.key === "Enter" && !codeError && normalized) save.mutate(); }} /><FieldError>{codeError}</FieldError></Field>
        ) : (
          <>
            <SheetSection title={t("Tồn kho", "Stock")}>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label={t("Tồn đầu kỳ", "Opening stock")}><Input type="number" min={0} step={1} inputMode="numeric" value={qty} aria-invalid={Boolean(qtyError)} onChange={(event) => setQty(numberOrEmpty(event.target.value))} /><FieldError>{qtyError}</FieldError></Field>
                <Field label={t("Sức chứa", "Capacity")} hint={t("Để trống = không giới hạn", "Empty = unlimited")}><Input type="number" min={1} step={1} inputMode="numeric" value={cap} placeholder={t("Không giới hạn", "Unlimited")} aria-invalid={Boolean(capError)} onChange={(event) => setCap(numberOrEmpty(event.target.value))} /><FieldError>{capError}</FieldError></Field>
              </div>
            </SheetSection>
            <SheetSection title={t("Tên mã", "Code name")} aside={!renaming && <Button size="sm" variant="ghost" onClick={() => setRenaming(true)}><Pencil />{t("Đổi tên", "Rename")}</Button>}>
              {renaming ? (
                <div className="grid gap-2">
                  <div className="flex gap-2"><Input aria-label={t(`Tên mới cho ${code}`, `New name for ${code}`)} value={rename} aria-invalid={Boolean(codeError)} onChange={(event) => setRename(event.target.value.toUpperCase())} /><Button disabled={Boolean(codeError) || normalized === code || busy} onClick={() => renameMutation.mutate()}>{renameMutation.isPending ? "…" : t("Lưu tên", "Save name")}</Button><Button variant="ghost" onClick={() => { setRenaming(false); setRename(key); }}>{t("Hủy", "Cancel")}</Button></div>
                  <FieldError>{codeError}</FieldError>
                  <span className="text-xs text-muted-foreground">{t("Đổi tên cập nhật cả ánh xạ, tồn và năng lực máy dùng mã này.", "Renaming also updates the mappings, stock and machine capabilities that use it.")}</span>
                </div>
              ) : <p className="font-mono text-sm">{code}</p>}
            </SheetSection>
            <SheetSection title={t(`Dùng bởi (${usage.length})`, `Used by (${usage.length})`)}>
              {usage.length === 0 ? <p className="text-sm text-muted-foreground">{t("Chưa sản phẩm nào ánh xạ tới mã này — có thể xóa.", "No product maps to this code — it can be deleted.")}</p> : (
                <ul className="grid gap-1 text-sm">{usage.map((use) => <li key={`${use.product}-${use.stage}`} className="flex items-center gap-2"><ProductDot product={use.product} products={input.products} />{use.product}<span className="text-muted-foreground">· {stageLabel(use.stage)}</span></li>)}</ul>
              )}
            </SheetSection>
            <SheetSection title={t("Máy xử lý được", "Machines that process it")}>
              {machines.length === 0 ? <p className="text-sm text-destructive">{t("Chưa máy nào khai báo thời gian xử lý cho mã này.", "No machine declares a processing time for this code.")}</p> : (
                <Table>
                  <TableHeader><TableRow><TableHead>{t("Máy", "Machine")}</TableHead><TableHead>{t("Công đoạn", "Stage")}</TableHead><TableHead className={N}>{t("Phút/đơn vị", "Min/unit")}</TableHead></TableRow></TableHeader>
                  <TableBody>{machines.map(([id, machine]) => <TableRow key={id}><TableCell className="font-medium">{id}</TableCell><TableCell>{stageLabel(machine.stage)}</TableCell><TableCell className={N}>{machine.minutes_per_unit[key]}</TableCell></TableRow>)}</TableBody>
                </Table>
              )}
            </SheetSection>
          </>
        )}
      </div>
      {!isNew && <ConfirmDialog open={confirmDelete} title={t(`Xóa mã ${code}?`, `Delete code ${code}?`)} description={t("Chỉ xóa được mã chưa có sản phẩm nào ánh xạ tới.", "Only codes that no product maps to can be deleted.")} confirmLabel={t("Xóa mã", "Delete code")} pending={remove.isPending} onCancel={() => setConfirmDelete(false)} onConfirm={() => remove.mutate()} />}
    </RecordSheet>
  );
}
