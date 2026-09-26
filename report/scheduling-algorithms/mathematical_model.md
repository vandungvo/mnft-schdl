# Mô hình toán của bài toán lập lịch bánh xe

**Ngày:** 21/09/2026. Đây là bản mô hình hóa **đề xuất**, chưa phải mô hình đã cài đặt hoặc đã kiểm chứng.

**Căn cứ:** [problem_requirements.md](../problem-requirements/problem_requirements.md) (giả định A01–A10, ràng buộc R01–R12, mục tiêu mục 4.3) và khung CP-SAT ở [model_and_evaluation_plan.md](model_and_evaluation_plan.md). Bản này viết lại các tài liệu đó thành **một mô hình hoàn chỉnh theo dạng tập hợp – tham số – biến – ràng buộc – mục tiêu**, giống cách đọc mô hình ở bài LR25. Chưa đối chiếu với mã trong `models/cp_sat/`; mã hiện tại chưa cài đặt dòng nguyên liệu qua tồn bán thành phẩm (BTP).

**Thay đổi so với bản trước (21/09/2026):** nguyên liệu của mọi công đoạn sau lấy từ **tồn BTP theo mã sản phẩm và công đoạn** (A09–A10), không chờ toàn lô ở công đoạn trước. Lô chỉ giữ danh tính ở lượt **QC**, nơi gán đơn và tính độ trễ.

**Nguyên tắc:**
- Ràng buộc cứng R01–R07, R11, R12 là ràng buộc của mô hình; R08–R10 là số hạng trong mục tiêu.
- Thời gian là số nguyên, đơn vị phút. Thời điểm 0 là đầu horizon (2 tuần: H = 14 × 1.440 = 20.160 phút).
- Lượng của từng lô được chốt **trước** khi giải (A01), thường là 25 sản phẩm. Mô hình là tối ưu **theo tập lô đã cho**, không phải tối ưu đồng thời lot-sizing.

---

## 1. Tập hợp và chỉ số

| Ký hiệu | Ý nghĩa |
|---|---|
| P | Tập sản phẩm (ví dụ bánh trước bạc, bánh sau đen) |
| K = {1, 2, 3, 4} | Công đoạn: 1 đúc, 2 CNC, 3 sơn, 4 QC |
| M_k | Tập máy của công đoạn k; M = ⋃ M_k |
| G | Tập khuôn vật lý |
| J | Tập đơn hàng |
| L = L^req ∪ L^opt | Tập lô: lô bắt buộc và lô dự trữ thành phẩm tùy chọn (A01) |
| o = (b, k) | **Lượt chạy** công đoạn k của lô b (A10); k(o), prod(o), q_o là công đoạn, sản phẩm, lượng của lượt |
| O = O^QC ∪ O^pre | O^QC = các lượt QC (b,4); O^pre = các lượt (b,k) với k = 1, 2, 3 (**lượt tùy chọn**) |
| O^0 ⊂ O | Lượt đang chạy tại t = 0 (dữ liệu đầu kỳ) |
| O^opt | Lượt tùy chọn: O^pre \ O^0 và lượt QC của lô thuộc L^opt |
| E_o ⊆ M_k | Máy đủ điều kiện xử lý sản phẩm của lượt o tại công đoạn k |
| S_m | Tập ca của máy m trong horizon (3 ca/ngày × 14 ngày) |
| N_m | Tập nút xếp thứ tự trên máy m: lượt đủ điều kiện, các suất bảo trì đặt trên m, cộng nút gốc 0 |
| N_g | Tập nút xếp thứ tự trên khuôn g: lượt đúc dùng g, suất bảo trì của g, cộng nút gốc 0 |
| R_g | Tập suất bảo trì (slot) của khuôn g, r = 1..\|R_g\| |
| D = {1, …, 14} | Ngày trong horizon; mốc kiểm kê cuối ngày e_d = 1.440·d |

Lượt của cùng một lô **không có quan hệ thứ tự trực tiếp** với nhau. Chúng nối với nhau chỉ qua tồn BTP (C7b). Các lô cùng sản phẩm và cùng kích thước hoán đổi được, cần phá đối xứng (mục 9).

## 2. Tham số

**Lô và đơn**

| Ký hiệu | Ý nghĩa |
|---|---|
| prod(b), q_b | Sản phẩm và lượng của lô b (đã chốt, thường 25); q_o = q_b với mọi lượt o của lô b |
| rel_b | Thời điểm lô b được phép bắt đầu |
| need_j, due_j, pr_j, ready_j | Lượng cần giao, hạn giao, trọng số ưu tiên, thời điểm đơn sẵn sàng giao của đơn j |
| ini_j | Lượng đơn j lấy từ tồn thành phẩm đầu kỳ |
| alloc_jb | Lượng lượt QC của lô b phân bổ cho đơn j (chỉ với lô bắt buộc) |
| Λ, Λ^BTP | Giới hạn tổng lượng dư thành phẩm; giới hạn tổng tồn BTP cuối kỳ (A02, A10) |

**Máy, thời gian, setup, ca**

| Ký hiệu | Ý nghĩa |
|---|---|
| p_om | Thời lượng gia công lượt o trên máy m = ⌈fixed[k,prod,m] + q_o·unit_time[k,prod,m]⌉ (mục 3.4 của yêu cầu); là hằng số sau khi chọn máy |
| setup[m,a,c] | Setup có hướng trên máy m từ trạng thái a sang sản phẩm c; a có thể là sản phẩm hoặc CLEAN |
| σ0_m | Trạng thái máy m đầu kỳ |
| A_ms | Thời gian khả dụng của ca s trên máy m sau khi trừ nghỉ và downtime đã biết |
| BL_m | Tập khoảng chặn cố định của máy m (nghỉ, downtime đã biết) |
| Fixed_ms | Cờ: ca s của máy m bắt buộc bật |

**Khuôn và bảo trì**

| Ký hiệu | Ý nghĩa |
|---|---|
| compat(g) | Tập cặp (máy, sản phẩm) tương thích với khuôn g |
| cav_g, lim_g | Số lòng khuôn; số chu kỳ tối đa giữa hai lần bảo trì |
| c_og | Số chu kỳ lượt đúc o dùng khuôn g = ⌈q_o / cav_g⌉ |
| use0_g | Số chu kỳ khuôn g đã dùng từ lần bảo trì gần nhất, tại đầu kỳ |
| Dmt_g | Thời lượng bảo trì khuôn g |

**Tồn kho**

| Ký hiệu | Ý nghĩa |
|---|---|
| I0_pk | Tồn BTP đầu kỳ của sản phẩm p sau công đoạn k, k = 1, 2, 3 (đã trừ phần các lượt đang chạy tại t = 0 đã rút) |
| cap_pk | Sức chứa tối đa của (p, k); **không khai báo thì +∞** (A09) |
| I0_p, cap_p, safety_pd | Tồn thành phẩm đầu kỳ, trần tồn, ngưỡng tồn an toàn cuối ngày d |
| hold_pk, hold_p | Đơn giá lưu BTP (p, k) và thành phẩm p, theo đơn vị–ngày |

**Trọng số và chi phí:** w_C, w_T, w_S, w_I, w_H, w_R, w_L, w_Y; đơn giá idle c_idle_m; chi phí sản xuất lượt tùy chọn cost_o; chi phí mở ca c_open_ms. Khi chưa có đơn giá đã xác nhận thì dùng trọng số chuẩn hóa (mục 4.1 của kế hoạch), không quy ra tiền hay kWh.

## 3. Biến quyết định

**Lựa chọn và thời điểm**

| Biến | Miền | Ý nghĩa |
|---|---|---|
| z_o | {0,1} | Lượt o được chạy. z = 1 cố định với lượt QC của lô bắt buộc và với o ∈ O^0. Lô b được sản xuất xong (có QC) khi z_(b,4) = 1, viết z_b |
| x_om | {0,1} | Lượt o chạy trên máy m ∈ E_o |
| S_o, E_o | số nguyên [0, H] | Bắt đầu gia công, kết thúc lượt o |
| W_o | số nguyên | Thời điểm rút nguyên liệu = bắt đầu setup nếu lượt có setup, ngược lại = S_o |
| y_ms | {0,1} | Máy m bật ở ca s (y_ms = 1 nếu Fixed_ms) |
| D_j | số nguyên | Thời điểm giao đủ đơn j |

**Thứ tự trên máy và setup**

| Biến | Miền | Ý nghĩa |
|---|---|---|
| a_{nn'm} | {0,1} | Nút n đứng ngay trước n' trên máy m (nút gốc 0 đánh dấu đầu/cuối) |
| σ_{nm} | số nguyên ≥ 0 | Thời lượng setup ngay trước nút n trên máy m |
| U_n | khoảng | Khoảng setup của nút n: kết thúc tại S_n, bắt đầu tại W_n = S_n − σ_n |

**Khuôn và bảo trì**

| Biến | Miền | Ý nghĩa |
|---|---|---|
| v_{omg} | {0,1} | Lượt đúc o chạy trên máy m với khuôn g (chỉ cặp tương thích) |
| π_{gr} | {0,1} | Suất bảo trì r của khuôn g được dùng |
| ρ_{grm} | {0,1} | Suất bảo trì (g, r) đặt trên máy m |
| T^mt_{gr} | số nguyên | Thời điểm bắt đầu bảo trì; khoảng bảo trì MT_gr có thời lượng Dmt_g |
| β_{nn'g} | {0,1} | Nút n đứng ngay trước n' trên khuôn g |
| u^b_n, u^a_n | số nguyên [0, lim_g] | Số chu kỳ khuôn đã dùng ngay trước và ngay sau nút n |

**Tồn kho và mục tiêu (biến phụ)**

| Biến | Ý nghĩa |
|---|---|
| Lvl_pk(t) | Mức tồn BTP (p, k) tại thời điểm t, xác định ở C7b |
| φ_od = z_o ∧ [E_o ≤ e_d] | Lượt o đã hoàn tất tính đến cuối ngày d |
| ψ_od = z_o ∧ [W_o ≤ e_d] | Lượt o đã rút nguyên liệu tính đến cuối ngày d |
| ψ_jd = [D_j ≤ e_d] | Đơn j đã giao tính đến cuối ngày d |
| Lvl_pkd, I_pd | Tồn BTP (p, k) và tồn thành phẩm p cuối ngày d |
| h_pd | Thiếu hụt so với tồn an toàn |
| T_j | Độ trễ đơn j |
| Cmax | Makespan của lô bắt buộc |
| Idle_m | Thời gian nhàn rỗi trong ca bật của máy m |

## 4. Ràng buộc

### C1. Lô và phân bổ (R01, R04; A01, A02)

```
z_b = 1                                        ∀ b ∈ L^req          (lượt QC của lô bắt buộc bắt buộc chạy)
ini_j + Σ_b alloc_jb = need_j                  ∀ j
Σ_j alloc_jb ≤ q_b                             ∀ b ∈ L^req
Σ_b (q_b − Σ_j alloc_jb) · z_b ≤ Λ             (tổng lượng dư thành phẩm không vượt giới hạn)
Σ_j ini_j(theo sản phẩm p) ≤ I0_p              ∀ p
```

Các dòng trên do bước tiền xử lý tạo và kiểm; solver quyết định z của lượt tùy chọn và lượt QC của lô dự trữ. Lô dự trữ thành phẩm không được phân bổ cho đơn nào (chỉ vào tồn thành phẩm). **Đơn được gán cho lượt QC**, nên độ trễ tính từ hoàn tất QC (C6).

### C2. Chọn máy và thời lượng của lượt chạy (R01; A01, A10)

```
Σ_{m∈E_o} x_om = z_o                           ∀ o ∈ O
x_om = 1  ⇒  E_o = S_o + p_om                  ∀ o, m ∈ E_o
W_o = S_o − σ_o ≥ rel_b                        ∀ o thuộc lô b        (σ_o: setup ngay trước, C4)
E_o ≤ H                                        ∀ o có z_o = 1        (việc đã cam kết xong trong horizon, A06)
```

**Không có** ràng buộc S_(b,k+1) ≥ E_(b,k). Thứ tự đúc → CNC → sơn → QC được bảo đảm qua dòng lượng ở C7b. Khoảng của lượt o trên máy m là khoảng tùy chọn I_om = [S_o, E_o) có mặt khi x_om = 1.

### C3. Không chồng lấn và lịch ca (R02, R06; A03)

Với mỗi máy m, các khoảng sau **không chồng nhau**:

```
NoOverlap_m( { I_om : x_om = 1 }              (gia công)
           ∪ { U_n : n ∈ N_m có mặt }          (setup)
           ∪ { MT_gr : ρ_grm = 1 }             (bảo trì đặt trên m)
           ∪ BL_m                              (nghỉ, downtime đã biết)
           ∪ { φ_ms = [đầu ca s, cuối ca s) : y_ms = 0 } )   (ca không bật)
y_ms = 1   ∀ (m,s) có Fixed_ms
```

Khoảng gia công và setup có thời lượng cố định và không được chồng khoảng chặn, nên lượt **không ngắt và không chạy xuyên nghỉ/downtime/ca tắt**, nhưng vẫn qua được hai ca liền nhau nếu cả hai bật và không có nghỉ giữa.

### C4. Thứ tự trên máy và setup (R03; A04)

Với mỗi máy m, các cung a_{nn'm} lập thành **một chu trình duy nhất** qua nút gốc 0 và mọi nút có mặt trên m; nút không có mặt tự nối vòng vào chính nó:

```
Circuit_m( a_{nn'm} ; nút n bỏ qua khi:  n = lượt o có x_om = 0,  hoặc  n = MT_gr có ρ_grm = 0 )
state(n) = prod(o) nếu n là lượt o;  state(n) = CLEAN nếu n là suất bảo trì
σ_{nm} = Σ_{n'} a_{n'nm} · setup[m, state(n'), state(n)]       (n' = 0 nghĩa là trạng thái đầu kỳ σ0_m)
S_n − σ_{nm} = start(U_n) = W_n     (setup sát ngay trước gia công)
W_n ≥ rel_b
a_{n'nm} = 1  ⇒  W_n ≥ E_{n'}                       (setup sau khi việc liền trước trên máy kết thúc)
```

Điều kiện "tồn BTP đủ" của A04 nằm ở C7b: nguyên liệu bị rút tại đúng W_n, tức thời điểm bắt đầu setup. Trạng thái setup được giữ qua nghỉ ca. Setup từ nút bảo trì đi ra dùng trạng thái CLEAN; setup đi vào nút bảo trì lấy bằng 0 (giả định, xem mục 9).

### C5. Khuôn và bảo trì theo chu kỳ (R05; A05)

Chỉ lượt đúc (k = 1) dùng khuôn.

```
Σ_{m,g} v_omg = z_o                    ∀ o có k(o) = 1     (mỗi lượt đúc được chọn dùng đúng một cặp máy–khuôn tương thích)
x_om = Σ_g v_omg                       ∀ o có k(o) = 1, m ∈ E_o
Σ_m ρ_grm = π_gr                       ∀ g, r              (suất bảo trì được dùng thì đặt đúng một máy tương thích)
NoOverlap_g( { I_om : Σ_m v_omg = 1 } ∪ { MT_gr : π_gr = 1 } )     (một khuôn không dùng đồng thời hai nơi)
duration(MT_gr) = Dmt_g
```

Bộ đếm chu kỳ trên khuôn g, dựa trên chu trình β theo thứ tự sử dụng khuôn (kể cả khi khuôn chuyển máy):

```
nút n là lượt đúc o bằng g:    u^a_n = u^b_n + c_og,   u^a_n ≤ lim_g
nút n là suất bảo trì (g,r):   u^a_n = 0
β_{nn'g} = 1  ⇒  u^b_{n'} = u^a_n
β_{0ng}  = 1  ⇒  u^b_n = use0_g                        (mức đã dùng trước horizon)
```

Suất bảo trì được phá đối xứng: π_{g,r} ≥ π_{g,r+1} và T^mt_{g,r} ≤ T^mt_{g,r+1}. Số suất |R_g| chọn không nhỏ hơn ⌈(use0_g + tổng chu kỳ có thể dùng) / lim_g⌉ để không bỏ nghiệm. Lượt có c_og > lim_g phải được chia lại **trước** khi giải. Lượt dự trữ BTP ở công đoạn đúc cũng tiêu hao chu kỳ khuôn như mọi lượt (A10).

### C6. Giao hàng và độ trễ, tính từ lượt QC (R08; A02)

```
D_j ≥ ready_j                          ∀ j
D_j ≥ E_(b,4)                          ∀ j, ∀ b ∈ L^req với alloc_jb > 0     (giao sau khi lượt QC được gán xong)
T_j ≥ D_j − due_j,  T_j ≥ 0            ∀ j                 (hạn giao mềm)
D_j ≤ due_j                            ∀ j có cam kết cứng (chỉ khi dữ liệu khai báo)
```

Mặc định giao đủ từng đơn, không giao từng phần. Đơn chỉ dùng tồn thành phẩm đầu kỳ có D_j = ready_j.

### C7a. Tồn thành phẩm (R07, R09; A06)

```
φ_bd ⇔ z_b ∧ (E_(b,4) ≤ e_d)          ∀ b, d
ψ_jd ⇔ (D_j ≤ e_d)                    ∀ j, d
I_pd = I0_p + Σ_{b: prod(b)=p} q_b·φ_bd − Σ_{j: prod(j)=p} need_j·ψ_jd
0 ≤ I_pd ≤ cap_p
h_pd ≥ safety_pd − I_pd,   h_pd ≥ 0
```

Tồn không âm được bảo đảm về bản chất vì mỗi đơn chỉ giao sau khi mọi lượt QC được gán cho nó đã xong (C6). Chế độ safety stock **cứng** thay dòng h bằng I_pd ≥ safety_pd.

### C7b. Tồn bán thành phẩm và dòng nguyên liệu giữa công đoạn (R12; A09, A10)

Với mỗi sản phẩm p và công đoạn k ∈ {1, 2, 3}, với mọi t ∈ [0, H]:

```
Lvl_pk(t) = I0_pk + Σ_{o: k(o)=k,   prod(o)=p} q_o · z_o · [E_o ≤ t]        (nhập khi lượt công đoạn k hoàn tất)
                  − Σ_{o: k(o)=k+1, prod(o)=p, o∉O^0} q_o · z_o · [W_o ≤ t]   (rút khi lượt công đoạn k+1 bắt đầu)
0 ≤ Lvl_pk(t) ≤ cap_pk
Σ_{p,k} Lvl_pk(H) ≤ Λ^BTP
```

- Lượt QC (k+1 = 4) rút từ tồn (p, 3); lượt đúc (k = 1) không rút BTP vì lấy nguyên liệu thô, giả định đủ.
- Các lượt o ∈ O^0 chỉ nhập, không rút (đã rút trước t = 0 và đã được trừ trong I0_pk).
- Mức tồn chỉ đổi tại các sự kiện E_o và W_o, nên kiểm tại các sự kiện là đủ. Sự kiện cùng thời điểm được gộp, khớp quy ước "hoàn tất được ghi nhận trước tiêu thụ". Cài đặt có thể dùng ràng buộc reservoir của CP-SAT (cộng tại E_o, trừ tại W_o, có khai báo lượt có mặt); **chưa kiểm phiên bản OR-Tools và ngữ nghĩa sự kiện đồng thời**, cần thử trên ví dụ nhỏ.
- Tồn tại cuối mỗi ngày phục vụ chi phí lưu:

```
Lvl_pkd = I0_pk + Σ_{o: k(o)=k, prod(o)=p} q_o·φ_od − Σ_{o: k(o)=k+1, prod(o)=p, o∉O^0} q_o·ψ_od
```

Ý nghĩa: lượt công đoạn k+1 chỉ bắt đầu khi tồn (p, k) đủ lượng, **dù lượng đó do lô nào tạo ra**, hoặc từ tồn đầu kỳ. Sản xuất vượt nhu cầu công đoạn sau chính là dự trữ BTP.

### C8. Đại lượng phục vụ mục tiêu

```
Cmax ≥ E_(b,4)                         ∀ b ∈ L^req
Setup = Σ_m Σ_n σ_{nm}
Idle_m = Σ_s y_ms·A_ms − Σ_o x_om·p_om − Σ_n σ_{nm} − Σ_{g,r} ρ_grm·Dmt_g
Hold = Σ_{p,k=1..3,d} hold_pk · Lvl_pkd + Σ_{p,d} hold_p · I_pd
```

Công thức Idle_m đúng vì C3 buộc mọi khoảng bận nằm trọn trong ca bật, nên tổng thời gian bận trong ca bật bằng tổng thời lượng các khoảng bận. KPI theo **từng ca** (mục 4.4 của yêu cầu) cần lấy phần giao của khoảng bận với từng ca; tính ở bước báo cáo/validator. Hold tính trên mốc cuối ngày, xấp xỉ tích phân theo thời gian (mục 9).

### C9. Lượt đang chạy và tồn đầu kỳ (dữ liệu trạng thái đầu kỳ; R11)

Với mỗi lượt o ∈ O^0 (đang chạy tại t = 0):

```
z_o = 1,  x_{o,m_o} = 1,  E_o = E_o^0 ≥ 0 (cố định)
khoảng [0, E_o^0) chiếm máy m_o (thêm vào BL_{m_o})
```

- Lượt đã xong trước t = 0 chỉ thể hiện ở I0_pk, I0_p, σ0_m và use0_g.
- σ0_m là trạng thái sản phẩm của lượt cuối cùng trên m tại t = 0.
- Lượt o ∈ O^0 nhập vào tồn tại E_o^0 (C7b) nhưng không rút thêm.

## 5. Hàm mục tiêu (R08–R10; mục 4.3)

```
min F = w_C · Cmax
      + w_T · Σ_j pr_j · T_j
      + w_S · Setup
      + w_I · Σ_m c_idle_m · Idle_m
      + w_H · Σ_{p,d} h_pd
      + w_R · Σ_{o ∈ O^opt} cost_o · z_o
      + w_L · Hold
      + w_Y · Σ_{m,s} c_open_ms · y_ms · (1 − Fixed_ms)
```

- Setup dùng **một cách biểu diễn duy nhất** (thời gian) để không phạt trùng.
- Chi phí mở ca/tăng ca biểu diễn bằng việc bật thêm ca tùy chọn (y_ms), không có biến tăng ca riêng.
- Số hạng w_R làm solver **không chạy lượt tùy chọn khi không cần**: các lượt cần cho dòng nguyên liệu của lô bắt buộc vẫn được chọn vì R12 đòi hỏi, còn lượt vượt nhu cầu (dự trữ) chỉ được chọn khi lợi ích vượt chi phí.
- Trọng số và thang đo lưu cùng lần chạy và giữ nguyên giữa các thuật toán đối chứng. Luôn báo từng thành phần, không chỉ điểm tổng.

**Chính sách hai tầng cho dự trữ (mục 4.3.2–4.3.3 của yêu cầu):**

1. **Tầng A (mức phục vụ):** giải với F_A = w_T·Σ pr_j·T_j + w_H·Σ h_pd + ε·Σ cost_o·z_o (ε rất nhỏ để không chọn lượt dự trữ khi không cần). Ghi lại T\* = Σ pr_j·T_j và H\* = Σ h_pd. Dự trữ BTP mới chỉ xuất hiện khi cần cho mức phục vụ; ngoài ra chỉ dùng tồn BTP đầu kỳ.
2. **Tầng B (kinh tế):** thêm ràng buộc Σ pr_j·T_j ≤ T\* và Σ h_pd ≤ H\*, rồi cực tiểu hóa toàn bộ F. Có thể xếp lại lô bắt buộc nếu mức phục vụ không xấu đi.

## 6. Tái lập lịch khi có sự kiện tại thời điểm τ (R11; A07; mục 4.5)

Dùng lại C1–C9 cho **phần tương lai**, với t = 0 là τ. Các thay đổi:

| Thành phần | Cách xử lý |
|---|---|
| Lượt đã xong (E_o ≤ τ) | Không sửa. Đã phản ánh trong tồn BTP/thành phẩm thực tế tại τ (thành I0_pk, I0_p), σ0_m và use0_g |
| Lượt đang chạy trên máy không hỏng | Thuộc O^0: cố định x, E_o = S_o + p_om; chiếm máy đến E_o; nhập tồn tại E_o; đã rút nguyên liệu lúc bắt đầu nên không rút lại |
| Máy m\* hỏng trong [τ, τ+R) | Thêm khoảng chặn vào BL_m\*. Lượt đang chạy trên m\* được thay bằng phần còn lại có thời lượng p_om\* − (τ − S_o), bắt buộc chạy lại trên m\* với S ≥ τ + R (A07: không mất sản phẩm, không mất trạng thái setup); nhập tồn tại E mới |
| Lượt chưa bắt đầu | Biến tự do: xếp lại, đổi máy, hoặc bỏ nếu là lượt tùy chọn. Lượt chưa bắt đầu chờ tồn BTP nếu tồn không còn đủ |
| Tồn BTP và thành phẩm tại τ | Là I0_pk, I0_p của lần giải mới |
| Đơn gấp | Thêm đơn j' và lô mới (lượt QC bắt buộc) với rel ≥ τ |
| Lô dự trữ thành phẩm | QC đã bắt đầu thì z_b = 1 cố định (WIP cam kết); chưa bắt đầu thì được chọn lại |
| Lượt dự trữ BTP | Đã bắt đầu thì thuộc O^0 hoặc cố định như WIP cam kết; chưa bắt đầu thì được bỏ hoặc chọn lại |
| Cam kết tương lai đã khóa | S_o cố định chỉ khi đầu vào khai báo và còn khả thi sau sự cố; nếu không, báo rõ việc bị ảnh hưởng |

Thêm số hạng ổn định vào mục tiêu, tính trên lượt tương lai có ở cả hai lịch (ghép theo mã lô và công đoạn):

```
Δ = Σ_o |S_o − S_o^cũ| + k_machine · Σ_o [máy_o ≠ máy_o^cũ]        F' = F + w_Δ · Δ
```

Đơn mới không bị phạt vì chưa có lịch cũ. Kết quả so sánh: đổi giờ bắt đầu, đổi máy, độ trễ từng đơn, ca mở thêm, thay đổi tồn BTP.

**Trạng thái giải phải báo** (mục 4.5): tối ưu; khả thi chưa chứng minh tối ưu; chứng minh không khả thi; chưa có nghiệm trong ngân sách; mô hình/dữ liệu không hợp lệ. Chỉ xuất lịch khi có nghiệm và qua validator độc lập.

## 7. Truy vết yêu cầu sang mô hình

| Yêu cầu | Nằm ở | Ghi chú |
|---|---|---|
| R01 Đủ việc, thời lượng | C1, C2 | Lô bắt buộc có lượt QC; trình tự qua dòng lượng, không qua chờ toàn lô |
| R02 Tài nguyên, tương thích | C2 (E_o), C3, C5 | Không chồng lấn máy và khuôn |
| R03 Setup | C4 | Cả setup đầu kỳ và sau bảo trì |
| R04 Giới hạn lô, lượng dư | C1 | Ngưỡng lô kỹ thuật kiểm ở tiền xử lý |
| R05 Bảo trì khuôn | C5 | |
| R06 Lịch ca, ca bật | C3 | |
| R07 Bảo toàn lượng, tồn thành phẩm | C6, C7a | Tồn ≤ trần chỉ kiểm tại mốc cuối ngày trong mô hình, xem mục 9 |
| R08 Hạn giao (mềm) | C6, mục tiêu w_T | Tính từ lượt QC |
| R09 Safety stock (mềm) | C7a, mục tiêu w_H | |
| R10 Hiệu suất máy (mềm) | C8, mục tiêu w_I, w_Y | |
| R11 Bảo toàn lịch quá khứ | Mục 6, C9 | |
| R12 Tồn BTP | C7b | Kiểm tại mọi sự kiện, cả cận trên và cận dưới |
| A01 Lô | C1, C2 | Lô là một lần sản xuất, thường 25; danh tính ở QC |
| A02 Lượng và giao hàng | C1, C6 | Đơn gán theo lượt QC |
| A03 Gia công và ca | C3 | |
| A04 Setup | C4, C7b | Rút nguyên liệu tại bắt đầu setup |
| A05 Khuôn | C5 | |
| A06 Biên kỳ | C2, C7a, C7b | Việc cam kết xong trong horizon; BTP cuối kỳ giới hạn bởi Λ^BTP |
| A07 Sự cố | Mục 6 | |
| A08 Tận dụng resource | Mục 5 | Chính sách hai tầng và y_ms |
| A09 Bán thành phẩm | C7b, C9 | Sức chứa không khai báo là +∞ |
| A10 Lượt chạy | C2, C7b | Lượt tùy chọn; dự trữ BTP là lượt vượt nhu cầu |

## 8. Ví dụ số nhỏ (minh họa cách đọc mô hình)

**Thời lượng gia công (C2)**, lô 25 bánh trước bạc, CNC cố định 8 phút (tham số như ví dụ ở mục 3.4 của yêu cầu, đổi lượng lô sang 25):
- CNC_1: p = ⌈8 + 25 × 1,65⌉ = ⌈49,25⌉ = 50 phút.
- CNC_2: p = ⌈8 + 25 × 1,85⌉ = ⌈54,25⌉ = 55 phút.
Chọn CNC_1 hay CNC_2 chênh 5 phút. (Bộ dữ liệu tổng hợp hiện tại dùng lô 84 nên cho 147 và 164 phút; chưa đồng bộ với lô thường 25.)

**Setup và thứ tự trên máy sơn (C4)**, dùng ma trận ở mục 3.5 của yêu cầu (CLEAN→Bạc 24, CLEAN→Đen 24, Bạc→Đen 12, Đen→Bạc 24). Hai lượt sơn: L1 bạc 60 phút, L2 đen 50 phút (số minh họa). Máy bắt đầu ở CLEAN, không có chờ nào khác.

| Thứ tự | Tính | Kết thúc |
|---|---|---|
| L1 rồi L2 | 24 (CLEAN→Bạc) + 60 + 12 (Bạc→Đen) + 50 | 146 phút |
| L2 rồi L1 | 24 (CLEAN→Đen) + 50 + 24 (Đen→Bạc) + 60 | 158 phút |

Cung a_{L1,L2} = 1 chọn thứ tự đầu và σ_{L2} = 12; thứ tự sau cho σ_{L1} = 24. Cùng máy, cùng lượt mà chênh 12 phút chỉ do thứ tự.

**Dòng nguyên liệu qua tồn BTP (C7b)**, số minh họa: bánh trước bạc, lượt 25 sản phẩm, tồn đầu kỳ sau đúc I0_{p,1} = 10.

| Thời điểm (phút) | Sự kiện | Tồn (p, đúc) |
|---|---|---|
| 0 | Đầu kỳ | 10 |
| 60 | Lượt đúc A hoàn tất, nhập 25 | 35 |
| 60 | Lượt CNC X bắt đầu, rút 25 (tồn 35 ≥ 25) | 10 |
| 100 | Lượt CNC Y muốn bắt đầu, cần 25 nhưng tồn 10 | **chờ** |
| 120 | Lượt đúc B hoàn tất, nhập 25 | 35 |
| 120 | Lượt CNC Y bắt đầu, rút 25 | 10 |

CNC X bắt đầu ngay khi đúc A xong, nhưng CNC Y không cần chờ lượt đúc "của cùng lô": chỉ cần tồn đủ, dù hàng do lượt nào tạo ra.

**Bộ đếm khuôn (C5)**, số minh họa: khuôn 4 lòng, lim = 100 chu kỳ, use0 = 70. Lượt 25 sản phẩm dùng c = ⌈25/4⌉ = 7 chu kỳ. Bốn lượt đúc đầu cho u^a = 77, 84, 91, 98, đều ≤ 100. Lượt thứ năm sẽ cho 105 > 100, nên **bắt buộc** có suất bảo trì đứng giữa lượt thứ tư và thứ năm (u^a = 0), kéo theo bảo trì chiếm khuôn và máy, rồi setup từ trạng thái CLEAN.

## 9. Quyết định mô hình cần chốt hoặc đối chiếu

**Đã chốt với bạn (21/09/2026):** nguyên liệu công đoạn sau lấy từ tồn theo mã sản phẩm và công đoạn; lô giữ danh tính ở QC để gán đơn và tính độ trễ; sức chứa không khai báo hiểu là không giới hạn.

**Tôi đã chọn, cần xác nhận:**
1. **Rút nguyên liệu tại bắt đầu setup (W_o).** Yêu cầu A04 nói setup sau khi nguyên liệu sẵn sàng; tôi hiểu là nguyên liệu bị giữ từ lúc bắt đầu setup, tránh lượt khác lấy mất trong lúc setup.
2. **Mọi lượt của một lô xử lý cùng lượng q_b** (thường 25). Nếu công đoạn nào xử lý theo mẻ khác thì cần lượng riêng theo công đoạn.
3. **Khuôn chỉ dùng ở lượt đúc.** Yêu cầu A05 ngụ ý điều này. Nếu CNC hoặc sơn cũng dùng khuôn/đồ gá thì C5 phải mở rộng.
4. **Khuôn chuyển máy không mất thời gian.** Yêu cầu không nêu thời gian tháo lắp; nếu có, thuộc setup của máy.
5. **Setup trước bảo trì bằng 0, sau bảo trì dùng trạng thái CLEAN.** A05 chỉ nói "trạng thái sau bảo trì đã khai báo".
6. **Tồn thành phẩm ≤ trần và safety stock chỉ kiểm tại mốc cuối ngày** trong C7a, còn R07 nói "tại mọi sự kiện". Tồn BTP thì kiểm chính xác tại sự kiện (C7b). Validator độc lập phải kiểm tồn thành phẩm tại từng sự kiện.
7. **Chi phí lưu tính trên mốc cuối ngày**, xấp xỉ tích phân theo thời gian. Tồn BTP tạo ra và dùng trong cùng ngày không bị tính phí lưu.
8. **Tăng ca được mô hình hóa bằng ca tùy chọn (y_ms).** Nếu tăng ca nghĩa là kéo dài ca đang mở quá 8 giờ thì cần khai báo ca mở rộng thành khoảng thời gian riêng.
9. **Phân lô và phân bổ đơn–lô là tiền xử lý.** Kết quả tối ưu chỉ có nghĩa với tập lô đã chọn.
10. **Bộ đếm khuôn khi máy hỏng giữa lượt đúc** chưa có quy tắc tính chu kỳ đã tiêu thụ của phần đã làm.

**Rủi ro kỹ thuật:**
11. **Đối xứng.** Các lô cùng sản phẩm và cùng lượng hoán đổi được, cộng với lượt tùy chọn trùng nhau, làm CP-SAT phải duyệt nhiều nghiệm tương đương. Cần ràng buộc phá đối xứng (ví dụ thứ tự chỉ số theo thời điểm bắt đầu cho các lượt giống hệt nhau).
12. **Kích thước tập lượt tùy chọn.** Số lượt ứng viên ở công đoạn đúc, CNC, sơn cho mỗi sản phẩm phải đủ lớn để không bỏ nghiệm nhưng không quá lớn; cần đo trên bộ sinh dữ liệu.
13. **Độ lớn mô hình.** Số biến cung tăng theo Σ_m |N_m|²; số lượt ứng viên mỗi máy càng lớn thì càng nặng.
14. **Ngữ nghĩa reservoir** trong OR-Tools (sự kiện đồng thời, lượt không có mặt) chưa kiểm.

**Chưa đồng bộ:**
15. Mã trong `models/` (bộ dữ liệu `wheel_factory.json` dùng lô 84 và 72, ràng buộc chờ toàn lô, tồn kho chỉ ở thành phẩm) chưa theo mô hình này.
16. Chi phí và đơn giá (idle, mở ca, lưu kho, sản xuất lượt tùy chọn) chưa có dữ liệu xác nhận; mọi kết quả về tiền chỉ là chính sách đánh đổi.
