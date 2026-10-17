# Starts the Vite dev server on 19000, or with -Prod serves the production build on 19001
# (-Build builds it first), and opens it in the browser (-NoBrowser to skip); .\stop.ps1 stops it
# from another window.
param([switch]$Prod, [switch]$Build, [switch]$NoBrowser)
$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot
$runFile = Join-Path $PSScriptRoot '.running.json'
$port = if ($Prod) { 19001 } else { 19000 }

if (-not (Get-Command node -ErrorAction SilentlyContinue)) { throw 'node is not on PATH.' }
if (-not (Test-Path node_modules\vite\bin\vite.js)) { throw 'Dependencies are not installed. Run `pnpm install` first.' }
if (Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue) {
    throw "Port $port is already in use. If this app holds it, run .\stop.ps1 first."
}
if ($Build) {
    if (-not (Get-Command pnpm -ErrorAction SilentlyContinue)) { throw 'pnpm is not on PATH.' }
    pnpm build
    if ($LASTEXITCODE -ne 0) { throw "Build failed (exit $LASTEXITCODE)." }
} else {
    node scripts/link-library.mjs
    if ($LASTEXITCODE -ne 0) { throw 'Could not link the component library.' }
}
if ($Prod -and -not (Test-Path dist\index.html)) { throw 'Not built. Run .\start.ps1 -Prod -Build.' }

$viteArgs = @('node_modules/vite/bin/vite.js') + $(if ($Prod) { @('preview') } else { @() })
if (-not $NoBrowser) { $viteArgs += '--open' }
$server = Start-Process node -NoNewWindow -PassThru -ArgumentList $viteArgs
@{ ProcessId = $server.Id; StartTicks = $server.StartTime.Ticks } | ConvertTo-Json | Set-Content -LiteralPath $runFile
try {
    while (-not $server.HasExited) { Start-Sleep -Milliseconds 500 }
} finally {
    if (-not $server.HasExited) { taskkill /F /T /PID $server.Id 2>&1 | Out-Null }
    Remove-Item -LiteralPath $runFile -ErrorAction SilentlyContinue
}
