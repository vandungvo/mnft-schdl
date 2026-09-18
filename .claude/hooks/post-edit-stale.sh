#!/bin/bash
# Post-edit stale propagation hook
#
# Khi file X được Edit, scan reverse-graph:
#   - Tìm mọi doc Y có `links:` flat list chứa path X.
#   - Mark Y's status → stale (nếu Y chưa stale/archived).
#   - Append entry (kèm lý do) vào docs/_shared/staleness.md — reason CHỈ sống ở log,
#     KHÔNG ghi field stale_reason vào frontmatter (đã bỏ field này 2026-07-11).
#
# Format: bảng Markdown 4 cột, 1 dòng = 1 lần lan stale:
#   | {date} | `{upstream}` | `{downstream}` | {reason} |
#
# 1-level depth per edit. Transitive closure via /cr analyze phase.
# Triggered by PostToolUse Edit/Write of docs/**.md.
#
# docs/cr/ ĐƯỢC LOẠI TRỪ CẢ 2 VẾ (đừng gỡ):
#   - vế FILE: CR bị sửa thì không lan stale ra downstream.
#   - vế CANDIDATE: file khác bị sửa thì KHÔNG được đánh CR thành stale.
# Lý do: `links:` của CR mang nghĩa NGƯỢC với doc thường — "tôi ĐÃ SỬA các file
# này" (audit record), không phải "tôi phái sinh từ chúng". Coi CR là downstream
# khiến mọi CR bị set status: stale ngay trong apply loop; mà `stale` không thuộc
# lifecycle CR (proposed→impact-assessed→applied→closed) nên /cr apply lẫn
# /cr close đều refuse → CR kẹt vĩnh viễn. Xem docs/reports/2026-07-16-cr-skill-review.md.

set -u
FILE="${1:-}"
if [ -z "$FILE" ] && [ ! -t 0 ]; then
    if command -v jq >/dev/null 2>&1; then
        FILE="$(cat | jq -r '.tool_input.file_path // .tool_input.path // empty' 2>/dev/null)"
    else
        echo "post-edit-stale.sh: jq không có trong PATH, không đọc được tool input qua stdin — hook bỏ qua." >&2
        cat >/dev/null
    fi
fi

[[ ! "$FILE" =~ docs/.+\.md$ ]] && exit 0
[[ "$FILE" =~ /_shared/ ]] && exit 0
[[ "$FILE" =~ /exports/ ]] && exit 0
[[ "$FILE" =~ /inbox/ ]] && exit 0
[[ "$FILE" =~ /docs/cr/ ]] && exit 0
[ ! -f "$FILE" ] && exit 0

PROJECT_PATH="${PROJECT_PATH:-$(pwd)}"
REL_FILE="${FILE#$PROJECT_PATH/}"

DATE=$(date +%Y-%m-%d)
SKILL="${CLAUDE_SKILL_NAME:-manual}"
LOG="$PROJECT_PATH/docs/_shared/staleness.md"
mkdir -p "$(dirname "$LOG")"

# Bootstrap header khi file chưa tồn tại (hoặc rỗng) — bảng cần header + separator.
if [ ! -s "$LOG" ]; then
    {
        printf '%s\n\n' '# Staleness Log'
        printf '%s\n' '> Lan truyền `status: stale` khi upstream đổi — append-only, mới nhất ở cuối. Writer duy nhất: hook `post-edit-stale.sh`.'
        printf '\n'
        printf '%s\n' '| Ngày | Upstream đổi | Downstream bị đánh stale | Lý do |'
        printf '%s\n' '|---|---|---|---|'
    } >> "$LOG"
fi

PROPAGATED=0
while IFS= read -r CANDIDATE; do
    [ "$CANDIDATE" = "$FILE" ] && continue
    [[ ! -f "$CANDIDATE" ]] && continue

    # Parse links: flat list — hỗ trợ cả 2 dạng:
    #   links: [a.md, b.md]         (inline flow style — chuẩn naming-conventions.md, dùng phổ biến nhất)
    #   links:\n  - a.md\n  - b.md  (multi-line block style)
    HAS_LINK=$(awk -v target="$REL_FILE" '
        /^links:[[:space:]]*\[/ {
            line = $0
            sub(/^links:[[:space:]]*\[/, "", line)
            sub(/\][[:space:]]*$/, "", line)
            n = split(line, items, ",")
            for (i = 1; i <= n; i++) {
                item = items[i]
                gsub(/^[[:space:]]+|[[:space:]]+$/, "", item)
                gsub(/^["'\'']|["'\'']$/, "", item)
                if (item == target) { print "YES"; exit }
            }
            exit
        }
        /^links:/ { in_links=1; next }
        in_links && /^[a-zA-Z_]+:/ { exit }
        in_links && /^---[[:space:]]*$/ { exit }
        in_links && /^[[:space:]]*-[[:space:]]/ {
            line = $0
            gsub(/^[[:space:]]*-[[:space:]]*/, "", line)
            gsub(/[[:space:]]+$/, "", line)
            gsub(/^["'\'']|["'\'']$/, "", line)
            if (line == target) { print "YES"; exit }
        }
    ' "$CANDIDATE")

    [ "$HAS_LINK" != "YES" ] && continue

    STATUS=$(awk '
        /^---[[:space:]]*$/ { f++; next }
        f==1 && /^status:/ { gsub(/^status:[[:space:]]*/, ""); gsub(/[[:space:]]+$/, ""); print; exit }
    ' "$CANDIDATE")
    [ "$STATUS" = "stale" ] || [ "$STATUS" = "archived" ] && continue

    REASON="upstream changed: $REL_FILE on $DATE by $SKILL"
    TMP="${CANDIDATE}.stale.tmp"
    awk '
        BEGIN { in_fm=0 }
        /^---[[:space:]]*$/ {
            if (NR == 1) { in_fm=1; print; next }
            if (in_fm) { in_fm=0; print; next }
        }
        in_fm && /^status:/ { print "status: stale"; next }
        in_fm && /^stale_reason:/ { next }
        { print }
    ' "$CANDIDATE" > "$TMP" && mv "$TMP" "$CANDIDATE"

    PROPAGATED=$((PROPAGATED + 1))
    printf '| %s | `%s` | `%s` | %s |\n' \
        "$DATE" "$REL_FILE" "${CANDIDATE#$PROJECT_PATH/}" "$REASON" >> "$LOG"
done < <(find "$PROJECT_PATH/docs" -name "*.md" -type f 2>/dev/null | grep -v "/exports/" | grep -v "/inbox/" | grep -v "/docs/cr/" | grep -v "/_reverse/")

if [ "$PROPAGATED" -gt 0 ]; then
    echo "  ↳ stale propagated to $PROPAGATED downstream doc(s). Check docs/_shared/staleness.md."
fi

exit 0
