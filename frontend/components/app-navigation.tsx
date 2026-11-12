"use client";

import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { isActive, NAV_GROUPS } from "@/lib/nav";
import { cn } from "@/lib/utils";
import { useI18n } from "./i18n-provider";

export function AppNavigation({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { t } = useI18n();
  const [advanced, setAdvanced] = useState(() => {
    try { return typeof window !== "undefined" && window.localStorage.getItem("planwise:nav-advanced") === "open"; } catch { return false; }
  });
  const toggle = () => { setAdvanced(!advanced); try { window.localStorage.setItem("planwise:nav-advanced", advanced ? "closed" : "open"); } catch { /* convenience only */ } };
  return (
    <nav aria-label={t("Điều hướng chính", "Main navigation")} className="grid gap-5">
      {NAV_GROUPS.map((group) => {
        // Planners rarely need the engineering tools: folded unless opened or one of them is the current page.
        const foldable = Boolean(group.advanced);
        const open = !foldable || advanced || group.items.some((item) => isActive(item.href, pathname));
        return (
        <div key={group.label[0]} className="grid gap-0.5">
          {foldable
            ? <button type="button" onClick={toggle} aria-expanded={open} className="flex items-center gap-1 rounded-md px-2.5 pb-1 text-left text-[11px] font-semibold tracking-wide text-sidebar-foreground uppercase hover:text-sidebar-strong focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none">
                <ChevronRight className={cn("size-3 transition-transform", open && "rotate-90")} aria-hidden />{t(group.label)}
              </button>
            : <span className="px-2.5 pb-1 text-[11px] font-semibold tracking-wide text-sidebar-foreground uppercase">{t(group.label)}</span>}
          {open && group.items.map((item) => {
            const active = isActive(item.href, pathname);
            const Icon = item.icon;
            return (
              <Link key={item.href} href={item.href} onClick={onNavigate} aria-current={active ? "page" : undefined}
                className={cn("flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm font-medium text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-strong focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                  active && "bg-sidebar-active text-sidebar-strong shadow-card ring-1 ring-sidebar-border hover:bg-sidebar-active")}>
                <Icon className={cn("size-4", active && "text-sidebar-primary")} strokeWidth={1.9} aria-hidden />{t(item.label)}
              </Link>
            );
          })}
        </div>
        );
      })}
    </nav>
  );
}
