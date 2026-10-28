"use client";

import { ChevronRight, Copy } from "lucide-react";
import { Fragment, useState } from "react";

import { Field, Panel } from "@/components/blocks";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { useI18n } from "@/components/i18n-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { clock, productName, stageName, weekdayLabel } from "@/lib/factory";
import { clone, completeSetup, isChangedAt, itemsOfStage, machineStates, setupRows } from "@/lib/factory-config";
import { cn } from "@/lib/utils";

import { changedClass, defaultPlaceholder, EditSheet, NumberField, useFactoryEdit, useFactoryLocation } from "./fields";
import { CodeDialog } from "./products";

const itemLabel = (config: Parameters<typeof productName>[0], item: string) => (config?.products[item] ? productName(config, item) : item);

/* Machines: one overview table (every machine, grouped by stage), details in a drawer. */
export function MachinesSection() {
  const { t } = useI18n();
  const { config, base } = useFactoryEdit();
  const { item, navigate } = useFactoryLocation();
  const open = item && config.machines[item] ? item : null;

  return (
    <div className="grid gap-4">
      <Panel title={t("Máy", "Machines")} description={t("Bấm một máy để sửa định mức, thời gian chuyển đổi, nhân bản hoặc xóa.", "Click a machine to edit its rates and changeovers, duplicate or delete it.")} flush>
        <div className="overflow-x-auto border-t">
          <Table>
            <TableHeader><TableRow>
              <TableHead className="pl-4">{t("Máy", "Machine")}</TableHead>
              <TableHead>{t("Lịch", "Calendar")}</TableHead>
              <TableHead>{t("Làm được", "Makes")}</TableHead>
              <TableHead className="text-right">{t("Phút/sp", "Min/unit")}</TableHead>
              <TableHead className="text-right">{t("Cố định/lượt", "Fixed/run")}</TableHead>
              <TableHead className="text-right">{t("Bảo trì tuần", "Weekly service")}</TableHead>
              <TableHead className="w-0 pr-4"><span className="sr-only">{t("Sửa", "Edit")}</span></TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {config.stages.map((stage) => {
                const machines = Object.keys(config.machines).filter((m) => config.machines[m].stage === stage);
                return (
                  <Fragment key={stage}>
                    <TableRow className="bg-surface-2 hover:bg-surface-2">
                      <TableCell colSpan={7} className="py-1.5 pl-4 text-xs font-semibold text-muted-foreground">{stageName(config, stage)} <span className="font-normal">· {t(`${machines.length} máy`, `${machines.length} machines`)}</span></TableCell>
                    </TableRow>
                    {machines.map((code) => {
                      const machine = config.machines[code];
                      const rates = Object.values(machine.minutes_per_unit);
                      const lo = Math.min(...rates), hi = Math.max(...rates);
                      const rules = config.maintenance_rules.filter((r) => r.machine === code).length;
                      const changed = isChangedAt(base, config, ["machines", code]);
                      return (
                        <TableRow key={code} className={cn("cursor-pointer", changed && "bg-warning-soft/60")} onClick={() => navigate({ item: code })}>
                          <TableCell className="pl-4"><span className="grid leading-tight"><span className="font-medium">{machine.name || code}</span>{machine.name && <code className="text-xs text-muted-foreground">{code}</code>}</span></TableCell>
                          <TableCell>{machine.calendar === "continuous" ? <Badge variant="secondary">24/7</Badge> : <span className="text-sm text-muted-foreground">{t("Theo ca", "Shifts")}</span>}</TableCell>
                          <TableCell className="text-xs"><span className="flex flex-wrap gap-1">{Object.keys(machine.minutes_per_unit).map((i) => <span key={i} className="rounded bg-muted px-1.5 py-0.5 font-mono">{i}</span>)}</span></TableCell>
                          <TableCell className="text-right tabular-nums">{rates.length ? (lo === hi ? lo : `${lo}–${hi}`) : "—"}</TableCell>
                          <TableCell className="text-right tabular-nums">{machine.fixed_minutes}′</TableCell>
                          <TableCell className="text-right tabular-nums text-muted-foreground">{rules || "—"}</TableCell>
                          <TableCell className="pr-4"><Button variant="ghost" size="icon" className="size-8 text-muted-foreground" aria-label={t(`Sửa ${code}`, `Edit ${code}`)} onClick={(event) => { event.stopPropagation(); navigate({ item: code }); }}><ChevronRight /></Button></TableCell>
                        </TableRow>
                      );
                    })}
                  </Fragment>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </Panel>
      {open && <MachineSheet code={open} onClose={() => navigate({ item: null })} onOpen={(code) => navigate({ item: code })} />}
    </div>
  );
}

function MachineSheet({ code, onClose, onOpen }: { code: string; onClose: () => void; onOpen: (code: string) => void }) {
  const { t } = useI18n();
  const { config, base, update } = useFactoryEdit();
  const [copying, setCopying] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const machine = config.machines[code];
  const stageItems = itemsOfStage(config, machine.stage);
  const usesMolds = Object.values(config.molds).some((m) => m.item in machine.minutes_per_unit);
  const others = (item: string) => Object.entries(config.machines).some(([m, spec]) => m !== code && spec.stage === machine.stage && item in spec.minutes_per_unit);
  const sameStage = Object.values(config.machines).filter((m) => m.stage === machine.stage).length;
  const sole = stageItems.filter((item) => item in machine.minutes_per_unit && !others(item));
  const rules = config.maintenance_rules.filter((r) => r.machine === code);
  const changed = (...path: string[]) => isChangedAt(base, config, ["machines", code, ...path]);
  const deleteBlock = sameStage <= 1 ? t("Công đoạn chỉ còn máy này.", "This is the stage's only machine.") : sole.length ? t(`Chỉ máy này làm ${sole.join(", ")} — bật mã đó cho máy khác trước.`, `Only this machine makes ${sole.join(", ")} — enable it on another machine first.`) : null;

  const toggleItem = (item: string, on: boolean) => update((c) => {
    const m = c.machines[code];
    if (on) { m.minutes_per_unit[item] = Object.values(m.minutes_per_unit)[0] ?? 1; completeSetup(c, m); }
    else { delete m.minutes_per_unit[item]; delete m.setup[item]; for (const row of Object.values(m.setup)) delete row[item]; }
  });

  return (
    <EditSheet open onClose={onClose} wide title={<>{machine.name || code} <span className="font-normal text-muted-foreground">· {stageName(config, machine.stage)}</span></>}
      actions={<>
        <Button variant="outline" onClick={() => setCopying(true)}><Copy />{t("Nhân bản", "Duplicate")}</Button>
        <Button variant="outline" className="text-destructive" disabled={!!deleteBlock} title={deleteBlock ?? undefined} onClick={() => setConfirmDelete(true)}>{t("Xóa máy", "Delete machine")}</Button>
        {deleteBlock && <span className="self-center text-xs text-muted-foreground">{deleteBlock}</span>}
      </>}>
      <div className="grid gap-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t("Tên hiển thị", "Display name")}><Input className={cn("h-8", changed("name") && changedClass)} value={machine.name ?? ""} placeholder={defaultPlaceholder(t, code)} onChange={(event) => update((c) => { c.machines[code].name = event.target.value || null; })} /></Field>
          <Field label={t("Lịch làm việc", "Calendar")}>
            <Select value={machine.calendar} onValueChange={(value) => update((c) => { c.machines[code].calendar = value as "shifts" | "continuous"; })}>
              <SelectTrigger size="sm" className={cn("w-full", changed("calendar") && changedClass)}><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="shifts">{t("Theo ca", "By shift")}</SelectItem><SelectItem value="continuous">{t("Liên tục 24/7 (lò)", "Continuous 24/7 (furnace)")}</SelectItem></SelectContent>
            </Select>
          </Field>
          <Field label={t("Thời gian cố định mỗi lượt (phút)", "Fixed time per run (min)")}><NumberField value={machine.fixed_minutes} label={t("Thời gian cố định mỗi lượt (phút)", "Fixed time per run (min)")} changed={changed("fixed_minutes")} onChange={(v) => update((c) => { c.machines[code].fixed_minutes = v; })} /></Field>
          {usesMolds && <Field label={t("Thay khuôn tối thiểu (phút)", "Mold change at least (min)")}><NumberField value={machine.mold_change_minutes ?? 0} label={t("Thay khuôn tối thiểu (phút)", "Mold change at least (min)")} changed={changed("mold_change_minutes")} onChange={(v) => update((c) => { c.machines[code].mold_change_minutes = v; })} /></Field>}
        </div>

        <section className="grid gap-2">
          <div><h3 className="text-sm font-semibold">{t("Mã hàng và định mức", "Items and rates")}</h3><p className="text-xs text-muted-foreground">{t("Thời gian một lượt = cỡ lượt × phút/sản phẩm + thời gian cố định. Không bỏ được mã mà chỉ máy này làm.", "Run time = run size × minutes/unit + fixed time. An item only this machine makes cannot be turned off.")}</p></div>
          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader><TableRow><TableHead className="pl-3">{t("Mã hàng", "Item")}</TableHead><TableHead>{t("Máy làm được", "Made here")}</TableHead><TableHead className="text-right">{t("Phút/sản phẩm", "Min/unit")}</TableHead><TableHead className="pr-3 text-right">{t("Một lượt", "One run")}</TableHead></TableRow></TableHeader>
              <TableBody>{stageItems.map((item) => {
                const on = item in machine.minutes_per_unit;
                const locked = on && !others(item);
                return (
                  <TableRow key={item}>
                    <TableCell className="pl-3 font-medium">{itemLabel(config, item)}</TableCell>
                    <TableCell><Checkbox checked={on} disabled={locked} title={locked ? t("Chỉ máy này làm mã này", "Only this machine makes it") : undefined} onCheckedChange={(value) => toggleItem(item, value === true)} aria-label={t(`${code} làm ${item}`, `${code} makes ${item}`)} /></TableCell>
                    <TableCell className="w-32">{on && <NumberField step={0.05} value={machine.minutes_per_unit[item]} label={t(`Phút/sản phẩm ${item}`, `Minutes per unit ${item}`)} changed={changed("minutes_per_unit", item)} onChange={(v) => update((c) => { c.machines[code].minutes_per_unit[item] = v; })} />}</TableCell>
                    <TableCell className="pr-3 text-right tabular-nums text-muted-foreground">{on ? `${Math.ceil(config.run_size[machine.stage] * machine.minutes_per_unit[item] + machine.fixed_minutes)}′` : "—"}</TableCell>
                  </TableRow>
                );
              })}</TableBody>
            </Table>
          </div>
        </section>

        <SetupMatrix code={code} />

        <section className="grid gap-1 text-sm">
          <h3 className="font-semibold">{t("Bảo trì định kỳ hằng tuần", "Weekly planned maintenance")}</h3>
          {rules.length ? <ul className="text-muted-foreground">{rules.map((r, i) => <li key={i}>{weekdayLabel(r.weekday, true)} {clock(r.start)}–{clock(r.end)}{r.note ? ` · ${r.note}` : ""}</li>)}</ul> : <span className="text-muted-foreground">{t("Không có.", "None.")}</span>}
          <span className="text-xs text-muted-foreground">{t("Sửa ở mục Ca & lịch nghỉ.", "Edit under Shifts & calendar.")}</span>
        </section>
      </div>

      {copying && <CodeDialog title={t(`Nhân bản ${code}`, `Duplicate ${code}`)} description={t("Máy mới có cùng định mức, ma trận chuyển đổi và lịch; bảo trì định kỳ không chép.", "The new machine gets the same rates, changeovers and calendar; recurring maintenance is not copied.")}
        taken={Object.keys(config.machines)} onClose={() => setCopying(false)} onSave={(newCode) => { update((c) => { c.machines[newCode] = { ...clone(c.machines[code]), name: null }; }); setCopying(false); onOpen(newCode); }} />}
      <ConfirmDialog open={confirmDelete} title={t(`Xóa máy ${code}?`, `Delete machine ${code}?`)}
        description={rules.length
          ? t(`Máy và ${rules.length} lịch bảo trì định kỳ của nó sẽ bị bỏ khỏi bản nháp. Có thể khôi phục bằng “Hủy thay đổi” trước khi lưu.`, `The machine and its ${rules.length} recurring maintenance slot(s) are removed from the draft. “Discard” before saving brings them back.`)
          : t("Máy bị bỏ khỏi bản nháp. Có thể khôi phục bằng “Hủy thay đổi” trước khi lưu.", "The machine is removed from the draft. “Discard” before saving brings it back.")}
        confirmLabel={t("Xóa", "Delete")} onCancel={() => setConfirmDelete(false)}
        onConfirm={() => { setConfirmDelete(false); onClose(); update((c) => { delete c.machines[code]; c.maintenance_rules = c.maintenance_rules.filter((r) => r.machine !== code); }); }} />
    </EditSheet>
  );
}

function SetupMatrix({ code }: { code: string }) {
  const { t } = useI18n();
  const { config, base, update } = useFactoryEdit();
  const machine = config.machines[code];
  const items = Object.keys(machine.minutes_per_unit);
  const states = machineStates(config, machine);
  const rows = setupRows(config, machine);
  const max = Math.max(1, ...rows.flatMap((row) => items.map((item) => (row === item ? 0 : machine.setup[row]?.[item] ?? 0))));
  const label = (row: string) => row === config.machine_initial_state ? t("Đầu kỳ", "Start") : states.includes(row) ? t(`Sau bảo dưỡng (${row})`, `After service (${row})`) : itemLabel(config, row);
  return (
    <section className="grid gap-2">
      <div><h3 className="text-sm font-semibold">{t("Thời gian chuyển đổi (phút)", "Changeover times (min)")}</h3><p className="text-xs text-muted-foreground">{t("Hàng: máy vừa làm gì (hoặc trạng thái) → cột: chuyển sang mã nào. Ô càng đậm càng tốn thời gian.", "Row: what the machine last did (or its state) → column: what it switches to. Darker cells cost more time.")}</p></div>
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead><tr className="border-b text-xs text-muted-foreground">
            <th scope="col" className="px-3 py-2 text-left font-medium">{t("Từ ↓ \\ Sang →", "From ↓ \\ To →")}</th>
            {items.map((item) => <th scope="col" key={item} className="px-2 py-2 text-center font-medium">{itemLabel(config, item)}</th>)}
          </tr></thead>
          <tbody>{rows.map((row) => (
            <tr key={row} className="border-b last:border-0">
              <th scope="row" className={cn("px-3 py-1.5 text-left font-medium whitespace-nowrap", states.includes(row) && "text-muted-foreground italic")}>{label(row)}</th>
              {items.map((item) => {
                if (row === item) return <td key={item} className="bg-muted/60 px-2 py-1 text-center text-muted-foreground" title={t("Cùng mã: không chuyển đổi", "Same item: no changeover")}>—</td>;
                const value = machine.setup[row]?.[item] ?? 0;
                return (
                  <td key={item} className="px-1 py-1" style={{ background: value ? `color-mix(in oklab, var(--warning) ${Math.round((value / max) * 28)}%, transparent)` : undefined }}>
                    <NumberField value={value} label={`${label(row)} → ${itemLabel(config, item)}`} changed={isChangedAt(base, config, ["machines", code, "setup", row, item])} className="min-w-16 bg-card/70"
                      onChange={(v) => update((c) => { c.machines[code].setup[row] = { ...(c.machines[code].setup[row] ?? {}), [item]: v }; })} />
                  </td>
                );
              })}
            </tr>
          ))}</tbody>
        </table>
      </div>
    </section>
  );
}
