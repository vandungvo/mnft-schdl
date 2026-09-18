#!/usr/bin/env node
/*
 * erd-consistency.mjs — Đối chiếu CÙNG một data model giữa 3 renderer của họ ERD:
 *   srs/{feature}-erd.md      (Mermaid — CANONICAL, theo d2-erd/SKILL.md + dbdiagram/SKILL.md)
 *   d2-erd/{feature}.d2       (D2)
 *   dbdiagram/{feature}.dbml  (DBML)
 *
 * VÌ SAO CẦN: mỗi file tự nó hợp lệ, compiler nào cũng PASS — nên linter ĐƠN-FILE không thể
 * thấy việc chúng mô tả 2 data model KHÁC nhau. Đo thật (2026-07-26):
 *   premium-payment-erd.md:15   `USER ||--o{ PAYMENT_METHOD : "lưu"`
 *   premium-payment.d2:69       chỉ có CUSTOMER -> PAYMENT_METHOD   ⇒ mất 1 quan hệ
 * Canonical đã được khai trong skill (`đọc srs/{feature}-erd.md làm nguồn`), nên lệch = lỗi
 * TUÂN THỦ canonical, và kiểm được bằng máy.
 *
 * Dùng: node .claude/scripts/erd-consistency.mjs --feature premium-payment
 *       node .claude/scripts/erd-consistency.mjs --feature X --strict   (lệch → exit 1)
 *
 * Mặc định exit 0 kèm cảnh báo (vì D2/DBML có thể cố ý gộp/bỏ entity kỹ thuật);
 * --strict dùng khi muốn chặn cứng trong pipeline.
 */

import fs from 'node:fs';

const argv = process.argv.slice(2);
const flag = n => { const i = argv.indexOf('--' + n); return i >= 0 ? argv[i + 1] : null; };
const FEATURE = flag('feature');
const STRICT = argv.includes('--strict');
if (!FEATURE) { console.error('Thiếu --feature <slug>'); process.exit(2); }

const P = {
  mermaid: `docs/${FEATURE}/srs/${FEATURE}-erd.md`,
  d2: `docs/${FEATURE}/d2-erd/${FEATURE}.d2`,
  dbml: `docs/${FEATURE}/dbdiagram/${FEATURE}.dbml`,
};

const norm = s => String(s).toLowerCase().replace(/[^a-z0-9]/g, '');
const pair = (a, b) => [norm(a), norm(b)].sort().join('~');

// ---- Mermaid (canonical) ----
function parseMermaid(file) {
  const txt = fs.readFileSync(file, 'utf8');
  const block = (txt.split('```mermaid')[1] || '').split('```')[0];
  const lines = block.split('\n').map(l => l.trim()).filter(Boolean);
  const entities = new Set(), rels = new Set(), relList = [];
  let depth = 0;
  for (const l of lines) {
    if (depth > 0) { if (l === '}') depth--; continue; }
    let m = l.match(/^([A-Za-z_]\w*)\s*\{$/);
    if (m) { entities.add(m[1]); depth++; continue; }
    m = l.match(/^([A-Za-z_]\w*)\s+([|}o][|o{}-]*[|{o])\s+([A-Za-z_]\w*)\s*:/);
    if (m) { entities.add(m[1]); entities.add(m[3]); rels.add(pair(m[1], m[3])); relList.push(`${m[1]} ${m[2]} ${m[3]}`); }
  }
  return { entities, rels, relList };
}

// ---- D2 ----
function parseD2(file) {
  const txt = fs.readFileSync(file, 'utf8');
  const entities = new Set(), rels = new Set(), relList = [];
  for (const raw of txt.split('\n')) {
    const l = raw.trim();
    if (!l || l.startsWith('#')) continue;
    let m = l.match(/^([A-Za-z_]\w*)\s*:\s*\{/);          // khai bảng
    if (m) { entities.add(m[1]); continue; }
    m = l.match(/^([A-Za-z_]\w*)\.\w+\s*->\s*([A-Za-z_]\w*)\.\w+/);   // quan hệ PK->FK
    if (m) { rels.add(pair(m[1], m[2])); relList.push(`${m[1]} -> ${m[2]}`); continue; }
    m = l.match(/^([A-Za-z_]\w*)\s*->\s*([A-Za-z_]\w*)/);
    if (m) { rels.add(pair(m[1], m[2])); relList.push(`${m[1]} -> ${m[2]}`); }
  }
  return { entities, rels, relList };
}

// ---- DBML ----
function parseDbml(file) {
  const txt = fs.readFileSync(file, 'utf8');
  const entities = new Set(), rels = new Set(), relList = [];
  for (const raw of txt.split('\n')) {
    const l = raw.trim();
    if (!l || l.startsWith('//')) continue;
    let m = l.match(/^Table\s+"?([A-Za-z_]\w*)"?/i);
    if (m) { entities.add(m[1]); continue; }
    // Ref: a.col > b.col   |   Ref name { a.col > b.col }
    m = l.match(/Ref[^:]*:\s*"?([A-Za-z_]\w*)"?\.\w+\s*[<>-]\s*"?([A-Za-z_]\w*)"?\.\w+/i);
    if (m) { rels.add(pair(m[1], m[2])); relList.push(`${m[1]} ~ ${m[2]}`); continue; }
    // inline: col type [ref: > other.id]
    m = l.match(/ref:\s*[<>-]\s*"?([A-Za-z_]\w*)"?\./i);
    if (m) relList.push(`(inline) ~ ${m[1]}`);
  }
  return { entities, rels, relList };
}

const present = Object.entries(P).filter(([, f]) => fs.existsSync(f));
if (!present.find(([k]) => k === 'mermaid')) {
  console.error(`❌ Không thấy canonical ${P.mermaid} — chạy /erd trước.`);
  process.exit(2);
}
if (present.length === 1) {
  console.log(`ℹ️  Feature "${FEATURE}" mới chỉ có bản Mermaid (${P.mermaid}) — chưa có D2/DBML để đối chiếu. Không có gì lệch.`);
  process.exit(0);
}

const base = parseMermaid(P.mermaid);
const parsers = { d2: parseD2, dbml: parseDbml };
let diffCount = 0;

console.log(`\n=== erd-consistency: ${FEATURE} ===`);
console.log(`Canonical (Mermaid): ${base.entities.size} entity · ${base.rels.size} quan hệ — ${P.mermaid}`);

for (const [kind, file] of present) {
  if (kind === 'mermaid') continue;
  const got = parsers[kind](file);
  const missEnt = [...base.entities].filter(e => ![...got.entities].some(g => norm(g) === norm(e)));
  const extraEnt = [...got.entities].filter(g => ![...base.entities].some(e => norm(e) === norm(g)));
  const missRel = [...base.rels].filter(r => !got.rels.has(r));
  const extraRel = [...got.rels].filter(r => !base.rels.has(r));
  const n = missEnt.length + extraEnt.length + missRel.length + extraRel.length;
  diffCount += n;

  console.log(`\n${n === 0 ? '✅' : '⚠️ '} ${kind.toUpperCase()} (${file}): ${got.entities.size} entity · ${got.rels.size} quan hệ`);
  if (missEnt.length) console.log(`   • THIẾU entity so với canonical: ${missEnt.join(', ')}`);
  if (extraEnt.length) console.log(`   • CÓ THÊM entity không có trong canonical: ${extraEnt.join(', ')}`);
  if (missRel.length) {
    console.log(`   • THIẾU ${missRel.length} quan hệ có trong canonical:`);
    missRel.forEach(r => { const s = base.relList.find(x => pair(x.split(/\s+/)[0], x.split(/\s+/).pop()) === r); console.log(`       - ${s || r}`); });
  }
  if (extraRel.length) console.log(`   • CÓ THÊM ${extraRel.length} quan hệ không có trong canonical: ${extraRel.join(', ')}`);
}

if (diffCount === 0) {
  console.log('\n✅ 3 bản khớp nhau về entity + quan hệ.');
} else {
  console.log(`\n⚠️  Tổng ${diffCount} điểm lệch giữa các bản.`);
  console.log('→ Canonical là bản Mermaid (`srs/{feature}-erd.md`). Cách xử lý:');
  console.log('   1. Nếu canonical ĐÚNG  → chạy lại /d2-erd hoặc /dbdiagram để sinh lại cho khớp.');
  console.log('   2. Nếu canonical SAI   → sửa `srs/{feature}-erd.md` trước (vd quan hệ không có FK chống lưng), rồi sinh lại các bản kia.');
  console.log('   KHÔNG sửa tay bản D2/DBML để "cho khớp" — lần sinh sau sẽ lệch lại.');
}
process.exit(STRICT && diffCount ? 1 : 0);
