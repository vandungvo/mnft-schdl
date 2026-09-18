#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const DEFAULT_GRAPH = 'docs/_shared/kg/graph.json';
const DEFAULT_OUT = 'docs/_shared/kg/kg-viewer.html';

function fail(message) {
  console.error('KG-ERROR: ' + message + ' — chạy kg-build.mjs trước');
  process.exit(2);
}

function parseArgs(argv) {
  const options = { graph: DEFAULT_GRAPH, out: DEFAULT_OUT };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--graph' || arg === '--out') {
      const value = argv[i + 1];
      if (!value || value.startsWith('--')) {
        fail('thiếu giá trị cho ' + arg);
      }
      options[arg.slice(2)] = value;
      i += 1;
    } else if (arg === '--help' || arg === '-h') {
      console.log('node kg-viewer.mjs [--graph docs/_shared/kg/graph.json] [--out docs/_shared/kg/kg-viewer.html]');
      process.exit(0);
    } else {
      fail('tham số không hợp lệ: ' + arg);
    }
  }

  return options;
}

const options = parseArgs(process.argv.slice(2));
const graphPath = path.resolve(process.cwd(), options.graph);
const outPath = path.resolve(process.cwd(), options.out);

let graph;
try {
  graph = JSON.parse(fs.readFileSync(graphPath, 'utf8'));
} catch (error) {
  fail('không đọc được graph.json (' + error.message + ')');
}

if (
  !graph ||
  !graph.meta ||
  Number(graph.meta.schema_version) !== 1 ||
  !Array.isArray(graph.nodes) ||
  !Array.isArray(graph.edges) ||
  graph.nodes.length === 0
) {
  fail('graph.json vắng hoặc sai schema');
}

const graphPayload = JSON.stringify(graph)
  .replace(/<\/script/gi, '<\\/script')
  .replace(/<!--/g, '<\\!--')
  .replace(/\u2028/g, '\\u2028')
  .replace(/\u2029/g, '\\u2029');

const html = `<!doctype html>
<html lang="vi">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Knowledge Graph Viewer</title>
<style>
:root {
  color-scheme: light;
  --bg: #f5f7fb;
  --panel: #ffffff;
  --border: #dce3ee;
  --text: #172033;
  --muted: #68758b;
  --accent: #2563eb;
  --shadow: 0 8px 30px rgba(24, 39, 75, .08);
}
* { box-sizing: border-box; }
html, body { width: 100%; height: 100%; margin: 0; overflow: hidden; }
body {
  background: var(--bg);
  color: var(--text);
  font: 13px/1.45 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
}
button, input, select { font: inherit; }
button {
  border: 1px solid var(--border);
  border-radius: 7px;
  color: var(--text);
  background: #fff;
  cursor: pointer;
}
button:hover { border-color: #94a3b8; background: #f8fafc; }
#app {
  display: grid;
  grid-template-rows: auto 1fr;
  width: 100%;
  height: 100%;
}
header {
  display: flex;
  align-items: center;
  gap: 14px;
  min-height: 62px;
  padding: 10px 16px;
  border-bottom: 1px solid var(--border);
  background: var(--panel);
  z-index: 2;
}
header h1 { margin: 0; font-size: 17px; white-space: nowrap; }
#build-meta { color: var(--muted); font-size: 12px; }
#derived-note {
  margin-left: auto;
  max-width: 610px;
  color: #8a5a00;
  font-size: 11px;
  text-align: right;
}
#workspace {
  display: grid;
  grid-template-columns: 270px minmax(300px, 1fr) 350px;
  min-height: 0;
}
.sidebar, #detail {
  overflow: auto;
  background: var(--panel);
  padding: 14px;
}
.sidebar { border-right: 1px solid var(--border); }
#detail { border-left: 1px solid var(--border); }
#graph-area {
  position: relative;
  min-width: 0;
  overflow: hidden;
  background:
    radial-gradient(circle at 1px 1px, rgba(100,116,139,.15) 1px, transparent 0) 0 0 / 20px 20px,
    #f8fafc;
}
#canvas { display: block; width: 100%; height: 100%; touch-action: none; cursor: grab; }
#canvas.dragging { cursor: grabbing; }
#stats {
  position: absolute;
  top: 12px;
  left: 12px;
  padding: 6px 9px;
  border: 1px solid rgba(203,213,225,.9);
  border-radius: 7px;
  background: rgba(255,255,255,.92);
  box-shadow: 0 2px 10px rgba(30,41,59,.08);
  color: #475569;
  font-size: 12px;
  pointer-events: none;
}
#layout-button {
  position: absolute;
  right: 12px;
  top: 12px;
  padding: 7px 10px;
  box-shadow: 0 2px 10px rgba(30,41,59,.08);
}
h2 {
  margin: 0 0 10px;
  font-size: 13px;
}
.section {
  margin: 0 -14px;
  padding: 0 14px 14px;
  border-bottom: 1px solid #edf1f6;
}
.section + .section { padding-top: 14px; }
label { display: block; color: #475569; font-size: 12px; font-weight: 600; }
select, input[type="search"] {
  width: 100%;
  margin-top: 5px;
  padding: 7px 8px;
  border: 1px solid var(--border);
  border-radius: 7px;
  outline: none;
  background: #fff;
}
select:focus, input:focus { border-color: var(--accent); box-shadow: 0 0 0 3px rgba(37,99,235,.12); }
#search-results {
  display: none;
  max-height: 180px;
  margin-top: 5px;
  overflow: auto;
  border: 1px solid var(--border);
  border-radius: 7px;
  background: #fff;
}
.search-result {
  display: block;
  width: 100%;
  padding: 7px 8px;
  border: 0;
  border-bottom: 1px solid #eef2f7;
  border-radius: 0;
  text-align: left;
}
.search-result:last-child { border-bottom: 0; }
.search-result strong, .edge-key { color: #1d4ed8; font-size: 11px; }
.search-result span { display: block; overflow: hidden; color: #64748b; font-size: 11px; text-overflow: ellipsis; white-space: nowrap; }
.check-list { max-height: 255px; overflow: auto; }
.check-row {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 3px 0;
  color: #334155;
  font-size: 12px;
  font-weight: 400;
}
.check-row input { margin: 0; }
.legend-item {
  display: flex;
  align-items: center;
  width: 100%;
  gap: 7px;
  margin: 2px 0;
  padding: 4px 5px;
  border: 0;
  border-radius: 5px;
  background: transparent;
  text-align: left;
}
.legend-item.off { opacity: .38; text-decoration: line-through; }
.swatch { width: 10px; height: 10px; border-radius: 50%; flex: 0 0 auto; }
.legend-count { margin-left: auto; color: var(--muted); font-size: 11px; }
#empty-detail { color: var(--muted); padding-top: 8px; }
.detail-title { margin: 0 0 5px; font-size: 15px; line-height: 1.3; overflow-wrap: anywhere; }
.detail-key { margin-bottom: 13px; color: #1d4ed8; font: 11px ui-monospace, SFMono-Regular, Menlo, monospace; overflow-wrap: anywhere; }
.kv { display: grid; grid-template-columns: 76px 1fr; gap: 5px 8px; margin-bottom: 16px; font-size: 12px; }
.kv dt { color: var(--muted); }
.kv dd { margin: 0; overflow-wrap: anywhere; }
.edge-heading { margin: 16px 0 6px; font-size: 12px; }
.edge-table { width: 100%; border-collapse: collapse; font-size: 11px; }
.edge-table th { color: var(--muted); font-weight: 600; text-align: left; }
.edge-table td, .edge-table th { padding: 5px 3px; border-bottom: 1px solid #edf1f6; vertical-align: top; }
.edge-node {
  padding: 0;
  border: 0;
  border-radius: 0;
  background: none;
  color: #1d4ed8;
  text-align: left;
  overflow-wrap: anywhere;
}
.edge-node:hover { background: none; text-decoration: underline; }
.hidden { display: none !important; }
@media (max-width: 980px) {
  #workspace { grid-template-columns: 225px minmax(260px, 1fr) 285px; }
  #derived-note { display: none; }
}
</style>
</head>
<body>
<div id="app">
  <header>
    <h1>Knowledge Graph Viewer</h1>
    <span id="build-meta"></span>
    <span id="derived-note">Graph = DERIVED, xem cấu trúc; kết luận nội dung đọc prose (contract 3.4bis).</span>
  </header>
  <main id="workspace">
    <aside class="sidebar">
      <section class="section">
        <details>
          <summary style="cursor:pointer;font-weight:600;font-size:12px">ℹ️ Đọc trước khi xem (người mới)</summary>
          <ul style="margin:8px 0 0;padding-left:16px;color:#475569;font-size:11.5px;line-height:1.5">
            <li><b>Màu = LOẠI node</b> (yêu cầu, màn hình, story...), <b>không phải</b> trạng thái tốt/xấu — node đỏ không có nghĩa là lỗi.</li>
            <li>3 loại liên kết "nhiễu" (REFERENCES/CONTAINS/CATALOGS) đang <b>ẨN mặc định</b> — 2 node không nối nhau chưa chắc không liên quan; bật lại ở "Loại edge".</li>
            <li>Số node ≠ số hạng mục công việc — gồm cả tài liệu, câu hỏi mở, actor...</li>
            <li>Đây là <b>bản chụp để định hướng</b>; kết luận coverage/thiếu-sót dùng <code>/gap</code>, <code>/kg verify</code>; nội dung thì đọc tài liệu gốc.</li>
            <li>Bắt đầu: chọn 1 Feature ở dưới → tìm 1 mã (vd FR-...-011) → bấm node → lần theo bảng quan hệ ở panel phải.</li>
          </ul>
        </details>
      </section>
      <section class="section">
        <h2>Bộ lọc</h2>
        <label for="feature-filter">Feature</label>
        <select id="feature-filter"></select>
        <label for="search-box" style="margin-top:12px">Tìm node</label>
        <input id="search-box" type="search" autocomplete="off" placeholder="key hoặc tiêu đề...">
        <div id="search-results"></div>
      </section>
      <section class="section">
        <h2>Loại edge</h2>
        <div id="edge-filters" class="check-list"></div>
      </section>
      <section class="section">
        <h2>Legend — bấm để ẩn/hiện</h2>
        <div id="legend"></div>
      </section>
    </aside>
    <section id="graph-area">
      <canvas id="canvas" aria-label="Knowledge graph"></canvas>
      <div id="stats"></div>
      <button id="layout-button" type="button">Chạy lại layout</button>
    </section>
    <aside id="detail">
      <h2>Chi tiết node</h2>
      <div id="empty-detail">Bấm một node để xem metadata và các quan hệ vào/ra.</div>
      <div id="detail-content" class="hidden"></div>
    </aside>
  </main>
</div>

<script id="graph-data" type="application/json">${graphPayload}</script>
<script>
(function () {
  'use strict';

  var graph = JSON.parse(document.getElementById('graph-data').textContent);
  var nodes = graph.nodes || [];
  var edges = graph.edges || [];
  var canvas = document.getElementById('canvas');
  var area = document.getElementById('graph-area');
  var ctx = canvas.getContext('2d');
  var featureFilter = document.getElementById('feature-filter');
  var searchBox = document.getElementById('search-box');
  var searchResults = document.getElementById('search-results');
  var edgeFilters = document.getElementById('edge-filters');
  var legend = document.getElementById('legend');
  var stats = document.getElementById('stats');
  var detailContent = document.getElementById('detail-content');
  var emptyDetail = document.getElementById('empty-detail');
  var layoutButton = document.getElementById('layout-button');

  var palette = {
    feature: '#0f766e', doc: '#64748b', requirement: '#dc2626', error: '#be123c',
    bo: '#b45309', cap: '#7c3aed', use_case: '#2563eb', user_story: '#0284c7',
    acceptance_criterion: '#0891b2', screen: '#db2777', flow: '#7c3aed',
    entity: '#059669', state_machine: '#0d9488', state: '#14b8a6',
    bpmn_process: '#9333ea', db_schema: '#16a34a', open_question: '#ea580c',
    change_request: '#e11d48', jira_issue: '#1d4ed8', confluence_page: '#2563eb',
    research: '#a16207', test_checklist_item: '#4f46e5', test_case: '#4338ca',
    api_field: '#0369a1', actor: '#c2410c', external_service: '#475569'
  };
  var fallbackColors = ['#2563eb', '#7c3aed', '#db2777', '#dc2626', '#ea580c', '#ca8a04', '#16a34a', '#0891b2', '#0f766e', '#4f46e5', '#9333ea', '#64748b'];
  var nodeMap = new Map();
  var outgoing = new Map();
  var incoming = new Map();
  var visibleNodes = [];
  var visibleEdges = [];
  var enabledTypes = new Set();
  var enabledEdgeTypes = new Set();
  var selected = null;
  var hovered = null;
  var query = '';
  var alpha = 1;
  var ticks = 0;
  var animating = false;
  var dragging = null;
  var pointerStart = null;
  var viewport = { x: 0, y: 0, scale: 1 };
  var size = { width: 1, height: 1, dpr: 1 };

  nodes.forEach(function (node, index) {
    nodeMap.set(node.key, node);
    node.x = (Math.random() - 0.5) * 950;
    node.y = (Math.random() - 0.5) * 720;
    node.vx = 0;
    node.vy = 0;
    node.degree = 0;
    node.index = index;
    enabledTypes.add(node.type || 'unknown');
  });

  edges.forEach(function (edge) {
    if (!nodeMap.has(edge.from) || !nodeMap.has(edge.to)) return;
    if (!outgoing.has(edge.from)) outgoing.set(edge.from, []);
    if (!incoming.has(edge.to)) incoming.set(edge.to, []);
    outgoing.get(edge.from).push(edge);
    incoming.get(edge.to).push(edge);
    enabledEdgeTypes.add(edge.type || 'UNKNOWN');
  });

  var typeOrder = Array.from(enabledTypes).sort();
  var edgeTypeOrder = Array.from(enabledEdgeTypes).sort();

  // Deterministic (viewer auto-regen theo build — không nhúng giờ sinh tránh churn):
  // graph build --no-timestamp mang epoch 1970 → hiện "dữ liệu tính đến" = updated mới nhất trong graph.
  var buildTs = graph.meta && graph.meta.generated_at ? graph.meta.generated_at : null;
  if (!buildTs || buildTs.indexOf('1970-01-01') === 0) {
    var maxUpdated = '';
    graph.nodes.forEach(function (n) { if (n.updated && String(n.updated) > maxUpdated) maxUpdated = String(n.updated); });
    buildTs = 'dữ liệu tính đến ' + (maxUpdated || 'không rõ');
  }
  document.getElementById('build-meta').textContent = 'Build: ' + buildTs;

  function colorFor(type) {
    if (palette[type]) return palette[type];
    var n = 0;
    String(type || 'unknown').split('').forEach(function (char) { n += char.charCodeAt(0); });
    return fallbackColors[n % fallbackColors.length];
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function nodeName(node) {
    return node.title || node.key;
  }

  function nodeRadius(node) {
    return Math.min(15, 4.2 + Math.sqrt(node.degree || 0) * 1.65);
  }

  function isNodeVisible(node) {
    var wantedFeature = featureFilter.value;
    return enabledTypes.has(node.type || 'unknown') &&
      (!wantedFeature || String(node.feature || '') === wantedFeature);
  }

  function refreshGraph(restart) {
    visibleNodes = nodes.filter(isNodeVisible);
    var visibleKeys = new Set(visibleNodes.map(function (node) { return node.key; }));

    visibleEdges = edges.filter(function (edge) {
      return enabledEdgeTypes.has(edge.type || 'UNKNOWN') &&
        visibleKeys.has(edge.from) &&
        visibleKeys.has(edge.to);
    });

    visibleNodes.forEach(function (node) { node.degree = 0; });
    visibleEdges.forEach(function (edge) {
      nodeMap.get(edge.from).degree += 1;
      nodeMap.get(edge.to).degree += 1;
    });

    if (selected && !visibleKeys.has(selected.key)) selectNode(null);
    if (hovered && !visibleKeys.has(hovered.key)) hovered = null;

    stats.textContent = visibleNodes.length + ' / ' + nodes.length + ' node · ' +
      visibleEdges.length + ' / ' + edges.length + ' edge';
    if (nodes.length === 0) {
      stats.textContent = 'Vault chưa có dữ liệu — bắt đầu với /brainstorm hoặc /urd, graph sẽ tự đầy lên';
    } else if (visibleNodes.length === 0) {
      stats.textContent = '0 node hiện — filter đang ẩn hết; nới Feature/Legend/Loại edge ở panel trái';
    }

    if (restart) restartLayout(false);
    draw();
  }

  function buildFeatureFilter() {
    var features = Array.from(new Set(nodes.map(function (node) {
      return node.feature == null ? '' : String(node.feature);
    }))).sort(function (a, b) {
      if (!a) return -1;
      if (!b) return 1;
      return a.localeCompare(b);
    });

    featureFilter.innerHTML = '<option value="">(tất cả)</option>' +
      features.filter(function (feature) { return feature !== ''; }).map(function (feature) {
        return '<option value="' + escapeHtml(feature) + '">' + escapeHtml(feature) + '</option>';
      }).join('');
  }

  function buildEdgeFilters() {
    edgeFilters.innerHTML = edgeTypeOrder.map(function (type) {
      var hiddenByDefault = type === 'CONTAINS' || type === 'CATALOGS' || type === 'REFERENCES';
      if (hiddenByDefault) enabledEdgeTypes.delete(type);
      return '<label class="check-row">' +
        '<input type="checkbox" value="' + escapeHtml(type) + '"' + (hiddenByDefault ? '' : ' checked') + '>' +
        '<span>' + escapeHtml(type) + '</span></label>';
    }).join('');

    edgeFilters.addEventListener('change', function (event) {
      var input = event.target;
      if (input.type !== 'checkbox') return;
      if (input.checked) enabledEdgeTypes.add(input.value);
      else enabledEdgeTypes.delete(input.value);
      refreshGraph(true);
    });
  }

  function buildLegend() {
    legend.innerHTML = typeOrder.map(function (type) {
      var count = nodes.filter(function (node) { return (node.type || 'unknown') === type; }).length;
      return '<button type="button" class="legend-item" data-type="' + escapeHtml(type) + '">' +
        '<span class="swatch" style="background:' + colorFor(type) + '"></span>' +
        '<span>' + escapeHtml(type) + '</span><span class="legend-count">' + count + '</span></button>';
    }).join('');

    legend.addEventListener('click', function (event) {
      var button = event.target.closest('.legend-item');
      if (!button) return;
      var type = button.getAttribute('data-type');
      if (enabledTypes.has(type)) enabledTypes.delete(type);
      else enabledTypes.add(type);
      button.classList.toggle('off', !enabledTypes.has(type));
      refreshGraph(true);
    });
  }

  function resize() {
    var rect = area.getBoundingClientRect();
    size.width = Math.max(1, rect.width);
    size.height = Math.max(1, rect.height);
    size.dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(size.width * size.dpr);
    canvas.height = Math.round(size.height * size.dpr);
    canvas.style.width = size.width + 'px';
    canvas.style.height = size.height + 'px';
    ctx.setTransform(size.dpr, 0, 0, size.dpr, 0, 0);
    if (!viewport.x && !viewport.y) {
      viewport.x = size.width / 2;
      viewport.y = size.height / 2;
    }
    draw();
  }

  function toScreen(node) {
    return {
      x: node.x * viewport.scale + viewport.x,
      y: node.y * viewport.scale + viewport.y
    };
  }

  function toWorld(x, y) {
    return {
      x: (x - viewport.x) / viewport.scale,
      y: (y - viewport.y) / viewport.scale
    };
  }

  function edgeVisibleForDrawing(edge) {
    return enabledEdgeTypes.has(edge.type || 'UNKNOWN');
  }

  function draw() {
    ctx.clearRect(0, 0, size.width, size.height);
    ctx.save();
    ctx.lineCap = 'round';

    var edgeAlpha = visibleEdges.length > 900 ? 0.15 : 0.25;
    ctx.lineWidth = Math.max(.55, Math.min(1.2, viewport.scale * .75));
    visibleEdges.forEach(function (edge) {
      if (!edgeVisibleForDrawing(edge)) return;
      var from = nodeMap.get(edge.from);
      var to = nodeMap.get(edge.to);
      if (!from || !to) return;
      var a = toScreen(from);
      var b = toScreen(to);
      ctx.strokeStyle = 'rgba(100,116,139,' + edgeAlpha + ')';
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    });

    visibleNodes.forEach(function (node) {
      var point = toScreen(node);
      var radius = nodeRadius(node) * Math.max(.72, Math.min(1.35, viewport.scale));
      var isSelected = selected === node;
      var isHovered = hovered === node;
      var isMatch = query && ((node.key + ' ' + nodeName(node)).toLowerCase().indexOf(query) !== -1);

      if (isSelected || isHovered || isMatch) {
        ctx.beginPath();
        ctx.arc(point.x, point.y, radius + 4, 0, Math.PI * 2);
        ctx.fillStyle = isSelected ? 'rgba(37,99,235,.25)' : 'rgba(245,158,11,.25)';
        ctx.fill();
      }

      ctx.beginPath();
      ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
      ctx.fillStyle = colorFor(node.type || 'unknown');
      ctx.fill();
      ctx.lineWidth = isSelected ? 2 : 1;
      ctx.strokeStyle = isSelected ? '#172033' : 'rgba(255,255,255,.9)';
      ctx.stroke();

      if (viewport.scale >= 1.05 || isSelected || isHovered) {
        ctx.font = '12px -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif';
        ctx.textBaseline = 'middle';
        var label = node.title || node.key;
        if (label.length > 42) label = label.slice(0, 39) + '…';
        var textX = point.x + radius + 5;
        var textY = point.y;
        ctx.lineWidth = 3;
        ctx.strokeStyle = 'rgba(248,250,252,.93)';
        ctx.strokeText(label, textX, textY);
        ctx.fillStyle = '#1e293b';
        ctx.fillText(label, textX, textY);
      }
    });

    ctx.restore();
  }

  function restartLayout(reseed) {
    alpha = 1;
    ticks = 0;
    if (reseed) {
      visibleNodes.forEach(function (node) {
        node.x += (Math.random() - .5) * 80;
        node.y += (Math.random() - .5) * 80;
        node.vx = 0;
        node.vy = 0;
      });
    }
    if (!animating) {
      animating = true;
      requestAnimationFrame(animate);
    }
  }

  function simulate() {
    var n = visibleNodes.length;
    var repel = 2600 * alpha;
    var spring = .006 * alpha;
    var gravity = .0018 * alpha;

    for (var i = 0; i < n; i += 1) {
      var a = visibleNodes[i];
      for (var j = i + 1; j < n; j += 1) {
        var b = visibleNodes[j];
        var dx = b.x - a.x;
        var dy = b.y - a.y;
        var distance2 = dx * dx + dy * dy + .01;
        var distance = Math.sqrt(distance2);
        var force = repel / distance2;
        var fx = force * dx / distance;
        var fy = force * dy / distance;
        a.vx -= fx;
        a.vy -= fy;
        b.vx += fx;
        b.vy += fy;
      }
    }

    visibleEdges.forEach(function (edge) {
      var from = nodeMap.get(edge.from);
      var to = nodeMap.get(edge.to);
      var dx = to.x - from.x;
      var dy = to.y - from.y;
      var distance = Math.sqrt(dx * dx + dy * dy) || 1;
      var target = 70 + Math.min(45, (from.degree + to.degree) * 1.5);
      var force = (distance - target) * spring;
      var fx = force * dx / distance;
      var fy = force * dy / distance;
      from.vx += fx;
      from.vy += fy;
      to.vx -= fx;
      to.vy -= fy;
    });

    visibleNodes.forEach(function (node) {
      node.vx += -node.x * gravity;
      node.vy += -node.y * gravity;
      node.vx *= .78;
      node.vy *= .78;
      node.x += Math.max(-24, Math.min(24, node.vx));
      node.y += Math.max(-24, Math.min(24, node.vy));
    });

    alpha *= .985;
    ticks += 1;
  }

  function animate() {
    if (alpha > .012 && ticks < 300 && visibleNodes.length > 0) {
      simulate();
      draw();
      requestAnimationFrame(animate);
    } else {
      animating = false;
      draw();
    }
  }

  function hitNode(x, y) {
    var world = toWorld(x, y);
    var closest = null;
    var best = Infinity;
    visibleNodes.forEach(function (node) {
      var dx = node.x - world.x;
      var dy = node.y - world.y;
      var limit = nodeRadius(node) + 6 / viewport.scale;
      var distance2 = dx * dx + dy * dy;
      if (distance2 <= limit * limit && distance2 < best) {
        closest = node;
        best = distance2;
      }
    });
    return closest;
  }

  function zoomToNode(node) {
    if (!node) return;
    viewport.scale = Math.max(viewport.scale, 1.35);
    viewport.x = size.width / 2 - node.x * viewport.scale;
    viewport.y = size.height / 2 - node.y * viewport.scale;
    draw();
  }

  function renderEdgeRows(list, direction) {
    if (!list || list.length === 0) return '<p style="color:#68758b;font-size:12px">Không có edge.</p>';
    return '<table class="edge-table"><thead><tr><th>Type</th><th>Node ' +
      (direction === 'out' ? 'đích' : 'nguồn') +
      '</th></tr></thead><tbody>' + list.map(function (edge) {
        var otherKey = direction === 'out' ? edge.to : edge.from;
        var other = nodeMap.get(otherKey);
        return '<tr><td>' + escapeHtml(edge.type) + '</td><td>' +
          '<button type="button" class="edge-node" data-node-key="' + escapeHtml(otherKey) + '">' +
          '<span class="edge-key">' + escapeHtml(otherKey) + '</span><br>' +
          escapeHtml(other ? nodeName(other) : '(node không tồn tại)') +
          '</button></td></tr>';
      }).join('') + '</tbody></table>';
  }

  function selectNode(node) {
    selected = node;
    if (!node) {
      detailContent.classList.add('hidden');
      emptyDetail.classList.remove('hidden');
      draw();
      return;
    }

    emptyDetail.classList.add('hidden');
    detailContent.classList.remove('hidden');

    var source = node.source || {};
    var props = node.props || {};
    var propsText = Object.keys(props).length
      ? Object.keys(props).map(function (key) {
          var value = Array.isArray(props[key]) ? props[key].join(', ') : props[key];
          return key + ': ' + value;
        }).join(' · ')
      : '—';

    detailContent.innerHTML =
      '<h3 class="detail-title">' + escapeHtml(nodeName(node)) + '</h3>' +
      '<div class="detail-key">' + escapeHtml(node.key) + '</div>' +
      '<dl class="kv">' +
        '<dt>Type</dt><dd>' + escapeHtml(node.type || '—') + '</dd>' +
        '<dt>Status</dt><dd>' + escapeHtml(node.status || '—') + '</dd>' +
        '<dt>Feature</dt><dd>' + escapeHtml(node.feature || '(cấp dự án)') + '</dd>' +
        '<dt>Nguồn</dt><dd>' + escapeHtml(source.file || '—') + (source.line ? ':' + escapeHtml(source.line) : '') + '</dd>' +
        '<dt>Props</dt><dd>' + escapeHtml(propsText) + '</dd>' +
      '</dl>' +
      '<h4 class="edge-heading">Edge đi ra (' + (outgoing.get(node.key) || []).length + ')</h4>' +
      renderEdgeRows(outgoing.get(node.key), 'out') +
      '<h4 class="edge-heading">Edge đi vào (' + (incoming.get(node.key) || []).length + ')</h4>' +
      renderEdgeRows(incoming.get(node.key), 'in');

    draw();
  }

  function showSearchResults() {
    query = searchBox.value.trim().toLowerCase();
    if (!query) {
      searchResults.innerHTML = '';
      searchResults.style.display = 'none';
      draw();
      return;
    }

    var results = nodes.filter(function (node) {
      return isNodeVisible(node) &&
        (node.key + ' ' + nodeName(node)).toLowerCase().indexOf(query) !== -1;
    }).slice(0, 30);

    searchResults.innerHTML = results.map(function (node) {
      return '<button type="button" class="search-result" data-node-key="' + escapeHtml(node.key) + '">' +
        '<strong>' + escapeHtml(node.key) + '</strong>' +
        '<span>' + escapeHtml(nodeName(node)) + '</span></button>';
    }).join('') || '<div style="padding:8px;color:#68758b">Không tìm thấy node đang hiển thị.</div>';
    searchResults.style.display = 'block';
    draw();
  }

  canvas.addEventListener('pointerdown', function (event) {
    var rect = canvas.getBoundingClientRect();
    var x = event.clientX - rect.left;
    var y = event.clientY - rect.top;
    var node = hitNode(x, y);
    canvas.setPointerCapture(event.pointerId);
    pointerStart = { x: x, y: y, node: node, viewX: viewport.x, viewY: viewport.y };
    dragging = node ? { kind: 'node', node: node } : { kind: 'pan' };
    canvas.classList.add('dragging');
  });

  canvas.addEventListener('pointermove', function (event) {
    var rect = canvas.getBoundingClientRect();
    var x = event.clientX - rect.left;
    var y = event.clientY - rect.top;

    if (!dragging) {
      var nextHovered = hitNode(x, y);
      if (nextHovered !== hovered) {
        hovered = nextHovered;
        canvas.style.cursor = hovered ? 'pointer' : 'grab';
        draw();
      }
      return;
    }

    if (dragging.kind === 'pan') {
      viewport.x = pointerStart.viewX + x - pointerStart.x;
      viewport.y = pointerStart.viewY + y - pointerStart.y;
      draw();
    } else {
      var world = toWorld(x, y);
      dragging.node.x = world.x;
      dragging.node.y = world.y;
      dragging.node.vx = 0;
      dragging.node.vy = 0;
      alpha = Math.max(alpha, .16);
      draw();
    }
  });

  canvas.addEventListener('pointerup', function (event) {
    var rect = canvas.getBoundingClientRect();
    var x = event.clientX - rect.left;
    var y = event.clientY - rect.top;
    var moved = pointerStart && Math.hypot(x - pointerStart.x, y - pointerStart.y) > 5;

    if (pointerStart && pointerStart.node && !moved) selectNode(pointerStart.node);
    if (dragging && dragging.kind === 'node') restartLayout(false);

    dragging = null;
    pointerStart = null;
    canvas.classList.remove('dragging');
    if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
  });

  canvas.addEventListener('pointercancel', function () {
    dragging = null;
    pointerStart = null;
    canvas.classList.remove('dragging');
  });

  canvas.addEventListener('wheel', function (event) {
    event.preventDefault();
    var rect = canvas.getBoundingClientRect();
    var x = event.clientX - rect.left;
    var y = event.clientY - rect.top;
    var before = toWorld(x, y);
    var multiplier = event.deltaY < 0 ? 1.12 : 1 / 1.12;
    viewport.scale = Math.max(.24, Math.min(4, viewport.scale * multiplier));
    viewport.x = x - before.x * viewport.scale;
    viewport.y = y - before.y * viewport.scale;
    draw();
  }, { passive: false });

  featureFilter.addEventListener('change', function () {
    refreshGraph(true);
  });

  searchBox.addEventListener('input', showSearchResults);
  searchBox.addEventListener('keydown', function (event) {
    if (event.key !== 'Enter') return;
    var first = searchResults.querySelector('[data-node-key]');
    if (!first) return;
    var node = nodeMap.get(first.getAttribute('data-node-key'));
    selectNode(node);
    zoomToNode(node);
    searchResults.style.display = 'none';
  });

  searchResults.addEventListener('click', function (event) {
    var button = event.target.closest('[data-node-key]');
    if (!button) return;
    var node = nodeMap.get(button.getAttribute('data-node-key'));
    selectNode(node);
    zoomToNode(node);
    searchResults.style.display = 'none';
  });

  detailContent.addEventListener('click', function (event) {
    var button = event.target.closest('[data-node-key]');
    if (!button) return;
    var node = nodeMap.get(button.getAttribute('data-node-key'));
    if (!node || !isNodeVisible(node)) return;
    selectNode(node);
    zoomToNode(node);
  });

  layoutButton.addEventListener('click', function () {
    restartLayout(true);
  });

  buildFeatureFilter();
  buildEdgeFilters();
  buildLegend();
  new ResizeObserver(resize).observe(area);
  refreshGraph(false);
  resize();
  restartLayout(false);
}());
</script>
</body>
</html>
`;

try {
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  // Atomic write (temp + rename) — 2 build song song không để lại HTML nửa vời
  // và người đang mở file không đọc trúng bản dở (audit vận hành 07-16).
  const temp = outPath + '.tmp-' + process.pid;
  fs.writeFileSync(temp, html, 'utf8');
  fs.renameSync(temp, outPath);
} catch (error) {
  fail('không ghi được viewer HTML (' + error.message + ')');
}

console.log('KG viewer created: ' + path.relative(process.cwd(), outPath));
