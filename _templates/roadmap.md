---
type: roadmap
status: draft
updated: {{date}}
format: now-next-later
next_review: {{next_review}}
links: [docs/_product/prd.md]
---

# {{product_name}} — Product Roadmap‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

## 1. Outcome mỗi giai đoạn‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

### {{horizon}} — {{theme}}‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

__Đạt được gì:__ {{outcome}}
__Đo bằng:__ {{metric}} {{metric_prd_ref}}

* __{{feature_name}}__ (`{{slug}}`) — {{feature_contribution_to_outcome}}

## 2. Xếp hạng ưu tiên‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

| Tính năng | Slug | MoSCoW | Reach | Impact | Confidence | Evidence | Effort | Điểm | Phụ thuộc | Sẵn sàng dep | Rủi ro | Giai đoạn |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| {{feature_name}} | `{{feature_slug}}` | {{moscow}} | {{reach}} | {{impact}} | {{confidence}} | {{evidence}} | {{effort}} | {{score}} | {{deps}} | {{dep_ready}} | {{risk}} | {{horizon}} |

*Điểm = (Reach × Impact × Confidence) ÷ Effort — xếp hạng tương đối, không phải đo lường tuyệt đối. Thang Reach/Impact 1-5, Confidence 1.0/0.8/0.5, Effort S=1/M=2/L=3.*

## 3. Now (đang / sắp làm)‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

* __{{feature_name}}__ (`{{slug}}`) — {{outcome}} · Tại sao bây giờ: {{rationale}} · Rủi ro: {{risk}} · Chi tiết hóa: {{detail_status}}

## 4. Next (kế tiếp)

* __{{feature_name}}__ (`{{slug}}`) — {{outcome}} · Phụ thuộc: {{deps}} · Rủi ro: {{risk}}

## 5. Later (định hướng)

* __{{feature_name}}__ (`{{slug}}`) — {{outcome}} · Lý do chưa làm ngay: {{risk}}

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
<sub>Tài liệu thuộc bộ AI4BA BA-Kit — bản quyền hoangphan.blog</sub>
