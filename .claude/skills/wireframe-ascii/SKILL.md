---
name: wireframe-ascii
description: Dùng khi cần vẽ ASCII wireframe cho các flow của 1 feature, gộp nhiều màn hình theo flow trong 1 file. Cần `srs/{feature}-userflow.md` trước. Muốn fidelity cao hơn thì dùng `/wireframe-html`, `/figma` hoặc `/prototype-html`.
allowed-tools: Read, Write, Edit, Bash, Glob, Grep, Task, AskUserQuestion
user-invocable: true
argument-hint: "<feature> [--flow <flow-slug>]"
---
<!-- Licensed to vandungvo2003@gmail.com — Order YYWVQ3VWE -->

# /wireframe-ascii — ASCII Wireframe gộp theo flow (single source nội dung)‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

> **KHÔNG dùng `context: fork`.** Skill có **L3 iterate** (render ASCII trong chat, user "Đồng ý / Sửa / Hủy", max 3 vòng/flow) — đây là HITL thật cần user trả lời. Fork = không có kênh trả lời → L3 bị auto-skip, skill tự chốt bản đầu không cho user sửa (cùng root cause bug CR-20260612-001). Chạy ở main conversation. (Trong `/srs` chain mode skill tự skip L3 write bản đầu — nhưng standalone mode PHẢI có L3, nên không fork.)

## Goal‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

Tạo hoặc cập nhật **ASCII wireframe** cho các flow của 1 feature — 1 file/flow chứa N màn hình, chia flow theo `docs/{feature}/srs/{feature}-userflow.md`. **`ascii-wireframe/{flow-slug}.md`** là single source layout ASCII (`/figma` + `/prototype-html` đọc ASCII này làm contract layout để render higher fidelity).

**Thang fidelity 3 bậc** (ghi rõ để không collapse thành 1 skill): `/wireframe-ascii` (lo-fi, chat-native — duyệt cấu trúc nhanh) → `/wireframe-html` (lo-fi B&W, layout-accurate — xem tỉ lệ/lưới thật trong khung device) → `/prototype-html` (hi-fi, design tokens + JS nav — stakeholder click-through). ASCII và HTML **cùng 1 bậc lo-fi, 2 renderer** của cùng 1 screen (khác nhau: ascii duyệt nhanh trong chat/PR/diff; html kiểm tỉ lệ thật) — KHÔNG phải 2 bậc. Cùng dùng **1 bảng mô tả 5 cột**; cái chạy **trước** cho 1 screen là nguồn element cho cái chạy **sau** (Phase B.5), tránh suy luận 2 lần lệch nhau.

ASCII là contract layout bắt buộc cho `/figma` + `/prototype-html` (2 skill đó đọc ASCII làm layout). KHÔNG có ASCII = `/figma` + `/prototype-html` refuse.

## Constraints‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

### Hard rules — never violate‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

- **Cần `srs/{feature}-userflow.md` trước.** Chưa tồn tại → skill tự gọi `/user-flow <feature>` (Phase A.5), KHÔNG tự bịa cách chia flow riêng.
- **1 file/flow** — `docs/{feature}/ascii-wireframe/{flow-slug}.md`, chứa N screen block. KHÔNG còn 1-file-1-screen.
- **L3 iterate** trong chat (standalone mode), gom theo flow (1 lần render cả flow), max 3 vòng/flow. Trong `/srs` chain mode: skip L3, write bản đầu.
- **L1 approval** trước Write/Edit.
- **L2 diff** khi file đã tồn tại (update mode tự động).
- **`<feature>` bắt buộc** (positional arg).
- **Bảng mô tả 5 cột** (# / Items / Control type / Data type / Description) — DÙNG CHUNG với `/wireframe-html` và `/prototype-html`. `Control type` = loại control (Textbox/Button/Link/Label/Checkbox/Radio/Dropdown/...); `Data type` = hành vi tương tác (Text/Click/Check/Select/ReadOnly). KHÔNG gộp 2 khái niệm này vào 1 cột.
- **Cột Description SÂU (không nông)** — 6 lớp per `ba-conventions.md` Mục 6, rút từ `srs/{feature}-spec.md` + `uc-*.md`. Thiếu nguồn → hỏi user bổ sung, KHÔNG bịa.
- **Confirm device size với user TRƯỚC khi vẽ (Phase A bước 4)** — Mobile / Tablet / Desktop / Responsive quyết định bề rộng khung ASCII. Đề xuất sẵn nhưng KHÔNG tự chốt im lặng.
- **Wireframe "unpolished by design"** — ASCII là lo-fi, mục đích duyệt CẤU TRÚC nhanh, KHÔNG cần trông đẹp/thật. Đừng thêm màu/chi tiết thừa.
- **CẤM emoji bên trong khung ASCII** — emoji (`👁 🔊 🎉 ⭐ →`) render 2 cột hiển thị nhưng thường bị pad theo 1 ký tự → viền lệch cột (đo thật: frame lệch 2-5 cột). Icon dùng token ASCII 1 cột (xem "Glyph convention"). Emoji CHỈ được dùng ở prose/nhãn NGOÀI viền (cột Description), nơi không cần thẳng cột.
- **Vietnamese-first** trong labels; user nói "viết bằng tiếng Anh" thì labels EN.
- **BA conventions** (must follow) — Owner resolution, no-re-ask rule, IT-BA framing, Vietnamese typography, L1 prose preview. Per @../../rules/ba-conventions.md.

### Pitfalls — easy to get wrong‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

- **Đừng tự chia flow.** Nguồn chia flow DUY NHẤT là `srs/{feature}-userflow.md` — nếu chưa có/chưa duyệt, gọi `/user-flow` trước, đừng tự suy đoán.
- **Đọc lại HTML wireframe nếu đã có** (Phase B.5) — tránh 2 skill tự suy luận field/validation độc lập rồi lệch nhau. Chỉ áp dụng cho screen chưa có ASCII; screen đã có ASCII giữ nguyên, không ghi đè từ HTML.
- **1 file = N screens (theo flow), KHÔNG 1-file-1-screen.** Screen thuộc flow nào thì nằm trong `{flow-slug}.md` đó. Nếu thấy output cũ dạng 1-file-1-screen (di sản) → khi update gộp lại theo flow.
- **KHÔNG emoji trong khung ` ```text `** — dùng token chữ (`(eye)` `[IMG: ...]`). Emoji chỉ ở cột Description. Đây là nguyên nhân chính "viền lệch / trông giả".
- **Bảng 5 cột, KHÔNG 4 cột** — `Control type` (loại control) tách khỏi `Data type` (hành vi). Output cũ 4 cột / cột "Data type" chứa Click/Navigate là di sản, update mode sửa lại.
- **Unpolished by design** — đừng làm ASCII "đẹp/thật" hơn; nó là lo-fi để duyệt cấu trúc. Muốn đẹp có màu → `/prototype-html`.
- **State loại trừ → tách screen; form không trải rộng** (per `ba-conventions.md` Mục 8): màn có ≥2 kết quả loại trừ (success/fail/expired) → mỗi state 1 screen `{screen}-{state}`, KHÔNG vẽ 2 khối cạnh nhau. Form/auth → vẽ khung hẹp căn giữa trong khung device, field KHÔNG chạm 2 mép.
- **`<feature>` thiếu hoặc folder chưa tồn tại** → KHÔNG refuse. Thiếu userflow là việc `/user-flow` lo (Phase A.5 tự gọi) — `/user-flow` thuộc nhóm điểm-vào, tự derive slug + tạo feature nếu chưa có (xem `feature-bootstrap.md`). `/wireframe-ascii` chỉ chờ userflow duyệt xong rồi vẽ. Chỉ khi arg hoàn toàn mơ hồ (không phải slug, không phải mô tả flow rõ) mới hỏi lại.
- **L3 vòng >3** → ép chốt v3.
- **Multi-language label** — mặc định VN; user nói "viết bằng tiếng Anh" thì labels EN. Đừng mix.
- **Long screen với scroll** — ASCII note `(scroll xuống xem thêm)`.
- **Hook stale-propagation** — Edit screen MD trigger stale cho downstream nếu có (acceptable).
- **File flow đã tồn tại** → tự vào update mode: chỉ rebuild ASCII + bảng mô tả cho flow chỉ định (hoặc tất cả nếu không có `--flow`); giữ nguyên phần user đã sửa tay ở screen không liên quan trong cùng file.
- **Screen dùng chung nhiều flow** (cross-flow) → render trong flow xuất hiện đầu tiên theo `userflow.md`, các flow khác ghi chú `[chung với {other-flow}]` thay vì duplicate nội dung.

## Inputs

```
/wireframe-ascii <feature>                       # tất cả flow trong userflow.md, default L3 iterate
/wireframe-ascii <feature> --flow <flow-slug>    # 1 flow cụ thể
```

Muốn đổi hành vi mặc định, nói bằng lời:
- File flow đã tồn tại → skill tự vào update mode (L2 diff), không cần flag; muốn sửa gọi lại skill và nói cần đổi gì.
- Viết bằng tiếng Anh → nói "viết bằng tiếng Anh".

**Thêm 1 màn hình vào flow đã có:** gọi `/wireframe-ascii <feature> --flow <flow-slug>` trên flow đã tồn tại → skill vào update mode, giữ nguyên các screen cũ (không đụng phần user đã sửa tay) và chỉ thêm/vẽ screen mới vào cuối flow. Không cần lệnh riêng để "thêm 1 màn". Nếu screen mới **chưa có trong `srs/{feature}-userflow.md`** → skill cảnh báo + route `/user-flow <feature>` để rà lại cách chia flow trước, KHÔNG tự chắp screen rời vào userflow (chia flow là việc của `/user-flow`).

## Context (dynamic)

Today: !`date +%Y-%m-%d`
Features có sẵn: !`ls -d docs/*/ 2>/dev/null | xargs -I{} basename {} | grep -v "^_" | head -20`
Features có userflow.md (nguồn chia flow BẮT BUỘC): !`for d in docs/*/srs/*-userflow.md; do [ -f "$d" ] && dirname "$d" | xargs dirname | xargs basename; done 2>/dev/null | head -20`
Features đã có ascii-wireframe: !`for d in docs/*/ascii-wireframe/*-wireframe-index.md; do [ -f "$d" ] && dirname "$d" | xargs dirname | xargs basename; done 2>/dev/null | head -20`

## Output

```
docs/{feature}/ascii-wireframe/
  {feature}-wireframe-index.md              ← master metadata (không đổi cấu trúc — xem Mục "Update {feature}-wireframe-index.md")
  {flow-slug}.md — 1 file per flow, zero frontmatter (KHÔNG 1-file-1-screen)
```

> **Naming (bắt buộc):** file per-flow dùng `{flow-slug}.md` (slug nghiệp vụ tự phân biệt — KHÔNG prefix `{feature}-`). File index master dùng `{feature}-wireframe-index.md` (có prefix). Theo `naming-conventions.md`.

Mỗi `{flow-slug}.md` gồm N block `## Screen: {screen-slug} — {tên}`, mỗi block 2 sub-section:
- `### Wireframe (ASCII)` — code block ` ```text ` fence.
- `### Screen description` — bảng 5 cột `# | Items | Control type | Data type | Description`.

## Approach

### Phase A — Parse & Validate

1. Extract `<feature>` từ args. Validate `docs/{feature}/` tồn tại (soft gate warn).
2. Check `docs/{feature}/srs/{feature}-userflow.md`:
   - Tồn tại + `stage: flow-approved` → Read, dùng làm nguồn chia flow.
   - Chưa tồn tại hoặc chưa duyệt → **tự động gọi `/user-flow <feature>`** trước khi tiếp tục (thông báo rõ: "Chưa có user flow đã duyệt, em chạy `/user-flow` trước để biết cách chia màn hình theo flow"). Skill này KHÔNG tự chia flow riêng.
3. `--flow <slug>` → chỉ xử lý flow đó (phải khớp 1 flow-slug trong userflow.md Mục 3).
4. **Confirm device size với user (BẮT BUỘC).** Ảnh hưởng bề rộng khung ASCII (mobile hẹp ~48 cột, desktop rộng ~72 cột) + cách xếp layout. Đề xuất sẵn từ `userflow.md` `primary_device` / `design.md`, hỏi qua AskUserQuestion (Mobile / Tablet / Desktop / Responsive), KHÔNG tự chốt im lặng. User chốt → dùng làm width chuẩn khi vẽ (Phase C).

### Phase B — Resolve flow list

- **KG chọn nguồn trước (rẻ hơn scan):** chạy `node .claude/skills/kg/engine/kg-query.mjs facts {feature}` và `node .claude/skills/kg/engine/kg-query.mjs neighbors <doc-path>` khi có doc mốc để lấy danh sách candidate/coverage cho FR/UC/E nguồn của screen, rồi VẪN Read đầy đủ prose file đã chọn. Tuân `.claude/rules/kg-usage.md` (3 nghĩa vụ: `--all` khi bị cap · đọc mục "Phải Read tay" · `KG-ERROR` → scan trực tiếp như cũ).

1. Đọc `srs/{feature}-userflow.md` Mục 2 (danh sách màn hình) + Mục 3 (danh sách flow) → xác định N flow, mỗi flow gồm những screen-slug nào theo thứ tự.
2. Screen MD flow đã tồn tại (`ascii-wireframe/{flow-slug}.md`) → Read, dùng làm base cho update mode.
3. Screen MD chưa tồn tại → chuẩn bị tạo mới.

### Phase B.5 — Check HTML wireframe đã có (đọc-lại nếu tồn tại)

Với mỗi screen chưa có ASCII: check `docs/{feature}/html-wireframe/{flow-slug}.html` đã tồn tại chưa (`/wireframe-html` đã chạy trước).

- **Có** → đọc bảng mô tả 5 cột của screen đó trong file HTML, dùng làm nguồn element (field/action/control type/validation) thay vì tự suy luận lại từ đầu ở Phase C. Chỉ hỏi user phần HTML cũng chưa rõ (áp dụng no-re-ask rule).‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍
- **Chưa có** → Phase C tự suy luận như bình thường từ tài liệu nghiệp vụ.

### Phase C — Generate ASCII per screen (trong từng flow)

Với mỗi flow, với mỗi screen trong flow đó:

1. **Thu thập element + nghiệp vụ SÂU** — ưu tiên nguồn Phase B.5 nếu có; nếu không, đọc **`srs/{feature}-spec.md` (FR/BR/NFR/Error Matrix) + `uc-*.md` (branches)** + brainstorm/URD/PRD để rút mô tả sâu (số liệu, mã ID, wording error THẬT). Đây là nguồn chính cho cột Description đủ 6 lớp (xem `ba-conventions.md` Mục 6). Thiếu nguồn (chưa có SRS) → **hỏi user bổ sung** validation/error/states từng field một (no-re-ask), KHÔNG bịa.
2. **Generate ASCII art** từ element vừa xác định:
   - Default layout phù hợp purpose (form vertical, list table, detail card, dashboard grid).
   - Width theo device đã chốt ở Phase A: mobile ~44-48 cột, tablet ~60, desktop ~68-72 cột. **Mọi dòng viền cùng bề rộng** (đếm ký tự, mỗi ký tự Latin/Việt = 1 cột; KHÔNG chèn emoji trong khung vì emoji = 2 cột hiển thị làm lệch viền).
   - Glyph convention (xem section dưới) — CHỈ dùng token trong bảng đó, KHÔNG emoji.
   - **Placeholder thật, độ dài thật** (`[Nguyễn Văn A]`, `[Đơn #12345]`) để lộ lỗi tràn/wrap — KHÔNG lorem ipsum.
   - Đánh số callout `[1] [2] …` trong khung, trỏ đúng row bảng mô tả (traceability).
3. **Generate bảng mô tả 5 cột** (# / Items / Control type / Data type / Description) từ cùng nguồn element. **Cột Description phải SÂU** — 6 lớp per `ba-conventions.md` Mục 6 (mục đích / validation trích BR / states / navigation / error+wording E-xxx / edge-security), rút từ SRS spec + UC. Gọn nhưng đủ; thiếu nguồn thì hỏi user, KHÔNG nông chung chung.

### Phase D — L3 iterate (standalone mode, gom theo flow)

```
[/wireframe-ascii] {flow-slug} — Phiên bản 1:

── Screen: {slug-1} — {tên} ──
┌──────────────────────────────────┐
│ Screen title                     │
├──────────────────────────────────┤
│  ...                             │
└──────────────────────────────────┘

── Screen: {slug-2} — {tên} ──
┌──────────────────────────────────┐
│ ...                              │
└──────────────────────────────────┘

Đồng ý / Sửa: <text> / Hủy:
```

- Max 3 vòng/flow. Vòng 3 ép chốt.
- Trong `/srs` chain mode: SKIP L3, write bản đầu thẳng.

### Phase E — L1 approve + Write

1. **L1** preview path + action theo flow (không phải theo từng screen riêng lẻ):
   ```
   1 | docs/{feature}/ascii-wireframe/{flow-slug}.md | create | {N} screens: {slug-1}, {slug-2}, ...
   ```
2. **Write** `{flow-slug}.md` (xem Mục "Template {flow-slug}.md").
3. **Update `{feature}-wireframe-index.md`**:
   - Bảng Screens: mỗi screen 1 row, cột "Thuộc flow" trỏ `{flow-slug}.md#{screen-slug}`.
   - Section `## Descriptions`: append/update H3 per screen nếu screen mới.
   - Screen MD chưa có → tạo `{feature}-wireframe-index.md` mới nếu chưa tồn tại (theo `_templates/srs-screen-index.md`).
4. **Set env trước Write** (hook ghi changelog.md vào `ascii-wireframe/{feature}-wireframe-index.md`): `CLAUDE_SKILL_NAME=/wireframe-ascii` + `CLAUDE_CHANGELOG_AUTHOR={@author}` + `CLAUDE_CHANGELOG_NOTE=[{flow-slug}] ASCII created/updated cho {N} screens` (≤80 ký tự). Hook ghép cả dòng.

## Glyph convention

> **Bộ glyph CỐ ĐỊNH — chỉ dùng đúng các token dưới, KHÔNG ASCII-art tự do, KHÔNG emoji.** Mọi ký hiệu đây đều rộng 1 cột monospace → viền không lệch. Icon nghiệp vụ (mắt/loa/sao...) diễn đạt bằng token chữ `(eye)` `(play)` chứ KHÔNG emoji.

| Glyph | Element |
|-------|---------|
| `[__________]` | Text input (textbox) |
| `[__________]` + label sau | Textbox có nhãn |
| `[multi-line`<br>`  ________]` | Text area |
| `[v: option]` | Dropdown (chọn) |
| `[ ]` | Checkbox chưa chọn |
| `[x]` | Checkbox đã chọn |
| `( )` | Radio chưa chọn |
| `(*)` | Radio đã chọn |
| `[ Nút chính ]` | Primary button |
| `[ Nút phụ ]` | Secondary button |
| `< Link text >` | Hyperlink / navigate |
| `┌─┐ │ └─┘ ├─┤` | Borders (khung) |
| `───` / `═══` | Divider (mảnh / đậm) |
| `[ IMG: mô tả ]` | Image placeholder (kèm mô tả ngắn) |
| `[ CHART: mô tả ]` | Chart / element không vẽ được |
| `(eye)` `(play)` `(info)` `(!)` | Icon nghiệp vụ — token chữ, KHÔNG emoji |
| `[1] [2] [3]` | Callout number trỏ row bảng mô tả |

> **Vì sao cấm emoji:** đo thật trên output cũ — frame có `👁 🔊 🎉 ⭐` lệch viền 2-5 cột (emoji rộng 2 cột hiển thị nhưng bị pad 1 ký tự). Đây là class bug đã biết (Unicode East Asian Width; VSCode #100730, JetBrains IJPL-229860). Emoji được phép ở cột Description (prose ngoài khung), không phép trong ` ```text ` khung.

## Template `{flow-slug}.md` (zero frontmatter)

```markdown
# Flow: {Tên flow}

> Màn hình thuộc flow này: {slug-a} → {slug-b} → {slug-c}. Flow tổng xem `../srs/{feature}-userflow.md` Mục 1.

---

## Screen: {slug-a} — {Tên màn}

### Wireframe (ASCII)

```text
{ASCII wireframe màn a — mọi dòng viền cùng bề rộng, không emoji, callout [1] [2]}
```

### Screen description

| # | Items | Control type | Data type | Description |
|---|-------|--------------|-----------|--------------|
| 1 | Email | Textbox | Text | • **Bắt buộc**. Định dạng email hợp lệ.<br>• Placeholder "you@example.com". |

---

## Screen: {slug-b} — {Tên màn}

### Wireframe (ASCII)

```text
{ASCII wireframe màn b}
```

### Screen description

| # | Items | Control type | Data type | Description |
|---|-------|--------------|-----------|--------------|
| 1 | ... | ... | ... | ... |
```

## Workflow tiếp theo

Sau ASCII OK:
- **`/wireframe-html <feature>`** — renderer ngang hàng, xem tỉ lệ/lưới thật trong khung device (B&W).
- **`/figma <feature> [<screen-slug>]`** — vẽ thật lên Figma qua figma-ui-mcp, tuân design tokens từ `docs/design.md`.
- **`/prototype-html <feature>`** — build HTML clickable prototype multi-screen self-contained (hi-fi, design tokens + JS nav).

## References

- @../../rules/approval-gate.md
- @../../rules/kg-usage.md
- @../../rules/naming-conventions.md
- @../../rules/changelog.md
- @../../rules/ba-conventions.md
- @../../rules/feature-bootstrap.md
- @../../../_templates/srs-screen.md
- @../../../_templates/srs-screen-index.md
- @./references/example-ascii.txt
- @../user-flow/SKILL.md (nguồn chia flow — chạy trước nếu chưa có)
- @../wireframe-html/SKILL.md (renderer ngang hàng — đọc lại nếu đã chạy trước, xem Phase B.5)
- @../figma/SKILL.md (Figma builder qua MCP)
- @../prototype-html/SKILL.md (HTML clickable multi-screen, hi-fi)‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍


<!-- wm:2b9af6c9b691879b1ddb7a04d29a1c88 -->
<sub>Tài liệu thuộc bộ AI4BA BA-Kit — bản quyền ai4ba.com</sub>
