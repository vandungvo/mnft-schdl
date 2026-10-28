"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, ArrowLeft, ArrowRight, CheckCircle2, Loader2, Pin, Redo2, RotateCcw, Save, Undo2, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";

import { Field, Hint, Panel } from "@/components/blocks";
import { ConfirmDialog } from "@/components/confirm-dialog";
import type { WorkspaceCtx } from "@/components/decision/sections";
import { useI18n } from "@/components/i18n-provider";
import { ScheduleGantt } from "@/components/schedule-gantt";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { apiErrorMessage, previewScheduleEdit, saveScheduleEdit } from "@/lib/api";
import { fmtN, hours, opsCostOf, type Alternative } from "@/lib/decision";
import { formatClock, formatDuration, productLabel, stageLabel } from "@/lib/format";
import type { ScheduleEditIssue, ScheduleEditRequest, ScheduleOperation, SchedulingInputV5 } from "@/lib/types";
import { cn } from "@/lib/utils";

/* Planner in the loop (APS pattern: manual sequencing + automatic re-timing + live impact).
   The planner says what goes where and in which order; the backend rebuilds the times, runs the
   independent validator and scores the result. Nothing is stored until "Save as a new option". */

interface Plan {
  sequence: Record<string, string[]>;
  moved: string[];
  notBefore: Record<string, number>;
  /** What the planner did, newest last (shown as the edit log). */
  log: string[];
}

function sequenceOf(operations: ScheduleOperation[]): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const op of [...operations].sort((a, b) => a.block_start - b.block_start)) (out[op.machine] ??= []).push(op.lot);
  return out;
}

/** Horizon minute <-> value of a datetime-local input, in the factory's clock (the origin's offset). */
function useClock(origin: string) {
  const base = Date.parse(`${origin.slice(0, 16)}Z`);
  return {
    toInput: (minute: number) => new Date(base + minute * 60_000).toISOString().slice(0, 16),
    fromInput: (value: string) => Math.round((Date.parse(`${value}Z`) - base) / 60_000),
  };
}

export function ScheduleEditor({ ctx, base, onCancel, onSaved }: {
  ctx: WorkspaceCtx; base: Alternative; onCancel: () => void; onSaved: (runId: string) => void;
}) {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const input = ctx.input as SchedulingInputV5;
  const clock = useClock(ctx.origin);
  const initial = useMemo<Plan>(() => ({ sequence: sequenceOf(base.run.operations), moved: [], notBefore: {}, log: [] }), [base]);
  const [state, setState] = useState<{ past: Plan[]; present: Plan; future: Plan[] }>({ past: [], present: initial, future: [] });
  const [compact, setCompact] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [saveOpen, setSaveOpen] = useState(false);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const plan = state.present;
  const dirty = state.past.length > 0 || compact;

  const apply = useCallback((next: (plan: Plan) => Plan | null) => {
    setState((current) => {
      const value = next(current.present);
      return value ? { past: [...current.past, current.present], present: value, future: [] } : current;
    });
  }, []);
  const undo = useCallback(() => setState((s) => (s.past.length ? { past: s.past.slice(0, -1), present: s.past[s.past.length - 1], future: [s.present, ...s.future] } : s)), []);
  const redo = useCallback(() => setState((s) => (s.future.length ? { past: [...s.past, s.present], present: s.future[0], future: s.future.slice(1) } : s)), []);

  // Ctrl/⌘+Z, Ctrl/⌘+Shift+Z or Ctrl+Y, Esc — the shortcuts of every editor.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) return;
      const mod = event.ctrlKey || event.metaKey;
      if (mod && event.key.toLowerCase() === "z") { event.preventDefault(); if (event.shiftKey) redo(); else undo(); }
      else if (mod && event.key.toLowerCase() === "y") { event.preventDefault(); redo(); }
      else if (event.key === "Escape") setSelected(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [undo, redo]);

  const request: ScheduleEditRequest = useMemo(() => ({ sequence: plan.sequence, moved: plan.moved, not_before: plan.notBefore, compact }), [plan, compact]);
  const preview = useQuery({
    queryKey: ["edit-preview", base.id, JSON.stringify(request)],
    queryFn: ({ signal }) => previewScheduleEdit(base.id, request, signal),
    enabled: dirty,
    placeholderData: keepPreviousData,
    staleTime: Infinity,
  });
  const result = dirty ? preview.data : undefined;
  const operations = result?.operations.length ? result.operations : base.run.operations;
  const changed = useMemo(() => new Set(result?.changes.map((c) => c.run) ?? []), [result]);
  const opOf = (lot: string) => operations.find((op) => op.lot === lot) ?? base.run.operations.find((op) => op.lot === lot);
  const original = (lot: string) => base.run.operations.find((op) => op.lot === lot);

  const runOf = (lot: string) => input.runs.find((run) => run.id === lot);
  const eligible = (lot: string) => {
    const run = runOf(lot);
    return run ? Object.entries(input.machines).filter(([, spec]) => spec.stage === run.stage && run.item in spec.minutes_per_unit).map(([id]) => id) : [];
  };
  const machineOf = (lot: string) => Object.keys(plan.sequence).find((m) => plan.sequence[m].includes(lot)) ?? null;

  /* ---------- edits ---------- */
  const moveTo = (lot: string, machine: string, index: number | null, note: string, notBefore?: number) => apply((p) => {
    const from = Object.keys(p.sequence).find((m) => p.sequence[m].includes(lot));
    if (!from) return null;
    const sequence = { ...p.sequence, [from]: p.sequence[from].filter((id) => id !== lot) };
    const list = [...(sequence[machine] ?? [])];
    list.splice(index ?? list.length, 0, lot);
    sequence[machine] = list;
    return { ...p, sequence, moved: [...new Set([...p.moved, lot])], notBefore: notBefore == null ? p.notBefore : { ...p.notBefore, [lot]: notBefore }, log: [...p.log, note] };
  });
  const step = (lot: string, delta: -1 | 1) => {
    const machine = machineOf(lot);
    if (!machine) return;
    const index = plan.sequence[machine].indexOf(lot);
    const next = index + delta;
    if (next < 0 || next >= plan.sequence[machine].length) return;
    const other = plan.sequence[machine][next];
    moveTo(lot, machine, next, delta < 0 ? t(`${lot} làm trước ${other}`, `${lot} before ${other}`) : t(`${lot} làm sau ${other}`, `${lot} after ${other}`));
  };
  const setNotBefore = (lot: string, minute: number | null) => apply((p) => {
    const notBefore = { ...p.notBefore };
    if (minute == null) delete notBefore[lot]; else notBefore[lot] = Math.max(0, minute);
    return { ...p, notBefore, log: [...p.log, minute == null ? t(`${lot}: bỏ giờ sớm nhất`, `${lot}: earliest start cleared`) : t(`${lot}: không trước ${formatClock(ctx.origin, minute)}`, `${lot}: not before ${formatClock(ctx.origin, minute)}`)] };
  });
  const onDrop = (lot: string, machine: string, minute: number) => {
    // Place it among the target machine's runs by time; the drop time becomes its earliest start.
    const list = (plan.sequence[machine] ?? []).filter((id) => id !== lot);
    const index = list.filter((id) => (opOf(id)?.block_start ?? 0) < minute).length;
    const from = machineOf(lot);
    moveTo(lot, machine, index, from !== machine ? t(`${lot}: ${from} → ${machine}, từ ${formatClock(ctx.origin, minute)}`, `${lot}: ${from} → ${machine}, from ${formatClock(ctx.origin, minute)}`)
      : t(`${lot}: dời tới ${formatClock(ctx.origin, minute)}`, `${lot}: moved to ${formatClock(ctx.origin, minute)}`), minute);
    setSelected(lot);
  };

  /* ---------- save ---------- */
  const [label, setLabel] = useState("");
  const [note, setNote] = useState("");
  const save = useMutation({
    mutationFn: () => saveScheduleEdit(base.id, { ...request, label: label.trim() || null, note: note.trim() || null }),
    onSuccess: async (run) => {
      setSaveOpen(false);
      await queryClient.invalidateQueries({ queryKey: ["dataset-runs"] });
      onSaved(run.id);
    },
  });
  const canSave = Boolean(result?.valid && result.changes.length && !preview.isFetching);

  const sel = selected ? opOf(selected) : null;
  return (
    <div className="grid min-w-0 gap-4">
      <EditorBar
        title={<>{t("Đang sửa", "Editing")} <b>{ctx.displayName(base.id)}</b></>}
        dirty={dirty} canUndo={state.past.length > 0} canRedo={state.future.length > 0} canSave={canSave}
        compact={compact} onCompact={setCompact}
        onUndo={undo} onRedo={redo} onReset={() => { setState({ past: [], present: initial, future: [] }); setCompact(false); }}
        onCancel={() => (dirty ? setLeaveOpen(true) : onCancel())} onSave={() => { setLabel(""); setNote(""); save.reset(); setSaveOpen(true); }} />

      <Impact ctx={ctx} base={base} metrics={result?.metrics ?? null} checking={dirty && preview.isFetching} />
      <Status dirty={dirty} loading={preview.isFetching && !result} error={preview.error} issues={result?.issues ?? []} valid={result?.valid ?? true} origin={ctx.origin} onSelect={setSelected} />

      <div className="grid min-w-0 gap-4 2xl:grid-cols-[minmax(0,1fr)_340px]">
        <Panel flush className="min-w-0">
          <ScheduleGantt operations={operations} input={ctx.input} origin={ctx.origin} horizon={base.run.horizon_minutes}
            compare={dirty ? { operations: base.run.operations, label: t("bản gốc", "the original") } : null}
            edit={{ selected, changed, onSelect: setSelected, onDrop, canDrop: (lot, machine) => eligible(lot).includes(machine) }} />
        </Panel>
        <div className="grid content-start gap-4">
          {sel ? <RunPanel key={sel.lot} op={sel} original={original(sel.lot)} origin={ctx.origin} plan={plan} eligible={eligible(sel.lot)} clock={clock}
            onClose={() => setSelected(null)} onMachine={(machine) => {
              const list = (plan.sequence[machine] ?? []).filter((id) => id !== sel.lot);
              const index = list.filter((id) => (opOf(id)?.block_start ?? 0) < sel.block_start).length;
              moveTo(sel.lot, machine, index, t(`${sel.lot}: ${machineOf(sel.lot)} → ${machine}`, `${sel.lot}: ${machineOf(sel.lot)} → ${machine}`));
            }}
            onStep={(delta) => step(sel.lot, delta)} onNotBefore={(minute) => setNotBefore(sel.lot, minute)} />
            : <Panel title={t("Cách sửa", "How to edit")}>
              <ul className="grid gap-1.5 text-sm text-muted-foreground">
                <li>• {t("Kéo một thanh sang máy khác (cùng công đoạn) hoặc sang giờ khác.", "Drag a bar to another machine (same stage) or another time.")}</li>
                <li>• {t("Hoặc bấm một thanh để đổi máy, đổi thứ tự, đặt giờ sớm nhất.", "Or click a bar to change its machine, its order or its earliest start.")}</li>
                <li>• {t("Hệ thống tự xếp lại giờ, kiểm tra và tính lại KPI sau mỗi thay đổi.", "Times are rebuilt, checked and scored again after every change.")}</li>
                <li>• <kbd className="rounded border px-1 text-xs">Ctrl Z</kbd> {t("hoàn tác", "undo")} · <kbd className="rounded border px-1 text-xs">Ctrl Shift Z</kbd> {t("làm lại", "redo")}</li>
              </ul>
            </Panel>}
          <ChangesPanel log={plan.log} changes={result?.changes ?? []} onSelect={setSelected} />
        </div>
      </div>

      <Dialog open={saveOpen} onOpenChange={(open) => { if (!open && !save.isPending) setSaveOpen(false); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("Lưu thành phương án mới", "Save as a new option")}</DialogTitle>
            <DialogDescription>{t("Phương án gốc giữ nguyên. Bản sửa được xếp hạng cùng các phương án khác, có thể so sánh và chốt như bình thường.", "The original option is kept. The edit is ranked with the other options and can be compared and committed as usual.")}</DialogDescription>
          </DialogHeader>
          <Field label={t("Tên ngắn", "Short name")} hint={t("vd. “Chuyển CNC_1 sang ca chiều”", "e.g. “CNC_1 work to the late shift”")}>
            <Input autoFocus maxLength={80} value={label} onChange={(event) => setLabel(event.target.value)} />
          </Field>
          <Field label={t("Lý do sửa (tuỳ chọn)", "Why (optional)")}>
            <Textarea rows={3} maxLength={1000} value={note} onChange={(event) => setNote(event.target.value)} placeholder={t("vd. CNC_1 bảo trì đột xuất sáng thứ 3.", "e.g. CNC_1 has unplanned maintenance on Tuesday morning.")} />
          </Field>
          {save.isError && <p className="text-sm text-destructive">{apiErrorMessage(save.error, t("Không lưu được bản sửa.", "Could not save the edit."))}</p>}
          <DialogFooter>
            <Button variant="outline" disabled={save.isPending} onClick={() => setSaveOpen(false)}>{t("Hủy", "Cancel")}</Button>
            <Button disabled={save.isPending} onClick={() => save.mutate()}>{save.isPending ? <Loader2 className="animate-spin" /> : <Save />}{t("Lưu phương án", "Save option")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <ConfirmDialog open={leaveOpen} title={t("Bỏ các thay đổi?", "Discard the changes?")}
        description={t("Các thay đổi chưa lưu sẽ mất. Phương án gốc không bị ảnh hưởng.", "Unsaved changes are lost. The original option is not affected.")}
        confirmLabel={t("Bỏ thay đổi", "Discard")} onCancel={() => setLeaveOpen(false)} onConfirm={() => { setLeaveOpen(false); onCancel(); }} />
    </div>
  );
}

/* ---------- pieces ---------- */

function EditorBar({ title, dirty, canUndo, canRedo, canSave, compact, onCompact, onUndo, onRedo, onReset, onCancel, onSave }: {
  title: ReactNode; dirty: boolean; canUndo: boolean; canRedo: boolean; canSave: boolean; compact: boolean; onCompact: (value: boolean) => void;
  onUndo: () => void; onRedo: () => void; onReset: () => void; onCancel: () => void; onSave: () => void;
}) {
  const { t } = useI18n();
  return (
    <div className="sticky top-[6.5rem] z-20 flex flex-wrap items-center gap-2 rounded-lg border border-primary/40 bg-popover/95 px-3 py-2 shadow-float backdrop-blur" role="toolbar" aria-label={t("Sửa lịch", "Schedule editing")}>
      <span className="mr-auto min-w-0 truncate text-sm">{title}</span>
      <div className="flex items-center gap-1">
        <Button size="icon" variant="ghost" className="size-8" disabled={!canUndo} onClick={onUndo} aria-label={t("Hoàn tác", "Undo")} title={t("Hoàn tác (Ctrl Z)", "Undo (Ctrl Z)")}><Undo2 /></Button>
        <Button size="icon" variant="ghost" className="size-8" disabled={!canRedo} onClick={onRedo} aria-label={t("Làm lại", "Redo")} title={t("Làm lại (Ctrl Shift Z)", "Redo (Ctrl Shift Z)")}><Redo2 /></Button>
        <Button size="icon" variant="ghost" className="size-8" disabled={!dirty} onClick={onReset} aria-label={t("Đặt lại như bản gốc", "Reset to the original")} title={t("Đặt lại như bản gốc", "Reset to the original")}><RotateCcw /></Button>
      </div>
      <ToggleGroup type="single" variant="outline" size="sm" value={compact ? "compact" : "keep"} onValueChange={(value) => value && onCompact(value === "compact")} aria-label={t("Cách xếp lại giờ", "How times are rebuilt")}>
        <ToggleGroupItem value="keep" className="px-2.5 text-xs" title={t("Lượt không sửa giữ giờ cũ; chỉ lượt bị đẩy mới dời", "Untouched runs keep their time; only pushed runs move")}>{t("Giữ giờ các lượt khác", "Keep other times")}</ToggleGroupItem>
        <ToggleGroupItem value="compact" className="px-2.5 text-xs" title={t("Mọi lượt dồn về sớm nhất theo thứ tự hiện tại", "Every run starts as early as the current order allows")}>{t("Dồn sớm nhất", "Pack early")}</ToggleGroupItem>
      </ToggleGroup>
      <Button size="sm" variant="outline" onClick={onCancel}><X />{t("Thoát", "Exit")}</Button>
      <Button size="sm" disabled={!canSave} onClick={onSave}><Save />{t("Lưu thành phương án mới", "Save as new option")}</Button>
    </div>
  );
}

/** What the edit does to the figures the ranking uses, against the original (live, like a what-if panel). */
function Impact({ ctx, base, metrics, checking }: { ctx: WorkspaceCtx; base: Alternative; metrics: Record<string, number> | null; checking: boolean }) {
  const { t } = useI18n();
  const m0 = base.metrics;
  const n = ctx.nOrders;
  const items: Array<{ label: string; before: number; after: number | null; show: (v: number) => string; higherIsBetter?: boolean }> = [
    { label: t("Đúng hạn", "On time"), before: n - (m0.late_orders ?? 0), after: metrics ? n - (metrics.late_orders ?? 0) : null, show: (v) => `${v}/${n}`, higherIsBetter: true },
    { label: t("Tổng trễ", "Total lateness"), before: m0.total_tardiness ?? 0, after: metrics?.total_tardiness ?? null, show: hours },
    { label: t("Thiếu tồn an toàn", "Safety shortfall"), before: m0.safety_shortfall ?? 0, after: metrics?.safety_shortfall ?? null, show: (v) => `${fmtN(v)} ${t("sp", "units")}` },
    { label: t("Chi phí vận hành", "Operating cost"), before: opsCostOf(m0, ctx.weights), after: metrics ? opsCostOf(metrics, ctx.weights) : null, show: fmtN },
    { label: t("Ca-máy bật", "Machine-shifts"), before: m0.activated_shifts ?? base.shifts.size, after: metrics?.activated_shifts ?? null, show: fmtN },
  ];
  return (
    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5" aria-live="polite">
      {items.map((item) => {
        const value = item.after ?? item.before;
        const diff = item.after == null ? 0 : item.after - item.before;
        const good = item.higherIsBetter ? diff > 0 : diff < 0;
        return (
          <div key={item.label} className={cn("rounded-lg border bg-card px-3 py-2 shadow-card", checking && "opacity-70")}>
            <div className="text-xs text-muted-foreground">{item.label}</div>
            <div className="text-lg font-semibold tabular-nums">{item.show(value)}</div>
            <div className={cn("text-xs tabular-nums", diff === 0 ? "text-muted-foreground" : good ? "text-success" : "text-warning")}>
              {diff === 0 ? t("như bản gốc", "as original") : `${diff > 0 ? "+" : "−"}${item.show(Math.abs(diff)).replace(/\/\d+$/, "")} ${t("so với gốc", "vs original")}`}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function issueText(issue: ScheduleEditIssue, origin: string, t: (vi: string, en: string) => string): string {
  const at = issue.minute != null ? formatClock(origin, issue.minute) : "";
  const subject = issue.subject ?? "";
  switch (issue.code) {
    case "STOCK_CAP": return t(`Kho thành phẩm ${productLabel(subject)} vượt sức chứa lúc ${at}.`, `Finished stock of ${productLabel(subject)} exceeds the warehouse cap at ${at}.`);
    case "BTP_SHORT": return t(`Thiếu bán thành phẩm ${subject} lúc ${at}: lượt dùng nó chạy trước khi kịp làm ra.`, `Semi-finished ${subject} runs out at ${at}: a run uses it before it is made.`);
    case "BTP_CAPACITY": return t(`Kho bán thành phẩm ${subject} vượt sức chứa lúc ${at}.`, `Semi-finished buffer ${subject} exceeds its capacity at ${at}.`);
    case "FINISHED_SHORT": return t(`Không đủ ${productLabel(subject)} để giao lúc ${at}.`, `Not enough ${productLabel(subject)} to ship at ${at}.`);
    case "HORIZON": return t(`Lượt ${subject} bị đẩy ra ngoài cuối kỳ.`, `Run ${subject} is pushed past the end of the period.`);
    case "NO_FEASIBLE_SLOT": return t(`Không xếp được ${issue.runs.join(", ")}: chúng chờ bán thành phẩm chưa được làm trước, hoặc kỳ đã kín. Thử cho lượt công đoạn trước làm sớm hơn.`, `Cannot place ${issue.runs.join(", ")}: they wait for semi-finished stock not made before them, or the period is full. Try moving the upstream run earlier.`);
    default: return issue.raw;
  }
}

function Status({ dirty, loading, error, issues, valid, origin, onSelect }: {
  dirty: boolean; loading: boolean; error: unknown; issues: ScheduleEditIssue[]; valid: boolean; origin: string; onSelect: (lot: string) => void;
}) {
  const { t } = useI18n();
  if (!dirty) return <p className="text-sm text-muted-foreground">{t("Chưa có thay đổi. Kéo một thanh trên Gantt hoặc bấm vào nó để bắt đầu sửa.", "No changes yet. Drag a bar on the Gantt chart or click it to start editing.")}</p>;
  if (loading) return <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" />{t("Đang xếp lại và kiểm tra…", "Rebuilding and checking…")}</p>;
  if (error) return <p className="text-sm text-destructive">{apiErrorMessage(error, t("Không kiểm tra được bản sửa.", "Could not check the edit."))}</p>;
  if (valid) return <p className="flex items-center gap-2 rounded-lg border border-success/30 bg-success-soft px-3 py-2 text-sm text-success" role="status"><CheckCircle2 className="size-4" />{t("Lịch hợp lệ — đã qua bộ kiểm độc lập.", "Valid schedule — passed the independent validator.")}</p>;
  return (
    <div className="rounded-lg border border-destructive/30 bg-danger-soft px-3 py-2 text-sm text-destructive" role="alert">
      <p className="flex items-center gap-2 font-semibold"><AlertTriangle className="size-4" />{t("Bản sửa này chưa hợp lệ nên chưa lưu được:", "This edit is not valid yet, so it cannot be saved:")}</p>
      <ul className="mt-1 grid gap-0.5 pl-6">
        {issues.slice(0, 5).map((issue, index) => <li key={`${issue.code}-${index}`}>{issueText(issue, origin, t)}{issue.runs.length > 0 && <> <button type="button" className="font-semibold underline" onClick={() => onSelect(issue.runs[0])}>{t("Xem", "Show")}</button></>}</li>)}
        {issues.length > 5 && <li>{t(`… và ${issues.length - 5} lỗi khác.`, `… and ${issues.length - 5} more.`)}</li>}
      </ul>
      <p className="mt-1 text-xs">{t("Hoàn tác (Ctrl Z) hoặc chỉnh tiếp cho tới khi hợp lệ.", "Undo (Ctrl Z) or keep editing until it is valid.")}</p>
    </div>
  );
}

function RunPanel({ op, original, origin, plan, eligible, clock, onClose, onMachine, onStep, onNotBefore }: {
  op: ScheduleOperation; original: ScheduleOperation | undefined; origin: string; plan: Plan; eligible: string[];
  clock: { toInput: (minute: number) => string; fromInput: (value: string) => number };
  onClose: () => void; onMachine: (machine: string) => void; onStep: (delta: -1 | 1) => void; onNotBefore: (minute: number | null) => void;
}) {
  const { t } = useI18n();
  const machine = Object.keys(plan.sequence).find((m) => plan.sequence[m].includes(op.lot)) ?? op.machine;
  const list = plan.sequence[machine] ?? [];
  const index = list.indexOf(op.lot);
  const floor = plan.notBefore[op.lot];
  const [draft, setDraft] = useState<string | null>(null);
  const value = draft ?? clock.toInput(floor ?? op.block_start);
  const moved = original && (original.machine !== op.machine || original.block_start !== op.block_start);
  return (
    <Panel title={<span className="flex items-center justify-between gap-2"><span>{t("Lượt", "Run")} {op.lot}</span><Button size="icon" variant="ghost" className="size-7" onClick={onClose} aria-label={t("Bỏ chọn", "Deselect")}><X /></Button></span>}
      description={`${stageLabel(op.stage)}${op.item ? ` · ${productLabel(op.item)}` : ""} · ${formatClock(origin, op.block_start)} → ${formatClock(origin, op.end)} (${formatDuration(op.end - op.block_start)})`}>
      <div className="grid gap-4">
        {moved && original && <p className="rounded-md bg-surface-2 px-3 py-2 text-xs text-muted-foreground">{t("Bản gốc", "Original")}: {original.machine} · {formatClock(origin, original.block_start)}</p>}
        <Field label={t("Máy", "Machine")} hint={eligible.length <= 1 ? t("Chỉ có máy này làm được lượt này.", "Only this machine can make this run.") : undefined}>
          <Select value={machine} onValueChange={onMachine} disabled={eligible.length <= 1}>
            <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
            <SelectContent>{eligible.map((id) => <SelectItem key={id} value={id}>{id}</SelectItem>)}</SelectContent>
          </Select>
        </Field>
        {/* Groups of buttons are not <label>s (a label would forward clicks to its first button). */}
        <Group label={t("Thứ tự trên máy", "Order on the machine")} hint={t(`Lượt thứ ${index + 1} / ${list.length} trên ${machine}`, `Run ${index + 1} of ${list.length} on ${machine}`)}>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" disabled={index <= 0} onClick={() => onStep(-1)}><ArrowLeft />{t("Làm trước", "Earlier")}</Button>
            <Button size="sm" variant="outline" disabled={index < 0 || index >= list.length - 1} onClick={() => onStep(1)}>{t("Làm sau", "Later")}<ArrowRight /></Button>
          </div>
        </Group>
        <Group label={t("Không bắt đầu trước", "Not before")} hint={floor != null ? t("Lượt sẽ bắt đầu ở ô hợp lệ sớm nhất từ giờ này.", "The run starts at the earliest valid slot from this time.") : t("Chưa đặt: lượt bắt đầu sớm nhất có thể.", "Not set: the run starts as early as possible.")}>
          <div className="flex flex-wrap gap-2">
            <Input type="datetime-local" step={900} className="w-auto" aria-label={t("Không bắt đầu trước", "Not before")} value={value} onChange={(event) => setDraft(event.target.value)} />
            <Button size="sm" disabled={!draft} onClick={() => { if (draft) onNotBefore(clock.fromInput(draft)); setDraft(null); }}>{t("Áp dụng", "Apply")}</Button>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="ghost" onClick={() => onNotBefore(op.block_start)}><Pin />{t("Ghim giờ hiện tại", "Pin current time")}</Button>
            {floor != null && <Button size="sm" variant="ghost" onClick={() => { setDraft(null); onNotBefore(null); }}><X />{t("Bỏ giờ sớm nhất", "Clear")}</Button>}
          </div>
        </Group>
      </div>
    </Panel>
  );
}

function Group({ label, hint, children }: { label: string; hint?: ReactNode; children: ReactNode }) {
  return (
    <div role="group" aria-label={label} className="grid gap-1.5">
      <span className="text-xs font-semibold text-muted-foreground">{label}</span>
      {children}
      {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
    </div>
  );
}

function ChangesPanel({ log, changes, onSelect }: { log: string[]; changes: Array<{ run: string; from_machine: string; to_machine: string; from_start: number; to_start: number }>; onSelect: (lot: string) => void }) {
  const { t } = useI18n();
  if (!log.length) return null;
  return (
    <Panel title={t(`Thay đổi · ${log.length} thao tác, ${changes.length} lượt bị ảnh hưởng`, `Changes · ${log.length} edits, ${changes.length} runs affected`)}>
      <ol className="grid gap-1 text-sm">{log.map((line, index) => <li key={`${index}-${line}`} className="text-muted-foreground"><span className="mr-1.5 tabular-nums">{index + 1}.</span>{line}</li>)}</ol>
      {changes.length > 0 && <>
        <h4 className="mt-3 mb-1 text-xs font-semibold text-muted-foreground">{t("Lượt bị ảnh hưởng", "Affected runs")}</h4>
        <ul className="grid max-h-64 gap-0.5 overflow-y-auto text-xs">
          {changes.map((change) => {
            const shift = change.to_start - change.from_start;
            return <li key={change.run}><button type="button" className="flex w-full justify-between gap-2 rounded px-1 py-0.5 text-left hover:bg-muted" onClick={() => onSelect(change.run)}>
              <span className="font-medium">{change.run}</span>
              <span className="text-muted-foreground">{change.from_machine !== change.to_machine ? `${change.from_machine} → ${change.to_machine}` : ""}{shift ? ` ${shift > 0 ? "+" : "−"}${formatDuration(Math.abs(shift))}` : ""}</span>
            </button></li>;
          })}
        </ul>
      </>}
      <Hint>{t("Viền nét đứt trên Gantt đánh dấu các lượt này.", "These runs have a dashed outline on the Gantt chart.")}</Hint>
    </Panel>
  );
}
