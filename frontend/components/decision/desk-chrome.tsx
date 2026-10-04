"use client";

import { Check, CheckCircle2, Loader2 } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";

import { useI18n } from "@/components/i18n-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Scroll-spy: the last section whose top has passed just under the sticky bars; at the page bottom, the last one. */
export function useActiveSection(ids: string[], layoutKey = ""): string | null {
  const [active, setActive] = useState<string | null>(null);
  const key = ids.join("|");
  useEffect(() => {
    let frame = 0;
    const compute = () => {
      frame = 0;
      const present = key.split("|").map((id) => document.getElementById(id)).filter((el): el is HTMLElement => Boolean(el));
      if (!present.length) return;
      const atBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4;
      let current = present[0].id;
      for (const el of present) if (el.getBoundingClientRect().top <= 140) current = el.id;
      if (atBottom) {
        const visible = present.filter((el) => el.getBoundingClientRect().top < window.innerHeight);
        const stepped = visible.filter((el) => el.querySelector("[data-step]"));
        if (stepped.length) current = stepped[stepped.length - 1].id;
      }
      setActive(current);
    };
    const schedule = () => { if (!frame) frame = window.requestAnimationFrame(compute); };
    schedule();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => { window.removeEventListener("scroll", schedule); window.removeEventListener("resize", schedule); if (frame) window.cancelAnimationFrame(frame); };
  }, [key, layoutKey]);
  return active;
}

/** True while any part of the element is on screen (used to hide the decision bar over the commit form). */
export function useInView(id: string, layoutKey = ""): boolean {
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = document.getElementById(id);
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { rootMargin: "0px 0px -80px 0px" });
    observer.observe(el);
    return () => observer.disconnect();
  }, [id, layoutKey]);
  return inView;
}

export function scrollToSection(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
}

export type StepState = "done" | "todo" | "busy";

export interface DeskStep {
  id: string;
  label: string;
  detail: string;
  state: StepState;
}

/** Sticky progress strip: the four jobs of the desk, each with live status (APS "scenario bar" pattern). */
export function DeskProgress({ steps, active, aside }: { steps: DeskStep[]; active: string | null; aside?: ReactNode }) {
  const { t } = useI18n();
  return (
    <div className="sticky top-12 z-30 -mx-4 border-b bg-background/90 px-4 py-2 backdrop-blur md:-mx-6 md:px-6 lg:-mx-8 lg:px-8">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5">
        <nav aria-label={t("Các bước điều độ", "Scheduling steps")} className="min-w-0 max-w-full">
          <ol className="flex items-center gap-1 overflow-x-auto [scrollbar-width:none]">
            {steps.map((step, index) => {
              const current = active === step.id;
              return (
                <li key={step.id} className="flex shrink-0 items-center gap-1">
                  {index > 0 && <span className="h-px w-3 bg-border sm:w-5" aria-hidden />}
                  <a href={`#${step.id}`} onClick={(event) => { event.preventDefault(); scrollToSection(step.id); }} aria-current={current ? "step" : undefined}
                    className={cn("group flex items-center gap-2 rounded-md px-2 py-1 text-left transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none", current && "bg-accent hover:bg-accent")}>
                    <span className={cn("grid size-5 shrink-0 place-items-center rounded-full border text-[11px] font-semibold",
                      step.state === "done" ? "border-success bg-success text-white dark:text-background" : current ? "border-primary text-primary" : "text-muted-foreground")}>
                      {step.state === "done" ? <Check className="size-3" strokeWidth={3} /> : step.state === "busy" ? <Loader2 className="size-3 animate-spin" /> : index + 1}
                    </span>
                    <span className="grid leading-tight">
                      <span className={cn("text-[13px] font-medium whitespace-nowrap", current ? "text-foreground" : "text-muted-foreground group-hover:text-foreground")}>{step.label}</span>
                      <span className="hidden max-w-40 truncate text-[11px] text-muted-foreground 2xl:block">{step.detail}</span>
                    </span>
                  </a>
                </li>
              );
            })}
          </ol>
        </nav>
        {aside}
      </div>
    </div>
  );
}

interface DecisionBarProps {
  name: string;
  rank: number | null;
  committed: boolean;
  metrics: Array<[string, string, boolean?]>;
  compareName: string | null;
  onCommit: () => void;
  onView: () => void;
}

/** Sticky bottom bar: what you are looking at and the one primary action, always in reach. */
export function DecisionBar({ name, rank, committed, metrics, compareName, onCommit, onView }: DecisionBarProps) {
  const { t } = useI18n();
  return (
    <div className="sticky bottom-3 z-30 mt-2" role="region" aria-label={t("Phương án đang xem", "Option being viewed")}>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border bg-popover/95 px-3 py-2 shadow-float backdrop-blur sm:px-4">
        <button type="button" onClick={onView} className="flex min-w-0 items-center gap-2 rounded-md text-left focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none">
          <span className="text-xs text-muted-foreground">{t("Đang xem", "Viewing")}</span>
          {rank != null && <Badge variant={rank === 1 ? "success" : "secondary"}>#{rank}</Badge>}
          <strong className="truncate text-sm font-semibold">{name}</strong>
          {committed && <Badge variant="info"><CheckCircle2 />{t("Đã chốt", "Committed")}</Badge>}
        </button>
        <dl className="hidden items-center gap-4 text-xs xl:flex">
          {metrics.map(([label, value, warn]) => (
            <div key={label} className="flex items-baseline gap-1.5"><dt className="text-muted-foreground">{label}</dt><dd className={cn("font-semibold tabular-nums", warn && "text-warning")}>{value}</dd></div>
          ))}
        </dl>
        {compareName && <span className="hidden text-xs text-muted-foreground 2xl:inline">{t("so với", "vs")} <b className="font-medium text-foreground">{compareName}</b></span>}
        <Button size="sm" className="ml-auto" onClick={onCommit}><CheckCircle2 />{committed ? t("Chốt lại", "Commit again") : t("Chốt phương án", "Commit option")}</Button>
      </div>
    </div>
  );
}
