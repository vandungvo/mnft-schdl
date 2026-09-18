// Độ trễ giả + ép lỗi theo kịch bản demo.
//
// Prototype không gọi mạng, nên nếu không có lớp này thì mọi thao tác phản hồi tức thì —
// không giống app thật và không xem được trạng thái đang xử lý.

import { useDemoSettings } from './settings-store'

/** Chạy một hành động sau độ trễ giả (mặc định 400ms, chỉnh trong Demo Toolbar). */
export async function simulate<T>(fn: () => T): Promise<T> {
  const { latencyMs } = useDemoSettings.getState()
  if (latencyMs > 0) {
    await new Promise((resolve) => setTimeout(resolve, latencyMs))
  }
  return fn()
}

/**
 * Lấy mã lỗi đang được ép trong Demo Toolbar, rồi TỰ NHẢ.
 *
 * Dùng-một-lần là chủ ý: người xem bật "khóa tài khoản", bấm một lần thấy màn khóa,
 * bấm tiếp là về hành vi bình thường — không bị kẹt trong trạng thái lỗi rồi
 * tưởng prototype hỏng.
 */
export function consumeForcedError(): string | null {
  const { forcedError, setForcedError } = useDemoSettings.getState()
  if (forcedError) setForcedError(null)
  return forcedError
}
