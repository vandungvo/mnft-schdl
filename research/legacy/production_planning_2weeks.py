"""
Tong quat hoa bai toan: thay vi xep tung job/gio nhu cac file truoc, day
la bai toan LAP KE HOACH SAN XUAT THEO NGAY trong 2 tuan (10 ngay lam
viec), voi INPUT la:
  - Don hang khach (nhu cau theo loai san pham, theo ngay den han).
  - Ton kho DAU KY: ban thanh pham (WIP, sau Duc truoc CNC) va thanh
    pham (FG, sau CNC).
  - Nguong ton kho toi thieu (safety stock) cho WIP va FG moi loai.

QUYET DINH moi ngay: san xuat bao nhieu (Duc) va gia cong bao nhieu
(CNC) cho moi loai san pham -- duoc "keo" boi nguyen tac: TON KHO KHONG
DUOC XUONG DUOI NGUONG AN TOAN (mo hinh hoa bang chi phi phat rat cao
neu vi pham, khong phai hard-block, de tranh infeasible khi du lieu xau).

CUOI KY (ngay 10): neu con du nang luc may (da giao het don, ton kho da
tren nguong an toan), model duoc thuong khi SAN XUAT THEM de dat TON
KHO MUC TIEU (target, cao hon safety stock) -- chuan bi dem cho ky ke
tiep thay vi de may nghi khong tao gia tri.

Day la bai toan Capacitated Lot-Sizing Problem (CLSP) mo rong voi
safety stock 2 tang kho (WIP + FG) -- giai bang OR-Tools CP-SAT (MIP
nguyen).

Chay: python production_planning_2weeks.py
"""

from ortools.sat.python import cp_model

# ---------------------------------------------------------------------------
# 1) Du lieu
# ---------------------------------------------------------------------------

TYPES = ["A", "B", "C"]
DAYS = list(range(1, 11))  # 10 ngay lam viec = 2 tuan

# Thoi gian san xuat 1 don vi (dvi cong suat / don vi san pham)
CAST_TIME = {"A": 2, "B": 3, "C": 4}
CNC_TIME = {"A": 1, "B": 2, "C": 3}

# Cong suat may moi ngay (tong 2 may Duc + 2 may CNC, quy doi ve dvi cong suat).
# SUY TRUC TIEP tu ngan sach ca cua Tang 2 (SHIFT_BUDGET = 34 duc / 27 cnc,
# 2 may x 3 ca) de HAI TANG NOI CUNG MOT NGON NGU. Truoc day Tang 1 dung
# 200/160 con Tang 2 co 204/162 -- Tang 2 rong rai hon, che bot cac truong
# hop sat bien.
N_MACHINES_PER_STAGE = 2
CAST_CAP_PER_DAY = N_MACHINES_PER_STAGE * 3 * 34  # 204
CNC_CAP_PER_DAY = N_MACHINES_PER_STAGE * 3 * 27   # 162

# Du phong thoi gian CHANGEOVER ma Tang 1 phai giu lai.
# Tang 1 tinh "setup" theo kieu: chi tinh khi HOM NAY san xuat loai do ma HOM
# QUA khong san xuat. Nhung Tang 2 phai tra thoi gian doi khuon MOI LAN may
# chuyen giua 2 loai TRONG CUNG MOT NGAY -- hai cach do hoan toan khac nhau.
# Hau qua thuc te (da do duoc): Tang 1 nhoi dung 200 don vi khoi luong duc vao
# Ngay 2 va Ngay 3 voi setup = 0 (vi ca 3 loai deu da chay tu hom truoc), roi
# Tang 2 phai them 2-3 don vi doi khuon tren moi may -> 103 > 102 -> TANG CA,
# du "tren giay" van con du cong suat.
# Can duoi so lan doi khuon trong 1 ngay = (so loai) - (so may). De an toan ta
# giu lai theo kich ban xau nhat: moi loai them vao ngoai loai dau tien deu co
# the sinh them mot lan doi khuon.
CHANGEOVER_RESERVE = {"cast": 3, "cnc": 2}  # = thoi gian doi khuon/do ga lon nhat

# Setup (doi khuon/do ga) neu HOM NAY san xuat loai nay ma HOM QUA khong san xuat
SETUP_CAST_TIME = {"A": 6, "B": 8, "C": 10}
SETUP_CNC_TIME = {"A": 4, "B": 6, "C": 8}
MIN_BATCH = {"A": 15, "B": 15, "C": 10}  # da san xuat trong ngay thi phai >= muc nay

# Ton kho dau ky (truoc ngay 1)
WIP_INIT = {"A": 25, "B": 20, "C": 12}
FG_INIT = {"A": 35, "B": 28, "C": 18}

# Nguong an toan (safety stock) -- KHONG duoc de xuong duoi muc nay.
# (Da thu nang nguong nay len de tao vung dem -- KET QUA PHAN TAC DUNG:
# tong don vi vuot ca tang tu 70 len 87, vi Tang 1 khong biet may nao bi
# gioi han, nen phan dem lai do them vao dung loai B/C dang bi ket 1 may
# -- xem SAFETY_LEAD_DAYS ben duoi de biet cach thay the dung hon.)
WIP_MIN = {"A": 20, "B": 15, "C": 10}
FG_MIN = {"A": 30, "B": 25, "C": 15}

# Thay vi nang nguong ton kho (sai lech nhu tren), tao vung dem giao hang
# bang cach LUI HAN NOI BO som hon han that SAFETY_LEAD_DAYS ngay -- ep
# model hoan thanh SOM HON, khong dong den TONG khoi luong hay nguong an
# toan, nen khong lam nang them bat ky may nao ca.
#
# Gia tri 5 duoc chon bang cach QUET toan bo, chay DAY DU ca 2 tang (khong
# phai chi uoc luong bang can duoi), tat ca deu dat OPTIMAL:
#
#   LEAD | safety  hold setup  end | TONG | ca  idle | TANG CA
#      3 |    100  2324   310    0 | 2734 | 71   333 | khong
#      4 |     50  2402   310    0 | 2762 | 70   292 | khong
#      5 |      0  2371   240    0 | 2611 | 66   177 | 1 diem (Ngay 3 Cast1, 3 don vi)  <-- chon
#      6 |    490  2172   240    0 | 2902 | 65   143 | khong
#
# LEAD=5 thang ap dao o 4 tieu chi: het thung nguong an toan (0 thay vi 50),
# re hon 151, bot 4 ca kich hoat, va bot 115 don vi thoi gian ranh. Cai gia
# DUY NHAT la 1 diem tang ca 3 don vi o Ngay 3 tren Cast1.
#
# Vi sao Ngay 3 khong the tranh: khoi luong duc 198, trong do loai C chiem 92
# va CHI Cast1 duc duoc C. Phan con lai (106) vuot suc chua cua Cast2 (102),
# nen Cast1 buoc phai nhan them mot lo loai khac. Nhung lo nho nhat cua loai A
# la 5 san pham = 10 don vi, cong 3 don vi doi khuon C->A, thanh
# 92 + 10 + 3 = 105 > 102. Khong cach chia nao thoat duoc.
#
# NEU "0 lan tang ca" la yeu cau CUNG thi doi dong duoi thanh 4 va chay lai
# export_shift_continuous_data.py -- do la thay doi duy nhat can thiet.
SAFETY_LEAD_DAYS = 5

# Muc tieu ton kho CUOI KY (ngay 10) -- cao hon safety stock, de "don" cho ky sau
WIP_TARGET_END = {"A": 40, "B": 30, "C": 20}
FG_TARGET_END = {"A": 60, "B": 50, "C": 30}

# Don hang: (loai, ngay den han, so luong)
ORDERS = [
    ("A", 2, 40), ("A", 5, 35), ("A", 9, 50),
    ("B", 3, 45), ("B", 7, 30), ("B", 10, 40),
    ("C", 4, 25), ("C", 8, 35), ("C", 10, 20),
]

# Chi phi (trong so cang lon = cang nghiem trong)
COST_BACKLOG_PER_UNIT_DAY = 20      # tre giao don hang thuc su -- nghiem trong nhat
COST_SAFETY_BREACH_PER_UNIT_DAY = 10  # ton kho tut duoi nguong an toan -- rui ro, chua phai mat khach
COST_WIP_HOLD_PER_UNIT_DAY = 1
COST_FG_HOLD_PER_UNIT_DAY = 2       # giu FG dat hon WIP (da dau tu nhieu cong doan hon)
COST_SETUP = {"A": 15, "B": 20, "C": 25}
COST_END_SHORTFALL_PER_UNIT = 5     # khong dat muc tieu ton kho cuoi ky -- uu tien thap nhat

HORIZON_QTY = 300  # tran an toan cho moi bien so luong


def planned_due_day(dd):
    """Han NOI BO cua 1 don co han that `dd`: som hon SAFETY_LEAD_DAYS ngay.

    QUAN TRONG -- neu lui som hon ca Ngay 1 thi GIU NGUYEN han that, KHONG
    kep ve Ngay 1. Truoc day dung max(1, dd - LEAD): moi don co han <= LEAD
    deu bi don het ve Ngay 1, tao mot cu soc nhu cau gia tao ngay dau ky
    (A=75, B=45, C=25) ma khong co ngay nao phia truoc de chuan bi -- model
    buoc phai xa ton kho xuong duoi nguong an toan va an phat, du nang luc
    may van con du. Nghia la co che "vung dem" tu banh chan minh dung o cho
    no can nhat. Don qua som thi khong co vung dem -- chap nhan, con hon la
    sinh ra mot khoan phat vo nghia."""
    shifted = dd - SAFETY_LEAD_DAYS
    return dd if shifted < DAYS[0] else shifted


def demand_of(t, d):
    """Ham cau moi ngay dung de lap ke hoach -- NOI BO coi moi don den han
    som hon SAFETY_LEAD_DAYS ngay so voi han thuc, de model buoc phai co
    hang san sang TRUOC han that, tao vung dem giao hang. Khong dong den
    tong khoi luong hay nguong an toan -- chi doi THOI DIEM."""
    return sum(q for (tt, dd, q) in ORDERS if tt == t and planned_due_day(dd) == d)


# ---------------------------------------------------------------------------
# 2) Model CP-SAT
# ---------------------------------------------------------------------------

def build_and_solve():
    model = cp_model.CpModel()

    cast_qty, cnc_qty = {}, {}
    wip_inv, fg_inv, backlog = {}, {}, {}
    produce_cast, produce_cnc = {}, {}
    setup_cast, setup_cnc = {}, {}
    shipped = {}

    for t in TYPES:
        for d in DAYS:
            cast_qty[t, d] = model.NewIntVar(0, HORIZON_QTY, f"cast_{t}_{d}")
            cnc_qty[t, d] = model.NewIntVar(0, HORIZON_QTY, f"cnc_{t}_{d}")
            wip_inv[t, d] = model.NewIntVar(0, HORIZON_QTY, f"wip_{t}_{d}")
            fg_inv[t, d] = model.NewIntVar(0, HORIZON_QTY, f"fg_{t}_{d}")
            backlog[t, d] = model.NewIntVar(0, HORIZON_QTY, f"backlog_{t}_{d}")
            shipped[t, d] = model.NewIntVar(0, HORIZON_QTY, f"shipped_{t}_{d}")
            produce_cast[t, d] = model.NewBoolVar(f"pcast_{t}_{d}")
            produce_cnc[t, d] = model.NewBoolVar(f"pcnc_{t}_{d}")
            setup_cast[t, d] = model.NewBoolVar(f"scast_{t}_{d}")
            setup_cnc[t, d] = model.NewBoolVar(f"scnc_{t}_{d}")

    # --- Lien ket qty <-> produce indicator + minimum batch size ---
    for t in TYPES:
        for d in DAYS:
            model.Add(cast_qty[t, d] == 0).OnlyEnforceIf(produce_cast[t, d].Not())
            model.Add(cast_qty[t, d] >= MIN_BATCH[t]).OnlyEnforceIf(produce_cast[t, d])
            model.Add(cnc_qty[t, d] == 0).OnlyEnforceIf(produce_cnc[t, d].Not())
            model.Add(cnc_qty[t, d] >= MIN_BATCH[t]).OnlyEnforceIf(produce_cnc[t, d])

            # Setup xay ra khi HOM NAY san xuat ma HOM QUA khong san xuat
            prev_cast = produce_cast[t, d - 1] if d > 1 else None
            prev_cnc = produce_cnc[t, d - 1] if d > 1 else None
            if prev_cast is None:
                model.Add(setup_cast[t, d] == produce_cast[t, d])
                model.Add(setup_cnc[t, d] == produce_cnc[t, d])
            else:
                model.Add(setup_cast[t, d] <= produce_cast[t, d])
                model.Add(setup_cast[t, d] <= 1 - prev_cast)
                model.Add(setup_cast[t, d] >= produce_cast[t, d] - prev_cast)
                model.Add(setup_cnc[t, d] <= produce_cnc[t, d])
                model.Add(setup_cnc[t, d] <= 1 - prev_cnc)
                model.Add(setup_cnc[t, d] >= produce_cnc[t, d] - prev_cnc)

    # --- Can bang ton kho WIP: hom nay = hom qua + duc - cnc ---
    for t in TYPES:
        for d in DAYS:
            prev_wip = WIP_INIT[t] if d == 1 else wip_inv[t, d - 1]
            model.Add(wip_inv[t, d] == prev_wip + cast_qty[t, d] - cnc_qty[t, d])

            # --- RANG BUOC VAT LY: CNC hom nay chi duoc dung phoi DA CO TU
            # TRUOC, khong duoc dung phoi duc TRONG CUNG NGAY ---
            # Neu khong co dong nay, can bang kho o tren van cho phep
            # cnc_qty <= prev_wip + cast_qty, tuc CNC "muon truoc" phoi ma
            # may Duc chua san xuat xong. O muc ngay thi nhin khong ra, nhung
            # xuong Tang 2 (cap ca) thi vo tran: lich chi tiet tung tao ra
            # canh CNC2 gia cong 70 phoi loai A xong luc t=70 trong khi may
            # Duc moi lam ra 45 phoi (8/10 ngay bi vi pham kieu nay).
            # Rang buoc nay tach doi 2 cong doan theo ngay, nho do Tang 2
            # duoc phep giai `cast` va `cnc` DOC LAP trong cung 1 ngay ma
            # ket qua van kha thi ve vat ly -- khong phai viet lai kien truc.
            # Cai gia phai tra: phoi phai nam kho them 1 ngay (cost_hold tang).
            model.Add(cnc_qty[t, d] <= prev_wip)

    # --- Can bang ton kho FG + backlog: hom nay = hom qua + cnc - giao ---
    for t in TYPES:
        for d in DAYS:
            prev_fg = FG_INIT[t] if d == 1 else fg_inv[t, d - 1]
            prev_backlog = 0 if d == 1 else backlog[t, d - 1]
            dem = demand_of(t, d)
            # shipped bi chan boi luong co san; phan con thieu don vao backlog
            model.Add(shipped[t, d] <= prev_fg + cnc_qty[t, d])
            model.Add(fg_inv[t, d] == prev_fg + cnc_qty[t, d] - shipped[t, d])
            model.Add(backlog[t, d] == prev_backlog + dem - shipped[t, d])

    # --- Nguong an toan: mo hinh bang shortfall (khong hard-block de tranh infeasible) ---
    wip_shortfall, fg_shortfall = {}, {}
    for t in TYPES:
        for d in DAYS:
            ws = model.NewIntVar(0, HORIZON_QTY, f"wip_short_{t}_{d}")
            fs = model.NewIntVar(0, HORIZON_QTY, f"fg_short_{t}_{d}")
            model.AddMaxEquality(ws, [WIP_MIN[t] - wip_inv[t, d], 0])
            model.AddMaxEquality(fs, [FG_MIN[t] - fg_inv[t, d], 0])
            wip_shortfall[t, d] = ws
            fg_shortfall[t, d] = fs

    # --- Cuoi ky: thuong neu dat duoc ton kho muc tieu ---
    end_wip_shortfall, end_fg_shortfall = {}, {}
    last_day = DAYS[-1]
    for t in TYPES:
        ews = model.NewIntVar(0, HORIZON_QTY, f"end_wip_short_{t}")
        efs = model.NewIntVar(0, HORIZON_QTY, f"end_fg_short_{t}")
        model.AddMaxEquality(ews, [WIP_TARGET_END[t] - wip_inv[t, last_day], 0])
        model.AddMaxEquality(efs, [FG_TARGET_END[t] - fg_inv[t, last_day], 0])
        end_wip_shortfall[t] = ews
        end_fg_shortfall[t] = efs

    # --- Cong suat may moi ngay (da tru du phong changeover) ---
    for d in DAYS:
        # So loai san xuat trong ngay, vuot qua loai dau tien -> moi loai them
        # vao deu co the buoc mot may phai doi khuon/do ga mot lan.
        # Khong can kep max(..., 0): ngay khong san xuat gi thi so hang nay am
        # nhung ve trai cung bang 0, rang buoc van thoa -- bo kep di giup model
        # gon hon dang ke (bot 20 bien nguyen + 20 rang buoc max).
        extra_cast = sum(produce_cast[t, d] for t in TYPES) - 1
        extra_cnc = sum(produce_cnc[t, d] for t in TYPES) - 1

        model.Add(
            sum(CAST_TIME[t] * cast_qty[t, d] + SETUP_CAST_TIME[t] * setup_cast[t, d] for t in TYPES)
            + CHANGEOVER_RESERVE["cast"] * extra_cast
            <= CAST_CAP_PER_DAY
        )
        model.Add(
            sum(CNC_TIME[t] * cnc_qty[t, d] + SETUP_CNC_TIME[t] * setup_cnc[t, d] for t in TYPES)
            + CHANGEOVER_RESERVE["cnc"] * extra_cnc
            <= CNC_CAP_PER_DAY
        )

        # --- Cong suat cua RIENG may duy nhat lam duoc loai "bi ket" ---
        # Day la phan machine eligibility RE TIEN NHAT co the dua len Tang 1:
        # khong can mo hinh hoa tung may, chi can biet loai C chi Cast1 duc
        # duoc (Cast2 thieu khuon) va loai B chi CNC1 gia cong duoc (CNC2
        # thieu do ga). Vi moi loai do chi co DUNG 1 may, khoi luong ngay cua
        # no khong the vuot qua nang luc ca ngay cua rieng may do.
        # Khong co 2 dong nay, Tang 1 chi kiem tra TONG cong suat he thong va
        # co the lap ke hoach "kha thi tren giay" nhung vo tran o Tang 2.
        model.Add(CAST_TIME["C"] * cast_qty["C", d] <= CAST_CAP_PER_DAY // 2)
        model.Add(CNC_TIME["B"] * cnc_qty["B", d] <= CNC_CAP_PER_DAY // 2)

    # --- Objective ---
    cost_backlog = sum(COST_BACKLOG_PER_UNIT_DAY * backlog[t, d] for t in TYPES for d in DAYS)
    cost_safety = sum(COST_SAFETY_BREACH_PER_UNIT_DAY * (wip_shortfall[t, d] + fg_shortfall[t, d])
                       for t in TYPES for d in DAYS)
    cost_hold = sum(COST_WIP_HOLD_PER_UNIT_DAY * wip_inv[t, d] + COST_FG_HOLD_PER_UNIT_DAY * fg_inv[t, d]
                     for t in TYPES for d in DAYS)
    cost_setup = sum(COST_SETUP[t] * (setup_cast[t, d] + setup_cnc[t, d]) for t in TYPES for d in DAYS)
    cost_end_shortfall = sum(COST_END_SHORTFALL_PER_UNIT * (end_wip_shortfall[t] + end_fg_shortfall[t])
                              for t in TYPES)

    model.Minimize(cost_backlog + cost_safety + cost_hold + cost_setup + cost_end_shortfall)

    solver = cp_model.CpSolver()
    # 120s: da do thuc te bai toan can ~47s de CHUNG MINH toi uu (1 worker).
    # Voi tran 30s cu, solver bi cat ngang o trang thai FEASIBLE va tra ve mot
    # ke hoach TE HON (tong 2667, thieu hut ton kho cuoi ky 50) so voi nghiem
    # toi uu that (tong 2611, khong thieu hut). Dung lai o FEASIBLE con pha vo
    # tinh tai lap: tran theo dong ho thuc thi moi may / moi lan chay se dung
    # o mot cho khac nhau. Phai de solver chay den OPTIMAL.
    solver.parameters.max_time_in_seconds = 120
    # --- TAI LAP DUOC (reproducibility) ---
    # Bai toan nay co RAT NHIEU loi giai cung toi uu (cung tong chi phi, khac
    # cau truc ke hoach). Muon bao ve do an thi moi lan chay phai ra dung mot
    # ket qua, neu khong Gantt trong bao cao se khong khop voi Gantt chay live.
    # random_seed MOT MINH la KHONG DU: voi num_search_workers > 1, worker nao
    # tim ra loi giai toi uu truoc (phu thuoc dong ho thuc) se thang, nen ket
    # qua van doi giua cac lan chay. Da do thuc te: 8 worker + seed co dinh
    # van cho 3 ket qua khac nhau trong 3 lan chay. Phai dung 1 worker.
    # Cai gia: cham hon, nhung toan bo pipeline van duoi ~30 giay.
    solver.parameters.num_search_workers = 1
    solver.parameters.random_seed = 42
    status = solver.Solve(model)
    if status not in (cp_model.OPTIMAL, cp_model.FEASIBLE):
        raise RuntimeError(
            f"Tang 1 (aggregate planning) khong giai duoc: status={solver.StatusName(status)}"
        )

    def val(x):
        return solver.Value(x)

    result = {
        "status": solver.StatusName(status),
        "cost_backlog": val(cost_backlog),
        "cost_safety": val(cost_safety),
        "cost_hold": val(cost_hold),
        "cost_setup": val(cost_setup),
        "cost_end_shortfall": val(cost_end_shortfall),
        "plan": {},
    }
    for t in TYPES:
        for d in DAYS:
            result["plan"][t, d] = {
                "cast": val(cast_qty[t, d]),
                "cnc": val(cnc_qty[t, d]),
                "wip": val(wip_inv[t, d]),
                "fg": val(fg_inv[t, d]),
                "backlog": val(backlog[t, d]),
                "shipped": val(shipped[t, d]),
                "wip_short": val(wip_shortfall[t, d]),
                "fg_short": val(fg_shortfall[t, d]),
            }
    result["end_wip_shortfall"] = {t: val(end_wip_shortfall[t]) for t in TYPES}
    result["end_fg_shortfall"] = {t: val(end_fg_shortfall[t]) for t in TYPES}
    return result


# ---------------------------------------------------------------------------
# 3) In ket qua
# ---------------------------------------------------------------------------

def print_plan(result):
    print(f"Status = {result['status']}")
    total_cost = (result["cost_backlog"] + result["cost_safety"] + result["cost_hold"]
                  + result["cost_setup"] + result["cost_end_shortfall"])
    print(f"Chi phi: backlog={result['cost_backlog']} an_toan={result['cost_safety']} "
          f"ton_kho={result['cost_hold']} setup={result['cost_setup']} "
          f"cuoi_ky={result['cost_end_shortfall']} | TONG={total_cost}")
    print()

    for t in TYPES:
        print(f"=== Loai {t} (safety: WIP>={WIP_MIN[t]}, FG>={FG_MIN[t]} | "
              f"muc tieu cuoi ky: WIP={WIP_TARGET_END[t]}, FG={FG_TARGET_END[t]}) ===")
        print(f"{'Ngay':4} {'Duc':>5} {'CNC':>5} {'WIP':>5} {'FG':>5} {'Giao':>5} {'Backlog':>7} {'Ghi chu':>30}")
        for d in DAYS:
            p = result["plan"][t, d]
            note = ""
            if p["backlog"] > 0:
                note = f"TRE GIAO {p['backlog']}"
            elif p["wip_short"] > 0 or p["fg_short"] > 0:
                note = "DUOI NGUONG AN TOAN"
            elif d == DAYS[-1] and (result["end_wip_shortfall"][t] > 0 or result["end_fg_shortfall"][t] > 0):
                note = "chua dat muc tieu cuoi ky"
            print(f"{d:4} {p['cast']:>5} {p['cnc']:>5} {p['wip']:>5} {p['fg']:>5} "
                  f"{p['shipped']:>5} {p['backlog']:>7} {note:>30}")
        print()


def explain_production_days(result):
    print("=== Giai thich: vi sao san xuat vao nhung ngay do? ===")
    for t in TYPES:
        for d in DAYS:
            p = result["plan"][t, d]
            if p["cast"] == 0 and p["cnc"] == 0:
                continue
            reasons = []
            if p["cast"] > 0:
                if d == DAYS[-1] or (d >= DAYS[-3] and result["end_wip_shortfall"][t] == 0
                                      and p["wip"] > WIP_MIN[t] + 5):
                    reasons.append(f"Duc {p['cast']} don vi: gan cuoi ky, xay du tru huong toi "
                                   f"muc tieu WIP={WIP_TARGET_END[t]} cho ky sau")
                elif p["wip"] <= WIP_MIN[t] + 5:
                    reasons.append(f"Duc {p['cast']} don vi: WIP dang sat nguong an toan ({WIP_MIN[t]}), "
                                   f"can bu de khong bi thieu nguyen lieu ban thanh pham")
                else:
                    reasons.append(f"Duc {p['cast']} don vi: chuan bi truoc cho don hang/CNC sap toi")
            if p["cnc"] > 0:
                if d == DAYS[-1] or (d >= DAYS[-3] and result["end_fg_shortfall"][t] == 0
                                      and p["fg"] > FG_MIN[t] + 5):
                    reasons.append(f"CNC {p['cnc']} don vi: gan cuoi ky, xay du tru huong toi "
                                   f"muc tieu FG={FG_TARGET_END[t]} cho ky sau")
                elif p["fg"] <= FG_MIN[t] + 5:
                    reasons.append(f"CNC {p['cnc']} don vi: FG dang sat nguong an toan ({FG_MIN[t]}), "
                                   f"can bu de khong het hang giao")
                else:
                    dem_soon = sum(demand_of(t, dd) for dd in DAYS if d <= dd <= d + 2)
                    reasons.append(f"CNC {p['cnc']} don vi: chuan bi giao cho don hang sap den han "
                                   f"(nhu cau 2 ngay toi: {dem_soon})")
            print(f"* {t}/Ngay{d}: " + "; ".join(reasons))
    print()


if __name__ == "__main__":
    result = build_and_solve()
    print_plan(result)
    explain_production_days(result)
