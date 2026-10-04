#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
生成《认知盈余》9 月共读 · 领读提纲 真实 PDF（12 页）。

背景：生产库 mp_file_item id=5「9月共读·领读提纲.pdf」的 storage_key 指向
files/warm/warm-coread-outline.pdf，但该文件从未真正上传，接口返回
404001「文件不存在」，小程序页面显示「下载失败」。
本脚本生成真实 PDF，由部署脚本上传到 storage_key 指定路径。
"""
import os
import fitz  # PyMuPDF

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)),
                   "warm-coread-outline.pdf")

# 用内置 CJK 字体（PyMuPDF 自带 china-s 等），无需外部字体文件
FONT = "china-s"

PAGES = [
    ("封面", ["《认知盈余》9 月共读", "领读提纲与思考题", "暖阁星球 · 共读小组"], "v1.0 · 12 页"),
    ("一、为什么今年要读这本书", [
        "1. 自由时间正在被重新定价——你的空闲被谁买走了",
        "2. 「业余者」如何形成生产力",
        "3. 对内容创作者的三个直接启发",
    ], "本周目标：把「没时间」换成「没方法」"),
    ("二、四周阅读计划", [
        "W1  第 1~2 章：盈余的由来与三种形态",
        "W2  第 3~5 章：协作动机与参与度阶梯",
        "W3  第 6~8 章：社群化与治理",
        "W4  第 9~10 章：沉淀、复用与复利",
    ], "每周一次同步会，周五提交 200 字札记"),
    ("三、每周讨论题", [
        "W1｜你的时间有多少「认知盈余」被平台吃掉了？",
        "W2｜举一个你主动参与过的免费协作，它靠什么持续？",
        "W3｜社群越大越难管，你见过什么解法？",
        "W4｜你的经验如何变成可复用的资产？",
    ], "先答再读，答案比读后感更重要"),
    ("四、关键概念卡片", [
        "认知盈余：认知带宽减去生存带宽之后剩下的部分",
        "参与度阶梯：浏览 → 轻互动 → 创造 → 治理",
        "协作动机：内在（我愿意）× 外在（有回报）四象限",
        "知识复利：可复用产出 × 时间",
    ], "四张卡片，建议抄写一遍"),
    ("五、常见误区", [
        "误区一：把「碎片时间」当成「认知盈余」——碎片无法承载深度",
        "误区二：只追求参与人数——人数不等于贡献",
        "误区三：把免费当廉价——免费背后是交换",
    ], "每条都配一个你身边的反例"),
    ("六、与现有内容的衔接", [
        "承接《跨境电商财税合规》的方法论底座",
        "补足「可持续产出」这一环",
        "为后续 IP 与内容矩阵提供组织视角",
    ], "三处衔接点，建议连读"),
    ("七、实操清单（第一周）", [
        "□ 统计一周内可自主支配的完整时段",
        "□ 挑一个主题做 45 分钟深度产出",
        "□ 加入一个共读小组并按格式发言",
        "□ 把产出沉淀成一篇可复用文档",
    ], "四项全做完再进入 W2"),
    ("八、常见问题", [
        "Q：读不完怎么办？A：优先读第四部分与卡片页",
        "Q：没时间参加同步会？A：看回放并补交札记",
        "Q：想深度参与怎么办？A：申请治理位",
    ], "三个问题覆盖 90% 的卡点"),
    ("九、共读纪律", [
        "1. 发言前先给结论，再给理由",
        "2. 不点评人，只讨论观点",
        "3. 一周至少一次实质性贡献",
        "4. 缺席要请假，不静默消失",
    ], "四条纪律，违反两次退出小组"),
    ("十、结课产出要求", [
        "一份可复用的方法文档（不少于 1500 字）",
        "一次公开分享（30 分钟）",
        "一份给下一届的阅读指引",
    ], "三件产出，缺一不算结课"),
    ("附：延伸阅读与致谢", [
        "延伸：《人群的演进》《参与式文化》",
        "致谢：感谢 12 位共读成员的札记与校对",
        "资料库编号 WARM-2026-09-COREAD",
    ], "最后更新 2026-10"),
]


def wrap(text, width=34):
    """按字符宽度粗略折行（中文按字数，英文按词）"""
    out, cur, n = [], "", 0
    for ch in text:
        w = 1
        cur += ch
        n += w
        if n >= width:
            out.append(cur)
            cur, n = "", 0
    if cur:
        out.append(cur)
    return out


def build():
    doc = fitz.open()
    for idx, (title, bullets, footer) in enumerate(PAGES):
        page = doc.new_page(width=595, height=842)  # A4
        y = 90

        # 主标题
        page.insert_text((70, y), title, fontname=FONT, fontsize=19)
        y += 16
        page.draw_line(fitz.Point(70, y), fitz.Point(525, y),
                       color=(0.72, 0.42, 0.24), width=1.6)
        y += 40

        # 正文
        for b in bullets:
            for ln in wrap(b, 32):
                page.insert_text((70, y), ln, fontname=FONT, fontsize=11.5)
                y += 20
            y += 6

        # 底部说明
        if footer:
            page.insert_text((70, 790), footer, fontname=FONT, fontsize=9,
                             color=(0.45, 0.42, 0.40))

        # 页码
        page.insert_text((500, 790), f"{idx + 1} / {len(PAGES)}",
                         fontname=FONT, fontsize=9, color=(0.55, 0.52, 0.50))

    doc.set_metadata({
        "title": "9月共读·领读提纲",
        "author": "暖阁星球",
        "subject": "《认知盈余》共读领读提纲",
    })
    doc.save(OUT, garbage=4, deflate=True)
    doc.close()
    print(f"已生成 {OUT}")
    print(f"页数 {len(PAGES)}，大小 {os.path.getsize(OUT)} 字节")


if __name__ == "__main__":
    build()
