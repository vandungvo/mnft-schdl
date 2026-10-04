"use client";

import { useMutation } from "@tanstack/react-query";
import { CalendarOff, ChevronDown, Plus, Trash2, Wrench, X } from "lucide-react";
import { useState } from "react";

import { Field, Hint, Meter, Panel } from "@/components/blocks";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { useI18n } from "@/components/i18n-provider";
import { useToast } from "@/components/toast-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { deleteMasterMachine, replaceMasterMachine } from "@/lib/api";
import { dateTimeInputToMinute, formatClock, formatDuration, formatNumber, minuteToDateTimeInput, stageLabel } from "@/lib/format";
import { availableMinutes, downtimeMinutes, machinesByStage, stageItem, sum } from "@/lib/master-data";
import type { MachineInput } from "@/lib/types";
import { cn } from "@/lib/utils";

import { DirtyHint, FieldError, MutationNotice, RecordSheet, SheetSection, useDataset } from "./shared";
import { MachineCalendar } from "./timelines";

const N = "text-right tabular-nums";
const avg = (values: number[]) => (values.length ? sum(values) / values.length : 0);

export function MachinesSection({ item, onOpen, onClose }: { item: string | null; onOpen: (id: string) => void; onClose: () => void }) {
  const { t } = useI18n();
  const { dataset } = useDataset();
  const input = dataset.input;
  const groups = machinesByStage(input);
  const molds = Object.entries(input.machines).filter(([, machine]) => machine.mold);
  const open = item != null && item in input.machines;
  return (
    <div className="grid gap-4">
      <Panel title={t("Lịch tài nguyên", "Resource calendar")} description={t("Ca làm việc và lịch dừng của từng máy trên toàn horizon. Bấm tên máy để mở chi tiết.", "Shifts and downtime of every machine across the horizon. Click a machine name to open it.")}>
        <MachineCalendar input={input} origin={dataset.origin} onMachine={onOpen} />
      </Panel>

      {groups.map(({ stage, machines }) => (
        <section key={stage} aria-labelledby={`stage-${stage}`}>
          <h3 id={`stage-${stage}`} className="mb-2 text-sm font-semibold">{stageLabel(stage)} <span className="font-normal text-muted-foreground">· {machines.length} {t("máy", "machines")}</span></h3>
          {machines.length === 0 ? <p className="rounded-lg border border-dashed px-4 py-3 text-sm text-destructive">{t("Công đoạn này chưa có máy nào.", "This stage has no machines.")}</p> : (
            <div className="grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(min(260px,100%),1fr))]">
              {machines.map(([id, machine]) => <MachineCard key={id} id={id} machine={machine} onOpen={() => onOpen(id)} />)}
            </div>
          )}
        </section>
      ))}

      {molds.length > 0 && (
        <Panel title={t("Khuôn đúc", "Casting molds")} description={t("Chu kỳ đã dùng so với giới hạn; tới giới hạn phải bảo trì trước khi đúc tiếp.", "Cycles used against the limit; at the limit the mold must be maintained before casting again.")}>
          <ul className="grid gap-3">
            {molds.map(([id, machine]) => {
              const mold = machine.mold!;
              const used = mold.initial_cycles / Math.max(1, mold.limit_cycles);
              return (
                <li key={mold.id} className="grid items-center gap-x-3 gap-y-1 sm:grid-cols-[9rem_minmax(80px,1fr)_auto]">
                  <button type="button" className="text-left text-sm font-semibold hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none" onClick={() => onOpen(id)}>{mold.id} <span className="font-normal text-muted-foreground">· {id}</span></button>
                  <Meter value={used} tone={used >= 0.8 ? "warn" : "default"} label={`${mold.initial_cycles}/${mold.limit_cycles}`} />
                  <span className="text-xs text-muted-foreground tabular-nums">{mold.initial_cycles}/{mold.limit_cycles} {t("lượt", "cycles")} · {t("còn", "left")} {mold.limit_cycles - mold.initial_cycles} · {mold.cavities} {t("lòng khuôn", "cavities")} · {t("bảo trì", "maintenance")} {formatDuration(mold.maintenance_minutes)}</span>
                </li>
              );
            })}
          </ul>
        </Panel>
      )}
      {open && <MachineSheet key={item} id={item} onClose={onClose} />}
    </div>
  );
}

function MachineCard({ id, machine, onOpen }: { id: string; machine: MachineInput; onOpen: () => void }) {
  const { t } = useI18n();
  const items = Object.values(machine.minutes_per_unit);
  const hours = availableMinutes(machine) / 60;
  const down = downtimeMinutes(machine);
  const used = machine.mold ? machine.mold.initial_cycles / Math.max(1, machine.mold.limit_cycles) : 0;
  return (
    <button type="button" onClick={onOpen} className="flex flex-col gap-2 rounded-lg border bg-card p-3.5 text-left shadow-card transition-colors hover:border-primary/60 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none">
      <span className="flex items-center justify-between gap-2">
        <span className="font-semibold">{id}</span>
        <span className="flex gap-1">
          {machine.mold && <Badge variant={used >= 0.8 ? "warning" : "secondary"}><Wrench />{machine.mold.id}</Badge>}
          {machine.downtime.length > 0 && <Badge variant="danger"><CalendarOff />{machine.downtime.length}</Badge>}
        </span>
      </span>
      <span className="grid grid-cols-3 gap-2 border-t pt-2 text-xs text-muted-foreground [&_b]:block [&_b]:text-sm [&_b]:font-semibold [&_b]:text-foreground [&_b]:tabular-nums">
        <span><b>{items.length}</b>{t("mã xử lý", "items")}</span>
        <span><b>{formatNumber(avg(items) * 100, { maximumFractionDigits: 0 })}′</b>{t("/100 đv", "/100 units")}</span>
        <span><b>{machine.fixed_minutes}′</b>{t("cố định/lô", "fixed/lot")}</span>
        <span><b>{formatNumber(hours, { maximumFractionDigits: 0 })} h</b>{machine.shifts.length} {t("ca", "shifts")}</span>
        <span><b>{down ? formatDuration(down) : "—"}</b>{t("dừng máy", "downtime")}</span>
        {machine.mold ? <span><b>{Math.round(used * 100)}%</b>{t("chu kỳ khuôn", "mold cycles")}</span> : <span />}
      </span>
    </button>
  );
}

type Draft = MachineInput;

function MachineSheet({ id, onClose }: { id: string; onClose: () => void }) {
  const { t } = useI18n();
  const showToast = useToast();
  const { dataset, onUpdated } = useDataset();
  const input = dataset.input;
  const saved = input.machines[id];
  const [draft, setDraft] = useState<Draft>(() => structuredClone(saved));
  const [confirmDelete, setConfirmDelete] = useState(false);
  const dirty = JSON.stringify(draft) !== JSON.stringify(saved);
  const errors: string[] = [];
  if (!(draft.fixed_minutes >= 0)) errors.push(t("Phút cố định phải ≥ 0", "Fixed minutes must be ≥ 0"));
  if (Object.values(draft.minutes_per_unit).some((value) => !(value > 0))) errors.push(t("Phút/đơn vị phải > 0", "Minutes/unit must be > 0"));
  if (draft.downtime.some(([a, z]) => !(z > a))) errors.push(t("Lịch dừng phải kết thúc sau khi bắt đầu", "Downtime must end after it starts"));
  if (draft.mold && !(draft.mold.limit_cycles > 0 && draft.mold.initial_cycles >= 0 && draft.mold.cavities > 0 && draft.mold.maintenance_minutes >= 0)) errors.push(t("Thông số khuôn không hợp lệ", "Invalid mold parameters"));

  const save = useMutation({
    mutationFn: () => replaceMasterMachine(dataset.id, id, dataset.revision, draft),
    onSuccess: (updated) => { onUpdated(updated); setDraft(structuredClone(updated.input.machines[id])); showToast(t(`Đã lưu máy ${id} (revision ${updated.revision}).`, `Saved machine ${id} (revision ${updated.revision}).`)); },
  });
  const remove = useMutation({
    mutationFn: () => deleteMasterMachine(dataset.id, id, dataset.revision),
    onSuccess: (updated) => { setConfirmDelete(false); showToast(t(`Đã xóa máy ${id}.`, `Deleted machine ${id}.`)); onClose(); onUpdated(updated); },
    onError: () => setConfirmDelete(false),
  });
  const busy = save.isPending || remove.isPending;
  const stageItems = [...new Set(input.products.map((product) => stageItem(input, product, saved.stage)).filter(Boolean) as string[])];
  const addable = stageItems.filter((code) => !(code in draft.minutes_per_unit));
  const items = Object.keys(draft.minutes_per_unit).sort();

  return (
    <RecordSheet open wide onClose={onClose} dirty={dirty && !busy}
      title={<span className="flex flex-wrap items-center gap-2">{id}<Badge variant="secondary">{stageLabel(saved.stage)}</Badge>{saved.mold && <Badge variant="outline"><Wrench />{saved.mold.id}</Badge>}</span>}
      description={t(`${saved.shifts.length} ca · ${formatNumber(availableMinutes(saved) / 60, { maximumFractionDigits: 0 })} giờ khả dụng · revision ${dataset.revision}`, `${saved.shifts.length} shifts · ${formatNumber(availableMinutes(saved) / 60, { maximumFractionDigits: 0 })} h available · revision ${dataset.revision}`)}
      footer={<>
        <DirtyHint dirty={dirty} />
        <Button variant="ghost" className="text-destructive hover:bg-danger-soft hover:text-destructive" disabled={busy} onClick={() => setConfirmDelete(true)}><Trash2 />{t("Xóa máy", "Delete machine")}</Button>
        {dirty && <Button variant="outline" disabled={busy} onClick={() => setDraft(structuredClone(saved))}>{t("Hoàn tác", "Revert")}</Button>}
        <Button disabled={!dirty || errors.length > 0 || busy} onClick={() => save.mutate()}>{save.isPending ? t("Đang lưu…", "Saving…") : t("Lưu máy", "Save machine")}</Button>
      </>}>
      <div className="grid min-w-0 grid-cols-[minmax(0,1fr)]">
        <MutationNotice error={save.error ?? remove.error} fallback={t("Thay đổi bị từ chối.", "The change was rejected.")} className="mb-3" />
        {errors.length > 0 && <ul className="mb-3 list-disc pl-5 text-xs text-destructive" role="alert">{errors.map((error) => <li key={error}>{error}</li>)}</ul>}

        <SheetSection title={t("Lịch ca & dừng máy", "Shifts & downtime")}>
          <MachineCalendar input={{ ...input, machines: { ...input.machines, [id]: draft } }} origin={dataset.origin} only={id} />
          <DowntimeEditor draft={draft} setDraft={setDraft} />
          <ShiftTable machine={saved} />
        </SheetSection>

        <SheetSection title={t("Thời gian gia công", "Processing times")} aside={<span className="text-xs text-muted-foreground">{t("phút/đơn vị", "minutes/unit")}</span>}>
          <Field label={t("Phút cố định mỗi lô", "Fixed minutes per lot")} className="mb-3 max-w-56"><Input type="number" min={0} step={1} value={draft.fixed_minutes} aria-invalid={!(draft.fixed_minutes >= 0)} onChange={(event) => setDraft({ ...draft, fixed_minutes: Number(event.target.value) })} /></Field>
          <Table>
            <TableHeader><TableRow><TableHead>{saved.stage === "qc" ? t("Sản phẩm", "Product") : t("Mã BTP", "Semi-finished code")}</TableHead><TableHead className="w-32">{t("Phút/đơn vị", "Min/unit")}</TableHead><TableHead className={N}>{t("100 đơn vị", "100 units")}</TableHead><TableHead className="w-10"><span className="sr-only">{t("Xóa", "Remove")}</span></TableHead></TableRow></TableHeader>
            <TableBody>
              {items.map((code) => {
                const value = draft.minutes_per_unit[code];
                const changed = value !== saved.minutes_per_unit[code];
                return (
                  <TableRow key={code} className={cn(changed && "bg-warning-soft/50")}>
                    <TableCell className="font-mono text-[13px]">{code}{!stageItems.includes(code) && <Badge variant="outline" className="ml-1.5 font-sans">{t("không dùng", "unused")}</Badge>}</TableCell>
                    <TableCell><Input type="number" min={0.01} step={0.05} className="h-8" aria-label={t(`Phút/đơn vị cho ${code}`, `Minutes/unit for ${code}`)} value={Number.isFinite(value) ? value : ""} aria-invalid={!(value > 0)} onChange={(event) => setDraft({ ...draft, minutes_per_unit: { ...draft.minutes_per_unit, [code]: Number(event.target.value) } })} /></TableCell>
                    <TableCell className={N}>{value > 0 ? formatDuration(value * 100 + draft.fixed_minutes) : "—"}</TableCell>
                    <TableCell><Button variant="ghost" size="icon-sm" className="text-muted-foreground hover:text-destructive" aria-label={t(`Bỏ ${code} khỏi máy`, `Remove ${code} from machine`)} onClick={() => { const next = { ...draft.minutes_per_unit }; delete next[code]; setDraft({ ...draft, minutes_per_unit: next }); }}><X /></Button></TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          {addable.length > 0 && (
            <div className="mt-2 flex items-center gap-2">
              <Select value="" onValueChange={(code) => { const reference = avg(Object.values(draft.minutes_per_unit)) || 1; setDraft({ ...draft, minutes_per_unit: { ...draft.minutes_per_unit, [code]: Number(reference.toFixed(2)) } }); }}>
                <SelectTrigger size="sm" className="w-64" aria-label={t("Thêm mã máy xử lý được", "Add an item this machine can process")}><Plus className="size-4" /><SelectValue placeholder={t("Thêm mã xử lý được…", "Add processable item…")} /></SelectTrigger>
                <SelectContent>{addable.map((code) => <SelectItem key={code} value={code}>{code}</SelectItem>)}</SelectContent>
              </Select>
              <span className="text-xs text-muted-foreground">{t("Giá trị mặc định = trung bình hiện tại", "Default value = current average")}</span>
            </div>
          )}
          <Hint>{t("Cột “100 đơn vị” = 100 × phút/đơn vị + phút cố định, chưa gồm setup.", "The “100 units” column = 100 × minutes/unit + fixed minutes, setup excluded.")}</Hint>
        </SheetSection>

        <SheetSection title={t("Ma trận setup khi đổi mã", "Changeover setup matrix")} aside={<span className="text-xs text-muted-foreground">{t("từ hàng → sang cột, phút", "from row → to column, minutes")}</span>}>
          <SetupMatrix draft={draft} setDraft={setDraft} saved={saved} />
          <p className="mt-2 text-xs text-muted-foreground">{t("Mã đang chạy đầu kỳ", "Item loaded at start")}: <span className="font-mono">{saved.initial_product}</span></p>
        </SheetSection>

        {draft.mold && (
          <SheetSection title={t(`Khuôn ${draft.mold.id}`, `Mold ${draft.mold.id}`)}>
            <div className="mb-3 flex items-center gap-3"><Meter value={draft.mold.initial_cycles / Math.max(1, draft.mold.limit_cycles)} tone={draft.mold.initial_cycles / Math.max(1, draft.mold.limit_cycles) >= 0.8 ? "warn" : "default"} /><span className="text-xs whitespace-nowrap text-muted-foreground tabular-nums">{draft.mold.initial_cycles}/{draft.mold.limit_cycles}</span></div>
            <div className="grid gap-3 sm:grid-cols-4">
              <Field label={t("Lòng khuôn", "Cavities")}><Input type="number" min={1} step={1} value={draft.mold.cavities} onChange={(event) => setDraft({ ...draft, mold: { ...draft.mold!, cavities: Number(event.target.value) } })} /></Field>
              <Field label={t("Giới hạn chu kỳ", "Cycle limit")}><Input type="number" min={1} step={1} value={draft.mold.limit_cycles} onChange={(event) => setDraft({ ...draft, mold: { ...draft.mold!, limit_cycles: Number(event.target.value) } })} /></Field>
              <Field label={t("Đã dùng đầu kỳ", "Used at start")}><Input type="number" min={0} step={1} value={draft.mold.initial_cycles} onChange={(event) => setDraft({ ...draft, mold: { ...draft.mold!, initial_cycles: Number(event.target.value) } })} /></Field>
              <Field label={t("Bảo trì (phút)", "Maintenance (min)")}><Input type="number" min={0} step={1} value={draft.mold.maintenance_minutes} onChange={(event) => setDraft({ ...draft, mold: { ...draft.mold!, maintenance_minutes: Number(event.target.value) } })} /></Field>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">{t("Sau bảo trì khuôn ở trạng thái", "After maintenance the mold is")} <span className="font-mono">{draft.mold.after_maintenance}</span></p>
          </SheetSection>
        )}
      </div>
      <ConfirmDialog open={confirmDelete} title={t(`Xóa máy ${id}?`, `Delete machine ${id}?`)} description={t("Chỉ xóa được khi dữ liệu còn lại vẫn lập lịch được. Lần chạy và snapshot cũ không bị ảnh hưởng.", "Only possible if the remaining data can still be scheduled. Existing runs and snapshots are unaffected.")} confirmLabel={t("Xóa máy", "Delete machine")} pending={remove.isPending} onCancel={() => setConfirmDelete(false)} onConfirm={() => remove.mutate()} />
    </RecordSheet>
  );
}

function DowntimeEditor({ draft, setDraft }: { draft: Draft; setDraft: (draft: Draft) => void }) {
  const { t } = useI18n();
  const { dataset } = useDataset();
  const origin = dataset.origin;
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const a = start ? dateTimeInputToMinute(origin, start) : null;
  const z = end ? dateTimeInputToMinute(origin, end) : null;
  const error = a != null && z != null ? (z <= a ? t("Kết thúc phải sau bắt đầu", "End must be after start") : a < 0 || z > dataset.horizon ? t("Ngoài horizon", "Outside the horizon") : "") : "";
  const min = minuteToDateTimeInput(origin, 0);
  const max = minuteToDateTimeInput(origin, dataset.horizon);
  return (
    <div className="mt-3 grid gap-2">
      <h4 className="text-xs font-semibold text-muted-foreground">{t("Lịch dừng máy", "Downtime")}</h4>
      {draft.downtime.length === 0 ? <p className="text-sm text-muted-foreground">{t("Không có lịch dừng.", "No downtime.")}</p> : (
        <ul className="grid gap-1">
          {draft.downtime.map(([from, to], index) => (
            <li key={`${from}-${to}-${index}`} className="flex items-center justify-between gap-2 rounded-md bg-danger-soft/60 px-2.5 py-1.5 text-sm">
              <span className="tabular-nums">{formatClock(origin, from)} → {formatClock(origin, to)} <span className="text-muted-foreground">({formatDuration(to - from)})</span></span>
              <Button variant="ghost" size="icon-xs" aria-label={t("Xóa lịch dừng này", "Remove this downtime")} onClick={() => setDraft({ ...draft, downtime: draft.downtime.filter((_, i) => i !== index) })}><X /></Button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex flex-wrap items-end gap-2">
        <Field label={t("Bắt đầu (giờ nhà máy)", "Start (factory time)")}><Input type="datetime-local" className="h-8 w-52" min={min} max={max} value={start} onChange={(event) => setStart(event.target.value)} /></Field>
        <Field label={t("Kết thúc", "End")}><Input type="datetime-local" className="h-8 w-52" min={min} max={max} value={end} aria-invalid={Boolean(error)} onChange={(event) => setEnd(event.target.value)} /></Field>
        <Button size="sm" variant="outline" disabled={a == null || z == null || Boolean(error)} onClick={() => { setDraft({ ...draft, downtime: [...draft.downtime, [a!, z!] as [number, number]].sort((x, y) => x[0] - y[0]) }); setStart(""); setEnd(""); }}><Plus />{t("Thêm lịch dừng", "Add downtime")}</Button>
      </div>
      <FieldError>{error}</FieldError>
    </div>
  );
}

function ShiftTable({ machine }: { machine: MachineInput }) {
  const { t } = useI18n();
  const { dataset } = useDataset();
  return (
    <Collapsible className="mt-3">
      <CollapsibleTrigger className="group inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">{t(`Danh sách ca (${machine.shifts.length}) · ${machine.windows.length} cửa sổ làm việc`, `Shift list (${machine.shifts.length}) · ${machine.windows.length} work windows`)}<ChevronDown className="size-4 transition-transform group-data-[state=open]:rotate-180" /></CollapsibleTrigger>
      <CollapsibleContent>
        <div className="mt-2 max-h-64 overflow-y-auto rounded-md border">
          <Table>
            <TableHeader className="sticky top-0 bg-card"><TableRow><TableHead>{t("Ca", "Shift")}</TableHead><TableHead>{t("Từ", "From")}</TableHead><TableHead>{t("Đến", "To")}</TableHead><TableHead className={N}>{t("Khả dụng", "Available")}</TableHead></TableRow></TableHeader>
            <TableBody>{machine.shifts.map((shift) => <TableRow key={shift.id}><TableCell className="font-mono text-xs">{shift.id}</TableCell><TableCell className="text-xs">{formatClock(dataset.origin, shift.start)}</TableCell><TableCell className="text-xs">{formatClock(dataset.origin, shift.end)}</TableCell><TableCell className={N}>{formatDuration(shift.available_minutes)}</TableCell></TableRow>)}</TableBody>
          </Table>
        </div>
        <p className="mt-1.5 text-xs text-muted-foreground">{t("Ca và cửa sổ làm việc chỉ xem ở đây; muốn đổi lịch ca hãy cập nhật từ JSON.", "Shifts and work windows are read-only here; to change the shift calendar, update from JSON.")}</p>
      </CollapsibleContent>
    </Collapsible>
  );
}

/** Heatmap of changeover minutes (from row → to column). Read view by default; "Edit" turns cells into inputs. */
function SetupMatrix({ draft, setDraft, saved }: { draft: Draft; setDraft: (draft: Draft) => void; saved: MachineInput }) {
  const { t } = useI18n();
  const [editing, setEditing] = useState(false);
  const codes = Object.keys(draft.setup).sort();
  const max = Math.max(1, ...codes.flatMap((from) => Object.values(draft.setup[from] ?? {})));
  if (!codes.length) return <p className="text-sm text-muted-foreground">{t("Máy này không khai báo setup.", "This machine declares no setup.")}</p>;
  return (
    <div className="grid gap-2">
      <div className="overflow-x-auto">
        <table className="w-full border-separate border-spacing-0.5 text-xs">
          <thead><tr><th className="sr-only">{t("Từ \\ Sang", "From \\ To")}</th>{codes.map((to) => <th key={to} scope="col" className="px-1 pb-1 text-left font-mono font-medium text-muted-foreground [writing-mode:vertical-rl] rotate-180 sm:[writing-mode:horizontal-tb] sm:rotate-0">{to}</th>)}</tr></thead>
          <tbody>
            {codes.map((from) => (
              <tr key={from}>
                <th scope="row" className="pr-2 text-left font-mono font-medium whitespace-nowrap text-muted-foreground">{from}</th>
                {codes.map((to) => {
                  const value = draft.setup[from]?.[to] ?? 0;
                  const share = value / max;
                  const changed = value !== (saved.setup[from]?.[to] ?? 0);
                  return (
                    <td key={to} className={cn("min-w-12 rounded text-center tabular-nums", changed && "ring-2 ring-warning")} style={{ background: from === to ? "var(--muted)" : `color-mix(in oklab, var(--primary) ${Math.round(share * 70)}%, transparent)`, color: share > 0.55 && from !== to ? "var(--primary-foreground)" : undefined }}>
                      {editing && from !== to
                        ? <input type="number" min={0} step={1} aria-label={t(`Setup từ ${from} sang ${to}`, `Setup from ${from} to ${to}`)} className="w-full rounded bg-card/80 px-1 py-1 text-center text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring" value={value} onChange={(event) => setDraft({ ...draft, setup: { ...draft.setup, [from]: { ...draft.setup[from], [to]: Number(event.target.value) } } })} />
                        : <span className="block px-1 py-1.5">{from === to ? "·" : value}</span>}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Button size="sm" variant="ghost" className="justify-self-start" onClick={() => setEditing(!editing)}>{editing ? t("Xong", "Done") : t("Sửa ma trận", "Edit matrix")}</Button>
    </div>
  );
}
