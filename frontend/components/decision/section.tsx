"use client";

import { Check, ChevronRight } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

interface Props {
  id: string;
  step?: string;
  done?: boolean;
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  defaultOpen?: boolean;
  children: ReactNode;
}

export const OPEN_SECTION_EVENT = "planwise:open-section";

/** Expand a (possibly collapsed) section from elsewhere on the page, e.g. the sticky decision bar. */
export function openSection(id: string) {
  window.dispatchEvent(new CustomEvent(OPEN_SECTION_EVENT, { detail: id }));
}

/** Collapsible workspace section; the open state is remembered per device. */
export function Section({ id, step, done, title, subtitle, actions, defaultOpen = true, children }: Props) {
  const [open, setOpen] = useState(defaultOpen);
  const storageKey = `schedule-os:section:${id}`;
  useEffect(() => {
    let saved: string | null = null;
    try { saved = window.localStorage.getItem(storageKey); } catch { /* storage unavailable */ }
    if (saved === "0" || saved === "1") {
      const timer = window.setTimeout(() => setOpen(saved === "1"), 0);
      return () => window.clearTimeout(timer);
    }
  }, [storageKey]);
  useEffect(() => {
    const onOpen = (event: Event) => { if ((event as CustomEvent<string>).detail === id) setOpen(true); };
    window.addEventListener(OPEN_SECTION_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_SECTION_EVENT, onOpen);
  }, [id]);
  const change = (value: boolean) => {
    setOpen(value);
    try { window.localStorage.setItem(storageKey, value ? "1" : "0"); } catch { /* storage unavailable */ }
  };
  return (
    <Collapsible asChild open={open} onOpenChange={change}>
      <section id={id} aria-labelledby={`${id}-title`} className="min-w-0 scroll-mt-28 border-t pt-5 first:border-t-0">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <CollapsibleTrigger className="group -ml-1 flex min-w-0 items-center gap-2.5 rounded-md px-1 py-0.5 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring">
            {step && (
              <span data-step className={cn("grid size-6 shrink-0 place-items-center rounded-full border text-xs font-semibold", done ? "border-success bg-success text-white dark:text-background" : "border-primary text-primary")}>
                {done ? <Check className="size-3.5" strokeWidth={3} /> : step}
              </span>
            )}
            <span className="grid min-w-0">
              <h2 id={`${id}-title`} className="text-base font-semibold tracking-tight">{title}</h2>
              {subtitle && <span className="text-[13px] text-muted-foreground">{subtitle}</span>}
            </span>
            <ChevronRight className="size-4 shrink-0 text-muted-foreground transition-transform group-data-[state=open]:rotate-90" aria-hidden />
          </CollapsibleTrigger>
          {actions && <div className="w-full sm:ml-auto sm:w-auto">{actions}</div>}
        </div>
        <CollapsibleContent className="mt-4 grid min-w-0 gap-4">{children}</CollapsibleContent>
      </section>
    </Collapsible>
  );
}
