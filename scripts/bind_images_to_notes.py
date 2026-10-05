#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
把已上传的压缩图绑进 20 条小红书笔记（id 178-197）。

映射规则（按文件名语义，不用猜）：
  1. 优先「文件名关键词」匹配笔记标题/序号
     如 01-05_打折到底值不值.jpg  ->  笔记「打折到底值不值」
     如 03-01-05_促销码6本账_1.jpg ->  笔记「促销码6本账_1」
  2. 同一主题内剩余笔记，按笔记顺序分配剩余图片（ChatGPT Image 命名的那批）
  3. jpg/png 双版本同内容时，优先取 webp 且体积大的（ChatGPT 导出的完整版）

每条笔记：
  coverImage = cover 档首图（列表页缩略，55KB 均值）
  images     = detail 档全部相关图（正文配图/图集，111KB 均值）

用法：
  python3 bind_images_to_notes.py --dry   # 预演映射
  python3 bind_images_to_notes.py          # 实际写库
"""
import io
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
from PIL import Image

ROOT = Path("/Users/lx/项目文件/liuxuan/小程序搭建运营系统")
B = ROOT / "output/xhs-images"
MAPPING = B / "upload-mapping.json"
NOTES = ROOT / "scripts/xhs_notes.json"

TARGET_TOPICS = [
    "第28周_01_亚马逊促销码生态",
    "第28周_02_亚马逊站外流量",
    "第28周_03_促销码打折值不值拆解",
]


def norm(s):
    """归一化用于匹配：去标点/空格/全角，英文小写"""
    s = (s or "").lower()
    s = re.sub(r"[\s\-_—·・:：,，.。、/\\（）()【】\[\]!！?？+＋&\"'“”]+", "", s)
    return s


def img_stem(key):
    """
    取可读的文件名词干，并把 ChatGPT 导出的 j/p 双版本折叠成同一标识。

    实测：`ChatGPT Image 2026年7月7日 20_57_42.j_01.webp` 与
    `ChatGPT Image 2026年7月7日 20_57_42.p_01.webp` 是**同一张图**的两个版本
    （尺寸完全相同 1024x1536，.p 体积 1.5MB 无损、.j 400KB 有损）。
    若不折叠，一条笔记会绑上两个重复图，另一条笔记则拿不到图。
    """
    stem = Path(key).stem
    stem = re.sub(r"_0[12]$", "", stem)
    # ChatGPT 导出命名：`<前缀>.j` / `<前缀>.p` -> 只保留前缀
    stem = re.sub(r"\.(j|p)$", "", stem)
    return stem


def pick_best(keys):
    """
    同内容多版本时选最佳：
    体积大优先（ChatGPT 导出的 .p 完整版通常比 .j 抠图版大）
    """
    best, best_sz = None, -1
    for k in keys:
        p = B / "compressed" / "detail" / k
        if not p.exists():
            continue
        sz = p.stat().st_size
        if sz > best_sz:
            best, best_sz = k, sz
    return best


def build_mapping():
    mp = json.loads(MAPPING.read_text(encoding="utf-8"))
    detail = mp["uploads"]["detail"]
    cover = mp["uploads"]["cover"]
    notes = json.loads(NOTES.read_text(encoding="utf-8"))["notes"]

    # 按主题分组图片
    by_topic = {t: [] for t in TARGET_TOPICS}
    for k in detail:
        for t in TARGET_TOPICS:
            if t in k:
                by_topic[t].append(k)
                break

    plan = []   # (note_index_in_file, note, detail_key, [detail_keys])
    for t in TARGET_TOPICS:
        tnotes = [(i, n) for i, n in enumerate(notes) if n["topic"] == t]
        # 按 stem 折叠：一个 stem 代表一张图（可能有多格式版本）
        groups = {}
        for k in sorted(by_topic[t]):
            groups.setdefault(img_stem(k), []).append(k)
        # 池子 = 每个 stem 的最佳版本，且保持时间序（ChatGPT 命名带时间戳）
        pool = [pick_best(v) for _, v in sorted(groups.items())]
        used = set()

        # 第一轮：文件名语义匹配
        matched = {}
        for i, n in tnotes:
            key = norm(n["title"])
            for k in pool:
                if k in used:
                    continue
                st = norm(img_stem(k))
                if not st or len(st) < 4:
                    continue
                if st in key or st[:12] in key:
                    matched[i] = k
                    used.add(k)
                    break

        # 第二轮：剩余笔记按顺序分配剩余图片
        rest = [k for k in pool if k not in used]
        left = [(i, n) for i, n in tnotes if i not in matched]
        for (i, n), k in zip(left, rest):
            matched[i] = k
            used.add(k)

        for i, n in tnotes:
            dk = matched.get(i)
            if not dk:
                print("  ⚠️ 笔记「%s」在主题「%s」下无可用图片" % (n["title"], t))
                continue
            # 同一张图可能存在多个格式版本，只取其中最佳的一张进图集
            variants = [k for k in pool if img_stem(k) == img_stem(dk)]
            best = pick_best(variants)
            plan.append((i, n, best, [best]))
    return plan


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
    mp = json.loads(MAPPING.read_text(encoding="utf-8"))
    detail = mp["uploads"]["detail"]
    cover = mp["uploads"]["cover"]
    plan = build_mapping()

    print("=== 映射计划（%d 条笔记）===" % len(plan))
    for i, n, ck, dks in plan:
        cov_sz = (B / "compressed/cover" / ck).stat().st_size / 1024 \
            if (B / "compressed/cover" / ck).exists() else -1
        det_sz = sum((B / "compressed/detail" / d).stat().st_size for d in dks
                     if (B / "compressed/detail" / d).exists()) / 1024
        print("id=%-4s %-34s 封面 %.0fKB | 图集 %d 张 %.0fKB"
              % (178 + i, n["title"][:34], cov_sz, len(dks), det_sz))
        print("        cover<- %s" % Path(ck).name[:52])
        for d in dks:
            print("        image <- %s" % Path(d).name[:52])

    if dry:
        print("\n(--dry 模式，未写库)")
        return

    base, tok = get_token()
    ok = fail = 0
    print("\n=== 写库 ===")
    for i, n, ck, dks in plan:
        payload = {
            "id": 178 + i,
            "title": n["title"],
            "content": n["content"],
            "summary": n["summary"],
            "contentType": "note",
            "author": "跨境墨太白",
            "tags": n.get("tags", ["图文笔记"]),
            "coverImage": cover[ck],
            "images": [detail[d] for d in dks],
        }
        cid = n.get("categoryName", {}).get("id")
        if cid:
            payload["categoryId"] = cid
        data = json.dumps(payload).encode()
        req = urllib.request.Request(
            base + "/api/v1/admin/contents/%d" % payload["id"], data=data,
            method="PUT",
            headers={"Authorization": "Bearer " + tok,
                     "Content-Type": "application/json"})
        try:
            with urllib.request.urlopen(req, timeout=40) as r:
                j = json.loads(r.read().decode("utf-8", "replace"))
            if j.get("code") == 200:
                ok += 1
                print("  ✅ id=%-4s %-30s 图 %d 张" % (payload["id"], n["title"][:30], len(dks)))
            else:
                fail += 1
                print("  ❌ id=%s code=%s %s" % (payload["id"], j.get("code"), j.get("message")))
        except Exception as e:
            fail += 1
            print("  ❌ id=%s %s" % (payload["id"], str(e)[:70]))
        time.sleep(0.2)
    print("\n完成：成功 %d / 失败 %d" % (ok, fail))


if __name__ == "__main__":
    main()
