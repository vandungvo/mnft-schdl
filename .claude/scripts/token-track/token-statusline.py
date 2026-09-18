#!/usr/bin/env python3
"""
token-statusline.py — In 1 dong trang thai token/cost cho session hien tai.

Claude Code goi script nay (config statusLine trong settings.json), truyen 1 JSON
qua stdin gom: session_id, cwd, model, transcript_path, va thuong co cost.total_cost_usd
+ context token. Script:
  1. Doc stdin.
  2. Neu Claude Code da cung cap cost/context san -> dung truc tiep (nhanh nhat).
  3. Neu khong, doc snapshot nho .claude/token-tracking/snapshots/<session>.json
     (do token-ingest.py ghi) — KHONG parse ca JSONL moi lan.

In dang:  opus | $0.41 phien | 126k ctx | <skill dang chay>
Realtime = sau moi assistant response duoc flush; khong doc duoc token dang stream.
"""
import sys
import json
import os

HERE = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.abspath(os.path.join(HERE, "..", "..", ".."))
DATA_DIR = os.path.join(PROJECT_ROOT, ".claude", "token-tracking")


def human(n):
    n = int(n or 0)
    if n >= 1_000_000:
        return f"{n/1_000_000:.1f}M"
    if n >= 1_000:
        return f"{n/1_000:.0f}k"
    return str(n)


def short_model(m):
    m = (m or "").lower()
    for k in ("opus", "sonnet", "haiku", "fable"):
        if k in m:
            return k
    return m[:8] or "?"


def current_skill(session_id):
    """Skill dang chay = top cua stack start/end trong skill-events.jsonl."""
    path = os.path.join(DATA_DIR, "skill-events.jsonl")
    if not os.path.exists(path):
        return None
    stack = []
    try:
        with open(path, encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                try:
                    o = json.loads(line)
                except Exception:
                    continue
                if o.get("session_id") != session_id:
                    continue
                if o.get("event") == "start":
                    stack.append(o.get("skill"))
                elif o.get("event") == "end" and stack:
                    sk = o.get("skill")
                    if sk in stack:
                        while stack:
                            if stack.pop() == sk:
                                break
                    else:
                        stack.pop()
    except Exception:
        return None
    return stack[-1] if stack else None


def main():
    try:
        data = json.loads(sys.stdin.read() or "{}")
    except Exception:
        data = {}

    # PHẠM VI CHỈ THEO PROJECT: statusline này chỉ nói về project chứa nó.
    # Nếu được cấu hình GLOBAL (~/.claude/settings.json) và đang mở project KHÁC
    # -> cwd từ stdin != PROJECT_ROOT -> IM LẶNG (không in gì), tránh hiện số của
    # project này khi user đang ở project khác. Nhờ vậy "mặc định chỉ theo project"
    # kể cả khi lỡ đặt global.
    cwd = data.get("cwd") or data.get("workspace") or ""
    if isinstance(cwd, dict):
        cwd = cwd.get("current_dir") or cwd.get("path") or ""
    if cwd:
        try:
            if os.path.realpath(cwd) != os.path.realpath(PROJECT_ROOT):
                return  # dang o project khac -> khong hien thi
        except Exception:
            pass

    sid = data.get("session_id") or data.get("sessionId") or ""
    model = data.get("model") or {}
    if isinstance(model, dict):
        model = model.get("id") or model.get("display_name") or ""

    # Cost: uu tien Claude Code cung cap san
    cost = None
    c = data.get("cost") or {}
    if isinstance(c, dict) and c.get("total_cost_usd") is not None:
        cost = c["total_cost_usd"]

    # Context token: Claude Code thuong gui trong stdin
    ctx = 0
    for key in ("context", "usage", "tokens"):
        v = data.get(key)
        if isinstance(v, dict):
            ctx = (v.get("input_tokens", 0) or 0) + (v.get("cache_read_input_tokens", 0) or 0) \
                  + (v.get("cache_creation_input_tokens", 0) or 0) + (v.get("output_tokens", 0) or 0)
            if ctx:
                break

    # Fallback: doc snapshot do ingester tao
    if cost is None and sid:
        snap = os.path.join(DATA_DIR, "snapshots", sid + ".json")
        if os.path.exists(snap):
            try:
                s = json.load(open(snap, encoding="utf-8"))
                cost = s.get("cost_usd")
                if not ctx:
                    ctx = s.get("tokens", 0)
                if not model:
                    model = s.get("model", "")
            except Exception:
                pass

    parts = [short_model(model)]
    if cost is not None:
        parts.append(f"${cost:.2f} session")
    if ctx:
        parts.append(f"{human(ctx)} ctx")
    sk = current_skill(sid)
    if sk:
        parts.append(f"/{sk}")

    print(" | ".join(parts))


if __name__ == "__main__":
    main()
