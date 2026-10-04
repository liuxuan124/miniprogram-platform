#!/usr/bin/env bash
# 扫描 ima 导出目录，核对 20 条清单，输出 JSON 供入库脚本消费
# 用法: bash scripts/import/ima-export-scan.sh
set -euo pipefail

SRC="${1:-$HOME/Downloads/ima跨境资料导出}"
MANIFEST="$HOME/项目文件/liuxuan/小程序搭建运营系统/output/ima-export-manifest.md"
OUT="$HOME/项目文件/liuxuan/小程序搭建运营系统/output/ima-export-scanned.json"

[ -d "$SRC" ] || { echo "目录不存在: $SRC"; exit 1; }

python3 - "$SRC" "$MANIFEST" "$OUT" <<'PY'
import json, os, re, sys, hashlib

src, manifest, out = sys.argv[1], sys.argv[2], sys.argv[3]

# 从清单 md 表格里抽文件名（第一列含 .ext 的行）
expected = []
with open(manifest, encoding='utf-8') as f:
    for line in f:
        m = re.match(r'\|\s*(\d+)\s*\|(.+?)\s*\|', line)
        if not m: continue
        name = m.group(2).strip()
        if re.search(r'\.(pdf|pptx?|html)$', name, re.I):
            expected.append(name)

# 扫本地文件（扁平 + 一级子目录）
found = {}
for root, dirs, files in os.walk(src):
    for fn in files:
        p = os.path.join(root, fn)
        if re.search(r'\.(pdf|pptx?|html)$', fn, re.I):
            rel = os.path.relpath(p, src)
            h = hashlib.md5(open(p, 'rb').read()).hexdigest()
            found[fn] = {
                'path': p, 'rel': rel,
                'size': os.path.getsize(p),
                'md5': h,
                'ext': fn.rsplit('.', 1)[-1].lower(),
            }

items, missing, extra = [], [], []
for name in expected:
    hit = None
    for key, meta in found.items():
        # 容忍文件名里的 (1) /空格差异
        norm = lambda s: re.sub(r'\s+', '', re.sub(r'\(\d+\)', '', s))
        if norm(key) == norm(name) or norm(key).startswith(norm(name)[:18]):
            hit = meta; break
    if hit:
        items.append({'expected': name, **hit})
    else:
        missing.append(name)

used = {i['rel'] for i in items}
for k, v in found.items():
    if v['rel'] not in used:
        extra.append(v)

# md5 去重分组
by_md5 = {}
for i in items:
    by_md5.setdefault(i['md5'], []).append(i['rel'])
dupes = {k: v for k, v in by_md5.items() if len(v) > 1}

result = {
    'src': src,
    'scanned_at': __import__('datetime').datetime.now().isoformat(timespec='seconds'),
    'total_expected': len(expected),
    'total_found': len(items),
    'total_bytes': sum(i['size'] for i in items),
    'items': items,
    'missing': missing,
    'extra': extra,
    'duplicates': dupes,
}
with open(out, 'w', encoding='utf-8') as f:
    json.dump(result, f, ensure_ascii=False, indent=2)

print(f"清单 {len(expected)} 条 / 命中 {len(items)} 条 / 缺 {len(missing)} 条 / 多 {len(extra)} 条")
print(f"总大小 {result['total_bytes']/1048576:.1f} MB -> {out}")
if missing:
    print("缺失:")
    for m in missing: print("  -", m)
if dupes:
    print("内容重复组:")
    for k, v in dupes.items(): print("  -", ' == '.join(v))
if extra:
    print("目录多余文件:")
    for e in extra: print("  -", e['rel'])
PY
