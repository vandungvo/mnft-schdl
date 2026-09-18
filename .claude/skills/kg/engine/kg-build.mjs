#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const SCHEMA_VERSION = 1;
const EXTRACTOR_VERSION = "1.0.0";

const GLOBAL_ID_RE =
  /^(?:FR|NFR|BR|E|BO|CAP|CHK)-[a-z0-9][a-z0-9-]*-\d{2,4}$|^CR-\d{8}-\d{3}$/i;

const EXCLUDED_DIRS = new Set([
  "exports",
  "inbox",
  "reports",
  "_regen-sample",
  "guides",
]);

// Log máy-sinh dưới docs/_shared/. Từ khi chuyển .log → .md (bảng Markdown)
// chúng lọt vào walk-scope như tài liệu thường, khiến ID nhắc trong cột "Ghi chú"
// (vd "applied CR-...") bị bắt thành dangling-ref. Chúng là EVENT STREAM —
// đã có parser riêng (parseActivityLog / parseStalenessLog) — không phải nguồn
// evidence nghiệp vụ, nên loại khỏi walk.
const MACHINE_LOG_FILES = new Set([
  "_shared/changelog.md",
  "_shared/staleness.md",
]);

const PROJECT_LEVEL_DIRS = new Set([
  "_shared",
  "_product",
  "_research",
  "cr",
  "meetings",
  "decisions",
  "blockers",
  "changes",
  "impacts",
  "userguide",
]);

const PROVENANCE_PRIORITY = {
  heuristic: 1,
  table: 2,
  declared: 3,
};

function compareText(a, b) {
  return a < b ? -1 : a > b ? 1 : 0;
}

function toPosix(value) {
  return value.split(path.sep).join("/");
}

function uniqueSorted(values) {
  return [...new Set(values.filter((value) => value !== ""))].sort(compareText);
}

function stripQuotes(value) {
  const text = String(value ?? "").trim();
  if (
    text.length >= 2 &&
    ((text.startsWith('"') && text.endsWith('"')) ||
      (text.startsWith("'") && text.endsWith("'")))
  ) {
    return text.slice(1, -1);
  }
  return text;
}

function foldText(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/đ/gi, "d")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

function slugify(value) {
  return foldText(value)
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function cleanCell(value) {
  return String(value ?? "")
    .replace(/\\\|/g, "|")
    .replace(/<br\s*\/?>/gi, ", ")
    .replace(/\[\[([^\]|#]+)(?:#[^\]|]+)?(?:\|([^\]]+))?\]\]/g, (_, target, label) =>
      label || target
    )
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1")
    .replace(/<[^>]+>/g, "")
    .replace(/[*_~]/g, "")
    .replace(/`([^`]+)`/g, "$1")
    .trim();
}

function cleanTitle(value) {
  return cleanCell(value)
    .replace(/^#+\s*/, "")
    .replace(/\s+/g, " ")
    .trim();
}

function parseArgs(argv) {
  const result = {
    dir: "docs",
    out: "docs/_shared/kg/graph.json",
    verify: false,
    quiet: false,
    noTimestamp: true,   // MẶC ĐỊNH deterministic (epoch) — graph.json/viewer commit không churn; --timestamp để opt-in giờ thật
    strict: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];

    if (token === "--dir" || token === "--out") {
      const value = argv[index + 1];
      if (!value || value.startsWith("--")) {
        throw new Error(`Thiếu giá trị cho ${token}`);
      }
      result[token === "--dir" ? "dir" : "out"] = value;
      index += 1;
      continue;
    }

    if (token === "--verify") result.verify = true;
    else if (token === "--quiet") result.quiet = true;
    else if (token === "--no-timestamp") result.noTimestamp = true;
    else if (token === "--timestamp") result.noTimestamp = false;
    else if (token === "--strict") result.strict = true;
    else throw new Error(`Flag không hỗ trợ: ${token}`);
  }

  return result;
}

function walkScope(dirAbs) {
  const files = [];

  function visit(current, relativeDir = "") {
    const entries = fs
      .readdirSync(current, { withFileTypes: true })
      .sort((a, b) => compareText(a.name, b.name));

    for (const entry of entries) {
      const abs = path.join(current, entry.name);
      const rel = relativeDir
        ? `${relativeDir}/${entry.name}`
        : entry.name;

      if (entry.isDirectory()) {
        const topLevel = rel.split("/")[0];
        if (EXCLUDED_DIRS.has(topLevel)) continue;
        visit(abs, rel);
        continue;
      }

      if (!entry.isFile()) continue;

      if (entry.name.endsWith(".md")) {
        if (MACHINE_LOG_FILES.has(rel)) continue;
        files.push({ abs, kind: "markdown" });
        continue;
      }

      if (
        entry.name.endsWith(".dbml") &&
        /^([^/]+)\/dbdiagram\/\1\.dbml$/.test(rel)
      ) {
        files.push({ abs, kind: "dbdiagram" });
        continue;
      }

      if (
        (entry.name.endsWith(".ir.json") ||
          entry.name.endsWith(".src.json")) &&
        rel.split("/").includes("bpmn")
      ) {
        files.push({
          abs,
          kind: entry.name.endsWith(".src.json")
            ? "bpmn-source"
            : "bpmn",
        });
      }
    }
  }

  visit(dirAbs);
  return files;
}

function parseScalar(value) {
  const text = String(value ?? "").trim();

  if (text.startsWith("[") && text.endsWith("]")) {
    const inner = text.slice(1, -1).trim();
    if (!inner) return [];
    return inner
      .split(",")
      .map((item) => stripQuotes(item))
      .filter(Boolean);
  }

  return stripQuotes(text);
}

// Parse frontmatter YAML subset: scalar, inline list và flat list "- item".
function parseFrontmatter(lines) {
  if (lines[0]?.trim() !== "---") {
    return {
      hasFrontmatter: false,
      data: {},
      entries: {},
      bodyLine: 1,
    };
  }

  const secondMeaningful = lines
    .slice(1, 8)
    .find((line) => line.trim() && !line.trim().startsWith("#"));

  // Test-case zero-frontmatter dùng "---" làm separator block.
  if (
    secondMeaningful &&
    !/^[A-Za-z0-9_-]+\s*:/.test(secondMeaningful.trim())
  ) {
    return {
      hasFrontmatter: false,
      data: {},
      entries: {},
      bodyLine: 1,
    };
  }

  let closing = -1;
  for (let index = 1; index < lines.length; index += 1) {
    if (lines[index].trim() === "---") {
      closing = index;
      break;
    }
  }

  if (closing < 0) {
    throw new Error("frontmatter không có dòng đóng ---");
  }

  const data = {};
  const entries = {};
  let activeListKey = null;

  for (let index = 1; index < closing; index += 1) {
    const raw = lines[index];
    const trimmed = raw.trim();
    const line = index + 1;

    if (!trimmed || trimmed.startsWith("#")) continue;

    const listMatch = raw.match(/^\s+-\s+(.*)$/);
    if (listMatch && activeListKey) {
      if (!Array.isArray(data[activeListKey])) data[activeListKey] = [];
      const value = stripQuotes(listMatch[1]);
      data[activeListKey].push(value);
      entries[activeListKey] ??= [];
      entries[activeListKey].push({ value, line });
      continue;
    }

    const keyMatch = raw.match(/^([A-Za-z0-9_-]+)\s*:\s*(.*)$/);
    if (!keyMatch) {
      // Nested object ngoài subset được bỏ qua an toàn.
      activeListKey = null;
      continue;
    }

    const [, key, rawValue] = keyMatch;
    const value = parseScalar(rawValue);

    if (rawValue.trim() === "") {
      data[key] = [];
      entries[key] = [];
      activeListKey = key;
      continue;
    }

    data[key] = value;
    entries[key] = Array.isArray(value)
      ? value.map((item) => ({ value: item, line }))
      : [{ value, line }];
    activeListKey = null;
  }

  return {
    hasFrontmatter: true,
    data,
    entries,
    bodyLine: closing + 2,
  };
}

function splitMarkdownRow(line) {
  let text = line.trim();
  if (text.startsWith("|")) text = text.slice(1);
  if (text.endsWith("|")) text = text.slice(0, -1);

  const cells = [];
  let buffer = "";
  let escaped = false;
  let inCode = false;

  for (const char of text) {
    if (escaped) {
      buffer += char;
      escaped = false;
      continue;
    }

    if (char === "\\") {
      buffer += char;
      escaped = true;
      continue;
    }

    if (char === "`") {
      inCode = !inCode;
      buffer += char;
      continue;
    }

    if (char === "|" && !inCode) {
      cells.push(buffer.trim());
      buffer = "";
      continue;
    }

    buffer += char;
  }

  cells.push(buffer.trim());
  return cells;
}

function isSeparatorRow(cells) {
  return (
    cells.length > 0 &&
    cells.every((cell) => /^:?-{3,}:?$/.test(cell.trim()))
  );
}

function canonicalHeader(header) {
  const folded = foldText(cleanCell(header))
    .replace(/\[[^\]]*\]/g, "") // "Từ màn [#]" → "tu man" (template 3.5 canonical)
    .replace(/\s+/g, " ")
    .trim();
  const raw = folded
    .replace(/\([^)]*\)/g, "")
    .replace(/\s+/g, " ")
    .trim();

  // "Ưu tiên (MoSCoW)" phải giữ semantic MoSCoW; nếu strip phần ngoặc trước
  // thì header này bị map nhầm sang priority tổng quát.
  if (/(?:^|\s)moscow(?:\s|$)/.test(folded)) return "moscow";

  const direct = new Map([
    ["covers fr", "covers_fr"],
    ["related fr", "covers_fr"],
    ["fr", "covers_fr"],
    ["fr lien quan", "covers_fr"],
    ["actor chinh", "actor"],
    ["uu tien", "priority"],
    ["tinh nang", "title"],
    ["moscow", "moscow"],
    ["phu thuoc", "depends"],
    ["chi tiet hoa", "detail_status"],
    ["theme", "theme"],
    ["persona", "persona"],
    ["diem", "score"],
    ["effort", "effort"],
    ["quy", "horizon"],
    ["giai doan", "horizon"],
    ["san sang dep", "dep_readiness"],
    ["figma", "figma"],
    ["html prototype", "prototype"],
    ["html wireframe", "wireframe_html"],
    ["ten", "title"],
    ["ten flow", "title"],
    ["tieu de", "title"],
    ["screens", "screens"],
    ["screens used", "screens"],
    ["screen", "screens"],
    ["man hinh", "screen"],
    ["man hinh gom", "screens"],
    ["ui field", "ui"],
    ["ui field man hinh", "ui"],
    ["ui hanh vi", "ui"],
    ["actor", "actor"],
    ["actor primary", "actor"],
    ["primary actor", "actor"],
    ["errors", "errors"],
    ["error", "errors"],
    ["errors e-*", "errors"],
    ["uc", "uc"],
    ["use case", "uc"],
    ["jira", "jira"],
    ["jira key", "jira"],
    ["ref", "ref"],
    ["ref→fr", "ref"],
    ["ref fr", "ref"],
    ["id", "id"],
    ["error id", "id"],
    ["slug", "id"],
    ["#", "number"],
    ["flow-slug", "flow"],
    ["title", "title"],
    ["requirement", "requirement"],
    ["rule", "rule"],
    ["description", "description"],
    ["status", "status"],
    ["priority", "priority"],
    ["p", "priority"],
    ["dir", "direction"],
    ["direction", "direction"],
    ["expected result", "expected"],
    ["conf", "confidence"],
    ["provider", "provider"],
    ["tc", "tc"],
    ["assert", "assert"],
    ["ket qua", "result"],
    ["lan chay", "run_at"],
    ["ket qua gan nhat", "last_result"],
    ["chay luc", "run_at"],
    ["chk-id", "chk_id"],
    ["ly do", "reason"],
    ["updated", "updated"],
    ["level", "level"],
    ["oq ref", "oq_ref"],
    ["thuoc flow", "flow"],
    ["used by functions", "used_by"],
    ["file", "file"],
    ["target", "target"],
    ["source checklist", "source_checklist"],
    ["system", "system"],
    ["system entity.attr", "system"],
    ["api field", "api_field"],
    ["api field action", "api_field"],
    ["tu", "from"],
    ["tu man", "from"],
    ["from", "from"],
    ["den", "to"],
    ["den man", "to"],
    ["sang", "to"],
    ["to", "to"],
    ["trigger", "trigger"],
    ["dieu kien", "condition"],
    ["condition", "condition"],
    ["type", "relation_type"],
    ["relationship", "relation_type"],
    ["relationship type", "relation_type"],
    ["kieu quan he", "relation_type"],
    ["loai quan he", "relation_type"],
    ["uc nguon", "from"],
    ["source uc", "from"],
    ["uc dich", "to"],
    ["target uc", "to"],
    ["quyet dinh", "decision"],
    ["nguoi chot", "decided_by"],
    ["by", "decided_by"],
    ["ly do chinh", "reason"],
    ["phuong an khac", "alternatives"],
    ["tac dong", "impact"],
    ["affected", "impact"],
    ["supersedes", "supersedes"],
    ["nguon", "source"],
    ["loai", "kind"],
    ["noi dung", "content"],
    ["muc", "level"],
    ["owner", "owner"],
    ["ung pho / moc", "mitigation"],
    ["actor registry", "actor"],
    ["canonical", "canonical"],
    ["aliases", "aliases"],
    ["entity", "entity"],
    ["uc \\ entity", "uc_entity"],
  ]);

  if (direct.has(raw)) return direct.get(raw);
  if (raw.startsWith("api field")) return "api_field";
  if (raw.startsWith("ui field")) return "ui";
  if (raw.startsWith("system")) return "system";
  if (raw.startsWith("error")) return "errors";
  if (raw.startsWith("ung pho")) return "mitigation";
  return raw.replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}

function parseTables(record) {
  const tables = [];
  let heading = "";
  let headingLine = 1;

  for (
    let index = Math.max(0, record.frontmatter.bodyLine - 1);
    index < record.lines.length - 1;
    index += 1
  ) {
    const current = record.lines[index];
    const headingMatch = current.match(/^(#{2,6})\s+(.+?)\s*$/);

    if (headingMatch) {
      heading = cleanTitle(headingMatch[2]);
      headingLine = index + 1;
      continue;
    }

    if (!current.trim().startsWith("|")) continue;

    const headers = splitMarkdownRow(current);
    const separator = splitMarkdownRow(record.lines[index + 1]);

    if (!isSeparatorRow(separator)) continue;

    const canonical = headers.map(canonicalHeader);
    const rows = [];
    let cursor = index + 2;

    while (
      cursor < record.lines.length &&
      record.lines[cursor].trim().startsWith("|")
    ) {
      const cells = splitMarkdownRow(record.lines[cursor]);
      const values = {};

      for (let cellIndex = 0; cellIndex < headers.length; cellIndex += 1) {
        const key = canonical[cellIndex];
        if (key && values[key] === undefined) {
          values[key] = cells[cellIndex] ?? "";
        }
      }

      rows.push({
        cells,
        values,
        line: cursor + 1,
        raw: record.lines[cursor],
      });
      cursor += 1;
    }

    tables.push({
      heading,
      headingLine,
      headerLine: index + 1,
      headers,
      canonical,
      rows,
    });

    index = cursor - 1;
  }

  return tables;
}

function firstHeading(lines, startLine = 1) {
  for (let index = Math.max(0, startLine - 1); index < lines.length; index += 1) {
    const match = lines[index].match(/^#\s+(.+?)\s*$/);
    if (match) return { title: cleanTitle(match[1]), line: index + 1 };
  }
  return { title: "", line: 1 };
}

function inferKnownShape(rel, frontmatterType) {
  const normalized = rel.toLowerCase();
  const declared = String(frontmatterType ?? "").toLowerCase();

  if (/\/usecases\/uc-[^/]+\.md$/.test(normalized)) return "use_case";
  if (/\/userstories\/us-\d+\.md$/.test(normalized)) return "user_story";
  if (/\/test\/testcases\/testcases-[^/]+\.md$/.test(normalized)) {
    return "test_case";
  }
  if (/\/test\/checklist\/checklist-[^/]+\.md$/.test(normalized)) {
    return "test_checklist_content";
  }
  if (
    /\/ascii-wireframe\/[^/]+\.md$/.test(normalized) &&
    !/-wireframe-index\.md$/.test(normalized)
  ) {
    return "screen_content";
  }
  if (/^docs\/_research\/.+\.md$/.test(normalized)) return "research";
  if (/^docs\/cr\/cr-\d{8}-\d{3}\.md$/.test(normalized)) {
    return "change_request";
  }

  if (declared === "change-request") return "change_request";
  if (declared) return "doc";
  return null;
}

function inferNodeType(shape) {
  if (shape === "use_case") return "use_case";
  if (shape === "user_story") return "user_story";
  if (shape === "test_case") return "test_case";
  if (shape === "research") return "research";
  if (shape === "change_request") return "change_request";
  return "doc";
}

function entityCanonical(value) {
  // KHÔNG dùng cleanCell ở đây — nó strip "_" làm VERIFY_LINK mất dạng UPPER_SNAKE
  // trước khi alias UPPER_SNAKE→CamelCase chạy (VERIFYLINK → Verifylink ≠ VerifyLink).
  const raw = String(value ?? "")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/[*~]/g, "")
    .replace(/[()[\]{}]/g, "")
    .replace(/\bPK\b|\bFK\b/gi, "")
    .trim();

  if (!raw) return "";

  if (/^[A-Z0-9_]+$/.test(raw)) {
    return raw
      .toLowerCase()
      .split("_")
      .filter(Boolean)
      .map((part) => part[0].toUpperCase() + part.slice(1))
      .join("");
  }

  if (/^[A-Za-z][A-Za-z0-9]*$/.test(raw)) {
    return raw[0].toUpperCase() + raw.slice(1);
  }

  return raw
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join("");
}

function stateSlug(value) {
  const clean = cleanCell(value).replace(/^\((.+)\)$/, "$1");
  return slugify(clean) || "unknown";
}

function idPadding(prefix) {
  return prefix.toUpperCase() === "BO" ? 2 : 3;
}

function canonicalGlobalId(prefix, feature, number) {
  const upper = prefix.toUpperCase();
  const width = idPadding(upper);
  const numeric = String(number);
  const padded = numeric.length >= width ? numeric : numeric.padStart(width, "0");
  return `${upper}-${String(feature).toLowerCase()}-${padded}`;
}

// Short-form bị bỏ vì thiếu feature context — gom lại thành 1 coverage note lúc emit
// (không drop im lặng — finding review 2026-07-15).
const shortFormDrops = [];

function extractGlobalIds(text, feature) {
  const result = [];
  const source = String(text ?? "");
  const regex =
    /\b(FR|NFR|BR|E|BO|CAP|CHK)-(?:(?:([a-z][a-z0-9-]*?)-)?(\d{1,4}))((?:\s*(?:,|\/|\.\.)\s*\d{1,4})*)/gi;

  for (const match of source.matchAll(regex)) {
    const prefix = match[1].toUpperCase();
    const resolvedFeature = (match[2] || feature || "").toLowerCase();
    if (!resolvedFeature) {
      shortFormDrops.push(`${prefix}-${match[3]}`);
      continue;
    }

    let previous = Number(match[3]);
    result.push(canonicalGlobalId(prefix, resolvedFeature, match[3]));

    const tail = match[4] || "";
    // (?!\.?\d): chặn số thập phân/số mục prose ("xem FR-004, 5.3") nở thành ID ma.
    const tailRegex = /\s*(,|\/|\.\.)\s*(\d{1,4})(?!\.?\d)/g;
    let continuation;

    while ((continuation = tailRegex.exec(tail))) {
      const operator = continuation[1];
      const current = Number(continuation[2]);

      if (operator === "..") {
        const step = current >= previous ? 1 : -1;
        for (
          let number = previous + step;
          step > 0 ? number <= current : number >= current;
          number += step
        ) {
          result.push(canonicalGlobalId(prefix, resolvedFeature, number));
        }
      } else {
        result.push(canonicalGlobalId(prefix, resolvedFeature, current));
      }

      previous = current;
    }
  }

  for (const match of source.matchAll(/\bCR-\d{8}-\d{3}\b/gi)) {
    result.push(match[0].toUpperCase());
  }

  return uniqueSorted(result);
}

function extractUcSlugs(text) {
  return uniqueSorted(
    [...String(text ?? "").matchAll(/\buc-[a-z0-9][a-z0-9-]*\b/gi)].map(
      (match) => match[0].toLowerCase()
    )
  );
}

function extractMarkdownLinks(text) {
  const links = [];

  for (const match of String(text ?? "").matchAll(/\[([^\]]+)\]\(([^)]+)\)/g)) {
    links.push({ label: cleanCell(match[1]), target: match[2].trim() });
  }

  return links;
}

function extractWikiLinks(text) {
  const links = [];

  for (const match of String(text ?? "").matchAll(/\[\[([^\]]+)\]\]/g)) {
    const [targetPart, label] = match[1].split("|");
    links.push({
      label: cleanCell(label || targetPart),
      target: targetPart.trim(),
    });
  }

  return links;
}

function normalizeScreenSlug(value) {
  return slugify(
    cleanCell(value)
      .replace(/\[[^\]]+\]/g, "")
      .replace(/\([^)]*\)$/g, "")
      .trim()
  );
}

function splitLooseList(value) {
  return String(value ?? "")
    .replace(/<br\s*\/?>/gi, ",")
    .split(/\s*(?:,|;|→)\s*/)
    .map((item) => cleanCell(item).replace(/\[[^\]]+\]/g, "").trim())
    .filter((item) => item && item !== "—" && item !== "-");
}

function splitFeatureDependencies(value) {
  return String(value ?? "")
    .replace(/<br\s*\/?>/gi, ",")
    .split(/\s*(?:,|;|\+|→)\s*/)
    .flatMap((item) => {
      const backticked = [...item.matchAll(/`([^`]+)`/g)]
        .map((match) => cleanCell(match[1]))
        .filter(Boolean);

      if (backticked.length) return backticked;

      return [
        cleanCell(item)
          .replace(/\s*\([^)]*\)\s*$/, "")
          .trim(),
      ];
    })
    .filter((item) => item && item !== "—" && item !== "-");
}

function detailStatusFromCell(value) {
  const text = String(value ?? "");
  if (text.includes("✅")) return "done";
  if (text.includes("🔄")) return "in-progress";
  if (text.includes("⬜")) return "todo";
  return "";
}

function roadmapHorizon(table, row) {
  const explicit = cleanCell(row.values.horizon || "");
  if (explicit) return explicit;

  const heading = cleanTitle(table.heading || "");
  const nowNextLater = heading.match(/\b(now|next|later)\b/i);
  if (nowNextLater) {
    return (
      nowNextLater[1][0].toUpperCase() +
      nowNextLater[1].slice(1).toLowerCase()
    );
  }

  const quarter = heading.match(/\bQ([1-4])\s+(\d{4})\b/i);
  if (quarter) return `Q${quarter[1]} ${quarter[2]}`;

  return "";
}

function sanitizeProps(props) {
  const clean = {};

  for (const [key, value] of Object.entries(props || {})) {
    if (value === undefined || value === null || value === "") continue;

    if (Array.isArray(value)) {
      const values = uniqueSorted(
        value.map((item) => String(item).trim()).filter(Boolean)
      );
      if (values.length) clean[key] = values;
      continue;
    }

    if (typeof value === "boolean" || typeof value === "number") {
      clean[key] = String(value);
      continue;
    }

    clean[key] = String(value).trim();
  }

  return clean;
}

class GraphBuilder {
  constructor(options) {
    this.options = options;
    this.rootAbs = process.cwd();
    this.dirAbs = path.resolve(this.rootAbs, options.dir);
    this.dirRel = toPosix(path.relative(this.rootAbs, this.dirAbs)) || ".";
    this.nodes = new Map();
    this.edges = new Map();
    this.records = [];
    this.recordByPath = new Map();
    this.fileNodeKey = new Map();
    this.parsedPaths = new Set();
    this.unparsedDocs = new Map();
    this.coverageNotes = [];
    this.refOccurrences = [];
    this.catalogedContent = new Set();
    this.contentCandidates = new Set();
    this.errorOwners = new Map();
    this.actorAliases = new Map();
    this.featureSources = new Map();
    this.optionalNotes = [];
  }

  repoPath(abs) {
    return toPosix(path.relative(this.rootAbs, abs));
  }

  featureFromAbs(abs) {
    const rel = toPosix(path.relative(this.dirAbs, abs));
    if (rel.startsWith("../") || rel === "..") return null;
    if (!rel.includes("/")) return null; // file ngay gốc docs/ (vd design.md) KHÔNG phải feature
    const first = rel.split("/")[0];
    if (!first || PROJECT_LEVEL_DIRS.has(first) || EXCLUDED_DIRS.has(first)) {
      return null;
    }
    return first;
  }

  source(file, line) {
    return { file, line: Number(line) || 1 };
  }

  addCoverageNote(note) {
    if (!this.coverageNotes.includes(note)) this.coverageNotes.push(note);
  }

  // Doc parse THIẾU MỘT PHẦN (bảng thiếu cột / shape trích 0 item) — ghi riêng để
  // kg-query đưa file vào "Phải Read tay". Chỉ đếm parsed-count thì thiếu-một-phần
  // trông y hệt đủ (false-negative im lặng — finding review 2026-07-15).
  notePartialParse(file, reason) {
    if (!this.partialParse) this.partialParse = new Map();
    const existing = this.partialParse.get(file);
    if (existing && existing.includes(reason)) return;
    this.partialParse.set(file, existing ? `${existing}; ${reason}` : reason);
  }

  markUnparsed(file, reason) {
    this.parsedPaths.delete(file);
    this.unparsedDocs.set(file, reason);
  }

  addNode(candidate, preferSource = false) {
    if (!candidate?.key || !candidate?.type || !candidate?.source) return null;

    const normalized = {
      key: candidate.key,
      type: candidate.type,
      subtype: candidate.subtype ?? null,
      feature: candidate.feature ?? null,
      title: candidate.title || candidate.key,
      status: candidate.status ?? null,
      updated: candidate.updated ?? null,
      source: {
        file: candidate.source.file,
        line: Number(candidate.source.line) || 1,
      },
      props: sanitizeProps(candidate.props),
    };

    const existing = this.nodes.get(normalized.key);
    if (!existing) {
      this.nodes.set(normalized.key, normalized);
      return normalized;
    }

    existing.title =
      existing.title === existing.key && normalized.title !== normalized.key
        ? normalized.title
        : existing.title || normalized.title;
    existing.subtype ??= normalized.subtype;
    existing.feature ??= normalized.feature;
    existing.status ??= normalized.status;
    existing.updated ??= normalized.updated;

    if (preferSource) existing.source = normalized.source;

    for (const [key, value] of Object.entries(normalized.props)) {
      if (existing.props[key] === undefined) {
        existing.props[key] = value;
      } else if (
        Array.isArray(existing.props[key]) ||
        Array.isArray(value)
      ) {
        existing.props[key] = uniqueSorted([
          ...(Array.isArray(existing.props[key])
            ? existing.props[key]
            : [existing.props[key]]),
          ...(Array.isArray(value) ? value : [value]),
        ]);
      }
    }

    return existing;
  }

  removeHeuristicForPair(from, to) {
    for (const [key, edge] of this.edges) {
      if (
        edge.from === from &&
        edge.to === to &&
        edge.provenance === "heuristic"
      ) {
        this.edges.delete(key);
      }
    }
  }

  hasNonHeuristicPair(from, to) {
    for (const edge of this.edges.values()) {
      if (
        edge.from === from &&
        edge.to === to &&
        edge.provenance !== "heuristic"
      ) {
        return true;
      }
    }
    return false;
  }

  addEdge(candidate) {
    if (
      !candidate?.from ||
      !candidate?.to ||
      !candidate?.type ||
      !candidate?.provenance ||
      !candidate?.source
    ) {
      return null;
    }

    if (
      candidate.provenance === "heuristic" &&
      this.hasNonHeuristicPair(candidate.from, candidate.to)
    ) {
      return null;
    }

    if (candidate.provenance !== "heuristic") {
      this.removeHeuristicForPair(candidate.from, candidate.to);
    }

    const edge = {
      from: candidate.from,
      to: candidate.to,
      type: candidate.type,
      provenance: candidate.provenance,
      source: {
        file: candidate.source.file,
        line: Number(candidate.source.line) || 1,
      },
    };

    const props = sanitizeProps(candidate.props);
    if (Object.keys(props).length) edge.props = props;

    const key = `${edge.from}\u0000${edge.type}\u0000${edge.to}`;
    const existing = this.edges.get(key);

    if (
      !existing ||
      PROVENANCE_PRIORITY[edge.provenance] >
        PROVENANCE_PRIORITY[existing.provenance]
    ) {
      this.edges.set(key, edge);
    } else if (
      existing &&
      edge.props &&
      !existing.props
    ) {
      existing.props = edge.props;
    }

    if (GLOBAL_ID_RE.test(edge.to)) {
      this.refOccurrences.push({
        ref: edge.to,
        source: edge.source,
      });
    }

    return edge;
  }

  findRecord(file) {
    return this.recordByPath.get(file) || null;
  }

  resolveFileNode(file) {
    return this.fileNodeKey.get(file) || file;
  }

  resolveDocTarget(sourceFile, rawTarget) {
    let target = stripQuotes(rawTarget)
      .replace(/^<|>$/g, "")
      .trim();

    if (!target || /^(?:https?:|mailto:|app:)/i.test(target)) return null;

    const hashIndex = target.indexOf("#");
    const anchor = hashIndex >= 0 ? target.slice(hashIndex + 1) : "";
    if (hashIndex >= 0) target = target.slice(0, hashIndex);

    target = target.replace(/[?#].*$/, "").trim();

    let resolved;
    if (!target) {
      resolved = sourceFile;
    } else if (
      target === this.dirRel ||
      target.startsWith(`${this.dirRel}/`)
    ) {
      resolved = path.posix.normalize(target);
    } else if (target.startsWith("docs/")) {
      resolved = path.posix.normalize(target);
    } else {
      resolved = path.posix.normalize(
        path.posix.join(path.posix.dirname(sourceFile), target)
      );
    }

    if (!path.posix.extname(resolved)) {
      const md = `${resolved}.md`;
      if (this.fileNodeKey.has(md) || this.recordByPath.has(md)) resolved = md;
    }

    if (/^OQ-\d+$/i.test(anchor)) {
      return `${resolved}#${anchor.toUpperCase()}`;
    }

    return this.resolveFileNode(resolved);
  }

  resolveUc(feature, value, sourceFile) {
    const links = extractMarkdownLinks(value);
    if (links.length) {
      const resolved = this.resolveDocTarget(sourceFile, links[0].target);
      if (resolved) return resolved;
    }

    const slug = extractUcSlugs(value)[0] || slugify(cleanCell(value));
    if (!slug) return null;

    const expected = `${this.dirRel}/${feature}/usecases/${
      slug.startsWith("uc-") ? slug : `uc-${slug}`
    }.md`;

    return this.resolveFileNode(expected);
  }

  resolveUserStory(feature, value, sourceFile) {
    const links = extractMarkdownLinks(value);
    if (links.length) {
      const resolved = this.resolveDocTarget(sourceFile, links[0].target);
      if (resolved) return resolved;
    }

    const match = cleanCell(value).match(/\bUS-(\d+)\b/i);
    if (!match) return null;

    const expected = `${this.dirRel}/${feature}/userstories/us-${match[1].padStart(
      3,
      "0"
    )}.md`;

    return this.resolveFileNode(expected);
  }

  resolveOpenQuestion(feature, value) {
    const match = String(value ?? "").match(/\bOQ-(\d+)\b/i);
    if (!match) return null;

    const suffix = `#OQ-${Number(match[1])}`;
    const candidates = [...this.nodes.keys()]
      .filter(
        (key) =>
          key.endsWith(suffix) &&
          this.nodes.get(key)?.feature === feature
      )
      .sort((a, b) => {
        const aSpec = /\/srs\/(?:[^/]+-)?spec\.md#/.test(a) ? 0 : 1;
        const bSpec = /\/srs\/(?:[^/]+-)?spec\.md#/.test(b) ? 0 : 1;
        return aSpec - bSpec || compareText(a, b);
      });

    return candidates[0] || null;
  }

  canonicalActor(value) {
    const raw = cleanCell(value).replace(/^@/, "").trim();
    if (!raw) return "";

    const aliasKey = foldText(raw);
    return this.actorAliases.get(aliasKey) || raw.toLowerCase().trim();
  }

  addActor(value, feature, source) {
    const canonical = this.canonicalActor(value);
    if (!canonical || canonical === "—" || canonical === "-") return null;

    const key = `actor:${canonical}`;
    this.addNode({
      key,
      type: "actor",
      subtype: null,
      feature: null,
      title: cleanCell(value),
      status: null,
      updated: null,
      source,
      props: {
        aliases: canonical === cleanCell(value).toLowerCase()
          ? []
          : [cleanCell(value)],
        appears_in: feature ? [feature] : [],
      },
    });

    return key;
  }

  addEntity(feature, value, source, props = {}) {
    const canonical = entityCanonical(value);
    if (!feature || !canonical) return null;

    const key = `entity:${feature}/${canonical}`;
    this.addNode({
      key,
      type: "entity",
      subtype: null,
      feature,
      title: canonical,
      status: null,
      updated: null,
      source,
      props,
    });
    return key;
  }

  addScreen(feature, value, source, props = {}) {
    const slug = normalizeScreenSlug(value);
    if (!feature || !slug) return null;

    const key = `screen:${feature}/${slug}`;
    this.addNode({
      key,
      type: "screen",
      subtype: null,
      feature,
      title: cleanCell(value) || slug,
      status: null,
      updated: null,
      source,
      props: { slug, ...props },
    });
    return key;
  }

  addFlow(feature, slugValue, title, source, props = {}) {
    const slug = slugify(slugValue || title);
    if (!feature || !slug) return null;

    const key = `flow:${feature}/${slug}`;
    this.addNode({
      key,
      type: "flow",
      subtype: null,
      feature,
      title: cleanCell(title || slugValue) || slug,
      status: null,
      updated: null,
      source,
      props: { slug, ...props },
    });

    // Node đã tồn tại từ nguồn chỉ-biết-slug (vd wireframe-index cột "Thuộc flow")
    // → nâng title lên TÊN human khi nguồn giàu hơn (userflow Mục 3) tới sau,
    // để flows.md heading tiếng Việt match được qua findMatchingFlow.
    const node = this.nodes.get(key);
    const richTitle = cleanCell(title || "");
    if (node && richTitle && richTitle !== slug && node.title === slug) {
      node.title = richTitle;
    }
    return key;
  }

  addProductFeature(slugValue, title, source, props = {}) {
    const slug = slugify(cleanCell(slugValue));
    if (!slug) return null;

    const key = `feature:${slug}`;
    const hasRealFolder = this.featureSources.has(slug);

    this.addNode({
      key,
      type: "feature",
      subtype: null,
      feature: slug,
      title: cleanCell(title || slug) || slug,
      status: null,
      updated: null,
      source,
      props: {
        ...(!hasRealFolder ? { planned: true } : {}),
        ...props,
      },
    });

    // Feature node từ folder thật ban đầu chỉ có title=slug. Nguồn product planning
    // giàu hơn nên nâng title human-readable, tương tự addFlow.
    const node = this.nodes.get(key);
    const richTitle = cleanCell(title || "");
    if (
      node &&
      richTitle &&
      richTitle !== slug &&
      (node.title === slug || node.title === key)
    ) {
      node.title = richTitle;
    }

    return key;
  }

  productFeatureLookup(table) {
    const slugs = new Map();
    const titles = new Map();
    const names = new Map();

    for (const row of table.rows) {
      const rawSlug = cleanCell(row.values.id || "");
      const slug = slugify(rawSlug);
      if (!slug) continue;

      const title = cleanCell(row.values.title || "") || slug;
      slugs.set(foldText(rawSlug), slug);
      slugs.set(foldText(slug), slug);
      titles.set(foldText(title), slug);
      names.set(slug, title);
    }

    return { slugs, titles, names };
  }

  addProductDependencies(record, from, rawValue, lookup, line) {
    for (const dependency of splitFeatureDependencies(rawValue)) {
      const lookupKey = foldText(dependency);
      const depSlug =
        lookup.slugs.get(lookupKey) ||
        lookup.titles.get(lookupKey) ||
        (this.nodes.has(`feature:${slugify(dependency)}`) ? slugify(dependency) : "");

      // Dep KHÔNG match Feature Map / feature đã có → HỆ NGOÀI (external_service),
      // KHÔNG nâng thành planned feature (review Phase 4: "Stripe"/"Đơn hàng nội bộ"
      // từng thành 4 feature ma làm nhiễu backlog + DEPENDS_ON sai semantic).
      let target;
      if (depSlug) {
        target = this.addProductFeature(
          depSlug,
          lookup.names.get(depSlug) || dependency,
          this.source(record.file, line)
        );
      } else {
        const canonical = slugify(dependency);
        if (!canonical) continue;
        target = `svc:${canonical}`;
        this.addNode({
          key: target,
          type: "external_service",
          subtype: null,
          feature: null,
          title: cleanCell(dependency),
          status: null,
          updated: null,
          source: this.source(record.file, line),
          props: {},
        });
        this.addCoverageNote(
          `${record.file}:${line}: dep "${dependency}" không match Feature Map — coi là hệ ngoài (svc:${canonical})`
        );
      }
      if (!target) continue;

      this.addEdge({
        from,
        to: target,
        type: "DEPENDS_ON",
        provenance: "table",
        source: this.source(record.file, line),
      });
    }
  }

  // Parse Product PRD Feature Map: tạo cả feature đã plan nhưng chưa có folder.
  parseProductPrd(record) {
    for (const table of this.tablesOf(record)) {
      // "Ưu tiên (MoSCoW)" fold → "uu tien" → map global "priority" — nhận moscow qua priority.
      if (
        !table.canonical.includes("id") ||
        !(table.canonical.includes("moscow") || table.canonical.includes("priority"))
      ) {
        continue;
      }

      this.noteMissingColumns(record, table, [
        "title",
        "theme",
        "persona",
        "depends",
        "detail_status",
      ]);

      const lookup = this.productFeatureLookup(table);

      for (const row of table.rows) {
        const slug = slugify(cleanCell(row.values.id || ""));
        if (!slug) continue;

        const source = this.source(record.file, row.line);
        const feature = this.addProductFeature(
          slug,
          cleanCell(row.values.title || "") || slug,
          source,
          {
            theme: cleanCell(row.values.theme || ""),
            persona: cleanCell(row.values.persona || ""),
            moscow: cleanCell(row.values.moscow || row.values.priority || ""),
            detail_status: detailStatusFromCell(row.values.detail_status),
          }
        );
        if (!feature) continue;

        this.addEdge({
          from: record.nodeKey,
          to: feature,
          type: "CATALOGS",
          provenance: "table",
          source,
        });

        this.addProductDependencies(
          record,
          feature,
          row.values.depends,
          lookup,
          row.line
        );
      }
    }
  }

  // Parse quarterly và Now/Next/Later roadmap prioritization tables.
  parseRoadmap(record) {
    for (const table of this.tablesOf(record)) {
      // "Ưu tiên (MoSCoW)" fold → "uu tien" → map global "priority" — nhận moscow qua priority.
      if (
        !table.canonical.includes("id") ||
        !(table.canonical.includes("moscow") || table.canonical.includes("priority"))
      ) {
        continue;
      }

      this.noteMissingColumns(record, table, [
        "title",
        "score",
        "effort",
        "depends",
        "dep_readiness",
      ]);

      const lookup = this.productFeatureLookup(table);

      for (const row of table.rows) {
        const slug = slugify(cleanCell(row.values.id || ""));
        if (!slug) continue;

        const source = this.source(record.file, row.line);
        const horizon = roadmapHorizon(table, row);

        if (!horizon) {
          const reason =
            `bảng "${table.heading || "(không heading)"}" không có horizon ` +
            "(cột Quý/Giai đoạn hoặc heading Now/Next/Later)";
          this.addCoverageNote(`${record.file}:${row.line}: ${reason}`);
          this.notePartialParse(record.file, reason);
        }

        const feature = this.addProductFeature(
          slug,
          cleanCell(row.values.title || "") || slug,
          source,
          {
            moscow: cleanCell(row.values.moscow || row.values.priority || ""),
            score: cleanCell(row.values.score || ""),
            effort: cleanCell(row.values.effort || ""),
            horizon,
            dep_readiness: cleanCell(row.values.dep_readiness || ""),
          }
        );
        if (!feature) continue;

        this.addEdge({
          from: record.nodeKey,
          to: feature,
          type: "CATALOGS",
          provenance: "table",
          source,
        });

        this.addProductDependencies(
          record,
          feature,
          row.values.depends,
          lookup,
          row.line
        );
      }
    }
  }

  findIndex(feature, kind) {
    const patterns = {
      usecase: /usecase-index/i,
      story: /(?:userstory|story)-index/i,
      screen: /(?:screen|wireframe)-index/i,
      checklist: /test-checklist-index/i,
      testcase: /test-cases-index/i,
    };

    return (
      this.records.find(
        (record) =>
          record.feature === feature &&
          patterns[kind]?.test(String(record.frontmatter.data.type || ""))
      ) || null
    );
  }

  findSpec(feature) {
    return (
      this.records.find(
        (record) =>
          record.feature === feature &&
          /\/srs\/(?:[^/]+-)?spec\.md$/i.test(record.file)
      ) ||
      this.records.find(
        (record) =>
          record.feature === feature &&
          String(record.frontmatter.data.type || "").toLowerCase() === "srs"
      ) ||
      null
    );
  }

  noteMissingColumns(record, table, columns) {
    for (const column of columns) {
      if (!table.canonical.includes(column)) {
        this.addCoverageNote(
          `${record.file}:${table.headerLine}: bảng "${table.heading || "(không heading)"}" thiếu cột ${column}`
        );
        this.notePartialParse(
          record.file,
          `bảng "${table.heading || "(không heading)"}" thiếu cột ${column}`
        );
      }
    }
  }

  runParser(record, parser) {
    // Shape-parser kỳ vọng trích ra ≥1 node/edge — trích 0 item mà vẫn tính "parsed"
    // là con đường format-drift âm thầm rút ruột graph (finding review 2026-07-15).
    const EXPECT_YIELD = new Set([
      "parseUseCaseIndex",
      "parseUserStoryIndex",
      "parseMeeting",
      "parseGlossary",
      "parseUserguideIndex",
      "parseProductPrd",
      "parseRoadmap",
      "parseScreenIndex",
      "parseWireframeHtmlIndex",
      "parseUseCaseContent",
      "parseUserStoryContent",
      "parseScreenContent",
      "parseUserFlow",
      "parseErd",
      "parseFlows",
      "parseStates",
      "parseTestIndex",
      "parseChecklistContent",
      "parseTestCaseContent",
      "parseApiChecklist",
      "parseApiTests",
      "parseE2eIndex",
      "parseApiMap",
    ]);
    const nodesBefore = this.nodes.size;
    const edgesBefore = this.edges.size;
    this.yieldWaiver = null;
    try {
      parser.call(this, record);
      if (
        EXPECT_YIELD.has(parser.name) &&
        !this.yieldWaiver &&
        this.nodes.size === nodesBefore &&
        this.edges.size === edgesBefore
      ) {
        this.addCoverageNote(
          `${record.file}: shape ${parser.name} trích được 0 item — format lệch?`
        );
        this.notePartialParse(record.file, `${parser.name} trích được 0 item — format lệch?`);
      }
    } catch (error) {
      this.markUnparsed(
        record.file,
        `parse-error: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  loadMarkdown(abs) {
    const file = this.repoPath(abs);
    const text = fs.readFileSync(abs, "utf8");
    const lines = text.split(/\r?\n/);

    let frontmatter;
    let frontmatterError = null;

    try {
      frontmatter = parseFrontmatter(lines);
    } catch (error) {
      frontmatterError = error;
      frontmatter = {
        hasFrontmatter: false,
        data: {},
        entries: {},
        bodyLine: 1,
      };
    }

    const shape = inferKnownShape(file, frontmatter.data.type);
    const pathFeature = this.featureFromAbs(abs);
    const isProjectLevelMeeting =
      String(frontmatter.data.type || "").toLowerCase() === "meeting" ||
      /\/meetings\/[^/]+\.md$/i.test(file);
    const feature = isProjectLevelMeeting
      ? null
      : cleanCell(frontmatter.data.feature || "") || pathFeature || null;

    // Rename-feature nửa vời (đổi folder nhưng quên frontmatter, hoặc ngược lại)
    // tạo danh tính lệch âm thầm — cảnh báo qua coverage note (audit vận hành 07-16).
    if (
      pathFeature &&
      feature &&
      feature !== pathFeature &&
      !["meeting", "inbox", "change_request", "research"].includes(inferNodeType(shape))
    ) {
      this.addCoverageNote(
        `${file}: frontmatter feature '${feature}' ≠ folder '${pathFeature}' — rename feature nửa vời?`
      );
    }
    const heading = firstHeading(lines, frontmatter.bodyLine);
    const nodeType = inferNodeType(shape);
    const crMatch = file.match(/\/(CR-\d{8}-\d{3})\.md$/i);
    const nodeKey =
      nodeType === "change_request" && crMatch
        ? crMatch[1].toUpperCase()
        : file;

    const record = {
      abs,
      file,
      text,
      lines,
      frontmatter,
      shape,
      feature,
      heading,
      nodeKey,
      tables: null,
    };

    this.records.push(record);
    this.recordByPath.set(file, record);
    this.fileNodeKey.set(file, nodeKey);

    if (frontmatterError) {
      this.markUnparsed(
        file,
        `parse-error: ${frontmatterError.message}`
      );
    } else if (frontmatter.hasFrontmatter || shape) {
      this.parsedPaths.add(file);
    } else {
      this.markUnparsed(file, "no-frontmatter-and-no-known-shape");
    }

    if (feature && pathFeature) {
      const existing = this.featureSources.get(feature);
      if (!existing || compareText(file, existing.file) < 0) {
        this.featureSources.set(feature, this.source(file, 1));
      }
    }

    this.addNode({
      key: nodeKey,
      type: nodeType,
      subtype: null,
      feature,
      title:
        heading.title ||
        crMatch?.[1] ||
        path.posix.basename(file, path.posix.extname(file)),
      status: cleanCell(frontmatter.data.status || "") || null,
      updated: cleanCell(frontmatter.data.updated || "") || null,
      source: this.source(file, heading.line),
      props: {
        doc_type: frontmatter.data.type || shape || "unknown",
        owner: frontmatter.data.owner,
        created: frontmatter.data.created,
      },
    });

    if (
      /\/(?:usecases\/uc-[^/]+|userstories\/us-\d+|ascii-wireframe\/(?![^/]*-index)[^/]+)\.md$/i.test(
        file
      )
    ) {
      this.contentCandidates.add(file);
    }

    return record;
  }

  loadBaseFiles(scopeFiles) {
    for (const item of scopeFiles) {
      if (item.kind === "markdown") this.loadMarkdown(item.abs);
    }

    this.records.sort((a, b) => compareText(a.file, b.file));

    for (const [feature, source] of [...this.featureSources].sort(([a], [b]) =>
      compareText(a, b)
    )) {
      this.addNode({
        key: `feature:${feature}`,
        type: "feature",
        subtype: null,
        feature,
        title: feature,
        status: null,
        updated: null,
        source,
        props: {},
      });
    }

    for (const record of this.records) {
      if (record.feature && this.nodes.has(`feature:${record.feature}`)) {
        this.addEdge({
          from: `feature:${record.feature}`,
          to: record.nodeKey,
          type: "CONTAINS",
          provenance: "heuristic",
          source: this.source(record.file, 1),
        });
      }
    }
  }

  tablesOf(record) {
    record.tables ??= parseTables(record);
    return record.tables;
  }

  // Parse Actor Registry trong definitions.md: canonical | aliases.
  parseActorRegistry() {
    const record = this.records.find((item) =>
      /\/_shared\/definitions\.md$/i.test(item.file)
    );
    if (!record) return;

    for (const table of this.tablesOf(record)) {
      if (!/actor registry/i.test(foldText(table.heading))) continue;
      this.noteMissingColumns(record, table, ["canonical", "aliases"]);

      for (const row of table.rows) {
        const canonical = cleanCell(row.values.canonical || row.values.actor);
        if (!canonical) continue;

        const canonicalValue = canonical.toLowerCase().trim();
        this.actorAliases.set(foldText(canonical), canonicalValue);

        for (const alias of splitLooseList(row.values.aliases)) {
          this.actorAliases.set(foldText(alias), canonicalValue);
        }
      }
    }
  }

  // Parse Glossary heading: "### Main term / Variant (Vietnamese alias)".
  parseGlossary(record) {
    let inGlossary = false;

    for (
      let index = Math.max(0, record.frontmatter.bodyLine - 1);
      index < record.lines.length;
      index += 1
    ) {
      const line = record.lines[index];
      const section = line.match(/^##\s+(.+?)\s*$/);

      if (section) {
        inGlossary = foldText(section[1]) === "glossary";
        continue;
      }

      if (!inGlossary) continue;

      const heading = line.match(/^###\s+(.+?)\s*$/);
      if (!heading) continue;

      const rawHeading = cleanTitle(heading[1]);
      const aliasMatch = rawHeading.match(/^(.*?)\s*\(([^()]*)\)\s*$/);
      const base = cleanCell(aliasMatch?.[1] || rawHeading);
      const variants = base
        .split(/\s*\/\s*/)
        .map((value) => cleanCell(value))
        .filter(Boolean);
      const primary = variants.shift();
      const aliases = uniqueSorted([
        ...variants,
        ...(aliasMatch?.[2] || "")
          .split(/\s*\/\s*/)
          .map((value) => cleanCell(value))
          .filter(Boolean),
      ]).filter((value) => foldText(value) !== foldText(primary));

      if (!primary) {
        this.notePartialParse(
          record.file,
          `Glossary heading không có term tại line ${index + 1}`
        );
        continue;
      }

      let description = "";
      for (
        let cursor = index + 1;
        cursor < record.lines.length;
        cursor += 1
      ) {
        const candidate = record.lines[cursor].trim();
        if (/^#{2,3}\s+/.test(candidate)) break;
        if (
          !candidate ||
          candidate.startsWith("<!--") ||
          /^\*\*(?:appears in|aliases|related)\s*:/i.test(candidate)
        ) {
          continue;
        }

        description = cleanCell(candidate.replace(/^>\s*/, ""));
        break;
      }

      const term = `term:${slugify(primary)}`;
      if (term === "term:") {
        this.notePartialParse(
          record.file,
          `Glossary term "${primary}" không slugify được`
        );
        continue;
      }

      // Chống collision im lặng: 2 heading khác nhau slugify về cùng key
      // (vd "C#" và "C++" đều thành term:c) → addNode sẽ merge mất term sau.
      const existingTerm = this.nodes.get(term);
      if (existingTerm && existingTerm.title !== primary) {
        this.notePartialParse(
          record.file,
          `Glossary term "${primary}" trùng key ${term} với term "${existingTerm.title}" — đổi tên heading để phân biệt`
        );
        continue;
      }

      const source = this.source(record.file, index + 1);
      this.addNode({
        key: term,
        type: "term",
        subtype: null,
        feature: null,
        title: primary,
        status: null,
        updated: cleanCell(record.frontmatter.data.updated || "") || null,
        source,
        props: {
          aliases,
          description,
        },
      });

      this.addEdge({
        from: record.nodeKey,
        to: term,
        type: "CATALOGS",
        provenance: "declared",
        source,
      });
    }
  }

  // Parse meeting Decisions, RAID và Action Items.
  parseMeeting(record) {
    const meetingFeature =
      cleanCell(record.frontmatter.data.feature || "") || null;
    let raidIndex = 0;

    for (const table of this.tablesOf(record)) {
      const heading = foldText(table.heading);

      if (heading === "decisions" || heading === "decision") {
        this.noteMissingColumns(record, table, [
          "number",
          "decision",
          "decided_by",
          "reason",
          "alternatives",
          "impact",
          "status",
          "supersedes",
          "source",
        ]);

        for (const row of table.rows) {
          const numberMatch = cleanCell(
            row.values.number || row.cells[0] || ""
          ).match(/\d+/);

          if (!numberMatch) {
            this.notePartialParse(
              record.file,
              `Decisions row không có số tại line ${row.line}`
            );
            continue;
          }

          const number = String(Number(numberMatch[0]));
          const key = `${record.file}#D-${number}`;
          const decisionText = cleanCell(
            row.values.decision || row.cells[1] || ""
          );
          const impact = cleanCell(row.values.impact || "");
          const source = this.source(record.file, row.line);

          this.addNode({
            key,
            type: "decision",
            subtype: null,
            feature: null,
            title: decisionText || `D-${number}`,
            status: cleanCell(row.values.status || "") || null,
            updated: cleanCell(record.frontmatter.data.updated || "") || null,
            source,
            props: {
              decided_by: cleanCell(row.values.decided_by || ""),
              supersedes: cleanCell(row.values.supersedes || ""),
              impact,
            },
          });

          this.addEdge({
            from: record.nodeKey,
            to: key,
            type: "CONTAINS",
            provenance: "table",
            source,
          });

          // Cross-meeting: cell chứa "{path}.md#D-n" → supersede decision meeting CŨ
          // (per /meet SKILL — decision conflict với meeting trước). Bare D3/D-3/#3
          // mới hiểu là cùng file. Path không tồn tại → edge dangling, --verify báo.
          const supersedesCell = String(row.values.supersedes || "");
          const crossRefs = [
            ...supersedesCell.matchAll(
              /([\w./-]+\.md)#D\s*-?\s*(\d+)\b/gi
            ),
          ];
          if (crossRefs.length) {
            for (const match of crossRefs) {
              const rawPath = match[1];
              const targetFile = rawPath.startsWith(`${this.dirRel}/`)
                ? rawPath
                : `${path.posix.dirname(record.file)}/${rawPath}`.replace(
                    /\/\.\//g,
                    "/"
                  );
              this.addEdge({
                from: key,
                to: `${this.resolveFileNode(targetFile)}#D-${Number(match[2])}`,
                type: "SUPERSEDES",
                provenance: "table",
                source,
              });
            }
          } else {
            for (const match of supersedesCell.matchAll(
              /(?:\bD\s*-?\s*(\d+)\b|#\s*(\d+)\b)/gi
            )) {
              const supersededNumber = String(Number(match[1] || match[2]));
              this.addEdge({
                from: key,
                to: `${record.file}#D-${supersededNumber}`,
                type: "SUPERSEDES",
                provenance: "table",
                source,
              });
            }
          }

          for (const ref of extractGlobalIds(
            `${decisionText} ${impact}`,
            meetingFeature
          )) {
            this.addEdge({
              from: key,
              to: ref,
              type: "IMPACTS",
              provenance: "table",
              source,
            });
          }
        }

        continue;
      }

      if (heading === "raid") {
        this.noteMissingColumns(record, table, [
          "kind",
          "content",
          "level",
          "owner",
          "mitigation",
          "source",
        ]);

        for (const row of table.rows) {
          raidIndex += 1;

          const rawKind = foldText(row.values.kind || row.cells[0] || "");
          const kind =
            /^[raid]$/i.test(rawKind)
              ? rawKind.toUpperCase()
              : rawKind.includes("risk") || rawKind.includes("rui ro")
                ? "R"
                : rawKind.includes("assumption") ||
                    rawKind.includes("gia dinh")
                  ? "A"
                  : rawKind.includes("issue") ||
                      rawKind.includes("van de")
                    ? "I"
                    : rawKind.includes("dependency") ||
                        rawKind.includes("phu thuoc")
                      ? "D"
                      : "";

          const content = cleanCell(
            row.values.content || row.cells[1] || ""
          );
          const key = `${record.file}#RAID-${raidIndex}`;
          const source = this.source(record.file, row.line);

          this.addNode({
            key,
            type: "raid_item",
            subtype: null,
            feature: null,
            title: content || `RAID-${raidIndex}`,
            status: null,
            updated: cleanCell(record.frontmatter.data.updated || "") || null,
            source,
            props: {
              kind,
              level: cleanCell(row.values.level || ""),
              owner: cleanCell(row.values.owner || ""),
            },
          });

          this.addEdge({
            from: record.nodeKey,
            to: key,
            type: "CONTAINS",
            provenance: "table",
            source,
          });
        }
      }
    }

    let section = "";
    let actionIndex = 0;

    for (
      let index = Math.max(0, record.frontmatter.bodyLine - 1);
      index < record.lines.length;
      index += 1
    ) {
      const line = record.lines[index];
      const heading = line.match(/^##\s+(.+?)\s*$/);

      if (heading) {
        section = foldText(heading[1]);
        continue;
      }

      if (
        section !== "action items" &&
        section !== "actions" &&
        section !== "hanh dong"
      ) {
        continue;
      }

      const action = line.match(
        /^\s*-\s+\[([ xX])\]\s+\*\*(@[^*]+)\*\*\s+[—–-]\s+(.+?)\s+Due\s+\*\*(\d{4}-\d{2}-\d{2})\*\*\.?\s*$/i
      );
      if (!action) continue;

      actionIndex += 1;
      const key = `${record.file}#A-${actionIndex}`;
      const source = this.source(record.file, index + 1);

      this.addNode({
        key,
        type: "action_item",
        subtype: null,
        feature: null,
        title: cleanCell(action[3]),
        status: null,
        updated: cleanCell(record.frontmatter.data.updated || "") || null,
        source,
        props: {
          owner: cleanCell(action[2]),
          due: action[4],
          done: action[1].toLowerCase() === "x",
        },
      });

      this.addEdge({
        from: record.nodeKey,
        to: key,
        type: "CONTAINS",
        provenance: "declared",
        source,
      });
    }
  }

  // Parse userguide-index scope: feature:{slug} | product (toàn sản phẩm — hợp lệ, không edge).
  parseUserguideIndex(record) {
    const scope = cleanCell(record.frontmatter.data.scope || "");

    if (/^product$/i.test(scope)) {
      // Cẩm nang toàn sản phẩm (per /userguide SKILL) — không thuộc feature nào,
      // không có edge để sinh. KHÔNG phải format lệch → waive check yield-0.
      this.yieldWaiver = "userguide scope product — không cần edge feature";
      return;
    }

    const match = scope.match(/^feature:([a-z0-9][a-z0-9-]*)$/i);

    if (!match) {
      const reason = `userguide-index scope không hợp lệ: "${scope || "(trống)"}"`;
      this.addCoverageNote(`${record.file}: ${reason}`);
      this.notePartialParse(record.file, reason);
      return;
    }

    const feature = `feature:${match[1].toLowerCase()}`;
    if (!this.nodes.has(feature)) {
      const reason =
        `userguide-index scope "${scope}" không resolve được feature node`;
      this.addCoverageNote(`${record.file}: ${reason}`);
      this.notePartialParse(record.file, reason);
      return;
    }

    this.addEdge({
      from: feature,
      to: record.nodeKey,
      type: "CONTAINS",
      provenance: "declared",
      source: this.source(
        record.file,
        record.frontmatter.entries.scope?.[0]?.line || 1
      ),
    });
  }

  // Parse bảng định nghĩa FR/NFR/BR/E/BO/CAP theo header-map.
  parseDefinitionTables(record) {
    for (const table of this.tablesOf(record)) {
      if (!table.canonical.includes("id")) continue;

      for (const row of table.rows) {
        const ids = extractGlobalIds(row.values.id, record.feature);
        if (ids.length !== 1) continue;

        const id = ids[0];
        const prefix = id.split("-")[0].toUpperCase();
        if (!["FR", "NFR", "BR", "E", "BO", "CAP"].includes(prefix)) continue;

        const title =
          cleanCell(
            row.values.title ||
              row.values.requirement ||
              row.values.rule ||
              row.values.description
          ) || id;

        const type =
          prefix === "E"
            ? "error"
            : prefix === "BO"
              ? "bo"
              : prefix === "CAP"
                ? "cap"
                : "requirement";

        const props = {};
        for (let index = 0; index < table.canonical.length; index += 1) {
          const key = table.canonical[index];
          if (!key || key === "id" || key === "title") continue;
          const value = cleanCell(row.cells[index] || "");
          if (value && value !== "—") props[key] = value;
        }

        this.addNode(
          {
            key: id,
            type,
            subtype: type === "requirement" ? prefix : null,
            feature: record.feature,
            title,
            status: cleanCell(record.frontmatter.data.status || "") || null,
            updated: cleanCell(record.frontmatter.data.updated || "") || null,
            source: this.source(record.file, row.line),
            props,
          },
          true
        );

        this.addEdge({
          from: record.nodeKey,
          to: id,
          type: "CONTAINS",
          provenance: "table",
          source: this.source(record.file, row.line),
        });

        const referenced = extractGlobalIds(
          row.cells.filter((_, index) => table.canonical[index] !== "id").join(" "),
          record.feature
        ).filter((ref) => ref !== id);

        for (const ref of referenced) {
          if (prefix === "CAP" && ref.startsWith("BO-")) {
            this.addEdge({
              from: ref,
              to: id,
              type: "DERIVES",
              provenance: "table",
              source: this.source(record.file, row.line),
            });
          } else if (prefix === "FR" && ref.startsWith("CAP-")) {
            this.addEdge({
              from: ref,
              to: id,
              type: "DERIVES",
              provenance: "table",
              source: this.source(record.file, row.line),
            });
          } else {
            this.addEdge({
              from: id,
              to: ref,
              type: "REFERENCES",
              provenance: "table",
              source: this.source(record.file, row.line),
            });
          }
        }
      }
    }
  }

  // Parse checkbox Open Questions thành node OQ scope theo doc.
  parseOpenQuestions(record) {
    // Checkbox có OQ-N nhận ở mọi nơi; checkbox KHÔNG có ID chỉ nhận trong section
    // "Open Questions" (fixture cũ viết OQ trần) — auto-ID `OQ-a{n}` ổn định theo thứ tự file.
    let inOqSection = false;
    let autoIndex = 0;

    for (
      let index = Math.max(0, record.frontmatter.bodyLine - 1);
      index < record.lines.length;
      index += 1
    ) {
      const line = record.lines[index];

      const heading = line.match(/^#{2,4}\s+(.*)$/);
      if (heading) {
        // Anchor: chỉ nhận heading THUẦN "Open Questions" (cho phép tiền tố số/chữ
        // "10." / "h." và suffix trong ngoặc) — "Resolve Open Questions" KHÔNG mở auto-OQ.
        const cleaned = heading[1].replace(/^[a-z0-9]{1,3}[.)]\s*/i, "").trim();
        inOqSection = /^open questions?\s*(?:\(.*\))?\s*$/i.test(cleaned);
        continue;
      }

      const match = line.match(
        /^\s*-\s*\[([ xX~])\]\s*(?:\*\*)?(OQ-\d+)?(?:\*\*)?\s*[:—-]?\s*(.*)$/
      );
      if (!match) continue;

      let oq;
      if (match[2]) {
        oq = `OQ-${Number(match[2].split("-")[1])}`;
      } else {
        if (!inOqSection) continue;
        const text = String(match[3] || "").trim();
        if (!text || /^\(?\s*(none|n\/a|chưa có|không có|không)\b/i.test(text)) continue;
        autoIndex += 1;
        oq = `OQ-a${autoIndex}`;
      }

      const key = `${record.file}#${oq}`;
      const marker = match[1].toLowerCase();
      // [x] resolved · [~] deferred/out-of-scope (convention resolve-oqs) · [ ] open
      const oqStatus = marker === "x" ? "resolved" : marker === "~" ? "deferred" : "open";
      const resolved = marker === "x";

      this.addNode({
        key,
        type: "open_question",
        subtype: null,
        feature: record.feature,
        title: cleanTitle(match[3]) || oq,
        status: oqStatus,
        updated: cleanCell(record.frontmatter.data.updated || "") || null,
        source: this.source(record.file, index + 1),
        props: { oq_id: oq },
      });

      this.addEdge({
        from: record.nodeKey,
        to: key,
        type: "CONTAINS",
        provenance: "declared",
        source: this.source(record.file, index + 1),
      });

      if (resolved) {
        for (const cr of extractGlobalIds(line, record.feature).filter((id) =>
          id.startsWith("CR-")
        )) {
          this.addEdge({
            from: cr,
            to: key,
            type: "CLOSES",
            provenance: "declared",
            source: this.source(record.file, index + 1),
          });
        }
      }
    }
  }

  // Parse usecase index cũ/mới, Errors/OQ và CRUD matrix.
  parseUseCaseIndex(record) {
    const indexKey = record.nodeKey;

    for (const table of this.tablesOf(record)) {
      const heading = foldText(table.heading);

      if (heading === "use cases" || heading === "use case") {
        this.noteMissingColumns(record, table, [
          "id",
          "status",
          "actor",
          "covers_fr",
          "screens",
          "level",
          "errors",
          "oq_ref",
          "priority",
        ]);

        for (const row of table.rows) {
          const slugCell = row.values.id;
          if (!slugCell) continue;

          const uc = this.resolveUc(record.feature, slugCell, record.file);
          if (!uc) continue;

          const title =
            extractMarkdownLinks(slugCell)[0]?.label ||
            cleanCell(slugCell);

          this.addNode({
            key: uc,
            type: "use_case",
            subtype: null,
            feature: record.feature,
            title,
            status: cleanCell(row.values.status || "") || null,
            updated: cleanCell(row.values.updated || "") || null,
            source: this.source(record.file, row.line),
            props: {
              level: cleanCell(row.values.level || ""),
              priority: cleanCell(row.values.priority || ""),
            },
          });

          this.addEdge({
            from: indexKey,
            to: uc,
            type: "CATALOGS",
            provenance: "table",
            source: this.source(record.file, row.line),
          });
          this.addEdge({
            from: uc,
            to: indexKey,
            type: "INHERITS_STATUS_FROM",
            provenance: "table",
            source: this.source(record.file, row.line),
          });

          const linkedFile = [...extractMarkdownLinks(slugCell)]
            .map((link) => this.resolveDocTarget(record.file, link.target))
            .find(Boolean);
          if (linkedFile) this.catalogedContent.add(linkedFile);

          for (const ref of extractGlobalIds(
            row.values.covers_fr,
            record.feature
          )) {
            this.addEdge({
              from: uc,
              to: ref,
              type: "SATISFIES",
              provenance: "table",
              source: this.source(record.file, row.line),
            });
          }

          for (const screenName of splitLooseList(row.values.screens)) {
            const screen = this.addScreen(
              record.feature,
              screenName,
              this.source(record.file, row.line)
            );
            if (screen) {
              this.addEdge({
                from: screen,
                to: uc,
                type: "DISPLAYS",
                provenance: "table",
                source: this.source(record.file, row.line),
              });
            }
          }

          if (row.values.actor) {
            const actor = this.addActor(
              row.values.actor,
              record.feature,
              this.source(record.file, row.line)
            );
            if (actor) {
              this.addEdge({
                from: uc,
                to: actor,
                type: "REFERENCES",
                provenance: "table",
                source: this.source(record.file, row.line),
              });
            }
          }

          for (const error of extractGlobalIds(
            row.values.errors,
            record.feature
          ).filter((id) => id.startsWith("E-"))) {
            this.addEdge({
              from: uc,
              to: error,
              type: "RAISES",
              provenance: "table",
              source: this.source(record.file, row.line),
            });
            this.errorOwners.get(error)?.add(uc) ||
              this.errorOwners.set(error, new Set([uc]));
          }

          const oq = this.resolveOpenQuestion(
            record.feature,
            row.values.oq_ref
          );
          if (oq) {
            this.addEdge({
              from: uc,
              to: oq,
              type: "REFERENCES",
              provenance: "table",
              source: this.source(record.file, row.line),
            });
          }
        }
        continue;
      }

      if (heading === "relationships" || heading === "relationship") {
        this.noteMissingColumns(record, table, [
          "relation_type",
          "from",
          "to",
        ]);

        let emitted = 0;

        for (const row of table.rows) {
          // Exact-match toàn chuỗi (sau khi bỏ marker UML <<..>>), KHÔNG substring:
          // "không bao gồm"/"not included" chứa "bao gom"/"include" nhưng là PHỦ ĐỊNH
          // → phải rơi xuống nhánh "loại không hỗ trợ" (loud), không sinh edge ngược nghĩa.
          const relation = foldText(
            row.values.relation_type || row.cells[0] || ""
          )
            .replace(/[^a-z0-9 ]+/g, " ")
            .replace(/\s+/g, " ")
            .trim();

          let edgeType = "";
          if (
            ["include", "includes", "included", "bao gom", "bao ham"].includes(
              relation
            )
          ) {
            edgeType = "INCLUDES";
          } else if (
            ["extend", "extends", "extension", "mo rong"].includes(relation)
          ) {
            edgeType = "EXTENDS";
          } else if (
            [
              "generalize",
              "generalizes",
              "generalization",
              "tong quat hoa",
              "khai quat hoa",
            ].includes(relation)
          ) {
            edgeType = "GENERALIZES";
          }

          if (!edgeType) {
            const reason =
              `Relationships row có loại không hỗ trợ "${cleanCell(
                row.values.relation_type || row.cells[0] || ""
              )}" tại line ${row.line}`;
            this.addCoverageNote(`${record.file}: ${reason}`);
            this.notePartialParse(record.file, reason);
            continue;
          }

          const from = this.resolveUc(
            record.feature,
            row.values.from || row.cells[1],
            record.file
          );
          const to = this.resolveUc(
            record.feature,
            row.values.to || row.cells[2],
            record.file
          );

          if (!from || !to) {
            const reason =
              `Relationships row thiếu UC nguồn/đích tại line ${row.line}`;
            this.addCoverageNote(`${record.file}: ${reason}`);
            this.notePartialParse(record.file, reason);
            continue;
          }

          this.addEdge({
            from,
            to,
            type: edgeType,
            provenance: "table",
            source: this.source(record.file, row.line),
          });
          emitted += 1;
        }

        if (!emitted) {
          this.notePartialParse(
            record.file,
            `bảng "${table.heading}" trích được 0 relationship`
          );
        }

        continue;
      }

      if (heading.includes("crud matrix")) {
        if (table.headers.length < 2) {
          this.addCoverageNote(
            `${record.file}:${table.headerLine}: CRUD matrix thiếu cột entity`
          );
          continue;
        }

        for (const row of table.rows) {
          const uc = this.resolveUc(
            record.feature,
            row.cells[0],
            record.file
          );
          if (!uc) continue;

          for (let index = 1; index < table.headers.length; index += 1) {
            const entityName = cleanCell(table.headers[index]);
            const ops = cleanCell(row.cells[index] || "")
              .toUpperCase()
              .replace(/[^CRUD]/g, "");

            if (!entityName || !ops) continue;

            const entity = this.addEntity(
              record.feature,
              entityName,
              this.source(record.file, table.headerLine)
            );

            this.addEdge({
              from: uc,
              to: entity,
              type: "OPERATES_ON",
              provenance: "table",
              source: this.source(record.file, row.line),
              props: {
                ops: [..."CRUD"].filter((op) => ops.includes(op)).join(""),
              },
            });
          }
        }
      }
    }
  }

  // Parse UC content cũ a..h và format mới Related Requirements.
  parseUseCaseContent(record) {
    const uc = record.nodeKey;
    const index = this.findIndex(record.feature, "usecase");

    if (index) {
      this.addEdge({
        from: uc,
        to: index.nodeKey,
        type: "INHERITS_STATUS_FROM",
        provenance: "declared",
        source: this.source(record.file, 1),
      });
    }

    let section = "";
    for (let indexLine = 0; indexLine < record.lines.length; indexLine += 1) {
      const line = record.lines[indexLine];
      const heading = line.match(/^##\s+(.+?)\s*$/);
      if (heading) section = foldText(heading[1]);

      if (
        section.includes("primary actor") &&
        line.trim() &&
        !line.startsWith("#") &&
        !line.startsWith("<!--")
      ) {
        const actor = this.addActor(
          line,
          record.feature,
          this.source(record.file, indexLine + 1)
        );
        if (actor) {
          this.addEdge({
            from: uc,
            to: actor,
            type: "REFERENCES",
            provenance: "declared",
            source: this.source(record.file, indexLine + 1),
          });
          section = `${section}:parsed`;
        }
      }

      if (
        section.includes("related requirements") ||
        section.includes("related fr") ||
        section.includes("traceability")
      ) {
        for (const ref of extractGlobalIds(line, record.feature)) {
          this.addEdge({
            from: uc,
            to: ref,
            type: ref.startsWith("E-") ? "RAISES" : "SATISFIES",
            provenance: "declared",
            source: this.source(record.file, indexLine + 1),
          });
        }
      }

      if (section.includes("screens involved")) {
        for (const link of [
          ...extractMarkdownLinks(line),
          ...extractWikiLinks(line),
        ]) {
          const screen = this.addScreen(
            record.feature,
            link.label,
            this.source(record.file, indexLine + 1)
          );
          if (screen) {
            this.addEdge({
              from: screen,
              to: uc,
              type: "DISPLAYS",
              provenance: "declared",
              source: this.source(record.file, indexLine + 1),
            });
          }
        }
      }
    }

    for (const table of this.tablesOf(record)) {
      if (
        table.canonical.includes("actor") &&
        foldText(table.heading).includes("actors")
      ) {
        for (const row of table.rows) {
          const actorValue = row.values.actor || row.cells[0];
          const actor = this.addActor(
            actorValue,
            record.feature,
            this.source(record.file, row.line)
          );
          if (actor) {
            this.addEdge({
              from: uc,
              to: actor,
              type: "REFERENCES",
              provenance: "table",
              source: this.source(record.file, row.line),
            });
          }
        }
      }
    }
  }

  // Parse story index cũ/mới, gồm cột UC và Jira.
  parseUserStoryIndex(record) {
    for (const table of this.tablesOf(record)) {
      if (!/^(stories|user stories)$/i.test(foldText(table.heading))) continue;

      this.noteMissingColumns(record, table, [
        "id",
        "title",
        "covers_fr",
        "uc",
        "screens",
        "priority",
        "status",
        "jira",
      ]);

      for (const row of table.rows) {
        const story = this.resolveUserStory(
          record.feature,
          row.values.id,
          record.file
        );
        if (!story) continue;

        const title =
          cleanCell(row.values.title) ||
          extractMarkdownLinks(row.values.id)[0]?.label ||
          cleanCell(row.values.id);

        this.addNode({
          key: story,
          type: "user_story",
          subtype: null,
          feature: record.feature,
          title,
          status: cleanCell(row.values.status || "") || null,
          updated: cleanCell(row.values.updated || "") || null,
          source: this.source(record.file, row.line),
          props: {
            priority: cleanCell(row.values.priority || ""),
            persona: cleanCell(row.values.persona || ""),
          },
        });

        this.addEdge({
          from: record.nodeKey,
          to: story,
          type: "CATALOGS",
          provenance: "table",
          source: this.source(record.file, row.line),
        });
        this.addEdge({
          from: story,
          to: record.nodeKey,
          type: "INHERITS_STATUS_FROM",
          provenance: "table",
          source: this.source(record.file, row.line),
        });

        for (const link of extractMarkdownLinks(row.values.id)) {
          const target = this.resolveDocTarget(record.file, link.target);
          if (target) this.catalogedContent.add(target);
        }

        for (const ref of extractGlobalIds(
          row.values.covers_fr,
          record.feature
        )) {
          this.addEdge({
            from: story,
            to: ref,
            type: "COVERS",
            provenance: "table",
            source: this.source(record.file, row.line),
          });
        }

        for (const ucSlug of extractUcSlugs(row.values.uc)) {
          const uc = this.resolveUc(record.feature, ucSlug, record.file);
          if (uc) {
            this.addEdge({
              from: story,
              to: uc,
              type: "DERIVES",
              provenance: "table",
              source: this.source(record.file, row.line),
            });
          }
        }

        for (const screenName of splitLooseList(row.values.screens)) {
          const screen = this.addScreen(
            record.feature,
            screenName,
            this.source(record.file, row.line)
          );
          if (screen) {
            this.addEdge({
              from: story,
              to: screen,
              type: "REFERENCES",
              provenance: "table",
              source: this.source(record.file, row.line),
            });
          }
        }

        const jiraMatch = cleanCell(row.values.jira).match(
          /\b[A-Z][A-Z0-9]+-\d+\b/
        );
        if (jiraMatch) {
          const jiraKey = jiraMatch[0];
          const jiraNode = `jira:${jiraKey}`;
          this.addNode({
            key: jiraNode,
            type: "jira_issue",
            subtype: null,
            feature: record.feature,
            title: jiraKey,
            status: null,
            updated: null,
            source: this.source(record.file, row.line),
            props: { jira_key: jiraKey, projection: "story-index" },
          });
          this.addEdge({
            from: story,
            to: jiraNode,
            type: "SYNCS_TO",
            provenance: "table",
            source: this.source(record.file, row.line),
          });
        }
      }
    }
  }

  // Parse US content và các heading AC-NNN cùng Covers/Screen/Type.
  parseUserStoryContent(record) {
    const story = record.nodeKey;
    const index = this.findIndex(record.feature, "story");

    if (index) {
      this.addEdge({
        from: story,
        to: index.nodeKey,
        type: "INHERITS_STATUS_FROM",
        provenance: "declared",
        source: this.source(record.file, 1),
      });
    }

    const acHeadings = [];
    for (let indexLine = 0; indexLine < record.lines.length; indexLine += 1) {
      const match = record.lines[indexLine].match(
        /^###\s+(AC-\d+)\s*(?:—|-|:)?\s*(.*)$/
      );
      if (match) {
        acHeadings.push({
          id: `AC-${Number(match[1].split("-")[1]).toString().padStart(3, "0")}`,
          title: cleanTitle(match[2]),
          index: indexLine,
          line: indexLine + 1,
        });
      }
    }

    for (let acIndex = 0; acIndex < acHeadings.length; acIndex += 1) {
      const current = acHeadings[acIndex];
      const end =
        acHeadings[acIndex + 1]?.index ?? record.lines.length;
      const key = `${record.file}#${current.id}`;
      const props = {};

      this.addNode({
        key,
        type: "acceptance_criterion",
        subtype: null,
        feature: record.feature,
        title: current.title || current.id,
        status: null,
        updated: null,
        source: this.source(record.file, current.line),
        props,
      });

      this.addEdge({
        from: story,
        to: key,
        type: "CONTAINS",
        provenance: "declared",
        source: this.source(record.file, current.line),
      });

      for (let lineIndex = current.index + 1; lineIndex < end; lineIndex += 1) {
        const line = record.lines[lineIndex];
        const typeMatch = line.match(/^\s*-\s*\*\*Type:\*\*\s*(.+)$/i);
        if (typeMatch) {
          this.nodes.get(key).props.type = cleanCell(typeMatch[1]);
        }

        const screenMatch = line.match(/^\s*-\s*\*\*Screen:\*\*\s*(.+)$/i);
        if (screenMatch) {
          for (const name of splitLooseList(screenMatch[1])) {
            const screen = this.addScreen(
              record.feature,
              name,
              this.source(record.file, lineIndex + 1)
            );
            if (screen) {
              this.addEdge({
                from: key,
                to: screen,
                type: "REFERENCES",
                provenance: "declared",
                source: this.source(record.file, lineIndex + 1),
              });
            }
          }
        }

        if (
          /^\s*-\s*\*\*(?:Covers|Error code|Errors?):\*\*/i.test(line)
        ) {
          for (const ref of extractGlobalIds(line, record.feature)) {
            this.addEdge({
              from: key,
              to: ref,
              type: ref.startsWith("E-") ? "RAISES" : "VERIFIES",
              provenance: "declared",
              source: this.source(record.file, lineIndex + 1),
            });
          }
        }
      }
    }
  }

  // Parse screen index, catalog flow content và mapping screen→UC.
  parseScreenIndex(record) {
    for (const table of this.tablesOf(record)) {
      if (foldText(table.heading) !== "screens") continue;

      this.noteMissingColumns(record, table, [
        "id",
        "status",
        "flow",
        "used_by",
        "figma",
        "prototype",
        "wireframe_html",
      ]);

      for (const row of table.rows) {
        const slug = normalizeScreenSlug(row.values.id);
        if (!slug) continue;

        const screen = this.addScreen(
          record.feature,
          slug,
          this.source(record.file, row.line),
          {
            priority: cleanCell(row.values.priority || ""),
          }
        );
        const node = this.nodes.get(screen);
        node.status ??= cleanCell(row.values.status || "") || null;
        node.updated ??= cleanCell(row.values.updated || "") || null;

        for (const [column, kind] of [
          ["figma", "figma"],
          ["prototype", "prototype"],
          ["wireframe_html", "wireframe-html"],
        ]) {
          const target = cleanCell(row.values[column] || "");
          if (!target || target === "—" || target === "-") continue;

          const render = `render:${record.feature}/${slug}/${kind}`;
          this.addNode({
            key: render,
            type: "render_artifact",
            subtype: null,
            feature: record.feature,
            title: `${slug} — ${kind}`,
            status: null,
            updated: null,
            source: this.source(record.file, row.line),
            props: { target, kind },
          });
          this.addEdge({
            from: render,
            to: screen,
            type: "RENDERS",
            provenance: "table",
            source: this.source(record.file, row.line),
          });
        }

        this.addEdge({
          from: record.nodeKey,
          to: screen,
          type: "CATALOGS",
          provenance: "table",
          source: this.source(record.file, row.line),
        });
        this.addEdge({
          from: screen,
          to: record.nodeKey,
          type: "INHERITS_STATUS_FROM",
          provenance: "table",
          source: this.source(record.file, row.line),
        });

        const flowLinks = extractMarkdownLinks(row.values.flow);
        if (flowLinks.length) {
          for (const link of flowLinks) {
            const content = this.resolveDocTarget(record.file, link.target);
            if (content) {
              this.catalogedContent.add(content);
              this.addEdge({
                from: record.nodeKey,
                to: content,
                type: "CATALOGS",
                provenance: "table",
                source: this.source(record.file, row.line),
              });
            }

            const flowSlug =
              slugify(link.label) ||
              slugify(path.posix.basename(link.target, ".md"));
            const flow = this.addFlow(
              record.feature,
              flowSlug,
              link.label,
              this.source(record.file, row.line)
            );
            if (flow) {
              this.addEdge({
                from: flow,
                to: screen,
                type: "CONTAINS",
                provenance: "table",
                source: this.source(record.file, row.line),
              });
            }
          }
        } else {
          const legacy = `${path.posix.dirname(record.file)}/${slug}.md`;
          if (this.recordByPath.has(legacy)) this.catalogedContent.add(legacy);
        }

        for (const ucSlug of extractUcSlugs(row.values.used_by)) {
          const uc = this.resolveUc(record.feature, ucSlug, record.file);
          if (uc) {
            this.addEdge({
              from: screen,
              to: uc,
              type: "DISPLAYS",
              provenance: "table",
              source: this.source(record.file, row.line),
            });
          }
        }
      }
    }
  }

  // Parse HTML wireframe index: mỗi flow file render các screen theo thứ tự.
  parseWireframeHtmlIndex(record) {
    for (const table of this.tablesOf(record)) {
      if (foldText(table.heading) !== "flows") continue;

      this.noteMissingColumns(record, table, ["flow", "file", "screens"]);

      for (const row of table.rows) {
        const flowTitle = cleanCell(row.values.flow || "");
        const fileLink = extractMarkdownLinks(row.values.file)[0];
        const renderFile = stripQuotes(
          fileLink?.target || cleanCell(row.values.file || "")
        )
          .replace(/^<|>$/g, "")
          .trim();

        if (
          !flowTitle ||
          !renderFile ||
          renderFile === "—" ||
          renderFile === "-"
        ) {
          const reason =
            `bảng "${table.heading || "(không heading)"}" row ${row.line} ` +
            "thiếu Flow hoặc File";
          this.addCoverageNote(`${record.file}:${row.line}: ${reason}`);
          this.notePartialParse(record.file, reason);
          continue;
        }

        // Basename file là flow-slug canonical ({flow-slug}.html) — resolve trực tiếp
        // + addFlow (order-independent: userflow có thể parse SAU file này).
        // Fallback title-match cho docs lệch chuẩn (review Phase 4: title-only = 0 edge flow).
        const baseSlug = slugify(
          String(renderFile).split("/").pop().replace(/\.html?$/i, "")
        );
        const flow = baseSlug
          ? this.addFlow(record.feature, baseSlug, flowTitle, this.source(record.file, row.line))
          : this.findMatchingFlow(record.feature, flowTitle);

        for (const screenValue of splitLooseList(row.values.screens)) {
          const screenSlug = normalizeScreenSlug(screenValue);
          if (!screenSlug) continue;

          const source = this.source(record.file, row.line);
          const screen = this.addScreen(
            record.feature,
            screenSlug,
            source
          );
          if (!screen) continue;

          const render =
            `render:${record.feature}/${screenSlug}/wireframe-html`;
          this.addNode({
            key: render,
            type: "render_artifact",
            subtype: null,
            feature: record.feature,
            title: `${screenSlug} — wireframe-html`,
            status: null,
            updated: null,
            source,
            props: {
              kind: "wireframe-html",
              // Array để addNode merge đủ nhiều flow-file khi một screen dùng chung.
              file: [renderFile],
            },
          });
          this.addEdge({
            from: render,
            to: screen,
            type: "RENDERS",
            provenance: "table",
            source,
          });

          if (flow) {
            this.addEdge({
              from: render,
              to: flow,
              type: "RENDERS",
              provenance: "table",
              source,
            });
          }
        }
      }
    }
  }

  // Parse file ASCII wireframe theo các block "## Screen: slug".
  parseScreenContent(record) {
    const screenIndex = this.findIndex(record.feature, "screen");

    for (let index = 0; index < record.lines.length; index += 1) {
      const match = record.lines[index].match(
        /^##\s+Screen:\s*([^—:]+)(?:\s*[—:-]\s*(.*))?$/i
      );
      if (!match) continue;

      const screen = this.addScreen(
        record.feature,
        match[1],
        this.source(record.file, index + 1),
        { content_file: record.file }
      );

      this.addEdge({
        from: record.nodeKey,
        to: screen,
        type: "CONTAINS",
        provenance: "declared",
        source: this.source(record.file, index + 1),
      });

      if (screenIndex) {
        this.addEdge({
          from: screen,
          to: screenIndex.nodeKey,
          type: "INHERITS_STATUS_FROM",
          provenance: "declared",
          source: this.source(record.file, index + 1),
        });
      }
    }
  }

  // Parse userflow: danh sách màn, flow và bảng 3.5 chuyển màn.
  parseUserFlow(record) {
    // Mục 2 canonical (B10, 2026-07-16) có cột Slug = định danh máy-đọc; cột "Màn hình"
    // là TÊN human. Mục 3 ("Màn hình gồm") + 3.5 ("Từ màn [#]") có thể refer bằng slug,
    // bằng TÊN, hoặc bằng số [n] đối chiếu Mục 2 → cần map để resolve, không slugify mù
    // tên tiếng Việt (danh-sach-thong-bao ≠ notification-list — phát hiện từ fixture canonical).
    const slugByOrder = []; // [n] (1-based) → slug
    const slugByName = new Map(); // foldText(tên) → slug

    const resolveScreenToken = (token) => {
      const raw = cleanCell(String(token ?? ""));
      if (!raw) return null;
      const numbered = String(token).match(/\[(\d+)\]/);
      if (numbered && slugByOrder[Number(numbered[1]) - 1]) {
        return slugByOrder[Number(numbered[1]) - 1];
      }
      const stripped = raw.replace(/\[[^\]]*\]/g, "").trim();
      if (/^[a-z0-9][a-z0-9-]*$/.test(stripped)) return stripped; // đã là slug
      const byName = slugByName.get(foldText(stripped));
      if (byName) return byName;
      return stripped; // fallback: addScreen sẽ slugify (hành vi cũ cho docs legacy)
    };

    for (const table of this.tablesOf(record)) {
      const heading = foldText(table.heading);

      if (heading.includes("danh sach man hinh")) {
        for (const row of table.rows) {
          // Ưu tiên cột Slug (canonical B10); thiếu → dùng tên như cũ (docs legacy).
          const slugValue = cleanCell(row.values.id || "");
          const nameValue = cleanCell(row.values.screen || "");
          const value = slugValue || nameValue;
          if (!value) continue;

          const key = this.addScreen(
            record.feature,
            value,
            this.source(record.file, row.line)
          );
          if (key) {
            const slug = key.split("/").pop();
            slugByOrder.push(slug);
            if (nameValue) slugByName.set(foldText(nameValue), slug);
            // Slug + tên cùng có → giữ tên human làm title cho dễ đọc viewer/panel.
            const node = this.nodes.get(key);
            if (node && nameValue && node.title === slug) node.title = nameValue;
          }
        }
        continue;
      }

      if (heading.includes("danh sach flow")) {
        this.noteMissingColumns(record, table, ["flow", "screens"]);

        for (const row of table.rows) {
          const slug = cleanCell(row.values.flow || row.values.id);
          if (!slug) continue;

          const flow = this.addFlow(
            record.feature,
            slug,
            cleanCell(row.values.title) || slug,
            this.source(record.file, row.line)
          );

          this.addEdge({
            from: record.nodeKey,
            to: flow,
            type: "CONTAINS",
            provenance: "table",
            source: this.source(record.file, row.line),
          });

          for (const screenName of splitLooseList(row.values.screens)) {
            const screen = this.addScreen(
              record.feature,
              resolveScreenToken(screenName),
              this.source(record.file, row.line)
            );
            if (screen) {
              this.addEdge({
                from: flow,
                to: screen,
                type: "CONTAINS",
                provenance: "table",
                source: this.source(record.file, row.line),
              });
            }
          }
        }
        continue;
      }

      if (
        heading.includes("chuyen man") ||
        (table.canonical.includes("from") && table.canonical.includes("to"))
      ) {
        this.noteMissingColumns(record, table, ["from", "to", "trigger"]);

        for (const row of table.rows) {
          const from = this.addScreen(
            record.feature,
            resolveScreenToken(row.values.from),
            this.source(record.file, row.line)
          );
          const to = this.addScreen(
            record.feature,
            resolveScreenToken(row.values.to),
            this.source(record.file, row.line)
          );

          if (from && to) {
            this.addEdge({
              from,
              to,
              type: "NAVIGATES_TO",
              provenance: "table",
              source: this.source(record.file, row.line),
              props: {
                trigger: cleanCell(row.values.trigger || ""),
                condition: cleanCell(row.values.condition || ""),
              },
            });
          }
        }
      }
    }
  }

  findMatchingFlow(feature, title) {
    const requestedSlug = slugify(title);

    // 1. Chỉ merge chắc chắn khi slug/title khớp TUYỆT ĐỐI với đúng 1 flow.
    for (const [key, node] of this.nodes) {
      if (node.type !== "flow" || node.feature !== feature) continue;
      if (
        slugify(node.props.slug || "") === requestedSlug ||
        slugify(node.title || "") === requestedSlug
      ) {
        return key;
      }
    }

    // 2. Fuzzy CHỈ khi best duy nhất và rất mạnh (≥0.8, không tie).
    //    Mơ hồ (tie hoặc 0.5-0.8) → KHÔNG merge, caller tạo flow riêng + ghi note
    //    (fix review: heading gộp "OAuth (Google/GitHub)" từng bị nhét vào google-oauth,
    //    mang nhầm FR/E của GitHub — mis-attribution không dấu vết).
    const requested = new Set(requestedSlug.split("-").filter(Boolean));
    let best = null;
    let bestScore = 0;
    let tie = false;

    for (const [key, node] of this.nodes) {
      if (node.type !== "flow" || node.feature !== feature) continue;
      const existing = new Set(
        slugify(`${node.title} ${node.props.slug || ""}`)
          .split("-")
          .filter(Boolean)
      );
      const common = [...requested].filter((token) => existing.has(token)).length;
      // Jaccard (chia UNION) thay vì chia min-size: "oauth" ⊂ "google-oauth" chỉ còn
      // 0.5 thay vì 1.0 — subset 1 token không còn merge lụi (finding review vòng 2).
      const union = new Set([...requested, ...existing]).size;
      const score = common / Math.max(1, union);

      if (score > bestScore) {
        best = key;
        bestScore = score;
        tie = false;
      } else if (score === bestScore && score > 0 && key !== best) {
        tie = true;
      }
    }

    if (bestScore >= 0.8 && !tie) return best;
    if (bestScore >= 0.5) {
      this.addCoverageNote(
        `heading Flow "${title}" (${feature}) mơ hồ với flow đã có — tạo flow riêng, không merge`
      );
    }
    return null;
  }

  // Parse flows.md: heading Flow và metadata Liên quan/Error/Related UC/BR.
  parseFlows(record) {
    for (let index = 0; index < record.lines.length; index += 1) {
      const match = record.lines[index].match(/^##\s+Flow:\s*(.+?)\s*$/i);
      if (!match) continue;

      const title = cleanTitle(match[1]);
      const flow =
        this.findMatchingFlow(record.feature, title) ||
        this.addFlow(
          record.feature,
          title,
          title,
          this.source(record.file, index + 1)
        );

      this.addEdge({
        from: record.nodeKey,
        to: flow,
        type: "CONTAINS",
        provenance: "declared",
        source: this.source(record.file, index + 1),
      });

      for (
        let cursor = index + 1;
        cursor < Math.min(record.lines.length, index + 8);
        cursor += 1
      ) {
        const line = record.lines[cursor].trim();
        if (!line) continue;
        if (line.startsWith("##") || line.startsWith("```")) break;
        if (!line.includes(":")) continue;

        for (const segment of line.split("|")) {
          const [labelRaw, ...rest] = segment.split(":");
          const label = foldText(labelRaw);
          const value = rest.join(":");

          if (!value) continue;

          if (
            label.includes("lien quan") ||
            label.includes("related fr")
          ) {
            for (const ref of extractGlobalIds(value, record.feature)) {
              this.addEdge({
                from: flow,
                to: ref,
                type: ref.startsWith("E-") ? "RAISES" : "COVERS",
                provenance: "declared",
                source: this.source(record.file, cursor + 1),
              });
            }
          } else if (
            label.startsWith("error") ||
            label.includes("related e")
          ) {
            for (const ref of extractGlobalIds(value, record.feature)) {
              this.addEdge({
                from: flow,
                to: ref,
                type: "RAISES",
                provenance: "declared",
                source: this.source(record.file, cursor + 1),
              });
            }
          } else if (label.includes("business rule")) {
            for (const ref of extractGlobalIds(value, record.feature)) {
              this.addEdge({
                from: flow,
                to: ref,
                type: "REFERENCES",
                provenance: "declared",
                source: this.source(record.file, cursor + 1),
              });
            }
          } else if (label.includes("related uc")) {
            for (const ucSlug of extractUcSlugs(value)) {
              const uc = this.resolveUc(record.feature, ucSlug, record.file);
              if (uc) {
                this.addEdge({
                  from: flow,
                  to: uc,
                  type: "RELATES_TO",
                  provenance: "declared",
                  source: this.source(record.file, cursor + 1),
                });
              }
            }
          }
        }

        // KHÔNG break sau dòng metadata đầu tiên — metadata có thể tách nhiều dòng,
        // hoặc 1 dòng prose chứa ":" đứng trước (fix review: break sớm nuốt COVERS/RAISES).
      }
    }
  }

  // Parse Mermaid erDiagram: entity blocks, attributes và cardinality.
  parseErd(record) {
    let inMermaid = false;
    let inErd = false;
    let activeEntity = null;

    for (let index = 0; index < record.lines.length; index += 1) {
      const raw = record.lines[index];
      const trimmed = raw.trim();

      if (trimmed.startsWith("```mermaid")) {
        inMermaid = true;
        inErd = false;
        activeEntity = null;
        continue;
      }

      if (inMermaid && trimmed === "```") {
        inMermaid = false;
        inErd = false;
        activeEntity = null;
        continue;
      }

      if (!inMermaid) continue;
      if (trimmed === "erDiagram") {
        inErd = true;
        continue;
      }
      if (!inErd || !trimmed) continue;

      const blockMatch = trimmed.match(/^([A-Za-z][A-Za-z0-9_]*)\s*\{$/);
      if (blockMatch) {
        activeEntity = this.addEntity(
          record.feature,
          blockMatch[1],
          this.source(record.file, index + 1)
        );
        continue;
      }

      if (activeEntity && trimmed === "}") {
        activeEntity = null;
        continue;
      }

      if (activeEntity) {
        const node = this.nodes.get(activeEntity);
        node.props.attributes = uniqueSorted([
          ...(node.props.attributes || []),
          cleanCell(trimmed),
        ]);
        continue;
      }

      const relation = trimmed.match(
        /^([A-Za-z][A-Za-z0-9_]*)\s+([|o}{.\-]+)\s+([A-Za-z][A-Za-z0-9_]*)\s*:\s*(.+)$/
      );
      if (!relation) continue;

      const from = this.addEntity(
        record.feature,
        relation[1],
        this.source(record.file, index + 1)
      );
      const to = this.addEntity(
        record.feature,
        relation[3],
        this.source(record.file, index + 1)
      );

      this.addEdge({
        from,
        to,
        type: "RELATES_TO",
        provenance: "declared",
        source: this.source(record.file, index + 1),
        props: {
          cardinality: relation[2],
          label: stripQuotes(cleanCell(relation[4])),
        },
      });
    }
  }

  // Parse stateDiagram-v2 theo từng "## State: Entity".
  parseStates(record) {
    let machine = null;
    let entity = null;
    let inMermaid = false;

    const addRealState = (value, source) => {
      // Kiểm token THÔ trước cleanCell — cleanCell strip "*" biến "[*]" thành "[]"
      // khiến check cũ không bao giờ đúng → sinh state giả "#unknown".
      const token = String(value ?? "").trim();
      if (!token || token === "[*]") return null;
      const raw = cleanCell(token);
      if (!raw || raw === "[]") return null;

      const key = `state:${record.feature}/${entityCanonical(
        this.nodes.get(entity)?.title || ""
      )}#${stateSlug(raw)}`;

      this.addNode({
        key,
        type: "state",
        subtype: null,
        feature: record.feature,
        title: raw,
        status: null,
        updated: null,
        source,
        props: {},
      });

      this.addEdge({
        from: machine,
        to: key,
        type: "CONTAINS_STATE",
        provenance: "declared",
        source,
      });

      return key;
    };

    for (let index = 0; index < record.lines.length; index += 1) {
      const line = record.lines[index];
      const stateHeading = line.match(/^##\s+State:\s*(.+?)\s*$/i);

      if (stateHeading) {
        const name = cleanCell(stateHeading[1]);
        entity = this.addEntity(
          record.feature,
          name,
          this.source(record.file, index + 1)
        );
        machine = `state:${record.feature}/${entityCanonical(name)}`;

        this.addNode({
          key: machine,
          type: "state_machine",
          subtype: null,
          feature: record.feature,
          title: `${name} state machine`,
          status: null,
          updated: cleanCell(record.frontmatter.data.updated || "") || null,
          source: this.source(record.file, index + 1),
          props: {},
        });

        this.addEdge({
          from: machine,
          to: entity,
          type: "DESCRIBES_STATE_OF",
          provenance: "declared",
          source: this.source(record.file, index + 1),
        });
        continue;
      }

      if (!machine) continue;

      if (line.trim().startsWith("```mermaid")) {
        inMermaid = true;
        continue;
      }
      if (inMermaid && line.trim() === "```") {
        inMermaid = false;
        continue;
      }
      if (!inMermaid) continue;

      const transition = line.match(
        /^\s*(\[\*\]|[A-Za-z0-9_-]+)\s*-->\s*(\[\*\]|[A-Za-z0-9_-]+)\s*(?::\s*(.+))?$/
      );
      if (!transition) continue;

      const fromIsPseudo = String(transition[1] ?? "").trim() === "[*]";
      const toIsPseudo = String(transition[2] ?? "").trim() === "[*]";

      const from = addRealState(
        transition[1],
        this.source(record.file, index + 1)
      );
      const to = addRealState(
        transition[2],
        this.source(record.file, index + 1)
      );

      // `[*] --> X` / `X --> [*]` KHÔNG sinh node (pseudo-state của mermaid),
      // nhưng phải GHI LẠI vai trò initial/terminal lên chính state thật —
      // nếu vứt đi, consumer (flowgap) tưởng X "không có đường vào/ra" và báo
      // gap giả cho mọi state khởi tạo lẫn state kết thúc hợp lệ.
      if (fromIsPseudo && to) {
        const node = this.nodes.get(to);
        if (node) node.props.is_initial = true;
      }
      if (toIsPseudo && from) {
        const node = this.nodes.get(from);
        if (node) node.props.is_terminal = true;
      }

      if (from && to) {
        this.addEdge({
          from,
          to,
          type: "CONTAINS_TRANSITION",
          provenance: "declared",
          source: this.source(record.file, index + 1),
          props: { trigger: cleanCell(transition[3] || "") },
        });
      }
    }
  }

  // Parse test checklist index và testcase index theo cột File/Target.
  parseTestIndex(record) {
    const type = String(record.frontmatter.data.type || "").toLowerCase();
    // Fallback theo tên file khi type thiếu/sai (đồng bộ với dispatch).
    const isChecklist =
      type === "test-checklist-index" || /-checklist-index\.md$/i.test(record.file);
    const isTestcase =
      type === "test-cases-index" || /-testcase-index\.md$/i.test(record.file);
    if (!isChecklist && !isTestcase) return;

    for (const table of this.tablesOf(record)) {
      if (!table.canonical.includes("file")) continue;
      this.noteMissingColumns(record, table, ["file", "target"]);

      for (const row of table.rows) {
        const fileLink = extractMarkdownLinks(row.values.file)[0];
        if (!fileLink) continue;

        const content = this.resolveDocTarget(record.file, fileLink.target);
        if (!content) continue;

        this.addEdge({
          from: record.nodeKey,
          to: content,
          type: "CATALOGS",
          provenance: "table",
          source: this.source(record.file, row.line),
        });

        const uc = this.resolveUc(
          record.feature,
          row.values.target,
          record.file
        );
        if (uc) {
          this.addEdge({
            from: uc,
            to: content,
            type: "TESTED_BY",
            provenance: "table",
            source: this.source(record.file, row.line),
          });
        }

        if (isTestcase && row.values.source_checklist) {
          const sourceLink = extractMarkdownLinks(
            row.values.source_checklist
          )[0];
          if (sourceLink) {
            const checklist = this.resolveDocTarget(
              record.file,
              sourceLink.target
            );
            if (checklist) {
              this.addEdge({
                from: checklist,
                to: content,
                type: "TESTED_BY",
                provenance: "table",
                source: this.source(record.file, row.line),
              });
            }
          }
        }
      }
    }
  }

  // Parse checklist format mới [CHK-*] [Yes/No] → Ref · nội dung.
  parseChecklistContent(record) {
    let category = "";
    let subcategory = "";

    for (let index = 0; index < record.lines.length; index += 1) {
      const line = record.lines[index];

      const categoryMatch = line.match(/^#(?!#)\s*\d*\.?\s*(.+)$/);
      if (categoryMatch) {
        category = cleanTitle(categoryMatch[1]);
        continue;
      }

      const subMatch = line.match(/^\s*##\s*\d+(?:\.\d+)*\.?\s*(.+)$/);
      if (subMatch) {
        subcategory = cleanTitle(subMatch[1]);
        continue;
      }

      // Grammar CANONICAL của /test-checklist SKILL (regex chính chủ trong SKILL.md):
      // ^[1-4] [Yes|No] CHK-{feature}-NNN → (—|Ref list) · text$
      // ([P] priority đứng ĐẦU, CHK-ID KHÔNG bọc ngoặc — fix 2026-07-16: parser cũ
      // kỳ vọng [CHK-...] [Yes] → ... là format tự chế, lệch nguồn canonical).
      const item = line.match(
        /^\s*\[([1-4])\]\s*\[(Yes|No)\]\s*(CHK-[a-z0-9][a-z0-9-]*-\d{3,})\s*→\s*(—|[^·]+?)\s*·\s*(.+)$/i
      );
      if (!item) continue;

      const id = extractGlobalIds(item[3], record.feature)[0];
      if (!id) continue;

      this.addNode({
        key: id,
        type: "test_checklist_item",
        subtype: null,
        feature: record.feature,
        title: cleanCell(item[5]),
        status: null,
        updated: null,
        source: this.source(record.file, index + 1),
        props: {
          priority: item[1],
          auto: item[2],
          category,
          subcategory,
        },
      });

      this.addEdge({
        from: record.nodeKey,
        to: id,
        type: "CONTAINS",
        provenance: "declared",
        source: this.source(record.file, index + 1),
      });

      for (const ref of extractGlobalIds(item[4], record.feature)) {
        this.addEdge({
          from: id,
          to: ref,
          type: "VERIFIES",
          provenance: "declared",
          source: this.source(record.file, index + 1),
        });
      }
    }
  }

  // Parse testcase zero-frontmatter: mỗi block giữa --- là một TC atomic,
  // định danh ổn định bằng CHK-ID; file node vẫn giữ để index CATALOGS/INHERITS.
  parseTestCaseContent(record) {
    const blocks = [];
    let blockStart = 0;

    for (let index = 0; index <= record.lines.length; index += 1) {
      const isEnd = index === record.lines.length;
      const isSeparator =
        !isEnd && /^\s*---\s*$/.test(record.lines[index]);

      if (!isEnd && !isSeparator) continue;

      const lines = record.lines.slice(blockStart, index);
      if (lines.some((line) => line.trim())) {
        blocks.push({ start: blockStart, lines });
      }
      blockStart = index + 1;
    }

    for (const block of blocks) {
      const findField = (name) => {
        const pattern = new RegExp(
          `^\\s*\\*\\*${name}:\\*\\*\\s*(.*)$`,
          "i"
        );

        for (let index = 0; index < block.lines.length; index += 1) {
          const match = block.lines[index].match(pattern);
          if (match) {
            return {
              value: match[1],
              line: block.start + index + 1,
            };
          }
        }

        return null;
      };

      const checklist = findField("Checklist");
      const checklistMatch = checklist?.value.match(
        /^(CHK-[a-z0-9][a-z0-9-]*-\d{3,})(?:\s+\(retired\))?/i
      );

      if (!checklistMatch) {
        this.notePartialParse(
          record.file,
          `TC block bắt đầu line ${block.start + 1} thiếu Checklist hợp lệ`
        );
        continue;
      }

      const checklistId = extractGlobalIds(
        checklistMatch[1],
        record.feature
      )[0];
      if (!checklistId) {
        this.notePartialParse(
          record.file,
          `TC block bắt đầu line ${block.start + 1} có Checklist không chuẩn hóa được`
        );
        continue;
      }

      const stt = findField("STT");
      const title = findField("Title");
      const priority = findField("Priority");
      const auto = findField("Auto");
      const preconditions = findField("Preconditions");
      const ref = findField("Ref");
      const testCaseKey = `${record.file}#${checklistId}`;
      const source = this.source(record.file, checklist.line);

      this.addNode({
        key: testCaseKey,
        type: "test_case",
        subtype: null,
        feature: record.feature,
        title: cleanCell(title?.value || checklistId),
        status: null,
        updated: null,
        source,
        props: {
          stt: cleanCell(stt?.value || ""),
          title: cleanCell(title?.value || ""),
          priority: cleanCell(priority?.value || ""),
          auto: cleanCell(auto?.value || ""),
          preconditions: cleanCell(preconditions?.value || ""),
        },
      });

      this.addEdge({
        from: record.nodeKey,
        to: testCaseKey,
        type: "CONTAINS",
        provenance: "declared",
        source,
      });

      this.addEdge({
        from: checklistId,
        to: testCaseKey,
        type: "TESTED_BY",
        provenance: "declared",
        source,
      });

      if (ref) {
        for (const id of extractGlobalIds(ref.value, record.feature)) {
          this.addEdge({
            from: testCaseKey,
            to: id,
            type: "VERIFIES",
            provenance: "declared",
            source: this.source(record.file, ref.line),
          });
        }
      }
    }
  }

  // Parse bảng API checklist: mỗi row # là một ACL item ổn định theo file.
  parseApiChecklist(record) {
    for (const table of this.tablesOf(record)) {
      if (
        !table.canonical.includes("number") ||
        !table.canonical.includes("api") ||
        !table.canonical.includes("endpoint")
      ) {
        continue;
      }

      this.noteMissingColumns(record, table, [
        "number",
        "api",
        "direction",
        "endpoint",
        "http",
        "ref",
        "priority",
        "auto",
        "confidence",
      ]);

      for (const row of table.rows) {
        const rawNumber = cleanCell(row.values.number);
        if (!/^\d+$/.test(rawNumber)) {
          if (rawNumber && rawNumber !== "—" && rawNumber !== "-") {
            this.notePartialParse(
              record.file,
              `API checklist row line ${row.line} có # không hợp lệ`
            );
          }
          continue;
        }

        const number = String(Number(rawNumber));
        const itemKey = `${record.file}#ACL-${number}`;
        const source = this.source(record.file, row.line);

        this.addNode({
          key: itemKey,
          type: "api_checklist_item",
          subtype: null,
          feature: record.feature,
          title:
            cleanCell(row.values.scenario) ||
            `${cleanCell(row.values.api)} ${cleanCell(row.values.endpoint)}`.trim(),
          status: null,
          updated: null,
          source,
          props: {
            api: cleanCell(row.values.api),
            dir: cleanCell(row.values.direction),
            endpoint: cleanCell(row.values.endpoint),
            http: cleanCell(row.values.http),
            priority: cleanCell(row.values.priority),
            auto: cleanCell(row.values.auto),
            confidence: cleanCell(row.values.confidence),
          },
        });

        this.addEdge({
          from: record.nodeKey,
          to: itemKey,
          type: "CONTAINS",
          provenance: "table",
          source,
        });

        for (const id of extractGlobalIds(
          row.values.ref,
          record.feature
        )) {
          this.addEdge({
            from: itemKey,
            to: id,
            type: "VERIFIES",
            provenance: "table",
            source,
          });
        }
      }
    }
  }

  // Parse bảng API tests: TC-NN là node; ACL#n nối từ checklist cùng folder.
  parseApiTests(record) {
    for (const table of this.tablesOf(record)) {
      // Own-API dùng cột Auth thay Provider (api-test SKILL) — Provider OPTIONAL,
      // gate chỉ cần TC/Method/Path (review Phase 4: bắt buộc Provider làm rơi 45 TC own).
      if (
        !table.canonical.includes("tc") ||
        !table.canonical.includes("method") ||
        !table.canonical.includes("path")
      ) {
        continue;
      }

      this.noteMissingColumns(record, table, [
        "tc",
        "method",
        "path",
        "http",
        "assert",
        "ref",
        "result",
        "run_at",
      ]);

      for (const row of table.rows) {
        const rawTc = cleanCell(row.values.tc);
        const tcMatch = rawTc.match(/^TC-(\d{2,})$/i);
        if (!tcMatch) {
          if (rawTc && rawTc !== "—" && rawTc !== "-") {
            this.notePartialParse(
              record.file,
              `API test row line ${row.line} có TC không hợp lệ`
            );
          }
          continue;
        }

        const tcId = `TC-${tcMatch[1]}`;
        const testCaseKey = `${record.file}#${tcId}`;
        const source = this.source(record.file, row.line);

        this.addNode({
          key: testCaseKey,
          type: "test_case",
          subtype: null,
          feature: record.feature,
          title:
            `${cleanCell(row.values.method)} ${cleanCell(row.values.path)}`.trim() ||
            tcId,
          status: null,
          updated: null,
          source,
          props: {
            provider: cleanCell(row.values.provider || "") || "own",
            auth: cleanCell(row.values.auth || ""),
            method: cleanCell(row.values.method),
            path: cleanCell(row.values.path),
            http: cleanCell(row.values.http),
            assert: cleanCell(row.values.assert),
            result: cleanCell(row.values.result),
            run_at: cleanCell(row.values.run_at),
          },
        });

        this.addEdge({
          from: record.nodeKey,
          to: testCaseKey,
          type: "CONTAINS",
          provenance: "table",
          source,
        });

        const checklistFile = path.posix.join(
          path.posix.dirname(record.file),
          "api-checklist.md"
        );
        // Guard: sibling api-checklist.md phải THẬT tồn tại trong vault — không thì
        // ACL#n tạo edge từ node ma (review Phase 4). Note 1 lần/file.
        const checklistExists = this.records.some((r) => r.file === checklistFile);
        if (!checklistExists && /ACL#\d/.test(String(row.values.ref || ""))) {
          this.notePartialParse(
            record.file,
            `Ref ACL#n nhưng không thấy ${checklistFile} — bỏ edge TESTED_BY`
          );
        }

        for (const acl of String(row.values.ref || "").matchAll(
          /\bACL\s*#\s*(\d+)\b/gi
        )) {
          if (!checklistExists) break; // guard ở trên đã note
          this.addEdge({
            from: `${checklistFile}#ACL-${Number(acl[1])}`,
            to: testCaseKey,
            type: "TESTED_BY",
            provenance: "table",
            source,
          });
        }

        for (const id of extractGlobalIds(
          row.values.ref,
          record.feature
        )) {
          this.addEdge({
            from: testCaseKey,
            to: id,
            type: "VERIFIES",
            provenance: "table",
            source,
          });
        }
      }
    }
  }

  // Parse Playwright e2e-index: spec node dùng path .spec.ts thật từ markdown-link.
  parseE2eIndex(record) {
    const resolveSpecKey = (value) => {
      const link = extractMarkdownLinks(value)[0];
      if (!link) return null;

      const target = stripQuotes(link.target)
        .replace(/^<|>$/g, "")
        .replace(/[?#].*$/, "")
        .trim();

      if (
        !target ||
        /^(?:https?:|mailto:|app:)/i.test(target)
      ) {
        return null;
      }

      const resolved =
        target === this.dirRel ||
        target.startsWith(`${this.dirRel}/`) ||
        target.startsWith("docs/")
          ? path.posix.normalize(target)
          : path.posix.normalize(
              path.posix.join(path.posix.dirname(record.file), target)
            );

      return /\.spec\.ts$/i.test(resolved) ? resolved : null;
    };

    for (const table of this.tablesOf(record)) {
      const isSpecsTable =
        table.canonical.includes("scope") &&
        table.canonical.includes("file") &&
        table.canonical.includes("tests");
      const isMappingTable =
        table.canonical.includes("chk_id") &&
        table.canonical.includes("spec");
      const isSkippedTable =
        table.canonical.includes("chk_id") &&
        table.canonical.includes("reason");

      if (isSpecsTable) {
        this.noteMissingColumns(record, table, [
          "scope",
          "file",
          "tests",
          "last_result",
          "updated",
        ]);

        for (const row of table.rows) {
          const specKey = resolveSpecKey(row.values.file);
          if (!specKey) {
            const fileValue = cleanCell(row.values.file);
            if (fileValue && fileValue !== "—" && fileValue !== "-") {
              this.notePartialParse(
                record.file,
                `E2E Specs row line ${row.line} thiếu link .spec.ts hợp lệ`
              );
            }
            continue;
          }

          const scope = cleanCell(row.values.scope);
          const rowUpdated = cleanCell(row.values.updated);
          this.addNode({
            key: specKey,
            type: "e2e_spec",
            subtype: null,
            feature: record.feature,
            title: scope || path.posix.basename(specKey),
            status: null,
            updated:
              rowUpdated ||
              cleanCell(record.frontmatter.data.updated || "") ||
              null,
            source: this.source(record.file, row.line),
            props: {
              scope,
              tests: cleanCell(row.values.tests),
              last_result: cleanCell(row.values.last_result),
              updated: rowUpdated,
            },
          });
        }
      }

      if (isMappingTable) {
        this.noteMissingColumns(record, table, [
          "chk_id",
          "scope",
          "spec",
        ]);

        for (const row of table.rows) {
          const checklistIds = extractGlobalIds(
            row.values.chk_id,
            record.feature
          ).filter((id) => id.startsWith("CHK-"));
          if (!checklistIds.length) {
            // CHK-ID malformed nhưng ô KHÔNG rỗng → note, đừng nuốt lặng (review Phase 4).
            const rawChk = cleanCell(row.values.chk_id);
            if (rawChk && rawChk !== "—" && rawChk !== "-") {
              this.notePartialParse(
                record.file,
                `E2E mapping row line ${row.line} có CHK-ID không hợp lệ: ${rawChk}`
              );
            }
            continue;
          }

          const specKey = resolveSpecKey(row.values.spec);
          if (!specKey) {
            this.notePartialParse(
              record.file,
              `E2E mapping row line ${row.line} thiếu link .spec.ts hợp lệ`
            );
            continue;
          }

          const scope = cleanCell(row.values.scope);
          this.addNode({
            key: specKey,
            type: "e2e_spec",
            subtype: null,
            feature: record.feature,
            title: scope || path.posix.basename(specKey),
            status: null,
            updated:
              cleanCell(record.frontmatter.data.updated || "") || null,
            source: this.source(record.file, row.line),
            props: { scope },
          });

          for (const checklistId of checklistIds) {
            this.addEdge({
              from: specKey,
              to: checklistId,
              type: "AUTOMATES",
              provenance: "table",
              source: this.source(record.file, row.line),
            });
          }
        }
      }

      if (isSkippedTable) {
        this.noteMissingColumns(record, table, [
          "scope",
          "chk_id",
          "reason",
        ]);

        for (const row of table.rows) {
          const checklistIds = extractGlobalIds(
            row.values.chk_id,
            record.feature
          ).filter((id) => id.startsWith("CHK-"));
          const reason = cleanCell(row.values.reason);

          for (const checklistId of checklistIds) {
            this.addCoverageNote(
              `${checklistId} skipped: ${reason || "—"}`
            );
          }
        }
      }
    }
  }

  // Parse API map 3 tầng: api_field và REFERENCES entity/screen.
  parseApiMap(record) {
    for (const table of this.tablesOf(record)) {
      if (!table.canonical.includes("api_field")) continue;

      this.noteMissingColumns(record, table, ["api_field", "system", "ui"]);

      for (const row of table.rows) {
        const rawCell = row.values.api_field;
        const codeValues = [...String(rawCell).matchAll(/`([^`]+)`/g)].map(
          (match) => match[1]
        );
        const candidates = (codeValues.length ? codeValues : [cleanCell(rawCell)])
          .flatMap((value) => value.split(/\s+\/\s+/))
          .map((value) => value.trim())
          .filter((value) => value && value !== "—");

        for (const fieldRaw of candidates) {
          const field = fieldRaw
            .toLowerCase()
            .replace(/^action\s+|^event\s+/i, "")
            .replace(/\s+/g, "-")
            .replace(/[^a-z0-9._/{?&}=-]+/g, "-")
            .replace(/^-+|-+$/g, "");

          if (!field) continue;

          const key = `api:${record.feature}/${field}`;
          this.addNode({
            key,
            type: "api_field",
            subtype: null,
            feature: record.feature,
            title: fieldRaw,
            status: null,
            updated: cleanCell(record.frontmatter.data.updated || "") || null,
            source: this.source(record.file, row.line),
            props: {
              system: cleanCell(row.values.system || ""),
              ui: cleanCell(row.values.ui || ""),
              mapping: cleanCell(
                row.values.bien_doi_validation ||
                  row.values.bien_doi ||
                  ""
              ),
            },
          });

          const systemText = cleanCell(row.values.system || "");
          for (const match of systemText.matchAll(
            /\b([A-Z][A-Za-z0-9_]*)(?:\[\])?\.[A-Za-z_][A-Za-z0-9_]*\b/g
          )) {
            const entityKey = `entity:${record.feature}/${entityCanonical(
              match[1]
            )}`;
            if (this.nodes.has(entityKey)) {
              this.addEdge({
                from: key,
                to: entityKey,
                type: "REFERENCES",
                provenance: "table",
                source: this.source(record.file, row.line),
              });
            }
          }

          const uiText = foldText(cleanCell(row.values.ui || ""));
          for (const [screenKey, node] of this.nodes) {
            if (
              node.type === "screen" &&
              node.feature === record.feature &&
              uiText.includes(foldText(node.props.slug || node.title))
            ) {
              this.addEdge({
                from: key,
                to: screenKey,
                type: "REFERENCES",
                provenance: "table",
                source: this.source(record.file, row.line),
              });
            }
          }
        }
      }
    }
  }

  // Parse tên external service dạng *Gate trong tài liệu integration/API.
  parseExternalServices(record) {
    if (!/\/(?:integration|test\/api)\//i.test(record.file)) return;

    for (let index = 0; index < record.lines.length; index += 1) {
      for (const match of record.lines[index].matchAll(
        /\b([A-Z][A-Za-z0-9]*(?:Gate))\b/g
      )) {
        const canonical = slugify(match[1]);
        const key = `svc:${canonical}`;

        this.addNode({
          key,
          type: "external_service",
          subtype: null,
          feature: null,
          title: match[1],
          status: null,
          updated: null,
          source: this.source(record.file, index + 1),
          props: {},
        });

        this.addEdge({
          from: record.nodeKey,
          to: key,
          type: "REFERENCES",
          provenance: "heuristic",
          source: this.source(record.file, index + 1),
        });
      }
    }
  }

  // Parse DBML native: chỉ lấy tên table, bỏ qua column/enum/index.
  parseDbDiagram(abs) {
    const file = this.repoPath(abs);

    try {
      const text = fs.readFileSync(abs, "utf8");
      const lines = text.split(/\r?\n/);
      const feature = this.featureFromAbs(abs);

      if (!feature) {
        this.markUnparsed(file, "dbdiagram không có feature context");
        return;
      }

      const tables = [];

      for (let index = 0; index < lines.length; index += 1) {
        const line = lines[index];
        if (!/^\s*Table\b/i.test(line)) continue;
        // DBML chính thức: Table [schema.]name [as Alias] [[settings]] { — lấy BASENAME
        // (review Phase 3: alias/settings/schema-qualified từng bị bỏ hoặc canonical sai).
        const match = line.match(
          /^\s*Table\s+((?:"[^"]+"|'[^']+'|[A-Za-z0-9_]+)(?:\s*\.\s*(?:"[^"]+"|'[^']+'|[A-Za-z0-9_]+))?)\s*(?:as\s+(?:"[^"]+"|'[^']+'|[A-Za-z0-9_]+)\s*)?(?:\[[^\]]*\]\s*)?\{/i
        );
        if (!match) {
          this.addCoverageNote(
            `${file}:${index + 1}: dòng Table DBML không nhận dạng được — bỏ qua`
          );
          this.notePartialParse(file, `dòng Table không nhận dạng (line ${index + 1})`);
          continue;
        }

        // Basename quote-aware: lấy token CUỐI (split "." vỡ với `Table "audit.logs"`).
        const base = match[1].match(/(?:"([^"]+)"|'([^']+)'|([A-Za-z0-9_]+))\s*$/);
        const name = base ? (base[1] || base[2] || base[3]) : stripQuotes(match[1]);
        if (name) tables.push({ name, line: index + 1 });
      }

      const tableNames = uniqueSorted(tables.map((table) => table.name));
      const schemaNode = `${feature}/db`;

      this.addNode({
        key: schemaNode,
        type: "db_schema",
        subtype: null,
        feature,
        title: `${feature} DB schema`,
        status: null,
        updated: null,
        source: this.source(file, tables[0]?.line || 1),
        props: { tables: tableNames },
      });

      for (const table of tables) {
        const canonical = entityCanonical(table.name);
        if (!canonical) continue;

        // Table thường số nhiều, entity thường số ít (review_logs → ReviewLog) —
        // ưu tiên entity node ĐANG TỒN TẠI: nguyên dạng → các biến thể số ít.
        const candidates = [
          canonical,
          canonical.replace(/ies$/i, "y"),
          canonical.replace(/ses$/i, "s"),
          canonical.replace(/s$/i, ""),
        ];
        const resolved =
          candidates.find((name) => name && this.nodes.has(`entity:${feature}/${name}`)) ||
          canonical;

        this.addEdge({
          from: schemaNode,
          to: `entity:${feature}/${resolved}`,
          type: "SAME_AS",
          provenance: "declared",
          source: this.source(file, table.line),
        });
      }

      if (!tableNames.length) {
        this.addCoverageNote(
          `${file}: DBML không có block Table declaration`
        );
        this.notePartialParse(
          file,
          "parseDbDiagram trích được 0 table — format lệch?"
        );
      }

      this.parsedPaths.add(file);
    } catch (error) {
      this.markUnparsed(
        file,
        `parse-error: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  // Parse BPMN IR JSON: process, lane actors và số node/flow.
  parseBpmn(abs) {
    const file = this.repoPath(abs);
    const text = fs.readFileSync(abs, "utf8");
    const lines = text.split(/\r?\n/);

    try {
      const ir = JSON.parse(text);
      const feature = this.featureFromAbs(abs);
      const processNode = file;
      const processLine =
        lines.findIndex((line) => line.includes('"process"')) + 1 || 1;

      this.addNode({
        key: processNode,
        type: "bpmn_process",
        subtype: null,
        feature,
        title: cleanCell(ir.process?.title || ir.process?.id || file),
        status: null,
        updated: null,
        source: this.source(file, processLine),
        props: {
          process_id: ir.process?.id || "",
          lanes: Array.isArray(ir.lanes)
            ? ir.lanes.map((lane) => lane.name || lane.id)
            : [],
          node_count: Array.isArray(ir.nodes) ? ir.nodes.length : 0,
          flow_count: Array.isArray(ir.flows) ? ir.flows.length : 0,
        },
      });

      for (const lane of Array.isArray(ir.lanes) ? ir.lanes : []) {
        const line =
          lines.findIndex(
            (raw) =>
              raw.includes(`"${lane.id}"`) ||
              raw.includes(`"${lane.name}"`)
          ) + 1 || processLine;
        const actor = this.addActor(
          lane.name || lane.id,
          feature,
          this.source(file, line)
        );

        if (actor) {
          this.addEdge({
            from: processNode,
            to: actor,
            type: "REFERENCES",
            provenance: "declared",
            source: this.source(file, line),
            props: { lane_id: lane.id || "" },
          });
        }
      }

      for (let index = 0; index < lines.length; index += 1) {
        for (const ref of extractGlobalIds(lines[index], feature)) {
          this.addEdge({
            from: processNode,
            to: ref,
            type: "REFERENCES",
            provenance: "heuristic",
            source: this.source(file, index + 1),
          });
        }
      }

      this.parsedPaths.add(file);
    } catch (error) {
      this.markUnparsed(
        file,
        `parse-error: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  // Parse BPMN source sidecar: actors, branches và error title heuristics.
  parseBpmnSource(abs) {
    const file = this.repoPath(abs);
    const text = fs.readFileSync(abs, "utf8");
    const lines = text.split(/\r?\n/);

    try {
      const sourceData = JSON.parse(text);
      const feature = this.featureFromAbs(abs);
      const processFile = file.replace(/\.src\.json$/i, ".ir.json");

      if (!this.nodes.has(processFile)) {
        const reason =
          `BPMN source không resolve được process cùng basename: ${processFile}`;
        this.addCoverageNote(`${file}: ${reason}`);
        this.notePartialParse(file, reason);
        this.parsedPaths.add(file);
        return;
      }

      this.addNode({
        key: processFile,
        type: "bpmn_process",
        subtype: null,
        feature,
        title: processFile,
        status: null,
        updated: null,
        source: this.source(file, 1),
        props: {
          branches: Array.isArray(sourceData.branches)
            ? sourceData.branches.map((branch) => cleanCell(branch))
            : [],
        },
      });

      for (const actorValue of Array.isArray(sourceData.actors)
        ? sourceData.actors
        : []) {
        const line =
          lines.findIndex((raw) =>
            raw.includes(JSON.stringify(actorValue))
          ) + 1 || 1;
        const actor = this.addActor(
          actorValue,
          feature,
          this.source(file, line)
        );

        if (actor) {
          this.addEdge({
            from: processFile,
            to: actor,
            type: "REFERENCES",
            provenance: "declared",
            source: this.source(file, line),
          });
        }
      }

      for (const errorText of Array.isArray(sourceData.errors)
        ? sourceData.errors
        : []) {
        const line =
          lines.findIndex((raw) =>
            raw.includes(JSON.stringify(errorText))
          ) + 1 || 1;
        const raw = cleanCell(errorText);

        // Đường chính (canonical /bpmn SKILL bước 3): errors[] chứa E-CODE →
        // resolve ID trực tiếp (cả dạng đầy đủ lẫn rút gọn E-NNN theo feature).
        const errorIds = extractGlobalIds(raw, feature).filter((id) =>
          id.startsWith("E-")
        );
        if (errorIds.length === 1) {
          this.addEdge({
            from: processFile,
            to: errorIds[0],
            type: "RAISES",
            provenance: "declared",
            source: this.source(file, line),
          });
          continue;
        }

        // Fallback: match title. So sánh GIỮ NGUYÊN dấu tiếng Việt (chỉ hạ case
        // + gộp whitespace, NFC) — foldText bỏ dấu sẽ match nhầm "Ma"/"Mã".
        const normalizeTitle = (value) =>
          String(value ?? "")
            .normalize("NFC")
            .toLowerCase()
            .replace(/\s+/g, " ")
            .trim();
        const wanted = normalizeTitle(raw);
        const matches = [...this.nodes.values()]
          .filter(
            (node) =>
              node.type === "error" &&
              node.feature === feature &&
              normalizeTitle(node.title) === wanted
          )
          .sort((a, b) => compareText(a.key, b.key));

        if (matches.length !== 1) {
          const detail = matches.length
            ? `match ${matches.length} error node`
            : "không match error node";
          const reason = `BPMN source error "${raw}" ${detail} theo E-code/title cùng feature`;
          this.addCoverageNote(`${file}:${line}: ${reason}`);
          this.notePartialParse(file, reason);
          continue;
        }

        this.addEdge({
          from: processFile,
          to: matches[0].key,
          type: "RAISES",
          provenance: "heuristic",
          source: this.source(file, line),
        });
      }

      this.parsedPaths.add(file);
    } catch (error) {
      this.markUnparsed(
        file,
        `parse-error: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  // Parse links frontmatter và suy edge lifecycle URD→BRD→PRD→SRS.
  parseFrontmatterLinks(record) {
    const entries = record.frontmatter.entries.links || [];
    const ranks = {
      urd: 1,
      brd: 2,
      prd: 3,
      srs: 4,
    };

    const sourceType = String(record.frontmatter.data.type || "")
      .toLowerCase()
      .split("-")[0];

    for (const entry of entries) {
      const target = this.resolveDocTarget(record.file, entry.value);
      if (!target) continue;

      if (record.nodeKey.startsWith("CR-")) {
        this.addEdge({
          from: record.nodeKey,
          to: target,
          type: "IMPACTS",
          provenance: "declared",
          source: this.source(record.file, entry.line),
        });
        continue;
      }

      const targetRecord = this.findRecord(
        [...this.fileNodeKey.entries()].find(([, key]) => key === target)?.[0] ||
          target
      );
      const targetType = String(targetRecord?.frontmatter.data.type || "")
        .toLowerCase()
        .split("-")[0];

      if (ranks[sourceType] && ranks[targetType] && sourceType !== targetType) {
        const from =
          ranks[sourceType] < ranks[targetType] ? record.nodeKey : target;
        const to =
          ranks[sourceType] < ranks[targetType] ? target : record.nodeKey;

        this.addEdge({
          from,
          to,
          type: "ELABORATES",
          provenance: "declared",
          source: this.source(record.file, entry.line),
        });
      } else {
        this.addEdge({
          from: record.nodeKey,
          to: target,
          type: "REFERENCES",
          provenance: "declared",
          source: this.source(record.file, entry.line),
        });
      }
    }

    const jiraEntries = record.frontmatter.entries.jira_keys || [];
    for (const entry of jiraEntries) {
      const match = cleanCell(entry.value).match(/\b[A-Z][A-Z0-9]+-\d+\b/);
      if (!match) continue;

      const key = `jira:${match[0]}`;
      this.addNode({
        key,
        type: "jira_issue",
        subtype: null,
        feature: record.feature,
        title: match[0],
        status: null,
        updated: null,
        source: this.source(record.file, entry.line),
        props: { jira_key: match[0] },
      });
      this.addEdge({
        from: record.nodeKey,
        to: key,
        type: "SYNCS_TO",
        provenance: "declared",
        source: this.source(record.file, entry.line),
      });
    }
  }

  // Parse sync-state.yaml subset theo artifacts[].mappings.
  parseSyncState(syncAbs) {
    const file = this.repoPath(syncAbs);
    const lines = fs.readFileSync(syncAbs, "utf8").split(/\r?\n/);
    let vaultPath = null;
    let mapping = null;

    try {
      for (let index = 0; index < lines.length; index += 1) {
        const line = lines[index];

        const vaultMatch = line.match(
          /^\s*-\s+vault_path:\s*(.+?)\s*$/
        );
        if (vaultMatch) {
          vaultPath = stripQuotes(vaultMatch[1]);
          mapping = null;
          continue;
        }

        if (!vaultPath) continue;

        if (/^\s{6}jira:\s*$/.test(line)) {
          mapping = "jira";
          continue;
        }
        if (/^\s{6}confluence:\s*$/.test(line)) {
          mapping = "confluence";
          continue;
        }

        const remote = line.match(/^\s{8}remote_id:\s*(.+?)\s*$/);
        if (!remote || !mapping) continue;

        const remoteId = stripQuotes(remote[1]);
        const local = this.resolveFileNode(
          path.posix.normalize(vaultPath)
        );

        if (mapping === "jira") {
          const key = `jira:${remoteId}`;
          this.addNode({
            key,
            type: "jira_issue",
            subtype: null,
            feature: this.nodes.get(local)?.feature || null,
            title: remoteId,
            status: null,
            updated: null,
            source: this.source(file, index + 1),
            props: { jira_key: remoteId },
          });
          this.addEdge({
            from: local,
            to: key,
            type: "SYNCS_TO",
            provenance: "declared",
            source: this.source(file, index + 1),
          });
        } else {
          const key = `confluence:${remoteId}`;
          this.addNode({
            key,
            type: "confluence_page",
            subtype: null,
            feature: this.nodes.get(local)?.feature || null,
            title: `Confluence ${remoteId}`,
            status: null,
            updated: null,
            source: this.source(file, index + 1),
            props: { page_id: remoteId },
          });
          this.addEdge({
            from: local,
            to: key,
            type: "SYNCS_TO",
            provenance: "declared",
            source: this.source(file, index + 1),
          });
        }
      }

      this.parsedPaths.add(file);
    } catch (error) {
      this.markUnparsed(
        file,
        `parse-error: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  // Parse changelog.md (bảng Markdown 5 cột) để enrich authors + last_activity.
  parseActivityLog() {
    const abs = path.join(this.dirAbs, "_shared", "changelog.md");
    if (!fs.existsSync(abs)) return;

    const lines = fs.readFileSync(abs, "utf8").split(/\r?\n/);
    const activity = new Map();

    for (let index = 0; index < lines.length; index += 1) {
      const trimmed = lines[index].trim();
      // Bỏ tiêu đề/blockquote/dòng trống + header bảng + separator.
      if (!trimmed.startsWith("|")) continue;
      if (/^\|[\s:|-]*\|$/.test(trimmed)) continue;

      // Gỡ pipe biên rồi mới split → chỉ số cột khớp thứ tự thật.
      const inner = trimmed.replace(/^\|/, "").replace(/\|$/, "");
      const parts = inner.split("|").map((part) => part.trim());
      if (parts.length < 5) continue;

      const [date, , author, rawFile] = parts;
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) continue; // dòng header

      // Cột File bọc backtick trong bảng → gỡ để ra path thuần.
      const file = rawFile.replace(/^`|`$/g, "").trim();
      const normalizedFile = path.posix.normalize(file);
      const nodeKey = this.resolveFileNode(normalizedFile);
      if (!this.nodes.has(nodeKey)) continue;

      const current = activity.get(nodeKey) || {
        authors: new Set(),
        lastActivity: "",
      };
      if (author) current.authors.add(author);
      if (date > current.lastActivity) current.lastActivity = date;
      activity.set(nodeKey, current);
    }

    for (const [key, value] of activity) {
      const node = this.nodes.get(key);
      node.props.authors = uniqueSorted([
        ...(node.props.authors || []),
        ...value.authors,
      ]);
      if (value.lastActivity) node.props.last_activity = value.lastActivity;
    }
  }

  // Parse staleness.md (bảng Markdown 4 cột: ngày | upstream | downstream |
  // lý do) thành STALE_IMPACTS. Vẫn nhận dạng .log cũ "src -> dst | reason:"
  // để đọc được file di sản chưa migrate.
  parseStalenessLog() {
    const abs = path.join(this.dirAbs, "_shared", "staleness.md");
    if (!fs.existsSync(abs)) return;

    const file = this.repoPath(abs);
    const lines = fs.readFileSync(abs, "utf8").split(/\r?\n/);

    for (let index = 0; index < lines.length; index += 1) {
      const line = lines[index];
      const match =
        // Bảng Markdown: | ngày | `upstream` | `downstream` | lý do |
        line.match(
          /^\s*\|\s*(\d{4}-\d{2}-\d{2})\s*\|\s*(.+?)\s*\|\s*(.+?)\s*\|\s*(.+?)\s*\|\s*$/
        ) ||
        // Di sản .log: ngày | src -> dst | reason: ...
        line.match(
          /^\s*([^|]+?)\s*\|\s*(.+?)\s*->\s*(.+?)\s*\|\s*reason:\s*(.+?)\s*$/
        );
      if (!match) continue;

      const resolve = (value) => {
        // KHÔNG cleanCell cho PATH — nó strip "_" biến docs/_shared → docs/shared
        // (false ✗ dangling-doc-ref). Path chỉ cần trim + bỏ backtick/quote.
        const clean = String(value ?? "").replace(/[`"']/g, "").trim();
        if (GLOBAL_ID_RE.test(clean)) return clean;
        return this.resolveFileNode(path.posix.normalize(clean));
      };

      this.addEdge({
        from: resolve(match[2]),
        to: resolve(match[3]),
        type: "STALE_IMPACTS",
        provenance: "declared",
        source: this.source(file, index + 1),
        props: {
          date: cleanCell(match[1]),
          reason: cleanCell(match[4]),
        },
      });
    }
  }

  // Research nhắc feature slug trong body → INFORMS feature.
  parseResearchInforms(record) {
    if (record.shape !== "research") return;

    const start = Math.max(0, record.frontmatter.bodyLine - 1);
    const featureSlugs = [...this.nodes.values()]
      .filter((node) => node.type === "feature")
      .map((node) => node.key.slice("feature:".length))
      .filter((slug) => slug.length >= 4)
      .sort(compareText);

    for (const slug of featureSlugs) {
      const escaped = slug.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      // Slug 1-từ (không có "-") là từ tiếng Anh thường → false-positive ngữ nghĩa
      // ("the control group" match feature:group — review Phase 3). Chỉ nhận mention
      // CÓ CẤU TRÚC: `slug` backtick, path docs/slug/, "feature slug", wikilink.
      // Slug ghép có "-" giữ bare word-boundary (đủ đặc trưng).
      // KHÔNG có nhánh wikilink riêng: \b match cả "control-group" (review chốt) —
      // wikilink theo convention repo là full-path nên nhánh docs/{slug}/ đã phủ.
      const pattern = slug.includes("-")
        ? new RegExp(`(?:^|[^a-z0-9-])${escaped}(?=$|[^a-z0-9-])`, "i")
        : new RegExp(
            "(`" + escaped + "`)" +
            "|(docs/" + escaped + "/)" +
            "|(feature[:\\s]+" + escaped + "(?=$|[^a-z0-9-]))",
            "i"
          );

      for (let index = start; index < record.lines.length; index += 1) {
        if (!pattern.test(record.lines[index])) continue;

        this.addEdge({
          from: record.nodeKey,
          to: `feature:${slug}`,
          type: "INFORMS",
          provenance: "heuristic",
          source: this.source(record.file, index + 1),
        });
        break;
      }
    }
  }

  // Parse bare ID và wikilink trong prose thành REFERENCES heuristic.
  parseHeuristicReferences(record) {
    const start = Math.max(0, record.frontmatter.bodyLine - 1);

    for (let index = start; index < record.lines.length; index += 1) {
      const line = record.lines[index];
      const source = this.source(record.file, index + 1);

      for (const ref of extractGlobalIds(line, record.feature)) {
        this.addEdge({
          from: record.nodeKey,
          to: ref,
          type: "REFERENCES",
          provenance: "heuristic",
          source,
        });
      }

      for (const link of [
        ...extractWikiLinks(line),
        ...extractMarkdownLinks(line),
      ]) {
        const target = this.resolveDocTarget(record.file, link.target);
        if (!target || target === record.nodeKey) continue;

        this.addEdge({
          from: record.nodeKey,
          to: target,
          type: "REFERENCES",
          provenance: "heuristic",
          source,
        });
      }
    }

    if (/\/_product\/prd\.md$/i.test(record.file)) {
      for (let index = start; index < record.lines.length; index += 1) {
        for (const match of record.lines[index].matchAll(/`([a-z0-9-]+)`/g)) {
          const key = `feature:${match[1]}`;
          if (!this.nodes.has(key)) continue;

          this.addEdge({
            from: record.nodeKey,
            to: key,
            type: "REFERENCES",
            provenance: "heuristic",
            source: this.source(record.file, index + 1),
          });
        }
      }
    }
  }

  addStatusInheritance() {
    for (const record of this.records) {
      if (
        record.feature &&
        /\/srs\/(?:[^/]+-)?(?:flows|states|erd|userflow)\.md$/i.test(record.file)
      ) {
        const spec = this.findSpec(record.feature);
        if (spec) {
          this.addEdge({
            from: record.nodeKey,
            to: spec.nodeKey,
            type: "INHERITS_STATUS_FROM",
            provenance: "declared",
            source: this.source(record.file, 1),
          });
        }
      }

      if (record.shape === "use_case") {
        const index = this.findIndex(record.feature, "usecase");
        if (index) {
          this.addEdge({
            from: record.nodeKey,
            to: index.nodeKey,
            type: "INHERITS_STATUS_FROM",
            provenance: "declared",
            source: this.source(record.file, 1),
          });
        }
      }

      if (record.shape === "user_story") {
        const index = this.findIndex(record.feature, "story");
        if (index) {
          this.addEdge({
            from: record.nodeKey,
            to: index.nodeKey,
            type: "INHERITS_STATUS_FROM",
            provenance: "declared",
            source: this.source(record.file, 1),
          });
        }
      }
    }
  }

  build(scopeFiles) {
    this.loadBaseFiles(scopeFiles);
    this.parseActorRegistry();

    for (const record of this.records) {
      this.runParser(record, this.parseDefinitionTables);
      this.runParser(record, this.parseOpenQuestions);
    }

    for (const record of this.records) {
      const type = String(record.frontmatter.data.type || "").toLowerCase();

      if (/docs\/_product\/prd\.md$/i.test(record.file)) {
        this.runParser(record, this.parseProductPrd);
      }
      if (/docs\/_product\/roadmap\.md$/i.test(record.file)) {
        this.runParser(record, this.parseRoadmap);
      }
      if (/\/_shared\/definitions\.md$/i.test(record.file)) {
        this.runParser(record, this.parseGlossary);
      }
      if (
        type === "meeting" ||
        /\/meetings\/[^/]+\.md$/i.test(record.file)
      ) {
        this.runParser(record, this.parseMeeting);
      }
      if (
        type === "userguide-index" ||
        /\/userguide\/.*\/index\.md$/i.test(record.file)
      ) {
        this.runParser(record, this.parseUserguideIndex);
      }

      // Path-fallback BẮT BUỘC bên cạnh type: fixtures cũ mang type sai
      // (vd premium-payment index có type use-case/user-story) → nếu chỉ dựa type
      // thì mất TOÀN BỘ tầng edge UC/US của feature mà không dấu vết (finding review).
      // Tên file chấp nhận cả trần (userflow.md) lẫn prefix ({feature}-userflow.md).
      if (
        /srs-userflow/.test(type) ||
        /\/srs\/(?:[^/]+-)?userflow\.md$/i.test(record.file)
      ) {
        this.runParser(record, this.parseUserFlow);
      }
      if (/usecase-index/.test(type) || /-usecase-index\.md$/i.test(record.file)) {
        this.runParser(record, this.parseUseCaseIndex);
      }
      if (
        /userstory-index/.test(type) ||
        /-story-index\.md$/i.test(record.file)
      ) {
        this.runParser(record, this.parseUserStoryIndex);
      }
      if (
        /screen-index/.test(type) ||
        /-wireframe-index\.md$/i.test(record.file)
      ) {
        this.runParser(record, this.parseScreenIndex);
      }
      if (
        /wireframe-html-index/.test(type) ||
        /-wireframe-html-index\.md$/i.test(record.file)
      ) {
        this.runParser(record, this.parseWireframeHtmlIndex);
      }
      if (
        /srs-erd/.test(type) ||
        /\/srs\/(?:[^/]+-)?erd\.md$/i.test(record.file)
      ) {
        this.runParser(record, this.parseErd);
      }
    }

    for (const record of this.records) {
      const type = String(record.frontmatter.data.type || "").toLowerCase();

      if (record.shape === "use_case") {
        this.runParser(record, this.parseUseCaseContent);
      }
      if (record.shape === "user_story") {
        this.runParser(record, this.parseUserStoryContent);
      }
      if (record.shape === "screen_content") {
        this.runParser(record, this.parseScreenContent);
      }
      if (
        /srs-flows/.test(type) ||
        /\/srs\/(?:[^/]+-)?flows\.md$/i.test(record.file)
      ) {
        this.runParser(record, this.parseFlows);
      }
      if (
        /srs-states/.test(type) ||
        /\/srs\/(?:[^/]+-)?states\.md$/i.test(record.file)
      ) {
        this.runParser(record, this.parseStates);
      }
      if (
        /test-(?:checklist|cases)-index/.test(type) ||
        /-(?:checklist|testcase)-index\.md$/i.test(record.file)
      ) {
        this.runParser(record, this.parseTestIndex);
      }
      if (record.shape === "test_checklist_content") {
        this.runParser(record, this.parseChecklistContent);
      }
      if (record.shape === "test_case") {
        this.runParser(record, this.parseTestCaseContent);
      }
      if (
        type === "api-checklist" ||
        /\/test\/api\/api-checklist\.md$/i.test(record.file)
      ) {
        this.runParser(record, this.parseApiChecklist);
      }
      if (
        type === "api-tests" ||
        /\/test\/api\/api-tests\.md$/i.test(record.file)
      ) {
        this.runParser(record, this.parseApiTests);
      }
      if (
        type === "e2e-index" ||
        /-e2e-index\.md$/i.test(record.file)
      ) {
        this.runParser(record, this.parseE2eIndex);
      }
      if (/\/integration\/api-map\.md$/i.test(record.file)) {
        this.runParser(record, this.parseApiMap);
      }

      this.runParser(record, this.parseExternalServices);
    }

    for (const item of scopeFiles.filter((entry) => entry.kind === "bpmn")) {
      this.parseBpmn(item.abs);
    }

    for (const item of scopeFiles.filter(
      (entry) => entry.kind === "bpmn-source"
    )) {
      this.parseBpmnSource(item.abs);
    }

    for (const item of scopeFiles.filter((entry) => entry.kind === "dbdiagram")) {
      this.parseDbDiagram(item.abs);
    }

    for (const record of this.records) {
      this.runParser(record, this.parseFrontmatterLinks);
    }

    this.addStatusInheritance();

    const syncAbs = path.join(
      this.rootAbs,
      ".claude",
      "state",
      "atlassian",
      "sync-state.yaml"
    );

    if (fs.existsSync(syncAbs)) {
      this.parseSyncState(syncAbs);
    } else {
      this.optionalNotes.push(
        ".claude/state/atlassian/sync-state.yaml vắng — bỏ qua nguồn Jira/Confluence canonical"
      );
    }

    this.parseActivityLog();
    this.parseStalenessLog();

    for (const record of this.records) {
      if (record.shape === "research") {
        this.runParser(record, this.parseResearchInforms);
      }
      this.runParser(record, this.parseHeuristicReferences);
    }

    return { syncExists: fs.existsSync(syncAbs) };
  }

  unresolvedRefs() {
    const seen = new Set();
    const unresolved = [];

    for (const occurrence of this.refOccurrences) {
      if (this.nodes.has(occurrence.ref)) continue;

      const key = `${occurrence.ref}\u0000${occurrence.source.file}\u0000${occurrence.source.line}`;
      if (seen.has(key)) continue;
      seen.add(key);

      unresolved.push({
        ref: occurrence.ref,
        source: occurrence.source,
      });
    }

    return unresolved.sort(
      (a, b) =>
        compareText(a.ref, b.ref) ||
        compareText(a.source.file, b.source.file) ||
        a.source.line - b.source.line
    );
  }

  uncatalogedContent() {
    return [...this.contentCandidates]
      .filter((file) => !this.catalogedContent.has(file))
      .sort(compareText)
      .map((file) => ({ path: file }));
  }

  graph(scopeFileCount, syncExists) {
    const nodes = [...this.nodes.values()]
      .map((node) => ({
        ...node,
        props: sanitizeProps(node.props),
      }))
      .sort((a, b) => compareText(a.key, b.key));

    const edges = [...this.edges.values()]
      .map((edge) => {
        const result = {
          from: edge.from,
          to: edge.to,
          type: edge.type,
          provenance: edge.provenance,
          source: edge.source,
        };
        if (edge.props && Object.keys(edge.props).length) {
          result.props = sanitizeProps(edge.props);
        }
        return result;
      })
      .sort(
        (a, b) =>
          compareText(a.from, b.from) ||
          compareText(a.type, b.type) ||
          compareText(a.to, b.to)
      );

    const docsTotal = scopeFileCount + (syncExists ? 1 : 0);
    const unparsedDocs = [...this.unparsedDocs]
      .map(([file, reason]) => ({ path: file, reason }))
      .sort((a, b) => compareText(a.path, b.path));

    const coverage = {
      docs_total: docsTotal,
      docs_parsed: this.parsedPaths.size,
      unparsed_docs: unparsedDocs,
      unresolved_refs: this.unresolvedRefs(),
      uncataloged_content: this.uncatalogedContent(),
      partial_parse_docs: [...(this.partialParse || new Map())]
        .map(([file, reason]) => ({ path: file, reason }))
        .sort((a, b) => compareText(a.path, b.path)),
    };

    if (shortFormDrops.length) {
      this.addCoverageNote(
        `${shortFormDrops.length} short-form ID bị bỏ qua vì doc không có feature context: ${uniqueSorted(shortFormDrops).slice(0, 8).join(", ")}`
      );
      shortFormDrops.length = 0;
    }

    const notes = uniqueSorted([
      ...this.coverageNotes,
      ...this.optionalNotes,
    ]);
    if (notes.length) coverage.notes = notes;

    return {
      meta: {
        schema_version: SCHEMA_VERSION,
        extractor_version: EXTRACTOR_VERSION,
        generated_at: this.options.noTimestamp
          ? "1970-01-01T00:00:00.000Z"
          : new Date().toISOString(),
        root: this.dirRel,
        node_count: nodes.length,
        edge_count: edges.length,
        coverage,
      },
      nodes,
      edges,
    };
  }

  findings(graph) {
    const errors = [];
    const warnings = [];

    for (const unresolved of graph.meta.coverage.unresolved_refs) {
      errors.push({
        symbol: "✗",
        type: "dangling-ref",
        detail: `ID ${unresolved.ref} được tham chiếu nhưng không có node định nghĩa`,
        source: `${unresolved.source.file}:${unresolved.source.line}`,
      });
    }

    for (const item of graph.meta.coverage.uncataloged_content) {
      errors.push({
        symbol: "✗",
        type: "uncataloged-content",
        detail: `${item.path} không được index nào catalog`,
        source: `${item.path}:1`,
      });
    }

    // Edge trỏ tới key dạng path KHÔNG có node (wikilink/md-link gãy) — trước đây vô hình
    // với cả unresolved_refs lẫn verify (finding review 2026-07-15: 77 edge như vậy).
    // Path .md không tồn tại trên disk = link gãy thật (✗); tồn tại nhưng ngoài scope ingest
    // hoặc không phải .md (html/svg/log) = ⚠.
    const seenDanglingDoc = new Set();
    for (const edge of this.edges.values()) {
      // Soi CẢ 2 đầu — edge.from cũng có thể là node ma (vd ACL từ file đổi tên).
      for (const target of [edge.to, edge.from]) {
      if (this.nodes.has(target)) continue;
      if (GLOBAL_ID_RE.test(target)) continue; // đã nằm ở unresolved_refs
      if (seenDanglingDoc.has(target)) continue;
      if (!target.includes("/") || target.includes(":")) continue; // không phải key dạng path
      seenDanglingDoc.add(target);

      const onDisk = fs.existsSync(path.join(this.rootAbs, target.split("#")[0]));
      const isMd = /\.md(?:#|$)/i.test(target);
      const entry = {
        symbol: !onDisk && isMd ? "✗" : "⚠",
        type: "dangling-doc-ref",
        detail: `edge trỏ tới '${target}' không có node${onDisk ? " (file tồn tại nhưng ngoài scope ingest)" : " (path không tồn tại trên disk)"}`,
        source: `${edge.source.file}:${edge.source.line}`,
      };
      if (!onDisk && isMd) errors.push(entry);
      else warnings.push(entry);
      }
    }

    // Edge trỏ tới KEY có prefix (entity:/screen:/flow:/state:...) không có node —
    // trước đây vô hình (check trên bỏ qua key chứa ":"). Vd SAME_AS dbdiagram →
    // entity không tồn tại. ⚠ warning (có thể là entity chưa vẽ ERD, không hẳn lỗi).
    const seenDanglingKey = new Set();
    for (const edge of this.edges.values()) {
      const target = edge.to;
      if (this.nodes.has(target)) continue;
      if (!/^(entity|screen|flow|state|actor|svc|api|jira|feature):/.test(target)) continue;
      if (seenDanglingKey.has(target)) continue;
      seenDanglingKey.add(target);
      warnings.push({
        symbol: "⚠",
        type: "dangling-key-ref",
        detail: `edge trỏ tới key '${target}' không có node định nghĩa`,
        source: `${edge.source.file}:${edge.source.line}`,
      });
    }

    for (const [errorId, owners] of [...this.errorOwners].sort(([a], [b]) =>
      compareText(a, b)
    )) {
      if (owners.size <= 1) continue;

      const ownerList = [...owners].sort(compareText);
      const firstEdge = [...this.edges.values()].find(
        (edge) =>
          edge.type === "RAISES" &&
          edge.to === errorId &&
          ownerList.includes(edge.from) &&
          edge.provenance === "table"
      );

      // ⚠ warning, KHÔNG ✗: E dùng chung nhiều UC là hợp lệ trong vault này
      // (vd E-authentication-002 áp cho signup + reset + create-password theo BR-002).
      // 🔶 arbiter 2026-07-15: gpt đánh giá check đúng nghĩa, Fable chứng minh premise
      // sai bằng dữ liệu thật → hạ mức để verify không exit 1 oan trên docs đúng.
      warnings.push({
        symbol: "⚠",
        type: "error-double-book",
        detail: `${errorId} được khai báo ở cột Errors của nhiều UC: ${ownerList.join(", ")} — kiểm tra có chủ đích không`,
        source: firstEdge
          ? `${firstEdge.source.file}:${firstEdge.source.line}`
          : "unknown:1",
      });
    }

    for (const item of graph.meta.coverage.unparsed_docs) {
      warnings.push({
        symbol: "⚠",
        type: "unparsed-doc",
        detail: item.reason,
        source: `${item.path}:1`,
      });
    }

    return { errors, warnings };
  }
}

function escapeTable(value) {
  return String(value ?? "")
    .replace(/\|/g, "\\|")
    .replace(/\r?\n/g, " ");
}

function printFindings(findings, includeWarnings = true) {
  const rows = [
    ...findings.errors,
    ...(includeWarnings ? findings.warnings : []),
  ];

  if (!rows.length) return;

  process.stdout.write(
    [
      "| Mức | Loại | Chi tiết | File:line |",
      "|---|---|---|---|",
      ...rows.map(
        (row) =>
          `| ${row.symbol} | ${escapeTable(row.type)} | ${escapeTable(
            row.detail
          )} | ${escapeTable(row.source)} |`
      ),
      "",
    ].join("\n")
  );
}

function writeGraph(outAbs, graph) {
  fs.mkdirSync(path.dirname(outAbs), { recursive: true });
  const temp = `${outAbs}.tmp-${process.pid}`;

  try {
    fs.writeFileSync(temp, `${JSON.stringify(graph, null, 2)}\n`, "utf8");
    fs.renameSync(temp, outAbs);
  } catch (error) {
    try {
      if (fs.existsSync(temp)) fs.unlinkSync(temp);
    } catch {
      // Bỏ qua lỗi cleanup; lỗi ghi chính sẽ được ném tiếp.
    }
    throw error;
  }

  refreshViewerIfExists(outAbs);
}

// Viewer HTML là ảnh chụp của graph — nếu đã từng được sinh thì giữ nó TƯƠI theo build
// (build chạy tự động qua hook + lazy rebuild → viewer cũng tự cập nhật, BA khỏi nhớ lệnh).
// Viewer output deterministic (không nhúng giờ sinh) nên regen không gây churn git.
// Fail regen KHÔNG làm fail build (viewer là tiện ích phụ) — chỉ cảnh báo.
function refreshViewerIfExists(graphAbs) {
  const viewerHtml = path.join(path.dirname(graphAbs), "kg-viewer.html");
  if (!fs.existsSync(viewerHtml)) return;
  const viewerScript = path.join(
    path.dirname(fileURLToPath(import.meta.url)),
    "kg-viewer.mjs"
  );
  if (!fs.existsSync(viewerScript)) return;
  try {
    execFileSync(process.execPath, [viewerScript, "--graph", graphAbs, "--out", viewerHtml], {
      stdio: ["ignore", "ignore", "pipe"],
    });
  } catch (error) {
    console.error(`⚠ kg-viewer.html không regen được: ${error.message} — chạy tay: node kg-viewer.mjs`);
  }
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const rootAbs = process.cwd();
  const dirAbs = path.resolve(rootAbs, options.dir);
  const outAbs = path.resolve(rootAbs, options.out);

  if (!fs.existsSync(dirAbs)) {
    throw new Error(`Không tìm thấy thư mục nguồn: ${options.dir}`);
  }
  if (!fs.statSync(dirAbs).isDirectory()) {
    throw new Error(`--dir không phải thư mục: ${options.dir}`);
  }

  const scopeFiles = walkScope(dirAbs);
  const builder = new GraphBuilder(options);
  const { syncExists } = builder.build(scopeFiles);
  const graph = builder.graph(scopeFiles.length, syncExists);

  writeGraph(outAbs, graph);

  const findings = builder.findings(graph);
  const verifyFailed =
    findings.errors.length > 0 ||
    (options.strict && findings.warnings.length > 0);

  if (!options.quiet) {
    process.stdout.write(
      `KG build: ${graph.meta.node_count} nodes, ${graph.meta.edge_count} edges, ` +
        `${graph.meta.coverage.docs_parsed}/${graph.meta.coverage.docs_total} docs parsed, ` +
        `${graph.meta.coverage.unresolved_refs.length} unresolved refs → ${options.out}\n`
    );
  }

  if (options.verify) {
    if (
      !options.quiet ||
      findings.errors.length > 0 ||
      (options.strict && findings.warnings.length > 0)
    ) {
      printFindings(findings, !options.quiet || options.strict);
    }

    if (verifyFailed) process.exitCode = 1;
  }
}

try {
  main();
} catch (error) {
  process.stderr.write(
    `KG-ERROR: ${
      error instanceof Error ? error.message : String(error)
    }\n`
  );
  process.exitCode = 2;
}
