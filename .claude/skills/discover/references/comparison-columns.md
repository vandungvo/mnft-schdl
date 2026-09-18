# Bộ cột so sánh — Column dictionary‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

Nạp ở __CHECKPOINT 1__ để đề xuất cột cho user duyệt. Chọn __5-8 cột__ phù hợp với tính năng —
đừng dùng hết. Giữ tối thiểu: *Có tính năng?* + *Giải job người dùng thế nào* + *Cách triển khai* + *Gap/cơ hội* + *Confidence*.
(Từ "người dùng" thay bằng thuật ngữ trong `docs/_shared/project-profile.md` nếu có — học viên/khách hàng/...)

> __Lưu ý:__ đây là cột cho bảng __competitive__ (Mục 3 report). Phần __opportunity/JTBD__ (job người dùng mình,
> bằng chứng nhu cầu) KHÔNG ở bảng này — nó là Mục 0 report, đứng TRƯỚC. Bảng competitive luôn có cột
> __"Giải job người dùng thế nào"__ (đối thủ giúp user hoàn thành job ra sao — không chỉ liệt kê UI) để nối
> về trục opportunity, và cột __Confidence__ để Pha E strip/flag ô không nhãn.

***

## Cột lõi (gần như luôn dùng)‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

| Cột | Nội dung điền |
|---|---|
| __Có tính năng?__ | ✅ Có / ⚠️ Một phần / ❌ Không |
| __Giải job người dùng thế nào__ | Đối thủ giúp user hoàn thành __job__ (Mục 0) ra sao — nối về opportunity, không chỉ liệt kê UI |
| __Cách triển khai (nghiệp vụ)__ | Mô tả luồng dùng, thuật toán, quy tắc — phần quan trọng nhất |
| __Trigger / Entry point__ | Khi nào / ở đâu user gặp tính năng |
| __Monetization gate__ | Free / Premium / Mixed |
| __Điểm mạnh__ | Đối thủ làm tốt gì ở tính năng này |
| __Hạn chế__ | Điểm yếu / phàn nàn user / thiếu sót |
| __Gap / cơ hội__ | Khoảng trống sản phẩm mình có thể khai thác |

***

## Cột tùy chọn — đặc thù theo domain (tự soạn cho dự án)‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

Mỗi domain có 3-6 cột đặc thù riêng = __chiều cạnh tranh mà domain đó quyết thắng thua__. Soạn ở
CHECKPOINT 1 dựa trên Domain trong `project-profile.md` + đề xuất user duyệt; đã soạn 1 lần → ghi
vào profile để lần sau reuse. Nguyên tắc chọn cột đặc thù + 4 domain minh họa: `example-competitors.md` Mục 3.

2 cột dưới đây luôn dùng bất kể domain:‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

| Cột | Khi nào dùng |
|---|---|
| __Năm observed / Source__ | Luôn gắn để track độ cũ của data |
| __Confidence__ | High / Med / Low — mức độ tin cậy của thông tin ô đó |

***

## Cột tùy chọn — generic‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

| Cột | Khi nào dùng |
|---|---|
| __Mức tự động hóa__ | So sánh thủ công vs tự động (vd tạo quiz manually vs AI-generated) |
| __Platform / offline__ | Quan trọng về coverage (iOS / Android / web / offline mode) |
| __Dữ liệu & metric hiển thị__ | Tính năng cho user thấy progress / insight / stats gì |
| __Onboarding flow__ | Nghiên cứu luồng làm quen tính năng lần đầu |
| __UX nổi bật__ | Interaction design / micro-animation / phản hồi đặc biệt |

***

## Mẫu bảng so sánh (Markdown)‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

```markdown
| Khía cạnh | **My app** | {Competitor 1} | {Competitor 2} | {Competitor 3} | {Competitor 4} |
|---|---|---|---|---|---|
| **Có tính năng?** | ⚠️ Chưa | ✅ | ✅ | ⚠️ Một phần | ❌ |
| **Cách triển khai** | dự kiến... | ... [F] | ... [F] | ... [I] | — |
| **Trigger / Entry** | — | ... | ... | ... | — |
| **Monetization gate** | — | Free | Freemium | Premium | — |
| **Điểm mạnh** | — | ... | ... | ... | — |
| **Hạn chế** | — | ... | ... | ... | — |
| **Gap / cơ hội** | — | ... | ... | ... | — |
| **Năm observed** | — | YYYY-MM | YYYY-MM | YYYY-MM | — |
```

> Cột __My app__ điền dự kiến từ Phase B (URD / brainstorm đã có) hoặc "chưa có — greenfield".
> KHÔNG bịa. Dùng `—` cho ô không có data.

## Nhãn Fact / Inference / Recommendation

Gắn vào mỗi ô hoặc inline trong claim:

| Nhãn | Nghĩa |
|---|---|
| __[F]__ | Fact — có nguồn URL + ngày rõ ràng |
| __[I]__ | Inference — suy luận từ tín hiệu gián tiếp (screenshot, review, changelog) |
| __[R]__ | Recommendation — đề xuất của BA dựa trên phân tích |

Mọi ô trong bảng so sánh phải có ít nhất 1 nhãn nếu điền data (không để trống mà không nhãn).‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍


<!-- wm:2b9af6c9b691879b1ddb7a04d29a1c88 -->
<sub>Tài liệu thuộc bộ AI4BA BA-Kit — bản quyền ai4ba.com</sub>
