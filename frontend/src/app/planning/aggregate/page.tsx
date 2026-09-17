"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { api, AggregateRun } from "@/lib/api";

export default function AggregatePlanningPage() {
  const [run, setRun] = useState<AggregateRun | null>(null);

  const runAggregate = useMutation({
    mutationFn: api.runAggregatePlanning,
    onSuccess: (data) => setRun(data),
  });

  const bottleneck = useQuery({
    queryKey: ["bottleneck", run?.id],
    queryFn: () => api.getBottleneck(run!.id),
    enabled: !!run,
  });

  const rows = run ? Object.values(run.result.plan).sort((a, b) => a.day - b.day || a.type.localeCompare(b.type)) : [];

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Kế hoạch sản xuất tổng hợp (Aggregate Planning)</h1>
      <p className="text-sm text-slate-600">
        Chạy Tầng 1 (CP-SAT) trên đơn hàng + tồn kho hiện có trong hệ thống, theo ngày (horizon 10
        ngày làm việc ~ 2 tuần, đại diện cho lịch tháng/quý ở MVP này).
      </p>

      <button
        onClick={() => runAggregate.mutate()}
        disabled={runAggregate.isPending}
        className="rounded bg-slate-900 px-4 py-2 text-sm text-white disabled:opacity-50"
      >
        {runAggregate.isPending ? "Đang giải CP-SAT..." : "Chạy Aggregate Planning"}
      </button>
      {runAggregate.isError && (
        <p className="text-sm text-red-600">{(runAggregate.error as Error).message}</p>
      )}

      {run && (
        <>
          <section className="rounded-lg border bg-white p-4">
            <h2 className="mb-2 text-lg font-semibold">
              Kết quả run #{run.id} — status: {run.result.status}
            </h2>
            <dl className="grid grid-cols-2 gap-2 text-sm text-slate-700 sm:grid-cols-5">
              <div>
                <dt className="text-slate-500">Chi phí trễ hạn</dt>
                <dd>{run.result.cost_backlog}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Chi phí dưới an toàn</dt>
                <dd>{run.result.cost_safety}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Chi phí tồn kho</dt>
                <dd>{run.result.cost_hold}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Chi phí đổi khuôn</dt>
                <dd>{run.result.cost_setup}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Thiếu hụt cuối kỳ</dt>
                <dd>{run.result.cost_end_shortfall}</dd>
              </div>
            </dl>
          </section>

          <section className="overflow-x-auto rounded-lg border bg-white p-4">
            <h2 className="mb-3 text-lg font-semibold">Sản lượng theo ngày/loại</h2>
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className="border-b">
                  <th className="py-1 pr-4">Ngày</th>
                  <th className="py-1 pr-4">Loại</th>
                  <th className="py-1 pr-4">Đúc (cast)</th>
                  <th className="py-1 pr-4">CNC</th>
                  <th className="py-1 pr-4">WIP</th>
                  <th className="py-1 pr-4">FG</th>
                  <th className="py-1 pr-4">Giao</th>
                  <th className="py-1 pr-4">Trễ hạn</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={`${r.type}-${r.day}`} className="border-b last:border-0">
                    <td className="py-1 pr-4">{r.day}</td>
                    <td className="py-1 pr-4">{r.type}</td>
                    <td className="py-1 pr-4">{r.cast}</td>
                    <td className="py-1 pr-4">{r.cnc}</td>
                    <td className="py-1 pr-4">{r.wip}</td>
                    <td className="py-1 pr-4">{r.fg}</td>
                    <td className="py-1 pr-4">{r.shipped}</td>
                    <td className={`py-1 pr-4 ${r.backlog > 0 ? "font-semibold text-red-600" : ""}`}>
                      {r.backlog}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section className="rounded-lg border bg-white p-4">
            <h2 className="mb-2 text-lg font-semibold">Giải thích nhanh (bottleneck)</h2>
            {bottleneck.isLoading && <p>Đang tải...</p>}
            {bottleneck.data && (
              <ul className="list-disc space-y-1 pl-5 text-sm">
                {bottleneck.data.lines.map((line, i) => (
                  <li key={i}>{line}</li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );
}
