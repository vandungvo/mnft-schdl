'use client'

// Cài đặt kịch bản demo — LƯU KEY RIÊNG, tách khỏi dữ liệu app.
// Nhờ vậy nút "Reset dữ liệu demo" xoá dữ liệu app mà không xoá kịch bản
// người xem vừa dựng (mã lỗi đang ép, độ trễ).

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

export interface DemoSettings {
  latencyMs: number
  forcedError: string | null
  activityLog: { at: string; action: string; result: string }[]
  setLatency: (ms: number) => void
  setForcedError: (code: string | null) => void
  logActivity: (action: string, result: string) => void
}

export const useDemoSettings = create<DemoSettings>()(
  persist(
    (set, get) => ({
      latencyMs: 400,
      forcedError: null,
      activityLog: [],

      setLatency: (ms) => set({ latencyMs: ms }),
      setForcedError: (code) => set({ forcedError: code }),

      logActivity: (action, result) =>
        set({
          activityLog: [
            { at: new Date().toLocaleTimeString('vi-VN'), action, result },
            ...get().activityLog,
          ].slice(0, 10),
        }),
    }),
    {
      name: 'demo-settings',
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
    },
  ),
)
