---
type: doc-drift-report
feature: {{feature-or-product}}
baseline: docs/{{feature}}/
code_ref: {{repo}}@{{ref}}
updated: {{date}}
---

<!--
2 chế độ:
* 1 feature: frontmatter feature={{feature}}, Phần 1 chỉ 1 khối "### Feature: {{feature}}".
* --all (toàn hệ): frontmatter feature=product; thêm bảng "## Đã kiểm" (feature|status|#findings);
  Phần 1 lặp khối "### Feature: {name}" cho MỖI feature; Phần 2 integration ghép cross-feature.
Xóa comment này khi ghi report thật.
-->

# Doc-drift: {{feature-or-product}} — code ⇄ docs‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

__Baseline:__ docs/{{feature}}/  ·  __Code:__ {{repo}}@{{ref}}  ·  __Date:__ {{date}}
__Đã đọc:__ {{N}} docs · {{M}} code files  ·  __Scope code:__ {{scope}}
__Plan checklist:__ {{P}} mục cần kiểm ({{fr}} FR · {{br}} BR · {{err}} Error · {{nfr}} NFR · {{integ}} integration)
__Self-verify:__ {{kept}} finding qua kiểm · {{dropped}} bị loại/hạ nhãn (thiếu evidence hoặc negative-search chưa đủ)

## Verdict‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

| ✅ Pass | ⚠️ Mismatch | ❌ Missing | ➕ Extra | ❓ Unverifiable |
|---|---|---|---|---|
| {{pass}} | {{mismatch}} | {{missing}} | {{extra}} | {{unver}} |

<!-- CHỈ khi --all: bảng feature-completeness (mỗi feature đã kiểm tới đâu) -->
## Đã kiểm (chỉ `--all`)‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

| Feature | Status | #Mismatch | #Missing | #Extra | #Unverifiable | #Loại ở D2 |
|---------|--------|-----------|----------|--------|---------------|------------|
| {{feature}} | done/pending/skipped/error | {{n}} | {{n}} | {{n}} | {{n}} | {{n}} |

***

## Phần 1 — Drift trong từng feature‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

<!-- --all: lặp khối "### Feature: {name}" dưới đây cho MỖI feature. 1 feature: chỉ 1 khối. -->
### Feature: {{feature}}‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

#### 1.1. Mismatch (docs & code cùng có nhưng LỆCH — ưu tiên xử lý)

| # | Requirement | Docs nói | Code làm | Docs cite | Code cite | Hướng xử lý |
|---|-------------|----------|----------|-----------|-----------|-------------|
| 1 | {{req}} | {{docs_value}} | {{code_value}} | {{doc_cite}} | {{code_cite}} | 🔧/📄 — {{note}} |

#### 1.2. Missing (docs có, code CHƯA làm)

| # | Requirement | Docs cite | Pattern đã grep | Scope đã đóng | Hướng xử lý |
|---|-------------|-----------|-----------------|---------------|-------------|
| 1 | {{req}} | {{doc_cite}} | `{{pattern}}` | {{scope}} | 🔧 code chưa làm |

#### 1.3. Extra (code có, docs CHƯA ghi)‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

| # | Hành vi code | Code cite | Alias đã tìm trong docs | Hướng xử lý |
|---|--------------|-----------|-------------------------|-------------|
| 1 | {{behavior}} | {{code_cite}} | `{{alias}}` | 📄 docs bổ sung |

#### 1.4. Unverifiable (không đủ bằng chứng tĩnh)

| # | Requirement | Lý do không xác minh được | Cần gì để xác minh |
|---|-------------|---------------------------|--------------------|
| 1 | {{req}} | {{reason}} | {{need}} |

#### 1.5. Pass (khớp — tóm tắt, không cần chi tiết)

{{pass_count}} requirement khớp docs. (Liệt kê chi tiết ở Evidence index nếu cần.)

***

## Phần 2 — Drift integration (liên feature / cross-repo)

| Cạnh | Docs mô tả phối hợp | Code thực tế | Nhãn | Docs cite | Code cite |
|------|--------------------|--------------|------|-----------|-----------|
| {{A}}→{{B}} | {{docs_desc}} | {{code_actual}} | Pass / Missing-link / Mismatch-link / Extra-link / Broken-contract | {{doc_cite}} | {{code_cite}} |

__Nhãn integration:__
* __Pass__ — docs mô tả A gọi B & code khớp (đúng trigger/điều kiện/dữ liệu).
* __Missing-link__ — docs nói A phối hợp B, code KHÔNG có call/contract nối.
* __Mismatch-link__ — có nối nhưng lệch (thứ tự/điều kiện/dữ liệu truyền khác docs).
* __Extra-link__ — code nối A↔B mà docs KHÔNG mô tả (phụ thuộc ngầm).
* __Broken-contract__ — 2 bên truyền dữ liệu nhưng shape/enum/error lệch (A gửi `paid`, B chờ `PAID`).
* __Unverifiable-link__ — endpoint ghép động (base-URL runtime / biến nội suy) không grep tĩnh được → không kết luận nổi.

### Sơ đồ phụ thuộc (tô cạnh theo nhãn)

```mermaid
flowchart LR
  {{A}}["{{A}}"] -->|"{{label}}"| {{B}}["{{B}}"]
  %% Pass = nét liền, Mismatch/Broken = nét đứt + ghi chú, Missing-link = ghi "(docs có, code thiếu)"
```

***

## Phần 3 — Evidence index (truy vết đầy đủ)

| ID | Nhãn | Doc cite | Code cite | Pattern/scope đã search | Confidence |
|----|------|----------|-----------|-------------------------|------------|
| D-01 | {{label}} | {{doc_cite}} | {{code_cite}} | `{{pattern}}` trên {{scope}} | cao/vừa/thấp |

***

## Bước tiếp (do người đọc quyết — skill KHÔNG tự làm)

* Finding 📄 (docs sai/cũ) → chạy `/cr "<mô tả>" --feature {{feature}}` để sửa docs có kiểm soát.
* Finding 🔧 (code sai/thiếu) → báo dev fix bug / bổ sung code.
* Unverifiable → bổ sung test/config hoặc kiểm runtime rồi chạy lại `/doc-drift`.‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍


<!-- wm:2b9af6c9b691879b1ddb7a04d29a1c88 -->
<sub>Tài liệu thuộc bộ AI4BA BA-Kit — bản quyền hoangphan.blog</sub>
