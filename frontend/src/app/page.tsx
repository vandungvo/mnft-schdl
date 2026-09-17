"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { api } from "@/lib/api";

export default function HomePage() {
  const health = useQuery({ queryKey: ["health"], queryFn: api.health });

  return (
    <div className="space-y-6">
      <section className="rounded-lg border bg-white p-6">
        <h1 className="text-xl font-semibold">Kết nối Backend</h1>
        <p className="mt-2 text-sm text-slate-600">
          Kiểm tra <code>GET /health</code> — xác nhận frontend gọi được backend end-to-end.
        </p>
        <div className="mt-4">
          {health.isLoading && <p>Đang gọi backend...</p>}
          {health.isError && (
            <p className="text-red-600">
              Lỗi: {(health.error as Error).message} — kiểm tra backend đã chạy chưa (
              <code>docker compose up</code>).
            </p>
          )}
          {health.data && (
            <p className="text-green-700">
              Backend trả về: <code>{JSON.stringify(health.data)}</code>
            </p>
          )}
        </div>
      </section>

      <section className="rounded-lg border bg-white p-6">
        <h2 className="text-lg font-semibold">Bắt đầu</h2>
        <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-slate-700">
          <li>
            Nhập <Link className="underline" href="/master/orders">đơn hàng</Link> và{" "}
            <Link className="underline" href="/master/inventory">tồn kho đầu kỳ</Link>.
          </li>
          <li>
            Chạy <Link className="underline" href="/planning/aggregate">Kế hoạch tổng hợp (Aggregate Planning)</Link> để
            xem sản lượng đúc/CNC theo ngày do CP-SAT sinh ra.
          </li>
        </ol>
      </section>
    </div>
  );
}
