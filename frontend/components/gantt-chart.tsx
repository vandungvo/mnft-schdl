"use client";

import { useMemo, useState } from "react";

import { formatDuration, minuteToDateTime } from "@/lib/format";
import type { ScheduleOperation } from "@/lib/types";

const stageColors: Record<string, string> = { cast: "#2563eb", cnc: "#7c3aed", paint: "#db2777", qc: "#059669" };
const stageLabels: Record<string, string> = { cast: "Đúc", cnc: "CNC", paint: "Sơn", qc: "Kiểm tra chất lượng" };

interface Props { operations: ScheduleOperation[]; horizonMinutes: number; timeOrigin: string; }

export function GanttChart({ operations, horizonMinutes, timeOrigin }: Props) {
  const [machineFilter, setMachineFilter] = useState("all");
  const [stageFilter, setStageFilter] = useState("all");
  const [zoom, setZoom] = useState(1);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const machines = useMemo(() => [...new Set(operations.map((item) => item.machine))], [operations]);
  const stages = useMemo(() => [...new Set(operations.map((item) => item.stage))], [operations]);
  const visibleOperations = operations.filter((item) => (machineFilter === "all" || item.machine === machineFilter) && (stageFilter === "all" || item.stage === stageFilter));
  const visibleMachines = machines.filter((machine) => machineFilter === "all" ? visibleOperations.some((item) => item.machine === machine) : machine === machineFilter);
  const selected = visibleOperations.find((item) => item.id === selectedId) ?? null;
  const keyboardActiveId = selected?.id ?? visibleOperations[0]?.id;
  const left = 132;
  const plotWidth = Math.max(900, 1500 * zoom);
  const rowHeight = 52;
  const top = 48;
  const height = top + visibleMachines.length * rowHeight + 20;
  const scale = plotWidth / Math.max(horizonMinutes, 1);
  const dayCount = Math.ceil(horizonMinutes / 1440);

  return (
    <>
      <div className="gantt-toolbar" aria-label="Bộ lọc biểu đồ Gantt">
        <label className="form-field"><span>Máy</span><select value={machineFilter} onChange={(event) => setMachineFilter(event.target.value)}><option value="all">Tất cả máy</option>{machines.map((machine) => <option key={machine} value={machine}>{machine}</option>)}</select></label>
        <label className="form-field"><span>Công đoạn</span><select value={stageFilter} onChange={(event) => setStageFilter(event.target.value)}><option value="all">Tất cả công đoạn</option>{stages.map((stage) => <option key={stage} value={stage}>{stageLabels[stage] ?? stage}</option>)}</select></label>
        <div className="zoom-control" aria-label="Mức thu phóng">{[0.75, 1, 1.5, 2].map((level) => <button type="button" key={level} className={`button button-small ${zoom === level ? "button-primary" : ""}`} onClick={() => setZoom(level)} aria-pressed={zoom === level}>{level}×</button>)}</div>
      </div>
      {visibleOperations.length === 0 && <div className="empty compact-empty"><h2>Không có công đoạn phù hợp</h2><p>Thử thay đổi bộ lọc máy hoặc công đoạn.</p></div>}
      {visibleOperations.length > 0 &&
      <div className="gantt-shell" aria-label="Biểu đồ Gantt theo máy">
        <svg width={left + plotWidth + 16} height={height} role="img" aria-label={`${visibleOperations.length} công đoạn trên ${visibleMachines.length} máy`}>
          {Array.from({ length: dayCount + 1 }, (_, day) => {
            const x = left + day * 1440 * scale;
            const label = new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit" }).format(new Date(new Date(timeOrigin).getTime() + day * 86_400_000));
            return <g key={day}><line x1={x} x2={x} y1={30} y2={height} className="gantt-grid" />{day < dayCount && <text x={x + 4} y={20} className="gantt-axis">{label}</text>}</g>;
          })}
          {visibleMachines.map((machine, index) => {
            const y = top + index * rowHeight;
            return <g key={machine}><text x={4} y={y + 27} className="gantt-machine">{machine}</text><line x1={left} x2={left + plotWidth} y1={y + rowHeight - 4} y2={y + rowHeight - 4} className="gantt-row" />
              {visibleOperations.filter((item) => item.machine === machine).map((item) => {
                const x = left + item.start * scale;
                const width = Math.max(3, (item.end - item.start) * scale);
                const prepX = left + item.block_start * scale;
                const prepWidth = Math.max(0, (item.start - item.block_start) * scale);
                const label = `${item.lot} · ${stageLabels[item.stage] ?? item.stage} · ${item.shift}`;
                return <g key={item.id} className="gantt-block" role="button" tabIndex={item.id === keyboardActiveId ? 0 : -1} aria-label={label} onClick={() => setSelectedId(item.id)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); setSelectedId(item.id); } if (event.key === "ArrowRight" || event.key === "ArrowLeft") { event.preventDefault(); const index = visibleOperations.findIndex((operation) => operation.id === item.id); const delta = event.key === "ArrowRight" ? 1 : -1; const next = visibleOperations[(index + delta + visibleOperations.length) % visibleOperations.length]; setSelectedId(next.id); } }}><title>{`${label}\n${minuteToDateTime(timeOrigin, item.start)} – ${minuteToDateTime(timeOrigin, item.end)}\nChuẩn bị ${formatDuration(item.setup_minutes + item.maintenance_minutes)}`}</title>{prepWidth > 0 && <rect x={prepX} y={y + 9} width={prepWidth} height={27} rx={3} fill="#64748b" />}<rect x={x} y={y + 9} width={width} height={27} rx={3} fill={stageColors[item.stage] ?? "#334155"} />{width > 56 && <text x={x + 6} y={y + 27} className="gantt-bar-label">{item.lot}</text>}</g>;
              })}
            </g>;
          })}
        </svg>
      </div>}
      {selected && <div className="gantt-selection" role="status"><div><span>Lô / công đoạn</span><strong>{selected.lot} · {stageLabels[selected.stage] ?? selected.stage}</strong></div><div><span>Máy / ca</span><strong>{selected.machine} · {selected.shift}</strong></div><div><span>Bắt đầu</span><strong>{minuteToDateTime(timeOrigin, selected.start)}</strong></div><div><span>Kết thúc</span><strong>{minuteToDateTime(timeOrigin, selected.end)}</strong></div><div><span>Thời lượng / chuẩn bị</span><strong>{formatDuration(selected.end - selected.start)} / {formatDuration(selected.setup_minutes + selected.maintenance_minutes)}</strong></div></div>}
    </>
  );
}
