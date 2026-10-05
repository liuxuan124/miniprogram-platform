#!/usr/bin/env bash
# 清理部署备份，只保留最近 N 个。
#
# 2026-10-05 事故：解压式部署每次都 `cp -a` 一份完整 admin-static（约 350MB），
# 一天部署 5 次 → 92 个备份占 14GB，把 40G 系统盘撑到 100%（Avail 0），
# 表现为 scp 报 "write remote: Failure"、MySQL 写满、日志无法写入。
#
# 本脚本只删「备份目录」，不碰 admin-static 本体与任何运行文件。
# 默认保留 3 个 admin-static 备份 + 5 个 jar 备份，足够覆盖最近几次回滚。
#
# 用法：
#   ./prune-deploy-backups.sh                 # 按默认保留数清理
#   KEEP_ADMIN=5 KEEP_JAR=8 ./prune-deploy-backups.sh
#   DRY_RUN=1 ./prune-deploy-backups.sh        # 只看会删什么，不真删

set -euo pipefail

APP_ROOT="${APP_ROOT:-/opt/miniprogram-platform}"
KEEP_ADMIN="${KEEP_ADMIN:-3}"
KEEP_JAR="${KEEP_JAR:-5}"
DRY_RUN="${DRY_RUN:-0}"

if [[ ! -d "$APP_ROOT" ]]; then
  echo "ERROR 目录不存在: $APP_ROOT" >&2
  exit 1
fi

# 需要 root 才能删 root 属主的旧备份
SUDO=""
if [[ ! -w "$APP_ROOT" ]]; then
  SUDO="sudo"
fi

prune_dir() {
  local pattern="$1" keep="$2" label="$3"
  # 展开 pattern 成列表（可能不存在，故用 2>/dev/null）
  local items
  items=$(ls -dt "$APP_ROOT"/$pattern 2>/dev/null || true)
  if [[ -z "$items" ]]; then
    echo "  $label: 无备份，跳过"
    return 0
  fi
  local total
  total=$(echo "$items" | wc -l | tr -d ' ')
  if [[ "$total" -le "$keep" ]]; then
    echo "  $label: 共 $total 个，≤ 保留数 $keep，无需清理"
    return 0
  fi
  local to_del
  to_del=$(echo "$items" | tail -n +$((keep + 1)))
  local n
  n=$(echo "$to_del" | wc -l | tr -d ' ')
  echo "  $label: 共 $total 个，删除最旧 $n 个（保留最近 $keep 个）"
  if [[ "$DRY_RUN" == "1" ]]; then
    echo "$to_del" | sed 's|^|      将删: |'
  else
    echo "$to_del" | while read -r f; do
      [[ -z "$f" ]] && continue
      $SUDO rm -rf "$f"
    done
  fi
}

prune_file() {
  local pattern="$1" keep="$2" label="$3"
  local items
  items=$(ls -t "$APP_ROOT"/$pattern 2>/dev/null || true)
  if [[ -z "$items" ]]; then
    echo "  $label: 无备份，跳过"
    return 0
  fi
  local total
  total=$(echo "$items" | wc -l | tr -d ' ')
  if [[ "$total" -le "$keep" ]]; then
    echo "  $label: 共 $total 个，≤ 保留数 $keep，无需清理"
    return 0
  fi
  local to_del
  to_del=$(echo "$items" | tail -n +$((keep + 1)))
  local n
  n=$(echo "$to_del" | wc -l | tr -d ' ')
  echo "  $label: 共 $total 个，删除最旧 $n 个（保留最近 $keep 个）"
  if [[ "$DRY_RUN" == "1" ]]; then
    echo "$to_del" | sed 's|^|      将删: |'
  else
    echo "$to_del" | while read -r f; do
      [[ -z "$f" ]] && continue
      $SUDO rm -f "$f"
    done
  fi
}

echo "== 清理前磁盘 =="
df -h / | tail -1

echo "== 清理部署备份（APP_ROOT=$APP_ROOT）=="
prune_dir  "admin-static.bak-*"   "$KEEP_ADMIN" "admin-static 备份"
prune_file "backend/app.jar.bak*"  "$KEEP_JAR"   "app.jar 备份"

# /tmp 下残留的部署中间产物（每次约 7MB）
if [[ "$DRY_RUN" != "1" ]]; then
  $SUDO rm -f /tmp/app.jar.new* /tmp/admin-dist-*.tar.gz 2>/dev/null || true
fi

echo "== 清理后磁盘 =="
df -h / | tail -1
echo "完成（DRY_RUN=$DRY_RUN，KEEP_ADMIN=$KEEP_ADMIN，KEEP_JAR=$KEEP_JAR）"
