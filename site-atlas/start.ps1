# Starts the dev server on 19010, or with -Prod builds and serves production on 19011;
# .\stop.ps1 stops it from another window.
param([switch]$Prod)
$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot
$runFile = Join-Path $PSScriptRoot '.running.json'
$port = if ($Prod) { 19011 } else { 19010 }

if (-not (Get-Command node -ErrorAction SilentlyContinue)) { throw 'node is not on PATH.' }
if (-not (Test-Path node_modules\vinext\dist\cli.js)) { throw 'Dependencies are not installed. Run `pnpm install` first.' }
if (Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue) {
    throw "Port $port is already in use. If this app holds it, run .\stop.ps1 first."
}
node scripts/link-sites.mjs
if ($LASTEXITCODE -ne 0) { throw 'Could not link the sites.' }
if ($Prod) {
    node node_modules/vinext/dist/cli.js build
    if ($LASTEXITCODE -ne 0) { throw "Build failed (exit $LASTEXITCODE)." }
}

$command = if ($Prod) { 'start' } else { 'dev' }
$server = Start-Process node -NoNewWindow -PassThru `
    -ArgumentList 'node_modules/vinext/dist/cli.js', $command, '--hostname', '127.0.0.1', '--port', $port
@{ ProcessId = $server.Id; StartTicks = $server.StartTime.Ticks } | ConvertTo-Json | Set-Content -LiteralPath $runFile
try {
    while (-not $server.HasExited) { Start-Sleep -Milliseconds 500 }
} finally {
    if (-not $server.HasExited) { taskkill /F /T /PID $server.Id 2>&1 | Out-Null }
    Remove-Item -LiteralPath $runFile -ErrorAction SilentlyContinue
}
