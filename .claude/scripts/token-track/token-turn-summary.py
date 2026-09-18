#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Show a per-turn token and cost summary from a Claude Code Stop hook.

The hook receives JSON on stdin with ``session_id``, ``cwd``, and
``transcript_path``. It writes only a Claude Code hook JSON object to stdout.
All failures are intentionally silent so this observer can never block a turn.
"""
import glob
import json
import os
import sys
import time
from collections import Counter

HERE = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.abspath(os.path.join(HERE, "..", "..", ".."))
DATA_DIR = os.path.join(PROJECT_ROOT, ".claude", "token-tracking")
PRICING_PATH = os.path.join(HERE, "pricing.json")
MODEL_FAMILIES = ("opus", "sonnet", "haiku", "fable")
TRANSCRIPT_READY_ATTEMPTS = 6
TRANSCRIPT_READY_DELAY_SECONDS = 0.05


def load_pricing():
    try:
        with open(PRICING_PATH, encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return None


def rate_for(model, pricing):
    """Return a configured family rate, or None for an unknown model.

    Falling back to another model family's price makes a precise-looking but
    incorrect dollar amount. Unknown models therefore retain token telemetry
    while cost is reported as unavailable.
    """
    if not pricing:
        return None
    models = pricing.get("models") or {}
    name = (model or "").lower()
    for key in MODEL_FAMILIES:
        if key in name and key in models:
            return models[key]
    return None


def usage_counts(usage):
    usage = usage or {}
    inp = usage.get("input_tokens", 0) or 0
    out = usage.get("output_tokens", 0) or 0
    cread = usage.get("cache_read_input_tokens", 0) or 0
    cc = usage.get("cache_creation", {}) or {}
    cw5 = cc.get("ephemeral_5m_input_tokens", 0) or 0
    cw1 = cc.get("ephemeral_1h_input_tokens", 0) or 0
    if cw5 == 0 and cw1 == 0:
        cw5 = usage.get("cache_creation_input_tokens", 0) or 0
    return {
        "input": inp,
        "output": out,
        "cache_read": cread,
        "cache_write_5m": cw5,
        "cache_write_1h": cw1,
    }


def cost_of(usage, model, pricing):
    counts = usage_counts(usage)
    rate = rate_for(model, pricing)
    if rate is None:
        return None, counts
    per = pricing.get("per_tokens", 1_000_000) or 1_000_000
    dollars = (
        counts["input"] * rate["input"]
        + counts["output"] * rate["output"]
        + counts["cache_read"] * rate["cache_read"]
        + counts["cache_write_5m"] * rate["cache_write_5m"]
        + counts["cache_write_1h"] * rate["cache_write_1h"]
    ) / per
    return dollars, counts


def exact(n):
    return "{:,}".format(int(n or 0))


def read_lines(path):
    records = []
    try:
        with open(path, "r", encoding="utf-8", errors="ignore") as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                try:
                    records.append(json.loads(line))
                except Exception:
                    continue
    except Exception:
        pass
    return records


def assistant_text(record):
    """Return the visible text from an assistant transcript record."""
    if record.get("type") != "assistant":
        return ""
    content = (record.get("message") or {}).get("content") or []
    if isinstance(content, str):
        return content
    if not isinstance(content, list):
        return ""
    return "".join(
        str(block.get("text", ""))
        for block in content
        if isinstance(block, dict) and block.get("type") == "text"
    )


def final_assistant_visible(turn_records, last_assistant_message):
    """Check that the Stop hook's final response has reached the transcript.

    Claude Code can invoke a Stop hook a few milliseconds before the last
    assistant record is visible to a separate process. Matching the hook's
    ``last_assistant_message`` avoids silently calculating from an incomplete
    turn, especially for short replies that have no earlier tool-use records.
    """
    expected = (last_assistant_message or "").strip()
    if not expected:
        return True
    for record in reversed(turn_records):
        if record.get("isSidechain", False):
            continue
        if assistant_text(record).strip() == expected:
            return True
    return False


def read_stop_turn(path, last_assistant_message, attempts=TRANSCRIPT_READY_ATTEMPTS,
                   delay=TRANSCRIPT_READY_DELAY_SECONDS):
    """Read a Stop turn, briefly retrying while its final record is pending."""
    records = []
    turn_lines = []
    attempts = max(int(attempts or 1), 1)
    for attempt in range(attempts):
        records = read_lines(path)
        if records:
            start = latest_turn_start(records)
            turn_lines = records[start:]
            if final_assistant_visible(turn_lines, last_assistant_message):
                break
        if attempt + 1 < attempts:
            time.sleep(delay)
    return records, turn_lines


def has_user_text(record):
    if record.get("type") != "user":
        return False
    content = (record.get("message") or {}).get("content")
    if isinstance(content, str):
        return bool(content.strip())
    if not isinstance(content, list):
        return False
    has_text = False
    for block in content:
        if not isinstance(block, dict):
            continue
        if block.get("type") == "tool_result":
            return False
        if block.get("type") == "text" and str(block.get("text", "")).strip():
            has_text = True
    return has_text


def latest_turn_start(records):
    """Locate the latest human prompt without mistaking tool results for one."""
    for index in range(len(records) - 1, -1, -1):
        record = records[index]
        if record.get("promptSource") != "system" and has_user_text(record):
            return index
    return 0


def dedup_usage(records):
    """Keep the largest streamed snapshot for each request/message pair."""
    best = {}
    for record in records:
        if record.get("type") != "assistant":
            continue
        message = record.get("message") or {}
        usage = message.get("usage")
        if not usage:
            continue
        request_id = record.get("requestId") or ""
        message_id = message.get("id") or ""
        if not request_id and not message_id:
            continue
        key = request_id + ":" + message_id
        output_tokens = usage.get("output_tokens", 0) or 0
        timestamp = record.get("timestamp", "")
        candidate = {
            "usage": usage,
            "model": message.get("model", ""),
            "sidechain": bool(record.get("isSidechain", False)),
            "agent_id": record.get("agentId", ""),
            "skill": record.get("attributionSkill", "") or "",
            "output": output_tokens,
            "timestamp": timestamp,
        }
        previous = best.get(key)
        if previous is None or output_tokens > previous["output"] or (
            output_tokens == previous["output"]
            and timestamp > previous["timestamp"]
        ):
            best[key] = candidate
    return list(best.values())


def empty_total():
    return {
        "input": 0,
        "output": 0,
        "cache_read": 0,
        "cache_write": 0,
        "cost": 0.0,
        "cost_known": True,
        "unsupported_records": 0,
        "records": 0,
        "model": "",
    }


def aggregate(records, pricing, sidechain=None):
    total = empty_total()
    for record in records:
        if sidechain is not None and record["sidechain"] != sidechain:
            continue
        dollars, counts = cost_of(record["usage"], record["model"], pricing)
        total["records"] += 1
        total["input"] += counts["input"]
        total["output"] += counts["output"]
        total["cache_read"] += counts["cache_read"]
        total["cache_write"] += counts["cache_write_5m"] + counts["cache_write_1h"]
        if dollars is None:
            total["cost_known"] = False
            total["unsupported_records"] += 1
        else:
            total["cost"] += dollars
        if not total["model"] and record["model"]:
            total["model"] = record["model"]
    return total


def processed_tokens(total):
    return (
        total["input"]
        + total["output"]
        + total["cache_read"]
        + total["cache_write"]
    )


def models_of(records):
    models = []
    for record in records:
        model = record.get("model") or ""
        if model and model not in models:
            models.append(model)
    return models


def cost_text(total, records, pricing, precision=4):
    unknown_models = []
    for record in records:
        model = record.get("model") or "?"
        if rate_for(model, pricing) is None and model not in unknown_models:
            unknown_models.append(model)
    if total["cost_known"]:
        return ("${:,.%df}" % precision).format(total["cost"])
    missing = ", ".join(unknown_models) or "unknown model"
    if total["cost"] > 0:
        return ("${:,.%df} known (partial; no rate for {} in pricing.json)" % precision).format(
            total["cost"], missing
        )
    return "unavailable (no rate for {} in pricing.json)".format(missing)


def tool_metadata(records):
    agent_types = []
    skills = []
    for record in records:
        if record.get("type") != "assistant":
            continue
        content = (record.get("message") or {}).get("content") or []
        if not isinstance(content, list):
            continue
        for block in content:
            if not isinstance(block, dict) or block.get("type") != "tool_use":
                continue
            name = block.get("name")
            inputs = block.get("input") or {}
            if name in ("Agent", "Task"):
                agent_types.append(inputs.get("subagent_type") or "agent")
            elif name == "Skill" and inputs.get("skill"):
                skills.append(inputs["skill"])
    return agent_types, skills


def append_skill_usage(output, skills, turn_records, whole_turn, pricing,
                       subagent_processed=0, subagent_output=0):
    """Append non-additive skill attribution to an already-totalled turn."""
    skill_names = list(dict.fromkeys(
        [skill for skill in skills if skill]
        + [record.get("skill") for record in turn_records if record.get("skill")]
    ))
    if not skill_names:
        return

    output.append("skills: " + ", ".join("/" + skill for skill in skill_names))
    if len(skill_names) == 1:
        # A single skill owns the whole turn — including subagents it spawned.
        output.append(
            "  inclusive usage: {} processed · {} output".format(
                exact(processed_tokens(whole_turn) + subagent_processed),
                exact(whole_turn["output"] + subagent_output),
            )
        )
        return

    attributed = set()
    for skill in skill_names:
        records = [record for record in turn_records if record.get("skill") == skill]
        attributed.update(id(record) for record in records)
        if not records:
            output.append("  /{}: attributed usage unavailable".format(skill))
            continue
        total = aggregate(records, pricing)
        output.append(
            "  /{} attributed: {} processed · {} output".format(
                skill,
                exact(processed_tokens(total)),
                exact(total["output"]),
            )
        )

    overhead_records = [
        record for record in turn_records
        if not record.get("skill") or id(record) not in attributed
    ]
    if overhead_records:
        overhead = aggregate(overhead_records, pricing)
        output.append(
            "  unassigned overhead: {} processed · {} output".format(
                exact(processed_tokens(overhead)),
                exact(overhead["output"]),
            )
        )


def short_model(model):
    name = (model or "").lower()
    for family in MODEL_FAMILIES:
        if family in name:
            return family
    return model or "?"


def turn_start_time(turn_lines):
    """First timestamp of the turn — the boundary for subagent attribution."""
    for record in turn_lines:
        timestamp = record.get("timestamp")
        if timestamp:
            return timestamp
    return ""


def read_turn_subagents(transcript_path, session_id, turn_start):
    """Per-agent usage for this turn from ``<session>/subagents/agent-*.jsonl``.

    Subagent usage is not written to the main transcript at all — it lives only
    in these per-agent files, so reading them is the sole way a Stop summary can
    report what each subagent consumed. Records are filtered to the turn window
    by timestamp so files from earlier turns do not leak in.
    """
    if not turn_start:
        return []
    sid = session_id or os.path.splitext(os.path.basename(transcript_path))[0]
    directory = os.path.join(os.path.dirname(transcript_path), sid, "subagents")
    agents = []
    try:
        paths = glob.glob(os.path.join(directory, "agent-*.jsonl"))
    except Exception:
        return []
    for path in paths:
        records = [
            record for record in dedup_usage(read_lines(path))
            if record.get("timestamp", "") >= turn_start
        ]
        if not records:
            continue
        agents.append({
            "agent_id": os.path.splitext(os.path.basename(path))[0].replace("agent-", ""),
            "records": records,
            "first": min(record.get("timestamp", "") for record in records),
        })
    agents.sort(key=lambda agent: agent["first"])
    return agents


def append_subagent_usage(output, agent_types, turn_subagents, whole_turn, pricing):
    """Per-subagent lines + combined turn total including subagent tokens.

    Type names pair spawn order (Agent tool_use) with file start order —
    best-effort like the ingester: totals are exact, the name split is not.
    Returns ``(processed, output_tokens)`` summed across the turn's subagents.
    """
    output.append("subagents: %d" % len(turn_subagents))
    combined = 0
    combined_output = 0
    for index, agent in enumerate(turn_subagents):
        name = agent_types[index] if index < len(agent_types) else "(type unknown)"
        total = aggregate(agent["records"], pricing)
        combined += processed_tokens(total)
        combined_output += total["output"]
        output.append(
            "  {} ({}): {} processed · {} output".format(
                name,
                short_model(total["model"]),
                exact(processed_tokens(total)),
                exact(total["output"]),
            )
        )
    if len(turn_subagents) > 1:
        output.append(
            "  total: {} processed · {} output".format(
                exact(combined), exact(combined_output)
            )
        )
    output.append(
        "turn incl. subagents: {} processed · {} output".format(
            exact(processed_tokens(whole_turn) + combined),
            exact(whole_turn["output"] + combined_output),
        )
    )
    return combined, combined_output


def snapshot_cost(session_id):
    if not session_id:
        return None
    path = os.path.join(DATA_DIR, "snapshots", session_id + ".json")
    try:
        with open(path, encoding="utf-8") as f:
            return json.load(f).get("cost_usd")
    except Exception:
        return None


def latest_model(records):
    for record in reversed(records):
        if record.get("type") != "assistant" or record.get("isSidechain", False):
            continue
        model = (record.get("message") or {}).get("model")
        if model:
            return model
    return ""


def format_pending_summary(records):
    """Keep the Stop hook visible when Claude has not flushed usage yet."""
    return (
        "─── Turn Summary ───\n"
        "model: {}\n"
        "tokens: unavailable (transcript not ready)"
        .format(latest_model(records) or "?")
    )


def format_summary(turn_records, session_records, pricing, session_id="", event_records=None,
                   turn_subagents=None):
    main = aggregate(turn_records, pricing, sidechain=False)
    subagents = aggregate(turn_records, pricing, sidechain=True)
    whole_turn = aggregate(turn_records, pricing)
    whole_session = aggregate(session_records, pricing)

    if whole_turn["records"] == 0:
        return None

    models = models_of(turn_records)
    output = [
        "─── Turn Summary ───",
        "model: " + (", ".join(models) or "?"),
        "tokens: {} processed".format(exact(processed_tokens(whole_turn))),
        "  input: {} new · {} cache read · {} cache write".format(
            exact(whole_turn["input"]),
            exact(whole_turn["cache_read"]),
            exact(whole_turn["cache_write"]),
        ),
        "  output: {}".format(exact(whole_turn["output"])),
    ]

    agent_types, skills = tool_metadata(event_records or turn_records)
    turn_subagents = turn_subagents or []
    subagent_processed = 0
    subagent_output = 0
    if turn_subagents:
        # Per-agent files are the real source: subagent usage never appears in
        # the main transcript, so this branch is the one that shows numbers.
        subagent_processed, subagent_output = append_subagent_usage(
            output, agent_types, turn_subagents, whole_turn, pricing
        )
    elif subagents["records"]:
        # Legacy transcripts with sidechain records embedded in the main file.
        output.append(
            "main agent: {} processed · {} output".format(
                exact(processed_tokens(main)),
                exact(main["output"]),
            )
        )
        counts = Counter(agent_types)
        description = ", ".join(
            "%s×%d" % (name, count) if count > 1 else name
            for name, count in counts.items()
        ) or "type unavailable"
        count = len(agent_types) or subagents["records"]
        output.append("subagents: %d (%s)" % (count, description))
        output.append(
            "  usage: {} processed · {} output".format(
                exact(processed_tokens(subagents)),
                exact(subagents["output"]),
            )
        )
    elif agent_types:
        counts = Counter(agent_types)
        description = ", ".join(
            "%s×%d" % (name, count) if count > 1 else name
            for name, count in counts.items()
        )
        output.append("subagents: %d (%s)" % (len(agent_types), description))
        output.append("  usage: unavailable (subagent transcript not flushed yet)")

    append_skill_usage(output, skills, turn_records, whole_turn, pricing,
                       subagent_processed=subagent_processed,
                       subagent_output=subagent_output)

    if whole_session["records"]:
        output.append(
            "session: {} processed · {} output".format(
                exact(processed_tokens(whole_session)), exact(whole_session["output"])
            )
        )

    return "\n".join(output)


def emit(message):
    """Return the documented user-visible Stop-hook JSON payload."""
    try:
        sys.stdout.write(json.dumps({"continue": True, "systemMessage": message}))
    except Exception:
        pass


def is_project_cwd(cwd):
    if isinstance(cwd, dict):
        cwd = cwd.get("current_dir") or cwd.get("path") or ""
    if not cwd:
        return True
    try:
        return os.path.realpath(cwd) == os.path.realpath(PROJECT_ROOT)
    except Exception:
        return True


def main():
    try:
        data = json.loads(sys.stdin.read() or "{}")
    except Exception:
        return

    if not is_project_cwd(data.get("cwd") or data.get("workspace") or ""):
        return

    transcript_path = data.get("transcript_path") or ""
    if not transcript_path or not os.path.exists(transcript_path):
        return
    last_assistant_message = data.get("last_assistant_message") or ""
    records, turn_lines = read_stop_turn(
        transcript_path,
        last_assistant_message,
        attempts=TRANSCRIPT_READY_ATTEMPTS if last_assistant_message else 1,
    )
    if not records:
        return

    turn_usage = dedup_usage(turn_lines)
    session_usage = dedup_usage(records)
    session_id = data.get("session_id") or data.get("sessionId") or ""
    if turn_usage:
        message = format_summary(
            turn_usage,
            session_usage,
            load_pricing(),
            session_id,
            event_records=turn_lines,
            turn_subagents=read_turn_subagents(
                transcript_path, session_id, turn_start_time(turn_lines)
            ),
        )
    elif last_assistant_message:
        message = format_pending_summary(records)
    else:
        message = None
    if message:
        emit(message)


if __name__ == "__main__":
    main()
