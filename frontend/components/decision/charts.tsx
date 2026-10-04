"use client";

import { useI18n } from "@/components/i18n-provider";
import { fmtN, fmtSeconds, opsCost, type Alternative, type HistoryPoint, type Shortlist } from "@/lib/decision";

function niceTicks(lo: number, hi: number, count: number): number[] {
  const span = Math.max(hi - lo, 1e-9);
  const raw = span / count;
  const magnitude = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 5, 10].map((m) => m * magnitude).find((s) => s >= raw) ?? raw;
  const out: number[] = [];
  for (let v = Math.ceil(lo / step) * step; v <= hi + 1e-9; v += step) out.push(+v.toPrecision(10));
  return out;
}

interface TradeoffProps {
  alternatives: Alternative[];
  weights: Record<string, number>;
  list: Shortlist;
  current: string | null;
  displayName: (id: string) => string;
  onPick: (id: string) => void;
}

export function TradeoffChart({ alternatives, weights, list, current, displayName, onPick }: TradeoffProps) {
  const { t } = useI18n();
  const W = 780, H = 320, L = 64, R = 24, T = 18, B = 46;
  if (!alternatives.length) return null;
  const xs = alternatives.map((alt) => opsCost(alt, weights));
  const ys = alternatives.map((alt) => alt.metrics.safety_shortfall ?? 0);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const pad = Math.max((maxX - minX) * 0.08, maxX * 0.02, 1);
  const x0 = Math.max(0, minX - pad), x1 = maxX + pad;
  const y1 = Math.max(4, ...ys) * 1.12;
  const X = (v: number) => L + ((v - x0) / (x1 - x0)) * (W - L - R);
  const Y = (v: number) => T + (1 - v / y1) * (H - T - B);
  const ordered = [...alternatives].sort((a, b) => Number(Boolean(list.name[a.id])) - Number(Boolean(list.name[b.id])));
  const placed: Array<[number, number]> = [];
  let path = "";
  list.front.forEach((id, index) => {
    const alt = alternatives.find((item) => item.id === id);
    if (!alt) return;
    const px = X(opsCost(alt, weights)), py = Y(alt.metrics.safety_shortfall ?? 0);
    path += index ? ` H ${px} V ${py}` : `M ${px} ${py}`;
  });

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="viz block h-auto w-full max-w-[960px] min-w-[600px]" role="img" aria-label={t("Đồ thị đánh đổi giữa chi phí vận hành và thiếu tồn an toàn", "Trade-off between operating cost and safety-stock shortfall")}>
      {niceTicks(x0, x1, 6).map((v) => <g key={`x${v}`}><line x1={X(v)} x2={X(v)} y1={T} y2={H - B} className="grid-line" /><text x={X(v)} y={H - B + 16} textAnchor="middle" className="tick">{fmtN(v)}</text></g>)}
      {niceTicks(0, y1, 5).map((v) => <g key={`y${v}`}><line x1={L} x2={W - R} y1={Y(v)} y2={Y(v)} className="grid-line" /><text x={L - 8} y={Y(v) + 4} textAnchor="end" className="tick">{fmtN(v)}</text></g>)}
      <text x={(L + W - R) / 2} y={H - 8} textAnchor="middle" className="axis">{t("Chi phí vận hành", "Operating cost")} →</text>
      <text x={14} y={(T + H - B) / 2} textAnchor="middle" className="axis" transform={`rotate(-90 14 ${(T + H - B) / 2})`}>{t("Thiếu tồn an toàn", "Safety-stock shortfall")} →</text>
      {list.front.length > 1 && <path d={path} className="front" />}
      {ordered.map((alt) => {
        const px = X(opsCost(alt, weights)), py = Y(alt.metrics.safety_shortfall ?? 0);
        const main = Boolean(list.name[alt.id]);
        const cur = alt.id === current;
        let label: { y: number; right: boolean } | null = null;
        if (main || cur) {
          let ly = py - 12;
          while (placed.some(([a, b]) => Math.abs(a - px) < 130 && Math.abs(b - ly) < 14)) ly -= 14;
          placed.push([px, ly]);
          label = { y: ly, right: px > W - 200 };
        }
        const pick = () => onPick(alt.id);
        return <g key={alt.id} className="point" tabIndex={0} role="button" aria-label={`${displayName(alt.id)}: ${t("chi phí", "cost")} ${fmtN(opsCost(alt, weights))}, ${t("thiếu tồn", "shortfall")} ${alt.metrics.safety_shortfall ?? 0}`}
          onClick={pick} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); pick(); } }}>
          <title>{`${displayName(alt.id)} · ${t("chi phí", "cost")} ${fmtN(opsCost(alt, weights))} · ${t("thiếu tồn", "shortfall")} ${alt.metrics.safety_shortfall ?? 0}${alt.late ? ` · ${alt.late} ${t("đơn trễ", "late orders")}` : ""}`}</title>
          <circle cx={px} cy={py} r={main ? (cur ? 8 : 6.5) : cur ? 6 : 4} className={`dot${main ? " dot-main" : ""}${cur ? " dot-current" : ""}`} />
          {label && <text x={px + (label.right ? -10 : 10)} y={label.y} textAnchor={label.right ? "end" : "start"} className={cur ? "label-strong" : "label"}>{displayName(alt.id)}</text>}
        </g>;
      })}
    </svg>
  );
}

export interface ConvergenceSeries { id: string; name: string; color: string; points: HistoryPoint[]; end: number }

export function ConvergenceChart({ series, budget }: { series: ConvergenceSeries[]; budget: number | null }) {
  const { t } = useI18n();
  const W = 900, H = 340, L = 76, R = 140, T = 16, B = 46;
  const all = series.flatMap((s) => s.points);
  if (!all.length) return <p className="text-[13px] text-muted-foreground">{t("Chưa có lịch sử cải thiện: các lịch luật dựng một lần, còn solver chỉ ghi lịch sử khi tìm được lời giải tốt hơn.", "No improvement history yet: rule schedules are built once, and solvers only log history when they find a better solution.")}</p>;
  const times = [...all.map((p) => p.seconds), ...series.map((s) => s.end), budget ?? 0].map((t) => Math.max(t, 1e-3));
  const values = all.map((p) => Math.max(p.objective, 1));
  const lx0 = Math.floor(Math.log10(Math.min(...times))), lx1 = Math.max(lx0 + 1, Math.ceil(Math.log10(Math.max(...times))));
  const ly0 = Math.floor(Math.log10(Math.min(...values))), ly1 = Math.max(ly0 + 1, Math.ceil(Math.log10(Math.max(...values))));
  const X = (t: number) => L + ((Math.log10(Math.max(t, 1e-3)) - lx0) / (lx1 - lx0)) * (W - L - R);
  const Y = (v: number) => T + (1 - (Math.log10(Math.max(v, 1)) - ly0) / (ly1 - ly0)) * (H - T - B);
  const labels = series.map((s) => ({ y: Y(s.points[s.points.length - 1].objective), s })).sort((a, b) => a.y - b.y);
  let previous = -1e9;
  for (const label of labels) { label.y = Math.max(label.y, previous + 14); previous = label.y; }
  const xTicks = Array.from({ length: lx1 - lx0 + 1 }, (_, i) => 10 ** (lx0 + i));
  const yTicks = Array.from({ length: ly1 - ly0 + 1 }, (_, i) => 10 ** (ly0 + i));

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="viz block h-auto w-full max-w-[960px] min-w-[600px]" role="img" aria-label={t("Điểm tốt nhất theo thời gian chạy của từng lần chạy", "Best score over run time for each run")}>
      {xTicks.map((t) => <g key={`x${t}`}><line x1={X(t)} x2={X(t)} y1={T} y2={H - B} className="grid-line" /><text x={X(t)} y={H - B + 16} textAnchor="middle" className="tick">{fmtSeconds(t)}</text></g>)}
      {yTicks.map((v) => <g key={`y${v}`}><line x1={L} x2={W - R} y1={Y(v)} y2={Y(v)} className="grid-line" /><text x={L - 8} y={Y(v) + 4} textAnchor="end" className="tick">{fmtN(v)}</text></g>)}
      {budget ? <g><line x1={X(budget)} x2={X(budget)} y1={T} y2={H - B} className="budget" /><text x={X(budget) - 4} y={T + 10} textAnchor="end" className="tick">{t("ngân sách", "budget")} {budget} s</text></g> : null}
      <text x={(L + W - R) / 2} y={H - 8} textAnchor="middle" className="axis">{t("Thời gian chạy (thang log)", "Run time (log scale)")} →</text>
      <text x={14} y={(T + H - B) / 2} textAnchor="middle" className="axis" transform={`rotate(-90 14 ${(T + H - B) / 2})`}>{t("Điểm mục tiêu (log) ↓ tốt hơn", "Objective score (log) ↓ better")}</text>
      {series.map((s) => {
        let d = "";
        s.points.forEach((p, i) => { d += i ? ` H ${X(p.seconds)} V ${Y(p.objective)}` : `M ${X(p.seconds)} ${Y(p.objective)}`; });
        d += ` H ${X(Math.max(s.end, s.points[s.points.length - 1].seconds))}`;
        return <g key={s.id}>
          <path d={d} className="series" style={{ stroke: s.color }} />
          {s.points.map((p, i) => <circle key={i} cx={X(p.seconds)} cy={Y(p.objective)} r={i === s.points.length - 1 ? 4.5 : 3} className="step" style={{ fill: s.color }}><title>{`${s.name}\n${t("Sau", "After")} ${fmtSeconds(p.seconds)}: ${fmtN(p.objective)}`}</title></circle>)}
        </g>;
      })}
      {labels.map(({ y, s }) => <g key={s.id}><line x1={W - R + 2} x2={W - R + 8} y1={y} y2={y} style={{ stroke: s.color }} strokeWidth={2.5} /><text x={W - R + 12} y={y + 4} className="label">{s.name}</text></g>)}
    </svg>
  );
}
