# Confluence Mermaid rendering — technical adapter reference‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

> Chi tiết kỹ thuật để render mermaid trên Confluence Cloud. Đây là **kiến thức connector**, tách khỏi SKILL.md để mặt tiền BA gọn. SKILL chỉ cần: detect app → chọn mode → preview → fallback an toàn.
>
> ⚠️ **KIỂM TOOL THẬT TRƯỚC (capability discovery, `atlassian-sync.md` Mục 12).** Bộ Atlassian MCP thực tế có thể nhận macro theo **`contentFormat: html`** (`<div data-type="extension" data-extension-key="mermaid-cloud" data-extension-type="com.atlassian.confluence.macro.core" data-parameters="{...}">`, thường **bỏ `macroId`**, KHÔNG dùng storage XML) THAY VÌ ADF node thô như recipe cũ bên dưới. **Đừng bám 1 recipe cứng** — đọc schema tool `createConfluencePage`/`updateConfluencePage` đang kết nối, xem nó nhận `html` hay `adf`, rồi build đúng cái đó. Recipe ADF bên dưới chỉ là 1 khả năng (đã verify 2026-05-26, có thể lệch tool hiện tại). Nếu tool nhận html → dùng html-macro; nếu nhận adf → dùng block dưới.

## Sự thật phải nhớ‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

Confluence Cloud **KHÔNG render mermaid** trong code macro (`ac:name="code"`) lẫn markdown macro (`ac:name="markdown"`) — chỉ hiện text. Đẩy code block trần = stakeholder thấy source vô nghĩa. Skill PHẢI wrap đúng định dạng render NGAY khi push (bug đã gặp lần push authentication — memory `feedback_confluence_mermaid_render`).

## Bước 0 — Detect Mermaid app (cache vào sync-state context)‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

- Đọc `context.confluence.mermaid_app` + `macro_key` từ `sync-state.yaml`. Chưa có → hỏi user ở L1: "Confluence đã cài app Mermaid nào chưa?" (gợi ý Stratus "Mermaid Diagrams for Confluence"). Cache lại.
- Quyết mode: có app → `app-macro`; không app + upload attachment được → `png-prerendered`; không cả hai → hỏi L1 (cài app / chấp nhận code text không render). KHÔNG im lặng đẩy code trần.

## Mode `app-macro` (ưu tiên — render sống, zoom được)‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

Push body qua **ADF** (`createConfluencePage` / `updateConfluencePage` `contentFormat: adf`). Mỗi diagram = **2 node ADF liền nhau, đúng thứ tự**:
1. node `extension` (macro mermaid-cloud) — **KHÔNG chứa source**.
2. node `codeBlock` language=mermaid — **chứa source**. Macro render code block **ngay sau** nó.

> **Verified 2026-05-26** trên site `ai4bav2` (page 426008) qua ADF thô — cấu trúc dưới render OK LÚC ĐÓ. ⚠️ Có thể lệch tool MCP hiện tại (nếu tool nhận `contentFormat: html` thì dùng html-macro ở đầu file, không dùng block ADF này). Nếu dùng ADF: KHÔNG bớt field; macro node KHÔNG mang source — source 100% trong codeBlock kế sau.

Với **Stratus "Mermaid Diagrams for Confluence"** (app key `com.stratusaddons.confluence.plugins.mermaid`, extensionKey `mermaid-cloud`):
```json
{ "type": "extension", "attrs": {
    "layout": "default",
    "extensionType": "com.atlassian.confluence.macro.core",
    "extensionKey": "mermaid-cloud",
    "parameters": {
      "macroParams": {
        "toolbar":  { "value": "bottom" },
        "filename": { "value": "<label-tuỳ-ý, vd flow-signup>" },
        "zoom":     { "value": "fit" },
        "revision": { "value": "1" }
      },
      "macroMetadata": {
        "macroId": { "value": "<uuid-riêng-mỗi-diagram>" },
        "schemaVersion": { "value": "1" },
        "placeholder": [ { "type": "icon", "data": {
          "url": "https://mermaid.stratus-addons.com/images/mermaid144.png" } } ],
        "title": "Mermaid Diagrams for Confluence"
      } },
    "localId": "<uuid-riêng-mỗi-diagram>" } }
```
Theo **ngay sau** là codeBlock (giữ `breakout` mark cho rộng):‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍
```json
{ "type": "codeBlock",
  "attrs": { "language": "mermaid", "localId": "<id>" },
  "marks": [ { "type": "breakout", "attrs": { "mode": "wide", "width": 760 } } ],
  "content": [ { "type": "text", "text": "<mermaid source, \\n cho newline>" } ] }
```
Rules khi nhân bản nhiều diagram/page:
- Mỗi diagram: `macroId` + `localId` (cả 2 node) là **uuid random riêng** — KHÔNG tái dùng.
- `filename` đặt nhãn gợi nhớ (`flow-signup`, `erd`, `state-account`).
- `revision` luôn `"1"` khi tạo mới.
- Source mermaid để **nguyên** trong codeBlock (escape `\n`, `\"`). KHÔNG nhét vào macro params.
- App khác Stratus → `extensionKey` khác: user chèn 1 diagram mẫu, đọc ADF (`getConfluencePage contentFormat: adf`) lấy `extensionKey` + param set thật rồi nhân bản (đừng đoán key).

## Mode `png-prerendered` (CHỈ khi MCP có tool upload attachment)‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

> ⚠️ Bộ Atlassian MCP hiện tại **thường KHÔNG có tool upload attachment** → mode này thường **bất khả thi**. Chỉ dùng nếu capability discovery xác nhận có tool upload thật. Nếu không → 2 lựa chọn thực tế là **app-macro** (định dạng tool nhận) hoặc **xuất import-HTML file** cho user tự up.

- Pre-render qua `mmdc` (memory `project_export_tools`) → PNG.
- Upload PNG làm attachment của page → embed `<ac:image><ri:attachment ri:filename="flow-1.png"/></ac:image>`.
- Không có tool upload → rớt về hỏi L1 (cài app / chấp nhận export-HTML).

## CẤM

- ❌ Đẩy ` ```mermaid ` code block trần kỳ vọng Cloud tự render.
- ❌ Ghi/giả định "Confluence Cloud render mermaid native".
- ❌ Round-trip body page cũ (~100KB) chỉ để chèn macro — sửa ở bước build body lúc push, không retrofit. (Lưu ý: pull/reconcile CẦN đọc body remote — nhưng đó là để so 3-way qua snapshot chuẩn hóa, không phải round-trip nguyên body 100KB để chèn 1 macro.)‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍


<!-- wm:2b9af6c9b691879b1ddb7a04d29a1c88 -->
<sub>Tài liệu thuộc bộ AI4BA BA-Kit — bản quyền ai4ba.com</sub>
