#!/usr/bin/env bash
# 生产安全同步：永远排除 uploads / 密钥 / 构建产物
set -euo pipefail
DEPLOY_DIR="$(cd "$(dirname "$0")/.." && pwd)"
PROJECT_ROOT="$(cd "$DEPLOY_DIR/.." && pwd)"
REMOTE="${DEPLOY_HOST:-zfculture}"
DEST="${DEPLOY_PATH:-/opt/miniprogram-platform}"

RSYNC_COMMON=(
  -az
  --exclude 'target/'
  --exclude 'uploads/'
  --exclude '**/uploads/'
  --exclude 'node_modules/'
  --exclude '.idea/'
  --exclude '*.iml'
  --exclude '.env'
  --exclude 'backend.env'
)

echo "[safe-rsync] $PROJECT_ROOT -> $REMOTE:$DEST (uploads 已排除)"
rsync "${RSYNC_COMMON[@]}" --delete \
  "$PROJECT_ROOT/backend/" "$REMOTE:$DEST/backend/"
rsync "${RSYNC_COMMON[@]}" --delete \
  --exclude 'dist/' \
  "$PROJECT_ROOT/admin/" "$REMOTE:$DEST/admin/"
rsync "${RSYNC_COMMON[@]}" \
  --exclude 'unpackage/' \
  "$PROJECT_ROOT/miniapp/" "$REMOTE:$DEST/miniapp/"
rsync "${RSYNC_COMMON[@]}" \
  "$DEPLOY_DIR/" "$REMOTE:$DEST/deploy/"

echo "[safe-rsync] rebuild admin-static on $REMOTE"
ssh "$REMOTE" "bash $DEST/deploy/scripts/rebuild-admin-static.sh $DEST"

echo "[safe-rsync] OK"
