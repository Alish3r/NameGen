# NameGen - Run install, test, CLI, and web dev
# Requires Node.js 18+ (install from https://nodejs.org or: winget install OpenJS.NodeJS.LTS)

Set-Location $PSScriptRoot

Write-Host "Installing root dependencies..." -ForegroundColor Cyan
npm install
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "`nInstalling web dependencies..." -ForegroundColor Cyan
Set-Location web
npm install
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
Set-Location ..

Write-Host "`nRunning tests..." -ForegroundColor Cyan
npm test
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "`nRunning CLI (count=20, length=4, seed=123)..." -ForegroundColor Cyan
npm run cli -- --count 20 --length 4 --seed 123 --minScore 70

Write-Host "`nStarting web dev server..." -ForegroundColor Cyan
Set-Location web
npm run dev
