// proto-build.mjs — build prototype, tự sửa lỗi CƠ HỌC, chạy dev, lấy port thật.
//
// Chạy:
//   node .claude/skills/prototype-next/engine/proto-build.mjs            # build + tự sửa
//   node .claude/skills/prototype-next/engine/proto-build.mjs --dev      # build xong chạy dev
//   node .claude/skills/prototype-next/engine/proto-build.mjs --dev-only # bỏ build, chỉ chạy dev
//
// Vì sao có script này: 5 loại lỗi dưới đây là ánh xạ chuỗi-lỗi → hành động cố định.
// Để AI đọc log rồi sửa nghĩa là mỗi vòng nó phải đọc lại code nó vừa viết — đắt và chậm.
// Script sửa được thì AI chỉ cần vào cuộc với lỗi lạ.
//
// ĐIỀU KIỆN DỪNG: lặp tối đa MAX_ROUNDS, NHƯNG dừng sớm khi cùng một lỗi xuất hiện lần 2 —
// đó là dấu hiệu đang sửa sai hướng, lặp tiếp chỉ tốn thêm.
//
// Exit: 0 = build xanh · 1 = còn lỗi (AI phải vào) · 2 = không chạy được.

import { spawnSync, spawn } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const ROOT = 'prototype';
const MAX_ROUNDS = 5;

function die(msg) {
  console.error(msg);
  process.exit(2);
}

function run(cmd, args, opts = {}) {
  return spawnSync(cmd, args, {
    cwd: ROOT,
    encoding: 'utf8',
    shell: false,
    ...opts,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Các bản vá cơ học. Mỗi cái: nhận diện từ log → sửa → mô tả đã làm gì.
// Chỉ đưa vào đây thứ CHẮC CHẮN đúng; nghi ngờ thì để AI xử lý.
// ─────────────────────────────────────────────────────────────────────────────

/** Thiếu "use client" — component dùng hook nhưng chưa khai. */
function fixMissingUseClient(log) {
  const fixed = [];
  const re = /(?:^|\n)[^\n]*?(?:\.\/)?((?:src|app)\/[^\s:)]+\.tsx?)/g;
  const hint =
    /You're importing a component that needs|only works in a Client Component|useState.*Server Component|Server Components/i;
  if (!hint.test(log)) return fixed;

  const files = [...new Set([...log.matchAll(re)].map((m) => m[1]))];
  for (const rel of files) {
    const p = `${ROOT}/${rel}`;
    if (!existsSync(p)) continue;
    const src = readFileSync(p, 'utf8');
    if (/^\s*['"]use client['"]/.test(src)) continue;
    if (!/\buse(State|Effect|Router|Ref|Context|Memo|Callback)\b/.test(src)) continue;
    writeFileSync(p, `'use client'\n\n${src}`);
    fixed.push(`thêm "use client" vào ${rel}`);
  }
  return fixed;
}

/** Thiếu component shadcn — cài đúng cái được báo. */
function fixMissingShadcn(log) {
  const fixed = [];
  const re = /Module not found[^\n]*['"]@\/components\/ui\/([a-z0-9-]+)['"]/gi;
  const comps = [...new Set([...log.matchAll(re)].map((m) => m[1]))];
  if (!comps.length) return fixed;

  const r = run('npx', ['shadcn@latest', 'add', ...comps, '--yes'], { timeout: 180_000 });
  if (r.status === 0) fixed.push(`cài shadcn: ${comps.join(', ')}`);
  else fixed.push(`⚠ thử cài shadcn ${comps.join(', ')} nhưng thất bại — cần xử lý tay`);
  return fixed;
}

/** Thiếu package npm. */
function fixMissingPackage(log) {
  const fixed = [];
  const re = /Module not found[^\n]*['"]((?:@[\w.-]+\/)?[\w.-]+)['"]/gi;
  const pkgs = [...new Set([...log.matchAll(re)].map((m) => m[1]))].filter(
    (p) => !p.startsWith('@/') && !p.startsWith('.') && !p.startsWith('/'),
  );
  if (!pkgs.length) return fixed;

  const r = run('npm', ['install', ...pkgs], { timeout: 300_000 });
  if (r.status === 0) fixed.push(`cài npm: ${pkgs.join(', ')}`);
  else fixed.push(`⚠ thử cài ${pkgs.join(', ')} nhưng thất bại — cần xử lý tay`);
  return fixed;
}

/**
 * params/searchParams truy cập đồng bộ.
 * KHÔNG tự viết lại code — sửa sai chỗ này dễ làm hỏng logic. Chỉ chỉ đúng chỗ cho AI.
 */
function reportSyncParams(log) {
  if (!/(params|searchParams)[^\n]*(should be awaited|synchronous access|is now a Promise)/i.test(log)) {
    return [];
  }
  const files = [...new Set([...log.matchAll(/((?:src|app)\/[^\s:)]+\.tsx?)/g)].map((m) => m[1]))];
  return [
    `⚠ CẦN AI: params/searchParams phải await. File liên quan: ${files.join(', ') || '(xem log)'}`,
  ];
}

const MECHANICAL_FIXES = [fixMissingShadcn, fixMissingPackage, fixMissingUseClient];

// ─────────────────────────────────────────────────────────────────────────────
// Rút gọn log — AI không cần đọc cả nghìn dòng build
// ─────────────────────────────────────────────────────────────────────────────

function digest(log) {
  const lines = log.split('\n');
  const keep = lines.filter((l) =>
    /error|failed|Module not found|Type error|✗|✘|cannot|expected/i.test(l),
  );
  return (keep.length ? keep : lines.slice(-40)).slice(0, 60).join('\n');
}

/** Chữ ký lỗi để phát hiện "sửa mãi không tiến" — bỏ số dòng/đường dẫn biến thiên. */
function signature(log) {
  return digest(log)
    .replace(/:\d+:\d+/g, ':L:C')
    .replace(/\s+/g, ' ')
    .slice(0, 400);
}

// ─────────────────────────────────────────────────────────────────────────────
// Build loop
// ─────────────────────────────────────────────────────────────────────────────

function buildLoop() {
  const seen = new Map();
  const trail = [];

  for (let round = 1; round <= MAX_ROUNDS; round++) {
    const r = run('npm', ['run', 'build'], { timeout: 600_000 });
    const log = `${r.stdout || ''}\n${r.stderr || ''}`;

    if (r.status === 0) {
      console.log(`✓ Build xanh (vòng ${round}).`);
      if (trail.length) {
        console.log('');
        console.log('Engine đã tự sửa:');
        for (const t of trail) console.log(`  · ${t}`);
      }
      return 0;
    }

    const sig = signature(log);
    const count = (seen.get(sig) || 0) + 1;
    seen.set(sig, count);

    // Dừng sớm: cùng lỗi lần 2 → đang sửa sai hướng, lặp tiếp vô ích
    if (count >= 2) {
      console.log(`✗ Build fail — cùng một lỗi lặp lại lần ${count}, dừng để AI vào cuộc.`);
      console.log('');
      console.log('Lỗi còn lại:');
      console.log(digest(log));
      if (trail.length) {
        console.log('');
        console.log('Engine đã thử:');
        for (const t of trail) console.log(`  · ${t}`);
      }
      return 1;
    }

    // Thử các bản vá cơ học
    const applied = [];
    for (const fix of MECHANICAL_FIXES) {
      try {
        applied.push(...fix(log));
      } catch (e) {
        applied.push(`⚠ bản vá lỗi: ${e.message}`);
      }
    }
    const notes = reportSyncParams(log);

    if (!applied.length) {
      console.log(`✗ Build fail (vòng ${round}) — không có bản vá cơ học nào áp được.`);
      console.log('');
      console.log('Lỗi:');
      console.log(digest(log));
      for (const n of notes) console.log(`\n${n}`);
      return 1;
    }

    trail.push(...applied);
    console.log(`· Vòng ${round}: ${applied.join('; ')}`);
  }

  console.log(`✗ Hết ${MAX_ROUNDS} vòng, build vẫn fail — AI phải vào cuộc.`);
  return 1;
}

// ─────────────────────────────────────────────────────────────────────────────
// Dev server — đọc PORT THẬT từ log (next dev tự nhảy cổng khi 3000 bận)
// ─────────────────────────────────────────────────────────────────────────────

function startDev() {
  return new Promise((resolve) => {
    const child = spawn('npm', ['run', 'dev'], {
      cwd: ROOT,
      detached: true,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let done = false;
    const finish = (url) => {
      if (done) return;
      done = true;
      resolve(url);
    };

    const onData = (buf) => {
      const s = buf.toString();
      process.stdout.write(s);
      // Bản Next hiện tại in "- Local:   http://localhost:3000" (có gạch đầu dòng);
      // bản khác in "Local: ..." hoặc "ready on ...". Bắt URL ở đâu cũng được.
      const m = s.match(/https?:\/\/(?:localhost|127\.0\.0\.1|\[::1\]):\d+/i);
      if (m) finish(m[0]);
    };

    child.stdout.on('data', onData);
    child.stderr.on('data', onData);
    child.unref();

    setTimeout(() => finish(null), 90_000);
  });
}

// ─────────────────────────────────────────────────────────────────────────────

async function main() {
  if (!existsSync(ROOT)) die(`PROTO-ERROR: không thấy \`${ROOT}/\` — chạy từ gốc repo.`);
  const argv = process.argv.slice(2);
  const devOnly = argv.includes('--dev-only');
  const wantDev = argv.includes('--dev') || devOnly;

  console.log('# proto-build');
  console.log('');

  if (!devOnly) {
    const code = buildLoop();
    if (code !== 0) process.exit(code);
    // KHÔNG chạy `tsc --noEmit` — `next build` đã type-check, chạy lại là gate lặp.
  }

  if (!wantDev) return;

  console.log('');
  console.log('Đang khởi động dev server...');
  const url = await startDev();
  console.log('');
  if (url) {
    console.log(`✓ Đang chạy tại: ${url}`);
    console.log('PROTO_URL=' + url);   // dòng máy đọc — smoke-test lấy URL từ đây
  } else {
    console.log('⚠ Không đọc được URL từ log dev sau 90 giây — kiểm tra log phía trên.');
    process.exit(1);
  }
}

main();
