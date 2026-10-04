#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
从 ima 导出的 OCR 数据集生成小程序笔记内容（xhs_notes.json）。

数据源：scripts/xhs_ocr_raw.json（由 ima MCP get_knowledge_list 导出）
用法：python3 build_xhs_notes.py
"""

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from publish_xhs_notes import build_note

HERE = Path(__file__).parent
RAW = HERE / "xhs_ocr_raw.json"
OUT = HERE / "xhs_notes.json"


def main():
    raw = json.loads(RAW.read_text(encoding="utf-8"))
    notes = []
    seen_titles = {}

    for topic in raw["topics"]:
        tname = topic["name"]
        ttag = tname.split("_", 2)[-1] if tname.count("_") >= 2 else tname
        for img in topic["images"]:
            ocr = img.get("introduction") or ""
            if len(ocr) < 40:
                continue
            n = build_note(ocr, ttag, img.get("title", tname))
            if not n:
                continue
            # 同一主题内标题去重（PNG/JPG 双版本内容相同）
            key = (tname, n["title"])
            if key in seen_titles:
                continue
            seen_titles[key] = True
            n["topic"] = tname
            n["source_media_id"] = img.get("media_id", "")
            n["categoryName"] = tag_to_category(ttag)
            n.pop("_topic", None)
            notes.append(n)

    # 同主题内同名标题去重：加 (2)(3) 后缀，避免「6本账_1/_2/_3」全是同一个标题
    per_topic = {}
    for n in notes:
        per_topic.setdefault(n["topic"], {})
    for n in notes:
        bucket = per_topic[n["topic"]]
        base_t = n["title"]
        if base_t in bucket:
            bucket[base_t] += 1
            n["title"] = "%s (%d)" % (base_t[:36], bucket[base_t])
        else:
            bucket[base_t] = 1

    OUT.write_text(json.dumps({"notes": notes}, ensure_ascii=False, indent=2),
                   encoding="utf-8")
    print("生成 %d 条笔记 -> %s" % (len(notes), OUT))

    by_topic = {}
    for n in notes:
        by_topic.setdefault(n["topic"], []).append(n)
    print("\n按主题分布：")
    for t, ns in sorted(by_topic.items()):
        print("  %-34s %2d 条" % (t, len(ns)))


# 主题关键词 -> 系统分类 id（见 /api/v1/admin/content-categories）
CAT_RULES = [
    (("财税", "税务", "税", "架构", "退税", "公司"), 11, "合规税务"),
    (("亚马逊", "促销码", "站外", "利润"), 21, "亚马逊"),
    (("平台", "分类"), 4, "平台运营"),
    (("物流", "仓储"), 10, "物流履约"),
    (("供应链", "赛维", "采购"), 6, "供应链"),
    (("选品",), 24, "选品"),
    (("AI", "Agent", "组织", "团队", "招聘"), 7, "IP人设与内容"),
]


def tag_to_category(ttag):
    for kws, cid, cname in CAT_RULES:
        if any(k in ttag for k in kws):
            return {"id": cid, "name": cname}
    return {"id": 3, "name": "选品方法论"}


if __name__ == "__main__":
    main()