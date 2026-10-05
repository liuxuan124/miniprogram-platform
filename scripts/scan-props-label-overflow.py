#!/usr/bin/env python3
"""扫装修器属性面板的 label 溢出。

背景（实测 element-plus theme-chalk）：
  .el-form-item--small { --font-size: 12px; --el-form-label-font-size: var(--font-size) }
  .el-form-item__label { display:inline-flex; padding:0 12px 0 0; }  ← 无 white-space:nowrap
=> label 文字宽度 > label-width 就会折行，把该项的label 撑成两行、与右侧控件错位。
   所需宽度 ≈ 汉字数*12 + 其它字符*6 + 12(padding)
"""
import re
import glob
import os
import sys

CH, OTH, PAD = 12, 6, 12
FI = re.compile(r'<el-form-item\b[^>]*')
LB = re.compile(r'label="([^"]*)"')
OW = re.compile(r'label-width="(\d+)px"')
SKIP = re.compile(
    r'<(el-radio|el-checkbox|el-radio-button|el-button|el-option|el-tab-pane)\b'
)


def need(s):
    w = 0
    for c in s:
        w += CH if ('\u4e00' <= c <= '\u9fff') else OTH
    return w + PAD


def has_han(s):
    return any('\u4e00' <= c <= '\u9fff' for c in s)


def scan(root):
    bad = []
    files = glob.glob(os.path.join(root, '**/*.vue'), recursive=True)
    for f in files:
        src = open(f, encoding='utf-8').read()
        if '<el-form' not in src:
            continue
        lines = src.split('\n')
        for m in FI.finditer(src):
            tag = m.group(0)
            if SKIP.match(tag):
                continue
            lm = LB.search(tag)
            if not lm:
                continue
            s = lm.group(1)
            if not has_han(s):
                continue          # 纯英文 / 变量名
            if '$' in s or '{' in s:
                continue          # 动态插值，实际渲染长度不定
            ln = src[:m.start()].count('\n') + 1
            pre = '\n'.join(lines[:ln])
            wls = [int(x) for x in OW.findall(pre)]
            w = wls[-1] if wls else 0
            own = OW.search(tag)
            if own:
                w = int(own.group(1))
            n = need(s)
            if w and n > w:
                bad.append((n - w, n, w, s, f, ln))
    return bad


if __name__ == '__main__':
    root = sys.argv[1] if len(sys.argv) > 1 else '.'
    bad = scan(root)
    for d, n, w, s, f, ln in sorted(bad, reverse=True):
        rel = os.path.relpath(f, root)
        print('  差%3dpx | 需%3d 声明%3d | %-14s | %s:%d' % (d, n, w, s, rel, ln))
    print('\n合计 %d 处' % len(bad))
