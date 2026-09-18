#!/usr/bin/env node
// kg-query.mjs — CLI query Knowledge Graph, zero-dependency, Node 18+

import { readFileSync, existsSync, rmSync, renameSync, readdirSync, statSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import process from 'node:process';

const CAP = 40;
const DEFAULT_GRAPH = 'docs/_shared/kg/graph.json';
const DEFAULT_HISTORY_GRAPH = 'docs/_shared/kg/graph-history.json';

function die(message, code = 1) {
  console.error(message);
  process.exit(code);
}

function usage() {
  die(
    'Dùng: node kg-query.mjs <explore|impact|tour|coverage|facts|trace|neighbors|orphans|counts|crud|suspect|cypher|history|asof> [arg] [--graph <path>] [--history-graph <path>] [--depth N] [--feature X] [--all] [--staged] [--unstaged] [--since <ref>]'
  );
}

function parseCli(argv) {
  const opts = {
    graph: DEFAULT_GRAPH, historyGraph: DEFAULT_HISTORY_GRAPH, depth: 3, all: false, feature: null,
    staged: false, unstaged: false, since: null, show: false,
  };
  const positional = [];

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--all') opts.all = true;
    else if (arg === '--graph') opts.graph = argv[++i] || '';
    else if (arg === '--history-graph') opts.historyGraph = argv[++i] || '';
    else if (arg === '--feature') opts.feature = argv[++i] || '';
    else if (arg === '--depth') opts.depth = Number(argv[++i]);
    // impact --staged/--since: seed reverse-closure từ git diff thay vì 1 ID gõ tay.
    else if (arg === '--staged') opts.staged = true;
    else if (arg === '--unstaged') opts.unstaged = true;
    else if (arg === '--since') {
      const ref = argv[++i];
      // Thiếu ref hoặc ref là 1 flag khác → lỗi argument tường minh (F4), KHÔNG để
      // '' lọt xuống git diff thành '..HEAD' rồi báo nhầm "không phải git repo".
      if (!ref || ref.startsWith('--')) die('--since cần một <ref> (vd: --since main)');
      opts.since = ref;
    }
    // asof --show: lấy nội dung requirement tại commit qua git (chậm hơn).
    else if (arg === '--show') opts.show = true;
    else positional.push(arg);
  }

  if (!Number.isInteger(opts.depth) || opts.depth < 0) {
    die('--depth phải là số nguyên không âm');
  }
  if (!opts.graph) die('--graph cần một path');

  return { command: positional[0], arg: positional[1], arg2: positional[2], opts };
}

// Lazy rebuild (plan Mục 3.5): hook kg-refresh.sh touch cờ .dirty khi doc đổi;
// query thấy cờ → rebuild TRƯỚC khi trả lời. Rebuild FAIL → fail-loud,
// TUYỆT ĐỐI không phục vụ graph cũ im lặng.
// Sleep đồng bộ zero-dep (Node main thread cho phép Atomics.wait).
function sleepMs(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function otherProcessingFlags(dir, ownFlag) {
  try {
    return readdirSync(dir)
      .filter((f) => f.startsWith('.dirty.processing-'))
      .map((f) => path.join(dir, f))
      .filter((f) => f !== ownFlag);
  } catch {
    return [];
  }
}

function rebuildIfDirty(graphPath) {
  // Chỉ auto-rebuild target mặc định — --graph override thì engine không biết
  // nguồn build tương ứng, cứ đọc thẳng (fail-loud nếu hỏng).
  if (path.resolve(graphPath) !== path.resolve(DEFAULT_GRAPH)) return;
  const dir = path.dirname(graphPath);
  const dirtyFlag = path.join(dir, '.dirty');
  const processingFlag = `${dirtyFlag}.processing-${process.pid}`;

  // Chờ process khác đang build xong rồi mới quyết định (finding review vòng 2:
  // B thấy .dirty đã bị A consume → return ngay → đọc graph CŨ trong lúc A còn build).
  // Bounded wait ~10s; lock >60s tuổi coi như process chết → dọn + tự build.
  const deadline = Date.now() + 10_000;
  for (;;) {
    const others = otherProcessingFlags(dir, processingFlag);
    if (!others.length) break;
    const stale = others.filter((f) => {
      try { return Date.now() - statSync(f).mtimeMs > 60_000; } catch { return false; }
    });
    if (stale.length === others.length) {
      // Lock chết: chuyển 1 lock thành .dirty (giữ tín hiệu rebuild), dọn phần còn lại.
      try { renameSync(stale[0], dirtyFlag); } catch { rmSync(stale[0], { force: true }); }
      for (const f of stale.slice(1)) rmSync(f, { force: true });
      break;
    }
    if (Date.now() > deadline) {
      die(
        'KG-ERROR: graph không dùng được (build khác đang chạy quá lâu — lock .dirty.processing-* còn tươi) — quay về đọc trực tiếp (Read/grep)',
        2
      );
    }
    sleepMs(200);
  }

  const graphMissing = !existsSync(graphPath);
  if (!existsSync(dirtyFlag) && !graphMissing) return;

  // Chống race: CONSUME cờ bằng rename atomic TRƯỚC khi build — edit xảy ra TRONG lúc
  // build sẽ touch .dirty MỚI (không bị xóa), query sau rebuild tiếp.
  // Chỉ xóa cờ processing của chính mình, không bao giờ rm .dirty sau build.
  if (existsSync(dirtyFlag)) {
    try {
      renameSync(dirtyFlag, processingFlag);
    } catch {
      // Process khác vừa consume đúng khe hở → quay lại chờ nó xong rồi đọc graph mới.
      return rebuildIfDirty(graphPath);
    }
  }

  const buildScript = path.join(path.dirname(fileURLToPath(import.meta.url)), 'kg-build.mjs');
  try {
    execFileSync(process.execPath, [buildScript, '--quiet'], { stdio: ['ignore', 'ignore', 'pipe'] });
    rmSync(processingFlag, { force: true });
  } catch (error) {
    // Build FAIL sau khi đã consume cờ → TRẢ CỜ LẠI, không thì query sau
    // thấy hết dirty và phục vụ graph cũ im lặng (vi phạm fail-loud).
    try {
      if (existsSync(processingFlag) && !existsSync(dirtyFlag)) renameSync(processingFlag, dirtyFlag);
      else rmSync(processingFlag, { force: true });
    } catch { /* giữ nguyên — .dirty mới do edit khác tạo vẫn còn */ }
    const detail = error?.stderr?.toString?.().trim() || error.message;
    die(
      `KG-ERROR: graph không dùng được (rebuild thất bại: ${detail}) — quay về đọc trực tiếp (Read/grep)`,
      2
    );
  }
}

function loadGraph(graphPath) {
  rebuildIfDirty(graphPath);
  let raw;
  try {
    raw = readFileSync(graphPath, 'utf8');
  } catch (error) {
    const reason = error.code === 'ENOENT'
      ? `không tìm thấy ${graphPath}`
      : `không đọc được ${graphPath}: ${error.message}`;
    die(`KG-ERROR: graph không dùng được (${reason}) — quay về đọc trực tiếp (Read/grep)`, 2);
  }

  let graph;
  try {
    graph = JSON.parse(raw);
  } catch (error) {
    die(
      `KG-ERROR: graph không dùng được (JSON.parse lỗi: ${error.message}) — quay về đọc trực tiếp (Read/grep)`,
      2
    );
  }

  if (!graph?.meta || graph.meta.schema_version !== 1) {
    die(
      'KG-ERROR: graph không dùng được (meta.schema_version ≠ 1) — quay về đọc trực tiếp (Read/grep)',
      2
    );
  }
  if (!Array.isArray(graph.nodes) || !Array.isArray(graph.edges)) {
    die(
      'KG-ERROR: graph không dùng được (nodes hoặc edges không đúng array) — quay về đọc trực tiếp (Read/grep)',
      2
    );
  }

  return graph;
}

function buildIndex(graph) {
  const byKey = new Map();
  const out = new Map();
  const incoming = new Map();

  for (const node of graph.nodes) {
    if (node?.key) byKey.set(node.key, node);
  }
  for (const edge of graph.edges) {
    if (!edge?.from || !edge?.to || !edge?.type) continue;
    if (!out.has(edge.from)) out.set(edge.from, []);
    if (!incoming.has(edge.to)) incoming.set(edge.to, []);
    out.get(edge.from).push(edge);
    incoming.get(edge.to).push(edge);
  }

  return { byKey, out, incoming };
}

function md(value) {
  if (value === null || value === undefined || value === '') return '—';
  return String(value).replace(/\|/g, '\\|').replace(/\r?\n/g, '<br>');
}

function nodeFile(node) {
  return node?.source?.file || '—';
}

// Dir project-level không phải feature — tránh scope nhầm footer "Phải Read tay".
// ĐỒNG BỘ với PROJECT_LEVEL_DIRS + EXCLUDED_DIRS của kg-build.mjs.
const NON_FEATURE_DIRS = new Set([
  'cr', 'meetings', 'decisions', 'blockers', 'changes', 'impacts',
  'inbox', 'exports', 'reports', 'guides', 'userguide',
]);

function nodeFeature(node) {
  if (node?.feature) return node.feature;
  const file = nodeFile(node);
  const match = /^docs\/([^/_][^/]*)\//.exec(file);
  if (!match || NON_FEATURE_DIRS.has(match[1])) return null;
  return match[1];
}

function edgeFile(edge) {
  return edge?.source?.file || '—';
}

function propsText(props, key) {
  const value = props?.[key];
  if (Array.isArray(value)) return value.join(', ') || '—';
  return value ?? '—';
}

function rowsTable(headers, rows, all, empty = 'Không có.') {
  if (!rows.length) return `${empty}\n`;

  const shown = all ? rows : rows.slice(0, CAP);
  const lines = [
    `| ${headers.map(md).join(' | ')} |`,
    `| ${headers.map(() => '---').join(' | ')} |`,
    ...shown.map((row) => `| ${row.map(md).join(' | ')} |`)
  ];

  if (!all && rows.length > CAP) {
    lines.push('', `⚠ còn ${rows.length - CAP} mục — chạy với --all để xem hết`);
  }
  return `${lines.join('\n')}\n`;
}

function uniqueSorted(values) {
  return [...new Set(values.filter((value) => value && value !== '—'))].sort((a, b) => a.localeCompare(b));
}

function section(title, content) {
  return `\n### ${title}\n\n${content.trimEnd()}\n`;
}

function levenshtein(a, b) {
  const x = a.toLowerCase();
  const y = b.toLowerCase();
  const prev = Array.from({ length: y.length + 1 }, (_, i) => i);

  for (let i = 1; i <= x.length; i += 1) {
    let diagonal = prev[0];
    prev[0] = i;
    for (let j = 1; j <= y.length; j += 1) {
      const saved = prev[j];
      const cost = x[i - 1] === y[j - 1] ? 0 : 1;
      prev[j] = Math.min(prev[j] + 1, prev[j - 1] + 1, diagonal + cost);
      diagonal = saved;
    }
  }
  return prev[y.length];
}

function suggestions(arg, index) {
  const needle = String(arg).toLowerCase();
  return [...index.byKey.keys()]
    .map((key) => {
      const lower = key.toLowerCase();
      const bonus = lower.includes(needle) ? -1000 : 0;
      return { key, score: bonus + levenshtein(needle, lower) };
    })
    .sort((a, b) => a.score - b.score || a.key.localeCompare(b.key))
    .slice(0, 5)
    .map((item) => item.key);
}

function unresolvedArg(arg, index) {
  const near = suggestions(arg, index);
  const hint = near.length
    ? `\nGần giống (5 gợi ý đầu, lọc từ ${index.byKey.size} key):\n${near.map((key) => `- ${key}`).join('\n')}`
    : '';
  die(`Không tìm thấy '${arg}' — thử: kg counts để xem key mẫu${hint}`);
}

function resolveArg(arg, index, feature) {
  if (!arg) usage();
  if (index.byKey.has(arg)) return index.byKey.get(arg);

  // Slug feature trần → feature node (consumer viết `explore <feature>` tự nhiên).
  if (index.byKey.has(`feature:${arg}`)) return index.byKey.get(`feature:${arg}`);

  // Short-form 1-4 chữ số, so numeric để khớp mọi padding (BO-01 ↔ BO-{f}-01, FR-11 ↔ FR-{f}-011).
  // CR không feature-scoped (CR-{YYYYMMDD}-{NNN}) nên không nằm nhánh này.
  const short = /^(FR|NFR|BR|E|BO|CAP|CHK)-(\d{1,4})$/i.exec(arg);
  if (short && feature) {
    const prefix = `${short[1].toUpperCase()}-${feature}-`;
    const wanted = Number(short[2]);
    const matches = [...index.byKey.keys()].filter(
      (key) => key.startsWith(prefix) && /^\d+$/.test(key.slice(prefix.length)) && Number(key.slice(prefix.length)) === wanted
    );
    if (matches.length === 1) return index.byKey.get(matches[0]);
  }

  const exactSource = [...index.byKey.values()].filter((node) => nodeFile(node) === arg);
  if (exactSource.length === 1) return exactSource[0];
  const exactDoc = exactSource.find((node) => node.type === 'doc');
  if (exactDoc) return exactDoc;

  const tailMatches = [...index.byKey.values()].filter((node) => {
    const keyTail = node.key.split('/').pop();
    return keyTail === arg || node.key.endsWith(`/${arg}`) || node.key.endsWith(`/${arg}#`);
  });
  if (tailMatches.length === 1) return tailMatches[0];

  const prefixMatches = [...index.byKey.values()].filter((node) =>
    node.key.startsWith(arg) || nodeFile(node).startsWith(arg)
  );
  if (prefixMatches.length === 1) return prefixMatches[0];

  unresolvedArg(arg, index);
  return null;
}

function scopedNodes(graph, feature) {
  if (!feature) return graph.nodes;
  return graph.nodes.filter((node) => nodeFeature(node) === feature);
}

function isScopedNode(node, feature) {
  return !feature || nodeFeature(node) === feature;
}

function edgeOther(edge, key) {
  return edge.from === key ? edge.to : edge.from;
}

function allConnectedEdges(index, key) {
  return [...(index.out.get(key) || []), ...(index.incoming.get(key) || [])];
}

function associationExists(graph, index, left, rightType, edgeType) {
  return allConnectedEdges(index, left.key).some((edge) => {
    if (edge.type !== edgeType) return false;
    const other = index.byKey.get(edgeOther(edge, left.key));
    return other?.type === rightType;
  });
}

function scopeCoverageEntries(entries, feature) {
  if (!feature) return entries;
  return entries.filter((entry) => {
    const file = entry?.path || entry?.source?.file || '';
    return file.includes(`docs/${feature}/`);
  });
}

function coverageFooter(graph, feature, condensed = false, extraManual = []) {
  const coverage = graph.meta.coverage || {};
  const unparsed = scopeCoverageEntries(coverage.unparsed_docs || [], feature);
  const uncataloged = scopeCoverageEntries(coverage.uncataloged_content || [], feature);
  const manual = new Map();

  // File Read-tay bổ sung do caller đưa vào (vd staged unmapped: file docs/ đổi
  // KHÔNG map node nào — phải nằm TRONG footer "Phải Read tay", không tách rời F8).
  for (const item of extraManual) {
    if (!item?.path) continue;
    manual.set(item.path, item.reason || 'không map node nào trong graph');
  }

  for (const item of unparsed) {
    if (!item?.path) continue;
    manual.set(item.path, `không parse được: ${item.reason || 'không rõ lý do'}`);
  }
  for (const item of uncataloged) {
    if (!item?.path) continue;
    const existing = manual.get(item.path);
    const reason = 'không index nào catalog';
    manual.set(item.path, existing ? `${existing}; ${reason}` : reason);
  }

  // Doc parse THIẾU MỘT PHẦN (builder biết qua notes/partial_parse_docs) cũng phải Read tay —
  // nếu chỉ dựa parsed-count thì bảng thiếu cột trông y hệt bảng đủ (false-negative im lặng).
  for (const item of scopeCoverageEntries(coverage.partial_parse_docs || [], feature)) {
    const file = item?.path || (typeof item === 'string' ? item : null);
    if (!file) continue;
    const reason = `parse thiếu một phần: ${item?.reason || 'xem notes'}`;
    const existing = manual.get(file);
    manual.set(file, existing ? `${existing}; ${reason}` : reason);
  }

  const notes = (coverage.notes || [])
    .map(String)
    .filter((note) => {
      if (!feature) return true;
      if (note.includes(`docs/${feature}/`) || note.includes(`(${feature})`)) return true;
      if (note.includes('docs/')) return false; // note gắn path feature khác
      if (/\([a-z][a-z0-9-]{2,}\)/.test(note)) return false; // note gắn marker feature khác
      return true; // note toàn cục thật (vd sync-state vắng)
    })
    // Bỏ note đã được thể hiện trong danh sách file phía trên (tránh in đôi cùng thông tin).
    .filter((note) => ![...manual.keys()].some((file) => note.includes(file)));

  const lines = ['### Phải Read tay (ngoài graph)', ''];
  if (condensed) {
    // Lệnh thống-kê (counts) không trả shortlist để Read — footer chỉ cần TÍN HIỆU
    // độ phủ, không cần flood danh sách (danh sách đầy đủ nằm ở coverage/facts/orphans).
    if (manual.size || notes.length) {
      lines.push(
        `- ${manual.size} file cần Read tay + ${notes.length} ghi chú độ phủ — xem chi tiết: kg coverage/facts${feature ? ` ${feature}` : ' <feature>'}`
      );
    }
  } else {
    for (const [file, reason] of [...manual.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
      lines.push(`- ${file} (lý do: ${reason})`);
    }
    for (const note of notes) {
      lines.push(`- ⚠ ${note}`);
    }
  }

  const parsed = coverage.docs_parsed ?? 0;
  const total = coverage.docs_total ?? 0;
  const unresolved = (coverage.unresolved_refs || []).length;
  const syncMissing = coverage.sync_state_present === false || coverage.sync_state === 'missing';
  lines.push(
    `Độ phủ: ${parsed}/${total} doc parse được, ${unresolved} ref chưa resolve${syncMissing ? ', sync-state vắng' : ''}`
  );

  return `\n${lines.join('\n')}\n`;
}

function shortlistSection(files) {
  const list = uniqueSorted(files);
  const body = list.length ? list.map((file) => `- ${file}`).join('\n') : 'Không có file nào được suy ra từ graph.';
  return section('Shortlist file cần Read', `${body}\n`);
}

function collectFiles(nodes, edges = []) {
  return uniqueSorted([
    ...nodes.map(nodeFile),
    ...edges.map(edgeFile)
  ]);
}

function commandExplore(graph, node, index, opts) {
  const incoming = index.incoming.get(node.key) || [];
  const outgoing = index.out.get(node.key) || [];

  let output = `# Explore: ${node.key}\n\n`;
  output += `- Type: \`${node.type || '—'}\`${node.subtype ? ` (${node.subtype})` : ''}\n`;
  output += `- Title: ${node.title || '—'}\n`;
  output += `- Status: ${node.status || '—'}\n`;
  output += `- Feature: ${nodeFeature(node) || '—'}\n`;
  output += `- Source: ${nodeFile(node)}${node?.source?.line ? `:${node.source.line}` : ''}\n`;

  output += section(
    'Upstream edges (ai trỏ tới node này)',
    rowsTable(
      ['key', 'type', 'edge', 'status', 'source file'],
      incoming.map((edge) => {
        const other = index.byKey.get(edge.from);
        return [edge.from, other?.type || 'unknown', edge.type, other?.status || '—', edgeFile(edge)];
      }),
      opts.all
    )
  );

  output += section(
    'Downstream edges (node này trỏ tới ai)',
    rowsTable(
      ['key', 'type', 'edge', 'status', 'source file'],
      outgoing.map((edge) => {
        const other = index.byKey.get(edge.to);
        return [edge.to, other?.type || 'unknown', edge.type, other?.status || '—', edgeFile(edge)];
      }),
      opts.all
    )
  );

  // Review cuối: explore từng là lệnh DUY NHẤT thiếu footer — api-doc/discover gọi nó.
  output += coverageFooter(graph, nodeFeature(node));
  return output;
}

// BFS reverse-closure lõi — nhận NHIỀU seed (1 ID gõ tay, hoặc N node từ git diff
// khi impact --staged). Trả {results, usedEdges}.
// `expandDocRoots`:
//   - true  (explicit `impact <ID|doc-path>`): root type=doc VẪN nở — giữ hành vi cũ
//     (user gõ thẳng 1 doc muốn xem downstream của nó; regression review vòng 2 R1).
//   - false (staged multi-seed): root type=doc là LÁ — vì seedsFromFiles đã seed
//     RIÊNG các artifact-node cùng file; doc-node chỉ để vào shortlist, KHÔNG được nở
//     qua CATALOGS/INHERITS_STATUS_FROM kéo mọi sibling vào (F1).
function impactClosure(roots, index, opts, expandDocRoots = true) {
  const rootKeys = roots.map((r) => r.key);
  const queue = roots
    .filter((r) => expandDocRoots || r?.type !== 'doc')
    .map((r) => ({ key: r.key, depth: 0, path: r.key, via: null }));
  const included = new Set(rootKeys);   // mọi root vẫn vào shortlist (kể cả doc-node lá)
  const expanded = new Set(rootKeys);
  const results = [];
  const usedEdges = [];

  while (queue.length) {
    const current = queue.shift();
    if (current.depth >= opts.depth) continue;

    for (const edge of index.incoming.get(current.key) || []) {
      const nextKey = edge.from;

      const next = {
        key: nextKey,
        depth: current.depth + 1,
        path: `${nextKey} -${edge.type}→ ${current.path}`,
        via: edge
      };

      if (!included.has(nextKey)) {
        included.add(nextKey);
        results.push(next);
        usedEdges.push(edge);
      }

      // 2 quy tắc chặn nở-toàn-feature (đo thật: thiếu chúng saving = -7%):
      // (a) Edge heuristic (bare-ID nhắc trong prose) = LÁ — doc nhắc tới node vẫn vào
      //     shortlist (tương đương value-sweep) nhưng không nở transitive qua mention.
      // (b) Node type=doc (spec/index/flows...) = LÁ — file vào shortlist, nhưng không
      //     nở tiếp: index CATALOGS mọi content + siblings INHERITS ngược qua index/spec
      //     làm mọi us/uc anh em bị kéo vào dù không liên quan thay đổi.
      //     Impact nở qua ARTIFACT node (FR/UC/US/AC/screen/flow/entity/state/test...).
      const nextNode = index.byKey.get(nextKey);
      const expandable = edge.provenance !== 'heuristic' && nextNode?.type !== 'doc';
      if (expandable && !expanded.has(nextKey)) {
        expanded.add(nextKey);
        queue.push(next);
      }
    }
  }

  return { results, usedEdges };
}

function commandImpact(root, index, opts) {
  const { results, usedEdges } = impactClosure([root], index, opts);

  const resultNodes = [root, ...results.map((item) => index.byKey.get(item.key)).filter(Boolean)];
  let output = `# Impact: ${root.key}\n\n`;
  output += `Reverse closure BFS, depth tối đa: ${opts.depth}.\n`;
  output += section(
    'Node bị ảnh hưởng',
    rowsTable(
      ['depth', 'node', 'type', 'edge-path', 'status', 'file'],
      results.map((item) => {
        const node = index.byKey.get(item.key);
        return [item.depth, item.key, node?.type || 'unknown', item.path, node?.status || '—', nodeFile(node)];
      }),
      opts.all,
      'Không có node phụ thuộc trong độ sâu đã chọn.'
    )
  );
  output += shortlistSection(collectFiles(resultNodes, usedEdges));
  output += coverageFooter({ meta: { coverage: root.__graphCoverage || {} } }, nodeFeature(root));

  return output;
}

// ── impact --staged / --since : seed từ git diff ────────────────────────────
// Lấy file docs/** đổi trong git → seed node/ID → BFS union. Fail-loud nếu không
// phải git repo. Giữ contract: chỉ trả shortlist file cần Read, KHÔNG kết luận.
function gitCmd(args) {
  try {
    return execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  } catch (error) {
    const detail = error?.stderr?.toString?.().trim() || error.message;
    die(`KG-ERROR: không lấy được git (${detail}) — không phải git repo, hoặc <ref> sai? Thử: impact <ID>`, 2);
  }
  return '';
}

// Parse output `git diff --name-status -z` (path THÔ relative-root — F2/F12): lấy
// CẢ old+new khi rename/copy (F3), giữ status D (F11). Gộp path vào set `into`.
function parseNameStatusZ(raw, into) {
  const toks = raw.split('\0').filter((t) => t.length);
  for (let i = 0; i < toks.length; ) {
    const status = toks[i]; i += 1;
    if (!/^[A-Z]/.test(status)) continue; // bỏ token lạ
    if (/^[RC]/.test(status)) {
      const oldP = toks[i]; const newP = toks[i + 1]; i += 2;
      if (oldP) into.add(oldP);
      if (newP) into.add(newP);
    } else {
      const p = toks[i]; i += 1;
      if (p) into.add(p);
    }
  }
}

// Lấy file đổi theo mode, chạy TỪ repo-root (-C root — F12). UNION change-set thật
// thay vì 1 lệnh diff HEAD (R3): staged=index, unstaged=working-tree+untracked.
//   --staged           → index (diff --cached)
//   --unstaged đơn lẻ  → working-tree (diff) + untracked (ls-files --others) — R2
//   --staged --unstaged→ union(index, working-tree, untracked)
//   --since <ref>      → diff <ref>..HEAD
function gitChangedFiles(opts) {
  const root = gitCmd(['rev-parse', '--show-toplevel']).trim();
  const C = root ? ['-C', root] : [];
  const files = new Set();

  if (opts.since) {
    parseNameStatusZ(gitCmd([...C, 'diff', '--name-status', '-z', `${opts.since}..HEAD`]), files);
    return [...files].map((s) => s.replaceAll('\\', '/'));
  }

  if (opts.staged) parseNameStatusZ(gitCmd([...C, 'diff', '--name-status', '-z', '--cached']), files);
  if (opts.unstaged) {
    parseNameStatusZ(gitCmd([...C, 'diff', '--name-status', '-z']), files); // working-tree vs index
    // Untracked (file mới chưa add) — diff KHÔNG thấy chúng (R2).
    const others = gitCmd([...C, 'ls-files', '--others', '--exclude-standard', '-z']);
    for (const p of others.split('\0')) if (p) files.add(p);
  }
  return [...files].map((s) => s.replaceAll('\\', '/'));
}

// Path KG THẬT ingest như NGUỒN — MIRROR CHÍNH XÁC walk-scope kg-build visit()
// (kg-build.mjs): CHỈ .md (bất kỳ); .dbml chỉ {feature}/dbdiagram/{feature}.dbml;
// .ir/.src.json chỉ khi path có segment 'bpmn'. + EXCLUDED_DIRS trên segment top-level
// dưới docs/. KHÔNG loại "dot-segment" (builder không loại dir ẩn — file vô-nghĩa như
// docs/_shared/.status-state/abc123 tự rớt vì không khớp ext).
// KHÔNG tính .spec.ts: builder KHÔNG walk file .spec.ts như nguồn (node e2e_spec sinh
// TỪ LINK trong e2e-index; .spec.ts là auto-gen, không phải nguồn) — review vòng 4 M3.
const KG_EXCLUDE_SEG = new Set(['exports', 'inbox', 'reports', '_regen-sample', 'guides']);
function isGraphIngestedPath(norm) {
  const segs = norm.split('/'); // segs[0]='docs'
  if (segs.length > 1 && KG_EXCLUDE_SEG.has(segs[1])) return false;   // docs/<excluded>/...
  const relUnderDocs = segs.slice(1).join('/');                       // bỏ prefix 'docs/'
  if (norm.endsWith('.md')) return true;
  if (norm.endsWith('.dbml')) return /^([^/]+)\/dbdiagram\/\1\.dbml$/.test(relUnderDocs);
  if (norm.endsWith('.ir.json') || norm.endsWith('.src.json')) return segs.includes('bpmn');
  return false;
}

// File → seed node key. Ưu tiên ID node (source.file === file) để BFS nở qua
// artifact; doc node của chính file cũng vào (là lá, chỉ để vào shortlist).
function seedsFromFiles(files, graph, index) {
  const seeds = new Map();          // key → node
  const docsFiles = [];             // file docs/ có đổi (để header)
  const outOfScope = [];            // file ngoài docs/ HOẶC không phải loại KG ingest
  const unmapped = [];              // file docs/ ingest được nhưng không map node (Read tay)

  const bySource = new Map();
  for (const node of graph.nodes) {
    const f = node?.source?.file;
    if (!f) continue;
    if (!bySource.has(f)) bySource.set(f, []);
    bySource.get(f).push(node);
  }

  for (const file of files) {
    const norm = path.posix.normalize(file.replaceAll('\\', '/'));
    // Ngoài docs/ HOẶC không phải loại KG ingest (ảnh, .status-state, .html render...) → bỏ.
    if (!norm.startsWith('docs/') || !isGraphIngestedPath(norm)) { outOfScope.push(norm); continue; }
    docsFiles.push(norm);

    // bpmn .src.json là SIDECAR — builder enrich node .ir.json cùng basename (không tạo
    // node riêng cho .src.json). Map về .ir.json để seed đúng bpmn_process (M2).
    const lookup = norm.endsWith('.src.json') ? norm.replace(/\.src\.json$/, '.ir.json') : norm;

    const bySrc = bySource.get(lookup) || [];
    const docNode = index.byKey.get(lookup);       // doc/process node key = path
    const hits = [...bySrc];
    if (docNode) hits.push(docNode);

    if (!hits.length) { unmapped.push(norm); continue; }
    for (const node of hits) if (node?.key) seeds.set(node.key, node);
  }

  return { seeds: [...seeds.values()], docsFiles, outOfScope, unmapped };
}

function commandImpactStaged(graph, index, opts) {
  const files = gitChangedFiles(opts);
  const scopeLabel = opts.since ? `--since ${opts.since}` : opts.staged && opts.unstaged ? '--staged --unstaged' : opts.staged ? '--staged' : '--unstaged';

  if (!files.length) {
    // Footer bắt buộc kể cả khi rỗng (F7): impact luôn giữ "Phải Read tay" + "Độ phủ".
    let empty = `# Impact (${scopeLabel})\n\nKhông có file thay đổi trong phạm vi git đã chọn.\n> Thử: impact --staged --unstaged (gồm working-tree) · impact --since <ref> (so nhánh) · impact <ID> (thủ công).\n`;
    empty += coverageFooter(graph, null);
    return empty;
  }

  const { seeds, docsFiles, outOfScope, unmapped } = seedsFromFiles(files, graph, index);

  // Staged: doc-node là LÁ (expandDocRoots=false) — artifact-node cùng file đã seed
  // riêng để nở; doc-node chỉ vào shortlist, không kéo sibling qua CATALOGS/INHERITS.
  const { results, usedEdges } = seeds.length ? impactClosure(seeds, index, opts, false) : { results: [], usedEdges: [] };

  const seedNodes = seeds;
  const resultNodes = [...seedNodes, ...results.map((item) => index.byKey.get(item.key)).filter(Boolean)];

  let output = `# Impact (${scopeLabel}): ${docsFiles.length} file docs/ đổi → ${seeds.length} seed\n\n`;
  output += `Reverse closure BFS, depth tối đa: ${opts.depth}.\n`;

  output += section(
    'Seed (từ file đổi)',
    rowsTable(
      ['seed', 'type', 'file'],
      seedNodes.map((n) => [n.key, n.type || 'unknown', nodeFile(n)]),
      opts.all,
      'Không có seed map được từ file đổi.'
    )
  );

  output += section(
    'Node bị ảnh hưởng',
    rowsTable(
      ['depth', 'node', 'type', 'edge-path', 'status', 'file'],
      results.map((item) => {
        const node = index.byKey.get(item.key);
        return [item.depth, item.key, node?.type || 'unknown', item.path, node?.status || '—', nodeFile(node)];
      }),
      opts.all,
      'Không có node phụ thuộc trong độ sâu đã chọn.'
    )
  );

  output += shortlistSection(collectFiles(resultNodes, usedEdges));

  // File ngoài docs/ — note TRƯỚC footer (footer phải là khối chốt cuối, F8).
  if (outOfScope.length) {
    output += `\n> ${outOfScope.length} file ngoài docs/ — bỏ qua khỏi graph.\n`;
  }

  // Footer LÀ KHỐI CUỐI (F8): fold file docs/ chưa-map-node vào "Phải Read tay"
  // (F8 — không tách section rời sau footer). Feature scope: CHỈ scope theo 1 feature
  // khi MỌI seed cùng feature đó VÀ không seed nào project-level (R4 — trước đây
  // uniqueSorted lọc '' làm seed project-level bị bỏ, footer scope nhầm giấu coverage
  // của doc _shared/dùng chung). Có seed không-feature → null (footer toàn cục).
  const featVals = seedNodes.map((n) => nodeFeature(n));
  const anyProjectLevel = featVals.some((f) => !f);
  const distinctFeats = [...new Set(featVals.filter(Boolean))];
  const footerFeature = !anyProjectLevel && distinctFeats.length === 1 ? distinctFeats[0] : null;
  const extraManual = unmapped.map((f) => ({ path: f, reason: 'file docs/ đổi nhưng không map node nào trong graph' }));
  output += coverageFooter(graph, footerFeature, false, extraManual);

  return output;
}

// ── tour <feature> : lộ trình đọc tài liệu theo thứ tự phụ thuộc ────────────
// Xương sống = rank tầng vòng đời tài liệu (brainstorm→urd→brd→prd→srs→uc→us/ac
// →flow/screen→test). Trong cùng tầng: topo cục bộ theo edge phụ thuộc thật
// (UC nhiều US-DERIVES đọc trước). Giữ contract: cột "Vì sao" = nhãn cạnh, KHÔNG
// tóm tắt nội dung. Node không nối được vào chuỗi → mục "Nhánh chưa nối".

// Rank tầng theo doc_type của doc-node (props.doc_type). Số nhỏ = đọc trước.
const TOUR_DOC_RANK = {
  brainstorm: 10,
  research: 12,
  urd: 20,
  brd: 30,
  'prd-product': 35, prd: 38, 'prd-epic': 38,
  srs: 40, 'srs-erd': 44, 'srs-states': 45, 'srs-flows': 46,
  'usecase-index': 50, 'srs-userflow': 55,
  'userstory-index': 60,
  'screen-index': 65, 'wireframe-html-index': 66, 'dbdiagram-index': 48,
  'test-checklist-index': 80, 'api-checklist': 82,
  'test-cases-index': 84, 'api-tests': 85,
  'e2e-index': 88,
  'userguide-index': 90,
};
// Rank tầng theo node.type cho artifact-node (uc/us — file riêng, không doc-node cùng tier).
// AC KHÔNG vào tour: nó inline trong file us-*.md, không phải file đọc riêng — đọc US là thấy AC.
const TOUR_TYPE_RANK = {
  use_case: 50,
  user_story: 60,
};

function tourRank(node) {
  if (node.type === 'doc') return TOUR_DOC_RANK[node?.props?.doc_type] ?? null;
  return TOUR_TYPE_RANK[node.type] ?? null;
}

// Tập cạnh phụ thuộc THẬT vào node (không phải mọi cạnh — CATALOGS/INHERITS...
// không tính). Dùng để sắp trong cùng tầng: được-nhiều-thứ-phụ-thuộc → đọc trước.
const TOUR_DEP_EDGES = new Set(['DERIVES', 'COVERS', 'ELABORATES', 'VERIFIES', 'DISPLAYS', 'SATISFIES']);
// Weight: DERIVES/COVERS/ELABORATES = 2 (cạnh "chảy qua" chuỗi vòng đời — bao nhiêu
// backlog/spec phụ thuộc node này, tín hiệu trung tâm nhất). Các cạnh dep khác = 1.
// Cạnh dep KHÔNG liệt kê riêng vẫn = 1 (không phải 0 — mọi dep-edge đều đáng đếm, F5).
const TOUR_DEP_WEIGHT2 = new Set(['DERIVES', 'COVERS', 'ELABORATES']);
function tourInDegree(index, key) {
  return (index.incoming.get(key) || []).reduce((sum, e) => {
    if (!TOUR_DEP_EDGES.has(e.type)) return sum;
    return sum + (TOUR_DEP_WEIGHT2.has(e.type) ? 2 : 1);
  }, 0);
}

// Lý do 1 node ở bước này = NHÃN CẠNH phụ thuộc (đếm theo type + chiều), KHÔNG diễn
// giải nội dung (contract 3.4bis, F6). Xét CẢ 2 chiều (review vòng 5 T2): incoming =
// "được thứ khác phụ thuộc" (←), outgoing = "phụ thuộc thứ khác" (→) — nếu chỉ xét
// incoming thì US (có US→UC DERIVES, US→FR COVERS outgoing) luôn ra "—" dù có quan hệ
// thật. Deterministic: gộp theo (chiều,type) + sort ổn định, không dựa edge[0] (F10).
function tourReason(node, index) {
  const byKey = new Map(); // "dir type" → count
  const add = (edges, dir) => {
    for (const e of edges || []) {
      if (!TOUR_DEP_EDGES.has(e.type)) continue;
      const k = `${dir}${e.type}`;
      byKey.set(k, (byKey.get(k) || 0) + 1);
    }
  };
  add(index.incoming.get(node.key), '←'); // ai phụ thuộc node này
  add(index.out.get(node.key), '→');      // node này phụ thuộc ai
  if (!byKey.size) return '—';
  const parts = [...byKey.entries()]
    .map(([k, n]) => ({ dir: k[0], type: k.slice(1), n }))
    // Sort: weight cao trước, rồi count, rồi (chiều, type) — ổn định deterministic.
    .sort((a, b) =>
      (TOUR_DEP_WEIGHT2.has(b.type) ? 2 : 1) - (TOUR_DEP_WEIGHT2.has(a.type) ? 2 : 1) ||
      b.n - a.n || a.dir.localeCompare(b.dir) || a.type.localeCompare(b.type))
    .map(({ dir, type, n }) => `${dir}${n}×${type}`);
  return parts.join(', ');
}

function commandTour(graph, index, feature, opts) {
  const nodes = scopedNodes(graph, feature).filter((n) => n.type === 'doc' || tourRank(n) !== null);

  const ranked = [];
  const unlinked = [];
  for (const node of nodes) {
    const rank = tourRank(node);
    if (rank === null) { unlinked.push(node); continue; }
    ranked.push(node);
  }

  ranked.sort((a, b) => {
    const ra = tourRank(a);
    const rb = tourRank(b);
    if (ra !== rb) return ra - rb;
    // Cùng tầng: nhiều dependency-in-degree đọc trước; hoà thì theo key (deterministic).
    const da = tourInDegree(index, a.key);
    const db = tourInDegree(index, b.key);
    if (da !== db) return db - da;
    return a.key.localeCompare(b.key);
  });

  // Lộ trình = danh sách FILE đọc; 1 file chỉ xuất hiện 1 lần (giữ node hạng cao nhất
  // — nhiều node cùng file như index doc thì bước đầu tiên đại diện).
  const seenFile = new Set();
  const dedupRanked = ranked.filter((node) => {
    const f = nodeFile(node);
    if (f === '—' || seenFile.has(f)) return false;
    seenFile.add(f);
    return true;
  });
  ranked.length = 0;
  ranked.push(...dedupRanked);

  // "Nhánh chưa nối" = file có node KHÔNG rank tầng — NHƯNG loại file đã nằm trong lộ
  // trình (cùng file có thể vừa có artifact-node ranked vừa có doc-node unranked → tránh
  // in 1 file ở CẢ 2 chỗ, F9). Cũng dedup file trong chính unlinked.
  const seenUnlinked = new Set();
  const unlinkedFiles = unlinked.filter((node) => {
    const f = nodeFile(node);
    if (f === '—' || seenFile.has(f) || seenUnlinked.has(f)) return false;
    seenUnlinked.add(f);
    return true;
  });

  let output = `# Tour: ${feature} (${ranked.length} tài liệu trong lộ trình, ${unlinkedFiles.length} phụ)\n\n`;
  output += `Lộ trình đọc theo TẦNG vòng đời tài liệu (thượng nguồn → hạ nguồn); trong cùng tầng sắp theo số quan hệ phụ thuộc. Cột "Vì sao" là nhãn cạnh graph (← được thứ khác phụ thuộc · → phụ thuộc thứ khác), KHÔNG phải tóm tắt nội dung — đọc file để hiểu.\n`;

  output += section(
    'Lộ trình đọc',
    rowsTable(
      ['#', 'đọc file', 'loại', 'vì sao bước này', 'trạng thái'],
      ranked.map((node, i) => [
        i + 1,
        nodeFile(node),
        node.type === 'doc' ? (node?.props?.doc_type || 'doc') : node.type,
        tourReason(node, index),
        node.status || '—',
      ]),
      opts.all,
      'Feature chưa có tài liệu nào nối vào chuỗi phụ thuộc.'
    )
  );

  if (unlinkedFiles.length) {
    output += section(
      'Tài liệu phụ (không thuộc tầng vòng đời — đọc kèm theo nhu cầu)',
      rowsTable(
        ['file', 'loại'],
        unlinkedFiles
          // tie-break theo key để deterministic khi cùng file/cùng '—' (F10).
          .sort((a, b) => nodeFile(a).localeCompare(nodeFile(b)) || a.key.localeCompare(b.key))
          .map((node) => [nodeFile(node), node.type === 'doc' ? (node?.props?.doc_type || 'doc') : node.type]),
        opts.all
      )
    );
  }

  output += coverageFooter(graph, feature);
  return output;
}

function coverageSections(graph, index, feature, all) {
  const nodes = scopedNodes(graph, feature);
  const frs = nodes.filter((node) => node.type === 'requirement' && node.subtype === 'FR');
  const ucs = nodes.filter((node) => node.type === 'use_case');
  const errors = nodes.filter((node) => node.type === 'error');
  const stories = nodes.filter((node) => node.type === 'user_story');
  const screens = nodes.filter((node) => node.type === 'screen');

  const missingUs = frs.filter((fr) => !associationExists(graph, index, fr, 'user_story', 'COVERS'));
  const missingAc = frs.filter((fr) => !associationExists(graph, index, fr, 'acceptance_criterion', 'VERIFIES'));
  const missingScreen = ucs.filter((uc) => !associationExists(graph, index, uc, 'screen', 'DISPLAYS'));
  const missingRaise = errors.filter((error) =>
    !allConnectedEdges(index, error.key).some((edge) => {
      if (edge.type !== 'RAISES') return false;
      const other = index.byKey.get(edgeOther(edge, error.key));
      return other?.type === 'use_case' || other?.type === 'acceptance_criterion';
    })
  );

  const hasDerives = graph.edges.some((edge) => edge.type === 'DERIVES');
  const missingUc = hasDerives
    ? stories.filter((story) => !associationExists(graph, index, story, 'use_case', 'DERIVES'))
    : [];

  const missingFlow = screens.filter((screen) => !associationExists(graph, index, screen, 'flow', 'CONTAINS'));

  // Anti-join mới theo test-chain + RENDERS (Phase 4) — chỉ chạy khi graph CÓ nguồn
  // tương ứng (pattern hasDerives): thiếu nguồn ≠ thiếu coverage.
  const hasChk = graph.nodes.some((node) => node.type === 'test_checklist_item');
  const missingChk = hasChk
    ? frs.filter((fr) => !associationExists(graph, index, fr, 'test_checklist_item', 'VERIFIES'))
    : [];
  const hasRender = graph.nodes.some((node) => node.type === 'render_artifact');
  const missingRender = hasRender
    ? screens.filter((screen) => !associationExists(graph, index, screen, 'render_artifact', 'RENDERS'))
    : [];

  const entries = [
    ['FR không có US Covers', missingUs],
    ['FR không có AC Verifies', missingAc],
    ['FR không có checklist VERIFIES', missingChk],
    ['UC không có screen DISPLAYS', missingScreen],
    ['E không có UC/AC Raises', missingRaise],
    ['US không có UC DERIVES', missingUc],
    ['Screen không có flow CONTAINS', missingFlow],
    ['Screen không có render (RENDERS)', missingRender]
  ];

  let output = '';
  for (const [title, list] of entries) {
    const skippedNote =
      (title.startsWith('US') && !hasDerives && 'Graph không có edge DERIVES; kiểm tra này được bỏ qua.\n') ||
      (title.includes('checklist') && !hasChk && 'Graph không có test_checklist_item (docs chưa có checklist format CHK); kiểm tra này được bỏ qua.\n') ||
      (title.includes('render') && !hasRender && 'Graph không có render_artifact (index chưa điền cột Figma/HTML); kiểm tra này được bỏ qua.\n');
    const note = skippedNote
      ? skippedNote
      : rowsTable(
        ['key', 'type', 'title', 'status', 'file'],
        list.map((node) => [node.key, node.type, node.title || '—', node.status || '—', nodeFile(node)]),
        all
      );
    output += section(`${title} (${list.length})`, note);
  }

  return { output, missingNodes: entries.flatMap(([, list]) => list) };
}

function commandCoverage(graph, index, feature, opts) {
  const { output: sections, missingNodes } = coverageSections(graph, index, feature, opts.all);
  let output = `# Coverage: ${feature}\n`;
  output += sections;
  output += shortlistSection(collectFiles(missingNodes));
  output += coverageFooter(graph, feature);
  return output;
}

function commandFacts(graph, index, feature, opts) {
  const nodes = scopedNodes(graph, feature);
  const counts = new Map();
  for (const node of nodes) counts.set(node.type, (counts.get(node.type) || 0) + 1);

  const frs = nodes.filter((node) => node.type === 'requirement' && node.subtype === 'FR');
  const ucs = nodes.filter((node) => node.type === 'use_case');
  const stories = nodes.filter((node) => node.type === 'user_story');
  const screens = nodes.filter((node) => node.type === 'screen');
  const entities = nodes.filter((node) => node.type === 'entity');
  const openQuestions = nodes.filter((node) =>
    node.type === 'open_question' && !['closed', 'resolved', 'answered', 'deferred', 'waived'].includes(String(node.status || '').toLowerCase())
  );

  let output = `# Facts: ${feature}\n\n`;
  output += '⚠ facts = cấu trúc để định tuyến — KHÔNG thay việc Read prose (contract 3.4bis).\n';
  output += section(
    'Đếm node theo type',
    rowsTable(
      ['type', 'count'],
      [...counts.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([type, count]) => [type, count]),
      opts.all
    )
  );
  output += section(
    `FR (${frs.length})`,
    rowsTable(['ID', 'title', 'status'], frs.map((n) => [n.key, n.title || '—', n.status || '—']), opts.all)
  );
  output += section(
    `UC (${ucs.length})`,
    rowsTable(
      ['slug', 'covers'],
      ucs.map((uc) => {
        const covers = allConnectedEdges(index, uc.key)
          .filter((edge) => edge.type === 'COVERS')
          .map((edge) => edgeOther(edge, uc.key))
          .join(', ') || '—';
        return [uc.key, covers];
      }),
      opts.all
    )
  );
  output += section(
    `US (${stories.length})`,
    rowsTable(
      ['ID', 'covers', 'status', 'jira'],
      stories.map((story) => {
        const covers = allConnectedEdges(index, story.key)
          .filter((edge) => edge.type === 'COVERS')
          .map((edge) => edgeOther(edge, story.key))
          .join(', ') || '—';
        return [story.key, covers, story.status || '—', propsText(story.props, 'jira_key')];
      }),
      opts.all
    )
  );
  output += section(
    `Screens theo flow (${screens.length})`,
    rowsTable(
      ['screen', 'flow'],
      screens.map((screen) => {
        const flows = allConnectedEdges(index, screen.key)
          .filter((edge) => edge.type === 'CONTAINS')
          .map((edge) => {
            const other = index.byKey.get(edgeOther(edge, screen.key));
            return other?.type === 'flow' ? other.key : null;
          })
          .filter(Boolean)
          .join(', ') || '—';
        return [screen.key, flows];
      }),
      opts.all
    )
  );
  output += section(
    `Entities (${entities.length})`,
    rowsTable(['key', 'title', 'status'], entities.map((n) => [n.key, n.title || '—', n.status || '—']), opts.all)
  );
  output += section(
    `OQ open (${openQuestions.length})`,
    rowsTable(
      ['key', 'title', 'status', 'file'],
      openQuestions.map((n) => [n.key, n.title || '—', n.status || '—', nodeFile(n)]),
      opts.all
    )
  );

  output += shortlistSection(collectFiles(nodes));
  output += coverageFooter(graph, feature);
  return output;
}

function commandNeighbors(graph, index, doc, opts) {
  const edges = allConnectedEdges(index, doc.key);
  const groups = new Map();

  for (const edge of edges) {
    const otherKey = edgeOther(edge, doc.key);
    if (!groups.has(edge.type)) groups.set(edge.type, []);
    groups.get(edge.type).push({ edge, other: index.byKey.get(otherKey), otherKey });
  }

  let output = `# Neighbors: ${doc.key}\n`;
  for (const [type, list] of [...groups.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    output += section(
      `${type} (${list.length})`,
      rowsTable(
        ['key', 'type', 'status', 'file'],
        list.map(({ other, otherKey }) => [otherKey, other?.type || 'unknown', other?.status || '—', nodeFile(other)]),
        opts.all
      )
    );
  }

  const nodes = [doc, ...edges.map((edge) => index.byKey.get(edgeOther(edge, doc.key))).filter(Boolean)];
  output += shortlistSection(collectFiles(nodes, edges));
  output += coverageFooter(graph, nodeFeature(doc));
  return output;
}

function commandOrphans(graph, index, feature, opts) {
  const nodes = scopedNodes(graph, feature);
  const isolated = nodes.filter((node) =>
    !['doc', 'feature'].includes(node.type) && allConnectedEdges(index, node.key).length === 0
  );
  const docsWithoutLinks = nodes.filter((node) => {
    if (node.type !== 'doc') return false;
    const declared = node.props?.links;
    if (Array.isArray(declared)) return declared.length === 0;
    return allConnectedEdges(index, node.key).length === 0;
  });

  let output = `# Orphans${feature ? `: ${feature}` : ''}\n`;
  output += section(
    `Node không có edge (${isolated.length})`,
    rowsTable(
      ['key', 'type', 'title', 'status', 'file'],
      isolated.map((n) => [n.key, n.type, n.title || '—', n.status || '—', nodeFile(n)]),
      opts.all
    )
  );
  output += section(
    `Doc không có links (${docsWithoutLinks.length})`,
    rowsTable(
      ['path', 'status', 'title'],
      docsWithoutLinks.map((n) => [n.key, n.status || '—', n.title || '—']),
      opts.all
    )
  );
  output += coverageFooter(graph, feature);
  return output;
}

function commandCounts(graph, index, feature, opts) {
  const nodes = scopedNodes(graph, feature);
  const nodeKeys = new Set(nodes.map((node) => node.key));
  const edges = feature
    ? graph.edges.filter((edge) => nodeKeys.has(edge.from) || nodeKeys.has(edge.to))
    : graph.edges;

  const nodeCounts = new Map();
  const edgeCounts = new Map();
  for (const node of nodes) nodeCounts.set(node.type, (nodeCounts.get(node.type) || 0) + 1);
  for (const edge of edges) edgeCounts.set(edge.type, (edgeCounts.get(edge.type) || 0) + 1);

  const stale = nodes.filter((node) => node.status === 'stale').length;
  const coverage = coverageSections(graph, index, feature, true);
  const missingCount = coverage.missingNodes.length;

  let output = `# Counts${feature ? `: ${feature}` : ''}\n`;
  output += section(
    `Nodes (${nodes.length})`,
    rowsTable(
      ['type', 'count'],
      [...nodeCounts.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([type, count]) => [type, count]),
      opts.all
    )
  );
  output += section(
    `Edges (${edges.length})`,
    rowsTable(
      ['type', 'count'],
      [...edgeCounts.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([type, count]) => [type, count]),
      opts.all
    )
  );
  // Tách stale DOC khỏi stale node artifact — dashboard/health đo theo đơn vị doc;
  // trộn 2 loại làm sai đèn (finding review Phase 2).
  const staleDocs = nodes.filter((n) => n.type === 'doc' && String(n.status || '').toLowerCase() === 'stale');
  output += section(
    'Coverage summary',
    [
      `- Finding coverage thiếu: ${missingCount}`,
      `- Doc status=stale (stale_docs): ${staleDocs.length}`,
      `- Node status=stale mọi loại (gồm artifact kế thừa): ${stale}`,
      `- FR không US Covers: ${coverage.missingNodes.filter((n) => n.type === 'requirement').length}`,
      `- Tổng node scope: ${nodes.length}`,
      `- Tổng edge scope: ${edges.length}`
    ].join('\n')
  );
  output += coverageFooter(graph, feature, true);
  return output;
}

// Feature không tồn tại trong graph → PHẢI die, không được trả "0 gap" sạch (false-negative im lặng).
function assertFeatureExists(graph, index, feature) {
  if (!feature) return;
  // Danh sách hợp lệ = HỢP của feature-node và mọi node.feature — cùng 1 nguồn cho
  // cả kiểm tra lẫn thông báo lỗi (tránh 'pricing' pass kiểm nhưng vắng trong list).
  const valid = new Set(
    graph.nodes.filter((node) => node.type === 'feature').map((node) => node.key.replace(/^feature:/, ''))
  );
  for (const node of graph.nodes) if (node.feature) valid.add(node.feature);
  if (valid.has(feature)) return;
  const features = [...valid].sort();
  const near = suggestions(feature, index);
  const hint = near.length ? `\nGần giống: ${near.join(', ')}` : '';
  die(
    `Không tìm thấy feature '${feature}' trong graph — KHÔNG kết luận gì từ kết quả rỗng.\nFeature hợp lệ: ${features.join(', ')}${hint}\nFeature vừa tạo? Rebuild: node .claude/skills/kg/engine/kg-build.mjs`
  );
}

// Dump TOÀN BỘ edge của 1 feature (from|type|to|provenance|nguồn) + broken refs —
// dữ liệu cấu trúc đầy đủ cho ma trận truy vết /gap (coverage/facts không đủ quan hệ
// BO/CAP/NFR/BR — finding review Phase 2).
function commandTrace(graph, index, feature, opts) {
  const inScope = (edge) => {
    const fromNode = index.byKey.get(edge.from);
    const toNode = index.byKey.get(edge.to);
    return (
      fromNode?.feature === feature ||
      toNode?.feature === feature ||
      (edge.source?.file || '').includes(`docs/${feature}/`)
    );
  };
  const edges = graph.edges.filter(inScope);

  const byType = new Map();
  for (const edge of edges) {
    if (!byType.has(edge.type)) byType.set(edge.type, []);
    byType.get(edge.type).push(edge);
  }

  let output = `# Trace: ${feature}\n\nTổng ${edges.length} edge trong scope.\n`;
  for (const [type, list] of [...byType.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    output += section(
      `${type} (${list.length})`,
      rowsTable(
        ['from', 'to', 'provenance', 'nguồn'],
        list.map((e) => [e.from, e.to, e.provenance, `${edgeFile(e)}:${e.source?.line || 1}`]),
        opts.all
      )
    );
  }

  const broken = (graph.meta.coverage?.unresolved_refs || []).filter(
    (r) => (r.source?.file || '').includes(`docs/${feature}/`) || String(r.ref).includes(`-${feature}-`)
  );
  output += section(
    `Broken refs (${broken.length})`,
    rowsTable(
      ['ref', 'nguồn'],
      broken.map((r) => [r.ref, `${r.source?.file || '—'}:${r.source?.line || 1}`]),
      opts.all
    )
  );
  output += coverageFooter(graph, feature);
  return output;
}

function resolveEntityArg(arg, index, feature) {
  const raw = String(arg);
  const needle = raw.replace(/^entity:/i, '');
  const rawLower = raw.toLowerCase();
  const needleLower = needle.toLowerCase();

  const matches = [...index.byKey.values()].filter((node) => {
    if (node.type !== 'entity') return false;
    if (feature && nodeFeature(node) !== feature) return false;

    const key = String(node.key || '');
    const tail = key.replace(/^entity:/, '');
    const title = String(node.title || '');
    const candidates = [key, tail, title].map((value) => value.toLowerCase());

    return candidates.some((value) =>
      value === rawLower ||
      value === needleLower ||
      value.endsWith(`/${rawLower}`) ||
      value.endsWith(`/${needleLower}`)
    );
  });

  if (matches.length === 1) return matches[0];
  if (matches.length > 1) {
    die(
      `'${arg}' khớp ${matches.length} entity — thêm --feature hoặc dùng entity:<feature>/CanonicalName để chọn rõ`
    );
  }

  unresolvedArg(arg, index);
  return null;
}

function sourceLocation(edge) {
  return `${edgeFile(edge)}:${edge?.source?.line || 1}`;
}

function crudEdges(graph, index, feature) {
  return graph.edges.filter((edge) => {
    if (edge.type !== 'OPERATES_ON') return false;
    if (!feature) return true;

    const from = index.byKey.get(edge.from);
    const to = index.byKey.get(edge.to);
    return nodeFeature(from) === feature && nodeFeature(to) === feature;
  });
}

// Thông điệp scope-aware (review Phase 3: kiểm theo GLOBAL làm scope-0 trông như sạch).
function noCrudRelationsMessage(globalCount) {
  const globalNote = globalCount
    ? ` (toàn graph có ${globalCount} quan hệ — riêng scope này 0)`
    : ' (toàn graph cũng 0 — docs chưa có section `## CRUD matrix` trong usecase-index format mới)';
  return `0 quan hệ CRUD trong scope${globalNote}; KHÔNG có nghĩa là entity không bị đụng — kiểm tay UC prose nếu cần.\n`;
}

function commandCrud(graph, index, arg, opts) {
  const entity = arg ? resolveEntityArg(arg, index, opts.feature) : null;
  const allRelations = graph.edges.filter((edge) => edge.type === 'OPERATES_ON');
  const relations = crudEdges(graph, index, opts.feature)
    .filter((edge) => !entity || edge.to === entity.key);

  let output = `# CRUD${entity ? `: ${entity.key}` : opts.feature ? `: ${opts.feature}` : ''}\n\n`;

  if (!relations.length) {
    output += noCrudRelationsMessage(allRelations.length);
  } else if (entity) {
    output += section(
      `Use case thao tác ${entity.key} (${relations.length})`,
      rowsTable(
        ['UC (path)', 'ops', 'nguồn'],
        relations.map((edge) => {
          const uc = index.byKey.get(edge.from);
          return [
            `${edge.from} (${nodeFile(uc)})`,
            propsText(edge.props, 'ops'),
            sourceLocation(edge)
          ];
        }),
        opts.all,
        'Không có quan hệ CRUD cho entity này.'
      )
    );
  } else {
    output += section(
      `CRUD matrix (${relations.length})`,
      rowsTable(
        ['entity', 'UC', 'ops'],
        relations.map((edge) => {
          const entityNode = index.byKey.get(edge.to);
          return [entityNode?.key || edge.to, edge.from, propsText(edge.props, 'ops')];
        }),
        opts.all,
        'Không có quan hệ CRUD trong feature này.'
      )
    );
  }

  output += coverageFooter(graph, opts.feature || nodeFeature(entity));
  return output;
}

// Hướng dependency THEO TỪNG edge type (review Phase 3: 1 quy tắc "toDate > fromDate"
// đảo nghĩa trên ELABORATES/TESTED_BY — builder tạo chúng upstream→downstream).
// SYNCS_TO LOẠI HẲN: jira/confluence node không có timestamp remote canonical,
// fallback ngày file index tạo 29/30 suspect giả — chỉ đưa lại khi có remote_updated.
// 'from' = dependent (bên phải cập nhật theo) nằm phía from; 'to' = dependent phía to.
const SUSPECT_DEPENDENT_SIDE = new Map([
  ['SATISFIES', 'from'],
  ['COVERS', 'from'],
  ['VERIFIES', 'from'],
  ['RAISES', 'from'],
  ['DISPLAYS', 'from'],
  ['INHERITS_STATUS_FROM', 'from'],
  ['ELABORATES', 'to'],
  ['TESTED_BY', 'to'],
  ['DEPENDS_ON', 'from'], // feature phụ thuộc đích — đích đổi sau → feature suspect
  ['AUTOMATES', 'from'],  // e2e spec phụ thuộc CHK — CHK đổi sau → spec suspect
  ['DERIVES', null] // BO→CAP (dependent=to) vs US→UC (dependent=from) — phân giải theo endpoint
]);

function suspectDependentSide(edge, fromNode) {
  const side = SUSPECT_DEPENDENT_SIDE.get(edge.type);
  if (side === 'from' || side === 'to') return side;
  if (edge.type === 'DERIVES') return fromNode?.type === 'user_story' ? 'from' : 'to';
  return undefined;
}

function endpointUpdated(node, docUpdatedByFile) {
  if (!node) return null;
  // Node tự mang updated (doc, uc/us path-key, index-row) → dùng thẳng; còn lại tra theo file.
  if (node.updated) return node.updated;
  return docUpdatedByFile.get(nodeFile(node)) || null;
}

function commandSuspect(graph, index, opts) {
  // Map file→updated từ MỌI node có file nguồn (không chỉ type=doc — uc/us là
  // artifact path-key cũng mang updated; chỉ lấy doc làm 191 edge bị bỏ oan).
  const docUpdatedByFile = new Map();
  for (const node of graph.nodes) {
    const file = nodeFile(node);
    if (file === '—' || !node.updated) continue;
    if (node.type === 'doc' || node.key === file) {
      docUpdatedByFile.set(file, node.updated);
    } else if (!docUpdatedByFile.has(file)) {
      docUpdatedByFile.set(file, node.updated);
    }
  }

  const suspects = [];
  let skippedNoDate = 0;

  for (const edge of graph.edges) {
    const from = index.byKey.get(edge.from);
    const to = index.byKey.get(edge.to);
    const side = suspectDependentSide(edge, from);
    if (!side) continue;

    if (
      opts.feature &&
      (nodeFeature(from) !== opts.feature || nodeFeature(to) !== opts.feature)
    ) {
      continue;
    }

    const fromDate = endpointUpdated(from, docUpdatedByFile);
    const toDate = endpointUpdated(to, docUpdatedByFile);
    if (!fromDate || !toDate) {
      skippedNoDate += 1;
      continue;
    }

    const dependentDate = side === 'from' ? fromDate : toDate;
    const dependencyDate = side === 'from' ? toDate : fromDate;
    if (String(dependencyDate) > String(dependentDate)) {
      suspects.push({
        edge, from, to, fromDate, toDate,
        dependentNode: side === 'from' ? from : to
      });
    }
  }

  let output = `# Suspect${opts.feature ? `: ${opts.feature}` : ''}\n\n`;
  output += 'suspect = nghi ngờ theo NGÀY frontmatter — kết luận cuối phải đọc prose 2 đầu (contract 3.4bis).\n';
  output += section(
    `Edge suspect (${suspects.length})`,
    rowsTable(
      ['from', 'edge', 'to', 'from-date', 'to-date', 'nguồn'],
      suspects.map(({ edge, fromDate, toDate }) => [
        edge.from,
        edge.type,
        edge.to,
        fromDate,
        toDate,
        sourceLocation(edge)
      ]),
      opts.all,
      'Không có edge suspect theo ngày frontmatter.'
    )
  );
  output += section(
    'Shortlist file cần Read',
    rowsTable(
      ['file'],
      uniqueSorted(suspects.map(({ dependentNode }) => nodeFile(dependentNode))).map((file) => [file]),
      opts.all,
      'Không có file dependent suspect.'
    )
  );
  output += `\nBỏ qua ${skippedNoDate} edge thiếu ngày\n`;
  output += coverageFooter(graph, opts.feature);
  return output;
}

function cypherEscape(value) {
  return String(value)
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\r/g, '\\r')
    .replace(/\n/g, '\\n');
}

function typePascal(type) {
  return String(type || 'unknown')
    .split(/[_-]/)
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join('');
}

function cypherSetProps(varName, entries) {
  const parts = entries
    .filter(([, value]) => value !== null && value !== undefined && value !== '')
    .map(([key, value]) => `${varName}.${key} = "${cypherEscape(value)}"`);
  return parts.length ? `, ${parts.join(', ')}` : '';
}

function commandCypher(graph, opts) {
  // Review Phase 3: (a) --feature bị nuốt lặng → reject tường minh; (b) MERGE theo
  // cả property map → đổi title/status tạo node trùng key → MERGE theo key + SET;
  // (c) edge có endpoint không node (unresolved) → MATCH 0 row lặng → tạo :Unresolved.
  if (opts?.feature) {
    die('cypher không hỗ trợ --feature — export TOÀN graph (lọc trong Neo4j sau khi import)');
  }

  const known = new Set(graph.nodes.map((node) => node.key));
  const unresolvedKeys = uniqueSorted(
    graph.edges.flatMap((edge) => [edge.from, edge.to]).filter((key) => !known.has(key))
  );

  const lines = [
    '// KG export — derived, không phải source of truth. Import: cypher-shell < kg.cypher',
    `// ${graph.nodes.length} node + ${unresolvedKeys.length} endpoint unresolved (:Unresolved) + ${graph.edges.length} edge`
  ];

  for (const node of graph.nodes) {
    lines.push(
      `MERGE (n:KG {key: "${cypherEscape(node.key)}"}) SET n:${typePascal(node.type)}${cypherSetProps('n', [
        ['title', node.title],
        ['feature', node.feature],
        ['status', node.status]
      ])};`
    );
  }
  for (const key of unresolvedKeys) {
    lines.push(`MERGE (n:KG {key: "${cypherEscape(key)}"}) SET n:Unresolved;`);
  }

  if (graph.nodes.length && graph.edges.length) lines.push('');

  for (const edge of graph.edges) {
    lines.push(
      `MATCH (a:KG {key: "${cypherEscape(edge.from)}"}), (b:KG {key: "${cypherEscape(edge.to)}"}) MERGE (a)-[r:${edge.type}]->(b) SET r.provenance = "${cypherEscape(edge.provenance)}";`
    );
  }

  return lines.join('\n');
}

// Đảm bảo graph-history fresh: rebuild graph.json (lazy) rồi rebuild graph-history
// nếu nó thiếu/cũ hơn graph.json. CHỈ chạy khi lệnh history được gọi (opt-in) —
// query current-state KHÔNG bao giờ trả giá build graph-history.
function ensureHistoryFresh(opts) {
  // Chỉ auto-manage khi dùng đường mặc định (override --graph/--history-graph → đọc thẳng).
  if (
    path.resolve(opts.graph) !== path.resolve(DEFAULT_GRAPH) ||
    path.resolve(opts.historyGraph) !== path.resolve(DEFAULT_HISTORY_GRAPH)
  ) return;

  rebuildIfDirty(opts.graph); // đồng bộ graph.json trước (nguồn cross-ref + tín hiệu tươi)

  let needRebuild = !existsSync(opts.historyGraph);
  if (!needRebuild) {
    try {
      needRebuild = statSync(opts.graph).mtimeMs > statSync(opts.historyGraph).mtimeMs;
    } catch { needRebuild = true; }
  }
  if (!needRebuild) return;

  const historyScript = path.join(path.dirname(fileURLToPath(import.meta.url)), 'kg-history.mjs');
  try {
    execFileSync(process.execPath, [historyScript, '--quiet'], { stdio: ['ignore', 'ignore', 'pipe'] });
  } catch (error) {
    const detail = error?.stderr?.toString?.().trim() || error.message;
    die(`KG-ERROR: graph-history rebuild thất bại (${detail}) — chạy tay: node kg-history.mjs --dir docs`, 2);
  }
}

// history <doc-path|ID> — lịch sử thay đổi 1 tài liệu/requirement từ graph-history.json.
// Opt-in temporal: chỉ chạy khi user gọi rõ; luồng current-state KHÔNG chạm graph-history.
function commandHistory(arg, opts) {
  ensureHistoryFresh(opts);

  let rawHistory;
  try {
    rawHistory = readFileSync(opts.historyGraph, 'utf8');
  } catch (error) {
    const reason = error.code === 'ENOENT'
      ? `không tìm thấy ${opts.historyGraph} — chạy 'node kg-history.mjs --dir docs' để sinh`
      : `không đọc được ${opts.historyGraph}: ${error.message}`;
    die(`KG-ERROR: graph-history không dùng được (${reason})`, 2);
  }

  let history;
  try {
    history = JSON.parse(rawHistory);
  } catch (error) {
    die(`KG-ERROR: graph-history JSON lỗi (${error.message}) — chạy lại kg-history.mjs`, 2);
  }
  if (!history || !Array.isArray(history.nodes) || !Array.isArray(history.edges)) {
    die('KG-ERROR: graph-history thiếu nodes/edges — chạy lại kg-history.mjs', 2);
  }

  // graph.json chính chỉ để cross-ref title/status (best-effort, không bắt buộc).
  let mainGraph = null;
  try {
    mainGraph = JSON.parse(readFileSync(opts.graph, 'utf8'));
  } catch { /* graph chính vắng → history vẫn dùng được, chỉ thiếu title */ }
  const mainNodes = Array.isArray(mainGraph?.nodes) ? mainGraph.nodes : [];
  const titleByKey = new Map(
    mainNodes
      .filter((n) => n && typeof n.key === 'string')
      .map((n) => [n.key, n.title || n.key])
  );

  const toPosix = (v) => v.replaceAll('\\', '/');

  // Resolve arg → tập doc-key mục tiêu.
  //  - Path trực tiếp (docs/.../*.md) → chính nó.
  //  - ID (FR-.../doc-node) có trong graph chính → lấy source.file của node đó.
  const targets = new Set();
  targets.add(path.posix.normalize(toPosix(arg)));
  const node = mainNodes.find((n) => n && n.key === arg);
  if (node?.source?.file) targets.add(path.posix.normalize(toPosix(node.source.file)));
  if (node && typeof node.key === 'string' && /\.md$/.test(node.key)) {
    targets.add(path.posix.normalize(toPosix(node.key)));
  }

  // Event trỏ tới target (qua edge CHANGED) — sort theo sequence.
  const eventByKey = new Map(history.nodes.map((n) => [n.key, n]));
  const hits = [];
  for (const edge of history.edges) {
    if (
      edge && edge.type === 'CHANGED' && typeof edge.to === 'string' &&
      targets.has(path.posix.normalize(toPosix(edge.to)))
    ) {
      const ev = eventByKey.get(edge.from);
      if (ev) hits.push(ev);
    }
  }
  hits.sort((a, b) => a.sequence - b.sequence);

  // AMENDS (T2): nếu arg là requirement-ID, tìm CR đã sửa nó + before/after preview.
  const amends = [];
  for (const edge of history.edges) {
    if (edge && edge.type === 'AMENDS' && edge.to === arg) {
      const cr = eventByKey.get(edge.from);
      amends.push({
        cr: edge.from,
        date: cr?.date || '—',
        title: cr?.title || '',
        kind:
          edge.amend_kind ||
          (edge.before_preview || edge.after_preview ? 'edited' : 'mentioned'),
        before: edge.before_preview || '',
        after: edge.after_preview || '',
      });
    }
  }
  amends.sort(
    (a, b) =>
      String(a.date || '').localeCompare(String(b.date || '')) ||
      String(a.cr || '').localeCompare(String(b.cr || ''))
  );

  const label = titleByKey.get(arg) || arg;
  let output = `# Lịch sử: ${arg}${label !== arg ? ` (${label})` : ''}\n`;
  output += section(
    `Change events (${hits.length})`,
    rowsTable(
      ['seq', 'date', 'skill', 'author', 'note'],
      hits.map((e) => [e.sequence, e.date, e.skill, e.author, e.note]),
      opts.all,
      'Chưa có sự kiện nào trong changelog.md cho tài liệu này.'
    )
  );

  if (amends.length) {
    output += section(
      `Change requests đã sửa (${amends.length})`,
      rowsTable(
        ['CR', 'date', 'kind', 'before → after (preview)'],
        amends.map((a) => [
          a.cr,
          a.date,
          a.kind,
          a.before || a.after
            ? `${String(a.before || '∅').replace(/\n/g, ' ').slice(0, 60)} → ${String(a.after || '∅').replace(/\n/g, ' ').slice(0, 60)}`
            : a.title || '(không có before/after)',
        ]),
        opts.all
      )
    );
    output += '> Before/after là PREVIEW trích từ CR record (không phải full diff — is_preview).\n';
  }

  const targetList = [...targets].join(', ');
  output += `\n> Nguồn: ${opts.historyGraph} (opt-in temporal). Đối chiếu path: ${targetList}\n`;
  if (!hits.length) {
    output += '> Nếu vừa sửa file, chạy lại: node kg-history.mjs --dir docs\n';
  }
  return output;
}

// asof <requirement-id> <date> [--show] — bản requirement nào HIỆU LỰC lúc {date}.
// Opt-in temporal (T3). --show gọi git để lấy nội dung dòng requirement tại commit.
function commandAsof(reqId, date, opts) {
  ensureHistoryFresh(opts);

  let history;
  try {
    history = JSON.parse(readFileSync(opts.historyGraph, 'utf8'));
  } catch (error) {
    const reason = error.code === 'ENOENT'
      ? `không tìm thấy ${opts.historyGraph} — chạy 'node kg-history.mjs --dir docs'`
      : `lỗi đọc/parse: ${error.message}`;
    die(`KG-ERROR: graph-history không dùng được (${reason})`, 2);
  }
  if (!history || !Array.isArray(history.nodes)) {
    die('KG-ERROR: graph-history thiếu nodes — chạy lại kg-history.mjs', 2);
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    die(`Ngày không hợp lệ '${date}' — cần định dạng YYYY-MM-DD`);
  }

  const revs = history.nodes
    .filter((n) => n && n.type === 'revision' && n.requirement === reqId)
    .sort((a, b) => String(a.valid_from || '').localeCompare(String(b.valid_from || '')));

  if (!revs.length) {
    let out = `# As-of: ${reqId} @ ${date}\n\n`;
    out += `Không có revision nào cho ${reqId} trong graph-history.\n`;
    out += '> Requirement chưa có mốc thay đổi (chưa qua CR/commit nào), hoặc chưa chạy kg-history.mjs.\n';
    return out;
  }

  // Bản hiệu lực: valid_from <= date < valid_to (valid_to null = tới hiện tại).
  const match = revs.find((r) => {
    const from = r.valid_from || '';
    const to = r.valid_to;
    return from <= date && (to == null || date < to);
  });

  let out = `# As-of: ${reqId} @ ${date}\n\n`;
  if (!match) {
    out += `Không có bản nào hiệu lực đúng ngày ${date} (sớm hơn bản đầu tiên?).\n`;
    out += section(
      `Các mốc có (${revs.length})`,
      rowsTable(
        ['revision', 'valid_from', 'valid_to', 'source_cr'],
        revs.map((r) => [r.key, r.valid_from || '—', r.valid_to || 'now', r.source_cr || '—']),
        true
      )
    );
    return out;
  }

  out += section(
    'Bản hiệu lực',
    rowsTable(
      ['field', 'giá trị'],
      [
        ['revision', match.key],
        ['valid_from → valid_to', `${match.valid_from || '—'} → ${match.valid_to || 'now (hiện hành)'}`],
        ['git_commit', match.git_commit || '(không có — dựng từ CR)'],
        ['source_cr', match.source_cr || '—'],
        ['content_hash', match.content_hash || '(không trích được)'],
      ],
      true
    )
  );

  if (opts.show) {
    // Validate git_commit là hex hash + git_file repo-relative hợp lệ (P1.10 security):
    // graph-history có thể bị sửa tay → không tin mù trước khi đưa vào git.
    const validCommit = typeof match.git_commit === 'string' && /^[0-9a-f]{7,40}$/i.test(match.git_commit);
    const validFile = typeof match.git_file === 'string' &&
      match.git_file.startsWith('docs/') && !match.git_file.includes('..');
    if (!validCommit || !validFile) {
      out += '\n> --show: bản này không có git_commit/git_file hợp lệ → không lấy được nội dung.\n';
    } else {
      try {
        const content = execFileSync('git', ['show', '--end-of-options', `${match.git_commit}:${match.git_file}`], {
          encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], maxBuffer: 32 * 1024 * 1024,
        });
        const idEsc = reqId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const re = new RegExp(`(^|[|#\\s])${idEsc}(\\b)`, 'm');
        const line = content.split(/\r?\n/).find((l) => re.test(l));
        out += section(
          `Nội dung tại commit ${match.git_commit.slice(0, 8)}`,
          line ? `\`\`\`\n${line.trim()}\n\`\`\`\n` : '(không tìm thấy dòng requirement trong file tại commit này)\n'
        );
      } catch (error) {
        out += `\n> --show: git show lỗi (${error.message}).\n`;
      }
    }
  }

  out += `\n> Nguồn: ${opts.historyGraph} (opt-in temporal). ${opts.show ? '' : 'Thêm --show để xem nội dung nguyên văn qua git.'}\n`;
  return out;
}

function main() {
  const { command, arg, arg2, opts } = parseCli(process.argv.slice(2));
  const allowed = new Set([
    'explore',
    'impact',
    'coverage',
    'facts',
    'neighbors',
    'orphans',
    'counts',
    'trace',
    'crud',
    'suspect',
    'cypher',
    'tour',
    'history',
    'asof'
  ]);
  if (!allowed.has(command)) usage();

  // impact --staged/--since/--unstaged loại trừ nhau với ID positional.
  const diffMode = opts.staged || opts.unstaged || opts.since !== null;
  if (diffMode && command !== 'impact') usage();
  if (diffMode && arg) die('impact --staged/--since KHÔNG nhận thêm ID positional (loại trừ nhau)');
  // --since là so-nhánh, loại trừ --staged/--unstaged (working-tree) — không được lẫn (R5).
  if (opts.since !== null && (opts.staged || opts.unstaged)) {
    die('impact --since <ref> KHÔNG kết hợp --staged/--unstaged (khác phạm vi: so-nhánh vs working-tree)');
  }

  // history/asof đọc graph-history.json (opt-in temporal) — tách riêng nhánh vì
  // KHÔNG dùng graph.json chính làm nguồn chính (cross-ref lấy title thôi).
  if (command === 'history') {
    if (!arg) usage();
    process.stdout.write(`${commandHistory(arg, opts).trimEnd()}\n`);
    return;
  }
  if (command === 'asof') {
    // asof <requirement-id> <date> [--show]
    if (!arg || !arg2) die('Dùng: kg-query asof <requirement-id> <YYYY-MM-DD> [--show]');
    process.stdout.write(`${commandAsof(arg, arg2, opts).trimEnd()}\n`);
    return;
  }

  const graph = loadGraph(opts.graph);
  const index = buildIndex(graph);

  // Validate MỌI đường nhận feature: positional (coverage/facts) lẫn --feature (explore/impact/orphans/counts).
  if (command === 'coverage' || command === 'facts' || command === 'trace') assertFeatureExists(graph, index, arg);
  if (opts.feature) assertFeatureExists(graph, index, opts.feature);

  let output;
  if (command === 'explore') {
    const node = resolveArg(arg, index, opts.feature);
    output = commandExplore(graph, node, index, opts);
  } else if (command === 'impact') {
    if (diffMode) {
      output = commandImpactStaged(graph, index, opts);
    } else {
      const node = resolveArg(arg, index, opts.feature);
      node.__graphCoverage = graph.meta.coverage || {};
      output = commandImpact(node, index, opts);
    }
  } else if (command === 'tour') {
    if (!arg) usage();
    assertFeatureExists(graph, index, arg);
    output = commandTour(graph, index, arg, opts);
  } else if (command === 'coverage') {
    if (!arg) usage();
    output = commandCoverage(graph, index, arg, opts);
  } else if (command === 'facts') {
    if (!arg) usage();
    output = commandFacts(graph, index, arg, opts);
  } else if (command === 'trace') {
    if (!arg) usage();
    output = commandTrace(graph, index, arg, opts);
  } else if (command === 'crud') {
    if (!arg && !opts.feature) usage();
    output = commandCrud(graph, index, arg, opts);
  } else if (command === 'suspect') {
    if (arg) usage();
    output = commandSuspect(graph, index, opts);
  } else if (command === 'cypher') {
    if (arg) usage();
    output = commandCypher(graph, opts);
  } else if (command === 'neighbors') {
    const node = resolveArg(arg, index, opts.feature);
    // Nhận mọi node có file nguồn (doc, use_case, user_story, test_case...) —
    // phase review nhắm cả uc-*.md/us-*.md vốn resolve thành artifact node (finding review Phase 2).
    if (!nodeFile(node) || nodeFile(node) === '—') die(`'${arg}' không có file nguồn để lấy neighbors`);
    output = commandNeighbors(graph, index, node, opts);
  } else if (command === 'orphans') {
    output = commandOrphans(graph, index, opts.feature, opts);
  } else {
    output = commandCounts(graph, index, opts.feature, opts);
  }

  process.stdout.write(`${output.trimEnd()}\n`);
}

main();
