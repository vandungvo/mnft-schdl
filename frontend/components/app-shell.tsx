"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";

import { getHealth } from "@/lib/api";
import { formatDateTime } from "@/lib/format";
import { AppNavigation } from "./app-navigation";

function Brand() {
  return <div className="brand-block"><span className="eyebrow">MANUFACTURING</span><Link href="/" className="brand"><span className="brand-mark">S</span><span>Schedule OS</span></Link></div>;
}

export function AppShell({ children }: { children: ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const sidebarRef = useRef<HTMLElement>(null);
  const health = useQuery({ queryKey: ["health"], queryFn: getHealth, refetchInterval: 30_000 });

  useEffect(() => {
    if (!menuOpen) return;
    const menuTrigger = menuButtonRef.current;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const firstLink = sidebarRef.current?.querySelector<HTMLElement>("a, button");
    firstLink?.focus();
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") { setMenuOpen(false); return; }
      if (event.key !== "Tab" || !sidebarRef.current) return;
      const focusable = [...sidebarRef.current.querySelectorAll<HTMLElement>("a, button:not(:disabled)")];
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    window.addEventListener("keydown", handleKey);
    return () => {
      window.removeEventListener("keydown", handleKey);
      document.body.style.overflow = previousOverflow;
      menuTrigger?.focus();
    };
  }, [menuOpen]);

  return <div className="app-shell">
    <a className="skip-link" href="#main-content">Bỏ qua điều hướng</a>
    <header className="mobile-header"><Brand /><button ref={menuButtonRef} className="menu-button" aria-label={menuOpen ? "Đóng menu" : "Mở menu"} aria-expanded={menuOpen} aria-controls="primary-sidebar" onClick={() => setMenuOpen((open) => !open)}><span /><span /><span /></button></header>
    {menuOpen && <button className="nav-overlay" aria-label="Đóng menu" onClick={() => setMenuOpen(false)} />}
    <aside ref={sidebarRef} id="primary-sidebar" className={menuOpen ? "sidebar sidebar-open" : "sidebar"}>
      <Brand />
      <AppNavigation onNavigate={() => setMenuOpen(false)} />
      <div className="sidebar-note"><span className={health.isError ? "live-dot live-dot-error" : "live-dot"} /> {health.isError ? "Mất kết nối hệ thống" : "Kiểm chứng lịch độc lập"}</div>
    </aside>
    <div className="workspace">
      <div className="workspace-bar">
        <div className="workspace-context"><strong>Nhà máy linh kiện mẫu</strong><span>Asia/Ho_Chi_Minh</span></div>
        <div className="workspace-status" aria-label={health.data?.status === "ok" ? "API đang hoạt động" : "Đang kiểm tra kết nối API"}><span className={health.data?.status === "ok" ? "live-dot" : "live-dot live-dot-error"} /><span>{health.data ? `API ${health.data.database_latency_ms} ms` : "Đang kiểm tra…"}</span>{health.data?.environment && <span className="environment-badge">{health.data.environment}</span>}{health.data?.latest_run_finished_at && <span className="last-sync">Lịch gần nhất {formatDateTime(health.data.latest_run_finished_at)}</span>}</div>
      </div>
      <main id="main-content" className="main-content" tabIndex={-1}>{children}</main>
    </div>
  </div>;
}
