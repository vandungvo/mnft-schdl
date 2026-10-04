"use client";

import { useCallback } from "react";
import { toast } from "sonner";

import { tr } from "@/lib/locale";

type ToastTone = "success" | "error" | "info";

/** Thin wrapper over sonner so pages keep a single `showToast(message, tone)` call. */
export function useToast() {
  return useCallback((message: string, tone: ToastTone = "success") => {
    if (tone === "error") toast.error(tr("Có lỗi xảy ra", "Something went wrong"), { description: message, duration: Infinity, closeButton: true });
    else if (tone === "info") toast.info(message);
    else toast.success(message);
  }, []);
}
