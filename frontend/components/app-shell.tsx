"use client";

import { useQuery } from "@tanstack/react-query";
import { Factory, Menu, Search } from "lucide-react";
import Link from "next/link";
import { useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { getHealth } from "@/lib/api";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { AppNavigation } from "./app-navigation";
import { Breadcrumbs } from "./breadcrumbs";
import { CommandPaletteProvider, useCommandPalette } from "./command-palette";
import { useI18n } from "./i18n-provider";
import { LanguageToggle } from "./language-toggle";
import { ThemeToggle } from "./theme-toggle";

function Brand() {
  return (
    <Link href="/" className="flex items-center gap-2.5 rounded-md px-1 text-[15px] font-bold tracking-tight text-sidebar-strong focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none">
      <span className="grid size-7 place-items-center rounded-md bg-gradient-to-br from-[#2a78d6] to-[#eb6834] text-sm font-extrabold text-white" aria-hidden>P</span>
      PlanWise
    </Link>
  );
}

function SearchButton({ onOpen }: { onOpen?: () => void }) {
  const { t } = useI18n();
  const palette = useCommandPalette();
  return (
    <button type="button" onClick={() => { onOpen?.(); palette.open(); }}
      className="flex h-8 w-full items-center gap-2 rounded-md border border-sidebar-border bg-sidebar-active px-2.5 text-sm text-sidebar-foreground shadow-card transition-colors hover:text-sidebar-strong focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none">
      <Search className="size-3.5" aria-hidden />
      <span className="flex-1 text-left">{t("Tìm nhanh…", "Quick search…")}</span>
      <kbd className="rounded border border-sidebar-border px-1 text-[10px] font-medium">Ctrl K</kbd>
    </button>
  );
}

type Health = ReturnType<typeof useHealth>;
function useHealth() {
  return useQuery({ queryKey: ["health"], queryFn: getHealth, refetchInterval: 30_000 });
}

function SystemStatus({ health }: { health: Health }) {
  const { t } = useI18n();
  const down = health.isError;
  const busy = (health.data?.running_runs ?? 0) + (health.data?.queued_runs ?? 0);
  return (
    <div className="grid gap-1 rounded-md px-2.5 py-2 text-xs text-sidebar-foreground" role="status">
      <span className="flex items-center gap-2 font-medium text-sidebar-strong">
        <span className={cn("size-2 rounded-full", down ? "bg-destructive" : health.data ? "bg-success" : "bg-muted-foreground")} aria-hidden />
        {down ? t("Mất kết nối API", "API unreachable") : health.data ? t("Hệ thống hoạt động", "System online") : t("Đang kiểm tra…", "Checking…")}
      </span>
      {health.data && <span>{busy ? t(`${busy} lần chạy đang xử lý`, `${busy} runs in progress`) : t("Hàng đợi trống", "Queue is empty")} · DB {health.data.database_latency_ms} ms</span>}
      {health.data?.latest_run_finished_at && <span>{t("Lịch gần nhất", "Latest schedule")} {formatDateTime(health.data.latest_run_finished_at)}</span>}
    </div>
  );
}

function SidebarBody({ onNavigate, health }: { onNavigate?: () => void; health: Health }) {
  const { t } = useI18n();
  return (
    <div className="flex h-full min-w-0 flex-col gap-5 overflow-y-auto border-r border-sidebar-border bg-sidebar px-3 py-4 text-sidebar-foreground">
      <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-3">
        <Brand />
        <div className="flex items-center gap-2 rounded-md px-1 text-xs">
          <Factory className="size-3.5 shrink-0" aria-hidden />
          <span className="min-w-0 truncate"><span className="font-semibold text-sidebar-strong">{t("Nhà máy linh kiện mẫu", "Sample components plant")}</span> · Asia/Ho_Chi_Minh</span>
        </div>
        <SearchButton onOpen={onNavigate} />
      </div>
      <AppNavigation onNavigate={onNavigate} />
      <div className="mt-auto border-t border-sidebar-border pt-3"><SystemStatus health={health} /></div>
    </div>
  );
}

function MobileSearch() {
  const { t } = useI18n();
  const palette = useCommandPalette();
  return <Button variant="ghost" size="icon-sm" className="md:hidden" aria-label={t("Tìm nhanh", "Quick search")} onClick={palette.open}><Search /></Button>;
}

export function AppShell({ children }: { children: ReactNode }) {
  const { t } = useI18n();
  const [menuOpen, setMenuOpen] = useState(false);
  const health = useHealth();
  const env = health.data?.environment;

  return (
    <CommandPaletteProvider>
      <div className="min-h-screen md:grid md:grid-cols-[232px_minmax(0,1fr)]">
        <a href="#main-content" className="fixed top-2 left-2 z-[100] -translate-y-24 rounded-md bg-primary px-3 py-2 text-primary-foreground focus:translate-y-0">{t("Bỏ qua điều hướng", "Skip to content")}</a>
        <aside className="sticky top-0 hidden h-screen md:block"><SidebarBody health={health} /></aside>
        <div className="min-w-0">
          <header className="sticky top-0 z-40 flex h-12 items-center justify-between gap-3 border-b bg-background/85 px-4 backdrop-blur md:px-6 lg:px-8">
            <div className="flex min-w-0 items-center gap-1.5">
              <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
                <SheetTrigger asChild><Button variant="ghost" size="icon-sm" className="md:hidden" aria-label={t("Mở menu", "Open menu")}><Menu /></Button></SheetTrigger>
                <SheetContent side="left" className="w-[264px] border-0 p-0">
                  <SheetTitle className="sr-only">{t("Điều hướng", "Navigation")}</SheetTitle>
                  <SheetDescription className="sr-only">{t("Các trang chính của PlanWise", "Main pages of PlanWise")}</SheetDescription>
                  <SidebarBody onNavigate={() => setMenuOpen(false)} health={health} />
                </SheetContent>
              </Sheet>
              <Breadcrumbs />
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              {health.isError && <span className="hidden items-center gap-1.5 rounded-full bg-danger-soft px-2 py-0.5 text-xs font-medium text-destructive sm:flex"><span className="size-1.5 rounded-full bg-destructive" />{t("Mất kết nối API", "API unreachable")}</span>}
              {env && env !== "production" && (
                <Tooltip><TooltipTrigger asChild><span tabIndex={0} className="hidden rounded-full bg-info-soft px-2 py-0.5 text-xs font-medium text-primary lg:inline">{env}</span></TooltipTrigger>
                  <TooltipContent>{t("Môi trường backend đang kết nối", "Backend environment in use")}</TooltipContent></Tooltip>
              )}
              <MobileSearch />
              <LanguageToggle />
              <ThemeToggle />
            </div>
          </header>
          <main id="main-content" tabIndex={-1} className="mx-auto w-full min-w-0 max-w-[1400px] px-4 pt-5 pb-24 outline-none md:px-6 lg:px-8">{children}</main>
        </div>
      </div>
    </CommandPaletteProvider>
  );
}
