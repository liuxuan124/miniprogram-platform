#!/usr/bin/env bash
# RENDER-PARITY 一键跑通（登记 + 黄金页 DOM + 单测 + automator）
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

# 测试页/黄金数据默认不进正式包：跑校验前临时注册，退出（含失败）自动还原
node scripts/toggle-render-parity.js on
restore_parity_off() { node scripts/toggle-render-parity.js off || true; }
trap restore_parity_off EXIT

echo "== 1/9 generate golden DSL + batches =="
node scripts/generate-golden-dsl.js

echo "== 2/9 seed golden pages (API) =="
node scripts/seed-golden-parity-page.js

echo "== 3/9 structure parity report (registry) =="
node scripts/compare-render-parity.js || true

echo "== 4/9 miniapp unit tests =="
(cd miniapp && npm run test:unit)

echo "== 5/9 admin unit tests =="
(cd admin && npm run test:unit)

echo "== 6/9 admin build (golden H5 route) =="
(cd admin && ADMIN_BUILD_SKIP_TSC=1 npx vite build)
if docker ps --format '{{.Names}}' 2>/dev/null | grep -qx miniapp-admin; then
  docker cp admin/dist/. miniapp-admin:/usr/share/nginx/html/
  echo "admin dist copied → miniapp-admin"
fi

echo "== 7/9 Playwright admin golden DOM =="
node scripts/render-parity-playwright.js

echo "== 8/9 automator mini real DOM (batched) =="
node scripts/render-parity-automator-mini-dom.js

echo "== 9/9 automator tab smoke + DOM diff + report =="
node scripts/render-parity-automator.js
node scripts/render-parity-dom-compare.js || true
node scripts/compare-render-parity.js

echo "DONE → docs/render-parity-report.md + agent-team/testing/evidence/render-parity/"
