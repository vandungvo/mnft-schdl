"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState, type FormEvent } from "react";

import {
  ApiError,
  apiErrorMessage,
  createScheduleRun,
  getHealth,
  listMasterDatasets,
  listProductionPlans,
} from "@/lib/api";
import type { Algorithm } from "@/lib/types";

const algorithmOptions: Array<{ value: Algorithm; label: string; description: string }> = [
  { value: "cp_sat_hint", label: "CP-SAT + EDD hint", description: "Khuyến nghị · cân bằng tốc độ và chất lượng" },
  { value: "cp_lns", label: "CP-LNS", description: "Tìm kiếm lân cận cho lịch lớn" },
  { value: "cp_sat", label: "CP-SAT", description: "Tối ưu ràng buộc chính xác" },
  { value: "simulated_annealing", label: "Simulated annealing", description: "Metaheuristic khám phá rộng" },
  { value: "genetic_algorithm", label: "Genetic algorithm", description: "Tìm kiếm theo quần thể" },
  { value: "edd", label: "EDD baseline", description: "Ưu tiên hạn giao sớm" },
  { value: "spt", label: "SPT baseline", description: "Ưu tiên công việc ngắn" },
  { value: "fifo", label: "FIFO baseline", description: "Theo thứ tự phát hành" },
];

type Source = "dataset" | "plan" | "file";

function NewRunForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const health = useQuery({ queryKey: ["health"], queryFn: getHealth });
  const datasets = useQuery({ queryKey: ["master-datasets"], queryFn: () => listMasterDatasets() });
  const plans = useQuery({ queryKey: ["production-plans"], queryFn: () => listProductionPlans() });
  const initialDatasetId = searchParams.get("datasetId") ?? "";
  const initialPlanId = searchParams.get("planId") ?? "";
  const [source, setSource] = useState<Source>(initialPlanId ? "plan" : "dataset");
  const [selectedDatasetId, setSelectedDatasetId] = useState(initialDatasetId);
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
  const defaultBudget = health.data?.solver_default_budget_seconds ?? 30;
  const maxBudget = health.data?.solver_max_budget_seconds ?? 900;
  const effectiveBudget = budget ?? defaultBudget;
  const availableAlgorithms = algorithmOptions.filter(
    (option) => !health.data || health.data.supported_algorithms.includes(option.value),
  );
  const selectedAlgorithm = algorithmOptions.find((option) => option.value === algorithm);

  const sourceReady = source === "dataset"
    ? Boolean(effectiveDatasetId && selectedDataset?.is_ready)
    : source === "plan"
      ? Boolean(effectivePlanId)
      : Boolean(input);
  const configurationError = effectiveBudget <= 0 || effectiveBudget > maxBudget
    ? `Ngân sách phải từ 1 đến ${maxBudget} giây.`
    : !Number.isInteger(seed) || seed < 0 || seed > 2_147_483_647
      ? "Random seed phải là số nguyên từ 0 đến 2.147.483.647."
      : "";

  const mutation = useMutation({
    mutationFn: () => createScheduleRun(
      {
        ...(source === "dataset"
          ? { dataset_id: effectiveDatasetId }
          : source === "plan"
            ? { plan_id: effectivePlanId }
            : { input }),
        algorithm,
        seed,
        time_budget_seconds: effectiveBudget,
      },
      crypto.randomUUID(),
    ),
    onSuccess: (run) => router.push(`/runs/${run.id}`),
  });

  async function handleFile(file?: File) {
    setFileError("");
    setInput(undefined);
    setFileName("");
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setFileError("File JSON không được vượt quá 5 MB.");
      return;
    }
    try {
      const parsed = JSON.parse(await file.text()) as Record<string, unknown>;
      if (!parsed || parsed.schema_version !== 1 || !Array.isArray(parsed.lots) || !parsed.machines || !Array.isArray(parsed.orders)) {
        throw new Error("File không có cấu trúc scheduling input schema v1 hợp lệ.");
      }
      setInput(parsed);
      setFileName(file.name);
    } catch (error) {
      setFileError(error instanceof Error ? error.message : "Không thể đọc file JSON.");
    }
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    if (sourceReady && !configurationError) mutation.mutate();
  }

  const apiError = mutation.error instanceof ApiError ? mutation.error : null;

  return (
    <section className="form-page">
      <header className="page-header">
        <div><span className="eyebrow">NEW SCHEDULE RUN</span><h1>Tạo lịch sản xuất</h1><p>Chọn nguồn dữ liệu và cấu hình solver. Backend sẽ kiểm tra lại toàn bộ trước khi xếp lịch.</p></div>
      </header>

      <form className="form-layout" onSubmit={submit} noValidate>
        <div className="form-main">
          <article className="panel form-section">
            <div className="form-section-heading"><span className="step-number">1</span><div><h2>Chọn nguồn dữ liệu</h2><p>Mỗi lần chạy lưu một snapshot độc lập để có thể tái lập.</p></div></div>
            <fieldset className="source-card-grid">
              <legend className="visually-hidden">Nguồn dữ liệu</legend>
              <label className={source === "dataset" ? "source-card source-card-active" : "source-card"}><input type="radio" name="source" checked={source === "dataset"} onChange={() => setSource("dataset")} /><span><strong>Master data</strong><small>Dữ liệu nhà máy đã chuẩn hóa</small></span></label>
              <label className={source === "plan" ? "source-card source-card-active" : "source-card"}><input type="radio" name="source" checked={source === "plan"} onChange={() => setSource("plan")} /><span><strong>Kế hoạch tổng hợp</strong><small>Snapshot đã cân đối công suất</small></span></label>
              <label className={source === "file" ? "source-card source-card-active" : "source-card"}><input type="radio" name="source" checked={source === "file"} onChange={() => setSource("file")} /><span><strong>File JSON</strong><small>Dùng một lần, không lưu master data</small></span></label>
            </fieldset>

            {source === "dataset" ? (
              datasets.isLoading ? <div className="field-skeleton">Đang tải master data…</div> : datasets.data?.items.length ? (
                <label className="form-field"><span>Bộ dữ liệu nhà máy</span><select value={effectiveDatasetId} onChange={(event) => setSelectedDatasetId(event.target.value)}>{datasets.data.items.map((dataset) => <option key={dataset.id} value={dataset.id}>{dataset.name} · rev {dataset.revision} · {dataset.counts.orders} đơn</option>)}</select><small>Run lưu đúng revision đang được chọn.</small></label>
              ) : <div className="alert alert-warning">Chưa có master data. <Link href="/master-data" className="text-link">Mở quản lý dữ liệu</Link></div>
            ) : source === "plan" ? (
              plans.isLoading ? <div className="field-skeleton">Đang tải kế hoạch…</div> : plans.data?.items.length ? (
                <label className="form-field"><span>Kế hoạch tổng hợp</span><select value={effectivePlanId} onChange={(event) => setSelectedPlanId(event.target.value)}>{plans.data.items.map((plan) => <option key={plan.id} value={plan.id}>Rev {plan.dataset_revision} · {plan.bucket_minutes === 1440 ? "theo ngày" : "theo tuần"} · {new Date(plan.created_at).toLocaleString("vi-VN")}</option>)}</select><small>Run dùng snapshot đã khóa trong kế hoạch.</small></label>
              ) : <div className="alert alert-warning">Chưa có kế hoạch. <Link href="/planning" className="text-link">Tạo kế hoạch tổng hợp</Link></div>
            ) : (
              <label className={fileError ? "upload-box upload-box-error" : "upload-box"}><span>Scheduling input</span><strong>{fileName || "Chọn hoặc kéo file JSON vào đây"}</strong><small>Schema v1 · tối đa 5 MB · backend vẫn kiểm tra đầy đủ.</small><input type="file" accept="application/json,.json" onChange={(event) => void handleFile(event.target.files?.[0])} /></label>
            )}
            {fileError && <div className="field-error" role="alert">{fileError}</div>}
          </article>

          <article className="panel form-section">
            <div className="form-section-heading"><span className="step-number">2</span><div><h2>Cấu hình phương pháp giải</h2><p>Giới hạn thời gian do backend công bố: tối đa {maxBudget} giây.</p></div></div>
            <div className="solver-fields">
              <label className="form-field solver-algorithm"><span>Thuật toán</span><select value={algorithm} onChange={(event) => setAlgorithm(event.target.value as Algorithm)}>{availableAlgorithms.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select><small>{selectedAlgorithm?.description}</small></label>
              <label className="form-field"><span>Ngân sách thời gian</span><div className="input-suffix"><input type="number" min={1} max={maxBudget} step={1} value={effectiveBudget} onChange={(event) => setBudget(event.target.value === "" ? 0 : Number(event.target.value))} /><span>giây</span></div></label>
              <label className="form-field"><span>Random seed</span><input type="number" min={0} max={2_147_483_647} step={1} value={seed} onChange={(event) => setSeed(Number(event.target.value))} /><small>Cùng input và seed giúp tái lập kết quả.</small></label>
            </div>
            {configurationError && <div className="field-error" role="alert">{configurationError}</div>}
          </article>
        </div>

        <aside className="panel form-summary">
          <span className="eyebrow">RUN SUMMARY</span><h2>Sẵn sàng khởi chạy</h2>
          <dl>
            <div><dt>Nguồn</dt><dd>{source === "dataset" ? "Master data" : source === "plan" ? "Kế hoạch tổng hợp" : "File JSON"}</dd></div>
            <div><dt>Dữ liệu</dt><dd>{source === "dataset" ? selectedDataset?.name ?? "Chưa chọn" : source === "plan" ? selectedPlan ? `Revision ${selectedPlan.dataset_revision}` : "Chưa chọn" : fileName || "Chưa chọn file"}</dd></div>
            <div><dt>Thuật toán</dt><dd>{selectedAlgorithm?.label}</dd></div>
            <div><dt>Ngân sách</dt><dd>{effectiveBudget} giây</dd></div>
          </dl>
          {source === "dataset" && selectedDataset && <div className="summary-note"><strong>{selectedDataset.counts.machines} máy · {selectedDataset.counts.lots} lô</strong><span>Revision {selectedDataset.revision} · {Math.round(selectedDataset.horizon / 1440)} ngày</span></div>}
          {apiError && <div className="alert alert-error" role="alert"><strong>{apiError.code}</strong><br />{apiErrorMessage(apiError, "Không thể tạo lịch.")}{apiError.requestId && <small>Request ID: {apiError.requestId}</small>}</div>}
          <button type="submit" className="button button-primary button-wide" disabled={mutation.isPending || !sourceReady || Boolean(configurationError)}>{mutation.isPending ? "Đang khởi tạo…" : "Bắt đầu lập lịch"}</button>
          <button type="button" className="button button-quiet button-wide" onClick={() => router.back()}>Quay lại</button>
          <small className="submit-help">Lịch chỉ được lưu sau khi vượt qua bộ kiểm tra độc lập.</small>
        </aside>
      </form>
    </section>
  );
}

export default function NewRunPage() {
  return <Suspense fallback={<div className="panel empty">Đang tải cấu hình…</div>}><NewRunForm /></Suspense>;
}
