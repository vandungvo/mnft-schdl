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
import { ALGORITHMS, familyLabel, type AlgorithmFamily } from "@/lib/algorithms";
import { apiErrorMessage, createScheduleRun, getHealth } from "@/lib/api";
import type { Algorithm } from "@/lib/types";
import { cn } from "@/lib/utils";

const DEFAULT: Algorithm[] = ["edd", "simulated_annealing", "cp_sat_hint", "cp_lns"];
const SEED_POOL = [11, 47, 83];
const deterministic = (value: Algorithm) => ["fifo", "edd", "spt"].includes(value);

export function GenerateDialog({ datasetId, open, onClose }: { datasetId: string; open: boolean; onClose: () => void }) {
  const { t } = useI18n();
  const health = useQuery({ queryKey: ["health"], queryFn: getHealth });
  const queryClient = useQueryClient();
  const showToast = useToast();
  const [picked, setPicked] = useState<Algorithm[]>(DEFAULT);
  const [seeds, setSeeds] = useState(1);
  const [budget, setBudget] = useState<number | null>(null);
  const supported = ALGORITHMS.filter((item) => !health.data || health.data.supported_algorithms.includes(item.value));
  const maxBudget = health.data?.solver_max_budget_seconds ?? 900;
  const effectiveBudget = budget ?? health.data?.solver_default_budget_seconds ?? 30;
  const runCount = picked.reduce((sum, value) => sum + (deterministic(value) ? 1 : seeds), 0);
  const invalid = !picked.length || effectiveBudget < 1 || effectiveBudget > maxBudget;

  const mutation = useMutation({
    mutationFn: async () => {
      const failures: string[] = [];
      let created = 0;
      for (const algorithm of picked) {
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
          {families.map(({ family, items }) => (
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
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t("Số seed cho thuật toán ngẫu nhiên", "Seeds for randomised algorithms")}>
              <Select value={String(seeds)} onValueChange={(value) => setSeeds(Number(value))}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>{[1, 2, 3].map((n) => <SelectItem key={n} value={String(n)}>{n} seed</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label={t("Ngân sách mỗi lần chạy (giây)", "Budget per run (seconds)")}>
              <Input type="number" min={1} max={maxBudget} value={effectiveBudget} onChange={(event) => setBudget(event.target.value === "" ? 0 : Number(event.target.value))} />
            </Field>
          </div>
          {invalid && <p role="alert" className="rounded-md bg-danger-soft px-3 py-2 text-sm text-destructive">{picked.length ? t(`Ngân sách phải từ 1 đến ${maxBudget} giây.`, `Budget must be between 1 and ${maxBudget} seconds.`) : t("Chọn ít nhất một thuật toán.", "Choose at least one algorithm.")}</p>}
        </form>
        <DialogFooter className="items-center gap-2 sm:justify-between">
          <span className="text-sm text-muted-foreground">{t(`${runCount} lần chạy · tối đa ≈ ${Math.ceil((runCount * effectiveBudget) / 60)} phút nếu chạy tuần tự`, `${runCount} runs · up to ≈ ${Math.ceil((runCount * effectiveBudget) / 60)} min if run sequentially`)}</span>
          <div className="flex gap-2">
            <Button variant="outline" disabled={mutation.isPending} onClick={onClose}>{t("Hủy", "Cancel")}</Button>
            <Button type="submit" form="generate-form" disabled={invalid || mutation.isPending}>{mutation.isPending ? t("Đang gửi…", "Submitting…") : t(`Sinh ${runCount} phương án`, `Generate ${runCount} options`)}</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
