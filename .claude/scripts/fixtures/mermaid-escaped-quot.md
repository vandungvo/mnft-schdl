# Fixture PHẢI FAIL — dấu nháy bao label bị escape thành `&quot;`‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

> Test hồi quy cho ca thật 2026-08-01 (`authentication-userflow.md`): người dùng báo
> "Invalid mermaid syntax" trong khi file gốc HOÀN TOÀN ĐÚNG. Nguyên nhân là một lớp
> HTML-escape chạy trên cả khối mermaid ở tầng hiển thị, biến `"` thành `&quot;` — label
> mất trạng thái được-quote nên parser vỡ.
>‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍
> Bisect đã chứng minh thủ phạm là `&quot;`, KHÔNG phải `&lt;br/&gt;`:
>   - `n1[&quot;A&lt;br/&gt;B&quot;]` → FAIL
>   - `n1["A&lt;br/&gt;B"]`         → PASS
>
> ĐỪNG "sửa" file này cho pass — nó tồn tại để chứng minh gate còn bắt được lỗi đó.‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

```mermaid
flowchart TD
    n0[&quot;Bắt đầu:&lt;br/&gt;chưa có phiên&quot;]
    n1[&quot;[1] Đăng nhập&lt;br/&gt;(email/password + Google)&quot;]
    n0 --&gt;|&quot;có tài khoản&quot;| n1
```


<!-- wm:2b9af6c9b691879b1ddb7a04d29a1c88 -->
<sub>Tài liệu thuộc bộ AI4BA BA-Kit — bản quyền ai4ba.com</sub>
