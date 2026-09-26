import type { RunStatus } from "@/lib/types";

const labels: Record<RunStatus, string> = {
  QUEUED: "Đang chờ",
  RUNNING: "Đang giải",
  SUCCEEDED: "Hoàn tất",
  FAILED: "Thất bại",
  CANCELLED: "Đã hủy",
};

export function RunStatusBadge({ status }: { status: RunStatus }) {
  return <span className={`status status-${status.toLowerCase()}`}>{labels[status]}</span>;
}

