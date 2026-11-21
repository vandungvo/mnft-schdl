"""Voice-over with Microsoft's neural voices (Edge read-aloud service, via the edge-tts package).

    python tts_edge.py --script W/narration.json --out W/audio [--voice en-US-AndrewNeural] [--rate +0%]

Much more natural than the offline Windows voices (tts.ps1), but the narration text is sent to
Microsoft's service. Writes W/audio/<scene>.wav (16-bit mono PCM, 24 kHz) like tts.ps1, so
record_demo.py and build_video.py work unchanged. Needs: pip install edge-tts imageio-ffmpeg
"""

from __future__ import annotations

import argparse
import asyncio
import json
import re
import subprocess
from pathlib import Path

import edge_tts
import imageio_ffmpeg

# The neural voices read most of the text well; only spell the acronyms they would say as words.
SAY = [
    (r"\bCP-SAT\b", "C P SAT"),
    (r"\bEDD\b", "E D D"),
    (r"\bSPT\b", "S P T"),
    (r"\bKPIs\b", "K P Is"),
    (r"\bT6\b", "T 6"),
]


def speakable(text: str) -> str:
    for pattern, replacement in SAY:
        text = re.sub(pattern, replacement, text)
    return text


async def synth(text: str, voice: str, rate: str, mp3: Path) -> None:
    for attempt in range(6):
        try:
            await edge_tts.Communicate(text, voice, rate=rate).save(str(mp3))
            if mp3.stat().st_size > 1000:
                return
        except Exception as exc:  # noqa: BLE001 - flaky network: retry
            print(f"  retry {attempt + 1}: {exc}")
        await asyncio.sleep(2 + attempt * 2)
    raise SystemExit(f"could not synthesise {mp3.name}")


async def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--script", type=Path, required=True)
    parser.add_argument("--out", type=Path, required=True)
    parser.add_argument("--voice", default="en-US-AndrewNeural")
    parser.add_argument("--rate", default="+0%")
    args = parser.parse_args()
    args.out.mkdir(parents=True, exist_ok=True)
    ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()
    for item in json.loads(args.script.read_text(encoding="utf-8")):
        mp3 = args.out / f"{item['id']}.mp3"
        wav = args.out / f"{item['id']}.wav"
        await synth(speakable(item.get("raw") or item["text"]), args.voice, args.rate, mp3)
        # Trim the service's leading/trailing silence a little, convert to the pipeline's format.
        subprocess.run([ffmpeg, "-loglevel", "error", "-y", "-i", str(mp3),
                        "-af", "silenceremove=start_periods=1:start_threshold=-50dB,areverse,"
                               "silenceremove=start_periods=1:start_threshold=-50dB,areverse,apad=pad_dur=0.15",
                        "-ac", "1", "-ar", "24000", "-sample_fmt", "s16", str(wav)], check=True)
        mp3.unlink()
        print(item["id"], flush=True)


if __name__ == "__main__":
    asyncio.run(main())
