"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, CheckCircle2, ClipboardPaste, Download, FileSpreadsheet, Loader2, Upload } from "lucide-react";
import { useRef, useState } from "react";

import { useI18n } from "@/components/i18n-provider";
import { MutationNotice } from "@/components/master-data/shared";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { importBookOrders } from "@/lib/api";
import { csvRow, downloadText, fileToBase64, fmtLocal, issueText, priorityLabel } from "@/lib/factory";
import type { FactoryConfig, OrderImportResult } from "@/lib/factory-types";
import { cn } from "@/lib/utils";

type Source = { format: "csv" | "tsv" | "xlsx"; content: string; name: string };

const FIELD_LABEL: Record<string, [string, string]> = {
  code: ["Mã đơn", "Order code"], product: ["Sản phẩm", "Product"], quantity: ["Số lượng", "Quantity"], due: ["Hạn giao", "Due date"],
  due_time: ["Giờ giao", "Due time"], priority: ["Ưu tiên", "Priority"], pickup: ["Cách giao", "Pickup"], customer: ["Khách hàng", "Customer"], note: ["Ghi chú", "Note"],
};

export function downloadOrderTemplate(config: FactoryConfig | undefined) {
  const products = Object.keys(config?.products ?? { F_SILVER: null, R_BLACK: null });
  const lines = [
    csvRow(["Mã đơn", "Sản phẩm", "Số lượng", "Hạn giao", "Giờ giao", "Ưu tiên", "Cách giao", "Khách hàng", "Ghi chú"]),
    csvRow(["PO-1001", products[0], 64, "06/10/2026", "16:00", "Thường", "Đúng hẹn", "Khách A", ""]),
    csvRow(["PO-1002", products[products.length - 1], 28, "08/10/2026", "12:00", "Gấp", "Đúng hẹn", "Khách B", "Giao sớm nếu xong"]),
  ];
  downloadText("mau-don-hang.csv", lines.join("\n"));
}

/** Excel/CSV/paste → preview with per-row problems → write. Nothing is stored until the planner confirms. */
export function ImportOrdersDialog({ open, onClose, factoryId, config }: { open: boolean; onClose: () => void; factoryId: string; config?: FactoryConfig }) {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [source, setSource] = useState<Source | null>(null);
  const [paste, setPaste] = useState("");
  const [mode, setMode] = useState<"upsert" | "replace_open">("upsert");
  const [skipInvalid, setSkipInvalid] = useState(false);
  const [preview, setPreview] = useState<OrderImportResult | null>(null);
  const [readError, setReadError] = useState("");

  const check = useMutation({
    mutationFn: (input: { source: Source; mode: "upsert" | "replace_open" }) => importBookOrders(factoryId, { format: input.source.format, content: input.source.content, mode: input.mode, commit: false, skip_invalid: false }),
    onSuccess: setPreview,
  });
  const commit = useMutation({
    mutationFn: () => importBookOrders(factoryId, { format: source!.format, content: source!.content, mode, commit: true, skip_invalid: skipInvalid }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["book-orders"] });
      void queryClient.invalidateQueries({ queryKey: ["outlook"] });
      void queryClient.invalidateQueries({ queryKey: ["period"] });
      void queryClient.invalidateQueries({ queryKey: ["factories"] });
      reset(); onClose();
    },
  });
  const reset = () => { setSource(null); setPaste(""); setPreview(null); setReadError(""); setSkipInvalid(false); check.reset(); commit.reset(); };

  async function pickFile(file?: File) {
    if (!file) return;
    setReadError("");
    try {
      const xlsx = /\.xlsx$/i.test(file.name);
      if (!xlsx && !/\.(csv|txt|tsv)$/i.test(file.name)) throw new Error(t("Chỉ nhận .xlsx, .csv hoặc .tsv. File .xls cũ hãy lưu lại thành .xlsx.", "Only .xlsx, .csv or .tsv. Save old .xls files as .xlsx first."));
      const next: Source = xlsx ? { format: "xlsx", content: await fileToBase64(file), name: file.name } : { format: /\.tsv$/i.test(file.name) ? "tsv" : "csv", content: await file.text(), name: file.name };
      setSource(next);
      check.mutate({ source: next, mode });
    } catch (error) {
      setReadError(error instanceof Error ? error.message : String(error));
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  }
  const usePaste = () => {
    const next: Source = { format: "tsv", content: paste, name: t("Dán từ Excel", "Pasted from Excel") };
    setSource(next);
    check.mutate({ source: next, mode });
  };
  const changeMode = (value: "upsert" | "replace_open") => { setMode(value); if (source) check.mutate({ source, mode: value }); };

  const summary = preview?.summary;
  const writable = summary ? summary.add + summary.update + summary.cancel : 0;
  const blocked = !preview || preview.missing_columns.length > 0 || (summary!.invalid > 0 && !skipInvalid) || writable === 0;

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next && !commit.isPending) { reset(); onClose(); } }}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>{t("Nhập đơn hàng", "Import orders")}</DialogTitle>
          <DialogDescription>{t("Từ file Excel (.xlsx), CSV, hoặc dán trực tiếp các dòng copy từ Excel. Tên cột tiếng Việt hay tiếng Anh đều được; ngày dạng dd/mm/yyyy. Xem trước rồi mới ghi.", "From an Excel (.xlsx) or CSV file, or paste rows copied from Excel. Vietnamese or English headers both work; dates as dd/mm/yyyy. Preview before anything is written.")}</DialogDescription>
        </DialogHeader>

        {!preview && (
          <div className="grid gap-4 md:grid-cols-2">
            <div className="grid content-start gap-2">
              <input ref={fileRef} type="file" className="sr-only" accept=".xlsx,.csv,.tsv,.txt" onChange={(event) => void pickFile(event.target.files?.[0])} />
              <button type="button" onClick={() => fileRef.current?.click()} disabled={check.isPending}
                className="flex flex-col items-center rounded-lg border-2 border-dashed px-4 py-8 text-center transition-colors hover:border-primary/60 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none">
                {check.isPending ? <Loader2 className="mb-2 size-6 animate-spin text-primary" /> : <FileSpreadsheet className="mb-2 size-6 text-primary" />}
                <span className="font-semibold">{t("Chọn file .xlsx hoặc .csv", "Choose an .xlsx or .csv file")}</span>
                <span className="text-xs text-muted-foreground">{t("Sheet đầu tiên, dòng đầu là tiêu đề cột", "First sheet, first row holds the headers")}</span>
              </button>
              <Button variant="link" size="sm" className="justify-self-start px-0" onClick={() => downloadOrderTemplate(config)}><Download />{t("Tải file mẫu", "Download a template")}</Button>
            </div>
            <div className="grid content-start gap-2">
              <Textarea rows={7} value={paste} onChange={(event) => setPaste(event.target.value)} className="font-mono text-xs"
                placeholder={t("Mã đơn\tSản phẩm\tSố lượng\tHạn giao\nPO-1001\tF_SILVER\t64\t06/10/2026 16:00", "Order\tProduct\tQty\tDue date\nPO-1001\tF_SILVER\t64\t06/10/2026 16:00")} aria-label={t("Dán từ Excel", "Paste from Excel")} />
              <Button variant="outline" disabled={!paste.trim() || check.isPending} onClick={usePaste}><ClipboardPaste />{t("Xem trước dữ liệu dán", "Preview the pasted rows")}</Button>
            </div>
          </div>
        )}
        {readError && <p role="alert" className="rounded-md bg-danger-soft px-3 py-2 text-sm text-destructive">{readError}</p>}
        <MutationNotice error={check.error} fallback={t("Không đọc được dữ liệu.", "Could not read the data.")} />

        {preview && summary && (
          <div className="grid min-w-0 gap-3">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <b className="mr-1">{source?.name}</b>
              {summary.add > 0 && <Badge variant="success">+{summary.add} {t("mới", "new")}</Badge>}
              {summary.update > 0 && <Badge variant="info">{summary.update} {t("cập nhật", "updated")}</Badge>}
              {summary.unchanged > 0 && <Badge variant="outline">{summary.unchanged} {t("không đổi", "unchanged")}</Badge>}
              {summary.locked > 0 && <Badge variant="secondary">{summary.locked} {t("đã giao/huỷ — bỏ qua", "delivered/cancelled — skipped")}</Badge>}
              {summary.invalid > 0 && <Badge variant="danger">{summary.invalid} {t("dòng lỗi", "rows with errors")}</Badge>}
              {summary.cancel > 0 && <Badge variant="warning">{summary.cancel} {t("đơn mở sẽ bị huỷ", "open orders will be cancelled")}</Badge>}
              <Button variant="ghost" size="sm" className="ml-auto" onClick={reset}>{t("Chọn nguồn khác", "Choose another source")}</Button>
            </div>
            <p className="text-xs text-muted-foreground">
              {t("Cột nhận diện: ", "Columns found: ")}{Object.entries(preview.columns).map(([field, header]) => `${header} → ${t(...(FIELD_LABEL[field] ?? [field, field]))}`).join(" · ")}
              {preview.unmatched_headers.length > 0 && <> · {t("bỏ qua: ", "ignored: ")}{preview.unmatched_headers.join(", ")}</>}
            </p>
            {preview.missing_columns.length > 0 && (
              <p role="alert" className="flex items-center gap-2 rounded-md bg-danger-soft px-3 py-2 text-sm text-destructive"><AlertCircle className="size-4" />{t("Thiếu cột bắt buộc: ", "Missing required columns: ")}{preview.missing_columns.map((field) => t(...(FIELD_LABEL[field] ?? [field, field]))).join(", ")}</p>
            )}
            <div className="max-h-[42vh] overflow-auto rounded-lg border">
              <Table>
                <TableHeader className="sticky top-0 bg-card"><TableRow>
                  <TableHead className="pl-3">{t("Dòng", "Row")}</TableHead><TableHead>{t("Kết quả", "Result")}</TableHead><TableHead>{t("Mã đơn", "Order")}</TableHead>
                  <TableHead>{t("Sản phẩm", "Product")}</TableHead><TableHead className="text-right">{t("SL", "Qty")}</TableHead><TableHead>{t("Hạn giao", "Due")}</TableHead>
                  <TableHead>{t("Ưu tiên", "Priority")}</TableHead><TableHead className="pr-3">{t("Ghi chú kiểm tra", "Check notes")}</TableHead>
                </TableRow></TableHeader>
                <TableBody>{preview.rows.map((row) => (
                  <TableRow key={row.row} className={cn(row.action === "invalid" && "bg-danger-soft/50")}>
                    <TableCell className="pl-3 text-muted-foreground tabular-nums">{row.row}</TableCell>
                    <TableCell><ActionBadge action={row.action} /></TableCell>
                    <TableCell className="font-medium">{row.values.code ?? "—"}</TableCell>
                    <TableCell>{row.values.product ?? "—"}</TableCell>
                    <TableCell className="text-right tabular-nums">{row.values.quantity ?? "—"}</TableCell>
                    <TableCell className="whitespace-nowrap">{row.values.due ? fmtLocal(row.values.due) : "—"}</TableCell>
                    <TableCell>{row.values.priority ? priorityLabel(row.values.priority) : "—"}</TableCell>
                    <TableCell className="pr-3 text-xs">
                      {row.errors.map((m, i) => <span key={`e${i}`} className="block text-destructive">{issueText(m)}</span>)}
                      {row.warnings.map((m, i) => <span key={`w${i}`} className="block text-warning">{issueText(m)}</span>)}
                      {row.action === "update" && row.changes.length > 0 && <span className="block text-muted-foreground">{t("đổi: ", "changes: ")}{row.changes.map((c) => t(...(FIELD_LABEL[c] ?? [c, c]))).join(", ")}</span>}
                    </TableCell>
                  </TableRow>
                ))}</TableBody>
              </Table>
            </div>
            <fieldset className="grid gap-2 sm:grid-cols-2">
              {([
                ["upsert", t("Thêm mới & cập nhật", "Add & update"), t("Đơn có trong file được thêm/cập nhật; đơn khác giữ nguyên.", "Orders in the file are added or updated; others stay.")],
                ["replace_open", t("Thay toàn bộ đơn đang mở", "Replace all open orders"), t("Đơn đang mở không có trong file sẽ bị huỷ (dùng khi file là danh sách đầy đủ).", "Open orders missing from the file are cancelled (use when the file is the full list).")],
              ] as const).map(([value, label, hint]) => (
                <label key={value} className={cn("flex cursor-pointer items-start gap-2.5 rounded-lg border p-3 text-sm hover:border-primary", mode === value && "border-primary bg-accent")}>
                  <input type="radio" name="import-mode" className="mt-1" checked={mode === value} onChange={() => changeMode(value)} />
                  <span><b className="font-medium">{label}</b><span className="block text-xs text-muted-foreground">{hint}</span></span>
                </label>
              ))}
            </fieldset>
            {summary.invalid > 0 && (
              <label className="flex items-center gap-2 text-sm"><Checkbox checked={skipInvalid} onCheckedChange={(value) => setSkipInvalid(value === true)} />{t(`Bỏ qua ${summary.invalid} dòng lỗi, ghi các dòng còn lại`, `Skip the ${summary.invalid} rows with errors and write the rest`)}</label>
            )}
          </div>
        )}
        <MutationNotice error={commit.error} fallback={t("Không ghi được đơn hàng.", "Could not write the orders.")} />
        <DialogFooter>
          <Button variant="outline" disabled={commit.isPending} onClick={() => { reset(); onClose(); }}>{t("Hủy", "Cancel")}</Button>
          {preview && <Button disabled={blocked || commit.isPending} onClick={() => commit.mutate()}>{commit.isPending ? <Loader2 className="animate-spin" /> : <Upload />}{t(`Ghi ${writable} thay đổi`, `Write ${writable} changes`)}</Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ActionBadge({ action }: { action: string }) {
  const { t } = useI18n();
  switch (action) {
    case "add": return <Badge variant="success">{t("Thêm", "Add")}</Badge>;
    case "update": return <Badge variant="info">{t("Cập nhật", "Update")}</Badge>;
    case "unchanged": return <Badge variant="outline"><CheckCircle2 />{t("Giữ", "Same")}</Badge>;
    case "locked": return <Badge variant="secondary">{t("Bỏ qua", "Skip")}</Badge>;
    default: return <Badge variant="danger">{t("Lỗi", "Error")}</Badge>;
  }
}
