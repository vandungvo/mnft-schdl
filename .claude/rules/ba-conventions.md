# BA Conventions‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

> Common rules cho mọi BA skills (`/brainstorm`, `/urd`, `/brd`, `/prd-epic`, `/srs`, `/usecase`, `/userstory`, `/ac`). Mỗi skill MUST reference file này trong Constraints + References.

## 0. Doc sạch — không meta-text trong template/doc‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

- Template chỉ chứa __cấu trúc__ (heading, khung bảng, placeholder). Doc sinh ra chỉ chứa __nội dung nghiệp vụ thật__.
- KHÔNG chèn vào template/doc: blockquote giải thích section là gì, công thức viết (vd công thức pitch), format ID, khối "Cách điền", pointer "chạy `/skill-x` để fill", quy tắc format cell. Mọi hướng dẫn cho người viết sống ở SKILL.md (Constraints — Hard rules / Pitfalls) hoặc `.claude/rules/`.
- ĐƯỢC giữ: placeholder dữ liệu render dạng blockquote (`> Scope: {{scope}}`, `> Decided: {{date}} | By: ...`), chú giải mà __người đọc__ cần để hiểu nội dung (thang nhãn ✅/🔵/🟡 của reverse-doc, định nghĩa horizon Now/Next/Later của roadmap), marker file auto-gen (jira-map "Updated bởi `/jira`").
- Update mode gặp doc cũ còn meta-text → đề xuất dọn qua L2 diff, user quyết.

## 1. Author resolution (cho activity log)‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

> Frontmatter KHÔNG còn field `owner` (diet 2026-07-12) — "ai làm" ghi per-event ở cột @author của `docs/_shared/changelog.md`.

- Resolve @author từ memory `user-identity.md` (key `current_user`).
- Nếu memory chưa có → đọc `git config user.name` + `git config user.email` → ask user confirm @handle (vd `@an.nguyen` từ `an.nguyen@example.com`) → save vào memory. KHÔNG hardcode handle sẵn — mỗi người dùng 1 handle riêng, luôn hỏi rồi lưu.
- Skill set env `CLAUDE_CHANGELOG_AUTHOR` (cùng `CLAUDE_SKILL_NAME`, `CLAUDE_CHANGELOG_NOTE`) TRƯỚC mỗi Write/Edit — hook `auto-changelog.sh` là bên ghi log duy nhất.
- Doc demo cũ còn field `owner` trong frontmatter → giữ nguyên (di sản), không thêm vào doc mới.

## 2. No-re-ask rule‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

- KHÔNG hỏi lại câu user đã trả lời (cùng session HOẶC trong file đã tồn tại).
- Trước mỗi vòng câu hỏi: scan idea seed + previous answers + existing doc (continuation/update mode) → loại câu đã có answer.
- __Câu trả lời CẤP DỰ ÁN__ (domain, thuật ngữ gọi người dùng, đối thủ, compliance...) → đọc trước + ghi lại vào `docs/_shared/project-profile.md` theo `.claude/rules/project-profile.md` — no-re-ask áp cross-session và cross-skill qua file này.
- Answer partial → follow-up chỉ phần thiếu, KHÔNG hỏi lại từ đầu.
- Continuation/update mode: MUST Read full file trước khi phỏng vấn, đối chiếu mỗi planned question với content có sẵn.

## 3. IT-BA framing (no coding/architect questions)‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

Skill phục vụ IT Business Analyst, KHÔNG phải developer.

__CẤM hỏi:__ tên column DB, schema table, function/service name, API endpoint, JWT vs session, framework choice, refresh-token rotation, hashing algorithm, payload structure, SDK name.

__ĐƯỢC hỏi (business language):__
- "system làm gì" (validate, lưu thông tin, gửi email, gọi dịch vụ ngoài)
- "cần lưu loại thông tin nghiệp vụ gì" (vd email, status, ngày tạo — KHÔNG hỏi column type)
- "có gọi dịch vụ bên ngoài nào" (Google, SendGrid, Stripe — chỉ tên + mục đích, KHÔNG hỏi endpoint/SDK)
- "ai trigger action", "khi nào trigger", "kết quả nghiệp vụ user thấy"

Quyết định kỹ thuật (DB schema, auth strategy, framework choice) là việc của `/srs` + dev/architect, KHÔNG phải BA skills khác.

## 4. Vietnamese-friendly typography

- KHÔNG dùng ký hiệu ngoại lai khó đọc trong prose tiếng Việt: `§` (section sign) → dùng "Mục N", `¶` → "đoạn N".
- `→` chỉ dùng trong flow/diagram/table cell, narration tiếng Việt nên dùng "sang/đến/dẫn tới".
- Bold (`**...**`) dùng bình thường — phục vụ emphasis số liệu, key term, câu chốt.
- Tránh làm doc trông như legal/spec Tây.

## 5. L1 plan preview cho BA, không cho dev

L1 plan preview phải dùng __prose tự nhiên với từ nghiệp vụ__, KHÔNG bảng dày tag/flag/checklist.

__Format đề xuất:__

> Em sẽ {tạo mới | viết lại} file `docs/{feature}/{name}.md` với:
>
> __Thêm/cập nhật nội dung:__
> - {liệt kê 4-8 bullet bằng từ nghiệp vụ: "luồng / bảng / hình minh họa / số liệu cụ thể / wording mẫu"}
> - {các số liệu nghiệp vụ cụ thể nếu có}
>
> __Câu hỏi mở:__ {N resolved} đã chốt; còn {M} cho `/{next-skill}`.
>
> __Ghi nhận:__ activity log "{note}".
>
> Apply? (Y / sửa)

__CẤM trong L1 BA-facing:__
- Bảng `# | path | action | summary` (kiểu log dev)
- Tag flag: `has_external_redirect=Y`, `Quality checklist: 9/11`, `Mandatory artifacts ✓`‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍
- Từ technical: matrix, diagram, flag, scaffold, schema

__GIỮ:__ số liệu nghiệp vụ cụ thể (lockout 5 lần, link 24h) — đó là content nghiệp vụ.

## 6. Độ sâu cột "Description" trong bảng mô tả màn hình

> Áp cho `/wireframe-ascii`, `/wireframe-html`, `/prototype-html` — bảng 5 cột `# | Items | Control type | Data type | Description`. Cột Description KHÔNG được nông ("• Bắt buộc. Validate email"). Phải đủ để BA/dev/QC dùng thật.

__Nguồn rút mô tả (ưu tiên, KHÔNG bịa):__ `srs/{feature}-spec.md` (FR/BR/NFR/Error Matrix) → use case `uc-*.md` (branches) → brainstorm/URD/PRD. Rút số liệu + mã ID + wording THẬT từ đó.

__6 lớp thông tin cho mỗi element__ (fill lớp nào áp dụng — element đơn giản như link chỉ cần 1-2 lớp):

1) __Mục đích nghiệp vụ__ — field/nút này để làm gì (business meaning), 1 câu.
2) __Validation / ràng buộc__ — bắt buộc/tùy chọn, rule cụ thể (trích BR-xxx), default, placeholder. Nêu rõ cả điều KHÔNG áp (vd "login không validate password policy, chỉ so khớp").
3) __States__ — default / focus / disabled / submitting / error / success (chỉ liệt kê state element thật sự có).
4) __Navigation__ — click/submit đi màn nào, điều kiện enable/disable.
5) __Error + wording__ — mã `E-{feature}-NNN` + wording exact + hệ quả (vd "tăng bộ đếm fail +1" / "KHÔNG tính vào fail counter").
6) __Edge / security / compliance__ — anti-enumeration, audit log, lỗi mạng, auto-link, fallback, PDPA... khi áp dụng (trích NFR-xxx).

__Gọn — KHÔNG dài dòng thừa:__ giữ đủ 6 lớp nhưng wording súc tích; KHÔNG lặp lại 1 mã ID nhiều lần nếu đã rõ; gộp branch cùng loại. Mục tiêu: đọc 1 row hiểu đủ 1 element, KHÔNG phải nhảy file.

**Thiếu nguồn nghiệp vụ (chưa chạy `/srs`):** KHÔNG bịa validation/error/số liệu. __Hỏi user bổ sung__ các điểm thiếu (từng field một, theo no-re-ask rule) — vd "Password field: rule độ dài + charset cho phép?", "Nút Submit: các case fail + thông báo?". User "bỏ qua" → ghi mức nông + đánh dấu rõ chỗ cần bổ sung, KHÔNG chặn tiến độ.

## 7. Confirm device size TRƯỚC khi vẽ wireframe/prototype

> Áp cho `/wireframe-ascii`, `/wireframe-html`, `/prototype-html`. Device size (mobile 375 / tablet 768 / desktop 1024 / responsive) quyết định bề rộng khung + cách xếp layout — là __quyết định thiết kế__, KHÔNG được tự đoán im lặng (đúng tinh thần `approval-gate.md`: không auto-pick dù "có vẻ rõ").

- __Luôn hỏi user device__ ở đầu skill (trước khi vẽ), qua AskUserQuestion 4 lựa chọn: Mobile 375 / Tablet 768 / Desktop 1024 / Responsive.
- __Đề xuất sẵn 1 device__ để user chỉ cần xác nhận nhanh: ưu tiên `srs/{feature}-userflow.md` frontmatter `primary_device`; thiếu thì suy từ `docs/design.md` (Breakpoints / Max content width). Đặt option đề xuất lên đầu + note "(đề xuất — từ {nguồn})".
- __KHÔNG suy 1 device rồi vẽ luôn__ — kể cả khi design.md rõ ràng. Suy được chỉ để *đề xuất*, không để *tự chốt*.
- User chốt device mà `userflow.md` chưa có `primary_device` → gợi ý ghi ngược vào userflow frontmatter (single-source, để `/wireframe-html` + `/prototype-html` + lần sau dùng chung, không hỏi lại — no-re-ask).
- `responsive` chỉ dùng khi user chọn rõ VÀ renderer thực sự sinh nhiều breakpoint; KHÔNG gắn nhãn responsive rỗng.

## 8. 1 màn = 1 trạng thái tại 1 thời điểm; form không trải rộng

> Áp cho `/wireframe-ascii`, `/wireframe-html`, `/prototype-html`.

- __State loại trừ nhau → tách screen riêng, KHÔNG nhồi chung 1 khung.__ Nếu 1 màn có ≥2 kết quả chỉ 1 hiện tùy điều kiện (vd verify-result: thành công / hết-hạn; payment-result: success / fail; OTP: nhập / hết-hạn) → render __mỗi state 1 screen__ (slug `{screen}-{state}`, vd `verify-email-success` + `verify-email-expired`). KHÔNG vẽ 2 khối side-by-side trong 1 khung (đọc nhầm là "màn có cả 2"). Chỉ chung 1 khung khi các phần __cùng hiện đồng thời__. Userflow gộp chung → đề xuất tách + hỏi user.
- __Form/auth/dialog KHÔNG trải rộng hết khung desktop.__ Content dạng form (login/signup/forgot/modal) phải nằm trong __1 box căn giữa hẹp__ (~380-460px), input/nút full-width TRONG box đó — KHÔNG kéo dài full 1024px (trông sai, không giống màn thật). HTML: `<div class="wf-form">`. ASCII: vẽ khung form hẹp căn giữa trong khung device rộng, KHÔNG cho field chạm 2 mép. Full-content screen (dashboard/list/table) thì trải thẳng, không cần box.

## 9. `description` của SKILL.md — ngắn, đủ định tuyến, KHÔNG giải thích

> Áp cho MỌI `.claude/skills/*/SKILL.md`. `description` phục vụ 2 việc: hiện trong danh sách `/command`
> cho user chọn, và giúp model biết khi nào dùng skill. Nó KHÔNG phải chỗ đặc tả skill — đặc tả sống ở
> thân SKILL.md (Goal/Constraints/Approach), giải thích dài sống ở `explain-skills/{skill}.md`.

__Công thức 1-2 câu (~120-250 ký tự), theo thứ tự:__

1) __Dùng khi cần {việc gì} → ra {output gì}__ — 1 câu, từ nghiệp vụ. Đây là phần bắt buộc và
   thường là phần DUY NHẤT cần có.
2) *(chỉ khi cú pháp gọi mang thông tin thật)* __cú pháp gọi__ — khi có tham số/biến thể đổi hành vi
   mà tên skill không nói lên được, vd `/gap <feature> · --product đối chiếu Feature Map ↔ Roadmap`.
   Viết thẳng cú pháp, __KHÔNG mở đầu bằng "Kích hoạt bằng"__ — 4 chữ đó không thêm thông tin nào
   (skill vốn được gọi bằng tên của nó, và `argument-hint` đã khai tham số).
3) *(chỉ khi thật sự dễ nhầm)* __1 vế phân biệt__ với skill anh em gần nhất, dạng "làm {X} thì dùng `/{skill-kia}`".

Ví dụ đủ dùng chỉ với câu 1: *"Dùng khi cần dựng prototype chạy được bằng Next.js cho 1 feature —
sinh code thật vào `prototype/`, tự build, tự chạy local, tự sửa lỗi."*

__KHÔNG đưa vào description:__

- Liệt kê 3-4 skill khác kèm ngoặc giải thích từng cái (họ diagram → đã có hub `diagram-selection.md`).
- Lý do thiết kế, so sánh chất lượng engine ("đẹp hơn X", "layout gọn hơn Y").
- Chi tiết hành vi runtime: đọc lại output skill nào, gate nào, phase nào, edge case tham số.
- Luật vận hành (vd "KHÔNG tự lấy cwd") — luật phải sống trong __Constraints__ của thân SKILL.md,
  nơi nó thực sự được thi hành. Để ở description là đặt luật sai chỗ, KHÔNG phải nhấn mạnh.
- Nhắc lại tên file output, template, số Mục.

__Kiểm nhanh:__ cắt xong tự hỏi *"còn phân biệt được skill này với skill gần nhất không?"* — còn thì
đủ ngắn. Mỗi chi tiết định cắt phải đã tồn tại trong thân SKILL.md hoặc rule liên quan; nếu chỉ nằm ở
description thì __chuyển vào chỗ đúng trước__, rồi mới cắt.‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍


<!-- wm:2b9af6c9b691879b1ddb7a04d29a1c88 -->
<sub>Tài liệu thuộc bộ AI4BA BA-Kit — bản quyền hoangphan.blog</sub>
