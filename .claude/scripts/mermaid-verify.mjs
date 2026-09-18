#!/usr/bin/env node
/*
 * mermaid-verify.mjs — compile-verify mọi block ```mermaid trong 1 file .md qua mmdc.
 *
 * Dùng bởi /sequence /activity /erd /state SAU khi Write — mermaid không render trong chat
 * (Mermaid syntax safety, diagram-selection.md), nên lỗi cú pháp trước đây chỉ lộ ra khi user
 * tự mở IDE/Obsidian/GitHub. Script này bắt lỗi NGAY, trước khi skill báo "xong".
 *
 * Dùng:
 *   node .claude/scripts/mermaid-verify.mjs --file docs/{feature}/srs/flows.md
 *   node .claude/scripts/mermaid-verify.mjs --file docs/x/srs/x-erd.md --png /tmp/erd-review
 *
 * Output: mỗi block PASS/FAIL kèm heading gần nhất (## ...) để biết lỗi ở đâu trong file.
 * Exit code = số block FAIL (0 nếu tất cả pass).
 *
 * --png <dir>: ngoài compile-check, giữ lại ảnh PNG mỗi block ở <dir>/block-N.png để skill
 * TỰ Read xem hình soi lỗi nghiệp vụ (thiếu entity, sai cardinality) — compile-check chỉ bắt
 * lỗi cú pháp, không bắt lỗi nội dung. In path từng ảnh ra stdout.
 *
 * STRICT LINT (chạy TRƯỚC compile, luôn bật): mmdc lenient hơn renderer thật (GitHub/Obsidian)
 * — nó THA ký tự đặc biệt trần (≥ + / ? & ...) trong node/edge label mà renderer strict crash
 * "Invalid mermaid syntax". Trước đây skill phải "kiểm bằng mắt" ở Phase F.5 → không đáng tin
 * (đo thật: authentication-userflow.md compile OK nhưng có 15 label trần). Lint bắt mechanically:
 * mọi label chứa ký tự đặc biệt mà chưa bọc "..." → FAIL kèm số dòng + bản sửa gợi ý.
 * Tắt bằng --no-lint (chỉ dùng khi debug, KHÔNG dùng trong flow skill).
 *
 * mmdc cần PUPPETEER_EXECUTABLE_PATH trỏ Chrome sẵn có (~/.puppeteer-cache) — mmdc mặc định
 * tìm Chrome ở ~/.cache/puppeteer (không có gì ở đó trên môi trường này) và fail ngay nếu thiếu.
 */

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawnSync } from 'node:child_process';

const argv = process.argv.slice(2);
const flag = (name) => { const i = argv.indexOf('--' + name); return i >= 0 ? argv[i + 1] : null; };
const FILE = flag('file');
const PNG_DIR = flag('png');
const NO_LINT = argv.includes('--no-lint');
if (!FILE) {
  console.error('Thiếu --file <path.md>. Ví dụ: --file docs/authentication/srs/flows.md');
  process.exit(2);
}
if (!fs.existsSync(FILE)) {
  console.error(`Không thấy file: ${FILE}`);
  process.exit(2);
}

function findChrome() {
  const glob = path.join(os.homedir(), '.puppeteer-cache', 'chrome');
  if (!fs.existsSync(glob)) return null;
  for (const versionDir of fs.readdirSync(glob)) {
    const candidate = path.join(glob, versionDir, 'chrome-mac-arm64', 'Google Chrome for Testing.app', 'Contents', 'MacOS', 'Google Chrome for Testing');
    if (fs.existsSync(candidate)) return candidate;
    // linux/x64 layout fallback (best-effort — máy khác kiến trúc có thể cần path khác)
    const linuxCandidate = path.join(glob, versionDir, 'chrome-linux64', 'chrome');
    if (fs.existsSync(linuxCandidate)) return linuxCandidate;
  }
  return null;
}

const CHROME = findChrome();
if (!CHROME) {
  console.error('⚠️  Không tìm thấy Chrome for Testing ở ~/.puppeteer-cache/chrome — mmdc sẽ fail khi launch.');
  console.error('   Cài qua: npx puppeteer browsers install chrome-headless-shell (hoặc dùng bản Chrome D2 render.sh đã cài).');
  process.exit(2);
}

// ---------- extract ```mermaid blocks + heading gần nhất ----------
function extractBlocks(mdPath) {
  const lines = fs.readFileSync(mdPath, 'utf8').split('\n');
  const blocks = [];
  let heading = '(no heading)';
  let inBlock = false;
  let buf = [];
  let startLine = 0;
  lines.forEach((line, idx) => {
    if (/^##\s+/.test(line)) heading = line.replace(/^##\s+/, '').trim();
    if (line.trim() === '```mermaid') { inBlock = true; buf = []; startLine = idx + 2; return; }
    if (inBlock && line.trim() === '```') { inBlock = false; blocks.push({ heading, code: buf.join('\n'), startLine }); return; }
    if (inBlock) buf.push(line);
  });
  return blocks;
}

// ---------- strict lint: quote phòng thủ (diagram-selection.md "Mermaid syntax safety") ----------
// mmdc THA những cái này, renderer thật (GitHub/Obsidian) thì KHÔNG → phải bắt bằng lint.
const SPECIAL = /[≥≤+/?&()'":]|<(?!br\s*\/?>)/;

function lintBlock(code, startLine) {
  const issues = [];
  const isQuoted = (s) => s.startsWith('"') && s.endsWith('"') && s.length >= 2;
  code.split('\n').forEach((raw, i) => {
    const lineNo = startLine + i;
    const line = raw.trim();
    if (!line || line.startsWith('%%')) return;
    // bỏ qua dòng cấu hình/khai báo không mang label người đọc
    if (/^(classDef|class|style|linkStyle|subgraph|end|direction|flowchart|graph|sequenceDiagram|stateDiagram|erDiagram|click)\b/.test(line)) return;

    // 1) node label: id["..."] / id{...} / id(...)
    // CHỈ xét dòng khai báo node ĐƠN (không chứa toán tử cạnh) — dòng dạng
    // `a["x"] -->|"Pass"| b["y"]` phải để nhánh edge (2) xử lý, nếu không regex tham lam
    // nuốt cả chuỗi và báo nhầm "quote lồng" (false positive đo thật trên doc-drift report).
    const hasEdgeOp = /(-{2,3}>|-\.-+>|={2,3}>|---|===)/.test(raw);
    const node = hasEdgeOp ? null : raw.match(/^\s*[\w-]+(\[|\{\{|\{|\(\(|\()(.+?)(\]|\}\}|\}|\)\)|\))\s*$/);
    if (node) {
      const body = node[2].trim();
      if (!isQuoted(body) && SPECIAL.test(body)) {
        issues.push({ lineNo, kind: 'node label', body, fix: `${node[1]}"${body}"${node[3]}` });
      } else if (isQuoted(body) && /[^\\]"/.test(body.slice(1, -1))) {
        issues.push({ lineNo, kind: 'quote lồng trong label', body, fix: 'bỏ lớp quote bên trong, dùng <b>...</b> nếu cần nhấn' });
      }
    }
    // 1b) node label nội tuyến trên dòng CÓ cạnh: bắt riêng từng `id[...]` chưa quote
    if (hasEdgeOp) {
      const inlineRe = /(?:^|[|\s])([\w-]+)(\[|\{\{|\{|\(\(|\()([^\]})"|]*)(\]|\}\}|\}|\)\)|\))/g;
      let im;
      while ((im = inlineRe.exec(raw)) !== null) {
        const body = im[3].trim();
        if (body && SPECIAL.test(body)) {
          issues.push({ lineNo, kind: 'node label (trên dòng có cạnh)', body, fix: `${im[2]}"${body}"${im[4]}` });
        }
      }
    }

    // 2) edge label: -->|...|  -.->|...|  ==>|...|
    const edgeRe = /(-{2,3}>|-\.-+>|={2,3}>)\|([^|]+)\|/g;
    let m;
    while ((m = edgeRe.exec(raw)) !== null) {
      const body = m[2].trim();
      if (!isQuoted(body) && SPECIAL.test(body)) {
        issues.push({ lineNo, kind: 'edge label', body, fix: `${m[1]}|"${body}"|` });
      }
    }

    // 3a) &quot; = dấu nháy BAO label bị escape → label mất trạng thái được-quote → parser vỡ.
    // Tách riêng khỏi entity thường vì nguyên nhân + cách sửa KHÁC hẳn: đây gần như luôn là
    // dấu vết một lớp HTML-escape chạy TRÊN cả khối mermaid (viewer/engine escape nhầm code
    // block), không phải người viết gõ sai label. Đo thật 2026-08-01 (authentication-userflow):
    //   n1[&quot;A&lt;br/&gt;B&quot;] → FAIL   |   n1["A&lt;br/&gt;B"] → PASS
    // ⇒ thủ phạm là &quot;, KHÔNG phải &lt;br/&gt;. Sửa file .md là VÔ ÍCH nếu file vốn đã đúng
    // — phải sửa lớp escape. Xem diagram-selection.md "Escape tầng hiển thị".
    if (/&quot;/.test(raw)) {
      issues.push({
        lineNo,
        kind: 'dấu nháy bao label bị escape thành &quot; (label mất quote → parser vỡ)',
        body: line,
        fix: 'thay &quot; → " . Nếu file .md GỐC vốn không có &quot;, lỗi nằm ở lớp render (viewer/engine HTML-escape cả khối mermaid) — sửa lớp đó, ĐỪNG sửa file .md đang đúng',
      });
    }

    // 3b) HTML entity còn lại trong label — nhiều renderer báo Invalid syntax
    if (/&(amp|lt|gt|#\d+);/.test(raw)) {
      issues.push({ lineNo, kind: 'HTML entity trong label', body: line, fix: 'thay &amp;→"và", &lt;/&gt;→chữ, bỏ entity' });
    }
  });
  return issues;
}

// ---------- semantic lint: ĐÚNG NGHĨA, không chỉ đúng cú pháp ----------
// Vì sao cần: mmdc chỉ compile. State thiếu terminal, ERD có entity ma, sequence gọi lifeline
// chưa khai — tất cả compile PASS và render ra ảnh đẹp. Đây là lớp "vẽ đúng" chứ không phải
// "vẽ được" (audit 2026-07-26; lỗi sống: authentication-states.md 3 diagram không có terminal).
// Quy ước: severity 'error' → fail; 'warn' → in ra nhưng không fail (có ca hợp lệ ngoại lệ).
function semanticLint(code, startLine) {
  const out = [];
  const lines = code.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('%%'));
  const head = lines[0] || '';
  const add = (sev, msg, hint) => out.push({ sev, msg, hint });

  // ── stateDiagram-v2 ──
  if (/^stateDiagram/.test(head)) {
    const trans = [];               // {from, to, label}
    const declared = new Set();
    for (const l of lines.slice(1)) {
      let m = l.match(/^state\s+"[^"]*"\s+as\s+(\w+)/) || l.match(/^state\s+(\w+)/);
      if (m) { declared.add(m[1]); continue; }
      m = l.match(/^(\[\*\]|[\w.]+)\s*-->\s*(\[\*\]|[\w.]+)\s*(?::\s*(.*))?$/);
      if (m) trans.push({ from: m[1], to: m[2], label: (m[3] || '').trim() });
    }
    if (trans.length) {
      const states = new Set();
      trans.forEach(t => { if (t.from !== '[*]') states.add(t.from); if (t.to !== '[*]') states.add(t.to); });
      const hasInitial = trans.some(t => t.from === '[*]');
      if (!hasInitial) add('error', 'Thiếu trạng thái khởi đầu — phải có ít nhất 1 `[*] --> <state>`', 'không biết entity bắt đầu ở đâu');
      // reachable từ mọi [*]
      const outMap = {}; trans.forEach(t => { (outMap[t.from] ||= []).push(t.to); });
      const seen = new Set(); const q = trans.filter(t => t.from === '[*]').map(t => t.to);
      while (q.length) { const u = q.shift(); if (seen.has(u)) continue; seen.add(u); (outMap[u] || []).forEach(v => q.push(v)); }
      for (const s of states) if (!seen.has(s)) add('error', `Trạng thái "${s}" KHÔNG tới được từ [*] — mồ côi`, 'nối vào luồng hoặc bỏ');
      // dead-end: không outgoing và không --> [*]
      for (const s of states) {
        const outs = (outMap[s] || []);
        if (outs.length === 0) add('warn', `Trạng thái "${s}" là điểm chết — không có transition ra và không `+'`--> [*]`', 'nếu là kết cục cuối thì thêm `' + s + ' --> [*]`; nếu là trạng thái ổn định lâu dài thì bỏ qua cảnh báo');
      }
      // transition thiếu trigger
      // Transition tới [*] (kết thúc vòng đời) thường không cần trigger → không cảnh báo,
      // tránh nhiễu. Chỉ soi transition giữa 2 state thật.
      trans.filter(t => t.from !== '[*]' && t.to !== '[*]' && !t.label).forEach(t => add('warn', `Transition "${t.from} --> ${t.to}" không có nhãn trigger`, 'ghi rõ điều kiện/hành động gây chuyển trạng thái'));
      // ';' trong label làm renderer sinh node rác (diagram-selection.md đã ghi nhận)
      trans.filter(t => t.label.includes(';')).forEach(t => add('error', `Nhãn transition "${t.from} --> ${t.to}" chứa dấu ';' — mermaid cắt thành node rác`, 'thay ";" bằng "," hoặc rút gọn nhãn'));
    }
  }

  // ── erDiagram ──
  if (/^erDiagram/.test(head)) {
    const withBlock = new Set();    // entity có khối thuộc tính { ... }
    const inRel = new Map();        // entity xuất hiện trong quan hệ -> dòng
    const fkOf = new Map();         // entity -> Set(tên cột FK) để kiểm quan hệ có chống lưng không
    const rels = [];
    let depth = 0, curEntity = null;
    for (const l of lines.slice(1)) {
      if (depth > 0) {
        if (/^\}$/.test(l)) { depth--; curEntity = null; continue; }
        // cột trong khối entity: `string customer_id FK` / `string id PK "ghi chú"`
        // CHỈ gom cột đánh dấu FK — PK/UK không phải bằng chứng "có đường nối tới cha".
        // (Bug đã sửa: trước đây gom cả PK nên cột `id` làm mọi quan hệ trông như hợp lệ.)
        const col = l.match(/^\S+\s+(\w+)\s+FK\b/);
        if (col && curEntity) { (fkOf.get(curEntity) || fkOf.set(curEntity, new Set()).get(curEntity)).add(col[1].toLowerCase()); }
        continue;
      }
      // khối thuộc tính viết GỌN 1 dòng: `ORDER { string id PK }` — hợp lệ, KHÔNG phải entity ma
      let m = l.match(/^([A-Za-z_]\w*)\s*\{(.*)\}$/);
      if (m) {
        withBlock.add(m[1]);
        const set = new Set();
        for (const seg of m[2].split(/\s{2,}|,/)) {
          const col = seg.trim().match(/^\S+\s+(\w+)\s+(PK|FK|UK)\b/);
          if (col) set.add(col[1].toLowerCase());
        }
        fkOf.set(m[1], set);
        continue;
      }
      m = l.match(/^([A-Za-z_]\w*)\s*\{$/);
      if (m) { withBlock.add(m[1]); fkOf.set(m[1], new Set()); curEntity = m[1]; depth++; continue; }
      // QUAN_HE: A ||--o{ B : "nhãn"
      m = l.match(/^([A-Za-z_]\w*)\s+([|}o][|o{}-]*[|{o])\s+([A-Za-z_]\w*)\s*:\s*(.*)$/);
      if (m) {
        const [, a, card, b, label] = m;
        inRel.set(a, l); inRel.set(b, l);
        rels.push({ a, card, b, label });
        // N:N trực tiếp
        if (/\}o|\}\|/.test(card.slice(0, 3)) && /o\{|\|\{/.test(card.slice(-3))) {
          add('warn', `Quan hệ N:N trực tiếp ${a} ↔ ${b}`, 'ở mức physical nên tách bảng trung gian (junction)');
        }
        // nhãn nói "có thể/tối đa 1" mà ký hiệu không optional
        const lb = label.toLowerCase();
        const rhsOpt = /o\{|o\|/.test(card.slice(-2));
        if (/có thể|tối đa|optional|không bắt buộc/.test(lb) && !rhsOpt) {
          add('warn', `Nhãn "${label.trim()}" gợi ý KHÔNG bắt buộc nhưng ký hiệu "${card}" là bắt buộc`, 'dùng `o` phía tùy chọn, vd ||--o| thay vì ||--||');
        }
        if (/nhiều|many/.test(lb) && !/\{/.test(card)) {
          add('warn', `Nhãn "${label.trim()}" nói "nhiều" nhưng ký hiệu "${card}" không phải 1:N`, 'dùng `{` phía nhiều, vd ||--o{');
        }
      }
    }
    // entity ma: có trong quan hệ nhưng không khai thuộc tính
    for (const [e, l] of inRel) {
      if (!withBlock.has(e)) add('error', `Entity "${e}" xuất hiện trong quan hệ nhưng KHÔNG có khối thuộc tính — mermaid vẽ box rỗng (typo tên entity?)`, `khai \`${e} { ... }\` hoặc sửa lại tên`);
    }

    // Quan hệ KHÔNG có FK chống lưng — vẽ được nhưng không có đường nào hiện thực hoá.
    // Đo thật (premium-payment-erd.md): `USER ||--o{ PAYMENT_METHOD : "lưu"` trong khi
    // PAYMENT_METHOD chỉ có customer_id FK, không có user_id ⇒ quan hệ này là THỪA, và chính
    // nó gây drift với bản D2 (D2 chỉ vẽ CUSTOMER→PAYMENT_METHOD). Bắt được ngay trong 1 file.
    for (const r of rels) {
      // phía "nhiều" (có { ) là phía giữ FK; nếu 1:1 thì xét cả 2 chiều
      const manySide = /\{$|\{/.test(r.card.slice(-2)) ? r.b : (/^\}|\}/.test(r.card.slice(0, 2)) ? r.a : null);
      const cands = manySide ? [manySide] : [r.a, r.b];
      const other = e => (e === r.a ? r.b : r.a);
      const ok = cands.some(child => {
        const cols = fkOf.get(child); if (!cols || !cols.size) return true;   // entity không khai FK nào → không đủ dữ kiện, không kết luận
        const parent = other(child).toLowerCase().replace(/_/g, '');
        // khớp khi tên cột FK có chứa tên entity cha (customer_id ↔ CUSTOMER)
        return [...cols].some(c => { const base = c.replace(/_?id$/, '').replace(/_/g, ''); return base && (parent.includes(base) || base.includes(parent)); });
      });
      if (!ok) {
        const child = manySide || r.b;
        add('warn', `Quan hệ ${r.a} ${r.card} ${r.b} ("${(r.label || '').replace(/"/g, '')}") không thấy cột FK tương ứng trong "${child}"`, `kiểm: "${child}" có cột trỏ về ${other(child)} không? Nếu không, quan hệ này có thể THỪA (nguồn drift khi sinh sang D2/DBML)`);
      }
    }
  }

  // ── flowchart / graph (activity, user-flow) ──
  // Đây là loại hay "vẽ sai LUỒNG" nhất: quyết định thiếu nhánh, nhánh không nhãn, nhánh cụt.
  // Tất cả đều compile PASS và render ra hình đẹp.
  if (/^(flowchart|graph)\b/.test(head)) {
    const nodeShape = new Map();        // id -> 'decision' | 'other'
    const outOf = new Map(), inOf = new Map();
    const edges = [];
    const seenNode = id => { if (!nodeShape.has(id)) nodeShape.set(id, 'other'); };
    const EDGE = /([\w-]+)(?:\[[^\]]*\]|\{[^}]*\}|\([^)]*\)|>[^\]]*\])?\s*(-{2,3}>|-\.-+>|={2,3}>|---)\s*(?:\|([^|]*)\|)?\s*([\w-]+)/g;

    for (const l of lines.slice(1)) {
      if (/^(subgraph|end|direction|classDef|class|style|linkStyle|click)\b/.test(l)) continue;
      // khai node kèm hình dạng: id{...} = decision (rhombus)
      let dm = l.match(/^([\w-]+)\{([^}]*)\}/);
      if (dm) nodeShape.set(dm[1], 'decision');
      let m;
      EDGE.lastIndex = 0;
      while ((m = EDGE.exec(l)) !== null) {
        const [, from, , label, to] = m;
        // hình dạng khai nội tuyến giữa cạnh
        if (/\{[^}]*\}/.test(l.slice(0, m.index + m[0].length)) && new RegExp(from + '\\{').test(l)) nodeShape.set(from, 'decision');
        if (new RegExp(to + '\\{').test(l)) nodeShape.set(to, 'decision');
        seenNode(from); seenNode(to);
        edges.push({ from, to, label: (label || '').trim() });
        (outOf.get(from) || outOf.set(from, []).get(from)).push({ to, label: (label || '').trim() });
        (inOf.get(to) || inOf.set(to, []).get(to)).push(from);
      }
    }

    if (edges.length) {
      // decision phải có ≥2 nhánh ra, và mỗi nhánh phải có nhãn điều kiện
      for (const [id, shape] of nodeShape) {
        if (shape !== 'decision') continue;
        const outs = outOf.get(id) || [];
        if (outs.length < 2) add('error', `Node quyết định "${id}" chỉ có ${outs.length} nhánh ra — quyết định phải có ≥2 lối đi`, 'thêm nhánh còn thiếu (thường là nhánh thất bại/từ chối), hoặc đổi sang node thường nếu không phải điểm rẽ');
        outs.filter(o => !o.label).forEach(o => add('error', `Nhánh "${id} --> ${o.to}" từ node quyết định KHÔNG có nhãn điều kiện`, 'ghi rõ điều kiện: `' + id + ' -->|"Hợp lệ"| ' + o.to + '`'));
      }
      // nhánh cụt: node không có đường ra và tên không gợi ý là điểm kết thúc
      const ENDISH = /(end|stop|done|xong|ket_?thuc|ketthuc|thanh_?cong|that_?bai|huy|final|exit)/i;
      for (const [id] of nodeShape) {
        const outs = outOf.get(id) || [];
        if (outs.length === 0 && !ENDISH.test(id)) add('warn', `Node "${id}" không có đường ra — nhánh cụt (vào rồi không ra được)`, 'nối tiếp tới bước sau, hoặc đổi tên thành node kết thúc rõ ràng (End/Stop/KetThuc)');
      }
      // node mồ côi: không ai trỏ tới và cũng không phải điểm bắt đầu
      const firstFrom = edges.length ? edges[0].from : null;
      for (const [id] of nodeShape) {
        if (!(inOf.get(id) || []).length && id !== firstFrom) {
          const isStartish = /(start|begin|bat_?dau|batdau)/i.test(id);
          if (!isStartish) add('warn', `Node "${id}" không có đường vào — không ai dẫn tới bước này`, 'nối từ bước trước, hoặc bỏ nếu thừa');
        }
      }
    }
  }

  // ── sequenceDiagram ──
  if (/^sequenceDiagram/.test(head)) {
    const declared = new Set();
    let anyDecl = false;
    const msgs = [];
    let altDepth = 0; const altHasElse = [];
    for (const l of lines.slice(1)) {
      let m = l.match(/^(?:participant|actor)\s+(\w+)(?:\s+as\s+.*)?$/);
      if (m) { declared.add(m[1]); anyDecl = true; continue; }
      if (/^alt\b/.test(l)) { altDepth++; altHasElse.push(false); continue; }
      if (/^else\b/.test(l)) { if (altHasElse.length) altHasElse[altHasElse.length - 1] = true; continue; }
      if (/^end\b/.test(l)) { if (altDepth > 0) { const had = altHasElse.pop(); altDepth--; if (!had) add('warn', 'Khối `alt` không có nhánh `else`', 'nếu chỉ 1 nhánh điều kiện thì dùng `opt` thay cho `alt`'); } continue; }
      m = l.match(/^(\w+)\s*(-?->>?|--?>>?)\s*([+-]?)(\w+)\s*:/);
      if (m) msgs.push({ from: m[1], to: m[4], line: l });
    }
    if (anyDecl) {
      for (const s of msgs) {
        if (!declared.has(s.from)) add('error', `Lifeline "${s.from}" chưa khai báo nhưng đã gửi message — mermaid tự tạo lifeline mới, hình sẽ lệch`, 'khai `participant ' + s.from + '` hoặc sửa typo alias');
        if (!declared.has(s.to)) add('error', `Lifeline "${s.to}" chưa khai báo nhưng đã nhận message — mermaid tự tạo lifeline mới`, 'khai `participant ' + s.to + '` hoặc sửa typo alias');
      }
    }
  }

  return out;
}

const blocks = extractBlocks(FILE);
if (!blocks.length) {
  console.log(`Không có block \`\`\`mermaid nào trong ${FILE} — không có gì để verify.`);
  process.exit(0);
}

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mermaid-verify-'));
if (PNG_DIR) fs.mkdirSync(PNG_DIR, { recursive: true });
let failCount = 0;
const results = [];

blocks.forEach((b, i) => {
  const mmdPath = path.join(tmpDir, `block-${i}.mmd`);
  // --png → xuất PNG (Read tool xem được như ảnh) vào PNG_DIR; else SVG vào tmp (compile-check thôi).
  const outPath = PNG_DIR
    ? path.join(PNG_DIR, `block-${i}.png`)
    : path.join(tmpDir, `block-${i}.svg`);
  fs.writeFileSync(mmdPath, b.code);
  const res = spawnSync('mmdc', ['-i', mmdPath, '-o', outPath, '-s', '2'], {
    encoding: 'utf8',
    env: { ...process.env, PUPPETEER_EXECUTABLE_PATH: CHROME },
  });
  const compileOk = res.status === 0 && fs.existsSync(outPath);
  const issues = NO_LINT ? [] : lintBlock(b.code, b.startLine);
  const sem = NO_LINT ? [] : semanticLint(b.code, b.startLine);
  const semErrors = sem.filter(s => s.sev === 'error');
  const semWarns = sem.filter(s => s.sev === 'warn');
  const ok = compileOk && issues.length === 0 && semErrors.length === 0;
  if (!ok) failCount++;
  results.push({ index: i, heading: b.heading, ok, compileOk, issues, semErrors, semWarns, pngPath: PNG_DIR && compileOk ? outPath : null, stderr: (res.stderr || '').split('\n').slice(0, 6).join('\n') });
});

fs.rmSync(tmpDir, { recursive: true, force: true });

console.log(`\n=== mermaid-verify: ${FILE} (${blocks.length} block) ===`);
for (const r of results) {
  console.log(`${r.ok ? '✅' : '❌'} Block ${r.index + 1} — "${r.heading}"`);
  if (r.pngPath) console.log(`   🖼  ${r.pngPath}`);
  if (!r.compileOk) console.log(r.stderr.split('\n').map(l => '   ' + l).join('\n'));
  if (r.issues.length) {
    console.log(`   ⚠️  LINT: ${r.issues.length} label chưa an toàn với renderer strict (mmdc tha, GitHub/Obsidian crash):`);
    for (const it of r.issues) {
      console.log(`      ${FILE}:${it.lineNo} — ${it.kind}: ${it.body}`);
      console.log(`         → sửa: ${it.fix}`);
    }
  }
  if (r.semErrors.length) {
    console.log(`   ❌ NGHĨA (phải sửa): ${r.semErrors.length} vấn đề — compile PASS nhưng sơ đồ sai nghiệp vụ:`);
    for (const s of r.semErrors) {
      console.log(`      • ${s.msg}`);
      if (s.hint) console.log(`         → ${s.hint}`);
    }
  }
  if (r.semWarns.length) {
    console.log(`   ⚠️  NGHĨA (cân nhắc): ${r.semWarns.length} cảnh báo — không chặn, tự xét có hợp lệ không:`);
    for (const s of r.semWarns) {
      console.log(`      • ${s.msg}`);
      if (s.hint) console.log(`         → ${s.hint}`);
    }
  }
}
const lintTotal = results.reduce((n, r) => n + r.issues.length, 0);
const semErrTotal = results.reduce((n, r) => n + r.semErrors.length, 0);
const semWarnTotal = results.reduce((n, r) => n + r.semWarns.length, 0);
const parts = [];
if (lintTotal) parts.push(`${lintTotal} lỗi cú pháp-strict`);
if (semErrTotal) parts.push(`${semErrTotal} lỗi nghĩa`);
if (semWarnTotal) parts.push(`${semWarnTotal} cảnh báo nghĩa`);
console.log(`\n${blocks.length - failCount}/${blocks.length} block PASS${failCount ? `, ${failCount} FAIL` : ''}${parts.length ? ` (${parts.join(', ')})` : ''}`);
// Báo TÁCH từng mức — KHÔNG gộp 1 chữ "PASS" đại diện cho tất cả. Gộp là cách sinh ngộ nhận
// "đã kiểm hết" (đúng cái bệnh làm 6 lỗi UML lọt lưới: render PASS bị đọc thành diagram đúng).
console.log(`   Cú pháp compile: ${results.every(r => r.compileOk) ? 'PASS' : 'FAIL'} · Nhãn an toàn renderer: ${lintTotal ? 'FAIL' : 'PASS'} · Ngữ nghĩa: ${semErrTotal ? 'FAIL' : (semWarnTotal ? 'PASS (còn cảnh báo)' : 'PASS')}`);
console.log('   Đúng NGHIỆP VỤ (luồng/cardinality khớp đời thực): máy KHÔNG kiểm được — tự soi + đối chiếu spec.');
if (lintTotal) {
  console.log('→ QUOTE PHÒNG THỦ: bọc "..." mọi node/edge label có ký tự đặc biệt (≥ ≤ + / ? & ( ) : ").');
  console.log('  Xem .claude/rules/diagram-selection.md Mục "Mermaid syntax safety".');
}
// Ca "file ĐÚNG mà người xem vẫn thấy lỗi" (đo thật 2026-08-01): mọi mức PASS ở đây nghĩa là
// nguồn .md hợp lệ — nếu user vẫn báo "Invalid mermaid syntax" thì lỗi ở TẦNG HIỂN THỊ, và
// sửa file .md sẽ làm hỏng một file đang đúng mà không chạm nguyên nhân. Nói thẳng ra để
// không lặp lại vòng "sửa file đúng → vẫn lỗi → sửa tiếp".
if (failCount === 0 && lintTotal === 0 && semErrTotal === 0) {
  console.log('\n→ Nguồn .md hợp lệ. Nếu người xem VẪN báo "Invalid mermaid syntax":');
  console.log('  lỗi nằm ở lớp render, KHÔNG ở file này — ĐỪNG sửa file đang đúng.');
  console.log('  Dấu hiệu nhận biết: chỗ hiển thị hiện <br/> thành CHỮ, hoặc thấy &quot; / &lt;');
  console.log('  ⇒ viewer/engine đang HTML-escape cả khối mermaid. Sửa lớp escape đó.');
}
if (PNG_DIR && failCount === 0) console.log(`\n→ Ảnh PNG đã lưu ở ${PNG_DIR}. Read từng ảnh để tự soi thiếu entity/sai cardinality trước khi báo xong.`);
process.exit(failCount);
