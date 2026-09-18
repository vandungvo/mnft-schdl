# Feature Bootstrap — xử lý khi input chưa khớp feature nào‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

> Rule chung cho MỌI skill có input dạng `<feature>` hoặc mô tả nghiệp vụ. Trả lời câu hỏi: **user gõ skill với 1 luồng/mô tả bất ngờ mà `docs/{feature}/` chưa tồn tại thì làm gì?** Mục đích: không skill nào bế tắc mềm (soft-gate warn im lặng) hoặc improvise ngoài thiết kế. Mỗi skill MUST reference file này trong Constraints + References nếu nhận input feature.

## Vấn đề‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

Mọi bash `## Context (dynamic)` chỉ liệt kê feature __đã tồn tại__ (`ls -d docs/*/`, glob `srs/{feature}-spec.md`...). Feature hoàn toàn mới không xuất hiện → picker/auto-detect ra RỖNG. Output path `docs/{feature}/...` cần `{feature}` giải được — chưa có thì không Write được. Trước rule này, mỗi skill tự xử lý khác nhau (4 mức chất lượng lộn xộn). Rule này chuẩn hóa thành 3 nhóm hành vi.

## Phân loại 3 nhóm skill‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

| Nhóm | Skill | Hành vi khi feature chưa có |
|---|---|---|
| __A — Điểm vào__ (có thể khởi tạo feature) | `brainstorm`, `urd`, `brd`, `prd-epic`, `usecase` (discovery mode), `user-flow`, `bpmn`, `sequence`, `activity`, `activity-swimlane`, `erd`, `state`, `d2-activity`, `d2-erd`, `d2-architect`, `reverse-doc`, `code-to-srs` | __Derive slug + phỏng vấn đúng phạm vi + tạo feature.__ Xem Mục "Nhóm A". (`reverse-doc` + `code-to-srs` là biến thể: derive slug từ NGUỒN/CODE thay vì phỏng vấn, xem ghi chú dưới.) |
| __B — Giữa/cuối chain__ (cần artifact upstream làm nguồn) | `usecase-diagram`, `userstory`, `ac`, `figma`, `prototype`, `jira`, `confluence`, `export`, `preview`, `reverse-preview`, __họ API__ (`api-assess`, `api-doc`, `api-design`, `api-map`, `api-checklist`, `api-test`, `api-readiness`) | __Refuse tường minh + route cụ thể về skill upstream.__ KHÔNG tự tạo feature. Xem Mục "Nhóm B". |
| __C — Read-only / project-level__ (không cần feature) | `dashboard`, `gap`, `review`, `market`, `prd`, `roadmap`, `meet`, `discover`, `update-overview`, `delegate`, `userguide`, `doc-drift` | __Friendly empty-message.__ Xem Mục "Nhóm C". |

> `srs` là trường hợp riêng: là orchestrator, có thể khởi tạo `spec.md` (điểm-vào cho phần spec) nhưng các phần downstream trong menu thì theo nhóm B. Xử lý: `spec.md` chưa có → theo nhóm A (derive slug + phỏng vấn Batch 1-2 + tạo `srs/` folder); phần downstream vẫn cần spec.md vừa chốt.

> __Họ API (7 skill) — nhóm B, luôn trong 1 feature đã có.__ Không skill API nào tự khởi tạo feature: chúng gắn vào feature đang tồn tại (`docs/{feature}/`) và cần upstream theo pipeline `api-integration.md` (`api-assess → api-doc → api-design → api-map → api-checklist → api-test → api-readiness`). Feature chưa có → __refuse + route__ `/brainstorm`/`/srs` để tạo feature trước. Trong feature đã có nhưng thiếu upstream trực tiếp → refuse + route đúng bước trước (vd `/api-test` thiếu checklist → `/api-checklist`; `/api-design` thiếu hiểu contract → `/api-doc`). `/api-doc` cần thêm __nguồn__ (OpenAPI/PDF/URL) — thiếu nguồn thì hỏi nguồn, KHÔNG phỏng vấn derive-slug kiểu nhóm A.

> `usecase` cũng là trường hợp __2 mode__ (khác `usecase-diagram`/`userstory` thuần nhóm B): use case là kỹ thuật __elicitation__ — trong thực tế BA thường viết TRƯỚC SRS để khám phá nghiệp vụ. Nên `srs/{feature}-spec.md` __chưa có → discovery mode = nhóm A__ (derive slug + phỏng vấn actor/goal/flow/lỗi + tạo feature; UC draft, cột FR/errors trống, đánh OQ, route `/srs` để hình thức hóa). `srs/{feature}-spec.md` __có → downstream mode__ (trích FR, điền traceability đầy đủ). Skill tự chọn mode. KHÔNG refuse khi thiếu SRS — đó là chặn nhầm luồng elicitation chuẩn.

## Nhóm A — Điểm vào: derive slug + phỏng vấn đúng phạm vi + tạo feature‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

Khi arg KHÔNG khớp folder `docs/{arg}/` nào tồn tại:

1) __Nhận diện loại input.__ Arg là mô tả nghiệp vụ (prose, nhiều từ, có động từ/tân ngữ) hay slug gõ sai (1 từ kebab-case)?
   * Prose → coi là mô tả, sang bước 2.
   * Slug-lạ 1 từ → hỏi "Chưa có feature `{arg}`. Đây là feature mới hay anh gõ nhầm? Feature hiện có: {list}." Đợi trả lời.
2) __Derive feature slug__ từ nội dung mô tả: main domain noun phrase, kebab-case, ASCII (transliterate tiếng Việt), ≤50 ký tự (theo `naming-conventions.md`). Vd "khách đặt hàng, shipper giao, admin duyệt hoàn tiền" → `order-fulfillment` hoặc `ecommerce-order`. Không suy được slug rõ → hỏi user tên feature slug mong muốn.
3) __Phỏng vấn ĐÚNG PHẠM VI skill đó cần__ (KHÔNG hỏi lan man kiểu `/brainstorm` toàn diện — mỗi skill chỉ hỏi cái mình cần để làm output của mình):
   * `/bpmn`: actors/lanes · các bước · điểm rẽ nhánh (branches) · kết cục + error-path.
   * `/sequence`: actors · thứ tự message · nhánh error (alt/opt).
   * `/activity`: các bước tuần tự · decision points · lanes (nếu đa vai) · loop. (Đa vai nhiều cross-lane → gợi ý `/activity-swimlane` cho swimlane thật.)
   * `/activity-swimlane`: vai trò/lane (ai làm bước nào) · các bước tuần tự · decision points (câu hỏi + nhánh yes/no) · loop. Là default cho activity đa-vai.
   * `/erd` · `/d2-erd`: entities · attribute nghiệp vụ mỗi entity · quan hệ (cardinality).
   * `/state`: entity nào · các trạng thái · trigger mỗi transition · transition cấm.
   * `/usecase` (discovery mode, chưa có SRS): primary actor · user goal (sea-level) · main success scenario (các bước) · nhánh rẽ + lỗi · điều đảm bảo khi thành công/thất bại. Số nghiệp vụ chưa rõ (thời hạn, ngưỡng) → đánh OQ, KHÔNG bịa. Route `/srs` sau đó để hình thức hóa FR.
   * `/d2-activity`: như `/activity`. `/d2-architect`: khối logic · service · dịch vụ ngoài · luồng gọi.
   * `/user-flow`: đã tự làm (suy luận mode + clarify). `/urd`: phỏng vấn user needs. `/brainstorm`: phỏng vấn toàn diện (đây là vai của nó).
   * `/reverse-doc`: __KHÔNG phỏng vấn, KHÔNG hỏi lại user__ (nguồn = proof) — đọc NGUỒN (docx/pdf/ảnh...) rồi cluster thành nhiều feature, derive slug mỗi feature từ nội dung nguồn. Có thể tạo NHIỀU feature 1 lần. Chỗ nguồn thiếu/mơ hồ/mâu thuẫn → ghi OQ/Gap vào `docs/_reverse/{feature}/reverse-gaps.md`, KHÔNG dừng hỏi. Chỉ hỏi DUY NHẤT "nguồn ở đâu" khi no-arg. Xem `reverse-doc/SKILL.md`.
   * `/code-to-srs`: **như `/reverse-doc` nhưng nguồn = SOURCE CODE** — đọc route/controller/service/model/migration (qua `code-explorer` + `stacks-reference`) rồi cluster thành feature nghiệp vụ, derive slug từ CODE. Có thể tạo NHIỀU feature 1 lần. Code câm về "vì sao/cho ai" → OQ vào `reverse-gaps.md`, KHÔNG hỏi. Chỉ hỏi DUY NHẤT "codebase ở đâu" khi no-arg (KHÔNG tự lấy cwd làm codebase — cwd là workspace ghi output). Xem `code-to-srs/SKILL.md`.
   * Phỏng vấn theo IT-BA framing (`ba-conventions.md` Mục 3) — business language, KHÔNG hỏi DB/SDK/endpoint.
4) __Confirm ở L1__ — preview prose BA-friendly gồm cả feature slug đề xuất (user override được) + tóm tắt nội dung sắp vẽ.
5) **Tạo folder `docs/{feature}/`** (+ subfolder cần thiết) khi Write, sau khi user Y ở L1. Đây là feature mới — owner từ memory `user-identity` (`ba-conventions.md` Mục 1).
6) __Gợi ý bước tiếp__ ở Output report: feature vừa tạo mới chỉ có 1 artifact (diagram/flow), nên gợi ý `/brainstorm {feature}` hoặc `/srs {feature}` để hoàn thiện nếu user muốn đi tiếp.

> __Hình mẫu tham chiếu:__ `/brainstorm` (derive slug từ idea), `/user-flow` (nhận cả slug lẫn mô tả tự do + suy luận mode), `/reverse-doc` (đọc nguồn → cluster thành nhiều feature + tự tạo feature, 2 bước HARD STOP).‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

## Nhóm B — Giữa/cuối chain: refuse tường minh + route‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

Các skill này cần artifact upstream (SRS/FR/UC/US/screen) làm NGUỒN THẬT — tự tạo feature rồi sinh nội dung từ con số không sẽ bịa. Khi feature chưa tồn tại HOẶC thiếu artifact bắt buộc:

1) __KHÔNG tự tạo feature. KHÔNG soft-gate warn im lặng rồi proceed bừa.__
2) __Refuse tường minh + liệt kê feature hợp lệ + route cụ thể__ về skill upstream. Dùng câu chuẩn (Mục "Thông điệp chuẩn").
3) Mỗi skill nêu rõ artifact bắt buộc của mình và skill nào sinh ra nó:
   * `/usecase-diagram` cần `srs/{feature}-spec.md` HOẶC `usecases/{feature}-usecase-index.md` → route `/srs` hoặc `/usecase`. (`/usecase` KHÔNG còn ở nhóm B — xem ghi chú 2-mode ở trên.)
   * `/userstory` cần `srs/{feature}-spec.md` (FR) → route `/srs`.
   * `/ac` cần `us-*.md` (story) → route `/userstory`.
   * `/figma`, `/prototype-html` cần ASCII screen trong `ascii-wireframe/{flow-slug}.md` → route `/user-flow` + `/wireframe-ascii`.
   * `/jira` cần `userstories/us-*.md` → route `/userstory`.
   * `/confluence`, `/export`, `/preview` cần ≥1 doc feature (thường `srs/{feature}-spec.md`) → route `/srs`.
   * `/reverse-preview` cần bộ reverse `docs/_reverse/{feature}/{feature}-reverse-spec.md` → route `/code-to-srs` (từ code) hoặc `/reverse-doc` (từ tài liệu). KHÔNG dùng feature chính `docs/{feature}/`.

> __Hình mẫu tham chiếu:__ `/prototype-html` (refuse + liệt kê đủ `/srs`+`/user-flow`+`/wireframe-ascii`), `/test-cases` (refuse thiếu checklist → `/test-checklist`).

## Nhóm C — Read-only / project-level: friendly empty-message

Không cần feature cụ thể (scan toàn vault, hoặc output project-level). Khi vault trống / feature filter sai:

1) __KHÔNG fail cụt, KHÔNG crash.__ In thông điệp thân thiện + hướng dẫn bước khởi tạo.
2) Read-only (`dashboard`/`gap`/`review`): "Vault rỗng / chưa có gì để {phân tích|review}. Bắt đầu với `/brainstorm <idea>` hoặc `/urd <feature>`."
3) Project-level (`market`/`prd`/`roadmap`/`meet`/`discover`/`update-overview`): đây là skill vốn chạy TRƯỚC khi có feature — trạng thái "chưa feature" là hợp lệ (vd `/discover` gọi "Greenfield exploration"). Không cần route.
4) `delegate`: không đụng vault, không áp dụng.
5) `doc-drift`: read-only ra report so code↔docs — nhưng CẦN __docs baseline__ (`docs/{feature}/`) làm nguồn
   so. Feature không có docs → friendly abort + route `/srs {feature}` hoặc `/code-to-srs <path>` (KHÔNG tự
   tạo feature, KHÔNG tự sinh spec). Thiếu `--code` → hỏi codebase ở đâu (KHÔNG lấy cwd làm code).

> __Hình mẫu tham chiếu:__ `/dashboard` (placeholder "Vault rỗng" + empty-vault template), `/gap` (friendly abort).

## Thông điệp chuẩn (picker rỗng / feature sai tên)

Nhóm A khi slug-lạ cần xác nhận:
```
Chưa có feature `{arg}`. Đây là feature mới hay gõ nhầm?
Feature hiện có: {list features}.
→ Nếu mới: em derive slug `{đề xuất}`, xác nhận rồi vẽ luôn.
→ Nếu nhầm: gõ lại tên đúng.
```

Nhóm B khi feature/artifact thiếu:
```
Chưa thể chạy /{skill} cho `{feature}` — thiếu {artifact bắt buộc}.
Feature hiện có: {list}.
→ Chạy /{upstream-skill} {feature} trước để tạo {artifact}, rồi quay lại /{skill}.
```

## Anti-patterns

* ❌ Soft-gate warn "thiếu SRS, em vẫn chạy" rồi proceed sinh nội dung từ con số không (nhóm B) → bịa.
* ❌ Picker rỗng mà không có thông điệp gì → user cụt, không biết làm gì.
* ❌ Improvise output path khi `{feature}` chưa resolve → file lạc chỗ.
* ❌ Nhóm A vẽ ngay từ 1 câu mơ hồ mà KHÔNG phỏng vấn làm rõ phạm vi → diagram sai nghiệp vụ.
* ❌ Nhóm A phỏng vấn lan man toàn diện như `/brainstorm` → trùng vai, phiền user (chỉ hỏi ĐÚNG cái skill cần).

## Tóm tắt 1 dòng

> __Feature chưa có → Nhóm A: derive slug + phỏng vấn đúng phạm vi + tạo folder · Nhóm B: refuse + route upstream · Nhóm C: friendly empty-message.__‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍


<!-- wm:2b9af6c9b691879b1ddb7a04d29a1c88 -->
<sub>Tài liệu thuộc bộ AI4BA BA-Kit — bản quyền hoangphan.blog</sub>
