# Hướng dẫn nối comment lên máy chủ chung (jsonbin.io) — cực đơn giản‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

> Làm 1 lần, ~5 phút. Xong thì mọi người mở link đều thấy comment của nhau, không mất khi đổi máy/trình duyệt. Miễn phí.
>
> **Không cần biết code.** Chỉ đăng ký 1 email, copy 2 giá trị, dán vào file. Không bảng, không SQL, không "policy".
>
> ⚠️ **Chỉ dùng cho prototype NỘI BỘ.** Chìa khoá nằm lộ trong file HTML — ai xem "View Source" cũng lấy được và sửa/xoá được. Anh đã chấp nhận rủi ro này ("nội bộ, không ai phá"). Đừng dùng cho dữ liệu quan trọng.

## Vì sao jsonbin (không phải Pantry / cái khác)‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

Đã cân nhắc mấy dịch vụ "không cần đăng ký": **Pantry** ít bước nhất nhưng **tự xoá dữ liệu nếu ~30 ngày không ai đụng** — review hay diễn ra theo đợt rồi im, đúng lúc bị xoá thì mất sạch comment. **jsonbin** đổi lấy 1 lần đăng ký email để có dữ liệu **bền vĩnh viễn**. Đáng.

## Các bước‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

### Bước 1 — Đăng ký + lấy Master Key (2 phút)‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

1) Vào **https://jsonbin.io** → **Sign Up** (email hoặc Google).
2) Sau khi vào, menu → **API Keys** (hoặc vào https://jsonbin.io/api-keys).
3) Copy **Master Key** (chuỗi dài `$2a$10$...`). Đây là chìa khoá dùng chung.

### Bước 2 — Tạo 1 "bin" trống (1 phút)‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

1) Menu → **Bins** → **Create Bin** (hoặc nút "+").
2) Xoá nội dung mẫu, dán đúng dòng này:
   ```json
   {"list":[]}
   ```
3) Bấm **Save/Create**.
4) Sau khi tạo, nhìn thanh URL: `https://jsonbin.io/app/bins/XXXXXXXXXXXX` — phần **`XXXXXXXXXXXX`** cuối là **Bin ID**. Copy lại.

### Bước 3 — Nhập Bin ID + Key (chế độ ADMIN)

> **Quan trọng — 2 vai:** người **thiết lập** (admin) và người **review** (bình thường) thấy giao diện khác nhau:
> - **Admin**: mở file bằng URL có `#admin` (vd `prototype.html#admin`) → thấy nút **bánh răng** để nhập/quản lý cấu hình.
> - **Reviewer**: nhận link thường → **KHÔNG thấy** bánh răng, cài đặt, Bin ID/Key, hướng dẫn gì cả. Chỉ dùng comment như bình thường.
>
> Một khi đã mở `#admin` 1 lần, máy đó nhớ vai admin (khỏi gõ `#admin` mỗi lần).

**Cách nhập (admin):** mở `prototype.html#admin` → bấm **bánh răng** → hộp "Cài đặt lưu chung":
- Có sẵn ô copy đoạn `{"list":[]}` dán qua jsonbin (chính là Bước 2).‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍
- Dán **Bin ID** + **Master Key** → **Lưu & kết nối**. Sai định dạng sẽ báo lỗi ngay dưới ô.
- Sau khi nối, có nút **"Copy link gửi review"** → gửi link đó cho mọi người.

**Người nhận link** (reviewer): mở link là **tự nối + thấy comment ngay**, gõ tên 1 lần, dùng bình thường. Link này **không** kèm `#admin` nên họ không thấy cài đặt/Key.

> **2 cách khác cho admin** (nếu thích nhúng cứng vào file thay vì gõ trong app):
> - Sửa thẳng đầu `comment-layer.js`: `var BIN_ID='...'; var BIN_KEY='$2a$10$...';`
> - Hoặc đặt trước khi nhúng: `window.CMT_BIN_ID='...'; window.CMT_BIN_KEY='...';`
> Cách này thì mọi người mở file đã tự nối sẵn (khỏi cần link chia sẻ), nhưng vẫn không thấy cài đặt trừ khi mở `#admin`.

### Bước 4 — Host lên và chia sẻ

Đưa file HTML lên chỗ host tĩnh nào cũng được (kéo-thả là xong):
- **Netlify Drop**: https://app.netlify.com/drop — kéo file vào, có link ngay.
- **GitHub Pages**, **Vercel**, **Cloudflare Pages** — đều được.

Gửi link cho mọi người. Ai mở cũng gõ tên (hỏi 1 lần), ghim comment, và **thấy comment của nhau**. Chấm tròn trên thanh công cụ: **xanh** = đã đồng bộ, **vàng** = đang đồng bộ, **đỏ** = mạng lỗi (comment vẫn lưu tạm trên máy, tự đẩy lại khi có mạng).

## Nó hoạt động thế nào (để yên tâm)

- **Local-first**: mọi thao tác vẫn tức thời trên máy (không chờ mạng). Backend chạy nền.
- **Kéo (pull)**: cứ 15 giây + mỗi khi quay lại tab → tải comment mới của người khác về, **trộn** vào (không đè cái đang gõ dở).
- **Đẩy (push)**: mỗi lần lưu comment → **đọc bản mới nhất, trộn, rồi mới ghi lại** (read-merge-write). Nhờ vậy 2 người ghi gần nhau **không đè mất comment của nhau** — dù jsonbin lưu cả danh sách trong 1 chỗ.
- **Mất mạng**: comment vẫn lưu localStorage, có mạng lại thì tự đẩy lên.

## Giới hạn free tier (đủ dùng cho review nội bộ)

- 10.000 request → dư sức cho vài chục người review vài trăm comment.
- Dữ liệu **không bao giờ tự mất** (khác Pantry).
- Nếu vượt 10.000 request thì tạm dừng tới tháng sau, hoặc tạo tài khoản mới.

## Nhiều prototype dùng CHUNG 1 bin (tuỳ chọn)

Mỗi comment tự gắn tên feature, nên **nhiều file prototype khác nhau có thể dùng chung 1 Bin ID + Key** mà không lẫn — mỗi file chỉ thấy comment của feature mình. Đỡ phải tạo bin riêng cho từng cái.

## Gỡ bỏ (quay lại chỉ-lưu-máy)

Xoá 2 giá trị `BIN_ID`/`BIN_KEY` (để rỗng) → module tự về chế độ localStorage như cũ.‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍


<!-- wm:2b9af6c9b691879b1ddb7a04d29a1c88 -->
<sub>Tài liệu thuộc bộ AI4BA BA-Kit — bản quyền hoangphan.blog</sub>
