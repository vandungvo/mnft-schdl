# PlanWise — thiết kế giao diện (redesign 10/2026)

Tài liệu ngắn giải thích **vì sao** giao diện được tổ chức như hiện tại. Phạm vi: chỉ frontend; không đổi API, không đổi logic chấm điểm/đề xuất trong `lib/decision.ts`, không đổi khoá localStorage `schedule-os:*`.

## 1. Người dùng và luồng chính

Người dùng chính là **planner/điều độ viên** tại xưởng. Việc cốt lõi (job-to-be-done):

```
Chuẩn bị kịch bản ─► Sinh nhiều lịch khả thi ─► So sánh theo chính sách ─► Chốt một lịch kèm lý do
 (Dữ liệu nhà máy)      (Bàn điều độ, bước 2)      (bước 2–3)                  (bước 4, nhật ký)
```

Luồng phụ: theo dõi lần chạy và lỗi (Lần chạy), cân đối công suất theo kỳ (Kế hoạch tổng hợp), bảo trì dữ liệu nền (sản phẩm, mã BTP, máy, đơn).

Trạng thái phải có ở mọi màn: đang tải (skeleton), rỗng (empty state có hành động kế tiếp), lỗi (ErrorState có "Thử lại"), lần chạy đang giải/thất bại (alert + timeline), dữ liệu chưa sẵn sàng, snapshot cũ hơn revision hiện tại.

## 2. Vấn đề phát hiện (audit)

| # | Vấn đề | Hệ quả |
|---|---|---|
| A1 | Sidebar tối cố định, CTA nổi bật nhất là "Tạo lần chạy" (chạy đơn lẻ) | Đẩy người dùng vào luồng phụ thay vì Bàn điều độ |
| A2 | Không có breadcrumb; trang chi tiết chỉ có link "← quay lại" | Mất định hướng khi vào sâu (run → desk → master data) |
| A3 | Tiêu đề trang rất lớn + eyebrow cam viết hoa + mô tả dài | Màn desk mất ~40% chiều cao trước khi có nội dung |
| A4 | Bàn điều độ: 5 "bước" nhưng "Tốc độ thuật toán" xen giữa "So sánh" và "Chốt"; bước không cho biết đã xong hay chưa | Luồng sinh → so sánh → chốt không hiển nhiên |
| A5 | Nút chốt nằm cuối trang dài | Phải cuộn xa mới ra quyết định; dễ quên đang xem phương án nào |
| A6 | Tổng quan lặp lại tình trạng hệ thống (banner + top bar + sidebar), thiếu "tiếp tục việc dở" | Trang đầu không trả lời câu "giờ làm gì?" |
| A7 | Danh sách lần chạy: lọc trạng thái nằm trong select, chỉ link "Xem" mới bấm được | Chậm quét lỗi; vùng bấm nhỏ |
| A8 | Chi tiết lần chạy không cho thấy chờ bao lâu / giải bao lâu | Khó chẩn đoán hàng đợi |
| A9 | Bo góc/đổ bóng không thống nhất (`rounded-xl`/`rounded-lg`, `shadow-xs`) ; biến `--s1..--s6` của Gantt chưa được định nghĩa | Thiếu nhất quán; sản phẩm ngoài case-study bánh xe không có màu |
| A10 | Nhãn "Close" trong Dialog/Sheet chỉ có tiếng Anh | Vi phạm yêu cầu song ngữ |

## 3. Mẫu thiết kế tham khảo (và lý do)

- **Linear** — sidebar theo theme, nhóm điều hướng theo công việc, **bảng lệnh Ctrl/⌘ K** (và phím `/`), mật độ thông tin điềm tĩnh. Planner dùng bàn phím nhiều, cần nhảy nhanh giữa kịch bản/lần chạy.
- **Vercel / Stripe dashboard** — header trang gọn (tiêu đề + badge trạng thái + hành động bên phải), breadcrumb ở top bar, bảng có cả dòng bấm được, badge trạng thái mềm.
- **GitHub Actions** — tab lọc trạng thái ngay trên danh sách run; **timeline vòng đời** (xếp hàng → bắt đầu → hoàn tất/thất bại) kèm thời gian chờ và thời gian giải.
- **Kinaxis / Siemens Opcenter APS / Palantir Foundry (scenario)** — thanh tiến trình kịch bản dính đầu trang, **thanh quyết định dính đáy** luôn hiện phương án đang xem + KPI chính + hành động chốt; so sánh hai phương án cạnh nhau trên cùng Gantt.
- **Notion/Figma** — section thu gọn được, nhớ trạng thái theo thiết bị (giữ cơ chế `schedule-os:section:*`).

Chỉ mượn mẫu, không sao chép giao diện.

## 4. Hệ thống thiết kế

**Token màu** (`app/globals.css`, đủ sáng/tối, tên ngữ nghĩa shadcn + token riêng):
- Nền xám lạnh độ bão hoà thấp (`--background`, `--card`, `--muted`) để màu trạng thái mang nghĩa.
- `--primary` xanh (#1f5aa6 / #8db8ec), `--success` / `--warning` / `--destructive` + bản `-soft` cho badge/alert.
- Sidebar theo theme: `--sidebar`, `--sidebar-foreground`, `--sidebar-strong`, `--sidebar-active`, `--sidebar-border`.
- Độ nổi: `--elev-card` → `shadow-card`, `--elev-float` → `shadow-float` (palette, thanh quyết định).
- Gantt fallback `--s1..--s6` trỏ về `--chart-1..6`.

**Chữ**: Be Vietnam Pro; tiêu đề trang 24px/semibold, tiêu đề section 16px, tiêu đề panel 14px, thân 14px, chú thích 12–13px; số dùng `tabular-nums`.

**Hình khối**: bo `rounded-lg` cho mọi thẻ/panel, `rounded-md` cho control; lưới khoảng cách 4px; nội dung tối đa 1400px, gutter 16/24/32px.

**Thành phần dùng chung** (`components/blocks.tsx` + mới):
- `PageHeader` — tiêu đề + `meta` (badge) + hành động; `crumb` đặt tên breadcrumb động; link quay lại chỉ hiện trên mobile.
- `SectionHeading`, `FilterBar`, `Panel`, `StatTile`, `EmptyState`, `FormStep`.
- `Breadcrumbs` (`components/breadcrumbs.tsx`) — suy từ URL; trang tự đặt tên đoạn động.
- `CommandPaletteProvider` (`components/command-palette.tsx`) — trang, kịch bản (desk/dữ liệu), 6 lần chạy gần nhất, hành động (tạo lần chạy, nhập JSON, đổi theme, đổi ngôn ngữ); tìm không dấu ("ban dieu do").
- `ScenarioCard` — một kịch bản = cửa vào desk, kèm số lịch khả thi/đang giải/thất bại, quyết định đã chốt gần nhất và "việc tiếp theo".
- Desk: `DeskProgress` (stepper dính, có trạng thái ✓/đang giải), `DecisionBar` (thanh quyết định dính đáy), `Section` (số bước → dấu ✓ khi xong).

**Trạng thái & truy cập**: focus ring `ring-ring` mọi phần tử tương tác; `aria-current` cho nav/step; palette dùng `combobox`/`listbox`/`option` + `aria-activedescendant`; tab lọc dùng `aria-pressed`; mọi chuỗi qua `t(vi, en)` / `tr(vi, en)`.

## 5. Thay đổi theo trang

- **Khung (shell)**: sidebar sáng/tối theo theme, nhóm "Điều độ" (Tổng quan, Bàn điều độ, Lần chạy) và "Chuẩn bị" (Kế hoạch tổng hợp, Dữ liệu nhà máy); ô "Tìm nhanh… Ctrl K"; tình trạng hệ thống gom về chân sidebar. Top bar: breadcrumb, badge môi trường, cảnh báo mất API, tìm (mobile), ngôn ngữ, giao diện.
- **Tổng quan**: 3 ô "cần xử lý" (thất bại 24h, đang xử lý, kế hoạch cần chỉnh) → "Tiếp tục điều độ" (ScenarioCard) → quy trình 4 bước có số đếm sống → 5 lần chạy mới nhất (cả dòng bấm được). Bỏ banner sức khoẻ trùng lặp.
- **Bàn điều độ – danh sách**: ScenarioCard thay thẻ cũ.
- **Bàn điều độ – kịch bản** (trọng tâm):
  - Header gọn: tên + badge sẵn sàng + rev; chọn phiên bản dữ liệu chuyển lên vùng hành động.
  - Stepper dính 4 bước: Tình huống → Sinh & đề xuất → Xem & so sánh → Chốt, mỗi bước có trạng thái và chi tiết (vd "1 đề xuất / 6 lịch", "Đang giải 3…", "Đã chốt: …"); scroll-spy đánh dấu bước đang xem.
  - "Tốc độ thuật toán" và "Xếp hạng mọi lịch" dời xuống nhóm **Phân tích** sau bước Chốt, mặc định thu gọn.
  - Bước 1 (Tình huống) mặc định thu gọn khi đã có lịch (vẫn nhớ lựa chọn của người dùng).
  - Thẻ phương án: hạng, tên, thuật toán, lưới 4 KPI, câu đánh đổi, điểm, "Đang xem/Xem lịch".
  - Thanh quyết định dính đáy: phương án đang xem, hạng, đã chốt chưa, KPI chính, so với ai, nút **Chốt phương án** (mở bước 4 nếu đang thu gọn, cuộn tới và focus ô lý do). Tự ẩn khi form chốt đang hiện.
- **Lần chạy**: tab trạng thái kiểu GitHub Actions; ô tìm + lọc thuật toán; cột "Thời gian giải"; cả dòng bấm được (link tên vẫn giữ cho bàn phím/mở tab mới).
- **Chi tiết lần chạy**: badge trạng thái cạnh tiêu đề; timeline Xếp hàng → Bắt đầu (chờ bao lâu) → Hoàn tất & kiểm tra / Thất bại (giải bao lâu).
- **Kế hoạch tổng hợp, Dữ liệu nhà máy, Tạo lần chạy**: header/eyebrow thống nhất, `FilterBar`, breadcrumb đặt tên theo kỳ/bộ dữ liệu; nội dung và hành vi giữ nguyên.
- **Kit UI**: nhãn "Đóng/Close" song ngữ trong Dialog/Sheet.

## 6. Việc tiếp theo (chưa làm, cần quyết định)

1. **Nhật ký quyết định lên backend** — hiện vẫn ở localStorage (`schedule-os:decisions:*`); cần endpoint để chia sẻ giữa máy/người.
2. **So sánh 2 Gantt song song** (split view) thay vì chồng viền trên một Gantt — cần thêm không gian và đồng bộ cuộn.
3. **Kế hoạch tổng hợp**: tách "tạo mới" thành dialog/sheet, đưa danh sách lên đầu khi đã có kế hoạch; nối thẳng kế hoạch → desk (hiện đi qua "Tạo lần chạy").
4. **Phím tắt** thêm (vd `g d` tới desk, `c` chốt) và hiển thị gợi ý phím trong palette.
5. Sidebar thu gọn thành icon cho màn 1024–1280px.
6. Trường ngày (`input type=date`) hiển thị theo locale trình duyệt, chưa theo ngôn ngữ app.

## 7. Dữ liệu nhà máy (redesign 10/2026)

Mục tiêu: planner mở một bộ dữ liệu là **hiểu ngay kịch bản**, **thấy cái gì làm dữ liệu chưa sẵn sàng / dễ vô nghiệm và sửa ở đâu**, rồi đi sang bàn điều độ. Chỉ frontend, chỉ dùng endpoint sẵn có.

### Vấn đề trước redesign

| # | Vấn đề | Hệ quả |
|---|---|---|
| M1 | Trang chi tiết mở thẳng vào bảng sản phẩm; lỗi sẵn sàng là một dòng text nối bằng `;` | Không có cái nhìn tổng; không biết lỗi nằm ở bảng nào |
| M2 | Phần lớn dữ liệu không hiển thị: ca, dừng máy, phút/đơn vị, setup, khuôn, lô & phân bổ, mốc đo, ngày làm việc, trọng số | Planner phải mở JSON để hiểu kịch bản |
| M3 | Sửa trực tiếp trong bảng 9–10 cột toàn ô input, mỗi dòng một nút Lưu; ánh xạ BTP lặp ở 2 tab | Dày đặc, dễ sửa nhầm, không có trạng thái "chưa lưu" |
| M4 | Lỗi xung đột revision (409) chỉ hiện câu tiếng Anh từ API | Không biết phải tải lại |
| M5 | Tab không có trong URL; không link được tới một máy/đơn | Không chia sẻ/quay lại được |
| M6 | Lịch sử in `JSON.stringify(details)` | Khó đọc, không dẫn tới đối tượng |
| M7 | Header 4 nút ngang hàng, nút xóa là một khối lớn cuối trang; "Cập nhật từ JSON" chạy ngay không xác nhận | Hành động nguy hiểm dễ bấm nhầm |

### Kiến trúc thông tin

`/master-data/[id]?tab=…&item=…` — tab và bản ghi đang mở nằm trong URL (`history.pushState`, nút Back hoạt động; `?due=N` lọc đơn theo ngày đến hạn).

| Tab | Nội dung | Mẫu tham khảo |
|---|---|---|
| Tổng quan | Thẻ **sẵn sàng** (lỗi backend chặn lập lịch + gợi ý do giao diện phân tích, mỗi mục có nút "Sửa/Xem" mở đúng tab và bản ghi) → 6 ô số liệu bấm được → **dòng chảy sản xuất** Đúc→CNC→Sơn→QC (máy bấm được, kho BTP giữa công đoạn, tải thô theo công đoạn) → **dải horizon** (ngày làm việc/nghỉ, số đơn đến hạn, mốc đo tồn, ngày có dừng máy; bấm ngày → lọc đơn) → nhu cầu theo sản phẩm + revision & lần chạy | Stripe object page (tóm tắt → mục → sự kiện), Kinaxis/Asprova horizon bar |
| Sản phẩm & tồn kho | Bảng gọn: chấm màu sản phẩm (cùng màu Gantt), dòng·màu, thanh tồn đầu/tồn an toàn, nhu cầu, chuỗi BTP đúc→CNC→sơn | Airtable grid + record drawer |
| Bán thành phẩm | Danh mục mã (dùng bởi, máy xử lý, tồn, sức chứa), bảng ánh xạ sản phẩm × công đoạn (lưu ngay từng ô, nhãn "chung") | Supabase table editor |
| Máy & lịch ca | **Lịch tài nguyên** (mỗi máy một hàng, ca + dừng máy trên horizon), thẻ máy theo công đoạn, khuôn với thanh chu kỳ | Siemens Opcenter / Asprova resource calendar |
| Đơn hàng & lô | Chip lọc theo sản phẩm (kèm số đơn/đơn vị), lọc đơn gấp, lọc ngày đến hạn, sắp xếp; cột cửa sổ phát hành→hạn vẽ trên horizon; mở rộng dòng xem lô & phân bổ (cỡ lô, dư, dùng chung) | Linear list + Gantt-lite |
| Thiết lập & chính sách | Horizon, ngày làm việc, mốc đo; trọng số mục tiêu (thanh) + quy tắc sản xuất (sửa được); giả định; thông tin kỹ thuật; vùng nguy hiểm | Vercel/Stripe settings |
| Lịch sử | Nhật ký theo ngày, mỗi dòng: hành động · đối tượng (bấm để mở) · revision tạo ra; lọc theo loại; cột phải "lần chạy theo revision" | GitHub activity / commit list |

### Mô hình chỉnh sửa

- **Ngăn chi tiết (Sheet) bên phải** cho một bản ghi (sản phẩm, mã BTP, máy, đơn): xem đầy đủ + sửa, chân ngăn luôn có trạng thái *Chưa có thay đổi / Có thay đổi chưa lưu*, nút Lưu chỉ bật khi có thay đổi hợp lệ. Đóng (Esc, nền, nút Đóng, ✕) khi còn thay đổi → hỏi "Bỏ thay đổi chưa lưu?".
- **Sửa tại chỗ** chỉ giữ cho ma trận ánh xạ BTP (mỗi ô một quyết định, lưu ngay, như trước).
- Sản phẩm: lưu thông tin + đổi ánh xạ chạy nối tiếp, mỗi bước một revision (báo số revision đã tạo). Máy: một lần `PUT` cả máy (phút cố định, phút/đơn vị, thêm/bỏ mã xử lý, ma trận setup, dừng máy, thông số khuôn). Ca/cửa sổ làm việc chỉ xem.
- Chính sách (trọng số, cỡ lô tối thiểu, dư tối đa, thời gian chuyển): không có endpoint riêng nên lưu bằng **thay thế toàn bộ** (`PUT` dataset với input hiện tại đã đổi các trường đó) — giao diện nói rõ điều này.
- **Xung đột revision (409)**: `MutationNotice` hiện thông báo dễ hiểu + nút "Tải bản mới nhất". Các lỗi khác hiện thông điệp API trong ngăn.
- Hành động nguy hiểm gom vào menu "Thêm" (Tải JSON, Thay bằng file JSON…, Xóa bộ dữ liệu…). Thay bằng file JSON có hộp xác nhận tóm tắt thay đổi số lượng (sản phẩm/máy/đơn/lô trước → sau) và revision sẽ tạo. Xóa luôn xác nhận.

### Kiểm tra "gợi ý của giao diện" (`lib/master-data.ts`)

Không thay thế kiểm tra backend; chỉ trỏ tới chỗ cần xem: thiếu ánh xạ BTP, mã không máy nào xử lý được (gây vô nghiệm), tồn đầu dưới tồn an toàn, mã BTP chưa dùng, tồn đầu vượt sức chứa, máy không có ca/không có mã xử lý, khuôn ≥80% chu kỳ, hạn giao trước phát hành, đơn phân bổ thiếu, lô phân bổ vượt, tải thô công đoạn >100%. Lỗi backend (`readiness_errors`) được gán tab/bản ghi bằng cách dò mã đối tượng trong câu lỗi.

### Thành phần mới (`components/master-data/`)

`shared.tsx` (DatasetProvider, `useMdLocation`, `RecordSheet`, `MutationNotice`, `DirtyHint`, `ProductDot`…), `timelines.tsx` (`HorizonStrip`, `MachineCalendar`), `overview.tsx`, `products.tsx`, `btp.tsx`, `machines.tsx`, `orders.tsx`, `settings.tsx`, `history.tsx`. `components/master-data-editors.tsx` cũ đã bỏ. Danh sách `/master-data`: thẻ có khoảng ngày, số lần chạy (theo revision hiện hành), lối tắt sang bàn điều độ; kéo thả file JSON vào trang để nhập.

### Khoảng trống API (cần quyết định)

1. Không có endpoint **tạo máy / tạo đơn / sửa số lượng, lô, phân bổ lô** → chỉ xem, sửa qua JSON.
2. Không có endpoint riêng cho **trọng số / quy tắc / ngày làm việc / mốc đo / ca** → trọng số & quy tắc lưu bằng thay thế toàn bộ; lịch ca, ngày làm việc, mốc đo chỉ xem.
3. **Nhật ký không lưu giá trị trước/sau** và không có endpoint đọc snapshot revision cũ → chưa hiển thị diff từng trường.
4. `GET /master-data/datasets` luôn trả `is_ready: true` (chỉ trang chi tiết kiểm thật) → badge trên danh sách có thể lạc quan.
5. `readiness_errors` là câu tự do tiếng Anh, không có mã/đường dẫn trường → việc gán tab là dò chữ.
