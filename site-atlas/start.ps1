# Starts the dev server on 19010, or with -Prod serves the production build on 19011 (-Build builds
# it first), and opens it in the browser (-NoBrowser to skip); .\stop.ps1 stops it from another
# window.
param([switch]$Prod, [switch]$Build, [switch]$NoBrowser)
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
if ($Build) {
    node node_modules/vinext/dist/cli.js build
    if ($LASTEXITCODE -ne 0) { throw "Build failed (exit $LASTEXITCODE)." }
}
if ($Prod -and -not (Test-Path dist)) { throw 'Not built. Run .\start.ps1 -Prod -Build.' }

if (-not $NoBrowser) {
    # Open the page once it answers; the job ends with this script.
    $null = Start-ThreadJob -ArgumentList "http://127.0.0.1:$port/" -ScriptBlock {
        param($url)
        for ($i = 0; $i -lt 240; $i++) {
            try { $null = Invoke-WebRequest $url -UseBasicParsing -TimeoutSec 2; Start-Process $url; return }
            catch { if ($_.Exception.Response) { Start-Process $url; return } }
            Start-Sleep -Milliseconds 500
        }
    }
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
