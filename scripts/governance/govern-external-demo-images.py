#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
治理生产库里的「外链演示图」（picsum.photos / placehold.co 等占位图源）。

口径：所有图片必须先进入素材库（mp_asset），各处只引用素材 URL。
外链演示图不入素材库，且小程序端 image-fallback 会把它判成坏图回退本地占位，
后台看得到、小程序看不到，属于典型的「图丢了」误判。

本脚本做的事：
  1) 扫描 mp_page_version.dsl_content、mp_content(images/content/cover_image)、
     mp_system_config.config_value 中的外链图片 URL
  2) 去重后下载到 uploads/migrated/<date>/，按 Content-Type 定扩展名
  3) 登记素材库 mp_asset（按 url 幂等）
  4) 把这些列里的外链替换为站内 /uploads/... 相对路径（小程序端 resolveMediaUrl 支持）

幂等：已下载文件跳过、已登记素材跳过、已无外链的行不更新；可重复执行。

用法（凭证与路径一律走环境变量，禁止写进仓库）：
    export DB_USER=... DB_PASS=... DB_NAME=miniprogram_prod
    export UPLOAD_ROOT=/opt/miniprogram-platform/backend/uploads
    export DATE_DIR=$(date +%F)        # 可选，默认当天
    python3 scripts/governance/govern-external-demo-images.py

踩坑记录：
  * dsl_content / images 是 **JSON 列**，直接进 JSON_QUOTE 会报
    `ERROR 3064 Incorrect type for argument 1 in function json_quote`，必须先
    `CAST(col AS CHAR)`。
  * mysql 客户端 `-B`（batch）会**再转义一层反斜杠**，JSON_QUOTE 的 `\\"` 会变成
    `\\\\"`，Python 侧 json.loads 直接失败。必须加 `--raw` 禁止二次转义。
  * 取回文本一律用 JSON_QUOTE 包裹再 json.loads，避免字段里的真实换行/制表符
    破坏「按行切分」的解析。
"""
import hashlib
import json
import os
import re
import subprocess
import sys
from datetime import date
from urllib.parse import parse_qs, unquote, urlparse

DB_USER = os.environ.get("DB_USER", "")
DB_PASS = os.environ.get("DB_PASS", "")
DB_NAME = os.environ.get("DB_NAME", "miniprogram_prod")
UPLOAD_ROOT = os.environ.get("UPLOAD_ROOT", "")
DATE_DIR = os.environ.get("DATE_DIR", date.today().isoformat())
TMP_DIR = "/tmp/extimg_dl"

if not (DB_USER and DB_PASS and UPLOAD_ROOT):
    sys.exit("请先设置 DB_USER / DB_PASS / UPLOAD_ROOT 环境变量（不要写死在脚本里）")

DEST_DIR = os.path.join(UPLOAD_ROOT, "migrated", DATE_DIR)
URL_PREFIX = f"/uploads/migrated/{DATE_DIR}"
os.makedirs(DEST_DIR, exist_ok=True)
os.makedirs(TMP_DIR, exist_ok=True)

URL_RE = re.compile(r'https?://(?:picsum\.photos|placehold\.co)/[^\s"\'\\<>)\]]+')


def run_sql(sql: str, database: str = DB_NAME) -> str:
    # --raw：禁止 batch 模式再转义一层反斜杠，否则 JSON_QUOTE 的结果无法 json.loads
    cmd = ["mysql", f"-u{DB_USER}", f"-p{DB_PASS}", database, "-N", "-B", "--raw", "-e", sql]
    return subprocess.run(cmd, capture_output=True, text=True).stdout


def sql_escape(s: str) -> str:
    return s.replace("\\", "\\\\").replace("'", "''")


def fetch_rows(table: str, id_col: str, col: str, where: str):
    sql = f"SELECT {id_col}, JSON_QUOTE(CAST({col} AS CHAR)) FROM {table} WHERE {where}"
    rows = []
    for line in run_sql(sql).split("\n"):
        if not line.strip():
            continue
        rid, _, quoted = line.partition("\t")
        try:
            rows.append((rid.strip(), json.loads(quoted)))
        except Exception:
            continue
    return rows


def asset_name(url: str, idx: int) -> str:
    p = urlparse(url)
    if "picsum.photos" in p.netloc:
        parts = [x for x in p.path.split("/") if x]
        if len(parts) >= 2 and parts[0] == "seed":
            return f"迁移-seed-{parts[1]}"
        return f"迁移-picsum-{idx:03d}"
    if "placehold.co" in p.netloc:
        text = (parse_qs(p.query or "").get("text") or [""])[0]
        return unquote(text)[:40] or f"迁移-占位图-{idx:03d}"
    return f"迁移-图片-{idx:03d}"


TARGETS = [
    ("mp_page_version", "id", "dsl_content",
     "dsl_content LIKE '%picsum.photos%' OR dsl_content LIKE '%placehold.co%'"),
    ("mp_content", "id", "images",
     "images LIKE '%picsum.photos%' OR images LIKE '%placehold.co%'"),
    ("mp_content", "id", "content",
     "content LIKE '%picsum.photos%' OR content LIKE '%placehold.co%'"),
    ("mp_content", "id", "cover_image",
     "cover_image LIKE '%picsum.photos%' OR cover_image LIKE '%placehold.co%'"),
    ("mp_system_config", "id", "config_value",
     "config_value LIKE '%picsum.photos%' OR config_value LIKE '%placehold.co%'"),
]

# ---------- 1. 收集 ----------
collected, url_set = {}, {}
for table, id_col, col, where in TARGETS:
    rows = fetch_rows(table, id_col, col, where)
    hit = 0
    for rid, text in rows:
        found = URL_RE.findall(text or "")
        if not found:
            continue
        hit += 1
        for u in found:
            url_set.setdefault(u.rstrip(",;"), len(url_set))
        collected[(table, col, rid)] = text
    print(f"   · {table}.{col}: 取回 {len(rows)} 行，命中 {hit} 行")

print(f"[1/4] 涉及行 {len(collected)} 条，去重外链 {len(url_set)} 个")
if not url_set:
    print("没有外链图片，退出")
    sys.exit(0)

# ---------- 2. 下载 ----------
mapping, sizes, fail = {}, {}, []
for url in sorted(url_set, key=lambda x: url_set[x]):
    key = hashlib.md5(url.encode()).hexdigest()[:12]
    cached = [f for f in os.listdir(DEST_DIR) if f.startswith(key + ".")]
    if cached:
        rel = f"{URL_PREFIX}/{cached[0]}"
        mapping[url] = rel
        sizes[rel] = os.path.getsize(os.path.join(DEST_DIR, cached[0]))
        continue
    tmp = os.path.join(TMP_DIR, key)
    r = subprocess.run(["curl", "-sSL", "--max-time", "40", "--retry", "2", "-o", tmp,
                        "-w", "%{content_type}", url], capture_output=True, text=True)
    ctype = (r.stdout or "").strip().split(";")[0]
    if not os.path.exists(tmp) or os.path.getsize(tmp) == 0:
        fail.append(url)
        continue
    ext = {"image/jpeg": "jpg", "image/png": "png", "image/webp": "webp",
           "image/gif": "gif"}.get(ctype)
    if not ext:
        head = subprocess.run(["file", "-b", tmp], capture_output=True, text=True).stdout.lower()
        ext = ("jpg" if "jpeg" in head or "jpg" in head else
               "png" if "png" in head else
               "webp" if "webp" in head else
               "gif" if "gif" in head else "jpg")
    fname = f"{key}.{ext}"
    os.replace(tmp, os.path.join(DEST_DIR, fname))
    mapping[url] = f"{URL_PREFIX}/{fname}"
    sizes[f"{URL_PREFIX}/{fname}"] = os.path.getsize(os.path.join(DEST_DIR, fname))

print(f"[2/4] 下载成功 {len(mapping)} 个，失败 {len(fail)} 个")
if fail:
    print("   失败样例：", fail[:5])
if not mapping:
    sys.exit("全部下载失败，不做任何库变更")

# ---------- 3. 素材登记 + 4. URL 替换 ----------
existing = {line.strip() for line in run_sql("SELECT url FROM mp_asset").split("\n") if line.strip()}
sql_lines, inserted, updated = [], 0, 0

for idx, (url, rel) in enumerate(mapping.items()):
    if rel in existing:
        continue
    name = asset_name(url, idx).replace("\\", "\\\\").replace("'", "''")
    sql_lines.append(
        "INSERT INTO mp_asset (tenant_id, name, type, url, thumb_url, size, created_at) "
        f"VALUES (1, '{name}', 'image', '{rel}', '{rel}', {sizes.get(rel, 0)}, NOW());")
    existing.add(rel)
    inserted += 1

for (table, col, rid), text in collected.items():
    new_text = text
    for old, new in mapping.items():
        new_text = new_text.replace(old, new)
    if new_text == text:
        continue
    sql_lines.append(f"UPDATE {table} SET {col} = '{sql_escape(new_text)}' WHERE id = {rid};")
    updated += 1

print(f"[3/4] 新增素材 {inserted} 条，待更新行 {updated} 条")

sql_path = "/tmp/extimg_apply.sql"
with open(sql_path, "w", encoding="utf-8") as f:
    f.write("START TRANSACTION;\n" + "\n".join(sql_lines) + "\nCOMMIT;\n")
with open(sql_path, "rb") as fh:
    subprocess.run(["mysql", f"-u{DB_USER}", f"-p{DB_PASS}", DB_NAME], stdin=fh,
                   capture_output=True, text=True)
print("[4/4] 已执行 SQL")

print("---- 核对 ----")
print(run_sql(
    "SELECT 'dsl 残留外链' AS 项, COUNT(*) AS 数量 FROM mp_page_version "
    "WHERE dsl_content LIKE '%picsum.photos%' OR dsl_content LIKE '%placehold.co%' "
    "UNION ALL SELECT 'content 残留外链', COUNT(*) FROM mp_content "
    "WHERE content LIKE '%picsum.photos%' OR content LIKE '%placehold.co%' "
    "OR images LIKE '%picsum.photos%' OR images LIKE '%placehold.co%' "
    "OR cover_image LIKE '%picsum.photos%' OR cover_image LIKE '%placehold.co%' "
    "UNION ALL SELECT 'config 残留外链', COUNT(*) FROM mp_system_config "
    "WHERE config_value LIKE '%picsum.photos%' OR config_value LIKE '%placehold.co%' "
    "UNION ALL SELECT 'mp_asset 总数', COUNT(*) FROM mp_asset;"))
