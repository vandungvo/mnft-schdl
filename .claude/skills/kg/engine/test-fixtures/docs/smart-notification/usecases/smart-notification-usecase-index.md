---
type: usecase-index
feature: smart-notification
status: draft
updated: 2026-07-16
links:
  - docs/smart-notification/srs/smart-notification-spec.md
---

# Smart Notification — Use Cases Index‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

## Use cases‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

> Bảng này là __ma trận truy vết per-feature__ (UC↔FR↔Screen↔Error↔OQ) đồng thời là metadata/lifecycle — 1 nguồn duy nhất, không tách file riêng. `/gap` mới soát orphan/link-lệch cross-doc (→ `docs/_shared/traceability.md`).

| # | Slug | Level | Status | Actor primary | Covers FR | Screens | Errors (E-*) | OQ ref | Priority | Updated |
|---|------|-------|--------|---------------|-----------|---------|--------------|--------|----------|---------|
| 1 | [uc-view-notifications](uc-view-notifications.md) | sea | draft | Learner | FR-smart-notification-001, FR-smart-notification-002, FR-smart-notification-005 | notification-list | E-smart-notification-001 | — | P0 | 2026-07-16 |
| 2 | [uc-mute-channel](uc-mute-channel.md) | sea | draft | Learner | FR-smart-notification-003 | notification-settings, mute-confirm | E-smart-notification-002 | — | P1 | 2026-07-16 |

## CRUD matrix‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

> Use case nào thao tác entity nào (C=Create, R=Read, U=Update, D=Delete). Ô trống = không đụng. Nguồn edge UC→entity (OPERATES_ON) — bảng CRUD kinh điển của nghề BA, đối chiếu với ERD (`srs/smart-notification-erd.md`). Entity đặt tên CamelCase khớp ERD.

| UC \ Entity | Notification | ChannelPreference | DigestJob |
|---|---|---|---|
| [uc-view-notifications](uc-view-notifications.md) | RU | | |
| [uc-mute-channel](uc-mute-channel.md) | | CU | |

## Actors‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

| Actor | Loại | Mô tả | Nguồn |‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍
|---|---|---|---|
| Learner | primary | Người học dùng app, xem thông báo trong app và nhận email digest, có thể tắt (mute) từng kênh thông báo | brainstorm |
| System | system | Tự động tổng hợp thông báo chưa đọc và gửi email digest hằng ngày theo múi giờ Learner | SRS |

## Diagram‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

<img src="smart-notification-usecase-diagram.svg" alt="Use case diagram: smart-notification">

*Nguồn thật ở `smart-notification-usecase-diagram.puml` (PlantUML native), render qua `render.sh` ra `.svg`. Sửa nội dung → sửa `.puml` rồi gọi lại `/usecase-diagram`, KHÔNG sửa tay `.svg`.*

## Relationships

| Type | From | To | Rationale |
|---|---|---|---|
| extend | uc-mute-channel | uc-view-notifications | uc-mute-channel bổ sung uc-view-notifications khi Learner bấm icon cài đặt từ màn danh sách thông báo để tắt 1 kênh (base vẫn đủ nếu Learner không mute)

## Nguồn dữ liệu

- FR + Error Matrix: [[../srs/smart-notification-spec.md|Smart Notification SRS]]
- Screens: [[../ascii-wireframe/smart-notification-wireframe-index.md|Screens index]]
- Open Questions: `srs/smart-notification-spec.md` Mục Open Questions (canonical — bảng trên chỉ trỏ ref `spec.md#OQ-N`)‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍


<!-- wm:2b9af6c9b691879b1ddb7a04d29a1c88 -->
<sub>Tài liệu thuộc bộ AI4BA BA-Kit — bản quyền hoangphan.blog</sub>
