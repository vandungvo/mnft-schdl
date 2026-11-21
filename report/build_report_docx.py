"""Build the English report .docx in the format of the Vietnamese progress report.

The Vietnamese report (Report_tien_do_Do_an_CO5103_VoVanDung.docx) is used as the
template package: its styles, numbering definitions, theme, page set-up (A4, 2 cm
margins, border on the cover page) and HCMUT logo are kept; the body is rebuilt
from Report_CO5103_VoVanDung.md with the same direct formatting (justified 12 pt
Times New Roman, grey-header tables in 9.5 pt, italic centred captions, page break
before every chapter). Captions carry SEQ fields so Word builds the lists of figures
and tables; the footer carries the page number (none on the cover).

    python report/build_report_docx.py
    # then update the table of contents and export the PDF (Word):
    powershell -File report/export_report_pdf.ps1
"""

from __future__ import annotations

import re
import struct
import zipfile
from pathlib import Path
from xml.sax.saxutils import escape

HERE = Path(__file__).resolve().parent
TEMPLATE = HERE / "Report_tien_do_Do_an_CO5103_VoVanDung.docx"
SOURCE = HERE / "Report_CO5103_VoVanDung.md"
OUTPUT = HERE / "Report_CO5103_VoVanDung.docx"

TEXT_WIDTH = 9638  # dxa, A4 minus 2 x 1134
EMU_PER_CM = 360000

COVER = {
    "uni": "VIETNAM NATIONAL UNIVERSITY HO CHI MINH CITY",
    "school": "HO CHI MINH CITY UNIVERSITY OF TECHNOLOGY",
    "faculty": "FACULTY OF COMPUTER SCIENCE AND ENGINEERING",
    "kind": "REPORT",
    "course": "MANAGEMENT INFORMATION SYSTEMS PROJECT",
    "title": ["BUILDING A PRODUCTION SCHEDULING AGENT", "APPLIED TO WHEEL MANUFACTURING"],
    "major": "MAJOR: MANAGEMENT INFORMATION SYSTEMS",
    "supervisor": "ASSOC. PROF. DR. VÕ THỊ NGỌC CHÂU",
    "student": "VÕ VĂN DŨNG",
    "place": "Ho Chi Minh City, November 2026",
}

# --------------------------------------------------------------------------- inline


def typo(text: str) -> str:
    return text.replace("---", "—").replace("--", "–")


def run(text: str, *, bold=False, italic=False, size: int | None = None, extra="") -> str:
    props = ""
    if bold:
        props += "<w:b/><w:bCs/>"
    if italic:
        props += "<w:i/><w:iCs/>"
    if size:
        props += f'<w:sz w:val="{size}"/><w:szCs w:val="{size}"/>'
    props = extra + props
    rpr = f"<w:rPr>{props}</w:rPr>" if props else ""
    return f'<w:r>{rpr}<w:t xml:space="preserve">{escape(text)}</w:t></w:r>'


class Links:
    def __init__(self) -> None:
        self.rels: dict[str, str] = {}

    def rid(self, url: str) -> str:
        if url not in self.rels:
            self.rels[url] = f"rIdL{len(self.rels) + 1}"
        return self.rels[url]


LINKS = Links()
URL_RE = re.compile(r"https?://[^\s)]+[^\s).,;]")


CODE_FONT = '<w:rFonts w:ascii="Consolas" w:hAnsi="Consolas" w:cs="Consolas"/>'


def inline(text: str, *, size: int | None = None, bold=False, italic=False) -> str:
    """Markdown `code`, **bold**, *italic* and bare URLs to runs."""
    parts = re.split(r"`([^`]+)`", text)
    if len(parts) > 1:
        out = []
        for i, part in enumerate(parts):
            if i % 2:
                code_size = (size or 24) - 2
                out.append(run(part, bold=bold, italic=italic, size=code_size, extra=CODE_FONT))
            elif part:
                out.append(inline(part, size=size, bold=bold, italic=italic))
        return "".join(out)
    out = []
    for bpart_i, bpart in enumerate(re.split(r"\*\*", text)):
        b = bold or bpart_i % 2 == 1
        for ipart_i, ipart in enumerate(re.split(r"(?<![\w*])\*(?!\s)|(?<=[^\s*])\*(?![\w*])", bpart)):
            it = italic or ipart_i % 2 == 1
            pos = 0
            for m in URL_RE.finditer(ipart):
                if m.start() > pos:
                    out.append(run(typo(ipart[pos:m.start()]), bold=b, italic=it, size=size))
                url = m.group(0)
                out.append(
                    f'<w:hyperlink r:id="{LINKS.rid(url)}" w:history="1">'
                    + run(url, italic=it, size=size, extra='<w:rStyle w:val="Hyperlink"/>')
                    + "</w:hyperlink>"
                )
                pos = m.end()
            if pos < len(ipart):
                out.append(run(typo(ipart[pos:]), bold=b, italic=it, size=size))
    return "".join(out)


# --------------------------------------------------------------------------- blocks

BODY_PPR = '<w:spacing w:after="100" w:line="300" w:lineRule="auto"/><w:jc w:val="both"/>'


def para(content: str, ppr: str = BODY_PPR) -> str:
    return f"<w:p><w:pPr>{ppr}</w:pPr>{content}</w:p>"


def page_break() -> str:
    return '<w:p><w:r><w:br w:type="page"/></w:r></w:p>'


def field(instr: str, result: str, rpr: str = "") -> str:
    r = f"<w:rPr>{rpr}</w:rPr>" if rpr else ""
    return (
        f'<w:r>{r}<w:fldChar w:fldCharType="begin"/></w:r>'
        f'<w:r>{r}<w:instrText xml:space="preserve"> {escape(instr)} </w:instrText></w:r>'
        f'<w:r>{r}<w:fldChar w:fldCharType="separate"/></w:r>'
        f'<w:r>{r}<w:t xml:space="preserve">{escape(result)}</w:t></w:r>'
        f'<w:r>{r}<w:fldChar w:fldCharType="end"/></w:r>'
    )


CAPTION_RPR = '<w:i/><w:iCs/><w:sz w:val="21"/><w:szCs w:val="21"/>'
SEQ_COUNT = {"Figure": 0, "Table": 0}


def caption(kind: str, text: str, ppr: str) -> str:
    """'Figure 3. text' with a SEQ field, so Word can list figures and tables."""
    SEQ_COUNT[kind] += 1
    n = SEQ_COUNT[kind]
    body = (
        run(f"{kind} ", italic=True, size=21)
        + field(f"SEQ {kind} \\* ARABIC", str(n), CAPTION_RPR)
        + run(". ", italic=True, size=21)
        + inline(text, size=21, italic=True)
    )
    return f"<w:p><w:pPr>{ppr}</w:pPr>{body}</w:p>"


def front_heading(text: str) -> str:
    """Unnumbered heading of the front matter: new page, bold 14 pt, not in the contents."""
    return (
        '<w:p><w:pPr><w:keepNext/><w:spacing w:after="200"/></w:pPr>'
        '<w:r><w:br w:type="page"/></w:r>' + run(typo(text), bold=True, size=28) + "</w:p>"
    )


def toc_field(instr: str, placeholder: str) -> str:
    return (
        '<w:p><w:pPr><w:pStyle w:val="TOC1"/><w:tabs><w:tab w:val="right" w:leader="dot" w:pos="9628"/></w:tabs></w:pPr>'
        '<w:r><w:fldChar w:fldCharType="begin"/></w:r>'
        f'<w:r><w:instrText xml:space="preserve"> {instr} </w:instrText></w:r>'
        '<w:r><w:fldChar w:fldCharType="separate"/></w:r>'
        + run(placeholder)
        + '<w:r><w:fldChar w:fldCharType="end"/></w:r></w:p>'
    )


def heading(level: int, text: str) -> str:
    return f'<w:p><w:pPr><w:pStyle w:val="Heading{level}"/><w:keepNext/></w:pPr>{run(typo(text))}</w:p>'


class Numbering:
    def __init__(self) -> None:
        self.nums: list[tuple[int, int]] = []  # (numId, abstractId)

    def new(self, ordered: bool) -> int:
        num_id = 100 + len(self.nums)
        self.nums.append((num_id, 2 if ordered else 1))
        return num_id

    def xml(self) -> str:
        parts = []
        for num_id, abs_id in self.nums:
            override = '<w:lvlOverride w:ilvl="0"><w:startOverride w:val="1"/></w:lvlOverride>' if abs_id == 2 else ""
            parts.append(f'<w:num w:numId="{num_id}"><w:abstractNumId w:val="{abs_id}"/>{override}</w:num>')
        return "".join(parts)


NUMBERING = Numbering()


def list_item(text: str, num_id: int, justify: bool = True) -> str:
    ppr = (
        '<w:pStyle w:val="ListParagraph"/>'
        f'<w:numPr><w:ilvl w:val="0"/><w:numId w:val="{num_id}"/></w:numPr>'
        '<w:spacing w:after="60" w:line="300" w:lineRule="auto"/>'
        + ('<w:jc w:val="both"/>' if justify else "")
    )
    return para(inline(text), ppr)


def table(rows: list[list[str]], aligns: list[str], dashes: list[int], title: str | None = None) -> str:
    cap = caption("Table", title, '<w:keepNext/><w:spacing w:before="120" w:after="80"/><w:jc w:val="center"/>') if title else ""
    return cap + _table(rows, aligns, dashes)


def _table(rows: list[list[str]], aligns: list[str], dashes: list[int]) -> str:
    ncol = len(rows[0])
    # column widths (dxa): every column gets at least its longest word (numeric columns their
    # longest cell, so figures never wrap); the space left goes to columns with long text
    per_char, pad = 92, 230
    mins, wants = [], []
    for c in range(ncol):
        texts = [re.sub(r"\*", "", r[c]).strip() for r in rows]
        longest = max(len(t) for t in texts)
        word = max((len(w) for t in texts for w in t.split()), default=3)
        body_longest = max((len(t) for t in texts[1:]), default=0)
        head_word = max((len(w) for w in texts[0].split()), default=3)
        lo = max(per_char * word, 112 * head_word) + pad  # header is bold, hence wider
        if aligns[c] == "right":
            lo = max(lo, per_char * min(body_longest, 22) + pad)
        mins.append(lo)
        wants.append(max(lo, per_char * min(longest, 60) + pad))
    if sum(mins) >= TEXT_WIDTH:
        widths = [m * TEXT_WIDTH / sum(mins) for m in mins]
    else:
        spare = TEXT_WIDTH - sum(mins)
        extra = [w - m for w, m in zip(wants, mins)]
        if sum(extra) <= spare:
            widths = [w + (spare - sum(extra)) * w / sum(wants) for w in wants]
        else:
            widths = [m + spare * e / sum(extra) for m, e in zip(mins, extra)]
    widths = [int(w) for w in widths]
    widths[-1] += TEXT_WIDTH - sum(widths)

    border = "".join(
        f'<w:{side} w:val="single" w:sz="4" w:space="0" w:color="808080"/>' for side in ("top", "left", "bottom", "right")
    )
    margins = (
        '<w:tcMar><w:top w:w="50" w:type="dxa"/><w:left w:w="90" w:type="dxa"/>'
        '<w:bottom w:w="50" w:type="dxa"/><w:right w:w="90" w:type="dxa"/></w:tcMar>'
    )
    xml = [
        '<w:tbl><w:tblPr><w:tblW w:w="9638" w:type="dxa"/><w:tblBorders>'
        + "".join(
            f'<w:{s} w:val="single" w:sz="4" w:space="0" w:color="auto"/>'
            for s in ("top", "left", "bottom", "right", "insideH", "insideV")
        )
        + '</w:tblBorders><w:tblLayout w:type="fixed"/><w:tblCellMar><w:left w:w="10" w:type="dxa"/>'
        '<w:right w:w="10" w:type="dxa"/></w:tblCellMar>'
        '<w:tblLook w:val="04A0" w:firstRow="1" w:lastRow="0" w:firstColumn="1" w:lastColumn="0" w:noHBand="0" w:noVBand="1"/>'
        "</w:tblPr><w:tblGrid>" + "".join(f'<w:gridCol w:w="{w}"/>' for w in widths) + "</w:tblGrid>"
    ]
    for r_i, row in enumerate(rows):
        header = r_i == 0
        trpr = "<w:cantSplit/><w:tblHeader/>" if header else "<w:cantSplit/>"
        cells = []
        for c, cell in enumerate(row):
            shade = '<w:shd w:val="clear" w:color="auto" w:fill="EDEDED"/>' if header else ""
            jc = '<w:jc w:val="right"/>' if aligns[c] == "right" and not header else ""
            if header and aligns[c] == "right":
                jc = '<w:jc w:val="right"/>'
            text = cell.strip()
            # numbered steps written in one cell ("1. ... 2. ..." or "2a. ...") get one line each
            steps = re.split(r" (?=\d+[a-z]?\. [A-Z])", text) if re.match(r"\d+[a-z]?\. ", text) else [text]
            paras = "".join(
                f'<w:p><w:pPr>{jc}{"<w:spacing w:after=\"40\"/>" if len(steps) > 1 else ""}</w:pPr>'
                f"{inline(step, size=19, bold=header)}</w:p>"
                for step in steps
            )
            cells.append(
                f'<w:tc><w:tcPr><w:tcW w:w="{widths[c]}" w:type="dxa"/><w:tcBorders>{border}</w:tcBorders>'
                f"{shade}{margins}</w:tcPr>{paras}</w:tc>"
            )
        xml.append(f"<w:tr><w:trPr>{trpr}</w:trPr>{''.join(cells)}</w:tr>")
    xml.append("</w:tbl>")
    xml.append('<w:p><w:pPr><w:spacing w:after="80"/></w:pPr></w:p>')
    return "".join(xml)


class Images:
    def __init__(self) -> None:
        self.items: list[tuple[str, Path]] = []

    def add(self, path: Path) -> str:
        rid = f"rIdI{len(self.items) + 1}"
        self.items.append((rid, path))
        return rid


IMAGES = Images()
FIG_COUNTER = [0]
# printed width per figure (cm); screenshots full width, charts smaller
FIG_WIDTH = {"tradeoff_3day.png": 12.5, "cpsat_warmstart_2week.png": 12.0}


def png_size(path: Path) -> tuple[int, int]:
    with path.open("rb") as fh:
        head = fh.read(24)
    w, h = struct.unpack(">II", head[16:24])
    return w, h


def figure(alt: str, src: str) -> str:
    path = (HERE / src).resolve()
    rid = IMAGES.add(path)
    FIG_COUNTER[0] += 1
    n = FIG_COUNTER[0]
    pw, ph = png_size(path)
    width_cm = FIG_WIDTH.get(path.name, 16.5)
    cx = int(width_cm * EMU_PER_CM)
    cy = int(cx * ph / pw)
    if cy > 19 * EMU_PER_CM:  # keep tall images on the page
        cy = int(19 * EMU_PER_CM)
        cx = int(cy * pw / ph)
    pic = (
        f'<w:r><w:rPr><w:noProof/></w:rPr><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0">'
        f'<wp:extent cx="{cx}" cy="{cy}"/><wp:effectExtent l="0" t="0" r="0" b="0"/>'
        f'<wp:docPr id="{100 + n}" name="Figure {n}"/>'
        '<wp:cNvGraphicFramePr><a:graphicFrameLocks xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" noChangeAspect="1"/></wp:cNvGraphicFramePr>'
        '<a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">'
        '<pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">'
        f'<pic:nvPicPr><pic:cNvPr id="0" name="{escape(path.name)}"/><pic:cNvPicPr><a:picLocks noChangeAspect="1" noChangeArrowheads="1"/></pic:cNvPicPr></pic:nvPicPr>'
        f'<pic:blipFill><a:blip r:embed="{rid}"/><a:srcRect/><a:stretch><a:fillRect/></a:stretch></pic:blipFill>'
        f'<pic:spPr bwMode="auto"><a:xfrm><a:off x="0" y="0"/><a:ext cx="{cx}" cy="{cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr>'
        "</pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r>"
    )
    img_p = para(pic, '<w:keepNext/><w:spacing w:before="120" w:after="60"/><w:jc w:val="center"/>')
    return img_p + caption("Figure", alt, '<w:spacing w:after="200"/><w:jc w:val="center"/>')


# --------------------------------------------------------------------------- document


def cover() -> str:
    def line(text, size, *, bold=True, italic=False, ppr=""):
        return (
            f"<w:p><w:pPr>{ppr}</w:pPr>"
            + run(text, bold=bold, italic=italic, size=size, extra='<w:rFonts w:eastAsia="Arial"/>')
            + "</w:p>"
        )

    def gap(twips, n=1):
        return "".join(f'<w:p><w:pPr><w:spacing w:line="{twips}" w:lineRule="exact"/></w:pPr></w:p>' for _ in range(n))

    head = '<w:spacing w:line="355" w:lineRule="auto"/><w:ind w:left="420"/><w:jc w:val="center"/>'
    center = '<w:jc w:val="center"/>'
    logo = (
        '<w:p><w:pPr><w:spacing w:line="20" w:lineRule="exact"/></w:pPr><w:r><w:rPr><w:noProof/></w:rPr><w:drawing>'
        '<wp:anchor distT="0" distB="0" distL="114300" distR="114300" simplePos="0" relativeHeight="251659264" behindDoc="1" locked="0" layoutInCell="0" allowOverlap="1">'
        '<wp:simplePos x="0" y="0"/><wp:positionH relativeFrom="column"><wp:posOffset>2325370</wp:posOffset></wp:positionH>'
        '<wp:positionV relativeFrom="paragraph"><wp:posOffset>136525</wp:posOffset></wp:positionV>'
        '<wp:extent cx="1440180" cy="1377315"/><wp:effectExtent l="0" t="0" r="0" b="0"/><wp:wrapNone/><wp:docPr id="9" name="Picture 9"/>'
        '<wp:cNvGraphicFramePr><a:graphicFrameLocks xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" noChangeAspect="1"/></wp:cNvGraphicFramePr>'
        '<a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">'
        '<pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:nvPicPr><pic:cNvPr id="0" name="Picture 9"/>'
        '<pic:cNvPicPr><a:picLocks noChangeAspect="1" noChangeArrowheads="1"/></pic:cNvPicPr></pic:nvPicPr>'
        '<pic:blipFill><a:blip r:embed="rId8"/><a:srcRect/><a:stretch><a:fillRect/></a:stretch></pic:blipFill>'
        '<pic:spPr bwMode="auto"><a:xfrm><a:off x="0" y="0"/><a:ext cx="1440180" cy="1377315"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:noFill/></pic:spPr>'
        "</pic:pic></a:graphicData></a:graphic></wp:anchor></w:drawing></w:r></w:p>"
    )
    people = '<w:tabs><w:tab w:val="left" w:pos="4300"/></w:tabs><w:ind w:left="1500"/>'
    arial = '<w:rFonts w:eastAsia="Arial"/>'
    parts = [
        line(COVER["uni"], 32, ppr=head),
        line(COVER["school"], 32, ppr=head),
        line(COVER["faculty"], 32, ppr=head),
        logo,
        gap(200, 13),
        gap(236),
        line(COVER["kind"], 34, ppr=center),
        gap(295),
        line(COVER["course"], 34, ppr=center),
        gap(200),
        gap(379),
        line(COVER["title"][0], 34, ppr=center),
        line(COVER["title"][1], 34, ppr=center),
        gap(200),
        gap(371, 4),
        line(COVER["major"], 29, bold=False, ppr=center),
        gap(200, 3),
        gap(227, 2),
        f"<w:p><w:pPr>{people}</w:pPr>"
        + run("SUPERVISOR:", bold=True, size=29, extra=arial)
        + "<w:r><w:tab/></w:r>"
        + run(COVER["supervisor"], size=29, extra=arial)
        + "</w:p>",
        f"<w:p><w:pPr>{people}</w:pPr>"
        + run("STUDENT:", bold=True, size=29, extra=arial)
        + "<w:r><w:tab/></w:r>"
        + run(f"{COVER['student']} (2570708)", size=29, extra=arial)
        + "</w:p>",
        gap(200, 17),
        line(COVER["place"], 28, bold=False, italic=True, ppr=center),
    ]
    return "".join(parts)


FIELDS = {
    "[[TOC]]": ('TOC \\o "1-3" \\h \\z \\u', "Update fields to build the table of contents."),
    "[[LOF]]": ('TOC \\h \\z \\c "Figure"', "Update fields to build the list of figures."),
    "[[LOT]]": ('TOC \\h \\z \\c "Table"', "Update fields to build the list of tables."),
}


def body_from_markdown(md: str) -> str:
    """Markdown subset used by the report, plus: '#! Title' (front-matter page),
    '[[TOC]]' / '[[LOF]]' / '[[LOT]]' (generated lists), 'Table: caption' (caption of the
    next table) and '[right] text' (right-aligned line)."""
    lines = md.split("\n")
    out: list[str] = []
    i = 0
    in_references = False
    pending_caption: str | None = None
    while i < len(lines):
        line = lines[i]
        s = line.strip()
        if not s:
            i += 1
            continue
        if s.startswith("#! "):
            out.append(front_heading(s[3:]))
            i += 1
            continue
        if s in FIELDS:
            out.append(toc_field(*FIELDS[s]))
            i += 1
            continue
        if s.startswith("Table: "):
            pending_caption = s[len("Table: "):]
            i += 1
            continue
        if s.startswith("[right] "):
            out.append(para(inline(s[len("[right] "):]), '<w:spacing w:before="120" w:after="60"/><w:jc w:val="right"/>'))
            i += 1
            continue
        if s.startswith("# "):
            out.append(page_break())
            out.append(heading(1, s[2:]))
            in_references = s[2:].strip() == "References"
            i += 1
            continue
        if s.startswith("## "):
            out.append(heading(2, s[3:]))
            i += 1
            continue
        if s.startswith("### "):
            out.append(heading(3, s[4:]))
            i += 1
            continue
        m = re.match(r"!\[(.*)\]\((.+)\)$", s)
        if m:
            out.append(figure(m.group(1), m.group(2)))
            i += 1
            continue
        if s.startswith("|"):
            block = []
            while i < len(lines) and lines[i].strip().startswith("|"):
                block.append(lines[i].strip())
                i += 1
            cells = [[c for c in re.split(r"(?<!\\)\|", r)[1:-1]] for r in block]
            sep = cells[1]
            aligns = ["right" if c.strip().endswith(":") else "left" for c in sep]
            dashes = [c.strip().count("-") for c in sep]
            out.append(table([cells[0]] + cells[2:], aligns, dashes, pending_caption))
            pending_caption = None
            continue
        if re.match(r"[-*] ", s) or re.match(r"\d+\. ", s):
            ordered = bool(re.match(r"\d+\. ", s))
            num_id = NUMBERING.new(ordered)
            while i < len(lines) and (
                (ordered and re.match(r"\d+\. ", lines[i].strip())) or (not ordered and re.match(r"[-*] ", lines[i].strip()))
            ):
                text = re.sub(r"^(\d+\.|[-*]) ", "", lines[i].strip())
                # references stay left-aligned: justified lines with long URLs get wide gaps
                out.append(list_item(text, num_id, justify=not in_references))
                i += 1
            continue
        if s.startswith(">"):
            text = []
            while i < len(lines) and lines[i].strip().startswith(">"):
                text.append(lines[i].strip().lstrip(">").strip())
                i += 1
            ppr = (
                '<w:pBdr><w:left w:val="single" w:sz="12" w:space="8" w:color="999999"/></w:pBdr>'
                '<w:spacing w:before="120" w:after="160" w:line="300" w:lineRule="auto"/>'
                '<w:ind w:left="284" w:right="284"/><w:jc w:val="both"/>'
            )
            note = para(inline(" ".join(text), size=22), ppr)
            out.append(note)
            continue
        # paragraph (consecutive non-empty lines)
        text = [s]
        i += 1
        while i < len(lines) and lines[i].strip() and not re.match(r"(#|\||!\[|[-*] |\d+\. |>|Table: |\[right\] |\[\[)", lines[i].strip()):
            text.append(lines[i].strip())
            i += 1
        joined = " ".join(t.rstrip("\\").strip() for t in text)
        if re.fullmatch(r"\*\*[^*]+\*\*", joined):  # bold sub-heading line
            out.append(
                para(
                    run(typo(joined.strip("*")), bold=True),
                    '<w:keepNext/><w:spacing w:before="120" w:after="60" w:line="300" w:lineRule="auto"/>',
                )
            )
        else:
            out.append(para(inline(joined)))
    return "".join(out)


def main() -> None:
    md = SOURCE.read_text(encoding="utf-8")
    body = body_from_markdown(md)

    tpl = zipfile.ZipFile(TEMPLATE)
    doc = tpl.read("word/document.xml").decode("utf-8")
    head = doc[: doc.find("<w:body>") + len("<w:body>")]
    sect = re.findall(r"<w:sectPr.*?</w:sectPr>", doc, re.S)[-1]
    sect = re.sub(r' w:rsid\w*="[^"]*"', "", sect)
    # page numbers in the footer, none on the cover (first page)
    sect = re.sub(r"(<w:sectPr[^>]*>)", r'\1<w:footerReference w:type="default" r:id="rIdF1"/>', sect, count=1)
    sect = sect.replace("<w:docGrid", "<w:titlePg/><w:docGrid", 1)
    document = head + cover() + body + sect + "</w:body></w:document>"
    footer = (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n'
        '<w:ftr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" '
        'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">'
        '<w:p><w:pPr><w:jc w:val="center"/></w:pPr>'
        + field("PAGE", "1", '<w:sz w:val="22"/><w:szCs w:val="22"/>')
        + "</w:p></w:ftr>"
    )
    content_types = tpl.read("[Content_Types].xml").decode("utf-8")
    if "/word/footer1.xml" not in content_types:
        content_types = content_types.replace(
            "</Types>",
            '<Override PartName="/word/footer1.xml" '
            'ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml"/></Types>',
        )

    # relationships: keep the package parts and the logo; add figures and links
    rels = tpl.read("word/_rels/document.xml.rels").decode("utf-8")
    keep = [
        r for r in re.findall(r"<Relationship [^>]+/>", rels)
        if "/hyperlink" not in r and ("/image" not in r or 'Id="rId8"' in r)
    ]
    for rid, path in IMAGES.items:
        keep.append(
            f'<Relationship Id="{rid}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" '
            f'Target="media/en_{path.name}"/>'
        )
    keep.append(
        '<Relationship Id="rIdF1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer" '
        'Target="footer1.xml"/>'
    )
    for url, rid in LINKS.rels.items():
        keep.append(
            f'<Relationship Id="{rid}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink" '
            f'Target="{escape(url, {chr(34): "&quot;"})}" TargetMode="External"/>'
        )
    rels_xml = (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n'
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' + "".join(keep) + "</Relationships>"
    )

    numbering = tpl.read("word/numbering.xml").decode("utf-8")
    numbering = re.sub(r"<w:num w:numId=.*?</w:num>", "", numbering, flags=re.S)
    numbering = numbering.replace("</w:numbering>", NUMBERING.xml() + "</w:numbering>")

    footnotes = tpl.read("word/footnotes.xml").decode("utf-8")
    footnotes = re.sub(r'<w:footnote w:id="[1-9]\d*">.*?</w:footnote>', "", footnotes, flags=re.S)

    core = tpl.read("docProps/core.xml").decode("utf-8")
    core = re.sub(
        r"<dc:title>.*?</dc:title>|<dc:title/>",
        "<dc:title>Building a Production Scheduling Agent that Produces Reasonable Schedules</dc:title>",
        core,
    )

    OUTPUT.unlink(missing_ok=True)
    with zipfile.ZipFile(OUTPUT, "w", zipfile.ZIP_DEFLATED) as out:
        for item in tpl.infolist():
            name = item.filename
            if name.endswith("/"):
                continue
            if name.startswith("word/media/") and name != "word/media/image1.jpeg":
                continue
            if name == "word/document.xml":
                out.writestr(name, document)
            elif name == "word/_rels/document.xml.rels":
                out.writestr(name, rels_xml)
            elif name == "word/numbering.xml":
                out.writestr(name, numbering)
            elif name == "word/footnotes.xml":
                out.writestr(name, footnotes)
            elif name == "docProps/core.xml":
                out.writestr(name, core)
            elif name == "[Content_Types].xml":
                out.writestr(name, content_types)
            else:
                out.writestr(item, tpl.read(name))
        out.writestr("word/footer1.xml", footer)
        for _rid, path in IMAGES.items:
            out.write(path, f"word/media/en_{path.name}")
    print(
        f"wrote {OUTPUT.name}: {SEQ_COUNT['Figure']} figures, {SEQ_COUNT['Table']} captioned tables, "
        f"{len(NUMBERING.nums)} lists, {len(LINKS.rels)} links"
    )


if __name__ == "__main__":
    main()
