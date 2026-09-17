import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "Explainable Scheduling Agent",
  description: "CO5103 — Tác nhân lập lịch sản xuất có khả năng giải thích",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body className="min-h-screen bg-slate-50 text-slate-900">
        <Providers>
          <header className="border-b bg-white">
            <nav className="mx-auto flex max-w-5xl items-center gap-6 px-4 py-3 text-sm">
              <Link href="/" className="font-semibold">
                Explainable Scheduling Agent
              </Link>
              <Link href="/master/orders" className="text-slate-600 hover:text-slate-900">
                Đơn hàng
              </Link>
              <Link href="/master/inventory" className="text-slate-600 hover:text-slate-900">
                Tồn kho
              </Link>
              <Link href="/planning/aggregate" className="text-slate-600 hover:text-slate-900">
                Kế hoạch tổng hợp
              </Link>
            </nav>
          </header>
          <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
        </Providers>
      </body>
    </html>
  );
}
