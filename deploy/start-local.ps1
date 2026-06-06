param(
  [switch]$Build
)

$ErrorActionPreference = "Stop"
$deployDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $deployDir

if (-not (Test-Path ".env")) {
  Copy-Item ".env.local.example" ".env"
  Write-Host "已创建 deploy/.env，请按需填写微信、支付、密码等配置。" -ForegroundColor Yellow
}

$composeArgs = @("compose", "up", "-d")
if ($Build) {
  $composeArgs += "--build"
}

docker @composeArgs

Write-Host ""
Write-Host "本地准生产部署已启动：" -ForegroundColor Green
Write-Host "管理后台: http://localhost"
Write-Host "后端健康检查: http://localhost:8080/api/health"
Write-Host "Prometheus: http://localhost:9090"
Write-Host "Grafana: http://localhost:3000"
