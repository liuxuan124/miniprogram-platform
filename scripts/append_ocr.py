#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
把 ima 导出的 OCR 数据落成 xhs_ocr_raw.json 的辅助脚本。

用法：
  python3 append_ocr.py <batch_file.py>

batch 文件格式（直接从 MCP 返回粘下来的最小片段）：
  TOPICS = [
      ("folder_xxx", "主题名", [
          ("源文件名", "introduction 原文"),
          ...
      ]),
      ...
  ]
追加写入 xhs_ocr_raw.json（已存在的同 topic 会被覆盖）。
"""

import json
import re
import runpy
import sys
from pathlib import Path

HERE = Path(__file__).parent
RAW = HERE / "xhs_ocr_raw.json"


def main():
    batch = Path(sys.argv[1])
    ns = runpy.run_path(str(batch))
    topics = ns["TOPICS"]

    data = json.loads(RAW.read_text(encoding="utf-8")) if RAW.exists() else {"topics": []}

    by_name = {t["name"]: t for t in data["topics"]}
    added = 0
    for folder, name, images in topics:
        rec = by_name.get(name) or {"name": name, "folder_id": folder, "images": []}
        rec["folder_id"] = folder
        rec["images"] = [
            {"media_id": "", "title": fn, "introduction": intro}
            for fn, intro in images
        ]
        by_name[name] = rec
        added += len(images)

    data["topics"] = list(by_name.values())
    RAW.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")

    total = sum(len(t["images"]) for t in data["topics"])
    print("追加 %d 条，现有 %d 个主题 / 共 %d 条 OCR" % (added, len(data["topics"]), total))


if __name__ == "__main__":
    main()