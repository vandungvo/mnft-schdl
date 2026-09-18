---
name: code-to-srs
description: "Dùng khi cần tái lập bộ SRS per-feature từ SOURCE CODE — đọc code, gom thành feature nghiệp vụ, mỗi feature 1 bộ spec + flows/states/erd + use case kèm nhãn tin cậy và cite file:line. Nguồn là code; đọc tài liệu (docx/pdf/ảnh) thì dùng `/reverse-doc`."
allowed-tools: Read, Write, Edit, Bash, Glob, Grep, Task
user-invocable: true
disable-model-invocation: true
argument-hint: "<repo-path | folder | @file> | (empty → hỏi codebase, KHÔNG tự dùng cwd)"
---
<!-- Licensed to vandungvo2003@gmail.com — Order YYWVQ3VWE -->

# /code-to-srs — Tái lập BỘ SRS chuẩn per-feature từ SOURCE CODE‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

## Goal‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

Nhận __1 codebase__ (folder repo, hoặc thư mục con, hoặc file rời). Đọc source code → **gom thành các tính
năng nghiệp vụ** (feature = việc user LÀM được, KHÔNG phải module code) → mỗi tính năng viết **1 bộ tài liệu
SRS ĐẦY ĐỦ ĐA-TẦNG** như `/srs` sinh ra: file lõi spec 12 Mục (Scope/Actors/FR/NFR/BR/Error Matrix/Success/
Entities/Flows/Screens/Constraints/OQ) **+ sơ đồ luồng (flows) + trạng thái (states) + dữ liệu (erd) + use
case chi tiết** — nhưng ở __tầng tái-lập-chưa-duyệt__: mỗi mệnh đề mang **nhãn tin cậy ✅/🔵/🟡 + cite
`file:line`__. Ghi vào __`docs/_reverse/{feature}/`** (KHÔNG đè `docs/{feature}/`).

Đây là **anh em code-first của `/reverse-doc`**: cùng khuôn output, cùng hạ tầng (template reverse-srs-*,
sub-agent read-only, phase-gate, nhãn 3-claim, provenance, route `/srs`). Khác __DUY NHẤT ở nguồn__:
`/reverse-doc` đọc docx/pdf/xlsx/ảnh; `/code-to-srs` đọc __source code__ (route/controller/service/model/
validator/guard/migration).

__Nguyên tắc nền: CODE = PROOF, KHÔNG HỎI LẠI USER.__ Bám code mà tạo docs. Mọi chỗ **code không nói / mơ hồ /
cần người quyết** (đặc biệt: vì sao/cho ai/mục tiêu nghiệp vụ) → ghi __OQ + note__ vào `reverse-gaps.md`,
KHÔNG dừng tiến độ. Chạy __1 mạch Phase A→G__, chỉ dừng ở __L1 approval trước khi Write__ (`approval-gate.md`).

**Output per-feature = BỘ SRS ĐẦY ĐỦ ĐA-TẦNG (`docs/_reverse/{feature}/`):**
* `{feature}-reverse-spec.md` — FILE LÕI: SRS 12 Mục ĐẦY ĐỦ (mỗi FR/BR/Error CHI TIẾT, bóc HẾT không lược) + cột Nguồn/Nhãn + Mục 0 provenance (`type: reverse-srs`).
* `reverse-sources.md` — danh mục nguồn (__source path + file:line__ thay cho file docx; cột Confidence/Encoding).
* `reverse-gaps.md` — OQ + Gap + Conflict + Inferred (mọi thứ-chưa-chắc, đặc biệt "vì sao/cho ai" code câm).
* `srs/{feature}-reverse-flows.md` — __MỖI flow 2 diagram: sequence (tương tác actor↔hệ thống↔dịch vụ ngoài, nhánh alt/opt lỗi) + activity/flowchart (bước + quyết định + số liệu thật)__. KHÔNG chỉ 1 loại.
* `srs/{feature}-reverse-states.md` — State diagram mỗi entity multi-state.
* `srs/{feature}-reverse-erd.md` — Mermaid erDiagram + Entity Reference (type nghiệp vụ gọn).
* `usecases/{feature}-reverse-usecase-index.md` + `usecases/uc-{slug}.md` — use case fully-dressed (a–h) + ma trận UC↔FR↔Screen↔Error↔OQ.
* `_evidence.md` — __truy vết kỹ thuật code → luồng__ (`_templates/reverse-evidence.md`): §Endpoints/Validation/Errors/Business Rules/Entities/__Cross-repo hops__/Gaps, mỗi dòng cite `full-repo-path:line`. Đây là nơi trả lời "__một điểm nghiệp vụ sinh từ code này liên quan tới luồng/repo nào__". Spec đọc business language; provenance kỹ thuật sâu sống ở đây.

> __KHÔNG sinh:__ userflow, wireframe, prototype, tài liệu tích hợp API, user story (ngoài phạm vi). **KHÔNG
> sinh file api-reference.md / data-models.md kỹ thuật** (user chốt — endpoint/entity kỹ thuật chỉ dùng làm
> provenance `file:line`, entity đi vào ERD nghiệp vụ, KHÔNG đẻ phụ lục dev). **Mục Screens: BỎ khi code
> backend-only (không có frontend/UI)** — KHÔNG bịa "màn X [suy từ request field]"; chỉ điền khi code CÓ
> frontend/route UI thật, và chỉ tóm tắt bullet.

Manifest chung: `docs/_reverse/reverse-plan.json` (máy-đọc-được, resumable).

## Constraints‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

### Hard rules — never violate‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

* __CODE = PROOF, KHÔNG HỎI LẠI USER__ — code không nói / mơ hồ / cần người quyết → OQ + note vào
  `reverse-gaps.md`, KHÔNG dừng hỏi. BỎ CHECKPOINT-hỏi-nghiệp-vụ + BỎ HARD STOP giữa. Chạy 1 mạch A→G.
  GIỮ L1 approval Write. Chỉ hỏi DUY NHẤT "codebase/path ở đâu" khi no-arg (KHÔNG tự lấy cwd làm codebase).
* __NHÃN BẤT ĐỐI XỨNG (đặc thù code — hàng rào chống bịa quan trọng nhất):__
  * Cái code __KHẲNG ĐỊNH__ (validator `@Length(8,32)`, constant `OTP_TTL_MS=300000`, guard/decorator, enum
    status, migration column, exact error string trong response) = __✅__ + cite `file:line`.
  * Cái code __KHÔNG NÓI__ — *vì sao* khóa 24h, *mục tiêu nghiệp vụ*, *ai là actor thật*, *quy tắc business
    đằng sau con số*, priority P0/P1 = __🟡 Inferred__ mặc định + OQ. KHÔNG nâng 🟡→✅ chỉ vì "đọc được code".
  * Suy đoán có __≥2 chỗ code hậu thuẫn__ (vd 2 service cùng gọi 1 rule) = 🔵.
  * Đây là điểm khác reverse-doc: code cực mạnh về "how" (fact ✅), cực yếu về "why/who/what-for" (🟡).
* __Output = BỘ SRS đầy đủ đa-tầng per-feature__ — file lõi `{feature}-reverse-spec.md` (12 Mục ĐẦY ĐỦ theo
  `_templates/reverse-srs-spec.md`) + `srs/` (flows/states/erd) + `usecases/`. Mỗi FR/BR/Error viết CHI TIẾT
  (điều kiện/nhánh/wording exact), __bóc HẾT__ rule/error/edge có trong code, KHÔNG lược thành 1 dòng.
* __IT-BA framing__ (`ba-conventions` Mục 3) — output __business language__ dù đọc code. Endpoint/tên function/
  tên bảng/SDK CHỈ xuất hiện ở cột `Nguồn` (provenance `file:line`), KHÔNG phơi ra Mục FR/BR/prose. Ví dụ:
  viết "Hệ thống khóa tài khoản sau 10 lần đăng nhập sai" ✅ [src/auth/auth.guard.ts:34], KHÔNG viết
  "gọi `AuthGuard.checkLockout()`".
* **Output vào `docs/_reverse/{feature}/`** — folder project-level trong `docs/` (để hook/KG/gap/dashboard
  quét được traceability). KHÔNG đè `docs/{feature}/`.
* __Sub-agent READ-ONLY, KHÔNG ghi file đích__ (`approval-gate.md`) — Phase D (viết nháp) + Phase E (audit)
  chỉ __TRẢ proposed content/findings__; __main thread Write__ sau L1/L2. KHÔNG "Write rồi confirm". KHÔNG
  spawn Task chạy trọn skill khác (không fork /srs).
* __Phase-gate deterministic__ — sau mỗi phase kiểm `file exist + size>0 + (JSON parse nếu json)`; không đạt
  → retry sub-agent ĐÚNG 1 LẦN (append lý do fail) → vẫn fail: stop + surface partial state, KHÔNG suy diễn.
* __Dò trùng feature qua KG__ (`kg-usage.md`) — Phase B đọc-rộng-để-chọn: `kg facts`/`kg counts` shortlist →
  Read prose kết luận trùng *nghiệp vụ* (không so slug thuần). `KG-ERROR` → fallback glob `docs/*/`.
* **KHÔNG đè `docs/{feature}/`** — feature trùng doc hiện có → điền __Mục 0.3 bảng khác biệt__ + recommend
  `/cr` `/gap`. KHÔNG merge vào `urd/brd/srs`.
* **DỪNG ở output + route `/srs`** — code-to-srs KHÔNG chain sang `/srs`. Report "Next: `/srs {feature}`".
  `reverse-spec.md` là upstream tùy chọn của `/srs` (giữ nhãn confidence — /srs đọc + hỏi từng 🟡).
* __Output LUÔN trong workspace BA, KHÔNG ghi vào repo nguồn__ — codebase read-only (có thể ở ổ/repo khác).
  Mọi Write dùng đường dẫn tuyệt đối tới workspace BA (nơi có `CLAUDE.md` + `.claude/`). KHÔNG tạo/sửa/xóa gì
  trong cây source code.
* __status: draft cứng__ — reverse KHÔNG bao giờ `approved`. Mục 0 ghi rõ "CHƯA duyệt".
* __Vietnamese-first__ default, auto-detect từ nguồn (README/comment). Muốn tiếng Anh → nói "viết bằng tiếng Anh".
* __Feature mới__ — Nhóm A của `feature-bootstrap` (điểm vào, derive slug từ CODE, tạo nhiều feature 1 lần).
  @author = current_user cho activity log (`ba-conventions` Mục 1), KHÔNG vào frontmatter.
* __Sub-agent chỉ read-only__ — Phase D viết nháp + Phase E audit đều TRẢ proposed, main Write. KHÔNG fork /srs.
* __Secret trong .env/config__ — CHỈ trích tên biến, KHÔNG copy giá trị vào doc.
* **Feature trùng — KHÔNG ghi đè `docs/{feature}/`** — chỉ ghi `docs/_reverse/{feature}/` + Mục 0.3. Reconcile
  qua `/cr` `/gap`.
* __⚠️ CODEBASE ≠ WORKSPACE__ — nhận path repo (vd `/path/to/other-repo/...`) rồi suy output tương đối
  theo nó → SAI. Output luôn vào `docs/_reverse/` của workspace BA (dir có `CLAUDE.md`+`.claude/`), thường
  khác ổ/repo với code. Code read-only; KHÔNG tạo/sửa/xóa gì trong cây source.

### Pitfalls — easy to get wrong‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

* __Đây là REVERSE ra SRS chuẩn, KHÔNG phải sinh feature mới__ — CHỈ tái lập cái CODE đã làm. Mọi mệnh đề
  truy được về `file:line`. Suy đoán gắn 🔵/🟡, KHÔNG trộn với fact ✅.
* __NHÃN BẤT ĐỐI XỨNG__ — fact kỹ thuật code khẳng định = ✅ + `file:line`; *vì sao/cho ai/mục tiêu nghiệp vụ/
  priority* = 🟡 + OQ mặc định. ĐỪNG để "đọc được code" thành "hiểu được nghiệp vụ".
* __IT-BA framing__ — output business language. Endpoint/function/bảng/SDK CHỈ ở cột Nguồn (provenance), KHÔNG
  ra Mục FR/BR/prose. KHÔNG sinh api-reference.md/data-models.md (user chốt bỏ).
* __TEST là nguồn hạng nhất__ (`stacks-reference` R1) — bóc boundary/flow/edge/rule-ngược từ test. Active = ✅
  cite `test-file:line`; skip/todo/`@Disabled` = 🟡 + gaps. KHÔNG chạy test. Hành vi ✅ nhưng "vì sao" vẫn 🟡.
* __Wording lỗi qua i18n catalog__ (R2) — mã khóa (`t('auth.locked')`) phải resolve sang __câu thật__ trước
  khi ghi Error Matrix; cite CẢ throw-site LẪN catalog. Không resolve → mã + `⚠️` + Gap, KHÔNG bịa.
* __Dead-code/flag__ (R3) — route no-caller/`@Deprecated`/`if(false)` → KHÔNG tái lập như feature chắc; 🟡 +
  OQ + negative-search (pattern+scope). Phân biệt "không thấy sau khi tìm" vs "chưa tìm".
* __Repo lớn → GATE-SCOPE hỏi subset__ — Phase A route-first (không đọc thân file); repo nặng (>~25 feature/
  >~1500 file/đa-repo) → in bảng feature + WARN + hỏi user chọn nhóm làm trước. Feature không chọn = `deferred`
  (resumable). Đây là hỏi PHẠM VI LÀM, KHÔNG phải nghiệp vụ.
* **`_evidence.md` = truy vết code→luồng** — mỗi feature 1 file, §Cross-repo hops trả lời "điểm nghiệp vụ →
  luồng nào". Cite full repo-relative path (KHÔNG bare basename — đa-repo trùng tên). Provenance kỹ thuật sống
  ở đây, spec vẫn business language.
* __KHÔNG HỎI LẠI USER để làm rõ nghiệp vụ__ — code không nói → OQ/Gap vào `reverse-gaps.md`. Chỉ hỏi DUY
  NHẤT "codebase ở đâu" (Phase A khi no-arg — KHÔNG tự lấy cwd làm codebase). L1 approval Write vẫn giữ.
  Spawn nhiều Task đọc-code SONG SONG trong 1 message OK (đọc thuần, không ghi file đích).
* __CÓ sinh diagram flows/states/erd__ từ luồng/rule ĐÃ đọc trong code — bước suy đoán chú thích 🔵/🟡, KHÔNG
  bịa bước không có trong code. Verify compile. KHÔNG sinh userflow/wireframe/prototype/API/user story.
* __Dò trùng qua KG__ — so nghiệp vụ (Read prose), không so slug thuần. `KG-ERROR` → fallback glob.
* __DỪNG ở output + route /srs__ — KHÔNG chain. Report "Next: /srs {feature}". Giữ nhãn confidence.
* __status: draft cứng__ — reverse KHÔNG bao giờ approved. Mục 0 ghi "CHƯA duyệt".
* __@author__ — `ba-conventions` Mục 1: current_user từ memory `user-identity`; KHÔNG vào frontmatter.

## Inputs

```
/code-to-srs                                # KHÔNG tham số → hỏi "codebase ở đâu" (KHÔNG tự lấy cwd — cwd là workspace ghi output)
/code-to-srs <repo-path>                    # 1 repo/folder
/code-to-srs <path/to/sub-dir>              # 1 thư mục con (chỉ tái lập phần đó)
/code-to-srs @<file>                        # 1 file tag
```

Ví dụ:
```
/code-to-srs /path/to/other-repo/frontend
/code-to-srs ./backend/src
/code-to-srs @app/api/auth/route.ts
```

Đổi hành vi mặc định bằng lời (KHÔNG flag — `feedback_flag_diet_natural_chat`):
* Viết tiếng Anh → "viết bằng tiếng Anh".
* Chỉ tái lập 1 feature → "chỉ làm feature {slug} thôi".

## Context (dynamic)

Today: !`date +%Y-%m-%d`
cwd hiện tại: !`pwd`
cwd có phải WORKSPACE BA-Kit? (nơi hợp lệ để Write output): !`[ -d .claude ] && [ -f CLAUDE.md ] && echo "CÓ — cwd là BA-Kit, Write vào docs/_reverse/ ở đây" || echo "KHÔNG — cwd KHÔNG phải BA-Kit; đây chỉ có thể là CODEBASE nguồn, TUYỆT ĐỐI không Write output vào đây"`
Existing features (dò trùng): !`ls -d docs/*/ 2>/dev/null | xargs -I{} basename {} | grep -v "^_" | grep -vE "blockers|decisions|exports|impacts|inbox|meetings|redoc|reports|cr" | tr '\n' ' '`
Existing reverse specs: !`ls docs/_reverse/*/*-reverse-spec.md 2>/dev/null | tr '\n' ' ' || echo "(chưa có)"`

---

## Approach — chạy 1 mạch Phase A→G (không HARD STOP hỏi user)

> Trục: A (map codebase) · B (cluster feature + kế hoạch) · D (viết) · E (audit) · F (write) · G (OQ + report).
> Không có "Phase C" riêng (bước ghi kế hoạch gộp cuối B, giống `/reverse-doc`).

### Phase A — Map codebase + detect stack

1) **Resolve nguồn (path codebase) VÀ chốt nơi Write — HAI thứ TÁCH BIỆT (đọc kỹ, đây là hàng rào chống ghi
   nhầm vào repo nguồn):**
   * __Nơi Write output = workspace BA-Kit__ (dir có `.claude/` + `CLAUDE.md`) — xem Context "cwd có phải
     WORKSPACE BA-Kit?". Nếu cwd KHÔNG phải BA-Kit → __KHÔNG có nơi hợp lệ để Write__ → báo rõ + yêu cầu user
     `cd` vào workspace BA-Kit rồi truyền codebase qua arg (vd `/code-to-srs /path/to/repo`). KHÔNG bao giờ
     tạo `docs/_reverse/` trong cây source code. (`⚠️ CODEBASE ≠ WORKSPACE` — xem Pitfalls.)
   * __Codebase nguồn (chỉ để ĐỌC):__
     * Có arg → dùng path đó (repo/folder/file). Path không đọc được → báo rõ, KHÔNG proceed.
     * No arg → hỏi DUY NHẤT "Anh đưa em codebase nào? (đường dẫn repo/folder, hoặc `@file`)". Wait. **KHÔNG
       tự lấy cwd làm codebase** — cwd là workspace ghi output, không phải nguồn để reverse (kể cả khi cwd
       tình cờ có `package.json`: đó có thể là tooling của chính BA-Kit, không phải codebase user muốn tái lập).
2) **Nạp `code-explorer` + `stacks-reference`** → chạy Phase A của code-explorer __route-first__ (đếm quy mô
   + cây thư mục cấp cao + stack detection + README + infra hints — __KHÔNG đọc thân file ở bước này__). In
   __bảng bản đồ codebase__ (chat): stack/kiến trúc/entry point/__tổng số file__.
   * __GATE-A:__ xác định được ≥1 stack HOẶC có route/controller file. Không nhận diện được gì (repo rỗng/
     chỉ config) → __ABORT__ + báo rõ.
3) __Cảnh báo secret__ — nếu đọc `.env`/config chứa secret thật → CHỈ trích tên biến, KHÔNG copy giá trị vào
   doc. Nhắc user output là doc, không lộ credential.

### Phase B (gồm ghi kế hoạch) — Cluster feature nghiệp vụ + dò trùng → reverse-plan.json

4) __Nhận diện feature__ theo `code-explorer` Phase B — scan __đầy đủ__ danh sách route/nav/controller/
   migration (unit list rẻ, KHÔNG đọc thân file; __không sample/truncate__ — danh sách dài là tín hiệu thật).
   __Clean-room: mô tả cái đọc được TRƯỚC khi suy luận nghiệp vụ__ (chống context poisoning).
5) __Kiểm hạt + cluster bằng BẰNG CHỨNG chéo repo__ (`code-explorer`): frontend gọi endpoint controller nào,
   batch đọc-ghi bảng/bucket ai → cùng feature. __KHÔNG cluster theo tên gần nhau__ — thiếu bằng chứng nối
   thì giữ tách + `grouping_note`. Cross-cutting → `shared_infrastructure` (không tính là feature). Mơ hồ →
   tự quyết + note, KHÔNG hỏi nghiệp vụ.
6) __Detect complexity flags__ mỗi feature (oauth/payment/webhook/async/multi-role/state-machine/throttle/
   external-redirect) → để Phase D biết Mục nào điền kỹ.
7) __Dò trùng feature đã có — qua KG__ (`kg-usage.md`): `kg counts`/`kg facts` shortlist → __Read prose__
   feature nghi trùng để kết luận trùng *nghiệp vụ*. Trùng → `existing_doc: docs/{feature}/` (điền Mục 0.3
   Phase D). `KG-ERROR` → fallback glob.
8) __GATE-SCOPE (repo lớn → hỏi user chọn subset)__ — in __bảng feature đầy đủ__ cho user THẤY:
   `# | feature | unit/route nguồn | repo | confidence | trùng?` + tổng kết độ nặng (số feature/repo/ước‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍
   lượng file). __Repo NẶNG__ (> ~25 feature HOẶC > ~1500 file HOẶC nhiều repo) → **DỪNG + WARN "nặng, nên
   làm lần lượt" + hỏi user chọn** (`all` / danh sách feature / nhóm ưu tiên auth→core→admin). __Wait.__ Đây
   là hỏi __PHẠM VI LÀM__, KHÔNG phải hỏi nghiệp vụ. Repo nhỏ → in bảng, chạy tiếp không chặn.
9) **Ghi `docs/_reverse/reverse-plan.json`** (L1 ngắn rồi Write; đã tồn tại → L2 diff). Mỗi entry:
   `{slug, sources:[code paths + test + i18n], existing_doc, confidence, complexity_flags, status}`.
   `status` = `pending` (user chọn làm) · `deferred` (chưa chọn ở GATE-SCOPE, để lần sau resumable) · `done`.
   __GATE-B:__ JSON parse được, mỗi entry có slug hợp lệ + ≥1 source path.

### Phase D — Viết nháp SRS-reverse per-feature (batch tuần tự 2-3 feature)

10) __BATCH TUẦN TỰ 2-3 feature/batch__ (đọc `reverse-plan.json`, entry `status:pending`). Mỗi feature: spawn
   **1 sub-agent `Task` READ-ONLY-VỀ-OUTPUT** đọc source files đã map → __TRẢ proposed content__ cho CẢ BỘ
   file (KHÔNG tự Write file đích). Sub-agent nạp `stacks-reference` để bóc fact.
   * __"READ-ONLY" ở đây = KHÔNG ghi/sửa file ĐÍCH (docs/_reverse) — KHÔNG phải "không được dùng Bash".__
     Sub-agent **BẮT BUỘC được cấp `Bash` + `Read` + `Grep` + `Glob`** để chạy recipe `stacks-reference` (toàn
     `grep`/`find`/`cat`/`python3` đọc code) — thiếu Bash thì sub-agent mù, không bóc được fact. Dùng agent
     `general-purpose` (có đủ tool) HOẶC nêu rõ tool trong Task prompt. Ràng buộc trong prompt: **"chỉ chạy
     Bash READ-ONLY trên cây source (cat/grep/find/head); CẤM tuyệt đối ghi/sửa/xóa bất kỳ file nào — kể cả
     trong source lẫn trong workspace; chỉ TRẢ content về text."**
   * __Files trả về:__ `{feature}-reverse-spec.md` (12 Mục ĐẦY ĐỦ) + `reverse-sources.md` + `reverse-gaps.md`
     + `_evidence.md` (`_templates/reverse-evidence.md`) + `srs/{feature}-reverse-flows.md`
     + `srs/{feature}-reverse-states.md` + `srs/{feature}-reverse-erd.md` + `usecases/uc-{slug}.md` (a–h)
     + `usecases/{feature}-reverse-usecase-index.md`.
   * __Sub-agent prompt gồm:__ danh sách source path + __quy tắc NHÃN BẤT ĐỐI XỨNG__ (fact code ✅ + cite
     `file:line`; vì-sao/cho-ai/mục-tiêu = 🟡 + OQ) + IT-BA framing (business language, endpoint chỉ ở cột
     Nguồn) + "__flows.md: MỖI flow phải có CẢ sequence LẪN activity__ (sequence = tương tác actor↔hệ thống↔
     dịch vụ ngoài + nhánh alt/opt lỗi; activity = bước + quyết định + số liệu thật trên node) — KHÔNG chỉ 1
     loại; diagram chỉ vẽ bước CÓ trong code; bước suy đoán chú thích 🔵/🟡" + "code không nói → OQ/Gap/
     Conflict vào reverse-gaps, KHÔNG bịa, KHÔNG hỏi" + "chỉ TRẢ content, KHÔNG Write" **+ 3 recipe đặc thù
     code (`stacks-reference` R1/R2/R3):**
     * __R1 TEST là nguồn hạng nhất__ — đọc test bóc boundary/flow/edge/rule-ngược. Test active = ✅ cite
       `test-file:line`; test skip/todo/`@Disabled` = 🟡 + gaps ("test bị skip, chưa chắc hành vi thật").
       KHÔNG chạy test. Hành vi từ test = ✅ nhưng "vì sao" vẫn 🟡 (nhãn bất đối xứng giữ nguyên).
     * __R2 wording lỗi qua i18n catalog__ — lỗi dùng mã khóa (`t('auth.locked')`) → resolve sang __câu thật__
       trong catalog rồi mới ghi Error Matrix; cite CẢ throw-site LẪN catalog-file. Không resolve được → ghi
       mã + `⚠️ chưa resolve` + Gap, KHÔNG bịa câu.
     * __R3 dead-code/flag__ — route no-caller / `@Deprecated` / `if(false)`/flag-tắt → KHÔNG tái lập như
       feature chắc; 🟡 + OQ + __negative-search__ (pattern+scope đã grep) vào reverse-gaps.
     * __Cite full repo-relative path__ (KHÔNG bare basename) — đa-repo có file trùng tên.
   * **`_evidence.md` (BẮT BUỘC):** điền §Endpoints/Validation/Errors/Business Rules/Entities/**Cross-repo
     hops**/Gaps, mỗi dòng cite `full-repo-path:line`. §Cross-repo hops ghi chỗ 1 hành động kích hoạt luồng
     nơi khác (vd `api ghi S3 → batch đọc`) = "điểm nghiệp vụ → luồng nào". Đây là scratch provenance, KHÔNG
     phơi endpoint ra spec.
   * **`reverse-sources.md`:** cột ID (S1/S2…) trỏ tới __source path + range dòng chính__ (vd
     `S1 | src/auth/auth.service.ts | code | — | high | OK | FR/BR đăng nhập`). Mỗi mệnh đề spec cite S-id;
     fact quan trọng thêm `:line` inline. Mục 0 spec (Truy vết nguồn) thêm 1 dòng bullet link tới `_evidence.md`.
   * Feature đơn giản (ít flow/1 entity) → có thể lược states/erd nếu code không đủ, ghi rõ lý do.
   * Mục thiếu (code không nói) → để trống + `<!-- TBD -->` + OQ. Feature trùng doc hiện có → Mục 0.3.
   * __GATE-D per-feature:__ đủ 12 Mục + Mục 0 + `_evidence.md` (≥§Endpoints/Errors/Business Rules; §Cross-repo
     hops __khi feature trải >1 repo/tiến-trình__ — feature single-repo ghi "— không có hop chéo repo", KHÔNG
     bịa) + (flows/states/erd/uc khi đủ); **flows.md: MỖI flow có ĐỦ 2 block — `sequenceDiagram` VÀ `flowchart`
     (đếm: số flow × 2 = số mermaid block; thiếu sequence hoặc thiếu activity = FAIL gate)**; mỗi mệnh đề có
     cột Nguồn+Nhãn; fact rút từ test có `test-file:line`;
     **mermaid cú pháp sạch — tuân `diagram-selection.md` "Mermaid syntax safety"**: KHÔNG để `;` trong
     transition/message label (sinh node rác), quote label flowchart có ký tự đặc biệt, label transition NGẮN
     (giải thích dài để prose ngoài diagram). Proposed content CHƯA Write nên KHÔNG chạy `mermaid-verify.mjs`
     lên file đích ở đây; chỉ __rà cú pháp bằng mắt__ (hoặc ghi scratch tạm rồi
     `.claude/scripts/mermaid-verify.mjs --file <scratch>`). __Verify chính thức ở Phase G__ (sau Write) —
     nhưng nhớ **`mmdc` PASS ≠ renderer thật PASS** (mmdc tha `;`/`≥` trần mà GitHub/Obsidian crash), nên
     phòng-ngừa-khi-viết mới là chính. Thiếu Mục/nhãn/mermaid vỡ → retry sub-agent ĐÚNG 1 LẦN → vẫn fail:
     surface partial + Gap, tiếp feature khác.

### Phase E — Audit ngược (sub-agent kiểm-chứng độc lập)

11) __Spawn sub-agent audit__ (gap-analyst/senior-ba) cho mỗi feature — đọc lạnh, KHÔNG viết đè: phân rã doc
    thành __claim nguyên tử__ → đối chiếu NGƯỢC về **`file:line` code**. Claim không neo được code → hạ 🟡
    hoặc loại; __claim "why/who/business-intent" đang để ✅/🔵 → BẮT hạ 🟡__ (code không chứng minh được ý
    định); giọng chắc nịch ở phần suy đoán → gỡ.
    * Tính chỉ số confidence (đếm ✅/🔵/🟡) → điền `confidence_summary` frontmatter.
    * __Luật test/dead-code (mục 1+4+5):__ claim gán ✅-từ-test phải có `test-file:line` __active__ — test
      skip/todo mà claim còn ✅ → __BẮT hạ 🟡__ + gaps. Claim về feature __nghi dead/flag-tắt__ phải có OQ +
      negative-search; nếu để như feature chắc → hạ 🟡. __Tinh chỉnh confidence:__ rule __có test phủ__ → giữ ✅
      vững; rule 1-dòng-code __không test phủ__ → giữ ✅ nhưng ghi chú "chưa có test phủ" (minh bạch, KHÔNG hạ
      nhãn). Wording lỗi ở ✅ phải là __câu thật__ (không phải mã khóa i18n chưa resolve).
    * **`_evidence.md` cite phải resolve:** mọi `file:line` là full repo-relative path thật (không bare
      basename, không ellipsis) — cite hỏng → sửa hoặc hạ nhãn.
    * Chấm theo rubric (code→mệnh đề→nhãn), __KHÔNG so chéo giữa feature__.
    * __KHÔNG được tách/gộp/đổi-slug__ (đã chốt ở plan.json) — chỉ sửa nhãn/nguồn/OQ/nội-dung trong feature.
    * Skill __áp findings__ vào proposed content. __GATE-E:__ 0 claim mồ côi (không code backing) còn ở ✅/🔵;
      0 claim business-intent còn ở ✅; 0 claim ✅-từ-test-skip; 0 wording lỗi còn là mã khóa chưa resolve.

### Phase F — L1 approval + Write (main thread)

12) __L1 plan preview (BA-facing prose, batch)__ (`ba-conventions` Mục 5) — liệt kê __bộ file/feature__ +
    1-2 dòng nội dung nổi bật + chỉ số confidence (✅/🔵/🟡) + số OQ mỗi feature. Prose tự nhiên, KHÔNG bảng
    dev. User Y. (Đây là approval-gate __GHI FILE__ — KHÁC checkpoint hỏi-nghiệp-vụ đã bỏ; KHÔNG biến L1
    thành mục Q&A làm rõ nghiệp vụ. Chỗ chưa rõ đã thành OQ ở `reverse-gaps.md`, không hỏi lại ở đây.)
13) __Write__ từng file vào `docs/_reverse/{feature}/` từ template. File đã tồn tại → __L2 diff__. Sau mỗi
    feature Write xong → **mark `status:"done"`** trong `reverse-plan.json` (resumable). Append activity log.
    * __Checkpoint per-batch:__ sau mỗi batch in bảng tiến độ (`đã viết / còn lại`) + [tiếp / bỏ phần còn lại
      / dừng]. Honor lựa chọn.

### Phase G — Resolve OQ + verify + report

14) __Resolve OQ__ (own-OQ-only per `resolve-oqs.md` — reverse là gốc): gom OQ từ `reverse-gaps.md` →
    prompt `Y/skip/ids` → loop 1-by-1 → cascade scan TRONG reverse-spec/gaps. Nhiều feature → selector
    `{feature}:OQ-n`. OQ giữ lại được `/srs` inherit.
15) __FINAL VERIFY MATRIX__ — bảng feature × [reverse-spec, sources, gaps, ___evidence__, flows, states, erd,
    usecase-index] × [exist, size>0] + __mermaid verify__ file srs/ + **spot-check `_evidence.md` cite** (vài
    `file:line` resolve được đường dẫn thật, không bare basename). Report CHỈ báo success khi mọi dòng pass +
    mermaid OK. Còn feature `deferred` → nhắc "còn {D} feature chưa làm, chạy lại `/code-to-srs` để tiếp".
16) __In report__:
    ```
    ✅ Code-to-SRS xong → BỘ SRS đầy đủ đa-tầng per-feature (tái lập từ SOURCE CODE).
       Tính năng đã viết: {N}   (mỗi feature: confidence ✅{a} 🔵{b} 🟡{c})   Còn deferred: {D}
       → docs/_reverse/{feature}/ : spec (12 Mục) + sources + gaps + _evidence + srs/(flows,states,erd) + usecases/
       Cross-repo hops phát hiện: {H} (xem §Cross-repo hops mỗi _evidence.md)
       Feature trùng đã đối chiếu: {M} (xem Mục 0.3 mỗi spec)
       Open Questions còn hold: {Q}  (đa số là "vì sao/cho ai" code không nói + test-skip + dead-code nghi — cần PO/BA quyết)

    Recommended next (per feature):
      - /reverse-preview <feature>  — xem bộ reverse dạng HTML (giữ nhãn ✅/🔵/🟡 + Gaps/OQ + evidence)
      - /srs <feature>       — hình thức hoá thành SRS chuẩn (đọc reverse + xác nhận từng 🟡/TBD)
      - /gap <feature>       — đối chiếu sâu nếu trùng docs hiện có
      - /cr "<đổi gì>" --feature <feature>  — reconcile khác biệt Mục 0.3
    ```

---

## Output

Ghi vào `docs/_reverse/{feature}/` — __TÁCH khỏi__ `docs/{feature}/`, KHÔNG đè doc chính thức. Có thể sinh NHIỀU feature trong 1 lượt chạy.

| File | Nội dung |
|---|---|
| `{feature}-reverse-spec.md` | SRS 12 Mục + cột Nguồn/Nhãn + Mục 0 provenance. **`status: draft` cứng** |
| `reverse-sources.md` | Danh mục nguồn — cột nguồn là **source path + `file:line`** |
| `reverse-gaps.md` | OQ + Gap + Conflict + Inferred |
| `_evidence.md` | Truy vết code→luồng, cite `full-repo-path:line`. **CHỈ `/code-to-srs` sinh** |
| `srs/{feature}-reverse-{flows,states,erd}.md` | Mermaid |
| `usecases/{feature}-reverse-usecase-index.md` + `uc-{slug}.md` | Use case |

Manifest chung: `docs/_reverse/reverse-plan.json` (resumable).

__Ghi vào workspace BA, KHÔNG ghi vào repo nguồn__ (repo code là read-only).

## Cách build skill này (giáo án — để người sau maintain hiểu logic)

> Skill KHÔNG có engine script; logic là Claude đọc SKILL.md rồi tự chạy Phase A→G (1 mạch). Đọc-code dựa 2
> reference skill: `code-explorer` (map + cluster) + `stacks-reference` (bóc fact theo stack).

__Công thức chung:__ `map codebase + detect stack → cluster theo feature nghiệp vụ (code-explorer, KG dò
trùng) → viết BỘ SRS đầy đủ per-feature (sub-agent read-only, bóc fact qua stacks-reference, nhãn bất đối
xứng) → audit ngược về file:line → L1 → main Write → verify matrix + mermaid compile`.

1) **Vì sao là anh em của `/reverse-doc`, không phải skill độc lập?** Cùng đích (tái lập SRS chuẩn per-feature
   + nhãn confidence + provenance + ghi `_reverse/` + route `/srs`). Khác DUY NHẤT nguồn (code vs tài liệu).
   Tái dùng trọn template + phase-gate + sub-agent read-only của reverse-doc → nhất quán, ít bảo trì.
2) __Vì sao NHÃN BẤT ĐỐI XỨNG là điểm cốt lõi?__ Code khác tài liệu ở chỗ: nó __khẳng định chắc "how"__ (một
   validator là fact, không phải suy đoán) nhưng __hoàn toàn câm về "why/who/what-for"__. Nếu áp nhãn đồng đều
   như reverse-doc → hoặc hạ nhãn cả fact chắc (lãng phí) hoặc để business-intent ở ✅ (bịa nghiệp vụ, nguy
   hiểm). Quy tắc: fact code = ✅; ý định nghiệp vụ = 🟡 + OQ.
3) __Vì sao IT-BA framing dù đọc code?__ BA-Kit phục vụ IT-BA, không phải dev (`ba-conventions` Mục 3). Spec
   phải business language; tên function/endpoint/bảng chỉ được dùng làm __provenance__ (cột Nguồn `file:line`),
   KHÔNG phơi ra Mục FR/BR. Đây cũng là lý do KHÔNG sinh api-reference.md/data-models.md kỹ thuật.
4) __Vì sao sub-agent read-only?__ `approval-gate.md` cấm sub-agent ghi file đích trước approval (rollback
   không tin cậy — CR-20260612-001). Sub-agent TRẢ proposed content, main Write sau L1/L2.
5) __Vì sao phase-gate + retry-1-lần?__ (dùng chung với `/reverse-doc`). Chống "agent trả
   về nhưng không ghi gì / thiếu mục". Retry đúng 1 lần với lý do fail; vẫn fail thì surface partial.
6) __Vì sao audit ngược (Phase E) riêng?__ LLM đọc code dễ "tự tin hiểu nghiệp vụ". Agent thứ 2 đọc lạnh,
   đối chiếu ngược về `file:line`, BẮT mọi claim business-intent đang ở ✅ phải hạ 🟡.
7) **Vì sao `docs/_reverse/` chứ không ngoài docs?** Hook (auto-changelog/stale/kg-refresh) + kg-build
   hard-code quét `docs/`. Ra ngoài = mù automation. `_reverse/` là folder project-level trong docs.
8) __Vì sao reverse-plan.json (không .md)?__ Máy-đọc-được → resumable + drive batch Phase D.

## References

* @../../rules/ba-conventions.md
* @../../rules/approval-gate.md
* @../../rules/naming-conventions.md
* @../../rules/feature-bootstrap.md
* @../../rules/kg-usage.md
* @../../rules/resolve-oqs.md
* @../../rules/changelog.md
* @../../rules/diagram-selection.md
* @../stacks-reference/SKILL.md
* @../code-explorer/SKILL.md
* @../../../_templates/reverse-srs-spec.md
* @../../../_templates/reverse-sources.md
* @../../../_templates/reverse-gaps.md
* @../../../_templates/reverse-srs-flows.md
* @../../../_templates/reverse-srs-states.md
* @../../../_templates/reverse-srs-erd.md
* @../../../_templates/reverse-usecase-index.md
* @../../../_templates/reverse-evidence.md
* @./references/example.md‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍


<!-- wm:2b9af6c9b691879b1ddb7a04d29a1c88 -->
<sub>Tài liệu thuộc bộ AI4BA BA-Kit — bản quyền hoangphan.blog</sub>
