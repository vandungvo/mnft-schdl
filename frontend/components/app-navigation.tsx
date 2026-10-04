"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { isActive, NAV_GROUPS } from "@/lib/nav";
import { cn } from "@/lib/utils";
import { useI18n } from "./i18n-provider";

export function AppNavigation({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { t } = useI18n();
  return (
    <nav aria-label={t("Điều hướng chính", "Main navigation")} className="grid gap-5">
      {NAV_GROUPS.map((group) => (
        <div key={group.label[0]} className="grid gap-0.5">
          <span className="px-2.5 pb-1 text-[11px] font-semibold tracking-wide text-sidebar-foreground/70 uppercase">{t(group.label)}</span>
          {group.items.map((item) => {
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
      ))}
    </nav>
  );
}
