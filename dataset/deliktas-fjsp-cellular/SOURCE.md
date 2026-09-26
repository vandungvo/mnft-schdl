# Deliktaş et al. (2024) — FJCS-SDFSTs-ITTs benchmark (43 instance)

**Tải ngày:** 2026-09-18 | **Trạng thái:** đã tải, đã giải nén (`Instances.rar` gốc, giải bằng 7-Zip)

## Nguồn

- Trích dẫn bài báo: Deliktaş, D., Özcan, E., Üstün, Ö., & Torkul, O. (2024). A benchmark dataset for multi-objective flexible job shop cell scheduling. *Data in Brief*, 52, 110037. Xem `references/10_deliktas_2024_databrief.md`.
- Dataset: Mendeley Data, DOI `10.17632/rtzby7pv7m.1` — https://data.mendeley.com/datasets/rtzby7pv7m/1
- **License: CC BY 4.0.**
- File gốc: `Instances.rar` (253 KB, giải nén ra 1.6 MB / 43 file `.csv`), tải qua Mendeley Data public API (link UI "Download" trên trang không lộ URL trực tiếp qua HTML, phải gọi API `public-api/datasets/{id}/files`).

## Nội dung

Bài toán **FJCS-SDFSTs-ITTs** (Flexible Job Shop Cell Scheduling with Sequence-Dependent Family Setup Times and Intercellular Transportation Times) — có di chuyển liên-cell, setup phụ thuộc trình tự theo họ sản phẩm, thời gian vận chuyển liên-cell, tái nhập (recirculation).

| Folder | Số instance | Quy mô |
|---|---|---|
| `Small/` | 12 | job/máy/cell ít |
| `Medium/` | 9 | vừa |
| `Large/` | 22 | nhiều job/máy/cell/họ sản phẩm |

Mỗi file `Ins.#N.csv` gồm: tham số bài toán (n=số job, L=số họ sản phẩm, C=số cell, m=số máy), bảng gán máy-eligibility theo cell/họ sản phẩm, và ma trận operation × machine-alternative (ô trống = máy không khả thi cho công đoạn đó).

## Liên quan đến đề tài

Đây là **benchmark công khai duy nhất tìm được có sẵn setup time phụ thuộc trình tự theo họ sản phẩm** — đúng loại ràng buộc "ma trận chuyển đổi" của đề tài mà Taillard/Lawrence không có (xem `dataset/or-library-raw/` + `dataset/taillard-ta01-ta80/`). Dùng làm benchmark thứ 3 để đối chứng riêng phần ràng buộc changeover time (§2.4/§2.5/§9 báo cáo + TECHNICAL_SPEC.md).
