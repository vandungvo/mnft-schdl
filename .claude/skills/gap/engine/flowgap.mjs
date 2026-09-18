#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

const DEFAULT_GRAPH_PATH = 'docs/_shared/kg/graph.json';

const REVERSE_PAIRS = [
  {
    left: 'khóa',
    right: 'mở khóa',
    leftTerms: ['khóa', 'lock', 'locked', 'locking'],
    rightTerms: ['mở khóa', 'unlock', 'unlocked', 'unlocking'],
  },
  {
    left: 'kích hoạt',
    right: 'vô hiệu',
    leftTerms: ['kích hoạt', 'activate', 'activated', 'activation'],
    rightTerms: ['vô hiệu', 'vô hiệu hóa', 'deactivate', 'deactivated', 'deactivation'],
  },
  {
    left: 'enable',
    right: 'disable',
    leftTerms: ['enable', 'enabled', 'enabling'],
    rightTerms: ['disable', 'disabled', 'disabling'],
  },
  {
    left: 'đăng ký',
    right: 'hủy đăng ký',
    leftTerms: ['đăng ký'],
    rightTerms: ['hủy đăng ký'],
  },
  {
    left: 'subscribe',
    right: 'unsubscribe',
    leftTerms: ['subscribe', 'subscribed', 'subscribing'],
    rightTerms: ['unsubscribe', 'unsubscribed', 'unsubscribing'],
  },
  {
    left: 'thêm',
    right: 'xóa',
    leftTerms: ['thêm'],
    rightTerms: ['xóa'],
  },
  {
    left: 'add',
    right: 'remove',
    leftTerms: ['add', 'added', 'adding'],
    rightTerms: ['remove', 'removed', 'removing'],
  },
  {
    left: 'tạm dừng',
    right: 'tiếp tục',
    leftTerms: ['tạm dừng'],
    rightTerms: ['tiếp tục'],
  },
  {
    left: 'pause',
    right: 'resume',
    leftTerms: ['pause', 'paused', 'pausing'],
    rightTerms: ['resume', 'resumed', 'resuming'],
  },
  {
    left: 'liên kết',
    right: 'hủy liên kết',
    leftTerms: ['liên kết'],
    rightTerms: ['hủy liên kết'],
  },
  {
    left: 'liên kết',
    right: 'hủy liên kết',
    // KHÔNG dùng 'link' trần: nó match danh từ ("verify link", "reset link",
    // "click vào link") → báo gap giả "có link, thiếu unlink". Chỉ nhận cụm
    // mang nghĩa HÀNH ĐỘNG liên kết tài khoản.
    leftTerms: ['liên kết', 'link account', 'link tài khoản', 'linked account'],
    rightTerms: ['hủy liên kết', 'huỷ liên kết', 'unlink', 'unlinked', 'unlinking'],
  },
  {
    left: 'bật',
    right: 'tắt',
    leftTerms: ['bật'],
    rightTerms: ['tắt'],
  },
  {
    left: 'gán',
    right: 'thu hồi',
    leftTerms: ['gán'],
    rightTerms: ['thu hồi'],
  },
  {
    left: 'grant',
    right: 'revoke',
    leftTerms: ['grant', 'granted', 'granting'],
    rightTerms: ['revoke', 'revoked', 'revoking'],
  },
  {
    left: 'mở',
    right: 'đóng',
    leftTerms: ['mở'],
    rightTerms: ['đóng'],
  },
  {
    left: 'open',
    right: 'close',
    leftTerms: ['open', 'opened', 'opening'],
    rightTerms: ['close', 'closed', 'closing'],
  },
  {
    left: 'treo',
    right: 'gỡ',
    leftTerms: ['treo'],
    rightTerms: ['gỡ', 'gỡ treo'],
  },
  {
    left: 'suspend',
    right: 'restore',
    leftTerms: ['suspend', 'suspended', 'suspending'],
    rightTerms: ['restore', 'restored', 'restoring'],
  },
];

const CRUD_OPERATIONS = [
  {
    code: 'C',
    label: 'Tạo',
    terms: [
      'tạo',
      'khởi tạo',
      'create',
      'created',
      'creating',
      'creation',
      'thêm',
      'add',
      'added',
      'adding',
    ],
  },
  {
    code: 'R',
    label: 'Xem',
    terms: [
      'xem',
      'đọc',
      'hiển thị',
      'danh sách',
      'read',
      'view',
      'viewed',
      'display',
      'displayed',
      'show',
      'shown',
      'list',
      'listed',
      'listing',
      'get',
      'fetch',
    ],
  },
  {
    code: 'U',
    label: 'Cập nhật',
    terms: [
      'sửa',
      'cập nhật',
      'đổi',
      'update',
      'updated',
      'updating',
      'edit',
      'edited',
      'editing',
      'change',
      'changed',
      'modify',
      'modified',
    ],
  },
  {
    code: 'D',
    label: 'Xóa',
    terms: [
      'xóa',
      'hủy',
      'delete',
      'deleted',
      'deleting',
      'remove',
      'removed',
      'removing',
      'cancel',
      'cancelled',
      'canceled',
    ],
  },
];

class CliError extends Error {}

function compareText(a, b) {
  const left = String(a ?? '');
  const right = String(b ?? '');
  return left < right ? -1 : left > right ? 1 : 0;
}

function parseArgs(argv) {
  const options = {
    feature: null,
    json: false,
    listFeatures: false,
    graphPath: DEFAULT_GRAPH_PATH,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];

    if (argument === '--json') {
      options.json = true;
      continue;
    }

    if (argument === '--list-features') {
      options.listFeatures = true;
      continue;
    }

    if (argument === '--graph') {
      const value = argv[index + 1];
      if (!value || value.startsWith('--')) {
        throw new CliError('--graph cần một đường dẫn.');
      }
      options.graphPath = value;
      index += 1;
      continue;
    }

    if (argument.startsWith('--')) {
      throw new CliError(`Tham số không được hỗ trợ: ${argument}`);
    }

    if (options.feature !== null) {
      throw new CliError('Chỉ được truyền một feature.');
    }

    options.feature = argument;
  }

  if (options.listFeatures && options.feature !== null) {
    throw new CliError('Không truyền feature cùng với --list-features.');
  }

  if (!options.listFeatures && !options.feature) {
    throw new CliError(
      'Thiếu feature. Cách dùng: flowgap.mjs <feature> [--json] [--graph <path>].',
    );
  }

  return options;
}

function readGraph(graphPath) {
  if (!fs.existsSync(graphPath)) {
    throw new CliError(`Không tìm thấy graph.json tại ${graphPath}`);
  }

  let content;
  try {
    content = fs.readFileSync(graphPath, 'utf8');
  } catch (error) {
    throw new CliError(`Không đọc được graph.json: ${error.message}`);
  }

  let graph;
  try {
    graph = JSON.parse(content);
  } catch (error) {
    throw new CliError(`graph.json không phải JSON hợp lệ: ${error.message}`);
  }

  if (!graph || !Array.isArray(graph.nodes) || !Array.isArray(graph.edges)) {
    throw new CliError('graph.json không đúng schema: cần nodes[] và edges[].');
  }

  // Lọc phần tử hỏng (null/không có key) thay vì crash giữa chừng — graph lỗi
  // một phần vẫn phân tích được phần lành, còn hơn exit 2 mất trắng.
  graph.nodes = graph.nodes.filter((n) => n && typeof n.key === 'string');
  graph.edges = graph.edges.filter(
    (e) => e && typeof e.from === 'string' && typeof e.to === 'string',
  );

  return graph;
}

function normalizeText(value) {
  return String(value ?? '').normalize('NFKC').toLocaleLowerCase('vi');
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function containsTerm(text, term) {
  const normalizedText = normalizeText(text);
  const normalizedTerm = normalizeText(term).trim();

  if (!normalizedText || !normalizedTerm) {
    return false;
  }

  const pattern = new RegExp(
    `(^|[^\\p{L}\\p{N}_])${escapeRegExp(normalizedTerm)}(?=$|[^\\p{L}\\p{N}_])`,
    'u',
  );

  return pattern.test(normalizedText);
}

function findMatchedTerm(text, terms) {
  return terms.find((term) => containsTerm(text, term)) ?? null;
}

function collectPrimitiveValues(value, output = []) {
  if (value === null || value === undefined) {
    return output;
  }

  if (
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  ) {
    output.push(String(value));
    return output;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      collectPrimitiveValues(item, output);
    }
    return output;
  }

  if (typeof value === 'object') {
    for (const key of Object.keys(value).sort(compareText)) {
      collectPrimitiveValues(value[key], output);
    }
  }

  return output;
}

function nodeSearchText(node) {
  return [
    node?.title,
    node?.subtype,
    ...collectPrimitiveValues(node?.props),
  ]
    .filter((value) => value !== null && value !== undefined && value !== '')
    .join(' ');
}

function edgeSearchText(edge) {
  return collectPrimitiveValues(edge?.props).join(' ');
}

function transitionTrigger(edge) {
  return typeof edge?.props?.trigger === 'string'
    ? edge.props.trigger.trim()
    : '';
}

function normalizeSource(source, kind, label) {
  if (!source || typeof source.file !== 'string' || !source.file.trim()) {
    return null;
  }

  const line = Number(source.line);
  if (!Number.isInteger(line) || line < 1) {
    return null;
  }

  return {
    file: source.file.trim(),
    line,
    kind,
    label,
  };
}

function sourceOfNode(node, label = null) {
  return normalizeSource(
    node?.source,
    'node',
    label ?? node?.key ?? node?.title ?? 'node',
  );
}

function sourceOfEdge(edge, label = null) {
  return normalizeSource(
    edge?.source,
    'edge',
    label ?? `${edge?.from ?? '?'} → ${edge?.to ?? '?'}`,
  );
}

function uniqueEvidence(items) {
  const seen = new Set();
  const result = [];

  for (const item of items.flat(Infinity)) {
    if (!item) {
      continue;
    }

    const identity = `${item.file}:${item.line}:${item.kind}:${item.label}`;
    if (seen.has(identity)) {
      continue;
    }

    seen.add(identity);
    result.push(item);
  }

  return result.sort(
    (a, b) =>
      compareText(a.file, b.file) ||
      a.line - b.line ||
      compareText(a.kind, b.kind) ||
      compareText(a.label, b.label),
  );
}

function edgeSortKey(edge) {
  const source = edge?.source;
  return [
    edge?.from,
    edge?.to,
    edge?.type,
    transitionTrigger(edge),
    source?.file,
    source?.line,
  ]
    .map((value) => String(value ?? ''))
    .join('\u0000');
}

function transitionDetails(edge) {
  const evidence = sourceOfEdge(edge);
  return {
    from: edge.from,
    to: edge.to,
    trigger: transitionTrigger(edge) || null,
    evidence: evidence ? [evidence] : [],
  };
}

function describeTransition(edge, nodeByKey) {
  const fromNode = nodeByKey.get(edge.from);
  const toNode = nodeByKey.get(edge.to);
  const fromTitle = fromNode?.title || edge.from;
  const toTitle = toNode?.title || edge.to;
  const trigger = transitionTrigger(edge);

  return trigger
    ? `${fromTitle} → ${toTitle} — “${trigger}”`
    : `${fromTitle} → ${toTitle}`;
}

function analyzeStateGaps(feature, nodes, edges, nodeByKey) {
  const findings = [];
  const notes = [];

  const machines = nodes
    .filter(
      (node) => node.type === 'state_machine' && node.feature === feature,
    )
    .sort((a, b) => compareText(a.key, b.key));

  if (machines.length === 0) {
    return {
      status: 'not-analyzable',
      findings,
      notes: [
        'Chưa có srs/states.md nên không soi được luồng trạng thái; có thể chạy /state để bổ sung.',
      ],
    };
  }

  const containsStateEdges = edges.filter(
    (edge) => edge.type === 'CONTAINS_STATE',
  );
  const allTransitions = edges
    .filter((edge) => edge.type === 'CONTAINS_TRANSITION')
    .sort((a, b) => compareText(edgeSortKey(a), edgeSortKey(b)));

  for (const machine of machines) {
    const stateKeys = new Set(
      containsStateEdges
        .filter((edge) => edge.from === machine.key)
        .map((edge) => edge.to),
    );

    const states = [...stateKeys]
      .map((key) => nodeByKey.get(key))
      .filter((node) => node?.type === 'state')
      .sort((a, b) => compareText(a.key, b.key));

    if (states.length === 0) {
      notes.push(
        `State machine ${machine.key} chưa có state nối bằng CONTAINS_STATE; không đủ dữ liệu để phân tích.`,
      );
      continue;
    }

    const transitions = allTransitions.filter(
      (edge) => stateKeys.has(edge.from) && stateKeys.has(edge.to),
    );

    const incoming = new Map(states.map((state) => [state.key, []]));
    const outgoing = new Map(states.map((state) => [state.key, []]));

    for (const transition of transitions) {
      outgoing.get(transition.from)?.push(transition);
      incoming.get(transition.to)?.push(transition);
    }

    for (const state of states) {
      const stateEvidence = sourceOfNode(state);
      if (!stateEvidence) {
        notes.push(
          `Bỏ qua ${state.key} vì node không có evidence source file:line.`,
        );
        continue;
      }

      const inTransitions = incoming.get(state.key) ?? [];
      const outTransitions = outgoing.get(state.key) ?? [];
      const inDegree = inTransitions.length;
      const outDegree = outTransitions.length;
      const relatedTransitions = [...inTransitions, ...outTransitions].sort(
        (a, b) => compareText(edgeSortKey(a), edgeSortKey(b)),
      );
      const transitionDescriptions = relatedTransitions.map((edge) =>
        describeTransition(edge, nodeByKey),
      );
      const evidence = uniqueEvidence([
        stateEvidence,
        relatedTransitions.map((edge) => sourceOfEdge(edge)),
      ]);

      // `[*]` của mermaid không sinh node, nên KG đánh cờ is_initial/is_terminal
      // lên chính state thật (kg-build.mjs parseStates). Tôn trọng cờ này:
      // state khai báo `X --> [*]` là KẾT THÚC CÓ CHỦ ĐÍCH, không phải dead-end;
      // state khai báo `[*] --> X` là KHỞI TẠO, không phải unreachable.
      // Bỏ qua cờ = báo gap giả cho mọi link/session hết đời (nhiễu → BA phớt lờ).
      // LƯU Ý: kg-build serialize props → giá trị về dạng CHUỖI ('true'),
      // không phải boolean. So `=== true` sẽ luôn sai. Nhận cả 2 kiểu.
      const stateProps = state.props ?? {};
      const isDeclaredTerminal = isTruthyFlag(stateProps.is_terminal);
      const isDeclaredInitial = isTruthyFlag(stateProps.is_initial);

      // Tên state mang nghĩa "hết đời/hoàn tất" → dead-end nhiều khả năng là
      // kết thúc TỰ NHIÊN (link đã dùng, session đã thu hồi), chỉ là tài liệu
      // chưa viết `X --> [*]`. Vẫn BÁO (có thể là gap thật) nhưng hạ mức + đổi
      // câu hỏi, để không chôn vùi dead-end đáng ngờ như `locked` giữa đám nhiễu.
      // KHÔNG im lặng: im lặng = giấu gap thật.
      const TERMINAL_SEMANTICS = [
        'used', 'expired', 'revoked', 'canceled', 'cancelled', 'refunded',
        'succeeded', 'failed', 'closed', 'completed', 'done', 'archived',
        'deleted', 'rejected', 'da-huy', 'hoan-tat', 'ket-thuc',
      ];
      const titleSlug = String(state.title || '').trim().toLowerCase();
      const looksTerminal = TERMINAL_SEMANTICS.includes(titleSlug);

      if (inDegree > 0 && outDegree === 0 && !isDeclaredTerminal) {
        findings.push({
          id: `STATE-DEAD-END:${state.key}`,
          kind: looksTerminal ? 'dead-end-likely-terminal' : 'dead-end',
          level: looksTerminal ? 'yếu' : 'mạnh',
          machine: machine.key,
          state: state.key,
          stateTitle: state.title || state.key,
          inDegree,
          outDegree,
          detection:
            (looksTerminal
              ? `Trạng thái “${state.title || state.key}” vào được nhưng không có đường ra ` +
                `(in=${inDegree}, out=${outDegree}) — tên gợi ý đây là điểm kết thúc tự nhiên.`
              : `Vào được trạng thái “${state.title || state.key}” nhưng KHÔNG có đường ra ` +
                `(in=${inDegree}, out=${outDegree}) — nghi thiếu luồng thoát.`) +
            (transitionDescriptions.length
              ? ` Chuyển tiếp liên quan: ${transitionDescriptions.join('; ')}.`
              : ''),
          evidence,
          question: looksTerminal
            ? 'Nhiều khả năng đúng — nếu là kết thúc có chủ đích, bổ sung `' +
              `${state.title || 'state'} --> [*]` +
              '` vào states.md để lần sau không báo lại.'
            : 'Vào rồi ở lại đây vĩnh viễn — có luồng nào đưa ra khỏi trạng thái này không (mở khóa / hủy / retry)?',
          transitions: relatedTransitions.map(transitionDetails),
        });
        continue;
      }

      if (inDegree === 0 && outDegree > 0 && !isDeclaredInitial) {
        findings.push({
          id: `STATE-UNREACHABLE:${state.key}`,
          kind: 'unreachable',
          level: 'yếu',
          machine: machine.key,
          state: state.key,
          stateTitle: state.title || state.key,
          inDegree,
          outDegree,
          detection:
            `Có đường ra từ trạng thái “${state.title || state.key}” nhưng chưa thấy đường vào ` +
            `(in=${inDegree}, out=${outDegree}); đây có thể là trạng thái khởi tạo, cần xác nhận.` +
            (transitionDescriptions.length
              ? ` Chuyển tiếp liên quan: ${transitionDescriptions.join('; ')}.`
              : ''),
          evidence,
          question:
            'Đây có phải trạng thái khởi tạo có chủ đích, hay cần mô tả thêm đường chuyển vào?',
          transitions: relatedTransitions.map(transitionDetails),
        });
        continue;
      }

      // State `[*] --> Only --> [*]` (vừa initial vừa terminal, degree 0) là
      // lifecycle 1-trạng-thái HỢP LỆ — đừng báo isolated. Chỉ báo khi thật sự
      // không có cờ nào (khai báo lửng lơ, không nối vào máy trạng thái).
      if (inDegree === 0 && outDegree === 0 && !isDeclaredInitial && !isDeclaredTerminal) {
        findings.push({
          id: `STATE-ISOLATED:${state.key}`,
          kind: 'isolated',
          level: 'cần xác nhận',
          machine: machine.key,
          state: state.key,
          stateTitle: state.title || state.key,
          inDegree,
          outDegree,
          detection:
            `Trạng thái “${state.title || state.key}” đã được khai báo nhưng chưa thấy ` +
            'chuyển tiếp vào hoặc ra (in=0, out=0).',
          evidence,
          question:
            'Trạng thái này có chủ đích đứng độc lập, hay cần nối vào luồng trạng thái?',
          transitions: [],
        });
      }
    }

    // Reachability toàn cục — degree cục bộ không bắt được 2 gap thật:
    //   (a) cụm state có in/out đầy đủ nhưng TÁCH khỏi initial → không ai tới được
    //   (b) state tới được từ initial nhưng KHÔNG có đường tới terminal nào → kẹt
    // Chỉ chạy khi có mốc initial/terminal khai báo (nếu không, bỏ qua — tránh bịa).
    const initials = states.filter((s) =>
      isTruthyFlag((s.props ?? {}).is_initial),
    );
    const terminals = states.filter((s) =>
      isTruthyFlag((s.props ?? {}).is_terminal),
    );

    if (initials.length > 0) {
      const forward = bfsReach(
        initials.map((s) => s.key),
        (key) => (outgoing.get(key) ?? []).map((e) => e.to),
      );
      for (const state of states) {
        if (forward.has(state.key)) continue;
        const ev = sourceOfNode(state);
        if (!ev) continue;
        findings.push({
          id: `STATE-UNREACHABLE-GLOBAL:${state.key}`,
          kind: 'unreachable-global',
          level: 'mạnh',
          machine: machine.key,
          state: state.key,
          stateTitle: state.title || state.key,
          detection:
            `Trạng thái “${state.title || state.key}” không đi tới được từ bất kỳ ` +
            'trạng thái khởi tạo nào (nằm ngoài luồng chính) — nghi luồng rời rạc.',
          evidence: uniqueEvidence([ev]),
          question:
            'Có luồng nào thật sự dẫn tới trạng thái này không, hay nó bị tách khỏi máy trạng thái?',
          transitions: [],
        });
      }
    }

    if (terminals.length > 0) {
      const backward = bfsReach(
        terminals.map((s) => s.key),
        (key) => (incoming.get(key) ?? []).map((e) => e.from),
      );
      for (const state of states) {
        if (backward.has(state.key)) continue;
        // Đã báo dead-end/terminal thì thôi, tránh trùng.
        if ((outgoing.get(state.key) ?? []).length === 0) continue;
        const ev = sourceOfNode(state);
        if (!ev) continue;
        findings.push({
          id: `STATE-NO-EXIT-PATH:${state.key}`,
          kind: 'no-exit-path',
          level: 'mạnh',
          machine: machine.key,
          state: state.key,
          stateTitle: state.title || state.key,
          detection:
            `Từ trạng thái “${state.title || state.key}” không có đường nào dẫn tới ` +
            'trạng thái kết thúc — user có thể bị kẹt trong vòng lặp không lối ra.',
          evidence: uniqueEvidence([ev]),
          question:
            'Có luồng nào đưa trạng thái này (hoặc chuỗi sau nó) đến điểm kết thúc không?',
          transitions: [],
        });
      }
    }
  }

  findings.sort((a, b) => compareText(a.id, b.id));

  return {
    status: findings.length ? 'findings' : 'no-findings',
    findings,
    notes,
  };
}

// kg-build serialize props → cờ về dạng CHUỖI ('true'), không phải boolean.
// Nhận cả 2 kiểu (module scope: dùng ở cả vòng per-state lẫn reachability).
function isTruthyFlag(v) {
  return v === true || v === 'true';
}

// BFS trên đồ thị state: trả tập key tới được từ seeds theo hàm neighbors.
function bfsReach(seeds, neighbors) {
  const seen = new Set(seeds);
  const queue = [...seeds];
  while (queue.length) {
    const cur = queue.shift();
    for (const next of neighbors(cur)) {
      if (!seen.has(next)) {
        seen.add(next);
        queue.push(next);
      }
    }
  }
  return seen;
}

function transitionActionText(edge, nodeByKey) {
  const fromNode = nodeByKey.get(edge.from);
  const toNode = nodeByKey.get(edge.to);

  return {
    trigger: transitionTrigger(edge),
    fromTitle: fromNode?.title || '',
    toTitle: toNode?.title || '',
    combined: [
      transitionTrigger(edge),
      fromNode?.title,
      toNode?.title,
    ]
      .filter(Boolean)
      .join(' '),
  };
}

function detectPairLeft(texts, pair) {
  const rightInTrigger = findMatchedTerm(texts.trigger, pair.rightTerms);
  const rightInTarget = findMatchedTerm(texts.toTitle, pair.rightTerms);

  // Tránh coi “mở khóa” là hành động “khóa”.
  if (rightInTrigger || rightInTarget) {
    return null;
  }

  const triggerTerm = findMatchedTerm(texts.trigger, pair.leftTerms);
  if (triggerTerm) {
    return { term: triggerTerm, location: 'trigger' };
  }

  const targetTerm = findMatchedTerm(texts.toTitle, pair.leftTerms);
  if (targetTerm) {
    return { term: targetTerm, location: 'tên trạng thái đích' };
  }

  // KHÔNG suy hành động từ tên trạng thái NGUỒN: `Locked --> Suspended` (trigger
  // "timeout") không phải hành động "khóa" — chữ "Locked" chỉ là nơi XUẤT PHÁT.
  // Suy từ source sinh false-positive cho mọi edge đi ra khỏi Locked/Enabled/...
  return null;
}

function hasRightAction(edge, pair, nodeByKey) {
  const texts = transitionActionText(edge, nodeByKey);
  return Boolean(
    findMatchedTerm(texts.trigger, pair.rightTerms) ||
      findMatchedTerm(texts.toTitle, pair.rightTerms),
  );
}

function analyzeReversePairGaps(feature, nodes, edges, nodeByKey) {
  const findings = [];
  const notes = [];

  const transitions = edges
    .filter((edge) => {
      if (edge.type !== 'CONTAINS_TRANSITION') {
        return false;
      }

      const fromNode = nodeByKey.get(edge.from);
      const toNode = nodeByKey.get(edge.to);

      return (
        fromNode?.type === 'state' &&
        toNode?.type === 'state' &&
        fromNode.feature === feature &&
        toNode.feature === feature
      );
    })
    .sort((a, b) => compareText(edgeSortKey(a), edgeSortKey(b)));

  for (const transition of transitions) {
    const texts = transitionActionText(transition, nodeByKey);

    for (const pair of REVERSE_PAIRS) {
      const leftMatch = detectPairLeft(texts, pair);
      if (!leftMatch) {
        continue;
      }

      // Một edge quay về (to->from) KHÔNG đủ để coi là "đã có chiều ngược":
      // `Active --lock--> Locked` rồi `Locked --admin review--> Active` KHÔNG phải
      // là "mở khóa". Chỉ tính khi edge đi RA từ trạng thái đích thật sự mang
      // hành động NGƯỢC (trigger/target match rightTerms), bất kể nó về đâu.
      const rightActionExists = transitions.some(
        (candidate) =>
          candidate.from === transition.to &&
          hasRightAction(candidate, pair, nodeByKey),
      );

      if (rightActionExists) {
        continue;
      }

      const transitionEvidence = sourceOfEdge(transition);
      if (!transitionEvidence) {
        notes.push(
          `Bỏ qua ${transition.from} → ${transition.to} cho cặp ${pair.left}/${pair.right} ` +
            'vì transition không có evidence source file:line.',
        );
        continue;
      }

      const fromNode = nodeByKey.get(transition.from);
      const toNode = nodeByKey.get(transition.to);
      const evidence = uniqueEvidence([
        transitionEvidence,
        sourceOfNode(fromNode),
        sourceOfNode(toNode),
      ]);

      findings.push({
        id:
          `REVERSE-PAIR:${transition.from}->${transition.to}:` +
          `${pair.left}->${pair.right}`,
        kind: 'reverse-pair',
        level: 'ứng viên',
        from: transition.from,
        to: transition.to,
        trigger: transitionTrigger(transition) || null,
        pair: {
          left: pair.left,
          right: pair.right,
          matchedTerm: leftMatch.term,
          matchedAt: leftMatch.location,
        },
        detection:
          `Có dấu hiệu “${pair.left}” tại ${leftMatch.location} của chuyển tiếp ` +
          `“${fromNode?.title || transition.from} → ${toNode?.title || transition.to}”, ` +
          `nhưng chưa thấy chiều về trực tiếp hoặc chuyển tiếp từ trạng thái đích có dấu hiệu “${pair.right}”.`,
        evidence,
        question:
          `Có “${pair.left}”, chưa thấy “${pair.right}” — xác nhận có chủ đích bỏ qua hay cần bổ sung?`,
      });
    }
  }

  findings.sort((a, b) => compareText(a.id, b.id));

  return {
    status: findings.length ? 'findings' : 'no-findings',
    findings,
    notes,
  };
}

function buildEntityRecords(entity, edges, nodeByKey) {
  const records = [];
  const entityEvidence = sourceOfNode(entity);

  if (entityEvidence) {
    records.push({
      text: nodeSearchText(entity),
      evidence: entityEvidence,
      relation: 'entity',
    });
  }

  const incidentEdges = edges
    .filter((edge) => edge.from === entity.key || edge.to === entity.key)
    .sort((a, b) => compareText(edgeSortKey(a), edgeSortKey(b)));

  for (const edge of incidentEdges) {
    const edgeEvidence = sourceOfEdge(edge);
    if (edgeEvidence) {
      records.push({
        text: edgeSearchText(edge),
        evidence: edgeEvidence,
        relation: edge.type,
      });
    }

    const neighborKey = edge.from === entity.key ? edge.to : edge.from;
    const neighbor = nodeByKey.get(neighborKey);
    const neighborEvidence = sourceOfNode(neighbor);

    if (neighbor && neighborEvidence) {
      records.push({
        text: nodeSearchText(neighbor),
        evidence: neighborEvidence,
        relation: `neighbor:${edge.type}`,
      });
    }
  }

  return records;
}

function analyzeCrudGaps(feature, nodes, edges, nodeByKey) {
  const findings = [];
  const notes = [];

  const entities = nodes
    .filter((node) => node.type === 'entity' && node.feature === feature)
    .sort((a, b) => compareText(a.key, b.key));

  if (entities.length === 0) {
    return {
      status: 'not-analyzable',
      findings,
      notes: [
        'Feature chưa có entity trong knowledge graph nên không đủ dữ liệu để đối chiếu CRUD.',
      ],
    };
  }

  for (const entity of entities) {
    const records = buildEntityRecords(entity, edges, nodeByKey);
    const baseEvidence = uniqueEvidence(
      records.map((record) => record.evidence),
    );

    if (baseEvidence.length === 0) {
      notes.push(
        `Entity ${entity.key} không có evidence source file:line; không tạo finding.`,
      );
      continue;
    }

    const operationResults = CRUD_OPERATIONS.map((operation) => {
      const matches = [];

      for (const record of records) {
        const matchedTerm = findMatchedTerm(record.text, operation.terms);
        if (matchedTerm) {
          matches.push({
            term: matchedTerm,
            evidence: record.evidence,
          });
        }
      }

      return {
        code: operation.code,
        label: operation.label,
        present: matches.length > 0,
        matchedTerms: [...new Set(matches.map((match) => match.term))].sort(
          compareText,
        ),
        evidence: uniqueEvidence(matches.map((match) => match.evidence)),
      };
    });

    const present = operationResults.filter((result) => result.present);
    const missing = operationResults.filter((result) => !result.present);

    // KHÔNG thấy tín hiệu CRUD nào = KG không model đủ (edge OPERATES_ON không
    // tồn tại trong graph này) → keyword-match trên ERD chỉ ra "không đủ dữ liệu"
    // hàng loạt = nhiễu thuần, không giúp BA. IM LẶNG thay vì hỏi câu vô nghĩa.
    // (Ghi note để không giả vờ đã kiểm CRUD.)
    if (present.length === 0) {
      notes.push(
        `Bỏ qua CRUD cho ${entity.key}: graph không có tín hiệu thao tác nào — ` +
          'cần đọc UC prose để đối chiếu CRUD thật, engine không kết luận được.',
      );
      continue;
    }

    if (missing.length === 0) {
      notes.push(
        `Entity ${entity.key}: không phát hiện ô CRUD chưa được nhắc tới.`,
      );
      continue;
    }

    const evidence = uniqueEvidence([
      sourceOfNode(entity),
      present.map((result) => result.evidence),
    ]);

    if (evidence.length === 0) {
      notes.push(
        `Bỏ qua ứng viên CRUD của ${entity.key} vì không có evidence file:line.`,
      );
      continue;
    }

    const presentText = present
      .map((result) => `${result.code} (${result.label})`)
      .join(', ');
    const missingText = missing
      .map((result) => `${result.code} (${result.label})`)
      .join(', ');

    findings.push({
      id: `CRUD-MISSING:${entity.key}:${missing.map((item) => item.code).join('')}`,
      kind: 'crud-candidate',
      level: 'cần xác nhận',
      entity: entity.key,
      entityTitle: entity.title || entity.key,
      present: present.map((result) => result.code),
      missing: missing.map((result) => result.code),
      detection:
        `Với entity “${entity.title || entity.key}”, đã thấy tín hiệu ${presentText}; ` +
        `chưa thấy tín hiệu ${missingText} trong phạm vi dữ liệu liên quan.`,
      evidence,
      question:
        `Các thao tác ${missingText} có chủ đích không áp dụng, hay cần bổ sung vào tài liệu/luồng?`,
      operations: operationResults,
    });
  }

  findings.sort((a, b) => compareText(a.id, b.id));

  return {
    status: findings.length ? 'findings' : 'no-findings',
    findings,
    notes,
  };
}

function markdownEscape(value) {
  return String(value ?? '')
    .replace(/\|/g, '\\|')
    .replace(/\r?\n/g, '<br>');
}

function formatEvidence(evidence) {
  return evidence
    .map(
      (item) =>
        `\`${markdownEscape(item.file)}:${item.line}\` (${markdownEscape(item.label)})`,
    )
    .join('<br>');
}

function renderFindingsTable(findings) {
  // Sắp mạnh→yếu để gap đáng ngờ không bị chôn dưới nhiễu kết-thúc-tự-nhiên.
  const rank = { 'mạnh': 0, 'cần xác nhận': 1, 'yếu': 2 };
  const sorted = [...findings].sort(
    (a, b) => (rank[a.level] ?? 1) - (rank[b.level] ?? 1),
  );

  const lines = [
    '| Mức | Phát hiện | Bằng chứng (file:line) | Câu hỏi cho BA |',
    '|---|---|---|---|',
  ];

  for (const finding of sorted) {
    lines.push(
      `| ${markdownEscape(finding.level || '?')} | ` +
        `${markdownEscape(finding.detection)} | ` +
        `${formatEvidence(finding.evidence)} | ` +
        `${markdownEscape(finding.question)} |`,
    );
  }

  return lines.join('\n');
}

function renderSection(title, result, emptyMessage) {
  const lines = [`## ${title}`, ''];

  if (result.findings.length > 0) {
    lines.push(renderFindingsTable(result.findings));
  } else {
    lines.push(emptyMessage);
  }

  if (result.notes.length > 0) {
    lines.push('', ...result.notes.map((note) => `- ${note}`));
  }

  return lines.join('\n');
}

function renderMarkdown(report) {
  return [
    `# Báo cáo gap luồng nghiệp vụ: \`${markdownEscape(report.feature)}\``,
    '',
    renderSection(
      'A. STATE-GAP',
      report.algorithms.stateGap,
      report.algorithms.stateGap.status === 'not-analyzable'
        ? 'Chưa có srs/states.md nên không soi được luồng trạng thái; có thể chạy `/state` để bổ sung.'
        : 'Không phát hiện ứng viên gap trạng thái từ dữ liệu hiện có.',
    ),
    '',
    renderSection(
      'B. REVERSE-PAIR-GAP',
      report.algorithms.reversePairGap,
      'Không phát hiện cặp hành động đối nghịch bị thiếu chiều về từ dữ liệu hiện có.',
    ),
    '',
    renderSection(
      'C. CRUD-GAP',
      report.algorithms.crudGap,
      report.algorithms.crudGap.status === 'not-analyzable'
        ? 'Không đủ dữ liệu entity để đối chiếu CRUD.'
        : 'Không phát hiện ô CRUD cần xác nhận từ dữ liệu hiện có.',
    ),
  ].join('\n');
}

function createReport(feature, graph, graphPath) {
  const nodes = graph.nodes;
  const edges = graph.edges;
  const nodeByKey = new Map(
    nodes
      .filter((node) => typeof node?.key === 'string')
      .map((node) => [node.key, node]),
  );

  const featureExists = nodes.some((node) => node.feature === feature);
  if (!featureExists) {
    throw new CliError(`Feature “${feature}” không tồn tại trong graph.`);
  }

  const stateGap = analyzeStateGaps(feature, nodes, edges, nodeByKey);
  const reversePairGap = analyzeReversePairGaps(
    feature,
    nodes,
    edges,
    nodeByKey,
  );
  const crudGap = analyzeCrudGaps(feature, nodes, edges, nodeByKey);

  return {
    feature,
    graph: path.relative(process.cwd(), graphPath) || path.basename(graphPath),
    algorithms: {
      stateGap,
      reversePairGap,
      crudGap,
    },
    summary: {
      stateGapFindings: stateGap.findings.length,
      reversePairGapFindings: reversePairGap.findings.length,
      crudGapFindings: crudGap.findings.length,
      totalFindings:
        stateGap.findings.length +
        reversePairGap.findings.length +
        crudGap.findings.length,
    },
  };
}

function printFeatures(graph, asJson) {
  const features = [
    ...new Set(
      graph.nodes
        .map((node) => node?.feature)
        .filter(
          (feature) => typeof feature === 'string' && feature.trim() !== '',
        ),
    ),
  ].sort(compareText);

  if (asJson) {
    process.stdout.write(`${JSON.stringify({ features }, null, 2)}\n`);
    return;
  }

  const output = [
    '# Danh sách feature',
    '',
    ...(features.length
      ? features.map((feature) => `- ${feature}`)
      : ['Không có feature trong graph.']),
  ];

  process.stdout.write(`${output.join('\n')}\n`);
}

function fail(message) {
  process.stderr.write(`KG-ERROR: ${message}\n`);
  process.exitCode = 2;
}

function main() {
  try {
    const options = parseArgs(process.argv.slice(2));
    const graphPath = path.resolve(process.cwd(), options.graphPath);
    const graph = readGraph(graphPath);

    if (options.listFeatures) {
      printFeatures(graph, options.json);
      return;
    }

    const report = createReport(options.feature, graph, graphPath);

    if (options.json) {
      process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
      return;
    }

    process.stdout.write(`${renderMarkdown(report)}\n`);
  } catch (error) {
    fail(error instanceof Error ? error.message : String(error));
  }
}

main();
