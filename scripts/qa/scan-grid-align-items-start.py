#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
扫描「同一排兄弟卡片高度不齐」的隐患写法。

原理：CSS Grid/Flex 的 cross 轴默认是 stretch，显式改成
  align-items: start / flex-start
子项就各按自身内容高度收缩 → 同一排卡片一高一矮、底部参差。

只收「多列容器 + 有卡片型子项」的规则块；主栏+侧栏（1fr + 固定 px）
和行内标签对齐（auto 1fr ...）不算，那类是刻意让侧栏不撑高。

输出分两类：
  [A] 卡片网格  —— 兄弟卡内容长度天然不等，属真隐患
  [B] 待人工判 —— 写法可疑但可能是刻意（如卡片里塞了按钮/链接）
  [C] 排除     —— 行内标签对齐、place-items 等
"""
import os
import re

ROOT = "/Users/lx/项目文件/liuxuan/小程序搭建运营系统/admin/src"
BLOCK_RE = re.compile(r"([^{}]+)\{([^{}]*)\}", re.S)
COMMENT_RE = re.compile(r"/\*.*?\*/", re.S)

GRID_RE = re.compile(r"display\s*:\s*grid\b", re.I)
FLEX_RE = re.compile(r"display\s*:\s*flex\b", re.I)
AI_RE = re.compile(r"align-items\s*:\s*(start|flex-start)\b", re.I)
COLS_RE = re.compile(r"grid-template-columns\s*:\s*([^;}]+)", re.I)
DIR_RE = re.compile(r"flex-direction\s*:\s*([^;}]+)", re.I)


def classify(sel, body, kind):
    """按 columns 形态 + 语义关键词分档。"""
    cols = COLS_RE.search(body).group(1).strip() if COLS_RE.search(body) else ""
    sel_l = sel.lower()
    blob = (sel_l + " " + body.lower())

    # 明确排除：行内标签/表格式对齐、place-items
    if re.search(r"place-items\s*:\s*center", blob):
        return "C", "place-items:center（非卡片行）"
    if re.search(r"\b(tabs|tab|row|label|field|form|hl-row|type-tabs)\b", sel_l):
        return "C", "标签/表单行内对齐（刻意）"

    # 卡片网格：多列等宽 repeat(n, 1fr) 或 auto-fill/auto-fit
    if re.search(r"repeat\s*\(\s*\d+\s*,\s*(minmax\(0,\s*)?1fr", cols) or "auto-fill" in cols or "auto-fit" in cols:
        return "A", f"等宽卡片网格（{cols[:44]}）"
    # 1.4fr 1fr / 1fr 340px 这类主栏+侧栏
    if re.search(r"\d+fr\s+minmax\(0,\s*1fr\)|1fr\s+\d+fr", cols):
        return "B", f"主栏+侧栏（{cols[:44]}）"
    if re.search(r"px\s*$", cols.strip()) and "minmax(0, 1fr)" in cols:
        return "B", f"主栏+定宽侧栏（{cols[:44]}）"
    if re.search(r"minmax\(0,\s*1fr\)\s+(px|\d+px|\d{3})", cols):
        return "B", f"主栏+定宽侧栏（{cols[:44]}）"
    if re.search(r"^\s*\d+px", cols):
        return "B", f"定宽侧栏+主栏（{cols[:44]}）"
    if kind == "flex" and cols == "":
        return "B", "flex 行（无显式 columns）"
    return "B", f"其它（{cols[:44] or '无 columns'}）"


rows = []
for dirpath, _dirs, files in os.walk(ROOT):
    for fn in files:
        if not fn.endswith((".vue", ".scss", ".css")):
            continue
        path = os.path.join(dirpath, fn)
        try:
            with open(path, "r", encoding="utf-8") as f:
                src = f.read()
        except Exception:
            continue
        # 先剥注释，避免注释里的关键字造成误报
        clean = COMMENT_RE.sub("", src)
        offset_ok = True
        for m in BLOCK_RE.finditer(clean):
            sel, body = m.group(1), m.group(2)
            is_grid = bool(GRID_RE.search(body))
            is_flex = bool(FLEX_RE.search(body))
            if not (is_grid or is_flex):
                continue
            if not AI_RE.search(body):
                continue
            # flex 容器若显式声明了 column 方向，cross 轴是水平的，不算高度问题
            d = DIR_RE.search(body)
            if is_flex and not is_grid and d and re.search(r"\bcolumn\b", d.group(1)):
                continue
            # flex 行但只有一个子项语义（wrap 的表单行）→ 后续人工判
            kind = "grid" if is_grid else "flex"
            line = clean[: m.start()].count("\n") + 1
            tier, why = classify(sel, body, kind)
            rows.append(
                {
                    "tier": tier,
                    "file": os.path.relpath(path, os.path.dirname(ROOT)),
                    "line": line,
                    "kind": kind,
                    "sel": " ".join(sel.split())[:70],
                    "why": why,
                }
            )

rows.sort(key=lambda r: (r["tier"], r["file"], r["line"]))
for tier, title in (("A", "真隐患：等宽卡片网格（兄弟卡内容天然不等高）"),
                    ("B", "待人工判：主栏+侧栏 / flex 行"),
                    ("C", "已排除：行内标签对齐等")):
    sel_rows = [r for r in rows if r["tier"] == tier]
    print(f"\n{'=' * 78}\n[{tier}] {title} —— {len(sel_rows)} 处\n{'=' * 78}")
    cur = None
    for r in sel_rows:
        if r["file"] != cur:
            cur = r["file"]
            print(f"\n【{cur}】")
        print(f"  L{r['line']:<5} [{r['kind']}] {r['sel']}")
        print(f"         → {r['why']}")
