---
type: states
feature: production-scheduling
updated: 2026-09-18
---

# production-scheduling — State Diagrams

## Entity: ScheduleRun (`solve_status`)

```mermaid
stateDiagram-v2
    [*] --> Pending: Quan doc bam Lap lich chi tiet
    Pending --> Running: Backend bat dau solve
    Running --> Optimal: Solver tim duoc loi giai toi uu trong han
    Running --> Feasible: Het 900s chua toi uu dung loi giai tot nhat
    Running --> Infeasible: Khong tim duoc loi giai hop le
    Optimal --> [*]
    Feasible --> [*]
    Infeasible --> [*]
```

Trigger: `Pending`/`Running` là trạng thái tạm trong 1 request đồng bộ (không lưu DB); chỉ trạng thái cuối (`Optimal`/`Feasible`/`Infeasible`) được ghi vào cột `solve_status` của `schedule_runs` khi request hoàn tất.
