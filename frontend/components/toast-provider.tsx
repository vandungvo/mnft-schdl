"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";

type ToastTone = "success" | "error" | "info";
interface Toast { id: number; message: string; tone: ToastTone }

const ToastContext = createContext<(message: string, tone?: ToastTone) => void>(() => undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const showToast = useCallback((message: string, tone: ToastTone = "success") => {
    const id = Date.now() + Math.random();
    setToasts((items) => [...items, { id, message, tone }]);
    if (tone !== "error") {
      window.setTimeout(() => setToasts((items) => items.filter((item) => item.id !== id)), 5_000);
    }
  }, []);
  return <ToastContext.Provider value={showToast}>{children}<div className="toast-region" aria-live="polite" aria-atomic="true">{toasts.map((toast) => <div className={`toast toast-${toast.tone}`} role={toast.tone === "error" ? "alert" : "status"} key={toast.id}><div><strong>{toast.tone === "success" ? "Hoàn tất" : toast.tone === "error" ? "Có lỗi xảy ra" : "Thông tin"}</strong><small>{toast.message}</small></div><button type="button" aria-label="Đóng thông báo" onClick={() => setToasts((items) => items.filter((item) => item.id !== toast.id))}>×</button></div>)}</div></ToastContext.Provider>;
}

export function useToast() { return useContext(ToastContext); }
