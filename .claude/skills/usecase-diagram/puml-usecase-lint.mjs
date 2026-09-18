#!/usr/bin/env node
// puml-usecase-lint.mjs — Kiểm NGỮ PHÁP use case diagram trên source .puml TRƯỚC khi render.
//
// VÌ SAO CÓ FILE NÀY: render.sh chỉ kiểm "có ra ảnh không" (HTTP 200 + SVG >200 byte). Mọi lỗi
// ngữ pháp UML dưới đây đều render ra ảnh ĐẸP, exit 0, nên lọt lưới hoàn toàn (đo thật trên
// docs/authentication/usecases/authentication-usecase-diagram.puml — 6 lỗi cùng lúc, báo PASS).
// Prose trong SKILL.md đã dạy đúng luật từ 2026-07-15 mà diagram sai vẫn sinh ra 2026-07-19
// ⇒ luật đi ngược prior mạnh (`-->` là token vẽ-cạnh phổ biến nhất) KHÔNG thể chỉ tồn tại dạng
// phát biểu; phải là gate chặn trên output.
//
// NGỮ PHÁP ĐÓNG: use case diagram chỉ có 4 loại cạnh hợp lệ. Mọi dạng khác = SAI.
//   1. Actor -- UC                          association (vô hướng, participation)
//   2. UCbase ..> UCcon : <<include>>        base LUÔN cần UC con
//   3. UCmởrộng ..> UCbase : <<extend>>      UC mở rộng chèn vào base khi có điều kiện
//   4. Con --|> Cha                         generalization (cùng loại: actor-actor hoặc UC-UC)
//
// Dùng: node puml-usecase-lint.mjs <file.puml>       → exit 0 pass, 1 có lỗi, 2 không đọc được
//       node puml-usecase-lint.mjs <file.puml> --warn-only   → chỉ in, luôn exit 0

import { readFileSync } from 'node:fs';

const RE_ACTOR = /^\s*actor\s+(?:"([^"]+)"|([A-Za-z_][\w]*))\s*(?:as\s+([A-Za-z_][\w]*))?\s*$/;
const RE_UC = /^\s*(?:usecase|\()\s*(?:"([^"]+)"|([A-Za-z_][\w]*))\s*\)?\s*(?:as\s+([A-Za-z_][\w]*))?\s*$/;
const RE_BOUNDARY_OPEN = /^\s*(?:rectangle|package)\s+.*\{\s*$/;
const RE_CLOSE = /^\s*\}\s*$/;
// cạnh: <lhs> <op> <rhs> [: label]   — op gom mọi biến thể để bắt được cả cái SAI
const RE_EDGE = /^\s*(?:"([^"]+)"|([A-Za-z_][\w]*))\s*(<\|--|--\|>|<\.\.|\.\.>|<--|-->|\.\.|-{2,3})\s*(?:"([^"]+)"|([A-Za-z_][\w]*))\s*(?::\s*(.*))?$/;

export function lintPuml(text) {
  const errors = [], warnings = [];
  const lines = text.split(/\r?\n/);

  const actors = new Map();   // key(alias|name) -> display
  const ucs = new Map();
  let depth = 0;              // độ sâu rectangle/package
  let sawBoundary = false;
  const actorDepth = new Map();
  const ucDepth = new Map();
  const edges = [];

  lines.forEach((raw, i) => {
    const ln = i + 1;
    const line = raw.replace(/'.*$/, '');           // bỏ comment PlantUML
    if (!line.trim() || /^\s*@(start|end)uml/.test(line)) return;
    if (/^\s*(skinparam|left to right|top to bottom|title|legend|note|hide|show)/i.test(line)) return;

    if (RE_BOUNDARY_OPEN.test(line)) { depth++; sawBoundary = true; return; }
    if (RE_CLOSE.test(line)) { depth = Math.max(0, depth - 1); return; }

    let m;
    if ((m = line.match(RE_ACTOR))) {
      const name = m[1] || m[2], alias = m[3] || name;
      actors.set(alias, name); actors.set(name, name);
      actorDepth.set(alias, depth);
      return;
    }
    if ((m = line.match(RE_UC)) && /usecase|\(/.test(line)) {
      const name = m[1] || m[2], alias = m[3] || name;
      ucs.set(alias, name); ucs.set(name, name);
      ucDepth.set(alias, depth);
      return;
    }
    if ((m = line.match(RE_EDGE))) {
      edges.push({ ln, raw: line.trim(), lhs: m[1] || m[2], op: m[3], rhs: m[4] || m[5], label: (m[6] || '').trim() });
    }
  });

  const kindOf = id => actors.has(id) ? 'actor' : (ucs.has(id) ? 'uc' : 'unknown');
  const rels = [];   // quan hệ include/extend đúng cú pháp — chờ đối chiếu nguồn nghiệp vụ

  // R7 — boundary bắt buộc (SKILL.md: "System boundary BẮT BUỘC ... thiếu boundary = thiếu scope")
  if (!sawBoundary) errors.push({ ln: 0, msg: 'Thiếu system boundary — mọi use case phải nằm trong `rectangle "System: {feature}" { ... }`' });

  // R5 — actor ở NGOÀI boundary, usecase ở TRONG
  for (const [alias, d] of actorDepth) if (d > 0) errors.push({ ln: 0, msg: `Actor "${alias}" khai BÊN TRONG boundary — actor là bên ngoài hệ thống, phải đặt ngoài rectangle` });
  for (const [alias, d] of ucDepth) if (d === 0) errors.push({ ln: 0, msg: `Use case "${alias}" khai NGOÀI boundary — mọi UC phải nằm trong rectangle system` });

  const ucHasActor = new Set();

  for (const e of edges) {
    const kl = kindOf(e.lhs), kr = kindOf(e.rhs);
    const involvesActor = kl === 'actor' || kr === 'actor';
    const bothUc = kl === 'uc' && kr === 'uc';
    const norm = e.label.replace(/\s+/g, '');

    // R0 — endpoint phải đã khai báo (bắt typo tạo node ma)
    if (kl === 'unknown') { errors.push({ ln: e.ln, msg: `"${e.lhs}" chưa được khai báo là actor hay usecase (typo? PlantUML sẽ tự tạo node lạ)` }); continue; }
    if (kr === 'unknown') { errors.push({ ln: e.ln, msg: `"${e.rhs}" chưa được khai báo là actor hay usecase (typo? PlantUML sẽ tự tạo node lạ)` }); continue; }

    // R1 — association actor↔UC PHẢI vô hướng `--`
    if (involvesActor && !bothUc) {
      if (/^-{2,3}$/.test(e.op)) {
        if (kl === 'uc') ucHasActor.add(e.lhs);
        if (kr === 'uc') ucHasActor.add(e.rhs);
        if (norm) warnings.push({ ln: e.ln, msg: `Association có nhãn "${e.label}" — association thường không cần nhãn; kiểm lại có phải bạn định vẽ quan hệ khác` });
        continue;
      }
      if (e.op === '--|>' || e.op === '<|--') {
        // generalization actor-actor là hợp lệ; actor↔UC thì không
        if (kl === kr) continue;
        errors.push({ ln: e.ln, msg: `Generalization giữa actor và use case là SAI — chỉ nối 2 phần tử CÙNG loại. Sửa: \`${e.lhs} -- ${e.rhs}\`` });
        continue;
      }
      // -->, ..>, <--, .. giữa actor và UC
      const isDashed = e.op.includes('..');
      errors.push({
        ln: e.ln,
        msg: isDashed
          ? `Cạnh nét đứt "${e.op}" chạm ACTOR — include/extend/dependency KHÔNG tồn tại giữa actor và use case (kể cả hệ thống ngoài như Email/Cổng thanh toán: chúng là ACTOR). Sửa: \`${e.lhs} -- ${e.rhs}\``
          : `Association actor↔use case có MŨI TÊN ("${e.op}") — association là participation 2 chiều, phải vô hướng. Sửa: \`${e.lhs} -- ${e.rhs}\``
      });
      continue;
    }

    // R2 — `..>` giữa 2 UC: nhãn PHẢI đúng <<include>> hoặc <<extend>>
    if (bothUc && e.op === '..>') {
      if (norm === '<<include>>' || norm === '<<extend>>') {
        // Cú pháp đúng, nhưng HƯỚNG/LOẠI thì máy không tự biết (cần nguồn nghiệp vụ).
        // Ghi lại để tầng (B) đối chiếu UC text — xem checkDirection().
        rels.push({ ln: e.ln, from: e.lhs, to: e.rhs, kind: norm === '<<include>>' ? 'include' : 'extend' });
        continue;
      }
      if (/^<<.*>>$/.test(norm)) { errors.push({ ln: e.ln, msg: `Stereotype "${e.label}" không hợp lệ — use case diagram chỉ có \`<<include>>\` và \`<<extend>>\`` }); continue; }
      if (/^(include|extend)$/i.test(norm)) { errors.push({ ln: e.ln, msg: `Nhãn "${e.label}" thiếu guillemet — phải viết đúng \`<<${norm.toLowerCase()}>>\`` }); continue; }
      errors.push({ ln: e.ln, msg: norm
        ? `Cạnh nét đứt giữa 2 use case mang nhãn tự do "${e.label}" — không có loại cạnh "dependency nhãn tự do" trong use case diagram. Dùng \`<<include>>\`/\`<<extend>>\`, hoặc bỏ cạnh`
        : `Cạnh nét đứt giữa 2 use case KHÔNG có nhãn — phải ghi rõ \`: <<include>>\` hoặc \`: <<extend>>\`` });
      continue;
    }

    // R3 — generalization UC-UC hợp lệ; association UC--UC thì không phải ngữ pháp use case
    if (bothUc && (e.op === '--|>' || e.op === '<|--')) continue;
    if (bothUc && /^-{2,3}$/.test(e.op)) { errors.push({ ln: e.ln, msg: `Association trực tiếp giữa 2 use case là SAI — use case không "nối" nhau bằng association. Dùng \`<<include>>\`/\`<<extend>>\` nếu có quan hệ thật, hoặc bỏ cạnh` }); continue; }

    // R4 — mọi dạng còn lại nằm ngoài ngữ pháp đóng
    errors.push({ ln: e.ln, msg: `Cạnh "${e.op}" ngoài ngữ pháp use case diagram (chỉ có: \`--\` association · \`..> : <<include>>\` · \`..> : <<extend>>\` · \`--|>\` generalization)` });
  }

  // R6 — UC mồ côi (không actor nào tham gia): cảnh báo, vì UC chỉ được include từ UC khác là hợp lệ.
  // CHỈ xét khi không còn lỗi cạnh: cạnh sai ngữ pháp (vd `Actor --> UC`) không được ghi vào
  // ucHasActor nên nếu chạy lúc đang có error sẽ báo mồ côi OAN cho UC thật sự có actor.
  if (errors.length === 0) {
    for (const [alias] of ucDepth) {
      if (!ucHasActor.has(alias)) {
        const isIncluded = edges.some(e => e.op === '..>' && (e.rhs === alias || e.lhs === alias) && /include|extend/i.test(e.label));
        if (!isIncluded) warnings.push({ ln: 0, msg: `Use case "${alias}" không có actor nào tham gia và cũng không được include/extend — UC mồ côi, kiểm lại ai dùng nó` });
      }
    }
  }

  // ── (B) HƯỚNG include/extend — máy KHÔNG tự phán được, chỉ cảnh báo theo dấu hiệu ──
  // Hướng đúng phụ thuộc nghiệp vụ (cái nào là base), nên đây là WARNING chứ không phải error.
  // Dấu hiệu dùng: use case nào được NHIỀU actor tham gia + là điểm khởi phát luồng thì thường
  // là BASE. include: base ở ĐUÔI mũi tên. extend: base ở ĐẦU mũi tên (kẻ mở rộng ở đuôi).
  const actorCount = new Map();
  for (const e of edges) {
    if (!/^-{2,3}$/.test(e.op)) continue;
    if (kindOf(e.lhs) === 'actor' && kindOf(e.rhs) === 'uc') actorCount.set(e.rhs, (actorCount.get(e.rhs) || 0) + 1);
    if (kindOf(e.rhs) === 'actor' && kindOf(e.lhs) === 'uc') actorCount.set(e.lhs, (actorCount.get(e.lhs) || 0) + 1);
  }
  for (const r of rels) {
    const aFrom = actorCount.get(r.from) || 0, aTo = actorCount.get(r.to) || 0;
    if (r.kind === 'include' && aTo > aFrom) {
      warnings.push({ ln: r.ln, msg: `Nghi include SAI HƯỚNG: "${r.to}" có nhiều actor hơn "${r.from}" nên "${r.to}" trông giống BASE. include phải là \`base ..> phần-được-gộp\` ⇒ có thể cần đảo thành \`${r.to} ..> ${r.from} : <<include>>\`. Đối chiếu Main Success Scenario của uc-${r.from} xem có nhắc "${r.to}" không` });
    }
    if (r.kind === 'extend' && aFrom > aTo) {
      warnings.push({ ln: r.ln, msg: `Nghi extend SAI HƯỚNG: "${r.from}" có nhiều actor hơn "${r.to}" nên "${r.from}" trông giống BASE. extend phải là \`phần-mở-rộng ..> base\` ⇒ có thể cần đảo thành \`${r.to} ..> ${r.from} : <<extend>>\`. Đối chiếu Extensions của uc-${r.to}` });
    }
  }

  return { ok: errors.length === 0, errors, warnings, rels };
}

// ── CLI ──
if (import.meta.url === `file://${process.argv[1]}`) {
  const file = process.argv[2];
  const warnOnly = process.argv.includes('--warn-only');
  if (!file) { console.error('Dùng: node puml-usecase-lint.mjs <file.puml> [--warn-only]'); process.exit(2); }
  let text;
  try { text = readFileSync(file, 'utf8'); }
  catch (err) { console.error(`❌ Không đọc được ${file}: ${err.message}`); process.exit(2); }

  const r = lintPuml(text);
  if (r.ok) console.log(`✅ Ngữ pháp use case: PASS (${file})`);
  else {
    console.log(`❌ Ngữ pháp use case: FAIL — ${r.errors.length} lỗi (${file})`);
    r.errors.forEach(e => console.log(`  ✗ ${e.ln ? 'dòng ' + e.ln + ': ' : ''}${e.msg}`));
  }
  if (r.warnings.length) {
    console.log(`\n⚠ ${r.warnings.length} cảnh báo (không chặn):`);
    r.warnings.forEach(w => console.log(`  • ${w.ln ? 'dòng ' + w.ln + ': ' : ''}${w.msg}`));
  }
  process.exit(warnOnly ? 0 : (r.ok ? 0 : 1));
}
