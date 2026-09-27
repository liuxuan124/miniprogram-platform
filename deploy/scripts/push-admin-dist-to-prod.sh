#!/usr/bin/env bash
# 本地 build admin，避免 VPS 上 vite OOM；再 rsync 到 admin-static
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
REMOTE="${DEPLOY_HOST:-zfculture}"
DEST="${DEPLOY_PATH:-/opt/miniprogram-platform}"

cd "$ROOT/admin"
npm run build
rsync -az --delete "$ROOT/admin/dist/" "$REMOTE:$DEST/admin-static/"
echo "[push-admin-dist] OK -> $REMOTE:$DEST/admin-static/"
