"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, ArrowRight, Check, CheckCircle2, GitBranch, Loader2, MoreHorizontal, Pencil, RefreshCw, Trash2 } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";

import { Field, PageHeader } from "@/components/blocks";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { useI18n } from "@/components/i18n-provider";
import { MutationNotice } from "@/components/master-data/shared";
import type { StepState } from "@/components/scenario/workspace";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { createPeriodVariant, deletePeriod, renamePeriod, upgradePeriodFactory } from "@/lib/api";
import { fmtLocal, fmtRange, isOverdue, kindLabel, PERIOD_STATUS } from "@/lib/factory";
import type { ConfigChange, PeriodDetail, PeriodSummary } from "@/lib/factory-types";
import { cn } from "@/lib/utils";
import { KindBadge, PeriodStatusBadge } from "./shared";

/** Push ?tab= the same way the desk does (history API), so the desk's tabs follow. */
export function useTabLink() {
  const pathname = usePathname();
  return (tab: string) => {
    const query = new URLSearchParams(window.location.search);
    query.set("tab", tab);
    window.history.pushState(null, "", `${pathname}?${query.toString()}`);
  };
}

/** Where the period stands, per workflow tab — drawn as step marks on the desk's tabs. */
export function periodSteps(period: PeriodDetail): Record<string, StepState> {
  const s = period.status;
  return {
    prepare: period.counts.errors > 0 ? "blocked" : period.compiled_revision ? "done" : "current",
    options: period.runs.succeeded ? "done" : s === "ready" || s === "solving" ? "current" : "todo",
    decide: period.decision?.current ? "done" : s === "options" ? "current" : "todo",
    execute: s === "closed" ? "done" : period.decision ? "current" : "todo",
  };
}

/** The one thing to do next, with its button (GitHub's merge box): replaces reading four step cards. */
function NextStep({ period, goTab }: { period: PeriodDetail; goTab: (tab: string) => void }) {
  const { t } = useI18n();
  const s = period.status;
  if (s === "closed") return null;
  let tone: "info" | "warning" | "danger" | "success" = "info";
  let text: ReactNode;
  let action: [string, string] | null = null;
  if (isOverdue(period)) {
    tone = "warning";
    text = <><b>{t(`Kỳ đã kết thúc ngày ${fmtLocal(period.end_date)} nhưng chưa đóng.`, `The period ended on ${fmtLocal(period.end_date)} but is still open.`)}</b> {period.decision
      ? t("Đóng kỳ để ghi nhận đơn đã giao và chuyển đơn còn lại sang kỳ sau.", "Close it to record what was delivered and carry the rest to the next period.")
      : t("Chốt một phương án rồi đóng kỳ, để đơn chưa giao được chuyển sang kỳ sau.", "Commit an option, then close it so undelivered orders move to the next period.")}</>;
    action = period.decision ? ["execute", t("Đóng kỳ", "Close the period")] : period.runs.succeeded ? ["decide", t("Chốt phương án", "Commit an option")] : ["options", t("Sinh phương án", "Generate options")];
  } else if (s === "needs_fix") {
    tone = "danger";
    text = <><b>{t(`${period.counts.errors} lỗi đầu vào`, `${period.counts.errors} input errors`)}</b> {t("cần sửa trước khi sinh lịch.", "to fix before schedules can be generated.")}</>;
    action = ["prepare", t("Sửa ở bước Chuẩn bị", "Fix under Prepare")];
  } else if (s === "draft") {
    text = t("Kiểm tra đơn hàng và tồn đầu kỳ, rồi lưu để hệ thống kiểm tra đầu vào.", "Review the orders and opening stock, then save so the inputs get checked.");
    action = ["prepare", t("Tới bước Chuẩn bị", "Go to Prepare")];
  } else if (s === "options" && !period.decision?.current) {
    text = <>{t(`Đã có ${period.runs.succeeded} phương án.`, `${period.runs.succeeded} options are ready.`)} <b>{t("Bước tiếp: so sánh và chốt một lịch.", "Next: compare them and commit one.")}</b></>;
    action = ["options", t("Xem phương án", "Review options")];
  } else if (period.decision) {
    tone = "success";
    text = <>{t("Đã chốt", "Committed")} <b>“{period.decision.alternative}”</b>. {t("Bước tiếp: phát lệnh sản xuất, theo dõi sự cố, cuối kỳ thì đóng kỳ.", "Next: issue work orders, track incidents, and close the period at the end.")}</>;
    action = ["execute", t("Tới bước Thực hiện", "Go to Execute")];
  } else return null;
  const tones = { info: "border-primary/30 bg-info-soft text-primary", warning: "border-warning/40 bg-warning-soft text-warning", danger: "border-destructive/30 bg-danger-soft text-destructive", success: "border-success/30 bg-success-soft text-success" };
  const Icon = tone === "warning" || tone === "danger" ? AlertTriangle : tone === "success" ? CheckCircle2 : ArrowRight;
  return (
    <div role="status" className={cn("flex flex-col items-start gap-x-3 gap-y-2 rounded-lg border px-4 py-2.5 text-sm sm:flex-row sm:items-center", tones[tone])}>
      <span className="flex min-w-0 flex-1 items-start gap-3"><Icon className="mt-0.5 size-4 shrink-0" /><span className="min-w-0">{text}</span></span>
      {action && <Button size="sm" variant={tone === "info" ? "default" : "outline"} className="bg-card/60" onClick={() => goTab(action[0])}>{action[1]}<ArrowRight /></Button>}
    </div>
  );
}

export function PeriodHeader({ period, actions, snapshot, onChanged }: { period: PeriodDetail; actions?: ReactNode; snapshot?: ReactNode; onChanged: (period: PeriodDetail) => void }) {
  const { t } = useI18n();
  const router = useRouter();
  const queryClient = useQueryClient();
  const goTab = useTabLink();
  const [variantOpen, setVariantOpen] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const closed = period.status === "closed";

  const upgrade = useMutation({ mutationFn: () => upgradePeriodFactory(period.id), onSuccess: onChanged });
  const remove = useMutation({
    mutationFn: () => deletePeriod(period.id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["periods"] });
      router.push(period.parent_id ? `/periods/${period.parent_id}` : "/periods");
    },
  });


  return (
    <div className="grid min-w-0 gap-3">
      <PageHeader back={{ href: "/periods", label: t("Kỳ lập lịch", "Planning periods") }} crumb={period.variant_label ? `${period.name} · ${period.variant_label}` : period.name}
        title={<>{period.name}{period.variant_label && <span className="font-normal text-muted-foreground"> · {period.variant_label}</span>}</>}
        meta={<><PeriodStatusBadge status={period.status} />{isOverdue(period) && <Badge variant="warning">{t("Quá hạn đóng", "Overdue to close")}</Badge>}<KindBadge kind={period.kind} />{snapshot}</>}
        description={<>
          {fmtRange(period.start_date, period.end_date)} · {t(`${period.days} ngày`, `${period.days} days`)} · {t(`${period.counts.scheduled} đơn trong kỳ, ${period.counts.long_term} đơn sau kỳ`, `${period.counts.scheduled} orders in, ${period.counts.long_term} after`)} · {t("cấu hình nhà máy", "factory set-up")} <Link href="/factory" className="font-medium hover:underline">v{period.factory.pinned_version}</Link>
          {period.inputs.frozen_until != null && <> · {t(`giữ nguyên trước ${fmtLocal(period.inputs.opening.as_of)}`, `fixed before ${fmtLocal(period.inputs.opening.as_of)}`)}</>}
        </>}
        actions={<>
          <DropdownMenu>
            <DropdownMenuTrigger asChild><Button variant="outline" aria-label={t("Thao tác khác", "More actions")}><MoreHorizontal />{t("Thêm", "More")}</Button></DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-60">
              <DropdownMenuItem disabled={closed} onSelect={() => setVariantOpen(true)}><GitBranch />{t("Tạo biến thể what-if…", "Create a what-if variant…")}</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setRenameOpen(true)}><Pencil />{t("Đổi tên…", "Rename…")}</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" disabled={closed} onSelect={() => setDeleteOpen(true)}><Trash2 />{period.kind === "regular" ? t("Xóa kỳ…", "Delete period…") : t("Xóa phiên bản này…", "Delete this version…")}</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          {actions}
        </>} />

      {!closed && period.factory.applicable_version > period.factory.pinned_version && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-primary/30 bg-info-soft px-4 py-2.5 text-sm text-primary">
          <span>{t(`Cấu hình nhà máy v${period.factory.applicable_version} đã có hiệu lực cho kỳ này (kỳ đang dùng v${period.factory.pinned_version}).`, `Factory set-up v${period.factory.applicable_version} now applies to this period (it uses v${period.factory.pinned_version}).`)}</span>
          <Button size="sm" disabled={upgrade.isPending} onClick={() => upgrade.mutate()}>{upgrade.isPending ? <Loader2 className="animate-spin" /> : <RefreshCw />}{t(`Áp dụng v${period.factory.applicable_version}`, `Use v${period.factory.applicable_version}`)}</Button>
        </div>
      )}
      <MutationNotice error={upgrade.error ?? remove.error} fallback={t("Thao tác không thành công.", "The action failed.")} />

      <FamilyBar period={period} />
      <NextStep period={period} goTab={goTab} />


      {period.kind !== "regular" && period.changes_vs_parent.length > 0 && <ChangesPanel changes={period.changes_vs_parent} />}

      <VariantDialog open={variantOpen} period={period} onClose={() => setVariantOpen(false)} />
      <RenameDialog open={renameOpen} period={period} onClose={() => setRenameOpen(false)} onSaved={onChanged} />
      <ConfirmDialog open={deleteOpen} title={t("Xóa?", "Delete?")}
        description={t("Đầu vào, phương án và quyết định gắn với phiên bản này (và các biến thể/bản lập lại lịch con) sẽ bị xóa. Đơn trong sổ đơn hàng không bị ảnh hưởng.", "Inputs, options and decisions of this version (and its child variants/reschedules) are deleted. The order book is not affected.")}
        confirmLabel={t("Xóa", "Delete")} pending={remove.isPending} onCancel={() => setDeleteOpen(false)} onConfirm={() => { setDeleteOpen(false); remove.mutate(); }} />
    </div>
  );
}

/** The main period, its what-if variants and its reschedules, side by side: pick one to work on.
    Hidden while there is only the main period — creating a variant lives in the "More" menu. */
function FamilyBar({ period }: { period: PeriodDetail }) {
  const { t } = useI18n();
  if (period.family.length <= 1) return null;
  const label = (p: PeriodSummary) => p.kind === "regular" ? t("Kỳ chính", "Main") : p.variant_label ?? kindLabel(p.kind);
  return (
    <nav aria-label={t("Các phiên bản của kỳ", "Versions of the period")} className="flex flex-wrap items-center gap-1.5">
      {period.family.map((p) => {
        const here = p.id === period.id;
        const tone = PERIOD_STATUS[p.status];
        return (
          <Link key={p.id} href={`/periods/${p.id}`} aria-current={here ? "page" : undefined}
            className={cn("inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors hover:border-primary/60", here ? "border-primary bg-accent text-accent-foreground" : "bg-card text-muted-foreground")}>
            {p.kind === "variant" ? <GitBranch className="size-3" /> : p.kind === "reschedule" ? <RefreshCw className="size-3" /> : null}
            {label(p)}
            <span className={cn("size-1.5 rounded-full", tone.variant === "success" ? "bg-success" : tone.variant === "danger" ? "bg-destructive" : tone.variant === "warning" ? "bg-warning" : "bg-muted-foreground/50")} aria-label={t(...tone.label)} />
            {p.decision && <Check className="size-3 text-success" aria-label={t("đã chốt", "committed")} />}
          </Link>
        );
      })}
    </nav>
  );
}

function describe(change: ConfigChange): string {
  const parts = change.path.split(".");
  const show = (value: unknown) => value == null ? "—" : typeof value === "object" ? (Array.isArray(value) ? `[${value.length}]` : "…") : String(value);
  if (parts[0] === "orders") {
    if (change.before == null) return `+ ${parts[1]}`;
    if (change.after == null) return `− ${parts[1]}`;
    const before = change.before as Record<string, unknown>, after = change.after as Record<string, unknown>;
    const fields = Object.keys(after).filter((key) => JSON.stringify(before[key]) !== JSON.stringify(after[key]));
    return `${parts[1]}: ${fields.map((key) => `${key} ${show(before[key])} → ${show(after[key])}`).join(", ")}`;
  }
  if (parts[0] === "exceptions") return change.before == null ? `+ ${(change.after as { machine?: string })?.machine ?? "*"} ${(change.after as { start?: string })?.start ?? ""}` : change.after == null ? `− ${parts[1]}` : parts[1];
  return `${parts.join(" · ")}: ${show(change.before)} → ${show(change.after)}`;
}

function ChangesPanel({ changes }: { changes: ConfigChange[] }) {
  const { t } = useI18n();
  return (
    <details className="rounded-lg border bg-card px-4 py-2.5 text-sm shadow-card">
      <summary className="cursor-pointer font-medium">{t(`Khác với phiên bản gốc: ${changes.length} thay đổi`, `Differs from its parent: ${changes.length} changes`)}</summary>
      <ul className="mt-2 grid gap-1 text-xs text-muted-foreground">{changes.slice(0, 40).map((change) => <li key={change.path} className="font-mono">{describe(change)}</li>)}</ul>
    </details>
  );
}

function VariantDialog({ open, period, onClose }: { open: boolean; period: PeriodDetail; onClose: () => void }) {
  const { t } = useI18n();
  const router = useRouter();
  const [label, setLabel] = useState("");
  const mutation = useMutation({ mutationFn: () => createPeriodVariant(period.id, label.trim()), onSuccess: (variant) => { onClose(); setLabel(""); router.push(`/periods/${variant.id}?tab=prepare`); } });
  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("Tạo biến thể what-if", "Create a what-if variant")}</DialogTitle>
          <DialogDescription>{t("Bản sao đầu vào của phiên bản này. Đổi vài thứ (thêm đơn gấp, nghỉ một máy, đổi chính sách…) rồi sinh phương án để so với bản gốc. Biến thể nào được chốt thì đó là lịch thực hiện.", "A copy of this version's inputs. Change a few things (a rush order, a machine off, another policy…) and generate options to compare with the original. Whichever is committed becomes the plan.")}</DialogDescription>
        </DialogHeader>
        <Field label={t("Tên biến thể", "Variant name")}><Input autoFocus value={label} placeholder={t("vd. Thêm ca Chủ nhật", "e.g. Open Sundays")} onChange={(event) => setLabel(event.target.value)} /></Field>
        <MutationNotice error={mutation.error} fallback={t("Không tạo được biến thể.", "Could not create the variant.")} />
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>{t("Hủy", "Cancel")}</Button>
          <Button disabled={!label.trim() || mutation.isPending} onClick={() => mutation.mutate()}>{mutation.isPending && <Loader2 className="animate-spin" />}{t("Tạo biến thể", "Create variant")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RenameDialog({ open, period, onClose, onSaved }: { open: boolean; period: PeriodDetail; onClose: () => void; onSaved: (period: PeriodDetail) => void }) {
  const { t } = useI18n();
  const [name, setName] = useState(period.name);
  const [label, setLabel] = useState(period.variant_label ?? "");
  const mutation = useMutation({ mutationFn: () => renamePeriod(period.id, name.trim(), period.kind === "variant" ? label.trim() || null : null), onSuccess: (updated) => { onSaved(updated); onClose(); } });
  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>{t("Đổi tên", "Rename")}</DialogTitle><DialogDescription className="sr-only">{t("Tên kỳ lập lịch", "Period name")}</DialogDescription></DialogHeader>
        <Field label={t("Tên kỳ", "Period name")}><Input value={name} onChange={(event) => setName(event.target.value)} /></Field>
        {period.kind === "variant" && <Field label={t("Tên biến thể", "Variant name")}><Input value={label} onChange={(event) => setLabel(event.target.value)} /></Field>}
        <MutationNotice error={mutation.error} fallback={t("Không đổi tên được.", "Could not rename.")} />
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>{t("Hủy", "Cancel")}</Button>
          <Button disabled={!name.trim() || mutation.isPending} onClick={() => mutation.mutate()}>{t("Lưu", "Save")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
