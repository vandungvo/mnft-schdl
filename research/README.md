# Mã nghiên cứu

Mã phục vụ thử nghiệm và tham khảo, **không** nằm trong sản phẩm (`backend/`, `frontend/`) và không được build vào Docker image. Mọi lệnh chạy từ gốc repository.

| Thư mục | Nội dung | Trạng thái |
|---|---|---|
| [`experiment/`](experiment/README.md) | Thí nghiệm mô hình tồn bán thành phẩm theo công đoạn, tách khỏi `models/`, không dùng chung kết quả | Đang dùng |
| `notebooks/` | Notebook Colab/Kaggle tự chứa (engine + dataset nhúng sẵn) chạy CP-SAT không hint trên bộ `wheel-factory-2weeks` với ngân sách dài | Đang dùng |
| `legacy/` | Script POC và mô hình cũ trước khi có `backend/`, `frontend/`, `models/`; `legacy/dashboard/` là dashboard tĩnh đã được `frontend/` thay thế | Chỉ tham khảo |

## Notebook

Notebook được sinh từ code hiện tại, không sửa tay:

```powershell
python research/notebooks/build_cp_sat_cold_2weeks.py
python -m unittest research.notebooks.test_cp_sat_cold_notebook -v
```

Chạy lại builder mỗi khi `models/common/stage_runs/` hoặc `dataset/wheel-factory-2weeks/` thay đổi. Test cũng tự gọi builder trước khi kiểm, nên nếu `git status` báo `.ipynb` đổi sau khi chạy test thì commit kèm.
