# Project Profile — hỏi khi thiếu, ghi lại, tái dùng‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

> Rule chung cho MỌI skill cần **thông tin cấp dự án** (domain sản phẩm, thuật ngữ gọi người dùng,
> đối thủ, compliance, thị trường...). Bộ `.claude/` này là template generic dùng cho nhiều dự án —
> KHÔNG skill nào được giả định domain cụ thể. Thông tin dự án sống ở **1 file duy nhất**:
> `docs/_shared/project-profile.md`, tích lũy dần theo cơ chế dưới đây.

## Nguyên tắc‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

> **Skill cần thông tin dự án → đọc profile trước → thiếu thì hỏi user → đề xuất ghi vào profile
> (qua L2) → skill sau đọc lại, KHÔNG hỏi nữa.**

Profile KHÔNG phải file khai sẵn bắt user điền trước — nó là **kho câu-trả-lời tích lũy lazy**:
rỗng lúc bắt đầu dự án, đầy dần qua các lần skill chạy. Đây là phần mở rộng của no-re-ask rule
(`ba-conventions.md` Mục 2) lên cấp dự án: câu đã trả lời 1 lần cho BẤT KỲ skill nào thì mọi skill
khác đều thừa hưởng.

## Cái gì thuộc profile (vs cái gì không)‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

| Thuộc profile (cấp dự án, ổn định, nhiều skill cần) | KHÔNG thuộc profile |
|---|---|
| Domain sản phẩm (app gì, giải bài toán gì, 1-2 câu) | Chi tiết 1 feature (→ doc feature) |
| Thuật ngữ gọi người dùng cuối (học viên/khách hàng/bệnh nhân/tài xế...) + actor chính | Nội dung requirement (→ SRS) |
| Đối thủ / sản phẩm benchmark cùng ngành | Kiến trúc hệ thống (→ `system-overview.md`) |
| Thị trường mục tiêu, ngôn ngữ sản phẩm | Feature map (→ `_product/prd.md`) |
| Compliance áp dụng (PDPA/GDPR/COPPA/PCI...) | Câu trả lời chỉ dùng 1 lần trong 1 session |
| Mô hình kinh doanh tổng (freemium/subscription/B2B...) | Secret/credential (TUYỆT ĐỐI không) |

Ranh giới với 5 file `_shared` khác (do `/update-overview` quản): profile = **bối cảnh dự án**
(who/what/market); `system-overview.md` = kiến trúc + subsystem; `definitions.md` = thuật ngữ
nghiệp vụ chi tiết per-concept. Trùng lấn nhỏ chấp nhận được — khi 1 thông tin đã có ở file khác
thì profile chỉ trỏ wikilink sang, không chép đôi.

## Cơ chế 4 bước (skill nào cũng theo)‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

1) **Read trước:** đầu skill, nếu cần bất kỳ thông tin cấp dự án nào → Read
   `docs/_shared/project-profile.md` (kèm `system-overview.md`/`_product/prd.md` nếu liên quan).
   File chưa tồn tại = profile rỗng, không phải lỗi.
2) **Thiếu thì hỏi:** thông tin cần mà profile chưa có → hỏi user NGAY TRONG luồng skill
   (AskUserQuestion hoặc câu hỏi thường, theo IT-BA framing `ba-conventions.md` Mục 3).
   CHỈ hỏi cái skill đang cần — không phỏng vấn cả profile 1 lượt.
3) **Đề xuất ghi:** sau khi user trả lời, đề xuất append/update section tương ứng trong profile.
   File đã có → L2 diff; chưa có → gộp vào L1 plan của skill (1 dòng
   `docs/_shared/project-profile.md | create/update | lưu {thông tin} vào profile`). User từ chối
   ghi → vẫn dùng câu trả lời cho session này, không ghi.
4) **Reuse:** lần sau (bất kỳ skill nào) đọc thấy đã có → dùng luôn, KHÔNG hỏi lại. Nghi ngờ
   thông tin đã cũ → hỏi xác nhận ("Profile ghi X từ {updated} — còn đúng không?") thay vì hỏi mới
   từ đầu.

## Format file‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

`docs/_shared/project-profile.md` — frontmatter tối giản (`type: project-profile` / `status` /
`updated` / `links`), thân là các section H2 độc lập. Template khung: `_templates/project-profile.md`.‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍
Section chuẩn (chỉ tạo section khi CÓ nội dung thật — không stub TBD):

```markdown
## Domain          ← app gì, giải bài toán gì (1-3 câu)
## Người dùng & thuật ngữ   ← bảng: nhóm user | gọi là gì trong doc | ghi chú
## Đối thủ / benchmark      ← bảng: tên | mạnh về | monetization | nguồn/ngày
## Thị trường & ngôn ngữ
## Compliance
## Mô hình kinh doanh
## Ghi chú khác             ← Q&A lẻ chưa xếp được vào section trên (dạng bảng: câu hỏi | trả lời | ngày | skill hỏi)
```

Mỗi mục ghi kèm **ngày** (ISO) để bước 4 đánh giá độ tươi. Skill được thêm section mới khi gặp loại
thông tin chưa có chỗ chứa — giữ H2 + bảng, đừng phát minh format khác.

## Thuật ngữ trong output skill

Skill sinh doc/report có heading hoặc câu nhắc tới người dùng cuối → **đọc "Người dùng & thuật ngữ"
trong profile để chọn từ** (vd profile ghi "học viên" thì heading là "Học viên cần gì"). Profile chưa
có → dùng từ trung tính **"người dùng"** làm default, ĐỪNG chặn luồng chỉ vì thiếu thuật ngữ — và áp
bước 2-3 (hỏi + đề xuất ghi) khi thuật ngữ thật sự quan trọng cho doc đó.

## Skill đã nối (khai báo tường minh — đừng để "mọi skill" đứng một mình)

Rule áp cho mọi skill cần thông tin cấp dự án, nhưng **skill nào ĐÃ nối thì phải khai trong
Constraints + References của chính nó** (kiểm được bằng `grep -l project-profile
.claude/skills/*/SKILL.md`). Hiện đã nối:

| Skill | Thông tin cấp dự án nó chạm |
|---|---|
| `/market` + `@market-researcher` | domain, thị trường & ngôn ngữ, đối thủ/benchmark, thuật ngữ gọi khách hàng, mô hình kinh doanh, compliance — **thường là skill KHAI SINH profile** (chạy sớm nhất pipeline), nên có Pha G bắt buộc đề xuất ghi |
| `/discover` + `@feature-researcher` | domain, đối thủ/benchmark, thuật ngữ gọi người dùng |
| `/prd` | target users (JTBD), compliance, domain |
| `/urd` | thuật ngữ gọi người dùng, nhóm người dùng chung |
| `/brd` | domain, thị trường, mô hình kinh doanh, compliance |
| `/brainstorm` | domain, thuật ngữ người dùng, compliance (rủi ro) |
| `/srs` | compliance, thị trường/ngôn ngữ, thuật ngữ (NFR + wording lỗi) |
| `/userguide` | thuật ngữ người dùng, audience đề xuất, domain |
| `/roadmap` | thuật ngữ người dùng (Reach), domain |
| `/update-overview` | quản lý trực tiếp file profile (target `profile`) |

Skill khác cần thông tin cấp dự án → nối thêm theo đúng mẫu trên (1 dòng Constraint + 1 dòng
References), rồi bổ sung vào bảng này. **Không nối mà chỉ dựa vào rule này là không đủ** — skill
không đọc rule nó chưa reference.

## Quản lý tập trung

`/update-overview` nhận `profile` làm 1 target (cạnh definitions/env/conventions/system/patterns) —
dùng khi user muốn xem/sửa/bổ sung profile chủ động thay vì đợi skill hỏi. Cơ chế lazy ở trên vẫn là
đường chính.

## Anti-patterns

* ❌ Hardcode domain/đối thủ/thuật ngữ của 1 dự án cụ thể vào SKILL.md, template, agent — mọi thứ
  domain-specific chỉ được nằm trong `docs/` của dự án hoặc file `references/example-*.md` (ví dụ
  tham khảo, tách khỏi logic).
* ❌ Hỏi lại thông tin profile đã có (vi phạm no-re-ask).
* ❌ Phỏng vấn cả profile 1 lượt khi skill chỉ cần 1 mục.
* ❌ Ghi vào profile không qua approval gate.
* ❌ Stub section TBD/placeholder trong profile — chỉ ghi cái đã có câu trả lời thật.

## Tóm tắt 1 dòng

> **Đọc profile trước → thiếu thì hỏi đúng cái đang cần → đề xuất ghi (L1/L2) → mọi skill sau reuse;
> domain-specific không bao giờ nằm trong `.claude/`, chỉ nằm trong `docs/` của từng dự án.**‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍


<!-- wm:2b9af6c9b691879b1ddb7a04d29a1c88 -->
<sub>Tài liệu thuộc bộ AI4BA BA-Kit — bản quyền ai4ba.com</sub>
