"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { api, OrderCreate } from "@/lib/api";

const emptyForm: OrderCreate = { type: "A", qty: 10, due_day: 1 };

export default function OrdersPage() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<OrderCreate>(emptyForm);

  const orders = useQuery({ queryKey: ["orders"], queryFn: api.listOrders });

  const createOrder = useMutation({
    mutationFn: api.createOrder,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      setForm(emptyForm);
    },
  });

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Đơn hàng</h1>

      <form
        className="grid max-w-md gap-3 rounded-lg border bg-white p-4"
        onSubmit={(e) => {
          e.preventDefault();
          createOrder.mutate(form);
        }}
      >
        <label className="grid gap-1 text-sm">
          Loại sản phẩm
          <input
            className="rounded border px-2 py-1"
            value={form.type}
            onChange={(e) => setForm({ ...form, type: e.target.value })}
            required
          />
        </label>
        <label className="grid gap-1 text-sm">
          Số lượng
          <input
            type="number"
            min={1}
            className="rounded border px-2 py-1"
            value={form.qty}
            onChange={(e) => setForm({ ...form, qty: Number(e.target.value) })}
            required
          />
        </label>
        <label className="grid gap-1 text-sm">
          Ngày đến hạn (day #)
          <input
            type="number"
            min={1}
            className="rounded border px-2 py-1"
            value={form.due_day}
            onChange={(e) => setForm({ ...form, due_day: Number(e.target.value) })}
            required
          />
        </label>
        <button
          type="submit"
          disabled={createOrder.isPending}
          className="rounded bg-slate-900 px-3 py-2 text-sm text-white disabled:opacity-50"
        >
          {createOrder.isPending ? "Đang lưu..." : "Tạo đơn hàng"}
        </button>
        {createOrder.isError && (
          <p className="text-sm text-red-600">{(createOrder.error as Error).message}</p>
        )}
      </form>

      <div className="rounded-lg border bg-white p-4">
        <h2 className="mb-3 text-lg font-semibold">Danh sách đơn hàng</h2>
        {orders.isLoading && <p>Đang tải...</p>}
        {orders.data && orders.data.length === 0 && (
          <p className="text-sm text-slate-500">Chưa có đơn hàng nào.</p>
        )}
        {orders.data && orders.data.length > 0 && (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b">
                <th className="py-1 pr-4">ID</th>
                <th className="py-1 pr-4">Loại</th>
                <th className="py-1 pr-4">Số lượng</th>
                <th className="py-1 pr-4">Hạn giao (ngày)</th>
                <th className="py-1 pr-4">Tạo lúc</th>
              </tr>
            </thead>
            <tbody>
              {orders.data.map((o) => (
                <tr key={o.id} className="border-b last:border-0">
                  <td className="py-1 pr-4">{o.id}</td>
                  <td className="py-1 pr-4">{o.type}</td>
                  <td className="py-1 pr-4">{o.qty}</td>
                  <td className="py-1 pr-4">{o.due_day}</td>
                  <td className="py-1 pr-4">{new Date(o.created_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
