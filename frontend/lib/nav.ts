import { BarChart3, CalendarClock, CalendarRange, ClipboardList, Factory, FlaskConical, LayoutGrid, type LucideIcon } from "lucide-react";

export interface NavItem {
  href: string;
  label: readonly [string, string];
  /** One-line purpose, shown in the command palette. */
  hint: readonly [string, string];
  icon: LucideIcon;
}

export interface NavGroup {
  label: readonly [string, string];
  items: NavItem[];
}

/* Grouped by how often the data changes: the planner's daily loop (periods, orders) first, the plant set-up
   (changes a few times a year) next, research/engineering tools last. */
export const NAV_GROUPS: NavGroup[] = [
  {
    label: ["Điều độ", "Schedule"],
    items: [
      { href: "/", label: ["Hôm nay", "Today"], hint: ["Việc cần làm của kỳ hiện tại", "What needs doing in the current period"], icon: LayoutGrid },
      { href: "/periods", label: ["Kỳ lập lịch", "Planning periods"], hint: ["Chuẩn bị, sinh phương án, chốt và thực hiện từng kỳ", "Prepare, generate, commit and run each period"], icon: CalendarRange },
      { href: "/orders", label: ["Sổ đơn hàng", "Order book"], hint: ["Nhập đơn một lần, theo dõi tải theo tuần", "Enter orders once, watch weekly load"], icon: ClipboardList },
    ],
  },
  {
    label: ["Dữ liệu nền", "Plant set-up"],
    items: [
      { href: "/factory", label: ["Nhà máy", "Factory"], hint: ["Sản phẩm, máy, ca, lịch nghỉ, chính sách — có phiên bản", "Products, machines, shifts, calendar, policies — versioned"], icon: Factory },
    ],
  },
  {
    label: ["Nâng cao", "Advanced"],
    items: [
      { href: "/scenarios", label: ["Kịch bản JSON", "JSON scenarios"], hint: ["Bộ dữ liệu nhập từ file, dùng cho thực nghiệm", "Datasets imported from files, for experiments"], icon: FlaskConical },
      { href: "/runs", label: ["Lần chạy", "Runs"], hint: ["Hàng đợi solver, lỗi và chi tiết từng lịch", "Solver queue, failures and each schedule's details"], icon: CalendarClock },
      { href: "/planning", label: ["Kế hoạch tổng hợp (v4)", "Aggregate planning (v4)"], hint: ["Cân đối nhu cầu với công suất cho kịch bản 4 công đoạn", "Demand vs capacity for 4-stage scenarios"], icon: BarChart3 },
    ],
  },
];

export const NAV_ITEMS = NAV_GROUPS.flatMap((group) => group.items);

export function isActive(href: string, pathname: string): boolean {
  if (href === "/") return pathname === "/";
  if (href === "/runs") return pathname === "/runs" || (pathname.startsWith("/runs/") && pathname !== "/runs/new");
  return pathname === href || pathname.startsWith(`${href}/`);
}
