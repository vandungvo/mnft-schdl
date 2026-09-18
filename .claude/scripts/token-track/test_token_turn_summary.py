#!/usr/bin/env python3
"""Regression tests for token-turn-summary.py (Python stdlib only)."""
import importlib.util
import json
import os
import subprocess
import sys
import tempfile
import time
import unittest
from pathlib import Path

HERE = Path(__file__).resolve().parent
SCRIPT = HERE / "token-turn-summary.py"
SPEC = importlib.util.spec_from_file_location("token_turn_summary", SCRIPT)
SUMMARY = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(SUMMARY)


def user(text, prompt_source="typed"):
    record = {"type": "user", "message": {"content": text}}
    if prompt_source is not None:
        record["promptSource"] = prompt_source
    return record


def assistant(
    message_id,
    output=10,
    input_tokens=2,
    cache_read=3,
    cache_write=4,
    model="claude-opus-4-8",
    timestamp="2026-07-20T00:00:00Z",
    content=None,
    sidechain=False,
    request_id="req-1",
    skill="",
):
    record = {
        "type": "assistant",
        "requestId": request_id,
        "timestamp": timestamp,
        "isSidechain": sidechain,
        "agentId": "agent-1" if sidechain else "",
        "message": {
            "id": message_id,
            "model": model,
            "usage": {
                "input_tokens": input_tokens,
                "output_tokens": output,
                "cache_read_input_tokens": cache_read,
                "cache_creation_input_tokens": cache_write,
            },
            "content": content or [{"type": "text", "text": "done"}],
        },
    }
    if skill:
        record["attributionSkill"] = skill
    return record


class SummaryHelpersTest(unittest.TestCase):
    def test_latest_typed_prompt_wins(self):
        records = [user("first"), assistant("m1"), user("second"), assistant("m2")]
        self.assertEqual(SUMMARY.latest_turn_start(records), 2)

    def test_latest_prompt_falls_back_without_prompt_source(self):
        records = [user("first"), assistant("m1"), user("fallback", None), assistant("m2")]
        self.assertEqual(SUMMARY.latest_turn_start(records), 2)

    def test_tool_result_is_not_a_prompt_boundary(self):
        records = [
            user("request"),
            assistant("m1"),
            {"type": "user", "message": {"content": [{"type": "tool_result", "content": "ok"}]}},
            assistant("m2"),
        ]
        self.assertEqual(SUMMARY.latest_turn_start(records), 0)

    def test_dedup_keeps_largest_output_snapshot(self):
        records = [
            assistant("same", output=3, timestamp="2026-07-20T00:00:00Z"),
            assistant("same", output=30, timestamp="2026-07-20T00:00:01Z"),
            assistant("same", output=20, timestamp="2026-07-20T00:00:02Z"),
        ]
        deduped = SUMMARY.dedup_usage(records)
        self.assertEqual(len(deduped), 1)
        self.assertEqual(deduped[0]["output"], 30)

    def test_malformed_json_is_ignored(self):
        with tempfile.NamedTemporaryFile("w", delete=False, encoding="utf-8") as f:
            f.write("not-json\n")
            f.write(json.dumps(user("request")) + "\n")
            path = f.name
        try:
            self.assertEqual(len(SUMMARY.read_lines(path)), 1)
        finally:
            os.unlink(path)

    def test_supported_model_has_cost(self):
        pricing = SUMMARY.load_pricing()
        dollars, _ = SUMMARY.cost_of({"input_tokens": 1_000_000}, "claude-opus-4-8", pricing)
        self.assertIsNotNone(dollars)

    def test_unknown_model_does_not_use_default_price(self):
        pricing = SUMMARY.load_pricing()
        dollars, counts = SUMMARY.cost_of({"input_tokens": 100}, "gpt-5.6-sol(high)", pricing)
        self.assertIsNone(dollars)
        self.assertEqual(counts["input"], 100)

    def test_summary_is_english_and_includes_metadata(self):
        usage_records = SUMMARY.dedup_usage([
            assistant("main", request_id="req-main"),
            assistant("sub", sidechain=True, request_id="req-sub"),
        ])
        events = [
            assistant(
                "tool-message",
                request_id="req-tool",
                content=[
                    {"type": "tool_use", "name": "Agent", "input": {"subagent_type": "Explore"}},
                    {"type": "tool_use", "name": "Skill", "input": {"skill": "claude-api"}},
                ],
            )
        ]
        message = SUMMARY.format_summary(
            usage_records,
            usage_records,
            SUMMARY.load_pricing(),
            event_records=events,
        )
        self.assertIn("Turn Summary", message)
        self.assertIn("tokens:", message)
        self.assertIn("input:", message)
        self.assertIn("output:", message)
        self.assertIn("subagents: 1 (Explore)", message)
        self.assertIn("usage:", message)
        self.assertIn("skills: /claude-api", message)
        self.assertIn("inclusive usage:", message)
        self.assertIn("session:", message)
        self.assertNotIn("$", message)
        self.assertNotIn("cost:", message)
        self.assertNotIn("note:", message)
        self.assertNotIn("Tóm tắt", message)

    def test_unknown_model_summary_keeps_tokens_without_dollars(self):
        usage_records = SUMMARY.dedup_usage([
            assistant("gpt", model="gpt-5.6-sol(high)")
        ])
        message = SUMMARY.format_summary(
            usage_records, usage_records, SUMMARY.load_pricing()
        )
        self.assertIn("model: gpt-5.6-sol(high)", message)
        self.assertIn("session:", message)
        self.assertIn("session: 19 processed · 10 output", message)
        self.assertNotIn("$", message)

    def test_mixed_supported_and_unknown_models_report_partial_cost(self):
        usage_records = SUMMARY.dedup_usage([
            assistant("claude", model="claude-opus-4-8", request_id="req-claude"),
            assistant("gpt", model="gpt-5.6-sol(high)", request_id="req-gpt"),
        ])
        message = SUMMARY.format_summary(
            usage_records, usage_records, SUMMARY.load_pricing()
        )
        self.assertIn("model: claude-opus-4-8, gpt-5.6-sol(high)", message)
        self.assertNotIn("$", message)
        self.assertNotIn("cost:", message)

    def test_no_usage_returns_no_summary(self):
        self.assertIsNone(SUMMARY.format_summary([], [], SUMMARY.load_pricing()))

    def test_project_guard(self):
        self.assertTrue(SUMMARY.is_project_cwd(SUMMARY.PROJECT_ROOT))
        self.assertFalse(SUMMARY.is_project_cwd("/tmp/not-this-project"))

    def test_final_assistant_visibility_matches_stop_payload(self):
        records = [user("request"), assistant("m1", content=[
            {"type": "text", "text": "finished"}
        ])]
        self.assertTrue(SUMMARY.final_assistant_visible(records, "finished"))
        self.assertFalse(SUMMARY.final_assistant_visible(records, "not flushed"))

    def test_pending_summary_is_explicit_not_zero_usage(self):
        message = SUMMARY.format_pending_summary([
            assistant("old", model="gpt-5.6-sol(high)")
        ])
        self.assertIn("tokens: unavailable (transcript not ready)", message)
        self.assertIn("model: gpt-5.6-sol(high)", message)
        self.assertNotIn("tokens: 0 input", message)

    def test_snapshot_cost_reads_configured_session_file(self):
        old_data_dir = SUMMARY.DATA_DIR
        with tempfile.TemporaryDirectory() as tmp:
            snapshots = Path(tmp) / "snapshots"
            snapshots.mkdir()
            (snapshots / "sid.json").write_text(
                json.dumps({"cost_usd": 1.25}), encoding="utf-8"
            )
            SUMMARY.DATA_DIR = tmp
            try:
                self.assertEqual(SUMMARY.snapshot_cost("sid"), 1.25)
            finally:
                SUMMARY.DATA_DIR = old_data_dir

    def test_dedup_preserves_skill_attribution(self):
        records = SUMMARY.dedup_usage([
            assistant("skill", skill="srs")
        ])
        self.assertEqual(records[0]["skill"], "srs")

    def test_multiple_skills_show_attributed_cost_without_double_counting(self):
        usage_records = SUMMARY.dedup_usage([
            assistant("srs", request_id="req-srs", skill="srs"),
            assistant("gap", request_id="req-gap", skill="gap"),
            assistant("overhead", request_id="req-overhead"),
        ])
        events = [assistant(
            "tools",
            content=[
                {"type": "tool_use", "name": "Skill", "input": {"skill": "srs"}},
                {"type": "tool_use", "name": "Skill", "input": {"skill": "gap"}},
            ],
        )]
        message = SUMMARY.format_summary(
            usage_records,
            usage_records,
            SUMMARY.load_pricing(),
            event_records=events,
        )
        self.assertIn("skills: /srs, /gap", message)
        self.assertIn("/srs attributed:", message)
        self.assertIn("/gap attributed:", message)
        self.assertIn("unassigned overhead:", message)
        self.assertNotIn("$", message)
        self.assertNotIn("cost:", message)
        self.assertNotIn("note:", message)


class SubagentFilesTest(unittest.TestCase):
    """Subagent usage lives only in <session>/subagents/agent-*.jsonl."""

    def make_session(self, agents):
        tmp = tempfile.mkdtemp()
        self.addCleanup(lambda: __import__("shutil").rmtree(tmp, ignore_errors=True))
        transcript = os.path.join(tmp, "sid.jsonl")
        Path(transcript).write_text("", encoding="utf-8")
        sub_dir = Path(tmp) / "sid" / "subagents"
        sub_dir.mkdir(parents=True)
        for name, records in agents.items():
            (sub_dir / ("agent-%s.jsonl" % name)).write_text(
                "\n".join(json.dumps(r) for r in records) + "\n", encoding="utf-8"
            )
        return transcript

    def test_reads_only_records_inside_turn_window(self):
        transcript = self.make_session({
            "old": [assistant("m-old", output=99, request_id="req-old",
                              timestamp="2026-07-20T00:00:00Z")],
            "new": [assistant("m-new", output=7, request_id="req-new",
                              timestamp="2026-07-20T02:00:00Z")],
        })
        agents = SUMMARY.read_turn_subagents(transcript, "sid", "2026-07-20T01:00:00Z")
        self.assertEqual(len(agents), 1)
        self.assertEqual(agents[0]["agent_id"], "new")
        self.assertEqual(agents[0]["records"][0]["output"], 7)

    def test_agents_sorted_by_start_time(self):
        transcript = self.make_session({
            "b-later": [assistant("m-b", request_id="req-b",
                                  timestamp="2026-07-20T02:30:00Z")],
            "a-earlier": [assistant("m-a", request_id="req-a",
                                    timestamp="2026-07-20T02:00:00Z")],
        })
        agents = SUMMARY.read_turn_subagents(transcript, "sid", "2026-07-20T01:00:00Z")
        self.assertEqual([a["agent_id"] for a in agents], ["a-earlier", "b-later"])

    def test_empty_turn_start_reads_nothing(self):
        transcript = self.make_session({
            "x": [assistant("m-x", request_id="req-x", timestamp="2026-07-20T02:00:00Z")],
        })
        self.assertEqual(SUMMARY.read_turn_subagents(transcript, "sid", ""), [])

    def test_summary_shows_per_subagent_lines_and_combined_total(self):
        usage_records = SUMMARY.dedup_usage([assistant("main", request_id="req-main")])
        events = [assistant(
            "tools",
            request_id="req-tools",
            content=[
                {"type": "tool_use", "name": "Agent", "input": {"subagent_type": "senior-ba"}},
                {"type": "tool_use", "name": "Agent", "input": {"subagent_type": "Explore"}},
            ],
        )]
        turn_subagents = [
            {"agent_id": "a1", "first": "t1", "records": SUMMARY.dedup_usage([
                assistant("s1", output=100, input_tokens=50, cache_read=0, cache_write=0,
                          model="claude-sonnet-5", request_id="req-s1")])},
            {"agent_id": "a2", "first": "t2", "records": SUMMARY.dedup_usage([
                assistant("s2", output=10, input_tokens=5, cache_read=0, cache_write=0,
                          model="claude-sonnet-5", request_id="req-s2")])},
        ]
        message = SUMMARY.format_summary(
            usage_records, usage_records, SUMMARY.load_pricing(),
            event_records=events, turn_subagents=turn_subagents,
        )
        self.assertIn("subagents: 2", message)
        self.assertIn("senior-ba (sonnet): 150 processed · 100 output", message)
        self.assertIn("Explore (sonnet): 15 processed · 10 output", message)
        self.assertIn("total: 165 processed · 110 output", message)
        # whole turn = 2+10+3+4 = 19 processed, 10 output → combined 184 / 120
        self.assertIn("turn incl. subagents: 184 processed · 120 output", message)
        self.assertNotIn("usage: unavailable", message)

    def test_single_skill_inclusive_usage_includes_subagents(self):
        usage_records = SUMMARY.dedup_usage([assistant("main", request_id="req-main")])
        events = [assistant(
            "tools",
            request_id="req-tools",
            content=[
                {"type": "tool_use", "name": "Agent", "input": {"subagent_type": "senior-ba"}},
                {"type": "tool_use", "name": "Skill", "input": {"skill": "cr"}},
            ],
        )]
        turn_subagents = [
            {"agent_id": "a1", "first": "t1", "records": SUMMARY.dedup_usage([
                assistant("s1", output=100, input_tokens=50, cache_read=0, cache_write=0,
                          model="claude-sonnet-5", request_id="req-s1")])},
        ]
        message = SUMMARY.format_summary(
            usage_records, usage_records, SUMMARY.load_pricing(),
            event_records=events, turn_subagents=turn_subagents,
        )
        # main turn = 19 processed / 10 output; subagent = 150 / 100
        self.assertIn("skills: /cr", message)
        self.assertIn("inclusive usage: 169 processed · 110 output", message)

    def test_more_agents_than_tool_calls_marks_type_unknown(self):
        usage_records = SUMMARY.dedup_usage([assistant("main", request_id="req-main")])
        turn_subagents = [
            {"agent_id": "a1", "first": "t1", "records": SUMMARY.dedup_usage([
                assistant("s1", output=1, request_id="req-s1")])},
        ]
        message = SUMMARY.format_summary(
            usage_records, usage_records, SUMMARY.load_pricing(),
            turn_subagents=turn_subagents,
        )
        self.assertIn("(type unknown)", message)

    def test_agent_call_without_flushed_file_reports_unavailable(self):
        usage_records = SUMMARY.dedup_usage([assistant("main", request_id="req-main")])
        events = [assistant(
            "tools",
            request_id="req-tools",
            content=[{"type": "tool_use", "name": "Agent",
                      "input": {"subagent_type": "senior-ba"}}],
        )]
        message = SUMMARY.format_summary(
            usage_records, usage_records, SUMMARY.load_pricing(),
            event_records=events, turn_subagents=[],
        )
        self.assertIn("subagents: 1 (senior-ba)", message)
        self.assertIn("usage: unavailable (subagent transcript not flushed yet)", message)


class SummaryEntryPointTest(unittest.TestCase):
    def run_hook(self, payload):
        return subprocess.run(
            [sys.executable, str(SCRIPT)],
            input=json.dumps(payload),
            text=True,
            capture_output=True,
            check=False,
        )

    def make_transcript(self, records):
        f = tempfile.NamedTemporaryFile("w", delete=False, encoding="utf-8")
        with f:
            for record in records:
                f.write(json.dumps(record) + "\n")
        self.addCleanup(lambda: os.path.exists(f.name) and os.unlink(f.name))
        return f.name

    def test_stdout_is_valid_hook_json_only(self):
        path = self.make_transcript([user("request"), assistant("m1")])
        result = self.run_hook({
            "session_id": "test-session-without-snapshot",
            "cwd": SUMMARY.PROJECT_ROOT,
            "transcript_path": path,
        })
        self.assertEqual(result.returncode, 0)
        self.assertEqual(result.stderr, "")
        parsed = json.loads(result.stdout)
        self.assertEqual(sorted(parsed), ["continue", "systemMessage"])
        self.assertTrue(parsed["continue"])
        self.assertIn("Turn Summary", parsed["systemMessage"])

    def test_latest_turn_not_whole_session(self):
        path = self.make_transcript([
            user("expensive first"),
            assistant("first", output=1000, request_id="req-first"),
            user("small latest"),
            assistant("latest", output=7, request_id="req-latest"),
        ])
        result = self.run_hook({
            "session_id": "test-session-without-snapshot",
            "cwd": SUMMARY.PROJECT_ROOT,
            "transcript_path": path,
        })
        message = json.loads(result.stdout)["systemMessage"]
        self.assertIn("output: 7", message)
        self.assertIn("session:", message)
        self.assertNotIn("1k output", message)

    def test_missing_transcript_is_silent(self):
        result = self.run_hook({
            "session_id": "missing",
            "cwd": SUMMARY.PROJECT_ROOT,
            "transcript_path": "/tmp/definitely-missing-token-summary.jsonl",
        })
        self.assertEqual(result.returncode, 0)
        self.assertEqual(result.stdout, "")
        self.assertEqual(result.stderr, "")

    def test_malformed_hook_input_is_silent(self):
        result = subprocess.run(
            [sys.executable, str(SCRIPT)],
            input="not-json",
            text=True,
            capture_output=True,
            check=False,
        )
        self.assertEqual(result.returncode, 0)
        self.assertEqual(result.stdout, "")
        self.assertEqual(result.stderr, "")

    def test_wrong_project_is_silent(self):
        path = self.make_transcript([user("request"), assistant("m1")])
        result = self.run_hook({
            "session_id": "wrong-project",
            "cwd": "/tmp/not-this-project",
            "transcript_path": path,
        })
        self.assertEqual(result.returncode, 0)
        self.assertEqual(result.stdout, "")

    def test_waits_for_delayed_final_assistant_record(self):
        path = self.make_transcript([user("short request")])
        payload = {
            "session_id": "delayed-transcript",
            "cwd": SUMMARY.PROJECT_ROOT,
            "transcript_path": path,
            "last_assistant_message": "short answer",
        }
        process = subprocess.Popen(
            [sys.executable, str(SCRIPT)],
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
        )
        process.stdin.write(json.dumps(payload))
        process.stdin.close()
        time.sleep(0.08)
        with open(path, "a", encoding="utf-8") as f:
            f.write(json.dumps(assistant(
                "delayed",
                output=7,
                content=[{"type": "text", "text": "short answer"}],
            )) + "\n")
        stdout = process.stdout.read()
        stderr = process.stderr.read()
        returncode = process.wait(timeout=2)
        process.stdout.close()
        process.stderr.close()
        self.assertEqual(returncode, 0)
        self.assertEqual(stderr, "")
        message = json.loads(stdout)["systemMessage"]
        self.assertIn("output: 7", message)
        self.assertNotIn("transcript not ready", message)

    def test_emits_pending_summary_when_final_record_never_arrives(self):
        path = self.make_transcript([
            user("previous"),
            assistant("old", model="gpt-5.6-sol(high)"),
            user("latest"),
        ])
        result = self.run_hook({
            "session_id": "pending-transcript",
            "cwd": SUMMARY.PROJECT_ROOT,
            "transcript_path": path,
            "last_assistant_message": "not flushed yet",
        })
        self.assertEqual(result.returncode, 0)
        message = json.loads(result.stdout)["systemMessage"]
        self.assertIn("tokens: unavailable (transcript not ready)", message)


if __name__ == "__main__":
    unittest.main()
