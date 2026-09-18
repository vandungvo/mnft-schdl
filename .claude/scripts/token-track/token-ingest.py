#!/usr/bin/env python3
"""
token-ingest.py — Doc JSONL transcript cua Claude Code (CHI project nay),
gan token/cost cho tung session + tung skill, ghi ra 1 file JSON trung gian.

0 dependency ngoai (chi Python stdlib). KHONG dung SQLite — 1 file usage-index.json
la du cho 1 project.

NGUON DU LIEU:
  ~/.claude/projects/<project-dir-slug>/*.jsonl                       (session chinh)
  .../*/subagents/agent-*.jsonl                                       (subagent — tach rieng)
  .claude/token-tracking/skill-events.jsonl                          (skill start/end tu hook)

QUYET DINH THIET KE (tu research da-agent, xem README):
  - DEDUP: key = (requestId, message.id), GIU ban co output_tokens LON NHAT
    (hoa -> timestamp moi nhat). Neu giu "first seen" se undercount ~5x vi
    Claude Code ghi snapshot streaming trung gian (da verify: 1.270 key doi output).
  - COST: 4 bucket rieng gia (input / output / cache_write 5m+1h / cache_read).
  - SKILL: gan theo skill-events.jsonl (instrument PreToolUse hook) — chinh xac
    theo timestamp. Message truoc skill dau tien / ngoai moi skill = "(no-skill)".
  - SIDECHAIN/subagent: TACH RIENG, khong cong thang vao root total.
  - So JSONL la BEST-EFFORT / lower-bound, khong phai billing-exact.

CHAY:
  python3 .claude/scripts/token-track/token-ingest.py            # cap nhat index
  python3 .claude/scripts/token-track/token-ingest.py --rebuild  # parse lai tu dau
"""
import json
import os
import sys
import glob
from datetime import datetime, timezone

HERE = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.abspath(os.path.join(HERE, "..", "..", ".."))
HOME = os.path.expanduser("~")

# Thu muc transcript cua project nay trong ~/.claude/projects/
# Ten folder = duong dan project voi '/' -> '-'
def project_transcript_dir():
    slug = PROJECT_ROOT.replace("/", "-")
    d = os.path.join(HOME, ".claude", "projects", slug)
    return d

TRANSCRIPT_DIR = project_transcript_dir()
DATA_DIR = os.path.join(PROJECT_ROOT, ".claude", "token-tracking")
INDEX_PATH = os.path.join(DATA_DIR, "usage-index.json")
OFFSET_PATH = os.path.join(DATA_DIR, "offsets.json")
SKILL_EVENTS_PATH = os.path.join(DATA_DIR, "skill-events.jsonl")
PRICING_PATH = os.path.join(HERE, "pricing.json")


def load_pricing():
    with open(PRICING_PATH, encoding="utf-8") as f:
        return json.load(f)


def rate_for(model, pricing):
    models = pricing["models"]
    name = (model or "").lower()
    # match cu the truoc (opus/sonnet/haiku/fable), roi default
    for key in ("opus", "sonnet", "haiku", "fable"):
        if key in name and key in models:
            return models[key]
    return models["default"]


def cost_of(usage, model, pricing):
    """Tinh USD cho 1 message usage da dedup, tach 4 bucket."""
    r = rate_for(model, pricing)
    per = pricing["per_tokens"]
    inp = usage.get("input_tokens", 0) or 0
    out = usage.get("output_tokens", 0) or 0
    cread = usage.get("cache_read_input_tokens", 0) or 0
    cc = usage.get("cache_creation", {}) or {}
    cw5 = cc.get("ephemeral_5m_input_tokens", 0) or 0
    cw1 = cc.get("ephemeral_1h_input_tokens", 0) or 0
    # Neu khong co breakdown TTL, dat toan bo cache_creation vao 5m (mac dinh Anthropic)
    if cw5 == 0 and cw1 == 0:
        cw5 = usage.get("cache_creation_input_tokens", 0) or 0
    dollars = (
        inp * r["input"]
        + out * r["output"]
        + cread * r["cache_read"]
        + cw5 * r["cache_write_5m"]
        + cw1 * r["cache_write_1h"]
    ) / per
    return {
        "input": inp,
        "output": out,
        "cache_read": cread,
        "cache_write_5m": cw5,
        "cache_write_1h": cw1,
        "cost_usd": dollars,
    }


def parse_ts(s):
    if not s:
        return None
    try:
        return datetime.fromisoformat(s.replace("Z", "+00:00"))
    except Exception:
        return None


def load_skill_events():
    """Doc skill-events.jsonl -> list (ts, session_id, event, skill, tool_use_id).
    Event: 'start' (PreToolUse Skill) hoac 'end' (PostToolUse Skill)."""
    events = []
    if not os.path.exists(SKILL_EVENTS_PATH):
        return events
    with open(SKILL_EVENTS_PATH, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                o = json.loads(line)
            except Exception:
                continue
            ts = parse_ts(o.get("ts"))
            if ts is None:
                continue
            events.append({
                "ts": ts,
                "session_id": o.get("session_id", ""),
                "event": o.get("event", "start"),
                "skill": o.get("skill", ""),
            })
    events.sort(key=lambda e: e["ts"])
    return events


def skill_at(ts, session_id, events):
    """Skill dang chay tai thoi diem ts trong session — dua tren stack start/end.
    Tra ten skill dang o TOP stack, hoac None (no-skill)."""
    if ts is None:
        return None
    stack = []
    for e in events:
        if e["session_id"] != session_id:
            continue
        if e["ts"] > ts:
            break
        if e["event"] == "start":
            stack.append(e["skill"])
        elif e["event"] == "end":
            # pop skill khop (hoac pop top neu khong khop ten)
            if stack and e["skill"] in stack:
                # pop tu tren xuong den skill khop
                while stack:
                    top = stack.pop()
                    if top == e["skill"]:
                        break
            elif stack:
                stack.pop()
    return stack[-1] if stack else None


def iter_jsonl_files():
    """Tat ca .jsonl cua project: session chinh + subagents/."""
    if not os.path.isdir(TRANSCRIPT_DIR):
        return []
    files = []
    files += glob.glob(os.path.join(TRANSCRIPT_DIR, "*.jsonl"))
    files += glob.glob(os.path.join(TRANSCRIPT_DIR, "**", "subagents", "*.jsonl"), recursive=True)
    files += glob.glob(os.path.join(TRANSCRIPT_DIR, "**", "*.jsonl"), recursive=True)
    return sorted(set(files))


def build_agent_type_map():
    """Map agentId (file subagent) -> subagent_type (senior-ba, flow-reviewer, ...).
    Cach: trong moi session cha, doc cac 'Agent'/'Task' tool_use (co subagent_type)
    theo thu tu timestamp; doc cac file subagent theo thu tu mtime; ghep 1-1 theo
    thu tu. Khong khop duoc -> khong co trong map (se rot vao '(subagent:unknown)').
    Day la best-effort — tong subagent luon dung, chi rieng chia theo type la uoc luong."""
    amap = {}
    parent_files = glob.glob(os.path.join(TRANSCRIPT_DIR, "*.jsonl"))
    for pf in parent_files:
        sid = os.path.splitext(os.path.basename(pf))[0]
        sub_dir = os.path.join(TRANSCRIPT_DIR, sid, "subagents")
        if not os.path.isdir(sub_dir):
            continue
        # 1) list subagent_type theo thu tu xuat hien trong file cha
        spawns = []
        try:
            with open(pf, "r", encoding="utf-8", errors="ignore") as f:
                for ln in f:
                    if '"subagent_type"' not in ln:
                        continue
                    try:
                        o = json.loads(ln)
                    except Exception:
                        continue
                    msg = o.get("message") or {}
                    for x in (msg.get("content") or []):
                        if isinstance(x, dict) and x.get("type") == "tool_use" \
                           and x.get("name") in ("Agent", "Task"):
                            st = (x.get("input") or {}).get("subagent_type")
                            if st:
                                spawns.append((o.get("timestamp", ""), st))
        except Exception:
            continue
        spawns.sort(key=lambda t: t[0])
        # 2) list subagent file theo agentId + thoi diem dong dau tien
        sub_files = glob.glob(os.path.join(sub_dir, "agent-*.jsonl"))
        sub_meta = []
        for sfp in sub_files:
            aid = os.path.splitext(os.path.basename(sfp))[0].replace("agent-", "")
            first_ts = ""
            try:
                with open(sfp, "r", encoding="utf-8", errors="ignore") as f:
                    for ln in f:
                        try:
                            o = json.loads(ln)
                            first_ts = o.get("timestamp", "")
                            break
                        except Exception:
                            continue
            except Exception:
                pass
            sub_meta.append((first_ts or "", aid))
        sub_meta.sort(key=lambda t: t[0])
        # 3) ghep theo thu tu
        for i, (_, aid) in enumerate(sub_meta):
            if i < len(spawns):
                amap[aid] = spawns[i][1]
    return amap


def read_new_lines(path, offsets):
    """Doc incremental tu byte-offset. Neu file ngan hon offset (rotate/truncate)
    hoac inode doi -> doc lai tu dau."""
    st = os.stat(path)
    key = path
    prev = offsets.get(key, {})
    prev_off = prev.get("offset", 0)
    prev_inode = prev.get("inode")
    if prev_inode is not None and prev_inode != st.st_ino:
        prev_off = 0
    if st.st_size < prev_off:
        prev_off = 0
    lines = []
    with open(path, "r", encoding="utf-8", errors="ignore") as f:
        f.seek(prev_off)
        data = f.read()
        new_off = prev_off + len(data.encode("utf-8", errors="ignore"))
        # Chi lay dong hoan chinh (ket thuc bang \n); giu phan du cho lan sau
        if data and not data.endswith("\n"):
            last_nl = data.rfind("\n")
            if last_nl >= 0:
                consumed = data[: last_nl + 1]
                new_off = prev_off + len(consumed.encode("utf-8", errors="ignore"))
                data = consumed
            else:
                data = ""
        for ln in data.splitlines():
            ln = ln.strip()
            if ln:
                lines.append(ln)
    offsets[key] = {"offset": new_off, "inode": st.st_ino}
    return lines


def main():
    rebuild = "--rebuild" in sys.argv
    os.makedirs(DATA_DIR, exist_ok=True)
    pricing = load_pricing()

    if rebuild:
        offsets = {}
        raw_records = {}  # key -> best record
    else:
        offsets = {}
        if os.path.exists(OFFSET_PATH):
            try:
                offsets = json.load(open(OFFSET_PATH, encoding="utf-8"))
            except Exception:
                offsets = {}
        raw_records = {}
        if os.path.exists(INDEX_PATH):
            try:
                idx = json.load(open(INDEX_PATH, encoding="utf-8"))
                raw_records = idx.get("_dedup_state", {})
            except Exception:
                raw_records = {}

    files = iter_jsonl_files()
    new_line_count = 0
    for path in files:
        try:
            lines = read_new_lines(path, offsets)
        except FileNotFoundError:
            continue
        for ln in lines:
            new_line_count += 1
            try:
                o = json.loads(ln)
            except Exception:
                continue
            if o.get("type") != "assistant":
                continue
            msg = o.get("message") or {}
            usage = msg.get("usage")
            if not usage:
                continue
            req = o.get("requestId") or ""
            mid = msg.get("id") or ""
            if not req and not mid:
                continue
            key = req + ":" + mid
            out_tok = usage.get("output_tokens", 0) or 0
            ts = o.get("timestamp", "")
            rec = {
                "session_id": o.get("sessionId", ""),
                "timestamp": ts,
                "model": msg.get("model", ""),
                "sidechain": bool(o.get("isSidechain", False)),
                "agent_id": o.get("agentId", ""),
                "branch": o.get("gitBranch", ""),
                "usage": usage,
                "out": out_tok,
            }
            # DEDUP: giu ban output_tokens lon nhat; hoa -> timestamp moi nhat
            old = raw_records.get(key)
            if old is None:
                raw_records[key] = rec
            else:
                if out_tok > old["out"] or (out_tok == old["out"] and ts > old["timestamp"]):
                    raw_records[key] = rec

    skill_events = load_skill_events()
    agent_type_map = build_agent_type_map()

    # Tong hop tu raw_records da dedup
    sessions = {}       # session_id -> aggregate
    skills = {}         # skill_name -> aggregate (root only)
    by_day = {}         # YYYY-MM-DD -> aggregate
    subagents = {}      # agent_type -> aggregate
    subagent_total = _zero()
    root_total = _zero()

    for key, rec in raw_records.items():
        c = cost_of(rec["usage"], rec["model"], pricing)
        sid = rec["session_id"]
        ts = parse_ts(rec["timestamp"])
        day = rec["timestamp"][:10] if rec["timestamp"] else "unknown"

        if rec["sidechain"]:
            _add(subagent_total, c)
            atype = agent_type_map.get(rec.get("agent_id", ""), "(subagent:unknown)")
            sa = subagents.setdefault(atype, _zero_named2("agent_type", atype))
            _add(sa, c)
            continue  # subagent tach rieng, khong vao root/skill/session total

        _add(root_total, c)
        s = sessions.setdefault(sid, _zero_session(sid, rec))
        _add(s, c)
        s["last_ts"] = max(s.get("last_ts", ""), rec["timestamp"])
        if not s.get("first_ts") or rec["timestamp"] < s["first_ts"]:
            s["first_ts"] = rec["timestamp"]

        d = by_day.setdefault(day, _zero())
        _add(d, c)

        skill_name = skill_at(ts, sid, skill_events) or "(no-skill)"
        sk = skills.setdefault(skill_name, _zero_named(skill_name))
        _add(sk, c)
        sk["runs"] = sk.get("runs", 0)  # count set later

    # Dem so lan chay moi skill (so lan 'start' trong events)
    run_counts = {}
    for e in skill_events:
        if e["event"] == "start":
            run_counts[e["skill"]] = run_counts.get(e["skill"], 0) + 1
    for name, sk in skills.items():
        sk["runs"] = run_counts.get(name, 0)

    # Codex (/delegate) — layer tach biet, doc ~/.codex sessions loc theo project nay
    codex_data = ingest_codex(pricing)

    index = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "project_root": PROJECT_ROOT,
        "transcript_dir": TRANSCRIPT_DIR,
        "note": "So token/cost la best-effort/lower-bound tu JSONL, KHONG phai billing-exact. Cache read nhieu token nhung re. Codex tinh quota rieng cua OpenAI.",
        "totals": {"root": root_total, "subagent": subagent_total,
                   "codex": codex_data.get("total", _zero())},
        "sessions": _sorted_dict(sessions, key=lambda v: v.get("cost_usd", 0)),
        "skills": _sorted_dict(skills, key=lambda v: v.get("cost_usd", 0)),
        "subagents": _sorted_dict(subagents, key=lambda v: v.get("cost_usd", 0)),
        "codex_sessions": codex_data.get("sessions", []),
        "by_day": dict(sorted(by_day.items())),
        "_dedup_state": raw_records,
    }
    tmp = INDEX_PATH + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(index, f, ensure_ascii=False)
    os.replace(tmp, INDEX_PATH)

    tmp2 = OFFSET_PATH + ".tmp"
    with open(tmp2, "w", encoding="utf-8") as f:
        json.dump(offsets, f)
    os.replace(tmp2, OFFSET_PATH)

    # Snapshot nho per-session cho statusline (chi field can thiet)
    snap_dir = os.path.join(DATA_DIR, "snapshots")
    os.makedirs(snap_dir, exist_ok=True)
    for sid, s in sessions.items():
        if not sid:
            continue
        snap = {
            "session_id": sid,
            "cost_usd": s["cost_usd"],
            "tokens": s["input"] + s["output"] + s["cache_read"] + s["cache_write_5m"] + s["cache_write_1h"],
            "model": s.get("model", ""),
        }
        sp = os.path.join(snap_dir, sid + ".json")
        with open(sp + ".tmp", "w", encoding="utf-8") as f:
            json.dump(snap, f)
        os.replace(sp + ".tmp", sp)

    cx = codex_data.get("total", _zero())
    print(f"[token-ingest] {new_line_count} dong moi | {len(raw_records)} message (dedup) | "
          f"{len(sessions)} session | root ${root_total['cost_usd']:.2f} | "
          f"subagent ${subagent_total['cost_usd']:.2f} ({len(subagents)} type) | "
          f"codex ${cx['cost_usd']:.2f} ({len(codex_data.get('sessions', []))} session)")


def _zero():
    return {"input": 0, "output": 0, "cache_read": 0, "cache_write_5m": 0,
            "cache_write_1h": 0, "cost_usd": 0.0, "messages": 0}


def _zero_session(sid, rec):
    z = _zero()
    z["session_id"] = sid
    z["model"] = rec["model"]
    z["branch"] = rec["branch"]
    z["first_ts"] = ""
    z["last_ts"] = ""
    return z


def _zero_named(name):
    z = _zero()
    z["skill"] = name
    z["runs"] = 0
    return z


def _zero_named2(field, name):
    z = _zero()
    z[field] = name
    return z


# --------------------------------------------------------------------------
# CODEX (/delegate) — layer tach biet. Doc ~/.codex/sessions/**/rollout-*.jsonl,
# loc theo cwd == project nay. Token o event_msg type 'token_count':
#   total_token_usage (cumulative) — lay dong CUOI = tong session.
#   Cost tinh gia GPT rieng (codex_pricing trong pricing.json neu co, else uoc luong).
# LUU Y: Codex tinh vao quota OpenAI rieng, KHONG phai Anthropic. So la uoc luong.
# --------------------------------------------------------------------------
CODEX_SESSIONS_DIR = os.path.join(HOME, ".codex", "sessions")

# Gia GPT-5.x uoc luong USD per 1M token (input / cached input / output).
# Sua trong pricing.json key "codex_models" de override.
CODEX_DEFAULT_PRICE = {"input": 1.25, "cached_input": 0.125, "output": 10.0}


def codex_rate(model, pricing):
    cm = pricing.get("codex_models", {})
    name = (model or "").lower()
    for k, v in cm.items():
        if k != "default" and k in name:
            return v
    return cm.get("default", CODEX_DEFAULT_PRICE)


def ingest_codex(pricing):
    result = {"total": _zero(), "sessions": []}
    if not os.path.isdir(CODEX_SESSIONS_DIR):
        return result
    files = glob.glob(os.path.join(CODEX_SESSIONS_DIR, "**", "rollout-*.jsonl"), recursive=True)
    per = pricing["per_tokens"]
    for fp in files:
        cwd = None
        model = ""
        started = ""
        last_total = None
        try:
            with open(fp, "r", encoding="utf-8", errors="ignore") as f:
                for ln in f:
                    if '"cwd"' not in ln and '"token_count"' not in ln and '"model"' not in ln:
                        continue
                    try:
                        o = json.loads(ln)
                    except Exception:
                        continue
                    t = o.get("type")
                    p = o.get("payload") or {}
                    if t == "session_meta":
                        cwd = p.get("cwd")
                        started = o.get("timestamp", "")
                    elif t == "turn_context" and not model:
                        model = p.get("model", "") or model
                    elif t == "event_msg" and p.get("type") == "token_count":
                        tu = (p.get("info") or {}).get("total_token_usage")
                        if tu:
                            last_total = tu
        except Exception:
            continue
        if cwd != PROJECT_ROOT or not last_total:
            continue
        inp = last_total.get("input_tokens", 0) or 0
        cached = last_total.get("cached_input_tokens", 0) or 0
        out = last_total.get("output_tokens", 0) or 0
        # input_tokens da GOM ca cached; tach ra de tinh gia cached re hon
        fresh_in = max(inp - cached, 0)
        r = codex_rate(model, pricing)
        dollars = (fresh_in * r["input"] + cached * r.get("cached_input", r["input"])
                   + out * r["output"]) / per
        c = {"input": inp, "output": out, "cache_read": cached,
             "cache_write_5m": 0, "cache_write_1h": 0, "cost_usd": dollars}
        _add(result["total"], c)
        result["sessions"].append({
            "file": os.path.basename(fp),
            "started": started,
            "model": model or "codex",
            "input": inp, "cached": cached, "output": out,
            "cost_usd": dollars,
        })
    result["sessions"].sort(key=lambda s: s.get("cost_usd", 0), reverse=True)
    return result


def _add(agg, c):
    agg["input"] += c["input"]
    agg["output"] += c["output"]
    agg["cache_read"] += c["cache_read"]
    agg["cache_write_5m"] += c["cache_write_5m"]
    agg["cache_write_1h"] += c["cache_write_1h"]
    agg["cost_usd"] += c["cost_usd"]
    agg["messages"] += 1


def _sorted_dict(d, key):
    return dict(sorted(d.items(), key=lambda kv: key(kv[1]), reverse=True))


if __name__ == "__main__":
    main()
