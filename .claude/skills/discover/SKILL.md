---
name: discover
description: Dùng khi có 1 ý tưởng/chủ đề tính năng còn phân vân, cần điều tra (nhu cầu người dùng + đối thủ) rồi khuyến nghị build/skip/adjust trước khi cam kết brainstorm. `/discover <chủ đề>` hoặc `/discover`.
allowed-tools: Read, Write, Edit, Bash, Glob, Grep, WebSearch, WebFetch, Task, Skill
user-invocable: true
disable-model-invocation: true
argument-hint: "<chủ đề/tính năng> | (empty interactive) [--feature <slug>]"
---
<!-- Licensed to vandungvo2003@gmail.com — Order YYWVQ3VWE -->

# /discover — Feature Discovery & Build/Skip Recommendation‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

## Goal‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

Cho 1 chủ đề/ý tưởng tính năng còn phân vân, output 1 file research giúp IT-BA/PO **quyết
định có nên đưa tính năng này vào sản phẩm của mình không** (build / skip / build-có-điều-chỉnh),
và nếu build thì __gợi ý 1-3 phương án feature cỡ "một-lần-brainstorm"__ để đi tiếp `/brainstorm`.
Domain + đối thủ + thuật ngữ gọi người dùng của dự án đọc từ `docs/_shared/project-profile.md`
(per `.claude/rules/project-profile.md`) — thiếu thì hỏi ở Pha A2 rồi đề xuất ghi vào profile.

Report viết theo thứ tự: __bằng chứng trước, kết luận sau__. 5 mục (doc thuần Việt, xem Pha D văn phong).
Từ "Người dùng" trong heading thay bằng thuật ngữ profile nếu có (Học viên/Khách hàng/Tài xế...):

1. __Người dùng cần gì__ — người dùng MÌNH cần làm được việc gì, có bằng chứng nhu cầu không.
2. __Đối thủ làm thế nào__ — đối thủ cùng ngành giải nhu cầu đó ra sao.
3. __Nếu làm thì lưu ý gì__ — cách làm, thông tin cần lưu, chi phí, phụ thuộc, lỗi cần tránh.
4. __Nên làm không__ — mức ưu tiên (giá trị/công sức/độ tin cậy) + kết luận nên làm/không.
5. __Bước tiếp theo__ — 1-3 phần đề xuất làm cỡ "một-lần-brainstorm" + việc cần làm + câu hỏi mở.

> __Verdict Mục 4 phải qua phản biện đa góc nhìn__ (Pha C2 mới): trước khi chốt nên làm/không,
> skill chia việc cho các CLI ngoài (qua `/delegate`) đóng 3 vai đối lập — __ủng-hộ-build__ (cơ
> hội/giá trị), __phản-đối__ (rủi ro/không đáng), __khả-thi__ (công sức/chi phí/phụ thuộc) — cho
> tranh luận 1 vòng, rồi Claude làm arbiter chốt verdict. Tránh verdict thiên vị theo hướng
> research ban đầu. Mục 4 ghi thêm 1 đoạn "Các góc nhìn đã cân nhắc" (đồng thuận + điểm còn lệch).

> __Không phải chỉ soi đối thủ.__ Mục 1 (nhu cầu người dùng mình) đứng TRƯỚC Mục 2 (đối thủ) — tránh
> bẫy làm chỉ vì "đối thủ có". Kết luận gắn lại nhu cầu người dùng, không đếm số đối thủ có tính năng.
> Điểm ưu tiên (kiểu RICE) chỉ để xếp thô, KHÔNG dùng con số tự quyết.

## Định vị trong pipeline (đừng giẫm chân skill khác)‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

```
/market <lĩnh vực>  (chưa biết làm SẢN PHẨM gì — quét cơ hội thị trường)
   └─ /prd (Feature Map — bóc DANH SÁCH feature)
        └─ /discover <chủ đề>   ← ĐỨNG ĐÂY: điều tra 1 ý tưởng / 1 dòng map còn phân vân
             │  → nhu cầu người dùng + đối thủ + mức ưu tiên → khuyến nghị + 1-3 phần đề xuất + phạm vi thô
             ├─ build   → /brainstorm <feature>  (scope thô từ discover làm seed)
             ├─ adjust  → /brainstorm với scope đã điều chỉnh
             └─ skip    → cập nhật dòng Feature Map, dừng
```

- __KHÔNG__ bóc Feature Map cả sản phẩm — đó là `/prd`.
- __KHÔNG__ vẽ flow/screen chi tiết — đó là `/brainstorm` + `/user-flow`.
- __CÓ__ = với 1 chủ đề, trả "nên làm gì, scope nào, vì sao" dạng phương án one-brainstorm-sized.

## Constraints‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

### Hard rules — never violate‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

- __Thông tin cấp dự án đọc + ghi vào profile__ — domain sản phẩm, đối thủ/benchmark, thuật ngữ gọi người dùng cuối: đọc `docs/_shared/project-profile.md` ở Pha 0; thiếu → hỏi ở Pha A2/CHECKPOINT 1 rồi đề xuất ghi vào profile (bảng đối thủ đã chốt + thuật ngữ) để lần sau khỏi tìm lại. KHÔNG hardcode domain nào trong skill. Per @.claude/rules/project-profile.md.
- __Pha làm rõ input (mới) — hỏi khi input mơ hồ.__ Chủ đề mơ hồ về ý định (vd "streak gamification"
  có thể là xem-đối-thủ / quyết-build-skip / tìm-ý-tưởng) → hỏi 1-3 câu làm rõ TRƯỚC khi research
  (xem Pha A2). Input đã rõ ý định + scope → bỏ qua (no-re-ask). KHÔNG đoán bừa mục tiêu rồi chạy.
- __CHECKPOINT 1 bắt buộc__ — dừng sau Pha B, show kế hoạch (chủ đề + mục tiêu đã chốt + JTBD nháp +
  competitors + columns), user duyệt trước khi spawn agent. KHÔNG tự chạy agent khi chưa approve.
- __Debate đa góc nhìn trước verdict (mặc định, tắt bằng lời)__ — sau research (Pha C), skill chạy
  Pha C2: chia việc cho **3 CLI ngoài qua `/delegate`** đóng 3 vai đối lập (build-advocate / skeptic /
  feasibility), debate 1 vòng, Claude arbiter chốt verdict (per delegate Chế độ C — debate + arbiter).
  Số lượt delegate được báo trước ở CHECKPOINT 1 (manager tax). __Skip khi:__ user nói "khỏi debate" /
  "đừng hỏi agent khác", HOẶC mục tiêu chỉ "(b) tham khảo đối thủ", HOẶC user đã "đừng search web" (không
  đủ evidence để debate có ý nghĩa) → verdict do 1 mình skill lập luận, flag rõ "chưa qua phản biện đa
  góc nhìn". KHÔNG đẩy việc arbiter/chốt ra CLI — Claude giữ vai người chốt cuối.
- __CHECKPOINT 2 bắt buộc__ — dừng sau Pha C2 (debate), preview Executive Summary + bảng rút gọn +
  khuyến nghị (kèm đoạn "Các góc nhìn đã cân nhắc") + phương án trong chat. User confirm mới ghi file.
  Điều chỉnh tối đa 2 vòng nếu user "sửa: ...".
- __Verdict phải neo evidence có nhãn__ — mọi claim đối thủ/số liệu gắn nhãn `[F]`/`[I]`/`[R]` (Fact có
  URL+ngày / Inference / Recommendation) + confidence (High/Med/Low). Pha E __strip hoặc flag__ claim
  không nhãn trước khi finalize. KHÔNG dựng build/skip từ claim trần.
- __RICE-lite là sorting aid, KHÔNG phải verdict__ — điểm số dùng để xếp hạng thô, verdict là quyết định
  người-lập-luận có xét strategic fit + dependency + table-stakes. Confidence thấp (<50%, "moonshot") →
  flag rõ điểm số ít tin cậy. KHÔNG so decimal (87 vs 85 là noise, xếp theo bucket).
- __KHÔNG bịa số liệu__ — retention/conversion của feature chưa build đều là ước lượng: ghi `[Estimated]`
  hoặc "no public data", KHÔNG chế số. Nguồn mâu thuẫn → nêu rõ, không tự chọn 1 số.
- __Per-project output__ — `docs/_research/{YYYY-MM-DD}-{keyword-slug}.md`. Slug kebab-case ASCII max 40.
  Collision cùng date+slug → suffix `-v2`.
- __Vietnamese-first__ default, auto-detect từ chủ đề/nội dung. Muốn tiếng Anh thì nói "viết bằng tiếng Anh".
- __Frontmatter tối giản__ (`type`/`status`/`keyword`/`updated`/`links` — KHÔNG `created`/`owner`/`changelog`).
  Lịch sử qua `docs/_shared/changelog.md` (hook ghi). Per naming-conventions + changelog rule.
- __No-re-ask rule__ — user đã trả lời trong session / trong file đã tồn tại → không hỏi lại. Per ba-conventions Mục 2.
- __KG chỉ định tuyến Project match, KHÔNG thay evidence prose__ — ở Pha B2, KG tìm candidate feature/brainstorm liên quan theo concept trước; kết luận match và context 2-3 dòng LUÔN đến từ grep + prose đã Read. Nếu output có `⚠ còn N mục — chạy với --all` thì chạy lại query với `--all`; nếu có `Phải Read tay (ngoài graph)` thì Read các file đó. `KG-ERROR` hoặc exit ≠ 0 → bỏ kết quả KG và giữ nguyên flow grep + Read cũ.
- __Bỏ qua web research__ — user nói "đừng search web" / "khỏi cần competitor" → skip Pha C, output chỉ
  opportunity + project match + khuyến nghị dựa nội bộ (flag rõ "chưa benchmark đối thủ").
- **`--feature <slug>`** (optional) — gắn research vào feature cụ thể, thêm vào `links:`. Không gõ thì hỏi
  ở Pha A2 hoặc để greenfield; nói "gắn vào feature X" cũng được.
- __IT-BA framing__ — business language. KHÔNG schema / endpoint / SDK. Per ba-conventions Mục 3.
- __Doc sạch__ — doc sinh ra chỉ chứa nội dung nghiệp vụ thật; hướng dẫn/định nghĩa sống ở SKILL.md +
  template chỉ giữ chú giải người ĐỌC cần (legend [F]/[I]/[R]). Per ba-conventions Mục 0.

### Pitfalls — easy to get wrong

- ❌ Nhận chủ đề mơ hồ là research luôn — bỏ Pha A2 làm rõ mục tiêu → research sai cái user muốn
- ❌ Verdict build/skip chỉ dựa "đối thủ có làm không" — bỏ trục opportunity/JTBD → feature war
- ❌ Đặt verdict TRƯỚC evidence — verdict phải ở Mục 5, sau opportunity + đối thủ
- ❌ Để RICE-lite điểm số tự quyết build/skip — nó là sorting aid; verdict là quyết định người-lập-luận
- ❌ Chốt verdict một mình không qua phản biện (khi debate không bị tắt) — dễ thiên vị hướng research ban đầu
- ❌ Đẩy việc arbiter/chốt cuối ra CLI — Claude giữ vai người chốt; CLI chỉ đóng vai tranh luận
- ❌ Dán raw output CLI hoặc nhãn `[F]/[I]` vào đoạn "Các góc nhìn đã cân nhắc" — phải viết lại thuần Việt, ngắn
- ❌ Giả vờ đã debate khi CLI lỗi/hết quota — phải flag "phản biện chưa hoàn tất"
- ❌ Bịa số ROI/retention feature chưa build — ghi [Estimated] / "no public data"
- ❌ Claim đối thủ không nguồn/không nhãn lọt vào verdict — Pha E phải strip/flag
- ❌ Bỏ CHECKPOINT 1/2 — spawn agent hoặc write file không cho user duyệt
- ❌ Giẫm chân `/prd` (bóc Feature Map) hoặc `/brainstorm` (vẽ flow chi tiết)
- ❌ Đẻ danh sách 10 feature thay vì 1-3 phương án cỡ-brainstorm
- ❌ Thêm `changelog:` frontmatter / reference file changelog cũ — lịch sử sống ở changelog.md
- ❌ Output technical (schema, endpoint, SDK) — đây là BA exploration, không phải SRS

## Inputs

```
/discover                                  # interactive: hỏi chủ đề + mục tiêu
/discover <chủ đề>                         # chủ đề inline
/discover <chủ đề> --feature <slug>        # gắn vào feature folder cụ thể (optional)
```

Ví dụ:
```
/discover spaced repetition
/discover streak gamification --feature authentication
/discover AI pronunciation feedback, tôi muốn quyết có build không
/discover daily reminder notification, đừng search web nhé
```

Muốn đổi hành vi mặc định, nói bằng lời: "đừng search web" · "viết bằng tiếng Anh" · "gắn vào feature X".

## Context (dynamic)

Today: !`date +%Y-%m-%d`
Feature Map: !`test -f docs/_product/prd.md && echo "có docs/_product/prd.md (đọc để gợi ý feature + audience)" || echo "chưa có PRD sản phẩm"`
Project profile: !`test -f docs/_shared/project-profile.md && echo "có docs/_shared/project-profile.md (đọc Domain + Đối thủ + Thuật ngữ)" || echo "chưa có profile — hỏi domain/đối thủ ở Pha A2 rồi đề xuất ghi"`
Project audience: !`grep -iE "target|audience|domain|monetiz|freemium|subscription" docs/_shared/project-profile.md docs/_product/prd.md docs/_shared/system-overview.md 2>/dev/null | head -5`
Existing features: !`ls -d docs/*/ 2>/dev/null | xargs -I{} basename {} | grep -v "^_" | grep -vE "blockers|changes|decisions|exports|impacts|inbox|meetings|reports" | tr '\n' ' '`

***

## Approach

### Pha 0 — Tiếp nhận & nắm bối cảnh

1. Khởi __TodoWrite__: track các pha.
2. __Resolve input:__ no arg → hỏi "Anh muốn /discover chủ đề gì?". Đợi. Arg → chủ đề text.
3. __Load project context:__ đọc `docs/_shared/project-profile.md` (Domain + Đối thủ + Thuật ngữ —
   per `project-profile.md` rule) + `docs/_product/prd.md` (Vision/target users/JTBD/monetization +
   Feature Map để gợi ý feature liên quan). Thiếu → fallback `docs/_shared/system-overview.md` /
   `CLAUDE.md`. Vẫn không có domain/target audience/monetization → ghi nhận thiếu, sẽ hỏi ở Pha A2
   (KHÔNG grep rỗng rồi đoán) và cuối skill đề xuất ghi câu trả lời vào profile.
4. __Derive keyword slug__ — kebab-case ASCII max 40. Transliterate tiếng Việt. __Detect language.__

***

### Pha A1 — Phân tích chủ đề (nội bộ, không hỏi user)

- Định nghĩa ngắn 1-2 câu.
- 2-3 synonym / marketing terms (để grep rộng + search variations).
- Domain area (tùy sản phẩm): engagement / monetization / content / AI / vận hành / thanh toán...
- __JTBD nháp:__ người dùng "thuê" tính năng này để làm được __job gì__ (vd tính năng nhắc nhở → "duy
  trì thói quen dùng đều"). Đây là nháp để hỏi lại user ở Pha A2, KHÔNG chốt 1 mình.

***

### Pha A2 — Làm rõ input (MỚI — chỉ hỏi khi mơ hồ, no-re-ask)

Scan input + context: __nếu ý định + scope đã rõ → bỏ qua pha này.__ Nếu mơ hồ, hỏi tuần tự (từng câu
một, đợi trả lời), tối đa 3 câu — chỉ hỏi phần chưa rõ:

1. __Mục tiêu research__ (quyết KHUNG report):
   - (a) __Quyết build/skip__ — đủ 5 lớp (opportunity → đối thủ → RICE → khuyến nghị + phương án). *Default.*
   - (b) __Tham khảo đối thủ__ — nhẹ hơn, chủ yếu bảng competitive để lấy ý.
   - (c) __Tìm ý tưởng feature__ — nghiêng opportunity/JTBD, đề xuất phương án quanh chủ đề.
2. __Gắn vào đâu__ — feature nào trong Feature Map, hay ý tưởng mới độc lập? (đọc `_product/prd.md` gợi ý).
   Đã có `--feature` → bỏ qua.
3. __Đã biết/giả định gì__ — anh có góc nhìn sẵn về việc này không? (tránh research lại cái đã rõ).
   Thiếu target audience/monetization (Pha 0 báo thiếu) → hỏi gộp 1 câu ở đây.

Vague ("chưa rõ") → giữ default (a) + greenfield, ghi nhận là giả định. KHÔNG bế tắc.

***

### Pha B — Opportunity + Project match scan

__B1 — Opportunity framing:__ từ JTBD nháp (A1) + câu trả lời (A2), dựng:
- Job người dùng + 1-2 câu vì sao job này đáng giải trong app.
- __Bằng chứng nhu cầu:__ có tín hiệu thật không (feedback/review/drop-off/nói của user)? Không có →
  ghi thẳng "chưa có evidence — giả định top-down" (KHÔNG ngụy tạo bằng chứng).

__B2 — Project match:__ dùng KG để tìm candidate feature/brainstorm liên quan theo concept __TRƯỚC__, sau đó vẫn grep + Read prose làm lưới quét bổ sung và là evidence cuối:

```bash
node .claude/skills/kg/engine/kg-query.mjs facts <feature> --all
node .claude/skills/kg/engine/kg-query.mjs explore <feature-or-ID> --all
node .claude/skills/kg/engine/kg-query.mjs neighbors <path> --all
```

- Dùng `facts <feature>` cho các feature trong `Existing features` để đối chiếu keyword/synonym với ID/title/path; với candidate trùng concept hoặc `--feature` user đã nêu, dùng `explore` để xem quan hệ gần và `neighbors <path>` để mở rộng sang feature/brainstorm liên quan.
- KG chỉ chọn feature/path đáng kiểm tra và không phải bằng chứng rằng chủ đề thực sự được đề cập. Nếu output có `⚠ còn N mục — chạy với --all` thì bắt buộc chạy lại đúng query với `--all`. Nếu output có `Phải Read tay (ngoài graph)`, phải Read các file đó. `KG-ERROR` hoặc exit ≠ 0 thì bỏ kết quả KG và chạy flow grep + Read cũ, không suy diễn từ output một phần.‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍
- Giữ grep Feature Map + URD + brainstorms như lưới quét bổ sung, kể cả KG trả candidate:
```bash
grep -liE "{keyword|synonym1|synonym2}" docs/_product/prd.md docs/*/*-urd.md 2>/dev/null
grep -rliE "{keyword|synonym1|synonym2}" docs/*/brainstorms/ 2>/dev/null
```
Read 2-3 dòng context thật bằng `grep -B1 -A2` hoặc `Read` cho mọi match từ KG/grep trước khi kết luận. Mỗi match: path + feature slug + 2-3 dòng context + `status`. ≥1 match cùng feature → set `feature_tag` cho `links:`. 0 match sau cả KG, grep và Read → "Greenfield — chưa feature nào đề cập chủ đề này."

***

### ⛔ CHECKPOINT 1 — L1 Plan (dừng chờ user)

Load `references/playbook.md` (chọn đối thủ + scale effort) + `references/comparison-columns.md` (đề xuất cột).

In kế hoạch BA-friendly (per ba-conventions Mục 5):

> Em sẽ research: __"{chủ đề}"__ · Mục tiêu: {build-skip / tham khảo / tìm ý tưởng}
>
> __Job người dùng (nháp):__ {JTBD} · Bằng chứng nhu cầu: {có gì / chưa có}
>
> __Project match:__ {N} chỗ trong {feature_list} / Greenfield
>
> __Đề xuất đối thủ ({N}):__ {list — lý do mỗi cái}
>
> __Bộ cột so sánh:__ {list}
>
> __Scale effort:__ {nhỏ / chuẩn / phức tạp} — {N} đối thủ × {M} nhánh search
>
> __Phản biện verdict:__ debate 3 góc nhìn (ủng hộ / phản đối / khả thi) qua CLI ngoài →
> ~{4-6} lượt delegate (3 vai + tối đa 1 vòng rebuttal + arbiter). *(bỏ dòng này nếu mục tiêu
> chỉ tham khảo, hoặc user đã tắt debate / tắt web)*
>
> __Gắn feature:__ {feature_tag / greenfield}
>
> Apply? (Y / sửa)

Đợi user Y. "sửa: ..." → điều chỉnh, in lại. Chỉ sang Pha C sau khi Y.

***

### Pha C — Competitive research (spawn agent)

> __Skip nếu user nói "đừng search web"__ — nhảy CHECKPOINT 2 với data Pha A+B (flag "chưa benchmark").
> __Mục tiêu (b) tham khảo__ → vẫn spawn nhưng report nhẹ phần RICE/verdict.

Spawn `@feature-researcher` với prompt gồm:
- Chủ đề + synonyms + JTBD + sub-features (A1/B1)
- App context (target audience, monetization) từ `_product/prd.md` (hoặc câu trả lời A2 nếu PRD thiếu)
- Project match summary (B2)
- Competitor list + columns đã duyệt CHECKPOINT 1
- Yêu cầu: mỗi ô data gắn `[F]/[I]` + confidence (High/Med/Low) + URL+ngày cho mọi [F]. Không chắc → "uncertain".

Scale effort theo bảng `references/playbook.md`. Parallel 2 agent nếu chủ đề đa khía cạnh (vd AI + pedagogy).

***

### Pha C2 — Debate verdict đa góc nhìn (MỚI — mặc định, tắt bằng lời)

> __Skip pha này khi:__ user nói "khỏi debate"/"đừng hỏi agent khác" · mục tiêu là "(b) tham khảo
> đối thủ" (không cần verdict) · user đã "đừng search web" (thiếu evidence, debate vô nghĩa) → nhảy
> thẳng CHECKPOINT 2 với verdict do 1 mình skill lập luận + flag "chưa qua phản biện đa góc nhìn".

Mục đích: verdict build/skip KHÔNG do một mình skill lập luận (dễ thiên vị theo hướng research ban
đầu). Chia việc cho __3 CLI ngoài, mỗi CLI 1 vai đối lập__, cho tranh luận, Claude làm arbiter chốt.
Chạy qua **`/delegate` Chế độ C (debate + arbiter)** — KHÔNG tự viết launcher, gọi skill delegate.

__C2.1 — Dựng verdict nháp (nội bộ, không tốn quota):__ từ Pha A+B+C, skill soạn 1 verdict nháp
(nên làm / không / có điều chỉnh) + 3-5 câu lập luận + mức ưu tiên thô. Đây là "đề bài" cho 3 vai
mổ xẻ, KHÔNG phải kết luận cuối.

__C2.2 — Chia 3 vai, chạy fanout qua /delegate:__ gọi skill `delegate` (mode fanout 3 vai). Mỗi vai
nhận __cùng 1 gói context__ (chủ đề + JTBD + bằng chứng nhu cầu Mục 1 + tóm tắt đối thủ Mục 2 + lưu ý
Mục 3 + verdict nháp) nhưng __prompt đóng vai khác nhau__:

| Vai | CLI đề xuất | Nhiệm vụ (lập luận có nhãn, KHÔNG bịa số) |
|---|---|---|
| __Ủng hộ build__ | codex (terra) | Nêu lý do MẠNH NHẤT nên làm: cơ hội, giá trị cho người dùng/sản phẩm, chi phí bỏ lỡ. Chỉ dùng evidence đã có; suy đoán ghi rõ. |
| __Phản đối (skeptic)__ | codex acc khác | Nêu lý do MẠNH NHẤT KHÔNG nên làm / chưa nên: bằng chứng nhu cầu yếu, rủi ro, giải pháp rẻ hơn, table-stakes giả. |
| __Khả thi & chi phí__ | claude (hoặc codex) | Xét công sức, phụ thuộc, dữ liệu cần lưu, cạm bẫy vận hành (Mục 3). Ước lượng ghi `[Estimated]`. |

> Context relay qua scratchpad theo cơ chế delegate. Codex stateless → chèn gói context thẳng vào
> prompt. Mỗi vai kết bằng: **lập trường (build/skip/adjust) + 2-4 luận điểm có nhãn `[F]/[I]` + độ tin**.

__C2.3 — Phát hiện lệch + rebuttal (tối đa 1 vòng):__ Claude đọc 3 output.
- 3 vai __hội tụ__ (cùng lập trường, chỉ khác nhấn mạnh) → bỏ rebuttal, sang C2.4.
- Có __bất đồng thực chất__ (build vs skip lệch nhau) → 1 vòng rebuttal: đưa lập luận đối phương cho
  vai bất đồng "phản biện hoặc điều chỉnh" (per delegate Chế độ C bước 2). Ghi lại diễn tiến.

__C2.4 — Claude arbiter chốt (KHÔNG đẩy ra CLI):__ Claude đọc 3 lập luận + rebuttal, tự chốt verdict
cuối — cân opportunity + evidence strength + strategic fit + dependency (RICE-lite chỉ là sorting aid,
không tự quyết). Verdict lệch với đa số vai → ghi rõ vì sao (arbiter có quyền override, đánh dấu 🔶).

__C2.5 — Ghi lại vào verdict (cho Mục 4):__ kết quả debate thành:
- Verdict cuối (nên làm / không / có điều chỉnh) — đã qua phản biện.
- 1 đoạn __"Các góc nhìn đã cân nhắc"__: điểm 3 vai đồng thuận + điểm còn lệch (nếu có) + vì sao arbiter
  chốt như vậy. Viết thuần Việt, ngắn (per Pha D văn phong) — KHÔNG dán raw output CLI, KHÔNG nhãn `[F]/[I]`.

> __Nếu delegate hết quota / CLI lỗi giữa chừng:__ báo user đã thử account nào, fallback về verdict do
> skill tự lập luận + flag "phản biện đa góc nhìn chưa hoàn tất (agent ngoài lỗi)". KHÔNG giả vờ có debate.

***

### ⛔ CHECKPOINT 2 — Preview report (dừng chờ user)

Sau agent trả kết quả, __in tóm tắt trong chat__ (KHÔNG write file trước):

```
📋 Xem trước: Discover "{chủ đề}"

{Người dùng} cần: {nhu cầu} — bằng chứng: {có gì / chưa có}
Tóm tắt: {3-5 câu: nhu cầu / đối thủ tới đâu / chỗ trống / khuyến nghị}

Bảng so sánh rút gọn: {trục = tính năng; dòng miễn phí/trả phí riêng}

Khuyến nghị: {nên làm / không làm / nên làm-có điều chỉnh} — {1 câu gắn nhu cầu}
Các góc nhìn đã cân nhắc: {đồng thuận X; còn lệch ở Y; arbiter chốt vì Z} — (bỏ dòng này nếu skip debate)
Phần đề xuất làm (nếu nên làm): {1-3 phần cỡ-brainstorm, 1 dòng mỗi cái}

---
Anh xem giúp — chỉnh/bổ sung gì trước khi ghi file? (Y / sửa: ...)
```

"sửa: ..." → điều chỉnh, preview lại (max 2 vòng). Chỉ sang Pha D sau khi Y.

***

### Pha D — Write file

Ghi `docs/_research/{date}-{slug}.md` theo `templates/report-template.md`:
- Frontmatter tối giản: `type`/`status`/`keyword`/`updated`/`links` (KHÔNG changelog).
- __Trước Write set env__ `CLAUDE_SKILL_NAME=/discover`, `CLAUDE_CHANGELOG_NOTE="initial research chủ đề {keyword}"`,
  `CLAUDE_CHANGELOG_AUTHOR={@handle}` — hook ghi `changelog.md` (per changelog rule).
- 5 mục: 1 {Người dùng} cần gì · 2 Đối thủ làm thế nào · 3 Nếu làm thì lưu ý gì · 4 Nên làm không · 5 Bước tiếp theo. + Tóm tắt đầu. ({Người dùng} = thuật ngữ từ profile, default "Người dùng".)
- __Mục 4__ (nếu đã chạy debate Pha C2): sau kết luận nên làm/không, thêm đoạn ngắn **"Các góc nhìn đã
  cân nhắc"** — thuần Việt, 2-4 câu: 3 vai đồng thuận điều gì, còn lệch chỗ nào, arbiter chốt vì sao.
  KHÔNG dán raw output CLI, KHÔNG nhãn `[F]/[I]`. Skip debate → thêm 1 dòng "chưa qua phản biện đa góc nhìn".

__Văn phong (BẮT BUỘC — doc cho BA/PO đọc, không phải cho máy):__
- __Thuần Việt, KHÔNG thuật ngữ lai.__ Viết "nhu cầu / việc người dùng cần làm" thay "job/JTBD"; "chưa có tính năng nào đề cập" thay "greenfield"; "xếp thô để so" thay "sorting aid"; "đối thủ" thay "benchmark/competitor". Thuật ngữ ngành đã quen tai trong domain của dự án thì giữ (giải nghĩa 1 lần), nhưng đừng rải tiếng Anh.
- __KHÔNG nhét meta-text vào doc__ (per ba-conventions Mục 0): KHÔNG legend "[F] Fact / [I] Inference", KHÔNG câu "trục này đứng trước...", KHÔNG câu "cột My app điền từ...", KHÔNG "RICE-lite chỉ để xếp hạng thô...". Mấy hướng dẫn đó sống ở SKILL.md này. Doc chỉ giữ __1 dòng chú giải người đọc cần__ (vd "ô nào suy đoán cần kiểm lại") + nội dung nghiệp vụ thật.
- __Độ tin cậy nói bằng lời__ trong doc: "chắc chắn (có nguồn)" / "suy đoán (nguồn gián tiếp, cần kiểm lại)" — KHÔNG rải nhãn `[F]/[I]/High/Med/Low` khắp bảng cho người đọc. (Agent researcher vẫn gắn nhãn nội bộ để skill lọc ở Pha E, nhưng khi VIẾT VÀO DOC thì chuyển thành lời.)
- __Ngắn để review được__ — mỗi mục vài câu/vài bullet; bảng gọn. Dài dòng = khó duyệt.

***

### Pha E — Auto-verify (BẮT BUỘC — gồm lọc claim không nguồn)

Sau Write, skill tự Read lại file và check:

| Check | Pass criteria | Fail action |
|---|---|---|
| File exists | Read OK | Retry Write |
| Frontmatter tối giản | Đủ `type`/`status`/`keyword`/`updated`/`links`; KHÔNG có `changelog`/`owner`/`created` | L2 diff sửa |
| 5 mục đầy đủ | H2: "Tóm tắt", "1. {Người dùng} cần gì" (theo thuật ngữ profile), "2. Đối thủ làm thế nào", "3. Nếu làm thì lưu ý gì", "4. Nên làm không", "5. Bước tiếp theo" | L2 diff thêm |
| Mục 1 có nhu cầu + bằng chứng | Có ≥1 nhu cầu người dùng + dòng bằng chứng (kể cả "chưa có dữ liệu") | L2 diff thêm |
| __Lọc claim không nguồn__ | Số liệu/claim đối thủ quan trọng có nguồn HOẶC ghi rõ "suy đoán, cần kiểm lại"; __claim trần không nguồn → strip hoặc chuyển câu hỏi mở__ | L2 diff sửa |
| Văn phong sạch | KHÔNG còn legend `[F]/[I]/[R]`, meta-text ("trục này...", "cột My app..."), thuật ngữ lai rải rác (job/greenfield/sorting aid/benchmark) trong doc | L2 diff dọn |
| Không placeholder | Grep `{{...}}`, `{`, `TODO`, `XXX`, `<!-- TBD -->` → 0 hits | L2 diff fill / convert câu hỏi mở |
| Mục 2 có bảng | Bảng có "App mình" + ≥2 đối thủ + dòng miễn phí/trả phí riêng | L2 diff bổ sung |
| Mục 4 có kết luận | Có mức ưu tiên (giá trị/công sức/độ tin cậy) + kết luận nên làm/không, gắn nhu cầu | L2 diff sửa |
| Mục 4 có góc nhìn (nếu debate) | Có đoạn "Các góc nhìn đã cân nhắc" (đồng thuận + điểm lệch) — trừ khi skip debate (thì flag "chưa qua phản biện") | L2 diff thêm |
| Mục 5 có phần đề xuất | ≥1 phần đề xuất làm cỡ-brainstorm (nếu kết luận nên làm) | L2 diff thêm |
| Links existed | Mỗi path trong `links:` tồn tại | Warn list link gãy |

Report verify (checklist ✓/⚠). Tất cả pass → "✅ Tất cả check pass" + Pha F.

***

### Pha F — Final report

```
✅ Discover xong: docs/_research/{date}-{slug}.md

Tóm tắt:
  - {Người dùng} cần: {nhu cầu} — bằng chứng: {có gì / chưa có}
  - Dự án đã đề cập: {N} chỗ trong {feature_list}
  - Đối thủ chính: {top 2-3}
  - Mức ưu tiên: {cao/vừa/thấp} — công sức {S/M/L}
  - Khuyến nghị: {nên làm / không làm / nên làm-có điều chỉnh} — {1 câu gắn nhu cầu}
  - Phản biện: {đã debate 3 góc nhìn — đồng thuận/lệch ở đâu / chưa debate}

Phần đề xuất làm (nếu nên làm):
  - {phần 1 — phạm vi thô}

Bước tiếp theo:
  - /brainstorm "{feature}"     — nếu nên làm (phạm vi thô ở trên làm seed)
  - cập nhật /prd danh sách tính năng — đánh dấu tính năng này nên làm/không
  - /cr "<change>" --feature X   — nếu ảnh hưởng feature đã chốt
```

***

## Output

`docs/_research/{YYYY-MM-DD}-{keyword-slug}.md` — báo cáo điều tra (`type: research`), project-level.

Gồm opportunity/JTBD + đối thủ (có nhãn `[F]`/`[I]`/`[R]`) + RICE-lite + __verdict build/skip/adjust đứng CUỐI__ (sau evidence).

KHÔNG bóc Feature Map (việc `/prd`), KHÔNG vẽ flow (việc `/brainstorm`). Slug kebab-case ASCII ≤40.

## References

- @.claude/rules/project-profile.md (domain/đối thủ/thuật ngữ — hỏi khi thiếu, ghi lại, reuse)
- @.claude/rules/approval-gate.md
- @.claude/rules/kg-usage.md (KG định tuyến Project match — grep + prose vẫn là evidence)
- @.claude/rules/ba-conventions.md
- @.claude/rules/naming-conventions.md
- @.claude/rules/changelog.md
- @.claude/rules/feature-bootstrap.md
- @.claude/agents/feature-researcher.md
- @.claude/skills/delegate/SKILL.md  (Pha C2 — debate 3 góc nhìn qua Chế độ C: debate + arbiter)
- @docs/_product/prd.md
- @.claude/skills/discover/references/playbook.md
- @.claude/skills/discover/references/comparison-columns.md
- @.claude/skills/discover/references/example-competitors.md (cách phân khúc + format bảng đối thủ + chọn cột đặc thù theo domain)
- @.claude/skills/discover/templates/report-template.md‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍


<!-- wm:2b9af6c9b691879b1ddb7a04d29a1c88 -->
<sub>Tài liệu thuộc bộ AI4BA BA-Kit — bản quyền hoangphan.blog</sub>
