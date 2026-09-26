"use client";

import { useMutation } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";

import { ConfirmDialog } from "@/components/confirm-dialog";
import { useToast } from "@/components/toast-provider";
import {
  apiErrorMessage,
  createMasterProduct,
  deleteMasterMachine,
  deleteMasterOrder,
  deleteMasterProduct,
  replaceMasterMachine,
  updateMasterOrder,
  updateMasterProduct,
} from "@/lib/api";
import { dateTimeInputToMinute, minuteToDateTimeInput } from "@/lib/format";
import type { MasterDatasetDetail, MachineInput, OrderInput } from "@/lib/types";

interface EditorProps {
  dataset: MasterDatasetDetail;
  onUpdated: (dataset: MasterDatasetDetail) => void;
  filter?: string;
}

export function ProductEditor({ dataset, onUpdated, filter = "" }: EditorProps) {
  const showToast = useToast();
  const [code, setCode] = useState("");
  const [initialInventory, setInitialInventory] = useState(0);
  const [safetyStock, setSafetyStock] = useState(0);
  const normalizedCode = code.trim().toUpperCase();
  const codeIsValid = /^[A-Z0-9][A-Z0-9_-]*$/.test(normalizedCode);
  const create = useMutation({
    mutationFn: () => createMasterProduct(dataset.id, {
      expected_revision: dataset.revision,
      code: normalizedCode,
      initial_inventory: initialInventory,
      safety_stock: safetyStock,
    }),
    onSuccess: (updated) => {
      setCode("");
      setInitialInventory(0);
      setSafetyStock(0);
      onUpdated(updated);
      showToast("Đã thêm sản phẩm vào revision mới.");
    },
  });

  return (
    <>
      {create.isError && <div className="inline-error">{apiErrorMessage(create.error, "Không thể thêm sản phẩm.")}</div>}
      <div className="table-wrap"><table><thead><tr><th>Mã sản phẩm</th><th>Tồn đầu kỳ</th><th>Tồn an toàn</th><th /></tr></thead><tbody>
        {dataset.input.products.filter((product) => product.toLowerCase().includes(filter.toLowerCase())).map((product) => <ProductRow key={product} dataset={dataset} product={product} onUpdated={onUpdated} />)}
        <tr className="create-row">
          <td><input aria-label="Mã sản phẩm mới" value={code} onChange={(event) => setCode(event.target.value.toUpperCase())} placeholder="SKU_NEW" />{code && !codeIsValid && <small className="error-label">Chỉ dùng chữ, số, _ hoặc -</small>}</td>
          <td><input aria-label="Tồn đầu kỳ sản phẩm mới" type="number" min={0} value={initialInventory} onChange={(event) => setInitialInventory(Number(event.target.value))} /></td>
          <td><input aria-label="Tồn an toàn sản phẩm mới" type="number" min={0} value={safetyStock} onChange={(event) => setSafetyStock(Number(event.target.value))} /></td>
          <td><button className="button button-small" disabled={!codeIsValid || initialInventory < 0 || safetyStock < 0 || create.isPending} onClick={() => create.mutate()}>{create.isPending ? "Đang thêm…" : "Thêm"}</button></td>
        </tr>
      </tbody></table></div>
    </>
  );
}

function ProductRow({ dataset, product, onUpdated }: EditorProps & { product: string }) {
  const showToast = useToast();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [initial, setInitial] = useState(dataset.input.initial_inventory[product]);
  const [safety, setSafety] = useState(dataset.input.safety_stock[product]);
  const mutation = useMutation({
    mutationFn: () => updateMasterProduct(dataset.id, product, {
      expected_revision: dataset.revision,
      initial_inventory: initial,
      safety_stock: safety,
    }),
    onSuccess: (updated) => { onUpdated(updated); showToast(`Đã lưu tồn kho ${product}.`); },
  });
  const remove = useMutation({
    mutationFn: () => deleteMasterProduct(dataset.id, product, dataset.revision),
    onSuccess: (updated) => { setConfirmOpen(false); onUpdated(updated); showToast(`Đã xóa sản phẩm ${product}.`); },
  });
  const changed = initial !== dataset.input.initial_inventory[product] || safety !== dataset.input.safety_stock[product];
  function submit(event: FormEvent) { event.preventDefault(); mutation.mutate(); }
  const requestError = mutation.isError ? apiErrorMessage(mutation.error, "Thay đổi bị từ chối") : remove.isError ? apiErrorMessage(remove.error, "Không thể xóa sản phẩm đang được sử dụng") : "";
  return <><tr><td><strong>{product}</strong>{requestError && <small className="error-label">{requestError}</small>}</td><td><form id={`product-${product}`} onSubmit={submit}><input aria-label={`Tồn đầu kỳ ${product}`} type="number" min={0} value={initial} onChange={(event) => setInitial(Number(event.target.value))} /></form></td><td><input form={`product-${product}`} aria-label={`Tồn an toàn ${product}`} type="number" min={0} value={safety} onChange={(event) => setSafety(Number(event.target.value))} /></td><td><div className="row-actions"><button form={`product-${product}`} className="button button-small" disabled={!changed || initial < 0 || safety < 0 || mutation.isPending || remove.isPending}>{mutation.isPending ? "Đang lưu…" : "Lưu"}</button><button type="button" className="icon-danger" aria-label={`Xóa sản phẩm ${product}`} disabled={mutation.isPending || remove.isPending} onClick={() => setConfirmOpen(true)}>×</button></div></td></tr><ConfirmDialog open={confirmOpen} title={`Xóa sản phẩm ${product}?`} description="Chỉ có thể xóa sản phẩm chưa được đơn hàng, lô hoặc máy sử dụng. Run và snapshot cũ vẫn được giữ." confirmLabel="Xóa sản phẩm" pending={remove.isPending} onCancel={() => setConfirmOpen(false)} onConfirm={() => remove.mutate()} /></>;
}

export function MachineEditor({ dataset, onUpdated, filter = "" }: EditorProps) {
  return <div className="table-wrap"><table><thead><tr><th>Máy</th><th>Công đoạn</th><th>Phút cố định</th><th>Sản phẩm xử lý</th><th>Ca</th><th /></tr></thead><tbody>{Object.entries(dataset.input.machines).filter(([code, machine]) => `${code} ${machine.stage}`.toLowerCase().includes(filter.toLowerCase())).map(([code, machine]) => <MachineRow key={code} dataset={dataset} code={code} machine={machine} onUpdated={onUpdated} />)}</tbody></table></div>;
}

function MachineRow({ dataset, code, machine, onUpdated }: EditorProps & { code: string; machine: MachineInput }) {
  const showToast = useToast();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [fixedMinutes, setFixedMinutes] = useState(machine.fixed_minutes);
  const mutation = useMutation({
    mutationFn: () => replaceMasterMachine(dataset.id, code, dataset.revision, { ...machine, fixed_minutes: fixedMinutes }),
    onSuccess: (updated) => { onUpdated(updated); showToast(`Đã lưu cấu hình máy ${code}.`); },
  });
  const remove = useMutation({
    mutationFn: () => deleteMasterMachine(dataset.id, code, dataset.revision),
    onSuccess: (updated) => { setConfirmOpen(false); onUpdated(updated); showToast(`Đã xóa máy ${code}.`); },
  });
  const changed = fixedMinutes !== machine.fixed_minutes;
  const stageLabels: Record<string, string> = { cast: "Đúc", cnc: "CNC", paint: "Sơn", qc: "Kiểm tra chất lượng" };
  const requestError = mutation.isError ? apiErrorMessage(mutation.error, "Không thể lưu máy") : remove.isError ? apiErrorMessage(remove.error, "Không thể xóa máy đang được sử dụng") : "";
  return <><tr><td><strong>{code}</strong>{requestError && <small className="error-label">{requestError}</small>}</td><td>{stageLabels[machine.stage] ?? machine.stage}</td><td><input aria-label={`Phút cố định ${code}`} type="number" min={0} value={fixedMinutes} onChange={(event) => setFixedMinutes(Number(event.target.value))} /></td><td>{Object.keys(machine.minutes_per_unit).length} sản phẩm</td><td>{machine.shifts.length}</td><td><div className="row-actions"><button className="button button-small" disabled={!changed || fixedMinutes < 0 || mutation.isPending || remove.isPending} onClick={() => mutation.mutate()}>{mutation.isPending ? "Đang lưu…" : "Lưu"}</button><button type="button" className="icon-danger" aria-label={`Xóa máy ${code}`} disabled={mutation.isPending || remove.isPending} onClick={() => setConfirmOpen(true)}>×</button></div></td></tr><ConfirmDialog open={confirmOpen} title={`Xóa máy ${code}?`} description="Chỉ có thể xóa máy khi dữ liệu còn lại vẫn tạo được lịch khả thi. Run và snapshot cũ không bị ảnh hưởng." confirmLabel="Xóa máy" pending={remove.isPending} onCancel={() => setConfirmOpen(false)} onConfirm={() => remove.mutate()} /></>;
}

export function OrderEditor({ dataset, onUpdated, filter = "" }: EditorProps) {
  return <div className="table-wrap"><table><thead><tr><th>Đơn</th><th>Sản phẩm</th><th>Phát hành</th><th>Hạn giao</th><th>Ưu tiên</th><th>Khẩn</th><th /></tr></thead><tbody>{dataset.input.orders.filter((order) => `${order.id} ${order.product}`.toLowerCase().includes(filter.toLowerCase())).map((order) => <OrderRow key={order.id} dataset={dataset} order={order} onUpdated={onUpdated} />)}</tbody></table></div>;
}

function OrderRow({ dataset, order, onUpdated }: EditorProps & { order: OrderInput }) {
  const showToast = useToast();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [release, setRelease] = useState(order.release);
  const [due, setDue] = useState(order.due);
  const [priority, setPriority] = useState(order.priority);
  const [urgent, setUrgent] = useState(order.urgent);
  const mutation = useMutation({
    mutationFn: () => updateMasterOrder(dataset.id, order.id, {
      expected_revision: dataset.revision,
      release,
      due,
      priority,
      urgent,
      deadline: order.deadline ?? null,
    }),
    onSuccess: (updated) => { onUpdated(updated); showToast(`Đã lưu đơn ${order.id}.`); },
  });
  const remove = useMutation({
    mutationFn: () => deleteMasterOrder(dataset.id, order.id, dataset.revision),
    onSuccess: (updated) => { setConfirmOpen(false); onUpdated(updated); showToast(`Đã xóa đơn ${order.id}.`); },
  });
  const changed = release !== order.release || due !== order.due || priority !== order.priority || urgent !== order.urgent;
  const timingError = release > due
    ? "Release không được sau hạn giao"
    : due > dataset.horizon
      ? `Hạn giao không vượt quá ${dataset.horizon}`
      : "";
  const requestError = mutation.isError
    ? apiErrorMessage(mutation.error, "Thay đổi bị từ chối")
    : remove.isError
      ? apiErrorMessage(remove.error, "Không thể xóa đơn")
      : "";
  const minDate = minuteToDateTimeInput(dataset.origin, 0);
  const maxDate = minuteToDateTimeInput(dataset.origin, dataset.horizon);
  return <><tr><td><strong>{order.id}</strong>{timingError && <small className="error-label">{timingError}</small>}{requestError && <small className="error-label">{requestError}</small>}</td><td>{order.product}</td><td><input aria-label={`Phát hành ${order.id}, múi giờ Asia/Ho_Chi_Minh`} aria-invalid={Boolean(timingError)} type="datetime-local" required min={minDate} max={maxDate} value={minuteToDateTimeInput(dataset.origin, release)} onChange={(event) => { if (event.target.value) setRelease(dateTimeInputToMinute(dataset.origin, event.target.value)); }} /><small>Asia/Ho_Chi_Minh</small></td><td><input aria-label={`Hạn giao ${order.id}, múi giờ Asia/Ho_Chi_Minh`} aria-invalid={Boolean(timingError)} type="datetime-local" required min={minDate} max={maxDate} value={minuteToDateTimeInput(dataset.origin, due)} onChange={(event) => { if (event.target.value) setDue(dateTimeInputToMinute(dataset.origin, event.target.value)); }} /><small>Asia/Ho_Chi_Minh</small></td><td><input aria-label={`Ưu tiên ${order.id}`} type="number" min={1} value={priority} onChange={(event) => setPriority(Number(event.target.value))} /></td><td><input aria-label={`Khẩn cấp ${order.id}`} type="checkbox" checked={urgent} onChange={(event) => setUrgent(event.target.checked)} /></td><td><div className="row-actions"><button className="button button-small" disabled={!changed || Boolean(timingError) || priority < 1 || mutation.isPending || remove.isPending} onClick={() => mutation.mutate()}>{mutation.isPending ? "Đang lưu…" : "Lưu"}</button><button className="icon-danger" aria-label={`Xóa ${order.id}`} disabled={mutation.isPending || remove.isPending} onClick={() => setConfirmOpen(true)}>×</button></div></td></tr><ConfirmDialog open={confirmOpen} title={`Xóa đơn ${order.id}?`} description="Toàn bộ lô trực thuộc cũng sẽ bị xóa. Run và snapshot cũ vẫn được giữ lại." confirmLabel="Xóa đơn" pending={remove.isPending} onCancel={() => setConfirmOpen(false)} onConfirm={() => remove.mutate()} /></>;
}
