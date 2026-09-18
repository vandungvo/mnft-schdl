'use client'

// Bảng điều khiển kịch bản demo — nút tròn nổi góc dưới-phải.
//
// Đây là thứ biến prototype từ "bản xem cho vui" thành mặt nghiệm thu: người dùng bật
// đúng mã lỗi trong Error Matrix và xem app có diễn đúng nhánh mà đặc tả mô tả không.
//
// LUÔN BẬT kể cả bản build — gate bằng NEXT_PUBLIC_DEMO_MODE, KHÔNG gate bằng NODE_ENV
// (sau khi build, NODE_ENV luôn là 'production' → toolbar biến mất đúng lúc cần nhất).
//
// Danh sách mã lỗi lấy từ errors.ts (auto-gen từ Error Matrix) — KHÔNG gõ tay.

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ERRORS, ERROR_META, type ErrorCode } from '@/lib/demo/_generated/errors'
import { useDemoStore } from '@/lib/demo/store'
import { useDemoSettings } from '@/lib/demo/settings-store'
import { DEMO_SCREENS, DEMO_ACCOUNTS } from '@/lib/demo/demo-catalog'

export function DemoToolbar() {
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState<'error' | 'screen' | 'account' | 'setting'>('error')

  if (process.env.NEXT_PUBLIC_DEMO_MODE === 'off') return null

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Mở bảng điều khiển demo"
        aria-expanded={open}
        className="fixed bottom-4 right-4 z-[100] rounded-full bg-neutral-900 px-4 py-3 text-sm font-medium text-white shadow-lg hover:bg-neutral-800"
      >
        Demo
      </button>

      {open && (
        <aside
          className="fixed bottom-20 right-4 z-[100] flex max-h-[70dvh] w-80 flex-col overflow-hidden rounded-xl border border-neutral-700 bg-neutral-900 text-neutral-100 shadow-2xl"
          aria-label="Bảng điều khiển demo"
        >
          <nav className="flex shrink-0 border-b border-neutral-700 text-xs">
            {([
              ['error', 'Ép lỗi'],
              ['screen', 'Đi tới màn'],
              ['account', 'Tài khoản'],
              ['setting', 'Cài đặt'],
            ] as const).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setTab(key)}
                className={`flex-1 px-2 py-2 ${tab === key ? 'bg-neutral-800 font-medium' : 'text-neutral-400'}`}
              >
                {label}
              </button>
            ))}
          </nav>

          <div className="overflow-y-auto p-3 text-sm">
            {tab === 'error' && <ForceErrorPanel />}
            {tab === 'screen' && <JumpToScreenPanel />}
            {tab === 'account' && <SampleAccountsPanel />}
            {tab === 'setting' && <SettingsPanel />}
          </div>
        </aside>
      )}
    </>
  )
}

/** Khối 1 — ép lỗi theo mã trong Error Matrix. Dùng một lần rồi tự nhả. */
function ForceErrorPanel() {
  const forcedError = useDemoSettings((s) => s.forcedError)
  const setForcedError = useDemoSettings((s) => s.setForcedError)
  const codes = Object.keys(ERRORS) as ErrorCode[]

  return (
    <div className="space-y-2">
      <p className="text-xs text-neutral-400">
        Chọn một lỗi, rồi thực hiện thao tác tương ứng — app sẽ diễn đúng nhánh đó một lần.
      </p>

      <label className="flex cursor-pointer items-start gap-2 rounded p-1 hover:bg-neutral-800">
        <input
          type="radio"
          name="forced-error"
          checked={forcedError === null}
          onChange={() => setForcedError(null)}
          className="mt-1"
        />
        <span className="text-neutral-300">Không ép — chạy bình thường</span>
      </label>

      {codes.map((code) => (
        <label
          key={code}
          className="flex cursor-pointer items-start gap-2 rounded p-1 hover:bg-neutral-800"
        >
          <input
            type="radio"
            name="forced-error"
            checked={forcedError === code}
            onChange={() => setForcedError(code)}
            className="mt-1"
          />
          <span>
            <span className="font-mono text-xs text-neutral-400">{code}</span>
            <br />
            <span>{ERROR_META[code]?.title ?? code}</span>
          </span>
        </label>
      ))}
    </div>
  )
}

/** Khối 2 — nhảy nhanh tới màn, nhóm theo luồng lấy từ userflow. */
function JumpToScreenPanel() {
  const router = useRouter()
  const groups = [...new Set(DEMO_SCREENS.map((s) => s.flow))]

  return (
    <div className="space-y-3">
      {groups.map((flow) => (
        <div key={flow}>
          <p className="mb-1 text-xs font-medium text-neutral-400">{flow}</p>
          <ul className="space-y-1">
            {DEMO_SCREENS.filter((s) => s.flow === flow).map((s) => (
              <li key={s.path}>
                <button
                  type="button"
                  onClick={() => {
                    s.prepare?.()
                    router.push(s.path)
                  }}
                  className="w-full rounded px-2 py-1 text-left hover:bg-neutral-800"
                >
                  {s.title}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  )
}

/**
 * Khối 3 — tài khoản mẫu.
 *
 * Tài khoản KHÔNG đủ điều kiện đăng nhập (chưa xác nhận, đang khóa) thì không tạo phiên —
 * chỉ điền sẵn email vào màn đăng nhập để người xem bấm và thấy đúng nhánh lỗi.
 * Cho vào thẳng là làm sai chính quy tắc đang muốn trình bày.
 */
function SampleAccountsPanel() {
  const router = useRouter()
  const loginAs = useDemoStore((s) => s.loginAs)

  return (
    <ul className="space-y-2">
      {DEMO_ACCOUNTS.map((a) => (
        <li key={a.email} className="flex items-center justify-between gap-2">
          <span>
            <span className="block">{a.email}</span>
            <span className="text-xs text-neutral-400">{a.label}</span>
          </span>
          <button
            type="button"
            onClick={() => {
              if (a.canLogin) {
                loginAs(a.email)
                router.push('/app/home')
              } else {
                router.push(`/login?email=${encodeURIComponent(a.email)}`)
              }
            }}
            className="shrink-0 rounded bg-neutral-700 px-2 py-1 text-xs hover:bg-neutral-600"
          >
            {a.canLogin ? 'Vào' : 'Thử'}
          </button>
        </li>
      ))}
    </ul>
  )
}

/** Khối 4 — độ trễ giả + reset dữ liệu + nhật ký hành động. */
function SettingsPanel() {
  const router = useRouter()
  const latencyMs = useDemoSettings((s) => s.latencyMs)
  const setLatency = useDemoSettings((s) => s.setLatency)
  const activityLog = useDemoSettings((s) => s.activityLog)
  const resetDemo = useDemoStore((s) => s.resetDemo)

  return (
    <div className="space-y-4">
      <div>
        <label htmlFor="demo-latency" className="mb-1 block text-xs text-neutral-400">
          Độ trễ giả: {latencyMs}ms
        </label>
        <input
          id="demo-latency"
          type="range"
          min={0}
          max={3000}
          step={100}
          value={latencyMs}
          onChange={(e) => setLatency(Number(e.target.value))}
          className="w-full"
        />
      </div>

      <button
        type="button"
        onClick={() => {
          if (confirm('Xoá toàn bộ dữ liệu demo và quay về trạng thái ban đầu?')) {
            resetDemo()
            router.push('/')
          }
        }}
        className="w-full rounded bg-red-900/60 px-2 py-2 text-xs hover:bg-red-900"
      >
        Reset dữ liệu demo về ban đầu
      </button>

      {activityLog.length > 0 && (
        <div>
          <p className="mb-1 text-xs font-medium text-neutral-400">Hành động gần đây</p>
          <ul className="space-y-0.5 text-xs text-neutral-400">
            {activityLog.map((l, i) => (
              <li key={i}>
                <span className="font-mono">{l.at}</span> {l.action} → {l.result}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
