# App shell — route và khuôn màn hình‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

> Reference cho `/prototype-next`. Prototype phải trông như sản phẩm đang chạy, không phải tập màn rời ghép lại.
>
> `auth-guard.tsx` và `(auth)/layout.tsx` đã là template do `proto-scaffold.mjs` chép — file này chỉ nói __cách dùng__ và phần AI phải tự dựng.

## 1. Cấu trúc route‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

Route group tách vỏ: nhóm auth không sidebar, nhóm app có.

```
src/app/
├── layout.tsx              ← HydrationGate + Toaster + DemoToolbar
├── page.tsx                ← có phiên → /app/home, chưa → /login
├── (auth)/                 ← layout template: box 400px căn giữa
│   ├── login/page.tsx
│   ├── signup/page.tsx
│   ├── verify-email/{sent,success,expired}/page.tsx
│   └── {forgot,reset}-password/page.tsx
└── (app)/                  ← AuthGuard + AppShell
    ├── layout.tsx
    └── app/{home,settings/security}/page.tsx
```

__Trạng thái loại trừ nhau thì mỗi cái một địa chỉ riêng__ (`verify-email/success` vs `.../expired`) — per `ba-conventions.md` Mục 8. Không vẽ 2 khối cạnh nhau rồi ẩn/hiện: người đọc hiểu nhầm là màn có cả hai.

`AuthGuard` đặt trong `(app)/layout.tsx`, __bên trong__ `HydrationGate` — nếu không, lần render đầu chưa có state sẽ đá nhầm người đang có phiên về màn đăng nhập.

## 2. App shell‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

```
┌────────────────────────────────────────────┐
│  [logo] {tên app}          🔔   [AN ▾]     │  ← topbar: user menu, đăng xuất
├──────────┬─────────────────────────────────┤
│ Trang chủ│                                 │
│ Bài học  │      nội dung trang             │
│ ──────── │                                 │
│ Cài đặt  │                                 │
└──────────┴─────────────────────────────────┘
```

* Sidebar đọc từ `src/lib/demo/nav.ts` — thêm feature là thêm 1 mục, không sửa layout.
* Mục thuộc feature __chưa dựng__ vẫn hiện, dẫn tới màn "Phần này chưa nằm trong prototype" — cho thấy bối cảnh sản phẩm mà không giả vờ đã có.

## 3. Dịch bảng mô tả element thành component‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

`proto-facts.json` → `screenDetails[].elements[]`, mỗi element đã tách sẵn:

| Trường | Thành gì trong code |
|---|---|
| `items` | Nhãn field |
| `controlType` | Component (Textbox → `<Input>`, Button Primary → `<Button>`) |
| `dataType` | Kiểu input + `autocomplete` đúng ngữ nghĩa |
| `description.layers['Mục đích']` | Comment trên component |
| `description.layers['Validation']` | Hàm trong `rules.ts` |
| `description.layers['States']` | pristine / touched / submitting / error / disabled |
| `description.layers['Navigation…']` | `router.push` khi thành công |
| `description.layers['Error…']` | Wording từ `_generated/errors.ts` |
| `description.layers['Edge…']` | Xử lý riêng (lỗi mạng không tăng bộ đếm, chống lộ email tồn tại) |‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

Nhãn lớp có thể khác nhau giữa doc (`Error — sai thông tin`, `Navigation success`) — engine gom theo nhãn gốc, đọc `layers` để biết có gì.

Engine báo màn nào __không bóc được__ thì Read tay đúng file đó.

## 4. Vòng đời field‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

```
pristine ──blur──> touched ──gõ tiếp──> validate lại ngay
   │                  ▲
   └──submit──────────┘   (submit đánh dấu TOÀN BỘ field là touched)
```

* Field mới render: __không hiện lỗi__, `aria-invalid="false"`.
* Chỉ validate field vừa rời — không nổ lỗi cả form khi user mới chạm ô đầu.
* Đã touched thì mỗi lần gõ validate lại: sửa đúng là lỗi biến mất ngay.
* Field lỗi: `aria-invalid="true"` + `aria-describedby` trỏ đúng phần tử thông báo.
* __Format tách khỏi validate, chạy trước__: gõ `1602` vào ô hết hạn hiện `16/02` ngay; lỗi "tháng không hợp lệ" chỉ xuất hiện sau khi field touched.

## 5. Hai loại dữ liệu khi điều hướng

| Loại | Ví dụ | Nơi sống | Khi quay lại màn |
|---|---|---|---|
| Nhập lại mỗi lượt | email/password ở màn đăng nhập | React state | __Mất là đúng__ |
| Context của flow đang chạy | email vừa đăng ký, hiện ở màn "đã gửi email" | zustand store | __Giữ nguyên__ |

Chuyển route là component unmount → React state tự mất. Điều cần canh là __đừng nhét input tạm vào store__ rồi tự tạo ra vấn đề.

## 6. Bước ngoài màn hình

Bấm link trong email, token hết hạn, thời gian trôi, callback OAuth — app thật không có nút cho những việc này.

__Đặt trong Demo Toolbar, không đặt giữa màn app.__ Nút "Mô phỏng: bấm link xác nhận" nằm giữa màn đăng ký sẽ bị đọc nhầm là chức năng của sản phẩm.

Ngoại lệ hợp lý: __màn hộp thư giả__ riêng (`/demo/inbox`) trông như email client, hiện các email hệ thống với link bấm được — đủ giống thật để dùng khi thuyết trình, và người xem hiểu ngay đây là hộp thư chứ không phải màn của app.

## 7. Đăng nhập qua nhà cung cấp ngoài (Google…)

Bấm → __dialog giả chọn tài khoản__ (danh sách 2-3 email mẫu + "Dùng tài khoản khác"), rồi chạy đúng nhánh trong đặc tả: email chưa có → tạo mới đã xác nhận; email trùng → tự liên kết; bấm Hủy → nhánh thất bại.

Bấm thẳng vào app không qua dialog thì mất luôn nhánh "người dùng hủy giữa chừng" — mà đó là edge case đặc tả có ghi.

## 8. Trạng thái màn

Mỗi màn có dữ liệu phải xử lý đủ: __đang tải / có dữ liệu / rỗng / lỗi__. Trạng thái rỗng phải có nội dung hướng dẫn, không để trắng.‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍


<!-- wm:2b9af6c9b691879b1ddb7a04d29a1c88 -->
<sub>Tài liệu thuộc bộ AI4BA BA-Kit — bản quyền hoangphan.blog</sub>
