import { intlLocale, tr } from "./locale";

export function formatDuration(minutes: number): string {
  const rounded = Math.round(minutes);
  const days = Math.floor(rounded / 1440);
  const hours = Math.floor((rounded % 1440) / 60);
  const mins = rounded % 60;
  if (days > 0) return tr(`${days} ngày ${hours} giờ`, `${days} d ${hours} h`);
  if (hours > 0) return tr(`${hours} giờ ${mins} phút`, `${hours} h ${mins} min`);
  return tr(`${mins} phút`, `${mins} min`);
}

export function formatDateTime(value: string | Date): string {
  return new Intl.DateTimeFormat(intlLocale(), {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function formatInputName(value: string): string {
  return value
    .replace(/_/g, " ")
    .replace(/(\d)([a-zA-Z])/g, "$1 $2")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function solverStatusLabel(value: string | null): string {
  const labels: Record<string, string> = {
    HEURISTIC_FEASIBLE: tr("Có lịch khả thi", "Feasible schedule"),
    OPTIMAL: tr("Tối ưu", "Optimal"),
    FEASIBLE: tr("Có lịch khả thi", "Feasible schedule"),
    INFEASIBLE: tr("Không có lịch khả thi", "No feasible schedule"),
    UNKNOWN: tr("Chưa xác định", "Unknown"),
  };
  return value ? labels[value] ?? value.replace(/_/g, " ").toLowerCase() : "—";
}

const STAGE_LABELS: Record<string, [string, string]> = {
  cast: ["Đúc", "Casting"],
  heat: ["Nhiệt luyện", "Heat treatment"],
  cnc: ["Gia công CNC", "CNC machining"],
  machining: ["Gia công", "Machining"],
  paint: ["Sơn", "Painting"],
  qc: ["Thử nghiệm & gói", "Testing & packing"],
};

export function stageLabel(value: string): string {
  const label = STAGE_LABELS[value];
  return label ? tr(...label) : value;
}

export function minuteToDate(origin: string, minute: number): Date {
  return new Date(new Date(origin).getTime() + minute * 60_000);
}

export function minuteToDateTime(origin: string, minute: number): string {
  return formatDateTime(minuteToDate(origin, minute));
}

const FACTORY_OFFSET = "+07:00";

function factoryParts(value: Date, includeTime: boolean): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    ...(includeTime ? { hour: "2-digit", minute: "2-digit", hourCycle: "h23" as const } : {}),
  }).formatToParts(value);
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? "";
  const date = `${get("year")}-${get("month")}-${get("day")}`;
  return includeTime ? `${date}T${get("hour")}:${get("minute")}` : date;
}

export function minuteToDateInput(origin: string, minute: number): string {
  return factoryParts(minuteToDate(origin, minute), false);
}

export function minuteToDateTimeInput(origin: string, minute: number): string {
  return factoryParts(minuteToDate(origin, minute), true);
}

export function dateInputToMinute(origin: string, value: string): number {
  return Math.round((new Date(`${value}T00:00:00${FACTORY_OFFSET}`).getTime() - new Date(origin).getTime()) / 60_000);
}

export function dateTimeInputToMinute(origin: string, value: string): number {
  return Math.round((new Date(`${value}:00${FACTORY_OFFSET}`).getTime() - new Date(origin).getTime()) / 60_000);
}

const clockFormats = new Map<string, Intl.DateTimeFormat>();
const dayFormats = new Map<string, Intl.DateTimeFormat>();

function clockFormat(): Intl.DateTimeFormat {
  const locale = intlLocale();
  let format = clockFormats.get(locale);
  if (!format) clockFormats.set(locale, format = new Intl.DateTimeFormat(locale, { timeZone: "Asia/Ho_Chi_Minh", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }));
  return format;
}

function dayFormat(): Intl.DateTimeFormat {
  const locale = intlLocale();
  let format = dayFormats.get(locale);
  if (!format) dayFormats.set(locale, format = new Intl.DateTimeFormat(locale, { timeZone: "Asia/Ho_Chi_Minh", weekday: "short", day: "2-digit", month: "2-digit" }));
  return format;
}

/** "14:00 · Th 2, 06/10" — factory-local clock for a minute offset. */
export function formatClock(origin: string, minute: number): string {
  const date = minuteToDate(origin, minute);
  return `${clockFormat().format(date)} · ${dayFormat().format(date)}`;
}

/** "Th 2, 06/10" — factory-local day label. */
export function formatDay(origin: string, minute: number): string {
  return dayFormat().format(minuteToDate(origin, minute));
}

/** "14:00" — factory-local time of day. */
export function formatHour(origin: string, minute: number): string {
  return clockFormat().format(minuteToDate(origin, minute));
}

const PRODUCT_LABELS: Record<string, [string, string]> = {
  F_SILVER: ["F bạc", "F silver"],
  F_BLACK: ["F đen", "F black"],
  R_SILVER: ["R bạc", "R silver"],
  R_BLACK: ["R đen", "R black"],
};

export function productLabel(value: string): string {
  const label = PRODUCT_LABELS[value];
  return label ? tr(...label) : value.replaceAll("_", " ");
}

/** Locale-aware number formatting. */
export function formatNumber(value: number, options?: Intl.NumberFormatOptions): string {
  return new Intl.NumberFormat(intlLocale(), options).format(value);
}

/** Medium date in the active locale. */
export function formatDate(value: Date): string {
  return new Intl.DateTimeFormat(intlLocale(), { dateStyle: "medium" }).format(value);
}
