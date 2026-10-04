"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";

import { useI18n } from "@/components/i18n-provider";
import { Button } from "@/components/ui/button";
import { useCrumb } from "@/components/breadcrumbs";
import { cn } from "@/lib/utils";

export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={cn("mb-1 block text-xs font-semibold text-muted-foreground", className)}>{children}</span>;
}

interface PageHeaderProps {
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  /** Back link, shown on small screens only — the top bar breadcrumbs cover it on desktop. */
  back?: { href: string; label: string };
  actions?: ReactNode;
  /** Name for the dynamic breadcrumb (dataset name, run id…). */
  crumb?: string;
  /** Badges/meta shown next to the title. */
  meta?: ReactNode;
}

export function PageHeader({ eyebrow, title, description, back, actions, crumb, meta }: PageHeaderProps) {
  useCrumb(crumb);
  return (
    <header className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
      <div className="min-w-0">
        {back && <Link href={back.href} className="mb-2 inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground md:hidden"><ArrowLeft className="size-4" />{back.label}</Link>}
        {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
          <h1 className="text-2xl leading-tight font-semibold tracking-tight break-words">{title}</h1>
          {meta}
        </div>
        {description && <p className="mt-1.5 max-w-[80ch] text-sm leading-relaxed text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2 md:justify-end">{actions}</div>}
    </header>
  );
}

export function SectionHeading({ eyebrow, title, aside, className }: { eyebrow?: ReactNode; title: ReactNode; aside?: ReactNode; className?: string }) {
  return (
    <div className={cn("mt-8 mb-3 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between", className)}>
      <div>{eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}<h2 className="text-base font-semibold tracking-tight">{title}</h2></div>
      {aside}
    </div>
  );
}

/** Filter/search toolbar that sits above a list or table. */
export function FilterBar({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("mb-3 flex flex-col gap-2 md:flex-row md:items-center", className)}>{children}</div>;
}

export type Tone = "default" | "ok" | "warn" | "danger" | "info";

const toneText: Record<Tone, string> = { default: "", ok: "text-success", warn: "text-warning", danger: "text-destructive", info: "text-primary" };

export function StatTile({ label, value, tone = "default", hint, className }: { label: ReactNode; value: ReactNode; tone?: Tone; hint?: ReactNode; className?: string }) {
  return (
    <div className={cn("min-w-0 rounded-lg border bg-card px-3.5 py-3 shadow-card", className)}>
      <div className="text-xs font-medium text-muted-foreground">{label}</div>
      <div className={cn("mt-1 text-xl font-semibold tracking-tight break-words tabular-nums", toneText[tone])}>{value}</div>
      {hint && <div className="mt-0.5 text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
}

export function EmptyState({ icon, title, description, action, className }: { icon?: ReactNode; title: ReactNode; description?: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-col items-center rounded-lg border border-dashed bg-card px-6 py-12 text-center", className)}>
      {icon && <div className="mb-3 grid size-10 place-items-center rounded-lg bg-accent text-primary [&_svg]:size-5">{icon}</div>}
      <h2 className="text-base font-semibold">{title}</h2>
      {description && <p className="mt-1 max-w-[60ch] text-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Pagination({ page, pageCount, busy, onChange, label }: { page: number; pageCount: number; busy?: boolean; onChange: (page: number) => void; label: string }) {
  const { t } = useI18n();
  if (pageCount <= 1) return null;
  return (
    <nav className="mt-4 flex items-center justify-between gap-3 sm:justify-center" aria-label={label}>
      <Button variant="outline" size="sm" disabled={page === 1 || busy} onClick={() => onChange(page - 1)}>← {t("Trước", "Previous")}</Button>
      <span className="text-sm text-muted-foreground">{t("Trang", "Page")} <strong className="text-foreground">{page}</strong> / {pageCount}</span>
      <Button variant="outline" size="sm" disabled={page >= pageCount || busy} onClick={() => onChange(page + 1)}>{t("Sau", "Next")} →</Button>
    </nav>
  );
}

export function Field({ label, hint, children, className }: { label: ReactNode; hint?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <label className={cn("grid gap-1.5", className)}>
      <span className="text-xs font-semibold text-muted-foreground">{label}</span>
      {children}
      {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
    </label>
  );
}

export function StepBadge({ children }: { children: ReactNode }) {
  return <span className="grid size-6 shrink-0 place-items-center rounded-full bg-accent text-xs font-semibold text-primary">{children}</span>;
}

/** Content card used across pages: optional title row, body padding unless `flush`. */
export function Panel({ title, description, actions, children, className, flush }: { title?: ReactNode; description?: ReactNode; actions?: ReactNode; children: ReactNode; className?: string; flush?: boolean }) {
  return (
    <section className={cn("min-w-0 rounded-lg border bg-card text-card-foreground shadow-card", !flush && "p-4 sm:p-5", className)}>
      {(title || actions) && (
        <div className={cn("mb-3 flex flex-wrap items-start justify-between gap-3", flush && "px-4 pt-4 sm:px-5")}>
          <div className="min-w-0">
            {title && <h3 className="text-sm font-semibold">{title}</h3>}
            {description && <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>}
          </div>
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}

export function Hint({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cn("mt-2 text-[13px] leading-relaxed text-muted-foreground", className)}>{children}</p>;
}

export function Chip({ children }: { children: ReactNode }) {
  return <span className="rounded-md bg-muted px-2.5 py-0.5 text-[13px] [&_b]:font-semibold">{children}</span>;
}

export function Meter({ value, tone = "default", marker, label }: { value: number; tone?: "default" | "ok" | "warn"; marker?: number; label?: string }) {
  return (
    <span className="relative block h-2 min-w-20 overflow-hidden rounded-full bg-grid" title={label}>
      <i className={cn("block h-full rounded-full", tone === "warn" ? "bg-warning" : tone === "ok" ? "bg-success" : "bg-primary")} style={{ width: `${Math.max(0, Math.min(1, value)) * 100}%` }} />
      {marker != null && <em className="absolute inset-y-0 w-0.5 bg-foreground/50" style={{ left: `${marker * 100}%` }} />}
    </span>
  );
}

export function DescList({ items }: { items: Array<[ReactNode, ReactNode]> }) {
  return (
    <dl className="divide-y text-sm">
      {items.map(([term, value], index) => (
        <div key={index} className="grid gap-1 py-2.5 sm:grid-cols-[180px_minmax(0,1fr)] sm:gap-4">
          <dt className="text-muted-foreground">{term}</dt>
          <dd className="break-words">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function FormStep({ step, title, description, children }: { step: string; title: string; description: ReactNode; children: ReactNode }) {
  return (
    <section className="rounded-lg border bg-card p-5 shadow-card">
      <div className="mb-5 flex items-start gap-3 border-b pb-4"><StepBadge>{step}</StepBadge><div><h2 className="text-sm font-semibold">{title}</h2><p className="text-sm text-muted-foreground">{description}</p></div></div>
      {children}
    </section>
  );
}
