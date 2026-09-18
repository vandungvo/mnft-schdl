---
name: prototype-next
description: Dùng khi cần dựng prototype chạy được bằng Next.js cho 1 feature — sinh code thật vào `prototype/`, tự build, tự chạy local, tự sửa lỗi.
allowed-tools: Read, Write, Edit, Bash, AskUserQuestion
user-invocable: true
disable-model-invocation: true
argument-hint: "<feature>"
---
<!-- Licensed to vandungvo2003@gmail.com — Order YYWVQ3VWE -->

# /prototype-next — Prototype chạy được trên Next.js‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

## Goal‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

Sinh __code Next.js thật__ vào `prototype/` cho 1 feature, dựng thành app chạy như thật: vỏ ứng dụng (sidebar/topbar/user menu), route guard, dữ liệu mẫu, luồng nghiệp vụ đúng đặc tả, state lưu `localStorage`. Sau đó __tự build, tự sửa lỗi, tự chạy local, tự kiểm luồng__ rồi báo URL — người dùng non-tech chỉ mở browser xem nghiệp vụ.

"Chạy như thật" = state + điều hướng + validation + nhánh lỗi vận hành đúng logic nghiệp vụ. Không backend, không database, không API thật.

## Kiến trúc: máy làm phần tất định, AI làm phần phán đoán‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

Đây là ràng buộc trung tâm của skill. __Đừng đọc prose để lấy thứ engine đã bóc sẵn.__

| Việc | Ai làm | Ghi chú |
|---|---|---|
| Bóc Error Matrix + wording, FR/BR/NFR, entity, state, screen, flow | `proto-extract.mjs` | Từ Knowledge Graph — sinh sẵn `errors.ts` + `types.ts` |
| Parse bảng mô tả element (6 lớp) | `proto-extract.mjs` | Tự nhận header; format lạ thì __báo__, không trả rỗng |
| __Liệt kê ràng buộc giao diện__ (token/component/màn đã dựng) | `gen-design-context.mjs` | Sinh lại mỗi lần chạy — chống AI quên khi vẽ nhiều màn |
| Chép boilerplate + đặt bề rộng theo khổ màn hình | `proto-scaffold.mjs` | Giống nhau mọi dự án |
| __Soát trôi giao diện__ | `design-audit.mjs` | Còn vi phạm là __chưa được báo xong__ |
| Build + sửa lỗi cơ học + lấy port thật | `proto-build.mjs` | Dừng sớm khi lỗi lặp lần 2 |
| Kiểm luồng chạy đúng (4 mức) | `proto-smoke.mjs` | Build xanh ≠ nghiệp vụ đúng |
| Đọc userflow/use case, phát hiện chỗ thiếu | __AI__ | Cần hiểu ý định |
| Dịch quy tắc nghiệp vụ thành hàm validate | __AI__ | Prose → code |
| Dựng layout màn từ wireframe, chọn component | __AI__ | Phán đoán thị giác |
| Thiết kế dữ liệu mẫu có chủ đích | __AI__ | Mỗi bản ghi phủ 1 trạng thái khác nhau |
| Sửa lỗi build engine không xử lý được | __AI__ | Lỗi lạ |

### Chống "quên" khi vẽ nhiều màn‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

Vẽ tới màn thứ 12, model không còn nhớ quyết định ở màn thứ 1 → tự đặt bề rộng mới, viết mã màu
thô, dựng lại component đã có. Nhắc trong prompt không đủ. Ba lớp chặn bằng máy:

1) **`DESIGN-CONTEXT.md` sinh lại mỗi lần chạy** — danh sách ĐÓNG các token/component/variant hợp lệ,
   bóc từ chính code. Sinh chứ không viết tay: bản kiểm kê viết tay sẽ cũ đi, và cũ thì tệ hơn không
   có, vì model tin nó.
2) **`<Screen>` sở hữu bề rộng + khoảng cách**, và **không nhận `className`** — mỗi lối truyền class
   vào là một đường lách để đặt kiểu riêng cho một màn.
3) **`design-audit.mjs`** bắt mã màu thô, giá trị tự chế, thẻ form thô, và **cùng một giá trị lặp ở
   nhiều file** (dấu hiệu rõ nhất: màn sau nghĩ lại con số màn trước đã có).

## Constraints‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

### Hard rules — never violate

* **Chỉ ghi vào `prototype/`.** Không sửa `docs/` — trừ đề xuất ghi `docs/_shared/project-profile.md` ở Phase B qua L2 (per `project-profile.md`).
* __L1 approval__ trước khi sinh code. File đã tồn tại → __L2 diff__.
* __KHÔNG bịa nghiệp vụ.__ Validation / wording / ngưỡng số / nhánh rẽ phải trích được từ `proto-facts.json` hoặc doc đã đọc. Không có → hỏi ở Phase B, hoặc ghi vào danh sách giả định. Đặc biệt: mã lỗi mà engine báo *"không trích được wording"* thì __phải hỏi__, không tự đặt câu thông báo.
* __KHÔNG backend/database/API thật.__ Không `fetch` ra ngoài, không route handler làm việc thật, không Prisma/Drizzle/SQLite. State sống trong zustand persist.
* **KHÔNG cài dependency ngoài `zustand` + `sonner` + component shadcn cần dùng.** Muốn thêm → nêu ở L1. Không cài MSW/json-server/TanStack Query.
* **Đọc `node_modules/next/dist/docs/` trước khi viết code Next** — `prototype/AGENTS.md` cảnh báo bản này khác training data.
* __Không xoá code feature cũ.__ Lần chạy thứ 2 trở đi là update mode: chỉ THÊM. Đụng file dùng chung → L2 diff.
* __Không báo "xong" khi còn lỗi.__ Build fail, `design-audit` còn vi phạm, hoặc smoke-test fail → nói rõ cái gì chưa chạy. Không commit git.
* __Khổ màn hình do người dùng chọn__, không tự đoán (per `ba-conventions.md` Mục 7).
* **Chỉ dùng token/component có trong `DESIGN-CONTEXT.md`.** Thiếu → thêm vào `globals.css` / cài shadcn, không viết mã màu thô, không đặt bề rộng riêng, không dựng lại component đã có.
* **Trang `/` là trang tổng quan bản mẫu**, không phải màn của sản phẩm: nhóm theo tính năng, sơ đồ luồng bấm được, danh sách màn. Có nút mở ứng dụng thật. Đừng trộn hai vai vào một trang.

### Pitfalls — hay sai

Bẫy kỹ thuật của bản Next hiện tại (hydration, `params` async, `NODE_ENV`, Tailwind v4, StrictMode, port tự nhảy) nằm ở `references/nextjs-gotchas.md` — đọc khi viết code, không nhắc lại ở đây.

Bẫy về nội dung:

* __Đừng hiện mã kỹ thuật ra UI.__ Enum `pending_review` → "Đang chờ duyệt". Mã lỗi `E-...` chỉ xuất hiện trong Demo Toolbar (công cụ nội bộ), thông báo cho người dùng dùng đúng wording trong Error Matrix.
* __Đừng bỏ trạng thái đang xử lý.__ Mọi submit: disable + đổi nhãn + spinner theo độ trễ giả, rồi mới ra kết quả.
* **Đừng dùng `alert()`/`confirm()` trong luồng nghiệp vụ** — dùng toast/dialog thật. (Demo Toolbar được phép, vì là công cụ.)
* __Tiếng Việt phải có dấu__, kể cả trong seed data và nhãn.
* __Đừng viết lại component đã có__ trong `prototype/src/components/ui/`.

## Approach

### Phase A — Chạy engine, rồi chỉ đọc phần engine không bóc được

__A1. Xác định feature.__ Chưa có `docs/{feature}/` → theo `feature-bootstrap.md` __nhóm B__: refuse + liệt kê feature hiện có + route `/srs` hoặc `/brainstorm`. Skill cần đặc tả làm nguồn; không có thì sẽ bịa.

No-arg → liệt kê feature có `srs/{feature}-spec.md`, user chọn.

__A2. Chạy engine bóc fact:__

```bash
node .claude/skills/prototype-next/engine/proto-extract.mjs <feature>
```

Đọc __báo cáo in ra__ + `prototype/src/lib/demo/_generated/proto-facts.json`. Xử lý bắt buộc:

| Engine báo | Skill phải làm |
|---|---|
| `⚠ Tài liệu nguồn đang STALE` | __Nêu với người dùng ở L1__ — prototype có thể lệch bản mới nhất |
| `⚠ Mã lỗi không trích được wording` | Đưa vào câu hỏi Phase B — KHÔNG tự đặt câu |
| `⚠ Bảng mô tả element không bóc được` | __Read tay__ đúng các file đó |
| `⚠⚠ KHÔNG bóc được element nào` | Read tay toàn bộ; không coi là "màn không có element" |
| `PROTO-ERROR` (exit 2) | Engine không dùng được → quay về đọc trực tiếp `docs/{feature}/` như thường |

__A3. Đọc phần engine KHÔNG bóc được__ (chỉ 3 nguồn này):

* `srs/{feature}-userflow.md` — nhánh happy/error/edge, chia flow, `primary_device`
* `usecases/uc-*.md` — kịch bản chính + nhánh rẽ
* `docs/design.md` — design token, nếu chưa áp vào `prototype/src/app/globals.css`

Không đọc lại `spec.md`/`erd.md`/`states.md` — engine đã bóc. Trừ khi engine báo lỗi.

__A4. Đọc app hiện có__ — `prototype/.demo-manifest.json` nếu có (feature nào đã dựng, route nào, store slice nào). Chưa có manifest → đọc `prototype/src/` một lần rồi tạo manifest. __Không quét lại toàn bộ cây mỗi lần chạy.__‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

__A5. Đối chiếu design.md với feature.__ Design system có hợp ngữ cảnh feature không? Lệch rõ ràng → câu hỏi cho Phase B, không tự quyết. Hợp → áp thẳng.

__A6. Lập danh sách chỗ thiếu__ — mọi thứ cần để code mà nguồn không trả lời: điểm vào app sau khi hoàn tất feature, dữ liệu mẫu cho màn ngoài phạm vi, bước ngoài màn hình (bấm link trong email, thời gian trôi, callback OAuth).

### Phase B — Hỏi gộp 1 lần (HARD STOP)

Gom __tất cả__ câu hỏi thành một lượt, tối đa ~6 câu. Trả lời xong là chạy một mạch tới khi app lên.

Dùng `AskUserQuestion`, phương án khuyên dùng để đầu kèm "(đề xuất)" + lý do rút từ nguồn. Câu hỏi phải cho thấy __hệ quả nhìn được__ ("sau đăng nhập vào trang chủ danh sách bài học"), không hỏi kiểu kỹ thuật.

Áp `ba-conventions.md` Mục 2 (no-re-ask) + Mục 3 (IT-BA framing) + `project-profile.md` — không nhắc lại nội dung rule ở đây.

__Luôn nằm trong lượt hỏi này__ (trừ khi đã có câu trả lời từ lần chạy trước):

| Hỏi gì | Vì sao không được tự quyết |
|---|---|
| __Khổ màn hình__ — điện thoại 375 / máy tính bảng 768 / để bàn 1024 / co giãn | Quyết định thiết kế, per `ba-conventions.md` Mục 7. Đề xuất sẵn một lựa chọn lấy từ `primary_device` trong userflow (thiếu thì suy từ tài liệu thiết kế của dự án) và ghi rõ nguồn — nhưng __suy được chỉ để đề xuất, không để tự chốt__. Đã có trong `.demo-manifest.json` thì dùng lại, không hỏi lại. |
| __Nguồn giao diện__ — nếu dự án chưa có tài liệu thiết kế, hoặc có mà lệch ngữ cảnh feature | Tài liệu thiết kế là thứ tùy dự án: có dự án có, có dự án không, có dự án để ở đường dẫn khác. Không tìm thấy → nói rõ là đang dùng bộ mặc định trung tính của shadcn, __đừng tự chế bảng màu__. |
| __Điểm vào app__ sau khi hoàn tất feature | Đặc tả thường dừng ở "vào app" và để feature khác lo |
| __Dữ liệu mẫu__ cho màn ngoài phạm vi feature | Không có nguồn để suy |
| __Bước ngoài màn hình__ (bấm link trong email, hết hạn, callback) | Cách diễn trong bản mẫu là lựa chọn, không phải suy luận |

Không có gì để hỏi → bỏ qua Phase B.

### Phase C — L1 plan preview

Trình bày bằng prose nghiệp vụ theo `ba-conventions.md` Mục 5. Phải có: màn hình sẽ dựng (kèm địa chỉ trên trình duyệt) · luồng chạy được · nhánh lỗi demo được · dữ liệu mẫu · nguồn giao diện · __cảnh báo stale nếu engine báo__ · giả định đang dùng.

Kết bằng `Apply? (Y / sửa)`.

### Phase D — Sinh code

__D0.__ Đọc `prototype/node_modules/next/dist/docs/` phần liên quan (app router, client component, params).

__D1.__ Chép boilerplate + đặt bề rộng theo khổ đã chốt + cài dependency:

```bash
node .claude/skills/prototype-next/engine/proto-scaffold.mjs \
  --app-name "<tên app>" --device <mobile|tablet|desktop|responsive>
cd prototype && npm install zustand sonner
```

Engine ghi bề rộng bố cục vào `globals.css` và lưu khổ vào `.demo-manifest.json`. Chép đè file đã có
thì phải `--force` — mặc định giữ nguyên, để không mất tùy biến của lần trước.

__D1b.__ Sinh ràng buộc giao diện rồi __đọc nó__ trước khi viết dòng JSX đầu tiên:

```bash
node .claude/skills/prototype-next/engine/gen-design-context.mjs
```

`prototype/DESIGN-CONTEXT.md` là __danh sách đóng__: chỉ dùng token/component/variant có trong đó.
Cần thứ chưa có → thêm token vào `globals.css` hoặc `npx shadcn@latest add`, __đừng tự chế__.

__D2.__ Viết phần phụ thuộc nghiệp vụ (engine không làm được):

| File | Nội dung |
|---|---|
| `src/lib/demo/seed.ts` | Dữ liệu mẫu — mỗi bản ghi phủ 1 trạng thái nghiệp vụ khác nhau, có `SEED_VERSION` |
| `src/lib/demo/rules.ts` | Quy tắc từ BR/FR, __mỗi hằng số + hàm có comment cite ID__ |
| `src/lib/demo/store.ts` | zustand persist, `skipHydration: true`, mỗi feature 1 slice |
| `src/lib/demo/demo-catalog.ts` | Danh sách màn (nhóm theo flow) + tài khoản mẫu cho Demo Toolbar |
| `src/app/(auth)/...`, `(app)/...` | Màn hình theo flow |
| `src/app/globals.css` | Design token |
| `src/app/layout.tsx` | Gắn `HydrationGate` + `Toaster` + `DemoToolbar` |

Chi tiết khuôn: `references/state-architecture.md` (store/rules/seed) + `references/app-shell.md` (route/guard/màn hình).

__D3.__ Ghi `prototype/.demo-manifest.json`: feature, các route, store slice, ngày sinh — để lần chạy sau không phải quét lại.

### Phase E — Soát giao diện + build

```bash
node .claude/skills/prototype-next/engine/design-audit.mjs
node .claude/skills/prototype-next/engine/proto-build.mjs
```

Audit còn vi phạm → sửa trước khi build. Ngoại lệ chính đáng (màu thương hiệu bên thứ ba trong ảnh
SVG) khai vào `prototype/design-audit.allow.json` để nó tường minh, __không im lặng bỏ qua__.

Engine tự sửa lỗi cơ học (thiếu `"use client"`, thiếu component shadcn, thiếu package) và __dừng sớm khi cùng một lỗi lặp lần 2__ — dấu hiệu sửa sai hướng.

Exit 1 → AI đọc phần lỗi engine in ra (đã rút gọn) và sửa, rồi chạy lại. Vẫn fail sau 2 lượt AI → __báo thật__, không nói "xong".

Không chạy `tsc --noEmit` (build đã type-check) và không dùng `npm run lint` làm gate.

### Phase F — Chạy + kiểm luồng

```bash
node .claude/skills/prototype-next/engine/proto-build.mjs --dev-only
```

Engine in `PROTO_URL=<url>` — __lấy URL từ đó__, đừng giả định cổng.

Rồi viết `smoke.json` (1 happy path + 2-3 nhánh lỗi tiêu biểu) và chạy:

```bash
node .claude/skills/prototype-next/engine/proto-smoke.mjs <smoke.json> --url <url>
```

Báo cáo tách 4 mức: trang tải được · element có mặt · luồng đi đúng · __nhánh lỗi đúng wording__. Mức 4 là thứ chứng minh prototype bám đặc tả — build xanh không thay được nó.

Có mục fail → sửa rồi chạy lại. Sửa 2 lượt không xong → báo thật cái gì chưa chạy.

### Phase G — Output report

Ngôn ngữ nghiệp vụ, không dump đường dẫn file. Phải có: URL thật (từ `PROTO_URL`) · tài khoản đăng nhập thử · luồng demo được · nhánh lỗi bật được trong Demo Toolbar · __kết quả smoke-test 4 mức__ · cảnh báo stale nếu có · giả định đã dùng · __cái gì chưa làm được__.

Kèm gợi ý: chạy `/prototype-next <feature-khác>` để thêm feature vào cùng app.

## Update mode (lần chạy thứ 2 trở đi)

Tự nhận biết ở A4 qua `.demo-manifest.json`, không cần cờ.

* __Cùng feature__ → so code hiện có với nguồn mới, chỉ sửa phần lệch, L2 diff từng file.
* __Feature khác__ → giữ nguyên code cũ; thêm route group + store slice + mục sidebar. Ba chỗ dùng chung (nav config, store root, `globals.css`) → L2 diff.
* Đổi shape dữ liệu đã lưu → **tăng `SEED_VERSION`** + viết `migrate`, để localStorage cũ không làm vỡ app.

## Output

`prototype/src/lib/demo/` (seed, store, rules, catalog, `_generated/`) · `prototype/src/components/demo/` (gồm `flow-map.tsx`) · `prototype/src/components/layout/screen.tsx` · `prototype/src/app/page.tsx` (trang tổng quan) + `(auth|app)/` · `prototype/DESIGN-CONTEXT.md` · `prototype/.demo-manifest.json` · dev server đang chạy.

**Không ghi gì vào `docs/`** (trừ đề xuất `project-profile.md` ở Phase B).

## References

* `engine/proto-extract.mjs` · `gen-design-context.mjs` · `proto-scaffold.mjs` · `design-audit.mjs` · `proto-build.mjs` · `proto-smoke.mjs`
* `engine/templates/` — boilerplate chép sẵn, gồm `screen.tsx`
* `@.claude/rules/ba-conventions.md` Mục 7 (khổ màn hình) + Mục 8 (tách trạng thái, biểu mẫu hẹp)
* `references/state-architecture.md` — store/rules/seed phụ thuộc nghiệp vụ
* `references/app-shell.md` — route, guard, khuôn màn, vòng đời field
* `references/nextjs-gotchas.md` — bẫy bản Next hiện tại
* `@.claude/rules/approval-gate.md` · `@.claude/rules/ba-conventions.md` · `@.claude/rules/feature-bootstrap.md` · `@.claude/rules/project-profile.md` · `@.claude/rules/kg-usage.md`
* `@.claude/skills/prototype-html/SKILL.md` — anh em cùng tầng fidelity, khác hình thức output‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍


<!-- wm:2b9af6c9b691879b1ddb7a04d29a1c88 -->
<sub>Tài liệu thuộc bộ AI4BA BA-Kit — bản quyền ai4ba.com</sub>
