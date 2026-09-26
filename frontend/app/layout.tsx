import type { Metadata } from "next";
import type { ReactNode } from "react";

import { AppShell } from "@/components/app-shell";
import { QueryProvider } from "@/components/query-provider";
import { ToastProvider } from "@/components/toast-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Schedule OS", template: "%s · Schedule OS" },
  description: "Lập lịch sản xuất có kiểm chứng cho dây chuyền linh kiện",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="vi">
      <body>
        <QueryProvider>
          <ToastProvider><AppShell>{children}</AppShell></ToastProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
