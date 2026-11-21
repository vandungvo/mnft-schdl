# Separate demo instance (never touches data/mnft.db): backend :8100 + production frontend :3100.
# Usage: powershell -ExecutionPolicy Bypass -File research/demo_video/start_demo.ps1 -Work <dir> [-Reset|-Restore] [-Part backend|frontend]
#   <dir>\demo-data\demo.db     demo database (recreated with -Reset)
#   <dir>\frontend-demo         copy of frontend/ built with NEXT_PUBLIC_API_URL=http://localhost:8100/api/v1
param(
    [Parameter(Mandatory = $true)][string]$Work,
    [switch]$Reset,
    [switch]$Restore,   # start from <dir>\demo-data\demo-seeded.db (snapshot taken after seed_demo.py)
    [ValidateSet("backend", "frontend")][string]$Part = "backend"
)
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
Set-Location $root

if ($Part -eq "backend") {
    $db = Join-Path $Work "demo-data\demo.db"
    New-Item -ItemType Directory -Force (Split-Path $db) | Out-Null
    # A killed backend leaves its write-ahead log behind; SQLite would replay it onto the fresh file.
    if ($Reset -or $Restore) { Remove-Item "$db-wal", "$db-shm" -ErrorAction SilentlyContinue }
    if ($Reset -and (Test-Path $db)) { Remove-Item $db }
    if ($Restore) { Copy-Item (Join-Path $Work "demo-data\demo-seeded.db") $db -Force }
    $env:MNFT_DATABASE_URL = "sqlite:///" + ($db -replace '\\', '/')
    $env:MNFT_DATABASE_AUTO_CREATE = "false"
    $env:MNFT_BOOTSTRAP_FACTORY = "false"        # the English plant comes from seed_demo.py
    $env:MNFT_BOOTSTRAP_STANDARD_DATA = "true"   # 4-stage JSON scenario for the Advanced pages
    $env:MNFT_CORS_ORIGINS = '["http://localhost:3100"]'
    python -m alembic -c backend/alembic.ini upgrade head
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
    python -m uvicorn backend.app.main:app --port 8100
}
else {
    $app = Join-Path $Work "frontend-demo"
    $standalone = Join-Path $app ".next\standalone"
    # The standalone server serves static assets only from its own folder.
    robocopy (Join-Path $app ".next\static") (Join-Path $standalone ".next\static") /MIR /NFL /NDL /NJH /NJS | Out-Null
    if (Test-Path (Join-Path $app "public")) {
        robocopy (Join-Path $app "public") (Join-Path $standalone "public") /MIR /NFL /NDL /NJH /NJS | Out-Null
    }
    $env:PORT = "3100"
    $env:HOSTNAME = "localhost"
    node (Join-Path $standalone "server.js")
}
