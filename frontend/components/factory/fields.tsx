"use client";

import { CalendarDays, Trash2 } from "lucide-react";
import { usePathname, useSearchParams } from "next/navigation";
import { createContext, useCallback, useContext, useId, useRef, useState, type ReactNode } from "react";

import { useI18n } from "@/components/i18n-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { isFactorySection, type ConfigIssue, type FactorySection } from "@/lib/factory-config";
import type { FactoryConfig } from "@/lib/factory-types";
import { cn } from "@/lib/utils";

export type Update = (mutate: (config: FactoryConfig) => void) => void;

/* ---------- URL state: ?section=machines&item=CAST_1 (reload/share keeps the section and the open record) ---------- */

export function useFactoryLocation() {
  const params = useSearchParams();
  const pathname = usePathname();
  const raw = params.get("section");
  const section: FactorySection = isFactorySection(raw) ? raw : "process";
  const item = params.get("item");
  const navigate = useCallback((next: { section?: FactorySection; item?: string | null }) => {
    const query = new URLSearchParams(window.location.search);
    if (next.section) { query.set("section", next.section); if (next.item === undefined) query.delete("item"); }
    if (next.item === null) query.delete("item");
    else if (next.item) query.set("item", next.item);
    if (query.get("section") === "process") query.delete("section");
    window.history.pushState(null, "", `${pathname}${query.size ? `?${query.toString()}` : ""}`);
  }, [pathname]);
  return { section, item, navigate };
}

/* ---------- editing context: the draft, the saved version it started from, and the draft's problems ---------- */

interface FactoryEdit {
  config: FactoryConfig;
  /** The saved config (null while nothing is edited) — fields compare against it to show "changed". */
  base: FactoryConfig | null;
  update: Update;
  issues: ConfigIssue[];
}

const EditCtx = createContext<FactoryEdit | null>(null);

export function FactoryEditProvider({ value, children }: { value: FactoryEdit; children: ReactNode }) {
  return <EditCtx.Provider value={value}>{children}</EditCtx.Provider>;
}

export function useFactoryEdit(): FactoryEdit {
  const value = useContext(EditCtx);
  if (!value) throw new Error("useFactoryEdit must be used inside FactoryEditProvider");
  return value;
}

/** Issues of one record (optionally one field) in a section. */
export function useIssues(section: Exclude<FactorySection, "versions">, ref?: string, field?: string): ConfigIssue[] {
  const { issues } = useFactoryEdit();
  return issues.filter((issue) => issue.section === section && (ref === undefined || issue.ref === ref) && (field === undefined || issue.field === field || (field === "breaks" && issue.field?.startsWith("break"))));
}

export function IssueText({ issues, className }: { issues: ConfigIssue[]; className?: string }) {
  const { t } = useI18n();
  if (!issues.length) return null;
  return <p role="alert" className={cn("text-xs text-destructive", className)}>{issues.map((issue) => t(issue.vi, issue.en)).join(" ")}</p>;
}

/** Edited-but-unsaved tint, shared by every field of the page. */
export const changedClass = "border-warning/60 bg-warning-soft";

/* ---------- number: free typing (blank allowed while typing), clamped on blur ---------- */

interface NumberFieldProps {
  value: number;
  onChange: (value: number) => void;
  label: string;
  min?: number;
  max?: number;
  step?: number;
  changed?: boolean;
  invalid?: boolean;
  className?: string;
  id?: string;
}

const clampNumber = (value: number, min: number, max?: number) => Math.min(max ?? Infinity, Math.max(min, value));

export function NumberField({ value, onChange, label, min = 0, max, step = 1, changed, invalid, className, id }: NumberFieldProps) {
  const [text, setText] = useState(String(value));
  const [seen, setSeen] = useState(value);
  const [focused, setFocused] = useState(false);
  if (value !== seen) { setSeen(value); if (!focused || Number(text) !== value) setText(String(value)); }
  const parsed = text.trim() === "" ? NaN : Number(text);
  const outOfRange = Number.isFinite(parsed) && (parsed < min || (max !== undefined && parsed > max));
  return (
    <Input id={id} type="number" inputMode="decimal" step={step} min={min} max={max} value={text} aria-label={label} aria-invalid={invalid || outOfRange || undefined}
      onFocus={() => setFocused(true)}
      onChange={(event) => {
        setText(event.target.value);
        const next = Number(event.target.value);
        if (event.target.value.trim() !== "" && Number.isFinite(next) && next >= min && (max === undefined || next <= max)) onChange(next);
      }}
      onBlur={() => {
        setFocused(false);
        const next = Number.isFinite(parsed) ? clampNumber(parsed, min, max) : value;
        setText(String(next));
        if (next !== value) onChange(next);
      }}
      className={cn("h-8 text-right tabular-nums", changed && changedClass, className)} />
  );
}

/* ---------- time of day: always 24-hour "HH:MM", whatever the browser locale ---------- */

function parseHm(text: string, allowMidnightEnd: boolean): number | null {
  const match = /^(\d{1,2})(?:[:.h]?(\d{2}))?$/.exec(text.trim());
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2] ?? 0);
  if (minutes > 59) return null;
  const total = hours * 60 + minutes;
  if (total === 1440 && allowMidnightEnd) return 1440;
  return hours <= 23 ? total : null;
}

const formatHm = (minute: number) => `${String(Math.floor(minute / 60)).padStart(2, "0")}:${String(minute % 60).padStart(2, "0")}`;

interface TimeFieldProps {
  /** Minutes from midnight. */
  value: number;
  onChange: (minute: number) => void;
  label: string;
  /** End times may be 24:00 (= 1440). */
  end?: boolean;
  changed?: boolean;
  invalid?: boolean;
  className?: string;
}

export function TimeField({ value, onChange, label, end, changed, invalid, className }: TimeFieldProps) {
  const [text, setText] = useState(formatHm(value));
  const [seen, setSeen] = useState(value);
  if (value !== seen) { setSeen(value); setText(formatHm(value)); }
  const parsed = parseHm(text, !!end);
  return (
    <Input value={text} inputMode="numeric" placeholder="HH:MM" aria-label={label} aria-invalid={invalid || parsed === null || undefined} maxLength={5}
      title={end ? "00:00 – 24:00" : "00:00 – 23:59"}
      onChange={(event) => {
        setText(event.target.value);
        const next = parseHm(event.target.value, !!end);
        if (next !== null && /^\d{1,2}[:.h]\d{2}$/.test(event.target.value.trim())) onChange(next);
      }}
      onBlur={() => {
        const next = parseHm(text, !!end);
        if (next === null) { setText(formatHm(value)); return; }
        setText(formatHm(next));
        if (next !== value) onChange(next);
      }}
      className={cn("h-8 w-[4.75rem] text-center font-medium tabular-nums", changed && changedClass, className)} />
  );
}

/* ---------- date: shown as dd/mm/yyyy (the factory's way), native picker on the button ---------- */

const isoToDmy = (iso: string) => (iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}` : "");

function dmyToIso(text: string): string | null {
  const match = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/.exec(text.trim());
  if (!match) return null;
  const [day, month, year] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

interface DateFieldProps {
  /** ISO date ("2026-10-27") or "" when empty. */
  value: string;
  onChange: (iso: string) => void;
  label: string;
  placeholder?: string;
  className?: string;
  /** Called on Enter with a valid date (e.g. "add holiday"). */
  onSubmit?: () => void;
}

export function DateField({ value, onChange, label, placeholder, className, onSubmit }: DateFieldProps) {
  const { t } = useI18n();
  const pickerRef = useRef<HTMLInputElement>(null);
  const [text, setText] = useState(isoToDmy(value));
  const [seen, setSeen] = useState(value);
  if (value !== seen) { setSeen(value); setText(isoToDmy(value)); }
  const invalid = text.trim() !== "" && dmyToIso(text) === null;
  const id = useId();
  return (
    <div className={cn("relative flex h-8 items-center", className)}>
      <Input id={id} value={text} inputMode="numeric" placeholder={placeholder ?? "dd/mm/yyyy"} aria-label={label} aria-invalid={invalid || undefined} className="h-8 pr-9 tabular-nums"
        onChange={(event) => {
          setText(event.target.value);
          if (event.target.value.trim() === "") onChange("");
          else { const iso = dmyToIso(event.target.value); if (iso) onChange(iso); }
        }}
        onBlur={() => { if (invalid) setText(isoToDmy(value)); }}
        onKeyDown={(event) => { if (event.key === "Enter" && !invalid && value) onSubmit?.(); }} />
      <button type="button" aria-label={t("Chọn ngày", "Pick a date")} className="absolute right-1 grid size-6 place-items-center rounded text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none [&_svg]:size-4"
        onClick={() => { const picker = pickerRef.current; if (!picker) return; try { picker.showPicker(); } catch { picker.focus(); } }}>
        <CalendarDays />
      </button>
      <input ref={pickerRef} type="date" tabIndex={-1} aria-hidden className="pointer-events-none absolute right-0 bottom-0 size-px opacity-0" value={value} onChange={(event) => onChange(event.target.value)} />
    </div>
  );
}

/* ---------- quiet destructive icon button (muted until hovered) ---------- */

export function DeleteButton({ label, disabled, title, onClick, className }: { label: string; disabled?: boolean; title?: string; onClick: () => void; className?: string }) {
  return (
    <Button type="button" variant="ghost" size="icon" aria-label={label} title={title ?? label} disabled={disabled} onClick={onClick}
      className={cn("size-8 text-muted-foreground hover:bg-danger-soft hover:text-destructive", className)}>
      <Trash2 />
    </Button>
  );
}

/* ---------- record drawer: edits go straight into the draft; the save bar turns them into a version ---------- */

export function EditSheet({ open, onClose, title, description, actions, children, wide }: { open: boolean; onClose: () => void; title: ReactNode; description?: ReactNode; actions?: ReactNode; children: ReactNode; wide?: boolean }) {
  const { t } = useI18n();
  return (
    <Sheet open={open} onOpenChange={(next) => { if (!next) onClose(); }}>
      <SheetContent className={cn("w-full gap-0 p-0 sm:max-w-lg", wide && "sm:max-w-3xl")}>
        <SheetHeader className="border-b pr-12">
          <SheetTitle className="text-base">{title}</SheetTitle>
          <SheetDescription>{description ?? t("Thay đổi ghi vào bản nháp; bấm “Lưu” ở thanh dưới trang để tạo phiên bản mới.", "Changes go into the draft; press “Save” in the bar at the bottom of the page to create a version.")}</SheetDescription>
        </SheetHeader>
        <div className="min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto p-4">{children}</div>
        <SheetFooter className="flex-row flex-wrap items-center gap-2 border-t bg-surface-2">
          <div className="mr-auto flex flex-wrap gap-2">{actions}</div>
          <Button onClick={onClose}>{t("Xong", "Done")}</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

/** "Default: F silver" placeholder, so an empty display name never looks like a typed one. */
export function defaultPlaceholder(t: (vi: string, en: string) => string, fallback: string): string {
  return t(`Mặc định: ${fallback}`, `Default: ${fallback}`);
}
