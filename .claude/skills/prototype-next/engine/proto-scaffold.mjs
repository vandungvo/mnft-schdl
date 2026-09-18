// proto-scaffold.mjs — chép boilerplate không phụ thuộc nghiệp vụ vào prototype/.
//
// Chạy: node .claude/skills/prototype-next/engine/proto-scaffold.mjs \
//         [--app-name "Tên app"] [--device mobile|tablet|desktop|responsive] [--force]
//
// Mục đích: những file dưới đây GIỐNG NHAU ở mọi feature, mọi dự án — không có lý do gì
// để AI đọc rồi gõ lại từng dòng. Script chép thẳng.
//
// Mặc định KHÔNG ghi đè file đã có (giữ tùy biến của lần chạy trước). Dùng --force để ép.
//
// Exit: 0 = ok · 2 = không chạy được.

import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const TPL = join(HERE, 'templates');
const ROOT = 'prototype';

// template → đích trong prototype/
const MAP = {
  'hydration-gate.tsx': 'src/components/demo/hydration-gate.tsx',
  'auth-guard.tsx': 'src/components/demo/auth-guard.tsx',
  'demo-toolbar.tsx': 'src/components/demo/demo-toolbar.tsx',
  'simulate.ts': 'src/lib/demo/simulate.ts',
  'settings-store.ts': 'src/lib/demo/settings-store.ts',
  'screen.tsx': 'src/components/layout/screen.tsx',
};

// `(auth)/layout.tsx` CỐ Ý không nằm trong MAP.
// Lý do (gặp thật 2026-08-01): nhiều prototype đã có sẵn vỏ riêng cho nhóm màn đăng nhập
// (một component `AuthShell` mà từng trang tự bọc). Chép thêm một layout nữa vào route group
// sẽ tạo vỏ lồng vỏ — hai lớp căn giữa, hai lần đặt bề rộng. Vỏ nhóm màn phụ thuộc vào cách
// dự án tổ chức, nên để skill quyết theo từng trường hợp, không chép mù.

// Khổ màn hình → bề rộng bố cục (ba-conventions.md Mục 7).
// Người dùng CHỌN khổ; skill không tự đoán.
const DEVICE_LAYOUT = {
  mobile: {
    label: 'Điện thoại 375',
    form: '100%', content: '375px', wide: '375px',
    note: 'Khổ điện thoại: mọi thứ một cột, biểu mẫu trải hết bề ngang khung.',
  },
  tablet: {
    label: 'Máy tính bảng 768',
    form: '26rem', content: '768px', wide: '768px',
    note: 'Khổ máy tính bảng.',
  },
  desktop: {
    label: 'Máy tính để bàn 1024',
    form: '26rem', content: '880px', wide: '1280px',
    note: 'Khổ để bàn: biểu mẫu nằm trong hộp hẹp căn giữa, không trải hết bề ngang.',
  },
  responsive: {
    label: 'Co giãn theo màn hình',
    form: 'min(26rem, 100%)', content: 'min(880px, 100%)', wide: 'min(1280px, 100%)',
    note: 'Co giãn: bề rộng lấy giá trị nhỏ hơn giữa mốc thiết kế và bề ngang thực tế.',
  },
};

function die(msg) {
  console.error(msg);
  process.exit(2);
}

/** Chèn/cập nhật bề rộng bố cục trong globals.css theo khổ đã chọn. */
function applyLayoutTokens(device) {
  const css = join(ROOT, 'src/app/globals.css');
  if (!existsSync(css)) return '⚠ không thấy globals.css — bỏ qua bề rộng bố cục';

  const d = DEVICE_LAYOUT[device];
  const block = [
    '/* Bề rộng bố cục — theo khổ màn hình đã chốt. <Screen> đọc các biến này,',
    `   nên đổi khổ chỉ cần sửa ở đây. ${d.note} */`,
    `:root {`,
    `  --layout-device: "${device}";`,
    `  --layout-form: ${d.form};`,
    `  --layout-content: ${d.content};`,
    `  --layout-wide: ${d.wide};`,
    `}`,
  ].join('\n');

  let text = readFileSync(css, 'utf8');
  const marker = /\/\* Bề rộng bố cục[\s\S]*?\n\}\n/;
  if (marker.test(text)) {
    text = text.replace(marker, block + '\n');
    writeFileSync(css, text);
    return `cập nhật bề rộng bố cục → ${d.label}`;
  }
  writeFileSync(css, `${text.trimEnd()}\n\n${block}\n`);
  return `thêm bề rộng bố cục → ${d.label}`;
}

/** Ghi khổ đã chọn vào manifest để lần chạy sau không hỏi lại. */
function saveDevice(device) {
  const mf = join(ROOT, '.demo-manifest.json');
  let m = {};
  if (existsSync(mf)) {
    try { m = JSON.parse(readFileSync(mf, 'utf8')); } catch {}
  }
  m.device = device;
  writeFileSync(mf, JSON.stringify(m, null, 2));
}

function main() {
  const argv = process.argv.slice(2);
  const force = argv.includes('--force');
  const nameIdx = argv.indexOf('--app-name');
  const appName = nameIdx >= 0 ? argv[nameIdx + 1] : 'Prototype';
  const devIdx = argv.indexOf('--device');
  const device = devIdx >= 0 ? argv[devIdx + 1] : null;

  if (!existsSync(ROOT)) die(`PROTO-ERROR: không thấy thư mục \`${ROOT}/\` — chạy từ gốc repo.`);
  if (!existsSync(TPL)) die(`PROTO-ERROR: không thấy templates tại ${TPL}`);
  if (device && !DEVICE_LAYOUT[device]) {
    die(
      `PROTO-ERROR: khổ màn hình \`${device}\` không hợp lệ.\n` +
        `Chọn một trong: ${Object.keys(DEVICE_LAYOUT).join(' · ')}\n` +
        `Đây là quyết định của người dùng (ba-conventions.md Mục 7) — hỏi rồi truyền --device.`,
    );
  }

  const written = [];
  const skipped = [];

  for (const [tpl, dest] of Object.entries(MAP)) {
    const src = join(TPL, tpl);
    if (!existsSync(src)) {
      console.error(`⚠ thiếu template ${tpl} — bỏ qua`);
      continue;
    }
    const target = join(ROOT, dest);
    if (existsSync(target) && !force) {
      skipped.push(dest);
      continue;
    }
    mkdirSync(dirname(target), { recursive: true });
    const content = readFileSync(src, 'utf8').replaceAll('{{APP_NAME}}', appName);
    writeFileSync(target, content);
    written.push(dest);
  }

  let layoutNote = null;
  if (device) {
    layoutNote = applyLayoutTokens(device);
    saveDevice(device);
  }

  console.log('# proto-scaffold');
  console.log('');
  if (layoutNote) {
    console.log(`Khổ màn hình: ${layoutNote}`);
    console.log('');
  } else {
    console.log('⚠ Chưa truyền `--device` — <Screen> sẽ không có bề rộng để đọc.');
    console.log('  Hỏi người dùng chọn khổ (điện thoại / máy tính bảng / để bàn / co giãn) rồi chạy lại.');
    console.log('');
  }
  if (written.length) {
    console.log(`Đã tạo ${written.length} file:`);
    for (const f of written) console.log(`  + ${f}`);
  }
  if (skipped.length) {
    console.log('');
    console.log(`Giữ nguyên ${skipped.length} file đã có (dùng --force để ghi đè):`);
    for (const f of skipped) console.log(`  = ${f}`);
  }
  console.log('');
  console.log('Còn lại do skill viết (phụ thuộc nghiệp vụ): store.ts · rules.ts · seed.ts · demo-catalog.ts · các màn hình.');
}

main();
