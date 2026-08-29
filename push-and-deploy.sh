#!/usr/bin/env bash
# 一键：推送 + 部署 admin 前端
# 用法：bash push-and-deploy.sh [服务器目录]
set -euo pipefail

SERVER="${DEPLOY_SSH:-root@124.220.11.79}"
REMOTE_DIR="${1:-/opt/miniprogram-platform}"
LOCAL_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "==> 1/4 清理临时文件"
cd "$LOCAL_DIR"
rm -f admin-src.tgz .git/index.lock .git/HEAD.lock .git/index.lock.stale* 2>/dev/null || true
rm -f .git/objects/*/tmp_obj_* 2>/dev/null || true

echo "==> 2/4 推送到 GitHub"
git status --porcelain | grep -q . && { echo "工作区有未提交改动，先处理："; git status --short; exit 1; }
git push origin master

echo "==> 3/4 服务器拉取并重建 admin"
ssh "$SERVER" bash -s <<REMOTE
set -euo pipefail
cd "$REMOTE_DIR"
git pull origin master
if [ -f deploy/scripts/rebuild-admin-static.sh ] && [ -d admin-static ]; then
  bash deploy/scripts/rebuild-admin-static.sh "$REMOTE_DIR"
else
  bash deploy/scripts/sync-from-github.sh
fi
REMOTE

echo "==> 4/4 验证"
curl -sS -o /dev/null -w "https://zfculture.site/ -> %{http_code}\n" https://zfculture.site/
echo "完成。打开 https://zfculture.site/ → 页面 → 外观，确认左侧是四组导航。"
