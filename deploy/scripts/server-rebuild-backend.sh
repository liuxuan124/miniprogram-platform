#!/usr/bin/env bash
# 原生 systemd 部署：mvn 构建后必须覆盖 app.jar（服务读的是 app.jar，不是 target/）
set -euo pipefail

PROJECT="${1:-/opt/miniprogram-platform}"
cd "$PROJECT/backend"

mvn -q -DskipTests package
JAR=$(ls target/*.jar | head -1)
cp "$JAR" app.jar
sudo systemctl restart miniprogram-backend.service

sleep 6
curl -sf "http://127.0.0.1:8080/api/health" >/dev/null
echo "backend restarted with $(basename "$JAR") -> app.jar"
