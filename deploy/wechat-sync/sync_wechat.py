#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
公众号内容 -> 自有服务器 同步器

双通道：
  A. 官方 API 通道（需 认证 + 非个人主体 服务号/订阅号）
     - /cgi-bin/freepublish/batchget  拉已发布文章（含正文 HTML）
     - /cgi-bin/datacube/getarticlesummary  拉阅读/分享/点赞数据
  B. Cookie 通道（个人订阅号通用，绕过接口权限限制）
     - 直接请求 mp.weixin.qq.com/cgi-bin/appmsg 列表接口
     - cookie 从浏览器登录态导出，长期有效

产物：
  <out>/articles.json       全量文章（含正文，UTF-8）
  <out>/articles.csv        摘要表格
  <out>/stats.json          阅读统计快照
  <out>/index.html          静态镜像页（可直接挂 nginx）
  <out>/assets/<img_id>.*   正文图片

用法：
  python3 sync_wechat.py --config config.json
  python3 sync_wechat.py --config config.json --channel api   # 强制通道
  python3 sync_wechat.py --config config.json --test           # 只测连通性
"""

import argparse
import csv
import gzip
import hashlib
import io
import json
import os
import re
import sys
import time
import urllib.parse
from datetime import datetime, timezone, timedelta
from html import unescape

import requests

CST = timezone(timedelta(hours=8))
UA = ("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")

LOG_FILE = None


def log(msg, level="INFO"):
    line = "[%s] %-5s %s" % (datetime.now(CST).strftime("%Y-%m-%d %H:%M:%S"), level, msg)
    print(line, flush=True)
    if LOG_FILE:
        with open(LOG_FILE, "a", encoding="utf-8") as f:
            f.write(line + "\n")


# ============================================================
# 通道 A：官方 API
# ============================================================
class OfficialApiChannel:
    """需要公众号后台 -> 设置与开发 -> 基本配置 -> AppID / AppSecret"""

    name = "api"
    need = ("appid", "appsecret")

    def __init__(self, cfg):
        self.appid = cfg["appid"]
        self.appsecret = cfg["appsecret"]
        self.token = None
        self.token_expire = 0
        self.s = requests.Session()
        self.s.headers["User-Agent"] = UA

    def _post(self, path, payload):
        url = "https://api.weixin.qq.com%s?access_token=%s" % (path, self.get_token())
        r = self.s.post(url, json=payload, timeout=30)
        return _parse_json(r, path)

    def get_token(self):
        if self.token and time.time() < self.token_expire:
            return self.token
        url = ("https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential"
               "&appid=%s&secret=%s" % (self.appid, self.appsecret))
        r = self.s.get(url, timeout=20)
        j = _parse_json(r, "/cgi-bin/token")
        if "access_token" not in j:
            raise RuntimeError("取 token 失败：%s (errcode=%s)"
                               % (j.get("errmsg"), j.get("errcode")))
        self.token = j["access_token"]
        # 微信返回 expires_in，一般 7200s，提前 5 分钟刷新
        self.token_expire = time.time() + int(j.get("expires_in", 7200)) - 300
        log("access_token 获取成功，%s 后过期" % j.get("expires_in"))
        return self.token


    def fetch_articles(self, limit=200):
        """
        真实返回结构（已实测）：
          item[] 顶层只有 3 个键：
            article_id : str    长字符串 ID
            update_time: int    unix 时间戳
            content    : dict   { news_item: [...], create_time, update_time }
          真正的文章在 content.news_item[] 里，每条：
            title/author/digest/content(HTML str)/url/thumb_url/
            content_source_url/thumb_media_id/show_cover_pic/
            need_open_comment/only_fans_can_comment/is_deleted
        一次群发可能含多条子图文（多图文的第 2~N 条），逐条展开。
        """
        out, offset = [], 0
        while len(out) < limit:
            j = self._post("/cgi-bin/freepublish/batchget",
                           {"offset": offset, "count": 20, "no_content": 0})
            items = j.get("item") or []
            if not items:
                break
            for it in items:
                article_id = it.get("article_id") or ""
                group_ts = it.get("update_time")
                content = it.get("content") or {}
                # content 可能是 dict、也可能是老式的 HTML 字符串，做兼容
                if isinstance(content, str):
                    news_list = [{"title": "", "content": content}]
                elif isinstance(content, dict):
                    news_list = content.get("news_item") or []
                else:
                    news_list = []

                if not news_list:
                    log("跳过一条空内容（article_id=%s...）" % article_id[:12], "WARN")
                    continue

                # 组内子图文共用一个发布时间；优先用 news_item 自己的
                inner_ts = content.get("update_time") if isinstance(content, dict) else None
                ts = inner_ts or group_ts or 0

                for idx, n in enumerate(news_list, start=1):
                    n = n or {}
                    html = n.get("content") or ""
                    art = {
                        # 唯一键：article_id + 组内序号
                        "msgid": "%s-%d" % (article_id, idx) if len(news_list) > 1
                                 else article_id,
                        "article_id": article_id,
                        "index_in_group": idx,
                        "group_size": len(news_list),
                        "title": (n.get("title") or "").strip(),
                        "author": (n.get("author") or "").strip(),
                        "digest": (n.get("digest") or "").strip(),
                        "url": n.get("url") or "",
                        "thumb_url": n.get("thumb_url") or "",
                        "thumb_media_id": n.get("thumb_media_id") or "",
                        "content_source_url": n.get("content_source_url") or "",
                        "content_html": html,
                        "update_time": _fmt_ts(ts),
                        "need_open_comment": n.get("need_open_comment"),
                        "only_fans_can_comment": n.get("only_fans_can_comment"),
                        "is_deleted": n.get("is_deleted"),
                    }
                    out.append(art)

            if j.get("total_count", 0) <= offset + len(items):
                break
            offset += len(items)
            time.sleep(0.4)
        return out

    def fetch_stats(self, days=7):
        """图文分析数据。注意：仅认证号有权限；个人号会 48001。"""
        end = datetime.now(CST).date()
        begin = end - timedelta(days=days - 1)
        try:
            j = self._post("/cgi-bin/datacube/getarticlesummary",
                           {"begin_date": begin.strftime("%Y%m%d"),
                            "end_date": end.strftime("%Y%m%d")})
        except RuntimeError as e:
            log("统计接口不可用：%s" % e, "WARN")
            return None
        return j.get("list", [])


# ============================================================
# 通道 B：Cookie（个人订阅号可用）
# ============================================================
class CookieChannel:
    """
    从 mp.weixin.qq.com 登录态拿文章列表。
    cookie 来源（二选一）：
      1) 浏览器 DevTools 复制 Cookie 请求头，填进 config 的 cookie_raw
      2) 用 playwright 登录一次后由 --dump-cookie 导出
    token 从 https://mp.weixin.qq.com/cgi-bin/home?t=home/index&lang=zh_CN&token=xxx 提取
    """
    name = "cookie"
    need = ("cookie_raw",)

    def __init__(self, cfg):
        self.cookies = self._parse(cfg["cookie_raw"])
        self.s = requests.Session()
        self.s.headers.update({
            "User-Agent": UA,
            "Referer": "https://mp.weixin.qq.com/cgi-bin/home?t=home/index&lang=zh_CN",
            "X-Requested-With": "XMLHttpRequest",
        })
        for k, v in self.cookies.items():
            self.s.cookies.set(k, v)
        self.token = None

    @staticmethod
    def _parse(raw):
        out = {}
        for part in re.split(r"[;\n]+", raw.strip()):
            if "=" in part:
                k, v = part.split("=", 1)
                out[k.strip()] = v.strip()
        return out

    def _resolve_token(self):
        if self.token:
            return self.token
        r = self.s.get("https://mp.weixin.qq.com/cgi-bin/home?t=home/index&lang=zh_CN",
                       timeout=20, allow_redirects=True)
        m = re.search(r'token=(\d+)', r.url) or re.search(r'"token"\s*:\s*"?(\d+)"?', r.text)
        if not m:
            raise RuntimeError("cookie 已失效，提取不到 token（请重新导出）")
        self.token = m.group(1)
        log("cookie token 解析成功：%s" % self.token)
        return self.token

    def fetch_articles(self, limit=200):
        token = self._resolve_token()
        out, page = [], 0
        while len(out) < limit:
            url = ("https://mp.weixin.qq.com/cgi-bin/appmsg?action=list_ex&begin=%d&count=5"
                   "&fakeid=%s&type=9&query=&token=%s&lang=zh_CN&f=json"
                   % (page * 5, self.cookies.get("fakeid", ""), token))
            r = self.s.get(url, timeout=25)
            if "errcode" in r.text[:200]:
                raise RuntimeError("cookie 通道被拒：%s" % r.text[:200])
            j = _parse_json(r, "/cgi-bin/appmsg")
            items = j.get("app_msg_list") or []
            if not items:
                break
            for it in items:
                out.append({
                    "msgid": it.get("appmsgid") or it.get("id"),
                    "title": (it.get("title") or "").strip(),
                    "author": (it.get("author") or "").strip(),
                    "digest": (it.get("digest") or "").strip(),
                    "url": it.get("link", ""),
                    "thumb_media_id": it.get("cover", ""),
                    "content_html": it.get("content", ""),
                    "update_time": datetime.fromtimestamp(
                        it.get("update_time", 0), CST).isoformat(),
                    "read_num": it.get("read_num"),
                    "like_num": it.get("like_num"),
                    "comment_count": it.get("comment_count"),
                    "reward_num": it.get("reward_num"),
                })
            log("cookie 通道已取 %d 篇" % len(out))
            page += 1
            time.sleep(1.2)   # 别打爆，建议 >=1s
        return out

    def fetch_stats(self, days=7):
        return None


# ============================================================
# 工具函数
# ============================================================
def _parse_json(resp, path):
    """
    解析微信 API 响应（防乱码）。

    实测坑：微信 freepublish/batchget 返回 `Content-Type: text/plain`，**不带
    charset**。按 HTTP 规范，requests 对无 charset 的 text/* 默认 ISO-8859-1，
    于是 UTF-8 字节 e4 b8 8d（「不」）被当成 latin-1 解成 'ä¸\x8d'，
    标题/正文全变乱码；而响应体本身是合法 UTF-8，字节层面完全正确。

    对策：显式按 UTF-8 解码字节，不依赖 requests 的 encoding 猜测。
    保留双重编码兜底（若某些接口真的双编码，中文字符数比对会识别出来）。
    """
    raw = resp.content
    ctype = resp.headers.get("Content-Type", "")
    m = re.search(r"charset=([\w-]+)", ctype, re.I)
    declared = m.group(1).lower() if m else None

    text = None
    # 优先用声明的字符集，但 text/plain 无 charset 时不信任 requests 默认值
    if declared and declared not in ("iso-8859-1", "latin-1"):
        try:
            text = raw.decode(declared)
        except (UnicodeDecodeError, LookupError):
            text = None
    if text is None:
        for enc in ("utf-8", "utf-8-sig", "gbk", "latin-1"):
            try:
                text = raw.decode(enc)
                break
            except (UnicodeDecodeError, LookupError):
                continue

    if text is None:
        raise RuntimeError("%s 响应解码失败（%s）" % (path, ctype))

    try:
        j = json.loads(text)
    except Exception:
        raise RuntimeError("%s 返回非 JSON：%s" % (path, text[:200]))

    # 双重编码兜底：修复后中文字符变多才采纳
    if isinstance(j, (dict, list)):
        fixed_text = _try_fix_double_encode(text)
        if fixed_text is not None:
            j = json.loads(fixed_text)
            log("响应疑似双重编码，已自动修复", "WARN")

    if isinstance(j, dict) and j.get("errcode"):
        raise RuntimeError("%s errcode=%s errmsg=%s"
                           % (path, j["errcode"], j.get("errmsg")))
    return j


_CJK = re.compile("[\u4e00-\u9fff]")


def _try_fix_double_encode(text):
    """把被双重编码的文本还原：latin-1 取回原始字节，再按 utf-8 解。
    仅当中文字符数增加且仍是合法 JSON 时返回新串，否则 None。
    """
    try:
        candidate = text.encode("latin-1").decode("utf-8")
    except (UnicodeDecodeError, UnicodeEncodeError):
        return None
    if len(_CJK.findall(candidate)) > len(_CJK.findall(text)):
        try:
            json.loads(candidate)
        except Exception:
            return None
        return candidate
    return None


def _fmt_ts(ts):
    """微信时间戳 -> 本地时区 ISO 字符串。ts 可能为 None/0/字符串，容错处理。"""
    try:
        n = int(ts or 0)
    except (TypeError, ValueError):
        return ""
    if n <= 0:
        return ""
    return datetime.fromtimestamp(n, CST).isoformat()


def strip_html(html):
    if not html or not isinstance(html, str):
        return ""
    t = re.sub(r"<(script|style)[^>]*>.*?</\1>", " ", html, flags=re.S | re.I)
    t = re.sub(r"<br\s*/?>", "\n", t, flags=re.I)
    t = re.sub(r"</p>", "\n\n", t, flags=re.I)
    t = re.sub(r"<[^>]+>", "", t)
    t = unescape(t)
    t = re.sub(r"[ \t\xa0]+", " ", t)
    t = re.sub(r"\n{3,}", "\n\n", t)
    return t.strip()


def download_images(article, out_dir, session):
    """下载正文图片到本地，替换为相对路径"""
    html = article.get("content_html") or ""
    if not isinstance(html, str) or not html:
        return 0
    os.makedirs(out_dir, exist_ok=True)
    n = 0
    cache = {}

    def repl(m):
        nonlocal n
        url = m.group(1)
        if url.startswith("//"):
            url = "https:" + url
        if not url.startswith("http"):
            return m.group(0)
        if url in cache:
            return 'src="%s"' % cache[url]
        ext = os.path.splitext(urllib.parse.urlparse(url).path)[1] or ".jpg"
        if ext.lower() not in (".jpg", ".jpeg", ".png", ".gif", ".webp"):
            ext = ".jpg"
        name = hashlib.md5(url.encode()).hexdigest()[:16] + ext
        path = os.path.join(out_dir, name)
        try:
            if not os.path.exists(path):
                r = session.get(url, timeout=30)
                r.raise_for_status()
                with open(path, "wb") as f:
                    f.write(r.content)
            cache[url] = "assets/%s" % name
            n += 1
        except Exception as e:
            log("图片下载失败 %s：%s" % (url[:80], e), "WARN")
            return m.group(0)
        return 'src="assets/%s"' % name

    html = re.sub(r'src=["\']([^"\']+)["\']', repl, html)
    article["content_html"] = html
    return n


def build_index(articles, out_dir):
    """生成静态镜像页"""
    rows = []
    for a in articles:
        fn = "article-%s.html" % (a.get("msgid") or abs(hash(a.get("title", ""))))
        rows.append((a, fn))

    art_css = (
        "body{max-width:720px;margin:40px auto;padding:0 20px;"
        "font:16px/1.9 -apple-system,'PingFang SC',sans-serif;color:#2b2b2b}\n"
        "h1{font-size:24px;line-height:1.5}\n"
        ".meta{color:#999;font-size:13px;margin-bottom:28px;"
        "padding-bottom:16px;border-bottom:1px solid #eee}\n"
        "img{max-width:100%;height:auto}\n"
        ".back{display:inline-block;margin-bottom:24px;color:#c08e6e;"
        "text-decoration:none;font-size:14px}\n"
    )

    def esc(s):
        """转义标题/作者里的 HTML 元字符"""
        return (str(s or "").replace("&", "&amp;").replace("<", "&lt;")
                .replace(">", "&gt;").replace('"', "&quot;"))

    for a, fn in rows:
        title = esc(a.get("title", ""))
        author = esc(a.get("author") or "佚名")
        body = (
            '<!doctype html><html lang="zh-CN"><head><meta charset="utf-8">\n'
            '<meta name="viewport" content="width=device-width,initial-scale=1">\n'
            '<title>' + title + '</title>\n<style>\n'
            + art_css + '</style></head><body>\n'
            '<a class="back" href="index.html">&larr; 返回目录</a>\n'
            '<h1>' + title + '</h1>\n'
            '<div class="meta">' + a.get("update_time", "")[:16].replace("T", " ")
            + ' &nbsp;|&nbsp; ' + author + '</div>\n'
            + (a.get("content_html") or "")
            + '\n</body></html>'
        )
        with open(os.path.join(out_dir, fn), "w", encoding="utf-8") as f:
            f.write(body)

    items = []
    for a, fn in rows:
        meta = a.get("update_time", "")[:16].replace("T", " ")
        read = a.get("read_num")
        read_txt = " 阅读 " + str(read) if read else ""
        items.append(
            '<li><a href="' + fn + '">' + esc(a.get("title", "")) + '</a>'
            '<span class="d">' + meta + read_txt + '</span></li>'
        )
    idx_css = (
        "body{max-width:760px;margin:40px auto;padding:0 20px;"
        "font:16px/1.8 -apple-system,'PingFang SC',sans-serif;color:#2b2b2b}\n"
        "h1{font-size:26px;margin-bottom:6px}\n"
        ".sub{color:#999;font-size:13px;margin-bottom:32px}\n"
        "ul{list-style:none;padding:0}\n"
        "li{padding:14px 0;border-bottom:1px solid #f0f0f0}\n"
        "a{color:#2b2b2b;text-decoration:none;font-weight:500}\n"
        "a:hover{color:#c08e6e}\n"
        ".d{display:block;color:#aaa;font-size:12px;margin-top:4px}\n"
    )
    chan = articles[0].get("source_channel", "") if articles else ""
    index = (
        '<!doctype html><html lang="zh-CN"><head><meta charset="utf-8">\n'
        '<meta name="viewport" content="width=device-width,initial-scale=1">\n'
        '<title>公众号文章镜像</title>\n<style>\n' + idx_css + '</style></head><body>\n'
        '<h1>公众号文章镜像</h1>\n'
        '<div class="sub">共 ' + str(len(rows)) + ' 篇 &nbsp;|&nbsp; 生成于 '
        + datetime.now(CST).strftime("%Y-%m-%d %H:%M") + ' &nbsp;|&nbsp; 源：'
        + chan + '</div>\n'
        '<ul>' + "".join(items) + '</ul>\n</body></html>'
    )
    with open(os.path.join(out_dir, "index.html"), "w", encoding="utf-8") as f:
        f.write(index)


def write_outputs(articles, stats, out_dir, channel_name, session):
    os.makedirs(out_dir, exist_ok=True)
    for a in articles:
        a["source_channel"] = channel_name
        a["content_text"] = strip_html(a.get("content_html"))

    with open(os.path.join(out_dir, "articles.json"), "w", encoding="utf-8") as f:
        json.dump({"synced_at": datetime.now(CST).isoformat(),
                   "channel": channel_name, "total": len(articles),
                   "articles": articles}, f, ensure_ascii=False, indent=2)

    cols = ["msgid", "article_id", "index_in_group", "group_size", "title",
            "author", "digest", "update_time", "url", "thumb_url",
            "read_num", "like_num", "comment_count", "word_count",
            "source_channel"]
    with open(os.path.join(out_dir, "articles.csv"), "w", encoding="utf-8-sig", newline="") as f:
        w = csv.DictWriter(f, fieldnames=cols, extrasaction="ignore")
        w.writeheader()
        for a in articles:
            a["word_count"] = len(a.get("content_text", ""))
            w.writerow(a)

    if stats is not None:
        with open(os.path.join(out_dir, "stats.json"), "w", encoding="utf-8") as f:
            json.dump({"synced_at": datetime.now(CST).isoformat(),
                       "channel": channel_name, "stats": stats},
                      f, ensure_ascii=False, indent=2)

    build_index(articles, out_dir)
    return len(articles)


# ============================================================
def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--config", required=True)
    ap.add_argument("--channel", choices=["api", "cookie", "auto"], default="auto")
    ap.add_argument("--limit", type=int, default=200)
    ap.add_argument("--out", default=None)
    ap.add_argument("--no-images", action="store_true")
    ap.add_argument("--test", action="store_true", help="只测连通性，不落盘")
    ap.add_argument("--dump-cookie", action="store_true", help="从本机 Chrome 导出 mp.weixin.qq.com cookie")
    args = ap.parse_args()

    with open(args.config, encoding="utf-8") as f:
        cfg = json.load(f)
    out_dir = args.out or cfg.get("out_dir", "./wechat-out")
    global LOG_FILE
    os.makedirs(out_dir, exist_ok=True)
    LOG_FILE = os.path.join(out_dir, "sync.log")

    if args.dump_cookie:
        dump_cookie_from_chrome()
        return

    order = ["api", "cookie"] if args.channel == "auto" else [args.channel]
    last_err = None
    skipped = []
    for cname in order:
        cls = {"api": OfficialApiChannel, "cookie": CookieChannel}[cname]
        missing = [k for k in cls.need if not cfg.get(k)]
        if missing:
            msg = "config 缺少：%s" % ",".join(missing)
            skipped.append("%s 通道 -> %s" % (cname, msg))
            log("通道 %s 跳过，%s" % (cname, msg), "WARN")
            continue
        try:
            log("===== 尝试通道 %s =====" % cname)
            ch = cls(cfg)
            if args.test:
                arts = ch.fetch_articles(limit=2)
                log("连通 OK，取到 %d 篇（含正文）" % len(arts), "OK")
                return
            arts = ch.fetch_articles(limit=args.limit)
            log("拉取完成：%d 篇" % len(arts), "OK")
            if not args.no_images:
                s = requests.Session()
                s.headers["User-Agent"] = UA
                for a in arts:
                    download_images(a, os.path.join(out_dir, "assets"), s)
                log("图片本地化完成")
            stats = ch.fetch_stats()
            n = write_outputs(arts, stats, out_dir, cname, requests.Session())
            log("落盘完成：%d 篇 -> %s" % (n, out_dir), "OK")
            return
        except Exception as e:
            last_err = e
            log("通道 %s 失败：%s" % (cname, e), "ERROR")

    if last_err is None:
        log("没有可用通道（凭据未配置）。请编辑 %s 填入 appid/appsecret"
            " 或 cookie_raw：" % args.config, "ERROR")
        for s in skipped:
            log("  " + s, "ERROR")
    else:
        log("全部通道失败：%s" % last_err, "ERROR")
    sys.exit(1)


def dump_cookie_from_chrome():
    """从本机 Chrome/Chromium 的 Login Data + Cookies 库导出 mp.weixin.qq.com cookie。
    macOS 需要钥匙串授权；建议直接用浏览器 DevTools 手工复制更省事。"""
    raise SystemExit(
        "请改用更简单的方式：\n"
        "1. Chrome 登录 mp.weixin.qq.com\n"
        "2. F12 -> Network -> 任一请求 -> Request Headers -> 复制整条 Cookie\n"
        "3. 粘贴到 config.json 的 cookie_raw"
    )


if __name__ == "__main__":
    main()
