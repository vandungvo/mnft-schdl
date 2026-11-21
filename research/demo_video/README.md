# research/demo_video — narrated feature demo of PlanWise

Records an English, narrated, subtitled video of every main feature of the app, on a separate
demo instance with realistic data. Not part of the product (not built into Docker).

| File | Role |
|---|---|
| `seed_demo.py` | Builds the demo plant through the public API: *Riverside Alloy Wheels – Plant 1* (5 stages, 9 machines with real names, 3 shifts Mon–Sat, holidays, weekly maintenance, 3 policies, version 2 adds CNC lathe 3 from 7 Dec), 156 orders 9 Nov 2026 → 2 Jan 2027 (OEM, aftermarket and export customers, a rush order every Tuesday), period *Weeks 46-47* generated, committed and closed, period *Weeks 48-49* rolled over from it. Writes `new_orders.csv` (imported on camera). Machine data comes from `dataset/wheel-factory-2weeks`; customers and names are fictional. |
| `start_demo.ps1` | Backend on :8100 with its own SQLite file and frontend production build on :3100. Never touches `data/mnft.db`. `-Reset` = empty DB, `-Restore` = back to the seeded snapshot. |
| `record_demo.py` | The story (46 scenes, ~9 min). Playwright drives Chrome headless at 1920×960 with a visible cursor; frames come from the DevTools screencast. `--narration-only` writes the narration, `--dry` checks the script with a screenshot per scene. |
| `tts_edge.py` | Voice-over with Microsoft's neural voices (default `en-US-AndrewNeural`) through `edge-tts`: natural sounding, but the narration text is sent to Microsoft's online service. Used for the current video. |
| `tts.ps1` | Offline fallback: built-in Windows OneCore voices (robotic, nothing leaves the machine). |
| `build_video.py` | Frames + voice + subtitles → MP4 (1920×1080, subtitles burned into a band under the app) and an `.srt` file. |

## Making the video

Requirements: Python with the backend dependencies, Node (frontend already installed), Google Chrome,
and a venv with `pip install playwright imageio-ffmpeg` (Chrome is used through `channel="chrome"`,
so `playwright install` is not needed). `W` is any work folder.

```powershell
# 1. demo frontend: a copy of frontend/ built against the demo API
robocopy frontend W\frontend-demo /E /XD node_modules .next
robocopy frontend\node_modules W\frontend-demo\node_modules /MIR /MT:16
Set-Content W\frontend-demo\.env.local "NEXT_PUBLIC_API_URL=http://localhost:8100/api/v1"
cd W\frontend-demo; npm run build; cd -

# 2. demo backend + frontend (two terminals), then the data
powershell -File research/demo_video/start_demo.ps1 -Work W -Reset -Part backend
powershell -File research/demo_video/start_demo.ps1 -Work W -Part frontend
python research/demo_video/seed_demo.py --out W\demo-data
python -c "import sqlite3; s=sqlite3.connect(r'W\demo-data\demo.db'); d=sqlite3.connect(r'W\demo-data\demo-seeded.db'); s.backup(d)"

# 3. narration and voice
venv\Scripts\python research/demo_video/record_demo.py --work W --narration-only
venv\Scripts\python research/demo_video/tts_edge.py --script W\narration.json --out W\audio   # pip install edge-tts
# offline instead: powershell -File research/demo_video/tts.ps1 -Script W\narration.json -OutDir W\audio -Voice "Microsoft Mark"

# 4. record (restart the backend with -Restore before every take: the story changes the data)
venv\Scripts\python research/demo_video/record_demo.py --work W
venv\Scripts\python research/demo_video/build_video.py --work W --out W\planwise-demo.mp4
```

Notes
- Scripts call the API on `127.0.0.1`: on Windows `localhost` can try IPv6 first and stall on every request.
- A killed backend leaves `demo.db-wal`; `start_demo.ps1 -Restore` deletes it, otherwise SQLite replays it onto the snapshot.
- Waiting for the solver is cut down to a 1.6 s fast-forward with a caption; everything else is real time.
- To change the wording, edit `NARRATION` in `record_demo.py` (subtitle text), and `SAY` in `tts_edge.py` / `record_demo.py` (how each voice pronounces acronyms), then redo steps 3–4. A new voice changes the clip lengths, so record again rather than only swapping the audio: scenes wait for their narration.
- The Edge service sometimes answers with no audio; `tts_edge.py` retries each clip up to 6 times.
