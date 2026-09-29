"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useRef, useState } from "react";

import { ConfirmDialog } from "@/components/confirm-dialog";
import { BtpInventoryEditor, MachineEditor, OrderEditor, ProductCatalogEditor } from "@/components/master-data-editors";
import { useToast } from "@/components/toast-provider";
import { ErrorState, SkeletonTable } from "@/components/ui-states";
import { apiErrorMessage, deleteMasterDataset, getMasterDataset, listAuditEvents, replaceMasterDataset } from "@/lib/api";
import { formatDateTime, formatInputName } from "@/lib/format";

type Tab = "product-catalog" | "btp-inventory" | "machines" | "orders" | "history" | "technical";
const auditLabels: Record<string, string> = {
  "master_data.imported": "Import bộ dữ liệu",
  "master_data.replaced": "Thay thế toàn bộ dữ liệu",
  "product.created": "Thêm sản phẩm",
  "product.updated": "Cập nhật danh mục sản phẩm",
  "product.deleted": "Xóa sản phẩm",
  "btp_code.created": "Thêm mã bán thành phẩm",
  "btp_code.renamed": "Đổi tên mã bán thành phẩm",
  "btp_code.deleted": "Xóa mã bán thành phẩm",
  "btp_routing.updated": "Đổi ánh xạ bán thành phẩm",
  "btp_inventory.updated": "Cập nhật tồn bán thành phẩm",
  "btp_inventory.deleted": "Xóa tồn bán thành phẩm",
  "machine.updated": "Cập nhật máy",
  "machine.deleted": "Xóa máy",
  "order.updated": "Cập nhật đơn hàng",
  "order.deleted": "Xóa đơn hàng",
};

export default function MasterDatasetDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const showToast = useToast();
  const replaceInputRef = useRef<HTMLInputElement>(null);
  const [replaceFileError, setReplaceFileError] = useState("");
  const [tab, setTab] = useState<Tab>("product-catalog");
  const [filter, setFilter] = useState("");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const query = useQuery({ queryKey: ["master-dataset", id], queryFn: () => getMasterDataset(id) });
  const audit = useQuery({ queryKey: ["audit-events", "master_dataset", id], queryFn: () => listAuditEvents({ resourceType: "master_dataset", resourceId: id }), enabled: tab === "history" });
  const remove = useMutation({ mutationFn: () => deleteMasterDataset(id), onSuccess: async () => { showToast("Đã xóa bộ dữ liệu."); await queryClient.invalidateQueries({ queryKey: ["master-datasets"] }); router.push("/master-data"); } });
  const replace = useMutation({ mutationFn: (input: unknown) => replaceMasterDataset(id, input, query.data!.revision), onSuccess: async (updated) => { queryClient.setQueryData(["master-dataset", id], updated); showToast(`Đã tạo revision ${updated.revision}.`); await queryClient.invalidateQueries({ queryKey: ["master-datasets"] }); await queryClient.invalidateQueries({ queryKey: ["audit-events", "master_dataset", id] }); } });

  if (query.isLoading) return <SkeletonTable rows={7} />;
  if (query.isError || !query.data) return <ErrorState message="Không thể tải bộ dữ liệu này." onRetry={() => void query.refetch()} />;
  const dataset = query.data;
  const input = dataset.input;
  const applyUpdate = (updated: typeof dataset) => { queryClient.setQueryData(["master-dataset", id], updated); void queryClient.invalidateQueries({ queryKey: ["master-datasets"] }); void queryClient.invalidateQueries({ queryKey: ["audit-events", "master_dataset", id] }); };

  function exportJson() {
    const blob = new Blob([JSON.stringify(input, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${dataset.name.replace(/[^a-zA-Z0-9_-]+/g, "-")}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    showToast("Đã tải snapshot JSON.", "info");
  }

  async function replaceFromFile(file?: File) {
    if (!file) return;
    setReplaceFileError("");
    try {
      if (file.size > 5 * 1024 * 1024) throw new Error("File JSON không được vượt quá 5 MB.");
      const parsed = JSON.parse(await file.text()) as Record<string, unknown>;
      if (parsed.schema_version !== 1) throw new Error("Chỉ hỗ trợ scheduling input schema v1.");
      replace.mutate(parsed);
    } catch (error) { setReplaceFileError(error instanceof Error ? error.message : "Không thể đọc file JSON."); }
    finally { if (replaceInputRef.current) replaceInputRef.current.value = ""; }
  }

  const tabs: Array<{ id: Tab; label: string; count?: number }> = [
    { id: "product-catalog", label: "Danh mục sản phẩm", count: dataset.counts.products },
    { id: "btp-inventory", label: "Tồn kho bán thành phẩm", count: dataset.counts.products },
    { id: "machines", label: "Máy & năng lực", count: dataset.counts.machines },
    { id: "orders", label: "Đơn hàng", count: dataset.counts.orders },
    { id: "history", label: "Lịch sử thay đổi" },
    { id: "technical", label: "Thông tin kỹ thuật" },
  ];
  function handleTabKey(event: React.KeyboardEvent<HTMLButtonElement>, current: Tab) {
    const index = tabs.findIndex((item) => item.id === current);
    const nextIndex = event.key === "ArrowRight" ? (index + 1) % tabs.length
      : event.key === "ArrowLeft" ? (index - 1 + tabs.length) % tabs.length
        : event.key === "Home" ? 0
          : event.key === "End" ? tabs.length - 1
            : -1;
    if (nextIndex < 0) return;
    event.preventDefault();
    const next = tabs[nextIndex].id;
    setTab(next);
    setFilter("");
    window.requestAnimationFrame(() => document.getElementById(`dataset-tab-${next}`)?.focus());
  }

  return <section>
    <header className="page-header"><div><Link href="/master-data" className="back-link">← Dữ liệu nhà máy</Link><span className="eyebrow">MASTER DATA · REVISION {dataset.revision}</span><h1>{formatInputName(dataset.name)}</h1><p>{dataset.counts.products} sản phẩm · {dataset.counts.machines} máy · {dataset.counts.orders} đơn · {dataset.counts.lots} lô</p></div><div className="header-actions"><button className="button" onClick={exportJson}>Tải JSON</button><label className={`button ${replace.isPending ? "button-disabled" : ""}`}>{replace.isPending ? "Đang cập nhật…" : "Cập nhật từ JSON"}<input ref={replaceInputRef} className="visually-hidden" type="file" accept="application/json,.json" disabled={replace.isPending} onChange={(event) => void replaceFromFile(event.target.files?.[0])} /></label><Link href={`/runs/new?datasetId=${dataset.id}`} className="button button-primary">Lập lịch từ dữ liệu này</Link></div></header>
    {(replaceFileError || replace.isError) && <div className="alert alert-error" role="alert">{replaceFileError || apiErrorMessage(replace.error, "Không thể cập nhật. Dữ liệu cũ chưa bị thay đổi.")}</div>}
    <div className="dataset-status-strip"><span className="readiness-ready">✓ Sẵn sàng lập lịch</span><span>Revision {dataset.revision}</span><span>Cập nhật {formatDateTime(dataset.updated_at)}</span></div>
    <div className="tabs" role="tablist" aria-label="Nhóm dữ liệu">{tabs.map((item) => <button id={`dataset-tab-${item.id}`} role="tab" aria-selected={tab === item.id} aria-controls={`dataset-panel-${item.id}`} tabIndex={tab === item.id ? 0 : -1} className={tab === item.id ? "tab tab-active" : "tab"} key={item.id} onKeyDown={(event) => handleTabKey(event, item.id)} onClick={() => { setTab(item.id); setFilter(""); }}>{item.label}{item.count !== undefined && <span>{item.count}</span>}</button>)}</div>
    {tab !== "technical" && tab !== "history" && <div className="panel editor-toolbar"><label className="search-field"><span className="visually-hidden">Tìm trong bảng</span><input type="search" value={filter} onChange={(event) => setFilter(event.target.value)} placeholder={tab === "product-catalog" || tab === "btp-inventory" ? "Tìm mã sản phẩm…" : tab === "machines" ? "Tìm máy hoặc công đoạn…" : "Tìm đơn hoặc sản phẩm…"} /></label><span>Mọi thay đổi hợp lệ sẽ tạo revision mới.</span></div>}
    {tab === "product-catalog" && <article id="dataset-panel-product-catalog" role="tabpanel" aria-labelledby="dataset-tab-product-catalog" tabIndex={0} className="panel data-section"><div className="panel-heading"><div><span className="eyebrow">DANH MỤC</span><h2>Danh mục sản phẩm</h2></div></div><ProductCatalogEditor dataset={dataset} onUpdated={applyUpdate} filter={filter} /></article>}
    {tab === "btp-inventory" && <article id="dataset-panel-btp-inventory" role="tabpanel" aria-labelledby="dataset-tab-btp-inventory" tabIndex={0} className="panel data-section"><div className="panel-heading"><div><span className="eyebrow">CHÍNH SÁCH TỒN KHO</span><h2>Tồn kho bán thành phẩm theo công đoạn</h2><p>Để trống ô sức chứa nghĩa là không giới hạn.</p></div></div><BtpInventoryEditor dataset={dataset} onUpdated={applyUpdate} filter={filter} /></article>}
    {tab === "machines" && <article id="dataset-panel-machines" role="tabpanel" aria-labelledby="dataset-tab-machines" tabIndex={0} className="panel data-section"><div className="panel-heading"><div><span className="eyebrow">NGUỒN LỰC</span><h2>Máy và khả năng xử lý</h2></div></div><MachineEditor dataset={dataset} onUpdated={applyUpdate} filter={filter} /></article>}
    {tab === "orders" && <article id="dataset-panel-orders" role="tabpanel" aria-labelledby="dataset-tab-orders" tabIndex={0} className="panel data-section"><div className="panel-heading"><div><span className="eyebrow">NHU CẦU</span><h2>Đơn hàng</h2></div><span className="muted-label">{input.orders.filter((order) => order.urgent).length} đơn khẩn cấp</span></div><OrderEditor dataset={dataset} onUpdated={applyUpdate} filter={filter} /></article>}
    {tab === "history" && <article id="dataset-panel-history" role="tabpanel" aria-labelledby="dataset-tab-history" tabIndex={0} className="panel audit-panel"><div className="panel-heading"><div><span className="eyebrow">AUDIT LOG</span><h2>Lịch sử thay đổi</h2></div></div>{audit.isLoading && <SkeletonTable rows={4} />}{audit.isError && <ErrorState compact message="Không thể tải lịch sử thay đổi." onRetry={() => void audit.refetch()} />}{audit.data?.items.length === 0 && <div className="empty compact-empty">Chưa có sự kiện thay đổi được ghi nhận.</div>}<ol className="audit-list">{audit.data?.items.map((event) => <li key={event.id}><span className="audit-dot" /><div><strong>{auditLabels[event.action] ?? event.action}</strong><p>{event.actor} · {formatDateTime(event.created_at)}</p>{Object.keys(event.details).length > 0 && <code>{JSON.stringify(event.details)}</code>}</div></li>)}</ol></article>}
    {tab === "technical" && <article id="dataset-panel-technical" role="tabpanel" aria-labelledby="dataset-tab-technical" tabIndex={0} className="panel technical-panel"><div className="panel-heading"><div><span className="eyebrow">TÁI LẬP</span><h2>Thông tin kỹ thuật</h2></div></div><dl><div><dt>Hash nguồn</dt><dd><code>{dataset.source_hash}</code></dd></div><div><dt>Schema</dt><dd>Version {dataset.schema_version}</dd></div><div><dt>Thời điểm gốc</dt><dd>{formatDateTime(dataset.origin)}</dd></div><div><dt>Horizon</dt><dd>{Math.round(dataset.horizon / 1440)} ngày ({dataset.horizon.toLocaleString("vi-VN")} phút)</dd></div><div><dt>Minimum lot</dt><dd>{input.minimum_lot}</dd></div><div><dt>Độ trễ chuyển BTP giữa công đoạn</dt><dd>{input.transfer_minutes} phút</dd></div></dl><details className="assumptions-panel"><summary>Giả định dữ liệu ({input.assumptions.length})</summary><ul>{input.assumptions.map((item) => <li key={item}>{item}</li>)}</ul></details></article>}
    <article className="panel danger-zone"><div><h2>Xóa master data</h2><p>Run và snapshot cũ vẫn được giữ. Thao tác này không thể hoàn tác.</p></div><button className="button button-danger" disabled={remove.isPending} onClick={() => setDeleteOpen(true)}>Xóa bộ dữ liệu</button></article>
    <ConfirmDialog open={deleteOpen} title="Xóa bộ master data?" description="Dữ liệu vận hành hiện tại sẽ bị xóa. Các run và snapshot đã tạo vẫn được giữ lại." confirmLabel="Xóa dữ liệu" pending={remove.isPending} onCancel={() => setDeleteOpen(false)} onConfirm={() => remove.mutate()} />
  </section>;
}
