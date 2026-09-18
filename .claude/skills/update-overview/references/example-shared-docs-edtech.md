# Example — 5 file shared đã điền (minh họa: English learning app)‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

> **File ví dụ tham khảo** — KHÔNG phải khuôn bắt buộc. Khi scaffold cho dự án thật, dùng khối
> placeholder trong `SKILL.md` Mục "Template per target" và điền bằng nội dung THẬT của dự án đó
> (hỏi user / extract từ feature docs) — TUYỆT ĐỐI không copy thuật ngữ EdTech dưới đây sang domain
> khác. File này chỉ cho thấy "1 bộ shared docs đã điền đầy đủ trông thế nào".

## definitions.md (ví dụ đã điền)‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

```markdown
## Glossary

### Learner
Người học sử dụng app để cải thiện kỹ năng tiếng Anh. Phân biệt với `Teacher` (mentor) và `Admin` (operator).
**Appears in:** payment, onboarding, lesson
**Aliases:** User, Student (tránh dùng — dùng "Learner" thống nhất)

### Lesson
Đơn vị học tập có thời lượng 5-10 phút, gồm 1 skill (vocab/grammar/listening) + 1 practice activity + 1 quick check.
**Appears in:** lesson, review
**Related:** [[docs/_shared/definitions.md#Skill]]

## Actor Registry

| Canonical | Loại | Aliases (tránh dùng) | Mô tả ngắn |
|---|---|---|---|
| Learner | primary | User, Student, Người học | Người dùng cuối học tiếng Anh |
| Admin | primary | Operator, Quản trị viên | Vận hành hệ thống qua dashboard |
| Backend | system | Hệ thống, Server, BE, Auth System | Hệ thống xử lý nghiệp vụ phía sau |
```

## operating-environment.md (ví dụ đã điền)‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

```markdown
## Target Platforms
- Mobile: iOS 14+, Android 9+
- Web: Chrome/Safari/Edge latest 2 versions
- Tablet support: defer Phase 2

## Target Users
- Primary: Vietnamese learners CEFR A2-B2
- Secondary: English speakers learning VN (Phase 2)

## Network Assumptions
- Online-first; offline lesson cache last 3 unfinished lessons

## Regions & Languages
- Launch: Vietnam (VN)
- UI languages: vi (default), en
- Future: id, th (Phase 3)

## Compliance Scope
- PDPA Vietnam (Nghị định 13/2023)
- COPPA nếu open age <13 (Phase 2 decision)
```

## conventions.md (ví dụ đã điền)‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

```markdown
## Naming
- User-facing terms: Title Case ("Daily Streak", không "daily streak")
- Internal IDs: see [[.claude/rules/naming-conventions.md]]

## Tone of Voice
- Friendly + encouraging, KHÔNG patronizing
- Tiếng Việt: dùng "bạn" (không "anh/chị")
- English: use "you", contractions OK

## Date / Number / Currency
- Date display: `DD/MM/YYYY` (vi), `MMM DD, YYYY` (en)
- Currency: VND no decimal, USD 2 decimal
- Large numbers: comma separator (1,000)

## Error Messages
- Format: `{What happened}. {What user can do.}`
- Example: "Mạng yếu. Thử lại sau 5 giây."
- KHÔNG: error code raw, technical jargon
```

## system-overview.md (ví dụ đã điền — các section ngoài Architecture)‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

```markdown
## Actors
- Learner — primary user, completes lessons
- Teacher — creates content, reviews progress (Phase 2)
- Admin — operator dashboard

## Subsystems
- Auth & Identity
- Lesson Engine (delivery + scoring)
- Spaced Repetition Scheduler
- Progress Tracking + Gamification
- Payment & Subscription

## Feature Map
| Feature | Status | Subsystem |
|---------|--------|-----------|
| onboarding | approved | Auth |
| lesson-core | in-review | Lesson Engine |
| streak | draft | Gamification |

## External Integrations
- Stripe — payment
- Firebase — auth + push notifications
- Google Cloud Speech — pronunciation scoring (Phase 2)
```

## screen-patterns.md (ví dụ đã điền)‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

```markdown
## Header Pattern
- Left: back button (when not root)
- Center: screen title (max 24 chars)
- Right: action icon (settings/help/close)

## Empty State Pattern
- Illustration centered top
- 1-line headline ("Chưa có lesson nào")
- 1-line subtext giải thích
- Primary CTA button

## Loading State Pattern
- Skeleton screen (KHÔNG spinner) cho content list
- Spinner only cho action button (submit/save)
- Timeout 10s → show error state với retry

## Error Toast Pattern
- Position: top, slide down
- Auto-dismiss 4s (or tap to dismiss)
- Color: red (error), yellow (warn), green (success)
```


<!-- wm:2b9af6c9b691879b1ddb7a04d29a1c88 -->
<sub>Tài liệu thuộc bộ AI4BA BA-Kit — bản quyền hoangphan.blog</sub>
