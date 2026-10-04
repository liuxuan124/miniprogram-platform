#!/usr/bin/env bash
# 清理 admin-static/assets/ 里历次部署遗留的孤儿 chunk（未被任何当前产物引用的 js/css）
#
# 为什么需要：每次部署只覆盖新文件，旧 chunk 会一直留在服务器上。
# 实测曾累积到 5597 个文件 / 24 个孤儿（38KB）。虽然体积不大，但文件数过多会让
# nginx 目录索引与备份包变慢，也会干扰排查（同名多版本容易看错）。
#
# ⚠️ 安全红线（务必遵守）：
#  - **只删 assets/ 目录下的 .js / .css**，绝不碰 index.html、prototype/、images/、
#    logo.svg、golden-dsl.json 等非构建资源。
#  - 用「引用图」判定孤儿：入口 index.html + 所有 js 里的动态 import 全扫一遍，
#    凡是不在引用集里的才删（宁可漏删，绝不误删）。
#  - 每次执行前先备份 assets/，并支持 --dry-run 预览。
set -euo pipefail

PROJECT="${1:-/opt/miniprogram-platform}"
STATIC="$PROJECT/admin-static"
DRY_RUN="${DRY_RUN:-0}"

cd "$STATIC"

if [[ ! -d assets || ! -f index.html ]]; then
  echo "[prune] ERROR: $STATIC 不是有效的 admin-static 目录"
  exit 1
fi

echo "[prune] 扫描引用关系…"

python3 - <<'PY'
import os, re, json, sys

static = os.getcwd()
assets = os.path.join(static, 'assets')

# 1) 收集入口引用
idx = open(os.path.join(static, 'index.html'), encoding='utf-8').read()
referenced = set(re.findall(r'assets/([A-Za-z0-9_.-]+\.(?:css|js))', idx))

# 2) 扫描所有 js 里的动态 import（Vite 产物形如 assets/xxx.js）
for j in os.listdir(assets):
    if not j.endswith('.js'):
        continue
    try:
        s = open(os.path.join(assets, j), encoding='utf-8', errors='ignore').read()
    except OSError:
        continue
    referenced.update(re.findall(r'assets/([A-Za-z0-9_.-]+\.(?:css|js))', s))

# 3) 找出 assets 下未被引用的 js/css
orphans = []
for f in os.listdir(assets):
    if not f.endswith(('.css', '.js')):
        continue
    if f in referenced:
        continue
    orphans.append(f)

total = sum(os.path.getsize(os.path.join(assets, f)) for f in orphans)
json.dump({'orphans': orphans, 'total': total, 'referenced': len(referenced)},
          open('/tmp/_prune_result.json', 'w'))
print(f'[prune] 被引用 {len(referenced)} 个 / 孤儿 {len(orphans)} 个 = {total/1024:.0f} KB')
PY

RESULT=$(cat /tmp/_prune_result.json)
ORPHAN_N=$(echo "$RESULT" | python3 -c "import json,sys; print(len(json.load(sys.stdin)['orphans']))")
ORPHAN_KB=$(echo "$RESULT" | python3 -c "import json,sys; print(f\"{json.load(sys.stdin)['total']/1024:.0f}\")")

if [[ "$ORPHAN_N" == "0" ]]; then
  echo "[prune] 无孤儿文件，跳过。"
  exit 0
fi

echo "[prune] 待删${ORPHAN_N} 个文件（${ORPHAN_KB} KB）:"
echo "$RESULT" | python3 -c "
import json,sys
for f in json.load(sys.stdin)['orphans'][:40]:
    print('   -', f)
o=json.load(open('/tmp/_prune_result.json'))['orphans']
if len(o)>40: print(f'   ... 其余 {len(o)-40} 个')
"

if [[ "$DRY_RUN" == "1" ]]; then
  echo "[prune] DRY-RUN，未实际删除。"
  exit 0
fi

TS=$(date +%Y%m%d-%H%M%S)
echo "[prune] 备份 assets/ -> /tmp/assets.bak-$TS"
sudo cp -a assets "/tmp/assets.bak-$TS"

echo "$RESULT" | python3 -c "
import json,sys
print('\n'.join(json.load(sys.stdin)['orphans']))
" | while read -r f; do
  [[ -n "$f" ]] && sudo rm -f "assets/$f"
done

LEFT=$(ls assets | grep -cE '\.(js|css)$' || true)
echo "[prune] 完成：assets 下现有 js/css $LEFT 个，备份在 /tmp/assets.bak-$TS"