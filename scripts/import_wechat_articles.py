#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
把公众号文章（已发布 33 + 草稿 5）同步到小程序内容库，contentType=article（长文）。

已核实并排除 6 篇「空壳」——它们只有话题标签、0 张图、正文 35~105 字：
  规模期卖家的财税合规方案解析！！！        38 字
  成长期跨境卖家财税合规全流程拆解！          35 字
  香港|新加坡|英国|BVI企业注册详情对比！     105 字
  一张图看懂-亚马逊平台业务逻辑结构拆解        42 字
  下一个超越亚马逊的跨境电商平台会是哪个？      67 字
  连通性测试：WorkBuddy × 公众号 API（可删除） 97 字
→ 不是「内容在图里」，是真的没写正文。

用法：
  python3 import_wechat_articles.py --dry   # 预演
  python3 import_wechat_articles.py          # 入库（存 draft）
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

ROOT = Path("/Users/lx/项目文件/liuxuan/小程序搭建运营系统")
# 空壳标题（正文 <150 字 或 标题含「可删除」）
EXCLUDE_TITLES = {
    "规模期卖家的财税合规方案解析！！！",
    "成长期跨境卖家财税合规全流程拆解！",
    "香港|新加坡|英国|BVI企业注册详情对比！",
    "一张图看懂-亚马逊平台业务逻辑结构拆解",
    "下一个超越亚马逊的跨境电商平台会是哪个？",
    "连通性测试：WorkBuddy × 公众号 API",
}
MIN_TEXT_LEN = 150

# 分类映射：按标题/正文关键词命中已有分类
CATEGORY_RULES = [
    (11, ["税", "财税", "退税", "报关", "海关", "增值税", "架构设计", "注册", "BVI", "香港公司"]),
    (21, ["亚马逊", "Amazon", "促销码", "品牌", "A+", "Listing"]),
    (4,  ["平台", "独立站", "Shopify", "TikTok", "Temu", "eBay", "开店", "卖家"]),
    (6,  ["供应链", "物流", "履约", "赛维", "工厂", "采购"]),
    (7,  ["AI", "生产模式", "组织", "团队"]),
]
DEFAULT_CATEGORY = 4


def get_token():
    env = {}
    # 优先读 MP_ENV 指向的文件（服务器上 sudo 读不到 ~/.workbuddy 时用）
    env_path = os.environ.get("MP_ENV") or os.path.expanduser("~/.workbuddy/credentials/mp.env")
    p = Path(env_path)
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
    except Exception as e:
        return "ERR", str(e)[:80]


# ============================================================
# 清洗公众号 HTML
# ============================================================
TOPIC_LINK = re.compile(r'<a class="wx_topic_link".*?</a>', re.S)
SCRIPT_STYLE = re.compile(r'<(script|style)[^>]*>.*?</\1>', re.S)
EMPTY_P = re.compile(r'<p[^>]*>\s*(?:&nbsp;|<br\s*/?>|&#x3000;|\s)*</p>', re.I)
SECTITLE = re.compile(
    r'<p[^>]*>\s*(?:<span[^>]*>\s*)?(【[^】]{2,30}】|<strong[^>]*>([^<]{2,40})</strong>)\s*(?:</span>)?\s*</p>',
    re.I)


EMOJI_HEAD = re.compile(r"^[\U0001F300-\U0001FAFF\u2600-\u27BF\u2B00-\u2BFF]\s*")
SECTION_SEP = re.compile(r"^[—–\-=＊*]{3,}$")


def structure_plain_text(txt):
    """
    微信对部分文章返回的是**无标签纯文本**（实测 38 篇里 31 篇如此），
    直接塞进小程序会挤成一坨。这里按中文写作惯例补回结构：
      - 单行独句（≤18 字）且不以标点结尾 → 视为小标题，转 <h3>
      - 「❶ ❷ ❸」「①②③」「1. 2. 3.」等序号行 → 转 <p><strong>
      - 「📦 🌊 📱」等 emoji 引导行 → 转 <h3>
      - 其余按空行/换行切分为 <p>
    """
    if not txt:
        return ""
    lines = [ln.strip() for ln in txt.replace("\r\n", "\n").split("\n")]
    out, buf = [], []

    def flush():
        if buf:
            body = "".join(buf).strip()
            if body:
                out.append("<p>%s</p>" % body)
            buf.clear()

    for ln in lines:
        if not ln:
            flush()
            continue
        if SECTION_SEP.match(ln):
            flush()
            continue
        # emoji 引导的小标题
        if EMOJI_HEAD.match(ln) and len(ln) <= 20:
            flush()
            out.append("<h3>%s</h3>" % EMOJI_HEAD.sub("", ln))
            continue
        # 序号开头
        if re.match(r"^(?:[❶-❿①-⑳]\s*|\d{1,2}[.、)]\s*)", ln) and len(ln) <= 60:
            flush()
            out.append("<p><strong>%s</strong></p>" % ln)
            continue
        # 短独句且无结尾标点 → 小标题
        if len(ln) <= 18 and not re.search(r"[，。！？；：,.!?;:]$", ln) and not buf:
            out.append("<h3>%s</h3>" % ln)
            continue
        buf.append(ln)
    flush()
    return "".join(out)


def clean_html(html, keep_images=True):
    """把公众号 HTML 转成小程序可用的干净 HTML"""
    if not html:
        return ""
    # 无标签纯文本 → 先补结构
    if not re.search(r"<(?:p|section|h[1-6]|div|br)\b", html, re.I):
        return structure_plain_text(html)
    s = SCRIPT_STYLE.sub("", html)
    s = TOPIC_LINK.sub("", s)                       # 话题链接
    s = re.sub(r'<br\s*/?>\s*<br\s*/?>', '<br/>', s, flags=re.I)
    s = EMPTY_P.sub("", s)                           # 空段落
    if not keep_images:
        s = re.sub(r'<img[^>]*>', '', s, flags=re.I)
    s = re.sub(r'\s+class="[^"]*"', '', s)           # 冗余 class
    s = re.sub(r'\s+style="[^"]*"', '', s)
    s = re.sub(r'\s+data-[a-z-]+="[^"]*"', '', s)
    s = re.sub(r'<(\w+)\s*>', r'<\1>', s)            # 去掉多余属性
    s = re.sub(r'(</p>)\s*<p[^>]*>\s*(?=<)', r'\1', s)  # 合并被切断的段落
    s = re.sub(r'(<p[^>]*>)\s*', r'\1', s)
    s = s.strip()
    # 标题转 h3 便于小程序分节渲染
    s = SECTITLE.sub(lambda m: "<h3>%s</h3>" % (m.group(1) or m.group(2)), s)
    return s


def summarize(html, title, limit=76):
    """从正文抽一句做摘要"""
    txt = re.sub(r"<[^>]+>", " ", html)
    txt = re.sub(r"\s+", " ", txt).strip()
    txt = txt.replace(title, "").strip(" -—|｜")
    for sep in ("。", "！", "？", ".", "!", "?"):
        if sep in txt:
            cand = txt.split(sep)[0].strip()
            if len(cand) >= 12:
                return cand[:limit]
    return (txt[:limit] or title[:limit])


def pick_category(title, text):
    for cid, kws in CATEGORY_RULES:
        for kw in kws:
            if kw in title or kw in text[:300]:
                return cid
    return DEFAULT_CATEGORY


def upload_cover(url, title):
    """下载公众号封面并上传到素材库，返回站内相对路径。失败返回空串。"""
    safe = re.sub(r"[^\w\u4e00-\u9fff-]", "_", title)[:24] or "wx"
    tmp = Path("/tmp/wx_cover_%s.jpg" % safe)
    try:
        req = urllib.request.Request(url, headers={
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)"})
        with urllib.request.urlopen(req, timeout=30) as r:
            data = r.read()
        if len(data) < 3000:
            return ""
        tmp.write_bytes(data)
    except Exception:
        return ""

    try:
        from PIL import Image
        im = Image.open(tmp).convert("RGB")
        if im.width != 900:
            im = im.resize((900, round(im.height * 900 / im.width)), Image.LANCZOS)
        # 压到 150KB 以内
        for q in (86, 76, 66):
            im.save(tmp, "JPEG", quality=q, optimize=True)
            if tmp.stat().st_size < 150 * 1024:
                break
    except Exception:
        pass

    base, tok = get_token()
    boundary = "----WxCoverBoundary7MA4YWxkTrZu0gW"
    body = (("--%s\r\nContent-Disposition: form-data; name=\"file\"; filename=\"%s.jpg\"\r\n"
             "Content-Type: image/jpeg\r\n\r\n" % (boundary, safe)).encode()
            + tmp.read_bytes() + ("\r\n--%s--\r\n" % boundary).encode())
    req = urllib.request.Request(
        base + "/api/v1/admin/system/upload", data=body, method="POST",
        headers={"Authorization": "Bearer " + tok,
                 "Content-Type": "multipart/form-data; boundary=" + boundary})
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            j = json.loads(r.read().decode("utf-8", "replace"))
        if j.get("code") == 200:
            u = j["data"]["url"]
            p = u.split("zfculture.site", 1)[-1]
            return p if p.startswith("/") else "/" + p
    except Exception:
        pass
    finally:
        try:
            tmp.unlink()
        except Exception:
            pass
    return ""


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry", action="store_true")
    args = ap.parse_args()

    src = Path("/tmp/wx_full.json")
    if not src.exists():
        print("✗ 找不到 %s（需先用 wechat-sync 拉取含 content_html 的全量数据）" % src)
        return
    raw = json.loads(src.read_text(encoding="utf-8"))
    n_html = len([x for x in raw if x.get("content_html")])
    if n_html == 0:
        print("✗ %s 里没有 content_html 字段，用错源文件了（应拉 _wx_full.json）" % src.name)
        return
    print("源数据: %s（%d 条，其中 %d 条含正文 HTML）" % (src.name, len(raw), n_html))

    items, skipped = [], []
    for x in raw:
        t = (x.get("title") or "").strip()
        if t in EXCLUDE_TITLES or "可删除" in t:
            skipped.append((t, "空壳/测试稿"))
            continue
        if (x.get("text_len") or 0) < MIN_TEXT_LEN:
            skipped.append((t, "正文过短 %d 字" % x["text_len"]))
            continue
        items.append(x)

    print("=== 同步计划 ===")
    print("  原始 %d 条 → 入库 %d 条 / 排除 %d 条" % (len(raw), len(items), len(skipped)))
    for t, why in skipped:
        print("    ✗ %-38s %s" % (t[:36], why))

    base, tok = get_token()
    created = 0
    failed = []
    for i, x in enumerate(items, 1):
        title = x["title"].strip()
        html = clean_html(x.get("content_html") or "")
        text = re.sub(r"<[^>]+>", " ", html)
        summary = summarize(html, title)
        cat = pick_category(title, text)
        is_draft = x["src"] == "draft"
        payload = {
            "title": title,
            "content": html,
            "summary": summary,
            "contentType": "article",
            "author": "墨太白",
            "categoryId": cat,
            "tags": (["公众号草稿"] if is_draft else []) + ["公众号"],
            "source": "公众号",
            "sourceTag": "draft" if is_draft else "published",
            "originalUrl": x.get("url") or "",
            "status": "draft",     # 一律存草稿，等 lx 确认再发布
        }
        # 封面：公众号 thumb_url 是 mmbiz.qpic.cn 的临时链接，直接用会过期，
        # 需下载到本地上传（与小红书那批同一套流程）
        thumb = x.get("thumb_url") or ""
        if thumb:
            up = upload_cover(thumb, title)
            if up:
                payload["coverImage"] = up
        st, bd = call(base, tok, "/api/v1/admin/contents", "POST", payload)
        if st == 200 and '"code":200' in bd:
            created += 1
            new_id = (json.loads(bd).get("data") or {}).get("id")
            print("  ✅ %2d/%d id=%-5s %-34s cat=%-3d %s" % (
                i, len(items), new_id, title[:32], cat, "[草稿箱]" if is_draft else ""))
        else:
            failed.append((title, st, bd[:90]))
            print("  ❌ %2d/%d %s -> %s %s" % (i, len(items), title[:30], st, bd[:70]))
        time.sleep(0.2)

    print("\n完成：入库 %d / 失败 %d / 排除 %d" % (created, len(failed), len(skipped)))
    for t, st, bd in failed:
        print("  ✗", t[:36], st, bd)


if __name__ == "__main__":
    main()
