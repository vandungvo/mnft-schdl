---
title: "Bài toán lập lịch xưởng linh hoạt (FJSP): Một bài tổng quan — Bản dịch/tóm lược tiếng Việt"
nguon_goc: "Dauzère-Pérès, S., Ding, J., Shen, L., & Tamssaouet, K. (2024). The flexible job shop scheduling problem: A review. European Journal of Operational Research, 314, 409–432. https://doi.org/10.1016/j.ejor.2023.05.017"
loai: "Invited Review"
ghi_chu: "Đây là bản dịch/tóm lược chi tiết bằng tiếng Việt phục vụ literature review của đồ án CO5103, KHÔNG phải bản dịch nguyên văn từng câu. Trích dẫn (tác giả, năm) được giữ nguyên như bản gốc để tiện tra cứu; số thứ tự Mục bám theo bài báo gốc."
---

# Bài toán lập lịch xưởng linh hoạt (FJSP): Một bài tổng quan

**Tác giả:** Stéphane Dauzère-Pérès, Junwen Ding, Liji Shen, Karim Tamssaouet
**Nguồn:** European Journal of Operational Research 314 (2024) 409–432

## Tóm tắt

Bài toán lập lịch xưởng linh hoạt (Flexible Job-shop Scheduling Problem — FJSP) là một bài toán tối ưu tổ hợp thuộc lớp NP-khó, có phạm vi ứng dụng thực tế rất rộng. Tính phức tạp và tính thời sự của FJSP đã dẫn đến rất nhiều công trình nghiên cứu về mô hình hoá và giải thuật cho bài toán này. Bài báo tổng quan lại khoảng 30 năm nghiên cứu, trình bày và phân loại các tiêu chí, ràng buộc, cấu hình bài toán và cách tiếp cận giải khác nhau đã được xem xét trong tài liệu. Các chủ đề mới nổi gần đây — lập lịch xưởng phức tạp, tối ưu đa tiêu chí, môi trường bất định và động — cũng được thảo luận. Cuối cùng, bài báo đề xuất một số hướng nghiên cứu tương lai.

---

## 1. Giới thiệu

Bài toán lập lịch xưởng (Job-shop Scheduling Problem — JSP) là bài toán lập lịch phức tạp trong đó mỗi công việc (job) gồm một chuỗi công đoạn (operation) cố định phải được xử lý trên các máy khác nhau. Quyết định cần đưa ra là **trình tự** các công đoạn trên các máy sao cho tối thiểu hoá một tiêu chí cho trước — phổ biến nhất là **makespan** (thời điểm hoàn thành công việc cuối cùng). Nhiều cách tiếp cận đã được đề xuất, nổi bật là thuật toán nhánh-cận của Carlier & Pinson (1989) và heuristic shifting bottleneck của Adams et al. (1988), cả hai đều dựa trên việc giải hiệu quả các bài toán lập lịch một máy.

Đầu những năm 1990, một mở rộng quan trọng của JSP xuất hiện: mỗi công đoạn có thể được xử lý trên **bất kỳ máy nào trong một tập máy cho trước**. Bài toán này được Brandimarte (1993) gọi là **Flexible Job-shop Scheduling Problem (FJSP)**; các tên gọi khác gồm: bài toán lập lịch xưởng với máy đa mục đích (multi-purpose machine) trong Brucker & Schlie (1990) và Hurink et al. (1994), bài toán lập lịch xưởng đa xử lý (multiprocessor job shop) trong Dauzère-Pérès & Paulli (1997), và sau này là bài toán lập lịch xưởng máy song song (parallel-machine job shop) trong Liu & Kozan (2009). Độ phức tạp bổ sung đáng kể của FJSP so với JSP nằm ở chỗ: không chỉ cần trình tự các công đoạn trên máy, mà còn phải **phân công (assign)** công đoạn cho máy. Việc phân công ngăn cản, chẳng hạn, việc suy ra các cận dưới hiệu quả cho FJSP bằng cách giải các bài toán lập lịch một máy — điều vốn hiệu quả với JSP. Ngoài ra, tính linh hoạt về máy cho phép cân bằng tải trọng công việc (workload) tốt hơn so với JSP, điều này càng có ý nghĩa khi thời gian xử lý một công đoạn thay đổi tuỳ theo máy được chọn.

Với xu hướng cá nhân hoá hàng loạt (mass customization) và tự động hoá, FJSP không còn chỉ là một mở rộng của JSP mà đã trở thành một **bài toán lập lịch xưởng độc lập**. Bài báo cho thấy sự đa dạng của các bối cảnh thực tế có thể mô hình hoá bằng cách mở rộng FJSP: lựa chọn thiết bị sản xuất (Mati et al., 2011), ngày giao hàng (delivery date setting) (Alvarez-Valdes et al., 2005), hay lập kế hoạch quy trình (process planning) (Özgüven et al., 2010).

Bài báo **không** đặt mục tiêu tổng quan đầy đủ toàn bộ tài liệu về FJSP (vì cần đến hàng trăm tham chiếu chỉ trong 10 năm gần đây), mà trình bày các mô hình được biết đến rộng rãi và các kết quả quan trọng, đồng thời khảo sát các tiêu chí, ràng buộc bổ sung và các cấu hình khác nhau của FJSP trong tài liệu, cũng như đề xuất các hướng nghiên cứu tương lai liên quan.

**Cấu trúc bài báo:**
- Mục 2 — giới thiệu ký hiệu và hình thức hoá bài toán.
- Mục 3 — tiêu chí được nghiên cứu nhiều nhất: makespan.
- Mục 4 — các tiêu chí thay thế và tối ưu đa tiêu chí.
- Mục 5 — các ràng buộc bổ sung ngoài ràng buộc cổ điển.
- Mục 6 — các đặc điểm bài toán bổ sung khác.
- Mục 7 — các cách tiếp cận giải.
- Mục 8 — kết luận và hướng nghiên cứu tương lai.

---

## 2. Mô tả bài toán và ký hiệu

### 2.1. Mô hình hoá toán học (MILP)

FJSP cổ điển được hình thức hoá như sau: cho một tập công việc $\mathcal{J}$, một tập máy (hoặc tài nguyên tái tạo đơn vị) $\mathcal{R}$, và một tập công đoạn $\mathcal{O}$. Mỗi công việc $j$ gồm một chuỗi $n_j$ công đoạn liên tiếp trong $\mathcal{O}$ (với $\sum_{j=1}^{n} n_j = |\mathcal{O}|$), và mỗi công đoạn $i$ có thể được xử lý trên một tập con máy khả thi (compatible/eligible machines) $\mathcal{R}_i \subseteq \mathcal{R}$. Thời gian xử lý công đoạn $i$ trên máy $k$ là $p_i^k$. Theo trình tự công nghệ của các công việc — gọi là **routing** — mỗi công đoạn $i$ (trong thiết lập cơ bản của FJSP) có đúng một tiền nhiệm trực tiếp $pr(i)$ và một hậu nhiệm trực tiếp $fr(i)$.

Bốn giả định chuẩn:
1. Mọi máy đều sẵn sàng tại thời điểm 0.
2. Mọi công việc đều sẵn sàng tại thời điểm 0.
3. Không cho phép gián đoạn (preemption) — mỗi công đoạn phải hoàn thành liên tục khi đã bắt đầu.
4. Máy không thể xử lý nhiều hơn một công việc tại một thời điểm.

Một **lời giải** $\Pi = (a, \pi)$ gồm một phép **phân công** $a$ (chỉ ra máy nào xử lý công đoạn nào) và một **trình tự** $\pi$ trên mỗi máy, tối ưu hoá một hàm mục tiêu cho trước. Tiêu chí cổ điển và được nghiên cứu nhiều nhất là **makespan** $C_{max}$ — thời gian cần thiết để hoàn thành tất cả công việc.

Mô hình MILP (biến quyết định: $t_i$ = thời điểm bắt đầu công đoạn $i$; $C_{max}$; biến nhị phân $\alpha_i^k$ = 1 nếu công đoạn $i$ được gán cho máy $k$; $\beta_{ii'}$ = 1 nếu công đoạn $i$ được trình tự trước $i'$):

$$\min C_{max} \tag{1}$$
$$\sum_{k \in \mathcal{R}_i} \alpha_i^k = 1 \quad \forall i \in \mathcal{O} \tag{2}$$
$$t_i \ge t_{pr(i)} + \sum_{k \in \mathcal{R}_{pr(i)}} p_{pr(i)}^k \alpha_{pr(i)}^k \quad \forall i \in \mathcal{O} \tag{3}$$
$$t_i \ge t_{i'} + p_{i'}^k - (2 - \alpha_i^k - \alpha_{i'}^k + \beta_{ii'})H, \; \forall (i,i') \in \mathcal{O}\times\mathcal{O}, i \ne i', k \in \mathcal{R}_i \cap \mathcal{R}_{i'} \tag{4}$$
$$t_{i'} \ge t_i + p_i^k - (3 - \alpha_i^k - \alpha_{i'}^k - \beta_{ii'})H, \; \forall (i,i') \in \mathcal{O}\times\mathcal{O}, i \ne i', k \in \mathcal{R}_i \cap \mathcal{R}_{i'} \tag{5}$$
$$C_{max} \ge t_i + \sum_{k \in \mathcal{R}_i} p_i^k \alpha_i^k \quad \forall i \in \mathcal{O} \tag{6}$$
$$\alpha_i^k \in \{0,1\} \quad \forall i \in \mathcal{O}, k \in \mathcal{R}_i \tag{7}$$
$$\beta_{ii'} \in \{0,1\} \quad \forall (i,i') \in \mathcal{O}\times\mathcal{O} \tag{8}$$

Ràng buộc (2) đảm bảo mỗi công đoạn được gán cho đúng một máy khả thi. Ràng buộc (3) định nghĩa quan hệ tiền-hậu giữa các công đoạn liên tiếp của cùng một công việc. Ràng buộc (4)-(5) ngăn hai công đoạn chồng lấn trên cùng một máy $k$ (với $H$ là một hằng số đủ lớn — big-M), chỉ có hiệu lực khi $i, i'$ cùng được gán cho máy $k$. Ràng buộc (6) xác định makespan.

### 2.2. Mô hình hoá bằng đồ thị disjunctive

Một cách tiếp cận phổ biến khác để mô hình hoá FJSP là **đồ thị disjunctive (disjunctive graph)** $G = (\mathcal{N}, \mathcal{A}, \mathcal{E})$. Tập nút $\mathcal{N}$ gồm hai nút giả (fictitious) $0$ và $*$ cùng các nút ứng với từng công đoạn. Mỗi công việc $j$ tương ứng một tập con nút $\mathcal{N}_j$. Mỗi quan hệ tiền-hậu là một **cung liên hợp (conjunctive arc)** trong $\mathcal{A}$ (nút đầu và nút cuối của mỗi công việc nối với $0$ và $*$). Các cặp công đoạn có thể xử lý trên cùng máy $k$ được nối bằng **cung disjunctive** trong $\mathcal{E}$ — mỗi cung disjunctive giữa hai nút có thể biểu diễn dưới dạng một cung đơn hướng cả hai chiều, hoặc một cặp cung liên hợp $(i,\nu)$ và $(\nu,i)$.

Giải FJSP tương đương với việc: (i) thay mỗi cung disjunctive bằng một cung liên hợp cho các công đoạn được gán cùng máy, xoá các cung disjunctive còn lại; (ii) đảm bảo đồ thị liên hợp thu được là **phi chu trình** (acyclic) — điều kiện tương đương với lời giải khả thi.

Các khái niệm quan trọng: **đường đi (path)** từ nút $i$ đến $\nu$; **độ dài (length)** $L(i,\nu)$ là tổng trọng số các cung trên đường đi; **trọng số (weight)** $l_{iu}$ của cung $(i,u)$ (với FJSP cổ điển, bằng thời gian xử lý của nút nguồn); **đường tới hạn (critical path)** là đường dài nhất từ $0$ đến $*$, độ dài của nó chính là makespan; **công đoạn/cung tới hạn** (critical operations/arcs) là các công đoạn/cung trên đường tới hạn; **khối (block)** là dãy tối đa các công đoạn tới hạn liền kề được xử lý trên cùng một máy (Nowicki & Smutnicki, 1996); công đoạn được gọi là **nội bộ (internal)** nếu nó không phải công đoạn đầu hay cuối của một khối.

Với mỗi công đoạn $i$, ký hiệu $h_i$ (head) là độ dài đường dài nhất từ $0$ đến $i$, và $q_i$ (tail) là thời gian cần để "giao" các hậu nhiệm của $i$ đến $*$:

$$h_i = \max_{u \in \mathcal{P}(i)} \{h_u + p_u^{a(u)}\} \tag{9}$$
$$q_i = \max_{\nu \in \mathcal{F}(i)} \{p_\nu^{a(\nu)} + q_\nu\} \tag{10}$$

Makespan: $C_{max} = \max_{i \in \mathcal{O}} \{h_i + p_i^{a(i)} + q_i\}$. Một công đoạn tới hạn thoả điều kiện: $h_i + p_i^{a(i)} + q_i = C_{max}$ (11).

### 2.3. Ký hiệu mở rộng — ký hiệu ba trường $\alpha|\beta|\gamma$

Để phân loại hình thức các cấu hình bài toán khác nhau, bài báo dùng ký hiệu ba trường $\alpha|\beta|\gamma$ theo Graham et al. (1979). Bảng 1 (rút gọn) liệt kê các ký hiệu chính:

**Trường $\alpha$ (loại bài toán / máy):**
| Ký hiệu | Ý nghĩa | Mục liên quan |
|---|---|---|
| $FJ\square$ | Có thể chọn máy trong một tập cho trước | Mục 2 |
| $FS\square$ | Trình tự linh hoạt (flexible sequencing) | Mục 6.1 |
| $FP\square$ | Lập kế hoạch quy trình linh hoạt (flexible process planning) | Mục 6.1 |
| $D\square$ | Phân tán (distributed) | Mục 6.1 |
| $MR\square$ | Đa tài nguyên (multi-resource) | Mục 6.2 |
| $MM\square$ | Đa chế độ (multi-mode) | Mục 6.2 |

**Trường $\beta$ (ràng buộc):** $r_j$ (ngày giải phóng), $d_{ii'}^{kk'}$ (time lag min/max), $nwt$ (no-wait), $h_{kl}^f$ / $h_{kl}^m$ (không sẵn sàng cố định/linh hoạt), $rs$ (resumable), $p-batch$ (batch song song, compatible/incompatible), $s$ (setup time), $b$ (bộ đệm hữu hạn), $block$ (blocking), $overlap$ (chồng lấn), $rcrc$ (reentrant flow), $bom$ (bill of materials).

**Trường $\gamma$ (tiêu chí):** $reg$ (bất kỳ tiêu chí regular nào), $C_{max}$ (makespan), $TWF$ (tổng thời gian luồng có trọng số), $L_{max}$ (lateness lớn nhất), $T_{max}$ (tardiness lớn nhất), $TWT$ (tổng tardiness có trọng số), $WNTJ$ (số công việc trễ có trọng số), $nonreg$ (tiêu chí phi regular bất kỳ), $W_T$ (workload tổng), $W_M$ (workload lớn nhất), $E/T$ (earliness/tardiness), $JIT$ (just-in-time), $QR$/$SR$ (quality/schedule robustness), $EC$ (chi phí năng lượng), $CF$ (dấu chân carbon).

Ba trường tương ứng ba loại quyết định trong FJSP: phân công máy (machine assignment), trình tự công đoạn (operation sequencing), và định thời (operation timing) — trường $\alpha$ mở rộng chủ yếu liên quan quyết định mới về phân công.

---

## 3. Tối thiểu hoá makespan

Đây là tiêu chí được nghiên cứu nhiều nhất suốt hàng thập kỷ. Nghiên cứu sớm: Brucker & Schlie (1990) đưa ra bài toán multi-purpose machine job shop, giải tối ưu hệ hai công việc; Jurisch (1995) đề xuất cận dưới dựa trên relaxation hai công việc; các công trình khác gồm Barnes & Chambers (1996), Brandimarte (1993), Hurink et al. (1994), Dauzère-Pérès & Paulli (1997) — tabu search là cách tiếp cận chiếm ưu thế, và nhiều bộ benchmark được thiết lập.

### 3.1. Bộ dữ liệu benchmark

Các bộ instance benchmark phổ biến: **BRdata** (Brandimarte, 1993), **HUdata** (Hurink et al., 1994), **BCdata** (Barnes & Chambers, 1996), **DPdata** (Dauzère-Pérès & Paulli, 1997), **DMUdata** (Demirkol et al., 1998), **KCdata** (Kacem et al., 2002a), **Fdata** (Fattahi et al., 2007), **DAdata** (Birgin et al., 2015), **Ydata** (Birgin et al., 2015) — tổng cộng 467 instance với kích thước và mức độ linh hoạt khác nhau. Một số có sẵn tại trang web của Monaldo Mastrolilli và Oleg Shylo.

Bảng 2 (rút gọn — thông tin chi tiết các bộ benchmark):
| Bộ | Kích thước | Số máy $m$ | Số công đoạn $n_j$ | Thời gian xử lý | Linh hoạt |
|---|---|---|---|---|---|
| BRdata | 21 | [10,15] | [10,15] | [5,100] | [1.07,1.3] |
| HUdata/sdata* | 66 | [4,15] | [4,15] | [10,100] | {1} |
| HUdata/edata | 66 | [4,15] | [4,15] | [10,100] | [1,1.15] |
| HUdata/rdata | 66 | [4,15] | [4,15] | [10,100] | [1,2] |
| HUdata/vdata | 66 | [4,15] | [4,15] | [10,100] | [1,7.5] |
| BCdata | 10 | {10,15,20} | [4,15] | [5,15] | [1,20] |
| DPdata | 18 | {10,15,20} | [5,8,10] | [15,25] | [1.13,5.02] |
| DMUdata* | 80 | [20,50] | [15,20] | [12,56] | [1.0,2.1] |
| KCdata | 4 | [4,15] | [5,10] | [5,20] | [1.21,3.5] |
| Fdata | 20 | [2,12] | [2,4] | [8,30] | [1.2,3.67] |
| DAdata† | 30 | [4,12] | [5,10] | [26,127] | [1.2,3.67] |
| Ydata† | 20 | [4,17] | [7,26] | [4,38] | [1.3,2.25] |

(*) mỗi công đoạn chỉ có đúng một máy ứng viên. (†) instance có linh hoạt trình tự — thứ tự tiền-hậu là một đồ thị phi chu trình có hướng bất kỳ.

### 3.2. Các bài báo dùng phần lớn bộ benchmark

Xu hướng đầu tiên: kiểm thử phương pháp trên nhiều bộ benchmark, cải thiện các cận trên tốt nhất đã biết. Cách tiếp cận tích hợp của Dauzère-Pérès & Paulli (1997), Mastrolilli & Gambardella (2000) giới thiệu Tabu Search với hai hàm neighborhood, thử nghiệm mở rộng trên BRdata, BCdata, DPdata và HUdata. Genetic Algorithm (GA) của Pezzella et al. (2008). Metaheuristic song song hai tầng của Bozejko et al. (2010) dùng GPU. Biến thể climbing discrepancy search của Hmida et al. (2010). GA của Zhang et al. (2011). Differential evolution lai với local search của Yuan & Xu (2013a) — đạt kết quả tốt nhất mới trên một số bộ. Scatter search của González et al. (2015). GA lai TS và heuristic seeding của Palacios et al. (2015). Lai GA+TS của Li & Gao (2016). Multi-start multi-level evolutionary local search của Kemmoé-Tchomté et al. (2017). Jaya algorithm của Caldeira & Gnanavelbabu (2019). Two-individual-based evolutionary algorithm (MAE) tích hợp TS của Ding et al. (2019) — kết quả tốt nhất mới cho 10 instance khó.

### 3.3. Các bài báo dùng bộ benchmark chọn lọc nhỏ

Artificial Bee Colony (ABC) của Wang et al. (2012b); Bi-population EDA (BEDA) của Wang et al. (2012a); Grey Wolf Optimization của Jiang & Zhang (2018); Self-learning genetic algorithm (SLGA) của Chen et al. (2020); PSO của Ding & Gu (2020); thuật toán lượng tử cho FJSP song song của Denkena et al. (2021); knowledge-based cuckoo search của Cao et al. (2021); lai GA+PSO của Liu et al. (2021); Jaya với local search của Caldeira & Gnanavelbabu (2021).

---

## 4. Các tiêu chí thay thế

### 4.1. Tiêu chí regular

Để giải FJSP, các công đoạn cần được trình tự trên máy sau khi đã phân công. Chọn trình tự chỉ cho biết thứ tự xử lý — quá trình xác định thời điểm bắt đầu/kết thúc tối ưu từ một trình tự gọi là **timetabling** hay **timing**. Một tiêu chí gọi là **regular (chuẩn tắc)** nếu nó là hàm không giảm theo thời điểm hoàn thành $C_1, ..., C_n$ của các công việc. Khi tối ưu một tiêu chí regular, luôn tồn tại lời giải tối ưu là **lịch bán chủ động (semi-active schedule)** — không công đoạn nào có thể bắt đầu sớm hơn mà không vi phạm ràng buộc trình tự đã cố định. Bài toán timing khi đó có thể quy về bài toán đường dài nhất (longest path).

Các tiêu chí regular phổ biến: **TWF** (tổng thời gian luồng có trọng số, $\sum w_j(C_j - r_j)$), độ trễ **lateness** $L_j$, **tardiness** $T_j$, số công việc trễ có trọng số $U_j$; **maximum lateness** $L_{max}$ (Sourirajan & Uzsoy, 2007; Vilcot & Billaut, 2008); **maximum tardiness** $T_{max}$ (Doh et al., 2013; Loukil et al., 2007); **total weighted tardiness (TWT)**; **weighted number of tardy jobs (WNTJ)**.

Ngoài các tiêu chí dựa trên hoàn thành công việc, một số nghiên cứu quan tâm đến hoàn thành **công đoạn** (Gomes et al., 2005, 2013) — quan trọng khi máy linh hoạt như trong FJSP, chẳng hạn tối thiểu hàng chờ công đoạn trước máy trong môi trường make-to-order với recirculation.

### 4.2. Tiêu chí phi regular (non-regular)

Ngày càng nhiều nghiên cứu tối ưu tiêu chí **phi regular** — khi đó lịch tối ưu có thể không phải semi-active, cần xử lý tường minh cả quyết định định thời.

**Tiêu chí dựa trên workload:** phổ biến nhất sau makespan (Chaudhry & Khan, 2016; Türkyılmaz et al., 2020). $W_T$ (tổng workload trên mọi máy), $W_M$ (workload lớn nhất của một máy) — chỉ có ý nghĩa khi các máy không đồng nhất (thời gian xử lý khác nhau tuỳ máy). Ngoài min-max, các thước đo "công bằng" khác như phương sai thời gian xử lý so với trung bình được xét trong Bezoui et al. (2023).

**JIT (just-in-time) và earliness/tardiness (E/T):** hiếm được nghiên cứu trong FJSP hơn các bài toán lập lịch khác. Gao et al. (2014), Gao et al. (2015) tối ưu tiêu chí dựa trên workload kèm chèn công việc mới. Zambrano Rey et al. (2014, 2015) tối thiểu earliness/tardiness bậc hai để tránh sai lệch lớn so với ngày đến hạn chung $d$. Huang et al. (2013) xét khung thời gian $[d_j^l, d_j^r]$. Sun et al. (2021) bổ sung setup phụ thuộc trình tự và ràng buộc vận chuyển. Mohammadi et al. (2020) đề xuất MILP đa mục tiêu tích hợp lập lịch xưởng linh hoạt và định tuyến xe giao hàng.

**Lập lịch động (dynamic scheduling):** khi có sự kiện thời gian thực (máy hỏng, công việc gấp...). Ba nhóm cách tiếp cận: reactive hoàn toàn, predictive-reactive, robust pro-active (Aytug et al., 2005). Robustness và stability của lịch cũng cần được xem xét. Fattahi & Fallahi (2010), Shen & Yao (2015) xét độ ổn định lịch khi tái lập lịch (rescheduling).

**Robustness:** Al-Hinai & Elmekkawy (2011), Ahmadi et al. (2016) xét hỏng máy khi xác định lịch dự đoán, tối ưu đồng thời makespan và độ ổn định. Xiong et al. (2013) dùng surrogate robustness measure (operation slack, machine workload) cho FJSP với hỏng máy ngẫu nhiên. $QR$ (quality robustness) và $SR$ (schedule robustness/stability) là hai loại tiêu chí robustness chính.

**Năng lượng và dấu chân carbon:** biến đổi khí hậu thúc đẩy giảm tiêu thụ năng lượng và carbon footprint ($\gamma \in \{EC, CF\}$). Các biện pháp: giảm thời gian nhàn rỗi máy, điều chỉnh tốc độ máy, sản xuất trong giờ thấp điểm. Wu & Sun (2018) tối thiểu số lần bật/tắt máy. Park & Ham (2022) tối thiểu chi phí năng lượng theo biểu giá điện. Mokhtari & Hasani (2017) tối thiểu chi phí năng lượng + bảo trì. Pirooznfard et al. (2018) tối thiểu carbon footprint phát thải trong thời gian bận và nhàn rỗi.

### 4.3. Đa tiêu chí

Nhiều bài toán lập lịch thực tế có bản chất đa mục tiêu. Tổng quan chung: T'kindt & Billaut (2006); tổng quan riêng cho FJSP đa mục tiêu: Chaudhry & Khan (2016), Türkyılmaz et al. (2020). Cách tiếp cận **weighted sum** đơn giản nhất (Xia & Wu, 2005 — makespan + workload tổng + workload lớn nhất). Thứ tự **lexicographic**: Gao et al. (2008); Bissoli et al. (2021) với clustering search; Park & Ham (2022, makespan + chi phí năng lượng); Tamssaouet et al. (2022, mô hình ưu tiên lai lexicographic + Tchebychev). Goal programming, satisfaction criterion: Zhang & Yang (2016). Đa phương pháp ra quyết định: weighted sum, goal programming, LP-metric, max-min trong Ceylan et al. (2021).

**Pareto dominance** dùng trực tiếp trong các thuật toán tiến hoá đa mục tiêu (NSGA-II, NRGA) — ví dụ Ahmadi et al. (2016, makespan + stability). Soto et al. (2020) đề xuất Branch & Bound song song cho makespan + workload tổng + workload lớn nhất, tìm được Pareto front tối ưu cho 12 instance Fdata và 1 instance KCdata. Türkyılmaz et al. (2022) dùng Pareto ranking + hypervolume contribution cho makespan + tardiness tổng.

---

## 5. Các ràng buộc mở rộng

### 5.1. Ràng buộc time lag

Nhiều tình huống thực tế yêu cầu thời gian chờ giữa hai công đoạn của một công việc bị chặn dưới hoặc trên. Trường hợp cực đoan là **no-wait** ($\beta = nwt$) — không cho phép thời gian chờ, ví dụ xử lý thuỷ tinh nóng chảy (Alvarez-Valdes et al., 2005). Nhiều trường hợp khác giới hạn thời gian chờ tối đa, ví dụ ngăn nhiễm bẩn sản phẩm trong sản xuất bán dẫn (Mönch et al., 2011). **Time lag** tối thiểu/tối đa ($d_{ii'}^{kk'}$) tổng quát hoá các trường hợp trên.

Mô hình MILP mở rộng thêm ràng buộc (12): $t_i + d_{ii'}^{kk'} \le t_{i'} + (2 - \alpha_i^k - \alpha_{i'}^{k'})H, \forall \lambda = (i,k,i',k',d_{ii'}^{kk'}) \in \mathcal{L}$.

- Time lag tối thiểu ($d_{ii'}^{kk'} \ge 0$) chỉ gây trễ, không làm bài toán khó hơn nhiều.
- Time lag tối đa ($d_{ii'}^{kk'} < 0$) làm bài toán khó hơn đáng kể — Mascis & Pacciarelli (2002) chỉ ra rằng ngay cả tìm một lời giải khả thi (không nói đến tối ưu) trong JSP không-wait với time lag tối đa cũng là NP-đầy đủ.

Ứng dụng thực tế: Raaymakers & Hoogeveen (2000) — ngành dược phẩm với ràng buộc no-wait; Alvarez-Valdes et al. (2005) — nhà máy thuỷ tinh; Yugma et al. (2012), Wu et al. (2022), Tamssaouet et al. (2022) — sản xuất bán dẫn; Boyer et al. (2021) — sản xuất vòng lăn liền mạch (seamless rolled ring).

### 5.2. Ràng buộc sẵn sàng (availability)

Máy không luôn sẵn sàng liên tục do hỏng hóc, vấn đề chất lượng hoặc bảo trì phòng ngừa. Hai trường hợp: **cố định** ($\beta = h_{kl}^f$, thời điểm bảo trì xác định trước) và **linh hoạt** ($\beta = h_{kl}^m$, thời điểm bảo trì là biến quyết định trong một cửa sổ thời gian). Một cách mô hình hoá là coi mỗi khoảng không sẵn sàng như một công việc có một công đoạn cần xử lý trên một tập máy khả thi $\{k\}$.

Heuristic cho ràng buộc linh hoạt: Gao et al. (2006), Rajkumar et al. (2010, đa mục tiêu). Thörnblad (2015) đề xuất MILP theo chỉ số thời gian (time-indexed). Nhiều nghiên cứu giả định công đoạn có thể bị gián đoạn bởi bảo trì và **resumable** ($\beta = rs$) — tiếp tục sau khi gián đoạn: Alvarez-Valdes et al. (2005); Lunardi et al. (2020, 2021).

### 5.3. Ràng buộc batching (theo lô)

Trong lập lịch xưởng cổ điển, mỗi máy chỉ xử lý một công việc tại một thời điểm. Tuy nhiên có tình huống thực tế cần xử lý theo **lô (batch)** — nhóm công việc được xử lý cùng nhau. Hai loại: **p-batching** (song song — máy xử lý nhiều hơn một công việc cùng lúc, thời gian xử lý lô = max thời gian xử lý các công việc trong lô) và **s-batching** (tuần tự — setup phụ thuộc trình tự chỉ xảy ra khi bắt đầu một lô mới).

Hai trường hợp chính trong batching (p-batching): **compatible** ($\beta = p-batch, compatible$, mọi job có thể ghép lô miễn không vượt kích thước lô tối đa $b_m$ của máy $m$) và **incompatible** ($\beta = p-batch, incompatible$, chỉ job cùng họ $f$ mới ghép lô). Ứng dụng chủ yếu: sản xuất bán dẫn (burn-in, diffusion).

Cách tiếp cận: heuristic dựa trên biến thể của Shifting Bottleneck (SB) của Adams et al. (1988). Mason et al. (2002, 2005) trình bày SB điều chỉnh, cho thấy hiệu quả hơn dispatching rule thông thường. Mönch & Drießel (2005) — phân rã phân cấp hai tầng. Sourirajan & Uzsoy (2007) — biến thể SB. Mönch et al. (2007) — nghiên cứu tác động của thủ tục giải bài toán con tốt hơn. Yugma et al. (2012) — MILP đa mục tiêu với các nút batching trong đồ thị disjunctive. Knopp et al. (2017) — mở rộng "batch-oblivious" mã hoá batching trong trọng số cung mà không cần nút chuyên dụng. Wu et al. (2022) — giới thiệu tính chất giúp thu hẹp không gian nghiệm mà không cần đồ thị disjunctive.

### 5.4. Ràng buộc setup time

Extensive survey: Allahverdi (2015). Setup phụ thuộc trình tự (SDST, $s_{ii'}^k$) là loại được nghiên cứu nhiều nhất trong FJSP. Mousakhani (2013) — mô hình toán học + iterated local search cho TWT. Abdelmaguid (2015) — SDST đối xứng, mở rộng neighborhood của Mastrolilli & Gambardella (2000). Shen et al. (2018) — mô hình toán + tabu search cho makespan.

SDST cũng xét trong bối cảnh động: Zhang & Wang (2018, Constraint Programming + MIP). Đa mục tiêu: Deliktaş et al. (2019) — makespan + tardiness tổng; Li et al. (2019) — thuật toán lai non-dominated sorting; Li et al. (2020) — Jaya + simulated annealing với SDST và transportation time.

Rossi & Dini (2007) phân biệt setup tách rời **anticipatory (detached)** và **non-anticipatory (attached)**. ACO cho SDST, transportation time trong Rossi & Dini (2007), Rossi (2014). Đối với đồ thị disjunctive, trọng số cung được tăng thêm SDST tương ứng.

### 5.5. Ràng buộc blocking

Hầu hết bài toán lập lịch xưởng giả định bộ đệm đủ lớn để chứa công việc chờ. Trường hợp cực đoan là **không bộ đệm** — công việc bị **blocked** (kẹt) trên máy hiện tại cho đến khi máy tiếp theo sẵn sàng. Ví dụ điển hình: lập lịch đường sắt. Mô hình MILP với ràng buộc (15)-(16) thay thế ràng buộc (4)-(5); đồ thị disjunctive được điều chỉnh thành **alternative graph** (Mascís & Pacciarelli, 2002).

Ứng dụng: Gomes et al. (2005) — sản xuất linh kiện rời rạc với bộ đệm trung gian giới hạn + recirculation; Pham & Klinkert (2008) — lập lịch phẫu thuật đa chế độ; Mati & Xie (2011) — xưởng sản xuất máy bay không bộ đệm giữa các máy.

Nhiều heuristic hiện đại kết hợp blocking với AGV (Automated Guided Vehicles): Poppenborg et al. (2012). Kỹ thuật **JIFR (Job Insertion based Feasibility Recovery)** dựa trên Gröflin & Klinkert (2006) chuyển lời giải bất khả thi thành khả thi — dùng trong Gröflin et al. (2011) cho blocking + transfer/setup time.

### 5.6. Ràng buộc vận chuyển (transportation)

Hai trường hợp: (i) **thời gian vận chuyển** (transportation times) — chỉ mô hình thời gian di chuyển giữa các máy, tài nguyên vận chuyển giả định không nghẽn cổ chai (Rossi, 2014; Rossi & Dini, 2007; Karimi et al., 2017); (ii) **tài nguyên vận chuyển** (transportation resources) — tài nguyên vận chuyển được mô hình tường minh và cần lập lịch (Deroussi & Norre, 2010; Kumar et al., 2011). Trường hợp (ii) phức tạp hơn vì phải mô hình cả di chuyển "xe rỗng" đến điểm đón job, và chi phí tái phân công công đoạn kéo theo thay đổi thời gian di chuyển tài nguyên vận chuyển.

Zhang et al. (2012a) — metaheuristic cho bài toán này. Zhang et al. (2014) — mở rộng mô hình bộ đệm vào/ra máy có sức chứa hạn chế. Deroussi (2014), Nouri et al. (2016) — metaheuristic. Ham (2020) — Constraint Programming. Fontes et al. (2019), Homayouni & Fontes (2021) — MILP + late-acceptance hill-climbing.

### 5.7. Các ràng buộc khác

**Overlapping operations (chồng lấn công đoạn):** trong một số bối cảnh thực tế, công đoạn có thể bắt đầu trước khi tiền nhiệm của nó hoàn tất — dược phẩm (Raaymakers & Hoogeveen, 2000), thuỷ tinh (Alvarez-Valdes et al., 2005), in ấn (Lunardi et al., 2020). Khái niệm **transfer batch** (kích thước lô cần chuyển giữa máy) trong Ivens & Lambrecht (1996), Schutten (1998).

**Reentrant flows (luồng tái nhập):** máy hoặc nhóm máy được sử dụng nhiều hơn một lần bởi cùng một công việc — điển hình trong sản xuất bán dẫn (Mönch et al., 2011). Vì máy linh hoạt trong FJSP, cùng một máy có thể được gán cho hai hoặc nhiều công đoạn của một công việc, nên reentrant flows thực chất đã có thể xảy ra trong nhiều benchmark instance. Ứng dụng: Mason et al. (2002), Sourirajan & Uzsoy (2007), Knopp et al. (2017); Thörnblad et al. (2015, linh kiện hàng không); Mati et al. (2011, linh kiện máy bay); Gomes et al. (2013, ngành đúc khuôn — $\beta = bom$, Bills of Materials).

---

## 6. Các đặc điểm bổ sung

### 6.1. Tuyến (route) phức tạp

FJSP giả định tuyến của một công việc là **tuần tự**. Trong thực tế điều này không phải luôn đúng — một công đoạn có thể có nhiều hơn một tiền nhiệm hoặc hậu nhiệm. Mở rộng dùng đồ thị phi chu trình có hướng bất kỳ (**non-linear routes**) — thuật ngữ dùng thống nhất trong bài báo, dù văn献 gọi bằng nhiều tên: assembly/split structures (Ivens & Lambrecht, 1996), non-linear routes (Dauzère-Pérès et al., 1998), convergent/divergent job routings (Schutten, 1998), sequencing flexibility (Birgin et al., 2015), arbitrary precedence constraints (Lunardi et al., 2020; Kasapidis et al., 2021).

Hai trường hợp chính: (i) các công đoạn có thể xử lý **song song** — thường ứng với công đoạn tháo rời/lắp ráp (Loukil et al., 2007; Vilcot & Billaut, 2008; Gomes et al., 2013 — sản phẩm đồng thau, khuôn đúc, in ấn); (ii) tuyến có **nhiều tiền nhiệm/hậu nhiệm bất kỳ** (Birgin et al., 2015; Dauzère-Pérès et al., 1998; Lunardi et al., 2021; Sobeyko & Mönch, 2016; Kasapidis et al., 2021) — extension này gọi là $\beta = bom$ (Bills of Materials), vì không liên quan các quyết định khác của FJSP cơ bản.

Ba loại linh hoạt sản xuất theo Benjaafar & Ramakrishnan (1996): **operation flexibility** (như FJSP gốc), **sequencing flexibility** ($\alpha = FS\square$, khả năng hoán đổi thứ tự công đoạn khi có trình tự thay thế khả thi trong một tuyến — Birgin et al. (2015)), **processing flexibility** ($\alpha = FP\square$, sự sẵn có của tuyến thay thế cho mỗi công việc — Özgüven et al. (2010), Özgüven et al. (2012, có SDST)). Doh et al. (2013) xét đến vấn đề khi công việc và thời gian xử lý không xác định.

**Distributed FJSP** ($\alpha = DFJ$): mỗi job có thể được phân công cho một đơn vị sản xuất trong một mạng lưới các đơn vị, mỗi đơn vị được mô hình như một bài toán lập lịch xưởng có thể mô hình bằng FJSP — Chan et al. (2006b); De Giovanni & Pezzella (2010); Meng et al. (2020).

Mở rộng tổng quát nhất kết hợp cả ba loại linh hoạt: $\alpha = FPFSFJ$. Tuyến công việc được mô hình bằng đồ thị And/Or (**And/Or graph**) — cho phép mỗi công đoạn có nhiều tiền/hậu nhiệm và được thoả mãn thông qua một tập con các chuỗi công đoạn song song (được chọn qua Or-subgraph). Kis (2003) là công trình tiên phong duy nhất đến nay giải bài toán này với mode và tài nguyên cố định. Dauzère-Pérès & Pavageau (2003) mở rộng công trình của Dauzère-Pérès et al. (1998) để xử lý hạn chế của $\alpha = FMRJ$. Lee et al. (2012), Zhang et al. (2020) dùng And/Or graph nhưng chỉ mỗi công đoạn cần đúng một máy, không xét linh hoạt trình tự.

### 6.2. Đa tài nguyên (multiple resources)

Hầu hết tài liệu chỉ giả định một tài nguyên (máy) mỗi công đoạn. Tuy nhiên có bối cảnh nhiều tài nguyên chính hoặc phụ trợ (ví dụ máy + người vận hành, hai người vận hành có kỹ năng khác nhau, hoặc dụng cụ, đồ gá) cần thiết đồng thời — tài nguyên khan hiếm phải được chọn để có lịch khả thi và hiệu quả. Ký hiệu $\alpha = FMRJ$ (từ Dauzère-Pérès et al., 1998) mở rộng cho phép cần nhiều tài nguyên, mỗi tài nguyên cần thiết được chọn từ một tập tài nguyên có thể; hai tập tài nguyên có thể không cần rời nhau, nhưng cùng tài nguyên không thể gán quá một lần cho một công đoạn.

$\alpha = MMJ$ (**multi-mode**, tổng quát hoá $\alpha = FMRJ$) — mỗi công đoạn có một tập **mode**, mỗi mode là một tổ hợp tài nguyên khả thi (không phải mọi tổ hợp đều được phép). Sự khác biệt giữa $FMRJ$ và $MMJ$ quan trọng cả về ứng dụng lẫn phương pháp — $MMJ$ cần nhiều dữ liệu hơn khi tập tài nguyên khả dĩ lớn (một mode cho mỗi tổ hợp cần thiết), nhưng dễ chuyển kết quả từ FJSP sang $FMRJ$ hơn sang $MMJ$ vì trong $FMRJ$ thay đổi phân công một tài nguyên đơn lẻ khả thi trong khi $MMJ$ cần xét lại toàn bộ tài nguyên cần thiết khi đổi mode (Dauzère-Pérès & Pavageau, 2003).

Brucker & Neyer (1998) — công trình tiên phong đầu tiên giải $\alpha = MMJ$ với makespan. Kis (2003) — phương pháp giải tiên tiến với linh hoạt trình tự + quy trình. Dauzère-Pérès & Pavageau (2003) mở rộng Dauzère-Pérès et al. (1998) — cho phép tài nguyên cần thiết đã gán có thể hoàn thành công đoạn trước khi tài nguyên cần thiết khác được gán. Pham & Klinkert (2008) — lập lịch phẫu thuật ($\alpha = MMJ$ với blocking, availability, setup time). Mati et al. (2011). Prot & Bellenguez-Morineau (2012) — sản xuất kim loại ($\alpha = MMJ$ với SDST + assembly).

Trường hợp đặc biệt — mỗi công đoạn cần **tối đa hai tài nguyên** — gọi là bài toán lập lịch ràng buộc bởi hai tài nguyên (**dual-resource constrained scheduling**): Lei & Guo (2014, $\alpha = MMJ$); Andrade-Pineda et al. (2020, ngành sửa chữa va chạm ô tô, $\alpha = FMRJ$).

### 6.3. Môi trường bất định (uncertain environments)

Bài toán lập lịch stochastic xét thời gian xử lý bất định hoặc hỏng máy. Dù tài liệu về vấn đề này khá phong phú với máy đơn, máy song song và JSP, nghiên cứu về FJSP ít hơn nhiều. Các nghiên cứu thường dựa trên **mô phỏng** — đặc biệt Monte Carlo — để biểu diễn tính bất định. Mahdavi et al. (2010) — hệ thống hỗ trợ quyết định stochastic dựa trên mô phỏng. Zhang et al. (2012b) — kết hợp Monte Carlo + PSO tối thiểu tardiness kỳ vọng. Doh et al. (2013) — công việc đến và thời gian xử lý/hỏng máy bất định. Mokhtari & Dadgar (2015) — MILP tối thiểu số job trễ kỳ vọng, thoả ràng buộc availability tối thiểu, khung mô phỏng-tối ưu (SA + Monte Carlo). Jamrus et al. (2018) — thời gian xử lý fuzzy, PSO + phân phối Cauchy + toán tử genetic. Flores Gómez et al. (2021) — khái niệm makespan service level (xác suất lịch hoàn thành trước một thời điểm cho trước) — TS + mô phỏng Monte Carlo.

### 6.4. Các đặc điểm khác

**Cyclic scheduling (lập lịch tuần hoàn):** giả định mỗi công đoạn được xử lý vô hạn lần. Tiêu chí acyclic không liên quan; thường tối thiểu chu kỳ (cycle time) hoặc work-in-process. Quinton et al. (2020, exact) và Bozejko et al. (2017, heuristic) tối thiểu chu kỳ cho FJSP tuần hoàn.

**Variable processing times (thời gian xử lý biến đổi):** phần lớn nghiên cứu giả định thời gian xử lý xác định (deterministic). Có nghiên cứu về tính biến đổi của tham số bài toán, đặc biệt hiệu ứng học tập (learning) và lão hoá/xuống cấp (aging/deterioration). Tayebi Araghi et al. (2014) là một trong số ít bài xét hiệu ứng này. Ngoài ra còn có bối cảnh xử lý biến độc lập cần tối ưu (**controllable processing times**) — thường khi tốc độ máy có thể điều khiển để tối thiểu năng lượng tiêu thụ. Lu et al. (2017) mô hình makespan và tiêu thụ tài nguyên tuyến tính theo tỷ lệ nén thời gian xử lý.

Bảng 3 trong bài báo minh hoạ ký hiệu ba trường $\alpha|\beta|\gamma$ cho một số bài báo tiêu biểu đã được điểm qua ở các Mục trên (chọn sao cho mỗi ký hiệu ở Bảng 1 có ít nhất một tham chiếu). Trên một nửa các tham chiếu này giải các bài toán thực tế trong sản xuất theo lô/rời rạc và ngành đường sắt, y tế.

---

## 7. Cách tiếp cận giải

Sự phức tạp gắn với quyết định phân công công đoạn cho máy khiến việc thiết kế cách tiếp cận giải cho FJSP phức tạp hơn đáng kể so với JSP. Ba nhóm chính: **thuật toán chính xác (exact)**, **heuristic**, và **metaheuristic**.

### 7.1. Cách tiếp cận chính xác

**Branch & Bound (B&B):** thuật toán/mô hình chính cho lời giải tối ưu. MILP hữu ích để hình thức hoá bài toán nhưng hiếm khi cho lời giải tối ưu bằng solver chuẩn với instance quy mô công nghiệp, chủ yếu do relaxation tuyến tính rất lỏng của các ràng buộc (4)-(5) (big-M). Ứng dụng B&B trong hệ thống sản xuất linh hoạt (FMS — Berrada & Stecke, 1986; Kim & Yano, 1994; Lloyd et al., 1995). Hansmann et al. (2014) — B&B cho lập lịch bảo trì toa tàu, cạnh tranh với solver thương mại. Soto et al. (2020) — B&B song song đa mục tiêu (makespan, workload lớn nhất, workload tổng), tìm được Pareto front tối ưu cho 12 instance Fdata + 1 instance KCdata.

**Constraint Programming (CP):** ngày càng được chú ý, cho thấy vượt trội hơn MILP với instance quy mô vừa và cho lời giải khả thi với instance lớn trong thực tế. CP thường được đề xuất cho các mở rộng của FJSP: Distributed FJSP (Meng et al., 2020); parallel batching (Ham & Cakici, 2016); non-linear routes (Lunardi et al., 2020; Kasapidis et al., 2021); time lags (Boyer et al., 2021); multiple resources (Kasapidis et al., 2023). Metaheuristic vẫn thường vượt trội CP về chất lượng, sẽ được thảo luận ở Mục 7.3.

### 7.2. Heuristic

**Dispatching rules:** phổ biến trong nghiên cứu sớm (Jeong & Kim, 1998; O'Keefe & Kasirajan, 1992; Shanker & Tzen, 1985). Cách tiếp cận nhiều tiêu chí gần đây: FBSB (filtered-beam-search-based) của Shi-Jin et al. (2008) cho makespan + workload tổng + workload lớn nhất; Wang & Yu (2010) mở rộng FBSB với bảo trì; composite dispatching rules trong Tay & Ho (2008); Calleja & Pastor (2014) — thực tế với transfer batch.

**Heuristic truyền thống** ứng dụng rộng rãi trong FJSP: Alvarez-Valdes et al. (2005), Chang et al. (1989), Mati et al. (2001) — thường tinh vi hơn dispatching rules, tích hợp thành phần chính của metaheuristic. Fattahi et al. (2007) — cách tiếp cận tích hợp + phân cấp với sáu cấu trúc lai. Mejia & Odrey (2005) — heuristic $A^*$ dựa trên Petri net. Huang et al. (2008), Lee & Lee (2010) — cải tiến hiệu quả cho $A^*$. Yuan & Xu (2013b) — harmony search + large neighbourhood search cho FJSP quy mô lớn.

**Shifting Bottleneck cho FJSP:** định nghĩa bottleneck kém rõ ràng hơn JSP do máy linh hoạt. Liu & Kozan (2012) — heuristic SB lai cho FJSP với máy song song, kết hợp Carlier's algorithm + Jackson's rule + TS. Kubiak et al. (2020) — thuật toán hiệu quả với cận worst-case cho trường hợp hai trung tâm/máy.

**Đa mục tiêu:** Gao et al. (2015) — bốn heuristic cho FJSP với chèn công việc mới (makespan, earliness/tardiness trung bình, workload lớn nhất, workload tổng). Pérez & Raupp (2016) — heuristic phân cấp mới thích ứng phương pháp của Newton. Ozturk et al. (2019) — priority rule lai + cellular system cho đa mục tiêu + động.

### 7.3. Metaheuristic

Khi máy rất linh hoạt (công đoạn có thể xử lý trên nhiều máy), tìm lời giải rất tốt hoặc tối ưu dễ hơn. Bộ instance benchmark của Hurink et al. (1994) là ví dụ điển hình — instance $HUdata/vdata$ (linh hoạt cao nhất) dễ giải hơn $HUdata/edata$ và $HUdata/rdata$ (linh hoạt thấp hơn). Với instance khó nhất, metaheuristic là cách tiếp cận phù hợp nhất. Hai đóng góp chính của nghiên cứu metaheuristic: (i) suy ra các tính chất cấu trúc quan trọng để hướng dẫn quá trình tìm kiếm trong vùng nghiệm hứa hẹn; (ii) tích hợp thành phần metaheuristic được mở rộng/cải tiến chuyên biệt cho FJSP.

#### 7.3.1. Metaheuristic dựa trên quỹ đạo (trajectory-based)

Thuật toán làm việc trên một lời giải đơn, chủ yếu tiếp cận local search, tạo thành một quỹ đạo tìm kiếm. **Simulated Annealing (SA)**, **Tabu Search (TS)**, **Variable Neighbourhood Search (VNS)** được ứng dụng rộng rãi. Ban đầu, di chuyển **resequencing** (đổi trình tự trên một máy) và **reassignment** (đổi máy phân công) được tách riêng; sau này chứng minh di chuyển tích hợp không phân biệt hiệu quả hơn nhiều.

Cần lưu ý: các thuộc tính khả thi tổng quát được nhúng vào một số metaheuristic dựa trên quỹ đạo hoặc lai hiệu quả nhất — đảm bảo tính khả thi của lời giải đạt được trong một cấu trúc neighborhood mà không cần thực sự thực hiện di chuyển.

Di chuyển reassignment + resequencing tích hợp lần đầu giới thiệu trong Dauzère-Pérès & Paulli (1997) với **Định lý 1**: di chuyển công đoạn $i$ giữa các công đoạn $u \ne fr(i)$ và $\nu \ne pr(i)$, $(u,\nu) \in \mathcal{E}$, không dẫn đến lời giải bất khả thi nếu (1) $h_u < h_{fr(i)} + p_{fr(i)}^{a(fr(i))}$ và (2) $h_\nu + p_\nu^{a(\nu)} > h_{pr(i)}$.

**Định lý 2** (Shen et al., 2018) ít hạn chế hơn, cho phép nhiều di chuyển khả thi hơn: điều kiện (1) $\max(h_{ps(u)}, h_{fr(u)}) < h_{fr(i)} + p_{fr(i)}^{a(fr(i))}$ và (2) $\min(h_{fs(u)} + p_{fs(u)}^{a(fs(u))}, h_{fr(u)} + p_{fr(u)}^{a(fr(u))}) > h_{pr(i)}$.

Với linh hoạt tuyến (job routing), điều kiện được mở rộng trong Dauzère-Pérès et al. (1998).

Mastrolilli & Gambardella (2000) giới hạn của Dauzère-Pérès & Paulli (1997) thành **k-insertion**, với $k$ là máy mà công đoạn $i$ được resequence hoặc reassign. **Định lý 3** (Mastrolilli & Gambardella, 2000): tập lời giải khả thi thu được bằng cách chèn công đoạn $i$ sau mỗi công đoạn của $\mathcal{R}_k^- \setminus \mathcal{R}_k^+$ và trước mỗi công đoạn của $\mathcal{R}_k^+ \setminus \mathcal{R}_k^-$.

Tamssaouet et al. (2023) đề xuất khung neighborhood tổng quát hoá các kết quả của Dauzère-Pérès & Paulli (1997), Mastrolilli & Gambardella (2000) và Shen et al. (2018), liên quan đến khả thi và chất lượng đánh giá cho bất kỳ tiêu chí regular nào.

Kis (2003) mở rộng cho tuyến phức tạp (Mục 6.1) và đa tài nguyên (Mục 6.2). **Định lý 4**: một tập con $\mathcal{H}$ khả thi khi và chỉ khi (1) $\mathcal{P}(i) \subseteq \mathcal{H}$, (2) $\mathcal{H} \cap \mathcal{F}(i) = \emptyset$, và (3) $u \in \mathcal{H} \Rightarrow \nu \in \mathcal{H}$ với mọi $(u,\nu) \in \mathcal{E} \cup \mathcal{A}$.

Ứng dụng TS sớm với kết quả tốt: Brandimarte (1993), Dauzère-Pérès & Paulli (1997), Hurink et al. (1994); vẫn thành công trong nghiên cứu gần đây (Hajibabaei & Behnamian, 2021; Shen et al., 2018). SA: quy tắc linguistic và ưu tiên (Baykasoglu, 2002); stochastic local search với di chuyển xác suất (Yazdani et al., 2009); tăng tốc kết hợp với lập lịch bộ phận (Cruz-Chávez et al., 2017). VNS: song song (Yazdani et al., 2010), tuần tự phân rã bài toán con (Lei & Guo, 2014), kết hợp SA (Karimi et al., 2012), GRASP (Boyer et al., 2021; Knopp et al., 2017), scatter search (González et al., 2015).

Bozejko et al. (2010) — di chuyển reassignment và t-move (transfer). González et al. (2015) — neighborhood $N^\pi$ và $N^\alpha$. Kemmoé-Tchomté et al. (2017) — neighborhood mở rộng $N_2^\pi$, $N_2^\alpha$ với path relinking.

#### 7.3.2. Metaheuristic dựa trên quần thể (population-based)

Làm việc với một tập lời giải. **Genetic Algorithm (GA)** phổ biến nhất cho FJSP. Các thành phần chính:
- **Encoding/decoding:** biểu diễn hai vector (machine assignment vector + operation sequence vector) phổ biến; Gao et al. (2008) giới thiệu decoding dựa trên ưu tiên; permutation representation (Bierwirth et al., 1996); job-pair encoding (Driss et al., 2015).
- **Selection:** tournament selection (Lei, 2010); roulette wheel (Chan et al., 2006a; Pezzella et al., 2008); linear ranking (De Giovanni & Pezzella, 2010); binary tournament + linear ranking (Wan et al., 2010); elitism (Moon et al., 2008).
- **Crossover:** one-point (OPX — Moon et al., 2008), two-point (TPX — De Giovanni & Pezzella, 2010); Precedence Preserving order-based crossover (PPX — Lei, 2010), Partially Mapped Crossover (PMX — Mati et al., 2011); assignment crossover (ACX — Defersha & Chen, 2010).
- **Mutation:** swap mutation (Zhang & Yang, 2016), random mutation (Mati et al., 2011), assignment mutation (Zhang et al., 2012a).

Ngoài GA: **Particle Swarm Optimization (PSO)** phổ biến thứ hai — chain-based encoding trong Ding & Gu (2020). **Ant Colony Optimization (ACO)** — Rossi & Dini (2007) đầu tiên áp dụng; Huang et al. (2013) — two-pheromone ACO với due window + SDST; Rossi (2014) — pheromone tăng cường với transportation time; Xing et al. (2010) — knowledge-based ACO. **Estimation of Distribution Algorithm (EDA)** — Wang et al. (2012a), bi-population EDA.

#### 7.3.3. Metaheuristic lai (hybrid)

Kết hợp khả năng khai thác cục bộ (intensification) của trajectory-based với đa dạng hoá (diversification) của population-based:

- **GA + trajectory-based:** Gao et al. (2008); hierarchical hybrid GA của Zribi et al. (2007); Liu et al. (2021) — PSO-based mutation + VND-based neighborhood.
- **Metaheuristic biology-inspired khác + trajectory-based:** PSO lai TS hoặc local search cho đa mục tiêu (Zhang et al., 2009); Jamrus et al. (2018) — PSO + phân phối Cauchy + genetic operator; Kato et al. (2018) — PSO + random-restart hill climbing; ABC lai local search (Wang et al., 2013); ACO lai multi-agent negotiation (Zhang & Wong, 2017); ACO động lai dual-ant với local search (El Khoukhi et al., 2017).
- **Lai khác:** scatter search + path-relinking + TS (González et al., 2015); harmony search + local search (Yuan et al., 2013); Jaya lai TS (Fan et al., 2021).

Nhìn chung, ứng dụng (hybrid) metaheuristic cho FJSP rất phong phú.

---

## 8. Kết luận và hướng nghiên cứu tương lai

Bài báo tổng quan các tiêu chí, ràng buộc, cấu hình và cách tiếp cận giải đã nghiên cứu cho FJSP. Một số kết luận chính:

- Mặc dù makespan là tiêu chí được nghiên cứu nhiều nhất, dường như nó **hiếm khi liên quan trực tiếp** trong bối cảnh thực tế. Ngược lại, xem xét **đa tiêu chí** thường là cần thiết.
- Không gian neighborhood cần khám phá thường rất lớn do tính linh hoạt của máy, nên các cách tiếp cận local search hiệu quả dựa vào các thủ tục kiểm tra tính khả thi/đánh giá di chuyển để tránh chi phí tính toán khi kiểm tra toàn bộ di chuyển có thể.
- Một số ràng buộc khó xử lý hơn các ràng buộc khác, đặc biệt là **time lag tối đa** và **ràng buộc blocking** — có thể dẫn đến lời giải bất khả thi.

**Các hướng nghiên cứu tương lai** được đề xuất:

1. **Tiêu chí phi regular:** một góc nhìn thực tế đáng chú ý là xét trường hợp một công đoạn có thể chờ ngay cả khi máy đã sẵn sàng. Trong trường hợp này, một lịch duy nhất tương ứng với một phân công + trình tự cho trước, giúp bài toán dễ hơn — nhưng lịch bán chủ động có thể không tối ưu. Nói chung, cần thiết kế thủ tục heuristic hoặc chính xác để tối ưu quyết định định thời, tận dụng tính chất của tiêu chí phi regular. Có thể tận dụng kết quả từ các bài toán lập lịch khác, ví dụ cách tiếp cận cho JSP trong Bürgy & Bülbül (2018) tối thiểu tổng chi phí lồi tách rời gắn với thời điểm bắt đầu công đoạn và chênh lệch thời điểm bắt đầu giữa các cặp công đoạn bất kỳ. Nhiều tiêu chí phi regular (earliness/tardiness, chi phí lưu kho trung gian) có thể viết dưới dạng này. Cũng có nhiều tài liệu về tiêu chí phi regular trong Resource Constrained Project Scheduling Problem (RCPSP), ví dụ xem Neumann et al. (2003).

2. **FJSP stochastic và động:** vẫn cần nghiên cứu đáng kể để xử lý các sự kiện ngẫu nhiên và động trong lập lịch, đặc biệt liên quan đến FJSP, chẳng hạn (1) thời gian xử lý một công đoạn có thể bất định hơn trên máy này so với máy khác, và (2) tái phân công một công đoạn sang máy khác có thể xảy ra nếu máy hỏng. Hơn nữa, nhiều bối cảnh thực tế mang tính động, theo nghĩa lịch tối ưu được tính lại trên **rolling horizon**, tức được tính toán lại định kỳ để tích hợp công việc mới đến hoặc trạng thái tài nguyên thay đổi.

3. **Xuống cấp máy (machine degradation):** ngày càng quan trọng trong các hệ thống sản xuất hiện đại là xem xét hiệu ứng lão hoá đến hiệu suất máy. Thời gian xử lý một công đoạn trở thành biến phụ thuộc vào quyết định lập lịch. Hơn nữa, một số công đoạn có thể yêu cầu máy được gán không "quá cũ". Do đó, trong FJSP, việc phân công máy trở nên bị ràng buộc nhiều hơn theo thời gian. Việc lập kế hoạch các hoạt động bảo trì cũng có thể cần được lập lịch để khôi phục "sức khoẻ" của máy.

4. **Đa tài nguyên (multiple resources):** mặc dù việc xét nhiều tài nguyên linh hoạt là phổ biến trong nhiều bối cảnh ứng dụng, chưa được nghiên cứu nhiều trong FJSP. Cách tiếp cận đầu tiên trong Dauzère-Pérès et al. (1998) nên được thử thách, chẳng hạn bằng cách xét việc tái phân công một công đoạn cho tất cả tài nguyên cần thiết của nó cùng lúc, như trong Kis (2003), hoặc một số ràng buộc bổ sung khác như tài nguyên không tương thích hoặc không đồng bộ hoá, như trong Dauzère-Pérès & Pavageau (2003). Một ràng buộc thú vị và liên quan khác là khi một trong các tài nguyên phải được gán cho nhiều công đoạn liên tiếp trong tuyến, như trong Knopp et al. (2014). Đây điển hình là trường hợp của tài nguyên vận chuyển, hoặc tổng quát hơn tài nguyên giữ công việc, phải giữ nguyên cho vài công đoạn liên tiếp (ví dụ fixture trong Thörnblad et al., 2015, giường bệnh viện trong Burdett & Kozan, 2018).

5. **Khả năng áp dụng của cách tiếp cận giải:** với độ phức tạp của FJSP và các mở rộng của nó, khó có khả năng các cách tiếp cận đơn giản có thể hoạt động hiệu quả thực tế. Điều thiết yếu là cách tiếp cận đề xuất phải càng gọn nhẹ càng tốt và chỉ tích hợp các thành phần thực sự tạo ra khác biệt. Hiệu quả của quá trình tìm kiếm luôn cần là một tiêu chí quan trọng khi đánh giá một cách tiếp cận giải — vì các cách tiếp cận này là một phần của hệ thống hỗ trợ ra quyết định vận hành, được dùng với tần suất cao, đòi hỏi thời gian tính toán ngắn. Khía cạnh động của hầu hết môi trường công nghiệp cũng đòi hỏi tích hợp việc tái lập lịch vào cách tiếp cận giải. Việc tối ưu các thước đo về độ ổn định/bền vững của lịch và thiết kế thủ tục chèn công việc hiệu quả và chính xác là các ví dụ về hướng nghiên cứu liên quan.

6. **Phân tích cách tiếp cận giải và bộ benchmark liên quan:** từ góc độ khái niệm hơn, sẽ thú vị nếu nghiên cứu các đặc điểm nào làm cho một cách tiếp cận giải hiệu quả. Phân tích có thể mang tính lý thuyết, ví dụ về tính chất của các cấu trúc neighborhood hoặc di chuyển khác nhau, hoặc thực nghiệm bằng cách xây dựng các bộ instance kiểm thử mở rộng các bộ benchmark hiện đã biết. Mục tiêu là định nghĩa tốt hơn các instance khác nhau như thế nào, ví dụ về tính linh hoạt máy, phạm vi thời gian xử lý trên các máy cho mỗi công đoạn, hoặc quan hệ giữa chúng. Về điểm cuối, như trong bài toán lập lịch máy song song, các máy có thể đồng nhất, liên quan hoặc không liên quan — việc mở rộng các định nghĩa này không đơn giản trong FJSP.

7. **Xây dựng cách tiếp cận tổng quát:** phần lớn công trình về FJSP (và lập lịch nói chung) tập trung phát triển cách tiếp cận chuyên biệt cho một bài toán cụ thể, ví dụ FJSP với makespan. Hiếm khi những hiểu biết thu được từ việc nghiên cứu một bài toán cụ thể được dùng để giúp giải các bài toán khác. Ngoại trừ một vài công trình cung cấp cách tiếp cận cho các mở rộng quan trọng và tổng quát của FJSP (Dauzère-Pérès et al., 1998; García-León et al., 2019; Kis, 2003), tài liệu chủ yếu chỉ dựa trên cách tiếp cận "bottom-up" này — điều mà nhóm tác giả tin là sẽ không hỗ trợ tốt cho sự xuất hiện của một hoặc vài cách tiếp cận tổng quát. Nhóm tác giả tin rằng nghiên cứu theo hướng "top-down" hơn, bằng cách cung cấp cách tiếp cận sẵn sàng dùng cho một số mở rộng chung của FJSP, sẽ có lợi cho lĩnh vực lập lịch. Ví dụ, việc thiết kế một cách tiếp cận có thể giải hiệu quả $FSMMJ|block, bom, d_{ii'}^{kk'}|reg$ sẽ là một thành tựu đáng kể. Vì các đặc điểm khó nhất của nhiều bài toán lập lịch máy đã được nghiên cứu trong tài liệu, việc điều chỉnh một cách tiếp cận như vậy cho một bối cảnh cụ thể sẽ dễ dàng hơn so với những gì hiện đang được thực hiện. Thay vì các dispatching rule đơn giản hoặc cách tiếp cận hiệu năng thấp khác, một cách tiếp cận giải cho lớp bài toán tổng quát có thể được dùng làm **benchmark** để đánh giá các cách tiếp cận mới và chuyên biệt cho các bài toán đơn giản hơn.

**Kết luận:** bằng cách cho phép các công đoạn được gán cho nhiều máy, bài toán lập lịch xưởng linh hoạt đã mở ra một hướng nghiên cứu lý thuyết và ứng dụng rất phong phú với nhiều hướng khám phá. Một câu hỏi quan trọng là các hướng nào trong số này là phù hợp nhất. Nhóm tác giả hy vọng bài tổng quan này cung cấp một số hướng đi và chìa khoá để tiếp tục nghiên cứu về FJSP.

---

## Ghi chú của người dịch (liên hệ với đồ án CO5103)

Bài báo này là tài liệu nền tảng quan trọng cho literature review của đồ án, vì:

1. **Định nghĩa và ký hiệu chuẩn** (Mục 2, ký hiệu $\alpha|\beta|\gamma$) có thể dùng trực tiếp để định vị bài toán của đồ án (bánh xe, 2 dây chuyền, 4 công đoạn đúc→CNC→sơn→QC) trong không gian bài toán FJSP: đây là dạng $FJ2|\ldots|C_{max}$ (hoặc mở rộng đa tiêu chí nếu đồ án tối ưu thêm workload/tardiness).
2. **Mục 5 (ràng buộc mở rộng)** — đặc biệt **setup time** (5.4), **blocking** (5.5), **batching** (5.3) — liên quan trực tiếp đến việc mô hình hoá dây chuyền sơn (có thể cần blocking do buồng sơn giới hạn) và công đoạn QC (có thể có batching theo lô kiểm).
3. **Mục 7** (cách tiếp cận giải) xác nhận **CP-SAT (Constraint Programming)** là lựa chọn phù hợp cho instance quy mô vừa như đồ án — bài báo ghi nhận CP "cho thấy vượt trội hơn MILP với instance quy mô vừa" — củng cố lựa chọn OR-Tools CP-SAT của đồ án.
4. **Mục 8** (hướng nghiên cứu tương lai) — điểm về **"phần lớn công trình tập trung cách tiếp cận chuyên biệt"** và giá trị của lớp giải **diễn giải/tường minh** phù hợp với định hướng "lớp diễn giải phụ trợ" (critical path, sensitivity, counterfactual, utilization) của đồ án — dù bài báo không đề cập trực tiếp explainability, nó nhấn mạnh nhu cầu thực tế về cách tiếp cận **tin cậy được, vận hành được** hơn là chỉ tối ưu con số.
5. Bảng 2 (Mục 3.1) là nguồn benchmark chuẩn (BRdata, HUdata, DPdata, DMUdata, Fdata...) có thể dùng cho việc 3 cô Châu yêu cầu (implement + evaluate baseline vs CP-SAT).
