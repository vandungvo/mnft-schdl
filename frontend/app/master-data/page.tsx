"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useDeferredValue, useRef, useState } from "react";

import { useToast } from "@/components/toast-provider";
import { ErrorState, SkeletonCards } from "@/components/ui-states";
import { apiErrorMessage, importMasterDataset, listMasterDatasets } from "@/lib/api";
import { formatDateTime, formatInputName } from "@/lib/format";

export default function MasterDataPage() {
  const router = useRouter();
  const showToast = useToast();
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileError, setFileError] = useState("");
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [page, setPage] = useState(1);
  const pageSize = 12;
  const query = useQuery({ queryKey: ["master-datasets", { page, search: deferredSearch }], queryFn: () => listMasterDatasets({ limit: pageSize, offset: (page - 1) * pageSize, search: deferredSearch }) });
  const mutation = useMutation({ mutationFn: importMasterDataset, onSuccess: async (dataset) => { await queryClient.invalidateQueries({ queryKey: ["master-datasets"] }); showToast(`Import thành công: ${formatInputName(dataset.name)} đã sẵn sàng.`, "success"); router.push(`/master-data/${dataset.id}`); } });
  const items = query.data?.items ?? [];
  const pageCount = Math.max(1, Math.ceil((query.data?.total ?? 0) / pageSize));

  async function importFile(file?: File) {
    if (!file) return;
    setFileError("");
    try {
      if (file.size > 5 * 1024 * 1024) throw new Error("File JSON không được vượt quá 5 MB.");
      const parsed = JSON.parse(await file.text()) as Record<string, unknown>;
      if (parsed.schema_version !== 1) throw new Error("Chỉ hỗ trợ scheduling input schema v1.");
      mutation.mutate(parsed);
    } catch (error) { setFileError(error instanceof Error ? error.message : "Không thể đọc file JSON."); }
    finally { if (inputRef.current) inputRef.current.value = ""; }
  }

  return <section>
    <header className="page-header"><div><span className="eyebrow">MASTER DATA</span><h1>Dữ liệu nhà máy</h1><p>Quản lý sản phẩm, máy, lịch ca, đơn hàng và tồn kho theo revision có thể truy vết.</p></div><label className={`button button-primary ${mutation.isPending ? "button-disabled" : ""}`}>{mutation.isPending ? "Đang kiểm tra…" : "Import JSON"}<input ref={inputRef} className="visually-hidden" type="file" accept="application/json,.json" disabled={mutation.isPending} onChange={(event) => void importFile(event.target.files?.[0])} /></label></header>
    {(fileError || mutation.isError) && <div className="alert alert-error" role="alert">{fileError || apiErrorMessage(mutation.error, "Không thể import master data.")}</div>}
    {query.isLoading && <SkeletonCards count={3} />}
    {query.isError && <ErrorState title="Không thể tải dữ liệu nhà máy" message="Không kết nối được tới backend." onRetry={() => void query.refetch()} />}
    {query.data?.total === 0 && !search && <div className="panel empty"><span className="empty-icon">◇</span><h2>Chưa có dữ liệu vận hành</h2><p>Import scheduling input schema v1 để bắt đầu; toàn bộ quan hệ sẽ được kiểm tra trước khi ghi database.</p></div>}
    {query.data && (query.data.total > 0 || search) && <><div className="data-overview-bar"><div><span className="status-pulse" /><strong>{query.data.total} bộ dữ liệu phù hợp</strong></div><small>Dữ liệu chuẩn được tự động nạp khi hệ thống khởi tạo rỗng.</small></div><div className="panel toolbar"><label className="form-field search-field"><span>Tìm bộ dữ liệu</span><input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Nhập tên nhà máy hoặc bộ dữ liệu" /></label>{search && <button type="button" className="button button-quiet" onClick={() => { setSearch(""); setPage(1); }}>Xóa tìm kiếm</button>}</div>{items.length === 0 ? <div className="panel empty compact-empty"><h2>Không có kết quả phù hợp</h2><p>Thử một từ khóa khác.</p></div> : <><div className="result-summary"><span>Trang {page}: {items.length} / {query.data.total} kết quả</span>{query.isFetching && <span>Đang cập nhật…</span>}</div><div className="dataset-grid">{items.map((dataset) => <Link href={`/master-data/${dataset.id}`} className="panel dataset-card" key={dataset.id}><div className="dataset-card-top"><span className="eyebrow">REVISION {dataset.revision}</span><span className={dataset.is_ready ? "readiness-ready" : "readiness-error"}>{dataset.is_ready ? "✓ Sẵn sàng" : "Cần sửa"}</span></div><h2>{formatInputName(dataset.name)}</h2><p>Khởi điểm {formatDateTime(dataset.origin)} · {Math.round(dataset.horizon / 1440)} ngày lịch</p><div className="count-row"><span><strong>{dataset.counts.products}</strong> sản phẩm</span><span><strong>{dataset.counts.machines}</strong> máy</span><span><strong>{dataset.counts.orders}</strong> đơn</span><span><strong>{dataset.counts.lots}</strong> lô</span></div><small>Cập nhật {formatDateTime(dataset.updated_at)}</small></Link>)}</div>{pageCount > 1 && <nav className="pagination" aria-label="Phân trang master data"><button type="button" className="button button-small" disabled={page === 1 || query.isFetching} onClick={() => setPage((value) => value - 1)}>← Trước</button><span>Trang <strong>{page}</strong> / {pageCount}</span><button type="button" className="button button-small" disabled={page >= pageCount || query.isFetching} onClick={() => setPage((value) => value + 1)}>Sau →</button></nav>}</>}</>}
  </section>;
}
