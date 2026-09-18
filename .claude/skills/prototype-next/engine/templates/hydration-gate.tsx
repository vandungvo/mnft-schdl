'use client'

// Chặn hydration mismatch do localStorage.
// Server render không có localStorage → nếu để store rehydrate ngay, server và client
// render khác nhau → React báo "Hydration failed". Gate này giữ cho lần render đầu
// giống hệt nhau ở hai phía, rồi mới nạp state đã lưu.
//
// Bọc quanh phần cây component CÓ đọc store. Khung chờ phải là markup ổn định.

import { useEffect, useState } from 'react'
import { useDemoStore } from '@/lib/demo/store'

export function HydrationGate({ children }: { children: React.ReactNode }) {
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    void useDemoStore.persist.rehydrate()
    setHydrated(true)
  }, [])

  if (!hydrated) {
    return <div className="min-h-dvh" aria-busy="true" aria-live="polite" />
  }

  return <>{children}</>
}
