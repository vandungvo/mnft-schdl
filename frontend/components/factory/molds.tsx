"use client";

import { Plus } from "lucide-react";
import { useState } from "react";

import { Panel } from "@/components/blocks";
import { useI18n } from "@/components/i18n-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { completeSetup, isChangedAt, itemsOfStage, moldStage } from "@/lib/factory-config";
import { cn } from "@/lib/utils";

import { changedClass, DeleteButton, NumberField, useFactoryEdit } from "./fields";
import { CodeDialog } from "./products";

export function MoldsSection() {
  const { t } = useI18n();
  const { config, base, update } = useFactoryEdit();
  const [adding, setAdding] = useState(false);
  const items = itemsOfStage(config, moldStage(config) ?? config.stages[0]);
  const states = [...new Set(Object.values(config.molds).map((m) => m.after_maintenance))];
  const changed = (...path: string[]) => isChangedAt(base, config, ["molds", ...path]);
  return (
    <div className="grid gap-4">
      <Panel title={t("Khuôn", "Molds")} description={t("Khuôn dùng chung giữa các máy cùng công đoạn; mỗi lượt cần một khuôn đúng mã. Hết số chu kỳ thì phải bảo dưỡng trước lượt tiếp theo. Số chu kỳ đang dùng nhập ở mỗi kỳ (mục Tồn đầu kỳ).", "Molds are shared by the machines of a stage; each run needs one mold of its item. After the cycle limit it is serviced before the next run. Cycles used so far are entered per period (Opening stock).")}
        actions={<Button size="sm" variant="outline" onClick={() => setAdding(true)}><Plus />{t("Thêm khuôn", "Add mold")}</Button>} flush>
        <div className="overflow-x-auto border-t">
          <Table>
            <TableHeader><TableRow>
              <TableHead className="pl-4">{t("Khuôn", "Mold")}</TableHead><TableHead>{t("Đúc mã", "Casts")}</TableHead><TableHead className="text-right">{t("Số lòng", "Cavities")}</TableHead>
              <TableHead className="text-right">{t("Giới hạn chu kỳ", "Cycle limit")}</TableHead><TableHead className="text-right">{t("Bảo dưỡng (phút)", "Service (min)")}</TableHead>
              <TableHead title={t("Trạng thái máy sau khi bảo dưỡng khuôn — dùng làm hàng trong ma trận chuyển đổi.", "Machine state after mold service — a row of the changeover matrix.")}>{t("Sau bảo dưỡng", "After service")}</TableHead>
              <TableHead className="w-0 pr-4"><span className="sr-only">{t("Xóa", "Delete")}</span></TableHead>
            </TableRow></TableHeader>
            <TableBody>{Object.entries(config.molds).map(([code, mold]) => {
              const last = Object.values(config.molds).filter((m) => m.item === mold.item).length <= 1;
              return (
                <TableRow key={code} className={cn(isChangedAt(base, config, ["molds", code]) && "bg-warning-soft/40")}>
                  <TableCell className="pl-4 font-medium">{code}</TableCell>
                  <TableCell className="min-w-32">
                    <Select value={mold.item} onValueChange={(value) => update((c) => { c.molds[code].item = value; })}>
                      <SelectTrigger size="sm" className={cn("w-full font-mono", changed(code, "item") && changedClass)} aria-label={t(`Mã đúc của ${code}`, `Item cast by ${code}`)}><SelectValue /></SelectTrigger>
                      <SelectContent>{items.map((i) => <SelectItem key={i} value={i} className="font-mono">{i}</SelectItem>)}</SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="w-24"><NumberField min={1} value={mold.cavities} label={t(`Số lòng ${code}`, `Cavities of ${code}`)} changed={changed(code, "cavities")} onChange={(v) => update((c) => { c.molds[code].cavities = v; })} /></TableCell>
                  <TableCell className="w-28"><NumberField min={1} value={mold.limit_cycles} label={t(`Giới hạn chu kỳ ${code}`, `Cycle limit of ${code}`)} changed={changed(code, "limit_cycles")} onChange={(v) => update((c) => { c.molds[code].limit_cycles = v; })} /></TableCell>
                  <TableCell className="w-28"><NumberField min={1} value={mold.maintenance_minutes} label={t(`Thời gian bảo dưỡng ${code}`, `Service minutes of ${code}`)} changed={changed(code, "maintenance_minutes")} onChange={(v) => update((c) => { c.molds[code].maintenance_minutes = v; })} /></TableCell>
                  <TableCell><Badge variant="outline" className="font-mono">{mold.after_maintenance}</Badge></TableCell>
                  <TableCell className="pr-4"><DeleteButton label={t(`Xóa khuôn ${code}`, `Delete mold ${code}`)} disabled={last} title={last ? t("Mỗi mã đúc phải còn ít nhất một khuôn", "Each cast item needs at least one mold") : undefined} onClick={() => update((c) => { delete c.molds[code]; })} /></TableCell>
                </TableRow>
              );
            })}</TableBody>
          </Table>
        </div>
      </Panel>
      {adding && <CodeDialog title={t("Khuôn mới", "New mold")} taken={Object.keys(config.molds)} onClose={() => setAdding(false)} onSave={(code) => {
        update((c) => {
          const template = Object.values(c.molds)[0];
          c.molds[code] = template ? { ...template } : { item: items[0], cavities: 1, limit_cycles: 40, maintenance_minutes: 30, after_maintenance: states[0] ?? "CLEAN" };
          for (const m of Object.values(c.machines)) if (c.molds[code].item in m.minutes_per_unit) completeSetup(c, m);
        });
        setAdding(false);
      }} />}
    </div>
  );
}
