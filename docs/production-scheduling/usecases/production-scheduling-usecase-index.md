---
type: usecase-index
feature: production-scheduling
status: draft
updated: 2026-09-18
links:
  - docs/production-scheduling/srs/production-scheduling-spec.md
---

# production-scheduling — Use Cases Index

## Use cases

> Bảng này là ma trận truy vết per-feature (UC↔FR↔Screen↔Error↔OQ) đồng thời là metadata/lifecycle.

| # | Slug | Level | Status | Actor primary | Covers FR | Screens | Errors (E-*) | OQ ref | Priority | Updated |
|---|------|-------|--------|---------------|-----------|---------|---------------|--------|----------|---------|
| 1 | [uc-lap-lich-chi-tiet](uc-lap-lich-chi-tiet.md) | user goal | draft | Quản đốc | FR-001..013 | Gantt tầng 2 | E-001, E-002, E-003, E-004, E-005 | — | P0 | 2026-09-18 |
| 2 | [uc-xem-lai-ket-qua-run](uc-xem-lai-ket-qua-run.md) | user goal | draft | Quản đốc | FR-010 | Gantt tầng 2 | — | — | P1 | 2026-09-18 |

## CRUD matrix

| UC \ Entity | ScheduleRun | ScheduleRunResult |
|---|---|---|
| [uc-lap-lich-chi-tiet](uc-lap-lich-chi-tiet.md) | C | C |
| [uc-xem-lai-ket-qua-run](uc-xem-lai-ket-qua-run.md) | R | R |

## Actors

| Actor | Loại | Mô tả | Nguồn |
|---|---|---|---|
| Quản đốc / Ban lãnh đạo | primary, người | Bấm lập lịch, xem Gantt | `production-scheduling-spec.md` Mục 2 |
| Detailed Scheduling Engine (CP-SAT) | system | Giải bài toán FJSP | `production-scheduling-spec.md` Mục 2 |

## Diagram

Chưa vẽ — chạy `/usecase-diagram production-scheduling` khi cần hình cho báo cáo.

## Relationships

Không có quan hệ include/extend giữa 2 use case này (độc lập nhau).

## Nguồn dữ liệu

- FR + Error Matrix: [[../srs/production-scheduling-spec.md|SRS spec]]
- Screens: chưa có (Tier 3 UX chưa chạy)
- Open Questions: `srs/production-scheduling-spec.md` Mục 8 (marker inline, chưa promote)
