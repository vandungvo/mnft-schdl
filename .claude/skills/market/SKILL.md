---
name: market
description: Dùng khi chưa biết nên làm sản phẩm gì — quét cơ hội thị trường của 1 lĩnh vực/nhóm khách hàng, thu thập tín hiệu nhu cầu có nguồn, rồi khuyến nghị hướng sản phẩm nên build kèm lát cắt v1. Xét 1 tính năng trong sản phẩm đã có thì dùng `/discover`.
allowed-tools: Read, Write, Edit, Bash, Glob, Grep, WebSearch, WebFetch, Task, Skill, AskUserQuestion
user-invocable: true
disable-model-invocation: true
argument-hint: "<lĩnh vực | nhóm khách hàng | ý tưởng thô> | (empty interactive) [--profile]"
---

# /market — Quét cơ hội thị trường & khuyến nghị nên build sản phẩm gì

## Goal

Cho 1 __lát cắt thị trường__ (lĩnh vực, nhóm khách hàng, hoặc 1 ý tưởng thô còn mơ hồ), output 1 file
research giúp người ra quyết định trả lời: __"có cơ hội thật không, cơ hội nào đáng làm nhất, và bản
đầu tiên nên là cái gì"__.

Khác `/discover` ở __tầng quyết định__: `/discover` hỏi *"tính năng này có đáng đưa vào sản phẩm đã có
không"*; `/market` hỏi *"có đáng làm sản phẩm này không, và là sản phẩm nào"* — khi chưa có sản phẩm,
hoặc khi cân nhắc mở một dòng sản phẩm mới.

Report viết theo thứ tự __dữ liệu trước, kết luận sau__. 7 mục (doc thuần Việt, xem Pha D văn phong).
Từ "Khách hàng" trong heading thay bằng thuật ngữ trong `docs/_shared/project-profile.md` nếu có
(Doanh nghiệp/Chủ shop/Bệnh nhân/Tài xế...):

1. __Đang nhìn thị trường nào__ — lát cắt, giới hạn nguồn lực, cái đã biết trước khi quét.
2. __Thu được những tín hiệu gì__ — bảng dữ liệu thô: nguồn, tín hiệu, ngày, độ tin cậy.
3. __Vấn đề nào đáng giải__ — 3-6 cơ hội: ai đau, đau gì, đang xoay xở thế nào, bằng chứng.
4. __Ai đang phục vụ, chỗ nào còn trống__ — người chơi chính + cách kiếm tiền + khoảng trống + rào cản.
5. __So các cơ hội__ — bảng chấm 6 tiêu chí (xếp thô để so) + rủi ro chí mạng mỗi cơ hội.
6. __Nên build gì__ — 1 hướng chính + 1 phương án dự phòng, kèm lát cắt nhỏ nhất bán được.
7. __Kiểm chứng trước khi cam kết__ — giả định chí mạng + cách kiểm rẻ + bước tiếp theo.

> __Khuyến nghị Mục 6 phải qua phản biện đa góc nhìn__ (Pha C2): trước khi chốt hướng sản phẩm, skill
> chia việc cho các CLI ngoài (qua `/delegate` Chế độ C) đóng 3 vai đối lập — __ủng-hộ__ (cơ hội, thời
> điểm), __phản-đối__ (vì sao thị trường này là bẫy), __khả-thi__ (nguồn lực, rào cản, đường tiếp cận
> khách) — tranh luận 1 vòng, rồi Claude làm arbiter chốt. Mục 6 ghi thêm 1 đoạn "Các góc nhìn đã cân
> nhắc". Quyết định đi hay không đi một thị trường là quyết định đắt nhất trong cả pipeline — đừng để
> một mình luồng research ban đầu định hướng.

> __Không phải bài "phân tích thị trường" cho đẹp.__ Mục tiêu là ra được __một hướng đi cụ thể đủ để
> chạy `/prd`__, không phải bản báo cáo ngành. Không có cơ hội nào đủ mạnh → kết luận thẳng "chưa nên
> làm gì ở lát cắt này" + gợi lát cắt hẹp hơn. Kết luận "không làm" là kết luận hợp lệ.

## Định vị trong pipeline (đừng giẫm chân skill khác)

```
/market <lĩnh vực|nhóm khách hàng|ý tưởng thô>   ← ĐỨNG ĐÂY: chưa có sản phẩm, hoặc mở dòng mới
     │  → tín hiệu nhu cầu + cơ hội + người chơi + chấm điểm → 1 hướng sản phẩm + lát cắt v1
     ├─ nên làm      → /prd (dựng PRD sản phẩm; hướng + lát cắt v1 làm seed)
     ├─ hẹp lại      → /market lại với lát cắt hẹp hơn (nhóm khách hàng cụ thể hơn)
     └─ chưa nên làm → dừng, ghi lý do + tín hiệu nào cần đợi
                 ↓
              /prd  (sản phẩm gồm những tính năng gì)
                 ↓
           /discover <chủ đề>  (1 tính năng có đáng làm không)
                 ↓
           /brainstorm <feature>
```

- __KHÔNG__ bóc Feature Map / viết tầm nhìn sản phẩm — đó là `/prd`.
- __KHÔNG__ benchmark 1 tính năng cụ thể — đó là `/discover`.
- __KHÔNG__ làm cost-benefit / ROI tài chính chi tiết — đó là `/brd` (và business case của sponsor).
- __CÓ__ = với 1 lát cắt thị trường, trả "vấn đề nào có thật, ai đang trả tiền cho nó, mình nên đánh vào
  đâu trước, và cần kiểm chứng gì trước khi đổ công sức".

## Constraints

### Hard rules — never violate

- __Bằng chứng có nguồn hoặc không có bằng chứng__ — mọi con số thị trường / claim về đối thủ / claim về
  hành vi khách hàng phải kèm __nguồn + ngày__. Không có nguồn → ghi thẳng "suy đoán, cần kiểm lại"
  hoặc bỏ. TUYỆT ĐỐI KHÔNG chế số quy mô thị trường, số người dùng, mức chi trả, tốc độ tăng trưởng.
  Nguồn mâu thuẫn → nêu cả hai, KHÔNG tự chọn 1 số.
- __TAM/SAM/SOM không phải bằng chứng nhu cầu__ — con số "thị trường X tỷ đô" chỉ được dùng làm bối cảnh
  ở Mục 4, KHÔNG được dùng làm lý do chính để khuyến nghị build. Lý do chính phải là tín hiệu ở Mục 2-3
  (có người đang trả tiền / tự dựng cách xoay xở thủ công / than lặp lại ở nhiều nguồn độc lập).
- __Phân biệt tín hiệu mạnh và tín hiệu yếu__ — theo `references/signal-sources.md` Mục 3. Mục 2 phải
  đánh dấu rõ tín hiệu nào thuộc loại nào. Khuyến nghị dựng chủ yếu trên tín hiệu yếu → hạ độ tin cậy
  và nói thẳng trong Mục 6.
- __Chấm điểm là xếp thô, KHÔNG phải verdict__ — 6 tiêu chí ở `references/scoring.md` chấm theo bucket
  Cao/Vừa/Thấp. KHÔNG cộng thành 1 điểm số tổng, KHÔNG so decimal. Khuyến nghị là quyết định
  người-lập-luận, có xét lợi thế riêng + thời điểm + rủi ro chí mạng.
- __Phản biện đa góc nhìn trước khuyến nghị (mặc định, tắt bằng lời)__ — Pha C2 chạy `/delegate` Chế độ C
  (3 vai + tối đa 1 vòng rebuttal), Claude giữ vai arbiter. __Skip khi:__ user nói "khỏi debate" /
  "đừng hỏi agent khác", HOẶC user đã "đừng search web" (thiếu evidence, debate vô nghĩa), HOẶC mục tiêu
  chỉ là "(c) khảo sát cho biết". Skip → flag rõ "chưa qua phản biện đa góc nhìn". KHÔNG đẩy việc chốt
  ra CLI ngoài.
- __CHECKPOINT 1 bắt buộc__ — dừng sau Pha B, show kế hoạch (lát cắt + mục tiêu + giả thuyết cơ hội nháp
  + nguồn sẽ quét + số lượt delegate), user duyệt trước khi spawn agent. KHÔNG tự chạy agent khi chưa Y.
- __CHECKPOINT 2 bắt buộc__ — dừng sau Pha C2, preview tóm tắt + bảng chấm rút gọn + khuyến nghị + lát
  cắt v1 trong chat. User confirm mới ghi file. Điều chỉnh tối đa 2 vòng.
- __Lát cắt v1 phải "nhỏ nhất bán được"__ — mô tả được bằng 3-5 câu nghiệp vụ: bán cho ai, giải đúng job
  nào, người ta đổi lại cái gì (tiền/thời gian/rủi ro giảm). KHÔNG liệt kê danh sách tính năng (việc
  `/prd`), KHÔNG vẽ flow/màn hình (việc `/brainstorm` + `/user-flow`).
- __Thông tin cấp dự án đọc + ghi vào profile__ — domain, thuật ngữ gọi khách hàng, đối thủ, compliance,
  mô hình kinh doanh, thị trường mục tiêu: đọc `docs/_shared/project-profile.md` ở Pha 0; thiếu → hỏi ở
  Pha A2 rồi đề xuất ghi vào profile. Đây là skill CHẠY SỚM NHẤT trong pipeline nên thường là nơi profile
  được khai sinh — Pha G phải đề xuất ghi (domain + thị trường + đối thủ + thuật ngữ khách hàng).
  KHÔNG hardcode domain nào trong skill. Per @../../rules/project-profile.md.
- __Không có sản phẩm nào đủ tốt thì nói thẳng__ — "chưa nên làm gì ở lát cắt này" là kết luận hợp lệ và
  bắt buộc phải dùng khi tín hiệu yếu. KHÔNG nặn ra 1 khuyến nghị cho đủ mục.
- __Per-project output__ — `docs/_research/{YYYY-MM-DD}-market-{slug}.md`. Slug kebab-case ASCII max 40.
  Trùng cùng date+slug → suffix `-v2`.
- __Vietnamese-first__ default, auto-detect từ input. Muốn tiếng Anh thì nói "viết bằng tiếng Anh".
- __Frontmatter tối giản__ (`type`/`status`/`scope`/`updated`/`links` — KHÔNG `created`/`owner`/`changelog`).
  Lịch sử qua `docs/_shared/changelog.md` (hook ghi). Per naming-conventions + changelog rule.
- __No-re-ask rule__ — user đã trả lời trong session / trong profile / trong file đã tồn tại → không hỏi
  lại. Per ba-conventions Mục 2.
- __Bỏ qua web research__ — user nói "đừng search web" → skip Pha C, output chỉ giả thuyết cơ hội +
  khuyến nghị dựa hiểu biết user cung cấp, flag rõ "chưa có dữ liệu thị trường bên ngoài", và Mục 7
  (kiểm chứng) trở thành phần quan trọng nhất của report.
- __IT-BA / PO framing__ — business language. KHÔNG kiến trúc, schema, endpoint, SDK, lựa chọn công nghệ.
  Per ba-conventions Mục 3.
- __Doc sạch__ — doc chỉ chứa nội dung nghiệp vụ thật; hướng dẫn/định nghĩa sống ở SKILL.md +
  `references/`. Doc chỉ giữ chú giải người ĐỌC cần. Per ba-conventions Mục 0.

### Pitfalls — easy to get wrong

- ❌ Lấy quy mô thị trường (TAM) làm lý do chính để build — thị trường to không có nghĩa có chỗ cho mình
- ❌ Trộn "có nhiều người quan tâm" với "có người chịu trả tiền" — hai chuyện khác nhau, tách rõ ở Mục 2
- ❌ Nhặt số liệu từ press release / listicle SEO rồi trình bày như dữ liệu — xem `signal-sources.md` Mục 4
- ❌ Kết luận "thị trường đông đối thủ nên bỏ" — đông đối thủ thường là bằng chứng có tiền; cái đáng sợ là
  thị trường vắng mà cũng không ai trả tiền
- ❌ Kết luận "chưa ai làm nên làm đi" mà không hỏi __vì sao chưa ai làm__ (rào cản pháp lý? khách không
  chịu trả? chi phí tiếp cận quá đắt?)
- ❌ Cộng 6 tiêu chí thành 1 điểm rồi để điểm tự quyết — bucket để xếp thô, không phải máy ra quyết định
- ❌ Đề xuất lát cắt v1 to bằng cả sản phẩm — v1 phải nhỏ nhất mà vẫn bán được
- ❌ Liệt kê danh sách tính năng ở Mục 6 → giẫm chân `/prd`
- ❌ Nặn khuyến nghị khi mọi tín hiệu đều yếu, thay vì kết luận "chưa nên làm"
- ❌ Bỏ CHECKPOINT 1/2 — spawn agent hoặc write file không cho user duyệt
- ❌ Giả vờ đã debate khi CLI lỗi/hết quota — phải flag "phản biện chưa hoàn tất"
- ❌ Quét xong không đề xuất ghi domain/đối thủ/thuật ngữ vào profile → skill sau (`/prd`, `/discover`)
  phải hỏi lại từ đầu
- ❌ Dán nhãn `[F]/[I]/[R]` hoặc raw output CLI vào doc — doc viết thuần Việt, độ tin cậy nói bằng lời

## Inputs

```
/market                                   # interactive: hỏi lát cắt + mục tiêu
/market <lĩnh vực | nhóm khách hàng>      # lát cắt inline
/market <ý tưởng thô>                     # có ý tưởng sẵn, muốn kiểm xem thị trường có thật không
/market --profile                         # chỉ đọc/cập nhật phần thị trường trong project-profile
```

Ví dụ:
```
/market phần mềm quản lý cho phòng khám nhỏ ở Việt Nam
/market chủ shop bán hàng online dưới 10 nhân sự
/market tôi muốn làm app chấm công bằng khuôn mặt, xem thị trường có thật không
/market ngành logistics nội địa, đừng search web nhé
```

Muốn đổi hành vi mặc định, nói bằng lời: "đừng search web" · "khỏi debate" · "viết bằng tiếng Anh" ·
"chỉ khảo sát thôi, chưa cần khuyến nghị".

## Context (dynamic)

Today: !`date +%Y-%m-%d`
Project profile: !`test -f docs/_shared/project-profile.md && echo "có docs/_shared/project-profile.md (đọc Domain + Thị trường + Đối thủ + Thuật ngữ)" || echo "chưa có profile — đây là lần khai sinh, Pha G phải đề xuất ghi"`
PRD sản phẩm: !`test -f docs/_product/prd.md && echo "ĐÃ CÓ docs/_product/prd.md — hỏi user: quét thị trường cho dòng sản phẩm MỚI hay xét lại hướng hiện tại?" || echo "chưa có PRD — greenfield, đúng vị trí của /market"`
Research đã có: !`ls docs/_research/*.md 2>/dev/null | tail -5 | tr '\n' ' '`
Thị trường/đối thủ đã ghi: !`grep -iE "^## (Đối thủ|Thị trường|Domain|Mô hình kinh doanh)" -A 6 docs/_shared/project-profile.md 2>/dev/null | head -30`

***

## Approach

### Pha 0 — Tiếp nhận & nắm bối cảnh

1. Khởi __TodoWrite__: track các pha.
2. __Resolve input:__ no arg → hỏi "Anh muốn em quét cơ hội ở lĩnh vực / nhóm khách hàng nào?". Đợi.
   Arg → lát cắt text.
3. __Load context:__ đọc `docs/_shared/project-profile.md` (Domain, Thị trường & ngôn ngữ, Đối thủ,
   Compliance, Mô hình kinh doanh, Người dùng & thuật ngữ). Có `docs/_product/prd.md` → đọc để biết sản
   phẩm hiện tại là gì, và __hỏi user__ đây là dòng sản phẩm mới hay xét lại hướng cũ. Đọc 1-2 file
   `docs/_research/*.md` gần nhất nếu tên gợi ý cùng lát cắt (tránh quét lại cái vừa quét).
4. __Derive slug__ — kebab-case ASCII max 40, transliterate tiếng Việt. __Detect language.__

***

### Pha A1 — Đọc lát cắt (nội bộ, không hỏi user)

- __Lát cắt là loại gì:__ (a) lĩnh vực/ngành · (b) nhóm khách hàng · (c) ý tưởng sản phẩm thô ·
  (d) công nghệ đang tìm chỗ dùng. Loại (c) và (d) __nguy hiểm nhất__ (đã có giải pháp trong đầu trước
  khi có vấn đề) → Pha B phải cố ý đi ngược lại: tìm vấn đề trước, chỉ đối chiếu với ý tưởng ở Mục 5.
- 3-5 __từ khóa quét__ + biến thể: tên ngành, tên nghề của khách hàng, tên công việc họ đang làm thủ
  công, tên phần mềm họ có thể đang dùng.
- __Giả thuyết cơ hội nháp:__ 2-4 câu "nhóm {ai} đang mất {gì} vì {việc gì}". Đây là nháp để hỏi lại ở
  Pha A2, KHÔNG chốt một mình.

***

### Pha A2 — Làm rõ input (chỉ hỏi khi mơ hồ, no-re-ask)

Scan input + profile: __ý định + ràng buộc đã rõ → bỏ qua pha này.__ Nếu mơ hồ, dùng
__AskUserQuestion__ (tối đa 3 câu, hỏi tuần tự) — chỉ hỏi phần chưa rõ:

1. __Mục tiêu quét__ (quyết KHUNG report):
   - (a) __Quyết có làm hay không__ — đủ 7 mục, có khuyến nghị + lát cắt v1. *Default.*
   - (b) __Chọn giữa vài hướng đã nghĩ sẵn__ — nghiêng Mục 5 (so cơ hội), user cung cấp danh sách.
   - (c) __Khảo sát cho biết__ — nghiêng Mục 2-4, không ép khuyến nghị, bỏ debate.
2. __Ràng buộc nguồn lực__ — bao nhiêu người, bao lâu, có tiền chạy quảng cáo không, có sẵn khách hàng /
   mối quan hệ trong ngành không. (Đây là input của tiêu chí "Lợi thế của mình" và "Công sức & rào cản" —
   thiếu nó thì chấm điểm vô nghĩa.)
3. __Đã biết gì / đã thử gì__ — có khách hàng nào đang phàn nàn sẵn không, đã từng làm ngành này chưa.
   Thiếu thuật ngữ gọi khách hàng / domain (Pha 0 báo thiếu) → hỏi gộp vào đây.

Vague ("chưa rõ") → giữ default (a) + ghi ràng buộc là "chưa khai báo — chấm điểm phần Lợi thế/Công sức
sẽ để mức thấp tin cậy". KHÔNG bế tắc.

***

### Pha B — Dựng giả thuyết cơ hội + chọn nguồn quét

Load `references/signal-sources.md` (bản đồ nguồn dữ liệu) + `references/scoring.md` (6 tiêu chí).

__B1 — Giả thuyết cơ hội:__ từ A1 + A2, viết 3-6 giả thuyết dạng
`{nhóm khách hàng} đang {mất tiền/mất thời gian/chịu rủi ro} vì {việc gì}, hiện đang xoay xở bằng {cách gì}`.
Mỗi giả thuyết ghi rõ __sẽ kiểm bằng nguồn nào__ (chọn từ `signal-sources.md` Mục 1-2).

__B2 — Chọn nguồn quét:__ mỗi giả thuyết ghép tối thiểu 2 loại nguồn __độc lập nhau__ (vd: review sản
phẩm + tin tuyển dụng; cộng đồng ngành + bảng giá đối thủ). Một loại nguồn duy nhất → độ tin cậy trần
là "suy đoán", ghi rõ ngay từ kế hoạch.

__B3 — Nội bộ đã có gì:__ có `docs/` rồi thì grep nhanh xem lát cắt này từng được nhắc chưa:
```bash
grep -rliE "{từ khóa 1|từ khóa 2}" docs/_research/ docs/_product/ docs/_shared/ 2>/dev/null
```
Có match → Read lấy 2-3 dòng context thật trước khi kết luận trùng lặp.

***

### ⛔ CHECKPOINT 1 — Kế hoạch quét (dừng chờ user)

In kế hoạch BA-friendly (per ba-conventions Mục 5):

> Em sẽ quét: __"{lát cắt}"__ · Mục tiêu: {quyết có làm / chọn giữa mấy hướng / khảo sát}
>
> __Giả thuyết cơ hội ({N}):__
> 1. {nhóm khách} đang {mất gì} vì {việc gì} — kiểm bằng: {nguồn A} + {nguồn B}
> 2. ...
>
> __Ràng buộc của mình:__ {người/thời gian/tiền/mối quan hệ sẵn có — hoặc "chưa khai báo"}
>
> __Đã có sẵn trong dự án:__ {N} chỗ nhắc tới lát cắt này / chưa có gì
>
> __Mức công sức:__ {nhỏ / chuẩn / rộng} — {N} giả thuyết × {M} nhánh quét
>
> __Phản biện khuyến nghị:__ debate 3 góc nhìn (ủng hộ / phản đối / khả thi) qua CLI ngoài →
> ~{4-6} lượt delegate. *(bỏ dòng này nếu mục tiêu chỉ khảo sát, hoặc user đã tắt debate / tắt web)*
>
> Apply? (Y / sửa)

Đợi user Y. "sửa: ..." → điều chỉnh, in lại. Chỉ sang Pha C sau khi Y.

***

### Pha C — Thu thập dữ liệu (spawn agent)

> __Skip nếu user nói "đừng search web"__ — nhảy CHECKPOINT 2 với data Pha A+B, flag rõ "chưa có dữ liệu
> bên ngoài", và Mục 7 (kiểm chứng) thành phần trọng tâm.

Spawn `@market-researcher` với prompt gồm:
- Lát cắt + từ khóa quét + danh sách giả thuyết cơ hội (B1) + nguồn đã ghép cho từng giả thuyết (B2)
- Ràng buộc nguồn lực của mình (A2) + domain/thuật ngữ/compliance từ profile
- Yêu cầu: mỗi tín hiệu gắn `[F]/[I]` + độ tin (High/Med/Low) + __nguồn + ngày__ cho mọi `[F]`, và
  __phân loại tín hiệu mạnh/yếu__ theo `signal-sources.md` Mục 3. Không chắc → ghi "chưa xác minh được".

Chạy __song song 2 agent__ khi lát cắt có 2 chiều rõ rệt (vd: chiều "nhu cầu khách hàng" và chiều "người
chơi hiện tại + cách kiếm tiền") — mỗi agent 1 chiều, tránh 1 agent ôm hết rồi loãng.

__Điều kiện dừng:__ khi thêm nguồn không còn đổi bảng cơ hội hay khuyến nghị → STOP (per
`signal-sources.md` Mục 5).

***

### Pha C2 — Phản biện khuyến nghị (mặc định, tắt bằng lời)

> __Skip khi:__ user nói "khỏi debate"/"đừng hỏi agent khác" · mục tiêu "(c) khảo sát cho biết" · user đã
> "đừng search web" → nhảy CHECKPOINT 2 với khuyến nghị do 1 mình skill lập luận + flag "chưa qua phản
> biện đa góc nhìn".

__C2.1 — Dựng khuyến nghị nháp (nội bộ):__ từ Pha A+B+C, skill soạn 1 khuyến nghị nháp (hướng sản phẩm +
lát cắt v1 + 3-5 câu lập luận + bảng chấm thô). Đây là "đề bài" cho 3 vai mổ xẻ, KHÔNG phải kết luận cuối.

__C2.2 — Chia 3 vai, chạy qua `/delegate` (Chế độ C):__ mỗi vai nhận __cùng 1 gói context__ (lát cắt +
tín hiệu Mục 2 + cơ hội Mục 3 + người chơi Mục 4 + khuyến nghị nháp) nhưng prompt đóng vai khác nhau:

| Vai | Nhiệm vụ (lập luận có nhãn, KHÔNG bịa số) |
|---|---|
| __Ủng hộ__ | Lý do MẠNH NHẤT nên đánh vào thị trường này lúc này: cơ hội, thời điểm, chi phí bỏ lỡ. |
| __Phản đối (skeptic)__ | Lý do MẠNH NHẤT đây là bẫy: tín hiệu yếu, khách không trả tiền, người chơi lớn nuốt, chi phí tiếp cận khách quá đắt, "vì sao chưa ai làm" chưa được trả lời. |
| __Khả thi & nguồn lực__ | Với đúng ràng buộc user khai (A2): làm nổi không, mất bao lâu tới bản bán được, rào cản pháp lý/dữ liệu/đối tác. Ước lượng ghi `[Estimated]`. |

Mỗi vai kết bằng: __lập trường (nên làm / chưa nên / làm nhưng hẹp lại) + 2-4 luận điểm có nhãn + độ tin__.

__C2.3 — Rebuttal (tối đa 1 vòng):__ 3 vai hội tụ → bỏ rebuttal. Bất đồng thực chất → 1 vòng phản biện
chéo (per delegate Chế độ C bước 2).

__C2.4 — Claude arbiter chốt:__ Claude đọc 3 lập luận + rebuttal, chốt khuyến nghị cuối — cân bằng chứng
nhu cầu + lợi thế riêng + rào cản + thời điểm. Bảng chấm chỉ là xếp thô. Chốt lệch đa số vai → ghi rõ vì
sao (đánh dấu 🔶).

__C2.5 — Ghi lại cho Mục 6:__ khuyến nghị cuối + 1 đoạn __"Các góc nhìn đã cân nhắc"__ (đồng thuận ở đâu,
còn lệch chỗ nào, vì sao chốt vậy) — thuần Việt, ngắn, KHÔNG dán raw output CLI, KHÔNG nhãn `[F]/[I]`.

> __Delegate hết quota / CLI lỗi:__ báo user đã thử gì, fallback về khuyến nghị do skill tự lập luận +
> flag "phản biện đa góc nhìn chưa hoàn tất". KHÔNG giả vờ đã debate.

***

### ⛔ CHECKPOINT 2 — Xem trước report (dừng chờ user)

```
📋 Xem trước: Quét thị trường "{lát cắt}"

Tín hiệu mạnh nhất: {1-2 tín hiệu + nguồn}
Tín hiệu yếu / chưa xác minh: {liệt kê ngắn}

Cơ hội tìm được ({N}):
  1. {ai đau — đau gì — đang xoay xở bằng gì}
  2. ...

Bảng chấm rút gọn: {cơ hội | độ đau | quy mô | sẵn sàng chi tiền | lợi thế mình | công sức}

Khuyến nghị: {nên làm "{hướng}" / chưa nên làm gì ở lát cắt này / hẹp lại còn "{lát cắt hẹp}"}
Lát cắt v1 (nhỏ nhất bán được): {2-3 câu}
Các góc nhìn đã cân nhắc: {đồng thuận X; còn lệch Y; chốt vì Z} — (bỏ nếu skip debate)

Giả định chí mạng cần kiểm trước khi cam kết: {1-3 cái}

---
Anh xem giúp — chỉnh/bổ sung gì trước khi ghi file? (Y / sửa: ...)
```

"sửa: ..." → điều chỉnh, preview lại (max 2 vòng). Chỉ sang Pha D sau khi Y.

***

### Pha D — Write file

Ghi `docs/_research/{date}-market-{slug}.md` theo `templates/market-scan-template.md`:
- Frontmatter tối giản: `type: market-scan` / `status` / `scope` / `updated` / `links`.
- __Trước Write set env__ `CLAUDE_SKILL_NAME=/market`,
  `CLAUDE_CHANGELOG_NOTE="quét cơ hội thị trường {lát cắt}"`, `CLAUDE_CHANGELOG_AUTHOR={@handle}` —
  hook ghi `changelog.md` (per changelog rule).
- 7 mục theo Goal. {Khách hàng} = thuật ngữ từ profile, default "Khách hàng".
- __Mục 6__ (nếu đã debate): thêm đoạn "Các góc nhìn đã cân nhắc". Skip debate → thêm 1 dòng "chưa qua
  phản biện đa góc nhìn".

__Văn phong (BẮT BUỘC — doc cho người ra quyết định đọc, không phải cho máy):__
- __Thuần Việt, KHÔNG thuật ngữ lai.__ Viết "vấn đề đáng giải" thay "pain point"; "cách khách đang xoay
  xở" thay "workaround/alternative"; "lát cắt nhỏ nhất bán được" thay "MVP"; "quy mô thị trường" thay
  "TAM/SAM"; "chỗ trống" thay "gap/white space"; "xếp thô để so" thay "scoring". Thuật ngữ ngành đã quen
  tai thì giữ, giải nghĩa 1 lần.
- __KHÔNG nhét meta-text vào doc__ (per ba-conventions Mục 0): KHÔNG legend `[F]/[I]/[R]`, KHÔNG giải
  thích 6 tiêu chí chấm là gì, KHÔNG câu "bảng này để xếp thô...". Hướng dẫn sống ở SKILL.md +
  `references/`.
- __Độ tin cậy nói bằng lời:__ "chắc chắn (có nguồn {tên}, {ngày})" / "suy đoán (nguồn gián tiếp, cần
  kiểm lại)" / "chưa xác minh được".
- __Ngắn để duyệt được__ — mỗi mục vài bullet/vài câu, bảng gọn.

***

### Pha E — Auto-verify (BẮT BUỘC — gồm lọc claim không nguồn)

Sau Write, skill tự Read lại file và check:

| Check | Pass criteria | Fail action |
|---|---|---|
| File exists | Read OK | Retry Write |
| Frontmatter tối giản | Đủ `type`/`status`/`scope`/`updated`/`links`; KHÔNG `changelog`/`owner`/`created` | L2 diff sửa |
| 7 mục đầy đủ | H2 đúng thứ tự: Tóm tắt · 1 Đang nhìn thị trường nào · 2 Thu được những tín hiệu gì · 3 Vấn đề nào đáng giải · 4 Ai đang phục vụ, chỗ nào còn trống · 5 So các cơ hội · 6 Nên build gì · 7 Kiểm chứng trước khi cam kết | L2 diff thêm |
| __Mọi số thị trường có nguồn__ | Mỗi con số quy mô/tăng trưởng/mức chi trả có nguồn + ngày, HOẶC ghi rõ "suy đoán, cần kiểm lại" | L2 diff sửa / strip |
| __Lọc claim trần__ | Claim về đối thủ / hành vi khách hàng không nguồn → strip hoặc chuyển thành câu hỏi cần kiểm ở Mục 7 | L2 diff sửa |
| Mục 2 phân loại tín hiệu | Có phân biệt tín hiệu mạnh / yếu, không gộp một cục | L2 diff sửa |
| Mục 5 không có điểm tổng | Chỉ bucket Cao/Vừa/Thấp, KHÔNG cột "tổng điểm" / số thập phân | L2 diff sửa |
| Mục 6 có lát cắt v1 | Có mô tả "nhỏ nhất bán được" 3-5 câu, KHÔNG phải danh sách tính năng | L2 diff sửa |
| Mục 6 có góc nhìn (nếu debate) | Có đoạn "Các góc nhìn đã cân nhắc" — trừ khi skip debate (thì có dòng flag) | L2 diff thêm |
| Mục 7 có giả định chí mạng | ≥1 giả định + cách kiểm cụ thể (hỏi ai / bao lâu / dấu hiệu pass-fail) | L2 diff thêm |
| Văn phong sạch | KHÔNG còn `[F]/[I]/[R]`, MVP/TAM/pain point/gap rải rác, meta-text | L2 diff dọn |
| Không placeholder | Grep `{{...}}`, `TODO`, `XXX`, `<!-- TBD -->` → 0 hits | L2 diff fill |
| Links existed | Mỗi path trong `links:` tồn tại | Warn list link gãy |

Report verify (checklist ✓/⚠). Tất cả pass → "✅ Tất cả check pass" + Pha F.

***

### Pha F — Final report

```
✅ Quét thị trường xong: docs/_research/{date}-market-{slug}.md

Tóm tắt:
  - Lát cắt: {lĩnh vực / nhóm khách hàng}
  - Tín hiệu mạnh nhất: {1-2 cái + nguồn}
  - Cơ hội tìm được: {N} — đáng làm nhất: {tên}
  - Người chơi chính: {top 2-3} — chỗ trống: {1 câu}
  - Khuyến nghị: {nên làm / chưa nên / hẹp lại} — {1 câu lý do gắn tín hiệu}
  - Lát cắt v1: {1 câu}
  - Phản biện: {đã debate 3 góc nhìn — đồng thuận/lệch ở đâu / chưa debate}

Cần kiểm chứng trước khi cam kết:
  - {giả định 1 — cách kiểm}

Bước tiếp theo:
  - /prd "{hướng sản phẩm}"      — nếu nên làm (lát cắt v1 ở trên làm seed)
  - /market "{lát cắt hẹp hơn}"  — nếu kết luận là hẹp lại
  - /update-overview profile     — xem lại thông tin thị trường vừa ghi
```

***

### Pha G — Đề xuất ghi vào project profile (BẮT BUỘC)

`/market` thường là skill chạy sớm nhất, nên đây là nơi `project-profile.md` được khai sinh. Sau Pha F,
đề xuất ghi (qua L1 nếu file chưa có, L2 diff nếu đã có) — chỉ ghi cái đã có câu trả lời thật, KHÔNG stub:

| Section profile | Ghi gì từ lần quét này |
|---|---|
| `## Domain` | Lĩnh vực + bài toán đang nhắm (nếu khuyến nghị là nên làm) |
| `## Người dùng & thuật ngữ` | Gọi khách hàng là gì trong doc (chủ shop / phòng khám / tài xế...) |
| `## Đối thủ / benchmark` | Bảng người chơi chính: tên \| mạnh về \| cách kiếm tiền \| nguồn/ngày |
| `## Thị trường & ngôn ngữ` | Thị trường mục tiêu + ngôn ngữ sản phẩm |
| `## Mô hình kinh doanh` | Cách kiếm tiền dự kiến (nếu Mục 6 đã chốt) |
| `## Compliance` | Quy định/giấy phép phát hiện ở Mục 4 (nếu có) |

User từ chối ghi → vẫn dùng cho session này, không ghi. Per @../../rules/project-profile.md.

***

## Output

`docs/_research/{YYYY-MM-DD}-market-{slug}.md` — báo cáo quét cơ hội thị trường (`type: market-scan`),
project-level.

Gồm tín hiệu thu thập được (có nguồn + ngày) + danh sách cơ hội + bối cảnh người chơi + bảng chấm 6 tiêu
chí (xếp thô) + __khuyến nghị nên build gì đứng CUỐI__ (sau dữ liệu) + lát cắt v1 + giả định cần kiểm.

KHÔNG bóc Feature Map (việc `/prd`), KHÔNG benchmark 1 tính năng (việc `/discover`), KHÔNG phân tích tài
chính ROI (việc `/brd`).

## References

- @.claude/rules/project-profile.md (domain/thị trường/đối thủ/thuật ngữ — hỏi khi thiếu, ghi lại, reuse)
- @.claude/rules/approval-gate.md
- @.claude/rules/ba-conventions.md
- @.claude/rules/naming-conventions.md
- @.claude/rules/changelog.md
- @.claude/agents/market-researcher.md
- @.claude/skills/delegate/SKILL.md (Pha C2 — debate 3 góc nhìn qua Chế độ C)
- @.claude/skills/market/references/signal-sources.md (bản đồ nguồn dữ liệu + tín hiệu mạnh/yếu + bẫy)
- @.claude/skills/market/references/scoring.md (6 tiêu chí xếp thô + rủi ro chí mạng)
- @.claude/skills/market/templates/market-scan-template.md
- @.claude/skills/discover/SKILL.md (tầng dưới — 1 tính năng trong sản phẩm đã có)
- @docs/_shared/project-profile.md
- @docs/_product/prd.md
