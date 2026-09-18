# Playbook — Opportunity, tìm đối thủ, phân tích keyword, search, RICE-lite, đánh giá nguồn‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

Nạp ở __CHECKPOINT 1__ để xây kế hoạch research. Phương pháp tổng quát cho mọi domain — thông tin
domain + đối thủ của dự án đọc từ `docs/_shared/project-profile.md` (xem
`.claude/rules/project-profile.md`), KHÔNG hardcode trong playbook.

---

## 0. Opportunity trước, đối thủ sau (thứ tự tư duy)‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

Discovery ≠ chỉ soi đối thủ. Trước khi benchmark ai, xác định __job người dùng MÌNH__ (từ gọi
người dùng lấy theo profile — học viên/khách hàng/tài xế...):

- __JTBD:__ người dùng "thuê" tính năng này để làm được __job gì__? (vd tính năng nhắc nhở → "duy trì
  thói quen dùng đều"; tính năng lưu mẫu → "làm lại việc lặp nhanh hơn"). Diễn đạt bằng ngôn ngữ
  __nhu cầu__, KHÔNG mô tả giải pháp.
- __Bằng chứng nhu cầu:__ có tín hiệu thật (feedback/review/drop-off/user nói)? Không có → ghi thẳng "chưa
  có evidence, giả định top-down" — KHÔNG ngụy tạo. Đây là tín hiệu để verdict thận trọng hơn.
- __Vì sao nó khớp app mình:__ hợp target audience + monetization (đọc `_product/prd.md`).

> Chỉ sau khi có JTBD thì "đối thủ giải job đó thế nào" (Mục 1-4 dưới) mới có nghĩa so sánh. Verdict cuối
> gắn lại JTBD này, KHÔNG đếm số đối thủ có tính năng (tránh "feature war" — Teresa Torres).

---

## 1. Competitor defaults (đọc từ project profile)‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

Nguồn đối thủ mặc định theo thứ tự:

1) **`docs/_shared/project-profile.md` Mục "Đối thủ / benchmark"** — danh sách user đã chốt các lần
   trước. Có → ưu tiên chọn từ đây trước khi search thêm.
2) Profile chưa có → hỏi user 2 câu ngắn ở CHECKPOINT 1: *domain sản phẩm là gì* + *có đối thủ nào
   trong đầu chưa* → search bổ sung (Mục 2) → sau khi chốt, __đề xuất ghi bảng đối thủ vào profile__
   (format: tên | mạnh về | monetization | nguồn/ngày) để lần sau không tìm lại.

Chọn __3-5 cái__ phù hợp với tính năng đang research. Nêu lý do chọn / bỏ cho user duyệt ở
CHECKPOINT 1. Nếu tính năng có chiều chuyên biệt → thêm indirect competitor ngoài domain của mình
nhưng giỏi đúng tính năng đó.

> Cách phân nhóm phân khúc để chọn đúng 3-5 đối thủ + format bảng (kèm cột nguồn/ngày bắt buộc):
> `example-competitors.md` Mục 1-2.

---

## 2. Tự tìm thêm đối thủ (khi cần mở rộng)‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

Chạy song song 2-3 search nhanh:

- `"{domain của app mình} app {feature-keyword}"` → ai làm nổi bật tính năng đó
- `"best apps for {sub-feature}"` → tổng quan thị trường
- `"{known competitor} alternatives"` → mở rộng cụm đối thủ

(`{domain của app mình}` lấy từ profile Mục Domain — vd "english learning", "food delivery",
"warehouse management".)

Phân loại để chọn:

- __Direct__ — cùng domain, tương tự đối tượng người dùng, có (hoặc nên có) tính năng đang research.
- __Indirect__ — app chuyên sâu về đúng tính năng đó dù khác lĩnh vực tổng thể (benchmark nghiệp vụ tốt nhất).

---

## 3. Phân tích keyword — 3 lớp‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

Từ yêu cầu tính năng, sinh 3 lớp keyword để grep + search:

1) __Core concept__ — tên nghiệp vụ chuẩn (thuật ngữ ngành).
2) __Synonym & marketing terms__ — cách đối thủ gọi tính năng đó (mỗi app có thể gọi khác nhau).
3) __Sub-feature / biến thể nghiệp vụ__ — thành phần con cần soi để bảng có chiều sâu, không chỉ‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍
   "có/không": luồng dùng, thuật toán/quy tắc, cấu hình, dữ liệu hiển thị, edge case...

Mỗi sub-feature → ánh xạ thành câu hỏi soi cho từng đối thủ.

---

## 4. Chiến lược search

- __Rộng → hẹp:__ query ngắn & rộng trước, xem kết quả, rồi thu hẹp vào nghiệp vụ cụ thể.
- __Song song:__ mỗi (đối thủ × sub-feature) là một nhánh độc lập → gọi nhiều WebSearch/WebFetch
  cùng lúc khi không phụ thuộc nhau.
- __Ưu tiên first-party:__ trang sản phẩm, /pricing, /blog, help center, App Store listing,
  changelog — *hơn* listicle "top 10".
- __Fetch để xác minh:__ claim quan trọng → WebFetch trang gốc đọc trực tiếp, đừng tin mỗi snippet.

---

## 5. Scale effort — biết khi nào dừng

| Độ phức tạp | Số đối thủ | Nhánh search / đối thủ | Điều kiện dừng |
|---|---|---|---|
| __Nhỏ__ (1 sub-feature rõ ràng) | 2-3 | 1-2 | Khi 3 đối thủ đã rõ → dừng |
| __Chuẩn__ (1 tính năng, nhiều khía cạnh) | 3-4 | 2-3 | Khi các cột chính đã đầy |
| __Phức tạp__ (cả mảng nghiệp vụ) | 4-6 | 3-5 | Khi search mới hết ra info mới |

__Điều kiện dừng chung:__ khi thêm nguồn không còn thay đổi bảng so sánh hay khuyến nghị → STOP.

---

## 6. Đánh giá nguồn

| Độ tin | Loại nguồn |
|---|---|
| __Cao [F]__ | Trang chính thức đối thủ, App Store listing, blog kỹ thuật, changelog của họ |
| __Trung bình [F/I]__ | Báo/tạp chí ngành uy tín, review chuyên sâu có dẫn chứng, forum nhiều người xác nhận |
| __Thấp — cẩn trọng__ | Listicle SEO, content farm, bài > 18 tháng tuổi |

- Gắn __ngày__ cho mọi dữ liệu pricing/feature (thay đổi nhanh).
- Nêu rõ khi nguồn mâu thuẫn nhau.
- Khi không chắc: ghi `Không rõ` / `ước lượng` — KHÔNG bịa.

---

## 7. RICE-lite — xếp ưu tiên (sorting aid, KHÔNG phải verdict)

Dùng ở Mục 5 report để xếp hạng thô tính năng này so với các tính năng khác. **KHÔNG dùng điểm số để
tự quyết build/skip.**

__Công thức:__ `Score = (Reach × Impact × Confidence) / Effort`

| Yếu tố | Thang | Ghi chú |
|---|---|---|
| __Reach__ | # người dùng/kỳ chạm tính năng | ước lượng, gắn nguồn nếu có |
| __Impact__ | Massive 3 · High 2 · Medium 1 · Low 0.5 · Minimal 0.25 | mức tác động tới job người dùng |
| __Confidence__ | 100% · 80% · 50% · <50% (moonshot) | __<50% → điểm ít tin cậy, flag rõ__ |
| __Effort__ | tương đối S/M/L (KHÔNG story point) | BA không estimate dev effort chi tiết |

__Cảnh báo dùng sai (bắt buộc tôn trọng):__
- __False precision__ — 87 vs 85 là noise. Xếp theo __bucket__ (cao/vừa/thấp), KHÔNG so decimal.
- __Không phải decision-maker__ — dependency, table-stakes (tính năng bắt buộc để bán được), strategic bet
  chưa reach/impact cao... đều có thể __override__ điểm số. Intercom (tác giả RICE) tự nói vậy.
- __Confidence thấp = điểm dễ đánh lừa__ — đúng lúc <50% thì score least trustworthy; đừng treat as final.
- Verdict = quyết định người-lập-luận, dùng RICE-lite làm __1 input__ cạnh opportunity + strategic fit.‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍


<!-- wm:2b9af6c9b691879b1ddb7a04d29a1c88 -->
<sub>Tài liệu thuộc bộ AI4BA BA-Kit — bản quyền ai4ba.com</sub>
