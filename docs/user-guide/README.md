# PlanWise User Guide (English)

`user-guide.pdf` — hướng dẫn sử dụng chi tiết từng tính năng (91 trang, giao diện tiếng Anh), dựng từ LaTeX.

| File | Nội dung |
|---|---|
| `user-guide.tex` | File chính: định dạng, trang bìa, macro (`\ui`, `\kbd`, `\callout`, hộp tip/note/caution, `\shot`/`\shotf`) |
| `chapters/01-…18-*.tex` | 17 chương + 3 phụ lục (cột nhập đơn, checklist mỗi kỳ, nhà máy mẫu) |
| `figures/*.png` | Ảnh chụp màn hình (1280×800, scale 2), có số chú thích đỏ |
| `capture_screenshots.py` | Chụp lại toàn bộ hình từ instance demo tiếng Anh |

## Dựng lại PDF

```powershell
cd docs/user-guide
xelatex user-guide.tex; xelatex user-guide.tex      # hoặc: latexmk -xelatex user-guide.tex
```

Cần XeLaTeX (MiKTeX/TeX Live) và font Windows Segoe UI, Consolas.

## Chụp lại hình

Hình lấy từ instance demo của `research/demo_video` (backend :8100, frontend :3100) ở trạng thái sau một lần quay `record_demo.py` (kỳ "Weeks 48-49" đã chốt, có biến thể what-if và bản lập lại lịch). Script không lưu gì: hộp thoại được huỷ, bản sửa tay bị bỏ, đơn tạm thêm vào sổ được xoá lại.

```powershell
<venv>\Scripts\python docs/user-guide/capture_screenshots.py            # tất cả
<venv>\Scripts\python docs/user-guide/capture_screenshots.py --only editor,commit
```

Kết quả solver thay đổi giữa các lần chạy, nên số liệu trên hình (đúng hạn, chi phí, tên phương án) có thể khác; vài chú thích hình trong `chapters/09-…12-*.tex` nhắc số cụ thể cần kiểm lại khi chụp lại.
