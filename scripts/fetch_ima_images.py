#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
从已登录的 ima 网页版抓取图片签名 URL，下载原图并按主题归档。

流程：
  1. 用 agent-browser 打开每个主题文件夹
  2. 抓页面里所有 <img src>（含签名参数）
  3. 剥离 imageMogr2 裁剪参数 -> 下原图
  4. 按主题存到 by-topic/<主题>/，用原始命名
  5. 输出 manifest.json：本地文件 <-> 笔记 id 对应关系

前置：已完成 ima 登录（浏览器会话内）。

用法：
  python3 fetch_ima_images.py --list          # 只列出所有待处理文件夹
  python3 fetch_ima_images.py --scan           # 扫描当前页图片 URL
  python3 fetch_ima_images.py --download       # 下载（需先 --scan 缓存 URL）
"""

import argparse
import json
import os
import re
import subprocess
import sys
import time
from pathlib import Path

BASE = Path("/Users/lx/项目文件/liuxuan/小程序搭建运营系统/output/xhs-images")
RAW = BASE / "raw"
BY_TOPIC = BASE / "by-topic"
LOGS = BASE / "logs"
MANIFEST = BASE / "manifest.json"

NODE_BIN = "/Users/lx/.workbuddy/binaries/node/versions/22.22.2-3/bin"

KB_ID = "001a2f8e1ac0690a"
ROOT_FOLDER = "folder_7504485094004706"      # 小红书图文内容

# 17 个主题（folder_id, 主题名, 期望笔记id区间）
TOPICS = [
    ("folder_7504502718468714", "第28周_01_亚马逊促销码生态",        [178, 182]),
    ("folder_7504502722664633", "第28周_02_亚马逊站外流量",        [183, 189]),
    ("folder_7504502726856613", "第28周_03_促销码打折值不值拆解",     [190, 197]),
    ("folder_7504502781381998", "第27周_01_跨境双重征税",          []),
    ("folder_7504502777187444", "第20周_02_亚马逊卖家的利润怎么分",    []),
    ("folder_7504502772990093", "第20周_01_亚马逊全景生态图",       []),
    ("folder_7504502768796395", "第19周_05_赛维模式全景闭环",       []),
    ("folder_7504502764604745", "第19周_04_AI时代组织架构图",       []),
    ("folder_7504502760409877", "第19周_03_跨境电商平台全景分类",     []),
    ("folder_7504502756215092", "第19周_02_跨境电商各平台入门门槛",    []),
    ("folder_7504502756219817", "第19周_01_AI赋能跨境电商全景闭环",   []),
    ("folder_7504502752025580", "第13周_01_增值税进项抵扣5个漏点",    []),
    ("folder_7504502747825657", "第12周_04_2月跨境政策月报与避坑",    []),
    ("folder_7504502743637069", "第12周_03_跨境电商团队招聘与组织架构",  []),
    ("folder_7504502739436913", "第12周_02_公司架构设计4种模式",      []),
    ("folder_7504502735241557", "第12周_01_跨境财税全景图",         []),
    ("folder_7504502731050296", "第25周_01_稳卖浏览器广告图文",       []),
]


def ab(*args, timeout=60):
    """调 agent-browser"""
    env = dict(os.environ)
    env["PATH"] = NODE_BIN + ":" + env.get("PATH", "")
    env["AGENT_BROWSER_HEADED"] = "1"
    try:
        r = subprocess.run(["agent-browser"] + list(args),
                           capture_output=True, text=True, env=env, timeout=timeout)
        return (r.stdout or "").strip() or (r.stderr or "").strip()
    except subprocess.TimeoutExpired:
        return "TIMEOUT"
    except Exception as e:
        return "ERR: %s" % e


# 抓页面里所有图片 URL 的 JS
JS_SCAN_IMAGES = """
(() => {
  const out = [];
  document.querySelectorAll('img').forEach(img => {
    const src = img.src || img.getAttribute('data-src') || '';
    if (src && src.startsWith('http')) {
      out.push({src: src, w: img.naturalWidth, h: img.naturalHeight,
                alt: (img.alt||'').slice(0,40)});
    }
  });
  // 也抓 CSS 背景图
  document.querySelectorAll('*').forEach(el => {
    const bg = getComputedStyle(el).backgroundImage;
    if (bg && bg.includes('url(')) {
      const m = bg.match(/url\\(["']?(https?:[^)"']+)/);
      if (m) out.push({src: m[1], w: 0, h: 0, alt: 'css-bg'});
    }
  });
  return JSON.stringify(out);
})()
"""


def is_signed_ima(url):
    """是否是带签名的 ima COS 图片"""
    return ("myqcloud.com" in url and "sign=" in url) or "ima.qq.com" in url


def strip_crop(url):
    """剥离 imageMogr2 裁剪参数，拿原图"""
    # 去掉 imageMogr2/... 部分
    base = re.sub(r"&imageMogr2/[^&]*", "", url)
    base = re.sub(r"\?imageMogr2/[^&]*", "", base)
    return base


def guess_name(url, idx):
    """从 URL 猜文件名"""
    m = re.search(r"/([0-9a-f]{16,})[_-]", url)
    if m:
        return "%02d_%s.png" % (idx, m.group(1)[:16])
    m = re.search(r"/([^/]+\.(?:png|jpg|jpeg|webp))", url)
    if m:
        return "%02d_%s" % (idx, os.path.basename(m.group(1)))
    return "%02d_ima.png" % idx


def load_manifest():
    if MANIFEST.exists():
        return json.loads(MANIFEST.read_text(encoding="utf-8"))
    return {"topics": {}, "notes": {}}


def save_manifest(m):
    MANIFEST.write_text(json.dumps(m, ensure_ascii=False, indent=2), encoding="utf-8")


def cmd_list():
    print("共 %d 个主题待处理：\n" % len(TOPICS))
    for i, (fid, name, ids) in enumerate(TOPICS, 1):
        tag = ("→ 笔记 id %d-%d" % (ids[0], ids[1])) if ids else "（暂无笔记）"
        print("%2d. %-38s %s" % (i, name, tag))
        print("    folder_id=%s" % fid)


def cmd_scan():
    """扫描当前页面所有签名图片 URL"""
    out = ab("eval", JS_SCAN_IMAGES)
    try:
        arr = json.loads(out.strip().strip('"').replace('\\"', '"'))
    except Exception:
        print("解析失败，原始输出：\n%s" % out[:500])
        return
    signed = [a for a in arr if is_signed_ima(a["src"])]
    print("页面共 %d 张图，其中带签名 %d 张\n" % (len(arr), len(signed)))
    for a in signed[:15]:
        print("  %4dx%-4d %s" % (a["w"], a["h"], a["src"][:110]))
    m = load_manifest()
    m["_last_scan"] = signed
    save_manifest(m)


def cmd_download(topic_index=None):
    """下载当前页图片到对应主题目录"""
    m = load_manifest()
    scan = m.pop("_last_scan", None)
    if not scan:
        print("没有缓存的 URL，先跑 --scan")
        return

    idxs = range(len(TOPICS)) if topic_index is None else [topic_index]
    for ti in idxs:
        fid, name, _ = TOPICS[ti]
        dest = BY_TOPIC / name
        dest.mkdir(parents=True, exist_ok=True)
        # 每页只下 signed 里的图（当前页）
        saved = []
        for i, a in enumerate(scan, 1):
            src = strip_crop(a["src"])
            fn = guess_name(src, i)
            fp = dest / fn
            if fp.exists() and fp.stat().st_size > 1000:
                saved.append(str(fp))
                continue
            r = subprocess.run(
                ["curl", "-s", "-o", str(fp), "-w", "%{http_code}",
                 "--max-time", "40", src],
                capture_output=True, text=True)
            if r.stdout.strip() == "200" and fp.exists() and fp.stat().st_size > 1000:
                saved.append(str(fp))
                print("  OK   %-46s %d KB" % (fn, fp.stat().st_size // 1024))
            else:
                print("  FAIL %-46s HTTP %s" % (fn, r.stdout.strip()))
                if fp.exists():
                    fp.unlink()
        m["topics"][name] = {"folder_id": fid, "files": saved,
                             "count": len(saved)}
        print("\n[%s] 保存 %d 张 -> %s\n" % (name, len(saved), dest))
    save_manifest(m)


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--list", action="store_true")
    ap.add_argument("--scan", action="store_true")
    ap.add_argument("--download", action="store_true")
    ap.add_argument("--topic", type=int, default=None)
    a = ap.parse_args()

    for d in (RAW, BY_TOPIC, LOGS):
        d.mkdir(parents=True, exist_ok=True)

    if a.list or not (a.scan or a.download):
        cmd_list()
    if a.scan:
        cmd_scan()
    if a.download:
        cmd_download(a.topic)
