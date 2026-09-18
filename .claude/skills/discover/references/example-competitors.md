# Cách dựng bộ đối thủ + cột đặc thù cho domain của bạn‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

> Đây là **hướng dẫn hình-dạng-đầu-ra**, KHÔNG phải danh sách đối thủ mặc định. `/discover` không
> mang sẵn đối thủ của domain nào — chúng đọc từ `docs/_shared/project-profile.md` (per
> `.claude/rules/project-profile.md`), lần đầu chưa có thì hỏi user + search rồi ghi vào profile.
> File này trả lời 2 câu: **bảng đối thủ điền xong trông thế nào** và **cột đặc thù domain chọn ra sao**.

## 1. Phân nhóm phân khúc trước khi chọn đối thủ‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

Đừng gom mọi đối thủ vào 1 rổ. Chia phân khúc trước, rồi chọn 3-5 cái **thuộc phân khúc liên quan
tới tính năng đang research** — cùng một tính năng nhưng đối thủ mass-market và đối thủ chuyên sâu
giải rất khác nhau.

Cách chia phân khúc tùy domain, thường theo 2-3 trục sau:

| Trục chia | Ví dụ giá trị |
|---|---|
| **Độ phủ thị trường** | mass-market phổ thông · chuyên sâu một ngách · doanh nghiệp/B2B |
| **Mô hình phục vụ** | tự phục vụ (self-serve) · có người hỗ trợ · lai giữa hai |
| **Chiều mạnh nhất** | mạnh về tự động hóa/AI · mạnh về nội dung · mạnh về cộng đồng · mạnh về giá |
| **Nhóm người dùng** | cá nhân · hộ gia đình/nhóm · tổ chức |

Chọn **3-5 đối thủ**, nêu lý do chọn/bỏ cho user duyệt ở CHECKPOINT 1. Tính năng có chiều chuyên
biệt → thêm 1 **đối thủ gián tiếp**: sản phẩm khác ngành nhưng giỏi đúng tính năng đó (thường là
benchmark nghiệp vụ tốt nhất).

## 2. Bảng đối thủ — format đầu ra‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

Đây đúng là format Mục "Đối thủ / benchmark" của `project-profile.md`. Nghiên cứu xong lần đầu thì
ghi bảng này vào profile để lần sau khỏi tìm lại:

| Tên | Phân khúc | Mạnh về | Mô hình doanh thu | Nguồn / ngày |
|---|---|---|---|---|
| {Đối thủ 1} | {phân khúc theo Mục 1} | {1 cụm — chiều họ vượt trội} | {miễn phí / freemium / thuê bao / trả một lần / B2B} | {URL hoặc "quan sát trực tiếp"} + {YYYY-MM} |
| {Đối thủ 2} | ... | ... | ... | ... |

Ba điều dễ làm sai:‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

* **Bỏ cột nguồn/ngày.** Giá và tính năng đổi liên tục; bảng không ngày là bảng không kiểm chứng
  được (playbook Mục 6 bắt buộc gắn ngày cho mọi dữ liệu pricing/feature).
* **"Mạnh về" viết thành liệt kê tính năng.** Nó phải là *chiều cạnh tranh*, một cụm ngắn — nếu
  viết được 5 gạch đầu dòng thì chưa chắt được ý.
* **Nhét mô hình doanh thu thành một dòng tính năng** ở bảng so sánh sau đó. Đó là thuộc tính kinh
  doanh, để riêng khối cuối (xem `comparison-columns.md`).

## 3. Cột đặc thù domain — chọn thế nào‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

Cột lõi dùng chung nằm ở `comparison-columns.md`. Mỗi domain cần bổ sung **3-6 cột đặc thù**, và
nguyên tắc chọn chỉ có một:

> **Cột đặc thù = chiều mà thắng-thua trong domain đó được quyết định.** Không phải mọi thuộc tính
> liệt kê được.

Cách tìm nhanh: hỏi "nếu hai sản phẩm ngang nhau ở mọi mặt trừ chiều X, khách chọn cái nào?" — X nào
đổi được câu trả lời thì X là cột đặc thù.

Bốn domain minh họa cho thấy chúng khác nhau đến mức nào (mỗi domain một bộ hoàn toàn riêng):

| Domain | Cột đặc thù thường gặp |
|---|---|
| Học tập / nội dung | mức cá nhân hóa theo trình độ · chấm/phản hồi tự động · lớp trò chơi hóa · chi phí duy trì nội dung · quy định dữ liệu trẻ em |
| Tài chính / thanh toán | hạn mức & phí · quy trình định danh (KYC) · chuẩn bảo mật thanh toán · thời gian tiền về · tỷ lệ giao dịch lỗi |
| Vận chuyển / kho vận | cam kết thời gian giao · vùng phủ · độ chi tiết theo dõi đơn · xử lý giao hỏng/hoàn · tích hợp đối tác vận chuyển |
| Thương mại điện tử | phí sàn/hoa hồng · phương thức hoàn tất đơn · chính sách đổi trả · công cụ cho người bán · chống gian lận |

Bảng trên là **gợi ý khởi động, không phải danh sách chuẩn** — mỗi dự án tự chốt bộ cột của mình ở
CHECKPOINT 1 rồi ghi vào profile để lần sau reuse.

## 4. Cột "My app" — điền gì‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

Cột đầu bảng so sánh luôn là sản phẩm của mình, điền từ tài liệu đã có (URD/brainstorm/PRD) hoặc ghi
"chưa có — sản phẩm mới". **Không bịa**: chỗ chưa quyết thì để `—`, chỗ dự kiến thì ghi rõ là dự kiến.
Đây là cột làm cho bảng trở thành công cụ quyết định thay vì bản khảo sát thị trường suông.‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍


<!-- wm:2b9af6c9b691879b1ddb7a04d29a1c88 -->
<sub>Tài liệu thuộc bộ AI4BA BA-Kit — bản quyền hoangphan.blog</sub>
