from __future__ import annotations

import argparse
import csv
import html
import json
from datetime import datetime, timezone
from pathlib import Path

from .model import build_demo_instance, solve_phase1, solve_phase2, validate_result


ROOT = Path(__file__).resolve().parent


def save_json(path: Path, value: object) -> None:
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def write_schedule(path: Path, scenarios: dict[str, dict]) -> None:
    rows = []
    for scenario, result in scenarios.items():
        rows.extend({"scenario": scenario, **row} for row in result["rows"])
    with path.open("w", encoding="utf-8-sig", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=list(rows[0]))
        writer.writeheader()
        writer.writerows(rows)


def write_gantt(path: Path, data: dict, scenarios: dict[str, dict]) -> None:
    width, left, chart_width = 1200, 115, 1040
    scale = chart_width / data["horizon"]
    sections = []
    for scenario, result in scenarios.items():
        svg = []
        for tick in range(0, data["horizon"] + 1, 120):
            x = left + tick * scale
            clock_minutes = (360 + tick) % 1440
            clock = f"{clock_minutes // 60:02}:{clock_minutes % 60:02}"
            svg.append(
                f'<line x1="{x}" x2="{x}" y1="25" y2="285" stroke="#dbe3ee"/>'
                f'<text x="{x + 2}" y="18" font-size="11">{clock}</text>'
            )
        for shift in data["shifts"]:
            x = left + shift["start"] * scale
            svg.append(
                f'<line x1="{x}" x2="{x}" y1="25" y2="285" stroke="#64748b" stroke-width="2"/>'
                f'<text x="{x + 5}" y="36" font-size="11" font-weight="bold">{html.escape(shift["name"])}</text>'
            )
        for index, stage in enumerate(data["stages"]):
            y = 45 + index * 58
            machine = data["machines"][stage]["id"]
            svg.append(f'<text x="5" y="{y + 24}">{html.escape(machine)}</text>')
            svg.append(
                f'<rect x="{left}" y="{y}" width="{chart_width}" height="38" '
                'fill="#f3f6fa" stroke="#d5dde8"/>'
            )
            for shift in data["shifts"]:
                break_x = left + shift["break_start"] * scale
                break_width = (shift["break_end"] - shift["break_start"]) * scale
                svg.append(
                    f'<rect x="{break_x}" y="{y}" width="{break_width}" height="38" '
                    'fill="#fecaca"><title>Nghỉ ca 30 phút</title></rect>'
                )
            for row in result["rows"]:
                if row["stage"] != stage:
                    continue
                x = left + row["block_start"] * scale
                setup_width = row["setup_minutes"] * scale
                process_width = row["processing_minutes"] * scale
                color = "#f59e0b" if row["kind"] == "optional_stock" else "#2563eb"
                title = html.escape(
                    f"{row['lot']} · {row['kind']} · setup {row['setup_minutes']} min · "
                    f"process {row['processing_minutes']} min · {row['block_start']}–{row['end']}"
                )
                svg.append(
                    f'<g><title>{title}</title><rect x="{x}" y="{y + 5}" '
                    f'width="{max(1, setup_width)}" height="28" fill="#64748b"/>'
                    f'<rect x="{x + setup_width}" y="{y + 5}" '
                    f'width="{max(1, process_width)}" height="28" fill="{color}"/>'
                    f'<text x="{x + 3}" y="{y + 23}" font-size="10" fill="white">{html.escape(row["lot"])}</text></g>'
                )
        metrics = result["metrics"]
        selected = ", ".join(result["selected_optional_lots"]) or "không chọn"
        sections.append(
            f'<section><h2>{html.escape(scenario)}</h2>'
            f'<p>Lô dự trữ: <strong>{html.escape(selected)}</strong> · idle {metrics["idle_minutes"]} phút · '
            f'utilization có ích {metrics["productive_utilization"]:.1%} · tồn cuối {metrics["end_inventory"]}</p>'
            f'<svg viewBox="0 0 {width} 300" role="img">{"".join(svg)}</svg></section>'
        )
    path.write_text(
        '<!doctype html><meta charset="utf-8"><title>Optional-stock experiment</title>'
        '<style>body{font:14px system-ui;margin:28px;color:#172033;background:#fff}h1,h2{margin-bottom:8px}'
        'section{margin:28px 0;padding:18px;border:1px solid #dbe3ee;border-radius:10px;overflow:auto}'
        'svg{min-width:900px} .legend span{display:inline-block;margin-right:18px}.swatch{width:12px;height:12px;margin-right:5px;vertical-align:-1px}</style>'
        '<h1>Gantt · sản xuất dự trữ tùy chọn</h1>'
        '<p class="legend"><span><i class="swatch" style="background:#2563eb"></i>Lô bắt buộc</span>'
        '<span><i class="swatch" style="background:#f59e0b"></i>Lô dự trữ</span>'
        '<span><i class="swatch" style="background:#64748b"></i>Setup</span>'
        '<span><i class="swatch" style="background:#fecaca"></i>Nghỉ ca</span></p>'
        '<p>Trục ngang là giờ trong ba ca đã mở, bắt đầu lúc 06:00. Rê chuột lên thanh để xem chi tiết.</p>'
        + "".join(sections),
        encoding="utf-8",
    )


def write_report(path: Path, data: dict, baseline: dict, scenarios: dict[str, dict]) -> None:
    lines = [
        "# Thử nghiệm lô dự trữ tùy chọn",
        "",
        "Mô hình giải hai tầng: cả sáu đơn bắt buộc đều sẵn sàng đúc từ đầu horizon (`release = 0`), với hạn giao chia đều hai đơn ở cuối mỗi ca; tầng 1 khóa mức trễ và tầng 2 quyết định chọn các lô dự trữ 40 sản phẩm để giảm tổng chi phí công suất. Hai lô dự trữ đi qua toàn bộ route; một lô WIP đầu kỳ đã hoàn tất CNC_1 và sẵn sàng cấp trực tiếp cho PAINT_1. Mỗi máy có ba ca đã mở: ca 1 (06–14h), ca 2 (14–22h), ca 3 (22–06h); mỗi ca nghỉ 30 phút và có 450 phút khả dụng.",
        "",
        f"- Số đơn bắt buộc: **{len(baseline['tardiness_by_order'])}**; tổng tardiness tầng 1: **{sum(baseline['tardiness_by_order'].values())} phút**.",
        f"- Tardiness từng đơn: `{baseline['tardiness_by_order']}`.",
        f"- Makespan bắt buộc tầng 1: **{baseline['mandatory_makespan']} phút**.",
        f"- Tồn đầu/cuối khi chưa sản xuất dự trữ: **{data['initial_inventory']}**, bằng safety stock.",
        f"- Trần tồn: **{data['max_inventory']}**, nên tối đa hoàn tất cả 3 lô dự trữ của test case.",
        "- Chi phí đúc/CNC của lô WIP đầu kỳ đã phát sinh nên không được tính lại trong quyết định; model chỉ tính chi phí hoàn thiện và tồn kho.",
        "- [Mở Gantt của hai kịch bản](gantt.html).",
        "",
        "| Kịch bản | Lô dự trữ chọn | Lượng dự trữ | Idle (phút) | Utilization có ích | Tồn cuối | Tổng chi phí | Tiết kiệm so với không sản xuất thêm |",
        "|---|---|---:|---:|---:|---:|---:|---:|",
    ]
    for name, result in scenarios.items():
        metrics = result["metrics"]
        costs = metrics["costs"]
        selected = ", ".join(result["selected_optional_lots"]) or "Không chọn"
        lines.append(
            f"| `{name}` | {selected} | {result['selected_optional_quantity']} | "
            f"{metrics['idle_minutes']} | {metrics['productive_utilization']:.1%} | "
            f"{metrics['end_inventory']} | {costs['economic_capacity_cost']:,} | "
            f"{costs['saving_vs_no_optional']:,} |"
        )
    lines.extend(
        [
            "",
            "## Kết quả theo ca",
            "",
            "| Kịch bản | Ca | Giờ | Gia công bắt buộc | Gia công dự trữ | Setup | Idle | Utilization có ích |",
            "|---|---|---|---:|---:|---:|---:|---:|",
        ]
    )
    for name, result in scenarios.items():
        for shift in result["metrics"]["by_shift"]:
            lines.append(
                f"| `{name}` | {shift['name']} | {shift['clock']} | "
                f"{shift['required_processing_minutes']} | {shift['optional_processing_minutes']} | "
                f"{shift['setup_minutes']} | {shift['idle_minutes']} | "
                f"{shift['productive_utilization']:.1%} |"
            )
    lines.extend(
        [
            "",
            "## Chi tiết chi phí",
            "",
            "| Kịch bản | Idle | Sản xuất thêm | Lưu kho | Rủi ro tồn dư | Setup tăng thêm | Tổng |",
            "|---|---:|---:|---:|---:|---:|---:|",
        ]
    )
    for name, result in scenarios.items():
        costs = result["metrics"]["costs"]
        lines.append(
            f"| `{name}` | {costs['idle_cost']:,} | {costs['optional_production_cost']:,} | "
            f"{costs['holding_cost']:,} | {costs['surplus_risk_cost']:,} | "
            f"{costs['incremental_setup_cost']:,} | {costs['economic_capacity_cost']:,} |"
        )
    low = scenarios["low_holding_cost"]
    high = scenarios["high_holding_cost"]
    optional_lot = next(lot for lot in data["lots"] if lot["kind"] == "optional_stock")
    costs = data["cost_scenarios"]["low_holding_cost"]
    occupied_per_lot = sum(optional_lot["processing"].values()) + sum(optional_lot["setup"].values())
    non_holding_cost = (
        optional_lot["quantity"] * costs["optional_production_per_unit"]
        + optional_lot["quantity"] * costs["surplus_risk_per_unit"]
        + sum(optional_lot["setup"].values()) * costs["incremental_setup_per_minute"]
    )
    break_even_holding = (
        occupied_per_lot * costs["idle_per_minute"] - non_holding_cost
    ) / optional_lot["quantity"]
    lines.extend(
        [
            "",
            "## Kết luận",
            "",
            f"- Khi chi phí lưu kho thấp, model chọn **{low['selected_optional_quantity']} sản phẩm** dự trữ và tiết kiệm **{low['metrics']['costs']['saving_vs_no_optional']:,} đồng** theo bộ trọng số minh họa.",
            f"- Khi chi phí lưu kho cao, model chọn **{high['selected_optional_quantity']} sản phẩm**; để resource rảnh rẻ hơn sản xuất tồn kho.",
            f"- Với các tham số còn lại của ví dụ, điểm hòa vốn của chi phí lưu kho là **{break_even_holding:,.1f} đồng/sản phẩm**: thấp hơn mức này thì một lô còn lợi, cao hơn thì không.",
            "- Cả hai lịch giữ nguyên tardiness tầng 1 và đều vượt qua validator độc lập của thử nghiệm.",
            "",
            "## Giới hạn",
            "",
            "Đây là thử nghiệm có kiểm soát để kiểm tra chính sách kinh tế, chưa phải mô hình nhà máy đầy đủ. Setup đang là thời lượng cố định theo lô/công đoạn; chưa có ma trận setup phụ thuộc thứ tự, khuôn, bảo trì, downtime hay tái lập lịch. Các chi phí là số minh họa, không phải định mức đã được nhà máy xác nhận.",
            "",
        ]
    )
    path.write_text("\n".join(lines), encoding="utf-8")


def main() -> Path:
    parser = argparse.ArgumentParser(description="Run two-stage optional-stock experiment")
    parser.add_argument("--seconds", type=float, default=5)
    parser.add_argument("--seed", type=int, default=11)
    parser.add_argument("--output", type=Path)
    args = parser.parse_args()
    run_id = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%S%fZ")
    output = args.output or ROOT / "results" / run_id
    output.mkdir(parents=True, exist_ok=False)

    data = build_demo_instance()
    baseline = solve_phase1(data, seconds=args.seconds, seed=args.seed)
    if baseline["status"] not in ("OPTIMAL", "FEASIBLE"):
        raise RuntimeError(f"Phase 1 failed: {baseline['status']}")
    scenarios = {}
    for name, costs in data["cost_scenarios"].items():
        result = solve_phase2(data, costs, baseline, seconds=args.seconds, seed=args.seed)
        result["cost_parameters"] = costs
        result["validation"] = validate_result(data, result, baseline)
        if not result["validation"]["valid"]:
            raise RuntimeError({name: result["validation"]})
        scenarios[name] = result

    save_json(output / "input.json", data)
    save_json(output / "baseline.json", baseline)
    save_json(output / "results.json", {"run_id": run_id, "seed": args.seed, "baseline": baseline, "scenarios": scenarios})
    write_schedule(output / "schedule.csv", scenarios)
    write_gantt(output / "gantt.html", data, scenarios)
    write_report(output / "REPORT.md", data, baseline, scenarios)
    print(f"Output: {output}")
    for name, result in scenarios.items():
        costs = result["metrics"]["costs"]
        print(
            f"{name}: selected={result['selected_optional_lots']} "
            f"qty={result['selected_optional_quantity']} idle={result['metrics']['idle_minutes']} "
            f"cost={costs['economic_capacity_cost']} saving={costs['saving_vs_no_optional']} "
            f"valid={result['validation']['valid']}"
        )
    return output


if __name__ == "__main__":
    main()
