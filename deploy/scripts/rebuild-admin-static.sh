#!/usr/bin/env bash
# 构建 admin 并同步到 admin-static（生产 nginx 静态目录）
set -euo pipefail

PROJECT="${1:-/opt/miniprogram-platform}"
ADMIN="$PROJECT/admin"
STATIC="$PROJECT/admin-static"

if [[ ! -d "$ADMIN" ]]; then
  echo "[admin-static] ERROR: 未找到 $ADMIN"
  exit 1
fi

cd "$ADMIN"
if [[ -f package-lock.json ]]; then
  npm ci --prefer-offline || npm install
else
  npm install
fi
npm run build

mkdir -p "$STATIC"
rsync -a --delete dist/ "$STATIC/"
echo "[admin-static] OK -> $STATIC (version label baked at build time)"
