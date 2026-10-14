# Starts the Vite dev server on 19000; .\stop.ps1 stops it from another window.
$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot
$runFile = Join-Path $PSScriptRoot '.running.json'

if (-not (Get-Command node -ErrorAction SilentlyContinue)) { throw 'node is not on PATH.' }
if (-not (Test-Path node_modules\vite\bin\vite.js)) { throw 'Dependencies are not installed. Run `pnpm install` first.' }
if (Get-NetTCPConnection -LocalPort 19000 -State Listen -ErrorAction SilentlyContinue) {
    throw 'Port 19000 is already in use. If this app holds it, run .\stop.ps1 first.'
}
node scripts/link-library.mjs
if ($LASTEXITCODE -ne 0) { throw 'Could not link the component library.' }

$server = Start-Process node -NoNewWindow -PassThru -ArgumentList 'node_modules/vite/bin/vite.js'
@{ ProcessId = $server.Id; StartTicks = $server.StartTime.Ticks } | ConvertTo-Json | Set-Content -LiteralPath $runFile
try {
    while (-not $server.HasExited) { Start-Sleep -Milliseconds 500 }
} finally {
    if (-not $server.HasExited) { taskkill /F /T /PID $server.Id 2>&1 | Out-Null }
    Remove-Item -LiteralPath $runFile -ErrorAction SilentlyContinue
}
