"use client";

import { Plus, X } from "lucide-react";
import { Fragment, useState } from "react";

import { Panel } from "@/components/blocks";
import { useI18n } from "@/components/i18n-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { clock, fmtLocal, weekdayLabel } from "@/lib/factory";
import { isChangedAt } from "@/lib/factory-config";
import type { FactoryConfig } from "@/lib/factory-types";
import { cn } from "@/lib/utils";

import { changedClass, DateField, DeleteButton, IssueText, TimeField, useFactoryEdit, useIssues } from "./fields";

const DAY = 1440;
const pct = (minute: number) => `${(minute / DAY) * 100}%`;
const SHIFT_COLORS = ["var(--chart-1)", "var(--chart-3)", "var(--chart-5)", "var(--chart-4)", "var(--chart-2)", "var(--chart-6)"];

export function CalendarSection() {
  const { t } = useI18n();
  const { config, base, update } = useFactoryEdit();
  const [holiday, setHoliday] = useState("");
  const machines = Object.keys(config.machines);
  const shiftKeys = Object.keys(config.shift_template);
  const changed = (...path: Array<string | number>) => isChangedAt(base, config, path);
  const addHoliday = () => { if (!holiday || config.holidays.includes(holiday)) return; update((c) => { c.holidays = [...c.holidays, holiday].sort(); }); setHoliday(""); };
  const addShift = () => update((c) => {
    let n = Object.keys(c.shift_template).length + 1;
    while (c.shift_template[`S${n}`]) n++;
    const latest = Math.max(0, ...Object.values(c.shift_template).map((s) => s.end));
    const start = latest < DAY ? latest : 0;
    c.shift_template[`S${n}`] = { name: null, start, end: Math.min(DAY, start + 480), breaks: [] };
  });

  return (
    <div className="grid gap-4">
      <WeekOverview config={config} />

      <Panel title={t("Ca làm việc mỗi ngày", "Daily shifts")} description={t("Áp dụng cho mọi máy chạy theo ca. Giờ 24h; ca kết thúc lúc nửa đêm nhập 24:00. Một lượt phải nằm gọn trong một ca, không vắt qua giờ nghỉ.", "Applies to every shift machine. 24-hour times; a shift ending at midnight is 24:00. A run must fit inside one shift without crossing a break.")}
        actions={<Button size="sm" variant="outline" onClick={addShift}><Plus />{t("Thêm ca", "Add shift")}</Button>} flush>
        <div className="overflow-x-auto border-t">
          <Table>
            <TableHeader><TableRow>
              <TableHead className="pl-4">{t("Ca", "Shift")}</TableHead><TableHead>{t("Tên", "Name")}</TableHead><TableHead>{t("Bắt đầu", "Start")}</TableHead><TableHead>{t("Kết thúc", "End")}</TableHead>
              <TableHead>{t("Giờ nghỉ", "Breaks")}</TableHead><TableHead className="w-0 pr-4"><span className="sr-only">{t("Xóa", "Delete")}</span></TableHead>
            </TableRow></TableHeader>
            <TableBody>{shiftKeys.map((key, index) => <ShiftRow key={key} shiftKey={key} color={SHIFT_COLORS[index % SHIFT_COLORS.length]} />)}</TableBody>
          </Table>
        </div>
      </Panel>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title={t("Ngày nghỉ hằng tuần", "Weekly rest days")} description={t("Cả nhà máy nghỉ (kể cả lò chạy liên tục).", "The whole plant stops (continuous furnaces too).")}>
          <div className="flex flex-wrap gap-2" role="group" aria-label={t("Ngày nghỉ hằng tuần", "Weekly rest days")}>{[0, 1, 2, 3, 4, 5, 6].map((day) => {
            const on = config.weekly_off.includes(day);
            const dayChanged = base ? base.weekly_off.includes(day) !== on : false;
            return <button key={day} type="button" aria-pressed={on} onClick={() => update((c) => { c.weekly_off = on ? c.weekly_off.filter((d) => d !== day) : [...c.weekly_off, day].sort(); })}
              className={cn("rounded-md border px-3 py-1.5 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none", on ? "border-primary bg-primary text-primary-foreground" : "hover:border-primary/60", dayChanged && "ring-2 ring-warning/60")}>{weekdayLabel(day, true)}</button>;
          })}</div>
        </Panel>
        <Panel title={t("Ngày lễ / nghỉ cố định", "Holidays")} description={t("Nghỉ cả ngày, áp cho mọi kỳ chứa ngày đó.", "Whole-day closures, applied to every period containing them.")}>
          <div className="flex gap-2">
            <DateField className="flex-1" value={holiday} label={t("Ngày lễ mới", "New holiday")} onChange={setHoliday} onSubmit={addHoliday} />
            <Button size="sm" variant="outline" disabled={!holiday || config.holidays.includes(holiday)} onClick={addHoliday}><Plus />{t("Thêm", "Add")}</Button>
          </div>
          {holiday && config.holidays.includes(holiday) && <p className="mt-1 text-xs text-muted-foreground">{t("Ngày này đã có.", "Already in the list.")}</p>}
          <div className="mt-3 flex flex-wrap gap-1.5">{config.holidays.map((day) => (
            <Badge key={day} variant="secondary" className={cn("gap-1 pr-1", base && !base.holidays.includes(day) && "ring-2 ring-warning/60")}>
              {fmtLocal(day, { weekday: true, year: true })}
              <button type="button" aria-label={t(`Bỏ ngày ${fmtLocal(day, { year: true })}`, `Remove ${fmtLocal(day, { year: true })}`)} className="grid size-4 place-items-center rounded hover:bg-danger-soft hover:text-destructive" onClick={() => update((c) => { c.holidays = c.holidays.filter((d) => d !== day); })}><X className="size-3" /></button>
            </Badge>
          ))}{!config.holidays.length && <span className="text-sm text-muted-foreground">{t("Chưa có ngày lễ.", "No holidays.")}</span>}</div>
        </Panel>
      </div>

      <Panel title={t("Bảo trì định kỳ hằng tuần", "Weekly planned maintenance")} description={t("Máy dừng cùng khung giờ mỗi tuần; mọi kỳ tự trừ ra. Bảo trì đột xuất nhập trong từng kỳ.", "The machine stops at the same time every week; every period subtracts it. One-off maintenance is entered per period.")}
        actions={<Button size="sm" variant="outline" onClick={() => update((c) => { c.maintenance_rules = [...c.maintenance_rules, { machine: machines[0], weekday: 5, start: 480, end: 720, note: null }]; })}><Plus />{t("Thêm lịch bảo trì", "Add maintenance")}</Button>} flush>
        <div className="overflow-x-auto border-t">
          <Table>
            <TableHeader><TableRow><TableHead className="pl-4">{t("Máy", "Machine")}</TableHead><TableHead>{t("Thứ", "Weekday")}</TableHead><TableHead>{t("Từ", "From")}</TableHead><TableHead>{t("Đến", "To")}</TableHead><TableHead>{t("Ghi chú", "Note")}</TableHead><TableHead className="w-0 pr-4"><span className="sr-only">{t("Xóa", "Delete")}</span></TableHead></TableRow></TableHeader>
            <TableBody>
              {config.maintenance_rules.map((rule, index) => <RuleRow key={index} index={index} changed={changed("maintenance_rules", index)} />)}
              {!config.maintenance_rules.length && <TableRow><TableCell colSpan={6} className="py-6 text-center text-sm text-muted-foreground">{t("Chưa có bảo trì định kỳ.", "No recurring maintenance.")}</TableCell></TableRow>}
            </TableBody>
          </Table>
        </div>
      </Panel>
    </div>
  );
}

function ShiftRow({ shiftKey: key, color }: { shiftKey: string; color: string }) {
  const { t } = useI18n();
  const { config, base, update } = useFactoryEdit();
  const shift = config.shift_template[key];
  const issues = useIssues("calendar", key);
  const changed = (...path: Array<string | number>) => isChangedAt(base, config, ["shift_template", key, ...path]);
  const fieldIssue = (field: string) => issues.some((i) => i.field === field);
  return (
    <Fragment>
      <TableRow className={cn(issues.length > 0 && "border-b-0")}>
        <TableCell className="pl-4 align-top"><span className="inline-flex h-8 items-center gap-2 font-medium"><i className="inline-block size-2.5 rounded-xs" style={{ background: color }} aria-hidden />{key}</span></TableCell>
        <TableCell className="min-w-28 align-top"><Input className={cn("h-8", changed("name") && changedClass)} aria-label={t(`Tên ca ${key}`, `Name of shift ${key}`)} placeholder={t("vd. Ca sáng", "e.g. Morning")} value={shift.name ?? ""} onChange={(event) => update((c) => { c.shift_template[key].name = event.target.value || null; })} /></TableCell>
        <TableCell className="align-top"><TimeField value={shift.start} label={t(`Ca ${key} bắt đầu`, `Shift ${key} start`)} changed={changed("start")} invalid={fieldIssue("start")} onChange={(v) => update((c) => { c.shift_template[key].start = v; })} /></TableCell>
        <TableCell className="align-top"><TimeField end value={shift.end} label={t(`Ca ${key} kết thúc`, `Shift ${key} end`)} changed={changed("end")} invalid={fieldIssue("end")} onChange={(v) => update((c) => { c.shift_template[key].end = v; })} /></TableCell>
        <TableCell className="min-w-56 align-top">
          <div className="grid gap-1.5">
            {shift.breaks.map(([a, b], index) => (
              <div key={index} className="flex items-center gap-1.5">
                <TimeField value={a} label={t(`Giờ nghỉ ${index + 1} bắt đầu`, `Break ${index + 1} start`)} changed={changed("breaks")} invalid={fieldIssue(`break-${index}`)} onChange={(v) => update((c) => { c.shift_template[key].breaks[index] = [v, c.shift_template[key].breaks[index][1]]; })} />
                <span className="text-muted-foreground">–</span>
                <TimeField end value={b} label={t(`Giờ nghỉ ${index + 1} kết thúc`, `Break ${index + 1} end`)} changed={changed("breaks")} invalid={fieldIssue(`break-${index}`)} onChange={(v) => update((c) => { c.shift_template[key].breaks[index] = [c.shift_template[key].breaks[index][0], v]; })} />
                <DeleteButton label={t(`Bỏ giờ nghỉ ${index + 1}`, `Remove break ${index + 1}`)} onClick={() => update((c) => { c.shift_template[key].breaks.splice(index, 1); })} />
              </div>
            ))}
            <Button size="xs" variant="ghost" className="justify-self-start text-muted-foreground" onClick={() => update((c) => {
              const s = c.shift_template[key];
              const mid = Math.round((s.start + s.end) / 2 / 30) * 30;
              s.breaks.push([Math.max(s.start, mid), Math.min(s.end, mid + 30)]);
            })}><Plus />{t("Thêm giờ nghỉ", "Add break")}</Button>
          </div>
        </TableCell>
        <TableCell className="pr-4 align-top"><DeleteButton label={t(`Xóa ca ${key}`, `Delete shift ${key}`)} disabled={Object.keys(config.shift_template).length <= 1} onClick={() => update((c) => { delete c.shift_template[key]; })} /></TableCell>
      </TableRow>
      {issues.length > 0 && <TableRow className="hover:bg-transparent"><TableCell colSpan={6} className="pt-0 pl-4"><IssueText issues={issues} /></TableCell></TableRow>}
    </Fragment>
  );
}

function RuleRow({ index, changed }: { index: number; changed: boolean }) {
  const { t } = useI18n();
  const { config, update } = useFactoryEdit();
  const rule = config.maintenance_rules[index];
  const issues = useIssues("calendar", `rule-${index}`);
  const set = (patch: Partial<typeof rule>) => update((c) => { c.maintenance_rules[index] = { ...c.maintenance_rules[index], ...patch }; });
  return (
    <Fragment>
      <TableRow className={cn(changed && "bg-warning-soft/40", issues.length > 0 && "border-b-0")}>
        <TableCell className="min-w-32 pl-4"><Select value={rule.machine} onValueChange={(machine) => set({ machine })}><SelectTrigger size="sm" className="w-full" aria-label={t("Máy", "Machine")}><SelectValue /></SelectTrigger><SelectContent>{Object.keys(config.machines).map((m) => <SelectItem key={m} value={m}>{config.machines[m].name || m}</SelectItem>)}</SelectContent></Select></TableCell>
        <TableCell className="min-w-28"><Select value={String(rule.weekday)} onValueChange={(value) => set({ weekday: Number(value) })}><SelectTrigger size="sm" className="w-full" aria-label={t("Thứ", "Weekday")}><SelectValue /></SelectTrigger><SelectContent>{[0, 1, 2, 3, 4, 5, 6].map((d) => <SelectItem key={d} value={String(d)}>{weekdayLabel(d, true)}</SelectItem>)}</SelectContent></Select></TableCell>
        <TableCell><TimeField value={rule.start} label={t("Bảo trì từ", "Maintenance from")} onChange={(start) => set({ start })} /></TableCell>
        <TableCell><TimeField end value={rule.end} label={t("Bảo trì đến", "Maintenance to")} invalid={issues.some((i) => i.field === "end")} onChange={(end) => set({ end })} /></TableCell>
        <TableCell className="min-w-40"><Input className="h-8" aria-label={t("Ghi chú", "Note")} value={rule.note ?? ""} onChange={(event) => set({ note: event.target.value || null })} /></TableCell>
        <TableCell className="pr-4"><DeleteButton label={t("Xóa lịch bảo trì", "Delete maintenance slot")} onClick={() => update((c) => { c.maintenance_rules = c.maintenance_rules.filter((_, i) => i !== index); })} /></TableCell>
      </TableRow>
      {issues.length > 0 && <TableRow className="hover:bg-transparent"><TableCell colSpan={6} className="pt-0 pl-4"><IssueText issues={issues} /></TableCell></TableRow>}
    </Fragment>
  );
}

/* A week at a glance: shifts (breaks cut out), rest days, overlaps and recurring maintenance on one 24-hour grid. */
function WeekOverview({ config }: { config: FactoryConfig }) {
  const { t } = useI18n();
  const shifts = Object.entries(config.shift_template);
  const valid = shifts.filter(([, s]) => s.end > s.start);
  const covered = valid.reduce((sum, [, s]) => sum + (s.end - s.start) - s.breaks.reduce((b, [x, y]) => b + Math.max(0, y - x), 0), 0);
  const overlaps: Array<[number, number]> = [];
  valid.forEach(([, a], i) => valid.slice(i + 1).forEach(([, b]) => { const s = Math.max(a.start, b.start), e = Math.min(a.end, b.end); if (e > s) overlaps.push([s, e]); }));
  const workDays = 7 - config.weekly_off.length;
  return (
    <Panel title={t("Tuần làm việc", "Working week")} description={t(`${workDays} ngày làm · ${Math.round((covered / 60) * 10) / 10} giờ làm/ngày (đã trừ giờ nghỉ) · ${config.maintenance_rules.length} lịch bảo trì định kỳ${config.holidays.length ? ` · ${config.holidays.length} ngày lễ` : ""}.`, `${workDays} working days · ${Math.round((covered / 60) * 10) / 10} working hours/day (breaks excluded) · ${config.maintenance_rules.length} recurring maintenance slot(s)${config.holidays.length ? ` · ${config.holidays.length} holiday(s)` : ""}.`)}>
      <div className="grid grid-cols-[3.25rem_minmax(0,1fr)] gap-x-2 gap-y-1 text-xs" role="img" aria-label={t("Lưới tuần: ca, ngày nghỉ và bảo trì định kỳ", "Week grid: shifts, rest days and recurring maintenance")}>
        <span />
        <div className="relative h-4 text-muted-foreground">{[0, 6, 12, 18, 24].map((h) => <span key={h} className={cn("absolute -translate-x-1/2 tabular-nums", h === 0 && "translate-x-0", h === 24 && "-translate-x-full")} style={{ left: pct(h * 60) }}>{h}h</span>)}</div>
        {[0, 1, 2, 3, 4, 5, 6].map((day) => {
          const off = config.weekly_off.includes(day);
          const rules = config.maintenance_rules.filter((r) => r.weekday === day && r.end > r.start);
          return (
            <Fragment key={day}>
              <span className={cn("self-center font-medium", off && "text-muted-foreground")}>{weekdayLabel(day)}</span>
              <div className="relative h-6 overflow-hidden rounded bg-muted/60">
                {[6, 12, 18].map((h) => <i key={h} className="absolute inset-y-0 w-px bg-border" style={{ left: pct(h * 60) }} />)}
                {off ? (
                  <span className="absolute inset-0 grid place-items-center text-muted-foreground" style={{ backgroundImage: "repeating-linear-gradient(135deg, transparent 0 6px, var(--border) 6px 7px)" }}>{t("Nghỉ", "Off")}</span>
                ) : valid.map(([key, s], index) => (
                  <Fragment key={key}>
                    <i className="absolute inset-y-1 rounded-sm opacity-80" style={{ left: pct(s.start), width: pct(s.end - s.start), background: SHIFT_COLORS[shifts.findIndex(([k]) => k === key) % SHIFT_COLORS.length] }} title={`${key}${s.name ? ` · ${s.name}` : ""} ${clock(s.start)}–${s.end === DAY ? "24:00" : clock(s.end)}`} />
                    {s.breaks.filter(([a, b]) => b > a).map(([a, b], i) => <i key={`${index}-${i}`} className="absolute inset-y-1 bg-card" style={{ left: pct(a), width: pct(b - a) }} title={`${t("Nghỉ", "Break")} ${clock(a)}–${clock(b)}`} />)}
                  </Fragment>
                ))}
                {!off && overlaps.map(([a, b], i) => <i key={`o${i}`} className="absolute inset-y-0 bg-destructive/70" style={{ left: pct(a), width: pct(b - a) }} title={t("Ca chồng nhau", "Shifts overlap")} />)}
                {rules.map((r, i) => <i key={`m${i}`} className="absolute bottom-0 h-1.5 rounded-t-sm bg-destructive" style={{ left: pct(r.start), width: pct(r.end - r.start) }} title={`${t("Bảo trì", "Maintenance")} ${config.machines[r.machine]?.name || r.machine} ${clock(r.start)}–${r.end === DAY ? "24:00" : clock(r.end)}`} />)}
              </div>
            </Fragment>
          );
        })}
      </div>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        {shifts.map(([key, s], index) => <span key={key} className="inline-flex items-center gap-1.5"><i className="inline-block h-2.5 w-3.5 rounded-xs" style={{ background: SHIFT_COLORS[index % SHIFT_COLORS.length] }} />{key}{s.name ? ` · ${s.name}` : ""} {clock(s.start)}–{s.end === DAY ? "24:00" : clock(s.end)}</span>)}
        <span className="inline-flex items-center gap-1.5"><i className="inline-block h-1.5 w-3.5 rounded-xs bg-destructive" />{t("Bảo trì định kỳ", "Recurring maintenance")}</span>
        {overlaps.length > 0 && <span className="inline-flex items-center gap-1.5 font-medium text-destructive"><i className="inline-block h-2.5 w-3.5 rounded-xs bg-destructive/70" />{t("Ca chồng nhau", "Shifts overlap")}</span>}
      </div>
    </Panel>
  );
}
