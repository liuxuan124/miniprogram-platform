$ErrorActionPreference = "Stop"
$deployDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $deployDir

docker compose --env-file ".env" down

Write-Host "本地准生产部署已停止。" -ForegroundColor Green
