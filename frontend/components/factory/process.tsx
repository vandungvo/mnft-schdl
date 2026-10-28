"use client";

import { ArrowDown, ArrowLeft, ArrowRight, Plus } from "lucide-react";
import { Fragment, useState, type ReactNode } from "react";

import { Field, Panel } from "@/components/blocks";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { useI18n } from "@/components/i18n-provider";
import { ProductDot } from "@/components/master-data/shared";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { productName, stageName } from "@/lib/factory";
import {
  clone, insertStage, isChangedAt, itemsOfStage, moldStage, moveStage, moveStageBlock, removeStage, removeStageBlock, type MoveReport,
  slugStage, STAGE_CODE, stageFootprint, suggestStageCodes,
} from "@/lib/factory-config";
import type { FactoryConfig } from "@/lib/factory-types";
import { cn } from "@/lib/utils";

import { changedClass, defaultPlaceholder, EditSheet, NumberField, TimeField, useFactoryEdit, useFactoryLocation } from "./fields";
import { CODE } from "./products";

/* Process: a compact flow strip (read at a glance). Stages are edited in a drawer, added from the
   panel button or an insertion point between two stages, and reordered/removed from the drawer.
   Every product follows the same stage sequence; flexibility is in the machines of each stage. */
export function ProcessSection() {
  const { t } = useI18n();
  const { config, base, update } = useFactoryEdit();
  const { item, navigate } = useFactoryLocation();
  const [adding, setAdding] = useState<number | null>(null);
  const stages = config.stages;
  const open = item && stages.includes(item) ? item : null;
  const changed = (...path: Array<string | number>) => isChangedAt(base, config, path);
  const molded = moldStage(config);
  const newStages = base ? stages.filter((s) => !base.stages.includes(s)) : [];
  const orderChanged = !!base && base.stages.filter((s) => stages.includes(s)).join() !== stages.filter((s) => base.stages.includes(s)).join();

  return (
    <div className="grid gap-4">
      <Panel title={t("Quy trình sản xuất", "Production process")}
        description={t("Mọi sản phẩm đi qua các công đoạn theo cùng thứ tự; mỗi công đoạn làm theo lượt cố định và có thể có nhiều máy song song. Bấm một công đoạn để sửa, đổi vị trí hoặc xóa.", "Every product passes the stages in the same order; each stage works in fixed-size runs and may have several parallel machines. Click a stage to edit, move or remove it.")}
        actions={<Button size="sm" variant="outline" onClick={() => setAdding(Math.max(0, stages.length - 1))}><Plus />{t("Thêm công đoạn", "Add stage")}</Button>}>
        <ol className="flex flex-col items-stretch gap-1 lg:flex-row lg:items-stretch lg:gap-0">
          {stages.map((stage, index) => {
            const machines = Object.values(config.machines).filter((m) => m.stage === stage);
            const continuous = machines.length > 0 && machines.every((m) => m.calendar === "continuous");
            const isNew = newStages.includes(stage);
            const stageChanged = isNew || changed("stage_names", stage) || changed("run_size", stage);
            const last = index === stages.length - 1;
            return (
              <Fragment key={stage}>
                <li className="min-w-0 lg:flex-1">
                  <button type="button" onClick={() => navigate({ item: stage })} aria-current={open === stage ? "true" : undefined}
                    className={cn("grid h-full w-full content-start gap-1 rounded-lg border bg-card p-3 text-left transition-colors hover:border-primary/60 hover:bg-accent/40 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                      stageChanged && changedClass, open === stage && "border-primary ring-1 ring-primary")}>
                    <span className="flex items-center gap-1.5 text-xs text-muted-foreground"><span className="tabular-nums">{index + 1}</span>·<code className="truncate">{stage}</code>{isNew && <Badge variant="warning" className="ml-auto px-1.5 py-0 text-[10px]">{t("mới", "new")}</Badge>}</span>
                    <span className="truncate font-semibold">{stageName(config, stage)}</span>
                    <span className="text-sm tabular-nums">{t(`Lượt ${config.run_size[stage]} sp`, `Runs of ${config.run_size[stage]}`)}</span>
                    <span className="text-xs text-muted-foreground">{t(`${machines.length} máy · ${itemsOfStage(config, stage).length} mã`, `${machines.length} machines · ${itemsOfStage(config, stage).length} items`)}</span>
                    {(continuous || molded === stage || last) && (
                      <span className="mt-0.5 flex flex-wrap gap-1">
                        {continuous && <Badge variant="secondary" className="px-1.5 py-0 text-[10px]">24/7</Badge>}
                        {molded === stage && <Badge variant="secondary" className="px-1.5 py-0 text-[10px]">{t("khuôn", "molds")}</Badge>}
                        {last && <Badge variant="outline" className="px-1.5 py-0 text-[10px]">{t("ra thành phẩm", "makes products")}</Badge>}
                      </span>
                    )}
                  </button>
                </li>
                {index < stages.length - 1 && (
                  <li className={cn("group relative flex shrink-0 items-center justify-center gap-1 px-1 text-xs text-muted-foreground tabular-nums lg:w-10 lg:flex-col lg:px-0", changed("transfer_minutes", stage) && "font-semibold text-warning")}>
                    <span className="flex items-center gap-1 transition-opacity group-focus-within:opacity-0 group-hover:opacity-0 lg:flex-col" aria-hidden>
                      <ArrowDown className="size-4 lg:hidden" /><ArrowRight className="hidden size-4 lg:block" />
                      <span>{config.transfer_minutes[stage] ?? 0}′</span>
                    </span>
                    <span className="sr-only">{t(`Chuyển sang công đoạn sau: ${config.transfer_minutes[stage] ?? 0} phút`, `Transfer to next stage: ${config.transfer_minutes[stage] ?? 0} min`)}</span>
                    <button type="button" onClick={() => setAdding(index + 1)} aria-label={t(`Chèn công đoạn giữa ${stageName(config, stage)} và ${stageName(config, stages[index + 1])}`, `Insert a stage between ${stageName(config, stage)} and ${stageName(config, stages[index + 1])}`)}
                      title={t("Chèn công đoạn ở đây", "Insert a stage here")}
                      className="absolute inset-0 m-auto grid size-7 place-items-center rounded-full border border-primary/50 bg-card text-primary opacity-0 shadow-card transition-opacity group-hover:opacity-100 hover:bg-accent focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none">
                      <Plus className="size-4" />
                    </button>
                  </li>
                )}
              </Fragment>
            );
          })}
        </ol>
        <p className="mt-3 text-xs text-muted-foreground">{t("Số trên mũi tên: phút chuyển hàng sang công đoạn sau. Rê chuột vào mũi tên để chèn công đoạn ở giữa.", "Number on the arrow: minutes to move goods to the next stage. Hover an arrow to insert a stage there.")}</p>
        {orderChanged && <p className="mt-1 text-xs font-medium text-warning">{t("Thứ tự công đoạn đã đổi so với phiên bản đang dùng.", "The stage order differs from the current version.")}</p>}
      </Panel>

      <Panel title={t("Mặc định khi lập lịch", "Planning defaults")}>
        <div className="grid items-start gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field label={t("Độ dài kỳ (ngày)", "Period length (days)")} hint={t("1–62 ngày.", "1–62 days.")}>
            <NumberField min={1} max={62} value={config.period_days} label={t("Độ dài kỳ (ngày)", "Period length (days)")} changed={changed("period_days")} onChange={(v) => update((c) => { c.period_days = v; })} />
          </Field>
          <Field label={t("Nhìn trước đơn dài hạn (ngày)", "Long-term look-ahead (days)")} hint={t("Đơn sau kỳ trong khoảng này được tính để làm trước.", "After-period orders within this window feed pull-ahead.")}>
            <NumberField max={180} value={config.lookahead_days} label={t("Nhìn trước đơn dài hạn (ngày)", "Long-term look-ahead (days)")} changed={changed("lookahead_days")} onChange={(v) => update((c) => { c.lookahead_days = v; })} />
          </Field>
          <Field label={t("Giờ giao mặc định", "Default due time")} hint={t("Dùng khi file đơn không có giờ (24 giờ).", "Used when an order file has no time (24-hour).")}>
            <TimeField className="w-full" value={toMinutes(config.default_due_time)} label={t("Giờ giao mặc định", "Default due time")} changed={changed("default_due_time")}
              onChange={(v) => update((c) => { c.default_due_time = `${String(Math.floor(v / 60)).padStart(2, "0")}:${String(v % 60).padStart(2, "0")}`; })} />
          </Field>
          <Field label={t("Múi giờ", "Time zone")} hint={t("Cố định theo nhà máy.", "Fixed for the plant.")}><Input className="h-8" value={`UTC${config.utc_offset}`} disabled /></Field>
        </div>
      </Panel>

      {open && <StageSheet stage={open} onClose={() => navigate({ item: null })} />}
      {adding !== null && <AddStageDialog initialIndex={adding} onClose={() => setAdding(null)} onAdded={(code) => { setAdding(null); navigate({ item: code }); }} />}
    </div>
  );
}

function toMinutes(hm: string): number {
  const [h, m] = hm.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

/* ---------------------------------------------------------------- stage drawer: edit, move, remove */

function StageSheet({ stage, onClose }: { stage: string; onClose: () => void }) {
  const { t } = useI18n();
  const { config, base, update } = useFactoryEdit();
  const { navigate } = useFactoryLocation();
  const [confirmMove, setConfirmMove] = useState<{ to: number; report: MoveReport } | null>(null);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const stages = config.stages;
  const index = stages.indexOf(stage);
  const last = index === stages.length - 1;
  const next = stages[index + 1];
  const changed = (...path: string[]) => isChangedAt(base, config, path);
  const machines = Object.entries(config.machines).filter(([, m]) => m.stage === stage);
  const removeBlock = removeStageBlock(config, stage);
  const footprint = stageFootprint(config, stage);

  // Dry-run on a copy: a move that changes the last stage or splits shared codes is confirmed first.
  const moveTo = (to: number) => {
    const report = moveStage(clone(config), index, to);
    if (report.lastChanged || report.split.length) setConfirmMove({ to, report });
    else update((c) => { moveStage(c, index, to); });
  };
  const moveButton = (to: number, label: string, icon: ReactNode, iconAfter?: boolean) => {
    const outOfRange = to < 0 || to >= stages.length;
    const block = outOfRange ? null : moveStageBlock(config, index, to);
    return (
      <Button variant="outline" size="sm" disabled={outOfRange || !!block} title={block ? t(...block) : undefined} onClick={() => moveTo(to)}>
        {!iconAfter && icon}{label}{iconAfter && icon}
      </Button>
    );
  };
  const moveDescription = (report: MoveReport) => [
    report.lastChanged && t(
      `${stageName(config, report.lastChanged[1])} sẽ thành công đoạn cuối và làm thẳng sản phẩm; ${stageName(config, report.lastChanged[0])} chuyển sang làm mã bán thành phẩm mới.`,
      `${stageName(config, report.lastChanged[1])} becomes the last stage and makes the products; ${stageName(config, report.lastChanged[0])} switches to new semi-finished codes.`),
    report.split.length > 0 && t(
      `Hàng tới từ nhánh khác nhau nên mã dùng chung được tách: ${report.split.map((x) => `${x.code} → ${x.into.join(" + ")}`).join("; ")}.`,
      `Goods now arrive from different branches, so shared codes are split: ${report.split.map((x) => `${x.code} → ${x.into.join(" + ")}`).join("; ")}.`),
    t("Định mức và thời gian chuyển đổi được giữ — nên kiểm tra lại ở mục Máy.", "Rates and changeovers are kept — review them under Machines."),
  ].filter(Boolean).join(" ");

  return (
    <EditSheet open onClose={onClose}
      title={<>{t(`Công đoạn ${index + 1}/${stages.length}`, `Stage ${index + 1}/${stages.length}`)} · {stageName(config, stage)} <code className="text-xs font-normal text-muted-foreground">{stage}</code></>}
      actions={<Button variant="outline" className="text-destructive" disabled={!!removeBlock} title={removeBlock ? t(...removeBlock) : undefined} onClick={() => setConfirmRemove(true)}>{t("Xóa công đoạn", "Remove stage")}</Button>}>
      <div className="grid gap-5">
        <div className="grid gap-4">
          <Field label={t("Tên hiển thị", "Display name")}>
            <Input className={cn("h-8", changed("stage_names", stage) && changedClass)} value={config.stage_names[stage] ?? ""} placeholder={defaultPlaceholder(t, stageName(null, stage))}
              onChange={(event) => update((c) => { c.stage_names[stage] = event.target.value; if (!event.target.value) delete c.stage_names[stage]; })} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t("Cỡ lượt (sản phẩm)", "Run size (units)")} hint={t("Mỗi lượt máy làm đúng số này.", "Every run makes exactly this many.")}>
              <NumberField min={1} value={config.run_size[stage]} label={t("Cỡ lượt (sản phẩm)", "Run size (units)")} changed={changed("run_size", stage)} onChange={(v) => update((c) => { c.run_size[stage] = v; })} />
            </Field>
            {!last && (
              <Field label={t(`Chuyển sang ${stageName(config, next)} (phút)`, `Transfer to ${stageName(config, next)} (min)`)}>
                <NumberField value={config.transfer_minutes[stage] ?? 0} label={t("Thời gian chuyển (phút)", "Transfer time (min)")} changed={changed("transfer_minutes", stage)} onChange={(v) => update((c) => { c.transfer_minutes[stage] = v; })} />
              </Field>
            )}
          </div>
        </div>

        <section className="grid gap-2">
          <h3 className="text-sm font-semibold">{t("Vị trí trong quy trình", "Position in the process")}</h3>
          <FlowPreview stages={stages} highlight={stage} config={config} />
          <div className="flex flex-wrap gap-2">
            {moveButton(index - 1, t("Lên trước", "Earlier"), <ArrowLeft />)}
            {moveButton(index + 1, t("Ra sau", "Later"), <ArrowRight />, true)}
          </div>
          <p className="text-xs text-muted-foreground">{t("Đổi thứ tự là thay đổi luồng vật liệu: mã bán thành phẩm và định mức vẫn gắn với công đoạn, hãy kiểm tra lại sau khi đổi.", "Reordering changes the material flow: semi-finished codes and rates stay with their stage — review them afterwards.")}</p>
        </section>

        <section className="grid gap-2 text-sm">
          <h3 className="font-semibold">{last ? t("Sản phẩm làm ra", "Products made") : t("Mã bán thành phẩm làm ra", "Semi-finished codes made")}</h3>
          <span className="flex flex-wrap gap-1 text-xs">{itemsOfStage(config, stage).map((code) => <span key={code} className="rounded bg-muted px-1.5 py-0.5 font-mono">{code}</span>)}</span>
        </section>

        <section className="grid gap-2 text-sm">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-semibold">{t(`Máy (${machines.length})`, `Machines (${machines.length})`)}</h3>
            <Button size="xs" variant="ghost" onClick={() => navigate({ section: "machines" })}>{t("Mở mục Máy", "Open Machines")}<ArrowRight /></Button>
          </div>
          <ul className="grid gap-1">{machines.map(([code, m]) => (
            <li key={code}><button type="button" className="flex w-full items-center justify-between rounded-md px-2 py-1 text-left hover:bg-muted" onClick={() => navigate({ section: "machines", item: code })}>
              <span className="font-medium">{m.name || code}</span><span className="text-xs text-muted-foreground">{m.calendar === "continuous" ? "24/7" : t("theo ca", "shifts")} · {Object.keys(m.minutes_per_unit).length} {t("mã", "items")}</span>
            </button></li>
          ))}</ul>
        </section>
      </div>

      <ConfirmDialog open={confirmMove !== null} title={t("Đổi thứ tự công đoạn?", "Reorder the stages?")}
        description={confirmMove ? moveDescription(confirmMove.report) : ""}
        confirmLabel={t("Đổi thứ tự", "Reorder")} onCancel={() => setConfirmMove(null)} onConfirm={() => { const to = confirmMove!.to; setConfirmMove(null); update((c) => { moveStage(c, index, to); }); }} />
      <ConfirmDialog open={confirmRemove} title={t(`Xóa công đoạn ${stageName(config, stage)}?`, `Remove stage ${stageName(config, stage)}?`)}
        description={[
          t(`Bỏ khỏi bản nháp: ${footprint.machines.length} máy${footprint.machines.length ? ` (${footprint.machines.join(", ")})` : ""}`, `Removed from the draft: ${footprint.machines.length} machine(s)${footprint.machines.length ? ` (${footprint.machines.join(", ")})` : ""}`)
            + (footprint.codes.length ? t(`, ${footprint.codes.length} mã bán thành phẩm`, `, ${footprint.codes.length} semi-finished code(s)`) : "")
            + (footprint.molds.length ? t(`, ${footprint.molds.length} khuôn`, `, ${footprint.molds.length} mold(s)`) : "")
            + (footprint.rules ? t(`, ${footprint.rules} lịch bảo trì`, `, ${footprint.rules} maintenance slot(s)`) : "") + ".",
          last
            ? t(`${stageName(config, stages[index - 1])} sẽ thành công đoạn cuối và làm thẳng sản phẩm.`, `${stageName(config, stages[index - 1])} becomes the last stage and makes the products.`)
            : index === 0
              ? t(`Quy trình sẽ bắt đầu từ ${stageName(config, next)}.`, `The process will start at ${stageName(config, next)}.`)
              : t(`Hàng sẽ đi thẳng từ ${stageName(config, stages[index - 1])} sang ${stageName(config, next)}.`, `Goods will go straight from ${stageName(config, stages[index - 1])} to ${stageName(config, next)}.`),
          t("Kỳ đã lập giữ phiên bản cũ; kỳ nào chuyển sang phiên bản mới mà có làm trước hoặc tồn ở công đoạn này sẽ được báo để sửa. “Hủy thay đổi” trước khi lưu sẽ khôi phục.", "Planned periods keep their version; a period moved to the new version that pulls ahead or holds stock at this stage is flagged for fixing. “Discard” before saving brings it back."),
        ].join(" ")}
        confirmLabel={t("Xóa công đoạn", "Remove stage")} onCancel={() => setConfirmRemove(false)} onConfirm={() => { setConfirmRemove(false); onClose(); update((c) => removeStage(c, stage)); }} />
    </EditSheet>
  );
}

/** Small read-only chain of stage names, one highlighted (the new or selected stage). */
function FlowPreview({ stages, highlight, config, names }: { stages: string[]; highlight: string; config: FactoryConfig; names?: Record<string, string> }) {
  return (
    <ol className="flex flex-wrap items-center gap-1 text-xs" aria-hidden>
      {stages.map((s, i) => (
        <Fragment key={`${s}-${i}`}>
          {i > 0 && <span className="text-muted-foreground">→</span>}
          <li className={cn("rounded px-1.5 py-0.5", s === highlight ? "bg-primary font-semibold text-primary-foreground" : "bg-muted")}>{names?.[s] || stageName(config, s)}</li>
        </Fragment>
      ))}
    </ol>
  );
}

/* ---------------------------------------------------------------- add a stage */

function AddStageDialog({ initialIndex, onClose, onAdded }: { initialIndex: number; onClose: () => void; onAdded: (code: string) => void }) {
  const { t } = useI18n();
  const { config, update } = useFactoryEdit();
  const stages = config.stages;
  const n = stages.length;
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [codeEdited, setCodeEdited] = useState(false);
  const [index, setIndex] = useState(initialIndex);
  const [runSize, setRunSize] = useState(config.run_size[stages[Math.min(initialIndex, n - 1)]] ?? 20);
  const [transfer, setTransfer] = useState(10);
  const [machines, setMachines] = useState({ count: 1, calendar: "shifts" as "shifts" | "continuous", rate: 1, fixed: 0, changeover: 0 });
  /** Edited semi-finished codes, by the first product of each group (reset when the position changes). */
  const [overrides, setOverrides] = useState<Record<string, string>>({});

  const stageCode = codeEdited ? code : slugStage(name);
  const append = index >= n;
  const groups = suggestStageCodes(config, index, stageCode).map((g) => ({ ...g, code: overrides[g.products[0]] ?? g.code }));
  const taken = new Set([...Object.keys(config.products), ...Object.keys(config.btp)]);
  const codeIssue = (value: string, i: number) => !CODE.test(value) ? t("Chữ in hoa, số, _ hoặc -", "Upper-case letters, digits, _ or -")
    : taken.has(value) ? t("Mã đã dùng", "Already used")
    : groups.some((g, j) => j !== i && g.code === value) ? t("Trùng mã khác", "Duplicate") : null;
  const stageIssue = !stageCode ? null : !STAGE_CODE.test(stageCode) ? t("Chữ thường không dấu, số hoặc _, bắt đầu bằng chữ.", "Lower-case letters, digits or _, starting with a letter.")
    : stages.includes(stageCode) ? t("Đã có công đoạn mã này.", "A stage already has this code.") : null;
  const valid = name.trim() !== "" && stageCode !== "" && !stageIssue && groups.every((g, i) => !codeIssue(g.code, i)) && machines.count >= 1;
  const order = [...stages.slice(0, index), stageCode || "__new__", ...stages.slice(index)];
  const machineCodes = Array.from({ length: Math.min(machines.count, 4) }, (_, k) => `${(stageCode || "new").toUpperCase()}_${k + 1}`);
  const positionLabel = (i: number) => i === 0 ? t(`Đầu tiên — trước ${stageName(config, stages[0])}`, `First — before ${stageName(config, stages[0])}`)
    : i >= n ? t(`Cuối cùng — sau ${stageName(config, stages[n - 1])}`, `Last — after ${stageName(config, stages[n - 1])}`)
    : t(`Giữa ${stageName(config, stages[i - 1])} và ${stageName(config, stages[i])}`, `Between ${stageName(config, stages[i - 1])} and ${stageName(config, stages[i])}`);
  const products = Object.keys(config.products);
  const setM = (patch: Partial<typeof machines>) => setMachines((m) => ({ ...m, ...patch }));

  const submit = () => {
    if (!valid) return;
    update((c) => {
      insertStage(c, {
        code: stageCode, name: name.trim(), index, runSize, transfer,
        codes: Object.fromEntries(groups.flatMap((g) => g.products.map((p) => [p, g.code]))),
        machines,
      });
    });
    onAdded(stageCode);
  };

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t("Thêm công đoạn", "Add a stage")}</DialogTitle>
          <DialogDescription>{t("Công đoạn mới được thêm vào bản nháp cùng máy và mã bán thành phẩm cần thiết; chỉnh chi tiết sau ở mục Máy rồi lưu thành phiên bản mới.", "The new stage goes into the draft with the machines and semi-finished codes it needs; fine-tune under Machines, then save a new version.")}</DialogDescription>
        </DialogHeader>
        <form className="grid gap-5" onSubmit={(event) => { event.preventDefault(); submit(); }}>
          <section className="grid gap-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label={t("Tên công đoạn", "Stage name")}><Input autoFocus value={name} placeholder={t("vd. Đánh bóng", "e.g. Polishing")} onChange={(event) => setName(event.target.value)} /></Field>
              <Field label={t("Mã công đoạn", "Stage code")} hint={stageIssue ?? t("Tự tạo từ tên; không đổi được sau khi lưu.", "Made from the name; fixed once saved.")}>
                <Input value={stageCode} aria-invalid={!!stageIssue || undefined} className="font-mono" placeholder="danh_bong" onChange={(event) => { setCodeEdited(true); setCode(event.target.value.trim()); }} />
              </Field>
            </div>
            <Field label={t("Vị trí", "Position")}>
              <Select value={String(index)} onValueChange={(value) => { setIndex(Number(value)); setOverrides({}); }}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>{Array.from({ length: n + 1 }, (_, i) => <SelectItem key={i} value={String(i)}>{positionLabel(i)}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <div className="rounded-md bg-surface-2 px-3 py-2">
              <span className="mb-1 block text-xs text-muted-foreground">{t("Quy trình sau khi thêm", "Process after adding")}</span>
              <FlowPreview stages={order} highlight={stageCode || "__new__"} config={config} names={{ [stageCode || "__new__"]: name.trim() || t("Công đoạn mới", "New stage") }} />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label={t("Cỡ lượt (sản phẩm)", "Run size (units)")}><NumberField min={1} value={runSize} label={t("Cỡ lượt", "Run size")} onChange={setRunSize} /></Field>
              <Field label={append ? t(`Chuyển từ ${stageName(config, stages[n - 1])} sang (phút)`, `Transfer from ${stageName(config, stages[n - 1])} (min)`) : t(`Chuyển sang ${stageName(config, stages[index])} (phút)`, `Transfer to ${stageName(config, stages[index])} (min)`)}>
                <NumberField value={transfer} label={t("Thời gian chuyển (phút)", "Transfer time (min)")} onChange={setTransfer} />
              </Field>
            </div>
          </section>

          <section className="grid gap-3 border-t pt-4">
            <div><h3 className="text-sm font-semibold">{t("Máy của công đoạn", "Machines of the stage")}</h3><p className="text-xs text-muted-foreground">{t("Mọi máy mới có cùng thông số; sửa riêng từng máy sau.", "All new machines share these values; edit each one later.")}</p></div>
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label={t("Số máy", "Machines")}><NumberField min={1} max={20} value={machines.count} label={t("Số máy", "Machines")} onChange={(count) => setM({ count })} /></Field>
              <Field label={t("Lịch làm việc", "Calendar")}>
                <Select value={machines.calendar} onValueChange={(value) => setM({ calendar: value as "shifts" | "continuous" })}>
                  <SelectTrigger size="sm" className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="shifts">{t("Theo ca", "By shift")}</SelectItem><SelectItem value="continuous">{t("Liên tục 24/7", "Continuous 24/7")}</SelectItem></SelectContent>
                </Select>
              </Field>
              <Field label={t("Phút/sản phẩm", "Minutes/unit")}><NumberField step={0.05} value={machines.rate} label={t("Phút/sản phẩm", "Minutes/unit")} onChange={(rate) => setM({ rate })} /></Field>
              <Field label={t("Cố định mỗi lượt (phút)", "Fixed per run (min)")}><NumberField value={machines.fixed} label={t("Cố định mỗi lượt (phút)", "Fixed per run (min)")} onChange={(fixed) => setM({ fixed })} /></Field>
              <Field label={t("Chuyển đổi giữa mã (phút)", "Changeover between items (min)")}><NumberField value={machines.changeover} label={t("Chuyển đổi giữa mã (phút)", "Changeover (min)")} onChange={(changeover) => setM({ changeover })} /></Field>
              <div className="grid content-end gap-1 text-xs text-muted-foreground">
                <span>{t("Một lượt ≈", "One run ≈")} <b className="text-foreground tabular-nums">{Math.ceil(runSize * machines.rate + machines.fixed)}′</b></span>
                <span className="truncate font-mono">{machineCodes.join(", ")}{machines.count > 4 ? "…" : ""}</span>
              </div>
            </div>
          </section>

          <section className="grid gap-3 border-t pt-4">
            <div>
              <h3 className="text-sm font-semibold">{t("Mã bán thành phẩm mới", "New semi-finished codes")}</h3>
              <p className="text-xs text-muted-foreground">{append
                ? t(`Công đoạn mới thành công đoạn cuối và làm ra sản phẩm. ${stageName(config, stages[n - 1])} chuyển sang làm các mã bán thành phẩm dưới đây.`, `The new stage becomes the last one and makes the products. ${stageName(config, stages[n - 1])} switches to making the semi-finished codes below.`)
                : t("Hàng ra khỏi công đoạn mới. Sản phẩm dùng chung mã ở công đoạn trước thì dùng chung mã mới (dùng chung kho).", "Goods leaving the new stage. Products that share a code at the stage before share the new one too (shared stock).")}
                {" "}{t("Mã mới bắt đầu với tồn 0 — nếu xưởng đã có hàng, nhập tồn đầu kỳ ở từng kỳ.", "New codes start with zero stock — if the floor already holds some, enter it as opening stock in each period.")}</p>
            </div>
            <ul className="grid gap-2">{groups.map((group, i) => {
              const issue = codeIssue(group.code, i);
              return (
                <li key={group.products[0]} className="grid items-start gap-2 sm:grid-cols-[minmax(0,14rem)_minmax(0,1fr)]">
                  <div className="grid gap-1">
                    <Input value={group.code} aria-label={t(`Mã cho ${group.products.join(", ")}`, `Code for ${group.products.join(", ")}`)} aria-invalid={!!issue || undefined} className="h-8 font-mono"
                      onChange={(event) => setOverrides((o) => ({ ...o, [group.products[0]]: event.target.value.trim().toUpperCase() }))} />
                    {issue && <span className="text-xs text-destructive">{issue}</span>}
                  </div>
                  <span className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-1.5 text-xs text-muted-foreground">
                    {t("dùng cho", "used by")}
                    {group.products.map((p) => <span key={p} className="inline-flex items-center gap-1 text-foreground"><ProductDot product={p} products={products} />{productName(config, p)}</span>)}
                  </span>
                </li>
              );
            })}</ul>
          </section>

          <DialogFooter className="items-center gap-2 sm:justify-between">
            <span className="text-xs text-muted-foreground">{t(`Sẽ thêm 1 công đoạn, ${machines.count} máy, ${groups.length} mã bán thành phẩm vào bản nháp.`, `Adds 1 stage, ${machines.count} machine(s), ${groups.length} semi-finished code(s) to the draft.`)}</span>
            <span className="flex gap-2"><Button type="button" variant="outline" onClick={onClose}>{t("Hủy", "Cancel")}</Button><Button type="submit" disabled={!valid}><Plus />{t("Thêm công đoạn", "Add stage")}</Button></span>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
