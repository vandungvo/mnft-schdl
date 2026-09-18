---
type: srs-erd
feature: smart-notification
updated: 2026-07-16
---

# Smart Notification — ERD‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

```mermaid
erDiagram
    CHANNEL_PREFERENCE ||--o{ NOTIFICATION : "phát sinh"
    CHANNEL_PREFERENCE ||--o{ DIGEST_JOB : "gộp vào"

    NOTIFICATION {
        string id PK
        string channel_id FK "kênh phát sinh thông báo"
        string status "unread | read | archived"
        date created_at "thời điểm phát sinh"
    }

    CHANNEL_PREFERENCE {
        string id PK
        string channel_name "tên kênh (vd: Bài học mới, Nhắc học)"
        string status "active | muted"
        date muted_until "hạn tự bật lại, tối đa 30 ngày (BR-smart-notification-001)"
    }

    DIGEST_JOB {
        string id PK
        string channel_id FK "kênh được gộp vào digest"
        string status "chờ | đã gửi | gửi lỗi"
        date scheduled_at "thời điểm gửi theo múi giờ user"
    }
```


<!-- wm:2b9af6c9b691879b1ddb7a04d29a1c88 -->
<sub>Tài liệu thuộc bộ AI4BA BA-Kit — bản quyền hoangphan.blog</sub>
