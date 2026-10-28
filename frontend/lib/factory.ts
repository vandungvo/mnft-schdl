"use client";

import { useQuery } from "@tanstack/react-query";
import { useCallback, useSyncExternalStore } from "react";

import { listFactories } from "./api";
import type { FactoryConfig, Issue, PeriodKind, PeriodStatus } from "./factory-types";
import { productLabel, stageLabel } from "./format";
import { getLocale, tr } from "./locale";

/* ---------- the factory being worked on (one plant in practice; a picker when there are several) ---------- */

const FACTORY_KEY = "planwise:factory";
const factoryListeners = new Set<() => void>();

function readStoredFactory(): string | null {
  try { return window.localStorage.getItem(FACTORY_KEY); } catch { return null; }
}

function subscribeStoredFactory(listener: () => void) {
  factoryListeners.add(listener);
  window.addEventListener("storage", listener);
  return () => { factoryListeners.delete(listener); window.removeEventListener("storage", listener); };
}

export function useCurrentFactory() {
  const query = useQuery({ queryKey: ["factories"], queryFn: listFactories });
  const stored = useSyncExternalStore(subscribeStoredFactory, readStoredFactory, () => null);
  const items = query.data?.items ?? [];
  const factory = items.find((item) => item.id === stored) ?? items[0] ?? null;
  const select = useCallback((id: string) => {
    try { window.localStorage.setItem(FACTORY_KEY, id); } catch { /* storage unavailable */ }
    factoryListeners.forEach((listener) => listener());
  }, []);
  return { factory, factories: items, select, isLoading: query.isLoading, isError: query.isError, refetch: query.refetch };
}

/* ---------- local wall-clock strings ("2026-10-06T16:00", "2026-10-06") ---------- */

export function parseLocal(value: string): Date {
  const [day, time = "00:00"] = value.split("T");
  const [y, m, d] = day.split("-").map(Number);
  const [hh, mm] = time.split(":").map(Number);
  return new Date(y, m - 1, d, hh, mm);
}

const pad = (n: number) => String(n).padStart(2, "0");

export function toLocal(value: Date): string {
  return `${toIsoDate(value)}T${pad(value.getHours())}:${pad(value.getMinutes())}`;
}

export function toIsoDate(value: Date): string {
  return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`;
}

export function addDays(isoDate: string, days: number): string {
  const date = parseLocal(isoDate);
  date.setDate(date.getDate() + days);
  return toIsoDate(date);
}

export function todayIso(): string {
  return toIsoDate(new Date());
}

export function nowLocal(): string {
  return toLocal(new Date());
}

/** Next Monday on or after a date (periods usually start on Monday). */
export function nextMonday(isoDate = todayIso()): string {
  const date = parseLocal(isoDate);
  const shift = (8 - date.getDay()) % 7;
  date.setDate(date.getDate() + shift);
  return toIsoDate(date);
}

/** "T3 06/10 16:00" — always day/month (a planner reads dates the factory's way, whatever the UI language). */
export function fmtLocal(value: string | null | undefined, options: { weekday?: boolean; year?: boolean } = {}): string {
  if (!value) return "—";
  const date = parseLocal(value);
  const weekday = options.weekday ? `${weekdayLabel((date.getDay() + 6) % 7)} ` : "";
  const day = `${weekday}${pad(date.getDate())}/${pad(date.getMonth() + 1)}${options.year ? `/${date.getFullYear()}` : ""}`;
  return value.includes("T") ? `${day} ${pad(date.getHours())}:${pad(date.getMinutes())}` : day;
}

/** "06/10 – 18/10/2026" */
export function fmtRange(start: string, end: string): string {
  return `${fmtLocal(start)} – ${fmtLocal(end, { year: true })}`;
}

export function minutesBetween(a: string, b: string): number {
  return Math.round((parseLocal(b).getTime() - parseLocal(a).getTime()) / 60_000);
}

export function clock(minuteOfDay: number): string {
  return `${pad(Math.floor(minuteOfDay / 60))}:${pad(minuteOfDay % 60)}`;
}

export function parseClock(value: string): number {
  const [h, m] = value.split(":").map(Number);
  return h * 60 + (m || 0);
}

export function weekdayLabel(day: number, long = false): string {
  const vi = long ? ["Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy", "Chủ nhật"] : ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];
  const en = long ? ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"] : ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  return tr(vi[day], en[day]);
}

/** Monday-based weekday (0 = Monday) of a local date string. */
export function weekdayOf(isoDate: string): number {
  return (parseLocal(isoDate).getDay() + 6) % 7;
}

/* ---------- labels ---------- */

export function stageName(config: FactoryConfig | null | undefined, stage: string): string {
  return config?.stage_names?.[stage] || stageLabel(stage);
}

export function productName(config: FactoryConfig | null | undefined, code: string): string {
  return config?.products?.[code]?.name || productLabel(code);
}

export function priorityLabel(priority: number): string {
  return ({ 1: tr("Thấp", "Low"), 2: tr("Thường", "Normal"), 3: tr("Cao", "High"), 4: tr("Gấp", "Urgent") } as Record<number, string>)[priority] ?? tr(`Mức ${priority}`, `Level ${priority}`);
}

export function priorityTone(priority: number): "danger" | "warning" | "secondary" | "outline" {
  return priority >= 4 ? "danger" : priority === 3 ? "warning" : priority === 2 ? "secondary" : "outline";
}

export function pickupLabel(pickup: string): string {
  return pickup === "when_ready" ? tr("Giao khi xong", "When ready") : tr("Đúng giờ hẹn", "At due time");
}

export const PERIOD_STATUS: Record<PeriodStatus, { label: [string, string]; variant: "success" | "warning" | "danger" | "info" | "secondary" | "outline"; next: [string, string] }> = {
  draft: { label: ["Nháp", "Draft"], variant: "outline", next: ["Kiểm tra đơn hàng và đầu kỳ", "Check orders and opening stock"] },
  needs_fix: { label: ["Cần sửa đầu vào", "Inputs need fixing"], variant: "danger", next: ["Sửa các lỗi ở mục Chuẩn bị", "Fix the errors under Prepare"] },
  ready: { label: ["Sẵn sàng lập lịch", "Ready to schedule"], variant: "info", next: ["Sinh phương án lịch", "Generate schedule options"] },
  solving: { label: ["Đang giải", "Solving"], variant: "warning", next: ["Chờ solver hoàn tất", "Wait for the solver"] },
  options: { label: ["Có phương án", "Options ready"], variant: "info", next: ["So sánh và chốt một lịch", "Compare and commit a schedule"] },
  committed: { label: ["Đã chốt lịch", "Committed"], variant: "success", next: ["Phát lệnh sản xuất, theo dõi sự cố", "Issue work orders, watch for incidents"] },
  closed: { label: ["Đã đóng", "Closed"], variant: "secondary", next: ["Kỳ đã kết thúc", "Period finished"] },
};

export function kindLabel(kind: PeriodKind): string {
  return { regular: tr("Kỳ chính", "Main period"), variant: tr("Biến thể what-if", "What-if variant"), reschedule: tr("Lập lại lịch", "Reschedule") }[kind];
}

export function exceptionKindLabel(kind: string): string {
  return ({ maintenance: tr("Bảo trì", "Maintenance"), breakdown: tr("Hỏng máy", "Breakdown"), closed: tr("Nghỉ", "Closed"), other: tr("Khác", "Other") } as Record<string, string>)[kind] ?? kind;
}

export function issueText(issue: Pick<Issue, "vi" | "en">): string {
  return getLocale() === "en" ? issue.en : issue.vi;
}

export function weightLabel(key: string): string {
  const labels: Record<string, [string, string]> = {
    weighted_tardiness: ["Trễ hạn (có trọng số ưu tiên)", "Weighted tardiness"],
    safety_shortfall: ["Thiếu tồn an toàn", "Safety-stock shortfall"],
    makespan: ["Thời điểm xong việc", "Makespan"],
    nonproductive_minutes: ["Giờ máy không sản xuất", "Non-productive minutes"],
    setup_minutes: ["Thời gian chuyển đổi", "Setup minutes"],
    maintenance_minutes: ["Thời gian bảo dưỡng khuôn", "Mold maintenance minutes"],
    idle_minutes: ["Thời gian rảnh trong ca", "Idle minutes"],
    reserve_units: ["Sản phẩm làm trước", "Pulled-ahead units"],
    reserve_production: ["Số phương án làm trước", "Pull-ahead options"],
    surplus_holding: ["Tồn dư trên mức an toàn", "Stock above safety"],
    btp_end_units: ["Bán thành phẩm còn cuối kỳ", "Semi-finished left at end"],
  };
  const label = labels[key];
  return label ? tr(...label) : key;
}

export const WEIGHT_KEYS = ["weighted_tardiness", "safety_shortfall", "makespan", "nonproductive_minutes", "setup_minutes", "maintenance_minutes", "idle_minutes", "reserve_units", "reserve_production", "surplus_holding", "btp_end_units"] as const;

/** Read a File as base64 (without the data: prefix). */
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",", 2)[1] ?? "");
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

/** Download text as a file; CSV gets a BOM so Excel opens Vietnamese text correctly. */
export function downloadText(name: string, text: string, type = "text/csv") {
  const blob = new Blob([type === "text/csv" ? "﻿" + text : text], { type: `${type};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function csvRow(values: Array<string | number | null | undefined>): string {
  return values.map((value) => {
    const text = value == null ? "" : String(value);
    return /[",;\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
  }).join(",");
}
