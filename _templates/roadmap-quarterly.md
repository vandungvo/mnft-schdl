---
type: roadmap
status: draft
updated: {{date}}
format: quarterly
next_review: {{next_review}}
links: [docs/_product/prd.md]
---

# {{product_name}} — Product Roadmap (theo quý)‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

## 1. Timeline‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

```mermaid
gantt
    dateFormat YYYY-MM-DD
    axisFormat %m/%Y
    title {{product_name}}
    section {{quarter_1}}
    {{feature_name}} :{{task_id}}, {{start_date}}, {{duration}}
    section {{quarter_2}}
    {{feature_name}} :{{task_id}}, after {{dep_task_id}}, {{duration}}
```

## 2. Outcome mỗi quý‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

### {{quarter}} — {{theme}}‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

**Đạt được gì:** {{outcome}}
**Đo bằng:** {{metric}} {{metric_prd_ref}}

* **{{feature_name}}** (`{{slug}}`) — {{feature_contribution_to_outcome}}

## 3. Xếp hạng ưu tiên‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

| Tính năng | Slug | MoSCoW | Reach | Impact | Confidence | Evidence | Effort | Điểm | Phụ thuộc | Sẵn sàng dep | Rủi ro | Quý |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| {{feature_name}} | `{{feature_slug}}` | {{moscow}} | {{reach}} | {{impact}} | {{confidence}} | {{evidence}} | {{effort}} | {{score}} | {{deps}} | {{dep_ready}} | {{risk}} | {{quarter}} |

*Điểm = (Reach × Impact × Confidence) ÷ Effort — xếp hạng tương đối, không phải đo lường tuyệt đối. Thang Reach/Impact 1-5, Confidence 1.0/0.8/0.5, Effort S=1/M=2/L=3.*‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

## 4. {{quarter_1}}

> {{quarter_commitment}}

* **{{feature_name}}** (`{{slug}}`) — {{outcome}} · Rủi ro: {{risk}} · Chi tiết hóa: {{detail_status}}

## 5. {{quarter_2}} trở đi

* **{{feature_name}}** (`{{slug}}`) — {{outcome}} · Phụ thuộc: {{deps}} · Rủi ro: {{risk}}

## 6. Phụ thuộc

```mermaid
graph LR
    {{dep_node}} --> {{feature_node}}
```

## 7. Câu hỏi mở

* [ ] OQ-1: {{open_question}}

## 8. Bước tiếp theo

* {{next_step}}‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍


<!-- wm:2b9af6c9b691879b1ddb7a04d29a1c88 -->
<sub>Tài liệu thuộc bộ AI4BA BA-Kit — bản quyền ai4ba.com</sub>
