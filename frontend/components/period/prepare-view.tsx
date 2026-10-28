"use client";

import { useMutation } from "@tanstack/react-query";
import { CalendarDays, ClipboardList, Loader2, Package, RefreshCw, SlidersHorizontal } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";

import { Panel } from "@/components/blocks";
import { useI18n } from "@/components/i18n-provider";
import { MutationNotice } from "@/components/master-data/shared";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { syncPeriodBook, updatePeriodInputs } from "@/lib/api";
import { addDays } from "@/lib/factory";
import type { FactoryConfig, PeriodDetail, PeriodInputs } from "@/lib/factory-types";
import { cn } from "@/lib/utils";
import { CalendarEditor } from "./calendar-editor";
import { OpeningEditor } from "./opening-editor";
import { OrdersEditor } from "./orders-editor";
import { PolicyEditor } from "./policy-editor";
import { IssueList, LoadBars } from "./shared";

type Section = "orders" | "opening" | "calendar" | "policy";

/** Everything that changes from one period to the next, edited as one draft and checked on save:
    the backend recompiles the period (lots, runs, calendars) and reports what is wrong in plain words. */
export function PrepareView({ period, config, onSaved }: { period: PeriodDetail; config: FactoryConfig; onSaved: (period: PeriodDetail) => void }) {
  const { t } = useI18n();
  const readOnly = period.status === "closed";
  // The draft is edited against the revision it came from; saving sends that revision, so a change
  // made elsewhere in the meantime is reported as a conflict instead of being overwritten.
  const [base, setBase] = useState({ revision: period.revision, inputs: period.inputs });
  const [draft, setDraft] = useState<PeriodInputs>(period.inputs);
  const [section, setSection] = useState<Section>(() => (period.issues.some((i) => i.code.startsWith("STOCK")) ? "opening" : "orders"));
  const dirty = JSON.stringify(draft) !== JSON.stringify(base.inputs);
  const movedOn = period.revision !== base.revision;
  if (movedOn && !dirty) {
    setBase({ revision: period.revision, inputs: period.inputs });
    setDraft(period.inputs);
  }

  const save = useMutation({
    mutationFn: () => updatePeriodInputs(period.id, base.revision, draft),
    onSuccess: (updated) => { setBase({ revision: updated.revision, inputs: updated.inputs }); setDraft(updated.inputs); onSaved(updated); },
  });
  const sync = useMutation({
    mutationFn: () => syncPeriodBook(period.id, period.revision),
    onSuccess: (updated) => { setBase({ revision: updated.revision, inputs: updated.inputs }); setDraft(updated.inputs); onSaved(updated); },
  });

  const horizon = `${addDays(period.end_date, 1)}T00:00`;
  const longTermDemand = useMemo(() => draft.orders.filter((o) => o.due > horizon).reduce<Record<string, number>>((acc, o) => ({ ...acc, [o.product]: (acc[o.product] ?? 0) + o.quantity }), {}), [draft.orders, horizon]);
  const patch = (value: Partial<PeriodInputs>) => setDraft((current) => ({ ...current, ...value }));
  const errors = period.issues.filter((i) => i.severity === "error");
  const sync_ = period.book_sync;
  const syncCount = sync_.added.length + sync_.changed.length + sync_.removed.length;
  const corrected = draft.opening.projected ? Object.keys(draft.opening.finished).filter((k) => draft.opening.finished[k] !== draft.opening.projected!.finished[k]).length : 0;

  const sections: Array<{ key: Section; icon: ReactNode; label: string; meta?: string; bad?: boolean }> = [
    { key: "orders", icon: <ClipboardList />, label: t("Đơn hàng", "Orders"), meta: String(draft.orders.length), bad: errors.some((i) => draft.orders.some((o) => o.code === i.ref)) },
    { key: "opening", icon: <Package />, label: t("Tồn đầu kỳ", "Opening stock"), meta: corrected ? t(`${corrected} đã chỉnh`, `${corrected} edited`) : undefined, bad: errors.some((i) => i.code.startsWith("STOCK")) },
    { key: "calendar", icon: <CalendarDays />, label: t("Lịch máy", "Machine calendar"), meta: draft.exceptions.length ? String(draft.exceptions.length) : undefined },
    { key: "policy", icon: <SlidersHorizontal />, label: t("Chính sách", "Policy"), bad: errors.some((i) => i.code.startsWith("RESERVE")) },
  ];

  return (
    <div className="grid min-w-0 gap-4">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <Panel title={errors.length ? t(`${errors.length} lỗi cần sửa trước khi lập lịch`, `${errors.length} errors to fix before scheduling`) : t("Kiểm tra đầu vào", "Input check")}
          description={period.compiled_revision !== period.revision && !errors.length ? undefined : period.dataset_id && errors.length ? t("Phương án hiện có vẫn dựa trên lần lưu hợp lệ gần nhất.", "Existing options still use the last valid save.") : undefined}>
          <IssueList issues={period.issues} onSelect={(issue) => setSection(issue.code.startsWith("STOCK") ? "opening" : issue.code.startsWith("RESERVE") ? "policy" : "orders")} />
          {period.inputs.notes.length > 0 && <ul className="mt-3 grid gap-1 border-t pt-3 text-xs text-muted-foreground">{period.inputs.notes.map((note) => <li key={note}>• {note}</li>)}</ul>}
        </Panel>
        <Panel title={t("Tải công đoạn (ước tính, chưa tính setup)", "Stage load (estimate, setups excluded)")}><LoadBars load={period.load} config={config} /></Panel>
      </div>

      {!readOnly && syncCount > 0 && (
        <Alert className="border-primary/30 bg-info-soft">
          <RefreshCw className="text-primary" />
          <AlertDescription className="flex flex-wrap items-center justify-between gap-2 text-primary">
            <span>{t("Sổ đơn hàng đã thay đổi so với kỳ này:", "The order book changed since this period took its orders:")} {[
              sync_.added.length && t(`${sync_.added.length} đơn mới`, `${sync_.added.length} new`),
              sync_.changed.length && t(`${sync_.changed.length} đơn sửa`, `${sync_.changed.length} changed`),
              sync_.removed.length && t(`${sync_.removed.length} đơn huỷ`, `${sync_.removed.length} cancelled`),
            ].filter(Boolean).join(" · ")}.</span>
            <Button size="sm" disabled={dirty || sync.isPending} title={dirty ? t("Lưu hoặc hủy thay đổi trước", "Save or discard your changes first") : undefined} onClick={() => sync.mutate()}>
              {sync.isPending ? <Loader2 className="animate-spin" /> : <RefreshCw />}{t("Cập nhật vào kỳ", "Update the period")}
            </Button>
          </AlertDescription>
        </Alert>
      )}
      <MutationNotice error={sync.error} fallback={t("Không cập nhật được từ sổ đơn.", "Could not update from the order book.")} />

      <div className="grid min-w-0 gap-4 md:grid-cols-[190px_minmax(0,1fr)]">
        <nav aria-label={t("Mục chuẩn bị", "Preparation sections")} className="flex gap-1 overflow-x-auto md:sticky md:top-28 md:flex-col md:self-start">
          {sections.map((item) => (
            <button key={item.key} type="button" aria-current={section === item.key ? "page" : undefined} onClick={() => setSection(item.key)}
              className={cn("flex shrink-0 items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none [&_svg]:size-4",
                section === item.key ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground")}>
              {item.icon}<span className="flex-1 whitespace-nowrap">{item.label}</span>
              {item.meta && <span className="text-xs tabular-nums">{item.meta}</span>}
              {item.bad && <span className="size-2 rounded-full bg-destructive" aria-label={t("có lỗi", "has errors")} />}
            </button>
          ))}
        </nav>
        <div className="min-w-0">
          {section === "orders" && <OrdersEditor orders={draft.orders} onChange={(orders) => patch({ orders })} config={config} endDate={period.end_date} issues={period.issues} readOnly={readOnly} />}
          {section === "opening" && <OpeningEditor opening={draft.opening} onChange={(opening) => patch({ opening })} config={config} readOnly={readOnly} />}
          {section === "calendar" && <CalendarEditor exceptions={draft.exceptions} onChange={(exceptions) => patch({ exceptions })} config={config} startDate={period.start_date} days={period.days} frozenUntil={draft.frozen_until} readOnly={readOnly} />}
          {section === "policy" && <PolicyEditor inputs={draft} onChange={patch} config={config} longTermDemand={longTermDemand} readOnly={readOnly} />}
        </div>
      </div>

      {dirty && !readOnly && (
        <div className="sticky bottom-3 z-30" role="region" aria-label={t("Lưu thay đổi", "Save changes")}>
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-popover/95 px-4 py-2.5 shadow-float backdrop-blur">
            <span className="text-sm"><b className="text-warning">{t("Có thay đổi chưa lưu.", "Unsaved changes.")}</b>{movedOn && <b className="text-destructive"> {t("Kỳ vừa được sửa ở nơi khác — lưu sẽ báo xung đột; hãy hủy và làm lại trên bản mới.", "The period was changed elsewhere — saving will conflict; discard and redo on the new version.")}</b>} <span className="text-muted-foreground">{period.runs.current ? t("Lưu sẽ kiểm tra lại đầu vào; các phương án hiện có được giữ nhưng đánh dấu là của đầu vào cũ.", "Saving re-checks the inputs; existing options are kept but marked as based on the old inputs.") : t("Lưu sẽ kiểm tra lại đầu vào và tính lại lô, lượt.", "Saving re-checks the inputs and recomputes lots and runs.")}</span></span>
            <div className="flex gap-2">
              <Button variant="outline" disabled={save.isPending} onClick={() => { setDraft(base.inputs); save.reset(); }}>{t("Hủy thay đổi", "Discard")}</Button>
              <Button disabled={save.isPending} onClick={() => save.mutate()}>{save.isPending && <Loader2 className="animate-spin" />}{t("Lưu & kiểm tra", "Save & check")}</Button>
            </div>
          </div>
          {save.isError && <div className="mt-2"><MutationNotice error={save.error} fallback={t("Không lưu được.", "Could not save.")} /></div>}
        </div>
      )}
    </div>
  );
}
