export function formatDuration(minutes: number): string {
  const rounded = Math.round(minutes);
  const days = Math.floor(rounded / 1440);
  const hours = Math.floor((rounded % 1440) / 60);
  const mins = rounded % 60;
  if (days > 0) return `${days} ngày ${hours} giờ`;
  if (hours > 0) return `${hours} giờ ${mins} phút`;
  return `${mins} phút`;
}

export function formatDateTime(value: string | Date): string {
  return new Intl.DateTimeFormat("vi-VN", {
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
    HEURISTIC_FEASIBLE: "Có lịch khả thi",
    OPTIMAL: "Tối ưu",
    FEASIBLE: "Có lịch khả thi",
    INFEASIBLE: "Không có lịch khả thi",
    UNKNOWN: "Chưa xác định",
  };
  return value ? labels[value] ?? value.replace(/_/g, " ").toLowerCase() : "—";
}

const STAGE_LABELS: Record<string, string> = { cast: "Đúc", cnc: "CNC", paint: "Sơn", qc: "Kiểm tra chất lượng" };

export function stageLabel(value: string): string {
  return STAGE_LABELS[value] ?? value;
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
