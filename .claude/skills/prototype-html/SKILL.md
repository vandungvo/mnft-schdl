---
name: prototype-html
description: Dùng khi cần dựng prototype HTML clickable đa màn hình cho 1 feature, chạy như app thật (state-driven, lưu localStorage) kèm lớp góp ý ghim lên element. Bậc fidelity cao nhất trong họ wireframe. Cần userflow + ASCII wireframe + design.md.
allowed-tools: Read, Write, Edit, Bash, Glob, Grep, Task
user-invocable: true
disable-model-invocation: true
argument-hint: "<feature> [no-comment]"
---
<!-- Licensed to vandungvo2003@gmail.com — Order YYWVQ3VWE -->

# /prototype-html — Interactive HTML Prototype Builder (hi-fi, functional)‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

## Goal‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

Build 1 file `{feature}-prototype.html` self-contained, double-click mở browser, **chạy như một web/app thật** trong phạm vi mock: click-through giữa screens, hành động sinh dữ liệu thật, state persist qua reload. **Stakeholder review thực tế UX** chứ không chỉ static spec.

**Các nguyên tắc cốt lõi (khác bản slideshow cũ):**

1) **Functional / state-driven** — mọi màn render TỪ `store.state`, KHÔNG hard-code màn kết quả. Tạo deck → deck thật sự xuất hiện trong list; thêm thẻ → count tăng thật; rate thẻ → tiến độ + summary tính từ hành động thật. Điều hướng có điều kiện thật (validate pass mới đi tiếp). Persist localStorage → đóng/mở lại giữ nguyên câu chuyện demo. **Ranh giới:** vẫn là mock — không API/auth thật; "chạy như thật" = state + navigation + data vận hành đúng logic nội bộ, KHÔNG kết nối hệ thống thật.
2) **Vỏ điều hướng nổi (floating)** — FAB góc dưới-phải → panel bật lên chứa TOC (flow→screen) + sơ đồ luồng click được. KHÔNG sidebar cố định chiếm chỗ. Nguồn chia flow = `srs/{feature}-userflow.md` Mục 3 (giống `/wireframe-html`).
3) **2 lớp tách bạch** — VỎ chrome (FAB/panel/nền quanh) neutral B&W như wireframe-html; APP (bên trong device frame) mới có design tokens/màu. Khung device căn giữa nền trắng — "chiếc điện thoại đặt trên bàn trắng".
4) **Bước NGOÀI màn hình → thuộc VỎ chrome, KHÔNG nhét vào app UI.** Nhiều luồng có bước xảy ra ngoài app: bấm link trong email (verify/reset), thời gian trôi (link hết hạn, khóa 24h tự mở), admin thao tác, webhook về. App thật KHÔNG có nút cho các bước này — user làm ở nơi khác (hộp thư, đồng hồ). Trong prototype, để demo đi tiếp vẫn cần kích hoạt chúng → đặt trong **panel nổi**, 1 section riêng gắn nhãn rõ (vd "Bước ngoài màn hình (mô phỏng)"), KHÔNG đặt link/nút giả "Mô phỏng: bấm link còn hạn" TRONG `<section data-screen>` (đọc nhầm là chức năng app thật, làm bẩn màn). Màn app chỉ chứa affordance user THẬT thấy.
5) **Mọi hành động submit/async PHẢI có loading state** — app thật không phản hồi tức thời. Nút submit (login/signup/forgot/reset/resend/...) khi bấm: disable ngay + đổi label sang trạng thái đang xử lý (vd "Đang đăng nhập...") kèm spinner/icon quay, giữ nguyên ~500-800ms (`setTimeout` deterministic, KHÔNG random) rồi mới render kết quả (chuyển màn / banner lỗi / banner thành công). Thiếu bước này → thao tác "nhảy" tức thời, không giống app thật, review dễ bỏ sót bug performance-perception thật.
6) **Màn ENTRY của flow phải tự xoá input cũ khi quay lại; dữ liệu truyền giữa các màn trong CÙNG flow phải được giữ.** Hai loại dữ liệu khác nhau, xử lý khác nhau:
   * **Input tự-nhập-lại mỗi lần ghé màn ENTRY** (login: email/password; signup: các field; forgot-password: email) — sống trong DOM, KHÔNG trong `store.state`. Quay lại màn này (back, click nav, hoàn tất 1 nhánh khác rồi quay về) phải **xoá sạch input DOM cũ** + reset banner lỗi/trạng thái validate — giống việc user rời trang rồi quay lại app thật (session form không tồn tại giữa các lượt ghé).
   * **Dữ liệu truyền TỪ màn trước SANG màn sau trong cùng 1 flow** (email vừa đăng ký hiện ở verify-sent, token reset dùng ở reset-password) — đã nằm trong `store.state` (persist), PHẢI giữ nguyên khi điều hướng — đây KHÔNG phải "input cũ" mà là **context của flow đang chạy**, xoá nhầm làm gãy luồng demo.
   * Quy tắc thực thi: khai báo `ENTRY_SCREENS` (danh sách slug màn entry mỗi flow) trong `{{APP_LOGIC}}`; `showScreen()` gọi `clearFormInputs(slug)` nếu `slug` thuộc `ENTRY_SCREENS` TRƯỚC khi `renderScreen(slug)` — `clearFormInputs` reset `value=''`/`checked=false` mọi input trong section đó + ẩn banner/error-inline, KHÔNG đụng `store.state`.
7) **Form field PHẢI có vòng đời pristine → touched → submitted; KHÔNG hiện lỗi trước khi user tương tác.** Field mới render (hoặc vừa `clearFormInputs()`) ở trạng thái `pristine`: không class lỗi, `aria-invalid="false"`. Field chỉ chuyển `touched` khi user rời field đó (`blur`) — lúc đó mới validate VÀ CHỈ field đó. Bấm submit đánh dấu TOÀN BỘ field trong form là `touched` (kể cả field chưa blur) rồi validate hết trước khi cho qua. Sau khi 1 field đã `touched`, mọi lần gõ tiếp (`input`) phải revalidate ngay — sửa đúng thì lỗi biến mất ngay lập tức, KHÔNG đợi blur/submit lần sau. Field còn `pristine` thì sự kiện `input` CHỈ sanitize/format, KHÔNG bật lỗi.
   * **Formatting tách khỏi validation, và LUÔN chạy trước** — control có canonical display format (số thẻ, ngày hết hạn kiểu MM/YY, số điện thoại...) phải tự sanitize + format ngay trên `input`/paste bất kể field pristine hay touched. Format trước, đánh giá hợp lệ sau: gõ `1602` vào ô hết hạn phải hiển thị `16/02` ngay (dù tháng 16 không hợp lệ) — lỗi "tháng không hợp lệ" chỉ xuất hiện sau khi field đó `touched` (blur hoặc submit), KHÔNG chặn việc format.
   * Số thẻ: giữ lại chữ số, cắt tối đa 16, hiển thị nhóm 4-4-4-4 cách nhau 1 khoảng trắng. Hết hạn: giữ lại chữ số, cắt tối đa 4, tự chèn `/` sau 2 số đầu → `MM/YY`. CVC: giữ lại chữ số, cắt tối đa 4, KHÔNG thêm separator.
   * `clearFormInputs(slug)` (nguyên tắc 6) PHẢI đưa mọi field trong màn về lại `pristine`: xoá `value`, gỡ mọi class/attribute lỗi (`aria-invalid="false"`, ẩn `.err-inline`), xoá marker `touched`/`submitted` — không chỉ xoá `value` như trước.
   * Field lỗi phải có `aria-invalid="true"` + `aria-describedby` trỏ đúng phần tử thông báo lỗi; field hợp lệ/pristine là `aria-invalid="false"`. Input có định dạng chuẩn hoá nên khai `autocomplete` đúng ngữ nghĩa (`cc-number`/`cc-exp`/`cc-csc`, `email`, `new-password`...) khi hợp business context.
   * **CSS ẩn `.err-inline` PHẢI thắng bất kể vị trí DOM của nó, KHÔNG dựa vào thứ tự khai báo CSS.** Selector `display:none` mặc định của `.err-inline` phải có specificity ≥ mọi selector layout chung khác trong cùng file (vd `.field > span`, `.field small`, `label span`) — nếu selector layout đó cũng match `<span class="err-inline">` (vì nó cũng là con của `.field`/`label`), nó CÓ THỂ thắng dù `.err-inline` đứng SAU trong file. Bind chắc bằng 1 trong 2 cách: (a) thêm tag vào selector base (`span.err-inline` thay vì `.err-inline`) VÀ giữ show-state cùng độ đặc hiệu (`span.err-inline.show`), hoặc (b) loại trừ `.err-inline` khỏi selector layout chung bằng `:not(.err-inline)` (vd `.field > span:not(.err-inline)`). Không được để 2 rule có specificity NGANG NHAU cùng match 1 phần tử rồi phó mặc cho thứ tự khai báo — dễ vỡ lại khi refactor CSS. Áp dụng review này cho MỌI banner/error/toast dùng lớp `.show` để bật/tắt, không chỉ `.err-inline`.
8) **Dropdown/Select/Combobox PHẢI hiện TEXT nghiệp vụ cho user, KHÔNG BAO GIỜ hiện raw key/code/enum.** Bug thực tế (dự án khác dùng skill này): filter "Trạng thái" hiện thẳng `pending_isl_analysis`, `pre_approved`, `ready_to_publish`... (snake_case/enum kỹ thuật) thay vì "Đang phân tích ISL", "Đã duyệt trước", "Sẵn sàng xuất bản". Nguyên nhân: bảng mô tả nguồn (SRS/Error Matrix/entity) thường liệt kê **giá trị kỹ thuật** của 1 field enum (status, category, type...) mà KHÔNG kèm sẵn label hiển thị — skill phải **tự dịch sang tiếng Việt/business wording**, KHÔNG copy nguyên văn giá trị kỹ thuật vào text hiển thị.
   * Mọi `<option>`/`<li>` trong dropdown/combobox/select PHẢI có **2 phần tách biệt**: `value` (hoặc `data-value`) = mã kỹ thuật giữ nguyên cho logic JS so sánh (`pending_isl_analysis`), TEXT hiển thị = nhãn nghiệp vụ dịch sang tiếng Việt tự nhiên ("Đang phân tích ISL"). KHÔNG BAO GIỜ để text hiển thị = value.
   * Cách dịch: snake_case/kebab-case → tách từ, viết hoa chữ đầu, dịch nghĩa sang tiếng Việt theo ngữ cảnh nghiệp vụ (không dịch máy word-by-word) — vd `in_review` → "Đang xem xét" (không phải "In Review" hay "In review"), `requires_revision` → "Cần chỉnh sửa", `ready_to_publish` → "Sẵn sàng xuất bản". Enum tiếng Anh nghiệp vụ đã chuẩn (vd status code ngành) → giữ nguyên hoặc Title Case, tuỳ ngữ cảnh feature.
   * Option "tất cả" (all/any) dùng label rõ nghĩa ("Tất cả trạng thái"), KHÔNG để trống hay dùng chính từ "all"/"any" trần.
   * Áp dụng cho MỌI enum hiển thị dạng liệt kê lựa chọn: dropdown filter, `<select>` field trong form, radio/checkbox group, tag/badge/chip liệt kê trạng thái, tab nếu tên tab lấy từ field enum.

**Bậc cao nhất thang fidelity:** `/wireframe-ascii` (lo-fi chat-native) → `/wireframe-html` (lo-fi B&W, khung device) → `/prototype-html` (hi-fi — bậc NÀY). Prototype đọc **cùng bảng mô tả 5 cột** (nguồn nội dung màn) làm single-source, KHÔNG re-infer màn ASCII/HTML đã tả.

## Constraints‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

### Hard rules — never violate‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

* **L1 approval** trước Write. File đã tồn tại → L2 diff trước overwrite.
* **KHÔNG `context: fork`** — skill có nhánh HITL (hỏi device khi userflow thiếu `primary_device`, review apply loop). Fork mất kênh hỏi-đáp → prompt bị auto-skip (per `feedback_fork_no_hitl`). Phân tích nặng vẫn delegate qua Task sub-agent, không fork toàn skill.
* **Output chính**: `docs/{feature}/html-design/{feature}-prototype.html` (self-contained). Side-effect: update `{feature}-wireframe-index.md` cột HTML prototype (Phase G).
* **Cần `srs/{feature}-userflow.md`** (nguồn TOC + sơ đồ luồng + chia flow). Chưa có/chưa duyệt → gọi `/user-flow <feature>` trước (giống `/wireframe-html`), KHÔNG tự chia flow riêng.
* **Self-contained** — single HTML file, inline CSS + JS. **KHÔNG iframe** (app chia sẻ 1 store JS — iframe cắt state, tạo deck ở flow A không thấy ở flow B). App = 1 document, nhiều `<section data-screen>`, vỏ chrome nổi lên bằng CSS scope. CDN chỉ cho fonts nếu cần, KHÔNG framework.
* **No emoji** — dùng inline SVG stroke (`stroke="currentColor"`, tự ăn theo theme) hoặc Unicode geometric (✓ ✕ ⚠ ℹ ▾ ←). Gate self-check bắt buộc (Phase H) quét cả UTF-8 thô.
* **2 lớp CSS tách biệt:**
  * VỎ chrome (`--chrome-*`, `.proto-fab`, `.proto-panel`) — neutral B&W, **KHÔNG** đọc token app (`--bg`/`--ink`). `body` nền = chrome neutral (`#f4f4f4`).
  * APP (`.proto-app`, `[data-screen]`) — design tokens 2 lớp (raw palette → semantic), theme per-section.
* **Design tokens 2 lớp từ `docs/design.md`:**
  * **Raw palette** (`--palette-*`) copy hex từ design.md, khai báo 1 lần. **CẤM bịa hex ngoài palette** — thiếu màu thì thêm vào bảng palette trước, không viết hex rời.
  * **Semantic** (`--bg`/`--surface`/`--ink`/`--focus-ring`...) — component CHỈ dùng cái này. Bắt buộc định nghĩa CẢ 3 block: `:root` (default) + `[data-theme="light"]` + `[data-theme="dark"]` — thiếu `[data-theme="light"]` thì section light lồng trong dark kế thừa nhầm dark.
  * `color-scheme: light|dark` mỗi theme (scrollbar/input/datepicker native tự đổi màu).
  * `--focus-ring` semantic RIÊNG mỗi theme — vàng `#FCD535` trên nền sáng trượt WCAG AA (~1.2:1), light dùng xanh/xám đậm.
  * design.md missing → fallback generic neutral qua đúng cấu trúc 2 lớp + warn.
* **Theme per-section theo ngữ cảnh màn (skill tự chọn, KHÔNG hỏi):**
  * Transactional (form, list, học/luyện, cài đặt, account, checkout) → `data-theme="light"`.
  * Marketing/hero/onboarding/landing → `data-theme="dark"`.
  * English learning app = transactional → default light. Dẫn xuất từ design.md "multi-theme", không cứng.
  * **Modal/dialog top-layer PHẢI đồng bộ theme** từ màn active khi mở (`openModal()`), nếu không lấy theme body → chói/lệch tông.
  * **Modal PHẢI căn giữa** — `dialog { margin: auto }` bắt buộc. Reset `* { margin:0 }` xoá `margin:auto` mặc định của `<dialog>` → dialog rơi về **góc trái-trên**. Luôn set lại (template đã có khối MODAL base).
* **Device = `primary_device` từ `srs/{feature}-userflow.md`** (single-source, giống `/wireframe-html`). Thiếu field → hỏi user 1 câu (Mobile 375 / Tablet 768 / Desktop 1024) per `ba-conventions.md` Mục 7, rồi gợi ý ghi ngược vào userflow.
  * `mobile` → `.proto-app` width 375, có phone-frame. `tablet` → 768. `desktop` → full-width max 1024, KHÔNG phone-frame.
* **Frame co giãn, KHÔNG vỡ khi viewport hẹp:**
  * Width `min(--device-w, 100%)` — **KHÔNG `100vw`** (tính cả scrollbar → tràn ngang, scrollbar kép).
  * Chiều cao `min(--device-h, calc(100vh - 64px))` + `overflow-y:auto` bên trong — **KHÔNG `aspect-ratio`** trên khung cuộn (nội dung dài ép khung dài thượt hoặc double scrollbar).
  * `@media (max-width:480px)` → frame full màn (bỏ bo góc/shadow). Đây là breakpoint chrome, KHÔNG phải breakpoint nội dung app.
* **State store + persist đầy đủ (KHÔNG chỉ vài input):** 1 key `proto:{feature}:v{N}`, load lúc init, save khi đổi. Persist deck đã tạo, thẻ đã thêm, tab đang mở, tiến độ session. KHÔNG persist field nhạy cảm (password/OTP/token) + state 1-lần-xem (toast/animation flag).
* **Loading state bắt buộc cho mọi submit/async** — disable nút + label "Đang {hành động}..." + spinner, giữ ~500-800ms deterministic trước khi render kết quả. Xem nguyên tắc 5.
* **Entry screen clear input, flow-context giữ nguyên** — `ENTRY_SCREENS` + `clearFormInputs()` chạy trong `showScreen()` trước `renderScreen()`. Xem nguyên tắc 6.
* **Form validation pristine/touched/submitted + formatting-trước-validation** — KHÔNG hiện lỗi trước khi user tương tác; input có canonical format (số thẻ, MM/YY...) phải tự sanitize/format ngay trên `input`/paste. Xem nguyên tắc 7 và helper dùng chung trong template (`digitsOnly`, `formatCardNumber`, `formatCardExpiry`, `setFieldError`, `markFieldTouched`).
* **Dropdown/select/combobox: value ≠ text hiển thị** — mọi `<option>` liệt kê giá trị enum (status, category, type...) PHẢI dịch sang label nghiệp vụ tiếng Việt cho text hiển thị, giữ nguyên mã kỹ thuật ở `value`. CẤM hiện raw snake_case/kebab-case (`pending_isl_analysis`, `in_review`...) làm text cho user thấy. Xem nguyên tắc 8.
* **Demo data 1 nguồn duy nhất** (`const DEMO`), deterministic (KHÔNG `Date.now()`/`Math.random()` — ngày "hôm nay" hardcode cố định). `DEFAULT_STATE` hydrate TỪ `DEMO`.
* **Reset an toàn:** `removeItem(STORE_KEY)` — TUYỆT ĐỐI không `localStorage.clear()` (origin `file://` share storage, clear xoá lây); `confirm()` trước; reset RAM TRƯỚC reload (chặn `beforeunload` ghi đè); xoá `location.hash` (tránh crash hash-route).
* **Vietnamese-first**; HTML `lang="vi"`.
* **Lớp góp ý (comment) — MẶC ĐỊNH BẬT, tắt bằng `no-comment`:**
  * Nguồn DUY NHẤT: `assets/comment-layer.js` — chèn nguyên văn vào cuối `<body>`, KHÔNG viết lại inline, KHÔNG link file ngoài (prototype phải tự chứa 1 file).
  * Thanh công cụ góp ý đặt **góc dưới-TRÁI** (không đè FAB điều hướng ở góc phải) và có **2 trạng thái**: mở rộng (mặc định desktop ≥720px — 1 chạm là thêm góp ý) / thu gọn về 1 nút tròn (mặc định mobile). User đổi được, nhớ theo file.
  * Không tự điền Bin ID/Key vào file; người dựng nhập sau qua `#admin`.
  * Element chính nên có `data-cmt="{screen}.{field}"` để neo bền hơn.
* **BA conventions** — Owner resolution, no-re-ask, IT-BA framing (KHÔNG hỏi tech CSS/framework), Vietnamese typography, L1 prose preview. Per @../../rules/ba-conventions.md.

### Pitfalls — easy to get wrong‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

* **KHÔNG iframe** — đây là khác biệt bản chất với `/wireframe-html`: prototype là app liền mạch share 1 `store` JS, iframe cắt state cross-flow. Giữ 1 document + `<section data-screen>` + vỏ chrome CSS scope.
* **Vỏ dính token app** — bug bản cũ `body{background:#13171f}`. VỎ chrome dùng `--chrome-*`, KHÔNG đọc `--bg`/`--ink`. `body` nền neutral, app tự có nền qua `[data-theme]`.
* **Thiếu `[data-theme="light"]`** — section light lồng trong cha dark kế thừa nhầm. Luôn định nghĩa cả 3 block semantic.
* **Modal chói/lệch tông** — `<dialog>` top-layer không kế thừa theme section → `openModal()` copy `data-theme` từ màn active.
* **Modal nằm góc trái-trên** — reset `* { margin:0 }` xoá `margin:auto` của `<dialog>`. Bắt buộc `dialog { margin:auto }` để căn giữa (template có sẵn khối MODAL base).
* **Demo-notice đè nút app** — `.demo-notice` center `bottom:20px` che nút dưới cùng của app (rate buttons, "Về thư viện"...). Đặt góc dưới-TRÁI (`left:12px;bottom:12px`, FAB ở phải), nhỏ + mờ + `pointer-events:none`, `z-index` dưới FAB. KHÔNG center.
* **Bước-ngoài-màn-hình nhét vào app UI** — bug thực tế: link "Mô phỏng: bấm link còn hạn · link hết hạn" đặt trong `<section data-screen="verify-sent">` → trông như chức năng app thật, người xem tưởng app có nút đó (thực tế user bấm link trong EMAIL). Các trigger đi-tiếp-luồng cho bước ngoài app (verify/reset link, hết hạn, khóa tự mở) phải nằm ở **panel nổi** (section "Bước ngoài màn hình (mô phỏng)" style neutral chrome), KHÔNG trong màn app. Xem nguyên tắc 4. Kiểm: `grep 'Mô phỏng' trong mọi <section data-screen>` = 0.
* **Dropdown/combobox hiện raw key thay vì label** — bug thực tế (dự án khác dùng skill này): filter "Trạng thái" hiện thẳng `pending_isl_analysis`, `pre_approved`, `ready_to_publish`, `in_review`... thay vì nhãn tiếng Việt dễ đọc. Root cause: cột Description trong bảng 5 cột / nguồn SRS liệt kê **giá trị kỹ thuật** của field enum (đúng vai trò của nó — để BA/dev tra cứu chính xác), và khi map sang HTML, skill copy nguyên văn giá trị đó vào CẢ `value` LẪN text hiển thị của `<option>`, thay vì chỉ giữ nó ở `value` và tự dịch text hiển thị. Fix: xem nguyên tắc 8 — `value="{mã-gốc}"`, text luôn là nhãn nghiệp vụ đã dịch. Áp dụng mọi nơi liệt kê enum (dropdown, radio, badge, tab), không chỉ `<select>`.
* **Focus ring vàng trên nền sáng** — trượt WCAG. `--focus-ring` riêng mỗi theme.
* **`100vw` / `aspect-ratio`** — scrollbar kép / double scrollbar. Dùng `min(...,100%)` + `min(h, calc(100vh-64px))` + `overflow-y:auto`.
* **State RAM-only** — bug bản cũ (tạo deck xong refresh mất). Mọi state có nghĩa demo phải qua `store` + `save()`. `update()` là shallow merge (chỉ top-level) — patch object lồng phải spread cả object.
* **Hành động ghi SAI entity đích** — hàm "thêm/sửa" (thêm thẻ vào deck có sẵn, sửa item trong list) phải nhận `targetId` và cập nhật ĐÚNG entity đó trong `store.state`, KHÔNG push entity mới trùng tên. Bug thực tế: `commitDraftDeck` bỏ qua `targetDeckId` → mỗi lần "thêm thẻ" tạo 1 deck trùng tên thay vì thêm vào deck đang mở. Luồng create→add→save phải test end-to-end (xem Phase H harness).
* **Substitute demo data khi entity rỗng** — KHÔNG mượn card/list của entity khác để lấp khi entity đích rỗng (vd deck vừa clone/tạo chưa có card → đừng nhét `DEMO.decks[0].cards`). Rỗng thì render **empty / no-content state** thật. Bug thực tế: `startFreshSession` fallback `DEMO.myDecks[0].cards` → user học nhầm nội dung deck khác. Clone/tạo entity phải sinh **card thật khớp count** (helper `genCards(n)` deterministic) hoặc để rỗng + empty-state, không nửa vời (`total>0` mà `cards:[]`).
* **Mất data khi back/cancel** — nút back/huỷ giữa form nhiều bước (đã nhập/gom data chưa lưu) phải `confirm()` trước khi rời + xoá draft. Không rời im lặng làm mất công user.
* **Submit nhảy kết quả tức thời (thiếu loading)** — bug thực tế: `doLogin()`/`doSignup()` xử lý đồng bộ, banner/chuyển màn hiện ngay khi click, không giống app thật chờ network. Mọi hành động submit/async PHẢI qua bước disable+label-loading trước khi ra kết quả (nguyên tắc 5, bước 20).
* **Mã lỗi/FR-ID lộ ra banner UI thật** — bug thực tế: `banner('login-banner','err','Email hoặc mật khẩu không đúng. <span style="opacity:.7">(E-authentication-003 · lần sai '+fc+')</span>')` — mã lỗi kỹ thuật + số lần sai hiển thị thẳng cho user thấy (screenshot review bắt được). Cột Description bảng 5 cột có mã `E-{feature}-NNN`/`FR-{feature}-NNN` là để BA/dev TRA CỨU, KHÔNG phải nội dung banner. UI chỉ hiện wording thuần (vd "Email hoặc mật khẩu không đúng."); mã ID chỉ được ở JS comment.
* **Input cũ còn sót khi quay lại màn ENTRY** — bug thực tế: quay lại `login` sau khi đã gõ email/password lần trước, input DOM vẫn giữ giá trị cũ (HTML input không tự clear khi ẩn/hiện qua CSS `display`). Phải chủ động `clearFormInputs()` cho màn trong `ENTRY_SCREENS` mỗi lần `showScreen()` kích hoạt (nguyên tắc 6, bước 14/20) — **PHÂN BIỆT** với dữ liệu context của flow (`pendingEmail`, token reset) đã nằm trong `store.state`, KHÔNG được xoá theo, chỉ input tự-nhập-lại mới xoá.
* **Lỗi bật ngay khi chưa gõ gì + không tự format khi nhập** — bug thực tế (`premium-payment` payment-method): `validateNewCard()` chỉ chạy 1 lần lúc submit và bật `.err-inline.show` cho CẢ BA field cùng lúc nếu bất kỳ field nào rỗng/sai — user vừa bật "Dùng thẻ mới" (chưa gõ gì) mà load lại đúng lúc field khác đang lỗi từ submit trước cũng thấy lỗi hiện sẵn; đồng thời 3 input chỉ có `maxlength`/regex ở bước submit, không có handler `input`, nên gõ `1231234212352341` hay `1602` giữ nguyên chuỗi thô, không tự cắt/định dạng `MM/YY` hay nhóm số thẻ. Root cause: thiếu vòng đời pristine/touched (nguyên tắc 7) và thiếu handler `input` sanitize/format. Fix: mọi field canonical-format PHẢI bind `input` (sanitize + format qua helper template) và `blur` (mark touched + validate ĐÚNG field đó), lỗi chỉ bật sau khi field đã touched hoặc form đã submit, KHÔNG bật hàng loạt cho field còn pristine.
* **CSS specificity làm lỗi hiện sẵn dù JS state đúng (tái diễn SAU KHI đã fix JS ở trên — root cause khác hẳn)** — bug thực tế (`premium-payment` payment-method, phát hiện qua screenshot user chụp): sau khi đã sửa vòng đời pristine/touched trong JS, 3 dòng lỗi VẪN hiện ngay khi chưa gõ gì. Điều tra bằng `getComputedStyle` + duyệt `document.styleSheets[0].cssRules` để tìm MỌI rule match phần tử `<span class="err-inline">` mới lộ ra: `<span class="err-inline">` cũng là con trực tiếp của `<label class="field">` (cấu trúc `<label class="field"><span>Label</span><input>...<span class="err-inline">...</span></label>`), nên selector layout `.field > span { display:block }` (specificity 0,1,1 — 1 class + 1 tag) MATCH TRÙNG và THẮNG `.err-inline { display:none }` (specificity 0,1,0 — chỉ 1 class) vì cao hơn, bất kể `.err-inline` đứng sau trong file. `classList.contains('show')` trả `false` đúng (JS state không sai) nhưng phần tử vẫn hiện `block` trên màn hình — đây là lý do lần review trước (chỉ check class qua DOM, không check computed style) báo PASS oan. Fix: xem nguyên tắc 7 mục CSS specificity — dùng `:not(.err-inline)` loại trừ khỏi selector layout chung, hoặc nâng `.err-inline` lên cùng specificity bằng cách thêm tag (`span.err-inline`). **Bài học verify:** khi field có vẻ "logic đúng nhưng vẫn hiện sai trên UI", đừng chỉ trust JS/class state — luôn đối chiếu `getComputedStyle` thật, vì CSS selector conflict là lớp lỗi hoàn toàn tách biệt khỏi logic JS và không lộ ra qua unit-style assertion trên class.
* **`DEFAULT_STATE` rỗng ≠ `DEMO`** — mở lần đầu trắng trơn. `DEFAULT_STATE` hydrate từ `DEMO`.
* **`load()` không merge** — state cũ thiếu key mới → `TypeError` trắng trang. `Object.assign(structuredClone(DEFAULT_STATE), JSON.parse(r))` + dọn version cũ.
* **Reset `clear()` / không xoá hash / không reset RAM** — `clear()` xoá lây file:// khác; giữ hash → crash route; `beforeunload` ghi đè. Dùng đúng thứ tự: confirm → removeItem → reset RAM → xoá hash → reload.
* **Emoji UTF-8 thô** — grep `&#x` lọt. Dùng `\p{Extended_Pictographic}`.
* **design.md missing** — generic neutral qua đúng 2 lớp + warn.
* **Trùng screen slug** — refuse + ask disambiguate.
* **Heavy screens (>30 elements)** — warn chia nhỏ.
* **Existing prototype.html** — tự update mode (L2 diff).
* **Privacy** — localStorage demo only; demo-notice: "Demo — dữ liệu lưu local, không gửi đâu"; KHÔNG persist field nhạy cảm.
* **Demo data non-deterministic** — KHÔNG `Date.now()`/`random()`, hardcode ngày cố định (stakeholder review nhất quán).
* **Thanh góp ý: phải CÓ CẢ mở-rộng lẫn thu-gọn, không chọn cứng 1 kiểu.** Hai lần sai đã gặp: (a) bày 6 nút ngang ở đáy → mobile chiếm hết bề ngang, che nội dung; (b) sửa thành luôn-thu-gọn 1 nút tròn → desktop phải bấm 2 lần mới thêm được góp ý, rườm rà. Đúng: **desktop (≥720px) mở rộng sẵn** (nút "Thêm góp ý" bấm 1 phát là ghim, kèm nút danh sách + "..." + mũi tên thu gọn); **mobile thu gọn** về 1 nút tròn 44px; user bấm mũi tên đổi qua lại và **lựa chọn được nhớ theo từng file**. Badge số góp ý + chấm trạng thái đồng bộ nằm ngay trên nút tròn. Đặt góc dưới-**trái** vì FAB điều hướng của prototype đã chiếm góc phải.
* **Chèn lớp góp ý bằng replace `</body>` đầu tiên** — sai: nội dung module có thể chứa chuỗi đó trong comment/CSS, dẫn tới chèn vào giữa `<script>` khác làm vỡ file (đã xảy ra). Luôn dùng `rfind` (thẻ đóng CUỐI).
* **Bản nháp rỗng bị đẩy lên máy chủ** — bug thực tế làm **mất chữ của mọi người**: comment vừa tạo (chưa gõ) đã sync lên, lần kéo sau bản rỗng tràn về ghi đè nội dung thật → danh sách toàn "(trống)". Module hiện chặn 4 lớp; nếu sửa module thì giữ nguyên các lớp đó.

## Inputs

```
/prototype-html <feature>              # MẶC ĐỊNH: kèm lớp góp ý (comment)
/prototype-html <feature> no-comment   # bản trình chiếu thuần, KHÔNG có góp ý
```

Feature slug bắt buộc. File tồn tại → overwrite qua L2 diff. Review default-on (Phase H). Muốn bỏ review làm nhanh, nói "khỏi cần review, làm luôn".

**2 mode (nhận diện bằng lời, không cần đúng cú pháp cờ):**

| Mode | Khi nào | Kết quả |
|---|---|---|
| **Có góp ý** (mặc định) | không nói gì thêm | Nhúng `assets/comment-layer.js`; người xem ghim được góp ý lên từng element |
| **Không góp ý** | user nói `no-comment`, "không cần comment", "bản trình chiếu", "chỉ để demo/present" | KHÔNG nhúng lớp góp ý — file sạch, nhẹ hơn, không có nút nào của comment |

Mode không-góp-ý dùng khi prototype chỉ để trình chiếu/demo, không thu thập ý kiến — đúng nhận xét "chắc gì người ta muốn comment".

## Context (dynamic)

Today: !`date +%Y-%m-%d`
Features có userflow (nguồn chia flow): !`for d in docs/*/srs/*-userflow.md; do [ -f "$d" ] && dirname "$d" | xargs dirname | xargs basename; done 2>/dev/null | head -20`
Features có ascii-wireframe: !`for d in docs/*/ascii-wireframe/*-wireframe-index.md; do [ -f "$d" ] && dirname "$d" | xargs dirname | xargs basename; done 2>/dev/null | head -20`
design.md exists: !`test -f docs/design.md && echo "OK" || echo "MISSING (sẽ dùng generic tokens)"`

## Approach

### Phase A — Setup + validate nguồn chia flow‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

1) **Resolve feature.** Validate `docs/{feature}/` tồn tại.
2) **Check `srs/{feature}-userflow.md`** (nguồn TOC + sơ đồ luồng + chia flow):
   * Tồn tại + duyệt → Read Mục 2 (danh sách màn + mục đích) + Mục 3 (chia flow: flow-slug + screens/flow + cases phủ happy/error/edge).
   * Chưa có/chưa duyệt → **tự gọi `/user-flow <feature>`** trước. KHÔNG tự chia flow.
3) **Check ASCII wireframe** `docs/{feature}/ascii-wireframe/{feature}-wireframe-index.md`. Thiếu → refuse + route `/user-flow` + `/wireframe-ascii` (bảng mô tả 5 cột là nguồn nội dung màn). Per `feature-bootstrap.md` nhóm B.
4) **Resolve device (single-source):** `userflow.md` frontmatter `primary_device` → mobile 375 / tablet 768 / desktop 1024. Thiếu → hỏi user 1 câu (per `ba-conventions.md` Mục 7), rồi gợi ý ghi ngược userflow.

### Phase B — Design system extraction (token 2 lớp)

5) **Read `docs/design.md`** nếu tồn tại. Build **raw palette** `--palette-*` (copy hex, 1 lần) cho: primary/primary-active, canvas-dark/light, surface-card-dark/soft-light, ink, body-dark, muted/muted-strong, hairline, trading-up/down, info. Fallback linh hoạt nếu key khác chuẩn.
6) **Build 3 block semantic token** (`{{THEME_SEMANTIC}}`):
   * `:root` default = light (transactional).
   * `[data-theme="light"]` (BẮT BUỘC — chống kế thừa nhầm) + `color-scheme: light` + `--focus-ring` xanh/xám.
   * `[data-theme="dark"]` + `color-scheme: dark` + `--focus-ring: var(--palette-primary)`.
7) **design.md missing** → generic neutral palette (Inter, gray-blue) qua đúng cấu trúc 2 lớp + warn.

### Phase C — Screen content extraction (single-source bảng 5 cột)

8) **Loop screens** theo `userflow.md` Mục 3. Mỗi screen:
   * Tra `{feature}-wireframe-index.md` → biết screen thuộc `{flow-slug}.md` nào + title/subtitle (section `## Descriptions`).
   * Read `ascii-wireframe/{flow-slug}.md` block `## Screen: {slug}` → bảng mô tả **5 cột** (`# / Items / Control type / Data type / Description`). **Single-source:** dùng thẳng (Description đã sâu 6 lớp — error wording, states, validation, edge). KHÔNG re-infer.
   * Extract per row: control type, required, placeholder, default, error code + wording, navigation target, validation rule (business-language). **Mã `E-{feature}-NNN`/`FR-{feature}-NNN` trong bảng mô tả là metadata truy vết cho BA/dev đọc tài liệu — KHÔNG render vào banner/text hiển thị trong `<section data-screen>`.** UI thật chỉ hiện đúng **wording** (câu thông báo) đúng như cột Description; mã ID chỉ được phép xuất hiện trong JS comment (`// E-authentication-003`) hoặc report, không trong chuỗi hiển thị cho user.
9) **Quyết định theme mỗi screen** theo ngữ cảnh (transactional→light, marketing→dark).

### Phase D — Navigation graph + demo data + state model

10) **Nav graph** {from, trigger, to, condition} từ: Description column ("Success → redirect {X}", "Click → {Y}") → UC `uc-*.md` branches → fallback linear order.
11) **Demo data (`DEMO`)** — 1 object gom mọi nội dung giả (deck/card/số liệu), deterministic. Rút số thật từ SRS/brainstorm nếu có, không thì đặt giá trị hợp lý cố định.
12) **State model (`DEFAULT_STATE`)** — hydrate TỪ `DEMO` (`decks: structuredClone(DEMO.decks)`...). Liệt kê state có nghĩa demo cần persist (decks, cards, activeTab, session progress).
13) **Default screen** = màn đầu Mục 3 (hoặc entry-point UC).
14) **Xác định `ENTRY_SCREENS`** — mỗi flow, màn đầu tiên nơi user NHẬP MỚI dữ liệu mỗi lần ghé (login, signup, forgot-password, dạng tương tự) → thêm slug vào `ENTRY_SCREENS`. Màn nhận dữ liệu/token TỪ màn trước trong flow (verify-sent đọc `pendingEmail`, reset-password đọc token) → KHÔNG thuộc `ENTRY_SCREENS` dù là màn "vào từ ngoài" (link email) — context đó phải giữ.

### Phase E — Component mapping

15) **Map bảng 5 cột → HTML component** (dùng semantic token, KHÔNG hex rời):

| Control type | HTML output | Class |
|---|---|---|
| Textbox / Textarea | `<input>` / `<textarea>` | `.input` |
| Button (Primary/Secondary) | `<button>` | `.btn-primary` / `.btn-secondary` |
| Link | `<a>` | `.text-link` |
| Label / Banner (Error/Info/Success) | `<div>` | `.banner-*` |
| Toast | `<div>` JS auto-dismiss | `.toast` |
| Modal trigger | `<dialog>` + `openModal()` (đồng bộ theme) | — |
| Dropdown / Checkbox / Radio / Toggle / DatePicker / FileUpload | native styled | `.select`/`.checkbox`/... |
| Image placeholder | `<div class="img-placeholder">` | dashed border, center label |

   **Dropdown/Select có giá trị enum** (status, category, type...): mỗi `<option value="{mã-kỹ-thuật}">{nhãn nghiệp vụ tiếng Việt}</option>` — `value` giữ mã gốc cho JS so sánh/lưu state, nội dung hiển thị LUÔN là nhãn đã dịch (nguyên tắc 8). Cột Description của bảng 5 cột thường chỉ liệt kê mã kỹ thuật (`draft`, `pending_isl_analysis`...) — đó là dữ liệu để BA/dev tra cứu, KHÔNG phải text hiển thị; skill tự dịch sang tiếng Việt tự nhiên trước khi đưa vào `<option>`.

16) **Icons:** inline SVG `<symbol>` sprite đầu file, dùng `<use href="#ic-*">`, `stroke="currentColor"`. 1 bộ style thống nhất (Lucide/Heroicons/Feather). **KHÔNG emoji.**
17) **Input có canonical display format** (số thẻ, ngày hết hạn MM/YY, số điện thoại...) PHẢI bind cả 3 sự kiện `input` (sanitize + format qua helper template, xem nguyên tắc 7) + `blur` (mark touched + validate field đó) + tham gia validate khi submit. KHÔNG viết riêng regex/format rời cho từng field khi helper chung (`digitsOnly`/`formatCardNumber`/`formatCardExpiry`) đã đủ dùng.

### Phase F — Compose HTML (từ template)

17) **Read `_templates/prototype-html-template.html`** (stage + FAB/panel + token 2 lớp + store + reset — CSS/JS khung sống ở template, skill KHÔNG carry inline).
18) **Fill placeholders:** `{{LANG}}` `{{FEATURE}}` `{{FEATURE_TITLE}}` `{{DEVICE}}` `{{DEVICE_W}}` `{{DEVICE_H}}` `{{FLOW_COUNT}}` `{{SCREEN_COUNT}}` `{{RAW_PALETTE}}` `{{THEME_SEMANTIC}}` `{{APP_COMPONENT_CSS}}` `{{ICON_SPRITE}}` `{{SCREENS}}` `{{DEMO_DATA}}` `{{DEFAULT_STATE}}` `{{APP_LOGIC}}` `{{DEFAULT_SCREEN}}` `{{SCREEN_LIST}}`.
19) **`{{SCREENS}}`:** mỗi screen 1 `<section data-screen="{slug}" data-theme="light|dark">`, nội dung render được từ `store.state` (list/detail đọc state, không cứng).
20) **`{{APP_LOGIC}}`:** hàm `renderScreen(slug)` render mỗi màn từ `store.state`; các hành động (tạo deck, thêm thẻ, rate) đổi `store.state` + `store.save()` + re-render. Điều hướng có điều kiện (validate). Modal mở qua `openModal()`. Mỗi hàm submit (`doLogin`/`doSignup`/...) theo mẫu: disable nút + label loading → `setTimeout(..., 600)` → xử lý kết quả + khôi phục nút. Khai báo `const ENTRY_SCREENS = [...]` (bước 14) + hàm `clearFormInputs(slug)` (reset input/checkbox trong `[data-screen="{slug}"]` về rỗng + ẩn banner/error, gỡ marker touched/submitted + `aria-invalid="false"` — nguyên tắc 7) — `showScreen()` (khung template) gọi hàm này trước `renderScreen()` khi `slug` thuộc `ENTRY_SCREENS`. Field có canonical format dùng helper template `digitsOnly`/`formatCardNumber`/`formatCardExpiry` trong handler `input`, và `markFieldTouched`/`setFieldError` trong handler `blur` + tại thời điểm submit validate toàn form.
21) **`{{TOC}}` + `{{FLOWMAP}}`** (vào panel nổi) từ `userflow.md` Mục 3 — theo mẫu cuối template. `data-goto="{slug}"` click → `goto()` + đóng panel. Node class happy/edge/error theo cột "Cases phủ".

### Phase F.2 — Nhúng lớp GÓP Ý (bỏ qua nếu mode `no-comment`)

22) **Mode không-góp-ý** → bỏ qua phase này. File ra sạch, không có dấu vết comment.

23) **Mode có góp ý (mặc định):** đọc `.claude/skills/prototype-html/assets/comment-layer.js` rồi chèn **nguyên văn** vào ngay trước thẻ đóng `</body>` **cuối cùng**:
    ```html
      <!-- COMMENT LAYER -->
      <script>
      ...nội dung comment-layer.js...
      </script>
    </body>
    ```
    * Chèn ở `rfind('</body>')` (thẻ đóng CUỐI), KHÔNG dùng replace-đầu-tiên — file có thể chứa chuỗi `</body>` trong comment/CSS.
    * **KHÔNG** dùng `<script src="comment-layer.js">` — prototype phải TỰ CHỨA (mở `file://` và đẩy web đều chạy, chỉ 1 file).
    * **KHÔNG sửa nội dung module** khi chèn. Cần đổi hành vi thì sửa ở `assets/comment-layer.js` rồi build lại.

24) **Gắn `data-cmt` cho element chính** (nâng độ bền neo, gần như miễn phí vì skill đã biết tên từng element từ bảng 5 cột): thêm `data-cmt="{screen}.{field}"` vào input/button/link chính trong `{{SCREENS}}` — vd `data-cmt="login.email"`, `data-cmt="login.submit"`. Element không có `data-cmt` vẫn góp ý được (module tự dò bằng selector + chữ ký nội dung), nhưng có thì neo chắc hơn khi DOM vẽ lại.

25) **KHÔNG cấu hình sẵn Bin ID/Key trong file.** Người dựng tự mở `#admin` để nhập sau khi đẩy web (xem `references/HUONG-DAN-LUU-CHUNG.md` trong folder skill này). Chưa nhập thì góp ý vẫn chạy ở chế độ chỉ-lưu-máy.

### Phase G — Side effects + L1 + Write

22) **Update `{feature}-wireframe-index.md`** cột HTML prototype = `{feature}-prototype.html#{slug}`. Set env trước Write (hook ghi changelog.md): `CLAUDE_SKILL_NAME=/prototype-html` + `CLAUDE_CHANGELOG_AUTHOR={@author}` + `CLAUDE_CHANGELOG_NOTE=HTML prototype added cho {N} screens` (≤80 ký tự). Update `updated:`.
23) **L1 approval preview:**
    ```
    [/prototype-html] Sẽ build interactive HTML prototype cho {feature}:
      Device:      {mobile 375|tablet 768|desktop 1024}  (từ userflow primary_device)
      Theme:       {N} màn light (transactional) · {M} màn dark (marketing)  — tokens từ design.md
      Screens:     {S} màn · {E} nav edges · state-driven (render từ store)
      Điều hướng:  menu nổi góc dưới-phải (TOC + sơ đồ luồng {F} flow)
      Góp ý:       {có — nút tròn góc dưới-trái, ghim lên element | KHÔNG (bản trình chiếu)}
      Persist:     localStorage proto:{feature}:v1 (deck/thẻ/tiến độ)
      Output:      docs/{feature}/html-design/{feature}-prototype.html  (self-contained, KHÔNG iframe)
    Apply? (Y / sửa)
    ```
24) **Write file.** L2 diff khi đã tồn tại (update mode tự động).

### Phase H — Gate emoji + Post-write UX review

25) **Gate emoji (BẮT BUỘC trước report)** — LLM hay xuất emoji UTF-8 thô; grep `&#x` không đủ. Quét CẢ hai dạng:
    ```bash
    grep -nP '&#x1[fF][0-9a-fA-F]{3};|&#x2[67][0-9a-fA-F]{2};' <file>
    node -e 'const s=require("fs").readFileSync(process.argv[1],"utf8");const m=s.match(/\p{Extended_Pictographic}/gu);if(m){console.log("EMOJI:",[...new Set(m)]);process.exit(1)}' <file>
    ```
    Còn match → thay bằng SVG `<symbol>`/unicode geometric rồi mới report.
26) **Verify FUNCTIONAL bằng harness (BẮT BUỘC — không chỉ render tĩnh).** Prototype "chạy như app thật" → phải drive luồng chính end-to-end, không chỉ check DOM load. Nếu có Chrome (vd `~/.puppeteer-cache/chrome/*/`), tạo file test tạm = prototype + `<script>` chèn trước `</body>` gọi các hàm luồng chính (tạo entity → thêm con → lưu → chuyển màn → kiểm `store.state`), ghi kết quả vào `document.title`, chạy `chrome --headless --dump-dom` đọc title. Assertion tối thiểu:
    * Tạo entity mới → xuất hiện trong `store.state` list + persist localStorage.
    * Thêm con vào entity CÓ SẴN → cập nhật đúng entity đích (KHÔNG tạo trùng).
    * Entity rỗng → empty-state, KHÔNG mượn demo data khác.
    * Hành động (rate/submit) → đổi state + render lại.
    * **Submit/async có loading:** click nút submit → ngay lập tức nút `disabled=true` + label đổi (kiểm text chứa "Đang"), sau khoảng chờ mới về `disabled=false`/label gốc hoặc chuyển màn.
    * **Entry screen clear:** set giá trị vào input của 1 màn trong `ENTRY_SCREENS` → điều hướng sang màn khác → quay lại màn đó → input phải rỗng (`value===''`).
    * **Flow-context giữ nguyên:** dữ liệu ghi vào `store.state` ở màn trước (vd `pendingEmail`) → sang màn sau trong cùng flow vẫn đọc đúng giá trị, KHÔNG bị mất khi qua lại `showScreen()`.
    * **Form pristine ban đầu (nguyên tắc 7):** field vừa render/vừa `clearFormInputs()` KHÔNG có class lỗi hiển thị và `aria-invalid` phải là `"false"` — dù giá trị mặc định là rỗng/không hợp lệ. **Kiểm tra CẢ `classList.contains('show')` LẪN `getComputedStyle(errorEl).display`** — chỉ check class KHÔNG đủ, vì CSS specificity conflict (selector layout chung như `.field > span` match trùng `.err-inline`) có thể khiến computed display vẫn `block` dù class `show` không có (bug thực tế đã xảy ra, xem Pitfalls "CSS specificity làm lỗi hiện sẵn").
    * **Input-time formatting:** gõ số thẻ có khoảng trắng/gạch/chữ xen kẽ → DOM value chỉ còn chữ số, tối đa đúng giới hạn, hiển thị đúng canonical format (nhóm 4-4-4-4 cho số thẻ, `MM/YY` cho hết hạn) NGAY khi gõ, không cần blur/submit.
    * **Lỗi chỉ xuất hiện sau touched/submit:** gõ dở dang vào field còn pristine (vd mới gõ 3/16 số thẻ) → KHÔNG bật lỗi; blur field đó hoặc bấm submit mới bật lỗi nếu vẫn invalid; sửa lại đúng → lỗi tắt ngay trên `input` tiếp theo mà không cần blur lại.
    * **Dropdown/select value≠label (nguyên tắc 8):** grep mọi `<option value="([a-z0-9_-]+)"[^>]*>\1<` (text hiển thị trùng y hệt attribute `value`) trong file — có match là FAIL, đổi text hiển thị sang nhãn nghiệp vụ tiếng Việt, giữ nguyên `value`.
    * Reset → xoá localStorage + về default.
    Có FAIL → tự sửa rồi chạy lại. KHÔNG có Chrome → tối thiểu `new Function(scriptBody)` check JS syntax + đọc kỹ từng hàm luồng chính bằng mắt. Xoá file test tạm sau verify.
27) **Skip review nếu user nói "khỏi cần review, làm luôn"** — đi thẳng output. (Gate emoji + verify functional bước 26 VẪN chạy — chỉ skip vòng @uxui-reviewer.)
28) **Spawn `@uxui-reviewer`** (Task) với target file vừa write + references (bảng 5 cột trong `ascii-wireframe/{flow-slug}.md` + `{feature}-wireframe-index.md`). Focus:
    * State coverage: mỗi màn có loading/empty/error/success?
    * **Functional check:** hành động có đổi state thật + render lại? Reset có sạch RAM + hash?
    * **Loading state:** mọi nút submit/async có disable + label "Đang..." trong lúc chờ, không nhảy kết quả tức thời?
    * **Entry-clear vs flow-context:** màn ENTRY xoá input cũ khi quay lại? Dữ liệu truyền giữa các màn cùng flow (email pending, token) có bị mất oan khi điều hướng qua lại không?
    * **Form pristine/touched/format (nguyên tắc 7):** field mới hiện có báo lỗi khi chưa ai gõ không (BLOCKING nếu có)? Input canonical-format (số thẻ, hết hạn) có tự sanitize/format ngay khi gõ không, hay chỉ validate ở submit?
    * **Mã lỗi lộ ra UI:** grep `E-{feature}-\d\|FR-{feature}-\d` trong text hiển thị (banner/label/prose ngoài JS comment) — có match là BLOCKING, phải bỏ mã ID khỏi chuỗi user thấy, chỉ giữ wording.
    * **Raw key lộ ra dropdown/select (nguyên tắc 8):** mọi `<option>`/`<li>` liệt kê enum (status/category/type...) có hiện đúng snake_case/kebab-case làm text cho user thấy không (vd `pending_isl_analysis` thay vì "Đang phân tích ISL")? Có match là BLOCKING, phải dịch sang nhãn nghiệp vụ tiếng Việt.
    * **Theme:** section light/dark đúng ngữ cảnh? modal đồng bộ theme? focus-ring hợp WCAG?
    * **Vỏ tách app:** chrome neutral không dính token app? khung device căn giữa? menu nổi bật/tắt OK?
    * Flow consistency: nav dead-end? Cross-screen drift?
    * Severity per `.claude/rules/review-format.md`.
28) **Auto-fix mặc định** (per `feedback_review_auto_run` — review auto-run + tự fix HẾT, user chỉ xem output cuối). KHÔNG hỏi user pick từng finding:
    * **BLOCKING + WARNING** → skill tự regen affected sections của HTML (giữ 1 file, verify lại: JS syntax + emoji gate + Chrome headless nếu có). Tối đa 2 vòng (fix → re-review); vòng 2 vẫn còn BLOCKING → ghi rõ điểm tồn đọng vào report.
    * **Quyết định nghiệp vụ** (cần chọn phương án UX/nghiệp vụ chưa có nguồn) → skill tự chọn phương án hợp lý + **đánh dấu 🔶 trong report cuối** để user biết chỗ đã tự quyết (user override sau nếu muốn). KHÔNG chặn tiến độ hỏi từng cái.
    * **SUGGESTION** → cân nhắc, áp nếu rẻ + rõ; không thì liệt kê trong report.
    * Set env `CLAUDE_SKILL_NAME=/prototype-html` trước mỗi fix (hook ghi changelog.md; đây là phase review nội bộ của skill này).
    * User chỉ review **output cuối** — muốn tinh chỉnh thêm thì nói, skill vào update mode (L2 diff).
29) **Output report:**
    ```
    ✅ Prototype generated: docs/{feature}/html-design/{feature}-prototype.html
       Device: {...} | Screens: {S} | Nav edges: {E} | state-driven + persist localStorage
       Theme: {N} light / {M} dark (tokens design.md)
       Điều hướng: menu nổi (TOC + sơ đồ luồng {F} flow)
       Emoji gate: PASS | UX review: {N} blocking / {M} warning ({applied} applied)

    Mở browser: double-click file → done (không server).
    Demo flow:
      1. Bấm nút nổi góc dưới-phải → chọn màn / xem sơ đồ luồng
      2. Tạo deck / thêm thẻ → dữ liệu xuất hiện thật, refresh vẫn giữ (localStorage)
      3. Reset (trong menu nổi) → xác nhận → về mặc định sạch
    Update: sửa bảng mô tả 5 cột → chạy lại /prototype-html {feature} (L2 diff + regen).
    ```

## Output

`docs/{feature}/html-design/{feature}-prototype.html` — prototype clickable multi-screen, self-contained, chạy như app thật (state-driven + persist localStorage).

Kèm lớp GÓP Ý ghim-lên-element (mặc định BẬT; thêm `no-comment` để tắt) — lưu chung qua jsonbin để cả nhóm thấy nhau.

Reference trong `{feature}-wireframe-index.md` cột `HTML prototype` dạng `{feature}-prototype.html#{slug}`.

## References

* @../../../_templates/prototype-html-template.html (template chuẩn — stage + FAB/panel + token 2 lớp + store + reset)
* @assets/comment-layer.js (lớp góp ý ghim-lên-element — chèn nguyên văn cuối `<body>` khi mode có góp ý)
* @references/HUONG-DAN-LUU-CHUNG.md (nối kho chung jsonbin — cho người không phải dev)
* @references/HUONG-DAN-DAY-LEN-WEB.md (đẩy lên GitHub Pages/Netlify: đẩy file gì, thứ tự cấu hình)
* @../../rules/feature-bootstrap.md
* @../../rules/approval-gate.md
* @../../rules/naming-conventions.md
* @../../rules/changelog.md
* @../../rules/ba-conventions.md
* @../../../docs/design.md (design tokens source — read at runtime)
* @../user-flow/SKILL.md (nguồn primary_device + chia flow — read at runtime)
* @../wireframe-ascii/SKILL.md (nguồn bảng mô tả 5 cột)
* @../wireframe-html/SKILL.md (renderer ngang hàng B&W — mô hình vỏ điều hướng tham chiếu)
* @../figma/SKILL.md (Figma builder qua MCP)
* @../../agents/uxui-reviewer.md (post-write UX review)
* @../../rules/review-format.md (severity rubric)‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍


<!-- wm:2b9af6c9b691879b1ddb7a04d29a1c88 -->
<sub>Tài liệu thuộc bộ AI4BA BA-Kit — bản quyền ai4ba.com</sub>
