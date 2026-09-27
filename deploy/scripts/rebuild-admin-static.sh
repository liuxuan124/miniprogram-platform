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
# 小内存 VPS 上 vue-tsc + vite 易被 OOM Kill；本地已 tsc 时可只跑 vite
export NODE_OPTIONS="${NODE_OPTIONS:---max-old-space-size=3072}"
if [[ "${ADMIN_BUILD_SKIP_TSC:-}" == "1" ]]; then
  npx vite build
else
  npm run build
fi

mkdir -p "$STATIC"
rsync -a --delete dist/ "$STATIC/"
echo "[admin-static] OK -> $STATIC (version label baked at build time)"
