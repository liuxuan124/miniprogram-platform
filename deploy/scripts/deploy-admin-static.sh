#!/usr/bin/env bash
#═══════════════════════════════════════════════════════════════
# 统一部署入口（admin-static）—— 部署前必过守卫，禁止裸部署。
#
# 🔴 为什么需要它（2026-10-06 实测）：
#   当天多会话并行部署 6 次，2 次被互相顶掉；线上堆了 954 个 index-*.js
#   （正常 1-2 个）。根因不是谁操作错了，而是**没有共享状态**：
#   每个会话都以为自己是唯一部署方。
#
#   本脚本把「守卫检查 → 备份 → 打包 → 上传 → 解压 → 记录」串成一条线，
#   任何一步前都先问守卫，冲突则中止。
#
# 用法：
#   deploy/scripts/deploy-admin-static.sh              # 守卫 → 部署 → 记录
#   deploy/scripts/deploy-admin-static.sh --check-only # 只跑守卫不部署
#   FORCE_DEPLOY=1 deploy/scripts/deploy-admin-static.sh  # 强行部署（有风险）
#═══════════════════════════════════════════════════════════════
set -euo pipefail

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$REPO"

HOST="${DEPLOY_HOST:-zfculture}"
REMOTE_DIR="/opt/miniprogram-platform/admin-static"
GUARD="node deploy/scripts/deploy-guard.mjs"
CHECK_ONLY=0
[[ "${1:-}" == "--check-only" ]] && CHECK_ONLY=1

red()  { printf '\033[31m%s\033[0m\n' "$1"; }
green(){ printf '\033[32m%s\033[0m\n' "$1"; }
cyan() { printf '\033[36m%s\033[0m\n' "$1"; }

# ══════════════ 1. 守卫检查（必经） ══════════════
echo
cyan "══ 1/5 部署守卫 ══"
if [[ "${FORCE_DEPLOY:-}" == "1" ]]; then
  red "  ⚠ FORCE_DEPLOY=1 —— 跳过守卫，强行部署"
  red "    线上可能进半成品，风险自负"
else
  if ! $GUARD; then
    echo
    red "⛔ 守卫未通过，已中止部署。"
    red "   处理完上面的问题后重试；或确认无风险时用 FORCE_DEPLOY=1。"
    exit 1
  fi
fi
[[ $CHECK_ONLY -eq 1 ]] && { echo; green "仅检查模式，到此结束"; exit 0; }

# ══════════════ 2. 备份 ══════════════
echo
cyan "══ 2/5 备份线上 ══"
TS="$(date +%H%M)"
BAK="${REMOTE_DIR}.bak-${TS}"
ssh "$HOST" "sudo cp -a ${REMOTE_DIR} ${BAK} && echo '  已备份: ${BAK}'"

# ══════════════ 3. 本地构建 ══════════════
echo
cyan "══ 3/5 构建 ══"
# ⚠️ 用独立 outDir —— 沙箱会拦 vite 清空共享 dist（>50 文件触发 safe-delete）
OUT="dist-deploy-${TS}"
cd "$REPO/admin"
npx vite build --outDir "$OUT" --emptyOutDir 2>&1 \
  | grep -viE "deprecation|@import|^\s*[0-9]+ │|^\s*│|^\s*╷|^\s*╵|More info|root stylesheet|^\s*\^+\s*$|^$|__PURE__|contains an annotation|larger than 500" \
  | tail -3
ENTRY="$(grep -oE 'assets/index-[A-Za-z0-9_-]+\.js' "$OUT/index.html" | head -1)"
[[ -z "$ENTRY" ]] && { red "  ✗ 构建产物里找不到入口 chunk"; exit 1; }
green "  构建完成，入口: $ENTRY"

# ══════════════ 4. 上传 + 解压 ══════════════
echo
cyan "══ 4/5 上传 + 解压 ══"
PKG="/tmp/admin-static-${TS}.tar.gz"
# 🔴 内容根必须是 dist 内容本身（写成「包 dist」会落错位却看似成功）
COPYFILE_DISABLE=1 tar --no-mac-metadata --no-xattrs -C "$OUT" -czf "$PKG" .
# ⚠️ 内容根校验：必须看到 ./index.html
tar -tzf "$PKG" | head -3 | grep -q './index.html' \
  || { red "  ✗ 包内容根不对（应见 ./index.html）"; exit 1; }
scp "$PKG" "$HOST:$PKG" >/dev/null
ssh "$HOST" "cd ${REMOTE_DIR} && sudo tar -xzf $PKG && sudo chown -R ubuntu:ubuntu ."
# 🔴 解压后立即验证指向（tar 不更新 mtime，光看时间会误判）
REMOTE_ENTRY="$(ssh "$HOST" "grep -oE 'assets/index-[A-Za-z0-9_-]+\\.js' ${REMOTE_DIR}/index.html | head -1")"
if [[ "$REMOTE_ENTRY" != "$ENTRY" ]]; then
  red "  ✗ 线上指向 ${REMOTE_ENTRY}，与本地产物 ${ENTRY} 不符 —— 部署结果不可信"
  exit 1
fi
green "  已上线并确认指向 $REMOTE_ENTRY"
ssh "$HOST" "rm -f $PKG"; rm -f "$PKG"

# ══════════════ 5. 记录状态（供下次比对） ══════════════
echo
cyan "══ 5/5 记录状态 ══"
cd "$REPO"
$GUARD --record "$ENTRY" >/dev/null
green "  已记录到 .deploy-state/last-deploy.json"

echo
green "✅ 部署完成: $REMOTE_ENTRY"
echo "  如有并发会话，告知对方本次部署时间 $(date '+%H:%M')"
echo
