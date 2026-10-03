"""Run methods sequentially with identical input; preserve timestamped artifacts."""
import argparse
import html
from datetime import datetime, timezone
from pathlib import Path
from statistics import median
from models.common.experiment import METHODS, methods_for, run_one, runs_root, write_csv
from models.common.instance import DEFAULT_INPUT, load, digest, save_json


def describe(data):
    """One-line description of the input, derived from the data (never hard-coded)."""
    days = data["horizon"] // 1440
    if data.get("schema_version") == 5:
        runs = data["runs"]
        lots = [r for r in runs if r["stage"] == data["stages"][-1] and "reserve_option" not in r]
        mandatory = sum("reserve_option" not in r for r in runs)
        return (f"{len(data['orders'])} đơn, {len(lots)} lô QC, {len(runs)} lượt chạy ({mandatory} bắt buộc, "
                f"{len(runs) - mandatory} thuộc {len(data.get('reserve_options', {}))} phương án làm trước), "
                f"{len(data['stages'])} công đoạn, {len(data['machines'])} máy, {len(data.get('molds', {}))} khuôn, "
                f"horizon {days} ngày; giả định ở dataset/wheel-factory-small/SOURCE.md")
    ops = len(data["lots"]) * len(data["stages"])
    return (f"{len(data['orders'])} đơn, {len(data['lots'])} lô, {ops} công đoạn, {len(data['machines'])} máy, "
            f"{len(data['products'])} SKU, horizon {days} ngày; giả định ở input/README.md")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--input",type=Path,default=DEFAULT_INPUT)
    parser.add_argument("--seconds",type=float,default=30)
    parser.add_argument("--seeds",type=int,nargs="+",default=[11,29,47])
    parser.add_argument("--methods",nargs="+",choices=METHODS,default=None)
    args = parser.parse_args()
    run_id = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%S%fZ")
    data = load(args.input)
    args.methods = args.methods or methods_for(data)
    root = runs_root(data)
    folder = root/"comparison"/run_id
    folder.mkdir(parents=True,exist_ok=True)
    save_json(folder/"input.json",data)
    save_json(folder/"config.json",{"run_id":run_id,"input_sha256":digest(data),"seconds":args.seconds,
                                   "seeds":args.seeds,"methods":args.methods,"execution":"sequential, 1 CP-SAT worker"})
    records,raw = [],[]
    print(f"RUN_ID={run_id}",flush=True)
    for method in args.methods:
        for seed in (args.seeds[:1] if method in ("fifo","edd","spt") else args.seeds):
            result,path = run_one(method,args.input,args.seconds,seed,run_id)
            raw.append(result)
            m = result.get("metrics",{})
            record = {"method":method,"seed":seed,"status":result["status"],"valid":result["validation"]["valid"],
                      **{key:m.get(key) for key in ["objective","makespan","schedule_end","late_orders","weighted_tardiness","setup_minutes","maintenance_count","idle_minutes","safety_shortfall","activated_shifts","productive_utilization"]},
                      "algorithm_seconds":result["algorithm_seconds"],"bound":result.get("bound"),"gap":result.get("gap"),
                      "artifacts":path.relative_to(root).as_posix()}
            records.append(record)
            write_csv(folder/"results.csv",records)
            save_json(folder/"results.json",raw)
    lines = ["# Kết quả thử nghiệm trên cùng một input", "", f"Run: `{run_id}`; SHA256: `{digest(data)}`.",
             f"Ngân sách {args.seconds:g}s/phương pháp/seed, gồm dựng mô hình và khởi tạo; một lượt decode không bị ngắt giữa chừng. Chạy tuần tự, CP-SAT một worker.",
             "", "Dữ liệu tổng hợp: " + describe(data) + ".",
             "", "| Phương pháp | Có lịch hợp lệ / lần chạy | Objective median | Min–max | Đơn trễ median | Utilization median | Thời gian median (s) |", "|---|---:|---:|---:|---:|---:|---:|"]
    for method in args.methods:
        all_rows = [r for r in records if r["method"] == method]
        good = [r for r in all_rows if r["valid"]]
        if good:
            vals = [r["objective"] for r in good]
            lines.append(f"| {method} | {len(good)}/{len(all_rows)} | {median(vals):,.0f} | {min(vals):,}–{max(vals):,} | {median(r['late_orders'] for r in good):g} | {median(r['productive_utilization'] for r in good):.1%} | {median(r['algorithm_seconds'] for r in all_rows):.2f} |")
        else:
            lines.append(f"| {method} | 0/{len(all_rows)} | — | — | — | — | {median(r['algorithm_seconds'] for r in all_rows):.2f} |")
    good = [r for r in records if r["valid"]]
    if good:
        winner = min(good,key=lambda r:r["objective"])
        lines += ["", f"Lịch có objective nhỏ nhất quan sát được: **{winner['method']} / seed {winner['seed']} / {winner['objective']:,}**. Đây không phải khẳng định tối ưu toàn cục hay phương pháp tốt nhất trên mọi input.",
                  f"[Xem Gantt lịch này](../../{winner['artifacts']}/gantt.html)."]
    lines += ["", "## Cách đọc", "", "- Objective nhỏ hơn tốt hơn theo đúng trọng số input; phải đọc cả KPI giao hàng, setup, idle và safety stock.",
              "- FEASIBLE chưa chứng minh tối ưu. UNKNOWN không có nghĩa vô nghiệm. HEURISTIC_FALLBACK nghĩa là dùng lịch EDD đã kiểm tra, không giả là nghiệm CP-SAT.",
              "- CP-LNS không có cận toàn cục. Các phương pháp search dùng decoder append-only nên không tìm toàn không gian thời điểm như CP-SAT.",
              "- FIFO/EDD/SPT là baseline xác định chạy một lần; các phương pháp tìm kiếm chạy nhiều seed, cùng ngân sách. Wall-time stopping có thể thay đổi số vòng dù cùng seed.",
              "- Một input và vài seed chỉ là thí nghiệm thăm dò; không đủ kết luận thống kê cho nhiều nhà máy. Sự cố/đơn gấp trong input đã biết trước, chưa kiểm chứng tái lập lịch trực tuyến.",
              "", "## Từng lần chạy", "", "| Phương pháp / seed | Trạng thái | Objective | Kết quả | Gantt |", "|---|---|---:|---|---|"]
    for r in records:
        base = '../../'+r["artifacts"]
        link = f"[Gantt]({base}/gantt.html)" if r["valid"] else "—"
        lines.append(f"| {r['method']} / {r['seed']} | {r['status']} | {r['objective']} | [JSON]({base}/result.json) | {link} |")
    (folder/"REPORT.md").write_text('\n'.join(lines)+'\n',encoding="utf-8")
    table_rows = []
    for r in records:
        base = '../../'+r["artifacts"]
        cells = [r["method"],r["seed"],r["status"],r["objective"],r["late_orders"],r["weighted_tardiness"],r["idle_minutes"],
                 f"{r['productive_utilization']:.1%}" if r["valid"] else "—",f"{r['algorithm_seconds']:.2f}"]
        table_rows.append('<tr>'+''.join('<td>'+html.escape(str(c))+'</td>' for c in cells)
                          +f'<td><a href="{base}/result.json">JSON</a> '
                          +(f'<a href="{base}/gantt.html">Gantt</a>' if r["valid"] else '')+'</td></tr>')
    page = '''<!doctype html><meta charset="utf-8"><title>So sánh lập lịch</title>
<style>body{font:15px system-ui;margin:32px;background:#f8fafc;color:#172033}table{border-collapse:collapse;background:white;width:100%}td,th{padding:12px;border-bottom:1px solid #ddd;text-align:left}th{cursor:pointer;background:#e2e8f0}a{color:#0369a1}p{max-width:1000px}h1{font-size:26px}</style>
<h1>So sánh 8 hướng lập lịch sản xuất</h1><p>'''+html.escape(describe(data))+''' · cùng input và mục tiêu. Bấm tiêu đề cột để sắp xếp; mở Gantt để xem lịch. UNKNOWN là chưa tìm được nghiệm, không phải vô nghiệm.</p>
<p>Dữ liệu tổng hợp, thử nghiệm tĩnh; không suy rộng thành thứ hạng thuật toán trên mọi nhà máy. Đọc <a href="REPORT.md">báo cáo đầy đủ</a> và <a href="results.csv">CSV</a>.</p><table><thead><tr>'''
    page += ''.join(f'<th onclick="sortRows({i})">{name}</th>' for i,name in enumerate(["Phương pháp","Seed","Trạng thái","Objective ↓","Đơn trễ","Trễ có trọng số","Idle phút","Utilization","Giây","Kết quả"]))
    page += '</tr></thead><tbody>'+''.join(table_rows)+'</tbody></table>'
    page += '''<script>function sortRows(i){const b=document.querySelector('tbody');const rs=[...b.rows];const num=s=>Number(s.replace('%',''));rs.sort((a,c)=>{let x=a.cells[i].innerText,y=c.cells[i].innerText;return Number.isFinite(num(x))&&Number.isFinite(num(y))?num(x)-num(y):x.localeCompare(y)});rs.forEach(r=>b.append(r))}</script>'''
    (folder/"index.html").write_text(page,encoding="utf-8")
    save_json(root/"comparison"/"latest.json",{"run_id":run_id,"report":f"{run_id}/REPORT.md"})
    print(f"REPORT={folder/'REPORT.md'}",flush=True)


if __name__ == "__main__":
    main()
