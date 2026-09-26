---
type: erd
feature: production-scheduling
updated: 2026-09-18
---

# production-scheduling — ERD

```mermaid
erDiagram
    SCHEDULE_RUN ||--o{ SCHEDULE_RUN_RESULT : contains
    SCHEDULE_RUN_RESULT }o--|| MACHINE : "assigned to"
    SCHEDULE_RUN_RESULT }o--|| ORDER_ITEM : "produces for"
    SCHEDULE_RUN_RESULT }o--|| SHIFT : "runs in"
    SCHEDULE_RUN_RESULT }o--o| MOLD : uses

    SCHEDULE_RUN {
        int id PK
        string run_type
        string input_hash
        string solve_status
        datetime created_at
    }
    SCHEDULE_RUN_RESULT {
        int run_id FK
        date day
        int machine_id FK
        string job_name
        datetime start
        datetime end
        int shift_id FK
    }
    MACHINE {
        int id PK
        string name
        string stage
    }
    ORDER_ITEM {
        int id PK
        string type
        int qty
        date due_day
    }
    SHIFT {
        int id PK
        time start_time
        time end_time
    }
    MOLD {
        int id PK
        int machine_id FK
        string product_type
        int max_cycles
        int used_cycles
    }
```

`SCHEDULE_RUN` và `SCHEDULE_RUN_RESULT` do feature `production-scheduling` sở hữu (ghi). `MACHINE`, `ORDER_ITEM`, `SHIFT`, `MOLD` do feature `master-data` sở hữu — chỉ đọc ở đây, đặt tên `ORDER_ITEM` để tránh trùng từ khoá `ORDER` trong Mermaid.

Trường `solve_status` trên `SCHEDULE_RUN` là bổ sung so với data model gốc trong `report/TECHNICAL_SPEC.md` §6 — xem marker Mục 8 của `production-scheduling-spec.md`.
