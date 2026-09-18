---
name: playwright-gen
description: Dùng khi cần sinh script Playwright (`.spec.ts`) chạy được từ test case UI đã có (`/test-cases`), rồi chạy để test. `/playwright-gen <feature>` hoặc `/playwright-gen <feature> --run`. Khác `/api-test` (Bruno, tầng API) — đây là tầng UI (browser).
allowed-tools: Read, Write, Edit, Bash, Glob, Grep, AskUserQuestion
user-invocable: true
disable-model-invocation: true
argument-hint: "[<feature>] [--run] [--headed] [--tc CHK-...] [--base <url>] [--allow-prod]"
---
<!-- Licensed to vandungvo2003@gmail.com — Order YYWVQ3VWE -->

# /playwright-gen — Codegen Playwright từ Test Case (TC .md → .spec.ts → chạy script)‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

## Goal‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

Biến test case UI (đã duyệt ở `/test-cases`) thành **Playwright script `.spec.ts` chạy được**, rồi chạy script để test. Mô hình: **TC (.md) → engine codegen → `.spec.ts` → `npx playwright test`** — codegen __1 lần__ ra artifact bền, script tự chạy (CI/local), __KHÔNG__ phải AI chạy test mỗi lần. Song sinh `/api-test` (Bruno cho API) nhưng cho __UI/browser__.

* **Nguồn = `test/testcases/testcases-*.md`** (đã qua `/test-cases`). Mỗi TC có element theo nhãn nghiệp vụ + Expected verifiable + Test-Data → đủ để engine sinh script.
* **Engine dùng chung `.claude/scripts/playwright-gen.mjs`** map nhãn nghiệp vụ → Playwright locator (getByRole/getByLabel), sinh spec, chạy, ghi kết quả ngược. **AI KHÔNG viết `.spec.ts` tay** — chỉ trigger engine.
* Ranh giới: __BA/QC sở hữu TC nghiệp vụ__ (element-nhãn/Expected/Test-Data); __engine sở hữu__ map locator + plumbing (dev-enablement). BA KHÔNG viết selector CSS.

## Vì sao codegen từ TC (không AI-run mỗi lần)‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

* Script `.spec.ts` bền → chạy trong CI/local không cần AI, không tốn token, kết quả tái lập.
* TC đã atomic 1:1 + element-nhãn + Expected exact (nhờ `/test-cases` Đợt 1-3) → map sang script cơ học, ít bịa.
* Giống `/api-test` sinh `.bru` rồi runner chạy — cùng triết lý __doc .md là gốc → engine sinh artifact → chạy → ghi ngược__.

## Hard gate + phạm vi codegen‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

* **HARD GATE: phải có `test/testcases/testcases-*.md`.** Chưa có → refuse + route `/test-cases` trước (feature-bootstrap nhóm B — cần artifact upstream).
* **CHỈ codegen TC `Auto=Yes` VÀ KHÔNG có TBD** (Preconditions/Expected/Test-Data). TC `Auto=No` (DB-inspection/concurrency/measurement/manual) hoặc có `TBD` hoặc `(retired)` → __skip + liệt kê rõ__ ("manual/chưa-ready, không codegen"). __KHÔNG bịa selector/assertion__ cho phần thiếu.
* Element __không có nhãn__ (vd "logo") → engine sinh locator kèm `// TODO xác nhận locator` — KHÔNG giả vờ chắc chắn.

## Inputs‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

```
/playwright-gen authentication                 # scaffold: gen specs từ testcases
/playwright-gen authentication --run           # gen (nếu chưa) + chạy → ghi kết quả ngược
/playwright-gen authentication --run --headed  # chạy có browser hiện
/playwright-gen authentication --run --tc CHK-authentication-021   # chạy 1 CHK cụ thể
```

Skill tự suy feature từ ngữ cảnh; mơ hồ → picker. "regen lại" → gen lại từ testcases (sau khi `/test-cases` update).

## Context (dynamic)

Today: !`date +%Y-%m-%d`
Features có testcases: !`for d in docs/*/test/testcases/; do [ -d "$d" ] && echo "$d" | sed 's|docs/||;s|/test/testcases/||'; done | head -10`
E2E đã gen: !`for d in docs/*/test/e2e/*-e2e-index.md; do [ -f "$d" ] && echo "$d"; done | head -10`

## Output

```
docs/{feature}/test/e2e/
  {feature}-e2e-index.md         # master: bảng spec (scope/file/tests/kết-quả) + Skipped (Auto=No/TBD)
  specs/{scope}.spec.ts          # 1 file/scope, mỗi TC 1 test() block, title chứa CHK-ID (trace)
  testdata.json                  # ← TEST DATA TÁCH KHỎI SCRIPT (key {chk}.{step}.{field} → giá trị). Sửa lúc chạy, KHÔNG đụng .spec.ts
  testdata.defaults.json         # bảng default GỐC (máy đọc, KHÔNG sửa) — run đối chiếu để biết key nào CÒN giá-trị-giả
  playwright.config.ts           # config (baseURL từ env {FEATURE}_BASE, KHÔNG secret/prod-url hardcode)
  .env.example                   # tên biến secret (BASE, ENV:VAR) — KHÔNG value
  report.json                    # report Playwright thô (tạm, engine parse rồi xóa)
  run-report.md                  # ← KẾT QUẢ CHẠY cho user đọc: phân loại ✅/🔴nghi-app/🟡nghi-data/🟠outdate/⏳chờ + bảng "data cần bổ sung"
  run-history.json               # lịch sử run (máy đọc): mỗi CHK → status + mốc PASS + data-fingerprint. Nguồn cho --retry-failed + phát hiện outdate
```

`.env` (secret value) __gitignored__ — như `/api-test`. AI KHÔNG đọc value.

__Test data TÁCH khỏi script (quan trọng):__ test-case viết TRƯỚC khi có product → data trong TC là __giá trị giả-định__ (mẫu). Engine KHÔNG hard-code data vào `.spec.ts` — thay vào đó spec đọc `DATA("{chk}.{step}.{field}", <default>)` từ `testdata.json`. Key gồm cả __step__ để 2 field khác nhau trong cùng TC (kể cả khi nhãn slug-giống nhau, vd "Số tiền" vs "So tien") KHÔNG đụng key nhau → không đọc chung 1 entry gây sai data thầm lặng. __Lúc chạy__ (product đã ra hình): sửa `testdata.json` cho khớp môi trường (email/tài khoản thật của staging) → KHÔNG đụng `.spec.ts`. Data giả-định từ TC làm __default__ (chạy được ngay nếu chưa sửa). Regen __giữ giá trị user đã sửa__ trong `testdata.json` (merge, không ghi đè); nếu `testdata.json` bị __lỗi cú pháp JSON__ (user sửa tay để sót dấu phẩy) engine **DỪNG + sao lưu `.bak`** thay vì nuốt lỗi rồi reset về default (tránh mất data thật). __Secret__ (mật khẩu/token) KHÔNG vào `testdata.json` (committed) — khai `ENV: VAR` ở Test Data → spec đọc `process.env`, value ở `.env`.

__Kết quả chạy: phân loại "rớt do data" vs "rớt do app" + vòng cấp-data-chạy-lại (quan trọng):__ vì data test lúc viết chỉ là giả-định, khi chạy thật một FAIL có thể do __data (giả/thiếu/outdate)__ chứ không phải app lỗi. Engine phân loại mỗi kết quả — __KHÔNG ngắt luồng hỏi giữa chừng__, chạy một mạch rồi ghi hết vào `run-report.md`:

* __🟡 nghi-data__ — fail ở bước NHẬP DATA/navigation/auth (marker `/*@data-step*/` engine chèn lúc gen). Kiểm data test trước khi báo dev.
* __🔴 nghi-app-bug__ — fail ở assertion nghiệp vụ (`/*@assert-step*/`). Nghi app lỗi thật, route dev.
* __🟠 nghi-outdate__ — bước data từng PASS với ĐÚNG data này (theo `run-history.json`), nay fail ở bước data → data cũ (vd account bị team khác đổi).
* __⏳ chờ__ — chưa chạy được (env chưa dựng / setup-required).
* Bảng __"data cần bổ sung"__: key nào CÒN giá-trị-giả (== default gốc) + key THIẾU trong `testdata.json`.

__Vòng làm việc (không AskUserQuestion chen giữa test):__ `run` chạy hết → ghi `run-report.md` → __user tự đọc + cấp data thật__ vào `testdata.json` (secret để `.env`) → chạy lại __chỉ case chưa-PASS__ bằng `run --retry-failed` (engine đọc `run-history.json`, lọc case ≠ PASS, không cần gõ danh sách). Lặp tới khi sạch hoặc chỉ còn 🔴 nghi-app-bug thật.

## Engine dùng chung (`.claude/scripts/playwright-gen.mjs`)

__Không tự viết engine per-feature.__ 1 bản canonical, nhận `--dir docs/{feature}/test`:

```bash
node .claude/scripts/playwright-gen.mjs gen  --dir docs/{feature}/test [--feature {slug}] [--base <url>]
node .claude/scripts/playwright-gen.mjs run  --dir docs/{feature}/test [--headed] [--tc CHK-...] [--retry-failed] [--base <url>]
```

* `gen` — đọc `testcases/testcases-*.md` (parser format 10-field), sinh `specs/*.spec.ts` + config + index. Map nhãn→locator: "nút X"→`getByRole('button',{name})`; "field X"→`getByLabel`; "link X"→`getByRole('link')`; "Truy cập /path"→`page.goto`. Expected→assertion: redirect→`toHaveURL`; hiển thị→`toBeVisible`; KHÔNG hiển thị→`toBeHidden`. Skip Auto=No/TBD/retired.
* `run` — `npx playwright test` → parse `report.json` → __phân loại__ mỗi kết quả (✅/🔴nghi-app/🟡nghi-data/🟠outdate/⏳chờ) → ghi `run-report.md` (cho user) + kết quả ngược `{feature}-e2e-index.md` + `run-history.json`. baseURL unreachable → __PENDING__ (KHÔNG FAIL giả). KHÔNG ngắt luồng hỏi — chạy hết rồi report.
* `run --retry-failed` — đọc `run-history.json`, chạy lại CHỈ case chưa-PASS vòng trước (bỏ ✅). Dùng sau khi user cấp data thật vào `testdata.json`.
* Engine có test riêng `.claude/scripts/__tests__/playwright-gen.test.mjs` (node:test) — sửa 1 lần áp mọi feature.
* **AI chỉ trigger `node ... playwright-gen.mjs`**, KHÔNG viết/sửa `.spec.ts` tay.

## Modes

| Mode | Lệnh | Làm gì |
|------|------|--------|
| __Scaffold__ (default) | `/playwright-gen <feature>` | engine `gen` → sinh specs + config + index; report gen/skip |
| __Regen__ | "regen lại" | engine `gen` lại từ testcases (sau `/test-cases` update) — ghi đè specs (KHÔNG sửa tay) |
| __Run__ | `/playwright-gen <feature> --run [--headed] [--tc CHK-...]` | engine `run` → chạy + phân loại kết quả + ghi `run-report.md` + index |
| __Retry-failed__ | `/playwright-gen <feature> --run --retry-failed` | chạy lại CHỈ case chưa-PASS vòng trước (sau khi user cấp data thật) |

Flag cổng an toàn: `--run` (thực chạy browser, mặc định chỉ gen); `--headed` (hiện browser); `--tc CHK-...` (chạy 1 CHK); `--retry-failed` (chỉ case chưa-PASS).

## Approach‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

0) __Resolve mode.__ "regen" → regen; `--run` → gen-nếu-cần + run; còn lại → scaffold.
1) __Hard gate.__ Thiếu `test/testcases/testcases-*.md` → refuse + "chạy `/test-cases {feature}` trước".
2) __Feature resolve__ (tự suy / picker).
3) __Dry-run để lấy số cho L1__ — `node .claude/scripts/playwright-gen.mjs gen --dir docs/{feature}/test --dry-run`. Engine parse + in "{N} test / {K} spec, skip {M}" __KHÔNG ghi file__.
4) __L1 plan preview__ (TRƯỚC khi engine ghi) — dùng số từ dry-run: sẽ gen {N} spec cho {scope list}, skip {M} TC (Auto=No/TBD), file ghi (specs/config/index/.env.example). Apply? (Y/sửa). __L1 tuân approval-gate: engine KHÔNG ghi trước khi user Y.__
5) **User Y → trigger engine `gen`** (không `--dry-run`) → ghi specs/config/index. __Regen/Run ghi đè artifact auto-gen qua L1 tổng, KHÔNG L2 per-file__ `.spec.ts` (chúng là dẫn xuất, như `/api-test` runner ghi ngược — không diff từng file).
6) **`--run`? → engine TỰ enforce production gate (không dựa AI đọc .env):**
   * __Engine tự resolve baseURL__ (`--base` > env `{FEATURE}_BASE`) → chỉ lấy origin sạch (`scheme://host`, KHÔNG credential/query). AI KHÔNG đọc value .env.
   * Engine cho chạy thẳng CHỈ khi origin ∈ `e2e/.allowed-origins` (khai non-prod) HOẶC localhost/*.local/*.test. Origin lạ → engine __refuse__, in hướng dẫn.
   * __Production cần 2 lớp:__ `--allow-prod` __VÀ__ `--confirm-prod <origin>` (gõ đúng origin). Thiếu 1 → engine dừng. AI KHÔNG tự truyền 2 cờ này — user phải yêu cầu tường minh (hỏi qua AskUserQuestion trước khi thêm).
   * Qua gate → engine chạy MỘT MẠCH (không hỏi giữa chừng) → ghi `run-report.md` phân loại ✅/🔴nghi-app/🟡nghi-data/🟠outdate/⏳chờ. __Trình report cho user__ + __diễn giải nghiệp vụ__ (map về CHK-ID → FR/màn hình). Nêu rõ: 🔴 nghi-app-bug → route dev; 🟡/🟠/thiếu-data → user cấp data thật vào `testdata.json` rồi `--retry-failed`. **TC setup-required (Preconditions `(dựng:...)`) → skip/PENDING**, KHÔNG FAIL giả. baseURL chưa có → PENDING.
   * __KHÔNG AskUserQuestion per-case giữa luồng test__ — chỉ ghi report, để user review offline. Vòng lặp: report → user cấp data → `/playwright-gen {feature} --run --retry-failed` (engine tự lọc case chưa-PASS) → report vòng 2.
6bis. __Data thật khác data-giả → hỏi cập nhật ngược vào test-case?__ Nếu user đã sửa `testdata.json` (giá trị thật khác default trong test-case), hỏi qua AskUserQuestion: *"Có {N} test data khác với test-case gốc (vd `chk-login-020.2.email`: TC ghi `user@test.com`, testdata.json là `real@staging.com`). Cập nhật ngược data thật vào test-case không?"*.
   * __Y__ → L2 diff cập nhật `Test Data` trong `testcases-*.md` cho khớp, để lần sau TC có data đúng. (Chỉ giá trị data thường; secret giữ `ENV: VAR`, KHÔNG ghi value thật vào TC.)
   * __n__ → giữ nguyên (testdata.json là nơi ghi đè, TC giữ giá trị giả-định mẫu). Mặc định KHÔNG tự cập nhật — hỏi trước.
7) __Final report:__
   ```
   ✅ Playwright specs generated
      Index:  docs/{feature}/test/e2e/{feature}-e2e-index.md
      Specs:  {N} test trong {K} spec file
      Skipped: {M} TC (Auto=No/TBD/retired) — liệt kê CHK-ID + lý do
      Config: playwright.config.ts (baseURL từ {FEATURE}_BASE)

   Chạy:
      - node .claude/scripts/playwright-gen.mjs run --dir docs/{feature}/test   (headless)
      - hoặc /playwright-gen {feature} --run --headed
      - Set {FEATURE}_BASE trong docs/{feature}/test/e2e/.env trước khi chạy thật

   Recommended next:
      - Resolve {M} TC skipped (Auto=No cần manual / TBD cần BA cấp) nếu muốn phủ automation
      - /test-cases {feature} (update) nếu cần sửa TC → rồi regen
   ```

   **Sau khi `--run`** (thêm phần kết quả):
   ```
   Kết quả: ✅{P} · 🔴{nghi-app} · 🟡{nghi-data} · 🟠{outdate} · ⏳{chờ}
      Report: docs/{feature}/test/e2e/run-report.md  ← đọc "data cần bổ sung"
      - 🔴 nghi-app-bug: route dev (fail ở assertion nghiệp vụ)
      - 🟡/🟠 nghi-data + {D} data cần bổ sung: cấp data thật vào testdata.json → /playwright-gen {feature} --run --retry-failed
   ```

## Constraints

### Hard rules — never violate

* **Nguồn = testcases-*.md (HARD gate)** — KHÔNG tự đẻ test ngoài TC (chống bịa, như `/test-cases` bám checklist). Muốn thêm scenario → sửa `/test-cases` rồi regen.
* __Chỉ codegen TC codegen-ready__ (Auto=Yes + no-TBD + không retired). Còn lại skip + report — KHÔNG bịa selector/assertion.
* __Element từ NHÃN nghiệp vụ → role-based locator__ (getByRole/getByLabel — bền hơn CSS, Playwright best practice). Không nhãn → TODO comment, không giả chắc chắn.
* __Expected → assertion đúng loại__ (redirect/visible/hidden/text). KHÔNG assert thứ không có trong Expected. Message exact từ Expected (đã từ prose ở `/test-cases`).
* __Trace CHK-ID xuyên suốt__ — mỗi test() title chứa CHK-ID (nguồn edge KG spec→TC→CHK). 1 TC = 1 test() block.
* **Secret chỉ `.env` gitignored** — AI KHÔNG đọc value, KHÔNG `cat .env`/`echo $VAR`. baseURL + account seed từ `.env` (tên biến), không hardcode.
* **AI KHÔNG viết `.spec.ts` tay** — engine sinh. Sửa spec = sửa TC rồi regen (tweak tay bị ghi đè).
* __baseURL unreachable → PENDING__, KHÔNG FAIL giả (như `/api-test` môi trường-chưa-sẵn).
* __AN TOÀN PRODUCTION (engine tự enforce, không bypass được)__ — engine `run` tự kiểm origin: chỉ chạy thẳng khi ∈ `e2e/.allowed-origins` hoặc localhost/*.local/*.test. Origin lạ → refuse. Production cần __2 lớp__: `--allow-prod` + `--confirm-prod <origin>` (gõ đúng). KHÔNG dựa regex tên-miền làm bằng chứng. Lệnh direct (`node ...playwright-gen.mjs run`) trong Final report cũng qua cùng gate. AI KHÔNG đọc .env value — engine resolve + trả origin sạch.
* **`.allowed-origins`** (committed, KHÔNG secret) — list origin non-prod đã khai (1/dòng). Setup 1 lần khi có môi trường thử.
* __L1 trước ghi file.__ __BA conventions__ (IT-BA framing, no-re-ask). Per @../../rules/ba-conventions.md.

### Pitfalls — easy to get wrong

* **`.spec.ts` là artifact auto-gen — KHÔNG sửa tay.** Sửa nghiệp vụ ở `/test-cases` → regen. Đầu mỗi spec có comment "AUTO-GENERATED, KHÔNG sửa tay".
* __TC Auto=No/TBD bị skip là ĐÚNG__ — không phải lỗi. Chúng là manual/chưa-ready; report liệt kê để BA biết phần nào automation phủ, phần nào không.
* __Element "logo"/không-nhãn__ → engine sinh locator TODO — user/dev xác nhận locator thật (đây là ranh giới nhãn-nghiệp-vụ không đủ định vị; cần dev hỗ trợ hoặc test-id, ngoài vai BA thuần).
* __TC thiếu CHK-ID → engine SKIP__ (không gen title `TC-{stt}` — sẽ không ghi kết quả ngược được). Nguồn legacy/không-CHK → chạy `/test-cases` update để ổn định trace trước.
* __Preconditions cụ thể → engine KHÔNG sinh fixture setup.__ TC như "account locked sau 5 fail" gen được spec NHƯNG chạy sẽ FAIL nếu state chưa seed thủ công — FAIL nhóm này __không phải lỗi app__, xem lại setup trước khi kết luận. Index đánh dấu TC có Preconditions ≠ `—` là "cần fixture". (Sinh fixture tự động là mở rộng sau — dev-enablement.)
* __Chưa có backend/baseURL__ → gen được (script trên giấy), run ra PENDING. Engine tự load `e2e/.env` → set `{FEATURE}_BASE` ở đó khi có môi trường.
* __Cài Playwright (1 lần, dev-enablement ngoài vai BA):__ `e2e/` chưa có `@playwright/test` → chạy `npm i -D @playwright/test && npx playwright install` trong `e2e/` trước lần `run` đầu. Engine `gen` KHÔNG cần Playwright (chỉ sinh text); chỉ `run` cần.
* __KG (dự kiến — CHƯA build):__ node `e2e_spec` + edge `AUTOMATES` (spec→TC qua CHK-ID) là hướng tích hợp KG, chưa có trong `kg-build.mjs`. Khi build sẽ ghi schema ở `kg/` (không phải naming-conventions).

## References

* @../../rules/feature-bootstrap.md
* @../../rules/ba-conventions.md
* @../../rules/approval-gate.md
* @../../rules/naming-conventions.md
* @../../rules/changelog.md‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍


<!-- wm:2b9af6c9b691879b1ddb7a04d29a1c88 -->
<sub>Tài liệu thuộc bộ AI4BA BA-Kit — bản quyền hoangphan.blog</sub>
