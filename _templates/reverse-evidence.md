# {{feature}} — Evidence base (truy vết code → luồng)‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

## §1. Endpoints (điểm vào)‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

| Method | Path | Màn/route gọi | Auth | Mục đích nghiệp vụ | Nguồn (file:line) |
|--------|------|---------------|------|--------------------|-------------------|
| {{method}} | {{path}} | {{screen}} | {{auth}} | {{purpose}} | {{repo/path:line}} |

## §2. Validation (ràng buộc field)‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

| Field | Rule | Giá trị exact | Lỗi khi vi phạm | Nguồn (file:line) | Nhãn |
|-------|------|---------------|-----------------|-------------------|------|
| {{field}} | {{rule}} | {{value}} | {{error}} | {{repo/path:line}} | ✅/🔵/🟡 |

## §3. Errors (lỗi + wording thật)‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

| Error ID | Trigger | Wording exact (câu thật) | Recovery | Nguồn throw + catalog (file:line) | Nhãn |
|----------|---------|--------------------------|----------|-----------------------------------|------|
| {{eid}} | {{trigger}} | {{message}} | {{recovery}} | {{throw:line · catalog:line}} | ✅/🟡 |

## §4. Business Rules (rule + hằng số + state transition)‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

| Rule | Trigger | Hằng số/ngưỡng | Có test phủ? | Nguồn (file:line) | Nhãn |
|------|---------|----------------|--------------|-------------------|------|
| {{rule}} | {{trigger}} | {{constant}} | có/không (test:line) | {{repo/path:line}} | ✅/🔵/🟡 |

## §5. Entities (đối tượng dữ liệu nghiệp vụ)

| Entity | Field nghiệp vụ chính | Quan hệ | Nguồn (file:line) |
|--------|-----------------------|---------|-------------------|
| {{entity}} | {{fields}} | {{relations}} | {{repo/path:line}} |

## §6. Cross-repo hops (điểm nghiệp vụ → luồng liên quan)

| Điểm khởi phát | → tới đâu | Cơ chế (đọc/ghi/gọi) | Luồng nghiệp vụ liên quan | Nguồn 2 đầu (file:line) |
|----------------|-----------|----------------------|---------------------------|-------------------------|
| {{from}} | {{to}} | {{mechanism}} | {{flow}} | {{fromPath:line · toPath:line}} |

## §7. Gaps / Ambiguities (code câm hoặc nghi ngờ)

- {{gap}} — *(nguồn/negative-search: {{pattern đã grep + scope}} · loại: code-câm / test-skip / dead-code-nghi)*‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍


<!-- wm:2b9af6c9b691879b1ddb7a04d29a1c88 -->
<sub>Tài liệu thuộc bộ AI4BA BA-Kit — bản quyền ai4ba.com</sub>
