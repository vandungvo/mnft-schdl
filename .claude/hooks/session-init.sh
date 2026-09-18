#!/bin/bash
# Session initialization hook for BA vault
# Sets env vars and prints quick status overview

set -u

export PROJECT_PATH="${PROJECT_PATH:-$(pwd)}"
export TODAY=$(date +%Y-%m-%d)
export YESTERDAY=$(date -v-1d +%Y-%m-%d 2>/dev/null || date -d "yesterday" +%Y-%m-%d 2>/dev/null || echo "")
export CURRENT_WEEK=$(date +%Y-W%V)

# Read project name from CLAUDE.md (first H1 line, strip "— BA Workspace" suffix)
if [ -f "$PROJECT_PATH/CLAUDE.md" ]; then
    PROJECT_NAME=$(grep -m1 "^# " "$PROJECT_PATH/CLAUDE.md" 2>/dev/null \
        | sed 's/^# //' \
        | sed 's/ — BA Workspace$//' \
        | sed 's/{Project Name}/Unnamed Project/')
else
    PROJECT_NAME="No CLAUDE.md found"
fi
export PROJECT_NAME

echo "═══════════════════════════════════════════════"
echo "  $PROJECT_NAME"
echo "═══════════════════════════════════════════════"
echo "  Today: $TODAY  |  Week: $CURRENT_WEEK"

# Count SRS specs by status (v2.0: docs/{feature}/srs/spec.md)
SRS_FILES=$(find "$PROJECT_PATH/docs" \( -path "*/srs/spec.md" -o -path "*/srs/*-spec.md" \) -type f 2>/dev/null)
if [ -n "$SRS_FILES" ]; then
    DRAFT=$(echo "$SRS_FILES" | xargs grep -l "^status: draft" 2>/dev/null | wc -l | tr -d ' ')
    REVIEW=$(echo "$SRS_FILES" | xargs grep -l "^status: in-review" 2>/dev/null | wc -l | tr -d ' ')
    REVISIONS=$(echo "$SRS_FILES" | xargs grep -l "^status: revisions" 2>/dev/null | wc -l | tr -d ' ')
    APPROVED=$(echo "$SRS_FILES" | xargs grep -l "^status: approved" 2>/dev/null | wc -l | tr -d ' ')
    SHIPPED=$(echo "$SRS_FILES" | xargs grep -l "^status: shipped" 2>/dev/null | wc -l | tr -d ' ')
    STALE=$(echo "$SRS_FILES" | xargs grep -l "^status: stale" 2>/dev/null | wc -l | tr -d ' ')
    TOTAL=$((DRAFT + REVIEW + REVISIONS + APPROVED + SHIPPED + STALE))

    if [ "$TOTAL" -gt 0 ]; then
        echo "  SRS ($TOTAL): draft=$DRAFT  in-review=$REVIEW  revisions=$REVISIONS  approved=$APPROVED  shipped=$SHIPPED  stale=$STALE"
    fi
fi

# Open CRs (Phase 6)
if [ -d "$PROJECT_PATH/docs/cr" ]; then
    OPEN_CR=$(grep -l "^status: \(proposed\|impact-assessed\|applied\)" "$PROJECT_PATH/docs/cr"/CR-*.md 2>/dev/null | wc -l | tr -d ' ')
    if [ "$OPEN_CR" -gt 0 ]; then
        echo "  Open CRs: $OPEN_CR (run /cr list)"
    fi
fi

# Stale propagations (v2.0 Phase 6)
STALE_LOG="$PROJECT_PATH/docs/_shared/staleness.md"
if [ -f "$STALE_LOG" ]; then
    CUTOFF=$(date -v-7d +%Y-%m-%d 2>/dev/null || date -d "7 days ago" +%Y-%m-%d 2>/dev/null || echo "1970-01-01")
    # Bảng Markdown: | ngày | upstream | downstream | lý do | → ngày là field 2
    # (field 1 rỗng do pipe biên). Chỉ đếm dòng có ngày ISO thật, bỏ header.
    RECENT_STALE=$(awk -F'|' -v cutoff="$CUTOFF" '
        { gsub(/^[[:space:]]+|[[:space:]]+$/, "", $2) }
        $2 ~ /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/ && $2 >= cutoff
    ' "$STALE_LOG" 2>/dev/null | wc -l | tr -d ' ')
    if [ "$RECENT_STALE" -gt 0 ]; then
        echo "  ⏰ Stale propagations (7d): $RECENT_STALE (run /dashboard để xem stale chain)"
    fi
fi

# Current stale doc count (any path under docs/)
STALE_DOCS=$(find "$PROJECT_PATH/docs" -name "*.md" -type f 2>/dev/null \
    | grep -v "/exports/" | grep -v "/inbox/" \
    | xargs grep -l "^status: stale" 2>/dev/null | wc -l | tr -d ' ')
if [ "$STALE_DOCS" -gt 0 ]; then
    echo "  ⏰ Stale docs: $STALE_DOCS (run /dashboard để xem detail)"
fi

# Open questions count (any unchecked TODO with "open question" or "OQ:" mark)
if [ -d "$PROJECT_PATH/docs" ]; then
    OQ=$(grep -rE "^- \[ \].*[Oo]pen [Qq]uestion|^- \[ \].*OQ:" "$PROJECT_PATH/docs" --include="*.md" 2>/dev/null | wc -l | tr -d ' ')
    if [ "$OQ" -gt 0 ]; then
        echo "  Open questions: $OQ (run /oq to review)"
    fi
fi

# Inbox unprocessed
if [ -d "$PROJECT_PATH/docs/inbox" ]; then
    INBOX=$(ls "$PROJECT_PATH/docs/inbox"/*.md 2>/dev/null | wc -l | tr -d ' ')
    if [ "$INBOX" -gt 0 ]; then
        echo "  Inbox: $INBOX item(s) waiting"
    fi
fi

echo "═══════════════════════════════════════════════"
echo ""
