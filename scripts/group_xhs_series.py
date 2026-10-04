#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
小红书笔记分组：把「几张图凑成一个系列」的内容合并成一篇笔记。

判定依据（来自 introduction 里的系列编号标记，实测形态）：
  1. `案例步骤 3/6` / `案例步骤 1/6`  → 明确的 N/M 步骤系列
  2. `漏点① / 共5个漏点`             → 共M个，编号用圈码
  3. `01/05系列笔记`                 → 分数式编号（分母=总数）
  4. `03-01` `06-2`                  → 主题内小节编号
  5. `节点② / 共8节点`              → 共M个，编号用圈码
  6. 文件名 `01-05_xxx.jpg` / `03-01-05_xxx.jpg` → 人工命名的编号

策略（保守优先，宁可少合并也不错误合并）：
  - 有明确 `N/M` 分母的 → 同一 M 就是一组，合并成一篇
  - 有「共M个」+ 圈码的 → 合并成一篇
  - 只有文件名编号但无 M  → 每张独立成篇（一图一笔记）
  - 无任何编号的散图     → 每张独立成篇
"""
import json
import re
from collections import defaultdict
from pathlib import Path

# ============================================================
# 人工确认的整篇合并规则（优先级最高，覆盖自动判定）
# ============================================================
# 逐张核验 OCR 后确定：这些主题下所有图属于同一套内容，合成一篇笔记。
# 自动判定在「同主题内含封面/福利页/总览页」时容易拆错，
# 因此这里用显式规则兜底 —— 每条都可回溯到 OCR 依据。
# skip: 标题含这些子串的图不入正文（福利领取页等引流图）
WHOLE_TOPIC_MERGE = {
    # 稳卖Agent：图1~图7 + 图6-1 + 图6-2，OCR 首行分别是 01/02/.../07 的一套功能演示；
    # 另 1 张「微信图片_2026...」是工作流总览（已单列）
    "第25周_01_稳卖浏览器广告图文": {"skip": []},
    # AI时代组织架构：5 张连号 + 23_09_00（员工结构图）+ 23_10_40（人机协同 ZONE）
    # + 人工命名封面，同属一套组织架构内容
    "第19周_04_AI时代组织架构图": {"skip": []},
    # 跨境双重征税：2 张铺垫（DTA 概念 + 税负对比表）+ 8 张 6 步案例
    "第27周_01_跨境双重征税": {"skip": []},
    # 平台入门门槛：8 张同模板（亚马逊/eBay/Walmart/TikTok/Temu/AliExpress/Shopee
    # + 行业总览），一套内容
    "第19周_02_跨境电商各平台入门门槛": {"skip": []},
    # 亚马逊全景生态：4 张连号 + 19_36_30，一套生态分层内容
    "第20周_01_亚马逊全景生态图": {"skip": []},
    # AI赋能全景闭环：7 张连号，(1) 总览 + (2)~(7) 六个子题
    "第19周_01_AI赋能跨境电商全景闭环": {"skip": []},
    # 赛维模式全景闭环：6 张同批，一套业务结构内容
    "第19周_05_赛维模式全景闭环": {"skip": []},
    # 平台全景分类：6 张连号 + 人工命名全景图
    "第19周_03_跨境电商平台全景分类": {"skip": []},
    # 财税全景图：封面 + 全景总览上下篇 + 节点①~⑧ = 11 张一套
    "第12周_01_跨境财税全景图": {"skip": []},
    # 公司架构4种模式：封面 + 全景地图 + 节点①~⑥ = 8 张一套
    "第12周_02_公司架构设计4种模式": {"skip": []},
    # 2月政策月报：封面 + 节点①~⑦ + 福利页；福利页是引流图，剔除
    "第12周_04_2月跨境政策月报与避坑": {"skip": ["21-59-11", "文案"]},
    # 增值税进项抵扣5个漏点：封面 + 漏点①~⑤ 一套
    "第13周_01_增值税进项抵扣5个漏点": {"skip": []},
    # 团队招聘与组织架构：封面 + 节点①~③ + 福利页一套
    "第12周_03_跨境电商团队招聘与组织架构": {"skip": ["14-38-50"]},
}
# 文档渲染出的「首图」不是小红书笔记配图（JD模板/话术指南/薪资表/月报文案等），
# 统一排除。实测第12周_03 有 8 张、第12周_04 与第13周各 1 张。
DOC_DERIVED_SKIP = re.compile(r"\.(html?|pdf|docx?|txt|xlsx?|pptx?)$", re.I)

# ============================================================
# 系列标记识别
# ============================================================


def detect_series(text, fname=""):
    """
    从 title + introduction 里探测系列标记。
    返回 (kind, total, index, label)：
      kind ∈ {'step', 'count', 'fraction', 'sect', 'burst', None}
      total  系列总数（M），index 当前序号（1-based），None 表示未识别
      label 人类可读标签，如「案例步骤 3/6」
    """
    head = (text or "")[:300]
    # 折叠字面 \n 与真实换行，统一成空格便于匹配
    h = head.replace("\\n", " ").replace("\n", " ")
    h = re.sub(r"\s+", " ", h)

    # ① 案例步骤 3/6 / 步骤2/6
    m = re.search(r"(?:案例)?步骤\s*([1-9]\d?)\s*/\s*([1-9]\d?)", h)
    if m:
        i, t = int(m.group(1)), int(m.group(2))
        if 1 <= i <= t <= 30:
            return "step", t, i, "案例步骤 %d/%d" % (i, t)

    # ② 共5个漏点 / 共8节点 / 共9张图
    m = re.search(r"共\s*([1-9]\d?)\s*(?:个|张|步|页|节点|漏点)", h)
    if m:
        t = int(m.group(1))
        if 2 <= t <= 30:
            return "count", t, None, "共%d" % t

    # ③ 01/05系列笔记
    m = re.search(r"([1-9]\d?)\s*/\s*([1-9]\d?)\s*系列", h)
    if m:
        i, t = int(m.group(1)), int(m.group(2))
        if 1 <= i <= t <= 30:
            return "fraction", t, i, "%d/%d系列" % (i, t)

    # ④ 节点② / 漏点①（圈码序号 + 共M个）
    m = re.search(r"[节节点漏]点?\s*([①-⑳])\s*/\s*共\s*([1-9]\d?)", h)
    if m:
        circ, t = m.group(1), int(m.group(2))
        idx = "①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮⑯⑰⑱⑲⑳".index(circ) + 1
        if 1 <= idx <= t <= 30:
            return "count", t, idx, "%s/%d" % (circ, t)

    # ⑤ 文件名里的编号：01-05_xxx.jpg / 03-01-05_xxx.jpg / 06-2_xxx.png
    stem = Path(fname or "").stem
    m = re.match(r"^(\d{1,2})-(\d{1,2})(?:-(\d{1,2}))?[_]", stem)
    if m:
        g = [x for x in m.groups() if x]
        if len(g) == 2:
            return "sect", None, int(g[0]), "%s-%s" % (g[0], g[1])
        if len(g) == 3:
            # 03-01-05：主题03 第01张 共05张
            return "sect", int(g[2]), int(g[1]), "%s-%s/%s" % (g[0], g[1], g[2])

    # ⑥ ChatGPT 导出的连号批次：`(1)` `(2)` … `(N)`
    #    实测「平台全景分类」6 张是 22_19_40 (1) ~ 22_19_41 (6) 连续导出，
    #    OCR 里没有系列标记，只能靠文件名尾部序号识别。
    m = re.search(r"\((\d{1,2})\)\s*$", stem)
    if m:
        return "burst", None, int(m.group(1)), "连号第%s张" % m.group(1)

    return None, None, None, ""


# ============================================================
# 分组
# ============================================================
def group_topic(files, topic=None):
    """
    files: [{title, introduction, media_type}, ...]
    返回 [{key, label, total, files:[原序], kind}]
    """
    imgs = [f for f in files if f.get("media_type") == 9]
    imgs = [f for f in imgs
            if not DOC_DERIVED_SKIP.search(re.sub(r"_0[12]$", "", f.get("title") or ""))]
    if not imgs:
        return []

    # 整篇合并规则优先：命中则该主题（除 skip 图）合成一篇
    if topic and topic in WHOLE_TOPIC_MERGE:
        skips = WHOLE_TOPIC_MERGE[topic].get("skip") or []
        kept = []
        for f in imgs:
            ti = f.get("title") or ""
            if any(s in ti for s in skips):
                continue
            if DOC_DERIVED_SKIP.search(re.sub(r"_0[12]$", "", ti)):
                continue
            kept.append(f)
        if len(kept) >= 2:
            return [{"key": "whole", "label": "整篇合并 %d 张" % len(kept),
                     "total": len(kept), "kind": "whole", "files": kept}]

    # 先探测每张的标记
    probes = []
    for f in imgs:
        k, t, i, lab = detect_series(f.get("introduction", ""), f.get("title", ""))
        # ChatGPT 导出名里的时间戳，供 burst 聚类用（同一批连号导出时间相近）
        tm = ""
        m = re.search(r"(\d{4})年(\d{1,2})月(\d{1,2})日\s*(\d{1,2})_(\d{2})_(\d{2})",
                      Path(f.get("title", "")).stem)
        if m:
            tm = "%s:%s:%s" % (m.group(4).zfill(2), m.group(5), m.group(6))
        probes.append({"f": f, "kind": k, "total": t, "index": i,
                       "label": lab, "ts": tm})

    # ① 有分母的（step/fraction/sect带总数）→ 按总数分组
    by_total = defaultdict(list)
    has_denom = False
    for p in probes:
        if p["total"]:
            by_total[p["total"]].append(p)
            has_denom = True

    groups = []
    consumed = set()

    if has_denom:
        for t, ps in sorted(by_total.items()):
            # 同一主题下若只有 1 张且 total>1，说明是截断的，按独立处理
            if len(ps) == 1 and t > 1:
                continue
            groups.append({
                "key": "series_%d" % t,
                "label": ps[0]["label"].split("/")[0] if "/" in ps[0]["label"] else "系列",
                "total": t,
                "kind": ps[0]["kind"],
                "files": [p["f"] for p in ps],
            })
            for p in ps:
                consumed.add(id(p["f"]))

    # ② 「共M个」但只抓到部分（count 无 index）→ 若已形成组则并入，否则独立
    # ③ 其余按「有编号但无分母」→ 视编号连续性决定是否成组
    rest = [p for p in probes if id(p["f"]) not in consumed]
    rest_groups = defaultdict(list)
    for p in rest:
        if p["kind"]:
            rest_groups[p["kind"]].append(p)
        elif p.get("ts"):
            # 无任何编号标记、但有 ChatGPT 时间戳 —— 仍可能同批生成
            # （实测「赛维模式全景闭环」6 张无 (N) 后缀，但 23:11:55~23:12:36
            #   每 4~10 秒一张，明显同批），交给时间聚类处理
            rest_groups["__ts__"].append(p)
        else:
            rest_groups["__single__"].append(p)

    for kind, ps in rest_groups.items():
        if kind in ("__single__", "__ts__"):
            if kind == "__single__":
                for p in ps:
                    groups.append({"key": "single_%s" % (p["f"].get("media_id", "")[-8:]),
                                   "label": "", "total": 1, "kind": None, "files": [p["f"]]})
                continue
            # 纯时间戳聚类：无 (N) 后缀的 ChatGPT 连图，间隔 <=90 秒视为同批
            ts_items = sorted(ps, key=lambda q: q["ts"])
            batches, cur = [], []
            for p in ts_items:
                if cur:
                    h0, m0, s0 = (int(x) for x in cur[-1]["ts"].split(":"))
                    h1, m1, s1 = (int(x) for x in p["ts"].split(":"))
                    gap = (h1 * 3600 + m1 * 60 + s1) - (h0 * 3600 + m0 * 60 + s0)
                else:
                    gap = 10 ** 6
                if gap <= 90:
                    cur.append(p)
                else:
                    if cur:
                        batches.append(cur)
                    cur = [p]
            if cur:
                batches.append(cur)
            for bp in [b for b in batches if b]:
                if len(bp) >= 2:
                    groups.append({
                        "key": "tsbatch_%s" % bp[0]["ts"].replace(":", ""),
                        "label": "同批生成 %d 张" % len(bp),
                        "total": len(bp), "kind": "tsbatch",
                        "files": [q["f"] for q in bp],
                    })
                else:
                    p = bp[0]
                    groups.append({"key": "single_%s" % (p["f"].get("media_id", "")[-8:]),
                                   "label": "", "total": 1, "kind": None, "files": [p["f"]]})
            continue
        if kind == "burst":
            # ChatGPT 连号导出：按时间戳先后排序，间隔 <=90 秒的视为同一批，
            # 每批 >=2 张即为一个系列（1 张的批归单张独立成篇）。
            ts_items = sorted([p for p in ps if p.get("ts")],
                              key=lambda q: q["ts"])
            batches, cur = [], []
            for p in ts_items:
                if cur:
                    h0, m0, s0 = (int(x) for x in cur[-1]["ts"].split(":"))
                    h1, m1, s1 = (int(x) for x in p["ts"].split(":"))
                    gap = (h1 * 3600 + m1 * 60 + s1) - (h0 * 3600 + m0 * 60 + s0)
                else:
                    gap = 10 ** 6
                if gap <= 90:
                    cur.append(p)
                else:
                    if cur:
                        batches.append(cur)
                    cur = [p]
            if cur:
                batches.append(cur)
            for bp in [b for b in batches if b]:
                if len(bp) >= 2:
                    bp.sort(key=lambda q: q["index"] or 0)
                    groups.append({
                        "key": "burst_%s" % bp[0]["ts"].replace(":", ""),
                        "label": "连号导出 %d 张" % len(bp),
                        "total": len(bp), "kind": "burst",
                        "files": [q["f"] for q in bp],
                    })
                else:
                    p = bp[0]
                    groups.append({"key": "single_%s" % (p["f"].get("media_id", "")[-8:]),
                                   "label": "", "total": 1, "kind": None, "files": [p["f"]]})
            continue
        # 有编号无分母：编号连续（差值都是1）且 >=3 张 → 合成一组
        idxs = sorted([p["index"] for p in ps if p["index"]])
        consecutive = len(idxs) >= 3 and all(
            idxs[i + 1] - idxs[i] == 1 for i in range(len(idxs) - 1))
        if consecutive:
            groups.append({
                "key": "seq_%s" % kind,
                "label": ps[0]["label"].split("_")[0],
                "total": None, "kind": kind,
                "files": [p["f"] for p in ps],
            })
        else:
            for p in ps:
                groups.append({"key": "single_%s" % (p["f"].get("media_id", "")[-8:]),
                               "label": "", "total": 1, "kind": None, "files": [p["f"]]})

    # 排序：有总数的按序号在前
    groups.sort(key=lambda g: (g["total"] is None, g["total"] or 0))

    # 提示：若存在一个 >=3 张的系列，剩余零散单图很可能也是同系列的一部分
    # （例：第27周的 8 张 6 步案例 + 2 张无标记的「什么是DTA」「税负对比」，
    #   从内容看后两张恰是该案例的背景铺垫与结果对比）。
    # 这里不自动合并，改为给出候选，由人工逐主题确认后显式合并。
    big = [g for g in groups if len(g["files"]) >= 3]
    if big:
        singles = [g for g in groups if len(g["files"]) == 1]
        if singles and len(singles) <= len(big[0]["files"]) // 2:
            groups[0]["_merge_hint"] = [g["files"][0] for g in singles]

    return _merge_loose_into_series(groups)


# 零散单图归并：同主题内已有 >=3 张的系列时，把「封面/全景图/目录页/福利页」
# 这类明显属于同一套内容的单图并入该系列。
# 判据（保守）：单图 OCR 里出现系列关键词，或标题/OCR 与系列主图共享账号水印。
def _merge_loose_into_series(groups):
    imgs = [f for g in groups for f in g["files"]]
    big = [g for g in groups if len(g["files"]) >= 3]
    if not big:
        return groups

    series = max(big, key=lambda g: len(g["files"]))
    # 系列内已含的文本特征（水印、栏目名）
    blob = " ".join((f.get("introduction") or "") + (f.get("title") or "")
                    for f in series["files"])

    moved = []
    for g in list(groups):
        if g is series or len(g["files"]) != 1:
            continue
        f = g["files"][0]
        txt = (f.get("introduction") or "") + " " + (f.get("title") or "")
        # 判定归属：与系列共享 @账号 水印，或含同套编号体系/栏目词
        acct = set(re.findall(r"@([\w一-鿿]{2,12})", blob))
        hit_acct = any("@" + a in txt for a in acct)
        has_series_word = bool(re.search(
            r"节点\s*[①-⑳/]|全景|总览|封面|节点|目录|地图|漏点|步骤|环节|模块|阶段",
            txt))
        # 引流页（福利资料/免费领取/评论区扣）单独剔出，不并入
        is_promo = bool(re.search(r"福利资料|免费领取|评论区扣|置顶评论|如何领取", txt))
        if is_promo:
            continue
        if hit_acct or has_series_word:
            series["files"].append(f)
            series["total"] = len(series["files"])
            moved.append(f)

    if moved:
        series["label"] = "%s +%d" % (series["label"], len(moved))
        groups = [g for g in groups
                  if g is series or len(g["files"]) != 1
                  or id(g["files"][0]) not in {id(x) for x in moved}]
    return groups


if __name__ == "__main__":
    import sys
    for path in sys.argv[1:]:
        d = json.loads(Path(path).read_text(encoding="utf-8"))
        print("=" * 74)
        print("文件:", Path(path).name)
        for t in d["topics"]:
            gs = group_topic(t["files"], t.get("name"))
            print("\n【%s】%d 文件 -> %d 组"
                  % (t["name"], len(t["files"]), len(gs)))
            for g in gs:
                mark = "合并" if len(g["files"]) > 1 else "独立"
                print("   %-4s %2d 张  total=%-4s kind=%-9s %s"
                      % (mark, len(g["files"]), g["total"], g["kind"], g["label"]))
                for f in g["files"]:
                    print("        - %s" % str(f.get("title"))[:56])
