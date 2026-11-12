"use client";

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useI18n } from "./i18n-provider";

type Text = [string, string];

/* Every shortcut the app already handles, in one place (opened with "?"), so they are discoverable. */
const GROUPS: Array<{ title: Text; items: Array<[string[], Text]> }> = [
  { title: ["Chung", "General"], items: [
    [["Ctrl", "K"], ["Tìm nhanh trang, kỳ, lần chạy, hành động", "Quick search for pages, periods, runs, actions"]],
    [["/"], ["Mở tìm nhanh", "Open quick search"]],
    [["?"], ["Bảng phím tắt này", "This list of shortcuts"]],
  ] },
  { title: ["Biểu đồ Gantt", "Gantt chart"], items: [
    [["←", "→"], ["Chuyển sang lượt trước / sau", "Previous / next run"]],
    [["Enter"], ["Làm nổi dòng sản phẩm (khi sửa: chọn lượt)", "Highlight the product line (when editing: select the run)"]],
  ] },
  { title: ["Sửa lịch bằng tay", "Editing by hand"], items: [
    [["Ctrl", "Z"], ["Hoàn tác", "Undo"]],
    [["Ctrl", "Shift", "Z"], ["Làm lại", "Redo"]],
    [["L"], ["Khoá / mở khoá lượt đang chọn", "Lock / unlock the selected run"]],
    [["Esc"], ["Bỏ chọn lượt", "Deselect the run"]],
  ] },
];

export function ShortcutsDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { t } = useI18n();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("Phím tắt", "Keyboard shortcuts")}</DialogTitle>
          <DialogDescription>{t("Phím tắt không chạy khi đang gõ trong ô nhập.", "Shortcuts are ignored while typing in a field.")}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          {GROUPS.map((group) => (
            <section key={group.title[0]} className="grid gap-1.5">
              <h3 className="text-xs font-semibold text-muted-foreground">{t(...group.title)}</h3>
              <dl className="grid gap-1">
                {group.items.map(([keys, text]) => (
                  <div key={keys.join("+")} className="flex items-center justify-between gap-3 text-sm">
                    <dt>{t(...text)}</dt>
                    <dd className="flex shrink-0 gap-1">{keys.map((key) => <kbd key={key} className="rounded border bg-muted px-1.5 py-0.5 text-xs font-medium">{key}</kbd>)}</dd>
                  </div>
                ))}
              </dl>
            </section>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
