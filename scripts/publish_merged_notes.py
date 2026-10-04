#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
发布「多图合并」型笔记：多张图合成一篇，images 放全部图集。

用法：
  python3 publish_merged_notes.py --dry   # 预演
  python3 publish_merged_notes.py          # 写库
"""
import json
import os
import re
import sys
import time
import hmac
import hashlib
import base64
import urllib.request
import urllib.error
from pathlib import Path

ROOT = Path("/Users/lx/项目文件/liuxuan/小程序搭建运营系统")
B = ROOT / "output/xhs-images"
NOTES = ROOT / "scripts/xhs_notes_all.json"   # 可用 --notes 覆盖
MAPPING = B / "upload-mapping.json"


# 文档渲染出的首图（JD模板/话术指南/薪资表/月报文案）不是小红书笔记配图。
# 注意键名形态是「主题/xx.html_01.webp」—— 扩展名在 _NN 之后，
# 用 `\.xxx$` 匹配不到（实测漏过 8 张）。
DOC_DERIVED = re.compile(r"\.(html?|pdf|docx?|txt|xlsx?|pptx?)_\d+\.", re.I)
# 福利领取页（含「免费领取/评论区扣111」引流话术），不该出现在图集里
PROMO_PAGE = re.compile(r"21-59-11|14-38-50")


def pick_images(topic, detail, cover):
    """
    取该主题下的全部图片（合并型笔记要把整个系列都放进图集）。

    过滤：`*_01.html` / `*_01.pdf` / `*_01.docx` / `*_01.txt` 这类是
    文档（JD模板/话术指南/薪资表/月报文案）渲染出的**首图**，不是小红书笔记配图，
    混进图集会误导读者 —— 实测第12周_03 有 8 张这种。
    """
    ks = [k for k in detail if topic in k
          and not DOC_DERIVED.search(k) and not PROMO_PAGE.search(k)]
    # 同 stem 折叠（j/p 双版本），保留体积大者
    groups = {}
    for k in ks:
        stem = re.sub(r"_0[12]$", "", Path(k).stem)
        stem = re.sub(r"\.(j|p)$", "", stem)
        if DOC_DERIVED.search(stem):
            continue
        groups.setdefault(stem, []).append(k)

    def sort_key(k):
        """
        排序要贴合「内容的自然阅读顺序」，实测三种命名：
          ① ChatGPT 导出  `ChatGPT Image 2026年5月8日 22_19_40 (1)` → 时间戳 + (N)
          ② 人工序列命名  `图1.jpg` / `图6-1.jpg` / `01-05_xxx.jpg`      → 文件名序号
          ③ 截图工具命名  `Snipaste_2026-03-19_12-13-41.png` / `微信图片_2026...`
             这类时间戳是「截图时刻」，与内容顺序一致（实测第12周系列按此排序完全正确）
        """
        stem = Path(k).stem
        # ① ChatGPT 命名：优先按 (N) 序号，其次时间戳
        #    注意：混合批次里「无 (N) 的早期图」内容上往往排在最前
        #    （如平台门槛：`22_17_00`(亚马逊) 应在 `(1)~(6)` 之前），
        #    所以无 (N) 时用序号 -1 而非 99，保证它排在连号组之前。
        m = re.search(r"(\d{4})年(\d{1,2})月(\d{1,2})日\s*(\d{1,2})_(\d{2})_(\d{2})\s*\((\d{1,2})\)", stem)
        if m:
            y, mo, dd, hh, mm, ss, n = m.groups()
            return (0, "%02d" % int(n),
                    "%04d%02d%02d%02d%02d%02d" % (int(y), int(mo), int(dd), int(hh), int(mm), int(ss)))
        m = re.search(r"(\d{4})年(\d{1,2})月(\d{1,2})日\s*(\d{1,2})_(\d{2})_(\d{2})", stem)
        if m:
            y, mo, dd, hh, mm, ss = m.groups()
            # 无 (N)：序号给 -1 排最前，再按时间戳（同秒内也稳定）
            return (0, "-1", "%04d%02d%02d%02d%02d%02d"
                    % (int(y), int(mo), int(dd), int(hh), int(mm), int(ss)))
        # ② 人工序列命名：图6-1 / 图1 / 01-05
        m = re.match(r"^图\s*(\d+)(?:-(\d+))?", stem)
        if m:
            a = m.group(1)
            b = m.group(2)
            return (1, "%03d%03d" % (int(a), int(b) if b else 0))
        m = re.match(r"^(\d{1,2})-(\d{1,2})", stem)
        if m:
            return (1, "%03d%03d" % (int(m.group(1)), int(m.group(2))))
        # ③ 截图工具命名
        m = re.search(r"(\d{4})-(\d{2})-(\d{2})_(\d{2})-(\d{2})-(\d{2})", stem)
        if m:
            y, mo, dd, hh, mm, ss = m.groups()
            return (2, "", "%04d%02d%02d%02d%02d%02d" % (int(y), int(mo), int(dd), int(hh), int(mm), int(ss)))
        m = re.search(r"(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})", stem)
        if m:
            return (2, "", "".join(m.groups()))
        return (3, "", stem)

    best = []
    for stem, variants in groups.items():
        cand = max(variants, key=lambda k: _size(k))
        best.append(cand)
    best.sort(key=sort_key)
    return best


def _size(key):
    p = B / "compressed/detail" / key
    return p.stat().st_size if p.exists() else 0


def get_token():
    env = {}
    for l in Path(os.path.expanduser("~/.workbuddy/credentials/mp.env")).read_text(
            encoding="utf-8").split("\n"):
        l = l.strip()
        if l and not l.startswith("#") and "=" in l:
            k, v = l.split("=", 1)
            env[k.strip()] = v.strip()
    b = lambda d: base64.urlsafe_b64encode(d).rstrip(b"=").decode()
    now = int(time.time())
    h = b(json.dumps({"alg": "HS256", "typ": "JWT"}, separators=(",", ":")).encode())
    p = b(json.dumps({"userId": 1, "sub": "admin", "typ": "access",
                      "iat": now, "exp": now + 7200}, separators=(",", ":")).encode())
    sig = b(hmac.new(env["MP_JWT_SECRET"].encode(), (h + "." + p).encode(),
                     hashlib.sha256).digest())
    return env["MP_API_BASE"].rstrip("/"), h + "." + p + "." + sig


def main():
    dry = "--dry" in sys.argv
    src = NOTES
    if "--notes" in sys.argv:
        src = Path(sys.argv[sys.argv.index("--notes") + 1])
    notes = json.loads(src.read_text(encoding="utf-8"))["notes"]
    print("读取: %s" % src.name)
    mp = json.loads(MAPPING.read_text(encoding="utf-8"))
    detail, cover = mp["uploads"]["detail"], mp["uploads"]["cover"]

    print("=== 合并笔记发布计划（%d 条）===" % len(notes))
    plan = []
    for n in notes:
        ks = pick_images(n["topic"], detail, cover)
        if not ks:
            print("  ⚠️ %s 无可用图片，跳过" % n["topic"])
            continue
        tot = sum((B / "compressed/detail" / k).stat().st_size for k in ks) / 1024
        txt = re.sub(r"<[^>]+>", "", n["content"])
        print("  【%s】" % n["topic"])
        print("     标题: %s" % n["title"])
        print("     图集 %d 张 / 合计 %.0f KB | 正文 %d 字 / %d 小节"
              % (len(ks), tot, len(txt), n["content"].count("<h3>")))
        for k in ks:
            print("        - %s" % Path(k).name[:50])
        plan.append((n, ks))

    if dry:
        print("\n(--dry 模式，未写库)")
        return

    base, tok = get_token()
    ok = fail = 0
    print("\n=== 写库 ===")
    for n, ks in plan:
        payload = {
            "title": n["title"],
            "content": n["content"],
            "summary": n["summary"],
            "contentType": "note",
            "author": "跨境墨太白",
            "tags": n.get("tags", ["图文笔记"]),
            "coverImage": cover[ks[0]],
            "images": [detail[k] for k in ks],
        }
        if n.get("category"):
            payload["categoryId"] = n["category"]
        data = json.dumps(payload).encode()
        req = urllib.request.Request(
            base + "/api/v1/admin/contents", data=data, method="POST",
            headers={"Authorization": "Bearer " + tok,
                     "Content-Type": "application/json"})
        try:
            with urllib.request.urlopen(req, timeout=40) as r:
                j = json.loads(r.read().decode("utf-8", "replace"))
            if j.get("code") == 200:
                ok += 1
                new_id = (j.get("data") or {}).get("id")
                print("  ✅ id=%-5s %-30s 图 %d 张" % (new_id, n["title"][:30], len(ks)))
            else:
                fail += 1
                print("  ❌ %s code=%s %s" % (n["title"][:20], j.get("code"), j.get("message")))
        except Exception as e:
            fail += 1
            print("  ❌ %s %s" % (n["title"][:20], str(e)[:70]))
        time.sleep(0.2)
    print("\n完成：成功 %d / 失败 %d" % (ok, fail))


if __name__ == "__main__":
    main()
