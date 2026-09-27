#!/usr/bin/env bash
# 生产：一次「内容发布」（导航草稿提升 + 脏页上线），不是微信代码包上传。
set -euo pipefail
BASE="${API_BASE:-https://zfculture.site}"
USER="${ADMIN_USER:-admin}"
PASS="${ADMIN_PASS:?请 export ADMIN_PASS=你的后台密码}"

login_json=$(curl -sS -m 60 -X POST "$BASE/api/v1/admin/auth/login" \
  -H 'Content-Type: application/json' \
  -d "{\"username\":\"$USER\",\"password\":\"$PASS\"}")
token=$(echo "$login_json" | python3 -c "import sys,json; b=json.load(sys.stdin); assert b.get('code')==200, b; print(b['data']['accessToken'])")

echo "[before] public config:"
curl -sS -m 30 "$BASE/api/v1/mp/config/public" | python3 -c "import sys,json; d=json.load(sys.stdin).get('data',{}); print('  live_release_no=', d.get('live_release_no'))"

echo "[publish] POST /api/v1/admin/miniapp-releases/publish-content"
pub=$(curl -sS -m 120 -X POST "$BASE/api/v1/admin/miniapp-releases/publish-content" \
  -H "Authorization: Bearer $token" -H 'Content-Type: application/json' -d '{}')
echo "$pub" | python3 -c "import sys,json; b=json.load(sys.stdin); assert b.get('code')==200, b; d=b.get('data') or {}; print('  OK releaseNo=', d.get('releaseNo'), 'siteConfigPromoted=', d.get('siteConfigPromoted'))"

echo "[after] public config:"
curl -sS -m 30 "$BASE/api/v1/mp/config/public" | python3 -c "import sys,json; d=json.load(sys.stdin).get('data',{}); print('  live_release_no=', d.get('live_release_no'))"
