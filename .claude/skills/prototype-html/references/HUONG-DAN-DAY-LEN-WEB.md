# Đẩy prototype lên web (GitHub Pages) — đẩy file gì, làm gì trước‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

> Trả lời ngắn: **chỉ cần đẩy 1 file `.html`** (bản đã nhúng comment layer). Không cần `comment-layer.js`, không cần file `.md` nào.

## 1. Đẩy file gì‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

| File | Có cần đẩy? |
|---|---|
| `example-authentication-commentable.html` (hoặc file prototype của anh đã nhúng layer) | __CÓ — chỉ cần cái này__ |
| `comment-layer.js` | __KHÔNG__ — nội dung của nó đã nằm sẵn bên trong file `.html` |
| `README.md`, `HUONG-DAN-*.md` | __KHÔNG__ — tài liệu nội bộ, không cần lên web |

Kiểm nhanh xem file `.html` đã tự chứa chưa: mở file bằng trình soạn thảo, tìm chữ `COMMENT LAYER` — có là đã nhúng. Và __không được__ có dòng nào kiểu `<script src="comment-layer.js">` (nếu có thì file đang phụ thuộc file ngoài).

## 2. Các bước đẩy‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

```bash
# trong repo của anh
mkdir -p prototype
cp example-authentication-commentable.html prototype/auth.html
git add prototype/auth.html
git commit -m "Add clickable prototype with comments"
git push
```

Rồi vào __repo → Settings → Pages → Source: main branch__ → lưu. Vài phút sau có link:
`https://<tên-tài-khoản>.github.io/<tên-repo>/prototype/auth.html`

> Repo __public__ thì ai có link đều xem được. Repo __private__ thì GitHub Pages cần bản trả phí — nếu muốn miễn phí mà kín hơn, dùng __Netlify Drop__ (kéo-thả file, link ngẫu nhiên khó đoán).

## 3. Thiết lập kho comment (làm 1 lần, SAU khi có link web)‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

Thứ tự này quan trọng:‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

1. Mở link web kèm `#admin`:
   `https://.../prototype/auth.html#admin`
2. Bấm __bánh răng__ → dán __Bin ID + Master Key__ (xem `HUONG-DAN-LUU-CHUNG.md` để lấy) → __Lưu & kết nối__.
3. Vẫn trong hộp đó, bấm __"Copy link gửi review"__.
4. Gửi link vừa copy cho mọi người.

Người nhận mở link → tự nối, gõ tên 1 lần, comment được ngay, __không thấy__ cài đặt/Key.

## 4. Vài điều nên biết (tránh bối rối)‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

* __Comment thử ở máy sẽ KHÔNG theo lên web.__ Bản lưu tạm trên máy gắn theo đường dẫn file, mà `file:///Users/...` khác `https://....github.io/...`. Lên web coi như bắt đầu sạch — thường là điều anh muốn.
* __Comment thật nằm trên jsonbin__, không nằm trong file. Nên anh __sửa lại prototype rồi đẩy đè file mới, comment vẫn còn__ (miễn giữ nguyên Bin ID + Key).
* __Đổi tên file trên web__ (vd `auth.html` → `login.html`) cũng không mất comment — nó kéo lại từ jsonbin. Chỉ là bản đệm trên máy mỗi người coi như mới.
* __Nhiều prototype trên cùng một trang web__: mỗi file nên dùng __1 bin riêng__ để comment không lẫn. Hoặc dùng chung 1 bin cũng được — module tự tách theo feature. Nhưng bin riêng thì rõ ràng hơn.
* __HTTPS giúp nút Copy chạy mượt hơn__ so với mở file trực tiếp (`file://` hay bị chặn clipboard). Đây là điểm cộng khi lên web.

## 5. Cập nhật prototype về sau

Sửa xong, chạy lại lệnh dựng file (nhúng layer vào prototype mới), rồi `git push` đè lên. Người dùng tải lại trang là thấy bản mới; comment cũ vẫn nguyên vì nằm trên jsonbin.‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍


<!-- wm:2b9af6c9b691879b1ddb7a04d29a1c88 -->
<sub>Tài liệu thuộc bộ AI4BA BA-Kit — bản quyền ai4ba.com</sub>
