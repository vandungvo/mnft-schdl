import { cva, type VariantProps } from 'class-variance-authority'

// Thẻ bọc mọi màn hình. NÓ sở hữu bề rộng và khoảng cách dọc ở cấp trang —
// màn hình không được tự đặt `max-w-*`, `mx-auto`, `px-*`, `py-*`.
//
// VÌ SAO: mỗi màn tự quyết bố cục thì màn thứ 12 sẽ khác màn thứ 1. Đo thật trên một
// prototype 10 màn: 3 bề rộng container khác nhau, trong đó 1 giá trị bị viết lại ở 2 file.
// Gom về một chỗ thì con số chỉ tồn tại một lần, và được duyệt một lần.
//
// KHÔNG nhận `className` — đó là chủ ý. Mỗi lối truyền class vào là một đường lách để
// đặt kiểu riêng cho một màn, và `cn()` trộn class khiến việc đó diễn ra âm thầm.
// Cần một bố cục chưa có thì THÊM biến thể ở đây, đừng lách ở nơi dùng.

const screen = cva('mx-auto w-full', {
  variants: {
    // Bề rộng nội dung — đặt theo khổ màn hình đã chốt với người dùng.
    width: {
      form: 'max-w-(--layout-form)',       // biểu mẫu hẹp: đăng nhập, đăng ký, hộp thoại
      content: 'max-w-(--layout-content)', // trang nội dung thường
      wide: 'max-w-(--layout-wide)',       // bảng biểu, danh sách rộng
      full: 'max-w-none',                  // tự trải hết khung
    },
    pad: {
      none: '',
      base: 'px-4 py-8 sm:px-6',
      loose: 'px-4 py-12 sm:px-6',
    },
    // Khoảng cách giữa các khối trong màn — ba lựa chọn, không phải thang tùy ý.
    gap: {
      none: '',
      tight: 'space-y-3',
      base: 'space-y-6',
      loose: 'space-y-10',
    },
  },
  defaultVariants: { width: 'content', pad: 'base', gap: 'base' },
})

type ScreenProps = VariantProps<typeof screen> & {
  children: React.ReactNode
  /** Thẻ HTML bọc ngoài. Mặc định `main`; dùng `section` khi lồng trong màn khác. */
  as?: 'main' | 'section' | 'div'
}

export function Screen({ children, as: Tag = 'main', width, pad, gap }: ScreenProps) {
  return <Tag className={screen({ width, pad, gap })}>{children}</Tag>
}
