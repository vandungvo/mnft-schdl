# State — phần phụ thuộc nghiệp vụ‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

> Reference cho `/prototype-next`. **Chỉ mô tả phần AI phải viết.** Boilerplate (`simulate.ts`, `settings-store.ts`, `hydration-gate.tsx`, `auth-guard.tsx`) đã là file thật trong `engine/templates/`, do `proto-scaffold.mjs` chép — đừng gõ lại.
>
> `errors.ts` và `types.ts` do `proto-extract.mjs` sinh vào `_generated/` — **đừng sửa tay**, sửa đặc tả rồi chạy lại engine.

## Vì sao zustand + localStorage, không phải MSW‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

| Không dùng | Lý do |
|---|---|
| MSW / json-server | Giá trị của MSW là giữ nguyên code gọi API thật — prototype không có code đó, nên chỉ còn lại chi phí và thêm chỗ hỏng khi demo |
| IndexedDB (Dexie/localforage) | Bất đồng bộ, phải `await` khắp nơi, cho lượng dữ liệu prototype không bao giờ chạm tới |
| Route handler `app/api/**` | State nằm 2 nơi (server memory + localStorage), lệch nhau khi reload |
| Băm mật khẩu | Prototype không có mô hình đe dọa |
| `Date` trong state | Không sống sót qua JSON persist — lưu ISO string |

## Bố cục‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

```
src/lib/demo/
├── _generated/          ← proto-extract.mjs sinh, KHÔNG sửa tay
│   ├── errors.ts        ← Error Matrix → hằng số + ERROR_META
│   ├── types.ts         ← entity + state → union type
│   └── proto-facts.json ← fact gọn cho AI đọc
├── seed.ts              ← AI viết: dữ liệu mẫu có chủ đích
├── rules.ts             ← AI viết: quy tắc từ BR/FR, cite ID
├── store.ts             ← AI viết: zustand persist
├── demo-catalog.ts      ← AI viết: danh sách màn + tài khoản cho Demo Toolbar
├── simulate.ts          ← template, đã chép sẵn
└── settings-store.ts    ← template, đã chép sẵn
```

## 1. seed.ts — dữ liệu mẫu có chủ đích‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

Mỗi bản ghi tồn tại để **demo một trạng thái nghiệp vụ khác nhau**, không phải cho đầy danh sách. Ví dụ với một feature xác thực: một tài khoản bình thường, một chưa xác nhận, một đang bị khóa, một đăng nhập qua nhà cung cấp ngoài chưa đặt mật khẩu.

```ts
export const SEED_VERSION = 1   // tăng khi đổi shape → migrate lo phần còn lại

export const initialState = {
  accounts: seedAccounts,
  session: null as Session | null,
  // slice của các feature khác cộng dồn ở đây
}
```

Nhãn hiển thị trong Demo Toolbar phải là **tiếng Việt nghiệp vụ** ("Đang bị khóa 24 giờ"), không phải giá trị enum trần.

## 2. rules.ts — quy tắc nghiệp vụ, mỗi hàm cite nguồn‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

Đây là chỗ chứng minh prototype bám đặc tả. Người review đọc file này là đối chiếu được. Lấy `rule`, `trigger`, `source` từ `proto-facts.json` (`requirements.BR` / `.FR`).

```ts
/** BR-{feature}-005: khóa tài khoản 24 giờ sau 5 lần đăng nhập sai liên tiếp
 *  Nguồn: docs/{feature}/srs/{feature}-spec.md:97 */
export const LOCK_THRESHOLD = 5
export const LOCK_DURATION_HOURS = 24
```

Mọi ngưỡng số là **hằng số có tên + comment ID**, không rải số trần trong component.

Thân hàm validate là việc AI dịch từ prose sang code — engine không làm được. Ví dụ "8-20 ký tự, ≥1 hoa, ≥1 thường, ≥1 đặc biệt, không chứa phần đầu email" thành một hàm trả về câu lỗi hoặc `null`.

## 3. store.ts — zustand persist

```ts
'use client'
import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { initialState, SEED_VERSION } from './seed'

export const useDemoStore = create<DemoState>()(
  persist(
    (set, get) => ({
      ...initialState,
      logout: () => set({ session: null }),
      resetDemo: () => {
        set(initialState)
        void useDemoStore.persist.clearStorage()
      },
    }),
    {
      name: 'demo-app-state',
      storage: createJSONStorage(() => localStorage),
      version: SEED_VERSION,
      skipHydration: true,        // BẮT BUỘC — xem nextjs-gotchas.md
      migrate: (persisted, version) =>
        version < SEED_VERSION ? initialState : (persisted as DemoState),
    },
  ),
)
```

Cài đặt demo dùng **key riêng** (`demo-settings`, đã có trong template) — để nút "Reset dữ liệu demo" xoá dữ liệu app mà không xoá kịch bản người xem vừa dựng.

## 4. Hành động luôn kiểm ép lỗi trước

```ts
login: async (email, password) => {
  const forced = consumeForcedError()
  if (forced) return { ok: false, code: forced }
  return simulate(() => runLoginRules(email, password))
},
```

`consumeForcedError()` dùng-một-lần rồi tự nhả — người xem bật kịch bản lỗi, bấm thấy nhánh đó, bấm tiếp về bình thường. Không thì họ tưởng prototype hỏng.

## 5. demo-catalog.ts — nguồn cho Demo Toolbar

```ts
export const DEMO_SCREENS = [
  { flow: 'Đăng nhập', title: 'Đăng nhập', path: '/login' },
  // màn cần điều kiện mới vào được thì dựng sẵn điều kiện trong prepare()
  { flow: 'Quên mật khẩu', title: 'Đặt mật khẩu mới', path: '/reset-password',
    prepare: () => useDemoStore.getState().seedResetToken() },
]

export const DEMO_ACCOUNTS = [
  { email: '...', label: 'Đã xác nhận', canLogin: true },
  { email: '...', label: 'Đang bị khóa 24 giờ', canLogin: false },
]
```

`canLogin: false` → Toolbar không tạo phiên mà điền sẵn email vào màn đăng nhập, để người xem bấm và thấy đúng nhánh lỗi. Cho vào thẳng là làm sai chính quy tắc đang muốn trình bày.

Nhóm flow lấy từ `srs/{feature}-userflow.md` — không tự chia lại.‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍


<!-- wm:2b9af6c9b691879b1ddb7a04d29a1c88 -->
<sub>Tài liệu thuộc bộ AI4BA BA-Kit — bản quyền hoangphan.blog</sub>
