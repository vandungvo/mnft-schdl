'use client'

// Chặn truy cập khi chưa đăng nhập.
//
// KHÔNG dùng middleware.ts: middleware chạy trên server, không đọc được localStorage
// nơi phiên đăng nhập của prototype đang sống.
//
// Đặt BÊN TRONG HydrationGate — nếu không, lần render đầu chưa có state sẽ đá nhầm
// người đang có phiên về màn đăng nhập.

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useDemoStore } from '@/lib/demo/store'

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const session = useDemoStore((s) => s.session)
  const router = useRouter()

  useEffect(() => {
    if (!session) router.replace('/login')
  }, [session, router])

  if (!session) return null

  return <>{children}</>
}
