#!/usr/bin/env node
// hardened v2
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const FIELD_PATTERN = /^\s*\*\*(STT|Category|Sub-Category|Checklist|Ref|Priority|Title|Description|Auto|Preconditions|Step|Action|Expected|Test Data):\*\*\s*(.*)$/i;
const CHK_PATTERN = /\bCHK-[a-z0-9][a-z0-9-]*-\d{3,}\b/gi;
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const QUOTED_CAPTURE = "(?:\"([^\"\\n]+)\"|“([^”\\n]+)”|'([^'\\n]+)'|‘([^’\\n]+)’|«([^»\\n]+)»)";

function parseArgs(argv) {
  const cmd = argv[2];
  const opts = { headed: false };

  for (let i = 3; i < argv.length; i += 1) {
    const arg = argv[i];

    if (arg === '--dir') opts.dir = argv[++i];
    else if (arg === '--feature') opts.feature = argv[++i];
    else if (arg === '--headed') opts.headed = true;
    else if (arg === '--tc') opts.tc = argv[++i];
    else if (arg === '--base') opts.base = argv[++i];
    else if (arg === '--allow-prod') opts.allowProd = true;
    else if (arg === '--confirm-prod') opts.confirmProd = argv[++i];
    else if (arg === '--dry-run') opts.dryRun = true;
    else if (arg === '--retry-failed') opts.retryFailed = true;
  }

  return { cmd, opts };
}

function cleanValue(value) {
  return String(value ?? '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .trim();
}

function appendValue(previous, continuation) {
  const next = String(continuation ?? '').trimEnd();

  if (!previous) return next.trim();
  if (!next) return previous;

  return `${previous}\n${next}`.trim();
}

function normalizeVietnamese(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .toLowerCase();
}

function isDash(value) {
  return /^(?:—|–|-|n\/a|na)$/i.test(cleanValue(value));
}

function hasTBD(value) {
  return /\bTBD\b/i.test(String(value ?? ''));
}

function escapeRegExp(value) {
  return String(value ?? '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function tsString(value) {
  return JSON.stringify(String(value ?? ''));
}

function inlineComment(value) {
  return String(value ?? '')
    .replace(/[\r\n\u2028\u2029]+/g, ' ')
    .replace(/\*\//g, '*∕')
    .trim();
}

function addUniqueReason(reasons, reason) {
  const value = cleanValue(reason);
  if (value && !reasons.includes(value)) reasons.push(value);
}

function addParseError(tc, reason) {
  if (!Array.isArray(tc.parseErrors)) tc.parseErrors = [];
  addUniqueReason(tc.parseErrors, reason);
}

function isValidSlug(value) {
  return SLUG_PATTERN.test(String(value ?? ''));
}

function requireSlug(value, label) {
  const slug = String(value ?? '');

  if (!isValidSlug(slug)) {
    fail(
      `${label} không hợp lệ: chỉ chấp nhận kebab-case chữ thường `
      + `([a-z0-9]+, phân cách bằng dấu "-")`,
    );
  }

  return slug;
}

function splitTestcaseBlocks(md) {
  const source = String(md ?? '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n');

  const lines = source.split('\n');
  const blocks = [];
  let current = [];
  let activeMultiline = false;

  const flush = () => {
    const block = current.join('\n').trim();
    if (block) blocks.push(block);
    current = [];
    activeMultiline = false;
  };

  for (let index = 0; index < lines.length; index += 1) {
    const rawLine = lines[index];

    /*
     * Escape dành cho trường hợp mơ hồ:
     *   \---
     * luôn được hiểu là nội dung literal "---", kể cả ngay trước STT/EOF.
     */
    const escapedDelimiter = rawLine.match(/^(\s*)\\---\s*$/);
    if (escapedDelimiter) {
      current.push(`${escapedDelimiter[1]}---`);
      continue;
    }

    if (/^\s*---\s*$/.test(rawLine)) {
      let nextNonEmpty = '';

      for (let lookahead = index + 1; lookahead < lines.length; lookahead += 1) {
        if (lines[lookahead].trim()) {
          nextNonEmpty = lines[lookahead];
          break;
        }
      }

      const nextField = nextNonEmpty.match(FIELD_PATTERN);
      const nextStartsTestcase = nextField?.[1]?.toLowerCase() === 'stt';
      const atEnd = !nextNonEmpty;

      /*
       * Khi đang ở multiline, "---" là nội dung trừ khi nó rõ ràng mở
       * testcase mới hoặc là delimiter cuối file.
       */
      if (
        !current.length
        || !activeMultiline
        || nextStartsTestcase
        || atEnd
      ) {
        flush();
      } else {
        current.push(rawLine);
      }

      continue;
    }

    const fieldMatch = rawLine.match(FIELD_PATTERN);
    if (fieldMatch) {
      const fieldName = fieldMatch[1].toLowerCase();
      activeMultiline = [
        'description',
        'preconditions',
        'action',
        'expected',
        'test data',
      ].includes(fieldName);
    }

    current.push(rawLine);
  }

  flush();
  return blocks;
}

function parseTestcasesFile(md) {
  const blocks = splitTestcaseBlocks(md);

  const fieldMap = new Map([
    ['stt', 'stt'],
    ['category', 'category'],
    ['sub-category', 'subcategory'],
    ['checklist', 'checklist'],
    ['ref', 'ref'],
    ['priority', 'priority'],
    ['title', 'title'],
    ['description', 'description'],
    ['auto', 'auto'],
    ['preconditions', 'preconditions'],
    ['step', 'step'],
    ['action', 'action'],
    ['expected', 'expected'],
    ['test data', 'testData'],
  ]);

  const multilineFields = new Set([
    'description',
    'preconditions',
    'action',
    'expected',
    'testData',
  ]);

  const stepFields = new Set(['action', 'expected', 'testData']);
  const testcases = [];

  for (const block of blocks) {
    const hasStt = /^\s*\*\*STT:\*\*/im.test(block);
    const hasChecklist = /^\s*\*\*Checklist:\*\*/im.test(block);

    if (!hasStt || !hasChecklist) continue;

    const tc = {
      stt: '',
      category: '',
      subcategory: '',
      checklist: '',
      ref: '',
      priority: '',
      title: '',
      description: '',
      auto: '',
      preconditions: '',
      steps: [],
      chk: null,
      retired: false,
      parseErrors: [],
    };

    const seenTopLevelFields = new Set();
    let activeTarget = null;
    let currentStep = null;
    let currentStepFields = null;

    for (const rawLine of block.split('\n')) {
      const fieldMatch = rawLine.match(FIELD_PATTERN);

      if (fieldMatch) {
        const fieldName = fieldMatch[1].toLowerCase();
        const value = fieldMatch[2] ?? '';
        const mapped = fieldMap.get(fieldName);
        activeTarget = null;

        if (mapped === 'step') {
          currentStep = {
            n: cleanValue(value),
            action: '',
            expected: '',
            testData: '',
          };
          currentStepFields = new Set();
          tc.steps.push(currentStep);
          continue;
        }

        if (stepFields.has(mapped)) {
          if (!currentStep || !currentStepFields) {
            addParseError(
              tc,
              `${fieldMatch[1]} xuất hiện trước Step`,
            );
            continue;
          }

          if (currentStepFields.has(mapped)) {
            addParseError(
              tc,
              `field ${fieldMatch[1]} bị lặp trong step ${currentStep.n || '?'}`,
            );
            continue;
          }

          currentStepFields.add(mapped);
          currentStep[mapped] = cleanValue(value);
          activeTarget = {
            object: currentStep,
            key: mapped,
          };
          continue;
        }

        if (!mapped) continue;

        if (seenTopLevelFields.has(mapped)) {
          addParseError(tc, `field ${fieldMatch[1]} bị lặp`);
          continue;
        }

        seenTopLevelFields.add(mapped);
        tc[mapped] = cleanValue(value);

        if (multilineFields.has(mapped)) {
          activeTarget = {
            object: tc,
            key: mapped,
          };
        }

        continue;
      }

      if (!activeTarget) continue;

      const continuation = rawLine.trim();

      if (!continuation) {
        if (activeTarget.object[activeTarget.key]) {
          activeTarget.object[activeTarget.key]
            = `${activeTarget.object[activeTarget.key]}\n`;
        }
        continue;
      }

      activeTarget.object[activeTarget.key] = appendValue(
        activeTarget.object[activeTarget.key],
        continuation,
      );
    }

    tc.description = cleanValue(tc.description);
    tc.preconditions = cleanValue(tc.preconditions);

    for (const step of tc.steps) {
      step.n = cleanValue(step.n);
      step.action = cleanValue(step.action);
      step.expected = cleanValue(step.expected);
      step.testData = cleanValue(step.testData);
    }

    const checklist = cleanValue(tc.checklist);
    const chkMatches = [...checklist.matchAll(CHK_PATTERN)]
      .map((match) => match[0]);

    if (chkMatches.length === 1) {
      tc.chk = chkMatches[0];
    } else if (chkMatches.length > 1) {
      tc.chk = chkMatches[0];
      addParseError(tc, 'Checklist chứa nhiều CHK-ID');
    }

    tc.retired = Boolean(
      tc.chk
      && new RegExp(
        `${escapeRegExp(tc.chk)}\\s*\\(\\s*retired\\s*\\)`,
        'i',
      ).test(checklist),
    );

    testcases.push(tc);
  }

  const chkGroups = new Map();

  for (const tc of testcases) {
    if (!tc.chk) continue;

    const key = tc.chk.toLowerCase();
    if (!chkGroups.has(key)) chkGroups.set(key, []);
    chkGroups.get(key).push(tc);
  }

  for (const duplicates of chkGroups.values()) {
    if (duplicates.length < 2) continue;

    for (const tc of duplicates) {
      addParseError(tc, `CHK-ID trùng: ${tc.chk}`);
    }
  }

  return testcases;
}

function firstQuotedCapture(match) {
  if (!match) return null;

  for (const capture of match.slice(1)) {
    if (capture?.trim()) return capture.trim();
  }

  return null;
}

function extractQuoted(text) {
  const match = String(text ?? '').match(new RegExp(QUOTED_CAPTURE));
  return firstQuotedCapture(match);
}

function containsKeyword(text, keywords) {
  const group = keywords.map(escapeRegExp).join('|');
  return new RegExp(
    `(?:^|[\\s(])(?:${group})(?=\\s|$|[:(])`,
    'i',
  ).test(String(text ?? ''));
}

function extractExplicitLabel(text, keywords) {
  const source = String(text ?? '');
  const group = keywords.map(escapeRegExp).join('|');

  /*
   * Grammar được chấp nhận:
   *   nút "Đăng nhập"
   *   field "Email"
   *   link "Quên mật khẩu?"
   *   nút có accessible name: "Đăng nhập"
   *
   * Quote ở vị trí khác, ví dụ `"Đăng nhập" nút`, không được dùng.
   */
  const labelAfterRole = source.match(
    new RegExp(
      `(?:^|[\\s(])(?:${group})\\s+`
      + `(?:(?:có|co)\\s+)?`
      + `(?:accessible\\s+name\\s*:\\s*)?`
      + QUOTED_CAPTURE,
      'i',
    ),
  );

  const directLabel = firstQuotedCapture(labelAfterRole);
  if (directLabel) return directLabel;

  if (!containsKeyword(source, keywords)) return null;

  const accessibleName = source.match(
    new RegExp(
      `accessible\\s+name\\s*:\\s*${QUOTED_CAPTURE}`,
      'i',
    ),
  );

  return firstQuotedCapture(accessibleName);
}

function looksLikeSecretLabel(label, action) {
  const combined = normalizeVietnamese(`${label ?? ''} ${action ?? ''}`);

  return /\b(password|passphrase|mat khau|secret|token|api key|otp|pin)\b/i
    .test(combined);
}

function looksLikeSecretLiteral(value) {
  const cleaned = cleanValue(value);
  const normalized = normalizeVietnamese(cleaned);

  return (
    /^\*{3,}$/.test(cleaned)
    || /^\[?\s*(?:secret|redacted|masked)\s*\]?$/i.test(cleaned)
    || /\b(?:secret|redacted|masked)\b/i.test(normalized)
  );
}

// Chuẩn hóa 1 mảnh key ổn định (dùng cho testdata.json): CHK-ID + field label.
function dataKeySlug(s) {
  return String(s || 'value')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'value';
}

// Trả biểu thức đọc data. KHÔNG hard-code literal vào script:
// - value thường → DATA("<key>", <default>): lúc CHẠY override qua fixtures/testdata.json;
//   test-case value chỉ là DEFAULT (data giả-định viết khi chưa có product).
// - ENV:VAR → process.env (secret, không vào testdata.json committed).
// - thiếu/secret-literal → incomplete (không bịa).
function dataToExpression(testData, action, label, tcId, stepId = '') {
  const value = cleanValue(testData);

  if (!value || isDash(value)) {
    return {
      expression: '',
      complete: false,
      reason: `Test Data trống cho field ${JSON.stringify(label)}`,
    };
  }

  const envMatch = value.match(
    /^ENV\s*:\s*([A-Za-z_][A-Za-z0-9_]*)$/,
  );

  if (envMatch) {
    return {
      expression: `process.env[${tsString(envMatch[1])}]`,
      complete: true,
      reason: '',
      envKey: envMatch[1],
    };
  }

  if (
    looksLikeSecretLabel(label, action)
    || looksLikeSecretLiteral(value)
  ) {
    return {
      expression: '',
      complete: false,
      reason:
        `Test Data nhạy cảm phải khai báo dạng ENV: VAR cho field `
        + `${JSON.stringify(label)}; không nhúng secret literal`,
    };
  }

  // Data thường → tách khỏi script: đọc từ testdata.json theo key, default = value test-case.
  // Key gồm STEP để 2 field khác nhau trong cùng TC (vd "Số tiền" ở step 2 và "So tien" ở
  // step 4 — slug trùng) KHÔNG đụng key nhau (nếu bỏ step, chúng ghi đè default của nhau,
  // 2 field lại đọc chung 1 entry testdata.json → sai data thầm lặng).
  const key = stepId
    ? `${dataKeySlug(tcId)}.${dataKeySlug(stepId)}.${dataKeySlug(label)}`
    : `${dataKeySlug(tcId)}.${dataKeySlug(label)}`;
  return {
    expression: `DATA(${tsString(key)}, ${tsString(value)})`,
    complete: true,
    reason: '',
    envKey: '',
    dataKey: key,
    dataDefault: value,
  };
}

function mappingResult({
  code = '',
  complete = true,
  reason = '',
  executable = false,
  assertion = false,
  dataKey = '',
  dataDefault = '',
} = {}) {
  return {
    code,
    complete,
    reason,
    executable,
    assertion,
    dataKey,
    dataDefault,
  };
}

function cleanUrlToken(value) {
  return String(value ?? '')
    .trim()
    .replace(/[)\]};,.]+$/g, '');
}

function extractExplicitUrl(text) {
  const source = String(text ?? '');
  const match = source.match(
    /(?:https?:\/\/[^\s"“”'‘’«»,]+|\/(?!\/)[^\s"“”'‘’«»,]+)/i,
  );

  const token = cleanUrlToken(match?.[0]);
  return token || null;
}

function explicitPathname(url) {
  try {
    if (/^https?:\/\//i.test(url)) {
      return new URL(url).pathname;
    }

    if (url.startsWith('/') && !url.startsWith('//')) {
      return new URL(url, 'http://playwright.local').pathname;
    }
  } catch {
    return null;
  }

  return null;
}

function actionToCode(action, testData = '', tcId = '', stepId = '') {
  const original = cleanValue(action);
  const normalized = normalizeVietnamese(original);

  if (!original || isDash(original)) {
    return mappingResult({
      code: '  // TODO: Action trống — không sinh locator.',
      complete: false,
      reason: 'Action trống',
    });
  }

  if (/\b(?:roi|sau do|and then|then)\b/i.test(normalized)) {
    return mappingResult({
      code:
        `  // TODO: Action ghép nhiều thao tác — tách thành từng Step. `
        + `Action: ${tsString(inlineComment(original))}`,
      complete: false,
      reason: 'Action chứa nhiều thao tác chưa thể map an toàn',
    });
  }

  const gotoSignal = /\b(?:truy cap|mo|vao|navigate|open|go to)\b/i
    .test(normalized);

  if (gotoSignal) {
    const explicitUrl = extractExplicitUrl(original);

    if (explicitUrl) {
      return mappingResult({
        code: `  await page.goto(${tsString(explicitUrl)}); /*@data-step*/`,
        complete: true,
        executable: true,
      });
    }
  }

  const isClick = /\b(?:click|nhan|bam)\b/i.test(normalized);
  const isInput = /\b(?:nhap|dien|fill|type)\b/i.test(normalized);
  const isObservation = /\b(?:quan sat|kiem tra|xac nhan|verify|observe)\b/i
    .test(normalized);

  const hasButton = containsKeyword(original, ['nút', 'button']);
  const hasLink = containsKeyword(original, ['link', 'liên kết']);
  const hasField = containsKeyword(original, ['field', 'trường', 'ô']);

  if (isClick && hasButton) {
    const label = extractExplicitLabel(original, ['nút', 'button']);

    if (!label) {
      return mappingResult({
        code:
          `  // TODO: Click nút chưa có nhãn quoted/accessibility rõ ràng. `
          + `Action: ${tsString(inlineComment(original))}`,
        complete: false,
        reason: 'Click nút thiếu nhãn quoted hoặc accessible name',
      });
    }

    return mappingResult({
      code:
        `  await page.getByRole('button', { name: ${tsString(label)}, `
        + `exact: true }).click();`,
      complete: true,
      executable: true,
    });
  }

  if (isClick && hasLink) {
    const label = extractExplicitLabel(original, ['link', 'liên kết']);

    if (!label) {
      return mappingResult({
        code:
          `  // TODO: Click link chưa có nhãn quoted/accessibility rõ ràng. `
          + `Action: ${tsString(inlineComment(original))}`,
        complete: false,
        reason: 'Click link thiếu nhãn quoted hoặc accessible name',
      });
    }

    return mappingResult({
      code:
        `  await page.getByRole('link', { name: ${tsString(label)}, `
        + `exact: true }).click();`,
      complete: true,
      executable: true,
    });
  }

  if (isClick) {
    return mappingResult({
      code:
        `  // TODO: Click target chưa xác định role + nhãn — không bịa locator. `
        + `Action: ${tsString(inlineComment(original))}`,
      complete: false,
      reason: 'Click target chưa có role và nhãn rõ ràng',
    });
  }

  if (isInput && hasField) {
    const label = extractExplicitLabel(
      original,
      ['field', 'trường', 'ô'],
    );

    if (!label) {
      return mappingResult({
        code:
          `  // TODO: Field nhập chưa có nhãn quoted/accessibility rõ ràng. `
          + `Action: ${tsString(inlineComment(original))}`,
        complete: false,
        reason: 'Field nhập thiếu nhãn quoted hoặc accessible name',
      });
    }

    const data = dataToExpression(testData, original, label, tcId, stepId);

    if (!data.complete) {
      return mappingResult({
        code: `  // TODO: ${inlineComment(data.reason)}.`,
        complete: false,
        reason: data.reason,
      });
    }

    const lines = [];

    if (data.envKey) {
      lines.push(
        `  test.fixme(!process.env[${tsString(data.envKey)}], `
        + `${tsString(`Thiếu ENV: ${data.envKey}`)});`,
      );
    }

    // Marker /*@data-step*/ để `run` phân loại fail: fail ở bước NHẬP DATA/auth = nghi-data 🟡
    // (khác fail ở assertion nghiệp vụ = nghi-app-bug 🔴). Marker nằm trên dòng .fill() nên
    // xuất hiện trong snippet lỗi Playwright — phân loại không phụ thuộc wording lỗi.
    lines.push(
      `  await page.getByLabel(${tsString(label)}, { exact: true })`
      + `.fill(${data.expression}); /*@data-step*/`,
    );

    return mappingResult({
      code: lines.join('\n'),
      complete: true,
      executable: true,
      dataKey: data.dataKey || '',
      dataDefault: data.dataDefault || '',
    });
  }

  if (isInput) {
    return mappingResult({
      code:
        `  // TODO: Input target chưa theo grammar field "X" hoặc `
        + `accessible name: "X". Action: ${tsString(inlineComment(original))}`,
      complete: false,
      reason: 'Input target thiếu grammar field/accessible name rõ ràng',
    });
  }

  if (isObservation) {
    return mappingResult({
      code:
        `  // TODO: Quan sát/kiểm tra không phải executable action. `
        + `Action: ${tsString(inlineComment(original))}`,
      complete: false,
      reason: 'Action chỉ mô tả quan sát, không có thao tác executable',
    });
  }

  return mappingResult({
    code:
      `  // TODO: Chưa map action an toàn — không bịa locator. `
      + `Action: ${tsString(inlineComment(original))}`,
    complete: false,
    reason: 'Action chưa map được an toàn',
  });
}

function expectedToCode(expected) {
  const original = cleanValue(expected);
  const normalized = normalizeVietnamese(original);

  if (!original || isDash(original)) {
    return mappingResult({
      code: '',
      complete: true,
      assertion: false,
    });
  }

  const isNegative = /\b(?:khong hien thi|khong xuat hien|bi an|hidden|not visible|does not appear|is not displayed)\b/i
    .test(normalized);

  const isRedirect = /\b(?:redirect|chuyen huong|tohaveurl|url)\b/i
    .test(normalized);

  if (isRedirect) {
    const explicitUrl = extractExplicitUrl(original);

    if (!explicitUrl) {
      return mappingResult({
        code:
          `  // TODO: Expected redirect chưa nêu URL/route đích rõ ràng. `
          + `Expected: ${tsString(inlineComment(original))}`,
        complete: false,
        reason: 'Expected redirect thiếu URL/route explicit',
      });
    }

    const pathname = explicitPathname(explicitUrl);

    if (!pathname) {
      return mappingResult({
        code:
          `  // TODO: URL redirect không parse được pathname. `
          + `Expected: ${tsString(inlineComment(original))}`,
        complete: false,
        reason: 'URL redirect explicit không hợp lệ',
      });
    }

    const exactPathPattern = `^${escapeRegExp(pathname)}$`;

    return mappingResult({
      code:
        `  await expect(page).toHaveURL(`
        + `(url) => new RegExp(${tsString(exactPathPattern)}).test(url.pathname)`
        + `); /*@assert-step*/`,
      complete: true,
      assertion: true,
    });
  }

  const text = extractQuoted(original);
  const isVisible = /\b(?:hien thi|hien ra|render|xuat hien|visible|appear|display|displayed)\b/i
    .test(normalized);

  if (isNegative && text) {
    return mappingResult({
      code:
        `  await expect(page.getByText(${tsString(text)}, { exact: true }))`
        + `.toBeHidden(); /*@assert-step*/`,
      complete: true,
      assertion: true,
    });
  }

  if (isNegative) {
    return mappingResult({
      code:
        `  // TODO: Expected không hiển thị thiếu text/nhãn quoted. `
        + `Expected: ${tsString(inlineComment(original))}`,
      complete: false,
      reason: 'Expected phủ định thiếu text/nhãn quoted',
    });
  }

  if (isVisible && text) {
    return mappingResult({
      code:
        `  await expect(page.getByText(${tsString(text)}, { exact: true }))`
        + `.toBeVisible(); /*@assert-step*/`,
      complete: true,
      assertion: true,
    });
  }

  if (isVisible) {
    return mappingResult({
      code:
        `  // TODO: Expected hiển thị thiếu text/nhãn quoted. `
        + `Expected: ${tsString(inlineComment(original))}`,
      complete: false,
      reason: 'Expected hiển thị thiếu text/nhãn quoted',
    });
  }

  return mappingResult({
    code:
      `  // TODO: Chưa map assertion an toàn. `
      + `Expected: ${tsString(inlineComment(original))}`,
    complete: false,
    reason: 'Expected chưa map được thành assertion an toàn',
  });
}

function analyzeTestcase(tc) {
  const reasons = [];
  const stepMappings = [];
  const dataEntries = [];
  let hasAssertion = false;

  if (!tc || typeof tc !== 'object') {
    return {
      ready: false,
      reason: 'test case không hợp lệ',
      reasons: ['test case không hợp lệ'],
      stepMappings,
      hasAssertion: false,
    };
  }

  for (const parseError of tc.parseErrors || []) {
    addUniqueReason(reasons, parseError);
  }

  if (!tc.chk) {
    addUniqueReason(
      reasons,
      'thiếu CHK-ID — chạy /test-cases update để ổn định trace',
    );
  }

  if (cleanValue(tc.auto).toLowerCase() !== 'yes') {
    addUniqueReason(reasons, 'Auto không phải Yes (manual/chưa-ready)');
  }

  if (tc.retired) {
    addUniqueReason(reasons, 'retired');
  }

  if (hasTBD(tc.preconditions)) {
    addUniqueReason(reasons, 'Preconditions TBD (not-ready)');
  } else if (tc.preconditions && !isDash(tc.preconditions)) {
    // Preconditions có state (kể cả `(dựng: ...)`) = setup-required → KHÔNG auto-run
    // (tránh FAIL giả vì state chưa dựng). Cần fixture/seed trước; skip khỏi auto-codegen-run.
    addUniqueReason(
      reasons,
      'setup-required — cần dựng state trước (fixture/seed), KHÔNG auto-run tránh FAIL giả',
    );
  }

  const steps = Array.isArray(tc.steps) ? tc.steps : [];

  if (!steps.length) {
    addUniqueReason(reasons, 'không có step');
  }

  for (const step of steps) {
    const stepNo = cleanValue(step?.n) || '?';

    if (hasTBD(step?.expected)) {
      addUniqueReason(reasons, `Expected TBD (step ${stepNo})`);
    }

    if (hasTBD(step?.testData)) {
      addUniqueReason(reasons, `Test Data TBD (step ${stepNo})`);
    }

    const action = actionToCode(
      step?.action,
      step?.testData,
      tc?.chk || cleanValue(tc?.stt),
      stepNo,
    );
    const expected = expectedToCode(step?.expected);

    if (action.dataKey) {
      dataEntries.push({ key: action.dataKey, default: action.dataDefault });
    }

    stepMappings.push({
      step,
      action,
      expected,
    });

    if (!action.complete || !action.executable) {
      addUniqueReason(
        reasons,
        `Step ${stepNo}: ${action.reason || 'Action không executable'}`,
      );
    }

    if (!expected.complete) {
      addUniqueReason(
        reasons,
        `Step ${stepNo}: ${expected.reason || 'Expected chưa map được'}`,
      );
    }

    if (expected.assertion) hasAssertion = true;
  }

  if (!hasAssertion) {
    addUniqueReason(reasons, 'test case không có assertion map được');
  }

  return {
    ready: reasons.length === 0,
    reason: reasons[0] || '',
    reasons,
    stepMappings,
    dataEntries,
    hasAssertion,
  };
}

function isCodegenReady(tc) {
  const analysis = analyzeTestcase(tc);

  return {
    ready: analysis.ready,
    reason: analysis.reason,
  };
}

function tcToSpec(tc) {
  const testId = tc?.chk || `TC-${cleanValue(tc?.stt) || 'UNKNOWN'}`;
  const title = cleanValue(tc?.title);
  const testTitle = title ? `${testId}: ${title}` : testId;
  const analysis = analyzeTestcase(tc);
  const lines = [
    `test(${tsString(testTitle)}, async ({ page }) => {`,
  ];

  if (!analysis.ready) {
    lines.push(
      `  test.fixme(true, ${tsString(analysis.reasons.join('; '))});`,
    );
  }

  if (tc?.preconditions && !isDash(tc.preconditions)) {
    lines.push(
      '  // TODO: Preconditions cần fixture/state setup riêng; '
      + 'không coi comment này là setup.',
    );
  }

  for (const mapping of analysis.stepMappings) {
    if (mapping.action.code) lines.push(mapping.action.code);
    if (mapping.expected.code) lines.push(mapping.expected.code);
  }

  lines.push('});');
  return lines.join('\n');
}

function toEnvKey(feature) {
  return String(feature || 'APP')
    .toUpperCase()
    .replace(/[^A-Z0-9_]/g, '_');
}

function safeScopeFilename(scope) {
  if (!isValidSlug(scope)) {
    throw new Error(`scope slug không hợp lệ: ${JSON.stringify(scope)}`);
  }

  return scope;
}

function collectCodegenReport(tcDir) {
  const files = fs.readdirSync(tcDir)
    .filter((file) => /^testcases-.*\.md$/i.test(file))
    .sort((a, b) => a.localeCompare(b));

  const report = {
    generated: [],
    skipped: [],
    files,
  };

  const entries = [];

  for (const file of files) {
    const scope = file
      .replace(/^testcases-/i, '')
      .replace(/\.md$/i, '');

    requireSlug(scope, `scope từ ${file}`);

    const testcases = parseTestcasesFile(
      fs.readFileSync(path.join(tcDir, file), 'utf8'),
    );

    for (const tc of testcases) {
      entries.push({ scope, tc });
    }
  }

  const chkGroups = new Map();

  for (const entry of entries) {
    if (!entry.tc.chk) continue;

    const key = entry.tc.chk.toLowerCase();
    if (!chkGroups.has(key)) chkGroups.set(key, []);
    chkGroups.get(key).push(entry);
  }

  for (const duplicates of chkGroups.values()) {
    if (duplicates.length < 2) continue;

    for (const entry of duplicates) {
      addParseError(entry.tc, `CHK-ID trùng trong workspace: ${entry.tc.chk}`);
    }
  }

  for (const { scope, tc } of entries) {
    const readiness = isCodegenReady(tc);
    const chk = tc.chk || `TC-${tc.stt || 'UNKNOWN'}`;

    if (readiness.ready) {
      report.generated.push({
        scope,
        chk,
        title: tc.title || '',
        tc,
      });
    } else {
      report.skipped.push({
        scope,
        chk,
        reason: readiness.reason,
      });
    }
  }

  return report;
}

function cleanupRunArtifacts(e2eDir) {
  const reportPath = path.join(e2eDir, 'report.json');
  const testResultsPath = path.join(e2eDir, 'test-results');
  const playwrightReportPath = path.join(e2eDir, 'playwright-report');

  if (fs.existsSync(reportPath)) {
    fs.rmSync(reportPath, { force: true });
  }

  fs.rmSync(testResultsPath, {
    recursive: true,
    force: true,
  });

  fs.rmSync(playwrightReportPath, {
    recursive: true,
    force: true,
  });
}

function ensureE2EGitignore(e2eDir) {
  const gitignorePath = path.join(e2eDir, '.gitignore');
  const required = [
    '.env',
    'report.json',
    'test-results/',
    'playwright-report/',
  ];

  const existing = fs.existsSync(gitignorePath)
    ? fs.readFileSync(gitignorePath, 'utf8')
    : '';

  const existingEntries = new Set(
    existing
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean),
  );

  const additions = required.filter(
    (entry) => !existingEntries.has(entry),
  );

  if (!additions.length) return;

  const prefix = existing && !existing.endsWith('\n') ? '\n' : '';
  const contents = `${existing}${prefix}${additions.join('\n')}\n`;

  fs.writeFileSync(gitignorePath, contents, 'utf8');
}

function writeConfig(e2eDir, feature, base) {
  const envKey = `${toEnvKey(feature)}_BASE`;
  const fallbackBase = base || 'http://localhost:3000';

  const config = `import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './specs',
  use: {
    baseURL: process.env[${tsString(envKey)}] || ${tsString(fallbackBase)},
    trace: 'on-first-retry',
  },
  reporter: [
    ['json', { outputFile: 'report.json' }],
    ['list'],
  ],
});
`;

  fs.writeFileSync(
    path.join(e2eDir, 'playwright.config.ts'),
    config,
    'utf8',
  );
}

function writeEnvExample(e2eDir, feature) {
  const envKey = toEnvKey(feature);

  const contents = `# Copy thành .env (gitignored). Không commit secrets.
${envKey}_BASE=http://localhost:3000

# Chỉ khai báo secret theo đúng tên ghi trong Test Data: ENV: VAR.
# Ví dụ Test Data ghi "ENV: AUTH_PASSWORD":
# AUTH_PASSWORD=
`;

  fs.writeFileSync(
    path.join(e2eDir, '.env.example'),
    contents,
    'utf8',
  );
}

// Xuất testdata.json — TÁCH data khỏi script. Giữ giá trị user ĐÃ sửa (merge),
// chỉ thêm key mới với default = data giả-định từ test-case. User sửa file này lúc chạy.
function writeTestData(e2eDir, dataDefaults) {
  const p = path.join(e2eDir, 'testdata.json');
  let existing = {};
  if (fs.existsSync(p)) {
    const raw = fs.readFileSync(p, 'utf8');
    try {
      existing = JSON.parse(raw) || {};
    } catch (err) {
      // KHÔNG nuốt lỗi rồi ghi đè bằng default — sẽ MẤT data thật user đã điền tay.
      // Sao lưu bản hỏng + DỪNG, để user sửa lại JSON (thường lỗi dấu phẩy/quote khi sửa tay).
      const bak = `${p}.bak`;
      try { fs.writeFileSync(bak, raw, 'utf8'); } catch { /* best-effort backup */ }
      throw new Error(
        `testdata.json không đọc được (JSON lỗi: ${err.message}). `
        + `Đã sao lưu bản hiện tại vào ${path.relative(process.cwd(), bak)}. `
        + `Sửa lại cú pháp JSON trong ${path.relative(process.cwd(), p)} rồi chạy lại — `
        + `KHÔNG tự ghi đè để tránh mất data thật anh đã điền.`,
      );
    }
  }
  const merged = {};
  // key mới: default; key đã có trong file: GIỮ giá trị user (không ghi đè bằng default).
  for (const [key, def] of dataDefaults.entries()) {
    merged[key] = Object.prototype.hasOwnProperty.call(existing, key) ? existing[key] : def;
  }
  // key user thêm tay không nằm trong gen: giữ lại (không xóa data user chủ động thêm).
  for (const [key, val] of Object.entries(existing)) {
    if (!(key in merged)) merged[key] = val;
  }
  const sorted = {};
  for (const key of Object.keys(merged).sort()) sorted[key] = merged[key];
  fs.writeFileSync(p, JSON.stringify(sorted, null, 2) + '\n', 'utf8');

  // testdata.defaults.json (máy đọc, KHÔNG sửa tay): bảng default GỐC từ test-case.
  // `run` đối chiếu để biết key nào trong testdata.json VẪN = giá-trị-giả (chưa cấp data thật).
  const defaults = {};
  for (const key of [...dataDefaults.keys()].sort()) defaults[key] = dataDefaults.get(key);
  fs.writeFileSync(
    path.join(e2eDir, 'testdata.defaults.json'),
    JSON.stringify(defaults, null, 2) + '\n',
    'utf8',
  );
}

function writeIndex(e2eDir, feature, report) {
  const today = new Date().toISOString().slice(0, 10);
  const generatedByScope = new Map();

  for (const item of report.generated) {
    if (!generatedByScope.has(item.scope)) {
      generatedByScope.set(item.scope, []);
    }

    generatedByScope.get(item.scope).push(item);
  }

  const specRows = [...generatedByScope.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([scope, tests]) => {
      const spec = `specs/${safeScopeFilename(scope)}.spec.ts`;
      return `| ${scope} | [${spec}](${spec}) | ${tests.length} | — | ${today} |`;
    })
    .join('\n');

  const testRows = report.generated
    .slice()
    .sort((a, b) => a.chk.localeCompare(b.chk))
    .map((item) => {
      const spec = `specs/${safeScopeFilename(item.scope)}.spec.ts`;
      return `| ${item.chk} | ${item.scope} | [${spec}](${spec}) | Generated | — | — |`;
    })
    .join('\n');

  const skippedRows = report.skipped
    .slice()
    .sort((a, b) => (
      `${a.scope}:${a.chk}`.localeCompare(`${b.scope}:${b.chk}`)
    ))
    .map((item) => (
      `| ${item.scope} | ${item.chk} | ${item.reason} |`
    ))
    .join('\n');

  const index = `---
type: e2e-index
feature: ${feature}
status: draft
updated: ${today}
links:
  - docs/${feature}/test/testcases/${feature}-testcase-index.md
---

# Playwright E2E — ${feature}

> Specs auto-gen từ test cases. Sửa nghiệp vụ ở \`/test-cases\` rồi regen — không sửa \`.spec.ts\` tay.

## Specs

| Scope | File | Tests | Kết quả gần nhất | Updated |
|-------|------|-------|------------------|---------|
${specRows || '| — | — | 0 | — | — |'}

## Test cases

| CHK-ID | Scope | Spec | Codegen | Kết quả gần nhất | Chạy lúc |
|--------|-------|------|---------|------------------|----------|
${testRows || '| — | — | — | — | — | — |'}

## Skipped (không codegen — manual/TBD/retired/mapping chưa an toàn)

| Scope | CHK-ID | Lý do |
|-------|--------|-------|
${skippedRows || '| — | — | — |'}
`;

  fs.writeFileSync(
    path.join(e2eDir, `${feature}-e2e-index.md`),
    index,
    'utf8',
  );
}

function gen(opts) {
  if (!opts.dir) fail('thiếu --dir');

  const dir = path.resolve(opts.dir);
  const tcDir = path.join(dir, 'testcases');

  if (!fs.existsSync(tcDir) || !fs.statSync(tcDir).isDirectory()) {
    fail(`không có ${tcDir} — chạy /test-cases trước`);
  }

  const report = collectCodegenReport(tcDir);

  if (!report.files.length) {
    fail(`không có testcases-*.md trong ${tcDir}`);
  }

  const feature = requireSlug(
    opts.feature || path.basename(path.dirname(dir)),
    'feature',
  );

  const e2eDir = path.join(dir, 'e2e');
  const specsDir = path.join(e2eDir, 'specs');

  const byScope = new Map();
  const scopeDataDefaults = new Map(); // key → default value (data giả-định từ test-case)
  const dataKeyConflicts = []; // {key, kept, dropped}: 2 field trùng key nhưng default khác

  for (const item of report.generated) {
    if (!byScope.has(item.scope)) byScope.set(item.scope, []);
    byScope.get(item.scope).push(item.tc);
  }

  if (opts.dryRun) {
    console.log(
      `DRY-RUN: sẽ gen ${report.generated.length} test trong `
      + `${byScope.size} spec; skip ${report.skipped.length}. Chưa ghi file.`,
    );

    for (const [scope, tests] of byScope.entries()) {
      console.log(
        `   • specs/${safeScopeFilename(scope)}.spec.ts — `
        + `${tests.length} test`,
      );
    }

    for (const skipped of report.skipped) {
      console.log(
        `   ⏭  ${skipped.scope} · ${skipped.chk} · ${skipped.reason}`,
      );
    }

    return {
      dryRun: true,
      generated: report.generated.length,
      skipped: report.skipped.length,
    };
  }

  fs.mkdirSync(specsDir, { recursive: true });
  cleanupRunArtifacts(e2eDir);
  ensureE2EGitignore(e2eDir);

  for (const sourceFile of report.files) {
    const scope = sourceFile
      .replace(/^testcases-/i, '')
      .replace(/\.md$/i, '');

    requireSlug(scope, `scope từ ${sourceFile}`);

    const specPath = path.join(
      specsDir,
      `${safeScopeFilename(scope)}.spec.ts`,
    );

    const ready = byScope.get(scope) || [];

    if (!ready.length) {
      if (fs.existsSync(specPath)) fs.unlinkSync(specPath);
      continue;
    }

    // Thu thập data keys của scope này (để xuất testdata.json + override lúc chạy).
    for (const tc of ready) {
      for (const e of (analyzeTestcase(tc).dataEntries || [])) {
        if (!scopeDataDefaults.has(e.key)) {
          scopeDataDefaults.set(e.key, e.default);
        } else if (scopeDataDefaults.get(e.key) !== e.default) {
          // Cùng key nhưng default KHÁC → 2 field bị trùng key (đáng lẽ step đã tách,
          // nhưng phòng khi tcId+step+label vẫn đụng). Cảnh báo thay vì nuốt thầm lặng.
          dataKeyConflicts.push({
            key: e.key,
            kept: scopeDataDefaults.get(e.key),
            dropped: e.default,
          });
        }
      }
    }

    const body = [
      `import { test, expect } from '@playwright/test';`,
      `import TESTDATA from '../testdata.json';`,
      '',
      `// AUTO-GENERATED bởi playwright-gen.mjs từ testcases-${scope}.md — KHÔNG sửa tay (regen sẽ ghi đè).`,
      '// Trace: mỗi test() title bắt đầu bằng CHK-ID.',
      '// Test data TÁCH khỏi script: sửa ../testdata.json để khớp môi trường, KHÔNG sửa file này.',
      '// DATA(key, default): dùng giá trị trong testdata.json nếu có, else default (data giả-định từ test-case).',
      'const DATA = (k, d) => (TESTDATA && Object.prototype.hasOwnProperty.call(TESTDATA, k) ? TESTDATA[k] : d);',
      '',
      `test.describe(${tsString(scope)}, () => {`,
      ...ready.map((tc) => (
        tcToSpec(tc)
          .split('\n')
          .map((line) => `  ${line}`)
          .join('\n')
      )),
      '});',
      '',
    ].join('\n');

    fs.writeFileSync(specPath, body, 'utf8');
  }

  writeConfig(e2eDir, feature, opts.base);
  writeEnvExample(e2eDir, feature);
  writeTestData(e2eDir, scopeDataDefaults);
  writeIndex(e2eDir, feature, report);

  console.log(
    `✅ gen: ${report.generated.length} test trong ${byScope.size} spec; `
    + `skip ${report.skipped.length}`,
  );

  for (const skipped of report.skipped) {
    console.log(
      `   ⏭  ${skipped.scope} · ${skipped.chk} · ${skipped.reason}`,
    );
  }

  for (const c of dataKeyConflicts) {
    console.warn(
      `   ⚠ data key trùng "${c.key}": giữ default ${JSON.stringify(c.kept)}, `
      + `bỏ ${JSON.stringify(c.dropped)} — 2 field khác nhau đang đọc chung 1 entry `
      + `testdata.json. Kiểm tra nhãn field trong test-case (đổi nhãn cho khác nhau).`,
    );
  }

  return {
    gen: [...byScope.entries()].map(([scope, tests]) => ({
      scope,
      file: `specs/${safeScopeFilename(scope)}.spec.ts`,
      count: tests.length,
    })),
    skip: report.skipped,
    dataKeyConflicts,
  };
}

function resultErrorText(result) {
  const parts = [];

  if (result?.error) {
    if (typeof result.error === 'string') {
      parts.push(result.error);
    } else {
      parts.push(result.error.message || '');
      parts.push(result.error.stack || '');
    }
  }

  for (const error of result?.errors || []) {
    if (typeof error === 'string') {
      parts.push(error);
    } else {
      parts.push(error?.message || '');
      parts.push(error?.stack || '');
    }
  }

  return parts.filter(Boolean).join('\n');
}

function isNavigationUnavailableResult(result) {
  const text = resultErrorText(result);

  if (!text) return false;

  const hasNavigationContext = /(?:page\.goto|navigation|navigate|navigating|browser has been closed while navigating)/i
    .test(text);

  const hasNetworkFailure = /(?:ECONNREFUSED|ECONNRESET|ENOTFOUND|EAI_AGAIN|ERR_CONNECTION_REFUSED|ERR_CONNECTION_RESET|ERR_CONNECTION_CLOSED|ERR_NAME_NOT_RESOLVED|Failed to connect|connect ECONNREFUSED)/i
    .test(text);

  return hasNavigationContext && hasNetworkFailure;
}

function isNavigationUnavailableTest(test) {
  const results = Array.isArray(test?.results) ? test.results : [];
  const failedResults = results.filter((result) => (
    ['failed', 'timedOut', 'interrupted'].includes(result?.status)
    || Boolean(result?.error)
    || (Array.isArray(result?.errors) && result.errors.length > 0)
  ));

  return (
    failedResults.length > 0
    && failedResults.every(isNavigationUnavailableResult)
  );
}

function getReportStatus(test) {
  const status = String(test?.status || '');

  if (status === 'expected' || status === 'flaky') {
    return 'PASS';
  }

  if (status === 'skipped') {
    return 'PENDING';
  }

  if (status === 'unexpected') {
    return isNavigationUnavailableTest(test) ? 'PENDING' : 'FAIL';
  }

  return 'PENDING';
}

function mergeAggregatedStatus(previous, next) {
  const rank = {
    PASS: 1,
    PENDING: 2,
    FAIL: 3,
  };

  if (!previous) return next;
  return rank[next] > rank[previous] ? next : previous;
}

function parsePlaywrightReport(reportPath) {
  const results = new Map();
  const errorTexts = new Map(); // chk → error text (chỉ khi FAIL) để phân loại nghi-data/nghi-app

  if (!fs.existsSync(reportPath)) {
    return {
      results,
      errorTexts,
      stats: {},
      reportFound: false,
      reportValid: false,
      error: 'report.json không tồn tại',
    };
  }

  let report;

  try {
    report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
  } catch {
    return {
      results,
      errorTexts,
      stats: {},
      reportFound: true,
      reportValid: false,
      error: 'report.json không phải JSON hợp lệ',
    };
  }

  if (!report || !Array.isArray(report.suites)) {
    return {
      results,
      errorTexts,
      stats: report?.stats || {},
      reportFound: true,
      reportValid: false,
      error: 'report.json không đúng schema Playwright JSON reporter',
    };
  }

  const canonicalKeys = new Map();

  const mergeResult = (chk, status, errorText) => {
    const normalizedKey = chk.toLowerCase();
    const canonical = canonicalKeys.get(normalizedKey) || chk;
    const previous = results.get(canonical);

    canonicalKeys.set(normalizedKey, canonical);
    results.set(
      canonical,
      mergeAggregatedStatus(previous, status),
    );
    // Giữ error text của lần FAIL (để phân loại nghi-data/nghi-app). Ưu tiên text đầu tiên có.
    if (status === 'FAIL' && errorText && !errorTexts.has(canonical)) {
      errorTexts.set(canonical, errorText);
    }
  };

  function walkSuite(suite) {
    for (const spec of suite?.specs || []) {
      const chkMatch = String(spec?.title || '').match(
        /\bCHK-[a-z0-9][a-z0-9-]*-\d{3,}\b/i,
      );

      if (!chkMatch) continue;

      for (const playwrightTest of spec?.tests || []) {
        const status = getReportStatus(playwrightTest);
        const attempts = Array.isArray(playwrightTest?.results)
          ? playwrightTest.results
          : [];

        /*
         * JSON reporter chứa từng project ở spec.tests[] và từng attempt
         * ở test.results[]. Status tổng hợp đúng nằm ở test.status.
         */
        if (!attempts.length) {
          mergeResult(chkMatch[0], status);
          continue;
        }

        for (const attempt of attempts) {
          mergeResult(chkMatch[0], status, resultErrorText(attempt));
        }
      }
    }

    for (const child of suite?.suites || []) {
      walkSuite(child);
    }
  }

  for (const suite of report.suites) {
    walkSuite(suite);
  }

  return {
    results,
    errorTexts,
    stats: report.stats || {},
    reportFound: true,
    reportValid: true,
    error: '',
  };
}

// Phân loại 1 FAIL theo VỊ TRÍ fail (marker engine chèn lúc gen) + wording lỗi phụ trợ.
// Trả 'data' (nghi-data 🟡: fail ở bước nhập data/navigation/auth) hoặc 'app' (nghi-app-bug 🔴:
// fail ở assertion nghiệp vụ). KHÔNG phán quyết — chỉ là NGHI để user review.
function classifyFailure(errorText) {
  const text = String(errorText || '');
  if (!text) return 'app'; // không có manh mối → mặc định coi như app-bug (cần dev xem), an toàn hơn bỏ sót

  // Ưu tiên marker (deterministic, engine tự chèn — không phụ thuộc wording Playwright đổi theo version).
  const hasDataMarker = text.includes('@data-step');
  const hasAssertMarker = text.includes('@assert-step');
  if (hasAssertMarker && !hasDataMarker) return 'app';
  if (hasDataMarker && !hasAssertMarker) return 'data';

  // Không có/lẫn marker → dựa signature lỗi. expect() fail = assertion nghiệp vụ = app.
  if (/\bexpect\(|toBeVisible|toBeHidden|toHaveURL|toHaveText|Expected:.*Received:/s.test(text)) {
    return 'app';
  }
  // fail ở locator nhập/navigation, hoặc app báo lỗi auth/tồn-tại = nghi data.
  if (/locator\.fill|getByLabel|getByRole|page\.goto|Timeout.*waiting for|không t[oồ]n t[aạ]i|sai m[aậ]t kh[aẩ]u|invalid credential|user not found|unauthor/i.test(text)) {
    return 'data';
  }
  return 'app';
}

// Đọc testdata.json + testdata.defaults.json → tập key CÒN = giá-trị-giả (chưa cấp data thật)
// và key THIẾU (chưa có trong testdata.json). ENV/secret không nằm ở đây (đi qua process.env).
function detectDataGaps(e2eDir) {
  const stillDefault = []; // {key, value}: giá trị == default gốc (data mẫu chưa sửa)
  const missing = [];      // key có trong defaults nhưng thiếu ở testdata.json
  const dp = path.join(e2eDir, 'testdata.defaults.json');
  const tp = path.join(e2eDir, 'testdata.json');
  if (!fs.existsSync(dp)) return { stillDefault, missing, defaults: {}, current: {} };
  let defaults = {};
  let current = {};
  try { defaults = JSON.parse(fs.readFileSync(dp, 'utf8')) || {}; } catch { defaults = {}; }
  try { current = fs.existsSync(tp) ? (JSON.parse(fs.readFileSync(tp, 'utf8')) || {}) : {}; } catch { current = {}; }
  for (const [key, def] of Object.entries(defaults)) {
    if (!Object.prototype.hasOwnProperty.call(current, key)) {
      missing.push(key);
    } else if (current[key] === def) {
      stillDefault.push({ key, value: def });
    }
  }
  return { stillDefault, missing, defaults, current };
}

// Fingerprint gọn của data hiện tại (để so lịch sử run: cùng data mà nay fail = nghi outdate).
function dataFingerprint(current) {
  const keys = Object.keys(current || {}).sort();
  return keys.map((k) => `${k}=${current[k]}`).join('|');
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function loadRunHistory(e2eDir) {
  const p = path.join(e2eDir, 'run-history.json');
  if (!fs.existsSync(p)) return {};
  try { return JSON.parse(fs.readFileSync(p, 'utf8')) || {}; } catch { return {}; }
}

function saveRunHistory(e2eDir, history) {
  fs.writeFileSync(
    path.join(e2eDir, 'run-history.json'),
    JSON.stringify(history, null, 2) + '\n',
    'utf8',
  );
}

function summarizeResults(results) {
  const summary = {
    passed: 0,
    failed: 0,
    pending: 0,
  };

  for (const status of results.values()) {
    if (status === 'PASS') summary.passed += 1;
    else if (status === 'FAIL') summary.failed += 1;
    else summary.pending += 1;
  }

  return summary;
}

function updateIndexResults(e2eDir, feature, results) {
  const indexPath = path.join(
    e2eDir,
    `${feature}-e2e-index.md`,
  );

  if (!fs.existsSync(indexPath)) return;

  const today = new Date().toISOString().slice(0, 10);
  const perScope = new Map();
  const normalizedResults = new Map(
    [...results.entries()].map(([chk, status]) => [
      chk.toLowerCase(),
      status,
    ]),
  );

  const lines = fs.readFileSync(indexPath, 'utf8').split('\n');

  const updatedLines = lines.map((line) => {
    if (!/^\|\s*CHK-[a-z0-9][a-z0-9-]*-\d{3,}\s*\|/i.test(line)) {
      return line;
    }

    const cells = line.split('|').map((cell) => cell.trim());
    const chk = cells[1];
    const scope = cells[2];
    const status = normalizedResults.get(chk.toLowerCase());

    if (!status) return line;

    if (!perScope.has(scope)) perScope.set(scope, []);
    perScope.get(scope).push(status);

    cells[5] = status;
    cells[6] = today;

    return `| ${cells.slice(1, -1).join(' | ')} |`;
  });

  const finalLines = updatedLines.map((line) => {
    if (
      !/^\|\s*[^|]+\s*\|\s*\[specs\/[^|]+\]\([^)]*\)\s*\|/i.test(line)
    ) {
      return line;
    }

    const cells = line.split('|').map((cell) => cell.trim());
    const scope = cells[1];
    const statuses = perScope.get(scope);

    if (!statuses?.length) return line;

    const pass = statuses.filter((status) => status === 'PASS').length;
    const failCount = statuses.filter((status) => status === 'FAIL').length;
    const pending = statuses.filter(
      (status) => status === 'PENDING',
    ).length;

    const summary = [
      pass ? `PASS ${pass}` : '',
      failCount ? `FAIL ${failCount}` : '',
      pending ? `PENDING ${pending}` : '',
    ]
      .filter(Boolean)
      .join(', ');

    cells[4] = summary;
    cells[5] = today;

    return `| ${cells.slice(1, -1).join(' | ')} |`;
  });

  fs.writeFileSync(
    indexPath,
    `${finalLines.join('\n')}\n`,
    'utf8',
  );
}

function loadDotEnv(envPath) {
  const out = {};

  if (!fs.existsSync(envPath)) return out;

  const text = fs.readFileSync(envPath, 'utf8');

  for (const raw of text.split('\n')) {
    const line = raw.trim();

    if (!line || line.startsWith('#')) continue;

    const eq = line.indexOf('=');
    if (eq === -1) continue;

    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();

    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) continue;

    if (
      (value.startsWith('"') && value.endsWith('"'))
      || (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    out[key] = value;
  }

  return out;
}

// origin an toàn để log/so sánh: scheme://host[:port], BỎ credential/path/query/token.
function safeOrigin(url) {
  try {
    const u = new URL(String(url));
    return `${u.protocol}//${u.host}`;
  } catch {
    return '';
  }
}

function isLocalOrigin(origin) {
  return /^(https?:\/\/)?(localhost|127\.0\.0\.1|\[::1\]|[^/]*\.(local|test|localhost))(:\d+)?$/i.test(origin);
}

// Danh sách origin đã khai là non-prod, 1 origin/dòng (committed, KHÔNG chứa secret).
function loadAllowedOrigins(e2eDir) {
  const p = path.join(e2eDir, '.allowed-origins');
  const set = new Set();
  if (!fs.existsSync(p)) return set;
  for (const raw of fs.readFileSync(p, 'utf8').split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const o = safeOrigin(line) || line;
    if (o) set.add(o);
  }
  return set;
}

// Dựng report chạy Playwright (máy + người đọc): phân loại mỗi kết quả, gom data cần bổ sung,
// ghi run-report.md. KHÔNG ngắt luồng hỏi — chỉ ghi để user review rồi cấp data + chạy lại.
function buildRunReport(e2eDir, feature, parsed, history) {
  const gaps = detectDataGaps(e2eDir);
  const fingerprint = dataFingerprint(gaps.current);
  const stillDefaultKeys = new Set(gaps.stillDefault.map((d) => d.key));

  const rows = []; // {chk, status, category, note}
  for (const [chk, status] of parsed.results.entries()) {
    let category = status; // PASS | FAIL | PENDING
    let note = '';
    if (status === 'FAIL') {
      const errText = parsed.errorTexts.get(chk) || '';
      const kind = classifyFailure(errText); // 'data' | 'app'
      const prev = history[chk];
      // Outdate: bước data từng PASS với ĐÚNG data này (passFingerprint khớp data hiện tại),
      // nay fail ở bước data → nghi data cũ (vd account từng đúng bị team khác đổi).
      if (kind === 'data' && prev && prev.lastPass && prev.passFingerprint === fingerprint) {
        category = 'FAIL_DATA_OUTDATE';
        note = `từng PASS (${prev.lastPass}) với cùng data — data có thể đã outdate (vd account bị đổi)`;
      } else if (kind === 'data') {
        category = 'FAIL_DATA';
        note = 'fail ở bước nhập data/navigation/auth — kiểm data test trước khi báo dev';
      } else {
        category = 'FAIL_APP';
        note = 'fail ở assertion nghiệp vụ — nghi app bug, cần dev xem';
      }
    } else if (status === 'PENDING') {
      note = 'chưa chạy được (navigation/skip) — env chưa dựng hoặc setup-required';
    }
    rows.push({ chk, status, category, note });
  }
  rows.sort((a, b) => a.chk.localeCompare(b.chk));

  return { rows, gaps, fingerprint, stillDefaultKeys };
}

function writeRunReport(e2eDir, feature, report, summary, origin) {
  const today = new Date().toISOString().slice(0, 10);
  const icon = {
    PASS: '✅', FAIL_APP: '🔴', FAIL_DATA: '🟡',
    FAIL_DATA_OUTDATE: '🟠', PENDING: '⏳', FAIL: '❌',
  };
  const label = {
    PASS: 'Đậu', FAIL_APP: 'Nghi app bug', FAIL_DATA: 'Nghi data',
    FAIL_DATA_OUTDATE: 'Nghi data outdate', PENDING: 'Chờ (chưa chạy được)',
    FAIL: 'Rớt',
  };
  const countBy = (cat) => report.rows.filter((r) => r.category === cat).length;

  const lines = [];
  lines.push(`# Kết quả chạy Playwright — ${feature}`);
  lines.push('');
  lines.push(`> Chạy: ${today} · Môi trường: \`${origin || '(local/không rõ)'}\``);
  lines.push('>');
  lines.push(
    `> ✅ ${summary.passed} đậu · 🔴 ${countBy('FAIL_APP')} nghi app bug · `
    + `🟡 ${countBy('FAIL_DATA')} nghi data · 🟠 ${countBy('FAIL_DATA_OUTDATE')} nghi data outdate · `
    + `⏳ ${summary.pending} chờ`,
  );
  lines.push('');
  lines.push('Report này KHÔNG tự sửa gì. Đọc mục "Data cần bổ sung", cấp data thật vào '
    + '`e2e/testdata.json` (secret để `e2e/.env`), rồi chạy lại phần chưa đậu:');
  lines.push('');
  lines.push('```');
  lines.push(`node .claude/scripts/playwright-gen.mjs run --dir docs/${feature} --retry-failed`);
  lines.push('```');
  lines.push('');

  lines.push('## Kết quả từng case');
  lines.push('');
  lines.push('| CHK-ID | Kết quả | Ghi chú |');
  lines.push('|---|---|---|');
  for (const r of report.rows) {
    lines.push(`| ${r.chk} | ${icon[r.category] || ''} ${label[r.category] || r.category} | ${r.note} |`);
  }
  lines.push('');

  // Data cần bổ sung: key còn giá-trị-giả + key thiếu + data nghi-outdate.
  const outdateChks = report.rows.filter((r) => r.category === 'FAIL_DATA_OUTDATE').map((r) => r.chk);
  const hasDataWork = report.gaps.stillDefault.length || report.gaps.missing.length || outdateChks.length;
  lines.push('## Data cần bổ sung / kiểm lại');
  lines.push('');
  if (!hasDataWork) {
    lines.push('_Không có data nào còn giá-trị-giả hoặc thiếu. Nếu vẫn rớt, nghi app bug (xem cột trên)._');
  } else {
    lines.push('| Key data | Giá trị hiện tại | Vấn đề | Cấp vào đâu |');
    lines.push('|---|---|---|---|');
    for (const d of report.gaps.stillDefault) {
      lines.push(`| \`${d.key}\` | \`${d.value}\` | còn giá-trị-giả (mẫu từ test-case) | \`e2e/testdata.json\` |`);
    }
    for (const k of report.gaps.missing) {
      lines.push(`| \`${k}\` | _(thiếu)_ | chưa có trong testdata.json | \`e2e/testdata.json\` |`);
    }
    if (outdateChks.length) {
      lines.push(`| _(data dùng chung)_ | — | ${outdateChks.join(', ')} từng PASS nay fail bước data → nghi outdate | kiểm \`e2e/testdata.json\` |`);
    }
    lines.push('');
    lines.push('> Secret (mật khẩu/token) KHÔNG điền vào testdata.json — khai `ENV: VAR` ở test-case, '
      + 'value để `e2e/.env`. Nếu data thật khác data giả và muốn ghi ngược vào test-case, chạy lại `/playwright-gen` sẽ hỏi.');
  }
  lines.push('');

  fs.writeFileSync(path.join(e2eDir, 'run-report.md'), lines.join('\n'), 'utf8');
}

function run(opts) {
  if (!opts.dir) fail('thiếu --dir');

  const dir = path.resolve(opts.dir);
  const feature = requireSlug(
    opts.feature || path.basename(path.dirname(dir)),
    'feature',
  );

  const e2eDir = path.join(dir, 'e2e');
  const configPath = path.join(
    e2eDir,
    'playwright.config.ts',
  );

  const reportPath = path.join(e2eDir, 'report.json');

  if (!fs.existsSync(configPath)) {
    fail('chưa gen — chạy `gen` trước');
  }

  // --retry-failed: đọc run-history (kết quả vòng trước) → lọc case CHƯA-PASS để chạy lại.
  // Không cần user gõ danh sách. Case đã ✅ được bỏ qua (tiết kiệm thời gian).
  let retryFilter = '';
  if (opts.retryFailed) {
    const history = loadRunHistory(e2eDir);
    const notPassed = Object.keys(history).filter((chk) => history[chk]?.lastStatus !== 'PASS');
    if (!notPassed.length) {
      console.log('✅ --retry-failed: không có case nào chưa-PASS ở vòng trước — không cần chạy lại.');
      return { passed: 0, failed: 0, pending: 0 };
    }
    // -g nhận regex; ghép các CHK bằng | và escape.
    retryFilter = notPassed.map((c) => c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
    console.log(`↻ --retry-failed: chạy lại ${notPassed.length} case chưa-PASS: ${notPassed.join(', ')}`);
  }

  cleanupRunArtifacts(e2eDir);

  const args = [
    'playwright',
    'test',
    '--config',
    'playwright.config.ts',
  ];

  if (opts.headed) args.push('--headed');
  if (opts.tc) args.push('-g', opts.tc);
  else if (retryFilter) args.push('-g', retryFilter);

  const env = {
    ...process.env,
    ...loadDotEnv(path.join(e2eDir, '.env')),
  };

  if (opts.base) {
    env[`${toEnvKey(feature)}_BASE`] = opts.base;
  }

  // ── PRODUCTION SAFETY GATE (engine tự enforce, không dựa skill) ──
  // baseURL cuối cùng: --base > env {FEATURE}_BASE > fallback trong config.
  const baseUrl = opts.base || env[`${toEnvKey(feature)}_BASE`] || '';
  const origin = safeOrigin(baseUrl); // chỉ scheme://host:port, KHÔNG log credential/query
  // Cho phép non-prod khi: origin nằm trong allowlist file .allowed-origins (non-prod đã khai),
  // HOẶC localhost/127.0.0.1/*.local/*.test/*.localhost.
  const allowlist = loadAllowedOrigins(e2eDir);
  const isKnownNonProd = origin && (allowlist.has(origin) || isLocalOrigin(origin));
  if (!isKnownNonProd) {
    // Unknown/khả nghi prod → BẮT BUỘC --allow-prod + xác nhận tường minh, KHÔNG mặc định chạy.
    if (!opts.allowProd || opts.confirmProd !== origin) {
      fail(
        `Từ chối chạy trên môi trường CHƯA xác nhận non-prod: ${origin || '(baseURL rỗng)'}\n` +
        `  • Non-prod: thêm origin vào ${path.join(e2eDir, '.allowed-origins')} (1 origin/dòng) rồi chạy lại.\n` +
        `  • Production (rủi ro — test có thể tạo/đổi dữ liệu thật): cần cả \`--allow-prod\` VÀ \`--confirm-prod ${origin || '<origin>'}\` (gõ đúng origin).`,
      );
    }
    console.log(`⚠️  Chạy trên PRODUCTION đã được cấp phép tường minh: ${origin}`);
  }

  const execution = spawnSync('npx', args, {
    cwd: e2eDir,
    encoding: 'utf8',
    env,
  });

  const runnerExitCode = (
    typeof execution.status === 'number'
    && execution.status >= 0
  )
    ? execution.status
    : 1;

  let parsed;
  let summary;
  let reportError = '';
  let runReportSummary = null;

  try {
    parsed = parsePlaywrightReport(reportPath);

    if (!parsed.reportValid) {
      summary = {
        passed: 0,
        failed: 1,
        pending: 0,
      };
      reportError = parsed.error;
    } else {
      summary = summarizeResults(parsed.results);

      const reportedTotal = Number(parsed.stats?.total || 0);
      const summarizedTotal = (
        summary.passed
        + summary.failed
        + summary.pending
      );

      if (reportedTotal > 0 && summarizedTotal === 0) {
        summary.failed = 1;
        reportError = (
          'report có test nhưng không có CHK-ID/status parse được'
        );
      } else if (runnerExitCode !== 0 && summarizedTotal === 0) {
        summary.failed = 1;
        reportError = 'runner lỗi trước khi tạo kết quả test';
      }

      updateIndexResults(
        e2eDir,
        feature,
        parsed.results,
      );

      // ── Phân loại + report + lịch sử (nghi-data/nghi-app/outdate) ──
      const history = loadRunHistory(e2eDir);
      const runReport = buildRunReport(e2eDir, feature, parsed, history);
      writeRunReport(e2eDir, feature, runReport, summary, origin);

      // Cập nhật run-history CHỈ cho case vừa chạy (retry-failed chỉ chạy 1 phần → giữ phần cũ).
      for (const [chk, status] of parsed.results.entries()) {
        const prev = history[chk] || {};
        history[chk] = {
          lastStatus: status,
          lastRun: today(),
          fingerprint: runReport.fingerprint,
          // Ghi mốc PASS gần nhất + data-fingerprint lúc PASS (để phát hiện outdate về sau).
          lastPass: status === 'PASS' ? today() : (prev.lastPass || ''),
          passFingerprint: status === 'PASS' ? runReport.fingerprint : (prev.passFingerprint || ''),
        };
      }
      saveRunHistory(e2eDir, history);
      runReportSummary = runReport;
    }
  } finally {
    cleanupRunArtifacts(e2eDir);
  }

  const navigationPending = parsed?.reportValid
    ? [...parsed.results.values()]
      .filter((status) => status === 'PENDING')
      .length
    : 0;

  if (navigationPending > 0) {
    console.log(
      `⏳ ${navigationPending} test PENDING/skipped; `
      + 'lỗi navigation được phân loại riêng theo từng test.',
    );
  }

  if (reportError) {
    console.error(`❌ Runner/report error: ${reportError}`);
  }

  const finalExitCode = runnerExitCode !== 0
    ? runnerExitCode
    : summary.failed > 0
      ? 1
      : 0;

  process.exitCode = finalExitCode;

  if (runReportSummary) {
    const cnt = (cat) => runReportSummary.rows.filter((r) => r.category === cat).length;
    console.log(
      `Run: ✅${summary.passed} `
      + `🔴${cnt('FAIL_APP')} nghi-app `
      + `🟡${cnt('FAIL_DATA')} nghi-data `
      + `🟠${cnt('FAIL_DATA_OUTDATE')} nghi-outdate `
      + `⏳${summary.pending} (exit ${finalExitCode})`,
    );
    const dataWork = runReportSummary.gaps.stillDefault.length + runReportSummary.gaps.missing.length;
    if (dataWork > 0 || cnt('FAIL_DATA') > 0 || cnt('FAIL_DATA_OUTDATE') > 0) {
      console.log(
        `📄 Xem ${path.join('docs', feature, 'e2e', 'run-report.md')} — có ${dataWork} data cần bổ sung. `
        + `Cấp data thật vào testdata.json rồi chạy lại với --retry-failed.`,
      );
    }
  } else {
    console.log(
      `Run: ✅${summary.passed} ❌${summary.failed} `
      + `⏳${summary.pending} (exit ${finalExitCode})`,
    );
  }

  return summary;
}

function fail(message) {
  console.error(`❌ playwright-gen: ${message}`);
  process.exit(1);
}

const { cmd, opts } = parseArgs(process.argv);

if (cmd === 'gen') {
  gen(opts);
} else if (cmd === 'run') {
  run(opts);
} else if (cmd === '--selftest') {
  // Reserved for the engine test harness.
} else if (import.meta.url === `file://${process.argv[1]}`) {
  fail(
    `lệnh không hợp lệ: ${cmd || '(trống)'}. Dùng: gen | run`,
  );
}

export {
  parseTestcasesFile,
  isCodegenReady,
  actionToCode,
  expectedToCode,
  tcToSpec,
  dataToExpression,
  writeTestData,
  classifyFailure,
  detectDataGaps,
  dataFingerprint,
  buildRunReport,
  writeRunReport,
};
