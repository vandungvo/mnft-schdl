---
name: delegate
description: Dùng khi cần chia việc sang CLI AI khác để san tải quota — check quota, chọn model theo việc, điều phối đa vòng (decompose, review→fix, debate). `/delegate` hoặc khi user nhắc @codex/@gemini, "ý kiến thứ hai".
allowed-tools: Bash, Read, Write
user-invocable: true
argument-hint: "[codex|claude|gemini|all] \"<yêu cầu>\""
---
<!-- Licensed to vandungvo2003@gmail.com — Order YYWVQ3VWE -->

# /delegate — Điều phối việc cho CLI AI khác‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

> **Cần cấu hình trước khi dùng:** skill gọi CLI AI **khác** đã cài trên máy bạn
> (Codex CLI, Claude Code tài khoản khác, Gemini CLI...). Khai chúng ở
> `.claude/state/delegate-roster.yaml` — mở file đó xem hướng dẫn ngay đầu file, hoặc
> bảo Claude *"check & update roster"* để tự dò. Chưa cài CLI nào thì skill này chưa
> dùng được (mọi skill khác vẫn chạy bình thường — `/delegate` là tuỳ chọn).
>
> Đặt ở `.claude/skills/delegate/` (theo repo) hoặc `~/.claude/skills/delegate/`
> (global, mọi dự án) đều được — skill không phụ thuộc file nào của repo.

## Goal‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

Claude phiên chính là **kiến trúc sư + điều phối viên**. CLI ngoài
(codex/claude/gemini) là **thợ san tải** — đẩy việc nặng/bulk/song song ra ngoài,
giữ quota phiên chính cho việc nghĩ + chốt. 4 chế độ:

1. **Route thẳng** — việc nhỏ/rõ: gọi 1 CLI 1 phát.
2. **Decompose + route** — việc lớn/mơ hồ: Claude nghiên cứu context, tách sub-task, route mỗi phần.
3. **Review→fix loop** — làm(CLI) → review(Gemini) → fix → review lại, có trần.
4. **Debate + arbiter** — 2 CLI bất đồng → phản biện 1 vòng → Claude chốt.

Trước MỖI lượt gọi: (1) **check quota nếu đo được** (Bước 1 — tuỳ chọn, phần lớn CLI
không có API báo quota) → chọn tài khoản còn nhiều nhất, cân đều; (2) **chọn model
theo loại việc** (Bước 2) → việc dễ dùng model rẻ.

### Nguyên tắc phân việc (trục quyết định số 1 — user chốt)‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

> Áp TRƯỚC bảng Routing chi tiết. Khớp đặc tính model: Claude quản context rộng tốt,
> Codex/GPT-Sol soi edge-case tốt trên phạm vi hẹp.

- **Task DÀI** (đọc nhiều file/rule, ngữ cảnh rộng, refactor xuyên module) → **Claude**.
- **Task NGẮN** (atomic, spec rõ, phạm vi hẹp, cần chính xác/edge-case) → **Codex**.
- **Plan tổng quan / chia việc / kết-luận-tổng-hợp** → **Claude** (giữ ở phiên chính, không đẩy ra CLI).
- **Task phức tạp/dài/dễ thiếu case** → **LUÔN review chéo** (Chế độ B; người làm ≠ người review).
- **Research 2 pha:** thu-thập thông tin **có sẵn trong repo/máy** (grep/đọc file) → **Codex** (rẻ);
  thu-thập **từ web** (tra internet/URL) → **Claude** (Codex sandbox KHÔNG có network); **kết luận/tổng hợp** → **Claude**.
- **Cài đặt / setup / môi trường** → **Gemini hoặc Codex** (thao tác theo bước); nhưng **hướng dẫn cần CHI TIẾT/giải thích** → **Claude**.
- **Viết (doc/nội dung)** → **Claude hoặc Codex** tùy: cần văn phong/mạch lạc/ngữ cảnh rộng → Claude; cần bám khuôn mẫu/ngắn gọn → Codex.

> Cheat-sheet: **Dài/nghĩ/thẩm mỹ/plan/hướng-dẫn-chi-tiết/websearch/kết-luận → Claude ·
> Ngắn/chính xác/test/script/đào-repo/setup → Codex · Setup nhẹ → Gemini/Codex · Review → Gemini.**

## Khi nào dùng‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

User gõ `/delegate ...`, nhắc "@codex/@gemini", "hỏi Codex xem", "nhờ gemini review",
"ý kiến thứ hai", "hỏi cả 2", hoặc muốn đẩy việc nặng ra ngoài tiết kiệm quota.
KHÔNG dùng khi user không nhắc agent khác — tự làm bằng chính Claude.

## Roster — nguồn là file config, KHÔNG hardcode account‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

Danh sách CLI + chính sách sống ở **`.claude/state/delegate-roster.yaml`** (repo) —
Read file này đầu mỗi lần chạy để biết mục nào `enabled`. Mỗi mục là **một lệnh có
thật trong PATH**: có thể là CLI cài thẳng (`codex`, `claude`, `gemini` — trường hợp
phổ biến nhất), hoặc wrapper đa-tài-khoản do user tự tạo (tự set `CODEX_HOME`/
`CLAUDE_CONFIG_DIR` rồi exec binary gốc). Roster chưa có / rỗng / không mục nào
`enabled` → báo user "chưa cấu hình roster delegate" + hướng dẫn khai, KHÔNG đoán lệnh.

| Nhóm | Lệnh (theo roster) | Dùng cho | Ghi chú |
|---|---|---|---|
| Codex CLI (GPT-5.x) | `codex` (hoặc wrapper `codex-*`) | coding, refactor, bugfix, test, bulk, đào-repo | sandbox KHÔNG network |
| Claude Code | `claude` (hoặc wrapper `claude-*`) | research/websearch, plan, UI, tài liệu, kết-luận, tóm tắt | có network |
| Gemini CLI | `gemini` (hoặc wrapper) | **CHỈ review + trả feedback** | role `review-only` trong roster |

> **KHÔNG hardcode tên lệnh trong skill.** Mọi tên lệnh đọc từ roster. Máy mỗi người
> khác nhau (1 tài khoản hay nhiều, có wrapper hay không) — skill không được giả định.
>
> **Bỏ qua tài khoản đang chạy phiên chính này.** Nếu roster chỉ khai đúng `claude`
> trần mà đó cũng là phiên đang chạy → nhóm Claude coi như trống, route sang nhóm khác
> + nói rõ cho user (KHÔNG tự gọi lại chính mình).
>
> **Cờ per-launcher trong roster:** `enabled: false` → bỏ hẳn. `no_model_override: true`
> → tài khoản chỉ chạy model MẶC ĐỊNH, gọi phải BỎ `--model`/`-m`. `role: review-only`
> → chỉ giao review, không giao việc viết/sửa. Đọc cờ trước khi build lệnh.
>
> **Lệnh lỗi lúc gọi thật** (`command not found`, `No active credentials`, `usage limit`,
> `model not available`) → coi như không dùng được lượt đó, chuyển mục kế trong nhóm +
> báo user; lỗi lặp lại → gợi ý sửa roster (`enabled: false` / `no_model_override` /
> đổi tên model trong `models:`).

### `/delegate roster check` — dò + cập nhật roster

Khi user bảo "check & update roster" (hoặc CLI trên máy đổi):

1. **Dò CLI thật có trong PATH:** `command -v codex claude gemini` (+ `ls ~/.local/bin`
   lọc `codex-*`, `claude-*`, `gemini-*` nếu thư mục đó tồn tại — chỗ chứa wrapper
   đa-tài-khoản phổ biến, KHÔNG bắt buộc phải có).
2. **Đối chiếu `delegate-roster.yaml`** → báo **thiếu** (có trên máy, chưa khai) /
   **thừa** (đã khai, máy không có).
3. **Đề xuất L2 diff** cập nhật file yaml. Đồng thời re-run Bước 1 in quota (nếu đo được).

## Bước 1 — Check quota (TÙY CHỌN — bỏ qua được, skill vẫn chạy)

> **Phần lớn CLI AI KHÔNG có lệnh/API báo quota còn lại.** Vì vậy bước này chỉ chạy
> khi user có **nguồn đo quota ngoài** (một app quản-lý-đa-tài-khoản ghi ra file JSON),
> khai ở `quota_source.state_json` trong roster. **Để trống = bỏ qua bước này** — coi
> mọi mục `enabled` là dùng được, đi thẳng Bước 2. KHÔNG được vì thiếu quota mà từ
> chối chạy skill.

Có nguồn đo → mốc giờ **UTC**, cửa sổ theo `quota_window` trong roster (codex →
`weekly`, claude → `fiveHour`). Cơ chế: đọc từng mục `enabled` → nếu tên trỏ tới
wrapper trong `~/.local/bin` thì đọc text file đó (KHÔNG source) lấy `CODEX_HOME`/
`CLAUDE_CONFIG_DIR` → basename = account id → tra file JSON quota. Không resolve
được → in `unknown`, xử theo `routing.unknown_quota` (mặc định `allow`).

```bash
python3 - <<'PY'
import json, datetime, os, re, shutil
HOME=os.path.expanduser("~")
ROSTER=next((p for p in (
    os.path.join(os.getcwd(),".claude/state/delegate-roster.yaml"),
    f"{HOME}/.claude/state/delegate-roster.yaml") if os.path.exists(p)), "")
BIN=f"{HOME}/.local/bin"

if not ROSTER:
    print("ROSTER: chua co delegate-roster.yaml -> bao user khai roster, DUNG lai"); raise SystemExit

txt=open(ROSTER).read()

# 1) doc cac muc enabled (moi provider)
launchers=[]
for blk in re.split(r'\n\s*-\s+name:', txt):
    if 'provider:' not in blk: continue
    name=(re.match(r'\s*([\w.-]+)', blk) or [None,None])[1]
    prov=(re.search(r'provider:\s*(\w+)', blk) or [None,''])[1]
    win=(re.search(r'quota_window:\s*(\w+)', blk) or [None,'weekly'])[1]
    en=(re.search(r'enabled:\s*(\w+)', blk) or [None,'true'])[1]
    if name and en=='true': launchers.append((name,prov,win))

if not launchers:
    print("ROSTER: khong co muc nao enabled -> bao user, DUNG lai"); raise SystemExit

# 2) lenh co that trong PATH khong?
for name,prov,win in launchers:
    if not (shutil.which(name) or os.path.exists(f"{BIN}/{name}")):
        print(f"{name}\t[{prov}]\tKHONG THAY LENH trong PATH -> bo qua (sua roster)")

avail=[(n,p,w) for n,p,w in launchers if shutil.which(n) or os.path.exists(f"{BIN}/{n}")]

# 3) nguon do quota - TUY CHON. Khong khai / khong doc duoc -> bo qua, KHONG crash.
SW=(re.search(r'state_json:\s*"([^"]*)"', txt) or [None,''])[1]
SW=os.path.expanduser(SW) if SW else ""
state=None
if SW and os.path.exists(SW):
    try: state=json.load(open(SW))
    except Exception as e: print(f"(khong doc duoc nguon quota: {e})")
if state is None:
    print("QUOTA: khong co nguon do -> coi moi lenh la DUNG DUOC (unknown_quota=allow)")
    for n,p,w in avail: print(f"{n}\t[{p}]\tquota unknown -> dung duoc")
    raise SystemExit

def acct_of(name):
    f=f"{BIN}/{name}"
    if not os.path.exists(f): return None
    try: head=open(f,encoding='utf-8',errors='ignore').read(4096)
    except Exception: return None
    m=re.search(r"(?:CODEX_HOME|CLAUDE_CONFIG_DIR)='?([^'\n]+)", head)
    return os.path.basename(m.group(1).rstrip('/')) if m else None

accts={a['id']:a for a in state.get('accounts',[])}
now=datetime.datetime.now(datetime.timezone.utc)
for name,prov,win in avail:
    a=accts.get(acct_of(name) or "")
    if not a: print(f"{name}\t[{prov}]\tquota unknown -> theo routing.unknown_quota"); continue
    w=(a.get('quota') or {}).get(win) or {}
    pct,reset=w.get('percentUsed'),w.get('resetAt')
    if pct is not None and reset:
        try:
            if datetime.datetime.fromisoformat(reset.replace('Z','+00:00'))<now: pct=0.0
        except Exception: pass
    rem='?' if pct is None else f"{100-pct:.0f}"
    print(f"{name}\t[{a.get('label','?')}]\t{'weekly' if win=='weekly' else '5h'} con {rem}%\treset {reset}")
PY
```

**Luật chọn:** trong mỗi nhóm (codex-* hoặc claude-*) lấy account % còn cao nhất.
Áp chính sách `routing` trong roster: **loại account đang chạy phiên chính · quota
≥ (100% − reserve_percent) · unknown_quota** (không resolve được / chưa đo → KHÔNG
coi là sẵn sàng, không route vào). Bị 429/rate-limit → retry 1 lần với account kế
tiếp trong nhóm, báo user. **Loop nhiều lượt** → luân phiên account, re-check quota
TRƯỚC mỗi vòng. Riêng codex: weekly reset CHẬM (7 ngày) → càng phải chia đều nhiều
account, tránh dồn bulk vào 1 account cạn.

## Bước 2 — Chọn model theo loại việc

**Codex — họ GPT-5.6** (account chưa rollout → fallback `gpt-5.5`). Account đang
default Sol + effort high (đắt nhất) → LUÔN truyền `-m` tường minh:

| Model | Dùng cho |
|---|---|
| `gpt-5.6-sol` | việc khó/mơ hồ: kiến trúc, refactor lớn, security |
| `gpt-5.6-terra` | coding hàng ngày, bugfix (default) |
| `gpt-5.6-luna` | bulk cơ học: extract, phân loại, format |

**Claude** (`--model`): `opus` = reasoning sâu, tài liệu chỉn chu · `sonnet` =
research/websearch, coding thường (default) · `haiku` = việc nhẹ, tóm tắt.

**Gemini CLI**: review kỹ →
`Gemini 3.1 Pro (High)`; review nhanh → `Gemini 3.5 Flash (Medium)`. Lưu ý "Pro"
chỉ có `(Low)`/`(High)` — KHÔNG có Medium. Tên model truyền **nguyên văn cả dấu
ngoặc**; CLI từ chối tên → chạy lệnh liệt kê model của nó, hoặc bỏ `--model` dùng mặc
định. Gọi bằng đúng tên lệnh khai trong roster.

**Routing nhanh (theo loại việc):**

| Loại việc | Chọn | Model |
|---|---|---|‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍
| Kiến trúc / plan / chia việc / kết-luận tổng hợp | claude | opus |
| Backend/refactor ngữ cảnh rộng (task DÀI) | claude | opus/sonnet |
| Backend atomic, edge-case (task NGẮN) | codex | sol |
| Bugfix nhanh, coding hàng ngày | codex | terra |
| UI / component / design system / thẩm mỹ | claude | sonnet/fable |
| Test checklist / test case / script E2E | codex | terra/sol |
| Research — thu-thập từ WEB | claude (+WebSearch) | sonnet |
| Research — thu-thập từ REPO/máy (grep/đọc file) | codex | terra/luna |
| Cài đặt / setup / môi trường | gemini hoặc codex | — / terra |
| Hướng dẫn CHI TIẾT / tài liệu chỉn chu | claude | opus |
| Tóm tắt / phân loại / format bulk | claude/codex | haiku / luna |
| Review / second-opinion | gemini (chính) · codex-terra (phụ) | — |

> ⚠️ Codex KHÔNG có network — mọi việc cần internet (websearch, đọc URL) phải claude.
> Task phức tạp/dễ thiếu case → LUÔN kèm review chéo (Chế độ B), người làm ≠ người review.

## Bước 3 — Cú pháp gọi

Prompt build vào biến shell, truyền qua stdin/argument (tránh injection).
Timeout Bash 180000–300000ms.

> `<codex>` / `<claude>` / `<gemini>` dưới đây là **tên lệnh lấy từ roster**, KHÔNG
> phải chuỗi cố định — có thể là `codex` trần hoặc wrapper `codex-a` tuỳ máy user.

```bash
# Codex — sandbox read-only bắt buộc (nâng workspace-write phải hỏi user trước)
printf '%s' "$PROMPT" | <codex> exec --sandbox read-only -C "$(pwd)" -m gpt-5.6-terra -

# Claude — research/websearch phải thêm --allowedTools
printf '%s' "$PROMPT" | <claude> -p --model sonnet --allowedTools "WebSearch,WebFetch"

# Gemini — review only. Prompt là VALUE của -p, KHÔNG dùng `--`
<gemini> -p "$PROMPT" --model "Gemini 3.1 Pro (High)"
```

- Codex không có network → context/file cần thiết chèn thẳng vào `$PROMPT`.
- Hạ effort codex: `-c model_reasoning_effort="medium"`. Đọc dir ngoài cwd hoặc
  file relay: `--add-dir <path>` (claude + gemini).
- Gemini: prompt truyền qua `-p "<prompt>"` (KHÔNG `-- "$PROMPT"` — nó hiểu prompt là
  value của `-p/--print`). Từ chối tên model → chạy lệnh liệt kê model của CLI đó xem
  tên đúng, hoặc bỏ `--model` dùng mặc định. Không có TTY vẫn chạy (redirect /dev/null).
- **Tên model trong `models:` của roster có thể lỗi thời** — CLI báo "model not
  available" → thử bỏ `--model` (dùng mặc định), rồi gợi ý user sửa roster.
- KHÔNG `--dangerously-skip-permissions` trừ khi user yêu cầu rõ.

***

## Điều phối đa vòng

**Việc nhỏ/rõ** → route thẳng (Bước 1-3 xong là hết, không cần L1). **Việc lớn/
mơ hồ/nhiều phần, hoặc cần review vòng lặp / có bất đồng** → 1 trong 3 chế độ dưới,
đều: **show L1 plan (ước lượng số lượt gồm cả lượt điều phối) → user Y → chạy auto
tới xong/max → hết quota thì dừng báo**.

### Relay context (nền chung mọi loop)

CLI ngoài **stateless** — Claude là cầu nối duy nhất, không CLI nào tự gọi CLI
khác. Truyền context qua **file scratchpad** `<scratchpad>/delegate-<slug>/`
(Write `round-N-*.md`): Claude ghi input cần thiết → gọi CLI (`--add-dir` cho
claude/gemini, hoặc chèn nội dung vào `$PROMPT` cho codex) → Read output → trích phần
cần → ghi file lượt kế. Claude giữ "sổ điều phối" trong đầu, chỉ đẩy ra CLI phần
nó CẦN cho lượt đó.

### Chế độ A — Decompose + route

1. **Nghiên cứu context** — Claude tự đọc repo/file liên quan (không tốn quota CLI).
2. **Decompose** — tách sub-task rõ ràng, ghi rõ phần Claude tự làm (nghĩ/chốt/việc
   nhẹ) vs phần đẩy CLI (nặng/bulk/song song).
3. **Route** — khớp mỗi sub-task-đẩy-ra với CLI theo bảng Routing. Độc lập → chạy
   song song (nhiều Bash cùng response); phụ thuộc → tuần tự, relay qua file.
4. **L1 plan** → user Y.
5. **Thực thi** — mỗi lượt check quota + cân account. Claude tự tổng hợp đáp án cuối
   (không để CLI merge).

> Đừng đẩy bước nghĩ/chốt/tổng hợp ra CLI trừ khi user yêu cầu — đó là việc rẻ nhất
> giữ ở phiên chính.

**Architect/Editor (coding lớn):** tách **đề xuất cách làm** (prose/pseudocode —
Claude tự làm hoặc codex-sol) → **gate user xem** → **áp thành code** (codex-terra/
luna). Mặc định Claude giữ vai đề xuất, đẩy áp code ra codex.

### Chế độ B — Review→fix loop (trần cứng 3 vòng)

> **Bật mặc định** cho task **phức tạp / dài / dễ thiếu case** (không cần user yêu cầu):
> đề xuất Chế độ B ngay ở L1. Chọn **người review khác agent với người làm** (tránh
> thiên vị) — vd làm codex → review gemini, hoặc làm claude → review codex.

1. **Vòng 0 — làm:** 1 CLI (hoặc Claude) tạo output. Ghi `round-0-work.md`.
2. **Review:** đẩy output cho CLI review (Gemini — hoặc CLI khác, nên khác agent với fixer để
   tránh thiên vị). Reviewer kết bằng sentinel: dòng đầu `ĐẠT` (không còn góp ý
   actionable) hoặc `CÒN LỖI:` + danh sách góp ý sửa được. Ghi `round-N-review.md`.
3. **Dừng khi:** reviewer phát `ĐẠT` → báo user PASS; HOẶC hết vòng 3 → báo user
   "hết 3 vòng, còn tồn: ..." kèm review cuối.
4. **Fix:** còn `CÒN LỖI:` và chưa hết vòng → đẩy output + góp ý cho CLI sửa (relay
   qua file, đổi codex-N so vòng trước). Quay lại bước 2. Re-check quota mỗi vòng.

### Chế độ C — Debate + arbiter (trần 1 vòng rebuttal)

Kích hoạt khi fanout/second-opinion ra **2 kết luận lệch nhau thật** (không phải
khác wording).

1. **Phát hiện lệch** — chỉ khác wording → bỏ debate, tổng hợp bình thường.
2. **Rebuttal 1 vòng** — Claude ghi lập luận B ra file, gọi A "đọc lập luận đối
   phương, phản biện hoặc điều chỉnh"; đối xứng cho B. Ghi `round-1-rebuttal-{a,b}.md`.
3. **Hội tụ?** đồng thuận sau rebuttal → Claude xác nhận kết luận chung, khỏi
   arbiter. Vẫn lệch → **Claude làm arbiter**: đọc cả 2, đưa khuyến nghị chốt đánh
   dấu 🔶 (user override được). KHÔNG đẩy phân xử ra CLI.
4. **Báo user** — 2 quan điểm gốc + diễn tiến rebuttal + kết luận. Không giả vờ
   đồng thuận khi thực sự lệch.

## L1 plan preview (bắt buộc trước loop/decompose)

Show plan gồm **ước lượng số lượt kể cả lượt điều phối** ("manager tax"):

```
[/delegate] Chế độ: Review→fix loop. Sẽ chạy:
  • Việc: code hàm parse refund CSV
  • Vòng làm  → codex (terra)
  • Review    → gemini (Gemini 3.1 Pro)
  • Fix nếu cần → codex (terra)
  Ước lượng: 1 code + tối đa 2×(review+fix) = ~5 lượt, trần 3 vòng.
  Relay qua scratchpad/delegate-refund-csv/.

Apply? (Y/n):
```

## Fanout (không kèm debate)

User muốn ≥2 agent cùng 1 câu hỏi (`/delegate all`, "hỏi cả 2") mà không yêu cầu
tranh luận: check quota 1 lần → chọn account tốt nhất mỗi nhóm → cùng 1 prompt →
gọi Bash song song trong 1 response → tổng hợp mỗi agent 1 section
`## {Agent} (launcher, model) nói:` + "Tóm tắt khác biệt". Nếu khác biệt là bất
đồng thực chất → hỏi user có chạy Chế độ C không. Không tự chọn thắng/thua.

## Constraints

### Hard rules — never violate

- **Tên lệnh + tên model LUÔN đọc từ roster** — KHÔNG hardcode, KHÔNG đoán lệnh khi
  roster trống/thiếu (báo user khai roster rồi dừng).
- Check quota **khi có nguồn đo** (`quota_source` trong roster); không có thì bỏ qua,
  KHÔNG lấy đó làm lý do từ chối chạy. Luôn truyền model tường minh; cân đều tài khoản.
- Claude là orchestrator/arbiter — không đẩy việc nghĩ/chốt/tổng hợp/phân xử ra
  CLI trừ khi user yêu cầu. Gemini chỉ review.
- Trần cứng: review→fix 3 vòng, debate 1 vòng rebuttal. Không đệ quy vô hạn.
- CLI stateless → relay qua file scratchpad, KHÔNG để CLI tự gọi CLI khác.
- **Write CHỈ dưới `<scratchpad>/delegate-*/`** — TUYỆT ĐỐI không Write vào vault/
  repo. Skill này không sửa tài liệu thật.
- Không đưa secret vào prompt trừ khi user cho phép. Chỉ gọi agent user nhắc
  (ambiguous → codex terra). Không tự ý fanout/loop khi user chỉ xin 1 lượt.

## Output

Báo: chế độ + đã giao ai (launcher + model + % quota lúc chọn) + kết quả. Loop:
số vòng + trạng thái dừng (PASS / hết-max-còn-tồn). Debate: 2 quan điểm + kết luận
(đồng thuận / 🔶 arbiter). Tóm tắt nếu >200 dòng. Lỗi (binary thiếu, timeout,
rate-limit) → báo rõ đã thử account nào, không giả vờ có kết quả.

> L1 plan preview theo convention approval-gate của Claude Code — bản này tự chứa,
> không tham chiếu rule file của project nào.‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍


<!-- wm:2b9af6c9b691879b1ddb7a04d29a1c88 -->
<sub>Tài liệu thuộc bộ AI4BA BA-Kit — bản quyền hoangphan.blog</sub>
