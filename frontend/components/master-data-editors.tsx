"use client";

import { useMutation } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";

import { ConfirmDialog } from "@/components/confirm-dialog";
import { useToast } from "@/components/toast-provider";
import {
  apiErrorMessage,
  createBtpCode,
  createMasterProduct,
  deleteBtpCode,
  deleteMasterMachine,
  deleteMasterOrder,
  deleteMasterProduct,
  renameBtpCode,
  replaceMasterMachine,
  setBtpRouting,
  updateMasterOrder,
  updateMasterProduct,
  upsertBtpInventory,
} from "@/lib/api";
import { dateTimeInputToMinute, minuteToDateTimeInput, stageLabel } from "@/lib/format";
import type { MasterDatasetDetail, MachineInput, OrderInput } from "@/lib/types";

const BTP_STAGES = ["cast", "cnc", "paint"] as const;

interface EditorProps {
  dataset: MasterDatasetDetail;
  onUpdated: (dataset: MasterDatasetDetail) => void;
  filter?: string;
}

export function ProductCatalogEditor({ dataset, onUpdated, filter = "" }: EditorProps) {
  const showToast = useToast();
  const [code, setCode] = useState("");
  const [color, setColor] = useState("");
  const [line, setLine] = useState("");
  const [initialInventory, setInitialInventory] = useState(0);
  const [safetyStock, setSafetyStock] = useState(0);
  const normalizedCode = code.trim().toUpperCase();
  const codeIsValid = /^[A-Z0-9][A-Z0-9_-]*$/.test(normalizedCode);
  const create = useMutation({
    mutationFn: () => createMasterProduct(dataset.id, {
      expected_revision: dataset.revision,
      code: normalizedCode,
      color: color.trim(),
      line: line.trim(),
      initial_inventory: initialInventory,
      safety_stock: safetyStock,
    }),
    onSuccess: (updated) => {
      setCode("");
      setColor("");
      setLine("");
      setInitialInventory(0);
      setSafetyStock(0);
      onUpdated(updated);
      showToast("Đã thêm sản phẩm vào revision mới.");
    },
  });

  return (
    <>
      {create.isError && <div className="inline-error">{apiErrorMessage(create.error, "Không thể thêm sản phẩm.")}</div>}
      <div className="table-wrap"><table><thead><tr><th>Mã sản phẩm</th><th>Màu sắc</th><th>Trước/Sau</th><th>Tồn đầu kỳ</th><th>Tồn an toàn</th>{BTP_STAGES.map((stage) => <th key={stage}>Mã BTP {stageLabel(stage)}</th>)}<th /></tr></thead><tbody>
        {dataset.input.products.filter((product) => product.toLowerCase().includes(filter.toLowerCase())).map((product) => <ProductCatalogRow key={product} dataset={dataset} product={product} onUpdated={onUpdated} />)}
        <tr className="create-row">
          <td><input aria-label="Mã sản phẩm mới" value={code} onChange={(event) => setCode(event.target.value.toUpperCase())} placeholder="SKU_NEW" />{code && !codeIsValid && <small className="error-label">Chỉ dùng chữ, số, _ hoặc -</small>}</td>
          <td><input aria-label="Màu sắc sản phẩm mới" value={color} onChange={(event) => setColor(event.target.value.toUpperCase())} placeholder="SILVER/BLACK" /></td>
          <td><input aria-label="Trước/sau sản phẩm mới" value={line} onChange={(event) => setLine(event.target.value.toUpperCase())} placeholder="F/R" /></td>
          <td><input aria-label="Tồn đầu kỳ sản phẩm mới" type="number" min={0} value={initialInventory} onChange={(event) => setInitialInventory(Number(event.target.value))} /></td>
          <td><input aria-label="Tồn an toàn sản phẩm mới" type="number" min={0} value={safetyStock} onChange={(event) => setSafetyStock(Number(event.target.value))} /></td>
          {BTP_STAGES.map((stage) => <td key={stage}><small className="muted-label">Tự tạo {normalizedCode ? `${normalizedCode}_${stage.toUpperCase()}` : "khi thêm"}</small></td>)}
          <td><button className="button button-small" disabled={!codeIsValid || !color.trim() || !line.trim() || initialInventory < 0 || safetyStock < 0 || create.isPending} onClick={() => create.mutate()}>{create.isPending ? "Đang thêm…" : "Thêm"}</button></td>
        </tr>
      </tbody></table></div>
    </>
  );
}

function ProductCatalogRow({ dataset, product, onUpdated }: EditorProps & { product: string }) {
  const showToast = useToast();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [color, setColor] = useState(dataset.input.product_color[product]);
  const [line, setLine] = useState(dataset.input.product_line[product]);
  const [initial, setInitial] = useState(dataset.input.initial_inventory[product]);
  const [safety, setSafety] = useState(dataset.input.safety_stock[product]);
  const mutation = useMutation({
    mutationFn: () => updateMasterProduct(dataset.id, product, {
      expected_revision: dataset.revision,
      color,
      line,
      initial_inventory: initial,
      safety_stock: safety,
    }),
    onSuccess: (updated) => { onUpdated(updated); showToast(`Đã lưu danh mục ${product}.`); },
  });
  const remove = useMutation({
    mutationFn: () => deleteMasterProduct(dataset.id, product, dataset.revision),
    onSuccess: (updated) => { setConfirmOpen(false); onUpdated(updated); showToast(`Đã xóa sản phẩm ${product}.`); },
  });
  const changed = color !== dataset.input.product_color[product] || line !== dataset.input.product_line[product]
    || initial !== dataset.input.initial_inventory[product] || safety !== dataset.input.safety_stock[product];
  function submit(event: FormEvent) { event.preventDefault(); mutation.mutate(); }
  const requestError = mutation.isError ? apiErrorMessage(mutation.error, "Thay đổi bị từ chối") : remove.isError ? apiErrorMessage(remove.error, "Không thể xóa sản phẩm đang được sử dụng") : "";
  return <><tr><td><strong>{product}</strong>{requestError && <small className="error-label">{requestError}</small>}</td><td><form id={`product-${product}`} onSubmit={submit}><input aria-label={`Màu sắc ${product}`} value={color} onChange={(event) => setColor(event.target.value.toUpperCase())} /></form></td><td><input form={`product-${product}`} aria-label={`Trước/sau ${product}`} value={line} onChange={(event) => setLine(event.target.value.toUpperCase())} /></td><td><input form={`product-${product}`} aria-label={`Tồn đầu kỳ ${product}`} type="number" min={0} value={initial} onChange={(event) => setInitial(Number(event.target.value))} /></td><td><input form={`product-${product}`} aria-label={`Tồn an toàn ${product}`} type="number" min={0} value={safety} onChange={(event) => setSafety(Number(event.target.value))} /></td>{BTP_STAGES.map((stage) => <td key={stage}><BtpRoutingCell dataset={dataset} product={product} stage={stage} onUpdated={onUpdated} /></td>)}<td><div className="row-actions"><button form={`product-${product}`} className="button button-small" disabled={!changed || !color.trim() || !line.trim() || initial < 0 || safety < 0 || mutation.isPending || remove.isPending}>{mutation.isPending ? "Đang lưu…" : "Lưu"}</button><button type="button" className="icon-danger" aria-label={`Xóa sản phẩm ${product}`} disabled={mutation.isPending || remove.isPending} onClick={() => setConfirmOpen(true)}>×</button></div></td></tr><ConfirmDialog open={confirmOpen} title={`Xóa sản phẩm ${product}?`} description="Chỉ có thể xóa sản phẩm chưa được đơn hàng, lô hoặc máy sử dụng. Run và snapshot cũ vẫn được giữ." confirmLabel="Xóa sản phẩm" pending={remove.isPending} onCancel={() => setConfirmOpen(false)} onConfirm={() => remove.mutate()} /></>;
}

export function BtpInventoryEditor({ dataset, onUpdated, filter = "" }: EditorProps) {
  const products = dataset.input.products.filter((product) => product.toLowerCase().includes(filter.toLowerCase()));
  const codes = dataset.input.btp_codes.filter((code) => code.toLowerCase().includes(filter.toLowerCase()));
  return (
    <>
      <div className="panel-heading"><div><h3>Danh mục mã BTP</h3><p>1 mã có thể dùng chung cho nhiều sản phẩm — xem ánh xạ bên dưới.</p></div></div>
      <BtpCodeCatalogEditor dataset={dataset} onUpdated={onUpdated} filter={filter} codes={codes} />
      <div className="panel-heading"><div><h3>Ánh xạ theo sản phẩm</h3><p>Chọn mã BTP mà mỗi sản phẩm dùng ở từng công đoạn.</p></div></div>
      <div className="table-wrap"><table><thead><tr><th>Mã sản phẩm</th>{BTP_STAGES.map((stage) => <th key={stage}>{stageLabel(stage)}</th>)}</tr></thead><tbody>
        {products.map((product) => <tr key={product}><td><strong>{product}</strong></td>
          {BTP_STAGES.map((stage) => <td key={stage}><BtpRoutingCell dataset={dataset} product={product} stage={stage} onUpdated={onUpdated} /></td>)}
        </tr>)}
      </tbody></table></div>
    </>
  );
}

function BtpCodeCatalogEditor({ dataset, onUpdated, codes }: EditorProps & { codes: string[] }) {
  const showToast = useToast();
  const [code, setCode] = useState("");
  const normalizedCode = code.trim().toUpperCase();
  const codeIsValid = /^[A-Z0-9][A-Z0-9_-]*$/.test(normalizedCode);
  const create = useMutation({
    mutationFn: () => createBtpCode(dataset.id, { expected_revision: dataset.revision, code: normalizedCode }),
    onSuccess: (updated) => { setCode(""); onUpdated(updated); showToast("Đã thêm mã BTP vào revision mới."); },
  });
  return (
    <>
      {create.isError && <div className="inline-error">{apiErrorMessage(create.error, "Không thể thêm mã BTP.")}</div>}
      <div className="table-wrap"><table><thead><tr><th>Mã BTP</th><th>Tồn đầu kỳ</th><th>Sức chứa</th><th /></tr></thead><tbody>
        {codes.map((item) => <BtpCodeRow key={item} dataset={dataset} code={item} onUpdated={onUpdated} />)}
        <tr className="create-row">
          <td><input aria-label="Mã BTP mới" value={code} onChange={(event) => setCode(event.target.value.toUpperCase())} placeholder="F_SILVER_CAST" />{code && !codeIsValid && <small className="error-label">Chỉ dùng chữ, số, _ hoặc -</small>}</td>
          <td colSpan={2} />
          <td><button className="button button-small" disabled={!codeIsValid || create.isPending} onClick={() => create.mutate()}>{create.isPending ? "Đang thêm…" : "Thêm"}</button></td>
        </tr>
      </tbody></table></div>
    </>
  );
}

function BtpCodeRow({ dataset, code, onUpdated }: EditorProps & { code: string }) {
  const showToast = useToast();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [newCode, setNewCode] = useState(code);
  const savedQty = dataset.input.inventory_btp[code] ?? 0;
  const savedCapacity = dataset.input.btp_capacity[code] ?? null;
  const [qty, setQty] = useState(savedQty);
  const [capacity, setCapacity] = useState<number | "">(savedCapacity ?? "");
  const mutation = useMutation({
    mutationFn: () => upsertBtpInventory(dataset.id, code, {
      expected_revision: dataset.revision,
      initial_qty: qty,
      capacity: capacity === "" ? null : capacity,
    }),
    onSuccess: (updated) => { onUpdated(updated); showToast(`Đã lưu tồn BTP ${code}.`); },
  });
  const rename = useMutation({
    mutationFn: () => renameBtpCode(dataset.id, code, { expected_revision: dataset.revision, code: newCode.trim().toUpperCase() }),
    onSuccess: (updated) => { setRenaming(false); onUpdated(updated); showToast(`Đã đổi tên mã BTP thành ${newCode.trim().toUpperCase()}.`); },
  });
  const remove = useMutation({
    mutationFn: () => deleteBtpCode(dataset.id, code, dataset.revision),
    onSuccess: (updated) => { setConfirmOpen(false); onUpdated(updated); showToast(`Đã xóa mã BTP ${code}.`); },
  });
  const changed = qty !== savedQty || (capacity === "" ? null : capacity) !== savedCapacity;
  const newCodeValid = /^[A-Z0-9][A-Z0-9_-]*$/.test(newCode.trim().toUpperCase());
  const requestError = mutation.isError ? apiErrorMessage(mutation.error, "Không thể lưu tồn BTP")
    : rename.isError ? apiErrorMessage(rename.error, "Không thể đổi tên")
    : remove.isError ? apiErrorMessage(remove.error, "Không thể xóa mã đang được ánh xạ sử dụng") : "";
  return (
    <>
      <tr>
        <td>
          {renaming
            ? <div className="row-actions"><input aria-label={`Tên mới cho ${code}`} value={newCode} onChange={(event) => setNewCode(event.target.value.toUpperCase())} />
                <button className="button button-small" disabled={!newCodeValid || rename.isPending} onClick={() => rename.mutate()}>{rename.isPending ? "…" : "Lưu tên"}</button>
                <button type="button" className="button button-small" onClick={() => { setRenaming(false); setNewCode(code); }}>Hủy</button></div>
            : <><strong>{code}</strong> <button type="button" className="button button-small" onClick={() => setRenaming(true)}>Đổi tên</button></>}
          {requestError && <small className="error-label">{requestError}</small>}
        </td>
        <td><input aria-label={`Tồn đầu kỳ ${code}`} type="number" min={0} value={qty} onChange={(event) => setQty(Number(event.target.value))} /></td>
        <td><input aria-label={`Sức chứa ${code}`} type="number" min={1} value={capacity} onChange={(event) => setCapacity(event.target.value === "" ? "" : Number(event.target.value))} placeholder="Không giới hạn" /></td>
        <td><div className="row-actions">
          <button className="button button-small" disabled={!changed || qty < 0 || mutation.isPending} onClick={() => mutation.mutate()}>{mutation.isPending ? "…" : "Lưu"}</button>
          <button type="button" className="icon-danger" aria-label={`Xóa mã BTP ${code}`} disabled={mutation.isPending || remove.isPending} onClick={() => setConfirmOpen(true)}>×</button>
        </div></td>
      </tr>
      <ConfirmDialog open={confirmOpen} title={`Xóa mã BTP ${code}?`} description="Chỉ có thể xóa mã chưa được sản phẩm nào ánh xạ tới." confirmLabel="Xóa mã" pending={remove.isPending} onCancel={() => setConfirmOpen(false)} onConfirm={() => remove.mutate()} />
    </>
  );
}

function BtpRoutingCell({ dataset, product, stage, onUpdated }: EditorProps & { product: string; stage: string }) {
  const showToast = useToast();
  const current = dataset.input.btp_routing[product]?.[stage] ?? "";
  const mutation = useMutation({
    mutationFn: (btpCode: string) => setBtpRouting(dataset.id, product, stage, { expected_revision: dataset.revision, btp_code: btpCode }),
    onSuccess: (updated) => { onUpdated(updated); showToast(`Đã đổi ánh xạ ${product}/${stageLabel(stage)}.`); },
  });
  return (
    <div className="btp-cell">
      <select aria-label={`Mã BTP cho ${product} ${stageLabel(stage)}`} value={current} disabled={mutation.isPending}
        onChange={(event) => mutation.mutate(event.target.value)}>
        {dataset.input.btp_codes.map((code) => <option key={code} value={code}>{code}</option>)}
      </select>
      {mutation.isError && <small className="error-label">{apiErrorMessage(mutation.error, "Không thể đổi ánh xạ")}</small>}
    </div>
  );
}

export function MachineEditor({ dataset, onUpdated, filter = "" }: EditorProps) {
  return <div className="table-wrap"><table><thead><tr><th>Máy</th><th>Công đoạn</th><th>Phút cố định</th><th>Mã xử lý</th><th>Ca</th><th /></tr></thead><tbody>{Object.entries(dataset.input.machines).filter(([code, machine]) => `${code} ${machine.stage}`.toLowerCase().includes(filter.toLowerCase())).map(([code, machine]) => <MachineRow key={code} dataset={dataset} code={code} machine={machine} onUpdated={onUpdated} />)}</tbody></table></div>;
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
  const requestError = mutation.isError ? apiErrorMessage(mutation.error, "Không thể lưu máy") : remove.isError ? apiErrorMessage(remove.error, "Không thể xóa máy đang được sử dụng") : "";
  return <><tr><td><strong>{code}</strong>{requestError && <small className="error-label">{requestError}</small>}</td><td>{stageLabel(machine.stage)}</td><td><input aria-label={`Phút cố định ${code}`} type="number" min={0} value={fixedMinutes} onChange={(event) => setFixedMinutes(Number(event.target.value))} /></td><td>{Object.keys(machine.minutes_per_unit).length} {machine.stage === "qc" ? "sản phẩm" : "mã BTP"}</td><td>{machine.shifts.length}</td><td><div className="row-actions"><button className="button button-small" disabled={!changed || fixedMinutes < 0 || mutation.isPending || remove.isPending} onClick={() => mutation.mutate()}>{mutation.isPending ? "Đang lưu…" : "Lưu"}</button><button type="button" className="icon-danger" aria-label={`Xóa máy ${code}`} disabled={mutation.isPending || remove.isPending} onClick={() => setConfirmOpen(true)}>×</button></div></td></tr><ConfirmDialog open={confirmOpen} title={`Xóa máy ${code}?`} description="Chỉ có thể xóa máy khi dữ liệu còn lại vẫn tạo được lịch khả thi. Run và snapshot cũ không bị ảnh hưởng." confirmLabel="Xóa máy" pending={remove.isPending} onCancel={() => setConfirmOpen(false)} onConfirm={() => remove.mutate()} /></>;
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
