"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/", label: "Tổng quan", icon: "grid" },
  { href: "/runs", label: "Lịch sản xuất", icon: "calendar" },
  { href: "/planning", label: "Kế hoạch tổng hợp", icon: "chart" },
  { href: "/master-data", label: "Dữ liệu nhà máy", icon: "database" },
] as const;

function NavigationIcon({ name }: { name: (typeof items)[number]["icon"] }) {
  const paths = {
    grid: <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></>,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M16 3v4M8 3v4M3 10h18M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01" /></>,
    chart: <><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /></>,
    database: <><ellipse cx="12" cy="5" rx="8" ry="3" /><path d="M4 5v6c0 1.7 3.6 3 8 3s8-1.3 8-3V5M4 11v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6" /></>,
  };

  return <svg aria-hidden="true" viewBox="0 0 24 24">{paths[name]}</svg>;
}

export function AppNavigation({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav aria-label="Điều hướng chính">
      {items.map((item) => {
        const active = item.href === "/"
          ? pathname === "/"
          : item.href === "/runs"
            ? pathname === "/runs" || (pathname.startsWith("/runs/") && pathname !== "/runs/new")
            : pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link href={item.href} className={active ? "nav-link nav-link-active" : "nav-link"} key={item.href} onClick={onNavigate}>
            <NavigationIcon name={item.icon} />
            <span>{item.label}</span>
          </Link>
        );
      })}
      <Link href="/runs/new" className="button sidebar-cta" onClick={onNavigate}><span aria-hidden="true">＋</span>Tạo lịch mới</Link>
    </nav>
  );
}
