#!/usr/bin/env bash
# PreToolUse(Bash) hook — chặn MỌI lệnh đẩy code lên remote.
# AI được phép: git add / commit / branch / status / diff / log...
# AI KHÔNG được: git push, git push --force, gh pr merge, git svn dcommit...
# → User tự push tay.
#
# Exit code 2 = deny (stderr được trả về cho model như feedback).

set -uo pipefail

input=$(cat)

# Lấy field .tool_input.command (không phụ thuộc jq nếu thiếu)
if command -v jq >/dev/null 2>&1; then
  cmd=$(printf '%s' "$input" | jq -r '.tool_input.command // empty')
else
  cmd=$(printf '%s' "$input" | python3 -c 'import sys,json;print(json.load(sys.stdin).get("tool_input",{}).get("command",""))' 2>/dev/null || echo "")
fi

[ -z "$cmd" ] && exit 0

# Chuẩn hoá: bỏ xuống dòng nối, gộp khoảng trắng
norm=$(printf '%s' "$cmd" | tr '\n' ' ' | sed 's/\\ / /g; s/  */ /g')

deny() {
  cat >&2 <<EOF
⛔ BỊ CHẶN bởi hook block-push: "$1"

Quy ước dự án: AI CHỈ được commit, KHÔNG được push lên remote.
Việc push do người dùng tự làm tay.

→ Hãy dừng lại, báo cho user rằng commit đã xong và họ có thể tự chạy:
    git push
(hoặc gõ trong phiên: ! git push)

KHÔNG tìm cách lách lệnh này bằng cú pháp khác.
EOF
  exit 2
}

# --- Các mẫu bị cấm ---------------------------------------------------------
# git push (mọi biến thể: có -C, có `env`, có VAR=val prefix, có &&/;/| ở trước,
# có sudo/xargs/time bọc ngoài)
if printf '%s' "$norm" | grep -Eq '\bgit\b[^;&|]*\bpush\b'; then
  deny "git push"
fi

# git svn dcommit
if printf '%s' "$norm" | grep -Eq '\bgit\b[^;&|]*\bsvn\b[^;&|]*\bdcommit\b'; then
  deny "git svn dcommit"
fi

# gh: tạo/merge PR, release, đẩy lên GitHub
if printf '%s' "$norm" | grep -Eq '\bgh\b[[:space:]]+(pr[[:space:]]+(create|merge|ready)|release[[:space:]]+(create|upload)|repo[[:space:]]+sync)'; then
  deny "gh (tạo/merge PR hoặc release)"
fi

# git remote-helper trực tiếp / send-pack
if printf '%s' "$norm" | grep -Eq '\bgit\b[^;&|]*\b(send-pack|push-all)\b'; then
  deny "git send-pack"
fi

exit 0
