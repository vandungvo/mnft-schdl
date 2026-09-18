---
name: doc-drift
description: "Dùng khi cần kiểm code dev có khớp bộ docs BA không — so code với docs/{feature}/ rồi ra 1 file report phân loại Pass/Missing/Mismatch/Extra/Unverifiable kèm cite file:line, cho cả từng feature lẫn integration liên feature. `/doc-drift <feature> --code <path>` hoặc `--all`."
allowed-tools: Read, Write, Bash, Glob, Grep
user-invocable: true
disable-model-invocation: true
argument-hint: "<feature> --code <path> | --code fe:<p> be:<p> | --all --code <path>"
---
<!-- Licensed to vandungvo2003@gmail.com — Order YYWVQ3VWE -->

# /doc-drift — Code dev có khớp docs BA không?‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

## Goal‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

Trả lời __đúng một câu hỏi__: *"code dev đã làm có KHỚP với bộ docs BA của feature này không — thiếu case
nào, lệch chỗ nào?"* — rồi ra __1 file report read-only__ để user ĐỌC và __tự quyết__ mỗi finding: sửa docs
(route `/cr`) hay báo dev fix/bổ sung code. Skill __KHÔNG tự sửa docs, KHÔNG tự sửa code, KHÔNG tự tạo CR__.

Bám __2 tầng__: (1) drift trong __từng feature__, (2) drift __integration liên feature__ (chỗ 1 feature phối
hợp feature khác, hoặc FE↔BE nối nhau — nơi drift dễ bỏ sót nhất).

Đây KHÔNG phải:
* `/code-to-srs` — đọc code để __SINH__ docs mới (một chiều, tạo). `/doc-drift` nhận docs ĐÃ CÓ làm baseline.
* `/gap` — soi thiếu luồng __bên trong__ docs (không đọc code). `/doc-drift` kiểm docs trước __code thật__.
* `/cr` — phân tích tác động __thay đổi docs__ (không đọc code). `/doc-drift` chỉ phát hiện + cite, không sửa.

```
/code-to-srs : code  → SINH docs mới          (một chiều, tạo)
/gap         : docs  → soi thiếu luồng         (nội bộ docs)
/doc-drift   : code ⇄ docs-có-sẵn → drift      (đối chiếu 2 chiều)   ← đây
```

## Constraints‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

### Hard rules — never violate‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

* __READ-ONLY tuyệt đối với code + docs baseline.__ Output DUY NHẤT = 1 file report trong `docs/reports/doc-drift/`.
  KHÔNG sửa docs, KHÔNG sửa code, KHÔNG tự tạo `/cr`. Report chỉ nêu finding + gợi ý hướng xử lý — user quyết.
* __Code read-only, KHÔNG ghi vào repo nguồn.__ Codebase có thể ở ổ/repo khác. Git URL → clone read-only vào
  scratchpad. Mọi Write dùng đường dẫn tuyệt đối tới workspace BA (nơi có `CLAUDE.md`).
* **Baseline = docs chính thức `docs/{feature}/`** (KHÔNG phải `docs/_reverse/`). Feature không có docs →
  Nhóm C (feature-bootstrap): friendly abort + route **`/srs`** (sinh baseline `docs/{feature}/srs/` dùng được
  ngay). Chưa có gì thì `/code-to-srs <path>` dựng bản nháp ở `docs/_reverse/`, RỒI `/srs` hình thức hóa thành
  `docs/{feature}/` — vì `/doc-drift` so với baseline chính thức, KHÔNG so với `docs/_reverse/`. KHÔNG tự tạo feature.
* __Taxonomy 5 nhãn 2 chiều__ (xem Mục "Taxonomy"). `Unverifiable` KHÔNG bao giờ bị ép thành Missing/Extra.
* __CHỐNG BỊA (quan trọng nhất)__ — mọi finding neo `file:line` THẬT. `Missing`/`Extra` CHỈ in khi đã chứng
  minh "đã tìm mà không thấy" (nêu pattern đã grep + tập file đã đóng). Xem Mục "Chống bịa".
* __Tách extract khỏi phán (chống LLM overcorrection — 2 paper ASE'25):__ Phase C CHỈ trích evidence thô,
  KHÔNG phán. Phase D CHỈ phán trên evidence đã đóng băng, KHÔNG mở thêm tìm kiếm để "chống chế".
* __Chống-miss trong flow (user chốt):__ Phase A2 lập PLAN checklist + gate; Phase D2 VERIFY tự soi trước
  report. Không phase nào được bỏ. Xem 2 phase đó.
* __IT-BA framing__ (`ba-conventions` Mục 3) — kết luận + hướng xử lý bằng __business language__; endpoint/
  tên function/tên bảng CHỈ ở cột **`Code cite`** (`file:line`) của report, KHÔNG phơi ra prose finding.
* __KG chỉ chọn file phía docs__ (`kg-usage.md`) — KG không ingest code; code-scope đi qua `code-explorer` +
  `stacks-reference`. Mọi kết luận nội dung dựa prose đã Read, không dựa facts.
* __L1 approval__ trước Write report. (v1 làm hết trong main thread, KHÔNG spawn agent — vì thế `allowed-tools`
  KHÔNG có `Task`. Agent `drift-reviewer` để dành v2, khi bật mới thêm `Task`.)
* **`--all` phải LẶP tuần tự per-feature, KHÔNG gộp đọc toàn `docs/*/` cùng lúc** (chống tràn context + miss).
  Orchestration `--all` tường minh:
  1. __TRƯỚC vòng lặp:__ liệt kê MỌI feature sẽ kiểm vào 1 sổ tổng (feature | status: pending/done/skipped/error)
     → __1 GATE gộp__ cho user xác nhận danh sách feature (KHÔNG gate lại A2 từng feature — tránh hỏi N lần).
  2. __Mỗi feature:__ chạy trọn Phase A2→D2 độc lập (A2 lập checklist per-feature nhưng KHÔNG gate lại), giữ
     finding + evidence tạm trong scratchpad (per-feature + per-cạnh-integration). Cập nhật status trong sổ.
  3. __Phase E:__ ghép integration cross-feature (union-reconcile, xem Phase E) + dựng 1 file toàn hệ + bảng `## Đã kiểm`.
  KHÔNG lập 1 checklist khổng lồ cho mọi feature ở A2 (mỗi feature 1 checklist riêng trong vòng lặp).

### Pitfalls — easy to get wrong‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

* __Baseline demo:__ `docs/` hiện có thể là demo skill cũ (memory `project_vault_demo_rebuild`) — spec tên
  trần `srs/spec.md` thay vì `srs/{feature}-spec.md`. Đọc file nào tồn tại; đừng báo "thiếu spec" nhầm.
* __Monorepo:__ 1 path chứa cả FE+BE → vẫn 1 path, KHÔNG tự tách thành cross-repo trừ khi user dùng `fe:`/`be:`.
  Cross-repo drift trong monorepo vẫn soi được ở Phase B (call chéo module) nếu code-scope phủ cả 2.
* __KHÔNG chạy code/test__ — chỉ đọc tĩnh. Test là evidence hành vi (đọc assertion), không execute.
* __Git clone thất bại / repo private__ → báo user cấp path local hoặc token, KHÔNG tự đoán nội dung.
* __Report là snapshot theo thời điểm+ref__ — luôn in `{repo}@{ref}` + date; kết quả cũ ≠ trạng thái hiện tại.
* **`docs/reports/` bị KG loại khỏi walk-scope** — report này KHÔNG thành evidence nghiệp vụ mới, đúng ý đồ.
* __Feature không có docs baseline__ → Nhóm C: *"Chưa có docs cho `{feature}` để so. Chạy `/srs {feature}` để có
  baseline; nếu chưa có gì thì `/code-to-srs <path>` dựng nháp rồi `/srs` hình thức hóa."* `/code-to-srs` ghi
  `docs/_reverse/` (KHÔNG phải baseline) → không được route thẳng nó rồi chạy lại `/doc-drift` (vẫn thiếu baseline).
  KHÔNG tự tạo feature, KHÔNG tự sinh spec.
* **`read-only` với bản clone** = không ghi vào repo nguồn + KHÔNG chạy build/test/lệnh sửa file trên bản clone
  (chỉ Read/Grep/Glob). Bản clone scratchpad thuần để đọc.

## Inputs

```
/doc-drift <feature> --code <path>              # 1 repo/monorepo
/doc-drift <feature> --code fe:<path> be:<path> # đa repo, label vai trò → kích hoạt Phase B2 cross-repo
/doc-drift <feature> --code <git-url>           # clone read-only vào scratchpad
/doc-drift --all --code <path>                  # soi TẤT CẢ feature + toàn mạng integration → 1 file toàn hệ
```

Thiếu `--code` → hỏi codebase ở đâu (KHÔNG lấy cwd làm code — cwd là workspace docs).

## Context (dynamic)

Today: !`date +%Y-%m-%d`
Features: !`ls -d docs/*/ 2>/dev/null | xargs -I{} basename {} | grep -v "^_" | head -20`

## Taxonomy — 5 nhãn, 2 chiều

| Nhãn | Hướng | Nghĩa | Điều kiện kết luận |
|---|---|---|---|
| __Pass__ | docs ⇄ code | Spec & code khớp giá trị/wording | Tìm thấy code evidence khớp value |
| __Missing__ | docs → code | Docs có requirement, code CHƯA làm | Đã đóng scope + negative-search (nêu pattern) không thấy |
| __Mismatch__ | docs ⇄ code | Cả 2 cùng có nhưng lệch value/condition/error/state | Cả 2 vế đều cite được, giá trị khác nhau (*loại quý nhất*) |
| __Extra__ | code → docs | Code có hành vi, docs KHÔNG ghi | Tìm alias trong toàn corpus docs không thấy + negative-search |
| __Unverifiable__ | — | Không đủ bằng chứng tĩnh (runtime config, remote, thiếu source, flag, intent) | Không ép thành Missing/Extra — bucket riêng |

__Nhãn integration (cạnh A→B):__ Pass · Missing-link (docs nói phối hợp, code không nối) · Mismatch-link
(nối nhưng lệch thứ tự/điều kiện/dữ liệu) · Extra-link (code nối, docs không mô tả) · Broken-contract
(shape/enum/error 2 bên lệch — A gửi `paid`, B chờ `PAID`).

## Approach — flow 8 phase

### Phase A — Resolve baseline + code
* Baseline = `docs/{feature}/`. Feature không có docs → Nhóm C friendly abort + route **`/srs`** (baseline dùng
  ngay); hoặc `/code-to-srs` → `/srs` nếu cần dựng từ code trước (xem Constraint — `/code-to-srs` ghi `_reverse/`,
  KHÔNG phải baseline).
* `--code`: folder → dùng thẳng; git URL (cho phép `<url>#<ref>` chỉ branch/tag/commit) → `git clone` read-only
  vào scratchpad, **checkout đúng `<ref>` nếu có** (mặc định default branch) → ghi __ref THẬT__ vào report; đa path (`fe:`/`be:`)
  → giữ label vai trò. Ghi lại `{repo}@{ref}` (commit hash nếu git) để in trong report.
* KG shortlist docs baseline: `kg tour/facts/trace/neighbors {feature}` → __Read FULL prose__ file được chọn
  (KHÔNG kết luận từ KG). `⚠ còn N mục` → chạy `--all`. Đọc hết mục `### Phải Read tay`. KG-ERROR → glob `docs/{feature}/**`.

### Phase A2 — PLAN checklist + gate  [chống-miss #1]
* Đọc HẾT docs baseline → liệt kê __MỌI mục cần kiểm__ thành checklist đánh ID:
  * mỗi FR/NFR/BR/Error/validation/UC-branch = 1 dòng "cần kiểm";
  * mỗi cạnh integration (UC Related Requirements cross-feature, flows có actor khác, `links:` cross-feature,
    `integration/api-design.md` nếu có) = 1 dòng "cần kiểm".
* In checklist + đếm: *"Sẽ kiểm N mục (X FR · Y BR · Z Error · W integration). Đủ chưa / bổ sung / loại mục nào?"*
* __GATE:__ chờ user xác nhận. Checklist này thành __khung report__: mỗi dòng BẮT BUỘC có kết luận ở Phase E —‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍
  không dòng nào biến mất im lặng (Phase D2 kiểm lại điều này).

### Phase B — Map code  (tái dùng `code-explorer` + `stacks-reference`)
* **Tái dùng CÓ CHỌN LỌC — KHÔNG chạy trọn luồng `/code-to-srs`:** dùng `code-explorer` __Phase A.1/A.2__
  (đếm quy mô repo + detect stack) + __danh sách route/controller__ để KHOANH code-scope cho feature ĐÃ BIẾT
  (từ arg). __KHÔNG__ chạy cluster-feature + GATE-SCOPE + xuất `reverse-plan.json` (đó là việc `/code-to-srs`).
* `stacks-reference`: recipe bóc fact theo stack. Cite `file:line` __đầy đủ repo-relative__ (KHÔNG bare basename).
* __ĐỊNH NGHĨA "scope đã đóng" cho 1 requirement (điều kiện bắt buộc của Missing/Extra):__ negative-search cho
  requirement đó chỉ __đóng__ khi đã grep pattern trên CẢ (a) cluster route-first của feature LẪN (b) các vị trí
  cross-cutting app-global: middleware/interceptor, guard/decorator đăng ký, worker/job/cron/queue, shared util/
  lib, i18n catalog, config/env. __GHI tường minh nhóm file đã quét__ trong log. Chỉ grep trong cluster hẹp →
  scope CHƯA đóng → KHÔNG được kết luận Missing/Extra (hạ xuống Unverifiable + note "chưa quét ngoài cluster").
* __GHI negative-search log__: pattern đã grep · nhóm file đã quét · phạm vi (cluster hay toàn repo) — nguồn cho Missing/Extra.

### Phase B2 — Cross-repo contract match  (CHỈ khi `--code` có ≥2 path)
* Trích API surface mỗi repo: FE call-site (fetch/axios/httpClient) + endpoint string; BE route/controller path.
* Match theo __endpoint signature (method+path) + DTO/field__ — KHÔNG match theo tên biến/hàm (trùng tình cờ).
* __Giới hạn v1 (chống bịa):__ chỉ match được khi endpoint là __path tĩnh/hằng số grep ra được__. Path ghép động
  (base-URL runtime, biến nội suy) → __Unverifiable-link__ + note "path động không grep tĩnh được", KHÔNG ép
  Broken-contract/Mismatch-link. `stacks-reference` chưa có recipe FE-call-site tổng quát → grep generic (`fetch(`,
  `axios.`, `.get(`/`.post(`) + đọc chuỗi literal; không thấy literal → Unverifiable-link.
* Ra cạnh integration FE↔BE với nhãn integration. 1 path → skip phase này (phạm vi đã kiểm thể hiện ở dòng __Scope code__ đầu report, không chèn blockquote lưu ý).

### Phase C — Extract evidence  [tách 1/2 — CHỈ trích, KHÔNG phán]
* __C.1 (chiều docs→code):__ với mỗi mục PLAN checklist → trích __GIÁ TRỊ THÔ__ từ code (số, message, enum,
  đoạn, dòng) — càng ít suy luận càng tốt. Cite `file:line` đầy đủ.
* __C.2 (chiều code→docs — cho Extra):__ quét toàn code-scope liệt kê validator/guard/constant/error/route/
  middleware __KHÔNG khớp mục checklist nào__ → __tập ứng viên hành vi-code-chưa-có-trong-docs__ (chỉ TRÍCH,
  chưa phán). *Bắt buộc có C.2 riêng: Extra theo định nghĩa nằm NGOÀI checklist docs-lái — nếu chỉ trích theo
  checklist (C.1) thì Extra KHÔNG BAO GIỜ được phát hiện.*
* Đặc thù (từ `stacks-reference`): test active = evidence hành vi (KHÔNG chạy test) / test skip = hạ tin cậy;
  i18n resolve wording lỗi thật (cite throw-site + catalog); dead-code/flag → nghi vấn + negative-search (KHÔNG auto-Extra).

### Phase D — Compare value  [tách 2/2 — CHỈ nhìn evidence Phase C, KHÔNG đọc thêm code]
* So giá trị đã-trích (C.1) với spec bằng __rule đơn giản__ (số/chuỗi/exact-message) → gán 1 trong 5 nhãn.
* Chiều Extra: mỗi ứng viên __C.2__ → tìm alias trong toàn corpus docs (negative-search) → không thấy = Extra.
* __RÀNG BUỘC:__ lượt phán KHÔNG mở thêm tìm kiếm để "chống chế" kết luận; thiếu evidence → Unverifiable.
* __NFR/flow (hybrid — SIẾT):__ chỉ gán Pass/Mismatch cho NFR khi trích được __GIÁ TRỊ SỐ/NGƯỠNG cụ thể__ trong
  code (cite được) VÀ so trực tiếp với ngưỡng NFR trong spec (đơn vị khớp). Chỉ thấy __cơ chế tồn tại__
  (middleware/test/config CÓ TÊN liên quan nhưng không trích được giá trị) → __Unverifiable__ + note, KHÔNG suy
  ra Pass. Không thấy gì → `Unverifiable` + note lý do. KHÔNG suy diễn gián tiếp.

### Phase D2 — VERIFY tự soi (self-check)  [chống-miss #2]
* Đối chiếu ngược __PLAN checklist__ (Phase A2): MỌI dòng "cần kiểm" đã có kết luận chưa? Dòng thiếu → quay lại kiểm.
* __Kiểm CƠ HỌC (rẻ, không dựa LLM tự tin):__ với MỖI finding → Read lại đúng `file:line` đã cite (±3 dòng), đối
  chiếu chuỗi đã trích có THẬT ở đó. Cite không khớp nội dung → loại/hạ ngay. Đây là hàng rào chính vì D2 do
  chính LLM vừa tạo finding tự soi (v1 chưa có agent độc lập) — kiểm-được-máy mới đáng tin, không phải LLM tự khen.
* Mỗi finding tự soi thêm:
  * Missing/Extra đã có negative-search __scope-đóng đúng nghĩa Phase B__ (đã quét cả cross-cutting middleware/
    worker/guard/i18n/config) chưa? → chưa → hạ xuống Unverifiable + note "chưa quét ngoài cluster {X}", KHÔNG in Missing chắc chắn.
  * Mismatch: cả 2 vế docs+code đều cite được chưa? → 1 vế thiếu → không phải Mismatch.
  * Unverifiable có bị ép nhầm thành Missing/Extra không? → đảo chiều nếu có.
* Finding không qua self-check → loại hoặc hạ nhãn. __GHI số finding bị loại/hạ vào report__ (minh bạch).
* __[v2 — chưa bật]__ report lớn / cần chắc hơn → spawn agent `drift-reviewer` phản biện độc lập từng finding.

### Phase E — Report  (L1 approval trước Write)
* **Với `--all`: đối chiếu integration cross-feature TRƯỚC khi dựng report** (vì D2 per-feature chỉ soi trong
  từng feature): gom MỌI cạnh integration đã xuất hiện ở checklist A2 của BẤT KỲ feature nào thành 1 tập hợp
  (union), rồi kiểm mỗi cạnh union có đúng 1 kết luận trong bảng integration đã ghép chưa — cạnh có trong
  checklist mà mất khỏi bảng cuối = flag "cạnh integration bị rớt khi ghép". Cạnh cần scope cả 2 đầu → giữ
  evidence 2 đầu trong scratchpad (per-cạnh), 1 đầu chưa có scope → mở lại scope feature đó, KHÔNG kết luận link giả.
* Dựng từ `_templates/doc-drift-report.md`. Thứ tự: Verdict → Phần 1 (per-feature: mỗi feature 1 khối
  `### Feature: {name}` với Mismatch → Missing → Extra → Unverifiable → Pass tóm tắt) → Phần 2 integration +
  sơ đồ mermaid → Phần 3 evidence index. `--all` thêm bảng `## Đã kiểm` (feature | status | #findings).
* __L1 plan preview__ (BA-friendly, prose) → user Y → Write:
  * per-feature: `docs/reports/doc-drift/{date}-{feature}-code-drift.md`;
  * `--all`: `docs/reports/doc-drift/{date}-product-code-drift.md`.
* __Report path đã tồn tại__ (chạy lại CÙNG feature TRONG NGÀY → trùng path) → __L2 diff trước khi đè__, KHÔNG
  ghi đè im lặng (theo `approval-gate.md` L2).
* Set env `CLAUDE_SKILL_NAME=/doc-drift` + `CLAUDE_CHANGELOG_NOTE` + `CLAUDE_CHANGELOG_AUTHOR` trước Write (hook ghi changelog.md).
* Output summary + forward-route (do user quyết): finding 📄 → `/cr`; finding 🔧 → báo dev; Unverifiable → bổ sung test/config.

## Output

`docs/reports/doc-drift/{YYYY-MM-DD}-{feature}-code-drift.md` (hoặc `-product-code-drift.md` khi `--all`) — `type: doc-drift-report`.

__1 file report DUY NHẤT, read-only__ — phân loại Pass/Missing/Mismatch/Extra/Unverifiable + cạnh integration liên feature, cite `file:line`. Mỗi finding có cột __Hướng xử lý__ gợi ý 📄 sửa docs hay 🔧 fix code.

Skill __KHÔNG tự sửa docs, KHÔNG tự sửa code__ — user tự quyết. Dưới `docs/reports/` nên KG loại khỏi walk-scope.

## Chống bịa (bắt buộc)

1. __Không có nguồn → không đoán.__ Feature chưa có SRS/UC → in rõ *"chưa có {artifact} nên không kiểm được
   {khía cạnh}"*, KHÔNG suy diễn từ con số không.
2. __Chứng minh CẢ vế "docs có A" LẪN vế "code không có B".__ Trích được "docs nói khóa 5 lần" KHÔNG đủ kết
   luận "code thiếu" — code có thể ở file chưa Read. Mỗi Missing/Extra kèm: (a) vế có = `file:line` + trích;
   (b) vế thiếu = __đã grep biến thể nào__ (vd `lock`, `khóa`, `attempt`, `MAX_`) trên __tập file nào__ + tập
   đó đóng chưa. Chưa đủ → KHÔNG báo, chỉ note "cần kiểm thêm {X}".
3. __Ngôn ngữ nghi vấn cho finding yếu.__ Evidence chắc (constant/validator/exact-string) → khẳng định. Suy
   luận từ vựng → in "nghi", "cần xác nhận".
4. __Không có drift → nói thẳng "không phát hiện drift".__ Không bịa cho có.
5. __NFR/flow không có bằng chứng trực tiếp → Unverifiable__, không đoán "chắc đạt".

## References

* @../code-explorer/SKILL.md (map codebase + cluster feature nghiệp vụ)
* @../stacks-reference/SKILL.md (recipe bóc fact theo stack + cite file:line + test/i18n/flag)
* @../../rules/ba-conventions.md (IT-BA framing — business language, endpoint chỉ ở cite)
* @../../rules/kg-usage.md (KG chọn file phía docs; prose kết luận; code qua code-explorer)
* @../../rules/feature-bootstrap.md (Nhóm C — thiếu baseline → friendly abort + route)
* @../../rules/approval-gate.md (L1 trước Write; sub-agent không ghi file đích)
* @../../rules/naming-conventions.md (path/type `doc-drift-report`)
* @../../rules/changelog.md (set env cho hook ghi changelog.md)
* @../gap/SKILL.md (mẫu chống-bịa: chứng minh cả vế có + vế thiếu, negative-search)‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍


<!-- wm:2b9af6c9b691879b1ddb7a04d29a1c88 -->
<sub>Tài liệu thuộc bộ AI4BA BA-Kit — bản quyền hoangphan.blog</sub>
