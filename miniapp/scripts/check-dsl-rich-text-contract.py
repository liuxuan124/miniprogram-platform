#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
校验 dsl-rich-text 的 WXML / WXSS / JS 契约。

背景：本机无微信开发者工具（miniprogram-automator 起不来），静态替代真机预览。
本组件的特殊风险（比别的组件高）：
  ① 内层 .dsl-rich-text__content 若写死 font-size，会**覆盖**容器继承的字号
     → 表现为「样式 Tab 调了没反应」；
  ② rich-text 内部不认外部 class，移动端防爆规则必须落在 WXSS 且用 !important；
  ③ 新增派生字段（bodyStyle/isEmpty）必须在 data 里声明，否则 setData 白搭。

用法：python3 scripts/check-dsl-rich-text-contract.py
"""
import re
import sys
from pathlib import Path

BASE = Path(__file__).resolve().parent.parent / "components" / "dsl-rich-text"
WXML = BASE / "dsl-rich-text.wxml"
WXSS = BASE / "dsl-rich-text.wxss"
JS = BASE / "dsl-rich-text.js"

errors = []
wxml, wxss, js = read_wxml_wxss_js = (
    WXML.read_text(encoding="utf-8"),
    WXSS.read_text(encoding="utf-8"),
    JS.read_text(encoding="utf-8"),
)

# ---------- 1. data + properties + setData 键 ----------
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

# ---------- 2. 模板字段 ----------
for ref in sorted(set(re.findall(r"\{\{\s*([\w.]+)", wxml))):
    root = ref.split(".")[0]
    if root not in available:
        errors.append("WXML 使用了未定义字段: %s" % ref)

# ---------- 3. 事件方法 ----------
for h in sorted(set(re.findall(r'(?:bind|catch)[\w:.-]*="(\w+)"', wxml))):
    if not re.search(r"\n    %s\s*\(" % re.escape(h), js):
        errors.append("WXML 绑定了不存在的方法: %s" % h)

# ---------- 4. class 必须在 WXSS 定义 ----------
for blob in re.findall(r'class="([^"{}]+)"', wxml):
    for c in blob.split():
        if c.startswith("dsl-rich-text") and c not in wxss:
            errors.append("WXML class 未在 WXSS 定义: %s" % c)

# ---------- 5. 🔴 内层不得写死字号/行高（会覆盖容器继承） ----------
inner = re.search(r"\.dsl-rich-text__content\s*\{(.*?)\}", wxss, re.S)
if not inner:
    errors.append("WXSS 缺少 .dsl-rich-text__content 定义")
else:
    body = inner.group(1)
    if not re.search(r"font-size:\s*inherit", body):
        errors.append("WXSS: .dsl-rich-text__content 必须 font-size:inherit，否则覆盖容器字号")
    if not re.search(r"line-height:\s*inherit", body):
        errors.append("WXSS: .dsl-rich-text__content 必须 line-height:inherit，否则覆盖容器行高")

# ---------- 6. 🔴 移动端防爆规则必须在，且图片用 !important ----------
if ".rich-text-content" not in wxss:
    errors.append("WXSS 缺少 .rich-text-content 移动端重置作用域")
if "max-width: 100% !important" not in wxss:
    errors.append("WXSS: 图片防爆规则缺失或未加 !important")
for kw in ("overflow-x: auto", "pre-wrap"):
    if kw not in wxss:
        errors.append("WXSS: 缺少移动端适配规则 %s" % kw)

# ---------- 7. 容器排版必须在 JS 侧算 ----------
for fn in ("_syncBodyStyle", "bodyStyle"):
    if fn not in js:
        errors.append("JS 缺少容器排版逻辑: %s" % fn)

# ---------- 8. 标签闭合 ----------
opens = len(re.findall(r"<view\b", wxml))
closes = len(re.findall(r"</view>", wxml))
selfc = len(re.findall(r"<view\b[^>]*/>", wxml))
if opens - selfc != closes:
    errors.append("view 标签未闭合: 开 %d 自闭合 %d 闭 %d" % (opens, selfc, closes))

print("=" * 60)
print("dsl-rich-text 契约静态校验")
print("=" * 60)
if errors:
    for e in errors:
        print("[错误] %s" % e)
    print("\n❌ 共 %d 个问题" % len(errors))
    sys.exit(1)
print("✅ 通过：字段 %d 个 / 继承链正确 / 移动端防爆规则在位" % len(available))
