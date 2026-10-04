"use client";

import { useMutation } from "@tanstack/react-query";
import { ChevronDown, Pencil, Trash2 } from "lucide-react";
import { useState } from "react";

import { DescList, Field, Hint, Panel } from "@/components/blocks";
import { useI18n } from "@/components/i18n-provider";
import { useToast } from "@/components/toast-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { replaceMasterDataset } from "@/lib/api";
import { termsOf } from "@/lib/decision";
import { formatDateTime, formatDay, formatHour, formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";

import { DirtyHint, MutationNotice, useDataset } from "./shared";

const RULES = ["minimum_lot", "max_surplus", "max_surplus_btp", "transfer_minutes"] as const;
type Rule = (typeof RULES)[number];

export function SettingsSection({ onDelete }: { onDelete: () => void }) {
  const { t } = useI18n();
  const { dataset } = useDataset();
  const input = dataset.input;
  const days = Math.ceil(input.horizon / 1440);
  const working = new Set(input.working_days);
  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <Panel title={t("Horizon & lịch làm việc", "Horizon & working calendar")} className="xl:col-span-2">
        <DescList items={[
          [t("Bắt đầu (giờ gốc)", "Start (time origin)"), formatDateTime(dataset.origin)],
          [t("Độ dài", "Length"), t(`${days} ngày · ${formatNumber(input.horizon)} phút · đơn vị thời gian: phút`, `${days} days · ${formatNumber(input.horizon)} minutes · time unit: minute`)],
          [t("Ngày làm việc", "Working days"), (
            <span key="wd" className="flex flex-wrap gap-1">
              {Array.from({ length: days }, (_, day) => <span key={day} className={cn("rounded px-1.5 py-0.5 text-xs", working.has(day) ? "bg-accent text-accent-foreground" : "bg-muted text-muted-foreground line-through")} title={working.has(day) ? t("làm việc", "working") : t("nghỉ", "off")}>{formatDay(dataset.origin, day * 1440)}</span>)}
            </span>
          )],
          [t("Mốc đo tồn an toàn", "Safety-stock checkpoints"), (
            <span key="cp">{input.checkpoints.length} {t("mốc", "checkpoints")}{input.checkpoints.length ? ` · ${t("đo lúc", "measured at")} ${formatHour(dataset.origin, input.checkpoints[0])} (${t("cuối mỗi ngày", "end of each day")})` : ""}</span>
          )],
        ]} />
        <Hint>{t("Ngày làm việc, mốc đo và lịch ca chỉ xem ở đây; muốn đổi hãy cập nhật từ JSON.", "Working days, checkpoints and the shift calendar are read-only here; update from JSON to change them.")}</Hint>
      </Panel>

      <PolicyEditor />

      <Panel title={t("Giả định dữ liệu", "Data assumptions")}>
        {input.assumptions.length === 0 ? <p className="text-sm text-muted-foreground">{t("Không có giả định nào được ghi.", "No assumptions recorded.")}</p> : <ul className="list-disc space-y-1.5 pl-5 text-sm text-muted-foreground">{input.assumptions.map((item) => <li key={item}>{item}</li>)}</ul>}
      </Panel>

      <Panel title={t("Thông tin kỹ thuật", "Technical details")}>
        <DescList items={[
          [t("Tên trong file", "Name in file"), <code key="n" className="font-mono text-xs">{input.name}</code>],
          [t("Mã bộ dữ liệu", "Dataset ID"), <code key="i" className="font-mono text-xs break-all">{dataset.id}</code>],
          [t("Hash nguồn", "Source hash"), <code key="h" className="font-mono text-xs break-all">{dataset.source_hash}</code>],
          ["Schema", `v${dataset.schema_version}`],
          [t("Seed", "Seed"), input.seed],
          [t("Tạo lúc", "Created"), formatDateTime(dataset.created_at)],
          [t("Cập nhật", "Updated"), formatDateTime(dataset.updated_at)],
        ]} />
      </Panel>

      <section className="flex flex-col gap-3 rounded-lg border border-destructive/30 bg-card p-5 sm:flex-row sm:items-center sm:justify-between xl:col-span-2" aria-labelledby="danger-zone">
        <div><h2 id="danger-zone" className="text-sm font-semibold text-destructive">{t("Xóa bộ dữ liệu", "Delete dataset")}</h2><p className="text-sm text-muted-foreground">{t("Lần chạy và snapshot cũ vẫn được giữ. Thao tác này không thể hoàn tác.", "Existing runs and snapshots are kept. This cannot be undone.")}</p></div>
        <Button variant="destructive" onClick={onDelete}><Trash2 />{t("Xóa bộ dữ liệu", "Delete dataset")}</Button>
      </section>
    </div>
  );
}

/** Weights and production rules. There is no dedicated endpoint, so saving replaces the whole dataset (same as "Update from JSON") with these fields changed. */
function PolicyEditor() {
  const { t } = useI18n();
  const showToast = useToast();
  const { dataset, onUpdated } = useDataset();
  const input = dataset.input;
  const savedRules = Object.fromEntries(RULES.map((key) => [key, input[key]])) as Record<Rule, number>;
  const [editing, setEditing] = useState(false);
  const [weights, setWeights] = useState<Record<string, number | "">>(input.weights);
  const [rules, setRules] = useState<Record<Rule, number | "">>(savedRules);
  const keys = Object.keys(input.weights);
  const labels = Object.fromEntries(termsOf(Object.fromEntries(keys.map((key) => [key, 1]))).map((term) => [term.key, term]));
  const dirty = keys.some((key) => weights[key] !== input.weights[key]) || RULES.some((key) => rules[key] !== savedRules[key]);
  const invalid = keys.some((key) => weights[key] === "" || Number(weights[key]) < 0) || RULES.some((key) => rules[key] === "" || Number(rules[key]) < 0 || !Number.isInteger(Number(rules[key])));
  const max = Math.max(1, ...keys.map((key) => Number(weights[key]) || 0));
  const ruleLabel: Record<Rule, [string, string, string, string]> = {
    minimum_lot: ["Cỡ lô tối thiểu", "Minimum lot size", "đơn vị mỗi lô", "units per lot"],
    max_surplus: ["Dư thành phẩm tối đa", "Max finished surplus", "đơn vị dư cho phép ngoài đơn hàng", "units allowed beyond orders"],
    max_surplus_btp: ["Dư BTP tối đa", "Max semi-finished surplus", "đơn vị; 0 = không cho dư", "units; 0 = none allowed"],
    transfer_minutes: ["Thời gian chuyển công đoạn", "Stage transfer time", "phút trước khi BTP dùng được ở công đoạn sau", "minutes before semi-finished stock is usable downstream"],
  };

  const save = useMutation({
    mutationFn: () => replaceMasterDataset(dataset.id, { ...input, weights: Object.fromEntries(keys.map((key) => [key, Number(weights[key])])), ...Object.fromEntries(RULES.map((key) => [key, Number(rules[key])])) }, dataset.revision),
    onSuccess: (updated) => { onUpdated(updated); setEditing(false); showToast(t(`Đã lưu chính sách (revision ${updated.revision}).`, `Policy saved (revision ${updated.revision}).`)); },
  });
  const cancel = () => { setWeights(input.weights); setRules(savedRules); setEditing(false); save.reset(); };

  return (
    <Panel className="xl:col-span-2" title={t("Chính sách lập lịch", "Scheduling policy")} description={t("Trọng số hàm mục tiêu và quy tắc sản xuất mà mọi lần chạy dùng chung.", "Objective weights and production rules shared by every run.")}
      actions={!editing && <Button size="sm" variant="outline" onClick={() => { setWeights(input.weights); setRules(savedRules); setEditing(true); }}><Pencil />{t("Sửa chính sách", "Edit policy")}</Button>}>
      <MutationNotice error={save.error} fallback={t("Không thể lưu chính sách.", "Could not save the policy.")} className="mb-3" />
      <div className="grid gap-6 lg:grid-cols-2">
        <div>
          <h4 className="mb-2 text-xs font-semibold text-muted-foreground">{t("Trọng số mục tiêu", "Objective weights")}</h4>
          <ul className="grid gap-2.5">
            {keys.map((key) => (
              <li key={key} className="grid items-center gap-x-3 gap-y-1 sm:grid-cols-[minmax(0,11rem)_minmax(0,1fr)_5.5rem]">
                <span className="text-sm"><span className="font-medium">{labels[key]?.label ?? key}</span>{labels[key]?.help && <span className="block text-xs text-muted-foreground">{labels[key].help}</span>}</span>
                <span className="h-2 overflow-hidden rounded-full bg-grid" aria-hidden><i className="block h-full rounded-full bg-primary" style={{ width: `${((Number(weights[key]) || 0) / max) * 100}%` }} /></span>
                {editing
                  ? <Input type="number" min={0} step="any" className="h-8" aria-label={t(`Trọng số ${labels[key]?.label ?? key}`, `Weight of ${labels[key]?.label ?? key}`)} value={weights[key]} aria-invalid={weights[key] === "" || Number(weights[key]) < 0} onChange={(event) => setWeights({ ...weights, [key]: event.target.value === "" ? "" : Number(event.target.value) })} />
                  : <span className="text-right text-sm font-semibold tabular-nums">× {formatNumber(input.weights[key])}</span>}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h4 className="mb-2 text-xs font-semibold text-muted-foreground">{t("Quy tắc sản xuất", "Production rules")}</h4>
          {editing ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {RULES.map((key) => <Field key={key} label={t(ruleLabel[key][0], ruleLabel[key][1])} hint={t(ruleLabel[key][2], ruleLabel[key][3])}><Input type="number" min={0} step={1} value={rules[key]} aria-invalid={rules[key] === "" || Number(rules[key]) < 0} onChange={(event) => setRules({ ...rules, [key]: event.target.value === "" ? "" : Number(event.target.value) })} /></Field>)}
            </div>
          ) : (
            <DescList items={RULES.map((key) => [<span key={key}>{t(ruleLabel[key][0], ruleLabel[key][1])}<span className="block text-xs text-muted-foreground">{t(ruleLabel[key][2], ruleLabel[key][3])}</span></span>, <span key="v" className="font-semibold tabular-nums">{formatNumber(input[key])}</span>])} />
          )}
        </div>
      </div>
      {editing && (
        <div className="mt-4 flex flex-wrap items-center justify-end gap-2 border-t pt-3">
          <DirtyHint dirty={dirty} />
          <Badge variant="secondary" className="mr-auto hidden sm:inline-flex">{t("Lưu = thay thế toàn bộ dữ liệu, tạo revision mới", "Saving replaces the whole dataset as a new revision")}</Badge>
          <Button variant="outline" disabled={save.isPending} onClick={cancel}>{t("Hủy", "Cancel")}</Button>
          <Button disabled={!dirty || invalid || save.isPending} onClick={() => save.mutate()}>{save.isPending ? t("Đang lưu…", "Saving…") : t("Lưu chính sách", "Save policy")}</Button>
        </div>
      )}
      {!editing && (
        <Collapsible className="mt-3">
          <CollapsibleTrigger className="group inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground">{t("Vì sao lưu chính sách tạo bản “thay thế toàn bộ”?", "Why does saving the policy show as a “full replace”?")}<ChevronDown className="size-3.5 transition-transform group-data-[state=open]:rotate-180" /></CollapsibleTrigger>
          <CollapsibleContent><p className="mt-1 text-xs text-muted-foreground">{t("API chưa có endpoint riêng cho trọng số/quy tắc, nên giao diện gửi lại toàn bộ dữ liệu hiện tại với các trường này đã đổi — giống “Cập nhật từ JSON”. Lịch sử sẽ ghi là “Thay thế toàn bộ dữ liệu”.", "The API has no dedicated endpoint for weights/rules, so the interface re-sends the current dataset with these fields changed — just like “Update from JSON”. History records it as “Dataset replaced”.")}</p></CollapsibleContent>
        </Collapsible>
      )}
    </Panel>
  );
}
