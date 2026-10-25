import { BarChart3, CalendarClock, Layers, LayoutGrid, type LucideIcon } from "lucide-react";

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

/* Grouped by the planner's job. One object, one page: a scenario holds its data, options, schedule and decision. */
export const NAV_GROUPS: NavGroup[] = [
  {
    label: ["Điều độ", "Schedule"],
    items: [
      { href: "/", label: ["Tổng quan", "Overview"], hint: ["Việc cần làm và tình trạng hệ thống", "What needs doing and system status"], icon: LayoutGrid },
      { href: "/scenarios", label: ["Kịch bản", "Scenarios"], hint: ["Dữ liệu nhà máy, phương án lịch, so sánh và chốt", "Factory data, schedule options, comparison and commit"], icon: Layers },
      { href: "/runs", label: ["Lần chạy", "Runs"], hint: ["Hàng đợi solver, lỗi và chi tiết từng lịch", "Solver queue, failures and each schedule's details"], icon: CalendarClock },
    ],
  },
  {
    label: ["Chuẩn bị", "Prepare"],
    items: [
      { href: "/planning", label: ["Kế hoạch tổng hợp", "Aggregate planning"], hint: ["Cân đối nhu cầu với công suất theo kỳ", "Balance demand against capacity per period"], icon: BarChart3 },
    ],
  },
];

export const NAV_ITEMS = NAV_GROUPS.flatMap((group) => group.items);

export function isActive(href: string, pathname: string): boolean {
  if (href === "/") return pathname === "/";
  if (href === "/runs") return pathname === "/runs" || (pathname.startsWith("/runs/") && pathname !== "/runs/new");
  return pathname === href || pathname.startsWith(`${href}/`);
}
