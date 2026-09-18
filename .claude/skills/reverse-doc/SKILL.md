---
name: reverse-doc
description: "Dùng khi cần tái lập bộ SRS per-feature từ các tài liệu rời rạc (docx/pdf/xlsx/pptx/md, ảnh chụp màn hình) — gom theo tính năng, mỗi feature 1 bộ spec + flows/states/erd + use case kèm nhãn tin cậy và truy vết nguồn. Nguồn là tài liệu; đọc source code thì dùng `/code-to-srs`."
allowed-tools: Read, Write, Edit, Bash, Glob, Grep, Task
user-invocable: true
disable-model-invocation: true
argument-hint: "<path | folder | @file> [path2 ...] | (empty for interactive)"
---
<!-- Licensed to vandungvo2003@gmail.com — Order YYWVQ3VWE -->

# /reverse-doc — Tái lập BỘ SRS chuẩn per-feature từ nguồn rời rạc‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

## Goal‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

Nhận __1 folder / nhiều folder / nhiều file rời__ (tài liệu cũ docx/pdf/md/xlsx/pptx + ảnh/screenshot UI).
Đọc hết → __gom thành các tính năng__ → mỗi tính năng viết __1 bộ tài liệu SRS ĐẦY ĐỦ ĐA-TẦNG__ như `/srs`
sinh ra: file lõi spec 12 Mục chi tiết (Scope/Actors/FR/NFR/BR/Error Matrix/Success/Entities/Flows/Screens/
Constraints/OQ) __+ sơ đồ luồng (flows) + sơ đồ trạng thái (states) + sơ đồ dữ liệu (erd) + use case chi tiết__
— nhưng ở __tầng tái-lập-chưa-duyệt__: mỗi mệnh đề mang __nhãn tin cậy ✅/🔵/🟡 + nguồn__. Ghi vào
**`docs/_reverse/{feature}/`** — tách khỏi doc chính thức (KHÔNG đè `docs/{feature}/` `urd/brd/srs`).

Đây là __reverse__ (nguồn lộn xộn → suy ngược nghiệp vụ → bộ SRS chuẩn per-feature), khác `/brainstorm`
(forward — 1 ý tưởng → 1 file). Thay thế 2 skill cũ `/legacy` + `/documentation`.

__Nguyên tắc nền (user chốt 2026-07-17): NGUỒN = PROOF, KHÔNG HỎI LẠI USER.__
Cứ bám nguồn mà tạo docs. Mọi chỗ __chưa rõ / thiếu / mâu thuẫn / cần người quyết__ → ghi __note + OQ__ vào
`reverse-gaps.md` (đặc biệt OQ), KHÔNG dừng tiến độ để hỏi. Skill chạy __1 mạch Phase A→G__, chỉ dừng ở
__L1 approval trước khi Write__ (đồng ý ghi file, theo `approval-gate.md`).

**Output per-feature = BỘ SRS ĐẦY ĐỦ ĐA-TẦNG (`docs/_reverse/{feature}/`):**
- `{feature}-reverse-spec.md` — FILE LÕI: SRS 12 Mục ĐẦY ĐỦ (mỗi FR/BR/Error viết CHI TIẾT, bóc HẾT không lược) + cột Nguồn/Nhãn + Mục 0 provenance (`type: reverse-srs`).
- `reverse-sources.md` — danh mục nguồn (file/loại/ngày/confidence/encoding).
- `reverse-gaps.md` — OQ + Gap + Conflict + Inferred assumption (mọi thứ-chưa-chắc gom 1 chỗ).
- `srs/{feature}-reverse-flows.md` — __MỖI flow ĐỦ 2 diagram: sequence + activity/flowchart__ (KHÔNG chỉ 1 loại) (`type: reverse-srs-flows`).
- `srs/{feature}-reverse-states.md` — State diagram mỗi entity multi-state (`type: reverse-srs-states`).
- `srs/{feature}-reverse-erd.md` — Mermaid erDiagram + Entity Reference (`type: reverse-srs-erd`).
- `usecases/{feature}-reverse-usecase-index.md` + `usecases/uc-{slug}.md` — use case fully-dressed (a–h) mỗi function chính + ma trận UC↔FR↔Screen↔Error↔OQ.

> __KHÔNG sinh:__ userflow, wireframe, prototype, tài liệu tích hợp API, user story (ngoài phạm vi — user chốt). Mục 10 Screens trong spec chỉ tóm tắt bullet (không vẽ wireframe).

Manifest chung: `docs/_reverse/reverse-plan.json` (máy-đọc-được, resumable). Convert tạm: `docs/_reverse/.convert/`.

## Constraints‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

### Hard rules — never violate‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

- __NGUỒN = PROOF, KHÔNG HỎI LẠI USER__ (user chốt) — chưa rõ/thiếu/mâu thuẫn → OQ + note vào `reverse-gaps.md`,
  KHÔNG dừng hỏi. BỎ CHECKPOINT-hỏi-nghiệp-vụ + BỎ HARD STOP giữa. Chạy 1 mạch A→G. GIỮ L1 approval Write.
- __Output = BỘ SRS đầy đủ đa-tầng per-feature__ — file lõi `{feature}-reverse-spec.md` (12 Mục ĐẦY ĐỦ theo
  `_templates/reverse-srs-spec.md`) + `srs/` (flows/states/erd mermaid) + `usecases/` (uc fully-dressed +
  index). Mỗi FR/BR/Error viết CHI TIẾT (điều kiện/nhánh/wording exact), __bóc HẾT__ mọi rule/error/edge có
  trong nguồn, KHÔNG lược thành 1 dòng. Bám cột chuẩn của template, KHÔNG bắt chước demo cũ (demo lệch).
- **Output vào `docs/_reverse/{feature}/`** (folder project-level trong `docs/`, như `_shared`/`_product`) —
  giữ trong `docs/` để hook/KG/gap/dashboard quét được (traceability). KHÔNG đè `docs/{feature}/`.
- __Sub-agent READ-ONLY, KHÔNG ghi file đích__ (`approval-gate.md`) — Phase D (viết nháp) + Phase E (audit) +
  Phase A (convert) chỉ __TRẢ proposed content/findings__; __main thread Write__ sau L1/L2. KHÔNG có "Write
  rồi confirm". KHÔNG spawn Task chạy trọn skill khác (không fork /srs).
- __Phase-gate deterministic__ — sau mỗi phase kiểm `file exist + size>0 + (JSON parse nếu json)`; không đạt
  → retry sub-agent ĐÚNG 1 LẦN (append lý do fail vào prompt) → vẫn fail: stop + surface partial state,
  KHÔNG suy diễn từ kết quả một phần.
- __Parser theo loại file__ — `.md/.txt` đọc thẳng; `.pdf` Read trực tiếp (scan-ảnh kém → OCR/vision);
  `.docx/.xlsx/.pptx` __PHẢI convert__ (markitdown nếu dùng được, fallback pandoc cho docx); ảnh → Read vision.
- **Probe markitdown bằng chức năng THẬT, không chỉ `import`** — môi trường có package markitdown __vỏ rỗng__
  khiến `import markitdown` pass giả tạo. Kiểm `markitdown --help` hoặc `from markitdown import MarkItDown`.
  Không đạt → pandoc cho docx, skip xlsx/pptx (ghi Gap). Sau convert __đếm nguồn dùng được__ (=0 → abort).
- __Nhãn 3-claim BẮT BUỘC__ mọi mệnh đề: __✅ chắc chắn__ (nguồn ghi rõ) / __🔵 suy đoán__ (≥2 nguồn) /
  __🟡 cần xác nhận__ (suy-1-nguồn HOẶC thiếu hẳn). Thiếu hẳn → `<!-- TBD -->` + OQ. KHÔNG trộn hypothesis
  vào như fact, KHÔNG giọng chắc nịch cho 🔵/🟡.
- __Provenance mọi mệnh đề__ — đánh ID nguồn (S1/S2…) ở `reverse-sources.md`; mỗi hàng bảng có cột `Nguồn`;
  hàng không neo được nguồn → tối đa 🟡. Đây là hàng rào chống bịa mạnh nhất.
- __Screenshot là nguồn hạng thấp__ — chỉ ✅ cái nhìn-thấy (label/field/nút/thứ-tự-màn). Rule/validation/điều
  kiện phía sau UI = 🟡 (hoặc 🔵 nếu ≥2 nguồn). CẤM single-source rule từ 1 ảnh.
- __CÓ sinh diagram (flows/states/erd) NHƯNG chống over-inference__ — dựng mermaid từ flow/rule ĐÃ có nhãn
  trong spec; bước/nhánh nào suy đoán → chú thích 🔵/🟡 ngay cạnh diagram. KHÔNG bịa bước không có nguồn. Từ
  ảnh tĩnh: chỉ vẽ luồng nhìn-thấy, phần sau UI = 🟡. Verify mermaid compile (`.claude/scripts/mermaid-verify.mjs`).
  __KHÔNG sinh:__ userflow, wireframe, prototype, tài liệu API, user story (ngoài phạm vi). Mục 10 Screens
  trong spec vẫn tóm tắt bullet (không wireframe).
- __Dò trùng feature qua KG__ (`kg-usage.md`) — Phase B là đọc-rộng-để-chọn: `kg facts`/`kg counts` shortlist
  → Read prose kết luận trùng nghiệp vụ (KHÔNG so slug thuần). `KG-ERROR` → fallback glob `docs/*/`.
- **KHÔNG đè `docs/{feature}/`** — feature trùng doc hiện có → điền __Mục 0.3 bảng khác biệt__ trong
  reverse-spec + recommend `/cr` `/gap`. KHÔNG merge vào `urd/brd/srs`.
- **DỪNG ở output + route `/srs`** — reverse-doc KHÔNG chain sang `/srs`. Report "Next: `/srs {feature}`".
  `reverse-spec.md` là upstream tùy chọn của `/srs` (giữ nhãn confidence — /srs đọc reverse + hỏi từng 🟡).
- __Output LUÔN trong workspace BA, KHÔNG ghi vào repo nguồn__ — nguồn read-only (có thể ở ổ/repo khác). Mọi
  Write dùng đường dẫn tuyệt đối tới workspace BA (nơi có `CLAUDE.md` + `.claude/`).
- __status: draft cứng__ — reverse KHÔNG bao giờ `approved`. Mục 0 ghi rõ "CHƯA duyệt".
- __IT-BA framing__ (`ba-conventions` Mục 3) — output business language, KHÔNG schema/endpoint/SDK/function name.
- __Vietnamese-first__ default, auto-detect từ nguồn. Muốn tiếng Anh → nói "viết bằng tiếng Anh".
- __Feature mới__ — Nhóm A của `feature-bootstrap` (điểm vào, derive slug từ NGUỒN, tạo nhiều feature 1 lần).
  @author = current_user cho activity log (`ba-conventions` Mục 1), KHÔNG vào frontmatter.
- __Sub-agent chỉ read-only__ — Phase A convert + Phase D viết nháp + Phase E audit đều TRẢ proposed, main
  Write. KHÔNG spawn Task chạy trọn /srs (không fork). Spawn nhiều Task convert SONG SONG trong 1 message OK.
- **Feature trùng — KHÔNG ghi đè `docs/{feature}/`** — chỉ ghi `docs/_reverse/{feature}/` + Mục 0.3. Reconcile
  qua `/cr` `/gap`.
- __⚠️ NGUỒN ≠ WORKSPACE__ — nhận path nguồn (vd `/path/to/source-docs/...`) rồi suy output tương đối
  theo nguồn → SAI. Output luôn vào `docs/_reverse/` của workspace BA (dir có `CLAUDE.md`+`.claude/`), thường
  khác ổ/repo với nguồn. Nguồn read-only; KHÔNG tạo/sửa/xóa gì trong cây nguồn.

### Pitfalls — easy to get wrong‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

- __Đây là REVERSE ra SRS chuẩn, KHÔNG phải brainstorm ý tưởng mới__ — KHÔNG sáng tạo feature/FR ngoài nguồn.
  Mọi mệnh đề truy được về 1 nguồn (cột Nguồn). Suy đoán gắn 🔵/🟡, không trộn với fact ✅.
- __KHÔNG HỎI LẠI USER để làm rõ nghiệp vụ__ — chưa rõ → OQ/Gap/Conflict vào `reverse-gaps.md`. Chỉ hỏi
  DUY NHẤT "nguồn ở đâu" (Phase A khi no-arg). L1 approval Write vẫn giữ (đồng ý ghi file ≠ hỏi nghiệp vụ).
- __markitdown dương-tính-giả (đã đo thật)__ — package vỏ rỗng `0.0.1a1`: `import markitdown` PASS nhưng
  `from markitdown import MarkItDown` FAIL. Luôn probe bằng chức năng thật. Không đạt → pandoc/skip + Gap.
- __CÓ sinh diagram flows/states/erd__ (mermaid) từ flow/rule ĐÃ có nhãn — bước suy đoán chú thích 🔵/🟡,
  KHÔNG bịa bước không nguồn. Verify compile. KHÔNG sinh userflow/wireframe/prototype/API/user story. Mục 10
  Screens trong spec vẫn tóm tắt bullet (không wireframe).
- __Ảnh/screenshot là suy đoán mặc định__ — wording nhìn-thấy ✅; rule/limit sau UI 🟡. Cross-check ≥2 nguồn
  mới lên 🔵. Cảnh báo PII khi ảnh chứa dữ liệu thật.
- __Dò trùng qua KG__ — so nghiệp vụ (Read prose), không so slug thuần. `KG-ERROR` → fallback glob.
- __DỪNG ở output + route /srs__ — KHÔNG chain. Report "Next: /srs {feature}". Giữ nhãn confidence.
- __status: draft cứng__ — reverse KHÔNG bao giờ approved. Mục 0 ghi "CHƯA duyệt".
- __Encoding tiếng Việt__ — `Identity-H`/TCVN → mojibake; ghi cột Encoding ⚠ + confidence thấp, không đọc rác.
- __@author__ — `ba-conventions` Mục 1: current_user từ memory `user-identity`; KHÔNG vào frontmatter.
- __Nguồn mâu thuẫn cross-source__ — 2 nguồn khác nhau cùng 1 điểm → ghi cả 2 + 🟡 + Conflict vào reverse-gaps,
  KHÔNG tự chọn bên.

## Inputs

```
/reverse-doc                                        # interactive: hỏi nguồn (chỉ hỏi NGUỒN Ở ĐÂU, không hỏi nghiệp vụ)
/reverse-doc <folder>                               # 1 folder
/reverse-doc <folder1> <folder2> <file.docx>        # nhiều nguồn rời
/reverse-doc @<file>                                # 1 file tag
```

Ví dụ:
```
/reverse-doc ./old-specs
/reverse-doc /path/to/source-docs/features/
/reverse-doc ./legacy-docs ./screenshots ~/Downloads/payment-flow.docx
```

Đổi hành vi mặc định bằng lời (KHÔNG flag — `feedback_flag_diet_natural_chat`):
- Viết tiếng Anh → "viết bằng tiếng Anh".
- Chỉ tái lập 1 feature → "chỉ làm feature {slug} thôi".

## Context (dynamic)

Today: !`date +%Y-%m-%d`
Workspace root: !`pwd`
Existing features (dò trùng): !`ls -d docs/*/ 2>/dev/null | xargs -I{} basename {} | grep -v "^_" | grep -vE "blockers|decisions|exports|impacts|inbox|meetings|redoc|reports|cr" | tr '\n' ' '`
Existing reverse specs: !`ls docs/_reverse/*/*-reverse-spec.md 2>/dev/null | tr '\n' ' ' || echo "(chưa có)"`
markitdown (probe chức năng, KHÔNG chỉ import): !`markitdown --help >/dev/null 2>&1 && echo "CLI OK" || (python3 -c "from markitdown import MarkItDown" >/dev/null 2>&1 && echo "API OK" || echo "KHÔNG DÙNG ĐƯỢC (import trần pass nhưng vỏ rỗng)")`
pandoc fallback: !`which pandoc 2>/dev/null || ls ~/bin/pandoc 2>/dev/null || echo "no pandoc"`

---

## Approach — chạy 1 mạch Phase A→G (không HARD STOP hỏi user)

### Phase A — Thu nhận & chuẩn hoá nguồn

1) __Resolve nguồn:__
   - No arg → hỏi DUY NHẤT "Anh đưa em nguồn nào? (folder, nhiều folder, hoặc `@file`)". (Chỉ hỏi NGUỒN Ở
     ĐÂU — KHÔNG hỏi nghiệp vụ.) Wait.
   - User trả lời không kèm path đọc được → đề xuất tạo `docs/_inbox-reverse/{slug}/` để thả file, DỪNG chờ.
   - Folder → glob đệ quy: `*.md *.txt *.docx *.pdf *.xlsx *.pptx *.png *.jpg *.jpeg *.webp`. Nhiều arg → gom
     phẳng, khử trùng. Folder rỗng → báo rõ, KHÔNG proceed với 0 nguồn.
2) __Phân loại nguồn theo parser__ (parser theo LOẠI file): `.md/.txt` Read thẳng · `.pdf` Read trực tiếp
   (lớn/scan kém → markitdown/OCR) · ảnh Read vision (cảnh báo PII nếu dữ liệu thật) · `.docx/.xlsx/.pptx`
   PHẢI convert (A.4).
3) __In bảng inventory nguồn__ (chat): `# | nguồn | loại | cách xử lý`.
4) __Convert docx/xlsx/pptx (chỉ khi có file Office):__
   - __Probe markitdown bằng CHỨC NĂNG THẬT__ (`markitdown --help` / `from markitdown import MarkItDown`) —
     KHÔNG chỉ `import` (package vỏ rỗng làm import pass giả).
   - Dùng được → convert qua nó. KHÔNG dùng được: `.docx` → pandoc (`pandoc in.docx -t gfm -o out.md`);
     `.xlsx/.pptx` → SKIP + ghi Gap vào `reverse-gaps.md` ("nguồn {x} chưa đọc được, cần export .md/.pdf").
   - __L1 trước batch convert__ (subagent ghi `.convert/` là Write): in "sẽ convert {K} file → `.convert/`",
     user Y → spawn. ≥3 file → chia batch spawn nhiều `Task` general-purpose SONG SONG (mỗi subagent: convert
     + trả path .md + tóm tắt + __báo file convert THẤT BẠI__; KHÔNG suy diễn nghiệp vụ). 1-2 file → Bash thẳng.
   - __GATE-A — đếm nguồn dùng được__ = (md/txt/pdf/ảnh gốc) + (convert THÀNH CÔNG). =0 → __ABORT__. Có‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍
     skip/fail → ghi Gap + liệt kê rõ trước khi sang Phase B.
5) __Cảnh báo encoding tiếng Việt__ — mojibake/`Identity-H`/TCVN → ghi vào `reverse-sources.md` cột Encoding
   ⚠ + hạ confidence nguồn đó, KHÔNG đọc mù ký tự rác.

### Phase B (gồm cả bước ghi kế hoạch) — Đọc hết + cluster feature + dò trùng → reverse-plan.json

> Không có "Phase C" riêng: bước ghi kế hoạch (`reverse-plan.json`) gộp vào cuối Phase B vì đã bỏ HARD STOP
> hỏi user giữa chừng. Trục còn lại: A (nguồn) · B (cluster + kế hoạch) · D (viết) · E (audit) · F (write) · G (OQ + report).

6) __Đọc hết nội dung__ (md gốc + convert + pdf + ảnh). __Clean-room: mô tả cái đọc được TRƯỚC khi suy luận__
   (chống context poisoning). Trích signal nghiệp vụ (feature/role/flow/rule/limit/wording/screen/error).
7) __Cluster thành tính năng__ (DDD): changes-together → 1 feature; biên ngôn ngữ khác → tách. 1 màn+flow+rule
   quanh 1 mục tiêu user → 1 feature. Mỗi feature: derive slug kebab-case ASCII (`naming-conventions`), chấm
   confidence tổng. Kiểm hạt: tên "quản lý/và/hoặc" → cân nhắc tách; 1 field lẻ → cân nhắc gộp. **Mơ hồ tách-gộp
   → tự quyết theo nguồn + ghi note/OQ, KHÔNG dừng hỏi.**
8) __Detect complexity flags__ mỗi feature (external redirect/OAuth/payment/webhook/async/multi-role/state
   machine/throttle) → để Phase D biết Mục nào cần điền kỹ.
9) __Dò trùng feature đã có — qua KG__ (`kg-usage.md`): `kg counts`/`kg facts` shortlist → __Read prose__ feature
   nghi trùng để kết luận trùng *nghiệp vụ* (không chỉ trùng *slug* — vd `payment-checkout` trùng `payment`).
   Trùng → đánh `existing_doc: docs/{feature}/`, sẽ điền Mục 0.3 ở Phase D. `KG-ERROR` → fallback glob.
10) **Ghi `docs/_reverse/reverse-plan.json`** (manifest máy-đọc-được, thay `.reverse-plan.md`; L1 ngắn rồi
    Write; đã tồn tại → L2 diff). Mỗi entry: `{slug, sources:[ids], existing_doc, confidence, complexity_flags,
    status:"pending"}`. __GATE-B:__ JSON parse được, mỗi entry có slug hợp lệ + ≥1 nguồn.
    - __In bảng chia feature cho user THẤY__ (informational): `# | feature | nguồn | confidence | trùng?`. User
      có thể chỉnh (gộp/tách/đổi slug) nếu muốn — nhưng skill KHÔNG chặn-chờ, mặc định chạy tiếp Phase D.

### Phase D — Viết nháp SRS-reverse per-feature (batch tuần tự)

11) __BATCH TUẦN TỰ 2-3 feature/batch__ (đọc `reverse-plan.json`, lấy entry `status:pending`). Mỗi feature:
    spawn **1 sub-agent `Task` READ-ONLY** đọc nguồn đã map (S-ids) → __TRẢ proposed content__ cho __CẢ BỘ file__
    (KHÔNG tự Write):
    - `{feature}-reverse-spec.md` (12 Mục ĐẦY ĐỦ theo `_templates/reverse-srs-spec.md`; mỗi FR/BR/Error CHI TIẾT
      + bóc HẾT không lược) + `reverse-sources.md` + `reverse-gaps.md`.
    - `srs/{feature}-reverse-flows.md` (**MỖI flow ĐỦ 2 diagram: `sequenceDiagram` + `flowchart`** — KHÔNG chỉ
      1 loại), `srs/{feature}-reverse-states.md` (state diagram entity multi-state), `srs/{feature}-reverse-erd.md` (erDiagram + Entity Reference).
    - `usecases/uc-{slug}.md` (fully-dressed, sections __a–h__: Introduction/Actors/Pre-conditions/Expected result/
      Activity diagram/Screens/Related FR/Open Questions) mỗi function chính + `usecases/{feature}-reverse-usecase-index.md`.
      (Scheme a–h CỐ Ý — khác Cockburn của `/usecase` mainline; reverse là tầng tái-lập-chưa-duyệt tách khỏi mainline.
      `/usecase` downstream đọc file này hiểu là bản reverse, không lẫn với UC chính thức.)
    - Sub-agent prompt gồm: nội dung nguồn + quy tắc nhãn 3-claim + cột Nguồn + "**flows.md: MỖI flow có CẢ
      sequence LẪN activity** (KHÔNG chỉ 1 loại); diagram chỉ vẽ bước CÓ nguồn, bước suy đoán chú thích 🔵/🟡"
      + "chưa rõ/thiếu/mâu thuẫn → OQ/Gap/Conflict vào reverse-gaps, KHÔNG bịa,
      KHÔNG hỏi" + "chỉ TRẢ content, KHÔNG Write". Feature đơn giản (ít flow/1 entity) → có thể lược states/erd
      nếu nguồn không đủ, ghi rõ lý do.
    - Tuần tự vì các feature có thể share nguồn + để giữ nhất quán nhãn. 2-3 feature/batch cân bằng tốc độ/context.
    - Điền đủ 12 Mục. Mục thiếu nguồn → để trống + `<!-- TBD -->` + OQ. Feature trùng doc hiện có → Mục 0.3.
    - __GATE-D per-feature:__ đủ 12 Mục + Mục 0 + (flows/states/erd/uc khi nguồn đủ); **flows.md: MỖI flow đủ 2
      block sequence+flowchart (số flow × 2 = số mermaid; thiếu 1 loại = FAIL)**; mỗi mệnh đề có cột
      Nguồn+Nhãn; mermaid tuân `diagram-selection.md` "Mermaid syntax safety" (KHÔNG `;` trong label → node
      rác; quote label flowchart có ký tự đặc biệt; label transition NGẮN) + verify compile OK (nhớ mmdc PASS
      ≠ renderer thật, phòng-ngừa-khi-viết là chính); thiếu → retry sub-agent ĐÚNG 1 LẦN (append lý do) → vẫn fail:
      surface partial + ghi Gap, tiếp feature khác.

### Phase E — Audit ngược (sub-agent kiểm-chứng độc lập)

12) __Spawn sub-agent audit__ (gap-analyst/senior-ba) cho mỗi feature vừa có proposed content — **đọc lạnh,
    KHÔNG viết đè**: phân rã doc thành __claim nguyên tử__ → đối chiếu NGƯỢC về nguồn (S-id). Claim không neo
    được nguồn → __đề xuất hạ 🟡 hoặc loại__; over-inference từ ảnh → 🟡; giọng chắc nịch ở phần suy đoán → gỡ.
    - Tính __chỉ số confidence__ (đếm ✅/🔵/🟡) → điền `confidence_summary` frontmatter.
    - Chấm theo rubric (nguồn→mệnh đề→nhãn), __KHÔNG so chéo giữa feature__ (`feedback_homework_review_no_cross_compare`).
    - __KHÔNG được tách/gộp/đổi-slug feature__ (cách chia đã chốt ở reverse-plan.json) — chỉ sửa nhãn/nguồn/OQ/
      nội-dung trong feature. Muốn đổi cách chia → note vào reverse-gaps, KHÔNG tự áp.
    - Skill __áp findings__ vào proposed content (hạ nhãn, thêm OQ, gỡ over-inference). __GATE-E:__ 0 claim mồ
      côi (không nguồn) còn ở nhãn ✅/🔵.

### Phase F — L1 approval + Write (main thread)

13) __L1 plan preview (BA-facing prose, batch)__ (`ba-conventions` Mục 5) — liệt kê __bộ file/feature__ sẽ tạo
    (spec + sources + gaps + flows/states/erd + usecases) + 1-2 dòng nội dung nổi bật + chỉ số confidence
    (✅/🔵/🟡) + số OQ mỗi feature. Prose tự nhiên, KHÔNG bảng dev. User Y. (approval-gate GHI FILE — KHÁC
    checkpoint hỏi-nghiệp-vụ đã bỏ.)
14) __Write__ từng file vào `docs/_reverse/{feature}/` từ template. File đã tồn tại → __L2 diff__. Tạo folder
    khi Write (Write tự tạo cha). Sau mỗi feature Write xong → **mark `status:"done"`** trong `reverse-plan.json`
    (resumable — chạy lại bỏ qua feature done). Append activity log (hook).
    - __Checkpoint per-batch__ (nhịp ghi file, KHÔNG phải hỏi nghiệp vụ): sau mỗi batch in bảng tiến độ
      (`đã viết / còn lại`) + [tiếp / bỏ phần còn lại / dừng]. Honor lựa chọn.

### Phase G — Resolve OQ + verify + report

15) __Resolve OQ__ (own-OQ-only per `resolve-oqs.md` — reverse là gốc): gom OQ các feature từ `reverse-gaps.md`
    → prompt `Y/skip/ids` → loop 1-by-1 → cascade scan TRONG reverse-spec/gaps (không scan doc khác). Nhiều
    feature → selector `{feature}:OQ-n`. OQ giữ lại được `/urd /brd /prd-epic /srs` inherit về sau.
16) __FINAL VERIFY MATRIX__ — bảng feature × [reverse-spec, sources, gaps, flows, states, erd, usecase-index]
    × [exist, size>0] + __mermaid verify__ các file srs/ (`.claude/scripts/mermaid-verify.mjs --file ...`).
    Report CHỈ báo success khi mọi dòng pass + mọi mermaid compile OK. Feature fail → liệt kê rõ.
17) __In report__:
    ```
    ✅ Reverse-documentation xong → BỘ SRS đầy đủ đa-tầng per-feature.
       Tính năng đã viết: {N}   (mỗi feature: confidence ✅{a} 🔵{b} 🟡{c})
       → docs/_reverse/{feature}/ : spec (12 Mục) + sources + gaps + srs/(flows,states,erd) + usecases/
       Feature trùng đã đối chiếu: {M} (xem Mục 0.3 mỗi spec)
       Open Questions còn hold: {Q}  (xem reverse-gaps.md mỗi feature)
       File tạm convert: docs/_reverse/.convert/ (có thể xoá)

    Recommended next (per feature):
      - /reverse-preview <feature>  — xem bộ reverse dạng HTML (giữ nhãn ✅/🔵/🟡 + Gaps/OQ)
      - /srs <feature>       — hình thức hoá thành SRS chuẩn (đọc reverse làm nguồn + xác nhận từng 🟡/TBD)
      - /gap <feature>       — đối chiếu sâu nếu trùng docs hiện có
      - /cr "<đổi gì>" --feature <feature>  — reconcile khác biệt Mục 0.3
    ```

---

## Output

Ghi vào `docs/_reverse/{feature}/` — __TÁCH khỏi__ `docs/{feature}/`, KHÔNG đè doc chính thức. Có thể sinh NHIỀU feature trong 1 lượt chạy.

| File | Nội dung |
|---|---|
| `{feature}-reverse-spec.md` | SRS 12 Mục + cột Nguồn/Nhãn + Mục 0 provenance. **`status: draft` cứng** |
| `reverse-sources.md` | Danh mục nguồn (file/loại/ngày/confidence/encoding) |
| `reverse-gaps.md` | OQ + Gap + Conflict + Inferred |
| `srs/{feature}-reverse-{flows,states,erd}.md` | Mermaid |
| `usecases/{feature}-reverse-usecase-index.md` + `uc-{slug}.md` | Use case |

Manifest chung: `docs/_reverse/reverse-plan.json` (resumable). Convert tạm: `docs/_reverse/.convert/`.

KHÔNG sinh `_evidence.md` (chỉ `/code-to-srs` có).

## Cách build skill này (giáo án — để người sau maintain hiểu logic)

> Skill KHÔNG có engine script; logic là Claude đọc SKILL.md rồi tự chạy Phase A→G (1 mạch, không HARD STOP).

__Công thức chung:__ `parse (parser theo loại) → cluster theo domain (KG dò trùng) → viết BỘ SRS đầy đủ
per-feature (spec 12 Mục + flows/states/erd + usecases, sub-agent read-only) → audit ngược gắn nhãn + gaps
→ L1 → main Write → verify matrix + mermaid compile`.

1) __Vì sao NGUỒN=PROOF, không hỏi user?__ (user chốt 2026-07-17). Tài liệu cung cấp đã là bằng chứng nghiệp
   vụ; hỏi lại từng chỗ mơ hồ sẽ chậm + phiền. Thay bằng: bám nguồn viết thẳng, mọi chỗ chưa chắc → OQ/Gap/
   Conflict vào `reverse-gaps.md`. BA đọc file đó để biết cần xác nhận gì. Bỏ CHECKPOINT + HARD STOP giữa.
2) __Vì sao output SRS 12 Mục, không phải khung brainstorm?__ (user chốt). Mục tiêu reverse là ra tài liệu
   CHUẨN CHỈNH kiểu SRS, không phải nháp nông. Bám `_templates/reverse-srs-spec.md` = khung SRS thật + nhãn.
3) __Vì sao vẫn ở tầng tái-lập-chưa-duyệt (nhãn + draft), không phải SRS approved?__ Nguồn lộn xộn không đủ
   chắc để thành spec duyệt. Giữ cột Nhãn + status:draft là giá trị cốt lõi. `/srs` mới hình thức hoá (hỏi
   từng 🟡). Nếu chain thẳng /srs → 🟡 bị nâng thành FR chắc nịch → phá rào chống-bịa.
4) __Vì sao sub-agent read-only?__ `approval-gate.md` cấm sub-agent ghi file đích trước approval (rollback không
   tin cậy — bug CR-20260612-001). Sub-agent TRẢ proposed content, main thread Write sau L1/L2.
5) __Vì sao phase-gate + retry-1-lần?__ Chống "agent trả về nhưng không ghi gì / thiếu mục".
   Rẻ + mạnh. Retry đúng 1 lần với lý do fail; vẫn fail thì surface partial, không suy diễn kết quả dở.
6) __Vì sao audit ngược (Phase E) riêng?__ LLM viết nháp dễ tự-tin-quá; agent thứ 2 đọc
   lạnh, phân rã claim, đối chiếu ngược nguồn — bắt over-inference (nhất là từ ảnh) trước khi trình user.
7) **Vì sao `docs/_reverse/` chứ không ngoài docs?** Hook (auto-changelog/stale/kg-refresh) + kg-build hard-code
   quét `docs/`. Ra ngoài = mù automation (mất chính traceability provenance). `_reverse/` là folder
   project-level trong docs (như `_shared`/`_product`) → cover đủ, 0 sửa hook.
8) __Vì sao reverse-plan.json (không .md)?__ Máy-đọc-được → resumable (mark status:done/feature) + drive batch
   Phase D. Chạy lại bỏ qua feature đã xong.

## References

- @../../rules/ba-conventions.md
- @../../rules/approval-gate.md
- @../../rules/naming-conventions.md
- @../../rules/keyword-detection.md
- @../../rules/feature-bootstrap.md
- @../../rules/kg-usage.md
- @../../rules/resolve-oqs.md
- @../../rules/changelog.md
- @../../rules/diagram-selection.md
- @../../../_templates/reverse-srs-spec.md
- @../../../_templates/reverse-sources.md
- @../../../_templates/reverse-gaps.md
- @../../../_templates/reverse-srs-flows.md
- @../../../_templates/reverse-srs-states.md
- @../../../_templates/reverse-srs-erd.md
- @../../../_templates/reverse-usecase-index.md
- @./references/example-reverse-doc.md‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍


<!-- wm:2b9af6c9b691879b1ddb7a04d29a1c88 -->
<sub>Tài liệu thuộc bộ AI4BA BA-Kit — bản quyền ai4ba.com</sub>
