# 本地非 Docker 启动脚本：用于当前机器未安装 Docker 时的开发联调。
# 后端: http://localhost:8080
# 管理后台: http://localhost:3000

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)

$nodeDir = "D:\programming\Dev Config\nodejs"
if (Test-Path $nodeDir) {
  $env:PATH = "$nodeDir;$env:PATH"
}

Write-Host "启动后端 Spring Boot..." -ForegroundColor Green
Start-Process powershell.exe -WindowStyle Hidden -ArgumentList @(
  "-NoExit",
  "-Command",
  "Set-Location '$root\backend'; mvn spring-boot:run"
)

Write-Host "启动管理后台 Vite..." -ForegroundColor Green
Start-Process powershell.exe -WindowStyle Hidden -ArgumentList @(
  "-NoExit",
  "-Command",
  "`$env:PATH='$nodeDir;' + `$env:PATH; Set-Location '$root\admin'; npm run dev -- --host 0.0.0.0"
)

Write-Host ""
Write-Host "本地开发联调服务启动中：" -ForegroundColor Green
Write-Host "管理后台: http://localhost:3000"
Write-Host "后端健康检查: http://localhost:8080/api/health"
Write-Host ""
Write-Host "注意：8080 是后端接口，不是后台页面入口。"
