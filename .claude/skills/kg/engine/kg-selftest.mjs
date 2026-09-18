#!/usr/bin/env node
// kg-selftest.mjs — regression test cho KG engine trên FIXTURE CANONICAL
// (feature giả `smart-notification` viết 100% theo templates/SKILL hiện hành —
//  KHÔNG phải docs demo outdate). Golden assertions rút từ ID-CONTRACT của fixture.
//
// Chạy:  node .claude/skills/kg/engine/kg-selftest.mjs
// Exit:  0 = PASS hết · 1 = có assertion fail
//
// Fixture sống ở test-fixtures/docs/smart-notification/ (commit cùng engine).
// Có 1 GAP CỐ Ý: FR-smart-notification-004 không UC/US nào cover → coverage PHẢI bắt.
// Có 1 REF CỐ Ý DANGLING: CAP-smart-notification-01 (không có PRD trong fixture)
// → verify PHẢI báo dangling-ref cho đúng nó, không báo gì khác.

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const engineDir = path.dirname(fileURLToPath(import.meta.url));
const fixtureDocs = path.join(engineDir, "test-fixtures", "docs");

if (!fs.existsSync(fixtureDocs)) {
  console.error(`KHÔNG thấy fixture: ${fixtureDocs} — bộ fixture canonical chưa được cài.`);
  process.exit(1);
}

// Sandbox tạm: copy fixture vào temp để build không đụng vault thật.
const work = fs.mkdtempSync(path.join(os.tmpdir(), "kg-selftest-"));
fs.cpSync(fixtureDocs, path.join(work, "docs"), { recursive: true });
fs.mkdirSync(path.join(work, "docs", "_shared", "kg"), { recursive: true });

const graphPath = path.join(work, "docs", "_shared", "kg", "graph.json");
const run = (script, args) =>
  execFileSync(process.execPath, [path.join(engineDir, script), ...args], {
    cwd: work,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });

let pass = 0;
let fail = 0;
const ok = (name, cond, detail = "") => {
  if (cond) { pass += 1; console.log(`✓ ${name}`); }
  else { fail += 1; console.log(`✗ ${name}${detail ? ` — ${detail}` : ""}`); }
};

// ── 1. Build + deterministic ────────────────────────────────────────────────
run("kg-build.mjs", ["--dir", "docs", "--out", graphPath, "--quiet"]);
const g1 = fs.readFileSync(graphPath, "utf8");
run("kg-build.mjs", ["--dir", "docs", "--out", graphPath, "--quiet"]);
ok("build deterministic (2 lần byte-identical)", g1 === fs.readFileSync(graphPath, "utf8"));

const graph = JSON.parse(g1);
const nodes = new Map(graph.nodes.map((n) => [n.key, n]));
const byType = (t) => graph.nodes.filter((n) => n.type === t);
const edges = (t) => graph.edges.filter((e) => e.type === t);
const hasEdge = (t, fromIncl, toIncl) =>
  graph.edges.some((e) => e.type === t && e.from.includes(fromIncl) && e.to.includes(toIncl));

// ── 2. Node theo hợp đồng ───────────────────────────────────────────────────
ok("feature node", nodes.has("feature:smart-notification"));
ok("FR ×5", byType("requirement").filter((n) => n.subtype === "FR").length === 5,
  `có ${byType("requirement").filter((n) => n.subtype === "FR").length}`);
ok("NFR ×2 + BR ×2", byType("requirement").filter((n) => n.subtype === "NFR").length === 2 &&
  byType("requirement").filter((n) => n.subtype === "BR").length === 2);
ok("Error ×3", byType("error").length === 3, `có ${byType("error").length}`);
ok("use_case ×2", byType("use_case").length === 2);
ok("user_story ×3", byType("user_story").length === 3);
ok("AC ≥6", byType("acceptance_criterion").length >= 6, `có ${byType("acceptance_criterion").length}`);
ok("screen ×3", byType("screen").length === 3, `có ${byType("screen").length}`);
ok("flow ×2", byType("flow").length === 2, `có ${byType("flow").length}`);
ok("entity ×3 CamelCase hợp nhất", byType("entity").length === 3 &&
  nodes.has("entity:smart-notification/ChannelPreference"),
  byType("entity").map((n) => n.key).join(","));
ok("CHK ×6", byType("test_checklist_item").length === 6, `có ${byType("test_checklist_item").length}`);
ok("db_schema ×1 (3 tables)", byType("db_schema").length === 1 &&
  (byType("db_schema")[0]?.props?.tables || []).length === 3);
ok("state_machine ×2", byType("state_machine").length === 2);
ok("OQ có auto-ID (checkbox không mang ID)", byType("open_question").some((n) => n.key.includes("#OQ-a")));

// ── 3. Edge theo hợp đồng — MỖI loại nguồn canonical phải sống ─────────────
ok("SATISFIES uc-view→FR-001", hasEdge("SATISFIES", "uc-view-notifications", "FR-smart-notification-001"));
ok("COVERS us→FR ≥4", edges("COVERS").length >= 4, `có ${edges("COVERS").length}`);
ok("DERIVES US→UC ×3 (cột UC format mới)", edges("DERIVES").length >= 3 &&
  hasEdge("DERIVES", "us-003", "uc-mute-channel"), `có ${edges("DERIVES").length}`);
ok("VERIFIES AC→FR ≥4", graph.edges.filter((e) => e.type === "VERIFIES" && e.from.includes("#AC-")).length >= 4);
ok("VERIFIES CHK→FR/BR/E ≥5", graph.edges.filter((e) => e.type === "VERIFIES" && e.from.startsWith("CHK-")).length >= 5);
ok("RAISES uc-mute→E-002", hasEdge("RAISES", "uc-mute-channel", "E-smart-notification-002"));
ok("DISPLAYS screen→UC ≥2", edges("DISPLAYS").length >= 2, `có ${edges("DISPLAYS").length}`);
ok("CONTAINS flow→screen ≥3", graph.edges.filter((e) => e.type === "CONTAINS" && e.from.startsWith("flow:")).length >= 3);
ok("NAVIGATES_TO ×2 (Mục 3.5)", edges("NAVIGATES_TO").length === 2, `có ${edges("NAVIGATES_TO").length}`);
ok("OPERATES_ON ×2 đúng ops (CRUD matrix)", edges("OPERATES_ON").length === 2 &&
  edges("OPERATES_ON").some((e) => e.props?.ops === "RU") &&
  edges("OPERATES_ON").some((e) => e.props?.ops === "CU"),
  edges("OPERATES_ON").map((e) => e.props?.ops).join(","));
ok("TESTED_BY CHK→TC ×3", edges("TESTED_BY").length >= 3, `có ${edges("TESTED_BY").length}`);
ok("SAME_AS db→entity ×3 (số nhiều snake→Camel)", edges("SAME_AS").length === 3 &&
  hasEdge("SAME_AS", "/db", "ChannelPreference"), edges("SAME_AS").map((e) => e.to).join(","));
ok("INHERITS srs 4 file→spec", graph.edges.filter((e) =>
  e.type === "INHERITS_STATUS_FROM" && e.to.includes("smart-notification-spec.md")).length === 4);
ok("DESCRIBES_STATE_OF ×2", edges("DESCRIBES_STATE_OF").length === 2);

// ── 3b. Chuỗi test end-to-end (Phase 4 Wave 1) ──────────────────────────────
ok("TC-block node ×3 (key {file}#CHK-ID)", graph.nodes.filter((n) =>
  n.type === "test_case" && /testcases-.*#CHK-smart-notification-\d+$/.test(n.key)).length === 3);
ok("TESTED_BY CHK→TC-node (không phải file)", hasEdge("TESTED_BY", "CHK-smart-notification-001", "#CHK-smart-notification-001"));
ok("api_checklist_item ×3", byType("api_checklist_item").length === 3,
  `có ${byType("api_checklist_item").length}`);
ok("ACL VERIFIES FR-004 + E-003", hasEdge("VERIFIES", "#ACL-1", "FR-smart-notification-004") &&
  hasEdge("VERIFIES", "#ACL-2", "E-smart-notification-003"));
ok("API TC ×2 (key #TC-NN)", graph.nodes.filter((n) =>
  n.type === "test_case" && /api-tests\.md#TC-\d+$/.test(n.key)).length === 2);
ok("ACL#1 TESTED_BY TC-01 (exact key)", graph.edges.some((e) =>
  e.type === "TESTED_BY" && e.from.endsWith("api-checklist.md#ACL-1") && e.to.endsWith("api-tests.md#TC-01")));
ok("API TC VERIFIES FR-004", hasEdge("VERIFIES", "api-tests.md#TC-01", "FR-smart-notification-004"));
ok("e2e_spec ×1", byType("e2e_spec").length === 1, byType("e2e_spec").map((n) => n.key).join(","));
ok("AUTOMATES ×2 → CHK toàn cục", edges("AUTOMATES").length === 2 &&
  hasEdge("AUTOMATES", ".spec.ts", "CHK-smart-notification-001") &&
  hasEdge("AUTOMATES", ".spec.ts", "CHK-smart-notification-003"));

// ── 3c. Product planning + RENDERS (Phase 4 Wave 2) ─────────────────────────
const lb = nodes.get("feature:leaderboard");
ok("feature PLANNED-only (leaderboard, không folder)", !!lb && lb.props?.planned === "true" &&
  lb.props?.moscow === "Should" && lb.props?.detail_status === "todo",
  JSON.stringify(lb?.props || {}));
const sn = nodes.get("feature:smart-notification");
ok("feature thật enrich từ Feature Map + roadmap", sn?.props?.moscow === "Must" &&
  sn?.props?.horizon === "Now" && sn?.props?.theme === "Engagement" &&
  sn?.props?.detail_status === "done" && sn?.props?.planned === undefined,
  JSON.stringify(sn?.props || {}));
ok("DEPENDS_ON ×1 chính xác (leaderboard→smart-notification, KHÔNG feature ma)", edges("DEPENDS_ON").length === 1 &&
  graph.edges.some((e) => e.type === "DEPENDS_ON" && e.from === "feature:leaderboard" && e.to === "feature:smart-notification"));
ok("render_artifact ×5", byType("render_artifact").length === 5,
  byType("render_artifact").map((n) => n.key).join(","));
ok("RENDERS ×5 → screen", edges("RENDERS").filter((e) => e.to.startsWith("screen:")).length === 5);
ok("notification-list có đủ 3 kind render", ["figma", "prototype", "wireframe-html"].every((kind) =>
  nodes.has(`render:smart-notification/notification-list/${kind}`)));
ok("CATALOGS: prd ×2 VÀ roadmap ×2 riêng biệt", graph.edges.filter((e) =>
  e.type === "CATALOGS" && e.from.includes("_product/prd.md") && e.to.startsWith("feature:")).length === 2 &&
  graph.edges.filter((e) =>
    e.type === "CATALOGS" && e.from.includes("_product/roadmap.md") && e.to.startsWith("feature:")).length === 2);
ok("RENDERS → flow ×3 (basename resolve, per screen-render)", graph.edges.filter((e) =>
  e.type === "RENDERS" && e.to.startsWith("flow:")).length === 3 &&
  graph.edges.some((e) => e.type === "RENDERS" && e.to === "flow:smart-notification/view-notifications") &&
  graph.edges.filter((e) => e.type === "RENDERS" && e.to === "flow:smart-notification/mute-channel").length === 2);
ok("API TC own có provider mặc định + auth prop", graph.nodes.filter((n) =>
  /api-tests\.md#TC-\d+$/.test(n.key)).every((n) => n.props?.provider));

// ── 3d. Wave 3: meeting / glossary / UC relationships / userguide / bpmn ────
const MEET = "docs/meetings/2026-07-16-internal-smart-notification-kickoff.md";
const decisions = graph.nodes.filter((n) => n.type === "decision");
ok("meeting: 3 decision nodes {file}#D-n", decisions.length === 3 &&
  decisions.every((n) => n.key.startsWith(`${MEET}#D-`)));
ok("meeting: decision status parse đúng (D-3 superseded)",
  decisions.find((n) => n.key.endsWith("#D-3"))?.status === "superseded" &&
  decisions.find((n) => n.key.endsWith("#D-1"))?.status === "accepted");
ok("meeting: SUPERSEDES D-2→D-3 (chấp nhận notation 'D3')",
  graph.edges.some((e) => e.type === "SUPERSEDES" &&
    e.from === `${MEET}#D-2` && e.to === `${MEET}#D-3`));
ok("meeting: decision IMPACTS FR/BR từ cột Tác động",
  graph.edges.some((e) => e.type === "IMPACTS" && e.from === `${MEET}#D-1` &&
    e.to === "FR-smart-notification-004") &&
  graph.edges.some((e) => e.type === "IMPACTS" && e.from === `${MEET}#D-2` &&
    e.to === "BR-smart-notification-001"));
const raids = graph.nodes.filter((n) => n.type === "raid_item");
ok("meeting: 2 raid_item kind R + D", raids.length === 2 &&
  raids.some((n) => n.props?.kind === "R") && raids.some((n) => n.props?.kind === "D"));
const actions = graph.nodes.filter((n) => n.type === "action_item");
ok("meeting: 2 action_item, done true/false đúng checkbox", actions.length === 2 &&
  actions.find((n) => n.key.endsWith("#A-1"))?.props?.done === "true" &&
  actions.find((n) => n.key.endsWith("#A-2"))?.props?.done === "false");
const terms = graph.nodes.filter((n) => n.type === "term");
ok("glossary: 3 term nodes + alias Việt", terms.length === 3 &&
  terms.some((n) => n.key === "term:digest" &&
    (n.props?.aliases || []).includes("Email tổng hợp")));
ok("UC Relationships: EXTENDS uc-mute-channel → uc-view-notifications",
  graph.edges.some((e) => e.type === "EXTENDS" &&
    e.from.endsWith("uc-mute-channel.md") && e.to.endsWith("uc-view-notifications.md")));
ok("userguide: feature CONTAINS userguide index (scope: feature:{slug})",
  graph.edges.some((e) => e.type === "CONTAINS" && e.from === "feature:smart-notification" &&
    e.to.includes("userguide") && e.to.endsWith("index.md")));
ok("bpmn: errors[] E-code → RAISES declared (đường canonical)",
  graph.edges.some((e) => e.type === "RAISES" && e.from.endsWith("send-digest.ir.json") &&
    e.to === "E-smart-notification-003" && e.provenance === "declared"));
ok("bpmn: errors[] title verbatim → RAISES heuristic (fallback giữ dấu)",
  graph.edges.some((e) => e.type === "RAISES" && e.from.endsWith("send-digest.ir.json") &&
    e.to === "E-smart-notification-002" && e.provenance === "heuristic"));
const bpmnNode = graph.nodes.find((n) => n.type === "bpmn_process" &&
  n.key.endsWith("send-digest.ir.json"));
ok("bpmn: branches[] → props.branches", (bpmnNode?.props?.branches || []).length === 2);
ok("bpmn: actors[] → actor node + REFERENCES (không vào props)",
  graph.edges.some((e) => e.type === "REFERENCES" &&
    e.from.endsWith("send-digest.ir.json") && e.to.startsWith("actor:")) &&
  !bpmnNode?.props?.actors);
ok("userguide scope: product hợp lệ — KHÔNG bị báo format lệch",
  !(graph.meta.coverage.partial_parse_docs || []).some((entry) =>
    JSON.stringify(entry).includes("docs/userguide/userguide/index.md")) &&
  !(graph.meta.coverage.notes || []).some((note) =>
    String(note).includes("docs/userguide/userguide/index.md")));

// ── 4. Coverage phải BẮT gap cố ý (FR-004 digest không ai cover) ────────────
const coverage = run("kg-query.mjs", ["coverage", "smart-notification", "--graph", graphPath, "--all"]);
ok("coverage bắt FR-004 không US", /FR không có US Covers \(1\)/.test(coverage) &&
  coverage.includes("FR-smart-notification-004"));
ok("coverage KHÔNG báo oan FR khác", !coverage.includes("FR-smart-notification-001 |") ||
  !/FR không có US Covers[\s\S]*FR-smart-notification-001/.test(coverage.split("###")[1] || ""));
ok("coverage có footer Độ phủ", coverage.includes("Độ phủ:"));
ok("coverage: FR không có checklist (2 — FR-003 + FR-004)", /FR không có checklist VERIFIES \(2\)/.test(coverage) &&
  coverage.includes("FR-smart-notification-003") && coverage.includes("FR-smart-notification-004"));
ok("coverage: screen render đủ (0 gap)", /Screen không có render \(RENDERS\) \(0\)/.test(coverage));

// ── 5. Verify: dangling DUY NHẤT là CAP cố ý ────────────────────────────────
let verifyOut = "";
let verifyCode = 0;
try {
  verifyOut = run("kg-build.mjs", ["--dir", "docs", "--out", graphPath, "--verify"]);
} catch (error) {
  verifyCode = error.status ?? 1;
  verifyOut = `${error.stdout || ""}${error.stderr || ""}`;
}
const errorLines = verifyOut.split("\n").filter((l) => l.includes("✗"));
const nonCapErrors = errorLines.filter((l) => !l.includes("CAP-smart-notification"));
ok("verify exit 1 vì dangling CAP cố ý", verifyCode === 1);
ok("verify KHÔNG lỗi nào ngoài CAP cố ý", nonCapErrors.length === 0,
  nonCapErrors.slice(0, 3).join(" | "));

// ── 6. impact đi xuyên chuỗi FR→UC/US/AC/CHK ───────────────────────────────
const impact = run("kg-query.mjs", ["impact", "FR-smart-notification-003", "--graph", graphPath, "--all"]);
ok("impact FR-003 kéo uc-mute + us-003", impact.includes("uc-mute-channel") && impact.includes("us-003"));
const impact2 = run("kg-query.mjs", ["impact", "FR-smart-notification-002", "--graph", graphPath, "--all"]);
ok("impact FR-002 kéo CHK-003 (chuỗi test)", impact2.includes("CHK-smart-notification-003"));
ok("impact có Shortlist + Độ phủ", impact.includes("Shortlist file cần Read") && impact.includes("Độ phủ:"));

// ── 7. T1 temporal: graph-history.json (change_event stream) ────────────────
const historyPath = path.join(work, "docs", "_shared", "kg", "graph-history.json");
run("kg-history.mjs", ["--dir", "docs", "--graph", graphPath, "--out", historyPath, "--no-timestamp", "--quiet"]);
const h1 = fs.readFileSync(historyPath, "utf8");
run("kg-history.mjs", ["--dir", "docs", "--graph", graphPath, "--out", historyPath, "--no-timestamp", "--quiet"]);
ok("history build deterministic (2 lần byte-identical)", h1 === fs.readFileSync(historyPath, "utf8"));

const history = JSON.parse(h1);
const events = history.nodes.filter((n) => n.type === "change_event");
// Fixture changelog.md: 5 dòng, 1 dòng rác (<5 field) → 4 event hợp lệ.
ok("history 4 change_event (1 dòng rác bị skip)", events.length === 4, `có ${events.length}`);
ok("history skip đúng 1 dòng thiếu field",
  (history.meta.coverage.skipped_lines || []).length === 1 &&
  history.meta.coverage.skipped_lines[0].reason === "fewer-than-5-fields");
// Dòng note chứa "|" → phần sau field-5 ghép lại, KHÔNG mất.
const crEvent = events.find((e) => e.note.includes("CR-20260712-001"));
ok("history note giữ nguyên phần sau dấu pipe",
  crEvent && crEvent.note.includes("note có pipe"),
  crEvent ? crEvent.note : "không tìm thấy CR event");
// File bị xóa (không có node trong graph.json) → edge vẫn giữ + ghi dangling.
ok("history giữ dangling cho file đã xóa",
  (history.meta.coverage.dangling_targets || []).some((d) => d.file.includes("deleted-feature")));
ok("history CHANGED edge = số event", history.edges.filter((e) => e.type === "CHANGED").length === events.length);
ok("history sort theo sequence tăng dần",
  events.every((e, i) => i === 0 || e.sequence > events[i - 1].sequence));

// TÁCH SẠCH: graph.json chính TUYỆT ĐỐI không chứa node/edge temporal.
ok("graph.json chính KHÔNG có change_event", byType("change_event").length === 0);
ok("graph.json chính KHÔNG có edge CHANGED", edges("CHANGED").length === 0);

// Query history: doc có 2 event (spec.md: seq 2 + seq 4).
const histOut = run("kg-query.mjs", [
  "history", "docs/smart-notification/srs/smart-notification-spec.md",
  "--graph", graphPath, "--history-graph", historyPath, "--all",
]);
ok("query history trả 2 event cho spec.md",
  histOut.includes("initial spec 5 FR") && histOut.includes("CR-20260712-001"));

// Fail-loud: history-graph vắng → exit 2.
let histFailCode = 0;
try {
  run("kg-query.mjs", ["history", "docs/x.md", "--graph", graphPath, "--history-graph", path.join(work, "nope.json")]);
} catch (error) {
  histFailCode = error.status ?? 1;
}
ok("query history fail-loud khi thiếu graph-history (exit 2)", histFailCode === 2);

// ── 8. T2 temporal: AMENDS CR→requirement ──────────────────────────────────
// Rebuild history sau khi fixture đã có docs/cr/CR-20260715-001.md.
run("kg-history.mjs", ["--dir", "docs", "--graph", graphPath, "--out", historyPath, "--no-timestamp", "--quiet"]);
const history2 = JSON.parse(fs.readFileSync(historyPath, "utf8"));
const crNodes = history2.nodes.filter((n) => n.type === "change_request");
const amends = history2.edges.filter((e) => e.type === "AMENDS");

ok("T2 change_request node từ CR fixture", crNodes.some((n) => n.key === "CR-20260715-001"));
// CR sửa 2 requirement: BR-001 (full-form) + FR-003 (short-form expand).
ok("T2 AMENDS → BR-smart-notification-001",
  amends.some((e) => e.from === "CR-20260715-001" && e.to === "BR-smart-notification-001"));
ok("T2 AMENDS short-form FR-003 expand đúng feature",
  amends.some((e) => e.from === "CR-20260715-001" && e.to === "FR-smart-notification-003"));
// Before/after preview chỉ có ở block BR (block FR chỉ có bullet).
const brAmend = amends.find((e) => e.to === "BR-smart-notification-001");
ok("T2 before/after preview đúng nội dung (30 → 60 ngày)",
  brAmend && brAmend.before_preview.includes("30 ngày") && brAmend.after_preview.includes("60 ngày"));
ok("T2 is_preview=true trên AMENDS", amends.every((e) => e.is_preview === true));
// amend_kind (review #5): ID trong Before/After = "edited"; chỉ trong bullet = "mentioned".
// CR fixture: BR-001 có Before/After → edited; FR-003 chỉ bullet → mentioned.
const brEdge = amends.find((e) => e.to === "BR-smart-notification-001");
const frEdge = amends.find((e) => e.to === "FR-smart-notification-003");
ok("T2 amend_kind=edited cho ID trong Before/After", brEdge && brEdge.amend_kind === "edited");
ok("T2 amend_kind=mentioned cho ID chỉ trong bullet", frEdge && frEdge.amend_kind === "mentioned");
ok("T2 mentioned KHÔNG có before/after preview", frEdge && frEdge.before_preview === "" && frEdge.after_preview === "");
ok("T2 source.files là array", amends.every((e) => Array.isArray(e.source?.files)));
ok("T2 0 dangling AMENDS (mọi requirement cross-ref khớp)",
  (history2.meta.coverage.dangling_amends || []).length === 0);
// TÁCH SẠCH vẫn giữ: graph.json chính KHÔNG có AMENDS/change_request temporal.
ok("graph.json chính KHÔNG có edge AMENDS", edges("AMENDS").length === 0);
// determinism sau khi có CR.
const hd1 = fs.readFileSync(historyPath, "utf8");
run("kg-history.mjs", ["--dir", "docs", "--graph", graphPath, "--out", historyPath, "--no-timestamp", "--quiet"]);
ok("T2 history build deterministic (có CR)", hd1 === fs.readFileSync(historyPath, "utf8"));

// query history của requirement → hiện CR đã sửa.
const histReq = run("kg-query.mjs", [
  "history", "BR-smart-notification-001",
  "--graph", graphPath, "--history-graph", historyPath, "--all",
]);
ok("query history requirement hiện CR + before/after",
  histReq.includes("CR-20260715-001") && histReq.includes("60 ngày"));

// ── 8b. T3 temporal: revision + valid-time (nhánh NO-GIT — fixture temp không phải repo) ──
run("kg-history.mjs", ["--dir", "docs", "--graph", graphPath, "--out", historyPath, "--no-timestamp", "--quiet"]);
const history3 = JSON.parse(fs.readFileSync(historyPath, "utf8"));
const revs = history3.nodes.filter((n) => n.type === "revision");
// Fixture temp KHÔNG phải git repo → git_available=false → revision chỉ từ AMENDS edited.
ok("T3 git_available=false trên fixture (no-git)", history3.meta.coverage.git_available === false);
// BR-001 có AMENDS edited (CR fixture) → phải có ≥1 revision từ nhánh no-git.
ok("T3 revision từ AMENDS edited (no-git fallback)",
  revs.some((r) => r.requirement === "BR-smart-notification-001" && r.source_cr === "CR-20260715-001"));
ok("T3 revision no-git: git_commit=null, content_hash=null",
  revs.filter((r) => r.requirement === "BR-smart-notification-001")
    .every((r) => r.git_commit === null && r.content_hash === null));
ok("T3 REVISION_OF edge = số revision", history3.edges.filter((e) => e.type === "REVISION_OF").length === revs.length);
// FR-003 chỉ mentioned (không edited) → KHÔNG dựng revision (no-git, không mốc edited).
ok("T3 mentioned-only requirement KHÔNG có revision (no-git)",
  !revs.some((r) => r.requirement === "FR-smart-notification-003"));
// TÁCH SẠCH: graph.json chính KHÔNG có revision/REVISION_OF.
ok("graph.json chính KHÔNG có node revision", byType("revision").length === 0);
ok("graph.json chính KHÔNG có edge REVISION_OF", edges("REVISION_OF").length === 0);
// determinism T3.
const hr1 = fs.readFileSync(historyPath, "utf8");
run("kg-history.mjs", ["--dir", "docs", "--graph", graphPath, "--out", historyPath, "--no-timestamp", "--quiet"]);
ok("T3 history build deterministic (revision)", hr1 === fs.readFileSync(historyPath, "utf8"));

// query asof: bản BR-001 hiệu lực lúc ngày CR (2026-07-15).
const asofOut = run("kg-query.mjs", [
  "asof", "BR-smart-notification-001", "2026-07-15",
  "--graph", graphPath, "--history-graph", historyPath,
]);
ok("query asof trả bản hiệu lực đúng ngày",
  asofOut.includes("Bản hiệu lực") && asofOut.includes("CR-20260715-001"));
// asof ngày quá sớm (trước mọi revision) → báo không có bản.
const asofEarly = run("kg-query.mjs", [
  "asof", "BR-smart-notification-001", "2020-01-01",
  "--graph", graphPath, "--history-graph", historyPath,
]);
ok("query asof ngày quá sớm → báo không có bản + list mốc",
  asofEarly.includes("Không có bản nào hiệu lực") && asofEarly.includes("Các mốc có"));

// ── 8c. T3 nhánh CÓ-git: mini git repo, 2 commit sửa 1 FR (review chéo) ───
// Test P0.1 (valid_to bản cuối=null), P0.3 (skip commit trước khi FR tồn tại),
// dedup content_hash, commit cùng-ngày sort theo git order.
{
  const gwork = fs.mkdtempSync(path.join(os.tmpdir(), "kg-git-"));
  const gdocs = path.join(gwork, "docs");
  const specDir = path.join(gdocs, "gitfeat", "srs");
  const kgDir = path.join(gdocs, "_shared", "kg");
  fs.mkdirSync(specDir, { recursive: true });
  fs.mkdirSync(kgDir, { recursive: true });
  const spec = path.join(specDir, "gitfeat-spec.md");
  const gitEnv = {
    ...process.env,
    GIT_AUTHOR_NAME: "t", GIT_AUTHOR_EMAIL: "t@t",
    GIT_COMMITTER_NAME: "t", GIT_COMMITTER_EMAIL: "t@t",
  };
  const git = (args, extraEnv = {}) =>
    execFileSync("git", args, { cwd: gwork, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"], env: { ...gitEnv, ...extraEnv } });
  let gitOk = true;
  try {
    git(["init", "-q"]);
    git(["config", "user.email", "t@t"]); git(["config", "user.name", "t"]);
    // Bảng FR đúng format kg-build parse (| ID | Title | Description | Priority | Source |).
    const fm = "---\ntype: srs\nfeature: gitfeat\nstatus: draft\n---\n\n## 2. Functional Requirements\n\n";
    const hdr = "| ID | Title | Description | Priority | Source |\n|----|-------|-------------|----------|--------|\n";
    const mkFr001 = (desc) => `| FR-gitfeat-001 | Tính năng chính | ${desc} | P0 | brainstorm Mục 1 |\n`;
    const fr002 = "| FR-gitfeat-002 | Khác | Mô tả FR-002 không đổi qua các bản. | P1 | brainstorm Mục 2 |\n";
    // Commit 1 (2026-01-01): spec CHƯA có FR-gitfeat-001 (chỉ FR-002).
    fs.writeFileSync(spec, `${fm}${hdr}${fr002}`);
    git(["add", "."]);
    git(["commit", "-q", "-m", "c1"], { GIT_AUTHOR_DATE: "2026-01-01T10:00:00", GIT_COMMITTER_DATE: "2026-01-01T10:00:00" });
    // Commit 2 (2026-02-01): THÊM FR-gitfeat-001 = "bản A".
    fs.writeFileSync(spec, `${fm}${hdr}${mkFr001("Bản A của tính năng.")}${fr002}`);
    git(["add", "."]);
    git(["commit", "-q", "-m", "c2"], { GIT_AUTHOR_DATE: "2026-02-01T10:00:00", GIT_COMMITTER_DATE: "2026-02-01T10:00:00" });
    // Commit 3 (2026-03-01): FR-001 đổi = "bản B".
    fs.writeFileSync(spec, `${fm}${hdr}${mkFr001("Bản B đổi rồi hoàn toàn khác.")}${fr002}`);
    git(["add", "."]);
    git(["commit", "-q", "-m", "c3"], { GIT_AUTHOR_DATE: "2026-03-01T10:00:00", GIT_COMMITTER_DATE: "2026-03-01T10:00:00" });
  } catch { gitOk = false; }

  if (!gitOk) {
    ok("T3 git-branch: git không dùng được trong sandbox — SKIP (không fail)", true);
  } else {
    const ggraph = path.join(kgDir, "graph.json");
    const ghist = path.join(kgDir, "graph-history.json");
    execFileSync(process.execPath, [path.join(engineDir, "kg-build.mjs"), "--dir", "docs", "--out", ggraph, "--quiet"], { cwd: gwork });
    execFileSync(process.execPath, [path.join(engineDir, "kg-history.mjs"), "--dir", "docs", "--graph", ggraph, "--out", ghist, "--no-timestamp", "--quiet"], { cwd: gwork });
    const gh = JSON.parse(fs.readFileSync(ghist, "utf8"));
    ok("T3 git: git_available=true", gh.meta.coverage.git_available === true);
    const fr1 = gh.nodes.filter((n) => n.type === "revision" && n.requirement === "FR-gitfeat-001")
      .sort((a, b) => a.key.localeCompare(b.key));
    // P0.3: commit c1 (chưa có FR-001) KHÔNG sinh revision → chỉ 2 bản (A ở c2, B ở c3).
    ok("T3 git: FR-001 có 2 revision (P0.3 skip commit trước khi tồn tại)", fr1.length === 2, `có ${fr1.length}`);
    // P0.1: bản cuối valid_to=null, valid_from theo thứ tự.
    ok("T3 git: valid_from đúng (2026-02-01 → 2026-03-01)",
      fr1[0]?.valid_from === "2026-02-01" && fr1[1]?.valid_from === "2026-03-01");
    ok("T3 git: bản cuối valid_to=null (P0.1)", fr1[1]?.valid_to === null);
    ok("T3 git: bản đầu valid_to = valid_from bản kế (no gap)", fr1[0]?.valid_to === "2026-03-01");
    ok("T3 git: content_hash khác nhau (A≠B)", fr1[0]?.content_hash && fr1[1]?.content_hash && fr1[0].content_hash !== fr1[1].content_hash);
    ok("T3 git: git_commit là hex hash", /^[0-9a-f]{40}$/.test(fr1[0]?.git_commit || ""));
    // asof --show lấy nội dung git đúng.
    const asofShow = execFileSync(process.execPath,
      [path.join(engineDir, "kg-query.mjs"), "asof", "FR-gitfeat-001", "2026-02-15", "--show", "--graph", ggraph, "--history-graph", ghist],
      { cwd: gwork, encoding: "utf8" });
    ok("T3 git: asof --show trả nội dung bản A tại 2026-02-15", asofShow.includes("Bản A của tính năng"));
    // determinism nhánh git.
    const gd1 = fs.readFileSync(ghist, "utf8");
    execFileSync(process.execPath, [path.join(engineDir, "kg-history.mjs"), "--dir", "docs", "--graph", ggraph, "--out", ghist, "--no-timestamp", "--quiet"], { cwd: gwork });
    ok("T3 git: build deterministic (nhánh có-git)", gd1 === fs.readFileSync(ghist, "utf8"));
  }
  fs.rmSync(gwork, { recursive: true, force: true });
}

// ── 9. tour <feature> : lộ trình đọc theo thứ tự phụ thuộc ──────────────────
const tour = run("kg-query.mjs", ["tour", "smart-notification", "--graph", graphPath, "--all"]);
const tourLine = (frag) => {
  const line = tour.split("\n").find((l) => l.includes(frag));
  return line ? tour.split("\n").indexOf(line) : -1;
};
// Xương sống đúng thứ tự tầng: srs spec TRƯỚC use_case TRƯỚC user_story TRƯỚC test.
const iSpec = tourLine("smart-notification-spec.md");
const iUc = tourLine("uc-view-notifications.md");
const iUs = tourLine("us-001.md");
const iTestcase = tourLine("smart-notification-testcase-index.md");
ok("tour: spec đứng trước use_case", iSpec > 0 && iUc > 0 && iSpec < iUc, `spec@${iSpec} uc@${iUc}`);
ok("tour: use_case đứng trước user_story", iUc > 0 && iUs > 0 && iUc < iUs, `uc@${iUc} us@${iUs}`);
ok("tour: user_story đứng trước test-cases index", iUs > 0 && iTestcase > 0 && iUs < iTestcase, `us@${iUs} tc@${iTestcase}`);
// UC nhiều US-DERIVES đọc trước: uc-view-notifications (2 US) trước uc-mute-channel (1 US).
const iUcView = tourLine("uc-view-notifications.md");
const iUcMute = tourLine("uc-mute-channel.md");
ok("tour: UC nhiều-US-derive đứng trước UC ít-derive",
  iUcView > 0 && iUcMute > 0 && iUcView < iUcMute, `view@${iUcView} mute@${iUcMute}`);
// AC KHÔNG xuất hiện thành bước riêng (inline trong us-*.md).
ok("tour: KHÔNG có dòng loại acceptance_criterion",
  !/\|\s*acceptance_criterion\s*\|/.test(tour));
// Footer contract giữ nguyên.
ok("tour: có footer Phải Read tay", tour.includes("### Phải Read tay (ngoài graph)"));
ok("tour: có dòng Độ phủ", tour.includes("Độ phủ:"));
// Tài liệu phụ (doc-type ngoài tầng vòng đời) có section riêng khi có node phụ.
ok("tour: mục Tài liệu phụ tồn tại khi có node phụ",
  tour.includes("Tài liệu phụ") || /, 0 phụ\)/.test(tour));
// T2 (review vòng 5): cột "Vì sao" của US hiện nhãn cạnh (US→UC/FR outgoing), KHÔNG "—".
const usLine = tour.split("\n").find((l) => /\bus-001\.md\b/.test(l) && l.includes("user_story"));
ok("tour: reason của US có nhãn cạnh (xét outgoing, không '—')",
  usLine && /[←→]\d+×[A-Z]/.test(usLine), usLine ? usLine.trim() : "no us-001 row");

// tour feature không tồn tại → exit 1 (assertFeatureExists).
let tourBadCode = 0;
try {
  run("kg-query.mjs", ["tour", "khong-ton-tai", "--graph", graphPath]);
} catch (e) { tourBadCode = e.status; }
ok("tour feature lạ → exit 1", tourBadCode === 1);

// ── 10. impact --staged / --since : seed từ git diff ────────────────────────
// Dựng git repo trong sandbox: commit baseline, rồi sửa+stage spec → seed ra FR/BR/E.
const git = (args) =>
  execFileSync("git", args, { cwd: work, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
let gitOk = true;
try {
  git(["init", "-q"]);
  git(["config", "user.email", "t@t.t"]);
  git(["config", "user.name", "t"]);
  git(["add", "-A"]);
  git(["commit", "-q", "-m", "baseline"]);
} catch { gitOk = false; }

if (gitOk) {
  // --staged khi chưa stage gì → thông báo rỗng (exit 0), KHÔNG lỗi.
  const emptyStaged = run("kg-query.mjs", ["impact", "--staged", "--graph", graphPath]);
  ok("impact --staged rỗng → thông báo không lỗi",
    emptyStaged.includes("Không có file thay đổi"));

  // Sửa + stage spec.md → seed gồm FR/BR/E của feature, closure nở downstream.
  const specPath = path.join(work, "docs", "smart-notification", "srs", "smart-notification-spec.md");
  fs.appendFileSync(specPath, "\n<!-- staged-test -->\n");
  git(["add", "docs/smart-notification/srs/smart-notification-spec.md"]);
  const staged = run("kg-query.mjs", ["impact", "--staged", "--graph", graphPath, "--all"]);
  ok("impact --staged: seed từ file spec đổi (FR node)",
    staged.includes("FR-smart-notification-001"));
  ok("impact --staged: header ghi số file docs/ đổi",
    /1 file docs\/ đổi/.test(staged));
  ok("impact --staged: có shortlist + footer",
    staged.includes("Shortlist file cần Read") && staged.includes("Độ phủ:"));

  // --staged + ID positional → loại trừ nhau (exit 1).
  let mutexCode = 0;
  try {
    run("kg-query.mjs", ["impact", "--staged", "FR-smart-notification-001", "--graph", graphPath]);
  } catch (e) { mutexCode = e.status; }
  ok("impact --staged + ID positional → exit 1 (loại trừ)", mutexCode === 1);

  // R1 (review vòng 2): explicit `impact <doc-path>` root type=doc VẪN nở (không
  // regress thành lá) — seed spec doc-node phải kéo FR/downstream vào closure.
  const explicitDoc = run("kg-query.mjs",
    ["impact", "docs/smart-notification/srs/smart-notification-spec.md", "--graph", graphPath, "--all"]);
  ok("R1 explicit impact <doc-path> vẫn nở (không regress thành lá)",
    /Node bị ảnh hưởng/.test(explicitDoc) &&
    (explicitDoc.match(/^\| \d+ \|/gm) || []).length > 0);

  // R2: untracked .md mới (chưa git add) → --unstaged phải thấy (vào unmapped Read tay).
  const untr = path.join(work, "docs", "smart-notification", "srs", "_untracked-new.md");
  fs.writeFileSync(untr, "---\ntype: srs\nfeature: smart-notification\n---\n# tmp\n");
  const unstaged = run("kg-query.mjs", ["impact", "--unstaged", "--graph", graphPath, "--all"]);
  ok("R2 --unstaged thấy file untracked mới", unstaged.includes("_untracked-new.md"));
  fs.rmSync(untr, { force: true });

  // R2-noise: file KHÔNG khớp extension KG-ingest (vd machine-state không đuôi) bị lọc
  // — KHÔNG phải vì dot-dir mà vì không khớp ext (mirror kg-build: builder không lọc
  // dir ẩn, chỉ lọc theo ext). Dùng dir ẩn + file không đuôi để mô phỏng .status-state.
  const hiddenDir = path.join(work, "docs", "smart-notification", ".hidden-state");
  fs.mkdirSync(hiddenDir, { recursive: true });
  fs.writeFileSync(path.join(hiddenDir, "abc123"), "noise");        // không đuôi → lọc
  const unstaged2 = run("kg-query.mjs", ["impact", "--unstaged", "--graph", graphPath, "--all"]);
  ok("R2 file không-khớp-ext (machine-state) bị lọc khỏi Read-tay", !unstaged2.includes("abc123"));
  fs.rmSync(hiddenDir, { recursive: true, force: true });

  // M3 (review vòng 4): builder walk .md bất kỳ (KHÔNG lọc dir ẩn) → .md trong dir ẩn
  // PHẢI được nhận (không bị filter dot-segment). Đối xứng với case trên.
  const hiddenMd = path.join(work, "docs", "smart-notification", ".draft", "_wip.md");
  fs.mkdirSync(path.dirname(hiddenMd), { recursive: true });
  fs.writeFileSync(hiddenMd, "---\ntype: srs\nfeature: smart-notification\n---\n# wip\n");
  const unstaged3 = run("kg-query.mjs", ["impact", "--unstaged", "--graph", graphPath, "--all"]);
  ok("M3 .md trong dir ẩn VẪN được nhận (mirror kg-build không lọc dir ẩn)",
    unstaged3.includes("_wip.md"));
  fs.rmSync(path.dirname(hiddenMd), { recursive: true, force: true });

  // M3b: .spec.ts KHÔNG tính là nguồn KG-ingest (builder sinh e2e_spec từ index link).
  const specTs = path.join(work, "docs", "smart-notification", "test", "e2e", "specs", "_x.spec.ts");
  fs.mkdirSync(path.dirname(specTs), { recursive: true });
  fs.writeFileSync(specTs, "// gen\n");
  const unstaged4 = run("kg-query.mjs", ["impact", "--unstaged", "--graph", graphPath, "--all"]);
  ok("M3b .spec.ts KHÔNG vào Read-tay (auto-gen, không phải nguồn)", !unstaged4.includes("_x.spec.ts"));
  fs.rmSync(path.dirname(specTs), { recursive: true, force: true });

  // M2 (review vòng 3): stage bpmn .src.json → seed node .ir.json companion (không unmapped).
  const srcJson = path.join(work, "docs", "smart-notification", "bpmn", "send-digest.src.json");
  if (fs.existsSync(srcJson)) {
    fs.appendFileSync(srcJson, "\n");
    git(["add", "docs/smart-notification/bpmn/send-digest.src.json"]);
    const bpmnStaged = run("kg-query.mjs", ["impact", "--staged", "--graph", graphPath, "--all"]);
    ok("M2 bpmn .src.json seed node .ir.json (không unmapped)",
      bpmnStaged.includes("send-digest.ir.json") && bpmnStaged.includes("bpmn_process"));
    git(["restore", "--staged", "docs/smart-notification/bpmn/send-digest.src.json"]);
    // dọn thay đổi working-tree để không nhiễu assertion sau.
    git(["checkout", "--", "docs/smart-notification/bpmn/send-digest.src.json"]);
  }

  // R5: --since kết hợp --staged → exit 1 (loại trừ phạm vi).
  let sinceStagedCode = 0;
  try {
    run("kg-query.mjs", ["impact", "--since", "HEAD", "--staged", "--graph", graphPath]);
  } catch (e) { sinceStagedCode = e.status; }
  ok("R5 --since + --staged → exit 1 (loại trừ)", sinceStagedCode === 1);

  // F4: --since thiếu ref → exit 1 argument error (không phải 'not a git repo').
  let sinceNoRef = 0;
  try {
    run("kg-query.mjs", ["impact", "--since", "--graph", graphPath]);
  } catch (e) { sinceNoRef = e.status; }
  ok("F4 --since thiếu ref → exit 1", sinceNoRef === 1);
} else {
  ok("impact --staged (git không dùng được trong sandbox — bỏ qua)", true);
}

fs.rmSync(work, { recursive: true, force: true });
console.log(`\nKG SELFTEST: ${pass} pass / ${fail} fail`);
process.exit(fail ? 1 : 0);
