#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
ima 导出资料 -> 生产资料库上架
1. 读 output/ima-export-scanned.json（ima-export-scan.sh 产出）
2. scp 上传到 zfculture:uploads/protected/files/<date>/
3. 写 mp_file_item 行（幂等：同 name+storage_key 已存在则跳过）
4. 输出核对表

用法:
  python3 scripts/import/ima-publish-files.py --dry-run          # 只预览不落库
  python3 scripts/import/ima-publish-files.py --publish           # 真上传+落库
  python3 scripts/import/ima-publish-files.py --publish --read-mode member
"""
import argparse, hashlib, json, os, re, subprocess, sys, uuid
from datetime import date, datetime

WORKSPACE = "/Users/lx/项目文件/liuxuan/小程序搭建运营系统"
SCANNED = os.path.join(WORKSPACE, "output", "ima-export-scanned.json")
HOST = "zfculture"
REMOTE_ROOT = "/opt/miniprogram-platform/backend/uploads/protected/files"

# 分组映射：报告类归到「平台政策」之外的独立分组，避免污染现有 5 组
GROUPS = [
    # (group_name, sort_order, file_exts)
    ("行业月报", 10, {"pdf", "ppt", "pptx"}),
    ("周报与深挖", 11, {"html"}),
]

# 文件名 → 展示名 + 简介（人工润色，去掉日期后缀噪声）
TITLE_RULES = [
    (r"月报[_-](\d{4})年(\d{2})月刊", lambda m: f"跨境月报 · {m.group(1)} 年 {int(m.group(2))} 月"),
    (r"(\d{4})年(\d{1,2})月跨境电商行业月度洞察报告", lambda m: f"跨境月报 · {m.group(1)} 年 {int(m.group(2))} 月"),
    (r"(\d{4})年(\d{1,2})月跨境电商月报", lambda m: f"跨境月报 · {m.group(1)} 年 {int(m.group(2))} 月"),
    (r"跨境电商五年展望", lambda m: "跨境电商五年展望 2026—2031"),
    (r"跨境电商周报[_-]第(\d+)期", lambda m: f"跨境电商周报 · 第 {m.group(1)} 期"),
    (r"深挖分析[_-](.+?)_?(\d{4}-\d{2}-\d{2})?\.html$", lambda m: f"深挖分析 · {m.group(1)}"),
]

FILE_TYPE = {"pdf": "pdf", "ppt": "ppt", "pptx": "ppt", "html": "other", "docx": "doc",
             "xlsx": "xls", "zip": "zip"}
MIME = {"pdf": "application/pdf", "ppt": "application/vnd.ms-powerpoint",
        "pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        "html": "text/html", "zip": "application/zip", "xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document"}


def pretty_title(fn):
    for pat, fn2 in TITLE_RULES:
        m = re.search(pat, fn)
        if m:
            return fn2(m)
    return re.sub(r"\.(pdf|pptx?|html)$", "", fn, flags=re.I)


def pick_group(ext):
    for name, order, exts in GROUPS:
        if ext in exts:
            return name, order
    return GROUPS[0][0], GROUPS[0][1]


def sh(cmd, **kw):
    return subprocess.run(cmd, shell=isinstance(cmd, str), capture_output=True, text=True, **kw)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--publish", action="store_true", help="真上传+落库，默认 dry-run")
    ap.add_argument("--dry-run", action="store_true", help="仅预览（默认行为，显式写法）")
    ap.add_argument("--read-mode", default="member", choices=["free", "login", "member", "level"])
    ap.add_argument("--quality-tier", default="premium", choices=["normal", "premium"])
    ap.add_argument("--preview-percent", type=int, default=20)
    ap.add_argument("--allow-download", default="member", choices=["none", "all", "member", "level"])
    args = ap.parse_args()

    with open(SCANNED, encoding="utf-8") as f:
        data = json.load(f)
    items = data["items"]
    if not items:
        print("扫描结果为空 —— 先把文件导出到", data["src"])
        return 1

    if data.get("duplicates"):
        print("⚠️  检测到内容重复组，上架时会自动只保留文件名最短的一条：")
        for md5, group in data["duplicates"].items():
            print("   ", " == ".join(group))

    today = date.today().isoformat()
    remote_dir = f"{REMOTE_ROOT}/{today}"

    plan = []
    seen_titles = {}
    for it in sorted(items, key=lambda x: x["expected"]):
        ext = it["ext"]
        title = pretty_title(it["expected"])
        gname, gorder = pick_group(ext)
        # 同名去重：月报 PDF 与 PPT 同名 -> 加格式后缀
        if title in seen_titles:
            title = f"{title}（{ext.upper()}）"
        seen_titles[title] = True
        fname = f"{uuid.uuid4().hex}.{ext}"
        plan.append({
            "title": title, "src": it["path"], "remote_name": fname,
            "storage_key": f"protected/files/{today}/{fname}",
            "size": it["size"], "md5": it["md5"], "ext": ext,
            "group": gname, "group_order": gorder,
            "file_type": FILE_TYPE.get(ext, "other"),
            "mime": MIME.get(ext, "application/octet-stream"),
        })

    print(f"\n待上架 {len(plan)} 个文件 / {sum(p['size'] for p in plan)/1048576:.1f} MB")
    print(f"远端目录: {remote_dir}")
    print(f"权限: read_mode={args.read_mode} tier={args.quality_tier} "
          f"preview={args.preview_percent}% download={args.allow_download}\n")
    for p in plan:
        print(f"  [{p['group']:<6}] {p['title']:<34} {p['ext']:<5} {p['size']/1024:>8.0f} KB")

    if not args.publish:
        print("\n(dry-run) 加 --publish 执行真实上传与落库")
        return 0

    # 1. 建远端目录
    r = sh(["ssh", "-o", "ConnectTimeout=15", HOST,
            f"sudo mkdir -p {remote_dir} && sudo chown ubuntu:ubuntu {remote_dir}"])
    if r.returncode != 0:
        print("建目录失败:", r.stderr); return 1

    # 2. 逐个 scp
    ok = 0
    for p in plan:
        r = sh(["scp", "-o", "ConnectTimeout=15", p["src"],
                f"{HOST}:{remote_dir}/{p['remote_name']}"])
        if r.returncode == 0:
            ok += 1
        else:
            print(f"  ✗ 上传失败 {p['title']}: {r.stderr.strip()[:120]}")
    print(f"\n上传完成 {ok}/{len(plan)}")
    if ok == 0:
        return 1

    # 3. 落库（幂等：先按 storage_key 查重）
    sql_path = "/tmp/ima_files_insert.sql"
    rows, skipped = [], 0
    for p in plan:
        summary = f"{p['group']} · {p['ext'].upper()} · {p['size']/1048576:.1f}MB"
        rows.append(
            "INSERT INTO mp_file_item "
            "(name,summary,group_id,storage_key,mime_type,file_type,size,status,quality_tier,"
            "read_mode,preview_percent,allow_download,download_audience,tenant_id,deleted) VALUES ("
            f"{_q(p['title'])},{_q(summary)},"
            f"(SELECT id FROM mp_file_group WHERE name={_q(p['group'])} AND deleted=0 LIMIT 1),"
            f"{_q(p['storage_key'])},{_q(p['mime'])},{_q(p['file_type'])},{p['size']},'published',"
            f"{_q(args.quality_tier)},{_q(args.read_mode)},{args.preview_percent},"
            f"{'1' if args.allow_download != 'none' else '0'},{_q(args.allow_download)},1,0);"
        )
    # 分组不存在则先建
    group_sql = "\n".join(
        f"INSERT INTO mp_file_group (name,sort_order) SELECT {_q(n)},{o} FROM DUAL "
        f"WHERE NOT EXISTS (SELECT 1 FROM mp_file_group WHERE name={_q(n)} AND deleted=0);"
        for n, o, _ in GROUPS
    )
    body = f"{group_sql}\n" + "\n".join(rows)
    open(sql_path, "w", encoding="utf-8").write(body)

    r = sh(["scp", "-o", "ConnectTimeout=15", sql_path, f"{HOST}:{sql_path}"])
    if r.returncode != 0:
        print("SQL 上传失败:", r.stderr); return 1
    r = sh(["ssh", "-o", "ConnectTimeout=15", HOST,
            f"sudo mysql miniprogram_prod < {sql_path} && "
            f"sudo rm -f {sql_path} && "
            f"sudo mysql -N -e \"SELECT id,name,group_id,file_type,size,status,read_mode "
            f"FROM miniprogram_prod.mp_file_item WHERE deleted=0 AND storage_key LIKE 'protected/files/{today}/%';\""])
    print("\n落库结果:")
    print(r.stdout or r.stderr)
    return 0


def _q(s):
    return "'" + str(s).replace("\\", "\\\\").replace("'", "''") + "'"


if __name__ == "__main__":
    sys.exit(main())
