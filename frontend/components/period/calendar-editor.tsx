"use client";

import { Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";

import { Field, Hint, Panel } from "@/components/blocks";
import { useI18n } from "@/components/i18n-provider";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { addDays, clock, exceptionKindLabel, fmtLocal, stageName, weekdayLabel, weekdayOf } from "@/lib/factory";
import type { CalendarException, FactoryConfig } from "@/lib/factory-types";
import { cn } from "@/lib/utils";

const ALL = "__all__";

/** Machine × day availability of the period: plant rest days and recurring maintenance (from the factory),
    plus this period's own exceptions (breakdowns, extra maintenance, closures) which are editable here. */
export function CalendarEditor({ exceptions, onChange, config, startDate, days, frozenUntil, readOnly }: {
  exceptions: CalendarException[];
  onChange: (exceptions: CalendarException[]) => void;
  config: FactoryConfig;
  startDate: string;
  days: number;
  frozenUntil: number | null;
  readOnly: boolean;
}) {
  const { t } = useI18n();
  const [editing, setEditing] = useState<{ index: number | null; item: CalendarException } | null>(null);
  const dates = Array.from({ length: days }, (_, d) => addDays(startDate, d));
  const machines = config.stages.flatMap((stage) => Object.entries(config.machines).filter(([, m]) => m.stage === stage).map(([code]) => code));

  const cellFor = (machine: string, date: string, d: number) => {
    const weekday = weekdayOf(date);
    const closed = config.weekly_off.includes(weekday) || config.holidays.includes(date);
    const rules = config.maintenance_rules.filter((rule) => rule.machine === machine && rule.weekday === weekday);
    const dayStart = `${date}T00:00`, dayEnd = `${addDays(date, 1)}T00:00`;
    const hits = exceptions.filter((item) => (item.machine == null || item.machine === machine) && item.start < dayEnd && item.end > dayStart);
    const past = frozenUntil != null && frozenUntil > d * 1440;
    return { closed, rules, hits, past };
  };

  const openNew = (machine: string | null, date: string) => setEditing({
    index: null,
    item: { id: `X${Date.now().toString(36).toUpperCase()}`, machine, start: `${date}T08:00`, end: `${date}T16:00`, kind: "maintenance", note: null },
  });
  const save = (item: CalendarException, index: number | null) => {
    onChange(index == null ? [...exceptions, item] : exceptions.map((x, i) => (i === index ? item : x)));
    setEditing(null);
  };

  return (
    <div className="grid gap-4">
      <Panel title={t("Lịch máy trong kỳ", "Machine calendar for the period")}
        description={t(`Ca mỗi ngày: ${Object.values(config.shift_template).map((s) => `${clock(s.start)}–${clock(s.end)}`).join(", ")}. Ngày nghỉ và bảo trì định kỳ đến từ cấu hình nhà máy.`, `Daily shifts: ${Object.values(config.shift_template).map((s) => `${clock(s.start)}–${clock(s.end)}`).join(", ")}. Rest days and recurring maintenance come from the factory set-up.`)}
        actions={!readOnly && <Button size="sm" variant="outline" onClick={() => openNew(null, startDate)}><Plus />{t("Thêm ngoại lệ", "Add an exception")}</Button>}>
        <div className="overflow-x-auto">
          <table className="w-full border-separate border-spacing-0.5 text-xs">
            <thead>
              <tr>
                <th className="sticky left-0 z-10 bg-card px-2 text-left font-medium text-muted-foreground">{t("Máy", "Machine")}</th>
                {dates.map((date) => {
                  const weekday = weekdayOf(date);
                  const off = config.weekly_off.includes(weekday) || config.holidays.includes(date);
                  return <th key={date} className={cn("min-w-11 px-1 text-center font-medium", off ? "text-muted-foreground" : "text-foreground")}><span className="block">{weekdayLabel(weekday)}</span><span className="block tabular-nums">{fmtLocal(date)}</span></th>;
                })}
              </tr>
            </thead>
            <tbody>
              {machines.map((machine) => (
                <tr key={machine}>
                  <th scope="row" className="sticky left-0 z-10 bg-card px-2 text-left font-medium whitespace-nowrap">
                    {config.machines[machine].name || machine}
                    <span className="block font-normal text-muted-foreground">{stageName(config, config.machines[machine].stage)}{config.machines[machine].calendar === "continuous" ? " · 24/7" : ""}</span>
                  </th>
                  {dates.map((date, d) => {
                    const { closed, rules, hits, past } = cellFor(machine, date, d);
                    const breakdown = hits.some((h) => h.kind === "breakdown");
                    const title = [
                      closed && t("Nhà máy nghỉ", "Plant closed"),
                      ...rules.map((r) => `${t("Bảo trì định kỳ", "Recurring maintenance")} ${clock(r.start)}–${clock(r.end)}${r.note ? ` · ${r.note}` : ""}`),
                      ...hits.map((h) => `${exceptionKindLabel(h.kind)} ${fmtLocal(h.start)} → ${fmtLocal(h.end)}${h.note ? ` · ${h.note}` : ""}`),
                      past && t("Đã qua (lập lại lịch)", "Already past (reschedule)"),
                    ].filter(Boolean).join("\n") || t("Làm việc bình thường", "Normal working day");
                    return (
                      <td key={date} className="p-0">
                        <button type="button" disabled={readOnly || closed} title={title} aria-label={`${machine} ${fmtLocal(date)}: ${title}`}
                          onClick={() => openNew(machine, date)}
                          className={cn("block h-8 w-full rounded-sm border text-[10px] font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                            closed ? "border-transparent bg-muted [background-image:repeating-linear-gradient(135deg,transparent_0_4px,var(--border)_4px_5px)]"
                              : breakdown ? "border-destructive/40 bg-danger-soft text-destructive"
                                : hits.length ? "border-warning/40 bg-warning-soft text-warning"
                                  : rules.length ? "border-warning/30 bg-warning-soft/50 text-warning"
                                    : "border-border bg-success-soft/40 hover:border-primary",
                            past && "opacity-40")}>
                          {closed ? "" : breakdown ? "!" : hits.length || rules.length ? "B" : ""}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5"><i className="size-3 rounded-sm border bg-success-soft/40" />{t("Làm việc", "Working")}</span>
          <span className="inline-flex items-center gap-1.5"><i className="size-3 rounded-sm bg-muted [background-image:repeating-linear-gradient(135deg,transparent_0_3px,var(--border)_3px_4px)]" />{t("Nhà máy nghỉ", "Plant closed")}</span>
          <span className="inline-flex items-center gap-1.5"><i className="size-3 rounded-sm bg-warning-soft" />{t("Bảo trì (B)", "Maintenance (B)")}</span>
          <span className="inline-flex items-center gap-1.5"><i className="size-3 rounded-sm bg-danger-soft" />{t("Hỏng máy (!)", "Breakdown (!)")}</span>
          {!readOnly && <span>{t("Bấm vào ô để thêm ngoại lệ cho máy/ngày đó.", "Click a cell to add an exception for that machine and day.")}</span>}
        </div>
      </Panel>

      <Panel title={t(`Ngoại lệ của kỳ · ${exceptions.length}`, `Period exceptions · ${exceptions.length}`)} flush>
        <div className="overflow-x-auto border-t">
          <Table>
            <TableHeader><TableRow>
              <TableHead className="pl-3">{t("Máy", "Machine")}</TableHead><TableHead>{t("Loại", "Kind")}</TableHead>
              <TableHead>{t("Từ", "From")}</TableHead><TableHead>{t("Đến", "To")}</TableHead><TableHead>{t("Ghi chú", "Note")}</TableHead>
              {!readOnly && <TableHead className="w-0 pr-3" />}
            </TableRow></TableHeader>
            <TableBody>
              {exceptions.map((item, index) => (
                <TableRow key={item.id}>
                  <TableCell className="pl-3 font-medium">{item.machine ?? t("Toàn nhà máy", "Whole plant")}</TableCell>
                  <TableCell>{exceptionKindLabel(item.kind)}</TableCell>
                  <TableCell className="whitespace-nowrap">{fmtLocal(item.start, { weekday: true })}</TableCell>
                  <TableCell className="whitespace-nowrap">{fmtLocal(item.end, { weekday: true })}</TableCell>
                  <TableCell className="max-w-56 truncate text-muted-foreground">{item.note ?? "—"}</TableCell>
                  {!readOnly && <TableCell className="pr-3"><div className="flex justify-end gap-1">
                    <Button variant="ghost" size="icon" className="size-8" aria-label={t("Sửa", "Edit")} onClick={() => setEditing({ index, item })}><Pencil /></Button>
                    <Button variant="ghost" size="icon" className="size-8 text-destructive" aria-label={t("Xóa", "Delete")} onClick={() => onChange(exceptions.filter((_, i) => i !== index))}><Trash2 /></Button>
                  </div></TableCell>}
                </TableRow>
              ))}
              {!exceptions.length && <TableRow><TableCell colSpan={6} className="py-6 text-center text-sm text-muted-foreground">{t("Không có ngoại lệ — máy chạy theo lịch chuẩn.", "No exceptions — machines follow the standard calendar.")}</TableCell></TableRow>}
            </TableBody>
          </Table>
        </div>
      </Panel>
      <Hint className="mt-0">{t("Bảo trì lặp lại hằng tuần hoặc ngày lễ của cả năm nên khai báo ở trang Nhà máy để mọi kỳ tự áp dụng.", "Weekly maintenance or yearly holidays belong on the Factory page so every period applies them.")}</Hint>
      {editing && <ExceptionDialog initial={editing.item} config={config} onClose={() => setEditing(null)} onSave={(item) => save(item, editing.index)} />}
    </div>
  );
}

export function ExceptionDialog({ initial, config, onClose, onSave, title }: { initial: CalendarException; config: FactoryConfig; onClose: () => void; onSave: (item: CalendarException) => void; title?: string }) {
  const { t } = useI18n();
  const [item, setItem] = useState(initial);
  const valid = item.start !== "" && item.end !== "" && item.start < item.end;
  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{title ?? t("Ngoại lệ lịch máy", "Calendar exception")}</DialogTitle>
          <DialogDescription>{t("Máy (hoặc cả nhà máy) không làm việc trong khoảng này.", "The machine (or the whole plant) does not work during this time.")}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t("Máy", "Machine")}>
            <Select value={item.machine ?? ALL} onValueChange={(value) => setItem({ ...item, machine: value === ALL ? null : value })}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>{t("Toàn nhà máy", "Whole plant")}</SelectItem>
                {Object.entries(config.machines).map(([code, m]) => <SelectItem key={code} value={code}>{m.name || code} · {stageName(config, m.stage)}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label={t("Loại", "Kind")}>
            <Select value={item.kind} onValueChange={(value) => setItem({ ...item, kind: value as CalendarException["kind"] })}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>{(["maintenance", "breakdown", "closed", "other"] as const).map((k) => <SelectItem key={k} value={k}>{exceptionKindLabel(k)}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label={t("Từ", "From")}><Input type="datetime-local" value={item.start} onChange={(event) => setItem({ ...item, start: event.target.value })} /></Field>
          <Field label={t("Đến", "To")}><Input type="datetime-local" value={item.end} onChange={(event) => setItem({ ...item, end: event.target.value })} /></Field>
          <Field label={t("Ghi chú", "Note")} className="sm:col-span-2"><Textarea rows={2} value={item.note ?? ""} onChange={(event) => setItem({ ...item, note: event.target.value || null })} /></Field>
        </div>
        {!valid && <p role="alert" className="text-sm text-destructive">{t("Thời điểm kết thúc phải sau thời điểm bắt đầu.", "The end must be after the start.")}</p>}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>{t("Hủy", "Cancel")}</Button>
          <Button disabled={!valid} onClick={() => onSave(item)}>{t("Áp dụng", "Apply")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
