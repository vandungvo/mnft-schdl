---
type: prd-product
status: draft
updated: {{date}}
links: []
---

# {{product_name}} — Product Requirements Document (project-level)‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

## 1. One-line Pitch‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

{{pitch}}

## 2. Problem & Why Now‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

{{problem}}

- **Vấn đề cốt lõi:** {{core_problem}}
- **Ai đang đau:** {{who_hurts}}
- **Giải pháp thay thế hiện tại:** {{existing_alternatives}}
- **Why now:** {{why_now}}

## 3. Target Users‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

| Nhóm người dùng | Vai trò (primary/secondary) | Job-to-be-done | Bối cảnh sử dụng |
|---|---|---|---|
| {{user_group}} | {{role}} | {{jtbd}} | {{context}} |

*Ai KHÔNG phải người dùng: {{non_users}}*

## 4. Value Proposition & Differentiator‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

{{value_prop}}

- **Giá trị cốt lõi (1 câu):** {{core_value}}
- **Vì sao chọn mình thay vì giải pháp cũ:** {{why_us}}
- **Lợi thế khác biệt:** {{unfair_advantage}}

## 5. Goals & Non-Goals

**Mục tiêu (in-scope):**
- {{goal}}

**Ngoài phạm vi (non-goals / out-of-scope):**
- {{non_goal}}

## 6. Capability Themes

| Theme | Mô tả | Features thuộc theme |
|---|---|---|
| {{theme}} | {{theme_desc}} | {{theme_features}} |

## 7. Feature Map

### Luồng người dùng tổng quan

1. {{journey_step}} → `{{related_feature_slug}}`‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

### Bảng Feature Map

| # | Tính năng | Slug | Theme | Persona | Ưu tiên (MoSCoW) | Phụ thuộc | Chi tiết hóa |
|---|---|---|---|---|---|---|---|
| 1 | {{feature_name}} | `{{feature_slug}}` | {{theme}} | {{persona}} | {{moscow}} | {{feature_deps}} | ⬜ chưa |

### 7.1 {{feature_name}} — `{{feature_slug}}`

{{feature_desc_what_why_outcome}}

**Phục vụ job:** {{feature_serves_jtbd}}

**Phạm vi v1:** {{scope_in}}
**Chưa làm:** {{scope_out}}

**Luồng chính:**
1. {{flow_step}}

**Rủi ro chính:** {{feature_risk}} · **Đo thành công:** {{feature_success_metric}}
**OQ riêng:** {{feature_oq_refs}}

## 8. Success Metrics

| Vai trò | Chỉ số | Baseline | Target | Mốc thời gian |
|---|---|---|---|---|
| North Star | {{north_star}} | {{ns_baseline}} | {{ns_target}} | {{ns_horizon}} |
| Input | {{input_metric}} | {{input_baseline}} | {{input_target}} | {{input_horizon}} |
| Guardrail | {{guardrail_metric}} | {{guardrail_current}} | {{guardrail_threshold}} | liên tục |

**Mục tiêu 3 / 6 / 12 tháng:** {{milestones}}

## 9. Constraints

- **Ngân sách / timeline / team:** {{constraints_resource}}
- **Ràng buộc tích hợp (chỉ tên hệ thống):** {{constraints_integration}}
- **Ràng buộc pháp lý / vùng / compliance:** {{constraints_compliance}}

## 10. Risks & Assumptions

| Rủi ro / Giả định | Loại (value/usability/feasibility/viability) | Tầm quan trọng | Evidence | Khả năng | Hậu quả | Cách phòng |
|---|---|---|---|---|---|---|
| {{risk}} | {{risk_type}} | {{importance}} | {{evidence}} | {{likelihood}} | {{impact}} | {{mitigation}} |

## 11. Open Questions

- [ ] OQ-1: {{open_question}}‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍


<!-- wm:2b9af6c9b691879b1ddb7a04d29a1c88 -->
<sub>Tài liệu thuộc bộ AI4BA BA-Kit — bản quyền hoangphan.blog</sub>
