# /figma — Drawing patterns dùng chung‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

> Tham chiếu từ `SKILL.md`. Toàn bộ chi tiết kỹ thuật vẽ lên Figma qua **reqwise-figma MCP** (token setup, element pattern, auto-layout, session state, verify bằng layout_audit, icon names, bug đã gặp) — tách ra để phần chính dễ đọc. Áp dụng y hệt cho cả 2 chế độ (Nhanh và Đầy đủ).
>
> **Nguồn sự thật cuối cùng là `figma_docs` + `figma_rules`** — load `figma_docs` (`rules` + `layout` + `api` + `tokens` + `icons` + `recipes`) ở Phase 0. File này là bản rút gọn đã map sang design-tokens/device của vault; **khi lệch, tin `figma_docs`**. reqwise cũng dạy qua lỗi: mọi error là `{code, message, hint}` — đọc `hint`, nó nói bước tiếp theo. API đầy đủ ở `docs/TOOLS.md` trong repo reqwise-figma-mcp (nơi MCP cài trên máy, path tùy máy), mẫu copy-paste ở `docs/RECIPES.md`.

## 2 nguyên tắc bất di bất dịch (đọc trước tiên)‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

Đây là gốc của phần lớn lỗi layout/màu:

1. **AUTO-LAYOUT, KHÔNG absolute x/y cho children.** Trong 1 screen frame, con KHÔNG đặt bằng `x`/`y`. Screen là **VERTICAL auto-layout**, con xếp theo `itemSpacing` + `layoutAlign: "STRETCH"`. Cần định vị tương đối (căn giữa modal, pin cạnh) → dùng `inset: {left,right,top,bottom}` + `align: "center"|"center-x"|"center-y"` trên `create` — **plugin tự tính toạ độ**, đừng tự làm số học từ bounds cha. x/y ở tầng screen chỉ dùng để đặt grid giữa các **FRAME** (chúng là sibling trên page).
2. **TOKEN-FIRST: create(hex) → applyVariable, KHÔNG dừng ở hex.** Mỗi node có màu/radius/spacing phải `applyVariable` sau khi tạo, nếu không là hardcode. Cách gọn: gom binding vào 1 mảng rồi loop (xem § Token Setup). **Font: set `fontSize` + `fontName:{family,style}` INLINE khi create TEXT** — reqwise KHÔNG có `applyTextStyle`/named text-style (`setupTokens({textStyles})` bị bỏ qua). Đây là ngoại lệ hợp lệ so với "token hoá mọi thứ": typography đi inline.

## Session state — setup 1 lần, tái dùng qua các call‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

Khác figma-ui-mcp cũ (redeclare mọi thứ mỗi call), reqwise có object `state` **persist qua các `figma_write` call trong CÙNG session**. Truyền cùng `sessionId` (hoặc bỏ trống dùng default session) để chia state.

```javascript
// call ĐẦU: setup token + lưu id gốc
await figma.setupTokens({ /* ... */ });   // kết quả cũng nằm ở state.tokens
state.rootId = (await figma.create({ type: "FRAME", name: "01 · Login", width: W, height: H })).id;

// call SAU (cùng sessionId): state.tokens + state.rootId vẫn còn — KHÔNG redeclare
await figma.create({ type: "TEXT", parentId: state.rootId, characters: "Đăng nhập", wrap: true });
```

> Điều DUY NHẤT cần lặp lại giữa call là **varMap `V`** nếu muốn helper `bind()` cục bộ — nhưng có thể lưu `state.V` ở call đầu rồi đọc lại. Không còn ràng buộc "redeclare ALL const mỗi call".

## Kích thước khung (dẫn xuất từ device đã chốt ở Phase 1)‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

**Mọi pattern dưới đây dùng biến, KHÔNG dùng số literal.** Device do user chốt (Mục 7 `ba-conventions.md`):

```javascript
// W/H = device đã chốt ở Phase 1 — KHÔNG hardcode
const W = {frameW};   // Mobile 375 · Tablet 768 · Desktop 1024
const H = {frameH};   // Mobile 812 · Tablet 1024 · Desktop 768
const PAD = 24;                // padding screen frame (Desktop dùng 32)
const STEP_X = W + 80;         // grid gap ngang giữa các FRAME (Phase 4)
const STEP_Y = H + 120;        // grid gap dọc

// Form/auth/dialog trên Tablet/Desktop: box hẹp căn giữa (ba-conventions Mục 8)
const FORM_W = Math.min(W - PAD * 2, 420);
```

> **Screen frame là VERTICAL auto-layout với `paddingLeft/Right: PAD`** → con dùng `layoutAlign: "STRETCH"` tự full-width.
> **Form/auth/dialog** trên Tablet/Desktop: bọc con vào 1 frame `wf-form` rộng `FORM_W`, căn giữa bằng screen frame `counterAxisAlignItems: "CENTER"` hoặc `align: "center-x"` trên frame con. Full-content screen (dashboard/list) trải thẳng theo `layoutAlign: "STRETCH"`.

## Multi-tab — pin sessionId (khi user mở ≥2 file Figma)‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

`figma_status` trả `sessions[]`. Có ≥2 file connected → **hỏi user vẽ vào file nào**, rồi pin `sessionId` cho MỌI `figma_write`/`figma_read` sau đó (state cũng theo session này). Bỏ qua = op rơi non-deterministic. Sessions process-local (sống ở leader); follower forward về leader nên `sessionId` hành xử nhất quán.

```javascript
// figma_write({ code: "...", sessionId: "abc123" })
// figma_read({ op: "screenshot", params: { nodeId: frame.id }, sessionId: "abc123" })
```

## Token Setup (call ĐẦU của session — lưu vào state.tokens)

```javascript
// 1. setupTokens: colors (đa-mode) + numbers + fontSizes + fonts + textStyles — idempotent, set MỌI mode
const tokens = await figma.setupTokens({
  collectionName: "Design Tokens",
  colors: {
    // 1 hex = set cho mọi mode; object {light,dark} = set per-mode (fix bug figma-ui-mcp chỉ set mode hiện tại)
    "canvas":     "{canvas hex}",
    "surface":    "{surface-card hex}",
    "elevated":   "{surface-elevated hex}",
    "primary":    "{primary hex}",
    "on-primary": "{on-primary hex}",
    "text-base":  "{text-primary hex}",
    "text-sub":   "{text-secondary hex}",
    "text-muted": "{text-muted hex}",
    "positive":   "{positive hex}",
    "negative":   "{negative hex}",
    "info":       "{info hex}"
  },
  numbers: {
    "r-sm": {radius-sm}, "r-md": {radius-md}, "r-lg": {radius-lg}, "r-xl": {radius-xl},
    "sp-sm": 8, "sp-md": 16, "sp-lg": 24
  },
  fontSizes: { "t-xs": 11, "t-sm": 12, "t-body": 14, "t-h-md": 16, "t-h-lg": 20, "t-h-xl": 24 },
  fonts:     { "font-primary": "{font từ design.md, mặc định Inter}" },
  textStyles: {
    "text/heading-xl": { fontFamily: "{font-primary}", fontWeight: "Bold",     fontSize: "{t-h-xl}", lineHeight: 32 },
    "text/heading-md": { fontFamily: "{font-primary}", fontWeight: "SemiBold", fontSize: "{t-h-md}", lineHeight: 24 },
    "text/body":       { fontFamily: "{font-primary}", fontWeight: "Regular",  fontSize: "{t-body}", lineHeight: 20 },
    "text/label":      { fontFamily: "{font-primary}", fontWeight: "SemiBold", fontSize: "{t-sm}",   lineHeight: 18 },
    "text/caption":    { fontFamily: "{font-primary}", fontWeight: "Regular",  fontSize: "{t-xs}",   lineHeight: 16 }
  }
});

// 2. Build varMap (dùng cho applyVariable) — modern ES OK
const vars = await figma.getVariables();
const V = {};
for (const col of vars.collections)
  for (const v of col.variables) V[v.name] = v.id;
state.V = V;   // lưu để call sau đọc lại, khỏi build lại

// 3. Helper bind — gọi sau mỗi create có màu/radius/spacing
async function bind(nodeId, field, varName) {
  if (V[varName]) await figma.applyVariable(nodeId, field, varName);
  // applyVariable(nodeId, field, tokenName) — bind theo TÊN token, không cần id thủ công
}
// dùng: await bind(btn.id, "fills", "primary"); await bind(btn.id, "cornerRadius", "r-md");
```

> **Đọc design system SẴN CÓ trong file Figma trước khi tạo mới:** nếu file Figma đã có tokens/components (dự án đang chạy), gọi `figma_rules` (1 call ra rule sheet styles + variables + components) → tái dùng token/text-style/component đã có (`applyVariable`, `findOrCreateComponent`), đừng ghi đè. Cần spec bền cho file lớn → `figma_read` op `generate_design_md` lưu thành `design.md`.

## Batch — GOM create vào 1 round-trip (hiệu năng, chống timeout)

1 screen 20-40 element mà `await create()` tuần tự = 20-40 round-trip → chậm + hay timeout. Dùng `figma.batch(ops)` — **1 MCP round-trip**, server stream theo **chunk 20** (reset timeout mỗi chunk), **không cap cứng** (200+ op vẫn chạy), **partial-commit** (item lỗi không huỷ cả batch), báo lỗi theo **index gốc**:

```javascript
// Tạo frame cha trước (cần id để làm parentId)
const frame = await figma.create({ type: "FRAME", name: "01 · Login", x: gx, y: gy, width: W, height: H,
  fills: [{ type: "SOLID", color: "{canvas hex}" }], clipsContent: true, layoutMode: "VERTICAL",
  counterAxisAlignItems: "CENTER", paddingLeft: PAD, paddingRight: PAD, paddingTop: 48, paddingBottom: 48, itemSpacing: 16 });
await bind(frame.id, "fills", "canvas");

// Gom con vào 1 batch — thứ tự trong mảng = thứ tự layer (auto-layout xếp theo itemSpacing)
const res = await figma.batch([
  { op: "create", params: { type: "TEXT", parentId: frame.id, characters: "Đăng nhập", textAlignHorizontal: "CENTER", layoutAlign: "STRETCH" } },
  { op: "create", params: { type: "FRAME", parentId: frame.id, name: "Input · email", height: 48, layoutAlign: "STRETCH",
      layoutMode: "HORIZONTAL", counterAxisAlignItems: "CENTER", paddingLeft: 16, paddingRight: 16,
      fills: [{ type: "SOLID", color: "{surface hex}" }], cornerRadius: 8 } },
  // ...200+ op cũng được
]);
// res.results[i] có { index, ok, result:{id} | error:{code,message} } — sort tăng theo index gốc
// res.ok / res.failed đếm nhanh; đọc res.results.filter(r=>!r.ok) để xử lỗi từng item
```

> **`resultDetail: "ids"`** trim mỗi item chỉ còn node id (đỡ token) nếu chỉ cần id: `figma.batch(ops, { resultDetail: "ids" })`.
> **Element có con lồng** (input+icon, button+label, banner+icon+text): tạo frame cha trong batch, lấy `res.results[i].result.id`, rồi call tiếp cho con — hoặc tạo tuần tự khi cần id ngay. Đừng ép mọi thứ vào 1 batch nếu phải biết id giữa chừng. **Nested batch bị từ chối** (`INVALID_PARAMS`).
> Sau batch, chạy vòng `applyVariable` cho các id vừa nhận (màu/radius/spacing). Typography đã set inline lúc create (`fontSize`+`fontName`).

## Screen Frame (VERTICAL auto-layout — KHÔNG absolute x/y cho con)

```javascript
const frame = await figma.create({
  type: "FRAME", name: "{NNN} · {Screen Name}",
  x: {gridX}, y: {gridY},           // grid giữa các FRAME — chỗ DUY NHẤT dùng x/y ở tầng screen
  width: W, height: H,
  fills: [{ type: "SOLID", color: "{canvas hex}" }], clipsContent: true,
  layoutMode: "VERTICAL",
  primaryAxisSizingMode: "FIXED", counterAxisSizingMode: "FIXED",
  primaryAxisAlignItems: "MIN",
  counterAxisAlignItems: "CENTER",  // căn giữa form box; full-content thì MIN
  paddingLeft: PAD, paddingRight: PAD, paddingTop: 48, paddingBottom: 48,
  itemSpacing: 16
});
await bind(frame.id, "fills", "canvas");
```

Frame name format: `{2-digit-order} · {Screen Display Name}` (vd `01 · Login`, `02 · Signup`).

## Element Patterns (auto-layout children — thêm vào screen/form frame, KHÔNG x/y)

> Mỗi element full-width dùng `layoutAlign: "STRETCH"`. **Sau create, bind màu + radius + apply text style.**

**Input field (full-width):**
```javascript
const inp = await figma.create({
  type: "FRAME", parentId: parent.id, name: "Input",
  height: 48, layoutAlign: "STRETCH",
  fills: [{ type: "SOLID", color: "{surface hex}" }], cornerRadius: {r-lg},
  strokes: [{ type: "SOLID", color: "{elevated hex}" }], strokeWeight: 1,
  layoutMode: "HORIZONTAL", primaryAxisAlignItems: "MIN", counterAxisAlignItems: "CENTER",
  paddingLeft: 16, paddingRight: 16,
  primaryAxisSizingMode: "FIXED"     // nhận chiều rộng từ STRETCH (không AUTO — AUTO ghi đè STRETCH)
});
const inpTxt = await figma.create({ type: "TEXT", parentId: inp.id, characters: "you@example.com", layoutGrow: 1,
  fontSize: 15, fontName: { family: "Inter", style: "Regular" } });   // typography INLINE (không có applyTextStyle)
await bind(inp.id, "fills", "surface"); await bind(inp.id, "strokes", "elevated"); await bind(inp.id, "cornerRadius", "r-lg");
await bind(inpTxt.id, "fills", "text-muted");
```

**Password input (với eye icon):**
```javascript
const pw = await figma.create({ type: "FRAME", parentId: parent.id, height: 48, layoutAlign: "STRETCH",
  layoutMode: "HORIZONTAL", primaryAxisAlignItems: "SPACE_BETWEEN", counterAxisAlignItems: "CENTER",
  paddingLeft: 16, paddingRight: 16, primaryAxisSizingMode: "FIXED",
  fills: [{ type: "SOLID", color: "{surface hex}" }], cornerRadius: {r-lg},
  strokes: [{ type: "SOLID", color: "{elevated hex}" }], strokeWeight: 1 });
await figma.create({ type: "TEXT", parentId: pw.id, characters: "••••••••" });
await figma.loadIcon("eye", { parentId: pw.id, size: 20, color: "{text-muted hex}" });
// + bind fills/strokes/cornerRadius như trên
```

**Primary button:**
```javascript
const btn = await figma.create({
  type: "FRAME", parentId: parent.id, name: "btn/primary",
  height: 48, layoutAlign: "STRETCH",
  fills: [{ type: "SOLID", color: "{primary hex}" }], cornerRadius: {r-md},
  layoutMode: "HORIZONTAL", primaryAxisAlignItems: "CENTER", counterAxisAlignItems: "CENTER",
  primaryAxisSizingMode: "FIXED",
  paddingBottom: 3   // bù baseline Inter cho text căn giữa
});
const lbl = await figma.create({ type: "TEXT", parentId: btn.id, characters: "Đăng nhập",
  fontSize: 15, fontName: { family: "Inter", style: "Semi Bold" } });
await bind(btn.id, "fills", "primary"); await bind(btn.id, "cornerRadius", "r-md");
await bind(lbl.id, "fills", "on-primary");
```

**Secondary button (outlined):** `fills: surface, strokes: elevated`, text `text-base`. Bind tương tự.

**Divider "hoặc":**
```javascript
const divRow = await figma.create({ type: "FRAME", parentId: parent.id, height: 20, layoutAlign: "STRETCH",
  fillOpacity: 0,   // KHÔNG opacity:0 (ẩn children); fillOpacity:0 hoặc bỏ fills (FRAME reqwise mặc định transparent)
  layoutMode: "HORIZONTAL", primaryAxisAlignItems: "SPACE_BETWEEN", counterAxisAlignItems: "CENTER", itemSpacing: 12,
  primaryAxisSizingMode: "FIXED" });
await figma.create({ type: "RECTANGLE", parentId: divRow.id, height: 1, layoutGrow: 1, fills: [{ type: "SOLID", color: "{elevated hex}" }] });
await figma.create({ type: "TEXT", parentId: divRow.id, characters: "hoặc" });
await figma.create({ type: "RECTANGLE", parentId: divRow.id, height: 1, layoutGrow: 1, fills: [{ type: "SOLID", color: "{elevated hex}" }] });
```

> **FRAME/COMPONENT không set `fills` → reqwise mặc định TRANSPARENT** (không phải trắng như Figma default). Nên wrapper layout không còn biến thành "tấm trắng" vô tình — chỉ set `fills` cho surface muốn nhìn thấy.

**Horizontal row SPACE_BETWEEN (vd Remember me + Forgot):**
```javascript
const row = await figma.create({ type: "FRAME", parentId: parent.id, height: 20, layoutAlign: "STRETCH",
  fillOpacity: 0,
  layoutMode: "HORIZONTAL", primaryAxisAlignItems: "SPACE_BETWEEN", counterAxisAlignItems: "CENTER",
  primaryAxisSizingMode: "FIXED" });
```

**Centered title / logo:** TEXT trong VERTICAL parent với `textAlignHorizontal: "CENTER"` + `layoutAlign: "STRETCH"` (CẢ HAI — `textAlignHorizontal` căn glyph TRONG box, `layoutAlign:"STRETCH"` cho box đủ rộng để thấy căn giữa; hug-width thì LEFT vs CENTER nhìn y hệt). KHÔNG dùng `align:"center"` cho việc này — `align` di chuyển cả NODE, không căn nội dung text:
```javascript
const title = await figma.create({ type: "TEXT", parentId: parent.id, characters: "Đăng nhập",
  fontSize: 22, fontName: { family: "Inter", style: "Bold" },   // typography inline
  textAlignHorizontal: "CENTER", layoutAlign: "STRETCH" });
await bind(title.id, "fills", "text-base");   // typography inline khi create title (fontSize+fontName), KHÔNG applyTextStyle
```

**Info banner (icon + wrapping text):**
```javascript
const banner = await figma.create({ type: "FRAME", parentId: parent.id, layoutAlign: "STRETCH",
  fills: [{ type: "SOLID", color: "{surface hex}" }], cornerRadius: {r-lg},
  strokes: [{ type: "SOLID", color: "{elevated hex}" }], strokeWeight: 1,
  layoutMode: "HORIZONTAL", primaryAxisAlignItems: "MIN", counterAxisAlignItems: "MIN",
  paddingLeft: 14, paddingRight: 14, paddingTop: 12, paddingBottom: 12, itemSpacing: 10,
  primaryAxisSizingMode: "FIXED", counterAxisSizingMode: "AUTO" });   // cao tự giãn theo text
await figma.loadIcon("info", { parentId: banner.id, size: 16 });
// loadIcon color KHÔNG áp lên lucide (stroke-based) → set stroke vector con nếu cần đổi màu (xem "Status badge")
const bt = await figma.create({ type: "TEXT", parentId: banner.id, wrap: true, characters: "Nội dung thông báo...",
  layoutGrow: 1, fontSize: 13, fontName: { family: "Inter", style: "Regular" } });   // typography inline
// wrap:true tự set layoutAlign STRETCH + textAutoResize HEIGHT + lineHeight ~1.45×; cần parent có bề rộng cố định để wrap
// bind fills token cho text
```

**Status badge (success / error / info indicator) — nền ĐẶC + icon TRẮNG:**
```javascript
// Chuẩn success/error state: circle NỀN MÀU STATUS ĐẶC + icon TRẮNG đậm.
// KHÔNG dùng nền tint nhạt (12%) + icon nét mảnh → lên hình nhìn YẾU/gần vô hình trên card trắng.
const circle = await figma.create({ type: "FRAME", parentId: parent.id, width: 56, height: 56, cornerRadius: 28,
  layoutMode: "HORIZONTAL", primaryAxisAlignItems: "CENTER", counterAxisAlignItems: "CENTER",
  primaryAxisSizingMode: "FIXED", counterAxisSizingMode: "FIXED" });
await bind(circle.id, "fills", "positive");          // NỀN ĐẶC status (positive/negative/info)
await figma.loadIcon("check", { parentId: circle.id, size: 28, color: "#ffffff" });
// QUAN TRỌNG: loadIcon color KHÔNG áp được lên lucide vector (lucide vẽ bằng STROKE, không fill)
// → phải set STROKE của vector con về màu muốn (trắng), + strokeWeight dày cho rõ:
const ik = await figma.getChildren(circle.id);       // [ icon-frame ]
for (const f of ik) for (const v of (await figma.getChildren(f.id)))
  { await bind(v.id, "strokes", "on-status"); await figma.modify(v.id, { strokeWeight: 2.5 }); }
// (setup 1 token "on-status": "#ffffff" ở call đầu). icon ≈ container × 0.5. NEVER icon ≥ container.
```

**Modal (overlay + card) — dùng `figma.overlay()` + `align`, đây là chỗ hợp lệ cho absolute/center:**
```javascript
// 1. Scrim = figma.overlay() → tạo RECTANGLE đúng lớp (KHÔNG tự dựng FRAME opacity, dim cả subtree)
await figma.overlay({ parentId: frame.id, color: "#000000", opacity: 0.6, insertAt: "top" });

// 2. Modal card — căn giữa bằng align, KHÔNG tự tính (W-FORM_W)/2
const modal = await figma.create({ type: "FRAME", parentId: frame.id,
  width: FORM_W, align: "center", insertAt: "top",
  fills: [{ type: "SOLID", color: "{surface hex}" }], cornerRadius: {r-xl},
  strokes: [{ type: "SOLID", color: "{elevated hex}" }], strokeWeight: 1,
  layoutMode: "VERTICAL", primaryAxisAlignItems: "MIN", counterAxisAlignItems: "MIN",
  paddingLeft: 20, paddingRight: 20, paddingTop: 24, paddingBottom: 24, itemSpacing: 14,
  primaryAxisSizingMode: "AUTO",     // cao tự giãn theo content
  counterAxisSizingMode: "FIXED" }); // rộng CỐ ĐỊNH = FORM_W ← BẮT BUỘC chống tràn

// 3. Con full-width trong modal: layoutAlign STRETCH
await figma.create({ type: "TEXT", parentId: modal.id, wrap: true, characters: "Nội dung...", layoutAlign: "STRETCH" });

// 4. Button row: mỗi nút layoutGrow:1 chia đều
const btnRow = await figma.create({ type: "FRAME", parentId: modal.id, height: 44, fillOpacity: 0,
  layoutMode: "HORIZONTAL", counterAxisAlignItems: "CENTER", itemSpacing: 10, layoutAlign: "STRETCH", primaryAxisSizingMode: "FIXED" });
await figma.create({ type: "FRAME", parentId: btnRow.id, height: 44, layoutGrow: 1,
  fills: [{ type: "SOLID", color: "{elevated hex}" }], cornerRadius: {r-md},
  layoutMode: "HORIZONTAL", primaryAxisAlignItems: "CENTER", counterAxisAlignItems: "CENTER" });
```

> `insertAt: "top"` trên cả scrim lẫn modal — vẽ scrim trước, modal sau, cả 2 pin `"top"` để nằm trên content sẵn có.

**Google OAuth button:** FRAME CENTER/CENTER + `itemSpacing:10`, con = circle chữ "G" + TEXT. Bind như button thường.

## Layer Order & `insertAt`

reqwise có `insertAt` trên `create`/`move` — **đừng phụ thuộc thứ tự tạo** khi cần kiểm soát z-order:
```
insertAt: "top" | "bottom" | { above: nodeId } | { below: nodeId } | index
```
- Trong screen frame auto-layout: thứ tự tạo = thứ tự dọc (top→bottom) — bình thường không cần insertAt.
- Overlay/modal: content trước → `figma.overlay()` (RECTANGLE) → modal card, cả overlay + modal `insertAt: "top"`.

## State-Variant Frame (chế độ Đầy đủ) — clone + childMap

reqwise `clone` trả `{ id, childMap }` map id-con-gốc → id-con-clone → định vị đúng node cần đổi **không cần search theo tên**:

```javascript
const cl = await figma.clone(baseFrame.id, { parentId: page.id });
await figma.move(cl.id, { x: {gridX}, y: {gridY} });
await figma.modify(cl.id, { name: "01b · Login (submitting)" });
// đổi đúng node con: dùng childMap
const clonedBtnId = cl.childMap[baseBtnId];       // id-clone tương ứng btn gốc
await figma.modify(clonedBtnId, { /* fills disabled, characters "Đang xử lý..." */ });
```
Đặt tên: `{order}{a/b/c} · {Screen Name} ({state name})` — vd `01b · Login (submitting)`, `01c · Login (error)`.

> Bộ state có cấu trúc lặp (button Default/Pressed/Disabled) cân nhắc `figma.createVariants(baseSpec, axesOrList)` → 1 **component set** thật (Size×State matrix, cap 50 combo), thay vì clone rời rạc.

## Prototyping — nối frame clickable

⚠️ **reqwise-figma MCP hiện CHƯA có op prototype/reaction.** Danh sách write op thật (`plugin/code.js`, xác minh bằng grep khi nghi ngờ): create/modify/delete/clone/move/resize/group/ungroup/flatten/batch/find_component/find_or_create_component/instantiate/create_variants/arrange_component_set/set_component_description/componentize/setup_tokens/apply_variable/create_variable/update_variable/rename_variable/delete_variable/import_tokens/set_text/load_icon/load_image/create_page/set_current_page/create_overlay/set_selection/zoom_to_fit/get_instance_overrides/set_instance_overrides/detach_instance/reset_instance_overrides/set_selection_colors/set_gradient/set_effects. **KHÔNG có `set_reactions`/`setReactions`** — đó là API tưởng tượng từ figma-ui-mcp cũ.

→ Muốn bản Figma bấm-chạy-được thì **KHÔNG hứa với user rồi mới phát hiện không làm được**. 2 lối:
- Chuyển sang `/prototype-html {feature}` (HTML prototype clickable thật, chạy như app).
- Hoặc thêm op `set_reactions` vào MCP reqwise trước (repo reqwise-figma-mcp trên máy cài MCP) rồi mới nối — đây là việc mở rộng MCP, không phải chạy được ngay trong skill.

> Quy tắc chung: TRƯỚC khi hứa 1 khả năng (prototype, attachment, transition...), **kiểm op có thật trong `plugin/code.js`/`figma_docs(section:"api")`** — capability discovery, đừng bám recipe cũ.

## Component reuse (chế độ Đầy đủ — bắt buộc trước mỗi element lặp)

```javascript
// dryRun để thấy quyết định trước: reuse cái nào / vì sao
const dec = await figma.findOrCreateComponent("btn/primary", { type: "COMPONENT" /* spec */ }, { dryRun: true });
// dec.decision "reuse"|"create", dec.score, dec.reason — minh bạch
if (dec.decision === "reuse") {
  await figma.instantiate("btn/primary", { parentId: frame.id, props: { label: "Đăng nhập" } });
} else {
  const comp = await figma.findOrCreateComponent("btn/primary", { type: "COMPONENT" /* spec đầy đủ */ });
  await figma.instantiate(comp.id, { parentId: frame.id, props: { label: "Đăng nhập" } });
}
```

> `instantiate` nhận **tên hoặc query** (fuzzy match; COMPONENT_SET resolve về variant mặc định). `props` đi qua component property → auto-layout **reflow đúng** khi đổi text (mỗi override báo `appliedVia: "property" | "name"`). Áp dụng cho element ≥2 lần trong feature: input, primary/secondary button, checkbox, divider, banner, modal shell.
> Đã vẽ 1 lần rồi copy quanh → `figma.componentize(nodeId, {name, replaceCopies:true})`: biến cây thành COMPONENT tại chỗ + thay mọi bản sao cùng cấu trúc bằng instance.

## Icon Names (reqwise — default library **lucide**, `searchIcons` resolve alias)

Quy trình 2 bước, **rẻ trước đắt**: `searchIcons(query)` chọn tên (KHÔNG fetch SVG) → `loadIcon(name)` fetch + vẽ.

```javascript
const cands = await figma.searchIcons("visibility"); // → [{ name:"eye", alias:"visibility", libraries:[...] }]
await figma.loadIcon("eye", { parentId: btn.id, size: 20, color: "{text-muted hex}" });
// loadIcon(name, { library, size, color, parentId }) — library ∈ lucide(default)|ionicons|tabler|bootstrap-icons
```

| Mục đích | Icon name (lucide) |
|----------|--------------------|
| Eye / show password | `eye` |‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍
| Eye-off / hide | `eye-off` |
| Email / mail | `mail` |
| Bell / notification | `bell` |
| Back arrow | `arrow-left` |
| Forward arrow | `arrow-right` / `chevron-right` |
| Check circle | `check-circle` |
| Checkmark | `check` |
| Warning / alert | `alert-triangle` |
| Info circle | `info` |
| Close / X | `x` |
| Settings / gear | `settings` |
| Person / user | `user` |
| Lock | `lock` |
| Shield | `shield-check` |
| Search | `search` |
| Add | `plus` |
| Trash | `trash` / `trash-2` |
| Edit / pencil | `pencil` |
| Clock | `clock` |

**Alias tự resolve** (searchIcons/loadIcon hiểu): `visibility→eye`, `delete→trash`, `done`/`checkmark→check`, `close`/`cancel→x`, `add→plus`, `edit→pencil`, `settings→gear`, `back→arrow-left`, `logout→log-out`, ~40 alias nữa. Tên không rõ → gọi `searchIcons` trước. **Miss** → `NODE_NOT_FOUND` kèm hint "retry searchIcons hoặc đổi library".
**Sizing:** icon = container × 0.5 (24→12, 40→20, 80→40). NEVER icon ≥ container.

## Sandbox — full modern ES (KHÔNG còn workaround cũ)

reqwise chạy Node `vm` → **grammar hiện đại đầy đủ**. Bỏ hết các né tránh của figma-ui-mcp:

```javascript
// ✅ optional chaining ?.   ✅ nullish coalescing ??   ✅ spread {...obj}/[...arr]
// ✅ destructuring   ✅ async/await   ✅ for..of   ✅ template literals
// ✅ Mọi figma.* đều là Promise → luôn await (trừ figma.batch cũng await, 1 round-trip)
// ❌ CHỈ cấm: require, process, fetch, setTimeout, eval  → SANDBOX_ERROR nếu dùng
// ✅ Reads gọi ngay trong figma_write: figma.getNodeById/getChildren/searchNodes/layoutAudit/screenshot...
//    (khỏi round-trip riêng qua figma_read)
```

## Verify bằng layout_audit (thay screenshot-eyeball)

```javascript
// Trong figma_write hoặc qua figma_read op "layout_audit"
const audit = await figma.layoutAudit(frame.id);
if (audit.summary.issues.length) console.warn(audit.summary.issues);
// per-node: declared vs rendered bounds, overflowsParent, clippedBy, textTruncated, zIndexWarnings, styleWarnings
// token-frugal: subtree sạch chỉ trả summary + nodeCount. verbose:true để dump đầy đủ.
```
`overflow`/`clipping`/`truncation` là **sự thật cấu trúc**, không phải phán đoán mắt. Verify bằng đây SAU mỗi frame; screenshot chỉ 1 lần cuối cho user nhìn.

## Grid Layout Convention (max 5 frame/hàng — tính từ device đã chốt)

```
Ví dụ Mobile W=375 H=812 → STEP_X=455, STEP_Y=932:

Feature authentication — Login flow (hàng 1, y=0), base + variants:
  01·Login    01b·Login(subm)  01c·Login(err)  02·Signup   02b·Signup(err)
  x=0         x=455            x=910           x=1365      x=1820
  → screen thứ 6 của flow này xuống hàng mới CÙNG flow (y=932), KHÔNG mở flow mới

Feature authentication — Forgot-password flow (hàng tiếp, y=1864):
  05·ForgotPw   06·ResetPw   07·AccountSecurity
```

`STEP_X = W + 80`, `STEP_Y = H + 120`. **Luôn tính lại từ device đã chốt** — desktop W=1024 mà lấy STEP_X của mobile → frame đè nhau. Note box đặt dưới frame liên quan, không tính vào cột grid.

## Warnings — đọc, đừng bỏ qua

reqwise trả `warnings: string[]` cạnh result cho op thành-công-nhưng-đáng-ngờ:
- **Clipping**: tạo node `x+w > parent.w` dưới parent `clipsContent` vẫn thành công + warn "will be clipped".
- **Opacity trên FRAME**: `opacity < 1` trên FRAME → warn dim cả subtree, gợi ý `figma.overlay()`.
- **wrap không có parent width cố định**: `wrap:true` mà parent không có bề rộng → warn "nothing to wrap against".
Warning từ item trong `figma.batch()` gom vào `warnings` cấp call. Xử lý theo warning, đừng lờ.

## Critical Bugs to Avoid

| Bug | Triệu chứng | Fix |
|-----|-------------|-----|
| Absolute x/y trong screen | Layout vỡ khi content đổi, lệch | Screen = VERTICAL auto-layout, con `layoutAlign:"STRETCH"` + `itemSpacing`. Căn giữa/pin → `inset`/`align`. x/y chỉ cho grid-frame trên page |
| Màu hardcode (quên applyVariable) | Rebrand không cập nhật | `create(hex)` → `bind(id, field, varName)` cho MỌI node có màu/radius/spacing |
| Font / named text-style | reqwise KHÔNG có `applyTextStyle`; `setupTokens({textStyles})` bị bỏ qua | Set `fontSize` + `fontName:{family,style}` **inline** khi create TEXT (cách đúng duy nhất) |
| Token chỉ set 1 mode | Dark mode giữ giá trị default | `setupTokens` set MỌI mode; per-mode dùng `{light,dark}` value |
| `counterAxisAlignItems:"STRETCH"` | Throw error | `"MIN"` trên parent + `layoutAlign:"STRETCH"` mỗi child |
| `primaryAxisSizingMode:"AUTO"` + STRETCH | Con hug content, bỏ qua STRETCH | HORIZONTAL child cần fill → `primaryAxisSizingMode:"FIXED"` |
| `layoutGrow:1` + `primaryAxisAlignItems:"CENTER"` | Con dồn 1 bên, mất căn giữa | Dùng `SPACE_BETWEEN` hoặc padding, KHÔNG trộn 2 cái |
| `opacity:0` trên wrapper FRAME | Ẩn hết children | Dùng `fillOpacity: 0` hoặc bỏ `fills` (FRAME reqwise mặc định transparent) |
| Scrim bằng FRAME opacity | Dim cả subtree, che content sau | `figma.overlay({parentId,color,opacity,insertAt:"top"})` → RECTANGLE đúng lớp |
| Modal width không lock | Modal tràn phải | `counterAxisSizingMode:"FIXED"` trên VERTICAL modal frame |
| Text không wrap | Text tràn box | `wrap:true` (parent phải có width cố định) — tự set STRETCH+HEIGHT+lineHeight |
| Centered text không giữa | Box stretch nhưng chữ vẫn trái | CẢ `textAlignHorizontal:"CENTER"` + `layoutAlign:"STRETCH"`. KHÔNG dùng `align` (di chuyển node, không căn glyph); `textAlign` trần bị MCP bỏ qua âm thầm — phải `textAlignHorizontal`. Enum sai → throw INVALID_PARAMS |
| Icon not found | `NODE_NOT_FOUND` "did you mean X?" | `searchIcons(query)` trước; lucide names (`eye`,`mail`,`arrow-left`,`bell`); đổi `library` |
| **`loadIcon` màu không hiện (icon đen/xám)** | lucide vector là **STROKE-based**, `loadIcon({color})` chỉ set FILL | Sau `loadIcon`, `getChildren` lấy vector con rồi `applyVariable(v,"strokes",token)` (+`strokeWeight` dày). Xem "Status badge" |
| **Status badge nhìn yếu/nhạt** | nền tint 12% + icon nét mảnh → gần vô hình | Nền circle **màu status ĐẶC** + icon **TRẮNG** (stroke) dày 2.5. Xem "Status badge" |
| **Row/brand-row bị co, lệch giữa dù `layoutAlign:"STRETCH"`** | `primaryAxisSizingMode:"AUTO"` (HORIZONTAL) hug width → parent center-align đẩy ra giữa; `SPACE_BETWEEN` vô hiệu | Row full-width cần **`primaryAxisSizingMode:"FIXED"` + `layoutAlign:"STRETCH"`** cùng lúc (áp cho brand bar, remember/forgot row, topbar SPACE_BETWEEN) |
| **`applyTextStyle` / named textStyle** | `SANDBOX_ERROR` — KHÔNG tồn tại trong reqwise; `setupTokens({textStyles})` bị bỏ qua | Set typography **inline** mỗi TEXT: `fontSize` + `fontName:{family,style}` (mọi recipe figma_docs làm vậy) |
| **setupTokens multi-mode `{light,dark}`** | `INTERNAL: Limited to 1 modes only` khi file plan Starter | Dùng **single-mode** (1 giá trị/token). Auth = transactional light → chỉ cần light values |
| Text căn giữa lệch lên ~3-4px | Inter ascender | Thêm `paddingBottom: 3` vào wrapper frame |
| Dùng banned global | `SANDBOX_ERROR` | KHÔNG `require`/`process`/`fetch`/`setTimeout`/`eval` — mọi ES khác OK |
| Page limit exceeded | `createPage` báo limit | `createPage` trả `{fallback:"current-page", reason}` KHÔNG throw → dùng page hiện tại |
| Content bị clip | Icon/text mất phần | Đọc `warnings` "will be clipped" + `layout_audit` `clippedBy`; sửa kích thước con |
| Op quá nhiều, timeout | Chậm/treo | Gom `figma.batch()` (stream chunk 20, reset timeout mỗi chunk, không cap) |
| Multi-tab op sai file | Vẽ nhầm file khi mở ≥2 tab | Pin `sessionId` mọi call (lấy từ `figma_status.sessions`) |
| Verify chỉ bằng mắt | Bỏ sót overflow/clip ngầm | `layout_audit(id)` đọc `summary.issues` TRƯỚC screenshot |
| **Chỉ tin `layout_audit`, bỏ qua thẩm mỹ** | audit CHỈ bắt lỗi cấu trúc (overflow/clip/truncate), KHÔNG bắt "nhìn yếu/nhạt/lệch/lạc màu" | Sau audit sạch, **chụp screenshot đánh giá bằng MẮT**: badge có đủ đậm? wordmark/row căn đúng? màu có lạc brand? Vẽ-đúng-token ≠ lên-hình-đẹp — audit=0 chưa phải xong |‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍


<!-- wm:2b9af6c9b691879b1ddb7a04d29a1c88 -->
<sub>Tài liệu thuộc bộ AI4BA BA-Kit — bản quyền hoangphan.blog</sub>
