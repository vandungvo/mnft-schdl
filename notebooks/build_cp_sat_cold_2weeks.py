"""Build standalone Kaggle/Colab notebooks from the current local engine and dataset.

Run: python notebooks/build_cp_sat_cold_2weeks.py
Only the Python standard library is needed to generate the notebook.
"""
from __future__ import annotations

import base64
import hashlib
import io
import json
import textwrap
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "notebooks" / "cp_sat_cold_2weeks_colab.ipynb"
KAGGLE_OUTPUT = ROOT / "notebooks" / "cp_sat_cold_2weeks_kaggle.ipynb"
FILES = [
    "models/__init__.py", "models/common/__init__.py", "models/common/stage_runs/__init__.py",
    "models/common/stage_runs/cp_engine.py", "models/common/stage_runs/instance.py",
    "models/common/stage_runs/evaluate.py", "models/common/stage_runs/report.py",
    "models/requirements.txt", "dataset/wheel-factory-2weeks/model_input.json",
    "dataset/wheel-factory-2weeks/SOURCE.md", "dataset/wheel-factory-small/SOURCE.md",
    "notebooks/cp_sat_cold_runner.py",
]


def cell(kind, source, cell_id, **metadata):
    result = {"cell_type": kind, "id": cell_id, "metadata": {"id": cell_id, **metadata},
              "source": textwrap.dedent(source).strip().splitlines(keepends=True)}
    if kind == "code":
        result.update(execution_count=None, outputs=[])
    return result


def build():
    sources = {name: (ROOT / name).read_bytes() for name in FILES}
    manifest = {"format": 1, "files": {name: hashlib.sha256(value).hexdigest() for name, value in sources.items()}}
    sources["bundle_manifest.json"] = json.dumps(manifest, indent=2).encode()
    stream = io.BytesIO()
    with zipfile.ZipFile(stream, "w", compression=zipfile.ZIP_DEFLATED) as archive:
        for name, value in sources.items():
            info = zipfile.ZipInfo(name, date_time=(2026, 10, 10, 0, 0, 0))
            info.compress_type = zipfile.ZIP_DEFLATED
            archive.writestr(info, value)
    payload = stream.getvalue()
    encoded = "\n".join(textwrap.wrap(base64.b64encode(payload).decode(), 100))
    payload_sha = hashlib.sha256(payload).hexdigest()
    cells = [cell("markdown", """
        # CP-SAT từ đầu — dataset sản xuất 2 tuần

        **Tải notebook này lên Kaggle hoặc Google Colab.** Code solver và dataset đã nằm trong file;
        không cần clone GitHub hay tải thêm dataset. OR-Tools được cài qua Internet ở bước 1.

        - **Kaggle:** chọn CPU (Accelerator: None), bật Internet, dùng
          **Save Version → Save & Run All** để chạy nền từ đầu và lưu kết quả trong Output.
        - **Colab:** chọn **Runtime → Change runtime type → CPU** rồi chạy lần lượt các ô.
        - Dataset: `wheel-factory-2weeks`, schema 5, 14 ngày, 24 đơn, 269 lượt chạy.
          Đây là dữ liệu mô phỏng quy mô thực tế của dự án.
        - Gọi trực tiếp CP-SAT với **`hint=None`, `fixed_runs=None`, `limits=None`**.
          Không chạy SA, GA, FIFO/EDD/SPT, không nạp lịch cũ và không tạo lịch dự phòng.
          Các heuristic nội bộ mặc định của CP-SAT vẫn hoạt động.
        - Mỗi lần chạy ô giải tạo một thư mục mới. Bản code/data được nhúng là snapshot khi tạo notebook.

        Mặc định tận dụng phiên CPU **12 giờ**: ngân sách solver khoảng **11 giờ 50 phút**,
        trừ thêm thời gian cài đặt/chuẩn bị. Chừa 10 phút cuối để xuất kết quả trước hạn phiên.
        Seed 11; tự dùng số CPU khả dụng. Có thể chỉnh `HOURS` ở bước 2 để chạy ngắn hơn.
        Bản cold trước đây từng trả `UNKNOWN` sau 12 giờ; thời gian dài hơn không bảo đảm có lịch.
        [Giới hạn phiên Kaggle](https://www.kaggle.com/docs/notebooks).
        """, "intro"), cell("code", """
        #@title 1. Cài OR-Tools đúng phiên bản của dự án
        import importlib.metadata
        import subprocess
        import sys
        import time

        # Keep the original start time when a cell is rerun in the same kernel.
        if "NOTEBOOK_STARTED_AT" not in globals():
            NOTEBOOK_STARTED_AT = time.monotonic()

        ORTOOLS_VERSION = "9.15.6755"
        try:
            installed = importlib.metadata.version("ortools")
        except importlib.metadata.PackageNotFoundError:
            installed = None
        if installed != ORTOOLS_VERSION:
            if "ortools" in sys.modules:
                raise RuntimeError("Hãy khởi động lại runtime trước khi đổi phiên bản OR-Tools.")
            subprocess.run([sys.executable, "-m", "pip", "install", "--quiet",
                            f"ortools=={ORTOOLS_VERSION}"], check=True)
        print("OR-Tools:", importlib.metadata.version("ortools"))
        """, "install"), cell("code", """
        #@title 2. Cấu hình lần chạy
        HOURS = 12.0 #@param {type:"number"}
        SEED = 11 #@param {type:"integer"}
        # 0 = tự động; số dương = số worker mong muốn, giới hạn bởi CPU khả dụng.
        REQUESTED_WORKERS = 0 #@param {type:"integer"}
        SAVE_TO_DRIVE = False #@param {type:"boolean"}
        DRIVE_FOLDER = "mnft-schdl/cp_sat_cold_2weeks" #@param {type:"string"}

        import math
        import os
        from pathlib import Path

        KAGGLE_ROOT = Path("/kaggle/working")
        IS_KAGGLE = KAGGLE_ROOT.is_dir()
        IS_COLAB = not IS_KAGGLE and Path("/content").is_dir()
        USE_DRIVE = bool(SAVE_TO_DRIVE and IS_COLAB)
        SESSION_LIMIT_SECONDS = 12 * 3600
        EXPORT_RESERVE_SECONDS = 10 * 60

        def solver_budget_seconds(requested_hours, notebook_started_at, now):
            remaining = SESSION_LIMIT_SECONDS - max(0, now - notebook_started_at) - EXPORT_RESERVE_SECONDS
            if remaining <= 0:
                raise RuntimeError("Không còn ngân sách phiên. Hãy tạo phiên mới bằng Save & Run All.")
            return min(requested_hours * 3600, remaining)

        if not math.isfinite(HOURS) or HOURS <= 0:
            raise ValueError("HOURS phải lớn hơn 0 và hữu hạn.")
        if not isinstance(SEED, int) or not 0 <= SEED < 2**31:
            raise ValueError("SEED phải là số nguyên từ 0 đến 2**31 - 1.")
        if not isinstance(REQUESTED_WORKERS, int) or REQUESTED_WORKERS < 0:
            raise ValueError("REQUESTED_WORKERS phải là số nguyên không âm.")
        try:
            available_cpus = len(os.sched_getaffinity(0))
        except AttributeError:
            available_cpus = os.cpu_count() or 1
        # Respect a CPU quota when the runtime exposes cgroup v2 limits.
        quota_file = Path("/sys/fs/cgroup/cpu.max")
        if quota_file.is_file():
            quota, period = quota_file.read_text().split()
            if quota != "max":
                available_cpus = min(available_cpus, max(1, math.floor(int(quota) / int(period))))
        WORKERS = min(REQUESTED_WORKERS or available_cpus, available_cpus)
        print(f"CPU khả dụng: {available_cpus}; worker: {WORKERS}; yêu cầu: {HOURS:g} giờ; seed: {SEED}")
        print("Ngân sách thực tế sẽ trừ thời gian chuẩn bị và chừa 10 phút xuất kết quả.")
        print("Lưu Google Drive:", USE_DRIVE)
        if SAVE_TO_DRIVE and not IS_COLAB:
            print("Google Drive chỉ dùng trên Colab; môi trường hiện tại sẽ lưu file trong thư mục kết quả.")
        """, "config", cellView="form"), cell("markdown", """
        Trên **Kaggle**, kết quả/ZIP lưu ở `/kaggle/working/cp_sat_cold_2weeks/`,
        lấy từ **Output** của phiên bản sau khi Save & Run All hoàn tất; không cần Google Drive.
        Trên **Colab**, bật `SAVE_TO_DRIVE` để kết nối Drive và lưu vào thư mục bạn chọn.
        Kết quả cuối gồm JSON, CSV và Gantt nếu tìm được lịch hợp lệ. Khi `UNKNOWN`, vẫn có input,
        cấu hình, lịch sử nghiệm và thống kê solver để kiểm tra.

        **Lưu ý cho phiên dài:** giới hạn 12 giờ tính từ đầu ô 1, phù hợp phiên Kaggle Save & Run All
        mới; không đặt lại đồng hồ bằng cách chạy lại ô. Phiên tương tác đã mở từ trước hoặc Colab
        có thể hết hạn sớm hơn. Runtime cũng có thể bị thu hồi.
        Notebook ghi lịch **sau khi solver kết thúc**, chưa có checkpoint nghiệm giữa chừng.
        Nếu phiên bị thu hồi, file `RUNNING` còn trên Drive không phải kết quả hoàn tất.
        Chạy lại luôn bắt đầu từ đầu, không tiếp tục trạng thái tìm kiếm cũ.
        [Giới hạn Colab](https://research.google.com/colaboratory/faq.html).
        """, "persistence"), cell("code", f'''
#@title 3. Khôi phục code và dataset đã đóng gói
import base64
import hashlib
import io
import json
import zipfile
from datetime import datetime, timezone

BUNDLE_SHA256 = "{payload_sha}"
BUNDLE_BASE64 = """
{encoded}
"""
bundle_bytes = base64.b64decode(BUNDLE_BASE64)
assert hashlib.sha256(bundle_bytes).hexdigest() == BUNDLE_SHA256, "Bundle không khớp SHA256"
runtime_root = KAGGLE_ROOT if IS_KAGGLE else (Path("/content") if IS_COLAB else Path.cwd())
WORKSPACE = runtime_root / "mnft_solver_bundles" / BUNDLE_SHA256[:16]
WORKSPACE.mkdir(parents=True, exist_ok=True)
with zipfile.ZipFile(io.BytesIO(bundle_bytes)) as archive:
    for member in archive.infolist():
        target = (WORKSPACE / member.filename).resolve()
        if not target.is_relative_to(WORKSPACE.resolve()):
            raise ValueError("Đường dẫn trong bundle không hợp lệ")
    archive.extractall(WORKSPACE)
manifest = json.loads((WORKSPACE / "bundle_manifest.json").read_text())
for name, expected in manifest["files"].items():
    assert hashlib.sha256((WORKSPACE / name).read_bytes()).hexdigest() == expected, name
INPUT_PATH = WORKSPACE / "dataset/wheel-factory-2weeks/model_input.json"
data = json.loads(INPUT_PATH.read_text(encoding="utf-8"))
assert data["schema_version"] == 5 and data["horizon"] == 14 * 1440
assert len(data["orders"]) == 24 and len(data["runs"]) == 269
RESULTS_ROOT = runtime_root / "cp_sat_cold_2weeks"
if USE_DRIVE:
    from google.colab import drive
    drive.mount("/content/drive")
    drive_root = Path("/content/drive/MyDrive").resolve()
    RESULTS_ROOT = (drive_root / DRIVE_FOLDER).resolve()
    if RESULTS_ROOT == drive_root or not RESULTS_ROOT.is_relative_to(drive_root):
        raise ValueError("DRIVE_FOLDER phải là thư mục con trong MyDrive")
RESULTS_ROOT.mkdir(parents=True, exist_ok=True)
print("Dataset:", data["name"])
print("Đơn:", len(data["orders"]), "| Lượt:", len(data["runs"]), "| Máy:", len(data["machines"]))
print("Kết quả sẽ lưu tại:", RESULTS_ROOT)
''', "bundle", cellView="form"), cell("code", """
        #@title 4. Chạy CP-SAT từ đầu (mỗi lần chạy tạo một kết quả mới)
        import shutil
        import time

        RUN_ID = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%S%fZ")
        OUTPUT_DIR = RESULTS_ROOT / RUN_ID
        BUDGET_SECONDS = solver_budget_seconds(HOURS, NOTEBOOK_STARTED_AT, time.monotonic())
        runner = WORKSPACE / "notebooks/cp_sat_cold_runner.py"
        command = [sys.executable, "-u", str(runner), "--input", str(INPUT_PATH),
                   "--output", str(OUTPUT_DIR), "--seconds", str(BUDGET_SECONDS),
                   "--workers", str(WORKERS), "--seed", str(SEED)]
        environment = os.environ.copy()
        environment["PYTHONPATH"] = str(WORKSPACE)
        environment["PYTHONIOENCODING"] = "utf-8"
        LOG_PATH = RESULTS_ROOT / f"{RUN_ID}.console.log"
        print("RUN_ID:", RUN_ID)
        print(f"Ngân sách solver thực tế: {BUDGET_SECONDS / 3600:.3f} giờ "
              f"({BUDGET_SECONDS / 60:.1f} phút); chừa 10 phút xuất kết quả.")
        print("CP-SAT không gợi ý đang chạy. Thông báo mỗi 60 giây chỉ là thời gian đã chạy.")
        print("Thư mục kết quả:", OUTPUT_DIR, flush=True)
        started = time.monotonic()
        interrupted = False
        with LOG_PATH.open("w", encoding="utf-8") as console:
            process = subprocess.Popen(command, cwd=WORKSPACE, env=environment,
                                       stdout=console, stderr=subprocess.STDOUT)
            try:
                while True:
                    try:
                        return_code = process.wait(timeout=60)
                        break
                    except subprocess.TimeoutExpired:
                        print(f"Đã chạy {(time.monotonic() - started) / 60:.1f} phút / "
                              f"ngân sách {BUDGET_SECONDS / 60:.1f} phút; đang chờ solver.", flush=True)
            except KeyboardInterrupt:
                interrupted = True
                process.terminate()
                try:
                    process.wait(timeout=10)
                except subprocess.TimeoutExpired:
                    process.kill()
                    process.wait()
                return_code = process.returncode
        OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
        result_path = OUTPUT_DIR / "result.json"
        result = json.loads(result_path.read_text(encoding="utf-8")) if result_path.exists() else {}
        if result.get("status") in (None, "RUNNING"):
            result.update(status="INTERRUPTED" if interrupted else "ERROR", run_id=RUN_ID,
                          has_schedule=False, use_hint=False, hint_source=None,
                          elapsed_seconds=time.monotonic() - started, process_return_code=return_code)
            result_path.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
        shutil.copy2(LOG_PATH, OUTPUT_DIR / "console.log")
        (OUTPUT_DIR / "source_bundle.zip").write_bytes(bundle_bytes)
        shutil.copy2(WORKSPACE / "bundle_manifest.json", OUTPUT_DIR / "bundle_manifest.json")
        print(LOG_PATH.read_text(encoding="utf-8", errors="replace"))
        print("Trạng thái:", result["status"])
        if return_code != 0:
            print("Phiên chạy bị dừng hoặc có lỗi; xem console.log. Bạn vẫn có thể tải file ở bước 6.")
        """, "solve"), cell("code", """
        #@title 5. Xem kết quả và Gantt
        from IPython.display import HTML, Markdown, display

        result = json.loads((OUTPUT_DIR / "result.json").read_text(encoding="utf-8"))
        print("Trạng thái:", result["status"])
        metrics = result.get("metrics", {})
        if metrics:
            selected = {key: metrics.get(key) for key in (
                "objective", "objective_tier1", "objective_tier2", "late_orders",
                "weighted_tardiness", "safety_shortfall", "activated_shifts", "productive_utilization")}
            print(json.dumps(selected, ensure_ascii=False, indent=2))
            print("Cận dưới:", result.get("bound"), "| Gap tổng:", result.get("gap"))
            print("Lịch hợp lệ:", result.get("validation", {}).get("valid"))
        if result["status"] == "UNKNOWN":
            print("Chưa tìm được lịch trong ngân sách. UNKNOWN không có nghĩa bài toán vô nghiệm.")
        elif result["status"] == "INFEASIBLE":
            print("Solver đã chứng minh mô hình không có nghiệm.")
        report_path = OUTPUT_DIR / "REPORT.md"
        if report_path.exists():
            display(Markdown(report_path.read_text(encoding="utf-8")))
        gantt_path = OUTPUT_DIR / "gantt.html"
        if gantt_path.exists():
            display(HTML(gantt_path.read_text(encoding="utf-8")))
        print("Các file:", ", ".join(sorted(p.name for p in OUTPUT_DIR.iterdir())))
        """, "results"), cell("code", """
        #@title 6. Đóng gói và tải kết quả về máy
        ZIP_PATH = Path(shutil.make_archive(str(OUTPUT_DIR), "zip", root_dir=OUTPUT_DIR))
        print("ZIP:", ZIP_PATH)
        if USE_DRIVE:
            print("Bản ZIP và thư mục kết quả đã nằm trên Google Drive.")
        if IS_KAGGLE:
            print("Kaggle: đợi phiên Save & Run All hoàn tất, mở Output để tải ZIP ở đường dẫn trên.")
        elif IS_COLAB:
            from google.colab import files
            files.download(str(ZIP_PATH))
        else:
            print("Máy local: mở file ZIP theo đường dẫn ở trên.")
        """, "download"), cell("markdown", """
        ## Đọc kết quả

        - `result.json`: trạng thái, KPI, thời gian, số worker, seed, cận dưới, gap và kiểm tra lịch.
        - `schedule.json`, `schedule.csv`, `gantt.html`: chỉ có khi solver trả lịch hợp lệ.
        - `history.json`: objective/cận tại các lần solver tìm được nghiệm; rỗng khi chưa có nghiệm.
        - `solver.log`: thống kê cuối của CP-SAT; `console.log`: đầu ra tiến trình, gồm lỗi nếu có.
        - `input.json`, `config.json`, `source_bundle.zip`: dữ liệu và code để đối chiếu/tái lập.
        - `results.json`, `REPORT.md`: kết quả tổng hợp sau khi giải hoàn tất.

        Objective = tầng 1 × 1.000.000 + tầng 2. Hãy đọc cả hai tầng, vì gap tổng nhỏ
        chưa có nghĩa chi phí tầng 2 đã gần tối ưu. Cùng seed và giới hạn wall-time vẫn có thể
        ra kết quả khác khi số CPU hoặc môi trường thay đổi.

        Nguồn: [OR-Tools — giới hạn thời gian](https://developers.google.com/optimization/cp/cp_tasks),
        [Colab — Drive](https://github.com/googlecolab/colabtools/blob/main/google/colab/drive.py),
        [Colab — tải file](https://github.com/googlecolab/colabtools/blob/main/google/colab/files.py).
        """, "notes")]
    notebook = {"nbformat": 4, "nbformat_minor": 5, "metadata": {
        "colab": {"name": OUTPUT.name, "provenance": [], "toc_visible": True},
        "kernelspec": {"display_name": "Python 3", "language": "python", "name": "python3"},
        "language_info": {"name": "python", "version": "3.12"},
    }, "cells": cells}
    for output in (OUTPUT, KAGGLE_OUTPUT):
        notebook["metadata"]["colab"]["name"] = output.name
        output.write_text(json.dumps(notebook, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        print(f"Created {output} ({output.stat().st_size:,} bytes; bundle {payload_sha})")


if __name__ == "__main__":
    build()
