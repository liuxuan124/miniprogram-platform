#!/usr/bin/env bash
# 本地：将站点草稿同步到线上配置，使小程序读取「出海笔记首页」DSL（需 backend 已启动）
set -euo pipefail
API="${API_BASE:-http://127.0.0.1:8080}"
USER="${ADMIN_USER:-admin}"
PASS="${ADMIN_PASS:-admin123}"

login() {
  curl -sf -X POST "$API/api/v1/admin/auth/login" \
    -H 'Content-Type: application/json' \
    -d "{\"username\":\"$USER\",\"password\":\"$PASS\"}" \
    | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['accessToken'])"
}

TOKEN="$(login)"
echo "Publishing site draft to live config (navigation + home binding)..."
curl -sf -X POST "$API/api/v1/admin/mini/publish" \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"includeSite":true,"notes":"同步导航与首页绑定"}' \
  | python3 -m json.tool

echo "Done. Clear WeChat DevTools cache and recompile."
