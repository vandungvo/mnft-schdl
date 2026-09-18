# Diagram Correctness — vẽ ĐÚNG, không chỉ vẽ ĐẸP‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

> Rule chung cho __mọi skill sinh diagram__ (`/usecase-diagram`, `/sequence`, `/activity`,
> `/activity-swimlane`, `/state`, `/erd`, `/d2-*`, `/dbdiagram`, `/bpmn`, `/user-flow`).
> Mỗi SKILL.md phải reference file này. Sinh ra từ sự cố thật 2026-07-26 (xem Mục 5).

## 1. Nguyên tắc nền — luật đi ngược prior mạnh phải là GATE, không phải lời dặn‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

> __Một luật chỉ tồn tại dạng phát biểu trong prose sẽ THUA một thói quen tần-suất-cao.__

Bằng chứng: `usecase-diagram/SKILL.md` có khối "Hướng mũi tên (CRITICAL — hay sai)" dạy đúng
từ 2026-07-15. Ngày 2026-07-19 skill vẫn sinh ra diagram sai 6 lỗi cùng lúc, vì `-->` là token
vẽ-cạnh phổ biến nhất ở mọi diagram khác (và trong training data). Prose thua prior.

⇒ Với mỗi luật mà __cách viết đúng ngược với cách viết quen thuộc__, bắt buộc phải có:
1) __Gate bằng máy__ chặn trước khi output thành file người ta tin được, VÀ
2) __Bảng ĐÚNG/SAI__ đặt cạnh nhau trong SKILL.md (không phải câu văn xuôi "tránh dùng X").

## 2. Bốn mức "đúng" — KHÔNG được gộp thành một chữ PASS‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

| Mức | Kiểm cái gì | Ai kiểm |
|---|---|---|
| 1. __Cú pháp__ | Compile được không | compiler/renderer (mmdc, d2, plantuml, dbml2sql) |
| 2. __An toàn renderer__ | Renderer strict (GitHub/Obsidian) có crash không | lint riêng — `mmdc` lenient hơn nên tha, phải lint |
| 3. __Ngữ pháp / cấu trúc__ | Đúng luật của LOẠI sơ đồ đó (UML/BPMN/ERD) | linter tất định — __đây là lớp hay thiếu nhất__ |
| 4. __Nghiệp vụ__ | Có khớp đời thực + tài liệu nguồn không | __máy KHÔNG kiểm được__ — người/AI đối chiếu |

__Báo cáo phải in tách từng mức.__ Gộp "✅ PASS" là cách sinh ra ngộ nhận "đã kiểm hết" —
chính là cơ chế làm 6 lỗi UML lọt lưới (render PASS bị đọc thành "diagram đúng").

Mức 4 luôn phải nói rõ __chưa được máy kiểm__, kể cả khi 1-3 đều PASS.

## 3. "Có ra ảnh" KHÔNG phải là verify‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

Sai lầm mẫu: `render.sh` kiểm HTTP 200 + kích thước file > N byte rồi báo PASS.

Mọi lỗi ngữ pháp/luồng đều __render ra ảnh đẹp__: association có mũi tên, include trỏ vào actor,
`if` thiếu `endif`, state không có lối ra, quan hệ ERD không có FK. Kích thước file không nói gì
về tính đúng.

Ngoài ra: PlantUML trả __HTTP 200 kèm ảnh chứa chữ lỗi__ khi cú pháp sai → phải
`grep "Syntax Error\|An error has occured"` trên nội dung SVG, không chỉ xem mã HTTP.

## 4. Lời hứa trong SKILL.md phải KHỚP code thực thi‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

Lớp lỗi riêng, nguy hiểm hơn không-có-check: __cả người lẫn AI đều tin là đã được chặn.__

Ví dụ thật (đã sửa 2026-07-26): `bpmn/SKILL.md` viết *"semcheck enforce: đúng 1 start · id duy
nhất"*, nhưng code chỉ `warning` cho nhiều start và __không hề kiểm__ id trùng — `Object.fromEntries`
còn âm thầm ghi đè node trùng id, làm mọi check sau đó soi trên đồ thị đã mất node.‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

__Quy tắc:__ mỗi chữ "BẮT BUỘC / enforce / hard-fail / phải PASS" trong SKILL.md phải trỏ được
tới dòng code làm đúng điều đó. Không có code → sửa chữ, hoặc viết code. Đừng để chữ đứng một mình.

Kèm theo: __input tuỳ chọn làm tầng kiểm bị skip thì phải NÓI RA__, đừng skip im lặng
(`.src.json` thiếu → in `Coverage: SKIPPED`, không in "OK" trần).

## 5. Hạ tầng hiện có (dùng lại, đừng viết mới)

| Gate | File | Phủ skill | Chặn gì |
|---|---|---|---|
| Ngữ pháp UML use case | `skills/usecase-diagram/puml-usecase-lint.mjs` | `/usecase-diagram` | 7 luật R0-R7: association phải `--`, `..>` chỉ UC↔UC, nhãn đúng `<<include>>`/`<<extend>>`, ngữ pháp đóng, boundary, + cảnh báo sai hướng |
| Cấu trúc luồng PlantUML | `skills/activity-swimlane/puml-activity-lint.mjs` | `/activity-swimlane` | `if`/`endif` cân, có `start`+`stop`, nhánh có nhãn, đủ lane |
| Mermaid 3 tầng | `scripts/mermaid-verify.mjs` | `/sequence` `/activity` `/state` `/erd` `/user-flow` | cú pháp + nhãn an toàn + __ngữ nghĩa__ (state mồ côi/thiếu terminal, ERD entity ma/quan hệ không FK, sequence lifeline chưa khai, flowchart quyết định thiếu nhánh/nhánh cụt) |
| Đối chiếu 3 bản ERD | `scripts/erd-consistency.mjs` | `/erd` `/d2-erd` `/dbdiagram` | drift giữa Mermaid (canonical) ↔ D2 ↔ DBML — loại lỗi mà linter đơn-file KHÔNG thể thấy |
| IR nghiệp vụ BPMN | `skills/bpmn/engine/bpmn-semcheck.mjs` | `/bpmn` | structural (id trùng, 1 start, gateway có nhãn, tới được end) + coverage đối chiếu nguồn |

__Fixtures__ (test hồi quy — sửa linter xong phải chạy lại):
`skills/usecase-diagram/fixtures/` · `skills/activity-swimlane/fixtures/` · `scripts/fixtures/`
(mermaid: cặp `mermaid-valid-flow.md` phải PASS + `mermaid-escaped-quot.md` phải FAIL).
Mỗi bộ có file __phải PASS__ và file __phải FAIL__. Đừng "sửa" file FAIL cho nó pass.

## 6. Khi thêm skill diagram mới

Trả lời 4 câu trước khi viết skill:
1) Ngữ pháp của loại sơ đồ này có __đóng__ không (đếm được số loại cạnh/phần tử hợp lệ)?
   Có → viết linter tất định, ~150 dòng là đủ.
2) Cách viết đúng có __ngược với thói quen phổ biến__ không? Có → bắt buộc bảng ĐÚNG/SAI + gate.
3) Có __nhiều renderer cùng một nguồn__ không? Có → cần cross-file consistency check, vì mỗi
   file tự nó hợp lệ nên linter đơn-file mù với drift.
4) Cái gì thuộc mức 4 (nghiệp vụ, máy không kiểm được)? Liệt kê thẳng trong SKILL.md để người
   đọc biết phần nào vẫn phải tự soi.

__KHÔNG nhân rộng khuôn IR trung gian__ (AI sinh JSON → engine sinh cú pháp đích) cho các skill
mà source đích đã là DSL semantic đọc được (puml/mermaid/d2/dbml). BPMN cần IR vì target là XML +
toạ độ tuyệt đối. Thêm tầng IR cho các loại kia = phí đúp + vỡ update-mode (user sửa file nào?),
trong khi linter hậu-kiểm trên chính source đạt ~90% giá trị với ~5% chi phí.

## Tóm tắt 1 dòng

> **4 mức đúng, báo tách từng mức · "có ra ảnh" không phải verify · luật ngược prior phải là gate
> chứ không phải lời dặn · chữ "BẮT BUỘC" trong SKILL.md phải trỏ được tới dòng code thật.**‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍


<!-- wm:2b9af6c9b691879b1ddb7a04d29a1c88 -->
<sub>Tài liệu thuộc bộ AI4BA BA-Kit — bản quyền hoangphan.blog</sub>
