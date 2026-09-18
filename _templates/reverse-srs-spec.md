---
type: reverse-srs
feature: {{feature}}
status: draft
updated: {{date}}
confidence_summary: "✅{{n_green}} 🔵{{n_blue}} 🟡{{n_yellow}}"
links: {{links}}
---

# {{feature}} — SRS tái lập (reverse)‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

> Trạng thái: `draft` (tái lập, chưa duyệt). Nhãn: ✅ chắc chắn · 🔵 suy đoán · 🟡 cần xác nhận.

## 0. Truy vết nguồn & độ tin cậy‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

- __Nguồn:__ xem [`reverse-sources.md`](./reverse-sources.md).
- __Câu hỏi mở / khác biệt:__ xem [`reverse-gaps.md`](./reverse-gaps.md).

### 0.3 Khác biệt với tài liệu chính (chỉ khi feature trùng doc hiện có)‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

| Điểm | Reverse nói (từ nguồn) | Doc chính nói (`{{existing_doc}}`) | Đề xuất |
|------|------------------------|-----------------------------------|---------|
| {{aspect}} | {{redoc_value}} | {{existing_value}} | `/cr` / `/gap` |

## 1. Scope‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

{{scope}}

*Prose mô tả feature đặc tả cái gì + block Boundary (out of scope). Mỗi câu suy ra kèm (nguồn, nhãn) inline,
vd: "Hỗ trợ đăng nhập email + mật khẩu. ✅ [S1]".*

## 2. Actors & Stakeholders‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

| Actor | Loại (người/hệ thống/ngoài) | Mục tiêu | Trong scope? | Nguồn | Nhãn |
|-------|-----------------------------|----------|--------------|-------|------|
| {{actor}} | người/hệ thống/ngoài | {{goal}} | Có/Không | S? | ✅/🔵/🟡 |

## 3. Functional Requirements (FR)

| ID | Title | Description | Priority | Verify by | Nguồn | Nhãn |
|----|-------|-------------|----------|-----------|-------|------|
| FR-{{feature}}-001 | {{title}} | {{desc}} | P0/P1/P2 | demo/test/kiểm tra/phân tích | S? | ✅/🔵/🟡 |

## 4. Non-Functional Requirements (NFR)

| ID | Category | Requirement | Priority | Acceptance | Nguồn | Nhãn |
|----|----------|-------------|----------|------------|-------|------|
| NFR-{{feature}}-001 | performance | {{req}} | P0/P1/P2 | {{accept}} | S? | ✅/🔵/🟡 |

## 5. Business Rules

| ID | Rule | Trigger | Implements FR | Nguồn | Nhãn |
|----|------|---------|---------------|-------|------|
| BR-{{feature}}-001 | {{rule}} | {{trigger}} | FR-{{feature}}-NNN | S? | ✅/🔵/🟡 |

## 6. Error Matrix‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

| Error ID | Title | Trigger | Severity | Related FR | Screen state | Recovery | Nguồn | Nhãn |
|----------|-------|---------|----------|------------|--------------|----------|-------|------|
| E-{{feature}}-001 | {{title}} | {{trigger}} | critical/major/minor | FR-{{feature}}-NNN | {{screen-state}} | {{recovery}} | S? | ✅/🔵/🟡 |

## 7. Success Criteria

| ID | Outcome nghiệp vụ | Đo bằng | Mốc đạt | Nguồn | Nhãn |
|----|-------------------|---------|---------|-------|------|
| SC-{{feature}}-01 | {{outcome}} | {{measurement}} | {{target}} | S? | ✅/🔵/🟡 |

## 8. Data Entities (tóm tắt — chi tiết ở `srs/{{feature}}-reverse-erd.md`)

{{entities}}

## 9. Flows (tóm tắt — chi tiết ở `srs/{{feature}}-reverse-flows.md`)

{{flows_summary}}

## 10. Screens (tóm tắt — BỎ Mục này khi code backend-only / nguồn không có UI)

{{screens_summary}}

## 11. Constraints, Dependencies & Assumptions

__Constraints (ràng buộc áp đặt):__

| Ràng buộc | Source / Owner | Nguồn | Nhãn |
|-----------|----------------|-------|------|
| {{constraint}} | {{source_owner}} | S? | ✅/🔵/🟡 |

__Dependencies (deliverable do bên khác sở hữu):__

| Phụ thuộc | Owner | Blocks nếu chưa sẵn | Nguồn | Nhãn |
|-----------|-------|---------------------|-------|------|
| {{dependency}} | {{owner}} | {{blocks}} | S? | ✅/🔵/🟡 |

__Assumptions (tin là đúng — nêu hệ quả nếu sai):__

| Giả định | Invalidate {X} nếu sai | Nguồn | Nhãn |
|----------|------------------------|-------|------|
| {{assumption}} | {{invalidated}} | S? | ✅/🔵/🟡 |

## 12. Open Questions

> Danh sách đầy đủ OQ + Gap ở [`reverse-gaps.md`](./reverse-gaps.md). Dưới đây chỉ trích các OQ blocking.

- [ ] OQ-1: {{open_question_1}}‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍


<!-- wm:2b9af6c9b691879b1ddb7a04d29a1c88 -->
<sub>Tài liệu thuộc bộ AI4BA BA-Kit — bản quyền hoangphan.blog</sub>
