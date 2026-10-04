#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
读取 ima_grab_images.js 导出的 ima_images_*.json，批量下载原图到本地并按主题归档。

用法：
  python3 download_ima_images.py ima_images_001a2f8e1ac0690a.json
"""

import json
import re
import subprocess
import sys
import time
from pathlib import Path

BASE = Path("/Users/lx/项目文件/liuxuan/小程序搭建运营系统/output/xhs-images")
BY_TOPIC = BASE / "by-topic"
RAW = BASE / "raw"
LOGS = BASE / "logs"

# 主题名 -> 笔记 id 映射（已发布 20 条）
NOTE_MAP = {
    "第28周_01_亚马逊促销码生态": list(range(178, 183)),
    "第28周_02_亚马逊站外流量": list(range(183, 190)),
    "第28周_03_促销码打折值不值拆解": list(range(190, 198)),
}


def safe(name, limit=40):
    name = re.sub(r'[/\\:*?"<>|]', "_", (name or "").strip())
    return name[:limit] or "untitled"


def main():
    src = Path(sys.argv[1])
    data = json.loads(src.read_text(encoding="utf-8"))
    items = data.get("items", [])

    print("文件 %d 个（知识库 %s）" % (len(items), data.get("knowledgeBaseId")))
    for d in (RAW, BY_TOPIC, LOGS):
        d.mkdir(parents=True, exist_ok=True)

    manifest = {"kb": data.get("knowledgeBaseId"), "captured": data.get("capturedAt"),
                "notes": {}, "downloaded": [], "failed": []}

    total_urls = 0
    ok_urls = 0

    for it in items:
        folder = it.get("folder", "")
        title = it.get("title", "")
        urls = it.get("imgUrls") or []
        if not urls:
            continue

        dest = BY_TOPIC / safe(folder)
        dest.mkdir(parents=True, exist_ok=True)

        saved = []
        for i, u in enumerate(urls, 1):
            total_urls += 1
            ext = "png" if ".png" in u.lower() else ("jpg" if ".jpg" in u.lower() else "webp")
            fn = "%s_%02d.%s" % (safe(title, 30), i, ext)
            fp = dest / fn

            if fp.exists() and fp.stat().st_size > 2000:
                ok_urls += 1
                saved.append(str(fp))
                continue

            r = subprocess.run(["curl", "-s", "-o", str(fp), "-w", "%{http_code}",
                                "--max-time", "60", u],
                               capture_output=True, text=True)
            if r.stdout.strip() == "200" and fp.exists() and fp.stat().st_size > 2000:
                ok_urls += 1
                saved.append(str(fp))
                print("  OK   %-52s %6d KB" % (fn, fp.stat().st_size // 1024))
            else:
                print("  FAIL %-52s HTTP %s" % (fn, r.stdout.strip()))
                if fp.exists() and fp.stat().st_size < 2000:
                    fp.unlink()
                manifest["failed"].append({"title": title, "url": u,
                                           "code": r.stdout.strip()})
            time.sleep(0.2)

        if saved:
            manifest["downloaded"].append({"folder": folder, "title": title,
                                          "files": saved, "count": len(saved)})

    # 关联笔记 id
    for key, ids in NOTE_MAP.items():
        hits = [d for d in manifest["downloaded"] if safe(key) in d["folder"]]
        if hits:
            manifest["notes"][key] = {"ids": ids, "fileCount": sum(h["count"] for h in hits)}

    (BASE / "manifest.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")

    print("\n下载成功 %d / %d 个 URL" % (ok_urls, total_urls))
    print("失败 %d 个" % len(manifest["failed"]))
    print("清单 -> %s" % (BASE / "manifest.json"))
    if manifest["notes"]:
        print("\n按主题关联笔记：")
        for k, v in manifest["notes"].items():
            print("  %-34s %2d 图 -> 笔记 %s" % (k, v["fileCount"], v["ids"]))


if __name__ == "__main__":
    main()