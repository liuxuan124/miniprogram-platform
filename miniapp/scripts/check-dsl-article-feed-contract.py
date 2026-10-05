#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
校验 dsl-article-feed 的 WXML / WXSS / JS 契约。

背景：本机无微信开发者工具，静态替代真机预览。本组件的特殊风险：
  ① 模板用 `{{item[bt]}}` 这类动态 key 取角标字段 —— 若 mapArticle 没映射
     对应 is* 字段，角标会**静默不显示**（界面上看不出哪里错了）；
  ② 新增的派生字段（hideCover/coverOnLeft/badgeTypes…）必须进 data，
     否则 setData 白搭；
  ③ WXML 的 class 必须在 WXSS 有定义；
  ④ 「时间 」「来源 」这类硬编码前缀是已修过的坑，加回归断言防复发。

用法：python3 scripts/check-dsl-article-feed-contract.py
"""
import re
import sys
from pathlib import Path

BASE = Path(__file__).resolve().parent.parent / "components" / "dsl-article-feed"
WXML = BASE / "dsl-article-feed.wxml"
WXSS = BASE / "dsl-article-feed.wxss"
JS = BASE / "dsl-article-feed.js"

errors = []
wxml = WXML.read_text(encoding="utf-8")
wxss = WXSS.read_text(encoding="utf-8")
js = JS.read_text(encoding="utf-8")

# ---------- 1. 可用字段 = data + properties + setData ----------
available = set()
m = re.search(r"data:\s*\{(.*?)\n  \},", js, re.S)
if not m:
    errors.append("JS: 找不到 data 块")
else:
    available |= set(re.findall(r"^\s{4}(\w+):", m.group(1), re.M))

m = re.search(r"properties:\s*\{(.*?)\n  \},", js, re.S)
if m:
    available |= set(re.findall(r"^\s{4}(\w+):", m.group(1), re.M))

for blk in re.findall(r"setData\(\{(.*?)\}\)", js, re.S):
    available |= set(re.findall(r"(\w+):", blk))

# wx:for 提供的 item/bt 与 config 属性无需出现在 data
ALLOWED_ROOTS = {"item", "index", "bt", "config", "true", "false", "displayData"}

# ---------- 2. 模板字段必须已声明 ----------
for ref in sorted(set(re.findall(r"\{\{\s*([\w.]+)", wxml))):
    root = ref.split(".")[0]
    if root in ALLOWED_ROOTS or root in available:
        continue
    errors.append("WXML 使用了未定义字段: %s" % ref)

# ---------- 3. 事件方法必须存在 ----------
for h in sorted(set(re.findall(r'(?:bind|catch)[\w:.-]*="(\w+)"', wxml))):
    if not re.search(r"\n    %s\s*\(" % re.escape(h), js):
        errors.append("WXML 绑定了不存在的方法: %s" % h)

# ---------- 4. class 必须在 WXSS 定义 ----------
for blob in re.findall(r'class="([^"{}]+)"', wxml):
    for c in blob.split():
        if c.startswith("dsl-article-feed") and c not in wxss:
            errors.append("WXML class 未在 WXSS 定义: %s" % c)

# ---------- 5. 🔴 动态角标 key 必须在 mapArticle 有对应字段 ----------
# 模板用 {{item[bt]}}，bt 来自 badgeTypes；这些 is* 字段缺一个角标就静默不显示
for flag in ("isOriginal", "isPinned", "isFeatured", "isLatest",
             "isDeepReport", "hasAudio", "hasVideo", "isMemberOnly", "isFreeLimited"):
    if flag not in js:
        errors.append("mapArticle 未映射角标字段: %s（角标会静默不显示）" % flag)

# ---------- 6. 本轮新增派生字段必须进 data ----------
for key in ("hideCover", "coverOnLeft", "dividerStyle", "badgeTypes",
            "metricTypes", "showColumnTag", "showCta", "ctaText"):
    if key not in available:
        errors.append("data/setData 缺少派生字段: %s" % key)

# ---------- 7. 🔴 回归：不得再出现硬编码「时间 」「来源 」前缀 ----------
for bad in ("时间 {{", "来源 {{"):
    if bad in wxml:
        errors.append("WXML 存在硬编码前缀 `%s`（曾导致线上显示「时间 2026-01-01」）" % bad.strip())

# ---------- 8. 纯文字版式必须强制隐藏封面 ----------
if "hideCover" not in js:
    errors.append("JS 未实现 hideCover（纯文字版式会漏出封面）")

# ---------- 9. 标签闭合 ----------
opens = len(re.findall(r"<view\b", wxml))
closes = len(re.findall(r"</view>", wxml))
selfc = len(re.findall(r"<view\b[^>]*/>", wxml))
if opens - selfc != closes:
    errors.append("view 标签未闭合: 开 %d 自闭合 %d 闭 %d" % (opens, selfc, closes))

print("=" * 60)
print("dsl-article-feed 契约静态校验")
print("=" * 60)
if errors:
    for e in errors:
        print("[错误] %s" % e)
    print("\n❌ 共 %d 个问题" % len(errors))
    sys.exit(1)
print("✅ 通过：字段 %d 个 / 角标映射完整 / 无硬编码前缀" % len(available))
