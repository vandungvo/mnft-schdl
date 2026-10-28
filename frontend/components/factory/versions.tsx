"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { GitCompare, Loader2, RotateCcw } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { Hint } from "@/components/blocks";
import { useI18n } from "@/components/i18n-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { getFactoryVersion, listPeriods } from "@/lib/api";
import { fmtLocal } from "@/lib/factory";
import { changeLabel, changeValue, describeChanges } from "@/lib/factory-config";
import type { ConfigChange, FactoryConfig, FactoryVersion } from "@/lib/factory-types";
import { formatDateTime } from "@/lib/format";

export function VersionsSection({ factoryId, versions, current, config, onRestore }: { factoryId: string; versions: FactoryVersion[]; current: number; config: FactoryConfig; onRestore: (config: FactoryConfig, version: number) => void }) {
  const { t } = useI18n();
  const periods = useQuery({ queryKey: ["periods", factoryId], queryFn: () => listPeriods(factoryId) });
  const [compare, setCompare] = useState<{ version: number; changes: ConfigChange[] } | null>(null);
  const load = useMutation({ mutationFn: (version: number) => getFactoryVersion(factoryId, version) });
  const usedBy = (version: number) => (periods.data?.items ?? []).filter((p) => p.factory_version === version);

  return (
    <div className="grid gap-3">
      <Hint className="mt-0">{t("Mỗi lần lưu tạo một phiên bản không đổi. Kỳ lập lịch giữ phiên bản nó đã dùng; phiên bản có ngày hiệu lực chỉ áp cho kỳ bắt đầu từ ngày đó.", "Every save creates an immutable version. A period keeps the version it was planned with; a version with an effective date applies only to periods starting on or after it.")}</Hint>
      {[...versions].sort((a, b) => b.version - a.version).map((version) => {
        const used = usedBy(version.version);
        const busy = load.isPending && load.variables === version.version;
        return (
          <details key={version.version} className="group rounded-lg border bg-card shadow-card" open={version.version === current}>
            <summary className="flex cursor-pointer flex-wrap items-center gap-2 px-4 py-3 text-sm">
              <b>v{version.version}</b>
              {version.version === current && <Badge variant="info">{t("mới nhất", "latest")}</Badge>}
              {version.effective_from && <Badge variant="outline">{t(`hiệu lực từ ${fmtLocal(version.effective_from, { year: true })}`, `effective ${fmtLocal(version.effective_from, { year: true })}`)}</Badge>}
              <span className="text-muted-foreground">{formatDateTime(version.created_at)} · {version.actor}</span>
              {version.note && <span>— {version.note}</span>}
              <span className="ml-auto flex items-center gap-3 text-xs text-muted-foreground">
                {periods.data && <span>{used.length ? t(`${used.length} kỳ dùng`, `${used.length} period(s)`) : t("chưa kỳ nào dùng", "no period uses it")}</span>}
                <span>{t(`${version.changes.length} thay đổi`, `${version.changes.length} changes`)}</span>
              </span>
            </summary>
            <div className="grid gap-3 border-t px-4 py-3">
              {version.changes.length > 0 ? <ChangeList changes={version.changes} /> : <span className="text-sm text-muted-foreground">{t("Phiên bản đầu tiên (nhập từ file).", "First version (imported from a file).")}</span>}
              {used.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 text-xs">
                  <span className="text-muted-foreground">{t("Kỳ dùng phiên bản này:", "Periods on this version:")}</span>
                  {used.map((p) => <Link key={p.id} href={`/periods/${p.id}`} className="rounded bg-muted px-1.5 py-0.5 hover:bg-accent hover:text-accent-foreground">{p.name}</Link>)}
                </div>
              )}
              {version.version !== current && (
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" disabled={load.isPending} onClick={() => load.mutate(version.version, { onSuccess: (detail) => setCompare({ version: version.version, changes: describeChanges(detail.config, config) }) })}>
                    {busy ? <Loader2 className="animate-spin" /> : <GitCompare />}{t("So với bản đang sửa", "Compare with the current one")}
                  </Button>
                  <Button size="sm" variant="outline" disabled={load.isPending} onClick={() => load.mutate(version.version, { onSuccess: (detail) => onRestore(detail.config, version.version) })}>
                    <RotateCcw />{t("Khôi phục vào bản nháp", "Restore into the draft")}
                  </Button>
                </div>
              )}
              {load.isError && load.variables === version.version && <span className="text-sm text-destructive" role="alert">{t("Không tải được phiên bản.", "Could not load the version.")}</span>}
            </div>
          </details>
        );
      })}
      <Dialog open={!!compare} onOpenChange={(open) => { if (!open) setCompare(null); }}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t(`v${compare?.version} → bản đang sửa`, `v${compare?.version} → current`)}</DialogTitle>
            <DialogDescription>{t("Cột trái: giá trị ở phiên bản cũ; cột phải: giá trị hiện tại (gồm cả bản nháp chưa lưu).", "Left: value in the old version; right: current value (including the unsaved draft).")}</DialogDescription>
          </DialogHeader>
          {compare && (compare.changes.length ? <ChangeList changes={compare.changes} /> : <p className="text-sm text-muted-foreground">{t("Không khác gì.", "No differences.")}</p>)}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ChangeList({ changes }: { changes: ConfigChange[] }) {
  const { t } = useI18n();
  const [all, setAll] = useState(false);
  const shown = all ? changes : changes.slice(0, 40);
  return (
    <div className="grid gap-1">
      <ul className="grid gap-1 text-sm">{shown.map((change) => {
        const before = changeValue(change.path, change.before, t);
        const after = changeValue(change.path, change.after, t);
        const kind = change.before == null ? t("thêm", "added") : change.after == null ? t("bỏ", "removed") : null;
        return (
          <li key={change.path} className="grid gap-x-3 border-b py-1 last:border-0 sm:grid-cols-[minmax(0,14rem)_minmax(0,1fr)]">
            <span className="font-medium" title={change.path}>{changeLabel(change.path, t)}{kind && <span className="ml-1.5 text-xs font-normal text-muted-foreground">({kind})</span>}</span>
            <span className="min-w-0 break-words tabular-nums">
              <span className="text-muted-foreground line-through decoration-muted-foreground/50" title={before.full}>{before.text}</span>
              <span className="mx-1.5 text-muted-foreground">→</span>
              <span title={after.full}>{after.text}</span>
            </span>
          </li>
        );
      })}</ul>
      {changes.length > 40 && <Button size="xs" variant="ghost" className="justify-self-start" onClick={() => setAll(!all)}>{all ? t("Thu gọn", "Show less") : t(`Xem thêm ${changes.length - 40} thay đổi`, `Show ${changes.length - 40} more`)}</Button>}
    </div>
  );
}
