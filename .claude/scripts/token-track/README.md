# Token Tracking — theo dõi token & chi phí Claude Code‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

Bộ công cụ đo lượng token và chi phí Claude Code đã dùng, __phạm vi đúng project chứa nó__. Chạy bằng __Python thuần, không cần cài thêm gì__. Dữ liệu đọc trực tiếp từ file transcript của Claude Code trên máy — không gọi mạng, không gửi đi đâu.

Đo được __4 tầng__:
1) __Per-session__ — mỗi phiên tốn bao nhiêu (input/output/cache/$).
2) __Per-skill__ — mỗi lần chạy `/srs`, `/reverse-doc`... tốn bao nhiêu (cần bật hook — xem dưới).
3) __Per-subagent__ — mỗi loại agent (`senior-ba`, `flow-reviewer`...) tốn bao nhiêu.
4) **Codex (`/delegate`)** — ước lượng token/$ Codex đã dùng cho project này (quota OpenAI riêng).

Kèm __statusline__ hiện realtime dưới prompt + __dashboard HTML__ self-contained.

---

## Cấu trúc‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

| File | Vai trò |
|------|---------|
| `token-ingest.py` | Đọc JSONL (incremental) → dedup an toàn → tính cost → ghi `usage-index.json` |
| `token-dashboard.py` | Sinh `docs/token-dashboard.html` (SVG tự vẽ, mở bằng double-click) |
| `token-statusline.py` | In 1 dòng trạng thái cho statusline Claude Code |
| `token-skill-hook.sh` + `_skill_hook.py` | Hook ghi mốc bắt đầu/kết thúc mỗi skill |
| `token-turn-summary.py` | Hook `Stop`: in tóm tắt chi phí cuối mỗi lượt |
| `pricing.json` | Bảng giá token (Claude + Codex) — __sửa tay để override__ |

> __Toàn bộ bộ này KHÔNG tốn token.__ Đây là script chạy thẳng trên máy (Python/bash), do Claude Code gọi qua hook/statusline — chúng chỉ đọc file transcript có sẵn rồi in text, __không gọi API, không đưa gì vào context model__. Chỉ có model xử lý mới tốn token; script thường thì miễn phí như chạy `ls`.

Dữ liệu runtime nằm ở `.claude/token-tracking/` (đã gitignore):
`usage-index.json` (số liệu tổng), `snapshots/` (cho statusline), `skill-events.jsonl` (mốc skill), `offsets.json` (vị trí đọc incremental).

---

## Dùng cơ bản‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

```bash
# 1. Cập nhật số liệu (đọc thêm phần transcript mới, nhanh)
python3 .claude/scripts/token-track/token-ingest.py

# 1b. Parse lại từ đầu (khi đổi giá / nghi số sai)
python3 .claude/scripts/token-track/token-ingest.py --rebuild

# 2. Sinh dashboard HTML rồi mở
python3 .claude/scripts/token-track/token-dashboard.py
open docs/token-dashboard.html
```

---

## Bật statusline (hiện token realtime dưới prompt)‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

Thêm vào `~/.claude/settings.json` (toàn cục) hoặc `.claude/settings.json` (chỉ project này):

```json
{
  "statusLine": {
    "type": "command",
    "command": "python3 <đường-dẫn-tuyệt-đối-tới-project>/.claude/scripts/token-track/token-statusline.py"
  }
}
```

Statusline sẽ hiện ví dụ: `opus | $0.41 phiên | 126k ctx | /srs`. Nếu Claude Code đã cấp sẵn cost qua stdin thì dùng luôn; nếu không, đọc snapshot do ingester tạo.

> __Phạm vi luôn chỉ theo project.__ Cách gọn nhất là đặt trong `.claude/settings.json` của project (dùng đường dẫn tương đối `python3 .claude/scripts/token-track/token-statusline.py`) — chỉ bật khi mở project đó.
>
> Nếu đặt toàn cục (`~/.claude/settings.json`, cần đường dẫn tuyệt đối), statusline __tự im lặng khi bạn đang ở project khác__ — nó chỉ hiện số của đúng project chứa nó, không bao giờ trộn số liệu giữa các project. Hook per-skill cũng vậy: chỉ ghi mốc khi đang ở đúng project.‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

---

## Bật per-skill (hook — chính xác, không phải đoán)‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

Để biết __skill nào tốn token__, cần ghi mốc mỗi lần skill chạy. Thêm hook vào `.claude/settings.json` (project) — __không phải sửa 57 skill__, hook bắt mọi lần tool `Skill` được gọi:

```json
{
  "hooks": {
    "PreToolUse": [
      { "matcher": "Skill",
        "hooks": [ { "type": "command", "command": ".claude/scripts/token-track/token-skill-hook.sh" } ] }
    ],
    "PostToolUse": [
      { "matcher": "Skill",
        "hooks": [ { "type": "command", "command": ".claude/scripts/token-track/token-skill-hook.sh" } ] }
    ]
  }
}
```

Project này đã có `PostToolUse` cho `Write|Edit` — chỉ cần __thêm__ khối `Skill` vào cùng mảng, không ghi đè. Sau khi bật, từ các lần chạy skill về sau, dashboard sẽ gán token đúng skill thay vì gom vào `(no-skill)`.

---

## End-of-turn summary (`Stop` hook)

To display a token and cost summary after each completed assistant turn, register the `Stop` hook in `.claude/settings.json`:

```json
{
  "hooks": {
    "Stop": [
      { "hooks": [ { "type": "command",
          "command": "python3 .claude/scripts/token-track/token-turn-summary.py" } ] }
    ]
  }
}
```

Example output:

```
─── Turn Summary ───
model: claude-opus-4-8
tokens: 510,005 processed
  input: 5 new · 494,000 cache read · 4,000 cache write
  output: 12,000
subagents: 3
  senior-ba (sonnet): 120,000 processed · 3,000 output
  Explore (sonnet): 80,000 processed · 1,500 output
  Explore (sonnet): 69,000 processed · 500 output
  total: 269,000 processed · 5,000 output
turn incl. subagents: 779,005 processed · 17,000 output
skills: /srs
  inclusive usage: 779,005 processed · 17,000 output
session: 12,345,678 processed · 98,765 output
```

`processed` is the sum of new input, cache read, cache write, and output tokens. Exact comma-separated values are shown instead of abbreviated `k/M` values. The Stop summary is token-only; dollar costs remain available in the dashboard. The subagent and skill lines are shown only when the turn invoked them. Session usage is calculated from the current transcript, so it does not depend on the ingester snapshot being current.

__Per-subagent numbers__ are read from `~/.claude/projects/<slug>/<session>/subagents/agent-*.jsonl` — subagent usage is __not__ written to the main transcript at all, so these files are the only source. Records are filtered to the current turn by timestamp. The `type (model)` label pairs Agent-call spawn order with file start order (best-effort, same rule as the ingester): totals are exact, the name split is an estimate. If an agent file has not been flushed yet when the Stop hook runs, the summary says `usage: unavailable (subagent transcript not flushed yet)` instead of showing zeros.

__Skill attribution__: a single skill receives the measured turn — including the subagents it spawned — as inclusive usage; this figure equals `turn incl. subagents` and must not be added to it again. When multiple skills run, Claude Code's `attributionSkill` field is used for the per-skill split and any unassigned model calls are shown as overhead.

> Claude Code normally picks up hook changes in settings through its file watcher. If a change does not appear, start a fresh session as the end-to-end smoke test.
>
> **Why the hook returns `systemMessage`:** structured hook output must be the only JSON object written to stdout. The script returns `{"continue": true, "systemMessage": "<summary>"}` because `systemMessage` is the documented user-visible field; plain stdout is not the display channel for a `Stop` hook.
>
> __Short-turn transcript race:__ Claude Code can start a `Stop` hook just before the final assistant record is visible to the hook process. The script briefly retries while matching the hook's `last_assistant_message`. If usage still has not been flushed, it shows `tokens: unavailable (transcript not ready)` instead of disappearing or reporting misleading zero usage.

---

## Ghi chú độ chính xác (quan trọng)

- Số token/chi phí là __best-effort / lower-bound__ từ transcript, __không phải hóa đơn chính thức__. Dùng để so sánh tương đối (skill nào đắt, session nào nặng), không phải để đối chiếu billing từng cent.
- __Dedup__ giữ bản ghi có `output_tokens` lớn nhất theo `(requestId + message.id)` — nếu không sẽ undercount tới ~5x (do Claude Code ghi snapshot streaming trung gian).
- __Cache read__ chiếm phần lớn token nhưng rẻ nhất — dashboard tách rõ để không hiểu nhầm "nhiều token = nhiều tiền".
- __Codex__ tính vào quota OpenAI riêng, đánh dấu "ước lượng"; giá GPT sửa ở `pricing.json → codex_models`.
- __Subagent per-type__: map `agentId → loại agent` là best-effort (khớp theo thứ tự thời gian); tổng subagent luôn đúng, phần chưa map hiện là `(subagent:unknown)`.

---

## 📋 Prompt mẫu để nhờ AI chỉnh sửa dashboard sau này

> Copy nguyên khối dưới đây, sửa phần trong `[...]`, dán vào Claude Code khi muốn điều chỉnh. Đã gói sẵn ngữ cảnh để AI không phải dò lại từ đầu.

```
Bộ token-tracking của project nằm ở .claude/scripts/token-track/ (Python thuần, 0 dependency):
- token-ingest.py: đọc JSONL ~/.claude/projects/<slug>/*.jsonl + subagents/ + ~/.codex/sessions →
  dedup theo (requestId+message.id) GIỮ output_tokens lớn nhất → tính cost 4 bucket
  (input/output/cache_write 5m+1h/cache_read) → ghi .claude/token-tracking/usage-index.json.
  Subagent & Codex tách riêng khỏi root total. Giá ở pricing.json.
- token-dashboard.py: render docs/token-dashboard.html self-contained (biểu đồ SVG tự vẽ,
  chạy offline mở bằng double-click), tiếng Việt có dấu, dark/light auto.
- token-statusline.py: 1 dòng statusline.
- token-skill-hook.sh + _skill_hook.py: hook PreToolUse/PostToolUse(Skill) ghi skill-events.jsonl.

Ràng buộc phải giữ:
- Chỉ dùng thư viện chuẩn Python (không thêm gói phải cài). Dashboard phải chạy offline
  100% (mọi thứ nhúng sẵn trong 1 file HTML). Tiếng Việt có dấu đầy đủ ở mọi text người đọc.
- Số token là best-effort/lower-bound. Giữ nguyên quy tắc dedup (giữ output max) — đừng đổi
  thành first-seen (sẽ undercount 5x).
- Giá sửa ở pricing.json, không hardcode trong code.

Việc tôi muốn: [MÔ TẢ THAY ĐỔI — ví dụ:
  "thêm biểu đồ token theo giờ trong ngày",
  "thêm filter theo git branch",
  "đổi giá opus output thành $80/1M",
  "thêm cột % so với tổng ở bảng skill",
  "thêm cảnh báo session nào > $X",
  "gộp cost Claude + Codex thành 1 KPI tổng"].

Sau khi sửa: chạy lại token-ingest.py rồi token-dashboard.py, chụp màn hình
docs/token-dashboard.html để tôi xác nhận trước khi chốt.
```

### Prompt mẫu — chỉnh phần tóm tắt cuối mỗi lượt

> Dùng khi muốn đổi nội dung/định dạng dòng tóm tắt in ra cuối mỗi lượt (hook Stop).‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

```
File .claude/scripts/token-track/token-turn-summary.py là hook Stop của Claude Code:
sau mỗi lượt (user gửi 1 prompt → Claude làm xong), nó đọc transcript, cắt "lượt cuối"
(từ dòng user gõ-tay promptSource=typed gần nhất tới hết), tính token lượt đó
(dedup theo requestId+message.id giữ output max), đọc PER-SUBAGENT từ
<session>/subagents/agent-*.jsonl (lọc theo timestamp của lượt — usage subagent KHÔNG
nằm trong transcript chính), map tên agent theo thứ tự spawn (best-effort), và skill
(Skill tool_use + attributionSkill), rồi IN ra terminal. Nó KHÔNG tốn token
(script thường, không gọi API). Tóm tắt token-only; giá $ chỉ ở dashboard.

Định dạng hiện tại in bằng tiếng Anh:
  ─── Turn Summary ───
  model: <model>
  tokens: <n> processed  (+ dòng input/output chi tiết)
  subagents: <n>  →  mỗi agent 1 dòng "<type> (<model>): X processed · Y output" + total
  turn incl. subagents: <n> processed · <n> output
  skills: /<skill>  →  inclusive usage (= turn incl. subagents khi 1 skill)
  session: <n> processed · <n> output

Ràng buộc phải giữ:
- Chỉ chạy khi đúng project (đã có guard cwd == PROJECT_ROOT). Không bao giờ chặn lượt
  (mọi lỗi → im lặng exit 0). UI của tóm tắt dùng tiếng Anh. Chỉ dùng Python stdlib.
- Giữ quy tắc dedup (giữ output max) để không undercount.
- Hook Stop hiển thị bằng cách trả JSON {"continue":true,"systemMessage":"..."} qua stdout
  (KHÔNG print plain text — Claude Code nuốt stdout thường của hook Stop). Dùng hàm emit().

Việc tôi muốn: [MÔ TẢ THAY ĐỔI — ví dụ:
  "bỏ dòng cache-read/cache-write cho gọn, chỉ giữ tổng token",
  "thêm thời gian lượt chạy (từ timestamp prompt tới message cuối)",
  "chỉ in tóm tắt khi lượt tốn > $0.10 (lượt rẻ thì im lặng)",
  "thêm số lần gọi tool (Bash/Read/Edit...) trong lượt",
  "in gọn 1 dòng duy nhất thay vì nhiều dòng",
  "thêm cảnh báo nếu subagent tốn hơn phần chính"].

Sau khi sửa: test bằng cách mô phỏng hook — lấy 1 file transcript thật trong
~/.claude/projects/<slug>/, chạy:
  echo '{"session_id":"<sid>","cwd":"<project-root>","transcript_path":"<file.jsonl>"}' \
    | python3 .claude/scripts/token-track/token-turn-summary.py
rồi cho tôi xem output trước khi chốt.
```


<!-- wm:2b9af6c9b691879b1ddb7a04d29a1c88 -->
<sub>Tài liệu thuộc bộ AI4BA BA-Kit — bản quyền ai4ba.com</sub>
