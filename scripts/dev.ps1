# Local development: backend in a separate window, frontend in this one.
# Usage (from anywhere): powershell -ExecutionPolicy Bypass -File scripts/dev.ps1
# Ctrl+C stops the frontend and closes the backend window.
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

$env:MNFT_DATABASE_URL = "sqlite:///./data/mnft.db"
$env:MNFT_DATABASE_AUTO_CREATE = "false"

python -m alembic -c backend/alembic.ini upgrade head
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

# The child window inherits the MNFT_* variables set above.
$backend = Start-Process powershell -PassThru -WorkingDirectory $root -ArgumentList @(
    "-NoExit", "-Command", "python -m uvicorn backend.app.main:app --reload --port 8000"
)

try {
    Set-Location (Join-Path $root "frontend")
    if (-not (Test-Path "node_modules")) { npm.cmd ci }
    if (-not (Test-Path ".env.local")) { Copy-Item .env.example .env.local }
    Write-Host "Web: http://localhost:3000  |  API docs: http://localhost:8000/api/v1/docs"
    npm.cmd run dev
}
finally {
    # uvicorn --reload spawns child processes, so stop the whole tree.
    taskkill /T /F /PID $backend.Id | Out-Null
    Set-Location $root
}
