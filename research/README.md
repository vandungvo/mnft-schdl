# Mã nghiên cứu

Mã phục vụ thử nghiệm và tham khảo, **không** nằm trong sản phẩm (`backend/`, `frontend/`) và không được build vào Docker image. Mọi lệnh chạy từ gốc repository.

| Thư mục | Nội dung | Trạng thái |
|---|---|---|
| `notebooks/` | Notebook Colab/Kaggle tự chứa (engine + dataset nhúng sẵn) chạy CP-SAT không hint trên bộ `wheel-factory-2weeks` với ngân sách dài | Đang dùng (có test trong CI) |
| `demo_page/` | Công cụ dựng trang demo HTML tự chứa nộp GVHD (`report/demo/`): `plan_page_data.py` rút dữ liệu từ một đợt `models/run_all` / `models/run_long`, `scheduling-plan.html` là khuôn trang | Đang dùng |
| `demo_video/` | Quay video demo toàn bộ tính năng (giao diện tiếng Anh, thuyết minh + phụ đề): dữ liệu nhà máy giống thực tế (`seed_demo.py`), instance demo riêng (`start_demo.ps1`, không đụng `data/mnft.db`), kịch bản Playwright (`record_demo.py`), giọng đọc Windows (`tts.ps1`), ghép video (`build_video.py`). Xem `demo_video/README.md` | Đang dùng |
| [`optional_stock/`](optional_stock/README.md) | Thử nghiệm độc lập (20/09/2026) về sản xuất dự trữ để lấp công suất trống: model CP-SAT hai tầng, instance demo, kết quả và test riêng; không dùng `models/common/`. Ý tưởng đã vào engine (lô dự trữ ở v1, phương án làm trước ở v2) | Không phát triển tiếp (còn test trong CI) |
| `legacy/` | Script POC và mô hình cũ trước khi có `backend/`, `frontend/`, `models/`; `legacy/dashboard/` là dashboard tĩnh đã được `frontend/` thay thế; [`legacy/btp_experiment/`](legacy/btp_experiment/README.md) là thí nghiệm lập tay về tồn bán thành phẩm, đã được engine schema 4/5 thay thế | Chỉ tham khảo |

## Lệnh chạy

```powershell
python research/demo_page/plan_page_data.py models/runs/v2/comparison/<run_id> <out.json>   # dữ liệu cho trang demo
python -m research.optional_stock.run                                                        # thử nghiệm sản xuất dự trữ
python -m pytest research/optional_stock -q
```

## Notebook

Notebook được sinh từ code hiện tại, không sửa tay:

```powershell
python research/notebooks/build_cp_sat_cold_2weeks.py
python -m unittest research.notebooks.test_cp_sat_cold_notebook -v
```

Chạy lại builder mỗi khi `models/common/stage_runs/` hoặc `dataset/wheel-factory-2weeks/` thay đổi. Test cũng tự gọi builder trước khi kiểm, nên nếu `git status` báo `.ipynb` đổi sau khi chạy test thì commit kèm.
