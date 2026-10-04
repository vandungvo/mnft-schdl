import { BarChart3, CalendarClock, Compass, Database, LayoutGrid, type LucideIcon } from "lucide-react";

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

/* Grouped by the planner's job: decide first, then monitor, then prepare inputs. */
export const NAV_GROUPS: NavGroup[] = [
  {
    label: ["Điều độ", "Schedule"],
    items: [
      { href: "/", label: ["Tổng quan", "Overview"], hint: ["Việc cần làm và tình trạng hệ thống", "What needs doing and system status"], icon: LayoutGrid },
      { href: "/decide", label: ["Bàn điều độ", "Scheduling desk"], hint: ["Sinh, so sánh và chốt phương án lịch", "Generate, compare and commit schedule options"], icon: Compass },
      { href: "/runs", label: ["Lần chạy", "Runs"], hint: ["Hàng đợi solver, lỗi và chi tiết từng lịch", "Solver queue, failures and each schedule's details"], icon: CalendarClock },
    ],
  },
  {
    label: ["Chuẩn bị", "Prepare"],
    items: [
      { href: "/planning", label: ["Kế hoạch tổng hợp", "Aggregate planning"], hint: ["Cân đối nhu cầu với công suất theo kỳ", "Balance demand against capacity per period"], icon: BarChart3 },
      { href: "/master-data", label: ["Dữ liệu nhà máy", "Factory data"], hint: ["Sản phẩm, BTP, máy, đơn hàng theo revision", "Products, semi-finished codes, machines, orders by revision"], icon: Database },
    ],
  },
];

export const NAV_ITEMS = NAV_GROUPS.flatMap((group) => group.items);

export function isActive(href: string, pathname: string): boolean {
  if (href === "/") return pathname === "/";
  if (href === "/runs") return pathname === "/runs" || (pathname.startsWith("/runs/") && pathname !== "/runs/new");
  return pathname === href || pathname.startsWith(`${href}/`);
}
