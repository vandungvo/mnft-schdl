"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Field } from "@/components/blocks";
import { useI18n } from "@/components/i18n-provider";
import { MutationNotice } from "@/components/master-data/shared";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { createPeriod, getFactory, listBookOrders } from "@/lib/api";
import { addDays, fmtRange, nextMonday, todayIso } from "@/lib/factory";
import type { PeriodSummary } from "@/lib/factory-types";
import { cn } from "@/lib/utils";

/** Start a period: the plant set-up and the open orders come in by themselves; the planner only picks the dates. */
export function NewPeriodDialog({ open, onClose, factoryId, periods }: { open: boolean; onClose: () => void; factoryId: string; periods: PeriodSummary[] }) {
  const { t } = useI18n();
  const router = useRouter();
  const queryClient = useQueryClient();
  const factory = useQuery({ queryKey: ["factory", factoryId], queryFn: () => getFactory(factoryId), enabled: open });
  const regular = periods.filter((p) => p.kind === "regular").sort((a, b) => b.start_date.localeCompare(a.start_date));
  const last = regular[0];
  const suggested = last ? addDays(last.end_date, 1) : nextMonday();
  const [start, setStart] = useState<string | null>(null);
  const [days, setDays] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [opening, setOpening] = useState<"previous" | "zero">("previous");
  const [pull, setPull] = useState(true);
  const startDate = start ?? suggested;
  const length = days ?? factory.data?.config.period_days ?? 14;
  const endDate = addDays(startDate, length - 1);
  const lookahead = factory.data?.config.lookahead_days ?? 28;
  const bookWindow = useQuery({
    queryKey: ["book-window", factoryId, startDate, length, lookahead],
    queryFn: () => listBookOrders(factoryId, { status: "open", dueTo: `${addDays(startDate, length + lookahead)}T00:00` }),
    enabled: open && pull,
  });
  const inside = (bookWindow.data?.items ?? []).filter((o) => o.due < `${addDays(startDate, length)}T00:00`);
  const overdue = inside.filter((o) => o.due < `${startDate}T00:00`);
  const overlap = periods.find((p) => p.kind === "regular" && p.status !== "closed" && p.start_date <= endDate && p.end_date >= startDate);
  const previousCommitted = regular.find((p) => p.start_date < startDate && p.decision);
  // Without a committed earlier period both choices start from zero: don't offer a choice that isn't one.
  const openingChoice = previousCommitted ? opening : "zero";
  const startsInPast = startDate < todayIso();

  const mutation = useMutation({
    mutationFn: () => createPeriod({ factory_id: factoryId, start_date: startDate, days: length, name: name.trim() || undefined, opening: openingChoice, pull_orders: pull }),
    onSuccess: async (period) => {
      await queryClient.invalidateQueries({ queryKey: ["periods"] });
      onClose();
      router.push(`/periods/${period.id}?tab=prepare`);
    },
  });

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next && !mutation.isPending) onClose(); }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("Lập lịch kỳ mới", "Plan a new period")}</DialogTitle>
          <DialogDescription>{t("Chỉ cần chọn ngày. Cấu hình nhà máy, ca, ngày nghỉ và đơn còn mở được lấy tự động; bạn kiểm tra lại ở bước Chuẩn bị.", "Just pick the dates. Plant set-up, shifts, rest days and open orders come in automatically; you review them under Prepare.")}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t("Bắt đầu", "Starts")} hint={startsInPast ? <span className="text-warning">{t("Ngày này đã qua — kỳ sẽ lập lịch cho quá khứ.", "This date is in the past — the period schedules past days.")}</span> : last ? t(`Ngay sau ${last.name}`, `Right after ${last.name}`) : undefined}>
            <Input type="date" value={startDate} onChange={(event) => setStart(event.target.value)} />
          </Field>
          <Field label={t("Số ngày", "Days")} hint={fmtRange(startDate, endDate)}>
            <Input type="number" min={1} max={62} value={length} onChange={(event) => setDays(Math.max(1, Math.min(62, Number(event.target.value) || 1)))} />
          </Field>
          <Field label={t("Tên (tuỳ chọn)", "Name (optional)")} className="sm:col-span-2"><Input value={name} placeholder={t("Tự đặt theo ngày", "Named after the dates")} onChange={(event) => setName(event.target.value)} /></Field>
        </div>
        <fieldset className="grid gap-2">
          <legend className="mb-1 text-xs font-semibold text-muted-foreground">{t("Tồn đầu kỳ", "Opening stock")}</legend>
          {([
            ["previous", t("Theo lịch đã chốt của kỳ trước", "From the previous committed schedule"), previousCommitted ? t(`Dự kiến từ ${previousCommitted.name}; bạn chỉ sửa chỗ khác thực tế.`, `Projected from ${previousCommitted.name}; you only correct what differs.`) : t("Chưa dùng được: chưa có kỳ trước nào được chốt.", "Not available: no earlier period has been committed.")],
            ["zero", t("Bắt đầu từ 0, tự nhập", "Start from zero and enter counts"), t("Dùng khi mới đưa hệ thống vào chạy hoặc sau kiểm kê.", "For the first period or after a stock-take.")],
          ] as const).map(([value, label, hint]) => (
            <label key={value} className={cn("flex items-start gap-2.5 rounded-lg border p-3 text-sm transition-colors",
              value === "previous" && !previousCommitted ? "cursor-not-allowed opacity-60" : "cursor-pointer hover:border-primary", openingChoice === value && "border-primary bg-accent")}>
              <input type="radio" name="opening" className="mt-1" checked={openingChoice === value} disabled={value === "previous" && !previousCommitted} onChange={() => setOpening(value)} />
              <span><b className="font-medium">{label}</b><span className="block text-xs text-muted-foreground">{hint}</span></span>
            </label>
          ))}
        </fieldset>
        <label className="flex items-start gap-2.5 text-sm">
          <Checkbox checked={pull} onCheckedChange={(value) => setPull(value === true)} className="mt-0.5" />
          <span>{t("Lấy đơn còn mở từ sổ đơn hàng", "Take open orders from the order book")}
            {pull && bookWindow.data && <span className="block text-xs text-muted-foreground">{t(`${inside.length} đơn có hạn tới hết kỳ, ${bookWindow.data.items.length - inside.length} đơn trong ${lookahead} ngày sau kỳ.`, `${inside.length} orders due by the end, ${bookWindow.data.items.length - inside.length} in the ${lookahead} days after.`)}</span>}
          </span>
        </label>
        {pull && overdue.length > 0 && (
          <p className="rounded-md bg-warning-soft px-3 py-2 text-sm text-warning">
            {t(`${overdue.length} đơn đã quá hạn trước ngày bắt đầu và sẽ được đưa vào kỳ để giao sớm nhất có thể. Nên báo lại khách hàng.`, `${overdue.length} orders were already due before the start; they are taken into the period to ship as early as possible. Consider telling the customers.`)}
          </p>
        )}
        {last && last.status !== "closed" && last.decision && (
          <p className="rounded-md bg-warning-soft px-3 py-2 text-sm text-warning">
            {t(`${last.name} đã chốt lịch nhưng chưa đóng, nên các đơn nó giao vẫn đang mở và sẽ bị lấy lại vào kỳ mới. Nên mở kỳ đó → Thực hiện → “Đóng kỳ & tạo kỳ tiếp theo”.`, `${last.name} is committed but not closed, so the orders it delivers are still open and would be taken again. Prefer opening it → Execute → “Close & start the next period”.`)}{" "}
            <Link href={`/periods/${last.id}?tab=execute`} className="font-semibold underline" onClick={onClose}>{t("Mở kỳ đó", "Open it")}</Link>
          </p>
        )}
        {overlap && <p className="rounded-md bg-warning-soft px-3 py-2 text-sm text-warning">{t(`Trùng ngày với ${overlap.name} (chưa đóng). Vẫn tạo được, nhưng hai kỳ có thể lập lịch cho cùng đơn.`, `Overlaps ${overlap.name} (still open). Allowed, but both periods may schedule the same orders.`)}</p>}
        <MutationNotice error={mutation.error} fallback={t("Không tạo được kỳ.", "Could not create the period.")} />
        <DialogFooter>
          <Button variant="outline" disabled={mutation.isPending} onClick={onClose}>{t("Hủy", "Cancel")}</Button>
          <Button disabled={mutation.isPending} onClick={() => mutation.mutate()}>{mutation.isPending && <Loader2 className="animate-spin" />}{t("Tạo kỳ", "Create period")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
