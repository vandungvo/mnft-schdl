"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { api, InventorySnapshotCreate } from "@/lib/api";

const today = new Date().toISOString().slice(0, 10);

const emptyForm: InventorySnapshotCreate = {
  product_type: "A",
  wip_qty: 0,
  fg_qty: 0,
  wip_min: 0,
  fg_min: 0,
  snapshot_date: today,
};

export default function InventoryPage() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<InventorySnapshotCreate>(emptyForm);

  const snapshots = useQuery({ queryKey: ["inventory"], queryFn: api.listInventorySnapshots });

  const createSnapshot = useMutation({
    mutationFn: api.createInventorySnapshot,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      setForm(emptyForm);
    },
  });

  const numberField = (key: keyof InventorySnapshotCreate, label: string) => (
    <label className="grid gap-1 text-sm">
      {label}
      <input
        type="number"
        min={0}
        className="rounded border px-2 py-1"
        value={form[key] as number}
        onChange={(e) => setForm({ ...form, [key]: Number(e.target.value) })}
        required
      />
    </label>
  );

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Tồn kho</h1>

      <form
        className="grid max-w-md gap-3 rounded-lg border bg-white p-4"
        onSubmit={(e) => {
          e.preventDefault();
          createSnapshot.mutate(form);
        }}
      >
        <label className="grid gap-1 text-sm">
          Loại sản phẩm
          <input
            className="rounded border px-2 py-1"
            value={form.product_type}
            onChange={(e) => setForm({ ...form, product_type: e.target.value })}
            required
          />
        </label>
        {numberField("wip_qty", "Tồn kho WIP (bán thành phẩm)")}
        {numberField("fg_qty", "Tồn kho FG (thành phẩm)")}
        {numberField("wip_min", "Ngưỡng an toàn WIP")}
        {numberField("fg_min", "Ngưỡng an toàn FG")}
        <label className="grid gap-1 text-sm">
          Ngày chụp tồn kho
          <input
            type="date"
            className="rounded border px-2 py-1"
            value={form.snapshot_date}
            onChange={(e) => setForm({ ...form, snapshot_date: e.target.value })}
            required
          />
        </label>
        <button
          type="submit"
          disabled={createSnapshot.isPending}
          className="rounded bg-slate-900 px-3 py-2 text-sm text-white disabled:opacity-50"
        >
          {createSnapshot.isPending ? "Đang lưu..." : "Lưu tồn kho"}
        </button>
        {createSnapshot.isError && (
          <p className="text-sm text-red-600">{(createSnapshot.error as Error).message}</p>
        )}
      </form>

      <div className="rounded-lg border bg-white p-4">
        <h2 className="mb-3 text-lg font-semibold">Tồn kho mới nhất theo loại sản phẩm</h2>
        {snapshots.isLoading && <p>Đang tải...</p>}
        {snapshots.data && snapshots.data.length === 0 && (
          <p className="text-sm text-slate-500">Chưa có dữ liệu tồn kho.</p>
        )}
        {snapshots.data && snapshots.data.length > 0 && (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b">
                <th className="py-1 pr-4">Loại</th>
                <th className="py-1 pr-4">WIP</th>
                <th className="py-1 pr-4">FG</th>
                <th className="py-1 pr-4">WIP min</th>
                <th className="py-1 pr-4">FG min</th>
                <th className="py-1 pr-4">Ngày</th>
              </tr>
            </thead>
            <tbody>
              {snapshots.data.map((s) => (
                <tr key={s.id} className="border-b last:border-0">
                  <td className="py-1 pr-4">{s.product_type}</td>
                  <td className="py-1 pr-4">{s.wip_qty}</td>
                  <td className="py-1 pr-4">{s.fg_qty}</td>
                  <td className="py-1 pr-4">{s.wip_min}</td>
                  <td className="py-1 pr-4">{s.fg_min}</td>
                  <td className="py-1 pr-4">{s.snapshot_date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
