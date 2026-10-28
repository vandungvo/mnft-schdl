"use client";

import { ChevronRight, Plus } from "lucide-react";
import { Fragment, useState } from "react";

import { Field, Hint, Panel } from "@/components/blocks";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { useI18n } from "@/components/i18n-provider";
import { ProductDot } from "@/components/master-data/shared";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { productName, stageName } from "@/lib/factory";
import { clone, ensureItemOnStage, isChangedAt, itemsOfStage, prune } from "@/lib/factory-config";
import type { FactoryConfig } from "@/lib/factory-types";
import { cn } from "@/lib/utils";

import { changedClass, defaultPlaceholder, EditSheet, IssueText, NumberField, useFactoryEdit, useFactoryLocation, useIssues } from "./fields";

export const CODE = /^[A-Z0-9][A-Z0-9_-]*$/;

export function ProductsSection() {
  const { t } = useI18n();
  const { config, base, update } = useFactoryEdit();
  const { item, navigate } = useFactoryLocation();
  const [adding, setAdding] = useState(false);
  const products = Object.keys(config.products);
  const btpStages = config.stages.slice(0, -1);
  const usedBy = (code: string) => products.filter((p) => Object.values(config.products[p].route).includes(code));
  const changed = (...path: string[]) => isChangedAt(base, config, path);
  const open = item && config.products[item] ? item : null;

  return (
    <div className="grid gap-4">
      <Panel title={t("Sản phẩm & quy trình", "Products & routes")} description={t("Mỗi sản phẩm đi qua các mã bán thành phẩm; sản phẩm dùng chung một mã nghĩa là dùng chung kho đó (vd. bạc/đen chung phôi đúc). Bấm một dòng để sửa quy trình.", "Each product passes through semi-finished codes; products sharing a code share that stock (e.g. silver/black share the cast blank). Click a row to edit its route.")}
        actions={<Button size="sm" variant="outline" onClick={() => setAdding(true)}><Plus />{t("Thêm sản phẩm", "Add product")}</Button>} flush>
        <div className="overflow-x-auto border-t">
          <Table>
            <TableHeader><TableRow>
              <TableHead className="pl-4">{t("Sản phẩm", "Product")}</TableHead>
              <TableHead>{t("Quy trình (mã bán thành phẩm)", "Route (semi-finished codes)")}</TableHead>
              <TableHead className="text-right">{t("Tồn an toàn", "Safety stock")}</TableHead>
              <TableHead className="text-right">{t("Trần kho", "Stock cap")}</TableHead>
              <TableHead className="w-0 pr-4"><span className="sr-only">{t("Sửa", "Edit")}</span></TableHead>
            </TableRow></TableHeader>
            <TableBody>{products.map((code) => {
              const product = config.products[code];
              return <ProductRow key={code} code={code} products={products} btpStages={btpStages} onOpen={() => navigate({ item: code })}
                rowChanged={changed("products", code, "name") || changed("products", code, "route")} capChanged={changed("products", code, "stock_cap")} safetyChanged={changed("products", code, "safety_stock")}
                onSafety={(v) => update((c) => { c.products[code].safety_stock = v; })} onCap={(v) => update((c) => { c.products[code].stock_cap = v; })} product={product} />;
            })}</TableBody>
          </Table>
        </div>
      </Panel>

      <Panel title={t("Mã bán thành phẩm", "Semi-finished codes")} description={t("Sức chứa để trống = kho không giới hạn.", "Leave capacity blank for an unlimited store.")} flush>
        <div className="overflow-x-auto border-t">
          <Table>
            <TableHeader><TableRow>
              <TableHead className="pl-4">{t("Mã", "Code")}</TableHead><TableHead>{t("Công đoạn", "Stage")}</TableHead><TableHead>{t("Tên hiển thị", "Display name")}</TableHead>
              <TableHead>{t("Dùng cho", "Used by")}</TableHead><TableHead className="pr-4 text-right">{t("Sức chứa kho", "Store capacity")}</TableHead>
            </TableRow></TableHeader>
            <TableBody>{btpStages.flatMap((stage) => itemsOfStage(config, stage).map((code) => (
              <TableRow key={code}>
                <TableCell className="pl-4 font-medium whitespace-nowrap">{code}</TableCell>
                <TableCell className="whitespace-nowrap text-muted-foreground">{stageName(config, stage)}</TableCell>
                <TableCell className="min-w-40">
                  <Input className={cn("h-8", changed("btp", code, "name") && changedClass)} aria-label={t(`Tên hiển thị của ${code}`, `Display name of ${code}`)} placeholder={defaultPlaceholder(t, code)} value={config.btp[code]?.name ?? ""}
                    onChange={(event) => update((c) => { c.btp[code] = { ...c.btp[code], name: event.target.value || null }; })} />
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">{usedBy(code).map((p) => productName(config, p)).join(", ")}</TableCell>
                <TableCell className="w-36 pr-4">
                  <Input type="number" min={1} inputMode="numeric" placeholder="∞" aria-label={t(`Sức chứa kho ${code}`, `Store capacity of ${code}`)} className={cn("h-8 text-right tabular-nums", changed("btp", code, "capacity") && changedClass)}
                    value={config.btp[code]?.capacity ?? ""} onChange={(event) => update((c) => { const v = Number(event.target.value); c.btp[code] = { ...c.btp[code], capacity: event.target.value === "" || !Number.isFinite(v) || v < 1 ? null : Math.round(v) }; })} />
                </TableCell>
              </TableRow>
            )))}</TableBody>
          </Table>
        </div>
      </Panel>
      <Hint className="mt-0">{t("Thêm sản phẩm hoặc mã mới: mọi máy của công đoạn tương ứng tự được gán làm mã đó với định mức trung bình — vào mục Máy để chỉnh lại cho đúng.", "Adding a product or code makes every machine of that stage able to make it at an average rate — adjust it under Machines.")}</Hint>

      {adding && <AddProductDialog config={config} onClose={() => setAdding(false)} onAdd={(code, template) => {
        update((c) => { c.products[code] = { ...clone(c.products[template]), name: null }; ensureItemOnStage(c, c.stages[c.stages.length - 1], code); });
        setAdding(false);
        navigate({ item: code });
      }} />}
      {open && <ProductSheet code={open} onClose={() => navigate({ item: null })} />}
    </div>
  );
}

function ProductRow({ code, product, products, btpStages, onOpen, rowChanged, safetyChanged, capChanged, onSafety, onCap }: {
  code: string; product: FactoryConfig["products"][string]; products: string[]; btpStages: string[]; onOpen: () => void;
  rowChanged: boolean; safetyChanged: boolean; capChanged: boolean; onSafety: (v: number) => void; onCap: (v: number) => void;
}) {
  const { t } = useI18n();
  const { config } = useFactoryEdit();
  const capIssues = useIssues("products", code, "cap");
  return (
    <TableRow className={cn("cursor-pointer", rowChanged && "bg-warning-soft/60")} onClick={(event) => { if (!(event.target as HTMLElement).closest("input")) onOpen(); }}>
      <TableCell className="pl-4">
        <span className="flex items-center gap-2">
          <ProductDot product={code} products={products} />
          <span className="grid leading-tight"><span className="font-medium whitespace-nowrap">{productName(config, code)}</span><code className="text-xs text-muted-foreground">{code}</code></span>
        </span>
      </TableCell>
      <TableCell>
        <span className="flex flex-wrap items-center gap-1 text-xs">
          {btpStages.map((stage, index) => (
            <Fragment key={stage}>
              {index > 0 && <span className="text-muted-foreground" aria-hidden>→</span>}
              <span className="rounded bg-muted px-1.5 py-0.5 font-mono" title={stageName(config, stage)}>{product.route[stage]}</span>
            </Fragment>
          ))}
        </span>
      </TableCell>
      <TableCell className="w-28"><NumberField value={product.safety_stock} label={t(`Tồn an toàn ${code}`, `Safety stock of ${code}`)} changed={safetyChanged} onChange={onSafety} /></TableCell>
      <TableCell className="w-28 align-top">
        <NumberField min={1} value={product.stock_cap} label={t(`Trần kho ${code}`, `Stock cap of ${code}`)} changed={capChanged} invalid={capIssues.length > 0} onChange={onCap} />
        {capIssues.length > 0 && <span className="mt-1 block text-right text-xs whitespace-nowrap text-destructive" role="alert">{t(`≥ tồn an toàn (${product.safety_stock})`, `≥ safety (${product.safety_stock})`)}</span>}
      </TableCell>
      <TableCell className="pr-4">
        <Button variant="ghost" size="icon" className="size-8 text-muted-foreground" aria-label={t(`Sửa ${code}`, `Edit ${code}`)} onClick={(event) => { event.stopPropagation(); onOpen(); }}><ChevronRight /></Button>
      </TableCell>
    </TableRow>
  );
}

function ProductSheet({ code, onClose }: { code: string; onClose: () => void }) {
  const { t } = useI18n();
  const { config, base, update } = useFactoryEdit();
  const [newCode, setNewCode] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const product = config.products[code];
  const products = Object.keys(config.products);
  const btpStages = config.stages.slice(0, -1);
  const changed = (...path: string[]) => isChangedAt(base, config, path);
  const capIssues = useIssues("products", code, "cap");
  const routeIssues = useIssues("products", code, "route");
  const setRoute = (stage: string, item: string) => update((c) => { c.products[code].route[stage] = item; ensureItemOnStage(c, stage, item); prune(c); });
  const remove = () => update((c) => {
    delete c.products[code];
    for (const m of Object.values(c.machines)) { delete m.minutes_per_unit[code]; delete m.setup[code]; for (const row of Object.values(m.setup)) delete row[code]; }
    prune(c);
  });

  return (
    <EditSheet open onClose={onClose} title={<span className="inline-flex items-center gap-2"><ProductDot product={code} products={products} />{productName(config, code)} <code className="text-xs font-normal text-muted-foreground">{code}</code></span>}
      actions={<Button variant="outline" className="text-destructive" disabled={products.length <= 1} title={products.length <= 1 ? t("Nhà máy phải còn ít nhất một sản phẩm", "The plant needs at least one product") : undefined} onClick={() => setConfirmDelete(true)}>{t("Xóa sản phẩm", "Delete product")}</Button>}>
      <div className="grid gap-4">
        <Field label={t("Tên hiển thị", "Display name")}>
          <Input className={cn("h-8", changed("products", code, "name") && changedClass)} value={product.name ?? ""} placeholder={defaultPlaceholder(t, productName(null, code))} onChange={(event) => update((c) => { c.products[code].name = event.target.value || null; })} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t("Tồn an toàn", "Safety stock")}><NumberField value={product.safety_stock} label={t("Tồn an toàn", "Safety stock")} changed={changed("products", code, "safety_stock")} onChange={(v) => update((c) => { c.products[code].safety_stock = v; })} /></Field>
          <Field label={t("Trần kho", "Stock cap")} hint={t("Không được thấp hơn tồn an toàn.", "Must not be below safety stock.")}>
            <NumberField min={1} value={product.stock_cap} label={t("Trần kho", "Stock cap")} invalid={capIssues.length > 0} changed={changed("products", code, "stock_cap")} onChange={(v) => update((c) => { c.products[code].stock_cap = v; })} />
          </Field>
        </div>
        <IssueText issues={capIssues} />
        <div className="grid gap-2">
          <span className="text-xs font-semibold text-muted-foreground">{t("Quy trình: mã bán thành phẩm ở từng công đoạn", "Route: semi-finished code at each stage")}</span>
          <ol className="grid gap-2">
            {btpStages.map((stage, index) => (
              <li key={stage} className="grid grid-cols-[1.5rem_8rem_minmax(0,1fr)] items-center gap-2 text-sm">
                <span className="text-xs text-muted-foreground tabular-nums">{index + 1}.</span>
                <span className="truncate">{stageName(config, stage)}</span>
                <Select value={product.route[stage]} onValueChange={(value) => value === "__new__" ? setNewCode(stage) : setRoute(stage, value)}>
                  <SelectTrigger size="sm" className={cn("w-full font-mono", changed("products", code, "route") && product.route[stage] !== base?.products[code]?.route[stage] && changedClass)} aria-label={stageName(config, stage)}><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {itemsOfStage(config, stage).map((item) => <SelectItem key={item} value={item} className="font-mono">{item}</SelectItem>)}
                    <SelectItem value="__new__">{t("+ Mã mới…", "+ New code…")}</SelectItem>
                  </SelectContent>
                </Select>
              </li>
            ))}
            <li className="grid grid-cols-[1.5rem_8rem_minmax(0,1fr)] items-center gap-2 text-sm">
              <span className="text-xs text-muted-foreground tabular-nums">{btpStages.length + 1}.</span>
              <span className="truncate">{stageName(config, config.stages[config.stages.length - 1])}</span>
              <code className="px-3 text-muted-foreground">{code}</code>
            </li>
          </ol>
          <IssueText issues={routeIssues} />
        </div>
      </div>
      {newCode && <CodeDialog title={t(`Mã ${stageName(config, newCode).toLowerCase()} mới cho ${code}`, `New ${stageName(config, newCode)} code for ${code}`)} taken={[...Object.keys(config.btp), ...products]}
        onClose={() => setNewCode(null)} onSave={(item) => { setRoute(newCode, item); setNewCode(null); }} />}
      <ConfirmDialog open={confirmDelete} title={t(`Xóa sản phẩm ${code}?`, `Delete product ${code}?`)}
        description={t("Sản phẩm bị bỏ khỏi bản nháp cùng định mức và thời gian chuyển đổi của nó trên mọi máy; mã bán thành phẩm không còn dùng cũng bị bỏ. Có thể khôi phục bằng “Hủy thay đổi” trước khi lưu.", "The product is removed from the draft with its rates and changeovers on every machine; semi-finished codes nothing uses any more go too. “Discard” before saving brings it back.")}
        confirmLabel={t("Xóa", "Delete")} onCancel={() => setConfirmDelete(false)} onConfirm={() => { setConfirmDelete(false); onClose(); remove(); }} />
    </EditSheet>
  );
}

function AddProductDialog({ config, onClose, onAdd }: { config: FactoryConfig; onClose: () => void; onAdd: (code: string, template: string) => void }) {
  const { t } = useI18n();
  const products = Object.keys(config.products);
  const [code, setCode] = useState("");
  const [template, setTemplate] = useState(products[0]);
  const clean = code.trim().toUpperCase();
  const taken = [...products, ...Object.keys(config.btp)].includes(clean);
  const valid = CODE.test(clean) && !taken;
  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>{t("Thêm sản phẩm", "Add a product")}</DialogTitle><DialogDescription>{t("Sản phẩm mới chép quy trình, tồn an toàn và trần kho của một sản phẩm có sẵn; sửa lại sau.", "The new product copies the route, safety stock and cap of an existing one; edit afterwards.")}</DialogDescription></DialogHeader>
        <form className="grid gap-4" onSubmit={(event) => { event.preventDefault(); if (valid) onAdd(clean, template); }}>
          <Field label={t("Mã sản phẩm", "Product code")} hint={taken ? t("Mã đã dùng.", "Code already used.") : t("Chữ in hoa, số, _ hoặc -", "Upper-case letters, digits, _ or -")}><Input autoFocus value={code} aria-invalid={code !== "" && !valid} onChange={(event) => setCode(event.target.value)} /></Field>
          <Field label={t("Chép quy trình từ", "Copy the route from")}>
            <Select value={template} onValueChange={setTemplate}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent>{products.map((p) => <SelectItem key={p} value={p}>{productName(config, p)}</SelectItem>)}</SelectContent></Select>
          </Field>
          <DialogFooter><Button type="button" variant="outline" onClick={onClose}>{t("Hủy", "Cancel")}</Button><Button type="submit" disabled={!valid}>{t("Thêm", "Add")}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function CodeDialog({ title, taken, onClose, onSave, description }: { title: string; taken: string[]; onClose: () => void; onSave: (code: string) => void; description?: string }) {
  const { t } = useI18n();
  const [code, setCode] = useState("");
  const clean = code.trim().toUpperCase();
  const valid = CODE.test(clean) && !taken.includes(clean);
  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader><DialogTitle>{title}</DialogTitle><DialogDescription>{description ?? t("Chữ in hoa, số, _ hoặc -; không trùng mã có sẵn.", "Upper-case letters, digits, _ or -; must be new.")}</DialogDescription></DialogHeader>
        <form className="grid gap-4" onSubmit={(event) => { event.preventDefault(); if (valid) onSave(clean); }}>
          <Input autoFocus value={code} aria-label={t("Mã mới", "New code")} onChange={(event) => setCode(event.target.value)} aria-invalid={code !== "" && !valid} />
          {code !== "" && taken.includes(clean) && <span className="text-xs text-destructive">{t("Mã đã dùng.", "Code already used.")}</span>}
          <DialogFooter><Button type="button" variant="outline" onClick={onClose}>{t("Hủy", "Cancel")}</Button><Button type="submit" disabled={!valid}>{t("Tạo", "Create")}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
