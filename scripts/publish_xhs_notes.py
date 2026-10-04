#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
把 ima「小红书图文内容」批量发布为小程序内容（笔记形态）。

形态约定（lx 确认）：
  一张图 = 一条独立笔记（content_type=article），不做主题合并。

文字策略：
  ima 只给 OCR 文本（introduction 字段），本脚本做「笔记化改写」：
  1. 清理 OCR 噪声（LaTeX 公式、markdown 残留、截图界面碎片、引流尾缀）
  2. 提取真实标题（剥掉「03-01/05系列笔记·站外流量篇第三期」这类前缀）
  3. 保守分节（只认独占一行的序号小标题，避免误切数字如 9710）
  4. 生成 HTML（h3 小标题 + p 正文）与摘要

图片说明：
  ima fetch_media_content 只返回 OCR 文字，拿不到图片二进制；
  cover_urls 是占位图。因此笔记暂不带封面图与图集。

用法：
  python3 build_xhs_notes.py                     # 生成 xhs_notes.json
  python3 publish_xhs_notes.py --dry             # 预览不发布
  python3 publish_xhs_notes.py                   # 实际发布（存草稿）
"""

import base64
import hashlib
import hmac
import json
import os
import re
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path


# ============================================================
# 凭据 & API
# ============================================================
def load_env():
    env = {}
    p = Path(os.path.expanduser("~/.workbuddy/credentials/mp.env"))
    for line in p.read_text(encoding="utf-8").split("\n"):
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            k, v = line.split("=", 1)
            env[k.strip()] = v.strip()
    return env


ENV = load_env()
API = ENV["MP_API_BASE"].rstrip("/")
SECRET = ENV["MP_JWT_SECRET"]
AUTHOR = "跨境墨太白"


def jwt():
    b = lambda d: base64.urlsafe_b64encode(d).rstrip(b"=").decode()
    now = int(time.time())
    h = b(json.dumps({"alg": "HS256", "typ": "JWT"}, separators=(",", ":")).encode())
    pl = b(json.dumps({"userId": 1, "sub": "admin", "typ": "access",
                        "iat": now, "exp": now + 7200}, separators=(",", ":")).encode())
    sig = b(hmac.new(SECRET.encode(), (h + "." + pl).encode(), hashlib.sha256).digest())
    return h + "." + pl + "." + sig


TOKEN = jwt()


def api(path, method="GET", body=None):
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(
        API + path, data=data, method=method,
        headers={"Authorization": "Bearer " + TOKEN,
                 "Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            return r.status, r.read().decode("utf-8", "replace")
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode("utf-8", "replace")
    except Exception as e:
        return "ERR", str(e)


# ============================================================
# 正则：界面噪声识别
# ============================================================
# 整行就是界面元素（商品页标签、纯数字）
UI_NOISE = re.compile(
    r"^(?:amazon|amzon|in stock|promo code|save\d*|live|active|list price|"
    r"add to cart|buy now|noise cancelling|focus|today's sales|inventory|"
    r"stock turnover)\s*$", re.I)

# 行内英文标签
INLINE_NOISE = re.compile(
    r"(?:amazon|amzon|amanzon|promo code|save\d+|in stock|list price|"
    r"stock turnover|today's sales|inventory|noise cancelling)\s*:?\s*", re.I)

# 行内孤立英文单词（截图按钮/标签）
_FRAG_WORD = re.compile(
    r"\b(?:stock|code|off|save|cash|in|price|add|cart|buy|now|live|active|"
    r"new|best|seller)\b\s*:?\s*", re.I)

# 行内纯数字/金额/百分比片段
_FRAG_NUM = re.compile(r"[（(]?\d+(?:\.\d+)?\)?%?\s*")

# 纯符号行
_SYMBOL_ONLY = re.compile(
    r"^[#\s|/\-—=·•◆●■□▶◀✓√✗()$%．.、,，:：;；'\"“”‘’+*&@#]+$")

# 引流尾缀（切掉用）
TAIL_CUT = ["如何领取", "评论区扣", "评论区留言", "免费领取", "福利资料",
            "看置顶评论", "私信我"]

# 逐行清洗时直接丢弃的引流词
DROP_WORDS = ["@跨境墨太白", "@跨境圈太白", "@墨太白",
              "建议收藏", "建议逐条自查", "福利资料"]

# 系列编号头关键词
# 只保留「几乎不可能出现在正文里」的结构词，避免误伤正常标题。
# （曾把「生态」「全景」「看懂」等泛化词列入，导致「六大平台类型，一图看懂区别」
#   「一张图看懂」这类真标题被误判为编号头。）
SERIES_WORDS = ("系列笔记", "系列图", "全系列", "深度拆解", "节点",
                "张图", "个漏点", "共", "漏点", "步骤", "阶段", "序号",
                "系列笔记", "篇")


# ============================================================
# OCR 清洗
# ============================================================
def strip_inline_fragments(line):
    """
    剥离一行里的截图碎片（商品页元素、金额、英文标签）。
    中文占比够高时整行保留，避免误伤正文；中文不足一半时才逐块剥离。
    """
    cn = len(re.findall(r"[\u4e00-\u9fff]", line))
    if cn == 0:
        return ""
    if cn / len(line) >= 0.55:
        return line

    t = INLINE_NOISE.sub("", line)
    t = _FRAG_WORD.sub(" ", t)
    for _ in range(6):                      # 反复剥纯数字片段
        new = _FRAG_NUM.sub(" ", t)
        if new == t:
            break
        t = new
    t = re.sub(r"[^\u4e00-\u9fff]{2,}", " ", t)
    t = re.sub(r"\s+", " ", t).strip()
    return t if len(re.findall(r"[\u4e00-\u9fff]", t)) >= 4 else ""


def clean_ocr(text):
    """把 OCR 文本清洗成可读正文"""
    if not text:
        return ""

    t = text

    # 1. HTML 表格 -> 行分隔
    t = re.sub(r"</t[dh]>\s*<tr>", "\n", t)
    t = re.sub(r"<tr>|</tr>", "\n", t)
    t = re.sub(r"<t[dh][^>]*>", " | ", t)
    t = re.sub(r"<table[^>]*>|</table>", "\n", t)
    t = re.sub(r"<br\s*/?>|</p>", "\n", t)
    t = re.sub(r"<[^>]+>", "", t)

    # 2. LaTeX 公式 -> 可读文本
    t = re.sub(r"\$\$\s*\\text\{([^}]*)\}\s*([^*]*?)\s*\$\$",
               lambda m: m.group(1) + " " + m.group(2), t)
    t = re.sub(r"\$([^$]{1,80})\$",
               lambda m: m.group(1), t)
    t = re.sub(r"\\begin\{[^}]+\}.*?\\end\{[^}]+\}", "", t, flags=re.S)
    t = re.sub(r"\\[a-zA-Z]+", "", t)
    t = re.sub(r"[${}]", "", t)
    t = t.replace("\\times", "×").replace("\\%", "%").replace("\\div", "÷")

    # 3. markdown 残留：# 在 OCR 里是换行符，还原
    t = t.replace("**", "").replace("`", "")
    t = re.sub(r"#\s{2,}", "\n", t)
    t = re.sub(r"#{2,}", "\n", t)
    t = t.replace("#", "")

    # 4. 切掉尾部引流块
    for cut in TAIL_CUT:
        idx = t.find(cut)
        if idx > 60:
            t = t[:idx]

    # 5. 逐行清洗
    lines = []
    for raw in t.split("\n"):
        s = raw.strip()
        if not s:
            continue
        for w in DROP_WORDS:
            s = s.replace(w, "")
        s = s.strip()
        if not s or _SYMBOL_ONLY.match(s):
            continue
        # 剥离行内截图碎片
        s = strip_inline_fragments(s)
        if not s:
            continue
        lines.append(s)

    return "\n".join(lines)


# ============================================================
# 标题提取
# ============================================================
# 源文件命名法（lx 人工命名，最可靠）
#   "01-05_打折到底值不值.jpg"        -> 打折到底值不值
#   "06-2_稳卖Agent.png"              -> 稳卖Agent：上传样图生成套图提示词（无标题时用主题兜底）
#   "03-05_促销码真正要算的是这6本账.jpg" -> 促销码真正要算的是这6本账
def title_from_filename(fname):
    """从源文件名提取标题（人工命名，准确率最高）"""
    if not fname:
        return ""
    stem = fname.rsplit("/", 1)[-1]
    stem = re.sub(r"\.[A-Za-z]{1,4}$", "", stem)
    stem = re.sub(r"\(\d+\)$", "", stem).strip()

    # 自动命名（ChatGPT Image / Snipaste / 微信图片 / 时间戳）不可用，走 OCR 兜底
    if re.match(r"^(ChatGPT\s*Image|Snipaste|微信图片|WeChat\s*Image)", stem, re.I):
        return ""
    if re.fullmatch(r"[\d_\-\s年月日]+", stem):     # 纯时间戳文件名
        return ""

    # 去掉开头编号：01-05_ / 03-01-05_ / 06-2_
    stem2 = re.sub(r"^[-\d]{2,}[-_]?", "", stem).strip(" -_")
    if len(stem2) >= 4 and re.search(r"[\u4e00-\u9fff]", stem2):
        return stem2[:40]
    return ""


def title_from_ocr(cleaned, fallback):
    """
    OCR 首行兜底：取第一行有实质中文的内容。
    纯系列编号头（含「系列笔记/共N节点/01/05」等且去掉数字符号后剩 <=5 字）跳过。
    """
    lines = [l.strip() for l in cleaned.split("\n")[:8] if l.strip()]
    cands = []
    for l in lines:
        if re.match(r"^[\d\s/\-–—·・:：,，.。%（）()【】\[\]#]+$", l):
            continue
        if UI_NOISE.match(l):
            continue
        # 判定是否编号头：去掉数字/符号后剩余中文 <=5 且含结构词
        core = re.sub(r"[\d\s/\-–—·・:：,，.。%（）()【】\[\]#]+", "", l)
        is_hdr = (any(w in l for w in SERIES_WORDS)
                  and len(core) <= 5)
        if is_hdr:
            continue
        c = re.sub(r"[（(]\s*\d+\s*/\s*\d+\s*[）)]\s*$", "", l).strip()
        if c:
            cands.append(c)

    for c in cands:
        cn = len(re.findall(r"[\u4e00-\u9fff]", c))
        if cn >= 6 and 6 <= len(c) <= 40:
            return c
    return cands[0][:40] if cands else fallback


def is_subhead(line):
    """
    小标题判定：序号开头 + 整行短 + 序号后是短词组。
    只认独占一行的，避免误伤 OCR 连成行的正文（含 9710/9610 等税号）。
    """
    s = line.strip()
    if not s or len(s) > 24 or UI_NOISE.match(s):
        return False
    m = re.match(r"^(?:[①-⑳]|\d{1,2})\s*[、.．]?\s*(\S+)", s)
    if not m:
        return False
    word = m.group(1)
    if len(word) > 12 or re.search(r"[，。？；]", word):
        return False
    return True


def split_sections(body):
    """按独占一行的序号小标题切节，返回 [(小标题|None, 正文)]"""
    secs, cur_head, cur = [], None, []
    for line in body.split("\n"):
        s = line.strip()
        if not s:
            continue
        if is_subhead(s):
            if cur:
                secs.append((cur_head, "\n".join(cur)))
            cur_head, cur = s, []
        else:
            cur.append(s)
    if cur:
        secs.append((cur_head, "\n".join(cur)))
    return secs or [(None, body)]


def _restore_tables(body):
    """
    OCR 里的表格会退化成一整行「|a|b|c|1 卖家|设定目标|…」。
    实测直接还原成 table 会把标题和前面的正文一起吞进第一个单元格，
    因此这里只做「竖线 -> 空格」的净化，不硬造表格结构——
    宁可少一点结构，也不要错乱的内容。
    """
    out = []
    for l in body.split("\n"):
        s = l.strip()
        if not s:
            continue
        if s.count("|") >= 2:
            cells = [c.strip() for c in s.split("|")]
            cells = [c for c in cells if c]
            # 只保留有中文的单元格
            cells = [c for c in cells if re.search(r"[\u4e00-\u9fff]", c)]
            if cells:
                out.append(" ".join(cells))
                continue
        out.append(s)
    return out


_NUMLIST = re.compile(r"\s*(\d{2})\s+([\u4e00-\u9fff][^0-9]{0,40}?)(?=\s\d{2}\s|$)")


def _split_numbered_list(text):
    """
    把「01看全局理解… 02看趋势看清…」这类被 OCR 连成一行的编号清单切开。
    编号必须是两位数（01/02/…），避免误伤金额与年份。
    """
    ms = list(re.finditer(r"(?<!\d)(\d{2})\s(?=[\u4e00-\u9fff])", text))
    if len(ms) < 2:
        return [text]
    parts, prefix = [], text[:ms[0].start()].strip()
    if prefix:
        parts.append(prefix)
    for i, m in enumerate(ms):
        end = ms[i + 1].start() if i + 1 < len(ms) else len(text)
        seg = text[m.start():end].strip()
        if seg:
            parts.append(seg)
    return parts


def build_html(body):
    """生成 HTML：小标题 h3 / 表格 table / 编号清单拆行 / 其余 p"""
    html = []
    for head, content in split_sections(body):
        if head:
            html.append("<h3>%s</h3>" % head)

        # 先还原表格，再把编号清单切开
        for block in _restore_tables(content):
            if block.startswith("<table"):
                html.append(block)
                continue
            for line in block.split("\n"):
                s = line.strip()
                if not s:
                    continue
                if is_subhead(s):
                    html.append("<h3>%s</h3>" % s)
                    continue
                for piece in _split_numbered_list(s):
                    piece = piece.strip()
                    if piece:
                        html.append("<p>%s</p>" % piece)

    html.append("<p><em>本文整理自跨境墨太白小红书内容库，"
                "数据与政策以最新官方口径为准。</em></p>")
    return "".join(html)


def _clean_snippet(s, limit=56):
    """把一段文字收拾成摘要"""
    s = s.strip()
    # 剥离后残留的孤立数字/字母（「这 本账」「多本账」）
    s = re.sub(r"(?<=[\u4e00-\u9fff])\s+[A-Za-z0-9]{1,3}\s+(?=[\u4e00-\u9fff])",
               "", s)
    # 剥离长串英文/数字（amazon / 59.99 / 20% OFF）
    s = re.sub(r"[A-Za-z]{3,}|[\d]+\.\d+|\d+\s*%", " ", s)
    s = re.sub(r"\s{2,}", " ", s)
    s = re.sub(r"[\s\-–—·,，、:：|/\\]+$", "", s).strip()
    if len(s) > limit:
        cut = max(s.rfind(c, 0, limit) for c in "。？！，、")
        s = s[:cut] if cut >= limit // 2 else s[:limit]
    return s.strip()


def make_summary(body, title):
    """摘要：标题够长直接用（人工命名最准），否则从正文取第一句完整中文"""
    t = _clean_snippet(title, 56)
    if len(t) >= 14:
        return t

    for line in body.split("\n"):
        s = line.strip()
        if not s or UI_NOISE.match(s):
            continue
        if re.match(r"^\d{1,2}[-/]\d{2}", s):
            continue
        cand = _clean_snippet(re.split(r"[。？！\n]", s)[0], 56)
        cn = len(re.findall(r"[\u4e00-\u9fff]", cand))
        if cn >= 12:
            return cand
    return t or title[:56]


def build_note(ocr, topic_name, src_title):
    """一张图 -> 一条笔记；内容过短返回 None"""
    cleaned = clean_ocr(ocr)
    if len(cleaned) < 30:
        return None

    # 标题优先级：源文件名（人工命名）> OCR 首行
    title = title_from_filename(src_title) or title_from_ocr(cleaned, src_title)

    # 去掉正文里与标题重复的首行
    lines = cleaned.split("\n")
    body_lines = lines
    for i, l in enumerate(lines[:6]):
        if l.strip() == title:
            body_lines = lines[i + 1:]
            break
    body = "\n".join(body_lines).strip()
    if len(body) < 20:
        body = cleaned

    return {
        "title": title,
        "_topic": topic_name,
        "content": build_html(body),
        "summary": make_summary(body, title),
        "contentType": "article",
        "author": AUTHOR,
        "tags": ["小红书", topic_name],
    }


# ============================================================
def main():
    argv = sys.argv[1:]
    dry = "--dry" in argv or "-n" in argv
    src = next((a for a in argv if not a.startswith("-")), "xhs_notes.json")

    items = json.load(open(src, encoding="utf-8"))["notes"]
    print("待发布笔记 %d 条（dry=%s）" % (len(items), dry))

    if dry:
        for n in items:
            txt = re.sub(r"<[^>]+>", " ", n["content"]).strip()
            cat = n.get("categoryName", {})
            print("\n" + "=" * 66)
            print("标题 ｜ %s" % n["title"])
            print("分类 ｜ %s (id=%s)" % (cat.get("name"), cat.get("id")))
            print("摘要 ｜ %s" % n["summary"])
            print("正文 ｜ %d 字 / %d 段 / h3 标题 %d 个"
                  % (len(txt), n["content"].count("<p>"),
                     n["content"].count("<h3>")))
            print("HTML ｜ %s" % n["content"][:240])
        return

    ok, fail = 0, []
    for i, n in enumerate(items, 1):
        cat = n.get("categoryName") or {}
        payload = {
            "title": n["title"],
            "content": n["content"],
            "summary": n["summary"],
            "contentType": "article",
            "author": n.get("author", AUTHOR),
            "tags": n.get("tags", []),
        }
        if cat.get("id"):
            payload["categoryId"] = cat["id"]

        st, body = api("/api/v1/admin/contents", "POST", payload)
        if st == 200 and '"code":200' in body:
            ok += 1
            print("[%d/%d] OK   %s" % (i, len(items), n["title"][:32]))
        else:
            fail.append((n["title"], st, body[:150]))
            print("[%d/%d] FAIL %s -> %s %s"
                  % (i, len(items), n["title"][:26], st, body[:110]))
        time.sleep(0.3)

    print("\n成功 %d / 失败 %d" % (ok, len(fail)))
    for t, st, b in fail[:8]:
        print("  FAIL:", t, st, b)


if __name__ == "__main__":
    main()