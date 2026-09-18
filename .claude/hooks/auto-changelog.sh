#!/bin/bash
# Append 1 dòng sự kiện vào docs/_shared/changelog.md sau mỗi Write/Edit doc file.
#
# Contract (per .claude/rules/changelog.md): lịch sử thay đổi sống ở MỘT file
# append-only duy nhất — KHÔNG ghi changelog: vào frontmatter, KHÔNG routing
# file con → file cha (path của file được sửa chính là thông tin routing).
#
# Format: bảng Markdown 5 cột, 1 dòng = 1 sự kiện, append cuối file:
#   | {date} | {skill} | {@author} | `{file-path}` | {note} |
# Skill set env CLAUDE_SKILL_NAME / CLAUDE_CHANGELOG_NOTE / CLAUDE_CHANGELOG_AUTHOR
# trước khi Write/Edit; thiếu env → fallback "manual | git user.name | manual edit".
#
# Ký tự "|" trong note bị escape thành "\|" để không phá cấu trúc cột khi render.

set -u

FILE="${1:-}"
if [ -z "$FILE" ] && [ ! -t 0 ]; then
    if command -v jq >/dev/null 2>&1; then
        FILE="$(cat | jq -r '.tool_input.file_path // .tool_input.path // empty' 2>/dev/null)"
    else
        echo "auto-changelog.sh: jq không có trong PATH, không đọc được tool input qua stdin — hook bỏ qua." >&2
        cat >/dev/null
    fi
fi

# Claude Code có thể truyền absolute path — chuẩn hóa về path tương đối project root.
PROJECT_PATH="${PROJECT_PATH:-$(pwd)}"
FILE="${FILE#$PROJECT_PATH/}"

[ "${AUTO_CHANGELOG:-true}" != "true" ] && exit 0
[[ ! "$FILE" =~ ^docs/.+\.md$ ]] && exit 0
[[ "$FILE" =~ feature-list\.md$ ]] && exit 0
[[ "$FILE" =~ README\.md$ ]] && exit 0
[[ "$FILE" =~ /_shared/ ]] && exit 0
[[ "$FILE" =~ /exports/ ]] && exit 0
[[ "$FILE" =~ /inbox/ ]] && exit 0
[ ! -f "$FILE" ] && exit 0

DATE=$(date +%Y-%m-%d)
SKILL="${CLAUDE_SKILL_NAME:-manual}"
NOTE="${CLAUDE_CHANGELOG_NOTE:-manual edit}"
AUTHOR="${CLAUDE_CHANGELOG_AUTHOR:-}"
[ -z "$AUTHOR" ] && AUTHOR="$(git config user.name 2>/dev/null || true)"
AUTHOR="${AUTHOR:-unknown}"

# Escape cell tự do (note, author, skill) — giữ nguyên cấu trúc bảng:
# newline/CR → space (1 sự kiện PHẢI là đúng 1 dòng bảng), "|" → "\|".
escape_cell() { printf '%s' "$1" | tr '\r\n' '  ' | sed 's/|/\\|/g'; }
SKILL="$(escape_cell "$SKILL")"
NOTE="$(escape_cell "$NOTE")"
AUTHOR="$(escape_cell "$AUTHOR")"

LOG="$PROJECT_PATH/docs/_shared/changelog.md"
mkdir -p "$(dirname "$LOG")"

# Bootstrap header khi file chưa tồn tại (hoặc rỗng) — bảng cần header + separator
# để Obsidian/GitHub render. Dùng >> nên an toàn nếu 2 hook chạy sát nhau.
if [ ! -s "$LOG" ]; then
    {
        printf '%s\n\n' '# Changelog'
        printf '%s\n' '> Lịch sử thay đổi toàn vault — append-only, mới nhất ở cuối. Writer duy nhất: hook `auto-changelog.sh`. Xem `.claude/rules/changelog.md`.'
        printf '\n'
        printf '%s\n' '| Ngày | Skill | Người | File | Ghi chú |'
        printf '%s\n' '|---|---|---|---|---|'
    } >> "$LOG"
fi

LINE="| $DATE | $SKILL | $AUTHOR | \`$FILE\` | $NOTE |"

# Dedupe: bỏ qua nếu dòng giống hệt đã tồn tại (double-fire cùng note trong ngày).
grep -qxF "$LINE" "$LOG" && exit 0

# Append-only (O_APPEND — an toàn khi nhiều sub-agent Write song song).
printf '%s\n' "$LINE" >> "$LOG"

exit 0
