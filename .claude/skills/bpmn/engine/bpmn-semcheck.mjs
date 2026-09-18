// bpmn-semcheck.mjs — Kiểm chứng IR (intermediate representation) trước khi layout.
// 2 tầng:
//   (A) STRUCTURAL — máy tự kiểm 100%: IR hợp lệ về đồ thị (start/end, reachable, gateway nhánh, mồ côi...).
//   (B) COVERAGE   — đối chiếu IR với "source facts" (actors/branches/errors trích từ UC/SRS).
//                    Máy so SỐ LƯỢNG + tên gần đúng → cảnh báo lệch; phán xét ngữ nghĩa cuối do AI/user.
// Dùng: import { checkIR } from './bpmn-semcheck.mjs'; const rep = checkIR(ir, sourceFacts?);
//   ir: { process, lanes[], nodes[], flows[] }
//   sourceFacts (optional): { actors:[...], branches:[...], errors:[...], expectedEnds:[...] }
// Trả: { ok, errors:[], warnings:[], coverage:{...} }  (ok=false nếu có structural error)

export function checkIR(ir, source = {}) {
  const errors = [], warnings = [];
  const { lanes = [], nodes = [], flows = [] } = ir || {};
  const nodeById = Object.fromEntries(nodes.map(n => [n.id, n]));
  const laneIds = new Set(lanes.map(l => l.id));

  // ───────── (A) STRUCTURAL ─────────
  // A0. id duy nhất — PHẢI kiểm TRƯỚC mọi thứ khác: nodeById/laneIds ở trên dùng Map nên
  // id trùng bị ghi đè ÂM THẦM (node sau thắng node trước) → mọi check sau đó soi trên đồ thị
  // đã mất node, báo "OK" trong khi IR thật sự hỏng. SKILL.md hứa "id duy nhất" → phải là error.
  const dupOf = list => {
    const seen = new Set(), dup = new Set();
    list.forEach(id => { if (seen.has(id)) dup.add(id); else seen.add(id); });
    return [...dup];
  };
  dupOf(nodes.map(n => n.id)).forEach(id => errors.push(`Node id trùng: "${id}" — id phải duy nhất (bản sau ghi đè bản trước, đồ thị mất node)`));
  dupOf(flows.map(f => f.id)).forEach(id => errors.push(`Flow id trùng: "${id}" — id phải duy nhất`));
  dupOf(lanes.map(l => l.id)).forEach(id => errors.push(`Lane id trùng: "${id}" — id phải duy nhất`));

  // A1. references hợp lệ
  nodes.forEach(n => {
    if (!laneIds.has(n.lane)) errors.push(`Node "${n.id}" tham chiếu lane không tồn tại: ${n.lane}`);
    if (!['start','task','gateway','end'].includes(n.kind)) errors.push(`Node "${n.id}" kind lạ: ${n.kind}`);
    if (!n.name || !String(n.name).trim()) warnings.push(`Node "${n.id}" thiếu name (sẽ render rỗng)`);
  });
  flows.forEach(f => {
    if (!nodeById[f.src]) errors.push(`Flow "${f.id}" src không tồn tại: ${f.src}`);
    if (!nodeById[f.tgt]) errors.push(`Flow "${f.id}" tgt không tồn tại: ${f.tgt}`);
    if (f.src === f.tgt) errors.push(`Flow "${f.id}" self-loop (src==tgt)`);
  });

  // A2. start / end
  const starts = nodes.filter(n => n.kind === 'start');
  const ends   = nodes.filter(n => n.kind === 'end');
  if (starts.length === 0) errors.push('Không có startEvent — mọi quy trình cần đúng 1 điểm bắt đầu');
  // Nhiều start = ERROR (không phải cảnh báo): SKILL.md Mục "IR rules" hứa "đúng 1 start", và
  // auto-layout chỉ chọn 1 gốc → start thứ 2 trở đi bị vẽ lạc chỗ. Muốn nhiều điểm khởi phát thật
  // thì mô hình bằng 1 start + gateway, hoặc tách thành 2 process riêng.
  if (starts.length > 1) errors.push(`Có ${starts.length} startEvent — quy trình phải có ĐÚNG 1 điểm bắt đầu (dùng 1 start + gateway, hoặc tách process)`);
  if (ends.length === 0) errors.push('Không có endEvent — quy trình phải có ít nhất 1 kết cục');

  // A3. degree (in/out)
  const outOf = {}, inOf = {};
  nodes.forEach(n => { outOf[n.id] = []; inOf[n.id] = []; });
  flows.forEach(f => { if (nodeById[f.src] && nodeById[f.tgt]) { outOf[f.src].push(f); inOf[f.tgt].push(f); } });
  nodes.forEach(n => {
    const di = inOf[n.id].length, dout = outOf[n.id].length;
    if (n.kind === 'start' && dout === 0) errors.push(`startEvent "${n.id}" không có outgoing`);
    if (n.kind === 'start' && di > 0) warnings.push(`startEvent "${n.id}" có incoming (bất thường)`);
    if (n.kind === 'end' && di === 0) errors.push(`endEvent "${n.id}" không có incoming (mồ côi)`);
    if (n.kind === 'end' && dout > 0) errors.push(`endEvent "${n.id}" có outgoing (end phải là điểm cuối)`);
    if (n.kind === 'task' && (di === 0 || dout === 0)) errors.push(`task "${n.id}" thiếu ${di===0?'incoming':'outgoing'} (đứt mạch)`);
    if (n.kind === 'gateway') {
      if (dout < 2) errors.push(`gateway "${n.id}" chỉ có ${dout} nhánh ra — gateway cần ≥2 (nếu 1 thì bỏ gateway)`);
      // Nhánh gateway thiếu nhãn = ERROR: SKILL.md gọi "gateway ≥2 outgoing CÓ NAME" là rule
      // bắt buộc. Gateway không nhãn = người đọc không biết điều kiện nào dẫn đi đâu — đúng loại
      // "vẽ đẹp nhưng vô nghĩa nghiệp vụ" mà gate này tồn tại để chặn.
      outOf[n.id].forEach(f => { if (!f.name || !String(f.name).trim()) errors.push(`Nhánh "${f.id}" từ gateway "${n.id}" THIẾU nhãn điều kiện — mỗi nhánh gateway phải có name= (vd "hợp lệ" / "sai mật khẩu")`); });
    }
  });

  // A4. reachability từ start + tới được end
  const reach = new Set();
  (function bfs(seed){ const q=[...seed]; while(q.length){const u=q.shift(); if(reach.has(u))continue; reach.add(u); outOf[u].forEach(f=>q.push(f.tgt));} })(starts.map(s=>s.id));
  nodes.forEach(n => { if (!reach.has(n.id)) errors.push(`Node "${n.id}" KHÔNG reachable từ start (rời rạc)`); });
  // tới end: reverse bfs từ ends
  const canEnd = new Set();
  (function rbfs(seed){ const q=[...seed]; while(q.length){const u=q.shift(); if(canEnd.has(u))continue; canEnd.add(u); inOf[u].forEach(f=>q.push(f.src));} })(ends.map(e=>e.id));
  // Không tới được end = ERROR: SKILL.md hứa "mọi node reachable từ start + TỚI ĐƯỢC end".
  // Đây chính là lớp lỗi "vào được trạng thái mà không ra được" — nghiệp vụ bị treo, không phải
  // chuyện thẩm mỹ. Loop hợp lệ (revise→draft) KHÔNG bị bắt oan: reverse-BFS đi qua nhánh thoát
  // của gateway nên mọi node trong vòng lặp vẫn tính là tới được end (đã test với IR loop thật).
  nodes.forEach(n => { if (n.kind!=='end' && reach.has(n.id) && !canEnd.has(n.id)) errors.push(`Node "${n.id}" KHÔNG dẫn tới end nào — nhánh cụt, nghiệp vụ vào rồi không ra được (thêm đường tới end hoặc bỏ node)`); });

  // ───────── (B) COVERAGE vs source ─────────
  const coverage = {};
  // Thiếu source facts → tầng (B) KHÔNG chạy. Trước đây skip IM LẶNG nên output vẫn in
  // "✅ IR structural OK" và người đọc tưởng đã đối chiếu nghiệp vụ (đo thật: 2/3 process
  // authentication không có src.json). Nay phải nói rõ là chưa đối chiếu gì.
  const hasSource = !!(source.actors?.length || source.branches?.length || source.errors?.length);
  if (!hasSource) {
    coverage._skipped = 'Không có source facts (.src.json) — CHƯA đối chiếu actor/branch/error với nguồn UC/SRS';
    warnings.push('THIẾU .src.json — chỉ kiểm được cấu trúc đồ thị, CHƯA đối chiếu phủ actor/nhánh/lỗi với nguồn nghiệp vụ. Sinh {process}.src.json để bật tầng coverage.');
  }
  const norm = s => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^a-z0-9]/g,'');
  function fuzzyHas(haystack, needle) {
    const n = norm(needle);
    return haystack.some(h => { const x = norm(h); return x.includes(n) || n.includes(x); });
  }

  if (source.actors?.length) {
    const laneNames = lanes.map(l => l.name);
    const missing = source.actors.filter(a => !fuzzyHas(laneNames, a));
    coverage.actors = { total: source.actors.length, covered: source.actors.length - missing.length, missing };
    missing.forEach(a => warnings.push(`Actor "${a}" trong nguồn KHÔNG có lane tương ứng — thiếu vai trò?`));
  }
  if (source.branches?.length) {
    const gwLabels = flows.filter(f => nodeById[f.src]?.kind === 'gateway').map(f => f.name).filter(Boolean);
    const missing = source.branches.filter(b => !fuzzyHas(gwLabels, b));
    coverage.branches = { total: source.branches.length, gatewayOutgoing: gwLabels.length, missing };
    if (missing.length) missing.forEach(b => warnings.push(`Branch nghiệp vụ "${b}" chưa thấy nhánh gateway tương ứng — thiếu rẽ nhánh?`));
  }
  if (source.errors?.length) {
    // error code (E-xxx) nên xuất hiện ở 1 end hoặc nhãn nhánh
    const haystack = [...nodes.map(n=>n.name), ...flows.map(f=>f.name).filter(Boolean)];
    const missing = source.errors.filter(e => !fuzzyHas(haystack, e) && !haystack.some(h=>norm(h).includes(norm(e))));
    coverage.errors = { total: source.errors.length, missing };
    missing.forEach(e => warnings.push(`Error "${e}" trong nguồn chưa thấy thể hiện (end/nhánh) — thiếu xử lý lỗi?`));
  }

  return { ok: errors.length === 0, errors, warnings, coverage };
}

// CLI: node bpmn-semcheck.mjs <ir.json> [source.json]
if (import.meta.url === `file://${process.argv[1]}`) {
  const { readFileSync } = await import('node:fs');
  const ir = JSON.parse(readFileSync(process.argv[2], 'utf8'));
  const src = process.argv[3] ? JSON.parse(readFileSync(process.argv[3], 'utf8')) : {};
  const r = checkIR(ir, src);
  // Báo TÁCH 2 tầng, không gộp 1 dòng "OK" đại diện cho cả structural lẫn coverage —
  // gộp là cách sinh ra ngộ nhận "đã kiểm hết" (bài học audit 2026-07-26).
  console.log(r.ok ? '✅ Structural: PASS' : `❌ Structural: FAIL (${r.errors.length} lỗi)`);
  r.errors.forEach(e => console.log('  ✗ ' + e));
  const covSkipped = !!r.coverage._skipped;
  console.log(covSkipped ? '⚠  Coverage:   SKIPPED (thiếu .src.json — chưa đối chiếu nguồn)' : '✅ Coverage:   đã đối chiếu nguồn');
  if (r.warnings.length) { console.log(`\n⚠ ${r.warnings.length} cảnh báo:`); r.warnings.forEach(w => console.log('  • ' + w)); }
  const shown = { ...r.coverage }; delete shown._skipped;
  if (Object.keys(shown).length) console.log('\nCoverage:', JSON.stringify(shown, null, 2));
  process.exit(r.ok ? 0 : 1);
}
