import { tr } from "./locale";
import type { Algorithm } from "./types";

export type AlgorithmFamily = "rule" | "search" | "cp";

export interface AlgorithmInfo {
  value: Algorithm;
  label: string;
  short: string;
  family: AlgorithmFamily;
  description: string;
  note: string;
}

type Text = [string, string];

/** Bilingual entry; description/note resolve to the active locale on every read. */
function algorithm(value: Algorithm, label: Text | string, short: string, family: AlgorithmFamily, description: Text, note: Text): AlgorithmInfo {
  return {
    value, short, family,
    get label() { return typeof label === "string" ? label : tr(...label); },
    get description() { return tr(...description); },
    get note() { return tr(...note); },
  };
}

export const ALGORITHMS: AlgorithmInfo[] = [
  algorithm("fifo", "FIFO", "FIFO", "rule", ["Vào trước làm trước", "First in, first out"],
    ["Luật vào trước làm trước: tại mỗi bước chọn lượt bắt đầu được sớm nhất, hoà thì theo thứ tự danh sách.", "First-in-first-out rule: at each step pick the operation that can start earliest; ties follow list order."]),
  algorithm("edd", "EDD", "EDD", "rule", ["Hạn sớm làm trước", "Earliest due date first"],
    ["Hạn sớm làm trước: tại mỗi bước chọn lượt bắt đầu được sớm nhất, hoà thì ưu tiên đơn có hạn giao sớm nhất.", "Earliest due date: at each step pick the operation that can start earliest; ties favour the order due soonest."]),
  algorithm("spt", "SPT", "SPT", "rule", ["Việc ngắn làm trước", "Shortest processing time first"],
    ["Việc ngắn làm trước: tại mỗi bước chọn lượt bắt đầu được sớm nhất, hoà thì ưu tiên lượt chạy ngắn nhất.", "Shortest processing time: at each step pick the operation that can start earliest; ties favour the shortest run."]),
  algorithm("simulated_annealing", "Simulated Annealing", "SA", "search", ["Metaheuristic khám phá rộng", "Broad exploratory metaheuristic"],
    ["Tìm thứ tự ưu tiên và thiên hướng chọn máy, dựng lịch bằng cùng bộ xếp với FIFO/EDD/SPT; chấp nhận bước xấu theo nhiệt độ giảm dần.", "Searches priority order and machine bias, building schedules with the same decoder as FIFO/EDD/SPT; accepts worse moves under a cooling temperature."]),
  algorithm("genetic_algorithm", "Genetic Algorithm", "GA", "search", ["Tìm kiếm theo quần thể", "Population-based search"],
    ["Quần thể lời giải, chọn đấu, lai ghép, đột biến và giữ cá thể tốt nhất; dựng lịch bằng cùng bộ xếp.", "A population of solutions with tournament selection, crossover, mutation and elitism; schedules are built with the same decoder."]),
  algorithm("cp_sat", "CP-SAT", "CP-SAT", "cp", ["Tối ưu ràng buộc nguyên khối", "Monolithic constraint optimisation"],
    ["CP-SAT nguyên khối, không gợi ý: tự chọn máy, ca, thứ tự và phương án làm trước.", "Monolithic CP-SAT without hints: chooses machines, shifts, sequence and build-ahead options on its own."]),
  algorithm("cp_sat_hint", ["CP-SAT + gợi ý EDD", "CP-SAT + EDD hint"], "CP-SAT+", "cp", ["Khuyến nghị · cân bằng tốc độ và chất lượng", "Recommended · balances speed and quality"],
    ["CP-SAT với lịch EDD làm gợi ý khởi đầu; nếu không cải thiện được thì giữ lịch EDD.", "CP-SAT warm-started from the EDD schedule; if it cannot improve, the EDD schedule is kept."]),
  algorithm("cp_lns", "CP-LNS", "CP-LNS", "cp", ["Tìm kiếm lân cận lớn cho lịch lớn", "Large neighbourhood search for large schedules"],
    ["Bắt đầu từ lịch luật tốt nhất, mỗi vòng mở lại một khung giờ / vài máy / một công đoạn cho CP-SAT xếp lại.", "Starts from the best rule schedule; each round reopens a time window, a few machines or one stage for CP-SAT to re-sequence."]),
  algorithm("cp_rolling", ["CP-SAT cuốn chiếu", "Rolling-horizon CP-SAT"], "CP-Roll", "cp", ["Chia horizon thành cửa sổ nhỏ", "Splits the horizon into small windows"],
    ["Chia horizon thành các cửa sổ liên tiếp, giải CP-SAT từng cửa sổ và cố định phần đã xếp.", "Splits the horizon into consecutive windows, solves each with CP-SAT and freezes what is already scheduled."]),
];

export function familyLabel(family: AlgorithmFamily): string {
  return { rule: tr("Luật điều độ", "Dispatching rules"), search: "Metaheuristic", cp: tr("Quy hoạch ràng buộc", "Constraint programming") }[family];
}

const FAMILY_WHY: Record<AlgorithmFamily, Array<[Text, Text]>> = {
  rule: [
    [["Cách luật chạy", "How the rules work"], ["Mỗi bước dựng mọi lượt đã đủ hàng ở vị trí sớm nhất có thể (nối cuối máy, vừa trong một ca) rồi chọn lượt bắt đầu sớm nhất; luật chỉ phân định khi hoà.", "Each step places every operation whose material is ready at its earliest possible slot (appended to the machine, fitting in one shift), then picks the earliest start; the rule only breaks ties."]],
    [["Làm ngay, không gom ca", "Start now, no shift batching"], ["Luật làm mọi việc ngay khi có hàng nên xong sớm, nhưng việc rải ra nhiều ca: mỗi ca bật chỉ dùng một phần nên thời gian rảnh cao.", "Rules start work as soon as material arrives, so they finish early but spread work over many shifts: each opened shift is only partly used, so idle time is high."]],
    [["Không làm trước", "No build-ahead"], ["Luật không tự chọn phương án làm trước cho đơn dài hạn, nên dễ thiếu tồn an toàn cuối kỳ.", "Rules never choose to build ahead for long-dated orders, so safety stock often falls short at period end."]],
  ],
  search: [
    [["Cách tìm", "How the search works"], ["Mỗi lời giải gồm số ưu tiên cho từng lượt, độ lệch chọn máy và độ lùi giờ. Bộ xếp giống FIFO/EDD/SPT dựng lịch từ đó, chấm bằng đúng hàm mục tiêu.", "Each solution holds a priority per operation, a machine-choice bias and a delay. The same decoder as FIFO/EDD/SPT builds the schedule, scored by the exact objective."]],
    [["Chờ để gom ca", "Wait to batch shifts"], ["Gen lùi giờ cho phép một lượt đợi tới ca đã bật thay vì mở ca mới, nên lịch thường ít ca-máy hơn luật.", "The delay gene lets an operation wait for an already-open shift instead of opening a new one, so schedules usually use fewer machine-shifts than rules."]],
    [["Phụ thuộc seed", "Seed dependent"], ["Kết quả dao động theo seed và ngân sách thời gian; nên chạy vài seed và so sánh.", "Results vary with the seed and time budget; run a few seeds and compare."]],
  ],
  cp: [
    [["Cách giải", "How it solves"], ["CP-SAT dựng toàn bộ bài toán: chọn máy, ca, thứ tự trên từng máy, bảo trì khuôn theo chu kỳ, tồn bán thành phẩm và phương án làm trước.", "CP-SAT models the whole problem: machine and shift choice, sequence on each machine, cyclic mold maintenance, semi-finished stock and build-ahead options."]],
    [["Gợi ý và vùng lân cận", "Hints and neighbourhoods"], ["Biến thể có gợi ý và CP-LNS xuất phát từ lịch luật tốt nhất, nên luôn có lịch hợp lệ và chỉ có thể tốt lên.", "The hinted variant and CP-LNS start from the best rule schedule, so they always have a valid schedule and can only improve on it."]],
    [["Giới hạn thời gian", "Time limit"], ["Trạng thái FEASIBLE nghĩa là hợp lệ, chưa chắc tốt nhất. Điểm solver báo luôn được đối chiếu lại bằng bộ kiểm độc lập.", "FEASIBLE means valid, not necessarily optimal. The solver's reported score is always re-checked by the independent validator."]],
  ],
};

export function familyWhy(family: AlgorithmFamily): Array<[string, string]> {
  return FAMILY_WHY[family].map(([title, body]) => [tr(...title), tr(...body)]);
}

const BY_VALUE = new Map(ALGORITHMS.map((item) => [item.value, item]));

export function algorithmInfo(value: string): AlgorithmInfo {
  return BY_VALUE.get(value as Algorithm) ?? {
    value: value as Algorithm,
    label: value.replaceAll("_", " "),
    short: value.replaceAll("_", " ").toUpperCase(),
    family: "cp",
    description: "",
    note: "",
  };
}
