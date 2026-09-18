// Vỏ cho nhóm màn đăng nhập/đăng ký.
//
// Form auth nằm trong box hẹp căn giữa (~400px), KHÔNG kéo dài hết bề ngang màn hình —
// theo ba-conventions.md Mục 8. Kéo full width trông sai, không giống màn thật.

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh flex flex-col items-center justify-center gap-6 p-6">
      <div className="text-lg font-semibold tracking-tight">{'{{APP_NAME}}'}</div>
      <div className="w-full max-w-[400px]">{children}</div>
    </div>
  )
}
