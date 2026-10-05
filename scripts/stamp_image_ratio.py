#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
把图片宽高写进 mp_content 的 cover_image / images URL 的 query 里。

背景（2026-10-03 实测）：
  线上 154 张封面 **100% 是 webp**，而小程序端
  `wx.getImageInfo` 对 webp **一律返回 `getImageInfo:fail invalid`**（3/3 全失败）
  → 前端探测不到比例 → 卡片回落到 `padding-top:125%` + `aspectFill` → **竖图被裁**
  改用 `wx.createOffscreenCanvas` 能解 webp（实测返回 1080×1440），但依赖探测时机与重渲染，
  首次进入仍会闪一下，且失败时无兜底。

方案：把宽高固化到 URL 上，`/x.webp` → `/x.webp?w=1080&h=1440`
  - 后端零改动（jar 编译产物不改）
  - 前端零请求（直接读 URL 里的 w/h）
  - 已验证 nginx 忽略 query，取图仍是 HTTP 200 / 72472B / image/webp

前端约定（utils/image-ratio.js 的 resolveCoverRatio 已支持 ratio/w/h 三个字段，
这里统一输出 `cover_ratio`，前端优先读它）：
  ratio = 高/宽 × 100，夹在 50~400

用法：
  python3 stamp_image_ratio.py --dry    # 预演
  python3 stamp_image_ratio.py          # 写库（会先备份原值到本地 JSON）
"""
import argparse
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
LOCAL = ROOT / "output/xhs-images"
BACKUP = ROOT / "output/xhs-images/cover-ratio-backup.json"

# 本地文件（按 hash 名对应上传后的随机名，用 mapping 反查）
def load_local_index():
    """返回 {上传后的URL路径: (宽, 高)}"""
    idx = {}
    mp_path = LOCAL / "upload-mapping.json"
    if not mp_path.exists():
        return idx
    mp = json.loads(mp_path.read_text(encoding="utf-8"))
    for tier in ("detail", "cover"):
        for key, url in mp.get("uploads", {}).get(tier, {}).items():
            f = LOCAL / "compressed" / tier / key
            if not f.exists():
                continue
            try:
                with Image.open(f) as im:
                    w, h = im.size
            except Exception:
                continue
            idx[url] = (w, h)
    # 修正后的 3:4 图
    for key, url in (mp.get("fixed") or {}).items():
        f = LOCAL / "by-topic-fixed" / key
        if not f.exists():
            continue
        try:
            with Image.open(f) as im:
                w, h = im.size
        except Exception:
            continue
        idx[url] = (w, h)
    return idx


def stamp(url, w, h):
    """给 URL 追加 ?w=&h=（覆盖已有的比例参数）"""
    base = url.split("?")[0]
    pct = (h / w) * 100
    pct = max(50, min(400, pct))
    return "%s?w=%d&h=%d&r=%d" % (base, w, h, round(pct))


def get_token():
    env = {}
    p = Path(os.path.expanduser("~/.workbuddy/credentials/mp.env"))
    for line in p.read_text(encoding="utf-8").split("\n"):
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            k, v = line.split("=", 1)
            env[k.strip()] = v.strip()
    b = lambda d: base64.urlsafe_b64encode(d).rstrip(b"=").decode()
    now = int(time.time())
    h = b(json.dumps({"alg": "HS256", "typ": "JWT"}, separators=(",", ":")).encode())
    pl = b(json.dumps({"userId": 1, "sub": "admin", "typ": "access",
                       "iat": now, "exp": now + 7200}, separators=(",", ":")).encode())
    sig = b(hmac.new(env["MP_JWT_SECRET"].encode(), (h + "." + pl).encode(),
                     hashlib.sha256).digest())
    return env["MP_API_BASE"].rstrip("/"), h + "." + pl + "." + sig


def call(base, tok, path, method="GET", body=None, timeout=40):
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(base + path, data=data, method=method,
                                 headers={"Authorization": "Bearer " + tok,
                                          "Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=timeout) as x:
            return x.status, x.read().decode("utf-8", "replace")
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode("utf-8", "replace")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry", action="store_true")
    args = ap.parse_args()

    idx = load_local_index()
    print("本地尺寸索引: %d 个 URL" % len(idx))
    if not idx:
        print("✗ 索引为空，先确认 upload-mapping.json 存在")
        return

    base, tok = get_token()
    st, bd = call(base, tok, "/api/v1/admin/contents?current=1&size=300")
    recs = json.loads(bd)["data"]["records"]
    mine = [x for x in recs if x.get("author") == "跨境墨太白"
            and (x.get("coverImage") or x.get("images"))]
    print("待处理笔记: %d 篇\n" % len(mine))

    plan = []
    missing = set()
    for x in sorted(mine, key=lambda z: z["id"]):
        new_cover = x.get("coverImage")
        new_imgs = list(x.get("images") or [])
        touched = False
        if new_cover:
            wh = idx.get(new_cover.split("?")[0])
            if wh:
                s = stamp(new_cover, *wh)
                if s != new_cover:
                    new_cover = s
                    touched = True
            else:
                missing.add(new_cover.split("?")[0])
        for i, u in enumerate(new_imgs):
            wh = idx.get(u.split("?")[0])
            if wh:
                s = stamp(u, *wh)
                if s != u:
                    new_imgs[i] = s
                    touched = True
            else:
                missing.add(u.split("?")[0])
        if touched:
            plan.append((x, new_cover, new_imgs))

    if missing:
        print("⚠ 有 %d 个 URL 在本地找不到尺寸（不影响本次处理）" % len(missing))
        for u in list(missing)[:5]:
            print("   ", u)
    print("=== 计划更新 %d 篇 ===" % len(plan))
    for x, cov, imgs in plan[:6]:
        print("  id=%-4d 封面 %s" % (x["id"], (cov or "")[:66]))
        print("          图集 %d 张，首张 %s" % (len(imgs), (imgs[0] if imgs else "-")[:60]))
    if len(plan) > 6:
        print("  ... 共 %d 篇" % len(plan))

    if args.dry:
        print("\n(--dry 未写库)")
        return

    # 备份
    BACKUP.parent.mkdir(parents=True, exist_ok=True)
    if not BACKUP.exists():
        BACKUP.write_text(json.dumps(
            {str(x["id"]): {"coverImage": x.get("coverImage"),
                             "images": x.get("images")} for x in mine},
            ensure_ascii=False, indent=2), encoding="utf-8")
        print("\n已备份原值 -> %s" % BACKUP.name)

    ok = fail = 0
    for x, cov, imgs in plan:
        st, bd = call(base, tok, "/api/v1/admin/contents/%d" % x["id"], "PUT", {
            "title": x["title"], "content": x.get("content") or "",
            "summary": x.get("summary") or "",
            "contentType": x.get("contentType") or "note",
            "author": x.get("author"),
            "tags": x.get("tags") or [],
            "categoryId": x.get("categoryId"),
            "coverImage": cov,
            "images": imgs,
        })
        if st == 200 and '"code":200' in bd:
            ok += 1
        else:
            fail += 1
            print("  ✗ id=%s HTTP %s %s" % (x["id"], st, bd[:80]))
        time.sleep(0.15)
    print("\n完成：成功 %d / 失败 %d" % (ok, fail))


if __name__ == "__main__":
    main()
