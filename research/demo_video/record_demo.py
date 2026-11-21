"""Record the narrated feature demo of PlanWise (English UI) with Playwright.

Pipeline (see README.md in this folder):
  1. python record_demo.py --work W --narration-only     -> W/narration.json (text spoken per scene)
  2. tts.ps1 -Script W/narration.json -OutDir W/audio     -> W/audio/<scene>.wav
  3. python record_demo.py --work W                       -> W/frames/*.jpg + W/timeline.json
  4. python build_video.py --work W --out demo.mp4        -> video with voice-over and subtitles

The demo instance (start_demo.ps1 + seed_demo.py) must be running and freshly seeded: the story
imports orders, generates and commits a schedule, so it only plays once per seeded database.
--dry skips the narration pauses and saves a screenshot at the end of every scene (for checking).

Frames come from the DevTools screencast (only emitted when the page changes, each with a
timestamp); waiting for the solver is wrapped in cut() and removed from the final video.
"""

from __future__ import annotations

import argparse
import asyncio
import base64
import json
import math
import re
import time
import urllib.request
import wave
from contextlib import asynccontextmanager
from pathlib import Path

from playwright.async_api import Locator, Page, async_playwright

BASE = "http://localhost:3100"
# 127.0.0.1, not localhost: on Windows "localhost" may try ::1 first and stall on every request.
API = "http://127.0.0.1:8100/api/v1"
VIEW_W, VIEW_H = 1920, 960

# ---------------------------------------------------------------- narration (subtitle text)

NARRATION: list[tuple[str, str, str]] = [
    ("intro", "Overview", "This is PlanWise, a scheduling agent for an alloy wheel plant. It turns customer orders into a feasible, explainable two-week production schedule."),
    ("today", "Overview", "The Today page is where the planner starts. The next period, weeks 48 to 49, is ready to schedule: 40 orders fall inside it, and 78 more are in the look-ahead window."),
    ("load", "Overview", "Below, the load of the next six weeks is shown per stage. Heat treatment is the bottleneck, at around 65 percent, so that is where the schedule will be tight."),
    ("factory", "Factory set-up", "First, the plant. The factory set-up describes the five-stage process: gravity casting, T6 heat treatment, CNC machining, painting, and test and packing. Each stage works in fixed-size runs, and the arrows show the transfer time to the next stage."),
    ("products", "Factory set-up", "Four products are made on two lines: 17-inch front and rear wheels, in silver and matte black. Each has its own safety stock and warehouse limit."),
    ("machines", "Factory set-up", "Nine machines are modelled, with processing times per item and sequence-dependent setup times, such as the colour change on the paint line."),
    ("molds", "Factory set-up", "Casting molds have a cycle limit, so the scheduler inserts mold maintenance automatically."),
    ("calendar", "Factory set-up", "The plant runs three shifts, Monday to Saturday. Public holidays, such as New Year and Lunar New Year, and weekly preventive maintenance are declared once, here."),
    ("policies", "Factory set-up", "Policies define what a good schedule means. The default puts on-time delivery and safety stock first, and running cost second."),
    ("versions", "Factory set-up", "Every change creates a new version with an effective date. Version 2 adds a third CNC lathe from the 7th of December, so earlier periods keep version 1."),
    ("orders", "Order book", "Orders are entered once, in the order book. The expected load for the next eight weeks updates as orders come in."),
    ("search", "Order book", "The list can be searched and filtered. For example, these are the export container orders for the customer in Indonesia."),
    ("import", "Order book", "New orders usually arrive as a spreadsheet. The import accepts English or Vietnamese column names, and previews every row before anything is written: four new orders, and one order whose quantity has changed."),
    ("import-done", "Order book", "After confirming, the order book is updated."),
    ("periods", "Prepare the period", "Now we plan the next period. Weeks 46 to 47 is closed, and its delivered orders have left the order book. Weeks 48 to 49 was rolled over from it."),
    ("prepare", "Prepare the period", "The Prepare step gathers everything that changes from one period to the next. The inputs are valid, and the opening stock is projected from last period's committed schedule."),
    ("sync", "Prepare the period", "Because we just imported orders, PlanWise notices that the order book has changed, and pulls the new and changed orders into the period with one click."),
    ("opening", "Prepare the period", "Opening stock and work in progress are projected per item. The planner only corrects what the physical count shows differently."),
    ("calendar-ex", "Prepare the period", "The machine calendar shows rest days and recurring maintenance. A one-off exception is added by clicking a cell. Here, heat treatment furnace 2 needs a burner inspection on Wednesday morning."),
    ("save", "Prepare the period", "Saving re-checks the inputs and recomputes lots and runs. The period is ready to schedule."),
    ("generate", "Generate options", "Generating options takes one click. The planner chooses how long to wait, not which solver. Quick takes about a minute: it runs the earliest due date rule, and the hybrid method, a metaheuristic search followed by CP-SAT."),
    ("queued", "Generate options", "The runs are queued and solved in the background, so the planner can keep working."),
    ("options", "Generate options", "The options are ranked under the period's policy. PlanWise only recommends schedules that no other schedule beats on every axis: lateness, safety stock shortfall, and operating cost."),
    ("ranking", "Generate options", "Switching the ranking to balanced or cost first re-scores the same schedules instantly."),
    ("schedule", "Compare schedules", "Schedule and compare shows the recommended schedule in detail: orders on time, lateness, shortfall, operating cost, machine shifts, idle and setup time."),
    ("gantt", "Compare schedules", "The Gantt chart shows every run on every machine. Sundays are closed, and the heat treatment furnaces run around the clock. The planner can zoom from the whole period down to single shifts."),
    ("compare", "Compare schedules", "Comparing with the earliest due date rule shows how much better the optimised schedule is, and where the two differ."),
    ("by-order", "Compare schedules", "The order view follows each order through the five stages. Late orders can be listed first, and selecting one explains its timing: which runs it waited for, and on which machines."),
    ("load-view", "Compare schedules", "The machine load view shows, shift by shift, where capacity is used and where there is slack."),
    ("edit", "Edit by hand", "Planners stay in control. The schedule can be edited by hand: select a run, then change its machine, its order, or its earliest start."),
    ("edit-move", "Edit by hand", "Here, a machining run moves from CNC lathe 1 to lathe 2. Every change is rebuilt and re-checked by an independent validator, and the effect on the KPIs is shown at once."),
    ("edit-opt", "Edit by hand", "Optimise the rest keeps the runs the planner locked or edited, and lets CP-SAT re-sequence everything else."),
    ("edit-save", "Edit by hand", "The edit is saved as a new option, ranked alongside the solver's options."),
    ("commit", "Commit & execute", "When the planner is satisfied, one option is committed. A reason is required, so every decision can be explained later."),
    ("execute", "Commit & execute", "The committed schedule becomes work orders per day and machine, ready to print for the shift supervisors or export to Excel."),
    ("incident", "Commit & execute", "If something goes wrong, the planner replans the rest. Suppose CNC lathe 1 breaks down on Wednesday at ten. What ran before the cut-off stays fixed, and stock, molds and busy machines are taken as of that moment."),
    ("reschedule", "Commit & execute", "The result is a reschedule version of the period, with the breakdown already in its calendar, ready for new options."),
    ("variant", "What-if & analysis", "What-if variants copy the period's inputs, to test a change such as a rush order or another policy, without touching the main plan."),
    ("analysis", "What-if & analysis", "The Analysis tab shows how the scheduling went: time from first generation to commit, hand edits, and whether the optimiser beat the simple rules. Every schedule is ranked, with its score broken down by component."),
    ("history", "What-if & analysis", "History records every change to the period's data, so each decision can be audited."),
    ("runs", "Advanced", "Under Advanced, the Runs page lists every solver run, with its status, algorithm and timing. Each run has its own validated Gantt chart and KPIs."),
    ("scenarios", "Advanced", "JSON scenarios hold the research datasets used in the benchmark, where FIFO, EDD, SPT, simulated annealing, a genetic algorithm and CP-SAT are compared on the same input."),
    ("aggregate", "Advanced", "Aggregate planning balances demand against stage capacity before detailed scheduling: the first tier of the two-tier pipeline."),
    ("search-k", "Everyday tools", "Quick search, with Control K, jumps to any page, planning period or action."),
    ("lang", "Everyday tools", "The interface is bilingual, in Vietnamese and English, and has a dark theme."),
    ("outro", "Everyday tools", "PlanWise: from the order book to a committed, explainable schedule in minutes. Thank you for watching."),
]

# How the voice should say what the subtitles write.
SAY = [
    (r"\bPlanWise\b", "Plan Wise"),
    (r"\bCP-SAT\b", "C P SAT"),
    (r"\bT6\b", "T 6"),
    (r"\bCNC\b", "C N C"),
    (r"\bKPIs\b", "K P Is"),
    (r"\bEDD\b", "E D D"),
    (r"\bSPT\b", "S P T"),
    (r"\bFIFO\b", "fee foe"),
    (r"\bJSON\b", "Jason"),
    (r"17-inch", "seventeen inch"),
    (r"\bGantt\b", "Gant"),
]


def speakable(text: str) -> str:
    for pattern, replacement in SAY:
        text = re.sub(pattern, replacement, text)
    return text


# ---------------------------------------------------------------- cursor overlay (injected in every page)

CURSOR_JS = r"""
(() => {
  const KEY = '__demo_pos';
  const install = () => {
    if (!document.body || document.getElementById('__demo_cursor')) return;
    const c = document.createElement('div');
    c.id = '__demo_cursor';
    c.innerHTML = '<svg width="30" height="30" viewBox="0 0 24 24"><path d="M4 2.5l7 18.5 2.7-7.6 7.6-2.7z" fill="#0f172a" stroke="#ffffff" stroke-width="1.6" stroke-linejoin="round"/></svg>';
    Object.assign(c.style, {position: 'fixed', left: '0', top: '0', zIndex: '2147483647', pointerEvents: 'none',
      transform: 'translate(-100px,-100px)', filter: 'drop-shadow(0 1px 2px rgba(0,0,0,.35))'});
    document.body.appendChild(c);
    const move = (x, y) => { c.style.transform = `translate(${x - 4}px, ${y - 3}px)`; };
    try { const p = JSON.parse(sessionStorage.getItem(KEY) || 'null'); if (p) move(p[0], p[1]); } catch (e) {}
    addEventListener('mousemove', (e) => { move(e.clientX, e.clientY); try { sessionStorage.setItem(KEY, JSON.stringify([e.clientX, e.clientY])); } catch (err) {} }, true);
    addEventListener('mousedown', (e) => {
      const r = document.createElement('div');
      Object.assign(r.style, {position: 'fixed', left: (e.clientX - 20) + 'px', top: (e.clientY - 20) + 'px', width: '40px', height: '40px',
        borderRadius: '50%', background: 'rgba(37,99,235,.35)', border: '2px solid rgba(37,99,235,.7)', zIndex: '2147483646',
        pointerEvents: 'none', transition: 'transform .5s ease-out, opacity .5s ease-out'});
      document.body.appendChild(r);
      requestAnimationFrame(() => { r.style.transform = 'scale(1.7)'; r.style.opacity = '0'; });
      setTimeout(() => r.remove(), 600);
    }, true);
  };
  // After hydration, so React never sees the extra nodes.
  const later = () => setTimeout(install, 400);
  if (document.readyState === 'complete') later(); else addEventListener('load', later);
  setInterval(install, 1000);
})();
"""


# ---------------------------------------------------------------- tiny API client


def api(path: str, method: str = "GET", body: object | None = None):
    data = None if body is None else json.dumps(body).encode()
    req = urllib.request.Request(API + path, data=data, method=method, headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=60) as resp:
        raw = resp.read()
        return json.loads(raw) if raw else None


# ---------------------------------------------------------------- the demo driver


class Demo:
    def __init__(self, page: Page, work: Path, durations: dict[str, float], dry: bool) -> None:
        self.page = page
        self.work = work
        self.durations = durations
        self.dry = dry
        self.x, self.y = VIEW_W * 0.6, VIEW_H * 0.45
        self.timeline: dict = {"scenes": [], "cuts": [], "frames": []}
        self.chapters = {sid: chapter for sid, chapter, _ in NARRATION}
        self.texts = {sid: text for sid, _, text in NARRATION}

    # ----- timing

    @asynccontextmanager
    async def scene(self, sid: str):
        assert sid in self.texts, sid
        t0 = time.time()
        entry = {"id": sid, "chapter": self.chapters[sid], "text": self.texts[sid], "start": t0}
        self.timeline["scenes"].append(entry)
        print(f"[scene] {sid}", flush=True)
        yield
        if self.dry:
            await self.page.screenshot(path=str(self.work / "dry" / f"{len(self.timeline['scenes']):02d}_{sid}.png"))
        else:
            remaining = self.durations.get(sid, 0) + 0.6 - (time.time() - t0)
            if remaining > 0:
                await asyncio.sleep(remaining)
        entry["end"] = time.time()

    @asynccontextmanager
    async def cut(self, caption: str):
        t0 = time.time()
        yield
        self.timeline["cuts"].append({"start": t0, "end": time.time(), "caption": caption})

    async def pause(self, seconds: float) -> None:
        await asyncio.sleep(seconds * (0.25 if self.dry else 1))

    # ----- pointer

    async def move(self, x: float, y: float, ms: float = 650) -> None:
        x0, y0 = self.x, self.y
        dist = math.hypot(x - x0, y - y0)
        steps = max(8, int(min(ms, 250 + dist * 0.6) / 16))
        for i in range(1, steps + 1):
            k = i / steps
            e = k * k * (3 - 2 * k)  # smoothstep
            await self.page.mouse.move(x0 + (x - x0) * e, y0 + (y - y0) * e)
            await asyncio.sleep(0.016)
        self.x, self.y = x, y

    async def reveal(self, loc: Locator) -> dict:
        """Bring an element into view with a smooth wheel scroll, return its box."""
        await loc.wait_for(state="visible", timeout=20000)
        box = await loc.bounding_box()
        if box is None:
            raise RuntimeError(f"no box for {loc}")
        top, bottom = 90, VIEW_H - 110
        if box["y"] < top or box["y"] + box["height"] > bottom:
            delta = box["y"] + box["height"] / 2 - VIEW_H * 0.45
            await self.wheel(delta)
            box = await loc.bounding_box() or box
            if box["y"] < 0 or box["y"] + box["height"] > VIEW_H:
                await loc.scroll_into_view_if_needed()
                box = await loc.bounding_box() or box
        return box

    async def wheel(self, delta: float, ms: float = 700) -> None:
        if self.x < 240:  # keep the wheel over the content, not the sidebar
            await self.move(VIEW_W * 0.55, self.y, 300)
        steps = max(6, int(ms / 30))
        for _ in range(steps):
            await self.page.mouse.wheel(0, delta / steps)
            await asyncio.sleep(0.03)
        await asyncio.sleep(0.25)

    async def point(self, loc: Locator, ms: float = 650, dx: float = 0.5, dy: float = 0.5) -> None:
        box = await self.reveal(loc)
        await self.move(box["x"] + box["width"] * dx, box["y"] + box["height"] * dy, ms)

    async def click(self, loc: Locator, after: float = 0.6, **point) -> None:
        await self.point(loc, **point)
        await asyncio.sleep(0.18)
        await self.page.mouse.down()
        await asyncio.sleep(0.07)
        await self.page.mouse.up()
        await self.pause(after)

    async def hover(self, loc: Locator, dwell: float = 1.0, **point) -> None:
        """Point at something while the narration talks about it; a miss is logged, not fatal."""
        try:
            await loc.wait_for(state="visible", timeout=6000)
            await self.point(loc, **point)
        except Exception as exc:  # noqa: BLE001
            print(f"  [hover skipped] {loc}: {str(exc).splitlines()[0]}", flush=True)
            self.timeline.setdefault("warnings", []).append(f"hover skipped: {loc}")
        await self.pause(dwell)

    async def type(self, loc: Locator, text: str, delay: float = 40) -> None:
        await self.click(loc, after=0.2)
        await loc.press_sequentially(text, delay=delay if not self.dry else 5)
        await self.pause(0.4)

    async def choose(self, trigger: Locator, option_name: str | re.Pattern) -> None:
        """Radix Select / dropdown: open it, then pick the option."""
        await self.click(trigger, after=0.5)
        await self.click(self.page.get_by_role("option", name=option_name).first, after=0.6)

    async def goto(self, path: str) -> None:
        await self.page.goto(BASE + path, wait_until="networkidle")
        await self.page.mouse.move(self.x, self.y)
        await self.pause(0.8)

    async def settle(self, ms: int = 1200) -> None:
        try:
            await self.page.wait_for_load_state("networkidle", timeout=15000)
        except Exception:  # noqa: BLE001 - polling pages never go idle
            pass
        await asyncio.sleep(ms / 1000 * (0.3 if self.dry else 1))

    # shortcuts
    def role(self, role: str, name: str | re.Pattern, exact: bool = False) -> Locator:
        return self.page.get_by_role(role, name=name, exact=exact).first  # type: ignore[arg-type]

    def text(self, text: str | re.Pattern) -> Locator:
        return self.page.get_by_text(text).first


# ---------------------------------------------------------------- the story


async def story(d: Demo, ids: dict, csv_path: Path) -> None:
    page = d.page
    p2 = ids["period2"]

    # ---- Overview
    await d.goto("/")
    async with d.scene("intro"):
        await d.hover(d.role("heading", "Today"), 1.5)
        await d.hover(d.text("Riverside Alloy Wheels - Plant 1").last, 2)
    async with d.scene("today"):
        await d.hover(d.text("Next period"), 1.2)
        await d.hover(d.text("Orders in period"), 2.5)
        await d.hover(d.role("link", "Generate options"), 1)
    async with d.scene("load"):
        await d.hover(d.text("Load, next 6 weeks"), 1)
        heat = page.locator("tr").filter(has_text="Heat treatment").first
        await d.hover(heat, 1.2, dx=0.08)
        await d.hover(heat, 1.5, dx=0.55)

    # ---- Factory set-up
    async with d.scene("factory"):
        await d.click(d.role("link", "Factory", exact=True))
        await d.settle()
        await d.hover(d.text("Production process"), 1)
        for name in ("1 · cast", "2 · heat", "3 · machining", "4 · paint", "5 · qc"):
            await d.hover(page.get_by_role("button", name=re.compile(re.escape(name))).first, 1.0)
    async with d.scene("products"):
        await d.click(d.role("button", re.compile(r"^Products")))
        await d.settle(800)
        await d.wheel(250)
    async with d.scene("machines"):
        await d.click(d.role("button", re.compile(r"^Machines")))
        await d.settle(800)
        await d.wheel(300)
        await d.pause(1.5)
    async with d.scene("molds"):
        await d.click(d.role("button", re.compile(r"^Molds")))
        await d.settle(800)
    async with d.scene("calendar"):
        await d.click(d.role("button", re.compile(r"^Shifts & calendar")))
        await d.settle(800)
        await d.wheel(350)
    async with d.scene("policies"):
        await d.click(d.role("button", re.compile(r"^Policies")))
        await d.settle(800)
    async with d.scene("versions"):
        await d.click(d.role("button", re.compile(r"^Versions")))
        await d.settle(800)
        await d.hover(d.text(re.compile("CNC lathe 3 commissioned")), 2)

    # ---- Order book
    async with d.scene("orders"):
        await d.click(d.role("link", "Order book", exact=True))
        await d.settle()
        await d.hover(d.text("Expected load, next 8 weeks"), 2)
    async with d.scene("search"):
        await d.type(page.get_by_placeholder(re.compile("Order, product, customer")), "Nusantara", delay=70)
        await d.settle(800)
        await d.hover(d.text("PT Nusantara Moto (export)"), 1.5)
        await page.get_by_placeholder(re.compile("Order, product, customer")).fill("")
        await d.pause(0.5)
    async with d.scene("import"):
        await d.click(d.role("button", "Import from Excel"))
        async with page.expect_file_chooser() as chooser:
            await d.click(d.role("button", re.compile("Choose an .xlsx or .csv file")), after=0.2)
        await (await chooser.value).set_files(str(csv_path))
        await d.settle(1500)
        await d.hover(d.text(re.compile(r"^\+4 new")), 1.5)
        await d.hover(d.role("cell", re.compile(r"^SO-261128-904")), 1.5)
        await d.hover(d.text(re.compile("changes: ")), 1.5)
    async with d.scene("import-done"):
        await d.click(d.role("button", re.compile(r"^Write \d+ changes")))
        await d.settle(1500)

    # ---- Prepare the period
    async with d.scene("periods"):
        await d.click(d.role("link", "Planning periods", exact=True))
        await d.settle()
        await d.hover(d.role("link", "Weeks 46-47"), 1.5)
        await d.click(d.role("link", "Weeks 48-49"))
        await d.settle()
    async with d.scene("prepare"):
        await d.click(d.role("tab", re.compile("Prepare")))
        await d.settle()
        await d.hover(d.text("Input check"), 1)
        await d.hover(d.text(re.compile("Opening stock projected from the committed schedule")), 2)
    async with d.scene("sync"):
        await d.hover(d.text(re.compile("The order book changed since this period")), 1.5)
        await d.click(d.role("button", "Update the period"))
        await d.settle(1500)
        await d.hover(d.text(re.compile(r"^Orders due in the period")), 1.5)
    async with d.scene("opening"):
        await d.click(d.role("button", re.compile(r"^Opening stock")))
        await d.settle(800)
        await d.wheel(300)
    async with d.scene("calendar-ex"):
        await d.click(d.role("button", re.compile(r"^Machine calendar")))
        await d.settle(800)
        cell = page.get_by_role("button", name=re.compile(r"^HT_2 25\/11")).first
        await d.hover(cell, 1.0)
        await d.click(cell)
        dialog = page.get_by_role("dialog")
        await d.hover(dialog.get_by_text("From"), 0.6)
        await dialog.locator('input[type="datetime-local"]').nth(1).fill("2026-11-25T12:00")
        await d.type(dialog.locator("textarea"), "Burner inspection, furnace 2", delay=45)
        await d.click(dialog.get_by_role("button", name="Apply"))
        await d.hover(d.text(re.compile(r"^Period exceptions")), 1.2)
    async with d.scene("save"):
        await d.click(d.role("button", "Save & check"))
        await d.settle(2500)
        await d.hover(d.text(re.compile("Inputs are valid|Input check")), 1.5)

    # ---- Generate options
    async with d.scene("generate"):
        await d.click(d.role("button", "Generate options"))
        await d.pause(1)
        await d.hover(d.role("radio", re.compile(r"^Quick")), 2.5)
        await d.click(d.role("radio", re.compile(r"^Quick")))
        await d.click(d.role("button", re.compile(r"^Generate \d+ options")))
    async with d.scene("queued"):
        await d.settle(1500)
        await d.hover(d.text(re.compile("Solving|Queued|queued|solver")).first, 2)
    async with d.cut("About a minute later: the solver has finished"):
        dataset = api(f"/periods/{p2}")["dataset_id"]
        t0 = time.time()
        while time.time() - t0 < 900:
            runs = [r for r in api("/schedule-runs?limit=20")["items"] if r["dataset_id"] == dataset]
            if runs and all(r["status"].lower() in ("succeeded", "failed", "cancelled") for r in runs):
                break
            await asyncio.sleep(3)
        await page.reload(wait_until="networkidle")
        await page.mouse.move(d.x, d.y)
        await asyncio.sleep(2)
    async with d.scene("options"):
        await d.click(d.role("tab", re.compile("Options")))
        await d.settle()
        await d.hover(page.locator("button").filter(has_text=re.compile(r"^#1")).first, 2.5)
        await d.hover(d.text(re.compile(r"^Recommending")), 2)
    async with d.scene("ranking"):
        await d.click(d.role("radio", "Balanced", exact=True), after=1.2)
        await d.click(d.role("radio", "Cost first", exact=True), after=1.2)
        await d.click(d.role("radio", "Service first", exact=True), after=0.8)

    # ---- Compare schedules
    async with d.scene("schedule"):
        await d.click(d.role("tab", re.compile("Schedule & compare")))
        await d.settle(1500)
        for label in ("On time", "Operating cost", "Machine shifts open", "Idle time", "Setup"):
            await d.hover(page.get_by_text(label, exact=True).first, 0.7)
    async with d.scene("gantt"):
        await d.hover(page.locator("g[data-op]").nth(40), 1.2)
        await d.click(d.role("radio", "Days", exact=True), after=1.5)
        await d.click(d.role("radio", "Shifts", exact=True), after=1.5)
        await d.click(d.role("radio", "Fit", exact=True), after=0.8)
        await d.click(d.role("radio", "Lateness", exact=True), after=1.2)
        await d.click(d.role("radio", "Product", exact=True), after=0.5)
    async with d.scene("compare"):
        await d.choose(page.get_by_role("combobox").nth(1), re.compile("EDD|Earliest"))
        await d.settle(1200)
        await d.wheel(500)
        await d.pause(1.5)
        await d.wheel(-500)
    async with d.scene("by-order"):
        await d.choose(page.get_by_role("combobox").nth(1), re.compile("no comparison"))
        await d.click(d.role("radio", re.compile(r"^By order")), after=1)
        await d.settle(800)
        late_first = page.get_by_text(re.compile(r"^Late orders first \([1-9]")).first
        if await late_first.count():
            await d.click(late_first, after=1)
            row = page.locator('[aria-label^="Order "][aria-label$=" late"]').first
        else:  # no late order in this take: explain an on-time one
            row = page.locator('[aria-label^="Order "]').first
        await d.click(row, after=1.5)
        await d.wheel(450)
        await d.pause(2)
        await d.wheel(-600)
    async with d.scene("load-view"):
        await d.click(d.role("radio", "Machine load", exact=True), after=1)
        await d.settle(800)
        await d.pause(1.5)
        await d.click(d.role("radio", "By machine", exact=True), after=0.5)

    # ---- Edit by hand
    async with d.scene("edit"):
        await d.click(d.role("button", "Edit this schedule by hand"))
        await d.settle(1500)
        bar = await pick_cnc1_bar(d, p2)
        await d.click(bar, after=1)
    async with d.scene("edit-move"):
        panel_select = page.get_by_role("combobox").filter(has_text="CNC_1").first
        await d.choose(panel_select, "CNC_2")
        await d.settle(2000)
        await d.hover(d.text(re.compile(r"Valid schedule|Valid")), 1.5)
        await d.hover(d.text(re.compile(r"^On time")), 1.5)
    async with d.scene("edit-opt"):
        await d.click(d.role("button", re.compile(r"^Optimise the rest")), after=1)
        await d.hover(page.get_by_role("dialog").get_by_text("CP-SAT may change"), 2)
        await d.click(page.get_by_role("dialog").get_by_role("button", name="Cancel"), after=0.5)
    async with d.scene("edit-save"):
        await d.click(d.role("button", "Save as new option"))
        await d.type(page.get_by_role("dialog").locator("input").first, "Machining run moved to CNC lathe 2", delay=35)
        await d.click(page.get_by_role("dialog").get_by_role("button", name="Save option"))
        await d.settle(2500)

    # ---- Commit & execute
    async with d.scene("commit"):
        await d.click(d.role("tab", re.compile("Commit")))
        await d.settle(1200)
        await d.hover(d.text("You are committing"), 1.5)
        await d.type(page.locator("#decision-reason"),
                     "Best-ranked option after the hand edit. Furnace 2 inspection and Saturday deliveries checked with the shift leaders.", delay=20)
        await d.click(d.role("button", "Commit this option"))
        await d.settle(1500)
    async with d.scene("execute"):
        await d.click(d.role("tab", re.compile("Execute")))
        await d.settle(1500)
        await d.hover(d.text("Work orders"), 1)
        await d.hover(d.role("button", "CSV"), 0.8)
        await d.hover(d.role("button", "Print"), 0.8)
        await d.wheel(250)
    async with d.scene("incident"):
        await d.hover(d.text("An incident? Replan the rest"), 1)
        cutoff = page.locator('input[type="datetime-local"]').first
        await d.click(cutoff, after=0.2)
        await cutoff.fill("2026-11-25T10:00")
        await d.choose(page.get_by_role("combobox").filter(has_text=re.compile("None — just replan")).first,
                       re.compile(r"^CNC lathe 1"))
        back = page.locator('input[type="datetime-local"]').nth(1)
        await d.click(back, after=0.2)
        await back.fill("2026-11-26T06:00")
        await d.type(page.get_by_text("What happened").locator("..").locator("textarea"), "Spindle bearing failure", delay=45)
        await d.hover(d.text(re.compile(r"^By 25\/11")), 1.5)
    async with d.scene("reschedule"):
        await d.click(d.role("button", "Replan from the cut-off"))
        await d.settle(2500)
        await d.click(d.role("button", re.compile(r"^Machine calendar")), after=1)
        await d.hover(d.text(re.compile(r"^Period exceptions")), 1.5)

    # ---- What-if & analysis
    await d.goto(f"/periods/{p2}")
    async with d.scene("variant"):
        await d.click(d.role("button", "More actions"))
        await d.click(d.role("menuitem", re.compile("Create a what-if variant")))
        await d.type(page.get_by_role("dialog").locator("input").first, "Rush order from the export customer", delay=35)
        await d.click(page.get_by_role("dialog").get_by_role("button", name="Create variant"))
        await d.settle(2000)
        await d.hover(d.text(re.compile(r"^CNC_1 incident")), 1.2)
        await d.hover(d.text(re.compile(r"^Rush order from the export customer$")).last, 1.2)
    await d.goto(f"/periods/{p2}")
    async with d.scene("analysis"):
        await d.click(d.role("tab", "Analysis", exact=True))
        await d.settle(1500)
        await d.hover(d.text("First generation to commit"), 1.2)
        await d.hover(d.text("Optimiser beat the rules?"), 1.2)
        await d.wheel(600)
        await d.pause(1.5)
        await d.wheel(500)
    async with d.scene("history"):
        await d.wheel(-1500)
        await d.click(d.role("tab", "History", exact=True))
        await d.settle(1500)
        await d.wheel(250)

    await tail(d)


async def tail(d: Demo) -> None:
    """Advanced pages and everyday tools: no data changes, so they can be re-run alone (--tail-only)."""
    page = d.page
    # ---- Advanced
    async with d.scene("runs"):
        advanced = d.role("button", re.compile("^Advanced$", re.I))
        if await page.get_by_role("link", name="Runs", exact=True).count() == 0:
            await d.click(advanced, after=0.5)
        await d.click(d.role("link", "Runs", exact=True))
        await d.settle(1500)
        await d.hover(page.locator("tbody tr").first, 1)
        await d.click(page.locator("tbody tr").filter(has_text=re.compile("Hybrid")).first)
        await d.settle(2000)
        await d.wheel(400)
    async with d.scene("scenarios"):
        await d.click(d.role("link", "JSON scenarios", exact=True))
        await d.settle(1500)
        await d.click(page.get_by_role("link").filter(has_text=re.compile("Wheel Factory")).first)
        await d.settle(1500)
    async with d.scene("aggregate"):
        await d.click(d.role("link", "Aggregate planning (v4)", exact=True))
        await d.settle(1500)
        await d.click(page.locator("tbody tr").first)
        await d.settle(1500)
        await d.wheel(400)

    # ---- Everyday tools
    async with d.scene("search-k"):
        await d.move(VIEW_W * 0.5, VIEW_H * 0.4, 400)
        await page.keyboard.press("Control+k")
        await d.pause(0.8)
        await page.keyboard.type("weeks 48", delay=90)
        await d.pause(1.5)
        # the main period, not its reschedule or variant (those carry " · <label>")
        await d.click(page.get_by_role("option").filter(has_text=re.compile(r"^Weeks 48-49\s*2026")).first, after=0.3)
        await d.settle(1500)
    async with d.scene("lang"):
        await d.click(d.role("button", "Change language"), after=0.4)
        await d.click(d.role("menuitemradio", "Tiếng Việt"), after=2)
        await d.click(page.get_by_role("button", name=re.compile("Đổi ngôn ngữ|Change language")).first, after=0.4)
        await d.click(d.role("menuitemradio", "English"), after=1)
        theme = page.get_by_role("button", name="Toggle light/dark theme").first
        await d.click(theme, after=0.4)
        await d.click(d.role("menuitemradio", "Dark"), after=2.5)
        await d.click(theme, after=0.4)
        await d.click(d.role("menuitemradio", "Light"), after=0.5)
    async with d.scene("outro"):
        await d.click(d.role("link", "Today", exact=True))
        await d.settle(1500)
        await d.move(VIEW_W * 0.62, VIEW_H * 0.3, 900)


async def pick_cnc1_bar(d: Demo, period_id: str) -> Locator:
    """A machining bar on CNC lathe 1 in the first days of the recommended schedule."""
    page = d.page
    ops = await page.evaluate("""() => [...document.querySelectorAll('g[data-op]')].map(g => {
        const r = g.getBoundingClientRect(); return {id: g.getAttribute('data-op'), x: r.x, y: r.y, w: r.width, h: r.height}; })""")
    dataset = api(f"/periods/{period_id}")["dataset_id"]
    runs = [r for r in api("/schedule-runs?limit=20")["items"] if r["dataset_id"] == dataset and r["status"].lower() == "succeeded"]
    visible = {o["id"] for o in ops if o["w"] >= 4}
    for run in runs:
        detail = api(f"/schedule-runs/{run['id']}")
        cands = sorted((op for op in detail["operations"] if op["machine"] == "CNC_1" and str(op["id"]) in visible),
                       key=lambda op: op["block_start"])
        if cands:
            return page.locator(f'g[data-op="{cands[min(2, len(cands) - 1)]["id"]}"]')
    raise RuntimeError("no CNC_1 bar found in the editor")


# ---------------------------------------------------------------- main


def wav_seconds(path: Path) -> float:
    with wave.open(str(path)) as w:
        return w.getnframes() / w.getframerate()


async def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--work", type=Path, required=True)
    parser.add_argument("--narration-only", action="store_true")
    parser.add_argument("--dry", action="store_true")
    parser.add_argument("--tail-only", action="store_true", help="with --dry: only the last scenes")
    args = parser.parse_args()
    work: Path = args.work
    work.mkdir(parents=True, exist_ok=True)

    if args.narration_only:
        # "text": spelled for the Windows voices (tts.ps1); "raw": the subtitle text (tts_edge.py).
        items = [{"id": sid, "text": speakable(text), "raw": text} for sid, _, text in NARRATION]
        (work / "narration.json").write_text(json.dumps(items, indent=1, ensure_ascii=False), encoding="utf-8")
        print(f"{len(items)} scenes, {sum(len(t.split()) for *_, t in NARRATION)} words")
        return

    durations = {} if args.dry else {sid: wav_seconds(work / "audio" / f"{sid}.wav") for sid, _, _ in NARRATION}
    ids = json.loads((work / "demo-data" / "seed_result.json").read_text())
    csv_path = work / "demo-data" / "new_orders.csv"
    frames_dir = work / ("dry" if args.dry else "frames")
    frames_dir.mkdir(exist_ok=True)

    async with async_playwright() as p:
        browser = await p.chromium.launch(channel="chrome", headless=True)
        ctx = await browser.new_context(viewport={"width": VIEW_W, "height": VIEW_H}, device_scale_factor=1,
                                        locale="en-US", timezone_id="Asia/Ho_Chi_Minh")
        await ctx.add_cookies([{"name": "planwise-locale", "value": "en", "url": BASE}])
        await ctx.add_init_script(CURSOR_JS)
        page = await ctx.new_page()
        page.set_default_timeout(30000)
        demo = Demo(page, work, durations, args.dry)

        frames: list[tuple[float, str]] = []
        if not args.dry:
            cdp = await ctx.new_cdp_session(page)
            pending: set[asyncio.Task] = set()

            async def on_frame(params: dict) -> None:
                name = f"{len(frames):06d}.jpg"
                frames.append((params["metadata"]["timestamp"], name))
                (frames_dir / name).write_bytes(base64.b64decode(params["data"]))
                try:
                    await cdp.send("Page.screencastFrameAck", {"sessionId": params["sessionId"]})
                except Exception:  # noqa: BLE001 - page closing
                    pass

            def frame_handler(params: dict) -> None:
                task = asyncio.ensure_future(on_frame(params))
                pending.add(task)
                task.add_done_callback(pending.discard)

            cdp.on("Page.screencastFrame", frame_handler)
            await cdp.send("Page.startScreencast", {"format": "jpeg", "quality": 88, "maxWidth": VIEW_W,
                                                    "maxHeight": VIEW_H, "everyNthFrame": 1})
        try:
            if args.tail_only:
                await demo.goto(f"/periods/{ids['period2']}")
                await tail(demo)
            else:
                await story(demo, ids, csv_path)
        finally:
            if not args.dry:
                await asyncio.sleep(1)
                await cdp.send("Page.stopScreencast")
                await asyncio.sleep(0.5)
            demo.timeline["frames"] = frames
            demo.timeline["recorded_at"] = time.time()
            (work / ("timeline-dry.json" if args.dry else "timeline.json")).write_text(json.dumps(demo.timeline, indent=1))
            await browser.close()


if __name__ == "__main__":
    asyncio.run(main())
