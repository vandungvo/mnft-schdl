#!/usr/bin/env node
/*
 * bruno-runner.mjs — runner dùng chung cho /api-test (mọi feature, own + 3rd-party).
 *
 * Bảng `api-tests.md` (trong --dir) là SOURCE OF TRUTH. Script:
 *   gen  → parse bảng (giữa <!-- TC:START --> / <!-- TC:END -->) → sinh collection Bruno
 *          (bruno/{provider|own}/{TC}.bru + bruno.json + _setup/login.bru nếu có cột Auth).
 *          KHÔNG đụng bruno/environments/ + bruno/.env.
 *   run  → gen (refresh) → npx @usebruno/cli run --env <env> --reporter-json → parse report
 *          → ghi ✅/❌/⏳ + thời điểm ngược vào bảng + prepend dòng Lịch sử chạy.
 *
 * Bảng hỗ trợ 2 dạng cột (tự phát hiện theo header):
 *   3rd-party: TC | Provider | Method | Path | Headers | Body | HTTP | Assert | Kết quả | Lần chạy
 *   own API:   TC | Method | Path | Auth  | Body | HTTP | Assert | Kết quả | Lần chạy
 *   (own API auth = public/session; "session" cần _setup/login.bru chạy trước, dùng cookie jar
 *   Bruno giữ trong 1 run — KHÔNG cần auth block per-request khi cookie-based)
 *
 * "Môi trường giấy" (chưa có backend/mock — 100% request connection-refused):
 *   Runner KHÔNG ghi ❌ FAIL giả — ghi ⏳ PENDING (env chưa sẵn sàng) và exit code 0.
 *   Đây không phải lỗi test, là lỗi môi trường; ❌ FAIL chỉ dùng khi ≥1 request kết nối
 *   được (nghĩa là môi trường sống, và có case thật fail).
 *
 * BẢO MẬT: secret CHỈ ở bruno/.env (gitignored), Bruno tự nạp qua {{process.env.*_KEY}}
 * hoặc {{process.env.SEED_EMAIL}}/{{process.env.SEED_PASSWORD}} (own API). Script KHÔNG đọc
 * .env, KHÔNG in Authorization/token/cookie. Report JSON (có thể chứa token đã resolve) bị
 * XOÁ ngay sau khi parse; chỉ field cần (name/method/status/assert) được dùng.
 *
 * Dùng:
 *   node .claude/scripts/bruno-runner.mjs gen  --dir docs/{feature}/test/api
 *   node .claude/scripts/bruno-runner.mjs run  --dir docs/{feature}/test/api [--env mock|sandbox|prod|local|staging] [--tc TC-01,TC-03] [--provider paygate] [--allow-prod]
 */

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

// ---------- args ----------
const argv = process.argv.slice(2);
const mode = argv[0] && !argv[0].startsWith('--') ? argv[0] : 'run';
const flag = (name, def = null) => {
  const i = argv.indexOf('--' + name);
  return i >= 0 ? (argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : true) : def;
};

const DIR_ARG = flag('dir');
// HERE/BRUNO_DIR/TABLE_FILE chỉ dùng bởi gen()/run() (CLI mode) — resolve lười (function) thay vì
// top-level const, để file import được (fixture test dùng flattenReport/classify/derivePending
// là hàm pure, không cần --dir) mà không bị exit sớm.
function paths() {
  if (!DIR_ARG) {
    console.error('Thiếu --dir <path>. Ví dụ: --dir docs/authentication/test/api');
    process.exit(2);
  }
  const HERE = path.resolve(process.cwd(), DIR_ARG);
  return { HERE, BRUNO_DIR: path.join(HERE, 'bruno'), TABLE_FILE: path.join(HERE, 'api-tests.md') };
}

const ENV = flag('env', 'mock');
const TC_FILTER = flag('tc') ? String(flag('tc')).split(',').map(s => s.trim().toUpperCase()) : null;
const PROVIDER_FILTER = flag('provider') ? String(flag('provider')).toLowerCase() : null;
const ALLOW_PROD = argv.includes('--allow-prod');

// ---------- table parse ----------
function readTable(TABLE_FILE) {
  const md = fs.readFileSync(TABLE_FILE, 'utf8');
  const start = md.indexOf('<!-- TC:START -->');
  const end = md.indexOf('<!-- TC:END -->');
  if (start < 0 || end < 0) throw new Error('Không thấy marker TC:START/END trong api-tests.md');
  const block = md.slice(start, end).split('\n').filter(l => l.trim().startsWith('|'));
  const header = block[0].split('|').slice(1, -1).map(c => c.trim().toLowerCase());
  const hasProvider = header.includes('provider');
  const hasAuth = header.includes('auth');
  const idx = name => header.indexOf(name);

  const rows = [];
  for (const line of block.slice(2)) {
    const cells = line.split('|').slice(1, -1).map(c => c.trim());
    if (!cells.length || !/^TC-\d+/i.test(cells[0])) continue;
    rows.push({
      tc: cells[0].toUpperCase(),
      provider: hasProvider ? (cells[idx('provider')] || 'own').toLowerCase() : 'own',
      auth: hasAuth ? (cells[idx('auth')] || 'public').toLowerCase() : null,
      method: (cells[idx('method')] || '').toUpperCase(),
      pathRaw: cells[idx('path')] || '',
      headers: hasProvider ? (cells[idx('headers')] || '—') : '—',
      body: cells[idx('body')] || '—',
      http: cells[idx('http')] || '',
      assert: cells[idx('assert')] || '—',
    });
  }
  return { rows, hasProvider, hasAuth };
}

const slug = s => s.replace(/^\//, '').split('?')[0].replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '') || 'root';

function assertBody(http, assert) {
  const lines = [`  res.status: eq ${http}`];
  if (assert && assert !== '—') {
    for (const pair of assert.split(';').map(x => x.trim())) {
      const m = pair.match(/^([\w.]+)=(.+)$/);
      if (m) lines.push(`  res.body.${m[1]}: eq ${m[2]}`);
      // prose không match dotpath=value (vd "no session in response") ghi lại nguyên văn để
      // người review biết còn 1 assertion nghiệp vụ cần kiểm tay — KHÔNG bịa thành assert giả.
      else lines.push(`  # kiểm thủ công: ${pair}`);
    }
  }
  return lines.join('\n');
}

// ---------- gen ----------
function emitBru(r, seq, ownBaseVar) {
  const m = r.method.toLowerCase();
  const hasBody = r.body && r.body !== '—' && m !== 'get';
  const useBearer = r.provider !== 'own';
  const L = [];
  L.push('meta {');
  L.push(`  name: ${r.tc} ${r.method} ${r.pathRaw}${r.auth === 'session' ? ' [session]' : ''}`);
  L.push('  type: http');
  L.push(`  seq: ${seq}`);
  L.push('}');
  L.push('');
  const urlVar = useBearer ? `{{${r.provider.toUpperCase()}_BASE}}` : `{{${ownBaseVar}}}`;
  L.push(`${m} {`);
  L.push(`  url: ${urlVar}${r.pathRaw}`);
  if (hasBody) L.push('  body: json');
  if (useBearer) L.push('  auth: bearer');
  L.push('}');
  if (useBearer) {
    L.push('');
    L.push('auth:bearer {');
    L.push(`  token: {{process.env.${r.provider.toUpperCase()}_KEY}}`);
    L.push('}');
  }
  if (r.headers && r.headers !== '—') {
    L.push('');
    L.push('headers {');
    for (const h of r.headers.split(';')) {
      const idx = h.indexOf(':');
      if (idx < 0) continue;
      L.push(`  ${h.slice(0, idx).trim()}: ${h.slice(idx + 1).trim()}`);
    }
    L.push('}');
  }
  if (hasBody) {
    let bodyText = r.body;
    try { bodyText = JSON.stringify(JSON.parse(r.body), null, 2); } catch { /* keep raw */ }
    L.push('');
    L.push('body:json {');
    for (const bl of bodyText.split('\n')) L.push('  ' + bl);
    L.push('}');
  }
  L.push('');
  L.push('assert {');
  // Auth=session (đã đánh dấu [session] trong meta.name ở trên) cần _setup/login.bru chạy
  // trước để có cookie jar — Bruno .bru KHÔNG hỗ trợ comment `#` ngoài block, nên ghi chú này
  // sống trong assert{} (nơi `#` hợp lệ) thay vì cuối file.
  if (r.auth === 'session') L.push('  # Auth=session: cần _setup/login.bru chạy trước (cookie jar). Chạy cả suite, đừng chạy lẻ.');
  L.push(assertBody(r.http, r.assert));
  L.push('}');
  L.push('');
  return L.join('\n');
}

function loginBru(ownBaseVar) {
  return [
    'meta {',
    '  name: _setup login (seed account)',
    '  type: http',
    '  seq: 0',
    '}',
    '',
    'post {',
    `  url: {{${ownBaseVar}}}/auth/login`,
    '  body: json',
    '}',
    '',
    'body:json {',
    '  {',
    '    "email": "{{process.env.SEED_EMAIL}}",',
    '    "password": "{{process.env.SEED_PASSWORD}}"',
    '  }',
    '}',
    '',
    'assert {',
    '  res.status: eq 200',
    '  # Cookie-session: Bruno cookie jar giữ session sau request này cho các TC Auth=session trong cùng run.',
    '  # Nếu backend dùng JWT thay cookie: thêm vars:post-response { authToken: res.body.token } + auth:bearer ở TC session.',
    '}',
    '',
  ].join('\n');
}

// Derive feature slug từ path — segment ngay sau "docs/" (vd docs/authentication/test/api -> authentication).
function deriveFeature(HERE) {
  const parts = HERE.split(path.sep);
  const i = parts.lastIndexOf('docs');
  return (i >= 0 && parts[i + 1]) ? parts[i + 1] : 'api';
}

function gen() {
  const { HERE, BRUNO_DIR, TABLE_FILE } = paths();
  const { rows, hasAuth } = readTable(TABLE_FILE);
  fs.mkdirSync(BRUNO_DIR, { recursive: true });

  const feature = deriveFeature(HERE);
  const ownBaseVar = `${feature.toUpperCase().replace(/[^A-Z0-9]+/g, '_')}_BASE`;

  const bjson = path.join(BRUNO_DIR, 'bruno.json');
  if (!fs.existsSync(bjson)) {
    fs.writeFileSync(bjson, JSON.stringify({ version: '1', name: `${feature}-api-tests`, type: 'collection', ignore: ['node_modules', '.git'] }, null, 2) + '\n');
  }

  const providers = [...new Set(rows.map(r => r.provider))];
  for (const p of providers) {
    const dir = path.join(BRUNO_DIR, p);
    if (fs.existsSync(dir)) for (const f of fs.readdirSync(dir)) if (f.endsWith('.bru')) fs.rmSync(path.join(dir, f));
    fs.mkdirSync(dir, { recursive: true });
  }

  const hasSession = hasAuth && rows.some(r => r.auth === 'session');
  if (hasSession) {
    fs.rmSync(path.join(BRUNO_DIR, '_setup'), { recursive: true, force: true });
    fs.mkdirSync(path.join(BRUNO_DIR, '_setup'), { recursive: true });
    fs.writeFileSync(path.join(BRUNO_DIR, '_setup', 'login.bru'), loginBru(ownBaseVar));
  }

  const filemap = {};
  for (const r of rows) {
    if (!r.http) continue; // multi-step/side-effect case không có HTTP code → ngoài suite auto
    const seq = parseInt(r.tc.replace(/\D/g, ''), 10) || 0;
    const fname = `${r.tc}-${r.method.toLowerCase()}-${slug(r.pathRaw)}.bru`;
    const fp = path.join(BRUNO_DIR, r.provider, fname);
    fs.writeFileSync(fp, emitBru(r, seq, ownBaseVar));
    filemap[r.tc] = fp;
  }
  const manual = rows.filter(r => !r.http);
  return { rows, filemap, manual, hasSession, BRUNO_DIR, TABLE_FILE };
}

// ---------- run ----------
export function flattenReport(json) {
  let items = [];
  const dig = node => {
    if (Array.isArray(node)) { node.forEach(dig); return; }
    if (node && typeof node === 'object') {
      if (node.request || node.response || node.assertionResults || node.runtimeError !== undefined || node.suitename) {
        items.push(node);
      }
      if (Array.isArray(node.results)) node.results.forEach(dig);
      if (Array.isArray(node.iterations)) node.iterations.forEach(dig);
    }
  };
  dig(json);
  return items;
}

export function classify(item) {
  const name = item.suitename || item.test?.filename || item.request?.name || (item.request?.url || '');
  const tcMatch = String(name).match(/TC-\d+/i);
  const tc = tcMatch ? tcMatch[0].toUpperCase() : null;
  const status = item.response?.status ?? '';
  const reasons = [];
  let pass = true;
  let connectionRefused = false;
  if (item.error || item.runtimeError) {
    pass = false;
    const msg = String(item.error || item.runtimeError);
    reasons.push(msg.split('\n')[0].slice(0, 80));
    if (/ECONNREFUSED|connection refused|ENOTFOUND|ETIMEDOUT/i.test(msg)) connectionRefused = true;
  }
  for (const a of (item.assertionResults || [])) {
    if (a.status === 'fail') { pass = false; reasons.push(`assert ${a.lhsExpr} ${a.operator} ${a.rhsExpr}`.slice(0, 80)); }
  }
  for (const t of (item.testResults || [])) {
    if (t.status === 'fail') { pass = false; reasons.push(`test: ${t.description}`.slice(0, 80)); }
  }
  if (!item.assertionResults?.length && !item.testResults?.length && !status && !item.error && !item.runtimeError) {
    pass = false; connectionRefused = true; reasons.push('không có response (connection refused — mock/backend chưa chạy?)');
  }
  return { tc, status, pass, connectionRefused, reason: reasons.join('; ') };
}

// "Môi trường giấy": 100% item connection-refused → không phải kết quả test thật, là env chưa sẵn sàng.
export function derivePending(resultsMap) {
  const entries = Object.values(resultsMap);
  if (!entries.length) return false;
  return entries.every(r => r.connectionRefused);
}

let reportCounter = 0;
function runBru(BRUNO_DIR, target) {
  const reportFile = path.join(BRUNO_DIR, `.bruno-report-${process.pid}-${reportCounter++}.json`);
  const args = ['--yes', '@usebruno/cli', 'run', target, '-r', '--env', ENV, '--reporter-json', reportFile];
  const res = spawnSync('npx', args, { cwd: BRUNO_DIR, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  let items = [];
  if (fs.existsSync(reportFile)) {
    try { items = flattenReport(JSON.parse(fs.readFileSync(reportFile, 'utf8'))); }
    catch { /* parse fail — vẫn xoá file dưới, coi như 0 item */ }
    fs.rmSync(reportFile, { force: true }); // never keep — may contain resolved token/cookie
  }
  return { items, launchErr: res.error, code: res.status, stderr: res.stderr };
}

function ts() {
  const d = new Date();
  const p = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

function writeback(TABLE_FILE, resultsMap, when, pending) {
  let md = fs.readFileSync(TABLE_FILE, 'utf8');
  const lines = md.split('\n');
  let inBlock = false;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('<!-- TC:START -->')) { inBlock = true; continue; }
    if (lines[i].includes('<!-- TC:END -->')) { inBlock = false; continue; }
    if (!inBlock || !lines[i].trim().startsWith('|')) continue;
    const cells = lines[i].split('|');
    const tc = cells[1] && cells[1].trim().toUpperCase();
    if (!tc || !resultsMap[tc]) continue;
    const r = resultsMap[tc];
    const mark = pending ? '⏳ PENDING' : (r.pass ? '✅ PASS' : '❌ FAIL');
    cells[cells.length - 3] = ` ${mark} `;
    cells[cells.length - 2] = ` ${when} `;
    lines[i] = cells.join('|');
  }
  md = lines.join('\n');
  const pass = Object.values(resultsMap).filter(r => r.pass).length;
  const total = Object.values(resultsMap).length;
  const histLine = pending
    ? `- ${when} | ⏳ env chưa sẵn sàng (connection refused toàn bộ ${total} case) — chưa phải kết quả test thật`
    : `- ${when} | ${pass}/${total} pass | ${total - pass} fail | env=${ENV}`;
  const anchor = '## Lịch sử chạy';
  if (md.includes(anchor)) md = md.replace(anchor, `${anchor}\n\n${histLine}`);
  fs.writeFileSync(TABLE_FILE, md);
}

function run() {
  if (ENV === 'prod' && !ALLOW_PROD) {
    console.error('✋ Từ chối chạy --env prod khi thiếu --allow-prod (production thật, có thể tạo data/tốn quota).');
    process.exit(2);
  }
  const { filemap, manual, hasSession, BRUNO_DIR, TABLE_FILE } = gen();
  if (manual.length) console.log(`Bỏ qua khỏi suite auto (multi-step/side-effect, test thủ công): ${manual.map(r => r.tc).join(', ')}`);

  let targets;
  if (TC_FILTER) {
    targets = TC_FILTER.map(tc => filemap[tc]).filter(Boolean).map(fp => path.relative(BRUNO_DIR, fp));
    if (!targets.length) { console.error('Không TC nào khớp --tc'); process.exit(2); }
  } else if (PROVIDER_FILTER) {
    targets = [PROVIDER_FILTER];
  } else {
    targets = hasSession ? ['_setup', ...new Set(Object.values(filemap).map(fp => path.relative(BRUNO_DIR, path.dirname(fp))))] : ['.'];
  }

  const all = [];
  let anyLaunchErr = null, anyStderr = '';
  for (const t of targets) {
    const { items, launchErr, stderr } = runBru(BRUNO_DIR, t);
    if (launchErr) anyLaunchErr = launchErr;
    if (stderr) anyStderr += stderr;
    all.push(...items);
  }
  if (anyLaunchErr) {
    console.error('Không gọi được Bruno CLI qua npx:', anyLaunchErr.message);
    console.error('→ Kiểm tra mạng (npx tải @usebruno/cli lần đầu) hoặc cài: npm i -g @usebruno/cli');
    process.exit(1);
  }
  if (!all.length) {
    console.error('Bruno CLI không trả report nào. stderr:\n' + (anyStderr || '(rỗng)').slice(0, 600));
    process.exit(1);
  }

  const resultsMap = {};
  for (const it of all) {
    const c = classify(it);
    if (c.tc) resultsMap[c.tc] = c;
  }
  const pending = derivePending(resultsMap);
  const when = ts();
  writeback(TABLE_FILE, resultsMap, when, pending);

  const entries = Object.entries(resultsMap).sort();
  let pass = 0;
  console.log(`\n=== api-test (Bruno, env=${ENV}, dir=${DIR_ARG}) ===`);
  if (pending) {
    console.log('⏳ Môi trường chưa sẵn sàng — 100% request connection-refused. Đây KHÔNG phải kết quả test (chưa có backend/mock chạy).');
    for (const [tc] of entries) console.log(`⏳ ${tc}  PENDING`);
    console.log(`\nĐã ghi ⏳ PENDING vào api-tests.md (không ghi đè PASS/FAIL giả).`);
    process.exit(0);
  }
  for (const [tc, r] of entries) {
    if (r.pass) pass++;
    console.log(`${r.pass ? '✅' : '❌'} ${tc}  HTTP ${r.status || '-'}${r.pass ? '' : '  ← ' + r.reason}`);
  }
  console.log(`\n${pass}/${entries.length} pass | ${entries.length - pass} fail`);
  console.log(`Đã ghi kết quả vào api-tests.md (cột Kết quả/Lần chạy + Lịch sử chạy).`);
  process.exit(entries.length - pass);
}

// ---------- main ----------
if (import.meta.url === `file://${process.argv[1]}`) {
  if (mode === 'gen') {
    const { rows, manual, BRUNO_DIR } = gen();
    console.log(`gen: sinh ${rows.length - manual.length} request .bru vào ${path.relative(process.cwd(), BRUNO_DIR)}/`);
    if (manual.length) console.log(`bỏ qua (multi-step/side-effect, chạy thủ công): ${manual.map(r => r.tc).join(', ')}`);
  } else if (mode === 'run') {
    run();
  } else {
    console.error(`mode lạ: ${mode} (dùng 'gen' hoặc 'run')`);
    process.exit(2);
  }
}
