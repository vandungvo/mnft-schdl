"""Assemble the recorded demo into an MP4: screen frames + voice-over + subtitles.

    python build_video.py --work W --out W/planwise-demo.mp4 [--ffmpeg path]

Reads W/timeline.json and W/frames/ (record_demo.py) and W/audio/<scene>.wav (tts.ps1).
Writes, next to the MP4: <name>.srt (soft subtitles), and in W: subs.ass, voice.wav, frames.txt.

Layout: the 1920x960 app is placed on a 1920x1080 canvas; the 120 px band below it holds the
subtitles (centre), the chapter name (left) and a small product label (right). Waiting for the
solver (cuts in the timeline) is played as a ~1.6 s fast-forward with a caption.
"""

from __future__ import annotations

import argparse
import array
import json
import math
import re
import shutil
import subprocess
import textwrap
import wave
from pathlib import Path

W, H, APP_H = 1920, 1080, 960
FPS = 30
CUT_SECONDS = 1.6  # how long a skipped wait lasts on screen
LEAD_IN, TAIL = 0.4, 1.4
BAND = "0x0f172a"  # slate-900


# ---------------------------------------------------------------- timeline mapping


class Clock:
    """Maps wall-clock recording time to video time, compressing the cuts."""

    def __init__(self, begin: float, cuts: list[dict]) -> None:
        self.begin = begin
        self.cuts = sorted(cuts, key=lambda c: c["start"])

    def __call__(self, t: float) -> float:
        out = t - self.begin
        for c in self.cuts:
            length = c["end"] - c["start"]
            if t >= c["end"]:
                out -= length - CUT_SECONDS
            elif t > c["start"]:
                out -= (t - c["start"]) * (1 - CUT_SECONDS / length)
        return out


# ---------------------------------------------------------------- subtitles


def cues_for(text: str, start: float, duration: float, width: int = 66) -> list[tuple[float, float, list[str]]]:
    sentences = [s for s in re.split(r"(?<=[.!?])\s+", text.strip()) if s]
    blocks: list[list[str]] = []
    for sentence in sentences:
        lines = textwrap.wrap(sentence, width=width)
        for i in range(0, len(lines), 2):
            blocks.append(lines[i:i + 2])
    weights = [sum(len(line) for line in b) + 8 for b in blocks]
    total = sum(weights)
    cues, t = [], start
    for block, weight in zip(blocks, weights, strict=True):
        span = max(1.0, duration * weight / total)
        cues.append((t, t + span, block))
        t += span
    return cues


def ass_time(t: float) -> str:
    t = max(0.0, t)
    cs = int(round(t * 100))
    return f"{cs // 360000}:{cs // 6000 % 60:02d}:{cs // 100 % 60:02d}.{cs % 100:02d}"


def srt_time(t: float) -> str:
    ms = int(round(max(0.0, t) * 1000))
    return f"{ms // 3600000:02d}:{ms // 60000 % 60:02d}:{ms // 1000 % 60:02d},{ms % 1000:03d}"


def ass_escape(text: str) -> str:
    return text.replace("\\", "\\\\").replace("{", "(").replace("}", ")")


ASS_HEADER = f"""[Script Info]
ScriptType: v4.00+
PlayResX: {W}
PlayResY: {H}
WrapStyle: 2
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Sub,Segoe UI,36,&H00FFFFFF,&H00FFFFFF,&H00000000,&H00000000,0,0,0,0,100,100,0,0,1,0,0,2,330,330,22,1
Style: Chapter,Segoe UI Semibold,23,&H00F5C77E,&H00FFFFFF,&H00000000,&H00000000,0,0,0,0,100,100,0,0,1,0,0,7,30,30,{APP_H + 20},1
Style: Brand,Segoe UI,21,&H00B8A394,&H00FFFFFF,&H00000000,&H00000000,0,0,0,0,100,100,0,0,1,0,0,9,30,30,{APP_H + 22},1
Style: Note,Segoe UI Semibold,32,&H0047C8FF,&H00FFFFFF,&H40180F0F,&H40180F0F,0,0,0,0,100,100,0,0,3,14,0,2,330,330,{H - APP_H + 40},1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""


# ---------------------------------------------------------------- audio


def read_wav(path: Path) -> tuple[array.array, int, int]:
    with wave.open(str(path)) as w:
        if w.getsampwidth() != 2:
            raise SystemExit(f"{path}: expected 16-bit PCM")
        data = array.array("h", w.readframes(w.getnframes()))
        return data, w.getframerate(), w.getnchannels()


# ---------------------------------------------------------------- main


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--work", type=Path, required=True)
    parser.add_argument("--out", type=Path, required=True)
    parser.add_argument("--ffmpeg", default=None)
    parser.add_argument("--crf", type=int, default=20)
    args = parser.parse_args()
    work: Path = args.work.resolve()
    out: Path = args.out.resolve()
    ffmpeg = args.ffmpeg or shutil.which("ffmpeg")
    if not ffmpeg:
        import imageio_ffmpeg  # bundled static ffmpeg (pip install imageio-ffmpeg)

        ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()

    tl = json.loads((work / "timeline.json").read_text())
    scenes, cuts = tl["scenes"], tl["cuts"]
    frames = sorted((ts, name) for ts, name in tl["frames"])
    begin = scenes[0]["start"] - LEAD_IN
    clock = Clock(begin, cuts)
    total = clock(scenes[-1]["end"]) + TAIL

    # ---- frames: concat list with per-frame durations
    timed: list[tuple[float, str]] = []
    before = [f for f in frames if f[0] <= begin]
    if before:
        timed.append((0.0, before[-1][1]))
    for ts, name in frames:
        if ts <= begin:
            continue
        mt = clock(ts)
        if mt >= total:
            break
        if timed and mt - timed[-1][0] < 1 / (FPS * 2):
            timed[-1] = (timed[-1][0], name)  # same output frame: keep the newest
        else:
            timed.append((mt, name))
    if not timed:
        raise SystemExit("no frames in the recorded range")
    timed[0] = (0.0, timed[0][1])
    lines = []
    for (t, name), nxt in zip(timed, [*timed[1:], (total, None)], strict=True):
        lines.append(f"file 'frames/{name}'\nduration {max(nxt[0] - t, 0.001):.4f}")
    lines.append(f"file 'frames/{timed[-1][1]}'")
    (work / "frames.txt").write_text("\n".join(lines) + "\n", encoding="utf-8")

    # ---- voice track
    rate = channels = None
    voice: array.array | None = None
    durations: dict[str, float] = {}
    for scene in scenes:
        data, sr, ch = read_wav(work / "audio" / f"{scene['id']}.wav")
        if voice is None:
            rate, channels = sr, ch
            voice = array.array("h", bytes(2 * ch * int(math.ceil(total * sr))))
        if (sr, ch) != (rate, channels):
            raise SystemExit("all narration files must share sample rate and channels")
        durations[scene["id"]] = len(data) / (sr * ch)
        offset = int(clock(scene["start"]) * sr) * ch
        for i, sample in enumerate(data):
            j = offset + i
            if j >= len(voice):
                break
            voice[j] = max(-32768, min(32767, voice[j] + sample))
    assert voice is not None and rate and channels
    with wave.open(str(work / "voice.wav"), "wb") as w:
        w.setnchannels(channels)
        w.setsampwidth(2)
        w.setframerate(rate)
        w.writeframes(voice.tobytes())

    # ---- subtitles (ASS burned in, SRT alongside)
    events, srt = [], []
    for scene in scenes:
        t0 = clock(scene["start"])
        for a, b, block in cues_for(scene["text"], t0, durations[scene["id"]]):
            text = r"\N".join(ass_escape(line) for line in block)
            events.append(f"Dialogue: 0,{ass_time(a)},{ass_time(b)},Sub,,0,0,0,,{text}")
            srt.append((a, b, "\n".join(block)))
    # chapter label for each run of scenes with the same chapter
    chapters: list[tuple[str, float, float]] = []
    for scene in scenes:
        a, b = clock(scene["start"]), clock(scene["end"])
        if chapters and chapters[-1][0] == scene["chapter"]:
            chapters[-1] = (scene["chapter"], chapters[-1][1], b)
        else:
            chapters.append((scene["chapter"], a, b))
    for i, (name, a, b) in enumerate(chapters):
        end = chapters[i + 1][1] if i + 1 < len(chapters) else total
        events.append(f"Dialogue: 0,{ass_time(a)},{ass_time(end)},Chapter,,0,0,0,,{i + 1}/{len(chapters)}  {ass_escape(name)}")
    events.append(f"Dialogue: 0,{ass_time(0)},{ass_time(total)},Brand,,0,0,0,,PlanWise · feature demo")
    for cut in cuts:
        a = clock(cut["start"])
        events.append(f"Dialogue: 1,{ass_time(a)},{ass_time(a + CUT_SECONDS + 0.6)},Note,,0,0,0,,{ass_escape('⏩  ' + cut['caption'])}")
        srt.append((a, a + CUT_SECONDS + 0.6, f"[{cut['caption']}]"))
    (work / "subs.ass").write_text(ASS_HEADER + "\n".join(events) + "\n", encoding="utf-8-sig")
    srt.sort(key=lambda c: c[0])
    srt_text = "\n".join(f"{i}\n{srt_time(a)} --> {srt_time(b)}\n{text}\n" for i, (a, b, text) in enumerate(srt, 1))
    out.parent.mkdir(parents=True, exist_ok=True)
    out.with_suffix(".srt").write_text(srt_text, encoding="utf-8")

    # ---- fonts for libass (static ffmpeg builds have no system font config)
    fonts = work / "fonts"
    fonts.mkdir(exist_ok=True)
    for name in ("segoeui.ttf", "seguisb.ttf", "segoeuii.ttf", "seguisym.ttf"):
        src = Path("C:/Windows/Fonts") / name
        if src.exists() and not (fonts / name).exists():
            shutil.copy(src, fonts / name)

    vf = (f"[0:v]fps={FPS},pad={W}:{H}:0:0:color={BAND},ass=subs.ass:fontsdir=fonts,"
          f"fade=t=in:st=0:d=0.6,fade=t=out:st={total - 0.9:.2f}:d=0.9,"
          f"scale=out_range=tv,format=yuv420p[v]")  # JPEG frames are full range; players expect TV range
    af = f"[1:a]loudnorm=I=-16:TP=-1.5:LRA=11,afade=t=out:st={total - 0.9:.2f}:d=0.9,aresample=48000[a]"
    cmd = [ffmpeg, "-hide_banner", "-loglevel", "warning", "-stats", "-y",
           "-f", "concat", "-safe", "0", "-i", "frames.txt", "-i", "voice.wav",
           "-filter_complex", f"{vf};{af}", "-map", "[v]", "-map", "[a]",
           "-c:v", "libx264", "-preset", "medium", "-crf", str(args.crf), "-r", str(FPS), "-color_range", "tv",
           "-c:a", "aac", "-b:a", "160k", "-t", f"{total:.2f}", "-movflags", "+faststart", str(out)]
    print(f"video {total:.1f}s, {len(timed)} distinct frames, {len(scenes)} scenes, {len(cuts)} cuts")
    subprocess.run(cmd, cwd=work, check=True)
    print(out)


if __name__ == "__main__":
    main()
