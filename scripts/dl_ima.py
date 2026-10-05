#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
下载 ima_images.json 里的原图，按主题归档到 by-topic/，生成 manifest.json。

用法：python3 dl_ima.py [并发数]
"""

import json
import re
import subprocess
import sys
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

BASE = Path("/Users/lx/项目文件/liuxuan/小程序搭建运营系统/output/xhs-images")
BY = BASE / "by-topic"
SRC = BASE / "ima_images.json"

# 已发布 20 条笔记 id（按主题）
NOTE_MAP = {
    "第28周_01_亚马逊促销码生态": list(range(178, 183)),
    "第28周_02_亚马逊站外流量": list(range(183, 190)),
    "第28周_03_促销码打折值不值拆解": list(range(190, 198)),
}


def safe(s, n=42):
    """文件名净化。截断时必须保住尾部序号。

    实测踩坑：`ChatGPT Image 2026年5月8日 20_39_55 (1).png` 按 [:34] 截断后
    变成 `...20_39_55 (1`，`Path.stem` 再切扩展名就把 `(N)` 抹掉，
    导致同前缀的 6 张图文件名完全相同、互相覆盖，只剩 1 张。
    """
    s = re.sub(r'[/\\:*?"<>|]', "_", (s or "").strip())
    if len(s) <= n:
        return s or "untitled"
    head = s[:n - 6]
    # 保留「(N)」或「NN-NN」这类尾部序号
    m = re.search(r"(\((\d{1,2})\)|(?<!\d)(\d{1,2}-\d{1,2}))(?!\d)[^()]*$", s)
    tail = ""
    if m:
        tail = m.group(1)
    elif re.search(r"\d{2}_\d{2}_\d{2}", s):
        tail = re.search(r"\d{2}_\d{2}_\d{2}", s).group(0)
    return (head + "~" + tail) if tail else head


def fetch(args):
    url, fp = args
    if fp.exists() and fp.stat().st_size > 5000:
        return ("skip", fp, fp.stat().st_size)
    r = subprocess.run(["curl", "-s", "-o", str(fp), "-w", "%{http_code}",
                        "--max-time", "90", url],
                       capture_output=True, text=True)
    if r.stdout.strip() == "200" and fp.exists() and fp.stat().st_size > 5000:
        return ("ok", fp, fp.stat().st_size)
    if fp.exists():
        fp.unlink()
    return ("fail", fp, r.stdout.strip())


def main():
    workers = int(sys.argv[1]) if len(sys.argv) > 1 else 6
    data = json.loads(SRC.read_text(encoding="utf-8"))
    items = [x for x in data["items"] if "小红书图文内容" in x["folder"]]
    print("待下载 %d 张（并发 %d）" % (len(items), workers))

    BY.mkdir(parents=True, exist_ok=True)
    jobs, meta = [], {}

    for it in items:
        topic = it["folder"].split("/")[-1]
        dest = BY / safe(topic)
        dest.mkdir(parents=True, exist_ok=True)
        for i, u in enumerate(it["imgUrls"], 1):
            ext = "png" if ".png" in u.lower() else ("jpg" if ".jpg" in u.lower() else "webp")
            # title 已含 ChatGPT 的 (N) 序号，不要再叠加 _NN，
            # 否则 `(1).png` 与 `(2).png` 都被压成同一个 base
            base = safe(it["title"], 44)
            if len(it.get("imgUrls") or []) > 1 and not re.search(r"\(\d+\)$", base):
                base = "%s_%02d" % (base, i)
            fp = dest / ("%s.%s" % (base, ext))
            jobs.append((u, fp))
            meta[str(fp)] = {"topic": topic, "title": it["title"], "url": u}

    ok = fail = skip = 0
    with ThreadPoolExecutor(max_workers=workers) as ex:
        for i, (st, fp, info) in enumerate(ex.map(fetch, jobs), 1):
            if st == "ok":
                ok += 1
                print("  [%d/%d] OK   %-56s %6d KB"
                      % (i, len(jobs), fp.name[:54], info // 1024))
            elif st == "skip":
                skip += 1
            else:
                fail += 1
                print("  [%d/%d] FAIL %-56s HTTP %s" % (i, len(jobs), fp.name[:54], info))

    man = {"kbId": data["kbId"], "nick": data["nick"],
           "captured": data["capturedAt"],
           "downloaded": ok, "skipped": skip, "failed": fail,
           "topics": {}, "notes": {}}

    for fp_str, m in meta.items():
        fp = Path(fp_str)
        if not fp.exists():
            continue
        t = man["topics"].setdefault(m["topic"], {"files": [], "titles": []})
        t["files"].append(str(fp))
        if m["title"] not in t["titles"]:
            t["titles"].append(m["title"])

    for topic, ids in NOTE_MAP.items():
        t = man["topics"].get(topic)
        if t:
            man["notes"][topic] = {"ids": ids, "fileCount": len(t["files"])}

    (BASE / "manifest.json").write_text(
        json.dumps(man, ensure_ascii=False, indent=2), encoding="utf-8")

    print("\n下载成功 %d | 跳过 %d | 失败 %d" % (ok, skip, fail))
    print("\n按主题：")
    for t, v in sorted(man["topics"].items()):
        mark = ""
        if t in NOTE_MAP:
            mark = "  -> 笔记 %d-%d" % (NOTE_MAP[t][0], NOTE_MAP[t][-1])
        print("  %-36s %2d 图%s" % (t, len(v["files"]), mark))
    print("\n清单 -> %s" % (BASE / "manifest.json"))


if __name__ == "__main__":
    main()