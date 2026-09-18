// proto-smoke.mjs — chạy thử luồng nghiệp vụ thật trên prototype đang chạy.
//
// Chạy: node .claude/skills/prototype-next/engine/proto-smoke.mjs <smoke.json> [--url http://localhost:3000] [--headed]
//
// VÌ SAO CÓ FILE NÀY:
// Build xanh + trang trả về 200 KHÔNG chứng minh nghiệp vụ chạy đúng — y hệt bài học
// "có ra ảnh không phải là verify" trong .claude/rules/diagram-correctness.md Mục 3.
// Prototype có thể build sạch mà bấm Đăng nhập không đi đâu cả.
//
// Smoke-test này kiểm 4 MỨC, báo TÁCH TỪNG MỨC (không gộp thành một chữ PASS):
//   1. Trang tải được          — route tồn tại, không lỗi runtime
//   2. Element có mặt          — field/nút mà bảng mô tả nói phải có
//   3. Luồng đi đúng           — thao tác xong tới đúng màn kế
//   4. Nhánh lỗi đúng wording  — ép lỗi thì hiện đúng câu trong Error Matrix
//
// Mức 4 là thứ đắt nhất và cũng là thứ chứng minh prototype bám đặc tả.
//
// Job spec (JSON):
// {
//   "baseUrl": "http://localhost:3000",
//   "flows": [{
//     "name": "Đăng nhập thành công",
//     "path": "/login",
//     "expectElements": ["input[type=email]", "input[type=password]", "button:has-text('Đăng nhập')"],
//     "steps": [
//       {"fill": "input[type=email]", "value": "an@demo.vn"},
//       {"fill": "input[type=password]", "value": "Demo@123"},
//       {"click": "button:has-text('Đăng nhập')"}
//     ],
//     "expectUrl": "**/app/home",
//     "expectText": "Trang chủ"
//   }],
//   "errorChecks": [{
//     "name": "Sai mật khẩu",
//     "code": "E-authentication-003",
//     "wording": "Email hoặc mật khẩu không đúng",
//     "path": "/login",
//     "steps": [...]
//   }]
// }
//
// Exit: 0 = mọi mức pass · 1 = có mức fail · 2 = không chạy được.

import { readFileSync, existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));

function die(msg) {
  console.error(msg);
  process.exit(2);
}

// Tái dùng playwright đã cài cho /userguide — không cài trùng bản thứ hai.
function loadPlaywright() {
  const candidates = [
    join(HERE, '../../userguide/engine/node_modules/playwright/index.js'),
    join(HERE, 'node_modules/playwright/index.js'),
  ];
  for (const c of candidates) {
    if (existsSync(c)) {
      const require = createRequire(import.meta.url);
      return require(c);
    }
  }
  die(
    'PROTO-ERROR: không tìm thấy playwright.\n' +
      '→ Cài một lần: cd .claude/skills/userguide/engine && npm install && npx playwright install chromium',
  );
}

async function applySteps(page, steps = []) {
  for (const s of steps) {
    if (s.fill) await page.fill(s.fill, s.value ?? '');
    else if (s.click) await page.click(s.click);
    else if (s.press) await page.keyboard.press(s.press);
    else if (s.waitFor) await page.waitForSelector(s.waitFor, { timeout: 10_000 });
    else if (s.waitMs) await page.waitForTimeout(s.waitMs);
    else if (s.goto) await page.goto(s.goto);
  }
}

async function main() {
  const argv = process.argv.slice(2);
  const jobPath = argv.find((a) => !a.startsWith('--'));
  if (!jobPath) die('Cách dùng: node proto-smoke.mjs <smoke.json> [--url ...] [--headed]');
  if (!existsSync(jobPath)) die(`PROTO-ERROR: không thấy job file ${jobPath}`);

  const job = JSON.parse(readFileSync(jobPath, 'utf8'));
  const urlIdx = argv.indexOf('--url');
  const baseUrl = (urlIdx >= 0 ? argv[urlIdx + 1] : job.baseUrl) || 'http://localhost:3000';
  const headed = argv.includes('--headed');

  const { chromium } = loadPlaywright();
  const browser = await chromium.launch({ headless: !headed });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();

  // Lỗi runtime trong trình duyệt — build xanh vẫn có thể nổ ở đây
  const consoleErrors = [];
  page.on('pageerror', (e) => consoleErrors.push(String(e.message || e)));

  const results = { load: [], elements: [], flows: [], errors: [] };

  for (const flow of job.flows || []) {
    const label = flow.name || flow.path;
    try {
      const resp = await page.goto(`${baseUrl}${flow.path}`, { waitUntil: 'domcontentloaded', timeout: 20_000 });
      const status = resp ? resp.status() : 0;
      results.load.push({ label, ok: status < 400, detail: `HTTP ${status}` });
      if (status >= 400) continue;

      // Mức 2 — element phải có mặt
      for (const sel of flow.expectElements || []) {
        const found = await page.locator(sel).first().count().catch(() => 0);
        results.elements.push({
          label: `${label} › ${sel}`,
          ok: found > 0,
          detail: found > 0 ? 'có' : 'KHÔNG thấy',
        });
      }

      // Mức 3 — luồng đi đúng
      if (flow.steps?.length) {
        await applySteps(page, flow.steps);
        await page.waitForTimeout(flow.settleMs ?? 1200);

        let ok = true;
        const details = [];

        if (flow.expectUrl) {
          try {
            await page.waitForURL(flow.expectUrl, { timeout: 10_000 });
            details.push(`tới ${new URL(page.url()).pathname}`);
          } catch {
            ok = false;
            details.push(`KHÔNG tới ${flow.expectUrl} (đang ở ${new URL(page.url()).pathname})`);
          }
        }
        if (flow.expectText) {
          const seen = await page.getByText(flow.expectText, { exact: false }).first().count().catch(() => 0);
          if (!seen) { ok = false; details.push(`KHÔNG thấy chữ "${flow.expectText}"`); }
          else details.push(`thấy "${flow.expectText}"`);
        }
        results.flows.push({ label, ok, detail: details.join('; ') || 'chạy xong' });
      }
    } catch (e) {
      results.load.push({ label, ok: false, detail: String(e.message || e).slice(0, 160) });
    }
  }

  // Mức 4 — nhánh lỗi hiện đúng wording trong Error Matrix
  for (const chk of job.errorChecks || []) {
    const label = [chk.code, chk.name].filter(Boolean).join(' ').trim() || chk.path;
    try {
      await page.goto(`${baseUrl}${chk.path}`, { waitUntil: 'domcontentloaded', timeout: 20_000 });

      // Ép lỗi qua localStorage của demo-settings (cùng key với settings-store.ts)
      if (chk.code) {
        await page.evaluate((code) => {
          const KEY = 'demo-settings';
          let s = {};
          try { s = JSON.parse(localStorage.getItem(KEY) || '{}'); } catch {}
          s.state = { ...(s.state || {}), forcedError: code };
          s.version = s.version ?? 0;
          localStorage.setItem(KEY, JSON.stringify(s));
        }, chk.code);
        await page.reload({ waitUntil: 'domcontentloaded' });
      }

      await applySteps(page, chk.steps || []);
      await page.waitForTimeout(chk.settleMs ?? 1500);

      // So khớp một phần: wording có thể chứa tham số ({X} giờ) hoặc nhãn nút trong ngoặc vuông
      const probe = (chk.wording || '').split(/[.[{]/)[0].trim().slice(0, 60);
      const seen = probe
        ? await page.getByText(probe, { exact: false }).first().count().catch(() => 0)
        : 0;

      results.errors.push({
        label,
        ok: seen > 0,
        detail: seen > 0 ? `hiện đúng "${probe}"` : `KHÔNG thấy "${probe}"`,
      });
    } catch (e) {
      results.errors.push({ label, ok: false, detail: String(e.message || e).slice(0, 160) });
    }
  }

  await browser.close();

  // ── Báo cáo TÁCH TỪNG MỨC ──
  const L = [];
  L.push('# proto-smoke');
  L.push('');
  const section = (title, rows, note) => {
    if (!rows.length) { L.push(`## ${title}`, '', '_(không có mục nào để kiểm)_', ''); return; }
    const pass = rows.filter((r) => r.ok).length;
    L.push(`## ${title} — ${pass}/${rows.length}`);
    L.push('');
    for (const r of rows) L.push(`- ${r.ok ? '✓' : '✗'} ${r.label} — ${r.detail}`);
    if (note) { L.push('', note); }
    L.push('');
  };

  section('Mức 1 · Trang tải được', results.load);
  section('Mức 2 · Element có mặt', results.elements);
  section('Mức 3 · Luồng đi đúng', results.flows);
  section(
    'Mức 4 · Nhánh lỗi đúng wording',
    results.errors,
    '_Đối chiếu với Error Matrix trong đặc tả — đây là mức chứng minh prototype bám nghiệp vụ._',
  );

  if (consoleErrors.length) {
    L.push('## ⚠ Lỗi runtime trong trình duyệt');
    L.push('');
    for (const e of [...new Set(consoleErrors)].slice(0, 10)) L.push(`- ${e.slice(0, 200)}`);
    L.push('');
    L.push('_Build xanh vẫn có thể nổ ở đây — phải sửa._');
    L.push('');
  }

  const all = [...results.load, ...results.elements, ...results.flows, ...results.errors];
  const failed = all.filter((r) => !r.ok);
  L.push('---');
  L.push('');
  if (!failed.length && !consoleErrors.length) {
    L.push(`✓ Tất cả ${all.length} mục pass.`);
  } else {
    L.push(`✗ ${failed.length}/${all.length} mục fail${consoleErrors.length ? ` + ${consoleErrors.length} lỗi runtime` : ''}.`);
    L.push('');
    L.push('KHÔNG được báo "xong" khi còn mục fail — sửa, hoặc nói rõ cái gì chưa chạy.');
  }
  console.log(L.join('\n'));

  process.exit(failed.length || consoleErrors.length ? 1 : 0);
}

main().catch((e) => die(`PROTO-ERROR: ${e.message}`));
