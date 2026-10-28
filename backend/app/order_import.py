"""Read customer orders from what planners actually have: an Excel sheet, a CSV
export or a block pasted from Excel (tab-separated).

Headers are matched loosely (Vietnamese or English, accents and case ignored);
dates accept dd/mm/yyyy, yyyy-mm-dd and Excel date cells, with an optional
separate time column. Every problem is reported per row, in both languages,
so the preview can show exactly what to fix before anything is written.
"""

from __future__ import annotations

import base64
import csv
import difflib
import io
import re
import unicodedata
from dataclasses import dataclass, field
from datetime import date, datetime, time, timedelta
from typing import Any

FIELDS: dict[str, tuple[str, ...]] = {
    "code": (
        "ma don",
        "ma don hang",
        "so don",
        "so don hang",
        "don hang",
        "order",
        "order id",
        "order no",
        "order code",
        "order number",
        "po",
        "so po",
        "id",
        "code",
        "ma",
    ),
    "product": (
        "san pham",
        "ma san pham",
        "ma sp",
        "sp",
        "ma hang",
        "mat hang",
        "product",
        "product code",
        "sku",
        "item",
        "item code",
    ),
    "quantity": ("so luong", "sl", "luong", "quantity", "qty", "amount"),
    "due": (
        "han giao",
        "ngay giao",
        "han",
        "ngay giao hang",
        "thoi han",
        "due",
        "due date",
        "deadline",
        "delivery date",
        "ship date",
        "ngay",
    ),
    "due_time": ("gio giao", "gio", "time", "due time", "delivery time"),
    "priority": ("uu tien", "do uu tien", "muc uu tien", "priority"),
    "pickup": ("cach giao", "kieu giao", "giao", "pickup", "delivery"),
    "customer": ("khach hang", "khach", "ten khach", "customer", "client"),
    "note": ("ghi chu", "note", "notes", "comment", "remark"),
}
REQUIRED = ("code", "product", "quantity", "due")
PRIORITY_WORDS = {
    "gap": 4,
    "khan": 4,
    "khan cap": 4,
    "urgent": 4,
    "rush": 4,
    "cao": 3,
    "high": 3,
    "thuong": 2,
    "binh thuong": 2,
    "normal": 2,
    "medium": 2,
    "trung binh": 2,
    "thap": 1,
    "low": 1,
}
PICKUP_WORDS = {
    "dung hen": "at_due",
    "dung gio": "at_due",
    "theo hen": "at_due",
    "at due": "at_due",
    "at_due": "at_due",
    "on due": "at_due",
    "khi xong": "when_ready",
    "som": "when_ready",
    "giao ngay": "when_ready",
    "when ready": "when_ready",
    "when_ready": "when_ready",
    "asap": "when_ready",
}


def fold(text: Any) -> str:
    """Lower-case, strip accents and punctuation: 'Hạn giao (ngày)' -> 'han giao ngay'."""
    value = unicodedata.normalize("NFD", str(text)).replace("đ", "d").replace("Đ", "D")
    value = "".join(ch for ch in value if unicodedata.category(ch) != "Mn").lower()
    return re.sub(r"[^a-z0-9]+", " ", value).strip()


@dataclass
class Message:
    vi: str
    en: str

    def as_dict(self) -> dict[str, str]:
        return {"vi": self.vi, "en": self.en}


@dataclass
class ParsedRow:
    row: int
    values: dict[str, Any] = field(default_factory=dict)
    errors: list[Message] = field(default_factory=list)
    warnings: list[Message] = field(default_factory=list)


@dataclass
class ParsedSheet:
    columns: dict[str, str]
    unmatched_headers: list[str]
    missing_columns: list[str]
    rows: list[ParsedRow]


def read_table(fmt: str, content: str) -> list[list[Any]]:
    if fmt == "xlsx":
        from openpyxl import load_workbook

        try:
            data = base64.b64decode(content, validate=True)
            book = load_workbook(io.BytesIO(data), read_only=True, data_only=True)
        except Exception as exc:  # noqa: BLE001 - any unreadable workbook is a user error
            raise ValueError("The file is not a readable .xlsx workbook") from exc
        sheet = book.worksheets[0]
        return [list(row) for row in sheet.iter_rows(values_only=True)]
    text = content.lstrip("﻿")
    if fmt == "tsv":
        delimiter = "\t"
    else:
        first = text.split("\n", 1)[0]
        delimiter = max([",", ";", "\t"], key=first.count)
    return [row for row in csv.reader(io.StringIO(text), delimiter=delimiter)]


def _match_headers(header: list[Any]) -> tuple[dict[int, str], dict[str, str], list[str]]:
    by_index: dict[int, str] = {}
    labels: dict[str, str] = {}
    unmatched: list[str] = []
    aliases = {alias: name for name, values in FIELDS.items() for alias in values}
    for index, cell in enumerate(header):
        if cell is None or str(cell).strip() == "":
            continue
        key = fold(cell)
        name = aliases.get(key)
        if name is None:
            # "Hạn giao (dd/mm)" / "Số lượng (cái)": match on the leading words.
            name = next(
                (
                    aliases[a]
                    for a in sorted(aliases, key=len, reverse=True)
                    if key.startswith(a + " ")
                ),
                None,
            )
        if name is None or name in labels:
            unmatched.append(str(cell).strip())
            continue
        by_index[index] = name
        labels[name] = str(cell).strip()
    return by_index, labels, unmatched


def _parse_date(value: Any) -> tuple[date | None, time | None]:
    if isinstance(value, datetime):
        return value.date(), (value.time() if value.time() != time(0) else None)
    if isinstance(value, date):
        return value, None
    if isinstance(value, (int, float)) and 20000 < value < 80000:
        moment = datetime(1899, 12, 30) + timedelta(days=float(value))
        return moment.date(), (
            moment.time().replace(second=0, microsecond=0) if moment.time() != time(0) else None
        )
    text = str(value).strip()
    match = re.match(r"^(\d{4})-(\d{1,2})-(\d{1,2})(?:[T ](\d{1,2}):(\d{2}))?", text)
    if match:
        y, m, d, hh, mm = match.groups()
        return date(int(y), int(m), int(d)), (time(int(hh), int(mm)) if hh else None)
    match = re.match(r"^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})(?:\s+(\d{1,2})[:h](\d{2})?)?", text)
    if match:
        d, m, y, hh, mm = match.groups()
        year = int(y) + (2000 if len(y) == 2 else 0)
        return date(year, int(m), int(d)), (time(int(hh), int(mm or 0)) if hh else None)
    raise ValueError(text)


def _parse_time(value: Any) -> time | None:
    if value is None or str(value).strip() == "":
        return None
    if isinstance(value, time):
        return value.replace(second=0, microsecond=0)
    if isinstance(value, datetime):
        return value.time().replace(second=0, microsecond=0)
    if isinstance(value, float) and 0 <= value < 1:
        minutes = round(value * 1440)
        return time(minutes // 60, minutes % 60)
    match = re.match(r"^(\d{1,2})\s*[:h]\s*(\d{2})?$", str(value).strip().lower())
    if not match:
        raise ValueError(str(value))
    return time(int(match.group(1)), int(match.group(2) or 0))


def _parse_int(value: Any) -> int:
    if isinstance(value, bool):
        raise ValueError(str(value))
    if isinstance(value, int):
        return value
    if isinstance(value, float):
        if value != int(value):
            raise ValueError(str(value))
        return int(value)
    text = str(value).strip().replace(" ", "")
    # 1.200 / 1,200 are thousands in a quantity; a decimal quantity is not allowed.
    if re.fullmatch(r"\d{1,3}([.,]\d{3})+", text):
        text = re.sub(r"[.,]", "", text)
    if not re.fullmatch(r"\d+", text):
        raise ValueError(text)
    return int(text)


def parse_orders(
    fmt: str,
    content: str,
    *,
    products: list[str],
    default_due_time: str,
) -> ParsedSheet:
    table = read_table(fmt, content)
    while table and all(cell is None or str(cell).strip() == "" for cell in table[0]):
        table.pop(0)
    if not table:
        return ParsedSheet({}, [], list(REQUIRED), [])
    by_index, labels, unmatched = _match_headers(table[0])
    missing = [name for name in REQUIRED if name not in labels]
    hh, mm = (int(x) for x in default_due_time.split(":"))
    default_time = time(hh, mm)
    product_by_fold = {fold(p): p for p in products}
    rows: list[ParsedRow] = []
    if missing:
        return ParsedSheet(labels, unmatched, missing, rows)
    for offset, cells in enumerate(table[1:], start=2):
        if all(cell is None or str(cell).strip() == "" for cell in cells):
            continue
        raw = {name: cells[i] if i < len(cells) else None for i, name in by_index.items()}
        row = ParsedRow(row=offset)

        def blank(key: str, raw: dict[str, Any] = raw) -> bool:
            return raw.get(key) is None or str(raw.get(key)).strip() == ""

        if blank("code"):
            row.errors.append(Message("Thiếu mã đơn.", "Missing order code."))
        else:
            code = str(raw["code"]).strip()
            if isinstance(raw["code"], float) and raw["code"] == int(raw["code"]):
                code = str(int(raw["code"]))
            row.values["code"] = code

        if blank("product"):
            row.errors.append(Message("Thiếu mã sản phẩm.", "Missing product code."))
        else:
            given = str(raw["product"]).strip()
            product = product_by_fold.get(fold(given))
            if product is None:
                guess = difflib.get_close_matches(given.upper(), products, n=1, cutoff=0.6)
                hint_vi = f" Có phải {guess[0]}?" if guess else ""
                hint_en = f" Did you mean {guess[0]}?" if guess else ""
                row.errors.append(
                    Message(
                        f"Sản phẩm {given} không có trong nhà máy.{hint_vi}",
                        f"Product {given} is not made by the factory.{hint_en}",
                    )
                )
                row.values["product"] = given
            else:
                row.values["product"] = product

        if blank("quantity"):
            row.errors.append(Message("Thiếu số lượng.", "Missing quantity."))
        else:
            try:
                quantity = _parse_int(raw["quantity"])
                if quantity <= 0:
                    raise ValueError
                row.values["quantity"] = quantity
            except ValueError:
                row.errors.append(
                    Message(
                        f"Số lượng không hợp lệ: {raw['quantity']}.",
                        f"Invalid quantity: {raw['quantity']}.",
                    )
                )

        if blank("due"):
            row.errors.append(Message("Thiếu hạn giao.", "Missing due date."))
        else:
            try:
                day, at = _parse_date(raw["due"])
                try:
                    explicit = _parse_time(raw.get("due_time"))
                except ValueError:
                    explicit = None
                    row.errors.append(
                        Message(
                            f"Giờ giao không hợp lệ: {raw.get('due_time')}.",
                            f"Invalid due time: {raw.get('due_time')}.",
                        )
                    )
                when = explicit or at
                if when is None:
                    when = default_time
                    row.warnings.append(
                        Message(
                            f"Không có giờ giao — dùng mặc định {default_due_time}.",
                            f"No due time — using the default {default_due_time}.",
                        )
                    )
                assert day is not None
                row.values["due"] = datetime.combine(day, when).strftime("%Y-%m-%dT%H:%M")
            except (ValueError, OverflowError):
                row.errors.append(
                    Message(
                        f"Hạn giao không đọc được: {raw['due']} (dùng dd/mm/yyyy hoặc yyyy-mm-dd).",
                        f"Unreadable due date: {raw['due']} (use dd/mm/yyyy or yyyy-mm-dd).",
                    )
                )

        if not blank("priority"):
            value = raw["priority"]
            try:
                priority = _parse_int(value)
                if not 1 <= priority <= 9:
                    raise ValueError
            except ValueError:
                priority = PRIORITY_WORDS.get(fold(value))
            if priority is None:
                row.errors.append(
                    Message(
                        f"Ưu tiên không hợp lệ: {value} (1–4 hoặc Thấp/Thường/Cao/Gấp).",
                        f"Invalid priority: {value} (1–4 or Low/Normal/High/Urgent).",
                    )
                )
            else:
                row.values["priority"] = priority
        if not blank("pickup"):
            pickup = PICKUP_WORDS.get(fold(raw["pickup"]))
            if pickup is None:
                row.warnings.append(
                    Message(
                        f"Không hiểu cách giao “{raw['pickup']}” — dùng 'đúng hẹn'.",
                        f"Unknown pickup “{raw['pickup']}” — using 'at due time'.",
                    )
                )
            else:
                row.values["pickup"] = pickup
        for key in ("customer", "note"):
            if not blank(key):
                row.values[key] = str(raw[key]).strip()[: 120 if key == "customer" else 500]
        rows.append(row)

    seen: dict[str, int] = {}
    for row in rows:
        code = row.values.get("code")
        if code is None:
            continue
        if code in seen:
            row.errors.append(
                Message(
                    f"Mã đơn {code} lặp lại (đã có ở dòng {seen[code]}).",
                    f"Order code {code} repeats (first on row {seen[code]}).",
                )
            )
        else:
            seen[code] = row.row
    return ParsedSheet(labels, unmatched, [], rows)
