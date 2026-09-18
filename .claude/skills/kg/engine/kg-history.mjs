#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";

const SCHEMA_VERSION = 2;

function compareText(a, b) {
  return a < b ? -1 : a > b ? 1 : 0;
}

function toPosix(value) {
  return value.replaceAll("\\", "/");
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

function parseArgs(argv) {
  const result = {
    dir: "docs",
    graph: "docs/_shared/kg/graph.json",
    out: "docs/_shared/kg/graph-history.json",
    noTimestamp: false,
    quiet: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];

    if (token === "--dir" || token === "--graph" || token === "--out") {
      const value = argv[index + 1];
      if (!value || value.startsWith("--")) {
        throw new Error(`Thiếu giá trị cho ${token}`);
      }

      if (token === "--dir") result.dir = value;
      else if (token === "--graph") result.graph = value;
      else result.out = value;

      index += 1;
      continue;
    }

    if (token === "--no-timestamp") result.noTimestamp = true;
    else if (token === "--quiet") result.quiet = true;
    else throw new Error(`Flag không hỗ trợ: ${token}`);
  }

  return result;
}

function readGraphNodeKeys(graphAbs, graphPath) {
  if (!fs.existsSync(graphAbs)) {
    throw new Error(`Không tìm thấy graph bắt buộc: ${graphPath}`);
  }

  let graph;
  try {
    graph = JSON.parse(fs.readFileSync(graphAbs, "utf8"));
  } catch (error) {
    throw new Error(
      `Không đọc được graph JSON ${graphPath}: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }

  if (!graph || !Array.isArray(graph.nodes)) {
    throw new Error(`Graph không hợp lệ: ${graphPath} thiếu mảng nodes`);
  }

  const nodeKeys = new Set();
  const reqKeys = new Set();
  const requirementSourceFile = new Map(); // reqId -> source.file (cho T3 git history)
  const requirementIdPattern =
    /^(?:FR|NFR|BR|E|BO|CAP|CHK)-[a-z][a-z0-9-]*-\d{1,4}$/i;

  for (let index = 0; index < graph.nodes.length; index += 1) {
    const node = graph.nodes[index];
    if (!node || typeof node.key !== "string" || node.key === "") {
      throw new Error(
        `Graph không hợp lệ: ${graphPath} có node thiếu key tại index ${index}`
      );
    }

    // Add cả key lẫn source.file: doc-node key là path, nhưng node ID
    // (FR-.../CR-...) mang path thật ở source.file → cross-ref khớp cả
    // hai dạng, giảm dangling giả.
    const normalizedKey = path.posix.normalize(toPosix(node.key));
    nodeKeys.add(normalizedKey);

    if (node.source && typeof node.source.file === "string") {
      nodeKeys.add(path.posix.normalize(toPosix(node.source.file)));
    }

    // E/BO/CAP/CHK có thể dùng node type riêng thay vì "requirement", nên
    // nhận diện requirement-like key bằng canonical ID thay vì chỉ node.type.
    if (requirementIdPattern.test(node.key)) {
      reqKeys.add(node.key);
      if (node.source && typeof node.source.file === "string") {
        requirementSourceFile.set(
          node.key,
          path.posix.normalize(toPosix(node.source.file))
        );
      }
    }
  }

  return {
    nodeKeys,
    reqKeys,
    requirementSourceFile,
  };
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

function extractGlobalIds(text, feature) {
  const result = [];
  const source = String(text ?? "");
  const regex =
    /\b(FR|NFR|BR|E|BO|CAP|CHK)-(?:(?:([a-z][a-z0-9-]*?)-)?(\d{1,4}))((?:\s*(?:,|\/|\.\.)\s*\d{1,4})*)/gi;

  for (const match of source.matchAll(regex)) {
    const prefix = match[1].toUpperCase();
    const resolvedFeature = (match[2] || feature || "").toLowerCase();

    // CR block không có feature context được xử lý ở parseCRRecords và ghi
    // coverage note. Không tạo canonical ID thiếu feature.
    if (!resolvedFeature) continue;

    let previous = Number(match[3]);
    result.push(canonicalGlobalId(prefix, resolvedFeature, match[3]));

    const tail = match[4] || "";
    // (?!\.?\d): chặn số thập phân/số mục prose ("xem FR-004, 5.3")
    // nở thành ID ma.
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

  return uniqueSorted(result) || [];
}

function readFrontmatterScalar(text, field) {
  const frontmatter = String(text).match(
    /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/
  );
  if (!frontmatter) return "";

  const escapedField = field.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = frontmatter[1].match(
    new RegExp(`^${escapedField}:\\s*(.*?)\\s*$`, "mi")
  );

  return match ? stripQuotes(match[1]) : "";
}

function extractCRTitle(text, crId) {
  const heading = String(text).match(/^#\s+(.+?)\s*$/m);

  if (heading) {
    let title = heading[1].trim();

    if (title.toUpperCase().startsWith(crId)) {
      title = title.slice(crId.length).replace(/^\s*(?::|—|–|-)\s*/, "");
    }

    if (title !== "") return title;
  }

  return readFrontmatterScalar(text, "title") || crId;
}

function featureFromFullId(text) {
  const match = String(text).match(
    /\b(?:FR|NFR|BR|E|BO|CAP|CHK)-([a-z][a-z0-9-]*?)-\d{1,4}\b/i
  );

  return match ? match[1].toLowerCase() : "";
}

function truncatePreview(value, limit = 500) {
  const text = String(value ?? "");
  if (text.length <= limit) return text;

  return `${text.slice(0, Math.max(0, limit - 3))}...`;
}

function collectBlockquotes(section) {
  const lines = String(section ?? "").split(/\r?\n/);
  const quotes = [];

  for (const line of lines) {
    const match = line.match(/^\s*>\s?(.*)$/);
    if (match) quotes.push(match[1].trimEnd());
  }

  return truncatePreview(quotes.join("\n"));
}

function extractBeforeAfterPreviews(blockText) {
  const source = String(blockText ?? "");
  const beforeLabel = /(?:\*\*)?Before(?:\*\*)?:/i.exec(source);
  const afterLabel = /(?:\*\*)?After(?:\*\*)?:/i.exec(source);

  if (!beforeLabel && !afterLabel) {
    return {
      before: "",
      after: "",
      hasPair: false,
    };
  }

  let beforeSection = "";
  if (beforeLabel) {
    const beforeStart = beforeLabel.index + beforeLabel[0].length;
    const beforeEnd =
      afterLabel && afterLabel.index > beforeLabel.index
        ? afterLabel.index
        : source.length;
    beforeSection = source.slice(beforeStart, beforeEnd);
  }

  let afterSection = "";
  if (afterLabel) {
    const afterStart = afterLabel.index + afterLabel[0].length;
    afterSection = source.slice(afterStart);
    const nextHeading = /^#{3,4}\s+/m.exec(afterSection);
    if (nextHeading) afterSection = afterSection.slice(0, nextHeading.index);
  }

  return {
    before: collectBlockquotes(beforeSection),
    after: collectBlockquotes(afterSection),
    hasPair: true,
  };
}

function findLevelThreeHeadingsOutsideFences(text) {
  const source = String(text ?? "");
  const headings = [];
  let inFence = false;

  for (const lineMatch of source.matchAll(/^.*$/gm)) {
    const line = lineMatch[0].replace(/\r$/, "");

    if (/^\s*```/.test(line)) {
      inFence = !inFence;
      continue;
    }

    if (inFence) continue;

    const heading = /^###\s+(.+?)\s*$/.exec(line);
    if (heading) {
      headings.push({
        index: lineMatch.index,
        heading: heading[1].trim(),
      });
    }
  }

  return headings;
}

function parseCRRecords(dirAbs, nodeKeys, reqKeys) {
  const crDirAbs = path.join(dirAbs, "cr");
  const crNodes = [];
  const edgeMap = new Map();
  const danglingMap = new Map();
  const skippedCR = [];
  const notes = [];

  if (!fs.existsSync(crDirAbs)) {
    notes.push(
      `Không tìm thấy ${toPosix(
        path.relative(process.cwd(), crDirAbs)
      )}; bỏ qua nguồn CR.`
    );

    return {
      crNodes,
      amendsEdges: [],
      coverage: {
        cr_records_total: 0,
        cr_records_parsed: 0,
        dangling_amends: [],
        skipped_cr: skippedCR,
        notes,
      },
    };
  }

  let entries;
  try {
    entries = fs.readdirSync(crDirAbs, {
      withFileTypes: true,
    });
  } catch (error) {
    throw new Error(
      `Không đọc được thư mục CR ${toPosix(
        path.relative(process.cwd(), crDirAbs)
      )}: ${error instanceof Error ? error.message : String(error)}`
    );
  }

  const files = entries
    .filter(
      (entry) =>
        entry.isFile() &&
        /^CR-\d{8}-\d{3}\.md$/i.test(entry.name)
    )
    .map((entry) => entry.name)
    .sort(compareText);

  for (const fileName of files) {
    const fileAbs = path.join(crDirAbs, fileName);
    const file = path.posix.normalize(
      toPosix(path.relative(process.cwd(), fileAbs))
    );
    const crId = path.basename(fileName, path.extname(fileName)).toUpperCase();

    let text;
    try {
      text = fs.readFileSync(fileAbs, "utf8");
    } catch (error) {
      throw new Error(
        `Không đọc được CR ${file}: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }

    const appliedHeading =
      /^##\s+Applied Changes(?:\s*\(([^)\r\n]+)\))?[^\r\n]*$/im.exec(text);

    if (!appliedHeading) {
      skippedCR.push({
        cr_id: crId,
        file,
        reason: "missing-applied-changes",
      });
      continue;
    }

    const sectionStart = appliedHeading.index + appliedHeading[0].length;
    const remaining = text.slice(sectionStart);
    const nextLevelTwo = /^##\s+/m.exec(remaining);
    const appliedBody = nextLevelTwo
      ? remaining.slice(0, nextLevelTwo.index)
      : remaining;

    const date =
      String(appliedHeading[1] ?? "").trim() ||
      readFrontmatterScalar(text, "updated");
    const title = extractCRTitle(text, crId);

    if (!nodeKeys.has(crId)) {
      crNodes.push({
        key: crId,
        type: "change_request",
        date,
        title,
        file,
      });
      nodeKeys.add(crId);
    }

    const blockMatches = findLevelThreeHeadingsOutsideFences(appliedBody);

    for (let index = 0; index < blockMatches.length; index += 1) {
      const blockMatch = blockMatches[index];
      const nextBlock = blockMatches[index + 1];
      const blockEnd = nextBlock ? nextBlock.index : appliedBody.length;
      const heading = blockMatch.heading;
      const blockText = appliedBody.slice(blockMatch.index, blockEnd).trim();

      const pathFeature = heading.match(/\bdocs\/([a-z0-9-_]+)\//i);
      const feature = pathFeature
        ? pathFeature[1].toLowerCase()
        : featureFromFullId(blockText);

      if (!feature) {
        notes.push(
          `${file}: bỏ block "### ${heading}" vì không xác định được feature.`
        );
        continue;
      }

      const previews = extractBeforeAfterPreviews(blockText);
      const isRequirementId = (id) =>
        /^(?:FR|NFR|BR|E|BO|CAP|CHK)-/i.test(id);
      const allIds = extractGlobalIds(blockText, feature).filter(
        isRequirementId
      );
      const editedIds = new Set(
        extractGlobalIds(
          `${previews.before}\n${previews.after}`,
          feature
        ).filter(isRequirementId)
      );

      for (const requirementId of allIds) {
        const dedupKey = `${crId}\u0000${requirementId}`;
        const existing = edgeMap.get(dedupKey);
        const amendKind = editedIds.has(requirementId)
          ? "edited"
          : "mentioned";

        if (!existing) {
          edgeMap.set(dedupKey, {
            edge: {
              from: crId,
              to: requirementId,
              type: "AMENDS",
              amend_kind: amendKind,
              before_preview: amendKind === "edited" ? previews.before : "",
              after_preview: amendKind === "edited" ? previews.after : "",
              is_preview: true,
              provenance: "cr-record",
              source: {
                files: [file],
              },
            },
          });
        } else {
          if (!existing.edge.source.files.includes(file)) {
            existing.edge.source.files.push(file);
            existing.edge.source.files.sort(compareText);
          }

          if (
            existing.edge.amend_kind === "mentioned" &&
            amendKind === "edited"
          ) {
            existing.edge.amend_kind = "edited";
            existing.edge.before_preview = previews.before;
            existing.edge.after_preview = previews.after;
          }
        }

        if (!reqKeys.has(requirementId)) {
          const danglingKey = `${crId}\u0000${requirementId}`;

          if (!danglingMap.has(danglingKey)) {
            danglingMap.set(danglingKey, {
              cr_id: crId,
              requirement_id: requirementId,
              file,
              reason: "requirement không có trong graph.json",
            });
          }
        }
      }
    }
  }

  crNodes.sort((a, b) => compareText(a.key, b.key));

  const amendsEdges = [...edgeMap.values()]
    .map((entry) => entry.edge)
    .sort(
      (a, b) =>
        compareText(a.from, b.from) ||
        compareText(a.type, b.type) ||
        compareText(a.to, b.to)
    );

  const danglingAmends = [...danglingMap.values()].sort(
    (a, b) =>
      compareText(a.cr_id, b.cr_id) ||
      compareText(a.requirement_id, b.requirement_id)
  );

  skippedCR.sort(
    (a, b) =>
      compareText(a.cr_id, b.cr_id) ||
      compareText(a.file, b.file)
  );
  notes.sort(compareText);

  return {
    crNodes,
    amendsEdges,
    coverage: {
      cr_records_total: files.length,
      cr_records_parsed: crNodes.length,
      dangling_amends: danglingAmends,
      skipped_cr: skippedCR,
      notes,
    },
  };
}

function readActivityLines(activityAbs) {
  if (!fs.existsSync(activityAbs)) {
    return {
      exists: false,
      lines: [],
    };
  }

  const text = fs.readFileSync(activityAbs, "utf8");
  if (text === "") {
    return {
      exists: true,
      lines: [],
    };
  }

  const lines = text.split(/\r?\n/);

  // Dòng rỗng cuối do trailing newline (có thể >1) không phải activity line mới.
  while (lines.length > 0 && lines.at(-1).trim() === "") lines.pop();

  // changelog.md là BẢNG Markdown: bỏ tiêu đề/blockquote/dòng trống/header bảng +
  // separator, chỉ giữ dòng dữ liệu. Mỗi dòng giữ kèm số dòng THẬT trong file để
  // báo lỗi trỏ đúng chỗ, còn `sequence` của event vẫn đếm liên tục theo sự kiện.
  const rows = [];
  for (let index = 0; index < lines.length; index += 1) {
    const raw = lines[index];
    const trimmed = raw.trim();
    if (trimmed === "") continue;
    if (trimmed.startsWith("#")) continue;
    if (trimmed.startsWith(">")) continue;
    if (!trimmed.startsWith("|")) continue;
    // Separator `|---|---|` và header `| Ngày | Skill | ...`.
    if (/^\|[\s:|-]*\|$/.test(trimmed)) continue;
    if (/^\|\s*Ngày\s*\|/i.test(trimmed)) continue;
    rows.push({ text: stripTableRow(trimmed), lineNumber: index + 1 });
  }

  return {
    exists: true,
    lines: rows,
  };
}

// "| a | b | c |" → "a | b | c" (bỏ pipe biên, giữ nguyên phân cách giữa).
// Backtick quanh path (cột File) được gỡ ở nơi dùng, không gỡ ở đây.
function stripTableRow(row) {
  let out = row;
  if (out.startsWith("|")) out = out.slice(1);
  if (out.endsWith("|")) out = out.slice(0, -1);
  return out;
}

// ── T3: revision + valid-time (git-blob-ref) ────────────────────────────────

// git optional: repo không phải git / lệnh lỗi → trả null, KHÔNG chết build.
function gitAvailable(rootAbs) {
  try {
    execFileSync("git", ["rev-parse", "--is-inside-work-tree"], {
      cwd: rootAbs,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
    return true;
  } catch {
    return false;
  }
}

// Lịch sử commit của 1 file: [{commit, dateISO, order}] — order = chỉ số thứ tự
// thời gian git (log mặc định mới→cũ; ta đảo thành cũ→mới rồi đánh số). order là
// tie-break DUY NHẤT cho commit cùng ngày (giữ đúng thứ tự thời gian, không dựa hash).
function gitFileHistory(rootAbs, file) {
  try {
    const out = execFileSync(
      "git",
      ["log", "--follow", "--format=%H|%aI", "--", file],
      { cwd: rootAbs, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }
    );
    const rows = out
      .split(/\r?\n/)
      .filter(Boolean)
      .map((line) => {
        const [commit, dateISO] = line.split("|");
        return { commit: (commit || "").trim(), dateISO: (dateISO || "").trim() };
      })
      .filter((c) => c.commit);
    // git log là mới→cũ → đảo thành cũ→mới, gán order tăng dần (thứ tự thời gian git).
    rows.reverse();
    return rows.map((c, i) => ({ ...c, order: i }));
  } catch {
    return [];
  }
}

// Nội dung file tại 1 commit (git show commit:file). Lỗi → null.
// commit từ git log (hex hash) + file từ graph.json → tin cậy; vẫn dùng
// --end-of-options phòng path bắt đầu bằng "-" thành git option.
function gitShowFile(rootAbs, commit, file) {
  try {
    return execFileSync("git", ["show", "--end-of-options", `${commit}:${file}`], {
      cwd: rootAbs,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
      maxBuffer: 32 * 1024 * 1024,
    });
  } catch {
    return null;
  }
}

// Trích DÒNG ĐỊNH NGHĨA của requirement-id (review P1.4). Chỉ khớp khi ID đứng ở
// vị trí định nghĩa — đầu cell bảng "| ID |", heading "### ID", hoặc đầu dòng "ID" —
// KHÔNG khớp mention giữa prose ("phụ thuộc FR-005"). Thử cả canonical (FR-feature-001)
// LẪN short-form (FR-001) vì file cũ có thể ghi short-form / padding khác (CAP-01 vs CAP-001).
function extractRequirementLine(content, requirementId) {
  if (content == null) return null;

  // Sinh biến thể ID cần dò: canonical + short-form (bỏ feature) + các padding.
  const m = /^([A-Z]+)-([a-z][a-z0-9-]*)-(\d+)$/i.exec(requirementId);
  const variants = new Set([requirementId]);
  if (m) {
    const [, prefix, feature, num] = m;
    const n = String(Number(num));
    // canonical các padding
    for (const w of [2, 3]) variants.add(`${prefix}-${feature}-${n.padStart(w, "0")}`);
    variants.add(`${prefix}-${feature}-${n}`);
    // short-form (không feature) — file cũ trước khi prefix hóa
    for (const w of [2, 3]) variants.add(`${prefix}-${n.padStart(w, "0")}`);
    variants.add(`${prefix}-${n}`);
  }

  const alts = [...variants]
    .map((v) => v.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("|");
  // ID phải ở đầu cell bảng (sau "|"), heading (sau "#"), hoặc đầu dòng — rồi
  // theo sau là ranh giới không-alnum-không-dash (tránh FR-001 khớp FR-001-old).
  const re = new RegExp(`(?:^|\\|)\\s*#{0,6}\\s*(?:${alts})(?![\\w-])`, "m");
  for (const line of content.split(/\r?\n/)) {
    if (re.test(line)) return line.trim();
  }
  return null;
}

function sha256(value) {
  return `sha256:${crypto.createHash("sha256").update(String(value), "utf8").digest("hex")}`;
}

// Dựng chuỗi revision cho MỖI requirement có mốc thay đổi.
// Nguồn mốc (hợp nhất, theo date tăng dần cũ→mới):
//   - git commit đụng file chứa requirement (xương sống, nếu git available)
//   - AMENDS edited (T2) — mốc CR sửa requirement (fallback khi no-git, và để gắn source_cr)
// git-blob-ref: KHÔNG lưu full nội dung, chỉ commit + file + hash-của-1-dòng (best-effort).
function buildRevisions(rootAbs, requirementSourceFile, amendsEdges, reqKeys) {
  const revNodes = [];
  const revEdges = [];
  const gitNotes = [];
  const hasGit = gitAvailable(rootAbs);

  // Gom AMENDS edited theo requirement: { reqId -> [{cr, date}] }
  const amendsByReq = new Map();
  for (const edge of amendsEdges) {
    if (edge.type !== "AMENDS" || edge.amend_kind !== "edited") continue;
    if (!amendsByReq.has(edge.to)) amendsByReq.set(edge.to, []);
    amendsByReq.get(edge.to).push({ cr: edge.from, date: edge.date || "" });
  }

  // Requirement cần dựng revision: có source.file trong graph.json + (có git history HOẶC có AMENDS edited).
  const requirements = [...reqKeys].filter((id) => requirementSourceFile.has(id)).sort(compareText);

  const gitHistoryCache = new Map();
  const commitContentCache = new Map();

  for (const reqId of requirements) {
    const file = requirementSourceFile.get(reqId);
    const amends = amendsByReq.get(reqId) || [];

    // Mốc từ git commit history của file.
    let commits = [];
    if (hasGit) {
      if (!gitHistoryCache.has(file)) gitHistoryCache.set(file, gitFileHistory(rootAbs, file));
      commits = gitHistoryCache.get(file);
    }

    // Không có mốc nào (no-git + no-amends-edited) → không dựng revision.
    if (!commits.length && !amends.length) continue;

    // Danh sách mốc chuẩn hóa {date, commit|null, source_cr|null}, cũ→mới.
    let marks = [];
    if (commits.length) {
      // git log mới→cũ → đảo thành cũ→mới.
      marks = commits
        .map((c) => ({
          date: (c.dateISO || "").slice(0, 10),
          order: c.order,
          commit: c.commit,
          source_cr: null,
        }))
        .filter((m) => m.date);
      // Gắn source_cr: mỗi CR (AMENDS edited) khớp mark có date GẦN NHẤT ≥ ngày CR
      // (commit áp CR thường cùng ngày hoặc sau ngày CR apply). Gán theo date-match
      // để không lệ thuộc vị trí sau sort/dedup.
      marks.sort((a, b) => a.order - b.order);
    } else {
      marks = amends
        .filter((a) => a.date)
        .map((a, i) => ({ date: a.date, order: i, commit: null, source_cr: a.cr }));
      marks.sort((a, b) => compareText(a.date, b.date) || compareText(a.cr || "", b.cr || ""));
    }
    if (!marks.length) continue;

    // Pass 2: content_hash + present. P0.3: commit TRƯỚC khi requirement tồn tại
    // (git ok nhưng không trích được dòng định nghĩa) KHÔNG sinh revision.
    for (const mark of marks) {
      mark.content_hash = null;
      mark.present = !hasGit || !mark.commit;
      if (hasGit && mark.commit) {
        const cacheKey = `${mark.commit} ${file}`;
        if (!commitContentCache.has(cacheKey)) {
          commitContentCache.set(cacheKey, gitShowFile(rootAbs, mark.commit, file));
        }
        const line = extractRequirementLine(commitContentCache.get(cacheKey), reqId);
        if (line != null) {
          mark.content_hash = sha256(line);
          mark.present = true;
        } else {
          mark.present = false;
        }
      }
    }

    // source_cr date-match KHÔNG-BACKWARD (P1.5): gán vào mark present đầu tiên
    // có date >= ngày CR. CR muộn hơn mọi mark → unmapped (không gán ngược).
    for (const a of amends) {
      if (!a.date) continue;
      const target = marks.find((m) => m.present && m.date >= a.date);
      if (target && !target.source_cr) target.source_cr = a.cr;
    }

    // Pass 3: lọc present + dedup content_hash liền kề (carry-forward source_cr).
    const presentMarks = marks.filter((m) => m.present);
    if (!presentMarks.length) continue;
    const kept = [];
    let dedupPrevHash = null;
    for (const mark of presentMarks) {
      if (mark.content_hash != null && mark.content_hash === dedupPrevHash && kept.length) {
        if (mark.source_cr && !kept[kept.length - 1].source_cr) {
          kept[kept.length - 1].source_cr = mark.source_cr;
        }
        continue;
      }
      kept.push(mark);
      dedupPrevHash = mark.content_hash;
    }

    let prevKey = null;
    for (let i = 0; i < kept.length; i += 1) {
      const mark = kept[i];
      const seq = i + 1;
      const contentHash = mark.content_hash;
      const validTo = i < kept.length - 1 ? kept[i + 1].date : null;
      const key = `rev:${reqId}@${seq}`;
      revNodes.push({
        key,
        type: "revision",
        requirement: reqId,
        valid_from: mark.date || null,
        valid_to: validTo,
        git_commit: mark.commit,
        git_file: file,
        source_cr: mark.source_cr,
        content_hash: contentHash,
        previous_revision: prevKey,
      });
      revEdges.push({
        from: key,
        to: reqId,
        type: "REVISION_OF",
        provenance: "git-history",
        source: { file },
      });
      if (prevKey) {
        revEdges.push({
          from: key,
          to: prevKey,
          type: "SUPERSEDES",
          provenance: "git-history",
          source: { file },
        });
      }
      prevKey = key;
    }
  }

  if (!hasGit) {
    gitNotes.push("git không khả dụng (không phải repo git) — revision chỉ dựng từ AMENDS edited, git_commit/content_hash=null.");
  }

  revNodes.sort((a, b) => compareText(a.requirement, b.requirement) || compareText(a.key, b.key));
  revEdges.sort(
    (a, b) => compareText(a.from, b.from) || compareText(a.type, b.type) || compareText(a.to, b.to)
  );

  return {
    revNodes,
    revEdges,
    coverage: {
      revisions_total: revNodes.length,
      requirements_with_history: new Set(revNodes.map((n) => n.requirement)).size,
      git_available: hasGit,
      git_notes: gitNotes,
    },
  };
}

function buildHistory(options, rootAbs, graphNodeKeys, reqKeys, requirementSourceFile) {
  const dirAbs = path.resolve(rootAbs, options.dir);
  const dirRel = toPosix(path.relative(rootAbs, dirAbs)) || ".";
  const activityAbs = path.join(dirAbs, "_shared", "changelog.md");
  const activityFile =
    toPosix(path.relative(rootAbs, activityAbs)) ||
    `${dirRel}/_shared/changelog.md`;

  const activity = readActivityLines(activityAbs);
  const nodes = [];
  const edges = [];
  const skippedLines = [];
  const danglingTargets = [];
  const notes = [];

  if (!activity.exists) {
    notes.push(`Không tìm thấy ${activityFile}; tạo activity history rỗng.`);
  }

  for (let index = 0; index < activity.lines.length; index += 1) {
    const sequence = index + 1;
    const { text: rawLine, lineNumber } = activity.lines[index];

    // Dòng rỗng lọt giữa file (hiếm) → bỏ qua, không tính skipped.
    if (rawLine.trim() === "") continue;

    const rawFields = rawLine.split("|");
    if (rawFields.length < 5) {
      skippedLines.push({
        line: lineNumber,
        reason: "fewer-than-5-fields",
      });
      continue;
    }

    // Cột đầu phải là ngày ISO — chặn header viết tay khác chuẩn ("| Date | ... |")
    // lọt thành event ma (filter ở readActivityLines chỉ nhận diện header "Ngày").
    if (!/^\d{4}-\d{2}-\d{2}$/.test(rawFields[0].trim())) {
      skippedLines.push({
        line: lineNumber,
        reason: "invalid-date",
      });
      continue;
    }

    // 4 field đầu trim; note = phần còn lại GHÉP NGUYÊN (giữ mọi dấu "|" +
    // space bên trong note), chỉ trim 2 đầu chuỗi note. Tránh biến dạng
    // "a|b" → "a | b".
    const date = rawFields[0].trim();
    const skill = rawFields[1].trim();
    const author = rawFields[2].trim();
    // Cột File bọc backtick trong bảng Markdown → gỡ để ra path thuần.
    const file = rawFields[3].trim().replace(/^`|`$/g, "").trim();
    // Note có thể chứa "\|" (escape của "|" trong cell) → khôi phục về "|".
    const note = rawFields.slice(4).join("|").trim().replace(/\\\|/g, "|");
    const normalizedFile = path.posix.normalize(toPosix(file));
    const eventKey = `event:${sequence}`;

    nodes.push({
      key: eventKey,
      type: "change_event",
      date,
      skill,
      author,
      note,
      file: normalizedFile,
      sequence,
    });

    edges.push({
      from: eventKey,
      to: normalizedFile,
      type: "CHANGED",
      provenance: "activity-log",
      source: {
        file: activityFile,
        line: sequence,
      },
    });

    if (!graphNodeKeys.has(normalizedFile)) {
      danglingTargets.push({
        event_seq: sequence,
        file: normalizedFile,
        reason: "doc không có trong graph.json",
      });
    }
  }

  const historyNodeKeys = new Set(nodes.map((node) => node.key));
  const crResult = parseCRRecords(dirAbs, historyNodeKeys, reqKeys);

  nodes.push(...crResult.crNodes);
  edges.push(...crResult.amendsEdges);
  notes.push(...crResult.coverage.notes);

  // T3: revision + valid-time. amendsEdges cần date của CR (từ change_request node)
  // cho nhánh no-git → gắn date vào 1 bản copy edges để buildRevisions dùng.
  const crDateByKey = new Map(crResult.crNodes.map((n) => [n.key, n.date]));
  const amendsWithDate = crResult.amendsEdges.map((e) => ({
    ...e,
    date: crDateByKey.get(e.from) || "",
  }));
  const revResult = buildRevisions(
    rootAbs,
    requirementSourceFile,
    amendsWithDate,
    reqKeys
  );
  nodes.push(...revResult.revNodes);
  edges.push(...revResult.revEdges);
  notes.push(...revResult.coverage.git_notes);

  nodes.sort((a, b) => {
    const typeOrder = compareText(a.type, b.type);
    if (typeOrder !== 0) return typeOrder;

    if (a.type === "change_event" && b.type === "change_event") {
      return a.sequence - b.sequence;
    }

    return compareText(a.key, b.key);
  });

  edges.sort(
    (a, b) =>
      compareText(a.from, b.from) ||
      compareText(a.type, b.type) ||
      compareText(a.to, b.to)
  );

  notes.sort(compareText);

  return {
    meta: {
      schema_version: SCHEMA_VERSION,
      generated_at: options.noTimestamp
        ? "1970-01-01T00:00:00.000Z"
        : new Date().toISOString(),
      root: dirRel,
      node_count: nodes.length,
      edge_count: edges.length,
      coverage: {
        activity_lines_total: activity.lines.length,
        activity_lines_parsed: nodes.filter(
          (node) => node.type === "change_event"
        ).length,
        skipped_lines: skippedLines,
        dangling_targets: danglingTargets,
        cr_records_total: crResult.coverage.cr_records_total,
        cr_records_parsed: crResult.coverage.cr_records_parsed,
        dangling_amends: crResult.coverage.dangling_amends,
        skipped_cr: crResult.coverage.skipped_cr,
        revisions_total: revResult.coverage.revisions_total,
        requirements_with_history: revResult.coverage.requirements_with_history,
        git_available: revResult.coverage.git_available,
        notes,
      },
    },
    nodes,
    edges,
  };
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
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const rootAbs = process.cwd();
  const graphAbs = path.resolve(rootAbs, options.graph);
  const outAbs = path.resolve(rootAbs, options.out);

  // Chống thảm họa: KHÔNG BAO GIỜ ghi đè graph.json chính (ràng buộc tách sạch).
  if (outAbs === graphAbs) {
    throw new Error(
      `--out (${options.out}) không được trùng graph.json chính (--graph ${options.graph})`
    );
  }

  const graphKeys = readGraphNodeKeys(graphAbs, options.graph);
  const graph = buildHistory(
    options,
    rootAbs,
    graphKeys.nodeKeys,
    graphKeys.reqKeys,
    graphKeys.requirementSourceFile
  );

  writeGraph(outAbs, graph);

  if (!options.quiet) {
    const eventCount = graph.nodes.filter(
      (node) => node.type === "change_event"
    ).length;
    const crCount = graph.nodes.filter(
      (node) => node.type === "change_request"
    ).length;

    const revCount = graph.nodes.filter(
      (node) => node.type === "revision"
    ).length;

    process.stdout.write(
      `KG history: ${eventCount} events, ${crCount} CRs, ${revCount} revisions, ` +
        `${graph.meta.edge_count} edges, ` +
        `${graph.meta.coverage.dangling_targets.length} dangling CHANGED, ` +
        `${graph.meta.coverage.dangling_amends.length} dangling AMENDS ` +
        `(git: ${graph.meta.coverage.git_available ? "có" : "không"}) ` +
        `→ ${options.out}\n`
    );
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
