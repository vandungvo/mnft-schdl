"""Capture the screenshots of the PlanWise user guide from the English demo instance.

Needs the demo instance of research/demo_video (backend :8100, frontend :3100) in the state left
by one recorded take of record_demo.py (period "Weeks 48-49" committed, with a what-if variant and a
reschedule). Nothing is saved: dialogs are cancelled, hand edits discarded, the one temporary
order-book entry is deleted again.

    python docs/user-guide/capture_screenshots.py [--only name1,name2]

Writes docs/user-guide/figures/<name>.png (1280x800 viewport, device scale 2). Red numbered badges
are drawn on some screens; the guide refers to them as callouts.
"""

from __future__ import annotations

import argparse
import asyncio
import json
import re
import tempfile
import traceback
import urllib.request
from pathlib import Path

from playwright.async_api import Locator, Page, async_playwright

BASE = "http://localhost:3100"
API = "http://127.0.0.1:8100/api/v1"
OUT = Path(__file__).resolve().parent / "figures"
W, H = 1280, 800

BADGE_JS = """([x, y, n]) => {
  const b = document.createElement('div');
  b.className = '__badge';
  b.textContent = n;
  Object.assign(b.style, {position: 'absolute', left: (x + scrollX) + 'px', top: (y + scrollY) + 'px', width: '24px', height: '24px',
    borderRadius: '50%', background: '#e11d48', color: '#fff', font: '700 13px/24px Segoe UI, sans-serif', textAlign: 'center',
    border: '2px solid #fff', boxShadow: '0 1px 4px rgba(0,0,0,.45)', zIndex: 2147483647, pointerEvents: 'none'});
  document.body.appendChild(b);
}"""

GUIDE_CSV = """Order no,Customer,Product,Qty,Delivery date,Time,Priority,Note
SO-261210-950,Saigon Motor Assembly,F_SILVER,40,10/12/2026,16:00,High,Call-off for the December model run
SO-261212-951,Danang Spare Parts,R_BLACK,20,12/12/2026,16:00,Low,
SO-261215-952,Hanoi Moto Works,R_SILVER,36,15/12/2026,12:00,Urgent,Replacement wheels
SO-261126-046,Saigon Motor Assembly,F_SILVER,44,26/11/2026,16:00,High,Customer raised the call-off again
SO-261217-953,Mekong Parts Distribution,F_GOLD,24,17/12/2026,16:00,Normal,Unknown product code
"""


def api(path: str, method: str = "GET", body: object | None = None):
    data = None if body is None else json.dumps(body).encode()
    req = urllib.request.Request(API + path, data=data, method=method, headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=60) as resp:
        raw = resp.read()
        return json.loads(raw) if raw else None


class Cap:
    def __init__(self, page: Page, only: set[str] | None) -> None:
        self.page = page
        self.only = only
        self.done: list[str] = []
        self.failed: list[str] = []

    def want(self, name: str) -> bool:
        return not self.only or name in self.only

    async def go(self, path: str, wait: int = 900) -> None:
        await self.page.goto(BASE + path, wait_until="networkidle")
        await self.page.wait_for_timeout(wait)

    async def mark(self, items: list[tuple[Locator, int, str]]) -> None:
        for loc, n, pos in items:
            try:
                b = await loc.bounding_box(timeout=4000)
            except Exception:  # noqa: BLE001
                b = None
            if not b:
                print(f"   (badge {n} not placed)")
                continue
            x, y, w, h = b["x"], b["y"], b["width"], b["height"]
            xy = {"tl": (x - 10, y - 10), "tr": (x + w - 14, y - 10), "l": (x - 28, y + h / 2 - 12),
                  "r": (x + w + 4, y + h / 2 - 12), "t": (x + w / 2 - 12, y - 14), "b": (x + w / 2 - 12, y + h - 4),
                  "in": (x + 6, y + 6)}[pos]
            await self.page.evaluate(BADGE_JS, [xy[0], xy[1], n])

    async def unmark(self) -> None:
        await self.page.evaluate("() => document.querySelectorAll('.__badge').forEach(e => e.remove())")

    async def shot(self, name: str, target: Locator | None = None, pad: int = 8, full: bool = False,
                   max_h: int | None = None) -> None:
        path = OUT / f"{name}.png"
        if target is None:
            await self.page.screenshot(path=str(path), full_page=full)
        else:
            # Sticky tabs and the bottom "Viewing" bar would be painted over a crop: unstick them.
            await self.page.add_style_tag(content=".sticky{position:static !important}")
            await self.page.wait_for_timeout(150)
            await target.scroll_into_view_if_needed()
            box = await target.bounding_box()
            assert box, f"no box for {name}"
            scroll = await self.page.evaluate("() => [scrollX, scrollY]")
            height = box["height"] if max_h is None else min(box["height"], max_h)
            clip = {"x": max(0, box["x"] + scroll[0] - pad), "y": max(0, box["y"] + scroll[1] - pad),
                    "width": box["width"] + 2 * pad, "height": height + 2 * pad}
            await self.page.screenshot(path=str(path), clip=clip, full_page=True)
            await self.page.evaluate("() => document.querySelectorAll('style').forEach(s => { if (s.textContent.includes('.sticky{position:static')) s.remove(); })")
        await self.unmark()
        self.done.append(name)
        print(f"   saved {name}")

    def panel(self, title: str) -> Locator:
        return self.page.locator(f"xpath=//h3[contains(normalize-space(), \"{title}\")]/ancestor::section[1]").first

    def dialog(self) -> Locator:
        return self.page.get_by_role("dialog").last

    def btn(self, name: str | re.Pattern, exact: bool = False) -> Locator:
        return self.page.get_by_role("button", name=name, exact=exact).first


async def run(c: Cap, ids: dict) -> None:
    page = c.page
    main, variant, resched = ids["main"], ids["variant"], ids["reschedule"]
    closed = ids["closed"]

    async def step(name: str, fn) -> None:
        if not c.want(name):
            return
        print(f"-- {name}")
        try:
            await fn()
        except Exception:  # noqa: BLE001
            c.failed.append(name)
            traceback.print_exc(limit=2)
            try:
                await page.keyboard.press("Escape")
                await c.unmark()
            except Exception:  # noqa: BLE001
                pass

    # ------------------------------------------------------------ overview
    async def today():
        await c.go("/")
        await c.mark([
            (page.get_by_role("navigation", name="Main navigation"), 1, "tr"),
            (page.get_by_role("link", name=re.compile("Riverside Alloy Wheels")).first, 2, "r"),
            (c.btn(re.compile("Quick search")), 3, "r"),
            (page.get_by_text(re.compile(r"^(Current|Next) period$")).first, 4, "l"),
            (page.get_by_text("Overdue open orders").first, 5, "l"),
            (page.get_by_text(re.compile(r"^Load, next")).first, 6, "l"),
            (c.btn("Change language"), 7, "b"),
            (page.get_by_text("System online").first, 8, "r"),
        ])
        await c.shot("today")
    await step("today", today)

    async def new_menu():
        await c.go("/")
        await c.btn(re.compile(r"^New$")).click()
        await page.wait_for_timeout(500)
        await c.shot("new_menu", page.get_by_role("menu").first, pad=10)
        await page.keyboard.press("Escape")
    await step("new_menu", new_menu)

    # ------------------------------------------------------------ factory
    async def factory_process():
        await c.go("/factory")
        await c.mark([
            (page.get_by_role("button", name=re.compile(r"^Process")).first, 1, "l"),
            (page.get_by_role("button", name=re.compile(r"1 · cast")).first, 2, "tl"),
            (page.get_by_role("button", name=re.compile(r"Insert a stage between Casting")).first, 3, "t"),
            (page.get_by_text("Planning defaults").first, 4, "l"),
            (c.btn("Download JSON"), 5, "l"),
            (page.get_by_role("button", name=re.compile(r"^Versions")).first, 6, "l"),
        ])
        await c.shot("factory_process")
    await step("factory_process", factory_process)

    async def factory_stage():
        await c.go("/factory")
        await page.get_by_role("button", name=re.compile(r"2 · heat")).first.click()
        await page.wait_for_timeout(700)
        await c.shot("factory_stage_edit", c.dialog())
        await page.keyboard.press("Escape")
    await step("factory_stage_edit", factory_stage)

    async def factory_section(name: str, button: str, edit_row: str | None = None, edit_name: str | None = None):
        await c.go("/factory")
        await page.get_by_role("button", name=re.compile("^" + re.escape(button))).first.click()
        await page.wait_for_timeout(800)
        await c.shot(name)
        if edit_row:
            await page.get_by_text(edit_row, exact=True).first.click()
            await page.wait_for_timeout(800)
            await c.shot(edit_name, c.dialog(), full=False)
            await page.keyboard.press("Escape")

    await step("factory_products", lambda: factory_section("factory_products", "Products", "Rear wheel 17x1.60 - Silver", "factory_product_edit"))
    await step("factory_machines", lambda: factory_section("factory_machines", "Machines", "CNC lathe 1", "factory_machine_edit"))
    await step("factory_molds", lambda: factory_section("factory_molds", "Molds"))
    await step("factory_policies", lambda: factory_section("factory_policies", "Policies"))

    async def factory_calendar():
        await c.go("/factory")
        await page.get_by_role("button", name=re.compile(r"^Shifts & calendar")).first.click()
        await page.wait_for_timeout(800)
        await c.shot("factory_calendar", full=True)
    await step("factory_calendar", factory_calendar)

    async def factory_versions():
        await c.go("/factory")
        await page.get_by_role("button", name=re.compile(r"^Versions")).first.click()
        await page.wait_for_timeout(800)
        await c.shot("factory_versions")
        await page.get_by_text(re.compile(r"^v1$")).first.click()  # expand the old version
        await page.wait_for_timeout(600)
        compare = page.get_by_role("button", name="Compare with the current one").first
        await compare.click()
        await page.wait_for_timeout(1200)
        await c.shot("factory_version_compare", full=True)
    await step("factory_versions", factory_versions)

    async def factory_draft():
        await c.go("/factory")
        field = page.get_by_label("Long-term look-ahead (days)")
        await field.fill("35")
        await field.press("Tab")
        await page.wait_for_timeout(800)
        bar = page.get_by_text(re.compile(r"unsaved change")).last.locator("xpath=ancestor::div[contains(@class,'shadow')][1]")
        await c.shot("factory_draft_bar", bar, pad=6)
        await page.get_by_role("button", name="Discard").first.click()
        await page.wait_for_timeout(500)
        confirm = page.get_by_role("alertdialog").get_by_role("button", name=re.compile("Discard|Confirm"))
        if await confirm.count():
            await confirm.first.click()
        await page.wait_for_timeout(500)
    await step("factory_draft_bar", factory_draft)

    # ------------------------------------------------------------ order book
    async def orders():
        await c.go("/orders")
        await c.mark([
            (page.get_by_text(re.compile(r"^Expected load, next")).first, 1, "l"),
            (page.get_by_placeholder(re.compile("Order, product, customer")), 2, "l"),
            (c.btn(re.compile(r"^Status")), 3, "t"),
            (c.btn("Template"), 4, "t"),
            (c.btn("Import from Excel"), 5, "t"),
            (c.btn("Add order"), 6, "t"),
            (page.get_by_role("button", name="Due").first, 7, "t"),
        ])
        await c.shot("orders")
    await step("orders", orders)

    async def order_dialog():
        await c.go("/orders")
        await page.get_by_role("button", name=re.compile(r"^RUSH-")).first.click()
        await page.wait_for_timeout(700)
        await c.shot("order_dialog", c.dialog())
        await page.keyboard.press("Escape")
    await step("order_dialog", order_dialog)

    async def import_preview():
        await c.go("/orders")
        await c.btn("Import from Excel").click()
        await page.wait_for_timeout(500)
        await c.shot("import_start", c.dialog())
        csv = Path(tempfile.gettempdir()) / "planwise_guide_orders.csv"
        csv.write_text(GUIDE_CSV, encoding="utf-8")
        async with page.expect_file_chooser() as chooser:
            await c.btn(re.compile("Choose an .xlsx or .csv file")).click()
        await (await chooser.value).set_files(str(csv))
        await page.wait_for_timeout(1500)
        await c.shot("import_preview", c.dialog())
        await c.btn("Cancel").click()
    await step("import_preview", import_preview)

    # ------------------------------------------------------------ periods
    async def periods():
        await c.go("/periods")
        await c.shot("periods")
    await step("periods", periods)

    async def new_period():
        await c.go("/periods")
        await c.btn("Plan a new period").click()
        await page.wait_for_timeout(1200)
        await c.shot("new_period", c.dialog())
        await page.keyboard.press("Escape")
    await step("new_period", new_period)

    async def period_header():
        await c.go(f"/periods/{main}?tab=prepare")
        await c.mark([
            (page.get_by_role("heading", level=1).first, 1, "l"),
            (page.get_by_text(re.compile(r"orders in, \d+ after")).first, 2, "r"),
            (page.get_by_role("link", name="Main").first, 3, "l"),
            (page.get_by_text(re.compile(r"^Committed “")).first, 4, "l"),
            (page.get_by_role("tab", name=re.compile("Prepare")).first, 5, "t"),
            (page.get_by_role("tab", name=re.compile("Analysis")).first, 6, "t"),
            (c.btn("More actions"), 7, "t"),
        ])
        await c.shot("period_header")
    await step("period_header", period_header)

    async def prepare_parts():
        await c.go(f"/periods/{variant}?tab=prepare")
        await c.shot("prepare_check", page.locator("xpath=//h3[contains(., 'Input check')]/ancestor::div[contains(@class,'grid')][1]").first)
        workspace = page.get_by_role("navigation", name="Preparation sections").locator("xpath=..")
        await c.shot("prepare_orders", workspace, max_h=720)
        await page.get_by_role("button", name=re.compile(r"^Opening stock")).first.click()
        await page.wait_for_timeout(700)
        await c.shot("prepare_opening", workspace, max_h=1150)
        await page.get_by_role("button", name=re.compile(r"^Machine calendar")).first.click()
        await page.wait_for_timeout(700)
        await c.shot("prepare_calendar", c.panel("Machine calendar for the period"))
        await page.get_by_role("button", name=re.compile(r"^HT_1 02\/12")).first.click()
        await page.wait_for_timeout(600)
        await c.shot("exception_dialog", c.dialog())
        await page.keyboard.press("Escape")
        await page.get_by_role("button", name=re.compile(r"^Policy")).first.click()
        await page.wait_for_timeout(700)
        await c.shot("prepare_policy", workspace, max_h=1000)
    await step("prepare_parts", prepare_parts)

    async def period_order_dialog():
        await c.go(f"/periods/{variant}?tab=prepare")
        await page.get_by_role("button", name=re.compile(r"^Edit RUSH-")).first.click()
        await page.wait_for_timeout(600)
        await c.shot("period_order_dialog", c.dialog())
        await page.keyboard.press("Escape")
    await step("period_order_dialog", period_order_dialog)

    async def save_bar():
        await c.go(f"/periods/{variant}?tab=prepare")
        await page.get_by_role("button", name=re.compile(r"^Opening stock")).first.click()
        await page.wait_for_timeout(600)
        cell = page.locator("main input[type=number]").first
        value = await cell.input_value()
        await cell.fill(str(int(value or 0) + 4))
        await cell.press("Tab")
        await page.wait_for_timeout(600)
        await c.shot("prepare_save_bar", page.get_by_role("region", name="Save changes"), pad=4)
        await page.get_by_role("region", name="Save changes").get_by_role("button", name="Discard").click()
    await step("prepare_save_bar", save_bar)

    async def sync_banner():
        api(f"/factories/{ids['factory']}/orders", "POST", {
            "code": "SO-261204-990", "product": "F_BLACK", "quantity": 16, "due": "2026-12-04T16:00",
            "priority": 2, "customer": "Mekong Parts Distribution", "note": "Added for the guide"})
        try:
            await c.go(f"/periods/{variant}?tab=prepare")
            banner = page.get_by_text(re.compile("The order book changed since this period")).first.locator("xpath=ancestor::*[@role='alert'][1]")
            await c.shot("prepare_sync", banner, pad=4)
        finally:
            api(f"/factories/{ids['factory']}/orders/SO-261204-990", "DELETE")
    await step("prepare_sync", sync_banner)

    # ------------------------------------------------------------ options
    async def options_empty():
        await c.go(f"/periods/{variant}?tab=options")
        await c.shot("options_empty", page.locator("main").first, pad=0)
    await step("options_empty", options_empty)

    async def generate_dialog():
        await c.go(f"/periods/{variant}?tab=options")
        await c.btn("Generate options").click()
        await page.wait_for_timeout(800)
        await c.shot("generate_dialog", c.dialog())
        await c.btn(re.compile("Customise algorithms")).click()
        await page.wait_for_timeout(600)
        await c.shot("generate_custom", c.dialog())
        await c.dialog().get_by_role("button", name="Cancel").click()
    await step("generate_dialog", generate_dialog)

    async def options():
        await c.go(f"/periods/{main}?tab=options")
        await c.mark([
            (page.get_by_role("radio", name="Service first").first, 1, "t"),
            (page.get_by_role("button", name=re.compile("How this policy scores")).first, 2, "r"),
            (page.locator("button").filter(has_text=re.compile(r"^#1")).first, 3, "tl"),
            (page.get_by_text("What really differs:").first, 4, "l"),
            (page.get_by_text("Viewing", exact=True).last, 5, "t"),
        ])
        await c.shot("options")
        await page.get_by_role("button", name=re.compile("How this policy scores")).first.click()
        await page.wait_for_timeout(600)
        await c.shot("options_scoring", page.locator("xpath=//h3[contains(., 'What matters most')]/ancestor::section[1]").first)
        chart = page.locator("xpath=//h3[contains(., 'Trade-off')]/ancestor::section[1]").first
        await c.shot("options_tradeoff", chart)
    await step("options", options)

    # ------------------------------------------------------------ schedule & compare
    async def schedule():
        await c.go(f"/periods/{main}?tab=schedule", wait=1500)
        await c.mark([
            (page.get_by_role("combobox").nth(0), 1, "tl"),
            (page.get_by_role("combobox").nth(1), 2, "tl"),
            (c.btn("Edit this schedule by hand"), 3, "t"),
            (page.get_by_text("On time", exact=True).first, 4, "l"),
            (page.get_by_role("radio", name="By machine").first, 5, "l"),
            (page.get_by_text("Colour by", exact=True).first, 6, "l"),
            (page.get_by_role("radio", name="Fit").first, 7, "t"),
            (page.get_by_text("Late delivery").first, 8, "r"),
        ])
        await c.shot("schedule")
    await step("schedule", schedule)

    async def gantt_zoom():
        await c.go(f"/periods/{main}?tab=schedule", wait=1500)
        await page.get_by_role("radio", name="Shifts", exact=True).first.click()
        await page.wait_for_timeout(900)
        bar = page.locator("g[data-op]").nth(30)
        await bar.hover()
        await page.wait_for_timeout(700)
        await c.shot("gantt_shifts")
        await page.get_by_role("radio", name="Fit", exact=True).first.click()
        await page.get_by_role("radio", name="Lateness", exact=True).first.click()
        await page.wait_for_timeout(700)
        gantt = page.locator("svg").filter(has=page.locator("g[data-op]")).first
        await c.shot("gantt_lateness", gantt, pad=4)
        await page.get_by_role("radio", name="Product", exact=True).first.click()
    await step("gantt_zoom", gantt_zoom)

    async def compare():
        await c.go(f"/periods/{main}?tab=schedule", wait=1500)
        await page.get_by_role("combobox").nth(1).click()
        await page.get_by_role("option", name=re.compile("EDD|Earliest")).first.click()
        await page.wait_for_timeout(1200)
        await c.shot("compare_gantt")
        diff = page.locator("xpath=//h3[contains(., 'what you gain and lose')]/ancestor::section[1]").first
        await c.shot("compare_diff", diff)
    await step("compare", compare)

    async def by_order():
        await c.go(f"/periods/{main}?tab=schedule", wait=1500)
        await page.get_by_role("radio", name=re.compile(r"^By order")).first.click()
        await page.wait_for_timeout(800)
        late_first = page.get_by_text(re.compile(r"^Late orders first \([1-9]")).first
        if await late_first.count():
            await late_first.click()
            await page.wait_for_timeout(500)
        await c.shot("by_order")
        await page.locator('[aria-label^="Order "][aria-label$=" late"], [aria-label^="Order "]').first.click()
        await page.wait_for_timeout(1000)
        why = page.locator("#schedule-focus").first
        await c.shot("why_late", why)
        await page.get_by_role("radio", name="Machine load", exact=True).first.click()
        await page.wait_for_timeout(800)
        heat = page.locator("xpath=//*[contains(text(), 'Machine load by day')]/ancestor::section[1]").first
        if not await heat.count():
            heat = page.locator("main").first
        await c.shot("machine_load", heat)
    await step("by_order", by_order)

    async def deliveries():
        await c.go(f"/periods/{main}?tab=schedule", wait=1500)
        await c.shot("deliveries", c.panel("Deliveries"), max_h=560)
        await c.shot("closing_stock", c.panel("Closing finished-goods stock"))
    await step("deliveries", deliveries)

    # ------------------------------------------------------------ hand editing
    async def editor():
        await c.go(f"/periods/{main}?tab=schedule", wait=1500)
        await c.btn("Edit this schedule by hand").click()
        await page.wait_for_timeout(1500)
        await c.shot("editor_start")
        boxes = await page.evaluate("""() => [...document.querySelectorAll('g[data-op]')].map(g => { const r = g.getBoundingClientRect(); return {id: g.getAttribute('data-op'), x: r.x, y: r.y, w: r.width}; })""")
        dataset = api(f"/periods/{main}")["dataset_id"]
        visible = {b["id"] for b in boxes if b["w"] >= 4}
        cnc = []
        for run in api("/schedule-runs?limit=50")["items"]:
            if run["dataset_id"] != dataset or run["status"].lower() != "succeeded":
                continue
            ops = api(f"/schedule-runs/{run['id']}")["operations"]
            cnc = sorted((o for o in ops if o["machine"] == "CNC_1" and str(o["id"]) in visible), key=lambda o: o["block_start"])
            if cnc:
                break
        bar = page.locator(f'g[data-op="{cnc[min(3, len(cnc) - 1)]["id"]}"]')
        await bar.click()
        await page.wait_for_timeout(900)
        sel = page.get_by_role("combobox").filter(has_text="CNC_1").first
        await sel.click()
        await page.get_by_role("option", name="CNC_2").first.click()
        await page.wait_for_timeout(2500)
        await c.mark([
            (page.get_by_role("button", name="Undo").first, 1, "t"),
            (page.get_by_role("radio", name="Keep other times").first, 2, "t"),
            (page.get_by_role("button", name="Exit").first, 3, "t"),
            (page.get_by_role("button", name=re.compile(r"^Optimise the rest")).first, 4, "t"),
            (page.get_by_role("button", name="Save as new option").first, 5, "t"),
            (page.get_by_text("On time", exact=True).first, 6, "l"),
            (page.get_by_role("button", name=re.compile(r"^Lock this run")).first, 7, "l"),
        ])
        await c.shot("editor")
        await c.shot("editor_runpanel", page.locator("xpath=//button[contains(., 'Lock this run')]/ancestor::section[1]").first)
        await page.get_by_role("button", name=re.compile(r"^Optimise the rest")).first.click()
        await page.wait_for_timeout(800)
        await c.shot("optimize_dialog", c.dialog())
        await c.dialog().get_by_role("button", name="Cancel").click()
        await page.get_by_role("button", name="Save as new option").first.click()
        await page.wait_for_timeout(600)
        await c.shot("save_option_dialog", c.dialog())
        await c.dialog().get_by_role("button", name="Cancel").click()
        await page.get_by_role("button", name="Exit").first.click()
        await page.wait_for_timeout(500)
        confirm = page.get_by_role("alertdialog").get_by_role("button", name="Discard")
        if await confirm.count():
            await confirm.first.click()
    await step("editor", editor)

    # ------------------------------------------------------------ commit & execute
    async def commit():
        await c.go(f"/periods/{main}?tab=schedule", wait=1200)
        await page.get_by_role("tab", name=re.compile("Commit")).first.click()  # ?tab=commit opens Execute once committed
        await page.wait_for_timeout(1200)
        await c.shot("commit", page.locator("xpath=//*[contains(text(), 'You are committing')]/ancestor::section[1]").first)
    await step("commit", commit)

    async def execute():
        await c.go(f"/periods/{main}?tab=execute", wait=1200)
        await c.shot("work_orders", c.panel("Work orders"))
        await c.shot("incident_close", page.locator("xpath=//h3[contains(., 'An incident?')]/ancestor::section[1]/..").first)
    await step("execute", execute)

    async def variant_dialog():
        await c.go(f"/periods/{main}?tab=prepare")
        await c.btn("More actions").click()
        await page.wait_for_timeout(400)
        await c.shot("more_menu", page.get_by_role("menu").first, pad=10)
        await page.get_by_role("menuitem", name=re.compile("Create a what-if variant")).click()
        await page.wait_for_timeout(500)
        await c.shot("variant_dialog", c.dialog())
        await page.keyboard.press("Escape")
    await step("variant_dialog", variant_dialog)

    async def family():
        await c.go(f"/periods/{resched}?tab=prepare")
        await page.get_by_text(re.compile(r"^Differs from its parent")).first.click()
        await page.wait_for_timeout(600)
        await c.shot("reschedule_header")
    await step("family", family)

    # ------------------------------------------------------------ analysis & history
    async def analysis():
        await c.go(f"/periods/{main}?tab=analysis", wait=1500)
        await c.shot("analysis_summary", page.locator("xpath=//*[contains(text(), 'How this period')]/..").first)
        await c.shot("analysis_matrix", c.panel("Run matrix"))
        await c.shot("analysis_ranking", c.panel("Every schedule ranked"))
        await c.shot("analysis_components", c.panel("Score by component"))
        await c.shot("analysis_speed", c.panel("Best score found over time"))
        await c.shot("analysis_quality", c.panel("Time and quality by algorithm"))
    await step("analysis", analysis)

    async def history():
        await c.go(f"/periods/{main}?tab=history", wait=1200)
        await c.shot("history", page.locator("main").first, pad=0)
    await step("history", history)

    async def closed_period():
        await c.go(f"/periods/{closed}?tab=execute", wait=1200)
        await c.shot("closed_period")
    await step("closed_period", closed_period)

    # ------------------------------------------------------------ advanced
    async def advanced():
        await c.go("/runs")
        await c.shot("runs")
        await page.locator("tbody tr").filter(has_text="Hybrid").first.click()
        await page.wait_for_timeout(1500)
        await c.shot("run_detail")
        await c.go("/runs/new")
        await c.shot("run_new")
        await c.go("/scenarios")
        await c.shot("scenarios")
        await page.get_by_role("link").filter(has_text=re.compile("Wheel Factory")).first.click()
        await page.wait_for_timeout(1500)
        await c.shot("scenario")
        await c.go("/planning")
        await c.shot("planning")
        await page.locator("tbody tr").first.click()
        await page.wait_for_timeout(1500)
        await c.shot("planning_detail")
    await step("advanced", advanced)

    # ------------------------------------------------------------ everyday tools
    async def tools():
        await c.go(f"/periods/{main}?tab=schedule", wait=1200)
        await page.keyboard.press("Control+k")
        await page.wait_for_timeout(500)
        await page.keyboard.type("weeks")
        await page.wait_for_timeout(600)
        await c.shot("command_palette", c.dialog())
        await page.keyboard.press("Escape")
        await page.mouse.click(700, 120)
        await page.keyboard.press("Shift+Slash")
        await page.wait_for_timeout(600)
        if await page.get_by_role("dialog").count():
            await c.shot("shortcuts", c.dialog())
            await page.keyboard.press("Escape")
        await c.go("/")
        await c.btn("Change language").click()
        await page.wait_for_timeout(400)
        await c.shot("language_menu", page.get_by_role("menu").first, pad=10)
        await page.keyboard.press("Escape")
        await c.btn("Toggle light/dark theme").click()
        await page.get_by_role("menuitemradio", name="Dark").click()
        await page.wait_for_timeout(1000)
        await c.shot("dark_mode")
        await c.btn("Toggle light/dark theme").click()
        await page.get_by_role("menuitemradio", name="Light").click()
    await step("tools", tools)


async def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--only", default="")
    args = parser.parse_args()
    OUT.mkdir(parents=True, exist_ok=True)
    periods = api("/periods")["items"]
    pick = lambda kind, status=None: next(p["id"] for p in periods if p["kind"] == kind and (status is None or p["status"] == status))  # noqa: E731
    ids = {"main": pick("regular", "committed"), "closed": pick("regular", "closed"), "variant": pick("variant"),
           "reschedule": pick("reschedule"), "factory": api("/factories")["items"][0]["id"]}
    async with async_playwright() as p:
        browser = await p.chromium.launch(channel="chrome", headless=True)
        ctx = await browser.new_context(viewport={"width": W, "height": H}, device_scale_factor=2,
                                        locale="en-US", timezone_id="Asia/Ho_Chi_Minh")
        await ctx.add_cookies([{"name": "planwise-locale", "value": "en", "url": BASE}])
        page = await ctx.new_page()
        page.set_default_timeout(15000)
        cap = Cap(page, {s for s in args.only.split(",") if s} or None)
        await run(cap, ids)
        await browser.close()
    print(f"\n{len(cap.done)} figures, failed steps: {cap.failed or 'none'}")


if __name__ == "__main__":
    asyncio.run(main())
