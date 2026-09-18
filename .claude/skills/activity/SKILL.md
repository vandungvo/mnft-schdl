---
name: activity
description: Dùng khi cần vẽ activity/flowchart diagram Mermaid cho 1 quy trình nghiệp vụ có nhiều nhánh quyết định (approval flow, refund workflow).
allowed-tools: Read, Write, Edit, Bash, Glob, Grep, Task
user-invocable: true
argument-hint: "\"<process description>\" [--feature <slug>]"
---
<!-- Licensed to vandungvo2003@gmail.com — Order YYWVQ3VWE -->

# /activity — Activity / Flowchart Diagram‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

## Goal‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

Produce mermaid `flowchart` cho 1 business process — show decisions, parallels, sub-processes, loops. Phù hợp khi sequence quá tuyến tính hoặc khi process là business workflow (cùng level abstraction với UC). __Output duy nhất__: append section vào `docs/{feature}/srs/{feature}-flows.md` (cùng file sequence, section riêng).

> **Định vị (per `diagram-selection.md`):** `/activity` (Mermaid) là lựa chọn cho __flow gọn 1-2 vai trò__ cần __nhúng inline auto-render__ GitHub/Obsidian. Quy trình __đa vai trò nhiều tương tác chéo lane__ (refund, duyệt nhiều cấp) → mặc định dùng **`/activity-swimlane`** (PlantUML swimlane thật — Mermaid subgraph xô lệch khi nhiều cross-edge). Nếu phát hiện ≥3 lane với nhiều cross-lane edge, đề xuất user chuyển `/activity-swimlane` ở L1 trước khi vẽ.

## Constraints‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

### Hard rules — never violate‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

* __1 output cố định__ — `docs/{feature}/srs/{feature}-flows.md` append mode. KHÔNG flag `--uc`, `--standalone`, `--system-flow`, `--lanes`.
* __L1 approval__ trước Write — prose BA-friendly.
* __KHÔNG L3 iterate__ — mermaid không render trong chat. User review từ rendered file, muốn sửa thì gọi lại skill và nói cần đổi gì.
* __Auto-detect lanes/roles__ từ description: scan role keywords (admin, user, system, approver, manager, CSKH). Nếu ≥2 lane → dùng `subgraph` để chia lane. **Nhưng nếu ≥3 lane + nhiều tương tác chéo lane → subgraph Mermaid xô lệch, đề xuất `/activity-swimlane` (PlantUML) ở L1** — user vẫn có quyền chọn ở lại Mermaid nếu cần nhúng inline.
* __Direction tự chọn theo độ phức tạp__ — mặc định TB (top-bottom); process nhiều lane/rộng thì tự chuyển LR. User muốn ngang thì nói "vẽ theo chiều ngang" trong câu lệnh hoặc câu trả lời.
* **`--feature` optional** — auto-detect từ ngữ cảnh/feature đang làm dở; mơ hồ mới hỏi bằng picker. __Feature chưa tồn tại + arg là mô tả quy trình → tự derive slug + tạo feature__ (điểm-vào, xem `feature-bootstrap.md` nhóm A). KHÔNG bắt qua `/brainstorm` trước.
* __Vietnamese-first__ trong labels (mermaid hỗ trợ Unicode); syntax keywords English.
* __Per @../../rules/diagram-selection.md__ — check process có ≥3 decisions hoặc có parallel; nếu đơn giản tuyến tính → suggest `/sequence`.
* __flows.md không tồn tại__ → tạo mới với frontmatter + heading trần `# {Feature} — Flows` (KHÔNG câu intro/blockquote meta), rồi section `## Flow:` đầu.
* __Đừng tự chốt lane từ heuristic__ — bước 3.5 bắt buộc hỏi user xác nhận danh sách vai trò detect được trước khi generate, vì scan từ khoá dễ bỏ sót actor bị ẩn/ngụ ý trong câu văn.

### Pitfalls — easy to get wrong‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

* __Đừng over-engineer__ — process 3-4 step tuyến tính: dùng sequence hoặc numbered steps.
* __Subgraph naming__ — lane name có space dùng `subgraph "Customer Support"`.
* __Loop__ — `A --> B --> A` OK, nhưng ≥2 loop khác nhau dễ render rối; split thành 2 diagram.
* __Decision có >3 branches__ — Mermaid không có native multi-way; dùng nhiều diamond nối tiếp.
* __Mermaid syntax fail__ — bước 9.5 bắt lỗi qua `mermaid-verify.mjs` NGAY sau Write, tự sửa tối đa 2 lần. KHÔNG còn "vẫn write, warn" im lặng — chỉ báo user paste mermaid.live nếu 2 lần tự sửa vẫn fail.
* __Coverage thiếu ≠ lỗi cú pháp__ — bước 9.5 (compile) và 9.6 (coverage + no-loose-ends) là 2 việc khác nhau. Diagram compile OK vẫn có thể thiếu 1 lane hoặc có 1 nhánh cụt (dead-end) — đừng nhầm "compile OK" là "xong".
* __Sub-process__ — Mermaid không native; dùng node label "[Sub: refund-eligibility-check]" + comment.
* __UC embed__ — nếu user yêu cầu "vẽ activity vào UC X" → cho phép (activity là cùng level business với UC), nhưng vẫn KHÔNG phải responsibility của skill này. Suggest viết tay trong UC Mục e nếu thật sự cần inline. Default vẫn flows.md.

## Inputs

```
/activity "<description>" --feature <slug>       # append section vào flows.md
/activity "<description>"                          # feature auto-detect từ ngữ cảnh, mơ hồ mới hỏi
/activity "<mô tả quy trình của feature mới>"       # feature chưa có → derive slug + phỏng vấn + tạo feature (nhóm A)
```

Muốn ngang thay vì mặc định top-bottom → nói "vẽ theo chiều ngang". Đã có section cho process đó → gọi lại skill với mô tả thay đổi, skill tự vào update mode (match slug) + L2 diff.

## Context (dynamic)

Today: !`date +%Y-%m-%d`
Features có sẵn: !`ls -d docs/*/ 2>/dev/null | xargs -I{} basename {} | head -20`
Features có flows.md: !`for d in docs/*/srs/*-flows.md; do [ -f "$d" ] && echo "$d"; done | head -10`

## Approach

1. __Resolve feature + process slug__ — process slug auto-derive từ description (verb-object kebab-case, max 40 chars).
   * **Feature chưa tồn tại (điểm-vào, per `feature-bootstrap.md` nhóm A):** nếu arg là 1 mô tả quy trình thô mà chưa có `docs/{feature}/` nào khớp (vd `/activity "user nộp đơn, quản lý duyệt, tài chính chi tiền"`) → `/activity` ĐƯỢC PHÉP tự khởi tạo: derive feature slug từ mô tả (kebab-case, ASCII, ≤50 ký tự), confirm slug ở L1 (user override được), tạo `docs/{feature}/srs/` khi Write. KHÔNG bắt user chạy `/brainstorm` trước.
   * __Nguồn nghiệp vụ:__ feature đã có UC/SRS/flows → đọc để lấy steps/decisions/lanes, không hỏi lại cái đã có (no-re-ask). __Feature mới (hoặc cũ thiếu nguồn)__ → __phỏng vấn ĐÚNG PHẠM VI activity cần__ (per `feature-bootstrap.md` nhóm A bước 3), hỏi gom 1 batch business-language (KHÔNG hỏi DB/SDK): __các bước tuần tự__ · __điểm quyết định__ (câu hỏi + các nhánh yes/no) · __lanes__ nếu đa vai (ai làm bước nào) · __loop__ (retry/quay lại) nếu có. KHÔNG bịa — thiếu ý nào hỏi ý đó. Làm rõ đủ để vẽ đúng, không lan man toàn diện như `/brainstorm`.
   * __Mô tả mơ hồ dù feature đã có nguồn__ (vd process description quá ngắn, không rõ điểm quyết định/vai trò, hoặc UC/SRS đọc được cũng thiếu chi tiết) → __PHẢI hỏi clarifying trước khi generate__, KHÔNG tự suy đoán và generate luôn. Câu hỏi tối thiểu: "Có điểm quyết định (yes/no) nào cần thể hiện?", "Quy trình có mấy vai trò tham gia?". Đây không phải bootstrap phỏng vấn (feature đã có) — chỉ là 1-2 câu hỏi ngắn bù chỗ thiếu.
2. __Validate target__ `docs/{feature}/srs/{feature}-flows.md`:
   * Tồn tại + trùng slug → tự vào update mode (L2 diff cho section đó).
   * Tồn tại, slug mới → append `## Flow: {title}` section.
   * Thiếu → tạo mới: slim frontmatter (`type: srs-flows`, `feature`, `updated`) + heading trần `# {Feature title} — Flows`, rồi append thẳng section `## Flow:` đầu tiên. KHÔNG chèn câu intro/blockquote mô tả "file này chứa gì / nguồn ở đâu / quy tắc viết" (meta-text — vi phạm `ba-conventions.md` Mục 0). Doc chỉ chứa nội dung nghiệp vụ thật.
3. __Auto-detect lanes/roles__ từ description prose (scan role keywords). Nếu mơ hồ, ask clarifying (xem bước 1).
3.5. __Xác nhận lanes trước khi generate (BẮT BUỘC nếu ≥1 lane detect được)__ — heuristic scan từ khoá chỉ là đề xuất ban đầu, KHÔNG tự chốt luôn. In ra: "Phát hiện {N} vai trò tham gia: {list}. Đủ chưa, hay còn vai trò nào khác?" — chờ user xác nhận/bổ sung trước khi sang bước 4. Mục đích: actor bị ẩn/ngụ ý trong câu văn (không gọi tên rõ) dễ bị heuristic bỏ sót, dẫn tới thiếu cả 1 lane mà không ai phát hiện. Nếu 0 lane detect được (process 1 vai trò) → bỏ qua bước này, không cần hỏi.
4. __Identify decisions + parallels__ từ description ("nếu... thì...", "trong khi đó...", "đồng thời", "song song", "if/else").
4.5. __Trích fact-list (checklist coverage)__ — TRƯỚC khi generate, liệt kê ngắn gọn (giữ trong context, không cần file riêng):
   * __Lanes/roles__ đã xác nhận ở bước 3.5.
   * __Decision points__: mỗi điểm quyết định + các nhánh (yes/no hoặc multi-way).
   * __Loose ends check__: mọi node phải có ít nhất 1 đường ra dẫn tới 1 end node — không có nhánh cụt (theo đúng yêu cầu "no loose ends" phổ biến trong prompt BA chuẩn).
   Fact-list dùng làm checklist đối chiếu ở bước 9.6.
5. __Generate mermaid flowchart:__
   * `flowchart TB` (default); process nhiều lane/nhánh song song → tự chuyển `LR` cho gọn. User nói "vẽ theo chiều ngang" → dùng `LR`.‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍
   * Node shapes: `[]` rectangle (process), `{}` diamond (decision), `(())` circle (start/end), `[/...\]` parallelogram (input/output).
   * Subgraph cho lanes nếu có ≥2 role.
   * Edge labels cho decision branches: `-->|yes|`, `-->|no|`.
6. __L1 plan preview__ — prose BA-friendly: "Em sẽ append flowchart cho process {name} vào docs/{feature}/srs/{feature}-flows.md với N decisions + M lanes. Apply? (Y / sửa)".
7. __Write__ — Read flows.md, append section sau last `## Flow:`. Mỗi section format:
   ```markdown
   ## Flow: {Title} (Activity)
   **Trigger**: {1-line}
   **Related UC**: [[../usecases/uc-{slug}.md]] (nếu detect được, else "TBD")
   **Related FR**: FR-{feature}-NNN, ...
   **Related E**: E-{feature}-NNN, ... (error path trong flow, else "—")

   \`\`\`mermaid
   flowchart TB
     ...
   \`\`\`
   ```
   > __ID full-form bắt buộc__ trong 3 dòng Related — luôn `FR-{feature}-NNN` / `E-{feature}-NNN`, KHÔNG short-form `FR-001` (nguồn edge cho KG; short-form gây feature-ma + mất trace).
8. __Gọi lại với slug trùng__ (update mode tự động) → L2 diff cho section đó.
9. __Activity log__ — set env `CLAUDE_SKILL_NAME=/activity` + `CLAUDE_CHANGELOG_NOTE` (note: `added {process-title} activity diagram`) TRƯỚC khi Write — hook append vào `docs/_shared/changelog.md` (không phụ thuộc spec.md tồn tại hay chưa, không còn routing/fallback). Update flows.md `updated: {date}`.
9.5. __Render-verify (BẮT BUỘC, chạy ngay sau Write)__ — `node .claude/scripts/mermaid-verify.mjs --file docs/{feature}/srs/{feature}-flows.md`. Mermaid không render trong chat (đây là lý do skip L3), nên đây là cách duy nhất bắt lỗi cú pháp TRƯỚC khi báo "xong" thay vì để user tự phát hiện khi mở IDE.
   * Script chạy __3 tầng, báo tách riêng__: cú pháp compile · nhãn an toàn renderer · __ngữ nghĩa__.
   * Tầng ngữ nghĩa __chưa phủ flowchart__ (mới có state/erd/sequence) → với activity, phần dưới đây
     vẫn phải __tự soi bằng mắt trên ảnh__, đừng coi "3 tầng PASS" là diagram đúng luồng:
     mỗi node quyết định `{...}` có __≥2 nhánh ra__ không · mỗi nhánh có __nhãn điều kiện__ không ·
     có node nào __không tới được__ end không · có nhánh nào __cụt__ (vào rồi không ra) không.
   * Còn `error` → sửa rồi chạy lại (tối đa 2 vòng). KHÔNG báo "xong" khi vẫn còn error.
   * __Pass__ → tiếp bước 10, report có dòng "compile OK".
   * __Fail__ (thường do quote lồng trong `[...]`/`{}` — xem Mermaid syntax safety ở `diagram-selection.md`) → đọc lỗi dòng/cột script trả về, sửa lại section vừa append (KHÔNG đụng section khác), verify lại. Tối đa 2 lần tự sửa.
   * __Vẫn fail sau 2 lần__ → báo user rõ lỗi cụ thể + đoạn mermaid, gợi ý paste mermaid.live để debug tay. KHÔNG âm thầm để file lỗi mà báo "xong" bình thường.
9.6. __Coverage-verify (BẮT BUỘC, chạy ngay sau 9.5 pass)__ — đối chiếu diagram vừa ghi với fact-list ở bước 4.5:
   * __Decision coverage__: mỗi decision point trong fact-list có xuất hiện thành 1 diamond với đủ nhánh (yes/no) trong diagram không.
   * __Lane coverage__: mỗi lane đã xác nhận ở 3.5 có xuất hiện thành 1 `subgraph` không.
   * __No loose ends__: mọi node có ít nhất 1 outgoing edge dẫn tới 1 end node (`((End))` hoặc tương đương) — không có nhánh cụt giữa chừng.
   Đây là compile-check KHÁC bước 9.5 — 9.5 chỉ bắt lỗi cú pháp, 9.6 bắt lỗi __thiếu nội dung nghiệp vụ hoặc dead-end__.
   * __Đủ__ → tiếp bước 10, report thêm dòng "Coverage: {N}/{N} decisions, {M}/{M} lanes, no loose ends".
   * __Thiếu__ (vd 1 lane bị bỏ sót, hoặc 1 nhánh "no" không dẫn tới đâu) → tự bổ sung vào section vừa ghi, verify lại 9.5 rồi 9.6. Tối đa 2 lần tự sửa.
   * __Vẫn thiếu sau 2 lần__ → báo user rõ decision/lane/nhánh nào chưa thể hiện được, hỏi có muốn bỏ qua hay bổ sung mô tả. KHÔNG âm thầm báo "xong" khi coverage chưa đủ.
9.7. __Diagram_Reviewer gate (CHỈ khi vượt ngưỡng phức tạp)__ — spawn agent qua Task tool, `subagent_type: diagram-reviewer`, truyền: section mermaid vừa ghi + fact-list bước 4.5, khi vượt bất kỳ ngưỡng nào (đo theo __tổng độ phức tạp__): __≥3 lane__ HOẶC __≥5 decision point__ HOẶC __nesting decision ≥2 tầng__ HOẶC có __loop/retry quay lại__. Dưới mọi ngưỡng trên, bước 9.6 tự-đối-chiếu (không agent) đã đủ — SKIP 9.7, đi thẳng bước 10.
   * __Task tool không khả dụng__ (runtime không cấp) → KHÔNG ngầm coi là đã review; report ghi rõ `reviewer skipped (Task unavailable)` để user biết diagram phức tạp chưa qua gate.
   * Nhận findings (format `review-format.md` + section "Coverage checklist"). Có BLOCKING → tự bổ sung lane/nhánh thiếu vào section, verify lại 9.5+9.6, rồi tiếp bước 10.
   * Loop tối đa 2 vòng — vòng 2 vẫn BLOCKING → báo user rõ findings còn tồn đọng, để user quyết định trước khi báo report.
   * Verdict `approve`/chỉ WARNING/SUGGESTION → tiếp bước 10 luôn.
10. __Output report:__
    ```
    ✅ Activity diagram appended: docs/{feature}/srs/{feature}-flows.md → ## Flow: {title} (Activity)
       Decisions: {N} | Lanes: {M} | Direction: {TB|LR} | Mermaid compile: OK | Coverage: {N}/{N} decisions, {M}/{M} lanes, no loose ends{reviewed_note}

    Mở file trong IDE/Obsidian/GitHub preview để xem rendered diagram.
    Cần sửa? Gọi lại /activity "<change>" --feature {feature}, em tự vào update mode.
    ```
    `{reviewed_note}` = ` | Reviewed by Diagram_Reviewer` nếu bước 9.7 đã chạy, else rỗng.

## Output

`docs/{feature}/srs/{feature}-flows.md` — __append 1 section__ `## Flow: {title}` với mermaid `flowchart` inline. File dùng CHUNG với `/sequence`. Slim frontmatter (`type: srs-flows` / `feature` / `updated`).

Hook tự ghi 1 dòng vào `docs/_shared/changelog.md`.

## Mermaid syntax reference

__Simple flowchart:__
```mermaid
flowchart TB
    Start((Start)) --> Submit[User submit request]
    Submit --> Validate{Valid format?}
    Validate -->|no| Reject[Show error]
    Validate -->|yes| Review{Manager approve?}
    Review -->|no| Notify[Notify user rejected]
    Review -->|yes| Process[Process request]
    Process --> End((End))
    Reject --> End
    Notify --> End
```

__Multi-lane (swimlane via subgraph):__
```mermaid
flowchart TB
    subgraph User
        U1[Submit refund request] --> U2[Wait for response]
    end
    subgraph CSKH
        C1[Review request] --> C2{Approve?}
        C2 -->|no| C3[Reject + note]
        C2 -->|yes| C4[Forward to Finance]
    end
    subgraph Finance
        F1[Process refund] --> F2[Send confirmation]
    end
    U1 --> C1
    C3 --> U2
    C4 --> F1
    F2 --> U2
```

## References

* @../../rules/ba-conventions.md
* @../../rules/approval-gate.md
* @../../rules/naming-conventions.md
* @../../rules/changelog.md
* @../../rules/diagram-selection.md
* @../../rules/diagram-correctness.md
* @../../rules/feature-bootstrap.md
* @../../../_templates/diagram-activity.md
* @../../scripts/mermaid-verify.mjs (render-verify sau Write — bước 9.5)
* @../../agents/diagram-reviewer.md (Diagram_Reviewer — review coverage khi vượt ngưỡng phức tạp, bước 9.7)‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍


<!-- wm:2b9af6c9b691879b1ddb7a04d29a1c88 -->
<sub>Tài liệu thuộc bộ AI4BA BA-Kit — bản quyền hoangphan.blog</sub>
