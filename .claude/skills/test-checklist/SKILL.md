---
name: test-checklist
description: Dùng khi cần tạo checklist test — outline scenario cần test, chưa data chi tiết — để review trước khi viết test case đầy đủ. Khác `/ac` (Given/When/Then chi tiết per story) và `/api-test` (bảng request có data thật).
allowed-tools: Read, Write, Edit, Bash, Glob, Grep, AskUserQuestion
user-invocable: true
disable-model-invocation: true
argument-hint: "[<feature>]"
---
<!-- Licensed to vandungvo2003@gmail.com — Order YYWVQ3VWE -->

# /test-checklist — Test Checklist Generator (QC outline trước test case detail)‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

## Goal‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

Sinh checklist scenarios cần test ở **dạng outline 1 dòng/case** — KHÔNG có Given/When/Then, KHÔNG payload — để QC/BA review "đã đủ chưa, miss case nào không" TRƯỚC khi expand chi tiết thành test case chạy được.

> **AC là nguồn THAM KHẢO, KHÔNG phải bước expand.** AC (`us-{NNN}` sau `/userstory`, sinh bởi `/ac`) đọc VÀO để dựng checklist đủ scenario — nhưng bước biến 1 item thành case chạy được là `/test-cases` (UI, 1:1 từ checklist) và `/api-test` (API). Đừng route "expand qua `/ac`".

Workflow QC chuẩn skill này hỗ trợ:
1) `/test-checklist` → đọc AC/FR/UC làm nguồn → outline → review → chốt scope test.
2) `/test-cases` (UI, 1:1) hoặc `/api-test` (API) → expand từng item thành case chạy được.

## Constraints‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

### Hard rules — never violate‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

- **Output format CỐ ĐỊNH theo grammar CHK hiện hành** — format này là contract cho parser (preview data.js) + `/test-cases` + KG. Format cũ `[priority] [Yes/No] N.` chỉ còn được parser đọc **backward-compat** (docs demo di sản); skill **KHÔNG sinh mới** theo format cũ.
  - **Grammar item — 1 dòng (KHÔNG có STT/`N.`):**
    ```
    [P] [Auto] CHK-{feature}-NNN → {Ref} · {nội dung}
    ```
    - `[P]` = `[1]`/`[2]`/`[3]`/`[4]` (Critical/High/Medium/Low) — **LUÔN đứng đầu** (preview cần `priority`, thiếu → badge vỡ).
    - `[Auto]` = `[Yes]`/`[No]`.
    - `CHK-{feature}-NNN` = trace key, full-form (feature prefix literal), 3-digit; cấp từ `next_chk_id` ở index; **được phép có gap** (xóa không lấp); thứ tự dòng KHÔNG mang nghĩa định danh.
    - `→ {Ref}` = 1 hoặc nhiều `FR-/BR-/NFR-/E-{feature}-NNN` phẩy-phân-tách (vd `→ FR-{feature}-003, E-{feature}-003`); item chung (a11y/visual/perf) → `→ —`.
    - `· {nội dung}` = câu mô tả; parse: Ref là chuỗi token ID bounded, split nội dung tại `·` **đầu tiên sau** Ref.
    - Ví dụ: `[1] [Yes] CHK-authentication-027 → FR-authentication-003, E-authentication-003 · Verify sai password hiển thị message generic "Email hoặc mật khẩu không đúng"`
  - Category: `#1. <name>`, subcategory: `##1.1. <name>`.
  - **Vietnamese-first** prose; **GIỮ NGUYÊN** button labels, field names, technical terms (không dịch "Submit", "Email", "OTP", "Disconnect account").
  - **KHÔNG** code block bọc checklist; **KHÔNG** title/heading dẫn nhập trước checklist.
- **Baseline invariant (LUÔN có, bất kể profile)** — mức cơ bản, KHÔNG phải full profile:
  - Core flow (happy) + alternate + validation/error (từ Error Matrix)
  - Input boundary (BVA) + data integrity
  - Security acceptance cơ bản (auth required, role, session — KHÔNG pentest)
  - Loading state / slow-network recovery **định tính** (KHÔNG cần threshold)
  - Accessibility cơ bản (keyboard nav, focus order, label — KHÔNG cần contrast đo)
  - Responsive breakpoint chính (layout không vỡ)
  - Edge cases (double-submit, back, refresh, network drop, expired session, concurrent)
- **Chỉ khi profile bật (test-strategy) — KHÔNG mặc định:** Performance load/threshold · A11y đầy đủ (contrast/screen-reader) · Security sâu · Integration-E2E.
- **Application chrome (Header/Footer)** — mandatory CHỈ khi source xác nhận app-wide chrome (web app thật). Feature mới brainstorm / non-web → KHÔNG tự thêm.
- **Tổ chức theo user flow start→end**, mỗi step nhóm case happy-path trước, error/edge sau.
- **1 item ATOMIC (HARD — bám sát 1:1 của `/test-cases`)** — 1 item = 1 nghĩa vụ kiểm với **cùng precondition + action + MỘT oracle**. Vì `/test-cases` sinh đúng 1 TC/item, item gộp nhiều oracle → TC rơi assertion.
  - **Atomic = 1 business trigger/sequence + 1 oracle.** Được phép nhiều **step chuẩn bị** (prerequisite: mở trang, nhập field, submit) — đó KHÔNG phải oracle. CẤM thêm oracle ĐỘC LẬP thứ 2 (vd "render <2 giây" là 1 oracle perf; "đủ elements" là 1 oracle hiển thị → 2 item riêng). 1 TC có 1-5 step nhưng chỉ 1 oracle-cuối.
  - **Oracle = 1 mệnh đề pass/fail có 1 Expected duy nhất** (KHÔNG đo bằng số lệnh `expect()` — 1 oracle vẫn có thể nhiều assert kỹ thuật cùng kiểm 1 mệnh đề).
  - **ĐƯỢC gộp CHỈ khi là 1 collection-predicate**: cùng precondition + action + priority, VÀ Expected liệt kê trọn bộ, VÀ thiếu bất kỳ phần tử nào làm CÙNG 1 predicate "collection không đầy đủ" fail. Vd "header hiển thị đủ {logo, switcher, nút}" = 1 oracle.
  - **PHẢI tách** khi khác action/kết cục: "logo hiển thị" (oracle: hiển thị) vs "click logo → redirect" (oracle: navigation) = 2 item. Happy vs error = 2 item.
  - **Semantic lint (quét CHỈ trên `{nội dung}` sau dấu `·`, KHÔNG toàn dòng — bỏ qua trace-arrow `→ {Ref}`)**: nội dung chứa liên từ hành động/kết quả — `và click`, `sau đó`, `rồi`, `đồng thời`, nhiều mũi tên kết quả TRONG content, nhiều động từ-kết-quả — là dấu hiệu ≥2 oracle → **tách**. Không chắc → đưa ra L3 để user quyết. (Mũi tên `→` trước Ref là cú pháp grammar, KHÔNG tính là liên từ kết quả.)
  - **CẤM** trong item đã chốt: `hoặc` (2 kết cục), `nếu có`/`nếu spec` (chưa chốt), dấu `?`. Chưa chốt được oracle → OQ, KHÔNG viết item mơ hồ.
- **L1 plan preview** trước Write.
- **L3 iterate** max 3 vòng cho nội dung checklist (render text trong chat → user "Đồng ý / Sửa: <missing scenarios> / Hủy").
- **L2 diff** khi update file đã tồn tại.
- **Review mode** analysis-only (trigger qua "review giùm" / "chỉ check coverage"), KHÔNG edit — output findings missing categories / priority issues / dup items.
- **Index pattern (mirror usecases/)** — `test/checklist/{feature}-checklist-index.md` là master file giữ frontmatter đầy đủ (type/feature/status/updated/links) + bảng Checklists. Các file `checklist-*.md` là **zero frontmatter**, chỉ body checklist thuần (parser-friendly cho QA tool ngoài).
- **Changelog tập trung tại `{feature}-checklist-index.md`** — mọi edit `checklist-*.md` route về file index đó với prefix `[{scope-slug}]` (vd `[screen-login]`, `[us-001]`, `[uc-checkout]`, `[feature]`). KHÔNG cross-folder routing.
- **Preview HTML + data.js** — `preview.html` copy literal từ `_templates/test-checklist-preview.html` (chỉ lần đầu, sau đó skip để user customize). `data.js` regen mỗi lần skill chạy (chứa `window.CHECKLISTS_DATA`; mỗi item `ref` là **mảng** — template dùng `fmtRef` join, backward-compat string). HTML load data qua `<script src="data.js">` — file:// hỗ trợ. Có dropdown filter "Checklist file" để xem riêng từng file MD hoặc gom "Mọi file". Template cũ (không có `fmtRef`) lỗi thời với `ref` mảng → xóa `preview.html` để copy lại bản hiện hành.
- **CHK-ID registry** — `{feature}-checklist-index.md` giữ field máy-đọc `next_chk_id` = **integer KHÔNG padding** (`next_chk_id: 61`, KHÔNG `061` — YAML leading-zero không portable). Render CHK-ID = pad-3 (`CHK-{feature}-061`). Khởi tạo lần đầu = `1`. Cấp item mới = giá trị hiện tại, rồi tăng. **KHÔNG reuse ID trong Retired, KHÔNG lấp gap.** CHK-ID unique **toàn feature** (scan mọi `checklist-*.md`). Validator dùng **projected next** (giá trị sau khi đã cấp in-memory ở vòng hiện tại), KHÔNG so với `next_chk_id` cũ trên disk (tránh ID vừa cấp tự-fail).
- **Coverage gate per-obligation** — mỗi FR/BR/NFR/E sinh *nghĩa vụ test* riêng (FR:happy/alternate, BR:từng-nhánh-có-evidence, E:message/recovery/side-effect). Gate đếm theo **row nghĩa vụ**, KHÔNG per-Source-ID (1 CHK happy KHÔNG làm cả FR "covered"). State (tên hiển thị trong cột Trạng thái bảng Coverage): `covered` / `excluded-approved` (lý do+ngày+BA duyệt) / `blocked` (= source-missing, chưa có nguồn) / `tbd` (in-scope chưa giải) / `partial` (obligation còn thiếu) — chỉ `covered` + `excluded-approved` vào mẫu số pass; `blocked`/`tbd`/`partial` LUÔN chặn (không cho đóng scope tới khi giải hoặc BA duyệt excluded). Nhánh BR chỉ liệt kê khi có **evidence chữ** trong spec/UC (nghi-có mà spec-không-nói → `OQ hỏi BA`, KHÔNG bịa `else`).
- **Read prose là nguồn nội dung, coverage table KHÔNG** — coverage matrix + CHK anchor là **bản đồ điều hướng**, CẤM làm nguồn wording/số liệu. Nội dung item rút từ prose gốc (FR/BR/E trong spec, UC extension, screen desc).
- **Test strategy intake** — đọc/tạo `test/test-strategy.md`: field **durable** (môi trường/data/xử-lý-thiếu/device/NFR/ngôn ngữ) = no-re-ask thật; field **per-run** (mục đích/baseline/profile) = confirm-1-dòng mỗi lần. Profile chỉ **mở rộng** độ sâu — baseline invariant (core/validation/error/security-cơ-bản/loading/a11y/responsive) LUÔN có bất kể profile.
- **BA conventions** — Author resolution cho activity log, no-re-ask rule, IT-BA framing (KHÔNG hỏi DB schema / framework / SDK; checklist viết ở góc nhìn user-facing behavior + UI). Per @../../rules/ba-conventions.md.

### Pitfalls — easy to get wrong‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

- **Item ID `CHK-{feature}-NNN` ổn định — HARD CONSTRAINT.** Cấp từ `next_chk_id` ở index (KHÔNG "max+1 trong file" — 2 file `checklist-screen-*` + `checklist-us-*` cùng max sẽ đụng ID). Xóa → `## Retired CHK-IDs`, KHÔNG reuse, KHÔNG lấp gap (reuse = TC cũ anchor ID đó trỏ nhầm item mới, trace sai âm thầm). Unique toàn feature.
- **Coverage per-obligation là nguồn edge VERIFIES cho KG** — mỗi FR/BR/E sinh nghĩa vụ riêng; 1 CHK happy KHÔNG làm cả FR "covered". Nhánh BR chỉ liệt kê khi có evidence chữ trong spec (nghi-có mà spec-im → OQ hỏi BA, KHÔNG bịa `else`). Obligation chưa map = điểm mù, phải lộ ở L1.
- **Coverage table CẤM làm nguồn nội dung** — chỉ là bản đồ điều hướng; wording/số liệu item rút từ prose gốc (spec Error Matrix, UC), KHÔNG từ ô tóm tắt Rule/condition.
- **KHÔNG dịch button/field names** — "Submit" giữ "Submit", "Đăng nhập" giữ "Đăng nhập". Câu prose Vietnamese, identifier giữ nguyên ngôn ngữ gốc xuất hiện trong screen MD.
- **`[Yes]` vs `[No]` rule cụ thể (Playwright tự chạy được hay không):**
  - `[Yes]`: UI visibility/click/input, navigation flow, form validation, response code check — quan sát qua UI/response.
  - `[No]`: **DB inspection** (fail counter, state không hiện UI), **concurrency/race**, **timing/measurement design** (2 case response-time tương đương), animation/layout/contrast cảm tính, a11y heuristic, CPU/RAM/system metric, webhook chờ async, UX judgment.
  - Khi nghi ngờ → `[No]` (an toàn).
- **1 item ATOMIC — quy tắc gộp/tách:** gộp CHỈ khi cùng precondition + action + MỘT oracle (vd "hiển thị đủ N element" = 1 assert). Tách khi oracle khác / behavior đối lập (happy vs error) / khác priority. Item gộp 2 oracle → `/test-cases` rơi assertion (1 item = 1 TC). CẤM `hoặc`/`nếu spec`/`?` trong item chốt.
- **Header/Footer** — bắt buộc CHỈ khi source xác nhận app-wide chrome (web app có header/footer thật). Feature mới chỉ có brainstorm / non-web flow → KHÔNG tự thêm (tránh bịa element chưa tồn tại).
- **Story scope nhưng US chưa có AC** — vẫn proceed, checklist build từ US prose + linked FR. Add OQ: "AC chưa có, checklist dựa trên FR".
- **Feature scope output dài** — warn nếu > 200 items, gợi ý split per screen/story.
- **Scope `screen` mà screen có ≥3 states** — mỗi state ít nhất 1 happy + 1 error item.
- **Edge case mandatory check:** double-submit, browser back button, refresh giữa flow, network drop, expired session, concurrent edit, copy/paste, autofill.
- **L3 không hiển thị frontmatter** — render chỉ body checklist (giữ chat ngắn gọn).
- **`/test-checklist` KHÔNG generate test data** — đó là việc `/test-cases` (test data per case) và `/api-test` (body column).
- **Checklist sẽ stale khi upstream docs update** — `/srs` finalize hoặc thêm screen mới → chạy lại `/test-checklist <feature>` và nói "update lại" để refresh từ context mới.
- **Khi feature mới có brainstorm thôi** — checklist focus business scenarios + decision points + interrupted transactions (đọc mục 6.x của brainstorm). KHÔNG fabricate UI element check (chưa có screen). **KHÔNG tự thêm Header/Footer** (chưa có screen xác nhận app-wide chrome — chỉ thêm khi source xác nhận).

## Inputs

```
/test-checklist                       # skill hỏi feature + scope
/test-checklist payment               # skill hỏi scope
/test-checklist "tạo checklist cho màn login của payment"   # natural language OK
```

Skill nói chuyện tự nhiên, **không yêu cầu flag**:

1) Skill hỏi: "Anh muốn checklist cho cả feature, 1 màn cụ thể, 1 user story, hay 1 use case?" — list option có sẵn.
2) Skill hỏi tiếp (nếu chọn screen/story/uc): "Màn nào? — login / dashboard / settings ..." (list từ folder).
3) Nếu user nói "update lại cái cũ" / "review giùm" → skill switch mode (update/review) ngầm, không bắt user nhớ flag.
4) Skill **tự gom mọi context có trong feature folder**: brainstorm, URD, BRD, PRD, SRS, screens, US, UC, api-summary. Source nào có → đưa vào, không có → bỏ qua.

Nếu user gõ kèm intent tự nhiên ("update", "review only", "chỉ check coverage") → skill parse intent, không cần `--mode` / `--update` explicit.

## Context (dynamic)

Today: !`date +%Y-%m-%d`
Features có docs: !`ls -1 docs/ 2>/dev/null | grep -v '^_' | head -10`

## Output

```
docs/{feature}/test/
  test-strategy.md                    # ← intake chiến lược test (durable + per-run), dùng chung /test-checklist + /test-cases
  checklist/                          # ← OUTPUT của /test-checklist sống ở đây
    {feature}-checklist-index.md       # master metadata + bảng Checklists + ## Coverage + ## Retired CHK-IDs
    checklist-feature.md               # scope=feature (zero frontmatter)
    checklist-screen-{slug}.md         # scope=screen
    checklist-{us-NNN}.md              # scope=story (vd checklist-us-001.md)
    checklist-uc-{slug}.md             # scope=uc
    preview.html                       # viewer (copy literal từ template)
    data.js                            # data cho preview.html (regen mỗi lần)
  testcases/                          # ← OUTPUT của /test-cases (skill khác)
    ...
```

Folder `test/checklist/` tạo mới nếu chưa có (parent `test/` cùng level `srs/`, `userstories/`, `ascii-wireframe/`, `usecases/`). `{feature}-checklist-index.md` tạo lần đầu tiên chạy skill, các lần sau append row. `preview.html` copy 1 lần từ template (skip nếu đã tồn tại). `data.js` luôn regen.

## Input context

Skill gom **mọi doc có trong `docs/{feature}/`** làm context, không cần flag chỉ định:

- `brainstorms/*.md` — scenario matrix, decision points, interrupted-tx, state-transitions (early-stage rất giá trị)
- `{feature}-urd.md` — user journeys, success criteria
- `{feature}-brd.md` — business objectives, decision risks, constraints
- `{feature}-prd.md` — capabilities, flows, non-goals
- `srs/{feature}-spec.md` + `srs/{feature}-flows.md` + `srs/{feature}-states.md` + `srs/{feature}-erd.md` — FR/NFR/BR/Error Matrix nếu có
- `ascii-wireframe/{feature}-wireframe-index.md` + screen content (gộp theo flow trong `{flow-slug}.md` — đọc đúng block `## Screen: {slug}` bên trong) theo scope
- `userstories/{feature}-story-index.md` + US MD theo scope
- `usecases/uc-*.md` theo scope
- `integration/api-summary.md` — error catalog API nếu có

Theo scope user chọn:
- **Cả feature** → tất cả docs feature folder.
- **1 màn** → screen MD + linked docs trace qua `links:` hoặc reference trong screen description.
- **1 user story** → US MD + linked FR + screens.
- **1 use case** → UC MD + linked FR + screens.

Nếu feature folder rỗng (chưa có brainstorm) → refuse với gợi ý `/brainstorm` trước.

## Approach

0) **Resolve mode (TRƯỚC mọi thứ).** Parse intent user: "review giùm / chỉ check coverage" → **review mode** (analysis-only, branch xuống section Review mode + **return, KHÔNG intake/generate/Write**). "update/refresh cái cũ" + file tồn tại → update mode (L2 diff). Còn lại → create mode. KHÔNG chạy intake/generate rồi mới nhận ra là review.
1) **Hỏi feature.** Thiếu → list features có sẵn, user chọn số hoặc gõ tên.
2) **Hỏi scope** bằng câu thường: "Anh muốn checklist cho cả feature, 1 màn, 1 user story, hay 1 use case?" — list option có target (vd "1 màn — login / dashboard / settings"). User chọn số.
2bis. **Test strategy intake** — đọc `test/test-strategy.md` nếu có:
   - **Durable** (môi trường · nguồn data · xử-lý-source-thiếu · device/browser · NFR-threshold · **ngôn ngữ**): no-re-ask thật, chỉ hỏi field thiếu.
   - **Per-run** (mục đích: UAT/smoke/regression · baseline · profile): confirm-1-dòng "Lần trước: {…} — vẫn vậy? (Y/đổi)" (xác nhận giá trị đã có, không hỏi lại từ đầu — cùng pattern rule device ba-conventions Mục 7).
   - Chưa có file → hỏi lần đầu qua AskUserQuestion (3 chiều: mục đích run / đối tượng bàn giao / coverage profile — profile multi, default Core-functional). Baseline "chỉ thay đổi release" → follow-up "lấy từ đâu — CR nào / anh liệt kê?".
   - **Xử lý source thiếu**: assumption CHỈ cho setup không đổi behavior (BA duyệt); KHÔNG assumption cho expected/wording/threshold/side-effect → OQ + block.
   - Intake thu câu trả lời **in-memory**; ghi `test-strategy.md` qua L1 (tạo) / L2 (đổi); không đổi → read-only.
3) **Ngôn ngữ checklist** — lấy từ `test-strategy.md` (durable). Chưa có → hỏi "(1) Vietnamese — default / (2) English / (3) khác", lưu vào strategy. File checklist đã tồn tại → giữ ngôn ngữ hiện có.
4) **Resolve target.** Compute output path. Check file đã tồn tại → hỏi "File checklist đã có rồi, update hay tạo mới đè?" (không bắt user gõ flag).
5) **Gom context** theo scope — **KG chọn nguồn trước (rẻ hơn scan):** chạy `node .claude/skills/kg/engine/kg-query.mjs coverage {feature}` + `facts {feature}` để biết doc/FR/UC nào liên quan scope rồi CHỈ Read các doc đó (VẪN Read đầy đủ prose file đã chọn + mục "Phải Read tay"; `⚠ còn N mục` → `--all`; `KG-ERROR` → gom mọi doc trong `docs/{feature}/` như cũ — tuân `.claude/rules/kg-usage.md`). Refuse nếu folder rỗng (chưa `/brainstorm`).
5bis. **Requirement inventory + coverage build** (nếu có `srs/{feature}-spec.md`):
   - Parse spec → inventory FR / BR / NFR / E (+ `states.md` transitions nếu có).
   - Mỗi requirement → *nghĩa vụ test*, CHỈ liệt kê nhánh có **evidence chữ** trong spec/UC:
     - FR → happy + alternate (nếu spec nói).
     - BR → từng nhánh decision CÓ trong spec (vd fail 1/2, fail≥3). Nhánh nghi-có mà spec-không-nói → dòng `OQ — hỏi BA`, KHÔNG tự đếm, KHÔNG bịa `else`.‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍
     - E → message + recovery + side-effect (mỗi cái spec có).
     - NFR **định tính** (loading/a11y/responsive cơ bản — không cần số) → thuộc BASELINE, luôn cover, KHÔNG tbd. NFR **định lượng** (performance có threshold) → chỉ khi profile Performance bật + có threshold, else `tbd`.
   - Dựng bảng `## Coverage` (per-obligation) — điền CHK-ID khi item được sinh ở bước 8. Đọc `test/api/api-checklist.md` (nếu có) cột Ref → điền Tầng=API cho obligation API đã cover; chưa có/Ref trống → Tầng `—`, KHÔNG suy "API đã cover".
   - **Gate (công thức closure)**: `eligible` = obligation in-scope KHÔNG `excluded-approved` (excluded loại KHỎI mẫu số). Scope đóng được khi **mọi `eligible` = `covered`** (không còn `blocked`/`tbd`/`partial`). Còn `blocked/tbd/partial` → cảnh báo ở L1, BA quyết cover/loại (loại = chuyển `excluded-approved` có lý do+ngày).
   - **Khóa hàng coverage** = `(Source ID, obligation, scope, tầng)`. 1 obligation nhiều CHK/scope → **danh sách CHK trong 1 ô** (không nhiều row trùng). Retire CHK → reconcile row coverage cùng lúc (bỏ CHK khỏi ô; ô rỗng → state về `blocked`).
6) **Identify user flow** start→end:
   - Scope `screen` → flow trong/ra screen (entry → interaction → exit/next-screen).
   - Scope `story` → flow trong US (precondition → action → expected result + alternate paths).
   - Scope `uc` → numbered steps Mục d Expected Result + branches.
   - Scope `feature` → tổng hợp flow chính + flow phụ từ PRD/SRS.
7) **Auto-build category structure** — **category/subcategory = flow-phase HOẶC cross-cutting concern** (KHÔNG phải kỹ thuật thiết kế; xem section "Taxonomy"). Kỹ thuật (happy/BVA/decision-table/state) là **thuộc tính phủ nội bộ** áp TRONG mỗi category, không phải heading riêng. **Baseline invariant LUÔN có** bất kể profile; profile chỉ MỞ RỘNG độ sâu:
   - **Baseline (luôn):**
     - `#1. {Main flow step 1..N}` (flow-phase) — theo user flow (vd "Truy cập Login" → "Nhập credentials" → "Submit + xử lý response"), mỗi step happy trước, error/edge sau. TRONG mỗi step áp kỹ thuật phủ: happy · alternate · validation · **BVA** · **equivalence** · **decision-table** (BR) · **state-transition** (entity có state) · negative — nhưng KHÔNG tạo heading theo kỹ thuật.
     - `#{k}. Validation & Error handling` — boundary/empty/format-invalid/error states (từ Error Matrix).
     - `#{k}. Security cơ bản` — auth required, role, session (KHÔNG pentest — chỉ acceptance check).
     - `#{k}. Loading & response` — loading state, slow network (assertion định lượng CHỈ khi có threshold).
     - `#{k}. Accessibility cơ bản` — keyboard nav, focus order, label.
     - `#{k}. Responsive cơ bản` — breakpoint chính, layout không vỡ.
     - `#{k}. Edge cases` — double-submit, back button, refresh giữa flow, network drop, expired session, concurrent.
     - `#{k}. Application chrome` (Header/Footer) — **CHỈ khi source xác nhận app-wide** (không tự bịa cho feature mới brainstorm / non-web).
   - **Profile mở rộng (chỉ khi bật ở test-strategy):** Security sâu · Accessibility đầy đủ (contrast/screen-reader) · Integration-E2E · Performance (threshold-based). Regression = tag chọn lại (không category mới); Exploratory = charter riêng (KHÔNG ép 1:1).
8) **Generate items** mỗi subcategory:
   - **1 item = 1 nghĩa vụ ATOMIC** (xem Constraint "1 item atomic"): cùng precondition + action + **MỘT** pass/fail oracle. CẤM "hoặc / nếu có / nếu spec / dấu hỏi" trong item đã chốt. Behavior đối lập (happy vs error) hoặc oracle khác → **tách item riêng** (mỗi item CHK-ID riêng).
   - Priority: Critical (P1) cho core flow + security + data integrity; High (P2) cho main UX; Medium (P3) cho secondary; Low (P4) cho cosmetic/rare.
   - Automatable: `[Yes]` cho click/visibility/input/navigation/response-code — tức **quan sát được qua UI/response mà Playwright tự chạy**. `[No]` khi cần: DB inspection (vd "fail counter +1" không hiện trên UI), concurrency/race, timing/measurement design (2 case response-time tương đương), visual/contrast cảm tính, system perf metric, webhook chờ async, UX heuristic. Nghi ngờ → `[No]` (an toàn).
   - GIỮ button label / field name nguyên gốc (vd "Verify clicking nút **Đăng nhập** redirects sang Dashboard" — "Đăng nhập" giữ vì là label thật, "Dashboard" giữ vì screen name).
   - **Item ID `CHK-{feature}-NNN`** — cấp từ `next_chk_id` ở index (KHÔNG "max+1 trong file", KHÔNG renumber). Xóa item → ID vào `## Retired CHK-IDs`, KHÔNG lấp gap, KHÔNG reuse. Unique toàn feature. Trace key cho `/test-cases` + edge KG (checklist→FR).
   - **Ref → 1 hoặc nhiều FR/BR/NFR/E** phẩy-phân-tách (vd `→ FR-{feature}-003, E-{feature}-003` khi item verify đồng thời nhiều requirement). Item không map requirement cụ thể (a11y/visual/perf chung) → `→ —`. Nguồn edge VERIFIES + coverage.
   - **Validator (gate trước L3)** — scan RAW mọi dòng không rỗng/không-header: PHẢI match grammar (regex cụ thể, `{feature}` thay literal):
     `^\[[1-4]\] \[(Yes|No)\] CHK-{feature}-\d{3,} → (—|(FR|BR|NFR|E)-{feature}-\d{3,}(, (FR|BR|NFR|E)-{feature}-\d{3,})*) · .+$`  (tối thiểu 3 chữ số, cho phép ≥1000)
     Dòng không match → báo `file:line: <nguyên văn>`, KHÔNG render L3 tới khi fix.
     - CHK-ID: literal prefix `CHK-{feature}-`, unique toàn feature (scan mọi `checklist-*.md`), ≤ projected-next (giá trị đã cấp in-memory), **KHÔNG nằm trong `## Retired CHK-IDs`** (reject reuse retired).
     - Ref (mỗi ID ≠ —): phải tồn tại trong `srs/{feature}-spec.md` (else ref-ma → fail).
     - ≥1000: dùng 4 chữ số (pad tự nới), KHÔNG bế tắc — CHK-ID unique toàn feature nên tách file KHÔNG tạo namespace mới. (Validator này là tiền đề `kg-build --verify`.)
9) **L3 iterate** render checklist trong chat:
   ```
   [/test-checklist] Phiên bản 1:
   (Ví dụ giả định web app THẬT có chrome app-wide → có #1 Header & Footer. Feature non-web / chưa xác nhận chrome → bỏ category này.)

   #1. Header & Footer
     ##1.1. Logo & Navigation
         [1] [Yes] CHK-{feature}-001 → — · Verify logo hiển thị đúng tại header
         [2] [Yes] CHK-{feature}-002 → — · Verify click logo redirect về Home
         [2] [Yes] CHK-{feature}-003 → FR-{feature}-012 · Verify navigation menu hiển thị đầy đủ: Dashboard, Profile, Logout
     ...
   (Ghi chú giảng giải — KHÔNG thuộc body file: CHK-001 vs CHK-002 tách vì 2 oracle khác nhau (hiển thị vs navigation); CHK-003 gộp OK vì 1 oracle "menu đủ N mục".)

   Đồng ý / Sửa: <missing scenarios hoặc adjustment> / Hủy:
   ```
   - User `Sửa: thêm case test rate-limit 5 lần fail` → regen v2 (item mới cấp CHK-ID từ next_chk_id, KHÔNG renumber ID cũ). **Chạy lại validator sau MỖI vòng regen** (L3 thêm/sửa item → phải re-check grammar/ID/Ref).
   - Max 3 vòng. Vòng 3 ép chốt.
   - **Validator lần cuối bắt buộc ngay trước L1/Write** (create + update mode) — không có item malformed/trùng ID/ref-ma nào lọt vào file ghi.
10) **L1 plan preview** sau khi user `Đồng ý` — liệt kê **mọi file sẽ ghi** + coverage cảnh báo:
   ```
   Em sẽ ghi:
     - docs/{feature}/test/test-strategy.md          (tạo/cập nhật — nếu intake đổi)
     - docs/{feature}/test/checklist/checklist-{scope-slug}.md   (nội dung)
     - docs/{feature}/test/checklist/{feature}-checklist-index.md (metadata + ## Coverage + next_chk_id)
     - docs/{feature}/test/checklist/data.js         (regen)
     - docs/{feature}/test/checklist/preview.html    (copy template lần đầu)

   Context đọc: brainstorm + URD + 2 screens (chưa có SRS)
   ⚠️ Coverage: {K} obligation chưa map (blocked/tbd) — cover thêm hay đánh excluded-approved? (BA quyết)
   Ghi chú format: checklist dùng grammar CHK mới; file cũ (nếu có) chỉ đọc backward-compat, KHÔNG sinh lại format cũ.

   | # | Category                        | Items | P1 | P2 | P3 | P4 | Auto |
   |---|---------------------------------|-------|----|----|----|----|------|
   | 1 | Header & Footer                 |   4   |  1 |  2 |  1 |  0 | 4/0  |
   | 2 | Truy cập màn Login              |   6   |  3 |  2 |  1 |  0 | 5/1  |
   | 3 | Nhập credentials                |   8   |  4 |  3 |  1 |  0 | 7/1  |
   | 4 | Submit + xử lý response         |   7   |  4 |  2 |  1 |  0 | 6/1  |
   | 5 | Validation & Error handling     |  10   |  5 |  3 |  2 |  0 | 9/1  |
   | 6 | Security & Authorization        |   6   |  5 |  1 |  0 |  0 | 4/2  |
   | 7 | Performance & Loading           |   4   |  1 |  2 |  1 |  0 | 3/1  |
   | 8 | Accessibility                   |   5   |  0 |  2 |  2 |  1 | 1/4  |
   | 9 | Responsive & Visual             |   4   |  0 |  1 |  2 |  1 | 2/2  |
   |10 | Edge cases & rare scenarios     |   6   |  2 |  2 |  2 |  0 | 5/1  |
   |   | **Total**                       | **60**|22  |20  |13  |  5 |46/14 |

   Changelog route: {self-host | {feature}-checklist-index.md với prefix [{prefix}]}

   Apply? (Y / sửa)
   ```
11) **Write/update `{feature}-checklist-index.md`** (master metadata) — tạo mới nếu chưa có, append row vào bảng nếu đã có. (Trước Write: set env `CLAUDE_CHANGELOG_NOTE=generated {N} items ({M} categories) cho checklist-{scope-slug}` để hook ghi changelog.md — KHÔNG viết dòng này vào file.) Nội dung file:
   ```yaml
   ---
   type: test-checklist-index
   feature: {feature}
   status: draft
   updated: {date}
   next_chk_id: 61           # integer KHÔNG padding (render ID = pad-3); khởi tạo 1 lần đầu
   links: [docs/{feature}/{source-docs-used}]
   ---

   # Test Checklists — {feature}

   ## Checklists

   | Scope | Target | File | Items | P1 | P2 | P3 | P4 | Auto | Status | Updated |
   |-------|--------|------|-------|----|----|----|----|------|--------|---------|
   | feature | — | [checklist-feature.md](checklist-feature.md) | 60 | 22 | 20 | 13 | 5 | 46/14 | draft | {date} |
   | screen | login | [checklist-screen-login.md](checklist-screen-login.md) | 28 | 10 | 9 | 6 | 3 | 22/6 | draft | {date} |

   ## Coverage

   > Đối chiếu nghĩa vụ test ↔ CHK (per-obligation). Nguồn edge VERIFIES cho KG. Coverage table là **bản đồ điều hướng**, KHÔNG phải nguồn nội dung TC. Tầng: UI · API · —. Trạng thái: covered · excluded-approved · blocked · tbd · partial.

   | Source ID | Nghĩa vụ (obligation) | Scope | CHK-ID | Tầng | Trạng thái | Lý do (nếu excluded) |
   |-----------|----------------------|-------|--------|------|-----------|----------------------|
   | FR-{feature}-003 | happy: login đúng → session | feature | CHK-{feature}-021 | UI | covered | — |
   | E-{feature}-003 | message generic | feature | CHK-{feature}-027 | UI | covered | — |
   | E-{feature}-003 | side-effect: fail counter +1 | feature | CHK-{feature}-030 | UI | covered | — |
   | BR-{feature}-006 | branch fail≥3 → captcha | feature | CHK-{feature}-034 | UI | covered | — |
   | NFR-{feature}-002 | response time threshold | feature | — | — | excluded-approved | ngoài baseline (BA duyệt {date}) |

   ## Retired CHK-IDs

   > ID của item đã xóa — KHÔNG reuse, KHÔNG lấp gap. List máy-đọc (validator reject nếu item sống mang ID ở đây).

   | CHK-ID | Retired date | Lý do |
   |--------|--------------|-------|
   | CHK-{feature}-058 | {date} | gộp vào CHK-{feature}-021 |

   (Chưa có item nào bị xóa → giữ bảng rỗng, KHÔNG bỏ section — validator vẫn đọc header.)
   ```
12) **Write `checklist-{scope-slug}.md`** — **zero frontmatter**, chỉ body checklist plain text đúng format spec. KHÔNG code block bọc, KHÔNG title H1 dẫn nhập (parser ngoài kỳ vọng nội dung thô từ dòng đầu).
13) **Activity.log (hook tự ghi)** — set env `CLAUDE_SKILL_NAME=/test-checklist` + `CLAUDE_CHANGELOG_AUTHOR={@author}` + `CLAUDE_CHANGELOG_NOTE=generated {N} items ({M} categories)` (≤80 ký tự; update mode: `[{scope-slug}] updated {N} items, added {M} new`) trước Write; hook ghép cả dòng.
14) **Generate `preview.html` + `data.js`** (self-contained viewer) — xem section "Preview HTML" dưới.
15) **Final report** — kèm hint "Bước tiếp theo: `/test-cases {feature}` để sinh test case chi tiết từ checklist này."
    ```
    ✅ Checklist created
       Master:    docs/{feature}/test/checklist/{feature}-checklist-index.md
       Content:   docs/{feature}/test/checklist/checklist-{slug}.md
       Preview:   docs/{feature}/test/checklist/preview.html  (double-click mở browser)
       Data:      docs/{feature}/test/checklist/data.js       (auto-loaded bởi preview.html)
       {N} items / {M} categories
       Priority: P1={a} P2={b} P3={c} P4={d}
       Automatable: Yes={x} No={y}

    Recommended next:
      - /test-cases {feature}   — expand checklist → test case chi tiết (bám sát 1:1, UI)
      - /api-checklist {feature} — nếu SRS có endpoint own / feature tích hợp API (tầng API chưa cover). {gợi ý này CHỈ in khi coverage phát hiện obligation cần tầng API mà chưa có test/api/}
    ```

    **Nối UI↔API (S12):** nếu bước 5bis coverage thấy feature có endpoint own trong SRS (FR mô tả API) mà `test/api/api-checklist.md` chưa tồn tại → obligation đó ghi Tầng `—` + in cảnh báo "obligation X cần tầng API, chạy /api-checklist". Không tự suy "API đã cover".

## Taxonomy loại test (4 trục — KHÔNG danh sách phẳng)

**Vai trò khác nhau — đừng lẫn:**
- **Category/subcategory** (heading checklist) = **flow-phase** (bước trong luồng) HOẶC **cross-cutting concern** (Validation, Security cơ bản, Loading, A11y, Responsive, Edge, Chrome).
- **Kỹ thuật thiết kế scenario** = thuộc tính phủ áp TRONG mỗi category (happy/BVA/decision-table/state-transition...), KHÔNG phải heading.
- **Quality attribute + system-boundary + cách-dùng** = dimension/tag quyết định *độ phủ* (profile ở test-strategy), KHÔNG phải category.

| Trục | Loại | Vai trò |
|---|---|---|
| **Thiết kế scenario** | happy · alternate · validation · negative/error · **BVA** · **equivalence** · **decision-table** (BR) · **state-transition** · authorization · data-integrity · idempotency/concurrency · recovery | thuộc tính phủ TRONG category (không heading) |
| **Mức / system boundary** | screen-UI · cross-screen E2E · API/integration · 3rd-party · cross-device/session | dimension; E2E/integration bật qua profile |
| **Quality attribute** | security · performance · reliability · accessibility · responsive | dimension; performance chỉ khi có threshold; security = acceptance, KHÔNG pentest |
| **Cách dùng** | smoke · **regression (tag chọn lại)** · manual · automation-candidate · **exploratory (charter riêng)** | tag; regression=subset đánh dấu; exploratory=charter (mục tiêu+timebox+heuristic), KHÔNG ép 1:1 |

**Baseline invariant (luôn có) vs profile (mở rộng):**
- Baseline: core flow · validation/error · security cơ bản · loading · a11y cơ bản · responsive cơ bản · chrome (nếu app-wide).
- Profile bật thêm độ sâu: Security sâu · A11y đầy đủ · Integration-E2E · Performance (threshold). Profile KHÔNG BAO GIỜ làm baseline ít đi.

**Regression + Exploratory — KHÔNG phải category, có chỗ riêng:**
- **Regression** (Đợt 1): là **filter tạm theo priority/risk** khi chạy, KHÔNG phải tag máy-đọc riêng (tránh over-engineer). Muốn tập regression → lọc P1/P2 hoặc obligation liên quan change-set. (Tag regression chính thức để Đợt sau nếu cần.)
- **Exploratory**: output CHARTER riêng `test/exploratory/charter-{scope}.md` (mục tiêu + timebox + heuristic + evidence cần thu) — **KHÔNG đưa vào cardinality CHK↔TC**, KHÔNG ép 1:1. (Skill này chưa sinh charter — chỉ ghi nhận vị trí; sinh charter là mở rộng sau.)

## Preview HTML (`preview.html` + `data.js`)

Double-click `preview.html` mở browser file:// trực tiếp (KHÔNG cần server). Viewer reference `data.js` qua `<script src="data.js">` tag (file:// CHO PHÉP load JS sibling — chỉ `fetch()` bị block).

**Template:** `_templates/test-checklist-preview.html` — **self-contained (KHÔNG CDN cho CSS/layout, mở offline vẫn đẹp)**, bảng gọn light/dark theme + filter/search/pagination + Export Excel (SheetJS nạp lazy chỉ khi bấm). Skill **KHÔNG gen HTML** — chỉ copy literal.

**Comment trên từng item:** mỗi hàng có nút 💬 mở ô ghi chú; comment lưu `localStorage` (key `chk-comments::{feature}`, KHÔNG đụng file MD), **neo theo CHK-ID** (khóa bền). Nút **📋 Copy toàn bộ comment** sinh **block feedback tự-hành**: preamble hướng dẫn AI + header `FEEDBACK-PREVIEW · checklist · feature=… · updated=…` + N dòng `- [CHK-ID | ref=… | file=…] "trích" → comment`. User dán vào chat → AI vào **Feedback intake mode** (xem section riêng). Filter "Comment: chỉ có / chưa" + nút "Xoá hết".

**Cách skill produce 2 file (cheap, ít token):**

1) **`preview.html`** — nếu chưa tồn tại, copy literal từ `_templates/test-checklist-preview.html`. Nếu đã có, skip (không đè để user customize được). User muốn force refresh template → xoá file rồi re-run. **Bản CŨ** (nạp `cdn.jsdelivr.net/npm/bootstrap` / không có nút 💬 `id="copyComments"`) → đề xuất user xóa để copy lại bản hiện hành.
2) **`data.js`** — luôn regen từ đầu:
   - Đọc TẤT CẢ `checklist-*.md` trong `test/` folder hiện tại.
   - Parse grammar chốt `[P] [Auto] CHK-{feature}-NNN → {ref} · text` per item (Ref → mảng khi nhiều ID), gom theo category headers (`#1. ...` / `##1.1. ...`). (Format cũ `[priority] [Yes/No] N. text` — backward-compat: gặp item không có `CHK-` thì fallback dùng `num` + IN cảnh báo "legacy item, chạy lại /test-checklist để ổn định trace"; KHÔNG crash preview.)
   - Build mảng JS:
     ```js
     window.FEATURE = "payment";
     window.UPDATED = "2026-05-28";
     window.CHECKLISTS_DATA = [
       { scope: "feature", target: "", file: "checklist-feature.md",
         items: [
           { chk: "CHK-payment-001", ref: ["FR-payment-012"], category: "Header & Footer", subcategory: "Logo & Navigation",  // ref LUÔN là mảng (0..n ID; item `→ —` → [])
             priority: 1, auto: "Yes", text: "Verify logo hiển thị đúng..." },
           ...
         ]
       },
       { scope: "screen", target: "login", file: "checklist-screen-login.md",
         items: [ ... ]
       }
     ];
     ```
   - Write ra `docs/{feature}/test/checklist/data.js` (đè).

**Browser load flow:** mở `preview.html` → `<script src="data.js">` load → set `window.CHECKLISTS_DATA` → script render đọc từ đó. Mỗi lần mở HTML = đọc data.js mới nhất trên disk (không cache vì file:// thường no-cache).

**Filter `Checklist file` đã có sẵn trong template** — dropdown bên cạnh Scope/Category, list tên file MD (vd `checklist-feature.md`, `checklist-screen-login.md`). User chọn 1 file để xem riêng hoặc "Mọi file" để gom tất cả.

**Refresh data sau khi sửa MD:**
- User edit MD trực tiếp → preview KHÔNG tự cập nhật (browser không đọc được MD qua file://).
- Phải chạy lại `/test-checklist <feature>` để skill regen `data.js`.
- Nếu cần realtime đọc MD → chạy local server (vd `python -m http.server` trong folder `test/`) rồi mở `http://localhost:8000/preview.html` — out of scope skill, nhưng template vẫn hoạt động với server vì `<script src>` cùng origin.

**Limitations:**
- File `data.js` lớn nếu checklist >1000 items. Trade-off cho self-contained.
- Read-only viewer (không write-back MD).
- Sửa UI/style preview = sửa template trong `_templates/`, KHÔNG sửa per-feature file.

## Review mode (khi user nói "review giùm" / "chỉ check coverage")

KHÔNG edit file. Đọc checklist hiện tại + sources → output findings:
- **BLOCKING** — thiếu **baseline invariant** (core flow, validation/error, security cơ bản, loading định tính, a11y cơ bản, responsive cơ bản, edge). KHÔNG block vì thiếu perf-threshold / contrast / header-footer (những cái này chỉ mandatory khi profile bật / source xác nhận app-wide).
- **WARNING** — priority misassigned (vd login auth marked P3), automatable flag sai (vd "verify color contrast" marked Yes), category quá nhỏ (<2 items / subcategory).
- **SUGGESTION** — case có thể gộp; missing edge case phổ biến (rate limit, concurrent submit, network drop).

Format theo @../../rules/review-format.md.

## Update mode (khi user nói "update lại" / "refresh checklist cũ")

L2 diff per category. Add item mới → cấp `CHK-{feature}-NNN` = `next_chk_id` ở index, rồi tăng `next_chk_id` (**KHÔNG renumber** ID cũ, KHÔNG "max+1 trong file"). Xóa item → thêm ID vào `## Retired CHK-IDs`, KHÔNG lấp gap, KHÔNG reuse. set env note (hook ghi changelog.md): `[{prefix}] updated {N} items, added {M} new`.

## Feedback intake mode (user dán block "FEEDBACK-PREVIEW" từ preview)

Kích hoạt khi user **dán 1 block bắt đầu bằng `### FEEDBACK-PREVIEW · checklist · feature=…`** (sinh bởi nút "📋 Copy toàn bộ comment" trong `preview.html`). Block gồm: preamble hướng dẫn + header định danh (feature/file/updated) + N dòng `- [CHK-ID | ref=… | file=…] "trích" → comment`. **Đây KHÔNG phải yêu cầu sinh mới — là feedback để cập nhật checklist đã có.**

**Nguyên tắc BẮT BUỘC (report-first, HARD STOP — KHÔNG auto-apply):**

1) **Anchor theo CHK-ID** (đầu mỗi dòng, khóa bền). Resolve về item trong `checklist-{scope}.md` thật.
2) **Stale guard.** So `updated=` header block với file trên disk + tập CHK hiện tại. CHK không còn / đã retired / file đã regen → nhóm (F), nêu lý do, KHÔNG map sang item gần giống.
3) **Đối chiếu nghiệp vụ** trước khi đổi wording/ý nghĩa item: mỗi dòng có `ref=FR/BR/NFR/E` → Read prose trong `srs/{feature}-spec.md`. Comment mâu thuẫn requirement đã chốt → nhóm (C).
4) **Phân 6 nhóm rồi IN BẢNG REPORT, DỪNG chờ user duyệt:**
   - **(A) Apply thẳng** — sửa wording/priority/auto 1 item, không đổi số item, không đụng nghiệp vụ. → Edit `checklist-{scope}.md` qua L2 diff.
   - **(B) Thêm/xóa/tách/gộp item** — cấp `CHK-{feature}-NNN` mới từ `next_chk_id` / retire vào `## Retired CHK-IDs` (KHÔNG renumber, KHÔNG reuse ID). Cập nhật `## Coverage`. **Số item đổi → 1:1 vỡ → NHẮC user chạy `/test-cases` mode `sync` regen testcase theo sau.**
   - **(C) CHẶN — lệch nghiệp vụ** — mâu thuẫn FR/BR/NFR/Error Matrix → trích điều khoản + route `/cr`, KHÔNG sửa. (Ví dụ authentication: "bỏ thông báo trung lập forgot-password" phá `NFR-007`/`BR-008` anti-enumeration; "bỏ case thu-hồi-session sau reset" bỏ `BR-007` security.)
   - **(D) Route skill khác** — đòi sửa SRS/wireframe/flow → nêu skill đích, KHÔNG tự làm.
   - **(E) Cần làm rõ** — mơ hồ → hỏi lại, KHÔNG đoán.
   - **(F) Bỏ qua** — CHK không tồn tại / retired / stale → nêu lý do.
5) **Phát hiện xung đột** giữa các comment trong batch → mục riêng, user chọn.
6) **Apply chỉ nhóm (A)** sau duyệt (L1 → L2 diff). "Y all" chỉ áp (A). Sau apply: regen `data.js` + cập nhật index (`next_chk_id`, `## Coverage`, `## Retired CHK-IDs`). **Không im lặng nuốt comment** — mọi dòng hiện trong report. Xong → gợi ý user "🗑 Xoá hết" trên preview.

## References

- @../../rules/feature-bootstrap.md
- @../../rules/ba-conventions.md
- @../../rules/approval-gate.md
- @../../rules/kg-usage.md
- @../../rules/naming-conventions.md
- @../../rules/delivery-readiness.md
- @../../rules/changelog.md
- @../../rules/review-format.md‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍


<!-- wm:2b9af6c9b691879b1ddb7a04d29a1c88 -->
<sub>Tài liệu thuộc bộ AI4BA BA-Kit — bản quyền ai4ba.com</sub>
