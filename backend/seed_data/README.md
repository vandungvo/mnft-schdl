# Bundled database snapshots

`riverside_demo.db` is the English demo plant "Riverside Alloy Wheels - Plant 1" used by the user
guide and the demo video: 156 orders (9 Nov 2026 - 2 Jan 2027), period "Weeks 46-47" generated,
committed and closed, period "Weeks 48-49" rolled over and ready to plan, factory version 2 (a
third CNC lathe from 7 Dec 2026).

It was produced by `research/demo_video/seed_demo.py` on an empty database and compacted with
`VACUUM INTO`. The Render deployment copies it into place whenever the container starts without
a database (`MNFT_SEED_DATABASE`, see `backend/docker-entrypoint.sh` and `render.yaml`);
migrations run afterwards, so an older snapshot is upgraded automatically.

To refresh it: start the demo backend with `research/demo_video/start_demo.ps1 -Reset`, run
`seed_demo.py`, stop the backend, then `VACUUM INTO` the demo database to this path.
