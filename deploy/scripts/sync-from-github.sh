#!/usr/bin/env bash
set -euo pipefail

# 在服务器上执行：从 GitHub 拉取最新代码并重新部署
# 用法：
#   cd /path/to/miniprogram-platform
#   bash deploy/scripts/sync-from-github.sh

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEPLOY_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
PROJECT_ROOT="$(cd "$DEPLOY_DIR/.." && pwd)"

BRANCH="${DEPLOY_BRANCH:-master}"
REMOTE="${DEPLOY_REMOTE:-origin}"

echo "[sync] project root: $PROJECT_ROOT"
cd "$PROJECT_ROOT"

if [[ ! -d .git ]]; then
  echo "[sync] ERROR: 当前目录不是 git 仓库"
  exit 1
fi

echo "[sync] git fetch $REMOTE $BRANCH"
git fetch "$REMOTE" "$BRANCH"
git checkout "$BRANCH"
git pull "$REMOTE" "$BRANCH"

echo "[sync] install root dependencies (miniprogram-ci)"
if command -v npm >/dev/null 2>&1; then
  npm install
else
  echo "[sync] WARN: npm 未安装，跳过 miniprogram-ci 安装"
fi

if [[ -f "$DEPLOY_DIR/scripts/deploy.sh" ]] && command -v docker >/dev/null 2>&1; then
  echo "[sync] docker deploy"
  bash "$DEPLOY_DIR/scripts/deploy.sh"
  exit 0
fi

echo "[sync] fallback: build backend jar + admin dist"
if command -v mvn >/dev/null 2>&1; then
  (cd "$PROJECT_ROOT/backend" && mvn -DskipTests package)
else
  echo "[sync] WARN: mvn 未安装，跳过后端构建"
fi

if command -v npm >/dev/null 2>&1; then
  (cd "$PROJECT_ROOT/admin" && npm ci && npm run build)
else
  echo "[sync] WARN: npm 未安装，跳过 admin 构建"
fi

echo "[sync] done. 请按你的生产环境方式重启 backend/admin 服务。"
