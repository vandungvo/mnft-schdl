"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, ArrowRight, Download, Loader2, PackageCheck, Printer, Siren } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { EmptyState, Field, Hint, Panel, StatTile } from "@/components/blocks";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { useI18n } from "@/components/i18n-provider";
import { MutationNotice } from "@/components/master-data/shared";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { ErrorState, SkeletonTable } from "@/components/ui-states";
import { closePeriod, getPeriodState, getScheduleRun, reschedulePeriod, rolloverPeriod } from "@/lib/api";
import { addDays, csvRow, downloadText, fmtLocal, nowLocal, parseLocal, productName, stageName, toLocal } from "@/lib/factory";
import type { FactoryConfig, PeriodDetail } from "@/lib/factory-types";
import { formatDateTime } from "@/lib/format";
import type { ScheduleOperation } from "@/lib/types";

const ALL = "__all__";

interface WorkLine {
  day: string;
  shift: string;
  machine: string;
  stage: string;
  start: string;
  end: string;
  setupFrom: string;
  run: string;
  item: string;
  quantity: number;
  setup: number;
  maintenance: number;
  mold: string | null;
}

function workLines(operations: ScheduleOperation[], origin: string, config: FactoryConfig): WorkLine[] {
  const base = parseLocal(origin.slice(0, 10));
  const at = (minute: number) => toLocal(new Date(base.getTime() + minute * 60_000));
  return [...operations].sort((a, b) => a.block_start - b.block_start || a.machine.localeCompare(b.machine)).map((op) => {
    const shiftKey = op.shift?.split("_").slice(1).join("_") ?? "";
    return {
      day: at(op.block_start).slice(0, 10),
      shift: op.shift ? (config.shift_template[shiftKey]?.name || shiftKey) : "24/7",
      machine: op.machine,
      stage: op.stage,
      start: at(op.start),
      end: at(op.end),
      setupFrom: at(op.block_start),
      run: op.lot,
      item: op.item ?? op.lot,
      quantity: config.run_size[op.stage] ?? 0,
      setup: op.setup_minutes,
      maintenance: op.maintenance_minutes,
      mold: op.mold,
    };
  });
}

/** What the shop floor gets once a schedule is committed, and what to do when reality diverges. */
export function ExecuteView({ period, config }: { period: PeriodDetail; config: FactoryConfig }) {
  const { t } = useI18n();
  const decision = period.decision;
  const run = useQuery({ queryKey: ["schedule-run", decision?.run_id], queryFn: () => getScheduleRun(decision!.run_id!), enabled: Boolean(decision?.run_id), staleTime: Infinity });
  const committedElsewhere = period.family.filter((p) => p.id !== period.id && p.decision);

  if (!decision?.run_id) {
    return (
      <div className="grid gap-4">
        <EmptyState icon={<PackageCheck />} title={t("Chưa chốt lịch cho kỳ này", "No schedule committed for this period")}
          description={t("Lệnh sản xuất, báo sự cố và chuyển kỳ có sau khi chốt một phương án ở tab Chốt.", "Work orders, incidents and rolling over become available once an option is committed in the Commit tab.")} />
        {committedElsewhere.length > 0 && (
          <Panel title={t("Lịch đã chốt trong cùng kỳ", "Committed schedules in the same period")}>
            <ul className="grid gap-1.5 text-sm">{committedElsewhere.map((p) => (
              <li key={p.id}><Link href={`/periods/${p.id}?tab=execute`} className="font-medium text-primary hover:underline">{p.variant_label ?? p.name}</Link> · {p.decision!.alternative} · {formatDateTime(p.decision!.decided_at)}</li>
            ))}</ul>
          </Panel>
        )}
      </div>
    );
  }
  return (
    <div className="grid min-w-0 gap-4">
      {!decision.current && (
        <div className="flex items-start gap-2 rounded-lg border border-warning/40 bg-warning-soft px-4 py-3 text-sm text-warning">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          {t("Đầu vào của kỳ đã đổi sau khi chốt. Lệnh dưới đây theo lịch đã chốt; nếu thay đổi có hiệu lực, hãy sinh phương án mới và chốt lại.", "The period's inputs changed after the commit. The orders below follow the committed schedule; if the change is real, generate new options and commit again.")}
        </div>
      )}
      {run.isLoading ? <SkeletonTable rows={6} /> : run.isError || !run.data ? <ErrorState compact message={t("Không tải được lịch đã chốt.", "Could not load the committed schedule.")} onRetry={() => void run.refetch()} /> : (
        <WorkOrders lines={workLines(run.data.operations, run.data.time_origin, config)} config={config} title={`${period.name}${period.variant_label ? ` · ${period.variant_label}` : ""} — ${decision.alternative}`} />
      )}
      {period.status !== "closed" && <div className="grid gap-4 xl:grid-cols-2"><IncidentPanel period={period} config={config} /><ClosePanel period={period} config={config} /></div>}
    </div>
  );
}

function WorkOrders({ lines, config, title }: { lines: WorkLine[]; config: FactoryConfig; title: string }) {
  const { t } = useI18n();
  const days = [...new Set(lines.map((line) => line.day))];
  const today = nowLocal().slice(0, 10);
  const [day, setDay] = useState(days.includes(today) ? today : days[0] ?? ALL);
  const [machine, setMachine] = useState(ALL);
  const shown = lines.filter((line) => (day === ALL || line.day === day) && (machine === ALL || line.machine === machine));
  const header = [t("Ngày", "Day"), t("Ca", "Shift"), t("Máy", "Machine"), t("Bắt đầu chuẩn bị", "Prep starts"), t("Bắt đầu", "Start"), t("Kết thúc", "End"), t("Lượt", "Run"), t("Mã hàng", "Item"), t("Số lượng", "Qty"), t("Chuẩn bị (phút)", "Prep (min)"), t("Khuôn", "Mold")];
  const row = (line: WorkLine) => [fmtLocal(line.day, { weekday: true }), line.shift, line.machine, line.setupFrom.slice(11), line.start.slice(11), line.end.slice(11), line.run, line.item, line.quantity, line.setup + line.maintenance || "", line.mold ?? ""];

  const exportCsv = () => downloadText(`lenh-san-xuat-${day === ALL ? "ca-ky" : day}.csv`, [csvRow(header), ...shown.map((line) => csvRow(row(line)))].join("\n"));
  const print = () => {
    const win = window.open("", "_blank", "noopener=no,width=1000,height=800");
    if (!win) return;
    const esc = (value: unknown) => String(value).replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c]!);
    const groups = [...new Set(shown.map((line) => `${line.day}|${line.machine}`))];
    win.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${esc(title)}</title><style>
      body{font:12px system-ui,sans-serif;margin:24px;color:#111} h1{font-size:16px;margin:0 0 4px} h2{font-size:13px;margin:18px 0 6px}
      table{border-collapse:collapse;width:100%} th,td{border:1px solid #bbb;padding:4px 6px;text-align:left} th{background:#f2f2f2} td.n{text-align:right}
      .sign{margin-top:28px;display:flex;gap:80px} @media print{h2{break-after:avoid} table{break-inside:avoid}}</style></head><body>
      <h1>${esc(t("Lệnh sản xuất", "Work orders"))} — ${esc(title)}</h1><div>${esc(day === ALL ? t("Cả kỳ", "Whole period") : fmtLocal(day, { weekday: true, year: true }))} · ${esc(t("In lúc", "Printed"))} ${esc(fmtLocal(nowLocal()))}</div>
      ${groups.map((key) => { const [d, m] = key.split("|"); const items = shown.filter((l) => l.day === d && l.machine === m); return `<h2>${esc(m)} · ${esc(stageName(config, items[0].stage))} · ${esc(fmtLocal(d, { weekday: true }))}</h2><table><tr><th>${esc(t("Ca", "Shift"))}</th><th>${esc(t("Chuẩn bị", "Prep"))}</th><th>${esc(t("Chạy", "Run"))}</th><th>${esc(t("Lượt", "Run id"))}</th><th>${esc(t("Mã hàng", "Item"))}</th><th>${esc(t("SL", "Qty"))}</th><th>${esc(t("Khuôn", "Mold"))}</th><th>${esc(t("Xác nhận", "Done"))}</th></tr>${items.map((l) => `<tr><td>${esc(l.shift)}</td><td>${l.setup + l.maintenance ? `${esc(l.setupFrom.slice(11))} (${l.setup + l.maintenance}′)` : ""}</td><td>${esc(l.start.slice(11))}–${esc(l.end.slice(11))}</td><td>${esc(l.run)}</td><td>${esc(l.item)}</td><td class="n">${l.quantity}</td><td>${esc(l.mold ?? "")}</td><td></td></tr>`).join("")}</table>`; }).join("")}
      <div class="sign"><div>${esc(t("Người lập", "Prepared by"))}</div><div>${esc(t("Tổ trưởng", "Supervisor"))}</div></div>
      <script>window.onload=()=>window.print()</script></body></html>`);
    win.document.close();
  };

  return (
    <Panel title={t("Lệnh sản xuất", "Work orders")} description={t("Theo lịch đã chốt: từng máy làm gì, lúc nào. In cho tổ trưởng hoặc xuất Excel.", "From the committed schedule: what each machine does and when. Print for supervisors or export to Excel.")}
      actions={<div className="flex flex-wrap gap-2">
        <Button size="sm" variant="outline" onClick={exportCsv} disabled={!shown.length}><Download />CSV</Button>
        <Button size="sm" onClick={print} disabled={!shown.length}><Printer />{t("In lệnh", "Print")}</Button>
      </div>} flush>
      <div className="flex flex-wrap gap-2 px-4 pb-3 sm:px-5">
        <Select value={day} onValueChange={setDay}>
          <SelectTrigger size="sm" className="w-48" aria-label={t("Ngày", "Day")}><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value={ALL}>{t("Cả kỳ", "Whole period")}</SelectItem>{days.map((d) => <SelectItem key={d} value={d}>{fmtLocal(d, { weekday: true })}{d === today ? ` · ${t("hôm nay", "today")}` : ""}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={machine} onValueChange={setMachine}>
          <SelectTrigger size="sm" className="w-48" aria-label={t("Máy", "Machine")}><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value={ALL}>{t("Mọi máy", "All machines")}</SelectItem>{Object.keys(config.machines).map((m) => <SelectItem key={m} value={m}>{config.machines[m].name || m}</SelectItem>)}</SelectContent>
        </Select>
        <span className="self-center text-sm text-muted-foreground">{t(`${shown.length} lượt`, `${shown.length} runs`)}</span>
      </div>
      <div className="max-h-[560px] overflow-auto border-t">
        <Table>
          <TableHeader className="sticky top-0 bg-card"><TableRow>
            <TableHead className="pl-4">{t("Ngày · ca", "Day · shift")}</TableHead><TableHead>{t("Máy", "Machine")}</TableHead><TableHead>{t("Giờ chạy", "Run time")}</TableHead>
            <TableHead>{t("Lượt · mã hàng", "Run · item")}</TableHead><TableHead className="text-right">{t("SL", "Qty")}</TableHead><TableHead className="pr-4">{t("Chuẩn bị", "Prep")}</TableHead>
          </TableRow></TableHeader>
          <TableBody>{shown.map((line) => (
            <TableRow key={line.run}>
              <TableCell className="pl-4 whitespace-nowrap">{fmtLocal(line.day, { weekday: true })} <span className="text-muted-foreground">· {line.shift}</span></TableCell>
              <TableCell className="font-medium">{config.machines[line.machine]?.name || line.machine}<span className="block text-xs font-normal text-muted-foreground">{stageName(config, line.stage)}</span></TableCell>
              <TableCell className="whitespace-nowrap tabular-nums">{line.start.slice(11)}–{line.end.slice(11)}{line.end.slice(0, 10) !== line.day && <span className="text-xs text-muted-foreground"> (+1)</span>}</TableCell>
              <TableCell><span className="font-mono text-xs">{line.run}</span><span className="block">{config.products[line.item] ? productName(config, line.item) : line.item}</span></TableCell>
              <TableCell className="text-right tabular-nums">{line.quantity}</TableCell>
              <TableCell className="pr-4 text-sm">{line.setup + line.maintenance ? <>{line.setupFrom.slice(11)} · {line.setup + line.maintenance}′{line.maintenance ? <Badge variant="warning" className="ml-1">{t("bảo dưỡng khuôn", "mold service")}</Badge> : null}</> : <span className="text-muted-foreground">—</span>}{line.mold && <span className="block text-xs text-muted-foreground">{line.mold}</span>}</TableCell>
            </TableRow>
          ))}</TableBody>
        </Table>
        {!shown.length && <p className="py-8 text-center text-sm text-muted-foreground">{t("Không có lượt nào trong lựa chọn này.", "No runs for this selection.")}</p>}
      </div>
    </Panel>
  );
}

function IncidentPanel({ period, config }: { period: PeriodDetail; config: FactoryConfig }) {
  const { t } = useI18n();
  const router = useRouter();
  const start = `${period.start_date}T00:00`;
  const end = `${addDays(period.end_date, 1)}T00:00`;
  const now = nowLocal();
  const [cutoff, setCutoff] = useState(now > start && now < end ? now : `${addDays(period.start_date, Math.floor(period.days / 2))}T08:00`);
  const [machine, setMachine] = useState<string>(ALL);
  const [until, setUntil] = useState("");
  const [note, setNote] = useState("");
  const valid = cutoff > start && cutoff < end && (machine === ALL || until > cutoff);
  const state = useQuery({ queryKey: ["period-state", period.id, cutoff], queryFn: () => getPeriodState(period.id, cutoff), enabled: valid, staleTime: 60_000 });
  const busy = useMemo(() => Object.entries(state.data?.busy_until ?? {}), [state.data]);
  const mutation = useMutation({
    mutationFn: () => reschedulePeriod(period.id, {
      cutoff,
      label: machine === ALL ? null : t(`Sự cố ${machine} ${fmtLocal(cutoff)}`, `${machine} incident ${fmtLocal(cutoff)}`),
      exceptions: machine === ALL ? [] : [{ id: `I${Date.now().toString(36).toUpperCase()}`, machine, start: cutoff, end: until, kind: "breakdown", note: note || null }],
      add_orders: [],
    }),
    onSuccess: (child) => router.push(`/periods/${child.id}?tab=prepare`),
  });
  return (
    <Panel title={<span className="inline-flex items-center gap-2"><Siren className="size-4 text-destructive" />{t("Có sự cố? Lập lại lịch phần còn lại", "An incident? Replan the rest")}</span>}
      description={t("Phần đã chạy trước thời điểm cắt được giữ nguyên; tồn kho, khuôn và máy đang bận được tính tới thời điểm đó. Kết quả là một phiên bản lập lại lịch để bạn chỉnh tiếp (thêm đơn gấp…) rồi sinh phương án.", "What ran before the cut-off stays; stock, molds and busy machines are taken as of then. You get a reschedule to adjust further (add a rush order…) before generating options.")}>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={t("Thời điểm cắt", "Cut-off")}><Input type="datetime-local" value={cutoff} min={start} max={end} onChange={(event) => setCutoff(event.target.value)} /></Field>
        <Field label={t("Máy gặp sự cố (tuỳ chọn)", "Machine down (optional)")}>
          <Select value={machine} onValueChange={(value) => { setMachine(value); if (!until) setUntil(`${addDays(cutoff.slice(0, 10), 1)}T${cutoff.slice(11)}`); }}>
            <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value={ALL}>{t("Không — chỉ lập lại lịch", "None — just replan")}</SelectItem>{Object.entries(config.machines).map(([code, m]) => <SelectItem key={code} value={code}>{m.name || code} · {stageName(config, m.stage)}</SelectItem>)}</SelectContent>
          </Select>
        </Field>
        {machine !== ALL && <>
          <Field label={t("Dự kiến chạy lại lúc", "Expected back at")}><Input type="datetime-local" value={until} min={cutoff} onChange={(event) => setUntil(event.target.value)} /></Field>
          <Field label={t("Mô tả sự cố", "What happened")}><Textarea rows={1} value={note} onChange={(event) => setNote(event.target.value)} /></Field>
        </>}
      </div>
      {valid && state.data && (
        <Hint>{t(`Tới ${fmtLocal(cutoff)}: ${state.data.started}/${state.data.total_runs} lượt đã bắt đầu, ${Object.keys(state.data.delivered).length} đơn đã giao`, `By ${fmtLocal(cutoff)}: ${state.data.started}/${state.data.total_runs} runs started, ${Object.keys(state.data.delivered).length} orders delivered`)}{busy.length ? t(`; đang chạy dở trên ${busy.map(([m, at]) => `${m} (tới ${at.slice(11)})`).join(", ")}`, `; still running on ${busy.map(([m, at]) => `${m} (until ${at.slice(11)})`).join(", ")}`) : ""}.</Hint>
      )}
      {!valid && <p className="mt-2 text-sm text-destructive">{t("Thời điểm cắt phải nằm trong kỳ, và giờ chạy lại phải sau thời điểm cắt.", "The cut-off must fall in the period and the restart after the cut-off.")}</p>}
      <MutationNotice className="mt-3" error={mutation.error} fallback={t("Không lập lại lịch được.", "Could not replan.")} />
      <div className="mt-3 flex justify-end"><Button variant="destructive" disabled={!valid || mutation.isPending} onClick={() => mutation.mutate()}>{mutation.isPending ? <Loader2 className="animate-spin" /> : <Siren />}{t("Lập lại lịch từ thời điểm cắt", "Replan from the cut-off")}</Button></div>
    </Panel>
  );
}

function ClosePanel({ period, config }: { period: PeriodDetail; config: FactoryConfig }) {
  const { t } = useI18n();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [confirm, setConfirm] = useState<"close" | "rollover" | null>(null);
  const end = useQuery({ queryKey: ["period-state", period.id, "end"], queryFn: () => getPeriodState(period.id), staleTime: 60_000 });
  const rollover = useMutation({ mutationFn: () => rolloverPeriod(period.id), onSuccess: (next) => router.push(`/periods/${next.id}?tab=prepare`) });
  const close = useMutation({ mutationFn: () => closePeriod(period.id), onSuccess: (closed) => { queryClient.setQueryData(["period", period.id], closed); void queryClient.invalidateQueries({ queryKey: ["periods"] }); } });
  const products = Object.keys(config.products);
  return (
    <Panel title={<span className="inline-flex items-center gap-2"><PackageCheck className="size-4 text-success" />{t("Kết thúc kỳ", "Finish the period")}</span>}
      description={t("Đóng kỳ đánh dấu các đơn đã giao trong sổ đơn hàng. Kỳ tiếp theo nhận tồn cuối kỳ dự kiến làm đầu kỳ — bạn chỉ cần sửa chỗ thực tế khác.", "Closing marks the delivered orders in the order book. The next period starts from the projected closing stock — you only correct what differs.")}>
      {end.data ? (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {products.map((p) => <StatTile key={p} label={productName(config, p)} value={end.data.finished[p] ?? 0} hint={t(`an toàn ${config.products[p].safety_stock}`, `safety ${config.products[p].safety_stock}`)} tone={(end.data.finished[p] ?? 0) < config.products[p].safety_stock ? "warn" : "default"} />)}
        </div>
      ) : end.isError ? <p className="text-sm text-muted-foreground">{t("Chưa tính được tồn cuối kỳ.", "Closing stock not available.")}</p> : <SkeletonTable rows={1} />}
      {end.data && <Hint>{t(`Theo lịch đã chốt: ${Object.keys(end.data.delivered).length} đơn giao trong kỳ.`, `Per the committed schedule: ${Object.keys(end.data.delivered).length} orders delivered in the period.`)}</Hint>}
      <MutationNotice className="mt-3" error={rollover.error ?? close.error} fallback={t("Không đóng được kỳ.", "Could not close the period.")} />
      <div className="mt-3 flex flex-wrap justify-end gap-2">
        <Button variant="outline" disabled={close.isPending || rollover.isPending} onClick={() => setConfirm("close")}>{t("Chỉ đóng kỳ", "Close only")}</Button>
        <Button disabled={close.isPending || rollover.isPending} onClick={() => setConfirm("rollover")}>{rollover.isPending ? <Loader2 className="animate-spin" /> : <ArrowRight />}{t("Đóng kỳ & tạo kỳ tiếp theo", "Close & start the next period")}</Button>
      </div>
      <ConfirmDialog open={confirm !== null} title={confirm === "rollover" ? t("Đóng kỳ và tạo kỳ tiếp theo?", "Close and start the next period?") : t("Đóng kỳ này?", "Close this period?")}
        description={t("Kỳ (cùng các biến thể và bản lập lại lịch) sẽ chỉ còn để xem. Đơn đã giao theo lịch đang thực hiện được đánh dấu trong sổ đơn hàng.", "The period (with its variants and reschedules) becomes read-only. Orders delivered by the executed schedule are marked in the order book.")}
        confirmLabel={confirm === "rollover" ? t("Đóng & tạo kỳ mới", "Close & create") : t("Đóng kỳ", "Close")} pending={close.isPending || rollover.isPending}
        onCancel={() => setConfirm(null)} onConfirm={() => { const action = confirm; setConfirm(null); if (action === "rollover") rollover.mutate(); else close.mutate(); }} />
    </Panel>
  );
}
