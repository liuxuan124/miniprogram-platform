#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
校验 dsl-brand-header 的 WXML / WXSS / JS 契约一致。

背景：本机无微信开发者工具（miniprogram-automator 起不来），
用静态检查替代真机预览，抓三类会导致端上空白/无响应的问题：
  ① 模板用了 data 里没声明的字段（setData 也白搭）
  ② 事件绑定了不存在的方法
  ③ WXML 用到的 class 没在 WXSS 定义

用法：python3 scripts/check-dsl-brand-header-contract.py
"""
import re
import sys
from pathlib import Path

BASE = Path(__file__).resolve().parent.parent / "components" / "dsl-brand-header"
WXML = BASE / "dsl-brand-header.wxml"
WXSS = BASE / "dsl-brand-header.wxss"
JS = BASE / "dsl-brand-header.js"

errors = []


def read(p):
    return p.read_text(encoding="utf-8")


wxml, wxss, js = read(WXML), read(WXSS), read(JS)

# ---------- 1. data + properties + setData 键合并 ----------
available = set()
data_block = re.search(r"data:\s*\{(.*?)\n  \},", js, re.S)
if not data_block:
    errors.append("JS: 找不到 data 块")
else:
    available |= set(re.findall(r"^\s{4}(\w+):", data_block.group(1), re.M))

prop_block = re.search(r"properties:\s*\{(.*?)\n  \},", js, re.S)
if prop_block:
    available |= set(re.findall(r"^\s{4}(\w+):", prop_block.group(1), re.M))

for block in re.findall(r"setData\(\{(.*?)\}\)", js, re.S):
    available |= set(re.findall(r"(\w+):", block))

# ---------- 2. 模板字段 ----------
for ref in sorted(set(re.findall(r"\{\{\s*([\w.]+)", wxml))):
    root = ref.split(".")[0]
    if root in available:
        continue
    errors.append("WXML 使用了未定义字段: %s" % ref)

# ---------- 3. 事件方法必须存在 ----------
for h in sorted(set(re.findall(r'(?:bind|catch)[\w:.-]*="(\w+)"', wxml))):
    if not re.search(r"\n    %s\s*\(" % re.escape(h), js):
        errors.append("WXML 绑定了不存在的方法: %s" % h)

# ---------- 4. class 必须在 WXSS 有定义 ----------
for m in re.findall(r'class="([^"{}]+)"', wxml):
    for c in m.split():
        if c.startswith("dsl-brand-header") and c not in wxss:
            errors.append("WXML class 未在 WXSS 定义: %s" % c)

# ---------- 5. 标签闭合 ----------
opens = len(re.findall(r"<view\b", wxml))
closes = len(re.findall(r"</view>", wxml))
selfclose = len(re.findall(r"<view\b[^>]*/>", wxml))
if opens - selfclose != closes:
    errors.append("view 标签未闭合: 开 %d 自闭合 %d 闭 %d" % (opens, selfclose, closes))

# ---------- 6. 不得写死不存在的页面路径 ----------
for bad in ("brand-intro/brand-intro", "pages/brand-intro"):
    if bad in js:
        errors.append("JS 写死了不存在的页面路径: %s" % bad)

# ---------- 7. 关键兼容逻辑在位 ----------
required = ["resolveLogoMode", "resolveBgMode", "fixed_top", "logo_keep_ratio", "isBlank"]
for r in required:
    if r not in js:
        errors.append("JS 缺少关键逻辑: %s" % r)

print("=" * 60)
print("dsl-brand-header 契约静态校验")
print("=" * 60)
if errors:
    for e in errors:
        print("[错误] %s" % e)
    print("\n❌ 共 %d 个问题" % len(errors))
    sys.exit(1)
print("✅ 通过：字段 %d 个 / class 校验通过 / 无写死坏路径" % len(available))
