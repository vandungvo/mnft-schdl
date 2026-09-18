---
name: ask
description: Dùng khi cần hỏi và được giải thích một nghiệp vụ đang hoạt động thế nào (business logic, luồng, rule, edge case) dựa trên tài liệu BA đã có, trả lời ngay trong chat kèm sơ đồ ASCII khi hợp. Read-only, không sinh hay sửa doc; soi luồng còn thiếu thì dùng `/gap`.
allowed-tools: Read, Bash, Glob, Grep
user-invocable: true
disable-model-invocation: true
argument-hint: "<câu hỏi | feature | ID (FR-.../UC-.../E-...)>"
---
<!-- Licensed to vandungvo2003@gmail.com — Order YYWVQ3VWE -->

# /ask — Hỏi nghiệp vụ này hoạt động thế nào?‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

> **KHÔNG Write/Edit gì cả.** Đây là skill **read-only thuần** — đọc tài liệu đã có trong vault rồi **trả lời ngay trong chat**. Không sinh doc, không sửa doc, KHÔNG có approval gate (miễn vì không ghi file). Muốn LƯU câu trả lời thành tài liệu chính thức → route `/usecase` (viết use case) hoặc `/reverse-doc`, KHÔNG tự Write.

## Goal‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

Trả lời **đúng một câu hỏi của IT-BA/PO**: *"nghiệp vụ này ĐANG hoạt động thế nào?"* — vd "luồng đăng nhập chạy ra sao, khóa tài khoản khi nào", "quy tắc hoàn tiền ở feature payment là gì", "màn checkout có những trạng thái nào".

Đầu ra là **lời giải thích dễ hiểu** cho người vai nghiệp vụ:
- **Cách nghiệp vụ hoạt động** (business logic theo bước, rule, ngưỡng, error) — phần chính.
- **Sơ đồ luồng ASCII** (box-drawing `┌ ─ ┐ │ ▼`, nhánh YES/NO inline) — **giống output flow diagram của `/brainstorm`** — để user NHÌN thấy luồng chạy thế nào, không phải khung màn hình.
- **Userflow** khi nghiệp vụ có **≥2 luồng** phân biệt (happy/error/edge, hoặc nhiều phương thức).
- Mọi rule/số liệu/wording đều **trích từ prose đã đọc** (`file:line`) — KHÔNG bịa.

Đây là **giải thích luồng ĐANG CÓ**, KHÁC `/gap` (soi luồng THIẾU) và KHÁC `/reverse-doc` (tái lập SRS từ nguồn ngoài, có Write).

## Ranh giới với skill khác‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

| Skill | Nó làm gì | Vì sao khác /ask |
|---|---|---|
| `/gap` | Soi **THIẾU** luồng (dead-end, thiếu chiều ngược, case chưa phủ) + Write `traceability.md` | /ask **giải thích luồng ĐANG có**, không săn cái thiếu, không Write |
| `/reverse-doc` | Tái lập BỘ SRS từ **nguồn ngoài** (docx/pdf/ảnh) → Write `docs/_reverse/{feature}/` | /ask đọc **doc đã có trong vault**, trả lời tại chỗ trong chat |
| `/usecase` | Sinh file UC (Cockburn) | /ask không sinh file |
| `/dashboard` | HTML tổng hợp toàn workspace | /ask trả lời 1 câu hỏi cụ thể, trong chat |
| `/kg explore` | Trả node + edge THÔ (bảng ID) — hạ tầng | /ask dùng kg để CHỌN file rồi **đọc prose + diễn giải nghiệp vụ** |

## Constraints‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

### Hard rules — never violate‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

- **Read-only thuần** — KHÔNG Write/Edit bất kỳ file nào. Miễn approval gate (L1/L2/L3) vì không ghi. `allowed-tools` không có Write/Edit — đúng chủ đích.
- **Quy tắc vàng KG** — graph để **CHỌN** file + đếm cấu trúc; mọi kết luận nội dung **LUÔN dựa trên prose đã Read** (`@../../rules/kg-usage.md`). Không bao giờ trả lời "hệ thống làm X" chỉ vì thấy edge/facts.
- **CHỐNG BỊA (tối cao)** — mỗi rule/số liệu/wording phải kèm evidence `file:line`. Không nhớ được số → đọc lại file, KHÔNG đoán. Không có nguồn cho 1 phần câu hỏi → nói thẳng "phần này chưa có trong tài liệu" + route skill sinh ra nó.
- **IT-BA framing** — trả lời bằng business language (`@../../rules/ba-conventions.md` Mục 3). CẤM lệch kỹ thuật: DB schema, endpoint, JWT vs session, hashing, SDK. Câu hỏi hỏi thẳng chi tiết kỹ thuật → trả ở tầng nghiệp vụ + note "chi tiết triển khai là việc /srs + dev".
- **Câu hỏi mơ hồ → hỏi lại NGẮN, không đoán bừa** — không xác định được feature/scope → hỏi 1 câu làm rõ + list feature hợp lệ. KHÔNG auto-pick feature im lặng.
- **Nhóm C (feature-bootstrap)** — feature không tồn tại → friendly empty-message + list feature hợp lệ, KHÔNG tạo feature (`@../../rules/feature-bootstrap.md`).
- **Typography VN** — dùng "Mục N" thay `§`, "sang/đến/dẫn tới" trong prose (`@../../rules/ba-conventions.md` Mục 4).

### Pitfalls — easy to get wrong

- ❌ Trả lời "hệ thống làm X" chỉ vì thấy edge/facts trong graph — facts KHÔNG chứa điều kiện/ngoại lệ/wording. Phải Read prose.
- ❌ Bịa số liệu/wording không có `file:line`. Không nhớ → đọc lại. Không có → nói "chưa có trong tài liệu" + route skill.
- ❌ Lệch kỹ thuật (DB/endpoint/SDK/JWT) — trả ở tầng nghiệp vụ.
- ❌ Đổ nguyên section "Phải Read tay" (noise) vào câu trả lời — là tín hiệu nội bộ.
- ❌ Auto-pick feature im lặng khi câu hỏi mơ hồ — hỏi lại NGẮN + list.
- ❌ Emoji trong khung ASCII (viền lệch). Form trải full width (trông sai) — căn giữa hẹp.
- ❌ Thêm Write/Edit vào skill này. Đầu ra là chat. Muốn lưu → `/usecase` / `/reverse-doc`.
- Doc `status: stale` → vẫn trả lời theo nội dung hiện có, ghi chú nhẹ "tài liệu này đang stale (có thay đổi upstream chưa rà)".

## Inputs

```
/ask                          # picker: hỏi "Anh muốn hỏi về feature/luồng nào?" + list feature
/ask <feature>                # giải thích tổng quan nghiệp vụ 1 feature
/ask <câu hỏi tự do>          # vd: "luồng đăng nhập authentication hoạt động thế nào"
/ask <ID>                     # vd: /ask FR-authentication-011  (giải thích 1 requirement/rule)
```

## Context (dynamic)

Today: !`date +%Y-%m-%d`
Features: !`ls -d docs/*/ 2>/dev/null | xargs -I{} basename {} | grep -v "^_" | head -20`

## Approach (Phases)

### Phase A — Nhận input + phân loại câu hỏi

- **Arg rỗng** → hỏi "Anh muốn hỏi về feature/luồng nào?" + list feature (từ Context ở trên). Chờ trả lời.
- **Feature không tồn tại** (Nhóm C): khi chạy `tour`/`facts` với feature sai, engine trả **exit 0** kèm dòng `Feature hợp lệ: ...` + `Gần giống: ...` (KHÔNG phải KG-ERROR). Relay ngay: "Chưa có feature `{arg}`. Feature hiện có: {list}. Ý anh là `{gần-giống}`?" — KHÔNG tạo feature, KHÔNG đoán bừa.
- **Có arg** → phân loại:
  - Chứa **ID** (`FR-`/`UC-`/`E-`/`BR-`/`NFR-`/`US-`/`screen:`...) → loại **"ID cụ thể"**.
  - Là **feature slug trần** khớp `docs/{slug}/` (vd `/ask authentication`, hàm ý "giải thích cả feature") → loại **"tổng quan feature"**.
  - Là **câu hỏi tự do về 1 luồng/khía cạnh** trong 1 feature (vd "luồng đăng nhập chạy sao", "quy tắc hoàn tiền là gì") → loại **"luồng/khía cạnh cụ thể"**. Trích feature + keyword từ câu. Không rõ feature nào → hỏi lại NGẮN "Câu này về feature nào?" + list, KHÔNG đoán bừa.

### Phase B — Định tuyến qua KG (CHỌN file — KHÔNG kết luận)

Theo loại câu hỏi, chạy đúng 1 lệnh để lấy shortlist file đáng đọc:

```bash
# "tổng quan feature" — lộ trình ĐỌC theo thứ tự phụ thuộc (brainstorm→spec→UC→flow→story...)
node .claude/skills/kg/engine/kg-query.mjs tour <feature>

# "luồng/khía cạnh cụ thể" — liệt kê FR/UC/US/screen/flow/OQ + Độ phủ, chọn file khớp keyword
node .claude/skills/kg/engine/kg-query.mjs facts <feature>

# "ID cụ thể" — cho định nghĩa + source file:line + ai trỏ tới/trỏ tới ai
node .claude/skills/kg/engine/kg-query.mjs explore <ID|key>

# "1 doc/màn cụ thể" — 1-hop upstream/downstream candidates
node .claude/skills/kg/engine/kg-query.mjs neighbors <doc-path>
```

> **`tour` vs `facts`:** `tour` cho **thứ tự đọc** (thượng nguồn→hạ nguồn) — dùng khi hỏi tổng quan cả feature để /ask đọc đúng trình tự dựng bức tranh. `facts` cho **danh sách phẳng có phân loại** — dùng khi chỉ cần lọc nhanh file khớp keyword của 1 luồng. Cả hai chỉ CHỌN file; kết luận vẫn từ prose. `tour` cột "Vì sao" là quan hệ graph, KHÔNG phải tóm tắt nội dung — vẫn phải Read.

**3 nghĩa vụ bắt buộc mỗi lần gọi kg-query** (`@../../rules/kg-usage.md`):
1. **`⚠ còn N mục — chạy với --all`** xuất hiện → BẮT BUỘC chạy lại `--all` lấy đủ trước khi Read.
2. **Mục `### Phải Read tay (ngoài graph)`** → đọc các file liệt kê **có liên quan câu hỏi** (graph mù về doc không parse được). Dòng `Độ phủ:` cho biết thiếu bao nhiêu.
3. **`KG-ERROR` (exit 2)** → graph không dùng được → Phase B' fallback dưới. TUYỆT ĐỐI không suy diễn từ kết quả một phần.

> **KHÔNG đổ section "Phải Read tay" vào câu trả lời cho user.** Nó là tín hiệu nội bộ để /ask biết đọc thêm file nào — không phải nội dung BA đọc. Ở vault demo section này có thể rất dài/ồn (format cũ parse thiếu). /ask chỉ (a) đọc file liên quan, (b) nếu độ phủ thấp ảnh hưởng câu trả lời → ghi 1 câu gọn "một số file test/checklist parse thiếu, em đã đọc trực tiếp bù".

**Phase B' — Fallback khi KG-ERROR:** bỏ định tuyến qua graph, đọc trực tiếp: `ls docs/{feature}/`, Glob `docs/{feature}/**/*.md`, Read `srs/{feature}-spec.md` + `usecases/uc-*.md` + `srs/{feature}-userflow.md`, grep keyword câu hỏi.

### Phase C — Read prose ĐẦY ĐỦ (KẾT LUẬN ở đây)

Read các file shortlist. Nguồn ưu tiên (KHÔNG bịa):
- `srs/{feature}-spec.md` — FR/NFR/BR + **Error Matrix** (E-code + wording thật) + Success Criteria.
- `usecases/uc-{slug}.md` — Main Success Scenario + Extensions (nhánh rẽ/lỗi).
- `srs/{feature}-userflow.md` — chia flow + happy/error/edge.
- `srs/{feature}-states.md` — nếu câu hỏi về trạng thái entity.
- Screen index / `ascii-wireframe/{flow}.md` — nếu câu hỏi về màn.

Mọi con số/rule/error wording lấy **từ prose** (`file:line`), không nhớ.

### Phase D — Quyết cấu trúc trả lời‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

- **Câu hỏi về 1 LUỒNG hoạt động** (đăng nhập, thanh toán, hoàn tiền, duyệt...) → **VẼ sơ đồ luồng ASCII** (box-drawing, kiểu `/brainstorm`) — đây là cách chính để user hiểu luồng. Phủ được cả nhánh quyết định (YES/NO) + error path trong 1 sơ đồ.
- Nghiệp vụ có **≥2 luồng** phân biệt (nhiều phương thức: login email vs Google; nhiều actor) → **thêm phần Userflow** (mermaid `flowchart` hoặc mô tả happy/error/edge tách luồng).
- Câu hỏi hẹp về **1 rule/1 con số** (câu hỏi hẹp, không phải luồng) → trả lời gọn, **KHÔNG ép** sơ đồ.

### Phase E — Tổng hợp câu trả lời có cấu trúc → in ra chat. HẾT.

Không Write, không approval gate, không HARD STOP (trừ khi Phase A phải hỏi lại làm rõ feature).

## Cấu trúc output trả lời (thích ứng — không phải lúc nào cũng đủ hết)

1. **Tóm tắt (TL;DR)** — 1-2 câu chốt trực tiếp câu hỏi.
2. **Sơ đồ luồng hoạt động (ASCII)** — box-drawing kiểu `/brainstorm` (xem quy tắc vẽ dưới). Đặt SỚM để user nắm luồng trước khi đọc chi tiết. Bỏ qua nếu câu hỏi hẹp về 1 rule.
3. **Cách nghiệp vụ hoạt động** — prose theo bước bám sơ đồ, mỗi rule/số kèm nguồn `(FR-xxx, spec.md:line)`. Phần chính.
4. **Rule & ràng buộc** — bullet các BR/ngưỡng/điều kiện.
5. **Nhánh / edge case** — error path + wording thật (từ Error Matrix, E-code).
6. **[Khi ≥2 luồng]** Userflow — mermaid `flowchart` hoặc mô tả text happy/error/edge tách luồng.
7. **Nguồn đã đọc** — liệt kê ngắn `file:line` đã dùng (minh bạch, chống bịa). Độ phủ KG thấp → 1 câu ghi chú.

### Quy tắc vẽ sơ đồ luồng ASCII (giống `/brainstorm`)

- Dùng box-drawing `┌ ─ ┐ │ └ ┬ ▼ →` trong `text` fence (monospace). **CẤM emoji** trong sơ đồ (viền lệch).
- Mỗi bước = 1 box; mũi tên `▼` xuống dưới, nhãn cạnh mũi tên là hành động/điều kiện (`click "Đăng nhập"`, `submit`).
- **Nhánh quyết định**: box câu hỏi → `─NO→` inline ra error/case bên phải, `│ YES` đi tiếp xuống. Phủ cả happy + error/edge trong 1 sơ đồ khi được.
- Node cần chú thích ngắn → để trong ngoặc cạnh box (`(link expire 24h)`, `status=unverified`).
- Giữ hẹp, đọc dọc từ trên xuống — mục tiêu là user hiểu luồng, không phải đẹp.

### Ví dụ output ngắn — `/ask "luồng đăng nhập authentication hoạt động thế nào, khóa tài khoản ra sao"`

> **Tóm tắt:** User đăng nhập bằng email + password; hệ thống so khớp thông tin, kiểm tra tài khoản đã xác nhận email chưa, và đếm số lần sai để chống dò mật khẩu — sai 5 lần liên tiếp thì khóa 24h tự mở.
>
> **Sơ đồ luồng:**
> ```text
> ┌────────────────┐
> │ Nhập email/pass│
> │ + submit       │
> └───────┬────────┘
>         ▼
> ┌────────────────────┐   NO   ┌──────────────────────────────┐
> │ Email/pass khớp?   │ ─────→ │ E-003 "Email hoặc mật khẩu   │
> │                    │        │ không đúng" + fail counter +1│
> └───────┬────────────┘        └──────────────┬───────────────┘
>         │ YES                                 ▼
>         │                         ┌──────────────────────────┐
>         │                         │ ≥3 lần: yêu cầu captcha   │
>         │                         │ ≥5 lần: KHÓA 24h (E-005)  │
>         ▼                         └──────────────────────────┘
> ┌────────────────────┐   NO
> │ Email đã verified? │ ─────→ E-004 + CTA gửi lại email verify
> └───────┬────────────┘
>         │ YES
>         ▼
> ┌────────────────────┐
> │ Tạo phiên → vào app│
> └────────────────────┘
>   (Lỗi mạng khi so khớp: KHÔNG tính vào fail counter — tránh khóa oan)
> ```
>
> **Cách hoạt động (FR-authentication-004, spec.md:43):**
> 1. So khớp email/password — không khớp → báo lỗi generic "Email hoặc mật khẩu không đúng" (E-authentication-003, cố ý mơ hồ để chống dò tài khoản), tăng bộ đếm fail +1.
> 2. Kiểm tra trạng thái tài khoản: chưa xác nhận email → chặn, hiện CTA gửi lại email (E-authentication-004).
> 3. Qua 2 bước trên → tạo phiên đăng nhập.
>
> **Chống brute-force (FR-authentication-011, spec.md:50 + BR-006/007):**
> - Sai **≥3 lần** → yêu cầu captcha.
> - Sai **≥5 lần** → **khóa 24h**, tự mở, không cần admin (BR-authentication-007, spec.md:79). Đang khóa mà login → "Tài khoản tạm khóa, thử lại sau {X} giờ" (E-authentication-005).
> - **Lỗi mạng KHÔNG tính vào bộ đếm** (FR-011) — tránh khóa oan.
>
> **Nguồn đã đọc:** `srs/spec.md` (FR-004, FR-011, BR-006/007, E-003/004/005), `usecases/uc-login-email.md`.

## References

- @../../rules/kg-usage.md
- @../../rules/ba-conventions.md
- @../../rules/feature-bootstrap.md
- @../../skills/kg/SKILL.md‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍


<!-- wm:2b9af6c9b691879b1ddb7a04d29a1c88 -->
<sub>Tài liệu thuộc bộ AI4BA BA-Kit — bản quyền hoangphan.blog</sub>
