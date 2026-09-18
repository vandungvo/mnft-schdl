#!/bin/bash
# Detect status transitions trong doc frontmatter + suggest follow-ups
#
# Triggered by PostToolUse on docs/**.md after Edit/Write.
# Reads frontmatter `status:`, compares với last seen.
# Print suggestion (không auto-execute).

set -u
FILE="${1:-}"
if [ -z "$FILE" ] && [ ! -t 0 ]; then
    if command -v jq >/dev/null 2>&1; then
        FILE="$(cat | jq -r '.tool_input.file_path // .tool_input.path // empty' 2>/dev/null)"
    else
        echo "status-transition.sh: jq không có trong PATH, không đọc được tool input qua stdin — hook bỏ qua." >&2
        cat >/dev/null
    fi
fi
[[ ! "$FILE" =~ docs/.+\.md$ ]] && exit 0
[ ! -f "$FILE" ] && exit 0

# Extract status từ frontmatter (only top YAML block)
CURRENT_STATUS=$(awk '
    /^---[[:space:]]*$/ { f++; next }
    f==1 && /^status:/ { gsub(/^status:[[:space:]]*/, ""); gsub(/[[:space:]]+$/, ""); print; exit }
' "$FILE")
[ -z "$CURRENT_STATUS" ] && exit 0

# State file để track previous status
# Normalize FILE to canonical relative path (từ PROJECT_PATH) trước khi hash —
# đảm bảo cùng file luôn cùng hash regardless caller dùng absolute hay relative path.
PROJECT_PATH="${PROJECT_PATH:-$(pwd)}"
ABS_FILE=$(cd "$(dirname "$FILE")" 2>/dev/null && pwd)/$(basename "$FILE")
REL_FILE="${ABS_FILE#$PROJECT_PATH/}"
HASH=$(echo "$REL_FILE" | shasum 2>/dev/null | awk '{print $1}' | head -c 16)
STATE_DIR="$PROJECT_PATH/docs/_shared/.status-state"
mkdir -p "$STATE_DIR"
STATE_FILE="$STATE_DIR/$HASH"

PREV_STATUS=""
[ -f "$STATE_FILE" ] && PREV_STATUS=$(cat "$STATE_FILE")

# Extract feature từ frontmatter cho suggestion message
FEATURE=$(awk '
    /^---[[:space:]]*$/ { f++; next }
    f==1 && /^feature:/ { gsub(/^feature:[[:space:]]*/, ""); gsub(/[[:space:]]+$/, ""); print; exit }
' "$FILE")

if [ "$CURRENT_STATUS" != "$PREV_STATUS" ] && [ -n "$PREV_STATUS" ]; then
    case "$CURRENT_STATUS" in
        in-review)
            echo "  ↳ status: $PREV_STATUS → in-review"
            echo "  ↳ suggested: chờ reviewer (người/stakeholder) duyệt"
            ;;
        approved)
            echo "  ↳ status: $PREV_STATUS → approved"
            if [ -n "$FEATURE" ]; then
                echo "  ↳ suggested: /gap --feature $FEATURE"
            else
                echo "  ↳ suggested: /gap"
            fi
            ;;
        shipped)
            echo "  ↳ status: $PREV_STATUS → shipped"
            echo "  ↳ suggested: /gap --scope project (re-verify cross-feature)"
            ;;
        stale)
            echo "  ↳ status: $PREV_STATUS → stale"
            echo "  ↳ suggested: /cr '<change>' --feature (reconcile upstream change)"
            ;;
        revisions)
            echo "  ↳ status: $PREV_STATUS → revisions"
            echo "  ↳ suggested: xử lý review findings rồi chạy lại skill sinh doc (/urd|/brd|/prd-epic|/srs) hoặc /cr"
            ;;
    esac
fi

echo "$CURRENT_STATUS" > "$STATE_FILE"
exit 0
