// gen-design-context.mjs — sinh DESIGN-CONTEXT.md TỪ CHÍNH CODE, mỗi lần chạy skill.
//
// Chạy: node .claude/skills/prototype-next/engine/gen-design-context.mjs [--out <path>]
//
// VẤN ĐỀ NÓ GIẢI: AI vẽ màn thứ 12 không còn nhớ quyết định ở màn thứ 1 → tự đặt
// bề rộng mới, viết hex thô, dựng lại component đã có. Đo thật trên repo này
// (2026-08-01): `max-w-[880px]` lặp ở 2 file + 3 bề rộng container khác nhau.
//
// VÌ SAO PHẢI TỰ SINH, KHÔNG VIẾT TAY: bản kiểm kê viết tay chắc chắn sẽ cũ đi, và
// cũ thì TỆ HƠN không có — vì AI tin nó. Sinh từ code thì luôn khớp code.
//
// Output: prototype/DESIGN-CONTEXT.md — skill BẮT BUỘC đọc trước khi viết màn.
//
// Exit: 0 = ok · 2 = không chạy được.

import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = 'prototype';
const SRC = join(ROOT, 'src');

function die(msg) {
  console.error(msg);
  process.exit(2);
}

function walk(dir, filter = () => true, acc = []) {
  if (!existsSync(dir)) return acc;
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walk(p, filter, acc);
    else if (filter(p)) acc.push(p);
  }
  return acc;
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. Token hợp lệ — đọc @theme inline trong globals.css
//    Đây là DANH SÁCH ĐÓNG: token không có ở đây thì không được dùng.
// ─────────────────────────────────────────────────────────────────────────────

function readTokens() {
  const css = join(SRC, 'app/globals.css');
  if (!existsSync(css)) return { colors: [], radii: [], fonts: [], raw: [] };
  const text = readFileSync(css, 'utf8');

  const themeBlock = text.match(/@theme\s+inline\s*\{([\s\S]*?)\n\}/);
  const body = themeBlock ? themeBlock[1] : '';

  const names = [...body.matchAll(/--([\w-]+)\s*:/g)].map((m) => m[1]);
  const colors = names.filter((n) => n.startsWith('color-')).map((n) => n.replace(/^color-/, ''));
  const radii = names.filter((n) => n.startsWith('radius-')).map((n) => n.replace(/^radius-/, ''));
  const fonts = names.filter((n) => n.startsWith('font-')).map((n) => n.replace(/^font-/, ''));

  // Lớp raw palette (:root) — CHỈ để lớp semantic trỏ vào, component KHÔNG dùng trực tiếp
  const rootBlock = text.match(/:root\s*\{([\s\S]*?)\n\}/);
  const raw = rootBlock
    ? [...rootBlock[1].matchAll(/--([\w-]+)\s*:\s*(#[0-9a-fA-F]{3,8}|[^;]+);/g)].map((m) => ({
        name: m[1],
        value: m[2].trim(),
      }))
    : [];

  return { colors, radii, fonts, raw };
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. Component đã có + variant hợp lệ — bóc từ CVA trong source
//    Bóc bằng máy để AI không tự nghĩ ra variant không tồn tại (size="large"...).
// ─────────────────────────────────────────────────────────────────────────────

function readComponents() {
  const dirs = [join(SRC, 'components/ui'), join(SRC, 'components/layout')];
  const out = [];
  for (const dir of dirs) {
    for (const f of walk(dir, (p) => p.endsWith('.tsx'))) {
      const text = readFileSync(f, 'utf8');
      const name = f.split('/').pop().replace('.tsx', '');

      // shadcn export theo 2 kiểu: `export function X` và `function X ... export { X, Y }`
      const exports = new Set(
        [...text.matchAll(/export\s+(?:default\s+)?(?:function|const)\s+([A-Z][\w]*)/g)].map((m) => m[1]),
      );
      for (const block of text.matchAll(/export\s*\{([^}]+)\}/g)) {
        for (const raw of block[1].split(',')) {
          const nm = raw.trim().split(/\s+as\s+/).pop().trim();
          if (/^[A-Z][\w]*$/.test(nm)) exports.add(nm);
        }
      }

      // variant trong cva({ variants: { variant: {...}, size: {...} } })
      const variants = {};
      const vBlock = text.match(/variants\s*:\s*\{([\s\S]*?)\n\s*\},?\s*\n\s*(?:defaultVariants|compoundVariants|\})/);
      if (vBlock) {
        for (const group of vBlock[1].matchAll(/^\s{4,6}(\w+)\s*:\s*\{([\s\S]*?)\n\s{4,6}\}/gm)) {
          const keys = [...group[2].matchAll(/^\s*["']?([\w-]+)["']?\s*:/gm)]
            .map((m) => m[1])
            // Loại tiền tố biến thể Tailwind lọt vào khi chuỗi class xuống dòng
            // ("hover:", "dark:", "focus-visible:") — chúng KHÔNG phải tên variant.
            .filter((k) => !/^(hover|focus|focus-visible|active|dark|group|peer|aria|data|disabled|sm|md|lg|xl)$/.test(k));
          if (keys.length) variants[group[1]] = [...new Set(keys)];
        }
      }

      const acceptsClassName = /className\??\s*[,:}]/.test(text);

      out.push({
        file: relative(ROOT, f),
        name,
        exports: [...new Set(exports)],
        variants,
        acceptsClassName,
      });
    }
  }
  return out.sort((a, b) => a.name.localeCompare(b.name));
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. Màn đã dựng — route thật trong app/
// ─────────────────────────────────────────────────────────────────────────────

function readScreens() {
  const appDir = join(SRC, 'app');
  const pages = walk(appDir, (p) => /\/page\.tsx$/.test(p));
  return pages
    .map((f) => {
      const route =
        '/' +
        relative(appDir, f)
          .replace(/\/page\.tsx$/, '')
          .replace(/\(([^)]+)\)\//g, '')   // route group không vào URL
          .replace(/^page\.tsx$/, '');
      const text = readFileSync(f, 'utf8');
      return {
        route: route === '/' ? '/' : route.replace(/\/$/, ''),
        file: relative(ROOT, f),
        usesScreen: /<Screen[\s>]/.test(text),
      };
    })
    .sort((a, b) => a.route.localeCompare(b.route));
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. Khuôn mẫu đang dùng — để màn mới bắt chước màn cũ, không tự nghĩ kiểu mới
// ─────────────────────────────────────────────────────────────────────────────

function readPatterns() {
  const files = walk(join(SRC, 'app'), (p) => p.endsWith('.tsx')).concat(
    walk(join(SRC, 'features'), (p) => p.endsWith('.tsx')),
  );
  const spacing = {};
  const widths = {};
  for (const f of files) {
    const text = readFileSync(f, 'utf8');
    for (const m of text.matchAll(/\b(space-y-\d+|gap-\d+|p[xy]?-\d+)\b/g)) {
      spacing[m[1]] = (spacing[m[1]] || 0) + 1;
    }
    for (const m of text.matchAll(/\bmax-w-\[([^\]]+)\]/g)) {
      (widths[m[1]] ||= []).push(relative(ROOT, f));
    }
  }
  return {
    topSpacing: Object.entries(spacing).sort((a, b) => b[1] - a[1]).slice(0, 10),
    hardcodedWidths: Object.entries(widths),
  };
}

// ─────────────────────────────────────────────────────────────────────────────

// Khổ màn hình — theo ba-conventions.md Mục 7. Người dùng CHỌN, skill không tự đoán.
const DEVICES = {
  mobile: { key: 'mobile', label: 'Điện thoại', width: '375px' },
  tablet: { key: 'tablet', label: 'Máy tính bảng', width: '768px' },
  desktop: { key: 'desktop', label: 'Máy tính để bàn', width: '1024px' },
  responsive: { key: 'responsive', label: 'Co giãn theo màn hình', width: 'nhiều mốc' },
};

/** Khổ đã chốt lưu trong manifest — sinh lại context không làm mất lựa chọn của người dùng. */
function readDevice(explicit) {
  if (explicit && DEVICES[explicit]) return DEVICES[explicit];
  const mf = join(ROOT, '.demo-manifest.json');
  if (existsSync(mf)) {
    try {
      const m = JSON.parse(readFileSync(mf, 'utf8'));
      if (m.device && DEVICES[m.device]) return DEVICES[m.device];
    } catch {}
  }
  return null;
}

function main() {
  if (!existsSync(ROOT)) die(`PROTO-ERROR: không thấy \`${ROOT}/\` — chạy từ gốc repo.`);
  const argv = process.argv.slice(2);
  const outIdx = argv.indexOf('--out');
  const out = outIdx >= 0 ? argv[outIdx + 1] : join(ROOT, 'DESIGN-CONTEXT.md');
  const devIdx = argv.indexOf('--device');
  const device = readDevice(devIdx >= 0 ? argv[devIdx + 1] : null);

  const tokens = readTokens();
  const components = readComponents();
  const screens = readScreens();
  const patterns = readPatterns();

  const L = [];
  L.push('<!-- FILE NÀY TỰ SINH bởi gen-design-context.mjs — KHÔNG sửa tay.');
  L.push('     Sinh lại mỗi lần chạy /prototype-next, nên luôn khớp code thật. -->');
  L.push('');
  L.push('# Ràng buộc giao diện — đọc TRƯỚC khi viết bất kỳ màn nào');
  L.push('');
  L.push('> Đây là **danh sách đóng**. Cần thứ không có ở đây thì **DỪNG và hỏi** —');
  L.push('> không tự thêm màu, không tự đặt bề rộng, không dựng lại component đã có.');
  L.push('');

  // ── Token ──
  L.push('## 1. Màu được phép dùng');
  L.push('');
  L.push('Dùng qua tiện ích Tailwind (`bg-primary`, `text-muted-foreground`...). Danh sách đầy đủ:');
  L.push('');
  if (tokens.colors.length) {
    L.push(tokens.colors.map((c) => `\`${c}\``).join(' · '));
  } else {
    L.push('⚠ **Chưa đọc được màu nào** từ `@theme inline` trong `globals.css`.');
    L.push('');
    L.push('Dự án chưa có bộ màu riêng → dùng bộ mặc định trung tính của shadcn, và **nói rõ điều này**');
    L.push('với người dùng thay vì tự chế bảng màu. Có tài liệu thiết kế riêng thì đổ vào `globals.css` trước.');
  }
  L.push('');
  L.push('**CẤM viết mã màu thô** (`#fcd535`, `rgb(...)`) trong màn hình. Bảng màu gốc nằm ở `:root` của `globals.css` và chỉ để lớp ngữ nghĩa trỏ vào.');
  if (tokens.raw.length) {
    L.push('');
    L.push(`<details><summary>Bảng màu gốc (${tokens.raw.length} giá trị — chỉ tham khảo, không dùng trực tiếp)</summary>`);
    L.push('');
    for (const r of tokens.raw.slice(0, 40)) L.push(`- \`--${r.name}\`: ${r.value}`);
    L.push('');
    L.push('</details>');
  }
  L.push('');

  L.push('## 2. Bo góc & phông chữ');
  L.push('');
  L.push(`- Bo góc: ${tokens.radii.map((r) => `\`rounded-${r}\``).join(' · ') || '_(không có)_'}`);
  L.push(`- Phông: ${tokens.fonts.map((f) => `\`font-${f}\``).join(' · ') || '_(không có)_'}`);
  L.push('');

  // ── Component ──
  L.push('## 3. Component đã có — dùng lại, ĐỪNG viết mới');
  L.push('');
  L.push('| Component | Export | Variant hợp lệ | File |');
  L.push('| --- | --- | --- | --- |');
  for (const c of components) {
    const vs = Object.entries(c.variants)
      .map(([k, v]) => `${k}: ${v.join('/')}`)
      .join(' · ');
    L.push(`| ${c.name} | ${c.exports.join(', ') || '—'} | ${vs || '—'} | \`${c.file}\` |`);
  }
  L.push('');
  L.push('Variant KHÔNG có trong bảng thì **không tồn tại** — đừng đoán.');
  L.push('');
  L.push('Cần một component chưa có → `npx shadcn@latest add <tên>` trước, đừng viết `<button>`/`<input>` thô.');
  L.push('');

  // ── Bố cục ──
  const hasScreen = components.some((c) => c.name === 'screen' || c.exports.includes('Screen'));
  L.push('## 4. Bố cục trang');
  L.push('');
  if (device) {
    L.push(`**Khổ màn hình đã chốt: ${device.label}** (\`${device.key}\`, bề rộng khung ${device.width}).`);
    L.push('');
    L.push('Mọi màn dựng theo đúng khổ này. Đổi khổ là quyết định của người dùng, không phải suy đoán —');
    L.push('muốn đổi thì chạy lại skill và chọn lại.');
    L.push('');
  }
  if (hasScreen) {
    L.push('Mọi màn PHẢI bọc trong `<Screen>`. Thẻ này sở hữu bề rộng + khoảng cách dọc —');
    L.push('màn hình **không được tự đặt** `max-w-*`, `mx-auto`, `px-*`, `py-*` ở cấp trang.');
    L.push('');
    L.push('`<Screen>` **không nhận `className`** — đó là chủ ý, để không có đường lách.');
  } else {
    L.push('⚠ Chưa có thẻ `<Screen>`. Mỗi màn đang tự đặt bề rộng riêng — đây là nguồn gốc của việc');
    L.push('màn thứ 12 trông khác màn thứ 1. Nên dựng `src/components/layout/screen.tsx` trước.');
  }
  if (patterns.hardcodedWidths.length) {
    L.push('');
    L.push('**Bề rộng đang bị đặt cứng trong màn (cần dọn):**');
    L.push('');
    for (const [w, files] of patterns.hardcodedWidths) {
      const dup = files.length > 1 ? ` ← **lặp ở ${files.length} file**` : '';
      L.push(`- \`max-w-[${w}]\` — ${files.join(', ')}${dup}`);
    }
  }
  L.push('');
  L.push('**Khoảng cách đang dùng nhiều nhất** (bám theo, đừng chế thang mới):');
  L.push('');
  L.push(patterns.topSpacing.map(([k, n]) => `\`${k}\` (${n})`).join(' · ') || '_(chưa có)_');
  L.push('');

  // ── Màn đã dựng ──
  L.push('## 5. Màn đã dựng');
  L.push('');
  if (!screens.length) {
    L.push('_(chưa có màn nào)_');
  } else {
    L.push('| Địa chỉ | Dùng `<Screen>` | File |');
    L.push('| --- | :---: | --- |');
    for (const s of screens) {
      L.push(`| \`${s.route}\` | ${s.usesScreen ? '✓' : '—'} | \`${s.file}\` |`);
    }
    L.push('');
    L.push('Màn mới phải trông **cùng một hệ** với các màn trên: cùng thang khoảng cách, cùng kiểu tiêu đề, cùng cách hiện lỗi và trạng thái rỗng.');
  }
  L.push('');

  L.push('---');
  L.push('');
  L.push('Sau khi viết xong màn, chạy `node .claude/skills/prototype-next/engine/design-audit.mjs`.');
  L.push('Còn lỗi thì **chưa xong** — sửa, đừng bỏ qua.');

  writeFileSync(out, L.join('\n'));

  console.log('# gen-design-context');
  console.log('');
  console.log(`Đã ghi ${out}`);
  console.log('');
  console.log(`- Màu hợp lệ: ${tokens.colors.length}`);
  console.log(`- Component đã có: ${components.length}`);
  console.log(`- Màn đã dựng: ${screens.length}${screens.length ? ` (dùng <Screen>: ${screens.filter((s) => s.usesScreen).length})` : ''}`);
  if (patterns.hardcodedWidths.length) {
    const dups = patterns.hardcodedWidths.filter(([, f]) => f.length > 1);
    console.log(`- ⚠ Bề rộng đặt cứng: ${patterns.hardcodedWidths.length}${dups.length ? ` (${dups.length} giá trị bị lặp ở nhiều file)` : ''}`);
  }
}

main();
