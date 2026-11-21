"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { Field } from "@/components/blocks";
import { useI18n } from "@/components/i18n-provider";
import { useToast } from "@/components/toast-provider";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ALGORITHMS, availableFor, familyLabel, type AlgorithmFamily } from "@/lib/algorithms";
import { apiErrorMessage, createScheduleRun, getHealth } from "@/lib/api";
import type { Algorithm } from "@/lib/types";
import { cn } from "@/lib/utils";

const DEFAULT: Algorithm[] = ["edd", "hybrid", "simulated_annealing", "cp_sat_hint"];
const SEED_POOL = [11, 47, 83];
const deterministic = (value: Algorithm) => ["fifo", "edd", "spt"].includes(value);

/* A planner picks how long to wait, not which solver: each preset is the fast rule everyone knows (EDD, a
   schedule within a second, kept as the yardstick) plus the method that does the work within a time budget. */
export type Preset = "quick" | "balanced" | "thorough";
interface Plan { algorithms: Algorithm[]; budget: number; seeds: number; hint: [string, string] }
const LABELS: Record<Preset, [string, string]> = { quick: ["Nhanh", "Quick"], balanced: ["Cân bằng", "Balanced"], thorough: ["Kỹ", "Thorough"] };
/* 5-stage model: "hybrid" (rules → SA on several seeds → CP-SAT from the best schedule, every core). Its budget is the
   whole wait: about 40% goes to the search that brings late orders down, the rest to CP-SAT cutting operating cost. */
const PRESETS: Record<Preset, Plan> = {
  quick: { algorithms: ["edd", "hybrid"], budget: 60, seeds: 1, hint: ["Khoảng 1 phút — đủ để xem tình hình và số đơn trễ", "About a minute — enough to see where things stand and how many orders are late"] },
  balanced: { algorithms: ["edd", "hybrid"], budget: 180, seeds: 1, hint: ["Khuyến nghị cho kỳ 2 tuần · khoảng 3 phút", "Recommended for a 2-week period · about 3 minutes"] },
  thorough: { algorithms: ["edd", "hybrid"], budget: 600, seeds: 1, hint: ["Giảm thêm chi phí vận hành khi còn thời gian · khoảng 10 phút", "Cuts operating cost further when there is time · about 10 minutes"] },
};
/* 4-stage model (no hybrid): CP-SAT needs minutes, so "Quick" runs the rules and one short search only. */
const PRESETS_V4: Record<Preset, Plan> = {
  quick: { algorithms: ["edd", "spt", "simulated_annealing"], budget: 30, seeds: 1, hint: ["Luật điều độ + một lần tìm kiếm ngắn, khoảng 1 phút (chưa có CP-SAT)", "Dispatching rules + one short search, about a minute (no CP-SAT)"] },
  balanced: { algorithms: ["edd", "simulated_annealing", "cp_sat_hint", "cp_lns"], budget: 120, seeds: 1, hint: ["Khoảng 5–8 phút", "About 5–8 minutes"] },
  thorough: { algorithms: ["edd", "simulated_annealing", "genetic_algorithm", "cp_sat_hint", "cp_lns"], budget: 300, seeds: 2, hint: ["Tìm lịch tốt hơn khi còn thời gian · có thể tới 30–60 phút", "Searches harder when there is time · can take 30–60 minutes"] },
};

export function GenerateDialog({ datasetId, schemaVersion, open, preset: initial, onClose }: { datasetId: string; schemaVersion?: number; open: boolean; preset?: Preset; onClose: () => void }) {
  const { t } = useI18n();
  const health = useQuery({ queryKey: ["health"], queryFn: getHealth });
  const queryClient = useQueryClient();
  const showToast = useToast();
  const [mode, setMode] = useState<Preset | "custom">(initial ?? "balanced");
  // Opened from "Generate with Thorough": start on that preset.
  const [openedWith, setOpenedWith] = useState<{ open: boolean; initial?: Preset }>({ open, initial });
  if (openedWith.open !== open || openedWith.initial !== initial) {
    setOpenedWith({ open, initial });
    if (open) setMode(initial ?? "balanced");
  }
  const [customPicked, setPicked] = useState<Algorithm[]>(DEFAULT);
  const [customSeeds, setSeeds] = useState(1);
  const [budget, setBudget] = useState<number | null>(null);
  const presets = schemaVersion === 5 ? PRESETS : PRESETS_V4;
  const preset = mode === "custom" ? null : presets[mode];
  const picked = preset ? preset.algorithms : customPicked;
  const seeds = preset ? preset.seeds : customSeeds;
  const supported = ALGORITHMS.filter((item) => (!health.data || health.data.supported_algorithms.includes(item.value)) && availableFor(item.value, schemaVersion));
  // Only methods this production model has are run, whatever is ticked.
  const runnable = picked.filter((value) => availableFor(value, schemaVersion));
  const maxBudget = health.data?.solver_max_budget_seconds ?? 900;
  const effectiveBudget = preset ? Math.min(preset.budget, maxBudget) : budget ?? health.data?.solver_default_budget_seconds ?? 30;
  const runCount = runnable.reduce((sum, value) => sum + (deterministic(value) ? 1 : seeds), 0);
  // Rules finish in seconds whatever the budget; only the others use it.
  const waitMinutes = Math.ceil(runnable.reduce((sum, value) => sum + (deterministic(value) ? 0.1 : seeds * effectiveBudget), 0) / 60);
  const invalid = !runnable.length || effectiveBudget < 1 || effectiveBudget > maxBudget;

  const mutation = useMutation({
    mutationFn: async () => {
      const failures: string[] = [];
      let created = 0;
      for (const algorithm of runnable) {
        for (const seed of SEED_POOL.slice(0, deterministic(algorithm) ? 1 : seeds)) {
          try {
            await createScheduleRun({ dataset_id: datasetId, algorithm, seed, time_budget_seconds: effectiveBudget }, crypto.randomUUID());
            created += 1;
          } catch (error) {
            failures.push(`${algorithm}: ${apiErrorMessage(error, t("không tạo được", "could not be created"))}`);
          }
        }
      }
      return { created, failures };
    },
    onSuccess: async ({ created, failures }) => {
      await queryClient.invalidateQueries({ queryKey: ["schedule-runs"] });
      await queryClient.invalidateQueries({ queryKey: ["dataset-runs", datasetId] });
      // A planning period shows its run counts and status in its header.
      void queryClient.invalidateQueries({ queryKey: ["period"] });
      if (created) showToast(t(`Đã đưa ${created} lần chạy vào hàng đợi. Phương án mới sẽ tự xuất hiện khi solver xong.`, `Queued ${created} runs. New options will appear when the solver finishes.`), "success");
      if (failures.length) showToast(failures.join(" · "), "error");
      if (created) onClose();
    },
  });

  const families = (["rule", "search", "cp"] as AlgorithmFamily[]).map((family) => ({ family, items: supported.filter((item) => item.family === family) })).filter((group) => group.items.length);
  const toggle = (value: Algorithm) => setPicked((list) => (list.includes(value) ? list.filter((item) => item !== value) : [...list, value]));

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next && !mutation.isPending) onClose(); }}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t("Sinh thêm phương án", "Generate more options")}</DialogTitle>
          <DialogDescription>{t("Mỗi thuật toán cho một lịch khả thi trên cùng dữ liệu. Hệ thống tự giữ lại các lịch không bị lịch nào khác hơn ở mọi mặt để bạn so sánh.", "Each algorithm yields one feasible schedule from the same data. The system keeps the schedules no other schedule beats on every axis for you to compare.")}</DialogDescription>
        </DialogHeader>
        <form id="generate-form" className="grid gap-4" onSubmit={(event) => { event.preventDefault(); if (!invalid) mutation.mutate(); }}>
          <div role="radiogroup" aria-label={t("Mức tìm kiếm", "Search effort")} className="grid gap-2 sm:grid-cols-3">
            {(Object.keys(presets) as Preset[]).map((key) => (
              <button key={key} type="button" role="radio" aria-checked={mode === key} onClick={() => setMode(key)}
                className={cn("grid gap-0.5 rounded-lg border p-3 text-left transition-colors hover:border-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none", mode === key && "border-primary bg-accent")}>
                <strong className="text-sm font-semibold">{t(...LABELS[key])}</strong>
                <small className="text-xs text-muted-foreground">{t(...presets[key].hint)}</small>
              </button>
            ))}
          </div>
          <button type="button" className="justify-self-start text-sm font-medium text-primary hover:underline" onClick={() => setMode(mode === "custom" ? "balanced" : "custom")} aria-expanded={mode === "custom"}>
            {mode === "custom" ? t("← Dùng mức có sẵn", "← Use a preset") : t("Tuỳ chỉnh thuật toán, seed và ngân sách…", "Customise algorithms, seeds and budget…")}
          </button>
          {mode === "custom" && families.map(({ family, items }) => (
            <fieldset key={family} className="grid gap-2">
              <legend className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">{familyLabel(family)}</legend>
              <div className="grid gap-2 sm:grid-cols-3">
                {items.map((item) => {
                  const on = picked.includes(item.value);
                  return (
                    <label key={item.value} className={cn("flex cursor-pointer items-start gap-2.5 rounded-lg border p-3 transition-colors hover:border-primary", on && "border-primary bg-accent")}>
                      <Checkbox checked={on} onCheckedChange={() => toggle(item.value)} className="mt-0.5" />
                      <span className="grid gap-0.5"><strong className="text-sm font-semibold">{item.label}</strong><small className="text-xs text-muted-foreground">{item.description}</small></span>
                    </label>
                  );
                })}
              </div>
            </fieldset>
          ))}
          {mode === "custom" && <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t("Số seed cho thuật toán ngẫu nhiên", "Seeds for randomised algorithms")}>
              <Select value={String(seeds)} onValueChange={(value) => setSeeds(Number(value))}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>{[1, 2, 3].map((n) => <SelectItem key={n} value={String(n)}>{n} seed</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label={t("Ngân sách mỗi lần chạy (giây)", "Budget per run (seconds)")}>
              <Input type="number" min={1} max={maxBudget} value={effectiveBudget} onChange={(event) => setBudget(event.target.value === "" ? 0 : Number(event.target.value))} />
            </Field>
          </div>}
          {mode === "custom" && budget != null && budget < 120 && runnable.some((value) => value.startsWith("cp_")) && <p className="rounded-md bg-warning-soft px-3 py-2 text-sm text-warning">{t("Ngân sách dưới 2 phút thường không đủ để CP-SAT cải thiện lịch 2 tuần; nó sẽ giữ lịch EDD.", "Under 2 minutes is usually too short for CP-SAT to improve a 2-week schedule; it will keep the EDD schedule.")}</p>}
          {invalid && <p role="alert" className="rounded-md bg-danger-soft px-3 py-2 text-sm text-destructive">{picked.length ? t(`Ngân sách phải từ 1 đến ${maxBudget} giây.`, `Budget must be between 1 and ${maxBudget} seconds.`) : t("Chọn ít nhất một thuật toán.", "Choose at least one algorithm.")}</p>}
        </form>
        <DialogFooter className="items-center gap-2 sm:justify-between">
          <span className="text-sm text-muted-foreground">{t(`${runCount} lần chạy · tối đa ≈ ${waitMinutes} phút nếu chạy tuần tự`, `${runCount} runs · up to ≈ ${waitMinutes} min if run sequentially`)}</span>
          <div className="flex gap-2">
            <Button variant="outline" disabled={mutation.isPending} onClick={onClose}>{t("Hủy", "Cancel")}</Button>
            <Button type="submit" form="generate-form" disabled={invalid || mutation.isPending}>{mutation.isPending ? t("Đang gửi…", "Submitting…") : t(`Sinh ${runCount} phương án`, `Generate ${runCount} options`)}</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
