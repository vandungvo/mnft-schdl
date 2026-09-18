#!/usr/bin/env python3
"""_skill_hook.py — nhan hook JSON qua stdin, ghi 1 dong skill-event.
Duoc goi tu token-skill-hook.sh. Tach ra file .py de tranh loi quoting heredoc."""
import os
import sys
import json
import datetime

# PROJECT_ROOT = 3 cấp trên file này (.claude/scripts/token-track/_skill_hook.py)
PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", ".."))


def main():
    out = sys.argv[1] if len(sys.argv) > 1 else None
    if not out:
        return
    try:
        o = json.loads(sys.stdin.read() or "{}")
    except Exception:
        return
    # PHẠM VI CHỈ THEO PROJECT: nếu hook lỡ đặt global và đang ở project KHÁC
    # -> cwd != PROJECT_ROOT -> không ghi event (tránh trộn skill-event project khác).
    cwd = o.get("cwd") or o.get("workspace") or ""
    if isinstance(cwd, dict):
        cwd = cwd.get("current_dir") or cwd.get("path") or ""
    if cwd:
        try:
            if os.path.realpath(cwd) != os.path.realpath(PROJECT_ROOT):
                return
        except Exception:
            pass
    skill = (o.get("tool_input") or {}).get("skill")
    if not skill:
        return  # khong phai Skill tool -> bo qua
    evt_name = o.get("hook_event_name", "")
    event = "end" if "Post" in evt_name else "start"
    rec = {
        "ts": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "session_id": o.get("session_id", ""),
        "event": event,
        "skill": skill,
    }
    with open(out, "a", encoding="utf-8") as f:
        f.write(json.dumps(rec, ensure_ascii=False) + "\n")


if __name__ == "__main__":
    main()
