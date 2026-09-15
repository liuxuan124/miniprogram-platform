#!/usr/bin/env python3
"""审核加固：净化文案、去掉假二维码加群、下架商品、重发 release。"""
from __future__ import annotations

import json
import time
import urllib.error
import urllib.parse
import urllib.request
import uuid

BASE = "https://api.zfculture.site"
ADMIN_USER = "admin"
ADMIN_PASS = "admin@123"

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
LOGO = "https://zfculture.site/uploads/2026-08-22/8215a9d522d747deb98761e28af30b55.png"


def uid(prefix="comp"):
    return f"{prefix}_{int(time.time()*1000)}_{uuid.uuid4().hex[:6]}"


def req(method, path, body=None, token=None):
    data = None if body is None else json.dumps(body, ensure_ascii=False).encode("utf-8")
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    r = urllib.request.Request(BASE + path, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(r, timeout=60) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        detail = e.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"{method} {path} -> {e.code}: {detail[:800]}") from e


def login():
    res = req("POST", "/api/v1/admin/auth/login", {"username": ADMIN_USER, "password": ADMIN_PASS})
    if res.get("code") != 200:
        raise RuntimeError(res)
    return res["data"]["accessToken"]


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


def brand_header(title, subtitle=""):
    return {
        "id": uid("bh"),
        "type": "brand_header",
        "props": {
            "logo": LOGO,
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


def hero_banner():
    html = f"""
<div style="background:linear-gradient(135deg,{C['cinnabar_deep']} 0%,{C['ink']} 55%,#3D2A22 100%);
padding:28px 20px 24px;border-radius:4px;color:#FFFBF4;">
  <div style="font-size:11px;letter-spacing:0.28em;color:{C['gold']};margin-bottom:10px;">墨太白 · 出海笔记</div>
  <div style="font-size:24px;font-weight:700;line-height:1.35;letter-spacing:0.06em;">跨境有方法<br/>出海有章法</div>
  <div style="margin-top:12px;font-size:13px;line-height:1.7;color:rgba(255,251,244,0.82);">
    选品洞察 · 供应链 · 平台运营 · 独立站 · 合规税务
  </div>
</div>
""".strip()
    return {
        "id": uid("rt"),
        "type": "rich_text",
        "props": {"content": html, "text_color": C["ink"], "background_color": "transparent"},
        "style": {"margin_left": 12, "margin_right": 12, "margin_top": 12, "margin_bottom": 4},
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


def brand_intro():
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
            "logo": LOGO,
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


def spacer(h=16):
    return {"id": uid("sp"), "type": "spacer", "props": {"height": h}, "style": {}, "visible": True}


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


def build_home():
    return page_dsl("出海笔记首页", "/pages/custom/page-old-home-1", C["paper"], [
        brand_header("出海笔记", "跨境资讯 · 干货方法"),
        notice(),
        hero_banner(),
        nav_grid(),
        section("今日速递", "热门跨境话题"),
        hot_news(),
        section("精选阅读", "最新跨境干货", "/pages/content-list/content-list"),
        article_feed(),
        brand_intro(),
    ])


def build_content():
    return page_dsl("跨境资讯", "/pages/custom/page-398724", C["paper"], [
        brand_header("跨境资讯", "分类阅读 · 持续更新"),
        search_bar(),
        section("全部内容", "按分类筛选"),
        article_list_with_tabs(),
        spacer(24),
    ])


def build_tools():
    return page_dsl("阅读清单", "/pages/custom/page-751193", C["paper"], [
        brand_header("阅读清单", "清单 · 索引 · 方法"),
        tools_rich(),
        section("相关干货", "配套阅读"),
        article_feed(),
        contact_rich(),
    ])


def save_and_publish(token, page_id, dsl):
    r1 = req("POST", f"/api/v1/admin/pages/{page_id}/draft", {"dslContent": json.dumps(dsl, ensure_ascii=False)}, token)
    if r1.get("code") not in (0, 200):
        raise RuntimeError(r1)
    r2 = req("POST", f"/api/v1/admin/pages/{page_id}/publish", {}, token)
    if r2.get("code") not in (0, 200):
        raise RuntimeError(r2)
    print(f"OK page {page_id}")


def offsale_products(token):
    page = 1
    ids = []
    while page <= 20:
        d = req("GET", f"/api/v1/admin/products?page={page}&size=50&status=on_sale", token=token)
        recs = (d.get("data") or {}).get("records") or []
        ids.extend([r["id"] for r in recs])
        total = (d.get("data") or {}).get("total") or 0
        if len(ids) >= total or not recs:
            break
        page += 1
    # also fetch without filter in case status query differs
    if not ids:
        d = req("GET", f"/api/v1/admin/products?page=1&size=100", token=token)
        for r in (d.get("data") or {}).get("records") or []:
            if r.get("status") == "on_sale":
                ids.append(r["id"])
    for pid in ids:
        try:
            r = req("PUT", f"/api/v1/admin/products/{pid}/off-sale", {}, token)
            print(f"off-sale {pid}:", r.get("code"), r.get("message"))
        except Exception as e:
            print(f"off-sale {pid} fail:", e)
    print(f"off-sale count={len(ids)}")


def rename_tools_page(token):
    # update page name if API supports PUT
    try:
        r = req("PUT", "/api/v1/admin/pages/14", {"name": "阅读清单"}, token)
        print("rename tools page:", r.get("code"), r.get("message"))
    except Exception as e:
        print("rename skip:", e)


def update_tab_label(token):
    cfg = req("GET", "/api/v1/admin/system/configs/basic", token=token)
    items = cfg.get("data") or []
    tab_raw = None
    for it in items:
        if it.get("configKey") == "tabbarItems":
            tab_raw = it.get("configValue")
            break
    tabs = json.loads(tab_raw) if tab_raw else []
    for t in tabs:
        if t.get("pageId") == 14 or "751193" in str(t.get("pagePath") or ""):
            t["text"] = "清单"
            t["pageName"] = "阅读清单"
    mine = {
        "loginTitle": "登录后同步阅读偏好",
        "loginSubtitle": "收藏文章、接收内容更新提醒",
        "loginButtonText": "微信一键登录",
        "memberCardTitle": "",
        "showMenuIcons": True,
        "showDecorBackground": True,
        "showMemberCard": False,
        "previewNickname": "微信用户",
        "orderQuickAccess": {"showOrderTabs": False, "showAllOrdersBtn": False},
        "userProfile": {
            "showAvatar": True,
            "showNickname": True,
            "showMemberLevel": False,
            "allowEditProfile": True,
            "memberLevelLabel": "",
        },
        "menuItems": [
            {"id": "favorites", "icon": "line:star", "title": "我的收藏", "url": "/pkg-user/favorites/favorites", "enabled": True, "group": ""},
            {"id": "service", "icon": "line:chat", "title": "在线客服", "url": "/pages/service-chat/service-chat", "enabled": True, "group": ""},
            {"id": "feedback", "icon": "line:edit", "title": "意见反馈", "url": "/pkg-user/feedback/feedback", "enabled": True, "group": ""},
            {"id": "settings", "icon": "line:settings", "title": "设置", "url": "/pkg-user/settings/settings", "enabled": True, "group": ""},
        ],
        "templateStyle": "basic",
    }
    configs = [
        {"configKey": "tabbarItems", "configValue": json.dumps(tabs, ensure_ascii=False), "configGroup": "basic", "description": "底部导航"},
        {"configKey": "minePageConfig", "configValue": json.dumps(mine, ensure_ascii=False), "configGroup": "basic", "description": "我的页"},
        {"configKey": "miniappShareTitle", "configValue": "墨太白·出海笔记｜跨境资讯与干货", "configGroup": "basic", "description": "分享标题"},
    ]
    r = req("PUT", "/api/v1/admin/system/configs", {"configs": configs}, token)
    print("config:", r.get("code"), r.get("message"))


def publish_release(token):
    r = req(
        "POST",
        "/api/v1/admin/miniapp-releases",
        {
            "mode": "publish",
            "changeType": "patch",
            "releaseNotes": "审核加固：去除假加群二维码与交易敏感文案，下架商品，我的页去会员措辞",
        },
        token,
    )
    print("release:", r.get("code"), (r.get("data") or {}).get("semver"), r.get("message"))


def main():
    token = login()
    save_and_publish(token, 1, build_home())
    save_and_publish(token, 12, build_content())
    save_and_publish(token, 14, build_tools())
    rename_tools_page(token)
    offsale_products(token)
    update_tab_label(token)
    publish_release(token)

    # verify sensitive words on pages
    risk = ("会员", "充值", "商品交易", "付费", "订单", "二维码", "加群")
    for path in ["/pages/custom/page-old-home-1", "/pages/custom/page-398724", "/pages/custom/page-751193"]:
        d = req("GET", f"/api/v1/mp/pages?path={urllib.parse.quote(path)}")["data"]
        text = json.dumps(d, ensure_ascii=False)
        hits = [w for w in risk if w in text]
        types = [c.get("type") for c in (d.get("components") or [])]
        print(path, "hits=", hits or "none", "types=", types)


if __name__ == "__main__":
    main()
