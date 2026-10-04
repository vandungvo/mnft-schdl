"use client";

import { useI18n } from "@/components/i18n-provider";
import { Badge } from "@/components/ui/badge";
import type { RunStatus } from "@/lib/types";

const config: Record<RunStatus, { label: [string, string]; variant: "success" | "warning" | "danger" | "info" }> = {
  QUEUED: { label: ["Đang chờ", "Queued"], variant: "info" },
  RUNNING: { label: ["Đang giải", "Solving"], variant: "warning" },
  SUCCEEDED: { label: ["Hoàn tất", "Succeeded"], variant: "success" },
  FAILED: { label: ["Thất bại", "Failed"], variant: "danger" },
  CANCELLED: { label: ["Đã hủy", "Cancelled"], variant: "danger" },
};

export function RunStatusBadge({ status }: { status: RunStatus }) {
  const { t } = useI18n();
  const item = config[status];
  return <Badge variant={item.variant}>{status === "RUNNING" && <span className="size-1.5 animate-pulse rounded-full bg-current" />}{t(...item.label)}</Badge>;
}
