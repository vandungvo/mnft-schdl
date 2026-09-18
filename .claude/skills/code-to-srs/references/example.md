# Ví dụ — `/code-to-srs` tái lập feature `login` từ code‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

> Minh hoạ **nhãn bất đối xứng** (điểm cốt lõi phân biệt code-to-srs với reverse-doc) + IT-BA framing
> (endpoint chỉ ở cột Nguồn) + 3 nguồn đặc thù code (**test**, **i18n**, **dead-code**) + phụ lục
> **`_evidence.md`**. Đây là trích đoạn, KHÔNG phải bộ đầy đủ.

## Code nguồn (giả định)‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

```ts
// src/auth/auth.service.ts
async login(email: string, pw: string) {
  const user = await this.users.findByEmail(email);
  if (!user) throw new UnauthorizedException('Invalid login credentials.');
  if (user.failedAttempts >= 10)               // ← constant MAX_ATTEMPTS = 10
    throw new ForbiddenException('Account locked. Try again in 24 hours.');
  const ok = await bcrypt.compare(pw, user.passwordHash);
  ...
}
```
```ts
// src/auth/auth.constants.ts
export const MAX_LOGIN_ATTEMPTS = 10;
export const LOCKOUT_DURATION_H = 24;
```

## Trích spec tái lập — Mục 5 Business Rules‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

| ID | Rule | Trigger | Implements FR | Nguồn | Nhãn |
|----|------|---------|---------------|-------|------|
| BR-login-001 | Khóa tài khoản 24 giờ sau 10 lần đăng nhập sai liên tiếp | Lần đăng nhập sai thứ 10 | FR-login-002 | S1 auth.service.ts:5 · S2 auth.constants.ts:1-2 | ✅ |
| BR-login-002 | Thông báo lỗi đăng nhập KHÔNG tiết lộ email có tồn tại hay không (dùng chung 1 wording) | Sai email HOẶC sai mật khẩu | FR-login-001 | S1 auth.service.ts:4 | 🟡 |

## Trích Mục 12 / reverse-gaps.md — cái code KHÔNG nói‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

* [ ] OQ-1: **Vì sao chọn ngưỡng 10 lần / khóa 24 giờ?** — code khẳng định con số (✅) nhưng không nói lý do
  nghiệp vụ / có yêu cầu compliance nào không. *(liên quan: Mục 5 BR-login-001 · cần: PO/Security quyết)*
* [ ] OQ-2: **Thông báo lỗi chung có phải chủ đích chống dò email (anti-enumeration)?** — suy từ 1 wording
  dùng chung (🟡 — chỉ 1 chỗ code + là business-intent), code không có comment xác nhận ý định. *(cần: BA/Security xác nhận)*

## Bài học minh hoạ‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

| Điều code khẳng định | Nhãn | Điều code KHÔNG nói | Nhãn |
|---|---|---|---|
| Ngưỡng 10 lần, khóa 24h (constant) | ✅ | Vì sao là 10/24h (business intent) | 🟡 → OQ |
| Wording lỗi exact | ✅ | Có phải chủ đích anti-enumeration | 🟡 → OQ |
| Có `bcrypt.compare` | ✅ (dùng làm provenance) | KHÔNG viết "gọi bcrypt.compare" ra Mục FR — chỉ "hệ thống xác minh mật khẩu" | — |

---

## Nguồn TEST — bóc boundary/rule-ngược code sản phẩm không lộ (R1)

```ts
// src/auth/__tests__/lockout.spec.ts
describe('login lockout', () => {
  it('does NOT lock on the 9th failed attempt', ...)          // ← boundary chính xác
  it('locks account on the 10th consecutive failure', ...)
  it('resets the failed-attempt counter after a successful login', ...)  // ← rule NGƯỢC
  it.skip('keeps lockout for 24h even if password becomes correct', ...)  // ← bị SKIP
})
```

Từ test bóc thêm được (code sản phẩm `>= 10` mơ hồ, không nói "reset khi nào"):

| ID | Rule | Nguồn | Nhãn |‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍
|----|------|-------|------|
| BR-login-003 | Lần sai thứ 9 CHƯA khóa; đúng lần thứ 10 mới khóa (ranh giới) | S3 lockout.spec.ts:3-4 | ✅ |
| BR-login-004 | Bộ đếm sai reset về 0 khi đăng nhập thành công | S3 lockout.spec.ts:5 | ✅ |
| BR-login-005 | Trong 24h khóa, nhập đúng mật khẩu vẫn không mở khóa | S3 lockout.spec.ts:6 | 🟡 |

* BR-005 = **🟡** vì test `it.skip` (tồn tại nhưng bị tắt) → thêm OQ-3 "hành vi này còn đúng không? test đang
  skip" vào `reverse-gaps.md`. Hành vi từ test active (BR-003/004) = ✅; **"vì sao 10" vẫn 🟡** (test không nói).

## Nguồn i18n — wording lỗi THẬT, không phải mã khóa (R2)

```ts
// src/auth/auth.service.ts (bản dùng i18n)
throw new ForbiddenException(this.i18n.t('errors.account_locked'));
// src/i18n/en.json →  "errors": { "account_locked": "Your account is locked. Try again in 24 hours." }
```

| Error ID | Wording exact (câu THẬT từ catalog) | Nguồn (throw + catalog) | Nhãn |
|----------|-------------------------------------|-------------------------|------|
| E-login-002 | *"Your account is locked. Try again in 24 hours."* | S1 auth.service.ts:6 · S4 i18n/en.json:2 | ✅ |

Skill **resolve mã `errors.account_locked` → câu thật** rồi mới ghi Error Matrix. Nếu chỉ thấy mã mà không
tìm ra câu → ghi mã + `⚠️ chưa resolve` + Gap, KHÔNG bịa câu.

## Dead-code / flag — tránh tái lập feature đã chết (R3)

```ts
// src/auth/auth.controller.ts
@Post('login-legacy')  @Deprecated()         // ← route cũ
loginLegacy() { ... }                         // grep 'login-legacy' trong frontend → KHÔNG có caller
```

→ KHÔNG tạo FR cho `login-legacy`. Ghi OQ-4 vào `reverse-gaps.md`:
> OQ-4: Route `login-legacy` có `@Deprecated` + **không thấy caller sau khi tìm** (grep `login-legacy` trong
> `emsenble-main/src/common/RequestPath.ts` + router — 0 hit). Còn dùng không, hay xoá được? *(cần: dev/PO)*

## Phụ lục `_evidence.md` — điểm nghiệp vụ → luồng nào (§Cross-repo hops)

```
## §6. Cross-repo hops
| Điểm khởi phát | → tới đâu | Cơ chế | Luồng liên quan | Nguồn 2 đầu |
| login thành công (api) | worker gửi cảnh báo | ghi bản ghi login_audit → worker đọc | luồng "giám sát đăng nhập" | api-main/src/auth/auth.service.ts:20 · worker-main/src/audit/audit.consumer.ts:12 |
```

Đây là chỗ trả lời "**điểm nghiệp vụ khóa-tài-khoản này liên quan luồng audit ở repo worker**" — provenance kỹ
thuật gom ở `_evidence.md`, spec vẫn đọc business language. (Feature single-repo thì §6 ghi "— không có hop
chéo repo", KHÔNG bịa.)

---

**Chốt:** code cho "how" chắc chắn (✅ + `file:line`); **test** cho boundary/edge/rule-ngược (✅, skip→🟡);
**i18n** cho wording lỗi thật (✅); **dead-code** → OQ + negative-search; "why/who/what-for" luôn 🟡 + OQ. Tên
function/endpoint chỉ sống ở cột Nguồn + `_evidence.md`, spec đọc như tài liệu nghiệp vụ.‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍


<!-- wm:2b9af6c9b691879b1ddb7a04d29a1c88 -->
<sub>Tài liệu thuộc bộ AI4BA BA-Kit — bản quyền ai4ba.com</sub>
