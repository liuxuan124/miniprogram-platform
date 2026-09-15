#!/usr/bin/env python3
"""补全中国风图片：上传主视觉/Logo/封面，回填文章封面，更新页面与品牌。"""
from __future__ import annotations

import io
import json
import time
import uuid
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

from PIL import Image

BASE = "https://api.zfculture.site"
ADMIN_USER = "admin"
ADMIN_PASS = "admin@123"
ASSETS = Path("/Users/lx/.cursor/projects/Users-lx-liuxuan/assets")
TMP = Path("/tmp/cn-audit-imgs")
TMP.mkdir(parents=True, exist_ok=True)

C = {
    "ink": "#1A1512",
    "cinnabar": "#9B2335",
    "cinnabar_deep": "#7A1A28",
    "paper": "#F6F1E7",
    "paper_card": "#FFFBF4",
    "gold": "#C4A574",
    "muted": "#6B5E52",
    "line": "#E4D8C8",
    "white": "#FFFFFF",
}


def uid(prefix="comp"):
    return f"{prefix}_{int(time.time()*1000)}_{uuid.uuid4().hex[:6]}"


def req(method, path, body=None, token=None):
    data = None if body is None else json.dumps(body, ensure_ascii=False).encode("utf-8")
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    r = urllib.request.Request(BASE + path, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(r, timeout=90) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        detail = e.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"{method} {path} -> {e.code}: {detail[:800]}") from e


def login():
    res = req("POST", "/api/v1/admin/auth/login", {"username": ADMIN_USER, "password": ADMIN_PASS})
    return res["data"]["accessToken"]


def to_jpeg(src: Path, name: str, size=None, quality=85) -> Path:
    img = Image.open(src).convert("RGB")
    if size:
        img = img.resize(size, Image.Resampling.LANCZOS)
    out = TMP / name
    img.save(out, "JPEG", quality=quality, optimize=True)
    return out


def upload_file(token: str, path: Path, sub_dir="cn-brand") -> str:
    boundary = f"----WebKitFormBoundary{uuid.uuid4().hex}"
    file_bytes = path.read_bytes()
    filename = path.name
    parts = []
    parts.append(f"--{boundary}\r\n".encode())
    parts.append(b'Content-Disposition: form-data; name="subDir"\r\n\r\n')
    parts.append(f"{sub_dir}\r\n".encode())
    parts.append(f"--{boundary}\r\n".encode())
    parts.append(
        f'Content-Disposition: form-data; name="file"; filename="{filename}"\r\n'
        f"Content-Type: image/jpeg\r\n\r\n".encode()
    )
    parts.append(file_bytes)
    parts.append(b"\r\n")
    parts.append(f"--{boundary}--\r\n".encode())
    body = b"".join(parts)
    headers = {
        "Content-Type": f"multipart/form-data; boundary={boundary}",
        "Authorization": f"Bearer {token}",
    }
    r = urllib.request.Request(BASE + "/api/v1/admin/system/upload", data=body, headers=headers, method="POST")
    with urllib.request.urlopen(r, timeout=120) as resp:
        res = json.loads(resp.read().decode("utf-8"))
    if res.get("code") not in (0, 200):
        raise RuntimeError(res)
    url = (res.get("data") or {}).get("url")
    if not url:
        raise RuntimeError(f"no url: {res}")
    if url.startswith("/"):
        url = BASE + url
    print("uploaded", path.name, "->", url)
    return url


def list_articles(token):
    out = []
    page = 1
    while page <= 30:
        d = req("GET", f"/api/v1/admin/contents?page={page}&size=50&status=published", token=token)
        data = d.get("data") or {}
        recs = data.get("records") or []
        out.extend(recs)
        if len(out) >= (data.get("total") or 0) or not recs:
            break
        page += 1
    return out


def update_cover(token, article_id, cover_url):
    detail = req("GET", f"/api/v1/admin/contents/{article_id}", token=token)["data"]
    payload = {
        "title": detail.get("title"),
        "contentType": detail.get("contentType") or "article",
        "categoryId": detail.get("categoryId"),
        "coverImage": cover_url,
        "images": detail.get("images") or [],
        "summary": detail.get("summary") or "",
        "content": detail.get("content") or "",
        "author": detail.get("author") or "",
        "source": detail.get("source") or "",
        "tags": detail.get("tags") or [],
        "sortOrder": detail.get("sortOrder") or 0,
        "isPinned": detail.get("isPinned") or 0,
        "isRecommended": detail.get("isRecommended") or 0,
        "layoutTheme": detail.get("layoutTheme") or "",
    }
    r = req("PUT", f"/api/v1/admin/contents/{article_id}", payload, token)
    if r.get("code") not in (0, 200):
        raise RuntimeError(r)
    # ensure published
    if detail.get("status") == "published":
        try:
            req("PUT", f"/api/v1/admin/contents/{article_id}/publish", {}, token)
        except Exception:
            pass


def pick_cover(title: str, covers: dict) -> str:
    t = title or ""
    if any(k in t for k in ("税", "VAT", "报关", "退税", "HS", "财税", "征税")):
        return covers["tax"]
    if any(k in t for k in ("独立站", "落地页", "品牌", "知识库")):
        return covers["site"]
    if any(k in t for k in ("亚马逊", "Listing", "广告", "促销", "流量", "关键词", "标题")):
        return covers["platform"]
    if any(k in t for k in ("选品", "供应链", "工厂", "验厂", "打样", "海外仓", "物流")):
        return covers["supply"]
    if any(k in t for k in ("开年", "架构", "模式", "增长", "闭环")):
        return covers["ship"]
    # rotate by hash
    keys = ["ship", "tax", "supply", "platform", "site"]
    return covers[keys[abs(hash(t)) % len(keys)]]


def page_dsl(name, path, bg, components):
    return {
        "schema_version": "1.0",
        "page": {
            "id": path,
            "name": name,
            "path": path,
            "type": "custom",
            "share_title": name,
            "background_color": bg,
        },
        "components": components,
    }


def brand_header(title, subtitle, logo):
    return {
        "id": uid("bh"),
        "type": "brand_header",
        "props": {
            "logo": logo,
            "logo_text": "墨太白",
            "title": title,
            "subtitle": subtitle,
            "style_type": "plain",
            "background_color": C["paper_card"],
            "gradient_from": C["cinnabar_deep"],
            "gradient_to": C["cinnabar"],
            "title_color": C["ink"],
            "title_color_light": C["white"],
            "subtitle_color": C["muted"],
            "show_divider": True,
            "logo_height": 28,
            "logo_max_width": 86,
            "title_font_size": 16,
            "subtitle_font_size": 11,
            "logo_text_color": C["cinnabar"],
            "divider_color": C["line"],
            "bar_padding_left": 16,
            "bar_padding_right": 16,
            "fixed_top": True,
        },
        "style": {"margin_top": 0, "margin_left": 0, "margin_right": 0, "margin_bottom": 0},
        "visible": True,
    }


def notice():
    return {
        "id": uid("nb"),
        "type": "notice_bar",
        "props": {
            "title": "公告",
            "items": [
                "本小程序提供跨境行业资讯与干货阅读，欢迎收藏分享",
                "每日更新选品洞察 · 供应链 · 独立站 · 合规干货",
            ],
            "scrollable": True,
            "direction": "horizontal",
            "speed": 40,
            "show_icon": True,
            "show_more": False,
            "closable": False,
            "text_color": C["cinnabar"],
            "background_color": "#FBF3E8",
            "font_size": 12,
            "link_url": "",
        },
        "style": {"margin_left": 12, "margin_right": 12, "margin_top": 10, "border_radius": 8},
        "visible": True,
    }


def hero_image(url):
    return {
        "id": uid("img"),
        "type": "image",
        "props": {
            "image": url,
            "mode": "widthFix",
            "border_radius": 8,
            "link_type": "none",
            "link_url": "",
        },
        "style": {"margin_left": 12, "margin_right": 12, "margin_top": 12, "margin_bottom": 4, "border_radius": 8},
        "visible": True,
    }


def nav_grid():
    return {
        "id": uid("nav"),
        "type": "nav",
        "props": {
            "columns": 4,
            "style_type": "icon_text",
            "items": [
                {"icon": "/images/nav-icons/book.svg", "text": "跨境资讯", "link_type": "page", "link_url": "/pages/content-list/content-list"},
                {"icon": "/images/nav-icons/pack.svg", "text": "阅读清单", "link_type": "page", "link_url": "/pages/custom/page-751193"},
                {"icon": "/images/nav-icons/search.svg", "text": "搜索", "link_type": "page", "link_url": "/pages/search/search"},
                {"icon": "/images/nav-icons/chat.svg", "text": "在线客服", "link_type": "page", "link_url": "/pages/service-chat/service-chat"},
            ],
        },
        "style": {"margin_left": 8, "margin_right": 8, "margin_top": 8, "margin_bottom": 4},
        "visible": True,
    }


def section(title, subtitle="", more_link=""):
    return {
        "id": uid("st"),
        "type": "section_title",
        "props": {
            "title": title,
            "subtitle": subtitle,
            "align": "left",
            "title_bold": True,
            "padding_top": 14,
            "padding_bottom": 8,
            "title_font_size": 17,
            "subtitle_font_size": 11,
            "title_color": C["ink"],
            "subtitle_color": C["muted"],
            "show_more": bool(more_link),
            "more_text": "查看全部",
            "more_link": more_link or "/pages/content-list/content-list",
            "more_color": C["cinnabar"],
            "section_style": "plain",
            "section_divider": True,
        },
        "style": {"margin_left": 16, "margin_right": 16},
        "visible": True,
    }


def hot_news():
    return {
        "id": uid("hn"),
        "type": "hot_news",
        "props": {
            "title": "",
            "limit": 5,
            "show_rank": True,
            "data_source": {
                "type": "content",
                "params": {"status": "published", "size": 8, "sort_by": "popular"},
                "query": {"status": "published", "size": 8, "sort_by": "popular"},
            },
        },
        "style": {"margin_left": 12, "margin_right": 12, "margin_bottom": 8},
        "visible": True,
    }


def article_feed():
    return {
        "id": uid("af"),
        "type": "article_feed",
        "props": {
            "layout": "list",
            "page_size": 8,
            "show_date": True,
            "show_cover": True,
            "style_type": "list",
            "show_category_tabs": False,
            "data_source": {
                "type": "content",
                "params": {"status": "published", "size": 8},
                "query": {"status": "published", "size": 8},
            },
        },
        "style": {"margin_left": 12, "margin_right": 12, "margin_bottom": 12},
        "visible": True,
    }


def article_list_with_tabs():
    return {
        "id": uid("al"),
        "type": "article_list",
        "props": {
            "layout": "list",
            "limit": 20,
            "show_date": True,
            "show_cover": True,
            "show_category_tabs": True,
            "title_font_size": 14,
            "subtitle_font_size": 11,
            "item_gap": 10,
            "item_border_radius": 8,
            "data_source": {
                "type": "content",
                "params": {"status": "published", "size": 20},
                "query": {"status": "published", "size": 20},
            },
        },
        "style": {"margin_left": 12, "margin_right": 12},
        "visible": True,
    }


def search_bar():
    return {
        "id": uid("sc"),
        "type": "search",
        "props": {"placeholder": "搜索选品、供应链、独立站干货", "scope": "content"},
        "style": {"margin_left": 12, "margin_right": 12, "margin_top": 10, "margin_bottom": 6},
        "visible": True,
    }


def brand_intro(logo):
    return {
        "id": uid("bi"),
        "type": "brand_intro",
        "props": {
            "title": "墨太白 · 出海笔记",
            "subtitle": "跨境内容工作室",
            "desc": "专注跨境电商方法论：把零散经验，整理成可复用的作战手册。",
            "eyebrow": "CROSS-BORDER NOTES",
            "avatar_text": "墨",
            "verified": True,
            "kpi": "资讯阅读 · 干货方法 · 持续更新",
            "logo": logo,
            "logo_position": "left",
            "content_align": "left",
            "logo_size": 48,
        },
        "style": {"margin_left": 12, "margin_right": 12, "margin_top": 8, "margin_bottom": 24},
        "visible": True,
    }


def tools_rich():
    html = f"""
<div style="padding:8px 4px 4px;color:{C['ink']};">
  <p style="font-size:15px;font-weight:700;margin:0 0 10px;">阅读清单与工具索引</p>
  <p style="font-size:13px;line-height:1.8;color:{C['muted']};margin:0 0 14px;">
    汇集跨境从业者常用的信息入口与学习清单，全部以图文形式免费开放阅读。
  </p>
  <ul style="padding-left:18px;margin:0;font-size:13px;line-height:1.9;color:{C['ink']};">
    <li>选品验证清单（内容专栏）</li>
    <li>独立站上线检查表</li>
    <li>合规资料阅读索引</li>
    <li>物流履约术语速查</li>
  </ul>
  <p style="font-size:12px;color:{C['muted']};margin:16px 0 0;">更多清单将以图文形式持续更新，请关注「资讯」页最新发布。</p>
</div>
""".strip()
    return {
        "id": uid("tool"),
        "type": "rich_text",
        "props": {"content": html, "text_color": C["ink"], "background_color": C["paper_card"]},
        "style": {"margin_left": 12, "margin_right": 12, "margin_top": 12, "border_radius": 10},
        "visible": True,
    }


def contact_rich():
    html = f"""
<div style="padding:12px 8px;color:{C['ink']};">
  <p style="font-size:14px;font-weight:700;margin:0 0 8px;">联系我们</p>
  <p style="font-size:13px;line-height:1.8;color:{C['muted']};margin:0;">
    如需交流行业问题，请通过底部「我的 → 在线客服」留言，我们会尽快回复。
  </p>
</div>
""".strip()
    return {
        "id": uid("ct"),
        "type": "rich_text",
        "props": {"content": html, "text_color": C["ink"], "background_color": C["paper_card"]},
        "style": {"margin_left": 12, "margin_right": 12, "margin_top": 8, "margin_bottom": 24, "border_radius": 10},
        "visible": True,
    }


def spacer(h=16):
    return {"id": uid("sp"), "type": "spacer", "props": {"height": h}, "style": {}, "visible": True}


def save_publish(token, page_id, dsl):
    r1 = req("POST", f"/api/v1/admin/pages/{page_id}/draft", {"dslContent": json.dumps(dsl, ensure_ascii=False)}, token)
    if r1.get("code") not in (0, 200):
        raise RuntimeError(r1)
    r2 = req("POST", f"/api/v1/admin/pages/{page_id}/publish", {}, token)
    if r2.get("code") not in (0, 200):
        raise RuntimeError(r2)
    print("published page", page_id)


def main():
    token = login()

    # 1) prepare + upload brand images
    files = {
        "hero": to_jpeg(ASSETS / "cn-hero-banner.png", "hero.jpg", size=(1200, 675), quality=82),
        "logo": to_jpeg(ASSETS / "cn-logo-motai.png", "logo.jpg", size=(512, 512), quality=88),
        "ship": to_jpeg(ASSETS / "cn-cover-ship.png", "cover-ship.jpg", size=(800, 600), quality=82),
        "tax": to_jpeg(ASSETS / "cn-cover-tax.png", "cover-tax.jpg", size=(800, 600), quality=82),
        "supply": to_jpeg(ASSETS / "cn-cover-supply.png", "cover-supply.jpg", size=(800, 600), quality=82),
        "platform": to_jpeg(ASSETS / "cn-cover-platform.png", "cover-platform.jpg", size=(800, 600), quality=82),
        "site": to_jpeg(ASSETS / "cn-cover-site.png", "cover-site.jpg", size=(800, 600), quality=82),
    }
    urls = {k: upload_file(token, p) for k, p in files.items()}

    # 2) also pool existing OA images on CDN that still work
    oa_pool = []
    for name in [
        "418c03f677dc451a95fecbc4f46d168f.jpg",
        "43e9c1f650624431b5415f3bb69433aa.jpg",
        "f60e40ce8af94eeb843809d2de7a6321.jpg",
        "0d83a9d4fa854815b75ab638802d6f86.jpg",
        "26ff2343fc84461696c410431bbea85f.jpg",
        "ca495a6eac264b6da252d612ee71fa9a.jpg",
        "cbbaa1b3f91f4e238f438833b5ff2222.jpg",
        "443e4a346e6a41d1b5f4d38762407536.jpg",
        "76c7379baffc446f9a733862c1145847.jpg",
        "e6f0f34c582849b7a3aada863844d5b7.jpg",
        "b94edfc510b94e319fd0d0538d91f7fb.jpg",
        "9a0d804496ee48e3b5493cae5dd1cefe.jpg",
    ]:
        oa_pool.append(f"{BASE}/uploads/wechat-oa/2026-08-23/{name}")

    # 3) backfill article covers
    arts = list_articles(token)
    print("articles", len(arts))
    for i, a in enumerate(arts):
        aid = a["id"]
        title = a.get("title") or ""
        themed = pick_cover(title, urls)
        # mix OA photos for variety on odd indices
        cover = oa_pool[i % len(oa_pool)] if (i % 3 == 0 and oa_pool) else themed
        update_cover(token, aid, cover)
        print(f"cover #{aid} -> {cover.split('/')[-1]}")

    # 4) rebuild pages with real images
    logo = urls["logo"]
    hero = urls["hero"]
    home = page_dsl(
        "出海笔记首页",
        "/pages/custom/page-old-home-1",
        C["paper"],
        [
            brand_header("出海笔记", "跨境资讯 · 干货方法", logo),
            notice(),
            hero_image(hero),
            nav_grid(),
            section("今日速递", "热门跨境话题"),
            hot_news(),
            section("精选阅读", "最新跨境干货", "/pages/content-list/content-list"),
            article_feed(),
            brand_intro(logo),
        ],
    )
    content = page_dsl(
        "跨境资讯",
        "/pages/custom/page-398724",
        C["paper"],
        [
            brand_header("跨境资讯", "分类阅读 · 持续更新", logo),
            search_bar(),
            hero_image(urls["supply"]),
            section("全部内容", "按分类筛选"),
            article_list_with_tabs(),
            spacer(24),
        ],
    )
    tools = page_dsl(
        "阅读清单",
        "/pages/custom/page-751193",
        C["paper"],
        [
            brand_header("阅读清单", "清单 · 索引 · 方法", logo),
            hero_image(urls["site"]),
            tools_rich(),
            section("相关干货", "配套阅读"),
            article_feed(),
            contact_rich(),
        ],
    )
    save_publish(token, 1, home)
    save_publish(token, 12, content)
    save_publish(token, 14, tools)

    # 5) brand config logo
    brand = {
        "appName": "墨太白·出海笔记",
        "logoUrl": logo,
        "logoMark": "墨太",
        "loginTagline": "想认识一下你，可以吗？",
        "brandEyebrow": "出海笔记",
    }
    req(
        "PUT",
        "/api/v1/admin/system/configs",
        {
            "configs": [
                {
                    "configKey": "miniappBrandConfig",
                    "configValue": json.dumps(brand, ensure_ascii=False),
                    "configGroup": "basic",
                    "description": "品牌",
                },
                {
                    "configKey": "site_logo",
                    "configValue": logo,
                    "configGroup": "basic",
                    "description": "站点Logo",
                },
            ]
        },
        token,
    )

    # 6) release
    r = req(
        "POST",
        "/api/v1/admin/miniapp-releases",
        {
            "mode": "publish",
            "changeType": "patch",
            "releaseNotes": "补全中国风主视觉、Logo与文章封面图",
        },
        token,
    )
    print("release", r.get("code"), (r.get("data") or {}).get("semver"))

    # verify
    sample = req("GET", "/api/v1/mp/contents?page=1&size=8&status=published")["data"]["records"]
    for a in sample:
        c = a.get("coverImage") or ""
        print("mp", a["id"], "cover_ok", "d18dcd5f" not in c and bool(c), c[-40:])
    page = req("GET", f"/api/v1/mp/pages?path={urllib.parse.quote('/pages/custom/page-old-home-1')}")["data"]
    types = [c.get("type") for c in (page.get("components") or [])]
    print("home comps", types)
    imgs = [c for c in page["components"] if c.get("type") == "image"]
    print("home hero", (imgs[0].get("props") or {}).get("image") if imgs else None)


if __name__ == "__main__":
    main()
