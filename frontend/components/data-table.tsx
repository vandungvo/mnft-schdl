"use client";

import { ArrowDown, ArrowUp, ArrowUpDown, ChevronDown, Search, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState, type ReactNode } from "react";

import { Pagination } from "@/components/blocks";
import { useI18n } from "@/components/i18n-provider";
import { DropdownMenu, DropdownMenuContent, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

/* Shared list pattern (Databricks entity lists): one dense table, sortable columns, whole row opens the object,
   filters as chips above it. Sorting and paging happen on the client — the lists here are small and the API has no sort. */

export interface Column<T> {
  id: string;
  header: ReactNode;
  cell: (row: T) => ReactNode;
  /** Present → the column is sortable by this value (null sorts last). */
  sortValue?: (row: T) => string | number | null;
  align?: "right";
  className?: string;
}

export type SortState = { id: string; desc: boolean };

export function DataTable<T>({ rows, columns, rowKey, rowHref, initialSort, pageSize = 20, label, empty, busy, selectedKey }: {
  rows: T[];
  columns: Column<T>[];
  rowKey: (row: T) => string;
  /** Whole row navigates here; keep a real link in one cell for keyboard and "open in new tab". */
  rowHref?: (row: T) => string;
  initialSort?: SortState;
  pageSize?: number;
  label: string;
  empty?: ReactNode;
  busy?: boolean;
  selectedKey?: string | null;
}) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const [sort, setSort] = useState<SortState | null>(initialSort ?? null);
  const [page, setPage] = useState(1);

  const sorted = useMemo(() => {
    const column = sort && columns.find((item) => item.id === sort.id);
    if (!column?.sortValue) return rows;
    const value = column.sortValue;
    const collator = new Intl.Collator(locale, { numeric: true, sensitivity: "base" });
    return [...rows].sort((a, b) => {
      const x = value(a), y = value(b);
      if (x == null || y == null) return x == null ? (y == null ? 0 : 1) : -1;
      const order = typeof x === "number" && typeof y === "number" ? x - y : collator.compare(String(x), String(y));
      return sort!.desc ? -order : order;
    });
  }, [rows, columns, sort, locale]);

  const pageCount = Math.max(1, Math.ceil(sorted.length / pageSize));
  const current = Math.min(page, pageCount); // a filter may shrink the list under the current page
  const visible = sorted.slice((current - 1) * pageSize, current * pageSize);

  const toggle = (id: string) => {
    setSort((prev) => (prev?.id !== id ? { id, desc: false } : prev.desc ? null : { id, desc: true }));
    setPage(1);
  };

  if (rows.length === 0 && empty) return <>{empty}</>;
  return (
    <>
      <div className={cn("min-w-0 rounded-lg border bg-card shadow-card transition-opacity", busy && "opacity-70")}>
        <Table aria-label={label}>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              {columns.map((column, index) => {
                const active = sort?.id === column.id;
                const edge = cn(index === 0 && "pl-4", index === columns.length - 1 && "pr-4");
                return (
                  <TableHead key={column.id} className={cn(column.align === "right" && "text-right", edge, column.className)}
                    aria-sort={active ? (sort!.desc ? "descending" : "ascending") : column.sortValue ? "none" : undefined}>
                    {column.sortValue ? (
                      <button type="button" onClick={() => toggle(column.id)}
                        className={cn("-mx-1 inline-flex min-h-6 items-center gap-1 rounded px-1 font-medium hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none", column.align === "right" && "flex-row-reverse", active && "text-foreground")}>
                        {column.header}
                        {active ? (sort!.desc ? <ArrowDown className="size-3.5" aria-hidden /> : <ArrowUp className="size-3.5" aria-hidden />) : <ArrowUpDown className="size-3.5 opacity-40" aria-hidden />}
                      </button>
                    ) : column.header}
                  </TableHead>
                );
              })}
            </TableRow>
          </TableHeader>
          <TableBody>
            {visible.map((row) => {
              const key = rowKey(row);
              const href = rowHref?.(row);
              return (
                <TableRow key={key} data-state={key === selectedKey ? "selected" : undefined} className={cn(href && "cursor-pointer")}
                  onClick={href ? (event) => { if (!(event.target as HTMLElement).closest("a,button,input,[role=menuitem]")) router.push(href); } : undefined}>
                  {columns.map((column, index) => (
                    <TableCell key={column.id} className={cn(column.align === "right" && "text-right tabular-nums", index === 0 && "pl-4", index === columns.length - 1 && "pr-4", column.className)}>{column.cell(row)}</TableCell>
                  ))}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
      <Pagination page={current} pageCount={pageCount} onChange={setPage} label={t(`Phân trang · ${label}`, `Pagination · ${label}`)} />
    </>
  );
}

/* ---------- toolbar: search + filter chips ---------- */

export interface ChipOption { value: string; label: string; count?: number }

/** "Status ▾" when empty; "Status: Failed ✕" when set — the active filter reads as a sentence and clears in one click. */
export function FilterChip({ label, value, options, onChange }: { label: string; value: string | null; options: ChipOption[]; onChange: (value: string | null) => void }) {
  const { t } = useI18n();
  const selected = options.find((option) => option.value === value);
  return (
    <span className={cn("inline-flex h-8 items-stretch overflow-hidden rounded-full border text-sm", selected ? "border-primary/50 bg-accent text-accent-foreground" : "bg-card")}>
      <DropdownMenu>
        <DropdownMenuTrigger className="inline-flex items-center gap-1 pr-2 pl-3 font-medium outline-none hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset">
          {label}{selected && <>: <span className="max-w-40 truncate font-semibold">{selected.label}</span></>}
          <ChevronDown className="size-3.5 opacity-60" aria-hidden />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="min-w-52">
          <DropdownMenuRadioGroup value={value ?? ""} onValueChange={(next) => onChange(next || null)}>
            <DropdownMenuRadioItem value="">{t("Tất cả", "All")}</DropdownMenuRadioItem>
            {options.map((option) => (
              <DropdownMenuRadioItem key={option.value} value={option.value}>
                <span className="flex-1 truncate">{option.label}</span>
                {option.count !== undefined && <span className="ml-3 text-xs text-muted-foreground tabular-nums">{option.count}</span>}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
      {selected && (
        <button type="button" onClick={() => onChange(null)} aria-label={t(`Bỏ lọc ${label}`, `Clear ${label} filter`)}
          className="grid w-7 place-items-center border-l border-primary/30 hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-inset">
          <X className="size-3.5" aria-hidden />
        </button>
      )}
    </span>
  );
}

export function TableToolbar({ search, onSearch, placeholder, children, count, onClear, busy }: {
  search: string; onSearch: (value: string) => void; placeholder: string; children?: ReactNode; count: number; onClear?: () => void; busy?: boolean;
}) {
  const { t } = useI18n();
  return (
    <div className="mb-3 flex flex-col gap-2 md:flex-row md:flex-wrap md:items-center">
      <div className="relative md:w-72">
        <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <Input type="search" aria-label={placeholder} className="h-8 pl-8" value={search} onChange={(event) => onSearch(event.target.value)} placeholder={placeholder} />
      </div>
      {children && <div className="flex flex-wrap items-center gap-2" role="group" aria-label={t("Bộ lọc", "Filters")}>{children}</div>}
      {onClear && <button type="button" onClick={onClear} className="min-h-6 self-start text-sm font-medium text-primary hover:underline md:self-auto">{t("Xóa lọc", "Clear filters")}</button>}
      <span className="text-sm text-muted-foreground md:ml-auto" role="status"><strong className="text-foreground tabular-nums">{count}</strong> {t("kết quả", "results")}{busy ? t(" · đang cập nhật…", " · updating…") : ""}</span>
    </div>
  );
}

/** Accent-insensitive match ("ban dieu do" finds "Bàn điều độ"). */
export function matches(query: string, ...fields: Array<string | null | undefined>): boolean {
  const fold = (value: string) => value.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/gi, "d").toLowerCase();
  const needle = fold(query.trim());
  return !needle || fields.some((field) => field != null && fold(field).includes(needle));
}
