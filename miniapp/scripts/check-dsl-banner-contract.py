#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
校验 dsl-banner 的 WXML 与 JS 契约是否一致。

背景：本机没有微信开发者工具（miniprogram-automator 起不来），
所以用静态检查替代真机预览，重点抓「模板里用了 data 字段但 JS 没定义」
「事件绑定了不存在的方法」「样式类 WXML/WXSS 对不上」这三类会导致
小程序端白屏/无响应的错误。

用法：python3 scripts/check-dsl-banner-contract.py
"""
import re
import sys
from pathlib import Path

BASE = Path(__file__).resolve().parent.parent / "components" / "dsl-banner"
WXML = BASE / "dsl-banner.wxml"
WXSS = BASE / "dsl-banner.wxss"
JS = BASE / "dsl-banner.js"

errors = []
notes = []


def read(p):
    return p.read_text(encoding="utf-8")


wxml, wxss, js = read(WXML), read(WXSS), read(JS)

# ---------- 1. data 字段齐全 ----------
# 取出 data 块与 _syncView 中 setData 的键
data_block = re.search(r"data:\s*\{(.*?)\n  \},", js, re.S)
if not data_block:
    errors.append("JS: 找不到 data 定义块")
    declared = set()
else:
    declared = set(re.findall(r"^\s{4}(\w+):", data_block.group(1), re.M))

setdata_keys = set()
for block in re.findall(r"setData\(\{(.*?)\}\)", js, re.S):
    setdata_keys |= set(re.findall(r"(\w+):", block))
# _syncView 里用了赋值形式 style.height = ... 也算声明来源
sync_block = re.search(r"_syncView\(config\)\s*\{(.*?)\n    \},", js, re.S)
if sync_block:
    setdata_keys |= set(re.findall(r"^\s{8}(\w+):", sync_block.group(1), re.M))

available = declared | setdata_keys

# properties（config / styleString / actions）也能在模板里直接用
prop_block = re.search(r"properties:\s*\{(.*?)\n  \},", js, re.S)
if prop_block:
    available |= set(re.findall(r"^\s{4}(\w+):", prop_block.group(1), re.M))

# ---------- 2. 模板中引用的字段 ----------
refs = set(re.findall(r"\{\{\s*([\w.]+)", wxml))
for ref in sorted(refs):
    root = ref.split(".")[0]
    if root in {"item", "index", "true", "false", "resolvedImages"}:
        # item.xxx / resolvedImages.length 由 wx:for 提供
        if root == "resolvedImages":
            continue
        continue
    if root in {"config"}:
        continue
    if root not in available:
        errors.append(f"WXML 使用了未定义字段: {ref}")

# ---------- 3. 事件绑定的方法必须存在 ----------
handlers = set(re.findall(r'(?:bind|catch)[\w]*="(\w+)"', wxml))
for h in sorted(handlers):
    if not re.search(rf"\n    {re.escape(h)}\s*\(", js):
        errors.append(f"WXML 绑定了不存在的方法: {h}")

# ---------- 4. JS 中被 WXML 依赖的关键字段 ----------
for required in ("current", "resolvedImages", "layoutMode", "layoutClass",
                 "swiperStyle", "shadowStyle", "maskStyle", "titleStyle",
                 "descStyle", "interval", "indicatorClass", "indicatorStyle",
                 "customIndicator", "showNativeDots"):
    if required not in available:
        errors.append(f"JS 缺少派生字段: {required}")

# ---------- 5. WXML 用到的 class 必须在 WXSS 里有定义 ----------
classes = set()
for m in re.findall(r'class="([^"{}]+)"', wxml):
    for c in m.split():
        if c.startswith("dsl-banner"):
            classes.add(c)
for c in sorted(classes):
    if c not in wxss:
        errors.append(f"WXML class 未在 WXSS 定义: {c}")

# ---------- 6. 动态拼出的 class 前缀必须有对应样式 ----------
for prefix in ("ind-", "ind-pos-", "layout-", "shadow-"):
    if prefix.startswith("ind") and "dsl-banner__indicator" not in wxss:
        errors.append("WXSS 缺少自定义指示器样式")
    if prefix == "layout-" and "layout-peek" not in wxss and "layout-card" not in wxss:
        notes.append("提示: layout 类由 styleString/padding 控制，WXSS 无对应类属正常")
    if prefix == "shadow-" and "box-shadow" not in wxss:
        notes.append("提示: shadow 由 shadowStyle 内联样式提供")

# ---------- 7. 标签闭合 ----------
opens = len(re.findall(r"<view\b", wxml))
closes = len(re.findall(r"</view>", wxml))
selfclose = len(re.findall(r"<view\b[^>]*/>", wxml))
if opens - selfclose != closes:
    errors.append(f"view 标签未闭合: 开 {opens} 自闭合 {selfclose} 闭 {closes}")

# ---------- 8. 边界保护抽查 ----------
if "Number.isFinite(rawInterval)" not in js:
    errors.append("JS: interval 缺少非法值保护")
if "visible" not in js:
    errors.append("JS: 未处理单张 visible=false 过滤")

# ---------- 9. 🔴 占位图兜底必须真正被消费（2026-10-06 补） ----------
# 症状：后台「图片加载失败占位图」配了没效果 —— 端上一律回落到内置装饰块，
# 运营完全看不出是自己没配还是坏了。
if "image_error_placeholder" not in js:
    errors.append("JS 未消费 image_error_placeholder（后台配了占位图也没效果）")
if "isPlaceholder" not in js:
    errors.append("JS 未标记 isPlaceholder（占位图替换后无法区分真实图）")

# ---------- 10. 🔴 object_fit 必须接进 <image mode>（2026-10-06 补） ----------
if "object_fit" not in js:
    errors.append("JS 未消费 object_fit")
if "aspectFit" not in js or "aspectFill" not in js:
    errors.append("JS 缺少 aspectFit/aspectFill 映射，切「完整显示」不会生效")
if re.search(r'mode="aspectFill"', wxml):
    errors.append('WXML: mode 写死 aspectFill，切「完整显示」在真机不会变化')

# ---------- 11. 间隔下界（需求点名：曾允许 300ms 鬼畜轮播） ----------
if not re.search(r"rawInterval >= 1000", js):
    errors.append("JS: 间隔下界保护丢失（可能出现 300ms 抽搐）")

print("=" * 60)
print("dsl-banner 契约静态校验")
print("=" * 60)
for n in notes:
    print(f"[提示] {n}")
if errors:
    for e in errors:
        print(f"[错误] {e}")
    print(f"\n❌ 共 {len(errors)} 个问题")
    sys.exit(1)
print(f"✅ 通过：字段 {len(available)} 个 / 事件 {len(handlers)} 个 / class {len(classes)} 个")
