// design-audit.mjs — soát "trôi giao diện" (design drift) trong màn hình đã sinh.
//
// Chạy: node .claude/skills/prototype-next/engine/design-audit.mjs [--json]
//
// VẤN ĐỀ NÓ GIẢI: AI vẽ màn thứ 12 không nhớ quyết định ở màn thứ 1. Nhắc trong prompt
// không đủ — phải CHẶN BẰNG MÁY. Mỗi luật ở đây sinh ra từ một kiểu trôi có thật.
//
// PHẠM VI (quan trọng): chỉ soi code MÀN HÌNH (src/app, src/features).
// MIỄN `src/components/ui` — shadcn dùng `data-[slot=…]`, `has-[>svg]`, `grid-cols-[1fr_auto]`
// một cách chính đáng; soi vào đó sẽ ra một rừng báo động giả, và luật bị tắt trong một ngày.
//
// Ngoại lệ chính đáng khai trong `prototype/design-audit.allow.json` — để nó tường minh
// và có người duyệt, thay vì âm thầm bỏ qua.
//
// Exit: 0 = sạch · 1 = còn vi phạm · 2 = không chạy được.

import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = 'prototype';
const SCAN = ['src/app', 'src/features'];
const EXEMPT = ['src/components/ui'];
const ALLOW_FILE = join(ROOT, 'design-audit.allow.json');

// Tiền tố biến thể mang tính CẤU TRÚC — `data-[state=open]` là selector, không phải trôi màu.
const STRUCTURAL = /^(data|has|group|group-data|group-has|peer|peer-data|aria|not-aria|in-data|supports|dark|hover|focus|focus-visible|active|disabled)-\[/;

function die(msg) {
  console.error(msg);
  process.exit(2);
}

function walk(dir, acc = []) {
  if (!existsSync(dir)) return acc;
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, acc);
    else if (/\.(tsx|ts)$/.test(p)) acc.push(p);
  }
  return acc;
}

function loadAllow() {
  if (!existsSync(ALLOW_FILE)) return { values: [], files: [] };
  try {
    const a = JSON.parse(readFileSync(ALLOW_FILE, 'utf8'));
    return { values: a.values || [], files: a.files || [] };
  } catch {
    return { values: [], files: [] };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Các luật. Mỗi cái trả về mảng {rule, file, line, snippet, hint}.
// ─────────────────────────────────────────────────────────────────────────────

/** Giá trị tự chế: `max-w-[880px]`, `ring-[3px]` — mỗi cái là một quyết định lệch khỏi hệ. */
function ruleArbitrary(file, lines) {
  const out = [];
  lines.forEach((line, i) => {
    for (const m of line.matchAll(/\b([a-z][\w-]*)-\[([^\]]+)\]/g)) {
      const full = `${m[1]}-[${m[2]}]`;
      if (STRUCTURAL.test(full)) continue;
      // color-mix / var(...) trong chuỗi class là cách dùng token hợp lệ
      if (/^(var|color-mix|calc)\(/.test(m[2])) continue;
      out.push({
        rule: 'giá-trị-tự-chế',
        file, line: i + 1, snippet: full,
        hint: /^max-w|^w-|^min-w/.test(m[1])
          ? 'Bề rộng trang do <Screen width="..."> quyết định, màn không tự đặt.'
          : 'Thêm token vào globals.css rồi dùng token, đừng đặt số trực tiếp.',
      });
    }
  });
  return out;
}

/** Mã màu thô trong màn — bảng màu phải sống ở globals.css. */
function ruleRawHex(file, lines) {
  const out = [];
  lines.forEach((line, i) => {
    for (const m of line.matchAll(/#[0-9a-fA-F]{6}\b/g)) {
      out.push({
        rule: 'mã-màu-thô',
        file, line: i + 1, snippet: m[0],
        hint: 'Khai màu trong globals.css rồi dùng qua token (bg-primary...).',
      });
    }
  });
  return out;
}

/** style={{...}} — đường lách vạn năng, dùng một lần là hệ token mất tác dụng. */
function ruleInlineStyle(file, lines) {
  const out = [];
  lines.forEach((line, i) => {
    if (/style=\{\{/.test(line)) {
      out.push({
        rule: 'style-nội-tuyến',
        file, line: i + 1, snippet: line.trim().slice(0, 70),
        hint: 'Dùng class + token. Cần giá trị động thì đặt qua biến CSS.',
      });
    }
  });
  return out;
}

/** Thẻ form thô ngoài components/ui — dấu hiệu dựng lại component đã có. */
function ruleRawPrimitive(file, lines) {
  const out = [];
  lines.forEach((line, i) => {
    for (const m of line.matchAll(/<(button|input|select|textarea)[\s>]/g)) {
      out.push({
        rule: 'dựng-lại-component',
        file, line: i + 1, snippet: `<${m[1]}>`,
        hint: `Đã có sẵn trong components/ui — dùng lại, đừng viết <${m[1]}> thô.`,
      });
    }
  });
  return out;
}

const RULES = [ruleArbitrary, ruleRawHex, ruleInlineStyle, ruleRawPrimitive];

// ─────────────────────────────────────────────────────────────────────────────

function main() {
  if (!existsSync(ROOT)) die(`PROTO-ERROR: không thấy \`${ROOT}/\` — chạy từ gốc repo.`);
  const jsonOut = process.argv.includes('--json');
  const allow = loadAllow();

  const files = SCAN.flatMap((d) => walk(join(ROOT, d))).filter(
    (f) => !EXEMPT.some((e) => f.includes(e)),
  );

  let findings = [];
  for (const f of files) {
    const rel = relative(ROOT, f);
    if (allow.files.includes(rel)) continue;
    const lines = readFileSync(f, 'utf8').split('\n');
    for (const rule of RULES) findings.push(...rule(rel, lines));
  }
  findings = findings.filter((v) => !allow.values.includes(v.snippet));

  // Giá trị giống nhau ở NHIỀU file = dấu hiệu rõ nhất: màn sau nghĩ lại thứ màn trước đã có.
  const byValue = {};
  for (const v of findings) {
    if (v.rule !== 'giá-trị-tự-chế') continue;
    (byValue[v.snippet] ||= new Set()).add(v.file);
  }
  const duplicated = Object.entries(byValue)
    .filter(([, s]) => s.size > 1)
    .map(([val, s]) => ({ value: val, files: [...s] }));

  if (jsonOut) {
    console.log(JSON.stringify({ findings, duplicated, scanned: files.length }, null, 2));
    process.exit(findings.length ? 1 : 0);
  }

  const L = [];
  L.push('# design-audit');
  L.push('');
  L.push(`Đã soát ${files.length} file màn hình (miễn \`components/ui\` — biến thể cấu trúc của shadcn không phải trôi).`);
  L.push('');

  if (!findings.length) {
    L.push('✓ Không thấy trôi giao diện.');
    console.log(L.join('\n'));
    return;
  }

  const byRule = {};
  for (const v of findings) (byRule[v.rule] ||= []).push(v);

  for (const [rule, list] of Object.entries(byRule)) {
    L.push(`## ${rule} — ${list.length}`);
    L.push('');
    for (const v of list.slice(0, 15)) {
      L.push(`- \`${v.file}:${v.line}\` → \`${v.snippet}\``);
    }
    if (list.length > 15) L.push(`- _(còn ${list.length - 15} chỗ nữa)_`);
    L.push('');
    L.push(`→ ${list[0].hint}`);
    L.push('');
  }

  if (duplicated.length) {
    L.push('## ⚠ Cùng một giá trị lặp ở nhiều file');
    L.push('');
    L.push('Đây là dấu hiệu rõ nhất của trôi giao diện: màn viết sau đã nghĩ lại một con số mà màn trước có rồi.');
    L.push('');
    for (const d of duplicated) L.push(`- \`${d.value}\` — ${d.files.join(', ')}`);
    L.push('');
    L.push('→ Đưa lên thành token hoặc một biến thể của `<Screen>`.');
    L.push('');
  }

  L.push('---');
  L.push('');
  L.push(`✗ Còn ${findings.length} chỗ cần sửa — **chưa được báo là xong**.`);
  L.push('');
  L.push('Ngoại lệ chính đáng (ví dụ màu thương hiệu của bên thứ ba trong ảnh SVG) thì khai vào');
  L.push(`\`${ALLOW_FILE}\`: \`{ "values": ["#4285F4"], "files": [] }\` — để nó tường minh, có người duyệt.`);

  console.log(L.join('\n'));
  process.exit(1);
}

main();
