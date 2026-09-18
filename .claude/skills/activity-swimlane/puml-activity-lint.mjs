#!/usr/bin/env node
/*
 * puml-activity-lint.mjs — Kiểm CẤU TRÚC LUỒNG của PlantUML activity/swimlane trước khi render.
 *
 * VÌ SAO CÓ FILE NÀY: render.sh chỉ kiểm "có ra ảnh" (HTTP 200 + size + grep "Syntax Error").
 * Các lỗi LUỒNG dưới đây đều render ra ảnh đẹp, exit 0 — đúng loại "vẽ đẹp nhưng sai luồng":
 *   - if không có endif (khối lồng nhau lệch) → PlantUML tự đoán, hình ra khác ý
 *   - nhánh decision thiếu nhãn điều kiện → người đọc không biết đi lối nào khi nào
 *   - thiếu `stop`/`end` ở nhánh → loose end, nghiệp vụ "vào rồi không ra"
 *   - dùng lane chưa khai ở đầu (typo tên lane) → PlantUML đẻ lane mới, sai vai trò
 * SKILL.md đã dạy đủ 5 luật này (Mục "Quy tắc") nhưng không có gate → giống hệt ca usecase-diagram.
 *
 * Dùng: node puml-activity-lint.mjs <file.puml> [--warn-only]
 * Exit: 0 pass · 1 có lỗi · 2 không đọc được file
 */

import { readFileSync } from 'node:fs';

export function lintActivity(text) {
  const errors = [], warnings = [];
  const lines = text.split(/\r?\n/);

  const lanes = new Map();          // tên lane -> dòng khai đầu tiên
  let hasStart = false, stops = 0;
  const ifStack = [];               // {ln, hasThenLabel, hasElse}
  let depth = 0;

  lines.forEach((raw, i) => {
    const ln = i + 1;
    const line = raw.replace(/'.*$/, '').trim();          // bỏ comment
    if (!line || /^@(start|end)uml/.test(line)) return;
    if (/^(skinparam|title|header|footer|legend|note|hide|show|scale)/i.test(line)) return;

    // lane: |Tên| hoặc |#color|Tên|
    const lane = line.match(/^\|(?:#[\w]+\|)?([^|]+)\|$/);
    if (lane) { const nm = lane[1].trim(); if (!lanes.has(nm)) lanes.set(nm, ln); return; }

    if (/^start\b/.test(line)) { hasStart = true; return; }
    if (/^(stop|end)\b/.test(line)) { stops++; return; }

    // if (điều kiện) then (nhãn)
    let m = line.match(/^if\s*\((.*?)\)\s*then\s*(?:\((.*?)\))?/i);
    if (m) {
      const cond = (m[1] || '').trim(), thenLabel = (m[2] || '').trim();
      if (!cond) errors.push({ ln, msg: '`if ()` không có điều kiện — ghi rõ câu hỏi quyết định, vd `if (Hợp lệ?) then (có)`' });
      ifStack.push({ ln, cond, hasThenLabel: !!thenLabel, hasElse: false });
      depth++;
      if (!thenLabel) warnings.push({ ln, msg: `Nhánh "then" của \`if (${cond})\` không có nhãn — nên ghi \`then (có)\` để người đọc biết điều kiện nào dẫn đi đâu` });
      return;
    }
    if (/^elseif\s*\(/i.test(line)) { if (ifStack.length) ifStack[ifStack.length - 1].hasElse = true; return; }
    m = line.match(/^else\s*(?:\((.*?)\))?/i);
    if (m && /^else\b/.test(line)) {
      if (!ifStack.length) { errors.push({ ln, msg: '`else` không có `if` tương ứng' }); return; }
      const top = ifStack[ifStack.length - 1];
      top.hasElse = true;
      if (!(m[1] || '').trim()) warnings.push({ ln, msg: `Nhánh "else" của \`if (${top.cond})\` không có nhãn — nên ghi \`else (không)\`` });
      return;
    }
    if (/^endif\b/i.test(line)) {
      if (!ifStack.length) { errors.push({ ln, msg: '`endif` thừa — không có `if` nào đang mở' }); return; }
      const top = ifStack.pop(); depth--;
      if (!top.hasElse) warnings.push({ ln: top.ln, msg: `\`if (${top.cond})\` không có nhánh \`else\` — quyết định chỉ có 1 lối đi; nếu nhánh còn lại thật sự không có việc gì thì bỏ qua, còn không thì bổ sung` });
      return;
    }
  });

  // ── kết luận toàn file ──
  if (!hasStart) errors.push({ ln: 0, msg: 'Thiếu `start` — activity diagram phải có điểm bắt đầu rõ ràng' });
  if (stops === 0) errors.push({ ln: 0, msg: 'Thiếu `stop`/`end` — mọi nhánh phải kết thúc ở một điểm dừng (SKILL.md: KHÔNG loose end)' });
  ifStack.forEach(f => errors.push({ ln: f.ln, msg: `\`if (${f.cond})\` mở ở dòng ${f.ln} nhưng KHÔNG có \`endif\` — PlantUML sẽ tự đoán phạm vi, hình ra sai ý` }));
  if (lanes.size === 1) warnings.push({ ln: 0, msg: `Chỉ có 1 lane ("${[...lanes.keys()][0]}") — swimlane sinh ra để thể hiện NHIỀU vai trò; 1 vai thì dùng /activity (Mermaid) nhẹ hơn` });
  if (lanes.size === 0) warnings.push({ ln: 0, msg: 'Không thấy lane `|Tên|` nào — đây là activity thường, không phải swimlane' });

  // decision đếm được so với số nhánh có nhãn
  const ifCount = lines.filter(l => /^\s*if\s*\(/i.test(l)).length;
  const endifCount = lines.filter(l => /^\s*endif\b/i.test(l)).length;
  if (ifCount !== endifCount) errors.push({ ln: 0, msg: `Số \`if\` (${ifCount}) khác số \`endif\` (${endifCount}) — khối quyết định không cân` });

  return { ok: errors.length === 0, errors, warnings, lanes: [...lanes.keys()], stops, ifCount };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const file = process.argv[2];
  const warnOnly = process.argv.includes('--warn-only');
  if (!file) { console.error('Dùng: node puml-activity-lint.mjs <file.puml> [--warn-only]'); process.exit(2); }
  let text;
  try { text = readFileSync(file, 'utf8'); }
  catch (e) { console.error(`❌ Không đọc được ${file}: ${e.message}`); process.exit(2); }

  const r = lintActivity(text);
  if (r.ok) console.log(`✅ Cấu trúc luồng: PASS (${file}) — ${r.lanes.length} lane, ${r.ifCount} quyết định, ${r.stops} điểm dừng`);
  else {
    console.log(`❌ Cấu trúc luồng: FAIL — ${r.errors.length} lỗi (${file})`);
    r.errors.forEach(e => console.log(`  ✗ ${e.ln ? 'dòng ' + e.ln + ': ' : ''}${e.msg}`));
  }
  if (r.warnings.length) {
    console.log(`\n⚠ ${r.warnings.length} cảnh báo (không chặn):`);
    r.warnings.forEach(w => console.log(`  • ${w.ln ? 'dòng ' + w.ln + ': ' : ''}${w.msg}`));
  }
  console.log('\nLưu ý: lint kiểm CẤU TRÚC luồng. Việc "bước này có đúng lane của vai trò đó không"');
  console.log('máy KHÔNG kiểm được — phải tự soi trên ảnh + đối chiếu use case.');
  process.exit(warnOnly ? 0 : (r.ok ? 0 : 1));
}
