#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
ima 小红书图片自动压缩 + 批量上传

为什么要压缩（实测数据）：
  线上现有内容图片：平均 38 KB / 最大 51 KB
  ima 下载的原图：  平均 950 KB / 最大 2.1 MB   ← 25 倍差距
  nginx client_max_body_size 50m，单张 2MB 上传能过，但小程序列表页
  一次渲染多张 1MB 图会明显卡顿，流量也白烧。

产出两档（视觉验证：q72 档文字边缘依旧清晰，肉眼无差别）：
  detail  最长边 1200 / WebP q82  -> 目标 <= 180 KB（笔记正文配图 / 图集）
  cover   最长边 800  / WebP q72  -> 目标 <= 90  KB（列表页缩略封面）

用法：
  python3 compress_and_upload.py compress        # 只压缩，产出到 compressed/
  python3 compress_and_upload.py upload           # 只上传已压缩的
  python3 compress_and_upload.py all              # 压缩 + 上传 + 写 mapping
  python3 compress_and_upload.py cover  <文件>    # 额外压一张封面
"""
import io
import json
import os
import sys
import time
import hmac
import hashlib
import base64
import urllib.request
import urllib.error
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed

from PIL import Image

BASE = Path("/Users/lx/项目文件/liuxuan/小程序搭建运营系统/output/xhs-images")
BY_TOPIC = BASE / "by-topic"
COMPRESSED = BASE / "compressed"
MAPPING = BASE / "upload-mapping.json"

IMG_EXT = {".png", ".jpg", ".jpeg", ".webp"}

# 两档压缩参数
TIERS = {
    "detail": {"maxlong": 1200, "quality": 82, "budget": 180 * 1024},
    "cover":  {"maxlong": 800,  "quality": 72, "budget": 90 * 1024},
}

# 已知无压缩收益的格式（小尺寸纯色图等）
MIN_SAVE_RATIO = 0.90   # 压完至少省 10% 才用压缩版


def log(msg):
    print(msg, flush=True)


# ============================================================
# 1. 压缩
# ============================================================
def _encode(im, q):
    buf = io.BytesIO()
    im.save(buf, "WEBP", quality=q, method=4)
    return buf.getvalue()


def compress_one(src, tier="detail"):
    """按档位压缩单个文件。返回 (输出Path|None, 原始字节, 输出字节)"""
    cfg = TIERS[tier]
    raw = src.read_bytes()
    orig = len(raw)

    try:
        im = Image.open(src)
        im.load()
    except Exception as e:
        log("  ✗ 解码失败 %s: %s" % (src.name[:30], e))
        return None, orig, 0

    # 统一转 RGB（PNG 透明底在 JPG 上会变黑，但输出是 WebP，支持透明，这里保真优先）
    if im.mode not in ("RGB", "RGBA"):
        im = im.convert("RGBA" if "A" in im.mode else "RGB")

    ow, oh = im.size
    scale = min(1.0, cfg["maxlong"] / max(ow, oh))
    if scale < 1.0:
        im = im.resize((round(ow * scale), round(oh * scale)), Image.LANCZOS)

    # 先按标称质量编码
    q = cfg["quality"]
    data = _encode(im, q)

    # 超预算则逐步降质量（下限 55，再不行就接受当前值）
    while len(data) > cfg["budget"] and q > 55:
        q -= 6
        data = _encode(im, q)

    # 压缩收益不足 10% 就用原图（避免白白损画质）
    if len(data) > orig * MIN_SAVE_RATIO:
        return None, orig, orig

    # 统一输出 .webp 后缀 —— 编码格式已是 WebP，若沿用源文件的 .jpg/.png 后缀，
    # nginx 会按 image/jpeg 返回，Content-Type 与实际内容不符。
    rel = src.relative_to(BY_TOPIC).with_suffix(".webp")
    dst = COMPRESSED / tier / rel
    dst.parent.mkdir(parents=True, exist_ok=True)
    dst.write_bytes(data)
    return dst, orig, len(data)


def compress_all(tier="detail", workers=8):
    files = [f for f in BY_TOPIC.rglob("*")
             if f.is_file() and f.suffix.lower() in IMG_EXT]
    log("压缩档位=%s 待处理 %d 张（%d 线程）" % (tier, len(files), workers))
    t0 = time.time()
    done = skip = fail = 0
    o_tot = c_tot = 0
    with ThreadPoolExecutor(max_workers=workers) as ex:
        futs = {ex.submit(compress_one, f, tier): f for f in files}
        for fu in as_completed(futs):
            f = futs[fu]
            try:
                dst, o, c = fu.result()
            except Exception as e:
                fail += 1
                log("  ✗ %s: %s" % (f.name[:28], e))
                continue
            if dst is None:
                skip += 1
                o_tot += o
                c_tot += c
            else:
                done += 1
                o_tot += o
                c_tot += c
                if done % 20 == 0:
                    log("  ... %d/%d" % (done, len(files)))
    dt = time.time() - t0
    log("")
    log("完成：压缩 %d 张 / 保留原图 %d 张 / 失败 %d 张，耗时 %.1fs" % (done, skip, fail, dt))
    if o_tot:
        log("体积：%.1f MB -> %.1f MB（省 %.0f%%，%.1fx）"
            % (o_tot / 1048576, c_tot / 1048576,
               (1 - c_tot / o_tot) * 100, o_tot / c_tot))
    return done, skip, fail


# ============================================================
# 2. 上传
# ============================================================
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
    sig = b(hmac.new(env["MP_JWT_SECRET"].encode(), (h + "." + p).encode(), hashlib.sha256).digest())
    return env["MP_API_BASE"].rstrip("/"), h + "." + p + "." + sig


def upload_one(base, tok, f, timeout=120):
    """上传单文件，返回站内相对路径 /uploads/..."""
    boundary = "----WbBoundary7MA4YWxkTrZu0gW"
    body = (("--%s\r\nContent-Disposition: form-data; name=\"file\"; filename=\"%s\"\r\n"
             "Content-Type: application/octet-stream\r\n\r\n" % (boundary, f.name)).encode()
            + f.read_bytes() + ("\r\n--%s--\r\n" % boundary).encode())
    req = urllib.request.Request(
        base + "/api/v1/admin/system/upload", data=body, method="POST",
        headers={"Authorization": "Bearer " + tok,
                 "Content-Type": "multipart/form-data; boundary=" + boundary})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        j = json.loads(r.read().decode("utf-8", "replace"))
    if j.get("code") != 200:
        raise RuntimeError("code=%s msg=%s" % (j.get("code"), j.get("message")))
    url = j["data"]["url"]
    # 接口返回绝对 URL，站内一律存相对路径（与线上现有数据一致）
    p = url.split("zfculture.site", 1)[-1]
    if not p.startswith("/"):
        p = "/" + p
    return p


def upload_tree(tier="detail", workers=6, topics=None):
    root = COMPRESSED / tier
    if not root.exists():
        log("✗ %s 不存在，先跑 compress" % root)
        return {}
    files = sorted(f for f in root.rglob("*")
                   if f.is_file() and f.suffix.lower() in IMG_EXT)
    if topics:
        files = [f for f in files
                 if any(t in str(f) for t in topics)]
    if not files:
        log("没有待上传文件")
        return {}

    base, tok = get_token()
    log("上传档位=%s 共 %d 张（%d 并发）-> %s" % (tier, len(files), workers, base))
    t0 = time.time()
    ok_map, fail = {}, []
    done = 0
    with ThreadPoolExecutor(max_workers=workers) as ex:
        futs = {ex.submit(upload_one, base, tok, f): f for f in files}
        for fu in as_completed(futs):
            f = futs[fu]
            try:
                ok_map[str(f.relative_to(root))] = fu.result()
            except Exception as e:
                fail.append((str(f.relative_to(root)), str(e)[:80]))
            done += 1
            if done % 20 == 0:
                log("  ... %d/%d" % (done, len(files)))

    dt = time.time() - t0
    log("上传完成 %d 张 / 失败 %d 张，耗时 %.1fs（%.2f 张/秒）"
        % (len(ok_map), len(fail), dt, len(files) / dt if dt else 0))
    for k, v in fail[:5]:
        log("  ✗ %s -> %s" % (k[-50:], v))

    # 合并进 mapping
    m = {}
    if MAPPING.exists():
        m = json.loads(MAPPING.read_text(encoding="utf-8"))
    m.setdefault("uploads", {})[tier] = ok_map
    m["uploadedAt"] = time.strftime("%Y-%m-%d %H:%M:%S")
    MAPPING.write_text(json.dumps(m, ensure_ascii=False, indent=2), encoding="utf-8")
    log("映射已写入 %s" % MAPPING.name)
    return ok_map


def main():
    cmd = sys.argv[1] if len(sys.argv) > 1 else "all"
    topics = sys.argv[2:] if cmd in ("upload", "all") and len(sys.argv) > 2 else None
    if cmd == "compress":
        compress_all("detail")
        compress_all("cover")
    elif cmd == "upload":
        upload_tree("detail", topics=topics)
    elif cmd == "all":
        compress_all("detail")
        compress_all("cover")
        upload_tree("detail", topics=topics)
    elif cmd == "cover":
        # 单文件压封面：compress_and_upload.py cover <文件路径>
        src = Path(sys.argv[2])
        dst, o, c = compress_one(src, "cover")
        print("原 %.0f KB -> 封面 %.0f KB（省 %.0f%%）"
              % (o / 1024, c / 1024, (1 - c / o) * 100))
        print(dst or "（保留原图，压缩收益不足）")
    else:
        print(__doc__)


if __name__ == "__main__":
    main()
