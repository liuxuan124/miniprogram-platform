#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""诊断：打印 freepublish/batchget 返回的每篇文章各字段类型，定位 None/异常值"""
import json
import sys

sys.path.insert(0, "/opt/wechat-sync")
import sync_wechat as S

cfg = json.load(open("/opt/wechat-sync/config.json", encoding="utf-8"))
ch = S.OfficialApiChannel(cfg)
arts = ch.fetch_articles(limit=40)

print("共 %d 篇\n" % len(arts))
fields = sorted({k for a in arts for k in a})
print("%-24s %-10s %s" % ("字段", "类型分布", "None 出现在第几篇"))
print("-" * 70)
for f in fields:
    types, nones = {}, []
    for i, a in enumerate(arts):
        v = a.get(f)
        types[type(v).__name__] = types.get(type(v).__name__, 0) + 1
        if v is None:
            nones.append(i)
    print("%-24s %-10s %s" % (
        f,
        ",".join("%s×%d" % (k, v) for k, v in types.items()),
        nones if nones else "-"))

print("\n--- 第一篇各字段实际值预览 ---")
a = arts[0]
for f in fields:
    v = a.get(f)
    sv = repr(v)
    if len(sv) > 120:
        sv = sv[:120] + "..."
    print("%-24s = %s" % (f, sv))

print("\n--- 正文 content_html 为 None 的篇数 ---")
bad = [i for i, a in enumerate(arts) if not isinstance(a.get("content_html"), str)]
print("非字符串 content_html：%s" % (bad if bad else "无"))
for i in bad[:3]:
    print("  第%d篇 title=%r content_html=%r" % (
        i + 1, arts[i].get("title", "")[:30], arts[i].get("content_html")))
