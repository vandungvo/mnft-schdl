# Bẫy của bản Next.js hiện tại‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

> Reference cho `/prototype-next`. `prototype/AGENTS.md` cảnh báo rõ: __bản Next này có breaking change so với training data__. Danh sách dưới là những cái hay cắn nhất — nhưng **nguồn sự thật là `prototype/node_modules/next/dist/docs/`**, phải đọc trước khi viết code (Phase D0).

Stack hiện tại (`prototype/package.json`): Next 16.2, React 19.2, Tailwind 4, shadcn 4.16, radix-ui, lucide-react.

## 1. `params` / `searchParams` là async‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

Truy cập đồng bộ __đã bị gỡ bỏ__, không phải deprecated.

```tsx
// ✅
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
}

// ❌ lỗi runtime
export default function Page({ params }: { params: { id: string } }) {
  const id = params.id
}
```

Trong client component thì dùng `useParams()` / `useSearchParams()` như cũ.

`searchParams` là `ReadonlyURLSearchParams` — đọc bằng `.get()`, không index kiểu mảng.

## 2. Turbopack là bundler duy nhất‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

Cấu hình webpack trong `next.config.ts` bị __bỏ qua im lặng__ — không báo lỗi, chỉ là không có tác dụng. Đừng thêm.

## 3. `NODE_ENV` luôn là `production` sau build‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

Gate Demo Toolbar bằng `process.env.NODE_ENV === 'development'` → toolbar biến mất ngay khi build, tức đúng lúc đưa cho người xem. Dùng `NEXT_PUBLIC_DEMO_MODE` (mặc định bật, đặt `off` để tắt).

## 4. Tailwind v4 không có file config‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

Không có `tailwind.config.ts`. Theme sống trong `globals.css`:

```css
@import "tailwindcss";

:root {
  --background: #ffffff;
  --primary: #FCD535;
}

@theme inline {
  --color-background: var(--background);
  --color-primary: var(--primary);
}
```

Hai bẫy:
- **Tên biến trong `:root`/`.dark` phải khớp chính xác** ánh xạ `--color-*` trong `@theme inline`. Lệch một ký tự → màu im lặng về mặc định.
- **`border-color` mặc định đổi thành `currentColor`** → viền ăn theo màu chữ, trông sai. Luôn ghi rõ `border-border` hoặc đặt `--border-color-DEFAULT`.

`components.json` phải có `"tailwind": { "config": "" }` cho shadcn hiểu là v4.

## 5. localStorage cần `"use client"` + gate hydration

Mọi component chạm store persist phải `"use client"` và nằm trong `HydrationGate`. Không có ngoại lệ — chi tiết ở `state-architecture.md`.‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

## 6. StrictMode double-render ở dev

`useEffect` chạy 2 lần ở dev. Seed dữ liệu phải __idempotent__ (kiểm tra tồn tại trước khi thêm), không thì bản ghi mẫu nhân đôi ở dev mà bản build lại đúng — kiểu bug khó lần nhất.

## 7. Caching là opt-in

Bản này dùng `'use cache'` thay vì cache ngầm. Prototype chạy client-state nên gần như không đụng — nhưng __đừng bê lời khuyên caching viết cho Next 14__ vào.

## 8. `next dev` tự nhảy cổng

Cổng 3000 bận → tự chuyển 3001, 3002... __Phải đọc log lấy cổng thật__, đừng giả định 3000 rồi báo URL sai cho người dùng.

```bash
cd prototype && npm run dev    # chạy nền, đọc log lấy dòng "Local: http://localhost:XXXX"
```

## 9. Thêm shadcn component

```bash
cd prototype && npx shadcn@latest add dialog sonner checkbox
```

Đọc `prototype/src/components/ui/` trước — hiện đã có `button`, `input`, `card`, `label`. Đừng viết tay bản trùng.

## 10. Chẩn đoán build lỗi — thứ tự thử

| Triệu chứng | Nguyên nhân thường gặp |
|---|---|
| `params` should be awaited | Mục 1 |
| `useState`/`useEffect` in Server Component | Thiếu `"use client"` |
| Hydration failed | Đọc localStorage không qua gate (Mục 5) |
| Màu về mặc định, không lỗi gì | Lệch tên biến Tailwind v4 (Mục 4) |
| Module not found `@/components/ui/x` | Chưa `npx shadcn add x` |
| Viền màu lạ | `border-color: currentColor` (Mục 4) |
| Bản ghi mẫu nhân đôi ở dev | StrictMode (Mục 6) |‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍


<!-- wm:2b9af6c9b691879b1ddb7a04d29a1c88 -->
<sub>Tài liệu thuộc bộ AI4BA BA-Kit — bản quyền ai4ba.com</sub>
