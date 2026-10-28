"use client";

import { Copy, Star } from "lucide-react";

import { Field, Hint, Panel } from "@/components/blocks";
import { useI18n } from "@/components/i18n-provider";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { WEIGHT_KEYS, weightLabel } from "@/lib/factory";
import { clone, isChangedAt } from "@/lib/factory-config";
import { formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";

import { changedClass, DeleteButton, IssueText, NumberField, useFactoryEdit, useIssues } from "./fields";

/** What each objective term measures and in which unit (the solver sums weight × value). */
const WEIGHT_HELP: Record<string, [string, string]> = {
  weighted_tardiness: ["Phút trễ hạn × mức ưu tiên đơn, cộng mọi đơn.", "Minutes late × order priority, summed over orders."],
  safety_shortfall: ["Số sản phẩm thiếu so với tồn an toàn cuối kỳ.", "Units below safety stock at the end of the period."],
  makespan: ["Phút từ đầu kỳ tới khi lượt cuối cùng xong.", "Minutes from the period start to the last run's end."],
  nonproductive_minutes: ["Phút máy dừng vì chuyển đổi + bảo dưỡng khuôn.", "Machine minutes lost to changeovers and mold service."],
  setup_minutes: ["Tổng phút chuyển đổi giữa các mã.", "Total changeover minutes between items."],
  maintenance_minutes: ["Tổng phút bảo dưỡng khuôn.", "Total mold service minutes."],
  idle_minutes: ["Phút máy rảnh trong giờ ca.", "Machine minutes idle during shifts."],
  reserve_units: ["Số sản phẩm làm trước cho đơn sau kỳ.","Units made ahead for after-period orders."],
  reserve_production: ["Số lượt làm trước cho đơn sau kỳ.", "Runs made ahead for after-period orders."],
  surplus_holding: ["Số sản phẩm tồn vượt mức an toàn cuối kỳ.", "Units held above safety stock at the end."],
  btp_end_units: ["Số bán thành phẩm còn tồn cuối kỳ.", "Semi-finished units left at the end."],
};

export function PoliciesSection() {
  const { t } = useI18n();
  const { config, base, update } = useFactoryEdit();
  return (
    <div className="grid gap-4">
      <Hint className="mt-0">{t("Chính sách quyết định lịch nào được coi là tốt hơn: điểm = Σ trọng số × giá trị mục tiêu, càng thấp càng tốt. Mỗi kỳ chọn một chính sách (mặc định ★). Mục “ưu tiên tuyệt đối” được so trước; các mục khác chỉ để phân định khi bằng nhau.", "A policy decides which schedule counts as better: score = Σ weight × objective value, lower is better. Each period picks one (default ★). “Strictly first” terms are compared first; the others only break ties.")}</Hint>
      {config.policies.map((policy, index) => <PolicyCard key={policy.key} index={index} changed={!!base && isChangedAt(base, config, ["policies"]) && JSON.stringify(base.policies.find((p) => p.key === policy.key)) !== JSON.stringify(policy)}
        onDuplicate={() => update((c) => { let n = 2; while (c.policies.some((p) => p.key === `${policy.key}-${n}`)) n++; c.policies.push({ ...clone(policy), key: `${policy.key}-${n}`, name: `${policy.name} (${n})` }); })} />)}
    </div>
  );
}

function PolicyCard({ index, changed, onDuplicate }: { index: number; changed: boolean; onDuplicate: () => void }) {
  const { t } = useI18n();
  const { config, base, update } = useFactoryEdit();
  const policy = config.policies[index];
  const saved = base?.policies.find((p) => p.key === policy.key) ?? null;
  const isDefault = policy.key === config.default_policy;
  const issues = useIssues("policies", policy.key);
  const set = (mutate: (p: typeof policy) => void) => update((c) => mutate(c.policies[index]));
  const total = WEIGHT_KEYS.reduce((sum, key) => sum + (policy.weights[key] ?? 0), 0);
  return (
    <Panel className={cn(changed && "border-warning/60")}
      title={<span className="inline-flex items-center gap-2">{isDefault && <Star className="size-4 fill-warning text-warning" aria-label={t("mặc định", "default")} />}{policy.name || policy.key} <code className="text-xs font-normal text-muted-foreground">{policy.key}</code></span>}
      actions={<div className="flex gap-2">
        {!isDefault && <Button size="sm" variant="outline" onClick={() => update((c) => { c.default_policy = policy.key; })}><Star />{t("Đặt mặc định", "Make default")}</Button>}
        <Button size="sm" variant="outline" onClick={onDuplicate}><Copy />{t("Nhân bản", "Duplicate")}</Button>
        <DeleteButton label={t(`Xóa chính sách ${policy.name || policy.key}`, `Delete policy ${policy.name || policy.key}`)} disabled={isDefault} title={isDefault ? t("Không xóa được chính sách mặc định", "The default policy cannot be deleted") : undefined} onClick={() => update((c) => { c.policies.splice(index, 1); })} />
      </div>}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t("Tên", "Name")}><Input className={cn("h-8", saved && saved.name !== policy.name && changedClass)} aria-invalid={!policy.name.trim() || undefined} value={policy.name} onChange={(event) => set((p) => { p.name = event.target.value; })} /></Field>
        <Field label={t("Mô tả", "Description")}><Input className={cn("h-8", saved && (saved.description ?? null) !== (policy.description ?? null) && changedClass)} value={policy.description ?? ""} onChange={(event) => set((p) => { p.description = event.target.value || null; })} /></Field>
      </div>
      <IssueText issues={issues} className="mt-2" />
      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="border-b text-xs text-muted-foreground">
            <th scope="col" className="py-1.5 text-left font-medium">{t("Mục tiêu", "Objective")}</th>
            <th scope="col" className="py-1.5 text-right font-medium">{t("Trọng số", "Weight")}</th>
            <th scope="col" className="hidden py-1.5 pl-4 text-left font-medium sm:table-cell">{t("Tỉ trọng", "Share")}</th>
            <th scope="col" className="py-1.5 text-center font-medium">{t("Ưu tiên tuyệt đối", "Strictly first")}</th>
          </tr></thead>
          <tbody>{WEIGHT_KEYS.map((key) => {
            const weight = policy.weights[key] ?? 0;
            const help = WEIGHT_HELP[key];
            const share = total > 0 ? weight / total : 0;
            return (
              <tr key={key} className="border-b last:border-0">
                <td className="py-1.5 pr-3"><span className="block">{weightLabel(key)}</span>{help && <span className="block text-xs text-muted-foreground">{t(...help)}</span>}</td>
                <td className="w-28 py-1"><NumberField step={0.5} value={weight} label={weightLabel(key)} changed={!!saved && (saved.weights[key] ?? 0) !== weight}
                  onChange={(v) => set((p) => { if (v === 0) { delete p.weights[key]; p.tier1 = p.tier1.filter((k) => k !== key); } else p.weights[key] = v; })} /></td>
                <td className="hidden w-40 py-1 pl-4 sm:table-cell">
                  <span className="flex items-center gap-2"><span className="h-1.5 flex-1 overflow-hidden rounded-full bg-grid"><i className={cn("block h-full rounded-full", policy.tier1.includes(key) ? "bg-warning" : "bg-primary")} style={{ width: `${share * 100}%` }} /></span><span className="w-9 text-right text-xs text-muted-foreground tabular-nums">{weight ? `${Math.round(share * 100)}%` : "—"}</span></span>
                </td>
                <td className="py-1 text-center"><Checkbox checked={policy.tier1.includes(key)} disabled={!weight} title={!weight ? t("Đặt trọng số > 0 trước", "Set a weight above 0 first") : undefined} aria-label={t(`${weightLabel(key)}: ưu tiên tuyệt đối`, `${weightLabel(key)}: strictly first`)}
                  onCheckedChange={(value) => set((p) => { p.tier1 = value === true ? [...p.tier1, key] : p.tier1.filter((k) => k !== key); if (p.tier1.length && p.scale < 1000) p.scale = 1_000_000; })} /></td>
              </tr>
            );
          })}</tbody>
        </table>
      </div>
      {policy.tier1.length > 0 && <p className="mt-3 text-xs text-muted-foreground">{t(`Các mục ưu tiên tuyệt đối được nhân hệ số ${formatNumber(policy.scale)} trước khi cộng, nên luôn lấn át các mục còn lại.`, `Strictly-first terms are multiplied by ${formatNumber(policy.scale)} before summing, so they always dominate the rest.`)}</p>}
    </Panel>
  );
}
