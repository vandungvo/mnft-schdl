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

## 8. Kịch bản = một trang, nhiều tab (redesign 25/10/2026, học Databricks)

Mục tiêu: bỏ việc một bộ dữ liệu có **hai trang** (`/decide/[id]` để điều độ, `/master-data/[id]` để sửa dữ liệu) và bàn điều độ cuộn ~6 màn hình. Mượn các nguyên lý của Databricks (Catalog/Jobs object page), không sao chép giao diện.

| Nguyên lý Databricks | Áp dụng |
|---|---|
| Một đối tượng – một trang, khía cạnh là tab | `/scenarios/[id]`: Tổng quan · Phương án · Lịch & so sánh · Chốt · Phân tích · Dữ liệu · Lịch sử. Thanh tab dính dưới top bar; đổi tab cuộn về đầu tab. |
| Panel chi tiết bên phải | Bấm thẻ phương án / chấm trên đường đánh đổi / dòng xếp hạng → `OptionSheet` (xem nhanh, không đổi lịch đang xem). Từ panel: *Xem lịch*, *So với lịch đang xem*, *Chốt*. |
| Ngữ cảnh luôn hiện (cluster đang gắn) | Pill snapshot cạnh tiêu đề: revision + số lịch; viền cam khi lịch chạy trên revision cũ. |
| "+ New" ở đầu sidebar | Menu *Tạo mới*: kịch bản từ JSON, kế hoạch tổng hợp, lần chạy đơn, *Sinh phương án cho …* (mở `?tab=options&generate=1`). |
| Mật độ cao | Chữ thân 13px (`--text-sm`), base 15px, tiêu đề trang 22px, `--radius` 8px; mô tả trang 1 dòng. |
| Một màu nhấn | Logo một màu (`--sidebar-primary`), bỏ gradient xanh→cam. |

**URL**: `?tab=` giữ nguyên giá trị cũ của dữ liệu nhà máy (`products|btp|machines|orders|settings|history`, kèm `item`, `due`) nên mọi deep-link vào dữ liệu vẫn chạy; thêm `options|schedule|decide|analysis`. Trạng thái điều độ giữ `run`, `cmp`, `policy`, `snap`. `next.config.ts` redirect `/decide[/:id]` và `/master-data[/:id]` sang `/scenarios…` (query được giữ).

**Điều hướng**: Điều độ (Tổng quan, Kịch bản, Lần chạy) · Chuẩn bị (Kế hoạch tổng hợp). Tab *Dữ liệu* có menu trái (Sản phẩm & tồn kho, BTP, Máy & lịch ca, Đơn hàng & lô, Thiết lập) kèm số đếm và số lỗi.

**Đã bỏ**: stepper + scroll-spy (`DeskProgress`, `useActiveSection`), `Section` thu gọn (khoá `schedule-os:section:*` không còn được đọc/ghi), `SituationPanel` (trùng với Tổng quan của dữ liệu nhà máy), thẻ "Quy trình điều độ" tĩnh ở trang Tổng quan. Không đổi API hiện có, logic chấm điểm `lib/decision.ts`; khoá `schedule-os:decisions:*` chỉ còn được đọc để chuyển lên server.

**Giai đoạn 3 (đã làm)**: `components/data-table.tsx` — `DataTable` (cột sắp xếp được với `aria-sort`, cả dòng mở đối tượng, phân trang), `FilterChip` ("Trạng thái ▾" → "Trạng thái: Thất bại ✕", số đếm theo các bộ lọc còn lại), `TableToolbar`, `matches()` (tìm không dấu). Áp cho Kịch bản, Lần chạy (chip Trạng thái/Thuật toán/Kịch bản; vẫn nhận `?status=` và khoá `schedule-run-filters`), Kế hoạch (danh sách đưa lên trước biểu mẫu tạo). API không có sắp xếp nên lọc/sắp xếp/phân trang ở client: Lần chạy đọc tối đa 500 lần chạy gần nhất qua cache `["schedule-runs","all"]`. `components/scenario/run-matrix.tsx` — ma trận kiểu Databricks Jobs ở tab Phân tích: cột = đợt sinh (cùng snapshot, tạo cách nhau ≤2 phút), hàng = thuật toán, ô = trạng thái, ★ = được đề xuất, viền = đã chốt; bấm ô → xem nhanh (hoặc trang lần chạy nếu thuộc snapshot khác).

**Giai đoạn 4 (đã làm)**: nhật ký quyết định lên backend — bảng `schedule_decisions` (migration `20261025_0010`), chỉ ghi thêm; `GET/POST /master-data/datasets/{id}/decisions`. Server tự lấy thuật toán, seed, snapshot (`input_hash`), revision từ lần chạy và kiểm: lần chạy thuộc đúng kịch bản (`DECISION_RUN_MISMATCH`), đã hoàn tất (`DECISION_RUN_NOT_SUCCEEDED`), lý do không rỗng; ghi `actor` và sự kiện audit `schedule.committed` (hiện ở tab Lịch sử). `lib/decision-log.ts` giữ nguyên giao diện hook nhưng đọc/ghi qua API; nhật ký cũ trong `schedule-os:decisions:*` được đẩy lên **một lần** (idempotent bằng `legacy_key`, giữ thời điểm gốc), bản trong trình duyệt không bị xóa, cờ `schedule-os:decisions-migrated:*` chặn gửi lại.

### Audit khả dụng 25/10/2026 (axe-core 4.10, WCAG 2.2 AA + best-practice, sáng/tối)

Đã sửa: tương phản nhãn nhóm sidebar (3.37 → ≥4.5), badge "Sẵn sàng" (`--success` #15803d → #137339), chữ tab chưa chọn (`text-foreground/60` → `text-muted-foreground`), số đếm menu Dữ liệu; SVG tương tác (đường đánh đổi, Gantt) `role="img"` → `role="group"`; bảng tràn ngang tự nhận focus bàn phím (`components/ui/table.tsx`); vùng cuộn bảng giao hàng có `role="region"`; vùng bấm ≥24px; heading ẩn cho từng tab; `aside` sidebar có nhãn; tiêu đề tab trình duyệt theo trang (`PageHeader`). Hành vi: tab Chốt giữ nguyên lý do đang gõ khi đổi tab (`forceMount`); bỏ `overflow` trên `<html>` để sidebar/top bar không "nhảy" khi mở Sheet/Dialog; thanh tab có dải mờ báo cuộn ngang dưới 1024px; thẻ phương án ghi "Xem nhanh". Kết quả: 0 vi phạm trên Tổng quan, Kịch bản (mọi tab), Lần chạy, Kế hoạch.

## 9. Hai mô hình sản xuất: schema 4 và schema 5 (25/10/2026)

Thử nghiệm mới nhất của đồ án (`models/runs/v2`, dữ liệu `dataset/wheel-factory-2weeks/model_input.json`) dùng **schema 5**: dây chuyền 5 công đoạn (đúc → nhiệt luyện → gia công → sơn → QC), **mẻ cố định theo công đoạn** (`runs`, `run_size`), khuôn dùng chung có giới hạn chu kỳ, lò nhiệt luyện chạy liên tục 24/7, mẫu ca theo ngày, đơn dài hạn + phương án dự trữ, mục tiêu phân tầng. Đây là mô hình khác (engine `models/common/stage_runs`), không phải phiên bản mới của schema 4.

**Backend**: `SchedulingInputV5` (pydantic chặt + `stage_runs.instance.check`), `AnySchedulingInput` phân nhánh theo `schema_version` (mọi giá trị khác 5 vẫn vào schema 4, kể cả v3 tự nâng cấp). Kịch bản schema 5 lưu nguyên tài liệu đã kiểm ở `master_datasets.document` (migration `20261025_0011`); revision, lần chạy, quyết định, audit dùng chung. Adapter chọn bộ kiểm + KPI theo schema; dòng lịch schema 5 lưu `lot` = mã mẻ, `item` = mã hàng, `shift` = null cho máy liên tục. Chặn có mã lỗi: sửa từng bản ghi trên schema 5 (`SCHEMA5_EDIT_VIA_JSON` — sửa bằng thay file JSON), kế hoạch tổng hợp trên schema 5 (`PLANNING_NOT_AVAILABLE`), `cp_rolling` trên schema 4 (`ALGORITHM_NOT_AVAILABLE`).

**Frontend**: `lib/plant.ts` là read model chung cho Gantt, giao hàng, tồn kho, ca bật (máy theo ca/liên tục, công đoạn cuối, sản phẩm của mỗi dòng lịch). Gantt tô sọc nhiều màu cho mẻ bán thành phẩm dùng chung nhiều sản phẩm, nền "liên tục" cho lò 24/7. `components/scenario/v5-views.tsx`: Tổng quan (gợi ý, số liệu, dòng chảy 5 công đoạn + tải thô, dải horizon, nhu cầu gồm dài hạn) và tab Dữ liệu chỉ đọc (Sản phẩm & tuyến, BTP, Máy-khuôn-mẫu ca, Đơn hàng + dài hạn, Mẻ chạy, Thiết lập & mục tiêu) dùng `DataTable`. Trình sửa bản ghi schema 4 giữ nguyên, nhận kiểu `MasterDatasetDetailV4`; Lịch sử/revision dùng `ScenarioMetaProvider` chung. `availableFor()` ẩn `cp_rolling` với schema 4.

Đối chiếu: EDD/FIFO chạy qua backend cho đúng objective như log thử nghiệm 04/10 (323465104894 / 365305105032).

## 6. Tách dữ liệu theo tần suất thay đổi (10/2026)

Audit: mỗi lần lập lịch phải nhập lại cả file JSON (sản phẩm, máy, ca, đơn, tồn) dù chỉ đơn hàng và tồn kho thay đổi. Ca được trải sẵn cho từng ngày, thời gian là phút tương đối, lô và phân bổ lô–đơn phải nhập tay. Thiết kế mới (chi tiết ở `docs/_product/factory-periods.md`):

- **Điều hướng theo tần suất**: *Điều độ* (Hôm nay, Kỳ lập lịch, Sổ đơn hàng) → *Dữ liệu nền* (Nhà máy, có phiên bản) → *Nâng cao* (Kịch bản JSON, Lần chạy, Kế hoạch v4).
- **Hôm nay** trả lời câu "giờ làm gì": kỳ hiện tại kèm nút bước tiếp theo, đơn quá hạn, đơn sắp đến hạn chưa thuộc kỳ nào, tải các tuần tới.
- **Kỳ lập lịch** là một trang duy nhất với stepper Chuẩn bị → Sinh & so sánh → Chốt → Thực hiện. Bàn điều độ cũ được nhúng qua `ScenarioWorkspace` (`embed`), không sao chép code. Thanh phiên bản (kỳ chính · biến thể · lập lại lịch) đặt ngay dưới header.
- **Chuẩn bị**: sửa trên một bản nháp, có thanh "Lưu & kiểm tra" dính đáy; lỗi biên dịch hiện bằng câu dễ hiểu và bấm vào thì nhảy tới đúng mục. Tồn đầu kỳ hiện cạnh số dự kiến, ô bị sửa được tô vàng. Lịch máy là lưới máy × ngày, bấm ô để thêm ngoại lệ.
- **Sinh phương án**: 3 mức Nhanh / Cân bằng / Kỹ. Thuật toán, seed và ngân sách giây nằm trong "Tuỳ chỉnh".
- **Thực hiện**: lệnh sản xuất theo ngày/máy (in, CSV có BOM cho Excel), báo sự cố → lập lại lịch từ thời điểm cắt, đóng kỳ → kỳ sau.
- **Nhập đơn**: tên cột tiếng Việt hoặc tiếng Anh, ngày dd/mm/yyyy, gợi ý mã sản phẩm gần đúng; xem trước với nhãn Thêm/Cập nhật/Lỗi trước khi ghi.
- **Nhà máy**: sửa nháp rồi lưu thành `vN+1` kèm ngày hiệu lực và ghi chú. Thêm sản phẩm hoặc mã bán thành phẩm thì máy cùng công đoạn tự được gán định mức trung bình và ma trận chuyển đổi đầy đủ, nên không bao giờ rơi vào trạng thái cấu hình thiếu.

## 10. Trang Nhà máy — sửa sau review UX (27/10/2026)

Review `/factory` phát hiện: bản nháp mất khi rời trang, ca kết thúc 24:00 hiện ô trống, ô số không xoá được để gõ lại, giờ nghỉ nhập dạng chữ bị bỏ ngầm, bảng Sản phẩm tràn ngang ở 1536px, 3 tầng điều hướng ở mục Máy, giờ/ngày hiển thị kiểu Mỹ, lỗi chỉ báo sau khi gửi server. Đã sửa (`app/factory/page.tsx`, `components/factory/*`, `lib/factory-config.ts`):

- **Bản nháp an toàn**: lưu vào `localStorage` (`planwise:factory-draft:{id}`, kèm phiên bản gốc) sau mỗi thay đổi; quay lại trang thì tự mở lại, nếu nháp làm trên phiên bản cũ thì hỏi trước. Rời trang khi còn thay đổi: link trong app hỏi "Rời trang, giữ bản nháp?", đóng/tải lại tab có `beforeunload`. "Hủy thay đổi" luôn xác nhận.
- **URL**: `?section=machines&item=CAST_1` — mục và bản ghi đang mở giữ khi tải lại/chia sẻ (giống `useMdLocation`).
- **Ô nhập riêng** (`components/factory/fields.tsx`): `NumberField` cho để trống khi gõ, kẹp min/max lúc rời ô; `TimeField` luôn 24 giờ, nhận `24:00` cho giờ kết thúc; `DateField` hiển thị dd/mm/yyyy, nút lịch mở picker gốc. Ô đã sửa có nền vàng nhạt, menu mục có chấm vàng (đã sửa) hoặc số đỏ (lỗi).
- **Kiểm tra phía client** (`configIssues`, khớp `factory_errors` + `FactoryShift.check_times` của backend): trần kho < tồn an toàn, ca kết thúc trước khi bắt đầu/chồng nhau, giờ nghỉ ngoài ca/chồng nhau, bảo trì sai giờ hoặc trỏ máy đã xóa, chính sách không tên/không trọng số. Lỗi hiện ngay dưới ô và tóm tắt trên thanh lưu (bấm để nhảy tới mục); nút Lưu khoá khi còn lỗi.
- **Bố cục mỗi mục**: Quy trình là dải công đoạn gọn (số phút chuyển trên mũi tên), sửa trong ngăn bên phải; Sản phẩm là bảng hẹp (quy trình dạng chip, tồn an toàn/trần kho sửa tại chỗ), quy trình sửa trong ngăn; Máy là bảng tổng quan theo công đoạn + ngăn chi tiết (định mức, ma trận chuyển đổi tô đậm theo độ lớn, đường chéo khoá "—", bảo trì của máy); Ca & lịch nghỉ có **lưới tuần 24h** (ca, giờ nghỉ, ngày nghỉ, bảo trì, vùng chồng ca), giờ nghỉ là các dòng bắt đầu–kết thúc; Chính sách có giải thích từng mục tiêu, thanh tỉ trọng, ghi rõ hệ số khi bật "ưu tiên tuyệt đối".
- **Phiên bản**: thay đổi đọc được ("Sản phẩm F_SILVER · tồn an toàn 24 → 30"), kỳ nào đang dùng phiên bản nào (link tới kỳ), so một phiên bản cũ với bản đang sửa, khôi phục phiên bản cũ vào bản nháp.
- **Header**: "Tải JSON" (cấu hình hiện tại, gồm cả nháp) là hành động chính; đổi tên vào menu "⋯".
- **Xóa**: nút xóa trong bảng dạng mờ, chỉ đỏ khi rê chuột; xóa sản phẩm/máy luôn xác nhận và nói rõ phần bị xóa theo (định mức, chuyển đổi, lịch bảo trì). Mọi ô nhập có nhãn trợ năng song ngữ.

**Sửa danh sách công đoạn (27/10/2026)**: mọi sản phẩm vẫn đi cùng một thứ tự công đoạn (flexible flow shop — linh hoạt ở máy song song, không ở thứ tự), nhưng danh sách công đoạn giờ sửa được ở mục Quy trình: nút "Thêm công đoạn" và điểm chèn "+" hiện khi rê chuột lên mũi tên giữa hai công đoạn; hộp thoại thêm có xem trước quy trình, máy mới (số máy, lịch, định mức, chuyển đổi) và mã bán thành phẩm sẽ tạo (gợi ý theo nhóm dùng chung ở công đoạn trước, sửa được). Ngăn công đoạn có "Lên trước/Ra sau" và "Xóa công đoạn". Mọi thao tác chạy thử trên bản sao trước (`lib/factory-config.ts` `insertStage`/`removeStage`/`moveStage`): đổi công đoạn cuối thì máy chuyển giữa làm sản phẩm và làm mã bán thành phẩm; mã dùng chung mà nay tới từ hai nhánh thì được tách (`F_MACH_X → F_SILVER_PAINT_X + F_BLACK_PAINT_X`) — cả hai đều hỏi xác nhận kèm danh sách cụ thể. Chặn: dưới 2 công đoạn, công đoạn có khuôn thành công đoạn cuối, đổi chỗ buộc tách mã có khuôn. Engine (`models/common/stage_runs/prepare.py`) tìm công đoạn cuối/áp chót theo vị trí thay vì tên `qc`/`paint`, và `check_raw` từ chối mã dùng chung được làm từ hai mã khác nhau (trước đây `upstream_of` âm thầm chọn một); giao diện báo lỗi này ở mục Sản phẩm.
