## Screen: {{screen_slug}} — {{screen_name}}‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

### Wireframe (ASCII)‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

```text
<!-- ASCII wireframe sẽ fill ở đây -->
```

### Screen description‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

>

| # | Items | Control type | Data type | Description |
|---|-------|--------------|-----------|-------------|
| 1 | {{field_1 — vd "Email"}} | Textbox | Text | • **Mục đích**: {{business meaning — vd định danh account, BR-xxx}}<br>• **Required**. Validate {{rule}}. Max {{N}} chars ({{BR-xxx}})<br>• **Default** rỗng, focus on load · **Placeholder** "{{text}}"<br>• **States**: default / focus / error<br>• **State error**: viền đỏ + inline "{{E-{feature}-NNN: ...}}"<br>• **Edge**: {{anti-enumeration / security... nếu áp — NFR-xxx}} |
| 2 | {{field_2 — vd "Gửi"}} | Button | Click | • **Disabled khi** {{condition}}<br>• **State submitting**: text "Đang gửi...", spinner, disabled<br>• **Click → BE** {{endpoint nghiệp vụ}}<br>• **Success** → redirect {{Screen X}}<br>• **Fail** → banner "{{E-NNN: ...}}"<br>• **Note**: {{anti-enumeration / security / consent... nếu áp dụng}} |
| 3 | {{field_3 — vd "Quên mật khẩu"}} | Link | Click | • **Navigate** sang {{Forgot screen}} |
| 4 | {{field_4 — vd "Disclaimer"}} | Label | ReadOnly | • **Display**: "{{text}}"<br>• **Display rule**: {{khi nào hiện/ẩn}} |

**Control type** (cột Items thuộc loại control nào): `Label`, `Textbox`, `Text area`, `Button`, `Link`, `Checkbox`, `Radio button`, `Dropdown`, `Browse Button`, `DatePicker`, `Toggle`, `Image`, `Banner`, `Toast`, `Modal trigger`.‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

**Data type** (hành vi tương tác — KHÔNG phải kiểu dữ liệu lập trình): `ReadOnly` (label/banner tĩnh), `Text` (nhập tự do), `Click` (button/link trigger), `Check` (checkbox/radio), `Select` (dropdown), `Number`, `Date`, `File`.

**Description column — SÂU 6 lớp** (per `.claude/rules/ba-conventions.md` Mục 6), rút từ `srs/{feature}-spec.md` (FR/BR/NFR/Error) + `uc-*.md` branches, KHÔNG nông/bịa:
1. **Mục đích nghiệp vụ** (business meaning)
2. **Validation / ràng buộc** — required, rule cụ thể (BR-xxx), default, placeholder; cả điều KHÔNG áp
3. **States** — default/focus/disabled/submitting/error/success (chỉ state thật có)
4. **Navigation** — trigger đi đâu, enable/disable
5. **Error + wording** — `E-{feature}-NNN` + wording exact + hệ quả
6. **Edge/security/compliance** — anti-enumeration, audit, lỗi mạng, auto-link, fallback (NFR-xxx)

Gọn nhưng đủ — KHÔNG lặp 1 ID nhiều lần. Thiếu nguồn (chưa có SRS) → hỏi user bổ sung, KHÔNG bịa.‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍


<!-- wm:2b9af6c9b691879b1ddb7a04d29a1c88 -->
<sub>Tài liệu thuộc bộ AI4BA BA-Kit — bản quyền ai4ba.com</sub>
