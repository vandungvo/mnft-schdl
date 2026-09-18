---
type: prd
feature: {{feature}}
status: draft
updated: {{date}}
links: {{links}}
---

# {{feature}} — Product Requirements Document‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

## 1. Product Overview‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

{{overview}}

__Gap neo:__ Hiện tại {{as_is}} → sau feature {{to_be}}.

## 2. Goals‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

### 2.1 Goals‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍
{{product_goals}}

### 2.2 Non-goals‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍
{{non_goals}}

## 3. Personas

| Persona | Mô tả (1 dòng) | Nhu cầu chính | Nguồn |
|---------|----------------|---------------|-------|
| {{persona}} | {{description}} | {{needs}} | {{un_ref}} |

## 4. Capabilities

| ID | Capability | Priority | Rationale (vì sao tier này) | Traces to (UN-* / BO-*) | Bóc ~N story | Done when (product outcome) | Sẵn sàng |
|----|------------|----------|-----------------------------|-------------------------|--------------|-----------------------------|----------|
| CAP-{{feature}}-01 | {{capability}} | {{priority}} | {{rationale}} | {{traces_to}} | {{story_count}} | {{done_when}} | {{readiness}} |

## 5. Upstream Traceability

| Capability | Traces to (UN-* / BO-*) | Product outcome | Success metric |
|------------|-------------------------|-----------------|----------------|
| CAP-{{feature}}-01 | {{traces_to}} | {{product_outcome}} | {{metric_ref}} |

## 6. Key Capability Interactions

{{capability_interactions}}

## 7. Success Metrics

| Metric | Baseline | Target | Measurement Method | Timeframe |
|--------|----------|--------|--------------------|-----------|
| {{metric}} | {{baseline}} | {{target}} | {{measurement}} | {{timeframe}} |‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

## 8. Dependencies

| Dependency | Owner | Status | Needed-by | Impact if Late |
|------------|-------|--------|-----------|----------------|
| {{dependency}} | {{dep_owner}} | {{dep_status}} | {{needed_by}} | {{impact_if_late}} |

## 9. Assumptions & Validation

| Assumption | Impact if Wrong | Validation | Status |
|------------|-----------------|------------|--------|
| {{assumption}} | {{impact_if_wrong}} | {{validation}} | {{assumption_status}} |

## 10. Product Risks

| Risk | Probability | Impact | Mitigation | Owner |
|------|-------------|--------|------------|-------|
| {{risk}} | {{probability}} | {{risk_impact}} | {{mitigation}} | {{risk_owner}} |

## 11. Release & Launch Readiness

### 11.1 Release Horizon

| Horizon | Capabilities | Target | Status |
|---------|--------------|--------|--------|
| Now | {{now_caps}} | {{now_target}} | {{now_status}} |
| Next | {{next_caps}} | {{next_target}} | {{next_status}} |
| Later | {{later_caps}} | {{later_target}} | {{later_status}} |

### 11.2 Launch Readiness

| Workstream | Must-pass criteria | Status | Guardrail metric (threshold → decision) |
|------------|--------------------|--------|-----------------------------------------|
| {{workstream}} | {{must_pass}} | {{workstream_status}} | {{guardrail}} |

## 12. Open Questions

* [ ] OQ-1: {{open_question}}‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍


<!-- wm:2b9af6c9b691879b1ddb7a04d29a1c88 -->
<sub>Tài liệu thuộc bộ AI4BA BA-Kit — bản quyền ai4ba.com</sub>
