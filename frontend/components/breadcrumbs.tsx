"use client";

import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useSyncExternalStore } from "react";

import { NAV_ITEMS } from "@/lib/nav";
import { useI18n } from "./i18n-provider";

/* Pages name their own dynamic crumb (dataset name, run id…) through a tiny external store,
   so the top bar can show "Bàn điều độ › Wheel Factory" without refetching anything. */
let crumb: { path: string; label: string } | null = null;
const listeners = new Set<() => void>();
const subscribe = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; };
const snapshot = () => crumb;

export function useCrumb(label: string | undefined) {
  const pathname = usePathname();
  useEffect(() => {
    if (!label) return;
    crumb = { path: pathname, label };
    listeners.forEach((listener) => listener());
  }, [label, pathname]);
}

const EXTRA: Record<string, readonly [string, string]> = {
  "/runs/new": ["Tạo lần chạy", "New run"],
};

export function Breadcrumbs() {
  const pathname = usePathname();
  const { t } = useI18n();
  const named = useSyncExternalStore(subscribe, snapshot, () => null);
  const segments = pathname.split("/").filter(Boolean);
  const root = NAV_ITEMS.find((item) => item.href === `/${segments[0] ?? ""}`) ?? NAV_ITEMS[0];
  const items: Array<{ href: string; label: string }> = [{ href: root.href, label: t(root.label) }];
  if (segments.length > 1) {
    const extra = EXTRA[pathname];
    const dynamic = named?.path === pathname ? named.label : segments[1].length > 12 ? segments[1].slice(0, 8).toUpperCase() : segments[1];
    items.push({ href: pathname, label: extra ? t(extra) : dynamic });
  }
  return (
    <nav aria-label={t("Vị trí hiện tại", "You are here")} className="min-w-0">
      <ol className="flex min-w-0 items-center gap-1 text-sm">
        {items.map((item, index) => {
          const last = index === items.length - 1;
          return (
            <li key={item.href} className="flex min-w-0 items-center gap-1">
              {index > 0 && <ChevronRight className="size-3.5 shrink-0 text-muted-foreground/70" aria-hidden />}
              {last
                ? <span aria-current="page" className="truncate font-semibold">{item.label}</span>
                : <Link href={item.href} className="truncate rounded text-muted-foreground transition-colors hover:text-foreground">{item.label}</Link>}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
