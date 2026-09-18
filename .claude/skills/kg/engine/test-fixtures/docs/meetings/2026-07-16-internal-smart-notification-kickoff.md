---
type: meeting
meeting_type: internal
date: 2026-07-16
status: processed
feature: smart-notification
attendees:
  - "@ba (BA, chủ trì)"
  - "@linh (PM)"
  - "@nam (Tech Lead)"
updated: 2026-07-16
links:
  - docs/smart-notification/srs/smart-notification-spec.md
---

# Kickoff: Smart Notification‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

> Date: 2026-07-16 | Type: Internal kickoff

## Attendees‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

* **@ba** (BA — chủ trì)
* **@linh** (PM)
* **@nam** (Tech Lead)

## Agenda / Context‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

Kickoff feature **Smart Notification**. Mục tiêu: chốt giờ gửi digest, thời hạn mute kênh, và rà lại rủi ro vận hành email trước khi triển khai.

## Discussion summary‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

* Digest hằng ngày cần chốt giờ gửi cố định để user dễ dự đoán, tránh gửi rải rác trong ngày.
* Mute kênh cần có giới hạn thời gian để tránh user quên bật lại và bỏ lỡ thông báo vĩnh viễn.
* Có đề xuất ban đầu cho phép mute vĩnh viễn nhưng bị bác vì rủi ro bỏ lỡ thông báo quan trọng.
* Rủi ro vận hành: hệ email nội bộ từng có lịch sử gửi trễ giờ cao điểm, cần theo dõi khi digest đi vào production.

## Decisions‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

| # | Quyết định | Người chốt | Lý do | Phương án khác | Tác động | Status | Supersedes | Nguồn |
|---|------------|------------|-------|-----------------|----------|--------|------------|-------|
| 1 | Chốt digest gửi 07:00 giờ địa phương | @linh | User dễ dự đoán thời điểm nhận email, tránh gửi rải rác gây phiền | Gửi theo khung giờ linh hoạt user tự chọn | FR-smart-notification-004 | accepted | — | "mình chốt digest gửi 07:00 giờ địa phương, cho dễ nhớ" — @linh |
| 2 | Mute tối đa 30 ngày | @nam | Tránh user quên bật lại kênh và mất thông báo vĩnh viễn | Mute vĩnh viễn tới khi user tự bật lại | BR-smart-notification-001 | accepted | D3 | "mute nên có hạn, tối đa 30 ngày rồi tự bật lại" — @nam |
| 3 | Mute vĩnh viễn | @nam | Đề xuất ban đầu cho đơn giản, không cần tự động bật lại | — | BR-smart-notification-001 | superseded | — | "ban đầu tính cho mute vĩnh viễn luôn cho đơn giản" — @nam |

## RAID

| Loại | Nội dung | Mức | Owner | Ứng phó/mốc | Nguồn |
|------|----------|-----|-------|-------------|-------|
| Risk | Email digest có thể gửi trễ giờ 07:00 nếu hệ email nội bộ quá tải giờ cao điểm | Cao | @nam | Theo dõi log gửi email tuần đầu sau launch | "hệ email nội bộ từng gửi trễ giờ cao điểm, cần để ý" — @nam |
| Dependency | Digest phụ thuộc hệ email nội bộ dùng chung hạ tầng transactional email | Trung bình | @nam | Xác nhận hạ tầng email đủ tải trước khi bật digest | "digest dùng chung hệ email nội bộ với các email khác" — @nam |‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

## Action Items

* [x] **@ba** — chốt giờ gửi digest với PM+Tech Lead (kết quả mong đợi: giờ gửi cố định ghi vào FR-smart-notification-004). Due **2026-07-16**.
* [ ] **@nam** — kiểm tra khả năng chịu tải giờ cao điểm của hệ email nội bộ trước khi bật digest production (kết quả mong đợi: báo cáo capacity + đề xuất theo dõi). Due **2026-07-23**.

## Open Questions

* [ ] **OQ-1**: User mute cả 2 kênh cùng lúc có cần cảnh báo riêng không? (nguồn: kế thừa OQ-1 từ srs/smart-notification-spec.md)

## Xác nhận

| Item | Confirm status | Confirmed by | Ngày |
|------|-----------------|---------------|------|
| Digest gửi 07:00 giờ địa phương | ✅ | @linh | 2026-07-16 |
| Mute tối đa 30 ngày | ✅ | @nam | 2026-07-16 |

## Tác động & Bước tiếp (đề xuất — KHÔNG tự áp)

| Item | Loại | Doc bị đụng | Bước đề xuất | Confirm? |
|------|------|-------------|---------------|----------|
| Digest 07:00 giờ địa phương | Decision | srs/smart-notification-spec.md (FR-smart-notification-004) | Đối chiếu spec đã khớp, không cần /cr | ✅ |
| Mute tối đa 30 ngày | Decision | srs/smart-notification-spec.md (BR-smart-notification-001) | Đối chiếu spec đã khớp, không cần /cr | ✅ |

## Views nhanh

* **BA:** Digest 07:00 + mute 30 ngày đã khớp spec hiện có, không phát sinh CR.
* **PO:** Rủi ro email trễ giờ cao điểm cần theo dõi trước khi launch digest.
* **PM:** 1 action còn mở (kiểm tra capacity email), due 2026-07-23.

## Email Draft (recap)

```text
Subject: [Recap] Kickoff Smart Notification — 16/7

Cả nhà,

Tóm tắt quyết định buổi kickoff hôm nay:
1. Digest gửi 07:00 giờ địa phương user.
2. Mute kênh tối đa 30 ngày, tự bật lại khi hết hạn (thay cho đề xuất mute vĩnh viễn ban đầu).

Action: @nam kiểm tra capacity hệ email nội bộ trước 23/7.

Thanks,
Hoàng
```

## Notes

* Theo dõi log gửi email tuần đầu sau khi digest lên production, do rủi ro email trễ giờ cao điểm.‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍


<!-- wm:2b9af6c9b691879b1ddb7a04d29a1c88 -->
<sub>Tài liệu thuộc bộ AI4BA BA-Kit — bản quyền ai4ba.com</sub>
