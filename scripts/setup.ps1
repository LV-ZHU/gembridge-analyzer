$ErrorActionPreference = 'Stop'
node -v
npm.cmd install
npm.cmd test
npm.cmd link
$npmGlobal = (npm.cmd prefix -g).Trim()
Remove-Item -LiteralPath (Join-Path $npmGlobal 'gb.ps1') -Force -ErrorAction SilentlyContinue
Remove-Item -LiteralPath (Join-Path $npmGlobal 'gembridge.ps1') -Force -ErrorAction SilentlyContinue
Write-Host "Ready. You can now run: gb help"
