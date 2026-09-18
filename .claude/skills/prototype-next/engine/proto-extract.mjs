// proto-extract.mjs — bóc fact nghiệp vụ TẤT ĐỊNH cho /prototype-next.
//
// Chạy: node .claude/skills/prototype-next/engine/proto-extract.mjs <feature> [--out <dir>] [--json]
//
// Mục đích: thay việc AI đọc ~37k token prose (spec/erd/states/wireframe) bằng việc máy bóc
// thẳng từ Knowledge Graph (docs/_shared/kg/graph.json) + parse bảng mô tả element.
// AI chỉ đọc lại phần CẦN PHÁN ĐOÁN (userflow prose, use case) — xem SKILL.md Phase A.
//
// Output:
//   1. <out>/proto-facts.json  — fact gọn cho AI đọc (thay 37k prose)
//   2. <out>/errors.ts         — Error Matrix → hằng số TS (100% cơ học, AI không cần đụng)
//   3. <out>/types.ts          — entity + state → type TS (100% cơ học)
//   stdout                     — báo cáo người đọc: độ phủ, cảnh báo stale, format lạ
//
// Nguyên tắc (theo diagram-correctness.md Mục 3): KHÔNG im lặng. Thiếu nguồn / format lạ /
// doc stale đều phải IN RA, không được trả rỗng như thể mọi thứ ổn.
//
// Exit code: 0 = ok (có thể kèm cảnh báo) · 2 = không dùng được, skill phải quay về đọc prose.

import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from 'node:fs';
import { resolve, join } from 'node:path';

const GRAPH = 'docs/_shared/kg/graph.json';

function die(msg, code = 2) {
  console.error(msg);
  process.exit(code);
}

// ─────────────────────────────────────────────────────────────────────────────
// Nạp KG
// ─────────────────────────────────────────────────────────────────────────────

function loadGraph() {
  if (!existsSync(GRAPH)) {
    die(
      `PROTO-ERROR: không thấy ${GRAPH} — chạy \`node .claude/skills/kg/engine/kg-build.mjs\` trước, ` +
        `hoặc quay về đọc trực tiếp docs/{feature}/ (xem SKILL.md Phase A fallback).`,
    );
  }
  let g;
  try {
    g = JSON.parse(readFileSync(GRAPH, 'utf8'));
  } catch (e) {
    die(`PROTO-ERROR: ${GRAPH} không parse được (${e.message}) — quay về đọc prose.`);
  }
  if (!Array.isArray(g.nodes)) die('PROTO-ERROR: graph thiếu mảng nodes — quay về đọc prose.');
  return g;
}

// ─────────────────────────────────────────────────────────────────────────────
// Bóc Error Matrix
//
// Node error trong KG có props: {trigger, severity, covers_fr, screen_state, recovery}.
// Wording hiển thị cho người dùng nằm TRONG DẤU NGOẶC KÉP của screen_state, ví dụ:
//   'Form đăng nhập hiện "Email hoặc mật khẩu không đúng" (chung, không lộ...)'
// → trích chuỗi trong "..." là tất định.
// ─────────────────────────────────────────────────────────────────────────────

function extractWording(screenState) {
  if (!screenState) return null;
  // Lấy chuỗi trong ngoặc kép thẳng hoặc cong. Chọn chuỗi DÀI NHẤT — wording thông báo
  // luôn dài hơn nhãn nút ("[Gửi lại email xác nhận]" nằm trong dấu ngoặc vuông, không phải kép).
  const found = [...screenState.matchAll(/[""]([^""]{4,})[""]/g)].map((m) => m[1]);
  if (!found.length) return null;
  return found.sort((a, b) => b.length - a.length)[0];
}

function collectErrors(nodes, feature) {
  return nodes
    .filter((n) => n.type === 'error' && n.feature === feature)
    .sort((a, b) => String(a.key).localeCompare(String(b.key)))
    .map((n) => {
      const p = n.props || {};
      const wording = extractWording(p.screen_state);
      return {
        code: n.key,
        title: n.title,
        wording,                       // null → skill phải hỏi/ghi giả định, KHÔNG bịa
        trigger: p.trigger || null,
        severity: p.severity || null,
        coversFr: p.covers_fr || null,
        screenState: p.screen_state || null,
        recovery: p.recovery || null,
        status: n.status || null,
        source: n.source ? `${n.source.file}:${n.source.line}` : null,
      };
    });
}

// ─────────────────────────────────────────────────────────────────────────────
// Bóc requirement (FR/BR/NFR)
// ─────────────────────────────────────────────────────────────────────────────

function collectRequirements(nodes, feature) {
  const out = { FR: [], BR: [], NFR: [] };
  for (const n of nodes) {
    if (n.type !== 'requirement' || n.feature !== feature) continue;
    const sub = n.subtype || (String(n.key).split('-')[0] || '').toUpperCase();
    if (!out[sub]) continue;
    const p = n.props || {};
    out[sub].push({
      id: n.key,
      title: n.title,
      rule: p.rule || p.business_rule || p.description || null,
      trigger: p.trigger || null,
      rationale: p.rationale || null,
      implementsFr: p.implements_fr || null,
      status: n.status || null,
      source: n.source ? `${n.source.file}:${n.source.line}` : null,
    });
  }
  for (const k of Object.keys(out)) out[k].sort((a, b) => a.id.localeCompare(b.id));
  return out;
}

// ─────────────────────────────────────────────────────────────────────────────
// Bóc entity + state → sinh type TS
//
// state node key dạng: state:{feature}/{Entity}#{state}
// ─────────────────────────────────────────────────────────────────────────────

function collectEntities(nodes, feature) {
  const entities = nodes
    .filter((n) => n.type === 'entity' && n.feature === feature)
    .map((n) => ({
      name: n.title,
      attributes: (n.props || {}).attributes || null,
      source: n.source ? `${n.source.file}:${n.source.line}` : null,
    }));

  // Gom state theo entity
  const statesByEntity = {};
  for (const n of nodes) {
    if (n.type !== 'state' || n.feature !== feature) continue;
    const m = String(n.key).match(/^state:[^/]+\/([^#]+)#(.+)$/);
    if (!m) continue;
    const [, ent, st] = m;
    (statesByEntity[ent] ||= []).push(st);
  }
  for (const k of Object.keys(statesByEntity)) {
    statesByEntity[k] = [...new Set(statesByEntity[k])].sort();
  }
  return { entities, statesByEntity };
}

// ─────────────────────────────────────────────────────────────────────────────
// Bóc screen + flow
// ─────────────────────────────────────────────────────────────────────────────

function collectScreens(nodes, feature) {
  return nodes
    .filter((n) => n.type === 'screen' && n.feature === feature)
    .map((n) => ({
      slug: (n.props || {}).slug || n.title,
      title: n.title,
      contentFile: (n.props || {}).content_file || null,
      status: n.status || null,
    }))
    .sort((a, b) => String(a.slug).localeCompare(String(b.slug)));
}

function collectFlows(nodes, feature) {
  return nodes
    .filter((n) => n.type === 'flow' && n.feature === feature)
    .map((n) => ({ slug: (n.props || {}).slug || n.title, title: n.title }))
    .sort((a, b) => String(a.slug).localeCompare(String(b.slug)));
}

// ─────────────────────────────────────────────────────────────────────────────
// Parse bảng mô tả element trong ascii-wireframe
//
// QUAN TRỌNG — format KHÔNG đồng nhất giữa các feature (đo thật 2026-08-01):
//   authentication  : | # | Items | Control type | Data type | Description |     (5 cột)
//   premium-payment : | # | Thành phần | Mô tả & logic | Nguồn dữ liệu / API |   (4 cột)
// → PHẢI tự nhận header, KHÔNG giả định 5 cột. Gặp format lạ thì BÁO, không trả rỗng im lặng.
// ─────────────────────────────────────────────────────────────────────────────

const HEADER_ALIASES = {
  items: ['items', 'thành phần', 'thanh phan', 'element', 'phần tử'],
  controlType: ['control type', 'control', 'loại control', 'kiểu control'],
  dataType: ['data type', 'kiểu dữ liệu', 'data'],
  description: ['description', 'mô tả & logic', 'mô tả', 'mo ta', 'ghi chú'],
  dataSource: ['nguồn dữ liệu / api', 'nguồn dữ liệu', 'api'],
};

function matchColumn(headerCell) {
  const h = headerCell.toLowerCase().trim();
  for (const [key, aliases] of Object.entries(HEADER_ALIASES)) {
    if (aliases.some((a) => h === a || h.includes(a))) return key;
  }
  return null;
}

function splitRow(line) {
  // Bỏ | đầu/cuối rồi tách. Không dùng regex phức tạp — cell không chứa | (đã escape trong doc).
  return line.replace(/^\s*\|/, '').replace(/\|\s*$/, '').split('|').map((s) => s.trim());
}

/** Tách cell Description thành 6 lớp theo nhãn `• **Nhãn**: nội dung<br>` */
function parseDescription(cell) {
  if (!cell) return { raw: '', layers: {} };
  const layers = {};
  const unlabeled = [];
  for (const chunk of cell.split(/<br\s*\/?>/i)) {
    const t = chunk.replace(/^\s*[•·-]\s*/, '').trim();
    if (!t) continue;
    const m = t.match(/^\*\*(.+?)\*\*\s*[:：]?\s*(.*)$/);
    if (m) {
      const label = m[1].trim();
      const body = m[2].trim();
      // Nhiều nhãn cùng loại (Error — sai thông tin / Error — bị khóa) → gom mảng
      (layers[label] ||= []).push(body);
    } else {
      unlabeled.push(t);
    }
  }
  return { raw: cell, layers, unlabeled };
}

function parseScreenFile(path) {
  if (!existsSync(path)) return { ok: false, reason: 'file không tồn tại', screens: [] };
  const text = readFileSync(path, 'utf8');
  const lines = text.split('\n');
  const fallbackSlug = path.split('/').pop().replace(/\.md$/, '');

  const screens = [];
  let current = null;
  let colMap = null;      // index → tên cột
  let headerRaw = null;

  // Bắt đầu 1 screen mới. Hỗ trợ 2 dạng doc:
  //   (a) nhiều màn / file:  `## Screen: {slug} — {tên}`   (chuẩn hiện hành)
  //   (b) một màn / file:    `# Màn hình: {tên}`           (doc kiểu cũ) → slug = tên file
  const startScreen = (slug, title) => {
    current = { slug, title: (title || '').trim(), elements: [], headerRaw: null, unknownHeader: false };
    screens.push(current);
    colMap = null;
  };

  for (const line of lines) {
    const sm = line.match(/^##\s+Screen:\s*(\S+)\s*(?:—\s*(.*))?$/);
    if (sm) {
      startScreen(sm[1], sm[2]);
      continue;
    }
    const legacy = line.match(/^#\s+(?:Màn hình|Screen)\s*[::]\s*(.+)$/i);
    if (legacy && !screens.length) {
      startScreen(fallbackSlug, legacy[1]);
      continue;
    }
    if (!line.trim().startsWith('|')) continue;

    const cells = splitRow(line);
    // Dòng header: ô đầu là '#' và có ≥2 ô
    if (!colMap && /^#$/.test(cells[0]) && cells.length >= 3) {
      headerRaw = cells.join(' | ');
      colMap = {};
      let known = 0;
      cells.forEach((c, i) => {
        if (i === 0) return;
        const key = matchColumn(c);
        if (key) { colMap[i] = key; known++; }
      });
      if (current) {
        current.headerRaw = headerRaw;
        // Không nhận ra cột nào có nghĩa → format lạ, phải báo
        current.unknownHeader = known === 0;
      }
      continue;
    }
    // Dòng phân cách
    if (/^[-: ]+$/.test(cells[0] || '')) continue;
    // Dòng dữ liệu: ô đầu là số
    if (colMap && /^\d+$/.test(cells[0] || '')) {
      const el = { n: Number(cells[0]) };
      for (const [idx, key] of Object.entries(colMap)) {
        const v = cells[Number(idx)] || '';
        el[key] = key === 'description' ? parseDescription(v) : v;
      }
      if (current) current.elements.push(el);
    }
  }
  return { ok: true, screens };
}

// ─────────────────────────────────────────────────────────────────────────────
// Sinh errors.ts (100% cơ học)
// ─────────────────────────────────────────────────────────────────────────────

function genErrorsTs(feature, errors) {
  const withWording = errors.filter((e) => e.wording);
  const lines = [
    '// AUTO-GENERATED bởi proto-extract.mjs — KHÔNG sửa tay.',
    `// Nguồn: Error Matrix của \`${feature}\` (docs/${feature}/srs/${feature}-spec.md) qua Knowledge Graph.`,
    '// Sửa wording => sửa SRS rồi chạy lại engine.',
    '',
    'export const ERRORS = {',
  ];
  for (const e of withWording) {
    lines.push(`  /** ${e.title}${e.trigger ? ` — ${e.trigger}` : ''} (${e.source || 'n/a'}) */`);
    lines.push(`  '${e.code}': ${JSON.stringify(e.wording)},`);
  }
  lines.push('} as const;', '');
  lines.push('export type ErrorCode = keyof typeof ERRORS;', '');
  lines.push('/** Metadata cho Demo Toolbar — nhãn hiển thị + mức độ. */');
  lines.push('export const ERROR_META: Record<ErrorCode, { title: string; severity: string | null }> = {');
  for (const e of withWording) {
    lines.push(`  '${e.code}': { title: ${JSON.stringify(e.title)}, severity: ${JSON.stringify(e.severity)} },`);
  }
  lines.push('};', '');

  const noWording = errors.filter((e) => !e.wording);
  if (noWording.length) {
    lines.push('// ⚠ Các mã lỗi dưới có trong Error Matrix nhưng KHÔNG trích được wording trong ngoặc kép.');
    lines.push('//   Skill phải hỏi người dùng hoặc ghi vào danh sách giả định — KHÔNG tự bịa câu thông báo.');
    for (const e of noWording) lines.push(`//   ${e.code} — ${e.title} (${e.source || 'n/a'})`);
    lines.push('');
  }
  return lines.join('\n');
}

// ─────────────────────────────────────────────────────────────────────────────
// Sinh types.ts (100% cơ học)
// ─────────────────────────────────────────────────────────────────────────────

function genTypesTs(feature, entities, statesByEntity) {
  const lines = [
    '// AUTO-GENERATED bởi proto-extract.mjs — KHÔNG sửa tay.',
    `// Nguồn: ERD + State diagram của \`${feature}\` qua Knowledge Graph.`,
    '// Lưu ý: mọi mốc thời gian lưu dạng ISO string — Date KHÔNG sống sót qua JSON persist.',
    '',
  ];
  for (const [ent, states] of Object.entries(statesByEntity)) {
    if (!states.length) continue;
    const tn = `${ent.replace(/[^A-Za-z0-9]/g, '')}Status`;
    lines.push(`export type ${tn} =`);
    states.forEach((s, i) => {
      lines.push(`  | ${JSON.stringify(s)}${i === states.length - 1 ? ';' : ''}`);
    });
    lines.push('');
  }
  if (entities.length) {
    lines.push('// Thuộc tính nghiệp vụ từ ERD (tham chiếu — interface do skill hoàn thiện):');
    for (const e of entities) {
      lines.push(`//   ${e.name}: ${e.attributes ? String(e.attributes).slice(0, 160) : '(ERD chưa ghi thuộc tính)'}`);
    }
    lines.push('');
  }
  return lines.join('\n');
}

// ─────────────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────────────

function main() {
  const argv = process.argv.slice(2);
  const feature = argv.find((a) => !a.startsWith('--'));
  if (!feature) die('Cách dùng: node proto-extract.mjs <feature> [--out <dir>] [--json]', 2);

  const outIdx = argv.indexOf('--out');
  const outDir = outIdx >= 0 ? argv[outIdx + 1] : `prototype/src/lib/demo/_generated`;
  const jsonOnly = argv.includes('--json');

  const graph = loadGraph();
  const nodes = graph.nodes;

  const known = [...new Set(nodes.filter((n) => n.type === 'feature').map((n) => n.feature || n.title))];
  if (!nodes.some((n) => n.feature === feature)) {
    die(
      `PROTO-ERROR: không có node nào cho feature \`${feature}\` trong KG.\n` +
        `Feature đã biết: ${known.join(', ') || '(không có)'}\n` +
        `→ Kiểm tra tên feature, hoặc chạy kg-build.mjs, hoặc quay về đọc docs/${feature}/ trực tiếp.`,
    );
  }

  const errors = collectErrors(nodes, feature);
  const requirements = collectRequirements(nodes, feature);
  const { entities, statesByEntity } = collectEntities(nodes, feature);
  const screens = collectScreens(nodes, feature);
  const flows = collectFlows(nodes, feature);

  // Parse bảng element.
  // Nguồn file theo 2 đường, hợp lại — KHÔNG chỉ tin content_file của KG:
  //   (1) screen node có props.content_file (doc chuẩn hiện hành)
  //   (2) quét thẳng docs/{feature}/ascii-wireframe/*.md (doc kiểu cũ không khai content_file)
  // Đo thật 2026-08-01: premium-payment không có content_file nào → đường (1) trả rỗng im lặng.
  const fromKg = screens.map((s) => s.contentFile).filter(Boolean);
  const wireDir = `docs/${feature}/ascii-wireframe`;
  let fromDir = [];
  if (existsSync(wireDir)) {
    fromDir = readdirSync(wireDir)
      .filter((f) => f.endsWith('.md') && !f.includes('-index'))
      .map((f) => join(wireDir, f));
  }
  const contentFiles = [...new Set([...fromKg, ...fromDir])];
  const screenDetails = [];
  const parseWarnings = [];
  if (!contentFiles.length) {
    parseWarnings.push(
      `Không tìm thấy file mô tả màn nào: KG không khai content_file, và ${wireDir}/ không tồn tại ` +
        `hoặc rỗng → skill phải Read tay, hoặc chạy /wireframe-ascii ${feature} trước.`,
    );
  }
  for (const f of contentFiles) {
    const r = parseScreenFile(f);
    if (!r.ok) {
      parseWarnings.push(`${f}: ${r.reason}`);
      continue;
    }
    for (const s of r.screens) {
      if (s.unknownHeader) {
        parseWarnings.push(
          `${f} › screen "${s.slug}": header bảng KHÔNG nhận ra cột nào — "${s.headerRaw}". ` +
            `Element của màn này KHÔNG bóc được, skill phải đọc tay file này.`,
        );
      } else if (!s.elements.length) {
        parseWarnings.push(`${f} › screen "${s.slug}": không có dòng element nào.`);
      }
      screenDetails.push({ ...s, file: f });
    }
  }

  // Cảnh báo stale
  const staleErrors = errors.filter((e) => e.status === 'stale');
  const staleReqs = [...requirements.FR, ...requirements.BR, ...requirements.NFR].filter(
    (r) => r.status === 'stale',
  );

  const facts = {
    feature,
    generatedFrom: GRAPH,
    counts: {
      errors: errors.length,
      fr: requirements.FR.length,
      br: requirements.BR.length,
      nfr: requirements.NFR.length,
      entities: entities.length,
      screens: screens.length,
      flows: flows.length,
      elementsParsed: screenDetails.reduce((a, s) => a + s.elements.length, 0),
    },
    errors,
    requirements,
    entities,
    statesByEntity,
    screens,
    flows,
    screenDetails,
    warnings: {
      parse: parseWarnings,
      staleErrors: staleErrors.map((e) => e.code),
      staleRequirements: staleReqs.map((r) => r.id),
      errorsWithoutWording: errors.filter((e) => !e.wording).map((e) => e.code),
    },
  };

  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, 'proto-facts.json'), JSON.stringify(facts, null, 2));
  writeFileSync(join(outDir, 'errors.ts'), genErrorsTs(feature, errors));
  writeFileSync(join(outDir, 'types.ts'), genTypesTs(feature, entities, statesByEntity));

  if (jsonOnly) {
    console.log(JSON.stringify(facts, null, 2));
    return;
  }

  // ── Báo cáo người đọc ──
  const L = [];
  L.push(`# proto-extract: ${feature}`);
  L.push('');
  L.push('| Bóc được | Số lượng |');
  L.push('| --- | ---: |');
  L.push(`| Mã lỗi (Error Matrix) | ${errors.length} |`);
  L.push(`| Yêu cầu chức năng (FR) | ${requirements.FR.length} |`);
  L.push(`| Quy tắc nghiệp vụ (BR) | ${requirements.BR.length} |`);
  L.push(`| Yêu cầu phi chức năng (NFR) | ${requirements.NFR.length} |`);
  L.push(`| Thực thể dữ liệu | ${entities.length} |`);
  L.push(`| Màn hình | ${screens.length} |`);
  L.push(`| Luồng | ${flows.length} |`);
  L.push(`| Element bóc từ bảng mô tả | ${facts.counts.elementsParsed} |`);
  L.push('');
  L.push(`Đã ghi: ${join(outDir, 'proto-facts.json')} · errors.ts · types.ts`);
  L.push('');

  if (staleErrors.length || staleReqs.length) {
    L.push('## ⚠ Tài liệu nguồn đang STALE');
    L.push('');
    L.push('Nội dung dưới bóc từ tài liệu đã bị đánh dấu cũ — prototype sinh ra có thể lệch bản mới nhất.');
    if (staleErrors.length) L.push(`- Mã lỗi stale (${staleErrors.length}): ${staleErrors.map((e) => e.code).join(', ')}`);
    if (staleReqs.length) L.push(`- Yêu cầu stale (${staleReqs.length}): ${staleReqs.slice(0, 8).map((r) => r.id).join(', ')}${staleReqs.length > 8 ? '…' : ''}`);
    L.push('');
    L.push('→ Skill PHẢI nêu điều này với người dùng ở bước trình kế hoạch.');
    L.push('');
  }

  if (facts.warnings.errorsWithoutWording.length) {
    L.push('## ⚠ Mã lỗi không trích được wording');
    L.push('');
    L.push(`${facts.warnings.errorsWithoutWording.join(', ')}`);
    L.push('');
    L.push('→ Error Matrix không đặt câu thông báo trong dấu ngoặc kép. Skill phải hỏi người dùng, KHÔNG bịa.');
    L.push('');
  }

  // Chốt chặn chống "im lặng trả rỗng" (diagram-correctness.md Mục 3): bóc ra 0 element
  // trong khi feature CÓ màn hình là bất thường — phải nói thẳng, không để skill tưởng đã đủ.
  if (facts.counts.elementsParsed === 0 && screens.length > 0) {
    L.push('## ⚠⚠ KHÔNG bóc được element nào');
    L.push('');
    L.push(
      `Feature có ${screens.length} màn nhưng engine không lấy được dòng element nào. ` +
        'Nhiều khả năng bảng mô tả dùng format khác chuẩn, hoặc chưa chạy `/wireframe-ascii`.',
    );
    L.push('');
    L.push('→ Skill KHÔNG được coi là "màn không có element". PHẢI Read tay file mô tả màn.');
    L.push('');
  }

  if (parseWarnings.length) {
    L.push('## ⚠ Bảng mô tả element không bóc được');
    L.push('');
    for (const w of parseWarnings) L.push(`- ${w}`);
    L.push('');
    L.push('→ Skill phải Read tay các file trên (format bảng khác chuẩn 5 cột).');
    L.push('');
  }

  L.push('## Phải đọc tay (engine KHÔNG bóc được)');
  L.push('');
  L.push(`- \`docs/${feature}/srs/${feature}-userflow.md\` — nhánh happy/error/edge + chia flow + primary_device`);
  L.push(`- \`docs/${feature}/usecases/uc-*.md\` — kịch bản chính + nhánh rẽ`);
  L.push('- `docs/design.md` — design token (nếu chưa áp vào prototype)');
  L.push('');
  L.push('Lý do: đây là prose cần phán đoán ngữ nghĩa, không phải bảng cấu trúc.');

  console.log(L.join('\n'));
}

main();
