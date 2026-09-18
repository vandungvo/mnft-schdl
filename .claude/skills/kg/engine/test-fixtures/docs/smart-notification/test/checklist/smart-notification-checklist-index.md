---
type: test-checklist-index
feature: smart-notification
status: draft
updated: 2026-07-16
next_chk_id: 7
links:
  - docs/smart-notification/srs/smart-notification-spec.md
  - docs/smart-notification/usecases/uc-view-notifications.md
---

# Test Checklists — smart-notification‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

## Checklists‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

| Scope | Target | File | Items | P1 | P2 | P3 | P4 | Auto | Status | Updated |
|-------|--------|------|-------|----|----|----|----|------|--------|---------|
| uc | uc-view-notifications | [checklist-uc-view-notifications.md](checklist-uc-view-notifications.md) | 6 | 3 | 2 | 1 | 0 | 5/1 | draft | 2026-07-16 |

## Coverage‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

> Đối chiếu nghĩa vụ test ↔ CHK (per-obligation). Nguồn edge VERIFIES cho KG. Coverage table là __bản đồ điều hướng__, KHÔNG phải nguồn nội dung TC. Tầng: UI · API · —. Trạng thái: covered · excluded-approved · blocked · tbd · partial.

| Source ID | Nghĩa vụ (obligation) | Scope | CHK-ID | Tầng | Trạng thái | Lý do (nếu excluded) |
|-----------|----------------------|-------|--------|------|-----------|----------------------|
| FR-smart-notification-001 | happy: hiển thị danh sách thông báo mới nhất trước | uc-view-notifications | CHK-smart-notification-001 | UI | covered | — |‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍
| FR-smart-notification-002 | happy: đánh dấu đã đọc giảm badge tương ứng | uc-view-notifications | CHK-smart-notification-003 | UI | covered | — |
| FR-smart-notification-005 | happy: badge hiển thị "99+" khi vượt 99 | uc-view-notifications | CHK-smart-notification-005 | UI | covered | — |
| E-smart-notification-001 | tải danh sách thất bại — message + giữ badge cũ | uc-view-notifications | CHK-smart-notification-002 | UI | covered | — |
| NFR-smart-notification-001 | danh sách tải dưới 1 giây cho 50 item | uc-view-notifications | CHK-smart-notification-006 | UI | covered | — |

## Retired CHK-IDs‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

> ID của item đã xóa — KHÔNG reuse, KHÔNG lấp gap. List máy-đọc (validator reject nếu item sống mang ID ở đây).

| CHK-ID | Retired date | Lý do |
|--------|--------------|-------|

(Chưa có item nào bị xóa → giữ bảng rỗng, KHÔNG bỏ section — validator vẫn đọc header.)‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍


<!-- wm:2b9af6c9b691879b1ddb7a04d29a1c88 -->
<sub>Tài liệu thuộc bộ AI4BA BA-Kit — bản quyền hoangphan.blog</sub>
