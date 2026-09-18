---
type: screen-index
feature: smart-notification
status: draft
updated: 2026-07-16
links:
  - docs/smart-notification/srs/smart-notification-spec.md
  - docs/smart-notification/srs/smart-notification-userflow.md
  - docs/smart-notification/usecases/smart-notification-usecase-index.md
---

# smart-notification — Screens Index‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

> Master index cho mọi screens trong feature smart-notification. Screen content gộp theo flow (1 file/flow, N screens/file) — chia flow theo `srs/smart-notification-userflow.md`. Metadata + designs + used-by + descriptions tập trung ở file này.

## Screens‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

| # | Slug | Status | Thuộc flow | Used by functions | Figma | HTML prototype | HTML wireframe | Updated |
|---|------|--------|-----------|--------------------|-------|----------------|----------------|---------|
| 1 | notification-list | draft | [view-notifications](view-notifications.md#screen-notification-list--danh-sách-thông-báo) | uc-view-notifications | https://www.figma.com/file/FAKE123?node-id=1-2 | smart-notification-prototype.html#notification-list | view-notifications.html | 2026-07-16 |
| 2 | notification-settings | draft | [mute-channel](mute-channel.md#screen-notification-settings--cài-đặt-kênh-thông-báo) | uc-mute-channel | — | — | mute-channel.html | 2026-07-16 |
| 3 | mute-confirm | draft | [mute-channel](mute-channel.md#screen-mute-confirm--xác-nhận-mute-kênh) | uc-mute-channel | — | — | mute-channel.html | 2026-07-16 |

**Status values:** `draft` / `in-review` / `revisions` / `approved` / `shipped`.

**Designs columns:**
- **Figma**: URL frame trên Figma (output của `/figma`). `—` nếu chưa có.
- **HTML prototype**: link tới `{feature}-prototype.html#{slug}` (output của `/prototype-html`). `—` nếu chưa có.
- **HTML wireframe**: link tới `html-wireframe/{flow-slug}.html` (output của `/wireframe-html`). `—` nếu chưa có.‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

## Descriptions‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

> 1 sub-section H3 per screen, 1-2 câu mô tả purpose + khi nào user thấy screen. Single source of description — KHÔNG duplicate trong screen file.

### notification-list‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍
Danh sách thông báo in-app theo thứ tự mới nhất trước, kèm badge số chưa đọc và lối vào cài đặt kênh. Người học thấy khi bấm icon chuông hoặc mở trung tâm thông báo.

### notification-settings‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍
Danh sách kênh (in-app/email) với toggle mute từng kênh và thời hạn mute còn lại nếu đang mute. Người học thấy khi bấm icon cài đặt từ màn notification-list.

### mute-confirm
Xác nhận trước khi kích hoạt mute 1 kênh, nêu rõ thời hạn tối đa 30 ngày và hành vi tự bật lại. Người học thấy khi bấm nút "Mute kênh" ở màn notification-settings.

## Links upstream

- [[docs/smart-notification/srs/smart-notification-spec.md|SRS spec]]
- [[docs/smart-notification/srs/smart-notification-userflow.md|User flow]]
- [[docs/smart-notification/usecases/smart-notification-usecase-index.md|Use cases folder]]‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍


<!-- wm:2b9af6c9b691879b1ddb7a04d29a1c88 -->
<sub>Tài liệu thuộc bộ AI4BA BA-Kit — bản quyền ai4ba.com</sub>
