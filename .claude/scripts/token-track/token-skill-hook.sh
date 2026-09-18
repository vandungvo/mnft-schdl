#!/usr/bin/env bash
# token-skill-hook.sh — Hook ghi lai moi lan 1 Skill duoc goi (start/end).
#
# Gan vao settings.json o CA HAI event de co ca moc bat dau lan ket thuc:
#   PreToolUse  matcher "Skill"  -> ghi event "start"
#   PostToolUse matcher "Skill"  -> ghi event "end"
#
# Hook nhan 1 JSON qua stdin. Cac field can:
#   .session_id
#   .tool_input.skill    (ten skill, vd "srs")
#   .hook_event_name     (PreToolUse | PostToolUse)
#
# Ghi 1 dong JSON vao .claude/token-tracking/skill-events.jsonl:
#   {"ts":"<ISO-UTC>","session_id":"...","event":"start|end","skill":"srs"}
#
# KHONG can sua 51 SKILL.md — hook bat MOI lan tool Skill chay.
# Khong bao gio chan tool (luon exit 0).

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
DATA_DIR="$ROOT/.claude/token-tracking"
OUT="$DATA_DIR/skill-events.jsonl"
mkdir -p "$DATA_DIR"

# Doc stdin (JSON hook) va xu ly bang Python; truyen path output qua argv.
python3 "$ROOT/.claude/scripts/token-track/_skill_hook.py" "$OUT" || true

exit 0
