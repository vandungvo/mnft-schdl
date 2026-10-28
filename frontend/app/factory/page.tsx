"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, Boxes, CalendarDays, Cog, Download, Factory, FileJson, History, Layers, Loader2, MoreHorizontal, Pencil, SlidersHorizontal, Upload, Workflow } from "lucide-react";
import { useRouter } from "next/navigation";
import { Suspense, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import { EmptyState, Field, PageHeader } from "@/components/blocks";
import { CalendarSection } from "@/components/factory/calendar";
import { DateField, FactoryEditProvider, useFactoryLocation, type Update } from "@/components/factory/fields";
import { MachinesSection } from "@/components/factory/machines";
import { MoldsSection } from "@/components/factory/molds";
import { PoliciesSection } from "@/components/factory/policies";
import { ProcessSection } from "@/components/factory/process";
import { ProductsSection } from "@/components/factory/products";
import { VersionsSection } from "@/components/factory/versions";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { useI18n } from "@/components/i18n-provider";
import { MutationNotice } from "@/components/master-data/shared";
import { useToast } from "@/components/toast-provider";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { ErrorState, SkeletonCards } from "@/components/ui-states";
import { getFactory, importFactory, renameFactory, updateFactoryConfig } from "@/lib/api";
import { downloadText, useCurrentFactory } from "@/lib/factory";
import { changedSections, clone, configIssues, countChanges, type FactorySection } from "@/lib/factory-config";
import type { FactoryConfig, FactoryDetail } from "@/lib/factory-types";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";

const DRAFT_KEY = (id: string) => `planwise:factory-draft:${id}`;

interface StoredDraft { version: number; config: FactoryConfig; effective: string; note: string; at: string }

function readDraft(id: string): StoredDraft | null {
  try { const raw = window.localStorage.getItem(DRAFT_KEY(id)); return raw ? (JSON.parse(raw) as StoredDraft) : null; } catch { return null; }
}

function writeDraft(id: string, draft: StoredDraft | null) {
  try { if (draft) window.localStorage.setItem(DRAFT_KEY(id), JSON.stringify(draft)); else window.localStorage.removeItem(DRAFT_KEY(id)); } catch { /* storage unavailable: the leave guard still protects the draft */ }
}

/* The plant set-up changes a few times a year: edit a draft, then save it as a new version
   (optionally effective from a date). Periods keep the version they were planned with.
   The draft survives navigation and reloads (browser storage), and leaving with one asks first. */
function FactoryPage() {
  const { factory, isLoading } = useCurrentFactory();
  if (isLoading) return <SkeletonCards count={3} />;
  if (!factory) return <Onboarding />;
  return <FactoryEditor key={factory.id} id={factory.id} />;
}

function FactoryEditor({ id }: { id: string }) {
  const { t } = useI18n();
  const showToast = useToast();
  const router = useRouter();
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ["factory", id], queryFn: () => getFactory(id) });
  const { section, navigate } = useFactoryLocation();
  const [draft, setDraftState] = useState<FactoryConfig | null>(null);
  const [effective, setEffective] = useState("");
  const [note, setNote] = useState("");
  const [renaming, setRenaming] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [leaveTo, setLeaveTo] = useState<string | null>(null);
  /** Draft found in browser storage on arrival: restored (same version) or stale (made on an older version). */
  const [stored, setStored] = useState<{ draft: StoredDraft; stale: boolean } | null>(null);
  const [checked, setChecked] = useState(false);
  const data = query.data;
  const config = draft ?? data?.config ?? null;
  const changes = useMemo(() => (draft && data ? countChanges(data.config, draft) : 0), [draft, data]);
  const dirtySections = useMemo(() => (draft && data ? changedSections(data.config, draft) : new Set<FactorySection>()), [draft, data]);
  const issues = useMemo(() => (draft ? configIssues(draft) : []), [draft]);

  // Arrival: pick up a draft left in this browser (navigation, reload, crash).
  if (data && !checked) {
    setChecked(true);
    const saved = typeof window === "undefined" ? null : readDraft(id);
    if (saved && countChanges(data.config, saved.config) > 0) {
      if (saved.version === data.current_version) { setDraftState(saved.config); setEffective(saved.effective); setNote(saved.note); setStored({ draft: saved, stale: false }); }
      else setStored({ draft: saved, stale: true });
    }
  }

  const persist = (next: FactoryConfig | null, extra?: { effective?: string; note?: string }) => {
    if (!data) return;
    writeDraft(id, next && countChanges(data.config, next) > 0 ? { version: data.current_version, config: next, effective: extra?.effective ?? effective, note: extra?.note ?? note, at: new Date().toISOString() } : null);
  };
  const setDraft = (next: FactoryConfig | null) => { setDraftState(next); persist(next); };
  const update: Update = (mutate) => {
    const next = clone(draft ?? data!.config);
    mutate(next);
    setDraft(next);
  };

  // Leaving with unsaved changes: the browser asks on reload/close; in-app links ask here.
  useEffect(() => {
    if (changes === 0) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => { event.preventDefault(); };
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const anchor = (event.target as HTMLElement | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!anchor || anchor.target === "_blank" || anchor.hasAttribute("download")) return;
      const url = new URL(anchor.href, window.location.href);
      if (url.origin !== window.location.origin || url.pathname === window.location.pathname) return;
      event.preventDefault();
      event.stopPropagation();
      setLeaveTo(url.pathname + url.search + url.hash);
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    document.addEventListener("click", onClick, true);
    return () => { window.removeEventListener("beforeunload", onBeforeUnload); document.removeEventListener("click", onClick, true); };
  }, [changes]);

  const save = useMutation({
    mutationFn: () => updateFactoryConfig(id, { expected_version: data!.current_version, config: draft!, effective_from: effective || null, note: note.trim() || null }),
    onSuccess: (updated) => {
      queryClient.setQueryData(["factory", id], updated);
      void queryClient.invalidateQueries({ queryKey: ["factories"] });
      void queryClient.invalidateQueries({ queryKey: ["period"] });
      void queryClient.invalidateQueries({ queryKey: ["periods", id] });
      writeDraft(id, null);
      setDraftState(null); setEffective(""); setNote(""); setStored(null);
      showToast(t(`Đã lưu cấu hình nhà máy v${updated.current_version}.`, `Factory set-up v${updated.current_version} saved.`), "success");
    },
  });
  const discard = () => { setDraft(null); setEffective(""); setNote(""); setStored(null); save.reset(); };

  if (query.isLoading) return <SkeletonCards count={3} />;
  if (query.isError || !data || !config) return <ErrorState message={t("Không tải được nhà máy.", "Could not load the factory.")} onRetry={() => void query.refetch()} />;

  const issueCount = (key: FactorySection) => issues.filter((issue) => issue.section === key).length;
  const sections: Array<{ key: FactorySection; icon: ReactNode; label: string; meta?: string }> = [
    { key: "process", icon: <Workflow />, label: t("Quy trình", "Process"), meta: String(config.stages.length) },
    { key: "products", icon: <Boxes />, label: t("Sản phẩm", "Products"), meta: String(Object.keys(config.products).length) },
    { key: "machines", icon: <Cog />, label: t("Máy", "Machines"), meta: String(Object.keys(config.machines).length) },
    { key: "molds", icon: <Layers />, label: t("Khuôn", "Molds"), meta: String(Object.keys(config.molds).length) },
    { key: "calendar", icon: <CalendarDays />, label: t("Ca & lịch nghỉ", "Shifts & calendar"), meta: String(Object.keys(config.shift_template).length) },
    { key: "policies", icon: <SlidersHorizontal />, label: t("Chính sách", "Policies"), meta: String(config.policies.length) },
    { key: "versions", icon: <History />, label: t("Phiên bản", "Versions"), meta: `v${data.current_version}` },
  ];
  const sectionLabel = (key: FactorySection) => sections.find((s) => s.key === key)?.label ?? key;
  const exportJson = () => downloadText(`${data.name.replace(/[^\p{L}\p{N}_-]+/gu, "-")}-v${data.current_version}${changes ? "-draft" : ""}.json`,
    JSON.stringify({ name: data.name, version: data.current_version, draft: changes > 0, config }, null, 2), "application/json");

  return (
    <div className="grid min-w-0 gap-4">
      <PageHeader title={data.name} crumb={data.name}
        meta={<Badge variant="info" title={t("Phiên bản cấu hình đang dùng", "Current set-up version")}>v{data.current_version}</Badge>}
        description={t("Dữ liệu nền ít thay đổi. Mỗi lần lưu tạo một phiên bản; kỳ đã lập giữ phiên bản cũ.", "Rarely-changing set-up. Each save creates a version; planned periods keep theirs.")}
        actions={<>
          <Button variant="outline" onClick={exportJson}><Download />{t("Tải JSON", "Download JSON")}</Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild><Button variant="outline" size="icon" aria-label={t("Thêm thao tác", "More actions")}><MoreHorizontal /></Button></DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => setRenaming(true)}><Pencil />{t("Đổi tên nhà máy", "Rename the factory")}</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </>} />

      {stored && (
        <Alert className={cn(stored.stale ? "border-warning/40 bg-warning-soft" : "border-primary/30 bg-accent/40")}>
          <AlertCircle className={stored.stale ? "text-warning" : "text-primary"} />
          <AlertDescription className="flex flex-wrap items-center justify-between gap-2">
            <span>{stored.stale
              ? t(`Có bản nháp chưa lưu từ ${formatDateTime(stored.draft.at)}, sửa trên v${stored.draft.version} — nay đã có v${data.current_version}. Mở lại rồi lưu sẽ ghi đè các thay đổi của v${data.current_version}.`, `There is an unsaved draft from ${formatDateTime(stored.draft.at)}, made on v${stored.draft.version} — v${data.current_version} exists now. Reopening and saving it overwrites v${data.current_version}'s changes.`)
              : t(`Đã mở lại bản nháp chưa lưu từ ${formatDateTime(stored.draft.at)}.`, `Reopened the unsaved draft from ${formatDateTime(stored.draft.at)}.`)}</span>
            <span className="flex gap-2">
              {stored.stale
                ? <><Button size="sm" variant="outline" onClick={() => { writeDraft(id, null); setStored(null); }}>{t("Bỏ bản nháp cũ", "Drop the old draft")}</Button><Button size="sm" variant="outline" onClick={() => { setDraft(stored.draft.config); setEffective(stored.draft.effective); setNote(stored.draft.note); setStored(null); }}>{t("Mở lại", "Reopen")}</Button></>
                : <Button size="sm" variant="ghost" onClick={() => setStored(null)}>{t("Đã hiểu", "OK")}</Button>}
            </span>
          </AlertDescription>
        </Alert>
      )}

      <div className="grid min-w-0 gap-4 md:grid-cols-[200px_minmax(0,1fr)]">
        <nav aria-label={t("Mục cấu hình", "Set-up sections")} className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1 md:sticky md:top-16 md:mx-0 md:flex-col md:self-start md:overflow-visible md:px-0">
          {sections.map((item) => {
            const dirty = dirtySections.has(item.key);
            const errors = item.key === "versions" ? 0 : issueCount(item.key);
            return (
              <button key={item.key} type="button" aria-current={section === item.key ? "page" : undefined} onClick={() => navigate({ section: item.key })}
                className={cn("flex shrink-0 items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none [&_svg]:size-4",
                  section === item.key ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground")}>
                {item.icon}<span className="flex-1 whitespace-nowrap">{item.label}</span>
                {errors > 0 ? <span className="rounded-full bg-destructive px-1.5 text-[11px] leading-4 font-semibold text-white" aria-label={t(`${errors} lỗi`, `${errors} errors`)}>{errors}</span>
                  : dirty ? <span className="size-2 rounded-full bg-warning" aria-label={t("có thay đổi chưa lưu", "unsaved changes")} title={t("Có thay đổi chưa lưu", "Unsaved changes")} />
                  : item.meta && <span className="text-xs tabular-nums">{item.meta}</span>}
              </button>
            );
          })}
        </nav>

        <div className="min-w-0">
          <FactoryEditProvider value={{ config, base: draft ? data.config : null, update, issues }}>
            {section === "process" && <ProcessSection />}
            {section === "products" && <ProductsSection />}
            {section === "machines" && <MachinesSection />}
            {section === "molds" && <MoldsSection />}
            {section === "calendar" && <CalendarSection />}
            {section === "policies" && <PoliciesSection />}
            {section === "versions" && <VersionsSection factoryId={id} versions={data.versions} current={data.current_version} config={config}
              onRestore={(restored, version) => { setDraft(clone(restored)); setNote(t(`Khôi phục từ v${version}`, `Restored from v${version}`)); navigate({ section: "process" }); showToast(t(`Đã đưa cấu hình v${version} vào bản nháp — kiểm tra rồi lưu.`, `v${version} loaded into the draft — review, then save.`), "info"); }} />}
          </FactoryEditProvider>

          {changes > 0 && (
            <div className="sticky bottom-3 z-30 mt-4" role="region" aria-label={t("Lưu phiên bản", "Save version")}>
              <div className="grid gap-3 rounded-lg border bg-popover/95 px-4 py-3 shadow-float backdrop-blur">
                <div className="flex flex-wrap items-end gap-3">
                  <div className="min-w-48 flex-1 text-sm">
                    <b className="text-warning">{t(`${changes} thay đổi chưa lưu`, `${changes} unsaved changes`)}</b>
                    <span className="block text-xs text-muted-foreground">
                      {t("Ở mục: ", "In: ")}
                      {[...dirtySections].map((key, index) => <span key={key}>{index > 0 && ", "}<button type="button" className="underline-offset-2 hover:text-foreground hover:underline" onClick={() => navigate({ section: key })}>{sectionLabel(key)}</button></span>)}
                      {" · "}{t("bản nháp được giữ trên trình duyệt này.", "the draft is kept in this browser.")}
                    </span>
                  </div>
                  <Field label={t("Hiệu lực từ (trống = ngay)", "Effective from (blank = now)")} className="w-full sm:w-40"><DateField value={effective} label={t("Hiệu lực từ", "Effective from")} onChange={(v) => { setEffective(v); persist(draft, { effective: v }); }} /></Field>
                  <Field label={t("Ghi chú thay đổi", "Change note")} className="w-full sm:w-56"><Input className="h-8" value={note} placeholder={t("vd. Thêm máy CNC_3", "e.g. Added CNC_3")} onChange={(event) => { setNote(event.target.value); persist(draft, { note: event.target.value }); }} /></Field>
                  <div className="flex gap-2">
                    <Button variant="outline" disabled={save.isPending} onClick={() => setConfirmDiscard(true)}>{t("Hủy thay đổi", "Discard")}</Button>
                    <Button disabled={save.isPending || issues.length > 0} title={issues.length ? t("Sửa các lỗi trước khi lưu", "Fix the errors before saving") : undefined} onClick={() => save.mutate()}>{save.isPending && <Loader2 className="animate-spin" />}{t(`Lưu thành v${data.current_version + 1}`, `Save as v${data.current_version + 1}`)}</Button>
                  </div>
                </div>
                {issues.length > 0 && (
                  <div role="alert" className="grid gap-1 rounded-md border border-destructive/30 bg-danger-soft px-3 py-2 text-sm">
                    <b className="text-destructive">{t(`${issues.length} lỗi cần sửa trước khi lưu`, `${issues.length} error(s) to fix before saving`)}</b>
                    <ul className="grid gap-0.5 text-xs">{issues.slice(0, 5).map((issue, index) => (
                      <li key={index}><button type="button" className="text-left hover:underline" onClick={() => navigate({ section: issue.section, item: issue.section === "products" ? issue.ref ?? null : null })}><span className="font-medium">{sectionLabel(issue.section)}:</span> {t(issue.vi, issue.en)}</button></li>
                    ))}{issues.length > 5 && <li className="text-muted-foreground">{t(`… và ${issues.length - 5} lỗi khác`, `… and ${issues.length - 5} more`)}</li>}</ul>
                  </div>
                )}
                <MutationNotice error={save.error} fallback={t("Cấu hình chưa hợp lệ.", "The set-up is not valid.")} />
              </div>
            </div>
          )}
        </div>
      </div>

      <RenameDialog open={renaming} detail={data} onClose={() => setRenaming(false)} />
      <ConfirmDialog open={confirmDiscard} title={t(`Bỏ ${changes} thay đổi chưa lưu?`, `Discard ${changes} unsaved changes?`)} description={t(`Bản nháp sẽ bị xóa và cấu hình quay về v${data.current_version}.`, `The draft is deleted and the set-up goes back to v${data.current_version}.`)}
        confirmLabel={t("Bỏ thay đổi", "Discard")} onCancel={() => setConfirmDiscard(false)} onConfirm={() => { setConfirmDiscard(false); discard(); }} />
      <AlertDialog open={leaveTo !== null} onOpenChange={(open) => { if (!open) setLeaveTo(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("Rời trang khi chưa lưu?", "Leave without saving?")}</AlertDialogTitle>
            <AlertDialogDescription>{t(`Có ${changes} thay đổi chưa lưu thành phiên bản. Bản nháp vẫn được giữ trên trình duyệt này và mở lại khi bạn quay lại, nhưng chưa áp dụng cho kỳ nào.`, `${changes} changes are not saved as a version. The draft stays in this browser and reopens when you come back, but no period uses it yet.`)}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("Ở lại", "Stay")}</AlertDialogCancel>
            <AlertDialogAction onClick={() => { const href = leaveTo; setLeaveTo(null); if (href) router.push(href); }}>{t("Rời trang, giữ bản nháp", "Leave, keep the draft")}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function RenameDialog({ open, detail, onClose }: { open: boolean; detail: FactoryDetail; onClose: () => void }) {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const [name, setName] = useState(detail.name);
  const mutation = useMutation({ mutationFn: () => renameFactory(detail.id, name.trim()), onSuccess: (updated) => { queryClient.setQueryData(["factory", detail.id], updated); void queryClient.invalidateQueries({ queryKey: ["factories"] }); onClose(); } });
  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>{t("Đổi tên nhà máy", "Rename the factory")}</DialogTitle><DialogDescription className="sr-only">{t("Tên nhà máy", "Factory name")}</DialogDescription></DialogHeader>
        <Input value={name} onChange={(event) => setName(event.target.value)} />
        <MutationNotice error={mutation.error} fallback={t("Không đổi tên được.", "Could not rename.")} />
        <DialogFooter><Button variant="outline" onClick={onClose}>{t("Hủy", "Cancel")}</Button><Button disabled={!name.trim() || mutation.isPending} onClick={() => mutation.mutate()}>{t("Lưu", "Save")}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** No plant yet: create one from a schema-5 file (the research datasets or an export). */
function Onboarding() {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(t("Nhà máy của tôi", "My factory"));
  const [doc, setDoc] = useState<{ file: string; content: unknown } | null>(null);
  const [error, setError] = useState("");
  const mutation = useMutation({ mutationFn: () => importFactory(name.trim(), doc!.content), onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: ["factories"] }); } });
  useEffect(() => { mutation.reset(); }, [doc]); // eslint-disable-line react-hooks/exhaustive-deps
  async function pick(file?: File) {
    if (!file) return;
    setError("");
    try {
      const content = JSON.parse(await file.text()) as { schema_version?: number; stages?: unknown };
      if (!content.stages || !("shift_template" in content)) throw new Error(t("File không phải dữ liệu nhà máy schema 5 (cần stages, shift_template, machines, products…).", "Not a schema-5 factory file (needs stages, shift_template, machines, products…)."));
      setDoc({ file: file.name, content });
    } catch (exc) {
      setError(exc instanceof Error ? exc.message : String(exc));
    } finally {
      if (inputRef.current) inputRef.current.value = "";
    }
  }
  return (
    <>
      <PageHeader title={t("Nhà máy", "Factory")} />
      <EmptyState icon={<Factory />} title={t("Thiết lập nhà máy một lần", "Set up the factory once")}
        description={t("Sản phẩm, máy, ca, lịch nghỉ và chính sách là dữ liệu nền — khai báo một lần, sau đó mỗi kỳ chỉ cần đơn hàng và tồn đầu kỳ. Bắt đầu nhanh bằng file JSON schema 5 (vd. dataset/wheel-factory-2weeks/raw_input.json): đơn trong file vào sổ đơn hàng và tạo luôn kỳ đầu tiên.", "Products, machines, shifts, rest days and policies are set-up data — enter them once; after that each period only needs orders and opening stock. Start quickly from a schema-5 JSON file (e.g. dataset/wheel-factory-2weeks/raw_input.json): its orders go to the order book and the first period is created.")}
        action={
          <div className="grid w-full max-w-md gap-3 text-left">
            <Field label={t("Tên nhà máy", "Factory name")}><Input value={name} onChange={(event) => setName(event.target.value)} /></Field>
            <input ref={inputRef} type="file" accept=".json,application/json" className="sr-only" onChange={(event) => void pick(event.target.files?.[0])} />
            <Button variant="outline" onClick={() => inputRef.current?.click()}><FileJson />{doc ? doc.file : t("Chọn file JSON schema 5", "Choose a schema-5 JSON file")}</Button>
            {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
            <MutationNotice error={mutation.error} fallback={t("Không tạo được nhà máy.", "Could not create the factory.")} />
            <Button disabled={!doc || !name.trim() || mutation.isPending} onClick={() => mutation.mutate()}>{mutation.isPending ? <Loader2 className="animate-spin" /> : <Upload />}{t("Tạo nhà máy", "Create the factory")}</Button>
          </div>
        } />
    </>
  );
}

export default function FactoryRoute() {
  return <Suspense fallback={<SkeletonCards count={3} />}><FactoryPage /></Suspense>;
}
