"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { AlertCircle, FileJson, Play } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState, type FormEvent } from "react";

import { DescList, Field, FormStep, PageHeader } from "@/components/blocks";
import { useI18n } from "@/components/i18n-provider";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiError, apiErrorMessage, createScheduleRun, getHealth, listMasterDatasets, listProductionPlans } from "@/lib/api";
import { algorithmInfo } from "@/lib/algorithms";
import { formatDateTime, formatInputName } from "@/lib/format";
import type { Algorithm } from "@/lib/types";
import { cn } from "@/lib/utils";

const RECOMMENDED: Algorithm[] = ["cp_sat_hint", "cp_lns", "cp_sat", "cp_rolling", "simulated_annealing", "genetic_algorithm", "edd", "spt", "fifo"];
const algorithmOptions = RECOMMENDED.map((value) => algorithmInfo(value));
const SOURCES = [
  { value: "dataset", title: ["Master data", "Master data"], text: ["Dữ liệu nhà máy đã chuẩn hóa", "Normalised factory data"] },
  { value: "plan", title: ["Kế hoạch tổng hợp", "Aggregate plan"], text: ["Snapshot đã cân đối công suất", "Capacity-balanced snapshot"] },
  { value: "file", title: ["File JSON", "JSON file"], text: ["Dùng một lần, không lưu master data", "One-off, not saved as master data"] },
] as const;

type Source = (typeof SOURCES)[number]["value"];

function NewRunForm() {
  const { t } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();
  const health = useQuery({ queryKey: ["health"], queryFn: getHealth });
  const datasets = useQuery({ queryKey: ["master-datasets"], queryFn: () => listMasterDatasets() });
  const plans = useQuery({ queryKey: ["production-plans"], queryFn: () => listProductionPlans() });
  const initialPlanId = searchParams.get("planId") ?? "";
  const [source, setSource] = useState<Source>(initialPlanId ? "plan" : "dataset");
  const [selectedDatasetId, setSelectedDatasetId] = useState(searchParams.get("datasetId") ?? "");
  const [selectedPlanId, setSelectedPlanId] = useState(initialPlanId);
  const [input, setInput] = useState<unknown>();
  const [fileName, setFileName] = useState("");
  const [fileError, setFileError] = useState("");
  const [algorithm, setAlgorithm] = useState<Algorithm>("cp_sat_hint");
  const [budget, setBudget] = useState<number | null>(null);
  const [seed, setSeed] = useState(11);

  const effectiveDatasetId = selectedDatasetId || datasets.data?.items[0]?.id || "";
  const effectivePlanId = selectedPlanId || plans.data?.items[0]?.id || "";
  const selectedDataset = datasets.data?.items.find((item) => item.id === effectiveDatasetId);
  const selectedPlan = plans.data?.items.find((item) => item.id === effectivePlanId);
  const maxBudget = health.data?.solver_max_budget_seconds ?? 900;
  const effectiveBudget = budget ?? health.data?.solver_default_budget_seconds ?? 30;
  const availableAlgorithms = algorithmOptions.filter((option) => !health.data || health.data.supported_algorithms.includes(option.value));
  const selectedAlgorithm = algorithmOptions.find((option) => option.value === algorithm);

  const sourceReady = source === "dataset" ? Boolean(effectiveDatasetId && selectedDataset?.is_ready) : source === "plan" ? Boolean(effectivePlanId) : Boolean(input);
  const configurationError = effectiveBudget <= 0 || effectiveBudget > maxBudget
    ? t(`Ngân sách phải từ 1 đến ${maxBudget} giây.`, `Budget must be between 1 and ${maxBudget} seconds.`)
    : !Number.isInteger(seed) || seed < 0 || seed > 2_147_483_647 ? t("Random seed phải là số nguyên từ 0 đến 2.147.483.647.", "Random seed must be an integer from 0 to 2,147,483,647.") : "";

  const mutation = useMutation({
    mutationFn: () => createScheduleRun({
      ...(source === "dataset" ? { dataset_id: effectiveDatasetId } : source === "plan" ? { plan_id: effectivePlanId } : { input }),
      algorithm, seed, time_budget_seconds: effectiveBudget,
    }, crypto.randomUUID()),
    onSuccess: (run) => router.push(`/runs/${run.id}`),
  });

  async function handleFile(file?: File) {
    setFileError(""); setInput(undefined); setFileName("");
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { setFileError(t("File JSON không được vượt quá 5 MB.", "The JSON file must not exceed 5 MB.")); return; }
    try {
      const parsed = JSON.parse(await file.text()) as Record<string, unknown>;
      if (!parsed || typeof parsed.schema_version !== "number" || !Array.isArray(parsed.lots) || !parsed.machines || !Array.isArray(parsed.orders)) {
        throw new Error(t("File không có cấu trúc scheduling input hợp lệ (cần schema_version, machines, orders, lots).", "The file is not a valid scheduling input (needs schema_version, machines, orders, lots)."));
      }
      setInput(parsed); setFileName(file.name);
    } catch (error) {
      setFileError(error instanceof Error ? error.message : t("Không thể đọc file JSON.", "Could not read the JSON file."));
    }
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    if (sourceReady && !configurationError) mutation.mutate();
  }

  const apiError = mutation.error instanceof ApiError ? mutation.error : null;

  return (
    <div className="max-w-6xl">
      <PageHeader title={t("Tạo một lần chạy", "Create a run")}
        description={<>{t("Chạy một thuật toán trên một nguồn dữ liệu. Muốn sinh nhiều phương án để so sánh và chốt, dùng", "Run one algorithm on one data source. To generate several options to compare and commit, use the")} <Link href="/decide" className="font-semibold text-primary hover:underline">{t("Bàn điều độ", "Scheduling desk")}</Link>.</>} />
      <form className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_320px]" onSubmit={submit} noValidate>
        <div className="grid gap-4">
          <FormStep step="1" title={t("Chọn nguồn dữ liệu", "Choose a data source")} description={t("Mỗi lần chạy lưu một snapshot độc lập để có thể tái lập.", "Each run stores its own snapshot so it can be reproduced.")}>
            <fieldset className="mb-5 grid gap-2.5 sm:grid-cols-3">
              <legend className="sr-only">{t("Nguồn dữ liệu", "Data source")}</legend>
              {SOURCES.map((item) => (
                <label key={item.value} className={cn("flex cursor-pointer items-start gap-2.5 rounded-lg border bg-surface-2 p-3.5 transition-colors hover:border-primary", source === item.value && "border-primary bg-accent shadow-[inset_0_0_0_1px_var(--primary)]")}>
                  <input type="radio" name="source" className="mt-1 accent-primary" checked={source === item.value} onChange={() => setSource(item.value)} />
                  <span><strong className="block text-sm font-semibold">{t(item.title)}</strong><small className="text-xs text-muted-foreground">{t(item.text)}</small></span>
                </label>
              ))}
            </fieldset>
            {source === "dataset" ? (
              datasets.isLoading ? <Skeleton className="h-9" /> : datasets.data?.items.length ? (
                <Field label={t("Bộ dữ liệu nhà máy", "Factory dataset")} hint={t("Lần chạy lưu đúng revision đang được chọn.", "The run stores the currently selected revision.")}>
                  <Select value={effectiveDatasetId} onValueChange={setSelectedDatasetId}>
                    <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>{datasets.data.items.map((dataset) => <SelectItem key={dataset.id} value={dataset.id}>{formatInputName(dataset.name)} · rev {dataset.revision} · {dataset.counts.orders} {t("đơn", "orders")}</SelectItem>)}</SelectContent>
                  </Select>
                </Field>
              ) : <Alert className="border-warning/40 bg-warning-soft"><AlertDescription>{t("Chưa có master data.", "No master data yet.")} <Link href="/master-data" className="font-semibold text-primary hover:underline">{t("Mở quản lý dữ liệu", "Open data management")}</Link></AlertDescription></Alert>
            ) : source === "plan" ? (
              plans.isLoading ? <Skeleton className="h-9" /> : plans.data?.items.length ? (
                <Field label={t("Kế hoạch tổng hợp", "Aggregate plan")} hint={t("Lần chạy dùng snapshot đã khóa trong kế hoạch.", "The run uses the snapshot locked in the plan.")}>
                  <Select value={effectivePlanId} onValueChange={setSelectedPlanId}>
                    <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>{plans.data.items.map((plan) => <SelectItem key={plan.id} value={plan.id}>Rev {plan.dataset_revision} · {plan.bucket_minutes === 1440 ? t("theo ngày", "daily") : t("theo tuần", "weekly")} · {formatDateTime(plan.created_at)}</SelectItem>)}</SelectContent>
                  </Select>
                </Field>
              ) : <Alert className="border-warning/40 bg-warning-soft"><AlertDescription>{t("Chưa có kế hoạch.", "No plans yet.")} <Link href="/planning" className="font-semibold text-primary hover:underline">{t("Tạo kế hoạch tổng hợp", "Create an aggregate plan")}</Link></AlertDescription></Alert>
            ) : (
              <label className={cn("relative flex cursor-pointer flex-col items-center gap-1.5 rounded-lg border-[1.5px] border-dashed bg-surface-2 p-7 text-center transition-colors hover:border-primary focus-within:ring-2 focus-within:ring-ring", fileError && "border-destructive bg-danger-soft")}>
                <FileJson className="size-7 text-muted-foreground" />
                <strong>{fileName || t("Chọn hoặc kéo file JSON vào đây", "Choose or drop a JSON file here")}</strong>
                <small className="text-xs text-muted-foreground">{t("Scheduling input JSON · tối đa 5 MB · backend vẫn kiểm tra đầy đủ.", "Scheduling input JSON · up to 5 MB · the backend still validates everything.")}</small>
                <input type="file" accept="application/json,.json" className="absolute inset-0 cursor-pointer opacity-0" onChange={(event) => void handleFile(event.target.files?.[0])} />
              </label>
            )}
            {fileError && <p role="alert" className="mt-3 rounded-md bg-danger-soft px-3 py-2 text-sm text-destructive">{fileError}</p>}
          </FormStep>

          <FormStep step="2" title={t("Cấu hình phương pháp giải", "Configure the solver")} description={t(`Giới hạn thời gian do backend công bố: tối đa ${maxBudget} giây.`, `Time limit published by the backend: up to ${maxBudget} seconds.`)}>
            <div className="grid gap-4 md:grid-cols-[1.5fr_0.75fr_0.75fr]">
              <Field label={t("Thuật toán", "Algorithm")} hint={selectedAlgorithm?.description}>
                <Select value={algorithm} onValueChange={(value) => setAlgorithm(value as Algorithm)}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>{availableAlgorithms.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
              <Field label={t("Ngân sách (giây)", "Budget (seconds)")}><Input type="number" min={1} max={maxBudget} step={1} value={effectiveBudget} onChange={(event) => setBudget(event.target.value === "" ? 0 : Number(event.target.value))} /></Field>
              <Field label="Random seed" hint={t("Cùng input và seed giúp tái lập.", "Same input and seed make the run reproducible.")}><Input type="number" min={0} max={2_147_483_647} step={1} value={seed} onChange={(event) => setSeed(Number(event.target.value))} /></Field>
            </div>
            {configurationError && <p role="alert" className="mt-3 rounded-md bg-danger-soft px-3 py-2 text-sm text-destructive">{configurationError}</p>}
          </FormStep>
        </div>

        <aside className="rounded-lg border bg-card p-5 shadow-card lg:sticky lg:top-20">
          <span className="mb-1 block text-xs font-semibold text-muted-foreground">{t("Tóm tắt", "Summary")}</span>
          <h2 className="mb-3 text-lg font-semibold">{t("Sẵn sàng khởi chạy", "Ready to launch")}</h2>
          <DescList items={[
            [t("Nguồn", "Source"), source === "dataset" ? "Master data" : source === "plan" ? t("Kế hoạch tổng hợp", "Aggregate plan") : t("File JSON", "JSON file")],
            [t("Dữ liệu", "Data"), source === "dataset" ? (selectedDataset ? formatInputName(selectedDataset.name) : t("Chưa chọn", "Not selected")) : source === "plan" ? (selectedPlan ? `Revision ${selectedPlan.dataset_revision}` : t("Chưa chọn", "Not selected")) : fileName || t("Chưa chọn file", "No file selected")],
            [t("Thuật toán", "Algorithm"), selectedAlgorithm?.label],
            [t("Ngân sách", "Budget"), t(`${effectiveBudget} giây`, `${effectiveBudget} seconds`)],
          ]} />
          {source === "dataset" && selectedDataset && <div className="mt-3 rounded-lg bg-accent px-3 py-2.5 text-xs text-accent-foreground"><strong className="block">{selectedDataset.counts.machines} {t("máy", "machines")} · {selectedDataset.counts.lots} {t("lô", "lots")}</strong>Revision {selectedDataset.revision} · {Math.round(selectedDataset.horizon / 1440)} {t("ngày", "days")}</div>}
          {apiError && <Alert variant="destructive" className="mt-3"><AlertCircle /><AlertTitle>{apiError.code}</AlertTitle><AlertDescription>{apiErrorMessage(apiError, t("Không thể tạo lịch.", "Could not create the schedule."))}{apiError.requestId && <small className="block">Request ID: {apiError.requestId}</small>}</AlertDescription></Alert>}
          <Button type="submit" className="mt-4 w-full" disabled={mutation.isPending || !sourceReady || Boolean(configurationError)}><Play />{mutation.isPending ? t("Đang khởi tạo…", "Starting…") : t("Bắt đầu lập lịch", "Start scheduling")}</Button>
          <Button type="button" variant="ghost" className="mt-1 w-full" onClick={() => router.back()}>{t("Quay lại", "Back")}</Button>
          <p className="mt-2 text-center text-xs text-muted-foreground">{t("Lịch chỉ được lưu sau khi vượt qua bộ kiểm tra độc lập.", "A schedule is only saved after it passes the independent validator.")}</p>
        </aside>
      </form>
    </div>
  );
}

export default function NewRunPage() {
  return <Suspense fallback={<Skeleton className="h-64" />}><NewRunForm /></Suspense>;
}
