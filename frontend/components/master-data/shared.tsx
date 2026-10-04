"use client";

import { AlertCircle, RotateCw } from "lucide-react";
import { usePathname, useSearchParams } from "next/navigation";
import { createContext, useCallback, useContext, useState, type ReactNode } from "react";

import { ConfirmDialog } from "@/components/confirm-dialog";
import { useI18n } from "@/components/i18n-provider";
import { productColor } from "@/components/schedule-gantt";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { apiErrorMessage } from "@/lib/api";
import { isMdTab, isRevisionConflict, type MdTab, type Severity } from "@/lib/master-data";
import type { MasterDatasetDetail } from "@/lib/types";
import { cn } from "@/lib/utils";

/* ---------- dataset context (one fetch, every section reads the same revision) ---------- */

interface DatasetCtx {
  dataset: MasterDatasetDetail;
  /** Apply the dataset returned by a successful mutation (new revision) everywhere. */
  onUpdated: (dataset: MasterDatasetDetail) => void;
  /** Refetch the latest revision (after a revision conflict). */
  reload: () => void;
}

const Ctx = createContext<DatasetCtx | null>(null);

export function DatasetProvider({ value, children }: { value: DatasetCtx; children: ReactNode }) {
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useDataset(): DatasetCtx {
  const value = useContext(Ctx);
  if (!value) throw new Error("useDataset must be used inside DatasetProvider");
  return value;
}

/* ---------- URL state: ?tab=machines&item=CNC_1 (deep-linkable tab and open record) ---------- */

export function useMdLocation() {
  const params = useSearchParams();
  const pathname = usePathname();
  const raw = params.get("tab");
  const tab: MdTab = isMdTab(raw) ? raw : "overview";
  const item = params.get("item");
  const dueRaw = params.get("due");
  const due = dueRaw != null && /^\d+$/.test(dueRaw) ? Number(dueRaw) : null;
  const navigate = useCallback((next: { tab?: MdTab; item?: string | null; due?: number | null }, mode: "push" | "replace" = "push") => {
    const query = new URLSearchParams(window.location.search);
    if (next.tab && next.tab !== query.get("tab")) query.delete("due");
    if (next.tab) query.set("tab", next.tab);
    if (next.item === null || (next.tab && next.item === undefined)) query.delete("item");
    else if (next.item) query.set("item", next.item);
    if (next.due === null) query.delete("due");
    else if (next.due !== undefined) query.set("due", String(next.due));
    if (query.get("tab") === "overview") query.delete("tab");
    const url = `${pathname}${query.size ? `?${query.toString()}` : ""}`;
    if (mode === "push") window.history.pushState(null, "", url);
    else window.history.replaceState(null, "", url);
  }, [pathname]);
  return { tab, item, due, navigate };
}

/* ---------- mutation errors: revision conflicts are explained, not just echoed ---------- */

export function MutationNotice({ error, fallback, className }: { error: unknown; fallback: string; className?: string }) {
  const { t } = useI18n();
  const { reload } = useDataset();
  if (!error) return null;
  if (isRevisionConflict(error)) {
    return (
      <Alert className={cn("border-warning/40 bg-warning-soft", className)} role="alert">
        <AlertCircle className="text-warning" />
        <AlertTitle>{t("Dữ liệu vừa được thay đổi ở nơi khác", "The data was changed elsewhere")}</AlertTitle>
        <AlertDescription className="flex flex-wrap items-center justify-between gap-2">
          <span>{t("Thay đổi của bạn chưa được lưu vì revision đã cũ. Tải revision mới nhất rồi thao tác lại.", "Your change was not saved because your revision is out of date. Load the latest revision and try again.")}</span>
          <Button size="sm" variant="outline" onClick={reload}><RotateCw />{t("Tải bản mới nhất", "Load latest")}</Button>
        </AlertDescription>
      </Alert>
    );
  }
  return (
    <Alert variant="destructive" className={cn("border-destructive/30 bg-danger-soft", className)} role="alert">
      <AlertCircle />
      <AlertDescription>{apiErrorMessage(error, fallback)}</AlertDescription>
    </Alert>
  );
}

/* ---------- record drawer (Airtable/Stripe-style detail sheet) with dirty guard ---------- */

interface RecordSheetProps {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  description?: ReactNode;
  dirty?: boolean;
  /** Footer (save/cancel/delete). */
  footer?: ReactNode;
  children: ReactNode;
  wide?: boolean;
}

export function RecordSheet({ open, onClose, title, description, dirty, footer, children, wide }: RecordSheetProps) {
  const { t } = useI18n();
  const [confirm, setConfirm] = useState(false);
  const requestClose = () => (dirty ? setConfirm(true) : onClose());
  return (
    <>
      <Sheet open={open} onOpenChange={(next) => { if (!next) requestClose(); }}>
        <SheetContent className={cn("w-full gap-0 p-0 sm:max-w-lg", wide && "sm:max-w-2xl")} onEscapeKeyDown={(event) => { if (dirty) { event.preventDefault(); setConfirm(true); } }}>
          <SheetHeader className="border-b pr-12">
            <SheetTitle className="text-base">{title}</SheetTitle>
            {description && <SheetDescription>{description}</SheetDescription>}
          </SheetHeader>
          <div className="min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto p-4">{children}</div>
          {footer && <SheetFooter className="flex-row flex-wrap items-center justify-end gap-2 border-t bg-surface-2">{footer}</SheetFooter>}
        </SheetContent>
      </Sheet>
      <ConfirmDialog open={confirm} title={t("Bỏ thay đổi chưa lưu?", "Discard unsaved changes?")} description={t("Các giá trị bạn vừa sửa sẽ không được lưu.", "The values you edited will not be saved.")} confirmLabel={t("Bỏ thay đổi", "Discard")} onCancel={() => setConfirm(false)} onConfirm={() => { setConfirm(false); onClose(); }} />
    </>
  );
}

/** Small "changed" dot + label for dirty footers. */
export function DirtyHint({ dirty }: { dirty: boolean }) {
  const { t } = useI18n();
  if (!dirty) return <span className="mr-auto text-xs text-muted-foreground">{t("Chưa có thay đổi", "No changes")}</span>;
  return <span className="mr-auto inline-flex items-center gap-1.5 text-xs font-medium text-warning"><span className="size-1.5 rounded-full bg-warning" aria-hidden />{t("Có thay đổi chưa lưu", "Unsaved changes")}</span>;
}

/* ---------- small visual atoms ---------- */

export function ProductDot({ product, products, className }: { product: string; products: string[]; className?: string }) {
  return <span aria-hidden className={cn("inline-block size-2.5 shrink-0 rounded-full ring-1 ring-foreground/15", className)} style={{ background: productColor(product, products)[0] }} />;
}

export function SeverityDot({ severity }: { severity: Severity }) {
  return <span aria-hidden className={cn("mt-1.5 inline-block size-2 shrink-0 rounded-full", severity === "error" ? "bg-destructive" : severity === "warning" ? "bg-warning" : "bg-primary")} />;
}

/** Section block inside a drawer. */
export function SheetSection({ title, aside, children, className }: { title: ReactNode; aside?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cn("min-w-0 border-b pb-4 not-first:pt-4 last:border-b-0", className)}>
      <div className="mb-2 flex items-center justify-between gap-2"><h3 className="text-sm font-semibold">{title}</h3>{aside}</div>
      {children}
    </section>
  );
}

export function FieldError({ children }: { children?: ReactNode }) {
  return children ? <span className="text-xs text-destructive" role="alert">{children}</span> : null;
}

/** Number input value helper: keeps "" while typing instead of forcing 0. */
export function numberOrEmpty(value: string): number | "" {
  return value === "" ? "" : Number(value);
}
