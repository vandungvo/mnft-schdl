"use client";

import { useQuery } from "@tanstack/react-query";
import { CalendarClock, Compass, CornerDownLeft, Database, Languages, Moon, Plus, Search, Upload, type LucideIcon } from "lucide-react";
import { useTheme } from "next-themes";
import { useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { algorithmInfo } from "@/lib/algorithms";
import { listMasterDatasets, listScheduleRuns } from "@/lib/api";
import { formatDateTime, formatInputName } from "@/lib/format";
import { NAV_ITEMS } from "@/lib/nav";
import { cn } from "@/lib/utils";
import { useI18n } from "./i18n-provider";

interface Command {
  id: string;
  group: string;
  label: string;
  hint?: string;
  icon: LucideIcon;
  keywords?: string;
  run: () => void;
}

const PaletteContext = createContext<{ open: () => void } | null>(null);

export function useCommandPalette() {
  const value = useContext(PaletteContext);
  if (!value) throw new Error("useCommandPalette must be used inside CommandPaletteProvider");
  return value;
}

/** Lower-case and strip Vietnamese diacritics so "ban dieu do" finds "Bàn điều độ". */
const fold = (text: string) => text.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d").replace(/Đ/g, "d").toLowerCase();

function isTyping(target: EventTarget | null) {
  const el = target as HTMLElement | null;
  return Boolean(el && (el.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName)));
}

export function CommandPaletteProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const show = useCallback(() => setOpen(true), []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.key === "k" || event.key === "K") && (event.metaKey || event.ctrlKey)) { event.preventDefault(); setOpen((value) => !value); return; }
      if (event.key === "/" && !event.metaKey && !event.ctrlKey && !event.altKey && !isTyping(event.target)) { event.preventDefault(); setOpen(true); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const value = useMemo(() => ({ open: show }), [show]);
  return (
    <PaletteContext.Provider value={value}>
      {children}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent showCloseButton={false} className="top-[12vh] translate-y-0 gap-0 overflow-hidden bg-popover p-0 shadow-float sm:max-w-xl">
          {open && <Palette onClose={() => setOpen(false)} />}
        </DialogContent>
      </Dialog>
    </PaletteContext.Provider>
  );
}

function Palette({ onClose }: { onClose: () => void }) {
  const { t, locale, setLocale } = useI18n();
  const router = useRouter();
  const { resolvedTheme, setTheme } = useTheme();
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);
  const datasets = useQuery({ queryKey: ["master-datasets"], queryFn: () => listMasterDatasets() });
  const runs = useQuery({ queryKey: ["schedule-runs", "palette"], queryFn: () => listScheduleRuns({ limit: 6 }) });

  const go = useCallback((href: string) => () => { onClose(); router.push(href); }, [onClose, router]);

  const commands = useMemo<Command[]>(() => {
    const pages = t("Trang", "Pages");
    const scenarios = t("Kịch bản", "Scenarios");
    const recent = t("Lần chạy gần đây", "Recent runs");
    const actions = t("Hành động", "Actions");
    return [
      ...NAV_ITEMS.map((item) => ({ id: `nav:${item.href}`, group: pages, label: t(item.label), hint: t(item.hint), icon: item.icon, run: go(item.href) })),
      ...(datasets.data?.items ?? []).flatMap((dataset) => [
        { id: `desk:${dataset.id}`, group: scenarios, label: formatInputName(dataset.name), hint: t(`Mở bàn điều độ · rev ${dataset.revision}`, `Open scheduling desk · rev ${dataset.revision}`), icon: Compass, keywords: dataset.name, run: go(`/decide/${dataset.id}`) },
        { id: `data:${dataset.id}`, group: scenarios, label: `${formatInputName(dataset.name)} — ${t("dữ liệu", "data")}`, hint: t(`${dataset.counts.orders} đơn · ${dataset.counts.machines} máy`, `${dataset.counts.orders} orders · ${dataset.counts.machines} machines`), icon: Database, keywords: dataset.name, run: go(`/master-data/${dataset.id}`) },
      ]),
      ...(runs.data?.items ?? []).map((run) => ({ id: `run:${run.id}`, group: recent, label: `${algorithmInfo(run.algorithm).label} · ${formatInputName(run.input_name)}`, hint: `${run.id.slice(0, 8).toUpperCase()} · ${formatDateTime(run.created_at)}`, icon: CalendarClock, keywords: `${run.id} ${run.status}`, run: go(`/runs/${run.id}`) })),
      { id: "act:new-run", group: actions, label: t("Tạo một lần chạy", "Create a single run"), hint: t("Một thuật toán, một nguồn dữ liệu", "One algorithm, one data source"), icon: Plus, run: go("/runs/new") },
      { id: "act:import", group: actions, label: t("Nhập bộ dữ liệu JSON", "Import a JSON dataset"), icon: Upload, keywords: "import json", run: go("/master-data") },
      { id: "act:theme", group: actions, label: resolvedTheme === "dark" ? t("Chuyển sang giao diện sáng", "Switch to light theme") : t("Chuyển sang giao diện tối", "Switch to dark theme"), icon: Moon, keywords: "theme dark light giao dien", run: () => { setTheme(resolvedTheme === "dark" ? "light" : "dark"); onClose(); } },
      { id: "act:lang", group: actions, label: locale === "vi" ? "Switch to English" : "Chuyển sang tiếng Việt", icon: Languages, keywords: "language ngon ngu english tieng viet", run: () => { setLocale(locale === "vi" ? "en" : "vi"); onClose(); } },
    ];
  }, [datasets.data, runs.data, go, t, locale, setLocale, resolvedTheme, setTheme, onClose]);

  const results = useMemo(() => {
    const needle = fold(query.trim());
    if (!needle) return commands;
    const words = needle.split(/\s+/);
    return commands.filter((command) => { const hay = fold(`${command.label} ${command.hint ?? ""} ${command.keywords ?? ""} ${command.group}`); return words.every((word) => hay.includes(word)); });
  }, [commands, query]);
  const index = Math.min(active, Math.max(0, results.length - 1));

  useEffect(() => {
    listRef.current?.querySelector(`[data-index="${index}"]`)?.scrollIntoView({ block: "nearest" });
  }, [index]);

  function onKeyDown(event: React.KeyboardEvent) {
    if (event.key === "ArrowDown") { event.preventDefault(); setActive((index + 1) % Math.max(1, results.length)); }
    else if (event.key === "ArrowUp") { event.preventDefault(); setActive((index - 1 + results.length) % Math.max(1, results.length)); }
    else if (event.key === "Enter") { event.preventDefault(); results[index]?.run(); }
  }

  let lastGroup = "";
  return (
    <>
      <DialogTitle className="sr-only">{t("Bảng lệnh", "Command palette")}</DialogTitle>
      <DialogDescription className="sr-only">{t("Gõ để tìm trang, kịch bản, lần chạy hoặc hành động. Dùng phím mũi tên và Enter.", "Type to find a page, scenario, run or action. Use the arrow keys and Enter.")}</DialogDescription>
      <div className="flex items-center gap-2.5 border-b px-4">
        <Search className="size-4 shrink-0 text-muted-foreground" aria-hidden />
        <input autoFocus value={query} onChange={(event) => { setQuery(event.target.value); setActive(0); }} onKeyDown={onKeyDown}
          role="combobox" aria-expanded aria-controls="palette-list" aria-activedescendant={results[index] ? `palette-${results[index].id}` : undefined}
          placeholder={t("Tìm trang, kịch bản, lần chạy…", "Search pages, scenarios, runs…")} aria-label={t("Tìm lệnh", "Search commands")}
          className="h-12 w-full bg-transparent text-[15px] outline-none placeholder:text-muted-foreground" />
        <kbd className="hidden rounded border bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground sm:inline">Esc</kbd>
      </div>
      <div ref={listRef} id="palette-list" role="listbox" aria-label={t("Kết quả", "Results")} className="max-h-[min(60vh,420px)] overflow-y-auto p-2">
        {results.length === 0 && <p className="px-3 py-8 text-center text-sm text-muted-foreground">{t("Không có kết quả phù hợp.", "No matching results.")}</p>}
        {results.map((command, i) => {
          const header = command.group !== lastGroup ? command.group : null;
          lastGroup = command.group;
          const Icon = command.icon;
          return (
            <div key={command.id}>
              {header && <div className="px-2.5 pt-2.5 pb-1 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">{header}</div>}
              <div id={`palette-${command.id}`} role="option" aria-selected={i === index} data-index={i} onMouseMove={() => { if (i !== index) setActive(i); }} onClick={command.run}
                className={cn("flex cursor-pointer items-center gap-3 rounded-md px-2.5 py-2 text-sm", i === index && "bg-accent text-accent-foreground")}>
                <Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                <span className="min-w-0 flex-1"><span className="block truncate font-medium">{command.label}</span>{command.hint && <span className="block truncate text-xs text-muted-foreground">{command.hint}</span>}</span>
                {i === index && <CornerDownLeft className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />}
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex items-center gap-3 border-t bg-surface-2 px-4 py-2 text-[11px] text-muted-foreground">
        <span><kbd className="rounded border bg-card px-1">↑</kbd> <kbd className="rounded border bg-card px-1">↓</kbd> {t("di chuyển", "move")}</span>
        <span><kbd className="rounded border bg-card px-1">Enter</kbd> {t("mở", "open")}</span>
        <span className="ml-auto"><kbd className="rounded border bg-card px-1">Ctrl</kbd> <kbd className="rounded border bg-card px-1">K</kbd> {t("bật/tắt", "toggle")}</span>
      </div>
    </>
  );
}
