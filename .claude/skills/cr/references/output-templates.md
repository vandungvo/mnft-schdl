# /cr — Mẫu output cho từng bước‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

> Tham chiếu từ `SKILL.md`. Mỗi mục dưới đây ứng với 1 bước trong state machine chính — giữ nguyên văn, chỉ tách ra khỏi luồng chính để `SKILL.md` dễ đọc hơn.

## Feature match — 1 kết quả rõ rệt (Phase 1, bước 4)‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

```
Em hiểu đang sửa `authentication` (match: "login screen", "OAuth"). Đúng không? (Y / sửa: <slug khác>)
```

## Feature match — nhiều kết quả gần nhau (Phase 1, bước 4)‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

```
Change này có thể thuộc:
   1. payment
   2. checkout
Vẽ cho feature nào? (1,2 / cancel)
```

## Cross-feature scan phát hiện đụng feature khác (Phase 2, bước 6)‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

```
⚠ Change này còn đụng feature(s) khác:
   - `payment`   (referenced: FR-payment-003 trong urd.md)
   - `checkout`  (shared entity: Cart)
Mở rộng scope sang các feature này? (Y / n-chỉ-{feature} / cancel)
```

## Nhiều CR đang chờ apply — hỏi chọn (Phase 4, bước 9.5)‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

```
Có 2 CR đang chờ apply:
   1. CR-20260708-002 — payment — severity medium — duyệt lúc 2026-07-08 09:15
   2. CR-20260708-003 — authentication — severity high — duyệt lúc 2026-07-08 14:40
Apply CR nào? (nhập số, hoặc "/cr apply CR-{id}" trực tiếp lần sau)
```

Đợi user chọn — KHÔNG tự chọn "gần nhất" hay suy luận từ hội thoại.

## HARD STOP sau khi viết report (Phase 3, bước 9)

```
📋 Đã viết report — CHƯA đụng vào docs feature.

   Verdict: {direct-edit-ok | cr-needed}
   Status:  impact-assessed  (chờ anh gõ `apply`)
   CR record:  docs/cr/CR-{id}.md   (self-contained: Impact Matrix + detailed impact + rollback)

Impact Matrix (6 chiều):
   Scope: {mức}  |  Stakeholder: {mức}  |  Effort: {mức}
   Timeline: {mức}  |  Risk: {mức}  |  Dependency: {mức}

Tác động tóm tắt ({N} docs sẽ đổi):
   1. docs/.../spec.md          (🟢 approved)  — thêm FR-...
   2. docs/.../userstories/...  (Jira: PROJ-42) — thêm US-...
   ...

👉 Anh đọc kỹ CR record trên (mục Impact Matrix + Impacted Docs + Rollback Plan).
   Khi sẵn sàng, reply `apply` để em bắt đầu apply từng file (L2 diff per file).
   Hoặc `cancel` để dừng (record vẫn giữ, resume sau bằng `/cr apply CR-{id}`).
```

Skill KẾT THÚC turn ở đây. **TUYỆT ĐỐI không tự đi tiếp sang apply.** Đợi user reply `apply`/`cancel`/câu hỏi. Nếu user đã nói "chỉ phân tích thôi" ngay từ đầu: chỉ in report path rồi dừng, KHÔNG kèm gợi ý `apply`.

## L1 preview tổng trước L2 loop (Phase 4, bước 11)

```
📋 Đã compose proposed changes cho {N} file. Tóm tắt:
   1. docs/auth/srs/{feature}-spec.md     — Thêm FR-auth-008 + cập nhật FR-auth-005
   2. docs/auth/ascii-wireframe/login.md — Button "Sign in with Apple"
   ...
Vào L2 diff loop? (Y / cancel / show-detail <N>)
```

## L2 diff mỗi file trong apply loop (Phase 4, bước 12)

```
[N/M] {path}
{short summary of change}

Apply? (Y / n / edit-prompt: <feedback> / skip)
```

Changelog entry ghi theo routing rule (`rules/changelog.md`), format: `{date} | /cr | {@author} | {file-path} | applied {cr-id}: {note}`.

## Applied Changes section — append vào CR record (Phase 4, bước 14)

```markdown
## Applied Changes (2026-05-23)

### docs/authentication/srs/authentication-spec.md (Mục 2 FR)
**Before:**
> FR-auth-005: User đăng nhập email + password.

**After:**
> FR-auth-005: User đăng nhập email + password HOẶC Apple ID (SSO).

### docs/authentication/ascii-wireframe/login.md (Mục 2 description table)
- Thêm row "Apple Sign-In button" (item_type: Button, behavior: redirect → Apple OAuth).
```

Per-file 5-10 dòng before/after context. Truncate diff dài (>20 dòng) với "... (N lines elided, see git for full diff)".

## Apply Checklist — đối chiếu trước khi applied (Phase 4, bước 12.5)

```
📋 Đối chiếu Apply Checklist (9/9 file):
   ✅ docs/authentication/srs/authentication-spec.md
   ✅ docs/authentication/srs/{feature}-flows.md
   ✅ docs/authentication/srs/{feature}-erd.md
   ✅ docs/authentication/usecases/authentication-usecase-index.md
   ✅ docs/authentication/usecases/uc-github-oauth.md
   ✅ docs/authentication/ascii-wireframe/login.md
   ✅ docs/authentication/ascii-wireframe/authentication-wireframe-index.md
   ✅ docs/authentication/userstories/authentication-story-index.md
   ✅ docs/authentication/userstories/us-014.md

Không còn dòng pending → CR chuyển status "applied".
```

Nếu phát hiện thiếu giữa chừng (vd tool lỗi ở file 6/9, loop dừng sớm):

```
⚠ Apply Checklist còn 2 file chưa xử lý (bị gián đoạn giữa loop):
   ⬜ docs/authentication/ascii-wireframe/login.md
   ⬜ docs/authentication/ascii-wireframe/authentication-wireframe-index.md

Em tiếp tục xử lý 2 file này trước khi đánh dấu CR applied.
```

Skill tự quay lại L2 diff cho các dòng `⬜` — KHÔNG hỏi user "có muốn tiếp tục" (đây là hoàn tất phần việc đã được approve ở HARD STOP, không phải quyết định mới).

## Artifacts to rebuild — bảng detect (Phase 5, bước 16)

| Edited file | Recommend rebuild |
|---|---|‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍
| `ascii-wireframe/{flow-slug}.md` | `/figma {feature} {screen-slug}` (nếu `{feature}-wireframe-index.md` cột Figma có URL cũ) + `/preview {feature}` |
| `ascii-wireframe/{feature}-wireframe-index.md` | `/preview {feature}` |
| `srs/{spec,flows,states,erd,userflow}.md` | `/preview {feature}` (edit `userflow.md` → cân nhắc gọi lại `/wireframe-ascii {feature}` + `/wireframe-html {feature}` — tự vào update mode — nếu flow-slug/screen list đổi) |
| `usecases/uc-*.md` hoặc `{feature}-usecase-index.md` | `/preview {feature}` |
| `usecases/{feature}-usecase-diagram.md` (nếu tồn tại) | `/preview {feature}` |
| Bất kỳ MD nào trong feature | Nếu `docs/exports/*-{feature}-package.{pdf,html,docx}` tồn tại → `/export {feature} {format}` |

## Artifacts to rebuild — section append vào CR record (Phase 5, bước 17)

```markdown
## Artifacts to rebuild (post-apply 2026-05-23)

| Artifact | Lệnh regen | Trạng thái |
|---|---|---|
| Figma frame `login` | `/figma login` | ⏳ pending |
| Preview HTML | `/preview authentication` | ⏳ pending |
| Export PDF (2026-05-21) | `/export authentication pdf` | ⏳ pending |
```

Khi user chạy regen sau này, update cột "Trạng thái" → `✅ done {date}`.

## Prompt chạy artifact rebuild ngay (Phase 5, bước 18)

```
📌 Artifacts cần rebuild (đã log vào CR-{id} Mục "Artifacts to rebuild"):
   1. /figma login
   2. /preview authentication
   3. /export authentication pdf

Reply:
   - `all`           — em chạy tuần tự cả 3
   - `1,3` / `1-2`   — pick số
   - `skip`          — anh chạy tay sau (CR đã log để không quên)
   - `cancel`
```

## Activity Log Summary cuối session — BẮT BUỘC (Phase 5, bước 19)

Per `rules/changelog.md` v2.6 routing, file phụ trợ KHÔNG có changelog riêng. Skill PHẢI in tổng kết cuối session để user xác nhận routing đã thực sự ghi:

```
📝 Activity log (docs/_shared/changelog.md — hook ghi 1 dòng/file đã edit):
   ✅ docs/authentication/authentication-urd.md                    → 1 dòng
   ✅ docs/authentication/srs/authentication-spec.md               → 1 dòng
   ✅ docs/authentication/usecases/uc-github-auth.md               → 1 dòng
   ✅ docs/authentication/ascii-wireframe/login-email-password.md  → 1 dòng

Mỗi file đã edit = 1 dòng riêng trong changelog.md (path là routing) — đối chiếu
số dòng với danh sách file đã apply (xem rules/changelog.md).
```

KHÔNG được skip bước này. Phải in **mọi file đã edit + xác nhận từng file có dòng changelog.md tương ứng** để user thấy rõ.

## `/cr close` — gate khi còn artifacts pending

```
⚠ CR-{id} còn {N} artifact(s) chưa rebuild:
   1. Test checklist viewer  → /test-checklist authentication   ⏳ pending
   2. Preview HTML           → /preview authentication          ⏳ pending

Reply:
   - `rebuild`  — em chạy hết rồi mới close
   - `waive`    — close, nhưng mỗi artifact chuyển thành `⚠ waived ({lý do})` + ghi Decision Log
   - `cancel`   — giữ status `applied`, không close
```

**KHÔNG có lựa chọn `force` giữ nguyên `⏳ pending`**: `closed` nghĩa là "không còn open action", mà `/dashboard` chỉ cảnh báo artifacts pending khi CR còn `applied` — close với pending = việc dở dang biến mất khỏi radar. Bỏ qua thì phải nói rõ lý do → đó là `waive`.

## Baseline check phát hiện docs đã đổi (Phase 4, bước 9.6)

```
⚠ CR-{id} viết report lúc {date}, nhưng {N}/{M} file trong Impacted Docs đã đổi từ lúc đó:
   - docs/authentication/srs/authentication-spec.md   (baseline a1b2c3d → hiện tại e4f5g6h)
   - docs/authentication/userstories/us-014.md        (baseline 9x8y7z0 → file không còn tồn tại)

Impact assessment dựa trên nội dung cũ → có thể đã sai.

Reply:
   - `re-assess`     — em phân tích lại (Phase 2-3) rồi viết report mới
   - `apply-anyway`  — biết rủi ro, cứ apply (em ghi rõ vào Decision Log)
   - `cancel`
```

## Resume CR partially-applied (Phase 4, bước 9.5)

```
CR-{id} đang dở dang ({X}/{N} file đã apply, ngắt lúc {date}):
   ✅ docs/authentication/srs/authentication-spec.md
   ✅ docs/authentication/usecases/uc-github-oauth.md
   ⬜ docs/authentication/ascii-wireframe/login.md
   ⬜ docs/authentication/userstories/us-014.md

Em chỉ xử lý 2 file còn ⬜ — KHÔNG apply lại 2 file đã ✅ (tránh apply đúp).
Tiếp tục? (Y / cancel)
```

## `/cr list` — bảng output

| CR ID | Status | Severity | Feature | Updated | Impacted docs | Stale chain |

Default `--status open` = `proposed | impact-assessed | partially-applied | applied`. `--status all` xem cả closed/rejected.‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍


<!-- wm:2b9af6c9b691879b1ddb7a04d29a1c88 -->
<sub>Tài liệu thuộc bộ AI4BA BA-Kit — bản quyền ai4ba.com</sub>
