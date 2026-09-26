---
type: flows
feature: production-scheduling
updated: 2026-09-18
---

# production-scheduling — Flows

## Flow: Lập lịch chi tiết

```mermaid
sequenceDiagram
    actor QD as Quan doc
    participant FE as Frontend
    participant BE as Backend API
    participant ENG as CP-SAT Engine
    participant DB as Database

    QD->>FE: Chon ky 2 tuan, bam Lap lich chi tiet
    FE->>BE: POST /scheduling/detailed/run
    BE->>DB: Doc aggregate run + master data
    alt Thieu aggregate run
        BE-->>FE: E-production-scheduling-002 thieu input
    else Thieu changeover pair
        BE-->>FE: E-production-scheduling-003 thieu du lieu
    else Du du lieu
        BE->>ENG: Solve FJSP toi da 900s
        alt OPTIMAL trong han
            ENG-->>BE: Lich hop le + solve_status=OPTIMAL
            BE->>DB: Luu schedule_runs + schedule_run_results
            BE-->>FE: Gantt chi tiet
        else Timeout chua OPTIMAL nhung co loi giai FEASIBLE
            ENG-->>BE: FEASIBLE tot nhat E-production-scheduling-001
            BE->>DB: Luu kem solve_status=FEASIBLE
            BE-->>FE: Gantt + canh bao
        else INFEASIBLE that su
            ENG-->>BE: Khong co loi giai hop le E-production-scheduling-005
            BE->>DB: Luu kem solve_status=INFEASIBLE, khong ghi Gantt
            BE-->>FE: Loi ro rang buoc xung dot
        end
    end
    FE-->>QD: Hien thi Gantt hoac thong bao loi
```

Nhánh lỗi tham chiếu: E-production-scheduling-001, E-production-scheduling-002, E-production-scheduling-003, E-production-scheduling-004 (chèn bảo trì khuôn — xảy ra bên trong bước solve, không tách nhánh riêng ở sequence này vì không đổi luồng thành công), E-production-scheduling-005.

## Flow: Xem lại kết quả 1 lần chạy

```mermaid
sequenceDiagram
    actor QD as Quan doc
    participant FE as Frontend
    participant BE as Backend API
    participant DB as Database

    QD->>FE: Chon run_id tu lich su
    FE->>BE: GET /scheduling/detailed/run_id
    BE->>DB: Doc schedule_run_results theo run_id
    alt run_id ton tai
        DB-->>BE: Ket qua da luu
        BE-->>FE: Gantt chi tiet
    else run_id khong ton tai
        BE-->>FE: Loi khong tim thay lan chay
    end
    FE-->>QD: Hien thi Gantt hoac loi
```
