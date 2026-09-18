---
name: code-explorer
description: >
  Domain knowledge để map một codebase lạ + cluster thành FEATURE NGHIỆP VỤ
  (không phải module). Dùng bởi /code-to-srs (Phase A map + Phase B cluster).
  Nạp cùng stacks-reference. Không phải skill điểm-vào (không user-invocable).
user-invocable: false
---
<!-- Licensed to vandungvo2003@gmail.com — Order YYWVQ3VWE -->

# Code Explorer — map codebase + cluster feature nghiệp vụ‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

> __Vai trò:__ engine đọc-code cho `/code-to-srs`. Trả về (1) bản đồ codebase (stack/kiến trúc/entry point) và
> (2) danh sách __feature nghiệp vụ__ để feed vào `reverse-plan.json`. Bổ trợ `stacks-reference` (recipe bóc
> fact theo stack) — file này lo phần "đọc rộng để CHIA feature", stacks-reference lo phần "bóc fact 1 feature".

## Nguyên tắc vàng: FEATURE ≠ MODULE‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

* __Module__ = đơn vị code (`src/payments/`, `AuthModule`).
* __Feature__ = việc __user làm được__ ("đăng nhập bằng Google", "thanh toán qua PayPal", "đặt lại mật khẩu").

1 module có thể chứa nhiều feature; 1 feature có thể trải nhiều module. Đặt tên feature theo góc nhìn user,
kebab-case ASCII (`naming-conventions.md`):
* ✅ `payment-paypal`, `login`, `password-reset`, `dashboard-admin`
* ❌ `PaymentModule`, `auth`, `user-management`

## Phase A — Map codebase (route-first, KHÔNG đọc-sâu vội)‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

> __Nguyên tắc repo lớn (đa số dự án thật):__ KHÔNG đọc thân file trong Phase A. Chỉ (1) __đếm tổng file__ để
> biết độ nặng, rồi (2) scan __khung feature__ = danh sách route/nav/controller/migration (unit list rẻ, không
> nổ context vì chỉ là path + tên route). Đọc-sâu thân file để lại Phase D, và CHỈ cho subset user chọn (xem
> GATE-SCOPE). __Do not silently under-scan__ — repo có hàng trăm controller/màn là bình thường, KHÔNG sample
> /truncate danh sách unit; danh sách dài là *tín hiệu thật*, không phải nhiễu để cắt.

### A.1 Đếm quy mô + file tree (KHÔNG `head` cứng làm sót)‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍
```bash
# Đếm tổng file mã (để quyết định repo "nặng" hay không — xem GATE-SCOPE)
find . -type f \
  | grep -v node_modules | grep -v .git | grep -v __pycache__ \
  | grep -v "\.pyc$" | grep -v "/dist/" | grep -v "/build/" \
  | grep -v "\.min\." | grep -v "/coverage/" | grep -v "\.lock$" \
  | wc -l
# Cây thư mục cấp cao (định hướng kiến trúc — KHÔNG cần liệt kê hết file body)
find . -maxdepth 3 -type d | grep -v node_modules | grep -v .git | sort | head -80
```

> Bỏ `head -300` cứng cũ (cắt theo alphabet → sót feature). Việc "liệt kê hết unit" nằm ở Phase B (route/nav/
> controller list qua recipe `stacks-reference`), rẻ và đầy đủ; KHÔNG cần dump toàn bộ file body ở A.1.

### A.2 Stack detection‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍
```bash
# Node
cat package.json 2>/dev/null | python3 -c "
import json,sys; d=json.load(sys.stdin)
print('name:', d.get('name'))
print('scripts:', list(d.get('scripts',{}).keys()))
print('deps:', list(d.get('dependencies',{}).keys())[:25])
" 2>/dev/null

cat requirements.txt 2>/dev/null || cat pyproject.toml 2>/dev/null   # Python
cat pom.xml 2>/dev/null | grep -E "<artifactId>|<version>" | head -10 # Java
cat go.mod 2>/dev/null                                                # Go
cat composer.json 2>/dev/null | python3 -c "import json,sys; d=json.load(sys.stdin); print(list(d.get('require',{}).keys()))" 2>/dev/null  # PHP
```

> Xác định stack xong → chuyển sang recipe stack tương ứng trong `stacks-reference.md` để bóc route/model/DTO.

### A.3 README + docs có sẵn
```bash
cat README.md 2>/dev/null || cat readme.md 2>/dev/null
ls docs/ 2>/dev/null
```

### A.4 Infra hints
```bash
cat docker-compose.yml 2>/dev/null | grep -E "image:|build:|ports:" | head -20
ls Dockerfile* .env.example .env.sample 2>/dev/null
```

## Phase B — Nhận diện feature nghiệp vụ (4 nguồn signal, ưu tiên góc nhìn user)

Đọc 4 loại signal (ưu tiên trên xuống — cái sau chỉ để bổ sung/xác nhận):

1. __Route / URL definitions__ — mỗi route group = 1 feature candidate. Dùng recipe stack trong
   `stacks-reference.md` (App Router `page.tsx`, NestJS `@Controller`, Django `urls.py`, ...).
2. __Navigation / menu ở frontend__ — lộ TÊN feature thật user thấy (đáng tin hơn tên folder code).
3. __README__ — nếu có, mô tả tính năng bằng ngôn ngữ user.
4. __Migration / schema file names__ — lộ concept nghiệp vụ (bảng `subscriptions`, `refunds` → feature).

### Kiểm hạt feature (granularity)
* Tên kiểu "quản lý / và / hoặc" (vd `user-management`) → thường là NHIỀU feature, cân nhắc tách
  (`register`, `login`, `password-reset`, `profile-edit`).
* 1 field/endpoint lẻ không đứng độc lập → cân nhắc gộp vào feature lớn hơn.
* __Mơ hồ tách/gộp → tự quyết theo signal + ghi note/OQ, KHÔNG dừng hỏi user__ (theo nguyên tắc nền
  `/code-to-srs`: code = proof).

### Cluster bằng BẰNG CHỨNG gọi/dữ liệu chéo repo (KHÔNG theo tên gần nhau)
* Frontend screen/route + controller(s) nó __thực sự gọi__ (khớp path-constant frontend với endpoint
  controller) = __1 feature__. Batch/job đọc-ghi cùng bảng/bucket mà controller cluster khác đụng → **nhập‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍
  cluster đó**.
* __KHÔNG cluster theo tên/số gần nhau__ (2 unit cùng prefix số KHÔNG đương nhiên cùng feature) — đòi **bằng
  chứng call/data thật**. Không tìm được bằng chứng nối → **giữ tách + ghi `grouping_note`**, KHÔNG đoán.
* __Cross-cutting__ (auth chung/health-check/util) → cho vào list `shared_infrastructure` riêng — **disclosed,
  KHÔNG tính là feature**, không force-fit vào 1 luồng.

### Priority order (điền vào plan + gợi ý thứ tự làm cho GATE-SCOPE)
1. Auth features (login, register, password-reset).
2. Core business features (thứ chính app làm).
3. Secondary features.
4. Admin / management features.

### GATE-SCOPE — repo lớn thì hỏi user chọn subset TRƯỚC khi đọc-sâu (mục 2)
Sau khi có danh sách feature-candidate (đầy đủ, chưa đọc-sâu):

1. __In bảng feature cho user THẤY__: `# | feature | unit/route nguồn | repo | confidence | trùng doc?` +
   dòng tổng kết độ nặng (số feature · số repo · ước lượng file/feature).
2. __Repo NẶNG__ — vượt ngưỡng (đề xuất: __> ~25 feature__ HOẶC __> ~1500 file mã__, HOẶC nhiều repo) →
   __DỪNG + WARN__: *"Codebase lớn ({N} feature) — nên làm lần lượt để chắc + không vỡ context. Anh chọn làm
   nhóm nào trước?"* + cho chọn: `all` · danh sách feature cụ thể · theo nhóm ưu tiên (auth → core → admin).
   __Wait user chọn.__ Đây là điểm dừng hỏi __PHẠM VI LÀM__, KHÔNG phải hỏi nghiệp vụ (vẫn hợp lệ với nguyên
   tắc "code = proof, không hỏi nghiệp vụ"). Feature không chọn → ghi `status: "deferred"` trong plan (lần
   sau chạy lại làm tiếp, resumable).
3. __Repo nhỏ__ (dưới ngưỡng) → vẫn in bảng nhưng __chạy tiếp không chặn__ (như hiện tại — bảng là
   informational, user chỉnh được nhưng không bắt buộc).

## Output feed cho reverse-plan.json

Mỗi feature tạo 1 entry (schema chung với `/reverse-doc`, `sources` là __đường dẫn code__ thay vì S-id tài liệu):

```json
{
  "slug": "login",
  "sources": ["src/auth/auth.controller.ts", "src/auth/auth.service.ts", "src/auth/auth.guard.ts"],
  "existing_doc": null,
  "confidence": "medium",
  "complexity_flags": ["oauth", "throttle"],
  "status": "pending"
}
```

* `sources` = __source_paths + key_files__ (max ~7 file/feature, ưu tiên: routes → controllers/views →
  services → models/schemas → guards → __tests__ → config). __Test là NGUỒN hạng nhất__ (không chỉ để đếm)
  — nó cấp fact ✅ về boundary/flow/edge mà code sản phẩm hay không lộ (xem `stacks-reference` R1). i18n
  catalog cũng nên có trong sources nếu feature có lỗi dùng mã khóa (R2).
* `status`: `pending` (sẽ làm) · `deferred` (user chưa chọn ở GATE-SCOPE, để lần sau) · `done` (đã Write).
* `complexity_flags`: `oauth` / `payment` / `webhook` / `async` / `multi-role` / `state-machine` / `throttle`
  / `external-redirect` — dò từ deps + code, để Phase D biết Mục nào cần điền kỹ.
* `existing_doc`: điền `docs/{feature}/` nếu dò trùng qua KG (xem `kg-usage.md`) — sẽ điền Mục 0.3 trong spec.

## Chống bịa (khớp triết lý reverse)

* CHỈ nhận diện feature có __route/nav/migration làm bằng chứng__. Không suy feature "chắc có" mà không có
  file nào backing.
* Feature nhận diện từ code = __cái user LÀM được (fact)__; nhưng __vì sao / cho ai / mục tiêu nghiệp vụ__
  code không nói → mặc định 🟡 Inferred trong spec + OQ. Đừng để "map được code" thành "hiểu được nghiệp vụ".
* __Nghi dead-code / flag-tắt__ (route no-caller, `@Deprecated`, `if(false)` — xem `stacks-reference` R3) →
  KHÔNG tái lập như feature chắc; hạ 🟡 + OQ + negative-search. Cluster `shared_infrastructure` KHÔNG tính là
  feature.‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍


<!-- wm:2b9af6c9b691879b1ddb7a04d29a1c88 -->
<sub>Tài liệu thuộc bộ AI4BA BA-Kit — bản quyền hoangphan.blog</sub>
