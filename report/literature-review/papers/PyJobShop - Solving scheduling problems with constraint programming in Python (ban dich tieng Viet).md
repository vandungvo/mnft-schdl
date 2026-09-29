---
title: "PyJobShop: Giải bài toán lập lịch bằng constraint programming trong Python — Bản dịch/tóm lược tiếng Việt"
nguon_goc: "Lan, L., & Berkhout, J. (2025). PyJobShop: Solving scheduling problems with constraint programming in Python. arXiv:2502.13483 [math.OC]. https://arxiv.org/abs/2502.13483"
loai: "Working paper / software paper (nộp INFORMS Journal on Computing)"
ghi_chu: "Đây là bản dịch/tóm lược chi tiết bằng tiếng Việt phục vụ literature review của đồ án CO5103, KHÔNG phải bản dịch nguyên văn từng câu. Trích dẫn (tác giả, năm) được giữ nguyên như bản gốc để tiện tra cứu; số thứ tự Mục và số công thức bám theo bài báo gốc (dùng ký hiệu (1a), (1b)... như bản gốc)."
---

# PyJobShop: Giải bài toán lập lịch bằng constraint programming trong Python

**Tác giả:** Leon Lan, Joost Berkhout — Department of Mathematics, Vrije Universiteit Amsterdam
**Nguồn:** arXiv:2502.13483 [math.OC], 19/02/2025

## Tóm tắt

Bài báo giới thiệu **PyJobShop**, một thư viện Python mã nguồn mở để giải bài toán lập lịch bằng **constraint programming (CP)**. PyJobShop cung cấp một giao diện mô hình hoá dễ dùng, hỗ trợ rất nhiều biến thể bài toán lập lịch, kể cả các biến thể nổi tiếng như **flexible job shop problem (FJSP)** và **resource-constrained project scheduling problem (RCPSP)**. PyJobShop tích hợp hai bộ giải CP hàng đầu hiện nay: **Google OR-Tools CP-SAT** và **IBM ILOG CP Optimizer**. Nhóm tác giả dùng PyJobShop để chạy thực nghiệm số quy mô lớn trên hơn **9.000 instance benchmark** từ tài liệu lập lịch máy (machine scheduling) và lập lịch dự án (project scheduling), so sánh hiệu năng OR-Tools và CP Optimizer. Kết quả: **CP Optimizer vượt trội hơn** trên bài toán lập lịch dạng hoán vị (permutation scheduling) và bài toán quy mô lớn, trong khi **OR-Tools cạnh tranh rất tốt** trên job shop scheduling và project scheduling — dù OR-Tools hoàn toàn mã nguồn mở (miễn phí). Bằng cách cung cấp một cài đặt CP dễ tiếp cận và đã được kiểm thử kỹ, nhóm tác giả hy vọng PyJobShop giúp nhà nghiên cứu và người thực hành dùng CP cho bài toán lập lịch thực tế.

**Từ khoá:** machine scheduling, project scheduling, constraint programming, open source, Python

---

## 1. Giới thiệu

Lập lịch (scheduling) là một quy trình then chốt trong cả sản xuất lẫn dịch vụ — phân bổ hiệu quả tài nguyên cho công việc theo thời gian. Bài toán này trải rộng từ sản xuất bán dẫn đến lập kế hoạch xây dựng, khiến nó trở thành một trong những chủ đề được nghiên cứu sâu nhất trong operations research (Potts & Strusevich, 2009). Qua nhiều thập kỷ, các nhà nghiên cứu đã phát triển rất nhiều mô hình — từ máy đơn đơn giản đến môi trường job shop phức tạp — với kỹ thuật giải trải dài từ dispatching rule đơn giản đến metaheuristic tiên tiến.

**Constraint programming (CP)**, một kỹ thuật bắt nguồn từ trí tuệ nhân tạo, đã nổi lên như một hướng tiếp cận đầy hứa hẹn cho bài toán lập lịch, **vượt trội hơn** cách tiếp cận **mixed-integer linear programming (MILP)** truyền thống (Ku & Beck, 2016; Naderi et al., 2023). Ngôn ngữ mô hình hoá dựa trên **interval variable (biến khoảng)** của CP cho ra công thức trực quan và gọn hơn MILP, trong khi kỹ thuật **constraint propagation** kết hợp tìm kiếm giúp CP rất hiệu quả trong việc tìm lời giải chất lượng cao cho bài toán lập lịch (Laborie et al., 2018). Hiệu quả này khiến CP được áp dụng rộng rãi để giải bài toán lập lịch trong thập kỷ vừa qua (Naderi et al., 2023).

**PyJobShop** ra đời từ động lực đó: một gói Python mã nguồn mở giải bài toán lập lịch bằng CP, cung cấp giao diện mô hình hoá dễ dùng cho nhiều loại bài toán lập lịch máy và lập lịch dự án **mà không cần hiểu chi tiết cài đặt CP bên dưới**. PyJobShop cài đặt một mô hình lập lịch tổng quát, tích hợp cả OR-Tools CP-SAT lẫn CP Optimizer, kèm tài liệu đầy đủ, kiểm thử mở rộng, mô hình CP dễ mở rộng, và mã nguồn mở theo giấy phép MIT.

**3 đóng góp chính của bài báo:**

1. **Mô hình lập lịch tổng quát cài đặt bằng CP.** Lấy cảm hứng từ bài tổng quan FJSP của Dauzère-Pérès et al. (2024) — chính là tài liệu bạn đã đọc ở Bước 2 của reading plan — nhóm tác giả đưa ra một mô hình lập lịch tổng quát làm nền tảng cho PyJobShop, dùng **1 giao diện duy nhất** để mô hình hoá rất nhiều biến thể lập lịch (cả từ machine scheduling lẫn project scheduling). Mô hình được cài bằng cả OR-Tools CP-SAT (Perron & Furnon, 2024) lẫn CP Optimizer (Laborie et al., 2018).
2. **So sánh hiệu năng OR-Tools vs. CP Optimizer.** Dùng PyJobShop chạy thực nghiệm quy mô lớn trên >9.000 instance. Kết quả: OR-Tools cạnh tranh rất tốt với CP Optimizer — cho kết quả mạnh trên job shop và project scheduling, đồng thời đạt **lower bound tốt hơn**. CP Optimizer scale tốt hơn cho bài toán permutation và bài toán quy mô lớn. Cả 2 bộ giải cùng tìm ra nhiều **best-known solution mới** cho các instance lập lịch dự án.
3. **Phần mềm mã nguồn mở, có kiểm thử và tài liệu đầy đủ** — lấp một khoảng trống lớn trong tài liệu lập lịch, nơi rất nhiều cài đặt không được công bố và khó tái lập. Nhóm tác giả biết 2 dự án phần mềm liên quan: **SSP-3M** (Márquez et al., 2024, framework mã nguồn mở tập trung thiết kế heuristic) và **Job Shop Scheduling Benchmark** (Reijnen et al., 2023, thư viện benchmark tập trung phương pháp reinforcement learning). PyJobShop khác biệt nhờ tài liệu đầy đủ, độ phủ test mở rộng, tích hợp bộ giải CP hiện đại, và hỗ trợ nhiều biến thể lập lịch qua **1 giao diện duy nhất**.

---

## 2. Mô tả bài toán

### 2.1. Ký hiệu và khái niệm nền tảng

Gọi $J$ là tập job, $R$ tập tài nguyên, $T$ tập task, $M$ tập mode. Một **job** $j \in J$ là tập hợp các task mà thời điểm hoàn thành ảnh hưởng đến hàm mục tiêu. Mỗi job có: tập task liên quan $T_j \subseteq T$, ngày giải phóng (release date) $r_j \ge 0$, deadline $\overline{d_j} \ge 0$ (bắt buộc phải xong trước), due date tuỳ chọn $d_j \ge 0$ (mong muốn xong trước), và trọng số ưu tiên $w_j \ge 0$.

Một **tài nguyên** $r \in R$ dùng để xử lý task; tập tài nguyên $R$ được chia thành 3 tập rời nhau $R = R^{\text{machine}} \cup R^{\text{renewable}} \cup R^{\text{non-renewable}}$:
- **Machine** $r \in R^{\text{machine}}$: chỉ xử lý 1 task tại 1 thời điểm, có thể áp ràng buộc trình tự (sequencing).
- **Renewable resource**: có capacity $Q_r \ge 0$ tại mỗi thời điểm (dùng xong "trả lại", như nhân công/máy công suất giới hạn).
- **Non-renewable resource**: tổng nhu cầu tối đa $Q_r \ge 0$ trong suốt horizon (dùng là hết, như ngân sách/vật tư tiêu hao).

Một **task** $t \in T$ là đơn vị nguyên tử nhỏ nhất cần lập lịch. Mỗi task có tập **mode** khả thi $M_t \subseteq M$ — đúng 1 mode phải được chọn. Một **mode** $m \in M$ là 1 cách khả thi để xử lý task, gồm: thời lượng xử lý $p_m \ge 0$, tập tài nguyên cần $R_m \subseteq R$, và nhu cầu tài nguyên $q_{mr} \ge 0$ cho mỗi $r \in R_m \setminus R^{\text{machine}}$.

**3 nhóm ràng buộc giữa các task:** timing, assignment, sequencing — mỗi loại là 1 tập tuple $C^{\text{ConstraintType}}$.

- **Timing constraints** — quan hệ thời gian giữa 2 task $i, k$ kèm độ trễ tuỳ chọn $l \in \mathbb{Z}$: `StartBeforeStart`, `StartBeforeEnd`, `EndBeforeStart`, `EndBeforeEnd` (task $i$ phải bắt đầu/kết thúc trước khi $k$ bắt đầu/kết thúc ít nhất $l$ đơn vị thời gian).
- **Assignment constraints** — chi phối lựa chọn tài nguyên giữa 2 task: `IdenticalResources` ($i,k$ phải dùng cùng tài nguyên) và `DifferentResources` ($i,k$ phải dùng tài nguyên khác nhau).
- **Sequencing constraints** — chỉ áp dụng khi có machine liên quan: `Consecutive` (task $i$ phải xử lý ngay trước $k$ trên mọi machine mà cả 2 cùng dùng) và `SetupTime` (khi $k$ xếp sau $i$ trên machine $r$ thì có setup time $l$ đơn vị thời gian).

**Lời giải khả thi** cho mỗi task $t \in T$: (i) thời điểm bắt đầu/kết thúc, (ii) mode được chọn — thoả mọi ràng buộc. Mục tiêu: tối thiểu **tổng có trọng số** của các hàm mục tiêu lập lịch phổ biến (định nghĩa chi tiết ở cuối Mục 2.2).

### 2.2. Mô hình constraint programming

#### 2.2.1. Khái niệm nền tảng

Phần này giới thiệu nhanh các khái niệm CP liên quan lập lịch, dành cho người đã quen biến/ràng buộc tối ưu nhưng chưa rành CP. (Giải thích chi tiết về CP nằm ngoài phạm vi bài báo — xem Baptiste et al. 2001; Kanet et al. 2004; Pesant 2014).

CP là 1 paradigm giải **bài toán thoả ràng buộc (constraint satisfaction problem)**: tập biến hữu hạn miền rời rạc + tập ràng buộc cần thoả. CP thu hẹp dần miền biến qua kỹ thuật **constraint propagation** — đảm bảo ràng buộc được lan truyền hiệu quả giữa các biến. Ngoài propagation, CP còn dùng kỹ thuật tìm kiếm như **backtracking** và **large neighborhood search** để duyệt có hệ thống khi propagation không đủ để xác định lời giải. CP xử lý được rất nhiều loại ràng buộc (kể cả phi tuyến), gồm ràng buộc toán học, logic, và **global constraint**. Tính linh hoạt này quan trọng để nắm bắt đặc thù bài toán lập lịch — global constraint chuyên biệt như `NoOverlap` và `Cumulative` rất hiệu quả trong việc thu hẹp miền biến và diễn đạt gọn ràng buộc lập lịch, trong khi công thức MILP tương đương cần rất nhiều ràng buộc tuyến tính + kỹ thuật big-M.

Thành phần trung tâm của CP solver hiện đại (OR-Tools, CP Optimizer) là **interval variable** (Laborie & Rogerie, 2008) — 1 biến quyết định đặc biệt gồm 4 biến con: $\nu^{\text{start}} \ge 0$ (thời điểm bắt đầu), $\nu^{\text{duration}} \ge 0$ (thời lượng), $\nu^{\text{end}} \ge 0$ (thời điểm kết thúc), $\nu^{\text{present}} \in \{0,1\}$ (biến hiện diện). Nếu interval **hiện diện** ($\nu^{\text{present}} = 1$) thì $\nu^{\text{duration}} = \nu^{\text{end}} - \nu^{\text{start}}$ được áp; nếu **vắng mặt** ($\nu^{\text{present}} = 0$) thì không áp ràng buộc này. Các ràng buộc lập lịch chuyên biệt như `NoOverlap` và `Cumulative` cũng tự động tính đến trạng thái hiện diện — interval vắng mặt coi như bị bỏ qua bởi ràng buộc.

CP Optimizer có thêm ràng buộc `Span` để liên kết các interval với nhau, trong khi OR-Tools không có — dẫn đến 2 công thức khác nhau tuỳ solver. Vì nhiều nghiên cứu trước dùng cú pháp riêng của CP Optimizer (Laborie et al., 2018), mô hình OR-Tools bị **thiếu vắng** trong tài liệu học thuật — bài báo này bù đắp khoảng trống đó bằng cách trình bày mô hình CP của PyJobShop theo **cú pháp OR-Tools**.

#### 2.2.2. Xây dựng mô hình

**Biến:**
- $\phi_j$: interval variable cho mỗi job $j \in J$, luôn hiện diện ($\phi_j^{\text{present}} = 1$).
- $\tau_t$: interval variable cho mỗi task $t \in T$, luôn hiện diện ($\tau_t^{\text{present}} = 1$).
- $\mu_m$: interval variable cho mỗi mode $m \in M$, thời lượng cố định $\mu_m^{\text{duration}} = p_m$, có thể **tuỳ chọn** hiện diện.

**Ràng buộc — liên kết job với task:**

$$\phi_j^{\text{start}} = \min_{t \in T_j} \tau_t^{\text{start}} \quad \forall j \in J \tag{1a}$$
$$\phi_j^{\text{end}} = \max_{t \in T_j} \tau_t^{\text{end}} \quad \forall j \in J \tag{1b}$$

Job không được lập lịch trực tiếp — thời điểm bắt đầu/kết thúc của job suy ra từ task sớm nhất/muộn nhất của nó.

**Ràng buộc — liên kết task với mode:**

$$\sum_{m \in M_t} \mu_m^{\text{present}} = 1 \quad \forall t \in T \tag{1c}$$
$$\mu_m^{\text{start}} = \tau_t^{\text{start}} \quad \forall t \in T, m \in M_t \tag{1d}$$
$$\mu_m^{\text{end}} = \tau_t^{\text{end}} \quad \forall t \in T, m \in M_t \tag{1e}$$
$$\mu_m^{\text{present}} \implies \mu_m^{\text{duration}} = \tau_t^{\text{duration}} \quad \forall t \in T, m \in M_t \tag{1f}$$

(1c) đảm bảo đúng 1 mode được chọn mỗi task. (1d)-(1e) đồng bộ thời điểm bắt đầu/kết thúc giữa mode và task (dù mode nào được chọn). (1f): mode được chọn thì thời lượng của nó đồng bộ với thời lượng task — mode được chọn thực chất đại diện cho task với 1 phân bổ tài nguyên cụ thể.

**Ràng buộc tài nguyên.** Gọi $M_r^R = \{m \in M : r \in R_m\}$ là tập mode cần tài nguyên $r$:

$$\texttt{NoOverlap}(\{\mu_m : m \in M_r^R\}) \quad \forall r \in R^{\text{machine}} \tag{1g}$$
$$\texttt{Cumulative}\{\{\mu_m : m \in M_r^R\}, \{q_{mr} : m \in M_r^R\}, Q_r\} \quad \forall r \in R^{\text{renewable}} \tag{1h}$$
$$\sum_{m \in M_r^R} \mu_m^{\text{present}} \cdot q_{mr} \le Q_r \quad \forall r \in R^{\text{non-renewable}} \tag{1i}$$

(1g): mode dùng cùng 1 machine không được chồng lấn (machine chỉ xử lý 1 task/lúc). (1h): mode không được vượt quá capacity renewable resource tại bất kỳ thời điểm nào. (1i): tổng nhu cầu non-renewable resource không vượt $Q_r$. `NoOverlap` và `Cumulative` đều tự tính đến trạng thái hiện diện của mode.

**Ràng buộc thời gian** — dựa trên 4 tập tuple đã định nghĩa ở Mục 2.1:

$$\tau_i^{\text{start}} + l \le \tau_k^{\text{start}} \quad \forall (i,k,l) \in C^{\text{StartBeforeStart}} \tag{1j}$$
$$\tau_i^{\text{start}} + l \le \tau_k^{\text{end}} \quad \forall (i,k,l) \in C^{\text{StartBeforeEnd}} \tag{1k}$$
$$\tau_i^{\text{end}} + l \le \tau_k^{\text{start}} \quad \forall (i,k,l) \in C^{\text{EndBeforeStart}} \tag{1l}$$
$$\tau_i^{\text{end}} + l \le \tau_k^{\text{end}} \quad \forall (i,k,l) \in C^{\text{EndBeforeEnd}} \tag{1m}$$

**Ràng buộc phân công (assignment).** Gọi $m_i, m_k$ là mode được chọn cho task $i, k$:

$$\mu_{m_i}^{\text{present}} \le \sum_{\substack{m_k \in M_k \\ R_{m_k} = R_{m_i}}} \mu_{m_k}^{\text{present}} \quad \forall (i,k) \in C^{\text{IdenticalResources}}, m_i \in M_i \tag{1n}$$
$$\mu_{m_i}^{\text{present}} \le \sum_{\substack{m_k \in M_k \\ R_{m_k} \cap R_{m_i} = \emptyset}} \mu_{m_k}^{\text{present}} \quad \forall (i,k) \in C^{\text{DifferentResources}}, m_i \in M_i \tag{1o}$$

(1n): nếu $i$ chọn mode $m_i$ thì $k$ phải chọn 1 mode dùng đúng tài nguyên đó. (1o): tương tự nhưng bắt buộc tài nguyên rời nhau.

**Ràng buộc trình tự (sequencing).** OR-Tools **không có** interface cho "sequence variable" như CP Optimizer (Laborie et al., 2018), nên phải dựng thủ công: với mỗi machine $r$, xây đồ thị đầy đủ $V_r = M_r^R \cup \{0\}$ (mọi mode cần $r$ + 1 nút giả `0`), cạnh gồm mọi cặp nút (kể cả self-loop). Biến nhị phân $B_r = \{b_{ruv} \in \{0,1\}\}$: $b_{ruv}=1$ nghĩa cạnh $(u,v)$ được chọn trong đồ thị của machine $r$. Gọi $t_m$ là task ứng với mode $m$:

$$\texttt{Circuit}(B_r) \quad \forall r \in R^{\text{machine}} \tag{1p}$$
$$b_{ruv} \implies \mu_u^{\text{present}} \wedge \mu_v^{\text{present}} \quad \forall u,v \in M_r^R, r \in R^{\text{machine}} \tag{1q}$$
$$b_{ruu} \implies \neg \mu_u^{\text{present}} \quad \forall u \in M_r^R, r \in R^{\text{machine}} \tag{1r}$$
$$b_{r00} \implies \neg \mu_u^{\text{present}} \quad \forall u \in M_r^R, r \in R^{\text{machine}} \tag{1s}$$
$$b_{ruv} \implies \mu_u^{\text{end}} + s_{t_u,t_v,r} \le \mu_v^{\text{start}} \quad \forall u,v \in M_r^R, r \in R^{\text{machine}} \tag{1t}$$

(1p) dùng global constraint `Circuit`: cạnh được chọn tạo thành 1 chu trình con duy nhất bắt đầu-kết thúc tại nút giả, thiết lập 1 thứ tự cho các mode interval trên machine $r$. (1q): cạnh được chọn thì 2 mode interval liên quan phải hiện diện. Mode không thuộc chu trình con thì phải chọn self-loop, và (1r) đảm bảo mode interval tương ứng vắng mặt. (1s) xử lý trường hợp đặc biệt: nếu self-loop tại nút giả được chọn (nghĩa là machine không được phân task nào) thì mọi mode interval phải vắng mặt. (1t) đảm bảo quan hệ end-before-start kèm setup time: nếu $(t_u,t_v,r,l) \in C^{\text{SetupTime}}$ thì setup $s_{t_u,t_v,r} = l$, ngược lại bằng 0.

**Ràng buộc kề nhau (consecutive):**

$$\mu_u^{\text{present}} \wedge \mu_v^{\text{present}} \implies b_{ruv} \quad \forall (i,k) \in C^{\text{Consecutive}}, r \in R_{ik}^{\text{machine}}, u \in M_i \cap M_r^R, v \in M_k \cap M_r^R \tag{1u}$$

Nếu cả 2 mode $u, v$ (thuộc task $i, k$) đều hiện diện thì phải nằm trong chu trình con do `Circuit` chọn — đảm bảo $i, k$ được xếp **liên tiếp** trên mọi machine mà cả 2 cùng được phân.

**Hàm mục tiêu.** PyJobShop hỗ trợ các hàm mục tiêu phổ biến sau:

- **Makespan:** $\max_{t \in T} \tau_t^{\text{end}}$
- **Total weighted flow time:** $\sum_{j \in J} w_j(\phi_j^{\text{end}} - r_j)$
- **Total weighted tardiness:** $\sum_{j \in J} w_j \max(\phi_j^{\text{end}} - d_j, 0)$
- **Total weighted earliness:** $\sum_{j \in J} w_j \max(d_j - \phi_j^{\text{end}}, 0)$
- **Total weighted number of tardy jobs:** $\sum_{j \in J} w_j \mathbb{1}\{\phi_j^{\text{end}} > d_j\}$
- **Maximum tardiness:** $\max_{j \in J} w_j \max(\phi_j^{\text{end}} - d_j, 0)$
- **Maximum lateness:** $\max_{j \in J} w_j (\phi_j^{\text{end}} - d_j)$

Gọi $F$ là tập hàm mục tiêu được chọn, $w^f$ trọng số của $f \in F$. Mục tiêu tổng thể: tìm $x$ trong tập lời giải khả thi $X$ tối thiểu tổng có trọng số:

$$\min_{x \in X} \sum_{f \in F} w^f \cdot f(x) \tag{2}$$

---

## 3. Các bài toán lập lịch được hỗ trợ

Mô hình lập lịch của PyJobShop (Mục 2) hỗ trợ rất nhiều biến thể — Mục 3.1 nói về machine scheduling, Mục 3.2 nói về project scheduling.

### 3.1. Lập lịch máy (machine scheduling)

PyJobShop dùng **ký hiệu Graham $\alpha|\beta|\gamma$** (Graham et al., 1979) — chuẩn phân loại phổ biến trong cộng đồng lập lịch: $\alpha$ = môi trường máy, $\beta$ = ràng buộc, $\gamma$ = mục tiêu. Bảng 1 tóm tắt các đặc trưng được hỗ trợ (dựa trên Framinan et al. 2014, 2019; Pinedo 2016; Dauzère-Pérès et al. 2024).

**Về môi trường máy ($\alpha$):** mọi môi trường cổ điển (`1` máy đơn, `P` máy song song, `F` flow shop, `HF` hybrid flow shop, `O` open shop, `J` job shop, `FJ` flexible job shop) đều được hỗ trợ vì hầu hết có thể mô hình như 1 biến thể FJSP. Ngoài các môi trường cổ điển, PyJobShop còn hỗ trợ **assembly scheduling** ($\circ \to \circ$, Framinan et al. 2019) — lập lịch task theo kiểu hội tụ (concurrent), tổng quát hoá **order scheduling** (Leung et al., 2005). Ví dụ môi trường sản xuất phổ biến: $Pm \to 1$ (nhiều máy song song ở giai đoạn đầu sản xuất linh kiện, rồi 1 dây chuyền lắp ráp chỉ bắt đầu khi mọi linh kiện đã xong).

Dauzère-Pérès et al. (2024) mở rộng trường môi trường với: **multi-mode (MM)**, **flexible sequencing (FS)**, **multi-resource (MR)**, **flexible processing planning (FP)**, **distributed (D)**. PyJobShop hỗ trợ **MM** (là phần lõi của mô hình) và **FS** (cho phép hoán đổi thứ tự task của 1 job, vd 1-2-3 hoặc 1-3-2; task không được xử lý đồng thời thì dùng "machine giả" + mode để ngăn chồng lấn). **KHÔNG hỗ trợ**: **MR** (multi-resource — có thể lách bằng multi-mode nếu số tổ hợp resource-skill hữu hạn) và **FP**/**D** (cần task tuỳ chọn, PyJobShop chưa hỗ trợ khái niệm task optional).

**Về ràng buộc ($\beta$):** hỗ trợ release date ($r_j$), deadline ($\overline{d_j}$), due date ($d_j$), **capacity-based resource** (res — không chỉ machine mà cả renewable resource trong machine scheduling), **bill of materials** (bom, tức arbitrary precedence graph — Kasapidis et al. 2021, vì timing constraint có thể áp tuỳ ý giữa các task), **sequence-dependent setup time** ($s_{ijk}$), **blocking** (block — task chiếm resource lâu hơn processing duration vì successor chưa sẵn sàng, hỗ trợ qua duration biến đổi + generalized precedence end-at-start; **buffer** ($b_i$) mô hình bằng cách thêm resource riêng cho mỗi machine kèm capacity + precedence có blocking), **no-wait** (kết hợp end-before-start + start-before-end), **overlap** (không gì ngăn task chồng lấn ngoài resource capacity/machine), **breakdown** cơ bản (dummy task chiếm machine 1 khoảng cố định), **general time lag** ($d_{ii'}^{kk'}$, hỗ trợ nếu time lag không phụ thuộc machine).

**KHÔNG hỗ trợ:** **permutation constraint** (prmu — độ phức tạp cài đặt cùng lúc với các tính năng khác quá cao, cần mapping cụ thể task↔machine không khả thi với interface hiện tại), **no-idle** (machine phải chạy liên tục không nghỉ), **p-batch** (batching — cần quyết định thêm về nhóm task nào xử lý đồng thời), **preemption** (prmp — cần quyết định thêm về cách chia nhỏ task).

**Về mục tiêu ($\gamma$):** hỗ trợ makespan ($C_{max}$), total weighted flow time (TWFT), total weighted tardiness (TWT), total weighted earliness (TWE), total weighted number of tardy jobs (TWNTJ), maximum tardiness ($T_{max}$), maximum lateness ($L_{max}$) — đều dựa trên thời điểm hoàn thành job/task. **Chưa hỗ trợ** mục tiêu dựa trên yếu tố khác như workload máy ($W_T$). Xem Ostermeier & Deuse (2023) để có tổng quan chi tiết về mục tiêu trong machine scheduling.

**Bảng 1 — Sơ đồ phân loại bài toán lập lịch máy** (■ = được hỗ trợ, □ = chưa hỗ trợ):

| Môi trường máy ($\alpha$) | | Ràng buộc ($\beta$) | | Mục tiêu ($\gamma$) | |
|---|---|---|---|---|---|
| 1: single machine | ■ | $r_j$: release dates | ■ | $C_{max}$: makespan | ■ |
| P: parallel machines | ■ | $d_j$: due dates | ■ | TWFT: total weighted flow time | ■ |
| F: flow shop | ■ | $\overline{d_j}$: deadlines | ■ | TWT: total weighted tardiness | ■ |
| HF: hybrid flow shop | ■ | res: capacity-based resources | ■ | TWE: total weighted earliness | ■ |
| O: open shop | ■ | $s_{ijk}$: setup times | ■ | TWNTJ: total weighted number of tardy jobs | ■ |
| J: job shop | ■ | bom: bills of materials | ■ | $T_{max}$: maximum tardiness | ■ |
| FJ: flexible job shop | ■ | block: jobs are blocked | ■ | $L_{max}$: maximum lateness | ■ |
| $\circ \to \circ$: assembly scheduling | ■ | $b_i$: buffers | ■ | $W_T$: total workload of machines | □ |
| MM: multi-mode | ■ | no-wait: jobs may not wait | ■ | | |
| FS: flexible sequencing | ■ | overlap: overlapping tasks | ■ | | |
| MR: multi-resource | □ | brkdwn: breakdowns | ■ | | |
| FP: flexible processing planning | □ | $d_{ii'}^{kk'}$: general time lags | ■ | | |
| D: distributed | □ | no-idle: machine cannot be idle | □ | | |
| | | prmu: permutation constraint | □ | | |
| | | $p$-batch: simultaneous processing | □ | | |
| | | prmp: pre-emption | □ | | |

### 3.2. Lập lịch dự án (project scheduling)

Phạm vi ban đầu của PyJobShop chỉ nhắm giải machine scheduling. Nhưng vì các khái niệm được đưa vào (mode, resource dựa trên capacity) cũng phổ biến trong tài liệu project scheduling, PyJobShop giải được nhiều biến thể project scheduling.

Project scheduling và machine scheduling chia sẻ nhiều ý tưởng nhưng thuật ngữ hơi khác (Demeulemeester & Herroelen, 2006): job gọi là **project** (dù thường chỉ có 1 project), task gọi là **activity/event**. Resource gồm renewable/non-renewable, hoặc **double-constrained** — cùng với **cumulative** và **partially renewable** (loại sau KHÔNG được PyJobShop hỗ trợ). Machine hiếm gặp trong project scheduling, nhưng có biến thể như **multi-skilled project scheduling problem** dùng disjunctive resource (Snauwaert & Vanhoucke, 2023).

Các biến thể project scheduling được PyJobShop hỗ trợ (xem tổng quan đầy đủ ở Hartmann & Briskorn 2022; Gómez Sánchez et al. 2023):

- **Project scheduling problem** cơ bản nhất — task không ràng buộc tài nguyên, chỉ ràng buộc quan hệ trình tự (precedence).
- **Resource-Constrained Project Scheduling Problem (RCPSP)** — thêm tài nguyên hữu hạn, mỗi task cần 1 thời lượng + nhu cầu tài nguyên cố định.
- **Multi-Mode RCPSP (MMRCPSP)** — mở rộng RCPSP cho phép task chạy theo nhiều mode (mỗi mode thời lượng + nhu cầu tài nguyên khác nhau) — tương tự cách FJSP mở rộng job shop.
- **RCPSP với generalized precedence constraints (RCPSP/max)** (Schutt et al., 2013) — quan hệ trình tự tổng quát start-to-start, start-to-end, end-to-start, end-to-end giữa các cặp task (đúng như mô hình lập lịch của PyJobShop đã định nghĩa ở Mục 2).
- **Resource-Constrained Multi-Project Scheduling Problem (RCMPSP)** — nhiều project đồng thời, mỗi project có tập task riêng cần hoàn thành.

Mục tiêu chung của mọi biến thể trên: tối thiểu makespan.

---

## 4. Phần mềm

Mã nguồn PyJobShop nằm tại repository GitHub `https://github.com/PyJobShop/PyJobShop` (gồm source code, test, tài liệu, ví dụ). Tài liệu chính thức: `https://pyjobshop.org`. Cài trực tiếp qua `pip install pyjobshop` (kèm sẵn OR-Tools; cài CP Optimizer riêng theo hướng dẫn trong tài liệu).

PyJobShop kế thừa nhiều ý tưởng từ **PyVRP** (Wouda et al., 2024) — bộ giải mã nguồn mở cho vehicle routing problem: framework mô hình đơn giản, tài liệu đầy đủ, nhiều ví dụ — vốn đã chứng minh giá trị lớn cho người dùng PyVRP cả trong học thuật lẫn công nghiệp.

### 4.1. Cấu trúc gói

Package cấp cao nhất `pyjobshop` chứa các thành phần chính:

- **`ProblemData.py`** — class `ProblemData` định nghĩa instance bài toán cần giải, cùng các class `Job`, `Task`, `Machine`, `Renewable`, `NonRenewable`, `Mode`, `Constraints`.
- **`Model.py`** — giao diện mô hình hoá để dựng `ProblemData` từng bước.
- **`Solution.py`** — class mô tả 1 lời giải.
- **`Result.py`** — kết quả 1 lần chạy solver, gồm lời giải tốt nhất tìm được + thống kê solver.
- **`read.py`** — hàm đọc nhiều định dạng instance benchmark khác nhau.
- **`solve.py`** — hàm giải chuyên dụng.
- **`cli.py`** — giao diện dòng lệnh, chủ yếu dùng nội bộ + benchmark.
- **`solvers/`** — module cài đặt mô hình lập lịch cho từng bộ giải (`ortools`, `cpoptimizer`), mỗi bộ giải đóng gói trong 1 class `Solver` riêng, quản lý các class `Variables`, `Constraints`, `Objective`.

### 4.2. Ví dụ sử dụng

Giao diện chính là class `Model`, cung cấp API theo đúng ngôn ngữ nghiệp vụ lập lịch (domain-specific). Listing 1 là ví dụ đầy đủ mô hình hoá và giải 1 bài toán **flow shop**: người dùng tạo các thành phần instance (machine, job, task, mode, constraint) qua các method của `Model`, rồi gọi `solve` để lấy kết quả (gồm lời giải + thống kê solver). Lời giải có thể vẽ bằng `plot_machine_gantt` từ module `pyjobshop.plot` (xem Hình 1 — Gantt chart, mỗi thanh là 1 task, màu theo job). Tài liệu chính thức có thêm nhiều ví dụ khác (machine scheduling lẫn project scheduling).

```python
# Listing 1: Mô hình hoá bài toán flow shop
import random
from pyjobshop import Model
from pyjobshop.plot import plot_machine_gantt

random.seed(42)

model = Model()
machines = [model.add_machine() for idx in range(5)]

for job_idx in range(5):
    job = model.add_job()
    tasks = [model.add_task(job=job) for idx in range(5)]

    for idx in range(len(tasks)):
        task = tasks[idx]
        machine = machines[idx]
        processing_time = random.randint(1, 5)
        model.add_mode(task, machine, processing_time)

    for idx in range(len(tasks) - 1):
        pred = tasks[idx]
        succ = tasks[idx + 1]
        model.add_end_before_start(pred, succ)

result = model.solve(time_limit=10)
data = model.data()
solution = result.best

plot_machine_gantt(solution, data)
```

### 4.3. Mở rộng PyJobShop

Dù PyJobShop đã cài sẵn các ràng buộc lập lịch phổ biến, một số người dùng có thể cần ràng buộc chuyên biệt hơn. Người dùng có thể mở rộng framework theo nhu cầu. Việc mở rộng thường rơi vào 1 trong 3 loại: thêm ràng buộc mới, thêm hàm mục tiêu mới, hoặc thêm biến quyết định mới. Quy trình thường gặp: sửa lần lượt `ProblemData` (biểu diễn tính năng mới dưới dạng dữ liệu) → `Model` (cách tương tác với tính năng mới qua giao diện người dùng) → class `Solver` của bộ giải CP tương ứng (cách cài tính năng mới thành biến/ràng buộc CP).

Nhóm tác giả hoan nghênh đóng góp mới và khuyến khích người dùng mở issue trên GitHub repository để thảo luận trước khi mở rộng/cải tiến.

---

## 5. Thực nghiệm số

PyJobShop cho phép mô hình hoá dễ dàng rất nhiều bài toán lập lịch qua 1 giao diện duy nhất — nhóm tác giả tận dụng điều này để đánh giá và so sánh hiệu năng OR-Tools và CP Optimizer trên nhiều loại instance.

### 5.1. Instance benchmark

Thực nghiệm chạy trên tổng cộng **9.280 instance**, cả từ machine scheduling lẫn project scheduling (Bảng 2 tóm tắt đặc trưng).

**Instance machine scheduling.** Bộ đầu tiên là tập con instance dùng trong Naderi et al. (2023), gồm 9 biến thể: job shop (JSP), flexible job shop (FJSP), no-wait permutation flow shop (NW-PFSP), non-permutation flow shop (NPFSP), hybrid flow shop (HFSP), permutation flow shop (PFSP), sequence-dependent setup times PFSP (SDST-PFSP), total completion time PFSP (TCT-PFSP), total tardiness PFSP (TT-PFSP).

4/9 biến thể (PFSP, SDST-PFSP, TCT-PFSP, TT-PFSP) đòi hỏi **ràng buộc permutation tường minh** — vốn PyJobShop **không hỗ trợ trực tiếp** (xem Bảng 1). Nhóm tác giả vẫn cài đặt riêng ràng buộc permutation cho thực nghiệm này (để so sánh với Naderi et al. 2023), nhưng OR-Tools thiếu cách cài permutation hiệu quả — phải dùng sequencing constraint cơ bản ở Mục 2.2, sinh ra rất nhiều biến/ràng buộc, buộc phải giới hạn instance ở tối đa **100 job** (lớn hơn thì bất khả thi tính toán). Riêng NW-PFSP không cần ràng buộc permutation tường minh vì có thể dùng end-to-start constraint (ngầm định permutation trong bối cảnh flow shop).

3 biến thể bị **loại khỏi** thực nghiệm so với Naderi et al. (2023): (i) open shop (mọi instance đều giải tầm thường), (ii) parallel machines (có mô hình hiệu quả hơn hẳn mô hình dùng trong PyJobShop), (iii) distributed PFSP (không hỗ trợ dù đã cài ràng buộc permutation).

Best-known solution của mọi instance machine scheduling lấy từ dữ liệu Naderi et al. (2023) — best-known có thể đã lỗi thời (thực nghiệm gốc chạy 2021), nhưng cập nhật best-known mới nhất nằm ngoài phạm vi bài báo này.

**Instance project scheduling.** Từ tài liệu project scheduling, gồm RCPSP, MMRCPSP, RCMPSP — khác instance machine scheduling ở chỗ cần renewable + non-renewable resource thay vì machine.

- RCPSP: dùng **PSPLIB** (Kolisch & Sprecher, 1997) với 30/60/90/120 task, và **RG300** (Debels & Vanhoucke, 2007) với 300 task.
- MMRCPSP: dùng **MMLIB** (Van Peteghem & Vanhoucke, 2014), cụ thể MMLIB50 và MMLIB100 (50/100 task).
- RCMPSP: dùng **MPLIB1** (Van Eynde & Vanhoucke, 2020), cụ thể instance set 3 (1488 task — lớn nhất trong MPLIB1).

Best-known solution mới nhất lấy từ Operations Research & Scheduling Research Group (2025) cho RCPSP/MMRCPSP, và Bredael & Vanhoucke (2023) cho RCMPSP.

**Bảng 2 — Thống kê instance dùng trong thực nghiệm** (min/avg/max số task và tài nguyên):

| Nhóm | Bài toán | # Instance | Task (Min/Avg/Max) | Resource (Min/Avg/Max) |
|---|---|---|---|---|
| Non-permutation | JSP | 242 | 36 / 511 / 2000 | 5 / 15 / 20 |
| Non-permutation | FJSP | 289 | 12 / 322 / 1477 | 4 / 11 / 20 |
| Non-permutation | NW-PFSP | 360 | 100 / 12610 / 48000 | 5 / 31 / 60 |
| Non-permutation | NPFSP | 360 | 100 / 12610 / 48000 | 5 / 31 / 60 |
| Non-permutation | HFSP | 1440 | 250 / 938 / 2000 | 15 / 30 / 50 |
| Permutation | PFSP | 120 | 100 / 1496 / 6000 | 5 / 19 / 60 |
| Permutation | SDST-PFSP | 360 | 100 / 661 / 2000 | 5 / 12 / 20 |
| Permutation | TCT-PFSP | 120 | 100 / 1496 / 6000 | 5 / 19 / 60 |
| Permutation | TT-PFSP | 135 | 500 / 1500 / 2500 | 10 / 30 / 50 |
| Project | RCPSP | 2520 | 32 / 122 / 302 | 3 / 4 / 4 |
| Project | MMRCPSP | 1080 | 52 / 77 / 102 | 4 / 4 / 4 |
| Project | RCMPSP | 2254 | 1488 / 1488 / 1488 | 4 / 4 / 4 |

### 5.2. Chi tiết tính toán

Mỗi instance giải bằng 8 core CPU AMD EPYC 9654, giới hạn thời gian **900 giây**. Với mỗi instance, nhóm tác giả tính **optimality gap** và **relative percentage deviation (RPD)**:

$$\text{Gap} = \frac{\text{UB} - \text{LB}}{\text{UB}} \times 100 \qquad \text{RPD} = \frac{\text{UB} - \text{BKS}}{\text{BKS}} \times 100 \tag{3}$$

trong đó UB, LB là upper/lower bound đạt được, BKS là best-known solution. (Với vài instance TT-PFSP có UB hoặc BKS bằng 0: nếu tử số khác 0 thì gán chỉ số = 100, ngược lại gán = 0.)

Dùng **OR-Tools v9.11.4210** và **CP Optimizer v22.1.1.0**, mỗi bộ giải cài mô hình lập lịch cơ bản ở Mục 2 (có điều chỉnh nhỏ để hỗ trợ ràng buộc permutation). Toàn bộ code/dữ liệu/kết quả công khai tại `https://github.com/PyJobShop/Experiments`.

### 5.3. Kết quả

Bảng 3 báo cáo RPD và optimality gap trung bình theo từng nhóm bài toán, theo từng bộ giải (loại trừ instance không tìm được lời giải khả thi — phần lớn instance đều giải khả thi được, ngoại lệ là CP Optimizer không tìm được lời giải khả thi cho 4% instance MMRCPSP).

**Nhận định chung:** OR-Tools **cạnh tranh rất tốt** với CP Optimizer. Đạt kết quả tương đương trên JSP, FJSP, NW-PFSP và mọi biến thể project scheduling, thậm chí RPD trung bình **thấp hơn** trên FJSP, NW-PFSP, MM-RCPSP. OR-Tools còn đạt **optimality gap tốt hơn** CP Optimizer trên hầu hết bài toán (trừ 2 bài toán permutation) — cho thấy OR-Tools tính **lower bound mạnh hơn** CP Optimizer.

Ngược lại, **CP Optimizer vượt trội rõ rệt** trên bài toán permutation scheduling (dù đã giới hạn cỡ instance để OR-Tools chạy nổi) — diễn đạt ràng buộc trình tự trong OR-Tools kém hiệu quả hơn hẳn CP Optimizer, ảnh hưởng nặng đến hiệu năng OR-Tools trên nhóm bài toán này. CP Optimizer cũng xử lý instance quy mô lớn hiệu quả hơn nói chung: vượt trội OR-Tools trên NPFSP (lên tới 48.000 task) và HFSP (lên tới 2.000 task, 10.000 mode). Ngoại lệ đáng chú ý: NW-PFSP (lên tới 48.000 task) — OR-Tools lại vượt trội CP Optimizer ngoài dự đoán. Sau khi rà lại, nhóm tác giả phát hiện hiệu năng CP Optimizer trên NW-PFSP bị ảnh hưởng nhiều bởi việc thêm ràng buộc permutation, và dựa theo kết quả Naderi et al. (2023), CP Optimizer với time limit 3.600 giây dự kiến đạt RPD trung bình ~1,6% — vượt OR-Tools (3,47%).

**Bảng 3 — RPD và optimality gap trung bình trên mọi instance giải khả thi, giới hạn 900 giây:**

| Nhóm | Bài toán | RPD OR-Tools (%) | RPD CP Optimizer (%) | Gap OR-Tools (%) | Gap CP Optimizer (%) |
|---|---|---|---|---|---|
| Non-permutation | JSP | 1,98 | **1,80** | **3,40** | 4,09 |
| Non-permutation | FJSP | **0,68** | 0,99 | **1,04** | 27,67 |
| Non-permutation | NW-PFSP | **3,47** | 7,18 | **50,51** | 57,87 |
| Non-permutation | NPFSP | 13,53 | **8,88** | **16,29** | 25,58 |
| Non-permutation | HFSP | 13,34 | **6,58** | **11,94** | 66,54 |
| Non-permutation | **Trung bình** | 6,60 | **5,08** | **16,63** | 36,35 |
| Permutation | PFSP | 7,49 | **2,54** | 10,61 | **7,03** |
| Permutation | SDST-PFSP | 8,82 | **4,41** | **30,75** | 28,24 |
| Permutation | TCT-PFSP | 10,31 | **3,31** | 21,48 | **26,69**\* |
| Permutation | TT-PFSP | 53,14 | **20,79** | 66,86 | **72,43**\* |
| Permutation | **Trung bình** | 19,94 | **7,76** | 32,43 | 33,6 |
| Project | RCPSP | 0,93 | **0,46** | **3,46** | 4,26 |
| Project | MMRCPSP | **0,18** | 0,27 | **0,94** | 6,65 |
| Project | RCMPSP | -0,52 | **-0,85** | **14,91** | 67,36 |
| Project | **Trung bình** | 0,20 | **-0,04** | **6,44** | 26,09 |

\*Ở 2 cột này, bảng gốc in đậm giá trị *thấp hơn* là tốt hơn cho gap — kiểm tra lại bảng gốc nếu trích dẫn số chính xác; nhóm tác giả nhận định OR-Tools thắng gap ở "tất cả trừ 2 bài toán permutation".

Với project scheduling, OR-Tools và CP Optimizer cho kết quả tương tự (chênh RPD < 0,5% mọi biến thể). CP Optimizer tốt hơn ở RCPSP và RCMPSP, OR-Tools tốt hơn ở MMRCPSP. Đáng chú ý: cả 2 bộ giải **cộng lại** tìm ra hơn **22, 13, và 2.025 best-known solution mới** cho RCPSP, MMRCPSP, RCMPSP — càng củng cố luận điểm CP là công cụ tốt cho project scheduling.

### 5.4. Thảo luận

Kết quả xác lập OR-Tools là **lựa chọn thay thế mạnh** cho CP Optimizer trên nhiều bài toán lập lịch. Điều này **trái ngược** kết luận của Naderi et al. (2023) — bài báo đó khẳng định (phụ lục, tr.9) rằng "OR-Tools không đạt hiệu năng gần với CP Optimizer", và ở footnote 7 còn cho rằng OR-Tools gặp khó với biến assignment dựa trên kết quả FJSP/HFSP của họ. Nhóm tác giả đã rà lại cài đặt OR-Tools dùng trong Naderi et al. (2023) và phát hiện **mô hình FJSP/HFSP của họ được xây dựng kém hiệu quả** (chi tiết ở Appendix A). Khi chạy đúng cài đặt đó trên cùng bộ instance FJSP với cùng thiết lập tính toán như thực nghiệm ở đây, RPD trung bình đạt **7,55%** — trong khi mô hình OR-Tools đã tối ưu của nhóm tác giả chỉ đạt **0,68%**. Điều này gợi ý lý do chính khiến OR-Tools "thua kém" trong nghiên cứu trước là do **lựa chọn mô hình hoá chưa tối ưu**, dù việc dùng phiên bản CP-SAT cũ hơn cũng có thể góp phần.

Dù OR-Tools cho kết quả mạnh, CP Optimizer vẫn có ưu thế ở vài điểm cụ thể: **scale tốt hơn** cho instance lớn và **hiệu năng tốt** trên bài toán permutation-based; theo kinh nghiệm nhóm tác giả, CP Optimizer thường tìm lời giải chất lượng cao **nhanh hơn**. Ưu thế của CP Optimizer trên instance quy mô lớn có thể do phương pháp **iterative diving search** — lao sâu vào cây tìm kiếm không backtrack (Laborie et al., 2018). Điều này cũng được Da Col & Teppan (2022) định lượng: CP Optimizer vượt OR-Tools 6-42% trên job shop scheduling với 10.000-100.000 task, và giải thành công instance tới 1.000.000 task nơi OR-Tools thất bại — tuy nhiên nhóm tác giả lưu ý Da Col & Teppan (2022) chỉ thử nghiệm với tối đa 4 core, trong khi số core khuyến nghị cho OR-Tools là **ít nhất 8** (Perron, 2024).

Nhìn bức tranh tổng thể, cả 2 bộ giải đều chứng minh hiệu quả của CP cho bài toán lập lịch. Như Naderi et al. (2023) chỉ ra, CP Optimizer nhìn chung vượt trội MILP solver trong machine scheduling, và kết quả CP Optimizer ở đây phần lớn nhất quán với họ. Dù CP đôi khi cho RPD khá cao (như ~10% ở NPFSP) — điều này dễ hiểu vì đang so với lời giải từ (meta)heuristic chuyên biệt được tinh chỉnh riêng cho từng bài toán — ưu thế then chốt của CP nằm ở **tính linh hoạt**: dễ dàng tích hợp ràng buộc mới phát sinh từ ứng dụng thực tế, trong khi heuristic chuyên biệt thường cần sửa đổi sâu rộng cho mỗi tính năng mới.

---

## 6. Kết luận

Bài báo giới thiệu **PyJobShop**, thư viện Python mã nguồn mở giải bài toán lập lịch bằng constraint programming. PyJobShop cung cấp giao diện mô hình hoá dễ dùng, cho phép giải bài toán lập lịch mà không cần biết chi tiết cài đặt CP. Nhóm tác giả dùng PyJobShop chạy thực nghiệm số quy mô lớn trên rất nhiều bài toán lập lịch từ tài liệu machine scheduling và project scheduling. Kết quả cho thấy **OR-Tools cạnh tranh rất tốt** với CP Optimizer, đặc biệt trên job shop và project scheduling, nơi OR-Tools thường **khớp và đôi khi vượt** hiệu năng CP Optimizer. **CP Optimizer vượt trội** ở bài toán permutation scheduling (nhờ xử lý sequencing constraint hiệu quả hơn) và bài toán quy mô lớn.

**3 hướng nghiên cứu tương lai đáng chú ý:**

1. **Hỗ trợ thêm nhiều biến thể lập lịch** — gồm bài toán **task selection** (quyết định có lập lịch 1 task hay không — Kis, 2003), qua đó hỗ trợ mô hình hoá môi trường phân tán (distributed). Một biến thể khác đáng chú ý: **multi-skilled scheduling**, trong đó mode cần **skill** thay vì resource tường minh, mỗi resource làm chủ 1 hoặc nhiều skill (Snauwaert & Vanhoucke, 2023).
2. **Cải thiện hiệu năng bộ giải CP** — có thể đáng để thiết kế 1 **matheuristic** cài đặt metaheuristic (như large neighborhood search) trên nền constraint programming. Dù CP solver hiện đại đã dùng large neighborhood search "ngầm bên trong", Kasapidis et al. (2024) cho thấy các **destroy operator chuyên biệt cho bài toán cụ thể** có thể cải thiện hiệu năng hơn nữa.
3. **Tích hợp PyJobShop với các CP solver khác.** **MiniZinc** (Stuckey et al., 2014) cung cấp 1 giao diện mô hình hoá chuẩn, có thể dùng để tích hợp dễ dàng nhiều CP solver mà không cần viết cài đặt riêng cho từng solver như đã làm với OR-Tools và CP Optimizer.

Nhóm tác giả bày tỏ mong muốn thúc đẩy việc dùng constraint programming cho bài toán lập lịch, và hy vọng PyJobShop trở thành công cụ hữu ích cho cả nhà nghiên cứu lẫn người thực hành.

**Lời cảm ơn:** công trình được tài trợ bởi TKI Dinalog, Topsector Logistics, và Bộ Kinh tế và Chính sách Khí hậu Hà Lan.

---

## Phụ lục A — Mô hình CP thay thế cho FJSP (mô hình của Naderi et al. 2023)

Nhóm tác giả mô tả lại mô hình CP OR-Tools mà Naderi et al. (2023) dùng cho FJSP, dùng cùng ký hiệu như bài báo chính. Trong FJSP, mỗi job $j \in J$ có tập task $T_j$ phải xử lý theo thứ tự (tuần tự). Gọi $C^{\text{EndBeforeStart}}$ định nghĩa timing constraint giữa mỗi cặp task liên tiếp $i, k$. Mục tiêu: tối thiểu makespan. Mô hình CP:

$$\min \max_{t \in T, m \in M_t} \mu_m^{\text{end}} \tag{4a}$$
$$\sum_{m \in M_t} \mu_m^{\text{present}} = 1 \quad \forall t \in T \tag{4b}$$
$$\texttt{NoOverlap}(\{\mu_m : m \in M_r^R\}) \quad \forall r \in R \tag{4c}$$
$$\mu_{m_i}^{\text{end}} \le \mu_{m_k}^{\text{start}} \quad \forall (i,k,l) \in C^{\text{EndBeforeStart}}, m_i \in M_i, m_k \in M_k \tag{4d}$$

(4a) tối thiểu mục tiêu makespan. (4b) đảm bảo mỗi task chọn đúng 1 mode. (4c) đảm bảo không chồng lấn trên machine. (4d) đảm bảo ràng buộc thời gian giữa các task liên tiếp được tôn trọng.

**Vấn đề (đây chính là điểm nhóm tác giả PyJobShop chỉ ra là "kém hiệu quả"):** ràng buộc (4d) **thiếu hiệu quả**, vì nó định nghĩa ràng buộc end-before-start giữa **MỌI cặp mode** thuộc 2 task liên quan — số ràng buộc sinh ra là $|M_i| \times |M_k|$ thay vì chỉ cần diễn đạt ở mức **task interval** ($\tau$) như mô hình chính của PyJobShop ở Mục 2.2 (chỉ cần 1 ràng buộc giữa $\tau_i^{\text{end}}$ và $\tau_k^{\text{start}}$, không quan tâm mode nào được chọn). Cách viết gọn hơn này có thể giúp **constraint propagation** hiệu quả hơn hẳn — đây chính là lý do mô hình PyJobShop đạt RPD 0,68% trên FJSP trong khi mô hình kiểu Naderi et al. (2023) chỉ đạt 7,55% với cùng bộ instance và cùng ngân sách tính toán.

---

## Ghi chú liên hệ với đồ án CO5103

- Bài báo này chính là nguồn cho **Bước 3** trong `report/literature-review/reading_plan.md` — mục tiêu là dựng mô hình CP tối thiểu cho ví dụ nhỏ, dùng mô hình interval variable (Mục 2.2) làm khuôn mẫu.
- Mô hình lập lịch tổng quát ở Mục 2.2 (đặc biệt cách liên kết job-task-mode và cách mã hoá sequencing bằng `Circuit`) là hình mẫu trực tiếp cho cách backend hiện tại (`models/common/cp_engine.py`) nên tổ chức biến/ràng buộc khi dùng OR-Tools CP-SAT.
- **Phụ lục A là bài học thực hành quan trọng nhất**: cùng 1 bài toán FJSP, chỉ vì cách viết ràng buộc thời gian ở mức "mode" thay vì "task interval" mà RPD tăng từ 0,68% lên 7,55% — tức là **cách mô hình hoá ràng buộc ảnh hưởng hiệu năng CP-SAT nhiều hơn cả việc đổi thuật toán**. Đáng dùng làm checklist khi review code CP-SAT hiện tại của đồ án: kiểm tra ràng buộc precedence/timing có đang viết ở mức task interval (gọn) hay đang lặp qua từng mode (kém hiệu quả).
- Bảng 1 (Mục 3.1) là tài liệu tham chiếu hữu ích để xác định case study bánh xe (đúc→CNC→sơn→QC, 2 dây chuyền) đang dùng đặc trưng nào của ký hiệu Graham $\alpha|\beta|\gamma$ — hỗ trợ việc viết phần "định vị bài toán" trong SRS/literature review.
- Kết luận Mục 5.4 (CP linh hoạt hơn heuristic chuyên biệt khi thêm ràng buộc mới, dù RPD có thể cao hơn heuristic tinh chỉnh riêng) là luận điểm tốt để biện minh lựa chọn CP-SAT làm engine chính, đồng thời vẫn giữ FIFO/EDD/SPT/GA/SA làm baseline đối sánh trong `models/`.
