#!/usr/bin/env python3
"""Seed a cross-border e-commerce IP blogger mini-program via local admin APIs."""

from __future__ import annotations

import json
import sys
import urllib.error
import urllib.request

BASE = "http://localhost:8080"
ORIGIN = "http://localhost:5175"


def req(method: str, path: str, token: str | None = None, body=None):
    data = None if body is None else json.dumps(body, ensure_ascii=False).encode("utf-8")
    headers = {
        "Content-Type": "application/json",
        "Origin": ORIGIN,
        "Accept": "application/json",
    }
    if token:
        headers["Authorization"] = f"Bearer {token}"
    r = urllib.request.Request(BASE + path, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(r, timeout=30) as resp:
            raw = resp.read().decode("utf-8")
            return resp.status, json.loads(raw) if raw else {}
    except urllib.error.HTTPError as e:
        raw = e.read().decode("utf-8", errors="replace")
        try:
            payload = json.loads(raw) if raw else {}
        except json.JSONDecodeError:
            payload = {"raw": raw}
        return e.code, payload


def ok(payload: dict):
    return payload.get("code") in (0, 200)


def must(label: str, status: int, payload: dict):
    if status >= 400 or not ok(payload):
        print(f"[FAIL] {label}: HTTP {status} {json.dumps(payload, ensure_ascii=False)[:500]}")
        sys.exit(1)
    print(f"[OK] {label}")
    return payload.get("data")


def main():
    status, payload = req(
        "POST",
        "/api/v1/admin/auth/login",
        body={"username": "admin", "password": "admin123"},
    )
    data = must("login", status, payload)
    token = data["accessToken"]

    # --- categories (content packages) ---
    categories = [
        ("选品方法论", 1),
        ("平台运营", 2),
        ("物流清关", 3),
        ("供应链", 4),
        ("IP人设与内容", 5),
    ]
    cat_ids = {}
    status, payload = req("GET", "/api/v1/admin/content-categories", token)
    existing = payload.get("data") or []
    if isinstance(existing, dict):
        existing = existing.get("records") or existing.get("list") or []
    for item in existing:
        if isinstance(item, dict) and item.get("name"):
            cat_ids[item["name"]] = item.get("id")

    for name, sort in categories:
        if name in cat_ids:
            print(f"[SKIP] category exists: {name} id={cat_ids[name]}")
            continue
        status, payload = req(
            "POST",
            "/api/v1/admin/content-categories",
            token,
            {"name": name, "sortOrder": sort, "status": 1},
        )
        created = must(f"create category {name}", status, payload)
        cat_ids[name] = created.get("id") if isinstance(created, dict) else created

    # --- sample articles ---
    articles = [
        {
            "title": "亚马逊选品：从搜索词到利润模型的完整清单",
            "category": "选品方法论",
            "summary": "用可复用的选品漏斗，把关键词、竞品、毛利和履约成本一次算清。",
            "tags": ["选品", "亚马逊", "利润模型"],
            "content": "<h2>为什么大多数选品失败</h2><p>不是不会找产品，而是没有把履约、退货、广告和现金流放进同一个模型。</p><h2>三步漏斗</h2><ol><li>需求验证：搜索量、季节性、评论痛点</li><li>供给判断：供应商交期、MOQ、质检</li><li>利润测算：头程、关税、广告、退货率</li></ol><p>把这套清单固化成你的内容包，读者才能真正落地。</p>",
        },
        {
            "title": "TikTok Shop 冷启动：内容测品比广告更重要",
            "category": "平台运营",
            "summary": "用短视频测需求，再用广告放大赢家款，避免一上来就烧预算。",
            "tags": ["TikTok", "内容测品", "冷启动"],
            "content": "<p>冷启动期先验证「内容是否能讲清楚卖点」，再谈投放规模。建议每周只测 3 个主卖点脚本。</p>",
        },
        {
            "title": "跨境物流怎么选：专线、UPS、海外仓对照表",
            "category": "物流清关",
            "summary": "按客单价、体积重、时效和售后场景选择履约方式。",
            "tags": ["物流", "海外仓", "清关"],
            "content": "<p>低客单轻小件优先专线；中高客单且退货多，优先海外仓。清关资料提前标准化，能显著降低异常单比例。</p>",
        },
        {
            "title": "供应商谈判：把交期和质检写进合同模板",
            "category": "供应链",
            "summary": "交期违约金、抽检标准、包材规范，是稳定爆款供给的关键。",
            "tags": ["供应商", "质检", "合同"],
            "content": "<p>没有质检标准的爆款，很快会变成差评炸弹。把 AQL、复检流程和包材规范模板化。</p>",
        },
        {
            "title": "IP博主如何把经验做成可售卖的知识内容包",
            "category": "IP人设与内容",
            "summary": "文章矩阵 + 分类内容包 + 会员专栏，形成可持续变现的知识资产。",
            "tags": ["IP", "内容包", "知识库"],
            "content": "<p>单篇文章负责获客，内容包负责沉淀方法，会员专栏负责持续变现。本小程序就是按这个结构搭建的。</p>",
        },
        {
            "title": "独立站转化：从种草内容到结账页的信息架构",
            "category": "平台运营",
            "summary": "把信任、规格、物流时效和售后政策前置，减少结账流失。",
            "tags": ["独立站", "转化", "结账"],
            "content": "<p>结账前必须回答：多久到、坏了怎么办、和竞品差在哪。用内容页承接，而不是只靠广告落地页。</p>",
        },
    ]

    status, payload = req("GET", "/api/v1/admin/contents?page=1&pageSize=100", token)
    existing_contents = []
    d = payload.get("data")
    if isinstance(d, dict):
        existing_contents = d.get("records") or []
    elif isinstance(d, list):
        existing_contents = d
    existing_titles = {c.get("title") for c in existing_contents if isinstance(c, dict)}

    for i, art in enumerate(articles):
        if art["title"] in existing_titles:
            print(f"[SKIP] article exists: {art['title']}")
            # ensure published
            for c in existing_contents:
                if c.get("title") == art["title"] and c.get("status") != 1:
                    cid = c.get("id")
                    req("PUT", f"/api/v1/admin/contents/{cid}/publish", token)
            continue
        body = {
            "title": art["title"],
            "categoryId": cat_ids.get(art["category"]),
            "coverImage": f"https://picsum.photos/seed/cb{i}/750/420",
            "summary": art["summary"],
            "content": art["content"],
            "author": "跨境IP博主",
            "source": "原创",
            "tags": art["tags"],
            "sortOrder": i + 1,
        }
        status, payload = req("POST", "/api/v1/admin/contents", token, body)
        created = must(f"create article {art['title'][:16]}", status, payload)
        cid = created.get("id") if isinstance(created, dict) else None
        if cid:
            status, payload = req("PUT", f"/api/v1/admin/contents/{cid}/publish", token)
            must(f"publish article {cid}", status, payload)

    # --- home page DSL ---
    home_dsl = {
        "schema_version": "1.0",
        "page": {
            "id": "",
            "name": "跨境电商知识库首页",
            "type": "home",
            "path": "/pages/index/index",
            "share_title": "跨境电商知识库｜选品·运营·物流·供应链",
            "background_color": "#f4f7f5",
        },
        "global_config": {"pull_refresh": True, "reach_bottom_load": True},
        "components": [
            {
                "id": "search-home",
                "type": "search",
                "props": {
                    "placeholder": "搜索选品、平台运营、物流清关...",
                    "shape": "round",
                    "background_color": "#fff",
                    "text_color": "#999",
                },
                "style": {
                    "margin_top": 0,
                    "margin_bottom": 10,
                    "padding_left": 12,
                    "padding_right": 12,
                },
            },
            {
                "id": "banner-home",
                "type": "banner",
                "props": {
                    "items": [
                        {
                            "image": "https://picsum.photos/seed/cb-b1/750/340",
                            "title": "本周精选：亚马逊选品利润模型",
                            "link_type": "page",
                            "link_url": "/pages/content-list/content-list",
                        },
                        {
                            "image": "https://picsum.photos/seed/cb-b2/750/340",
                            "title": "内容包上新：物流清关对照表",
                            "link_type": "page",
                            "link_url": "/pages/content-list/content-list",
                        },
                    ],
                    "autoplay": True,
                    "interval": 3500,
                    "indicator_color": "rgba(255,255,255,0.5)",
                    "indicator_active_color": "#0f766e",
                    "border_radius": 14,
                    "height": 340,
                },
                "style": {
                    "margin_top": 0,
                    "margin_bottom": 14,
                    "padding_left": 12,
                    "padding_right": 12,
                },
            },
            {
                "id": "nav-packages",
                "type": "nav",
                "props": {
                    "items": [
                        {"icon": "📦", "title": "选品方法", "link_type": "page", "link_url": "/pages/content-list/content-list"},
                        {"icon": "🛒", "title": "平台运营", "link_type": "page", "link_url": "/pages/content-list/content-list"},
                        {"icon": "🚢", "title": "物流清关", "link_type": "page", "link_url": "/pages/content-list/content-list"},
                        {"icon": "🏭", "title": "供应链", "link_type": "page", "link_url": "/pages/content-list/content-list"},
                        {"icon": "🎙️", "title": "IP人设", "link_type": "page", "link_url": "/pages/content-list/content-list"},
                        {"icon": "📚", "title": "内容包", "link_type": "page", "link_url": "/pages/content-list/content-list"},
                        {"icon": "👑", "title": "会员专栏", "link_type": "page", "link_url": "/pages/member-center/member-center"},
                        {"icon": "⭐", "title": "我的收藏", "link_type": "page", "link_url": "/pages/mine/mine"},
                    ],
                    "columns": 4,
                    "item_size": 56,
                    "text_color": "#134e4a",
                    "icon_bg_color": "#ccfbf1",
                },
                "style": {
                    "margin_top": 0,
                    "margin_bottom": 18,
                    "padding_left": 12,
                    "padding_right": 12,
                    "background_color": "#fff",
                    "border_radius": 14,
                    "padding_top": 18,
                    "padding_bottom": 18,
                },
            },
            {
                "id": "notice-home",
                "type": "notice_bar",
                "props": {
                    "title": "公告",
                    "items": [
                        "新内容包：选品利润模型已上线",
                        "每周三更新平台运营实操案例",
                        "会员可解锁完整供应链模板",
                    ],
                },
                "style": {
                    "margin_top": 0,
                    "margin_bottom": 14,
                    "padding_left": 12,
                    "padding_right": 12,
                },
            },
            {
                "id": "section-latest",
                "type": "section_title",
                "props": {
                    "title": "最新干货",
                    "subtitle": "跨境实战方法持续更新",
                    "more_text": "更多 >",
                    "more_link_type": "page",
                    "more_link_url": "/pages/content-list/content-list",
                    "title_color": "#134e4a",
                    "subtitle_color": "#94a3b8",
                },
                "style": {
                    "margin_top": 0,
                    "margin_bottom": 10,
                    "padding_left": 12,
                    "padding_right": 12,
                },
            },
            {
                "id": "article-list",
                "type": "article_list",
                "props": {
                    "layout": "card",
                    "columns": 1,
                    "show_cover": True,
                    "show_summary": True,
                    "show_author": True,
                    "show_views": True,
                    "data_source": {"type": "content", "config": {"sort": "latest", "limit": 8}},
                },
                "style": {
                    "margin_top": 0,
                    "margin_bottom": 16,
                    "padding_left": 12,
                    "padding_right": 12,
                },
            },
            {
                "id": "image-text-packs",
                "type": "image_text",
                "props": {
                    "items": [
                        {
                            "image": "https://picsum.photos/seed/cb-p1/350/180",
                            "title": "选品内容包",
                            "desc": "漏斗+利润表模板",
                            "link_type": "page",
                            "link_url": "/pages/content-list/content-list",
                        },
                        {
                            "image": "https://picsum.photos/seed/cb-p2/350/180",
                            "title": "物流对照表",
                            "desc": "专线/海外仓怎么选",
                            "link_type": "page",
                            "link_url": "/pages/content-list/content-list",
                        },
                    ],
                    "columns": 2,
                    "gap": 10,
                    "border_radius": 12,
                    "title_color": "#0f766e",
                },
                "style": {
                    "margin_top": 0,
                    "margin_bottom": 16,
                    "padding_left": 12,
                    "padding_right": 12,
                },
            },
            {
                "id": "brand-intro",
                "type": "brand_intro",
                "props": {
                    "title": "关于博主",
                    "subtitle": "跨境电商实战派 · 知识库与内容包",
                    "description": "长期输出选品、平台运营、物流与供应链方法论，把经验沉淀成可复用的内容包，帮助更多卖家少走弯路。",
                },
                "style": {
                    "margin_top": 0,
                    "margin_bottom": 16,
                    "padding_left": 12,
                    "padding_right": 12,
                },
            },
            {
                "id": "rich-footer",
                "type": "rich_text",
                "props": {
                    "content": (
                        '<div style="text-align:center;padding:20px 0;">'
                        '<p style="color:#0f766e;font-size:16px;font-weight:bold;">关注 · 收藏 · 加入会员</p>'
                        '<p style="color:#64748b;font-size:13px;line-height:2;margin-top:8px;">'
                        "每周更新跨境干货<br>内容包可持续下载与迭代</p></div>"
                    ),
                    "background_color": "#ecfdf5",
                    "padding": 0,
                },
                "style": {
                    "margin_top": 0,
                    "margin_bottom": 12,
                    "padding_left": 12,
                    "padding_right": 12,
                    "border_radius": 12,
                },
            },
        ],
    }

    # find or create home page at /pages/index/index
    status, payload = req("GET", "/api/v1/admin/pages?page=1&pageSize=100", token)
    pages = []
    d = payload.get("data")
    if isinstance(d, dict):
        pages = d.get("records") or []
    elif isinstance(d, list):
        pages = d

    home = None
    for p in pages:
        path = (p.get("path") or "").lstrip("/")
        if path in ("pages/index/index", "/pages/index/index") or p.get("type") == 1:
            home = p
            break

    if home:
        home_id = home["id"]
        print(f"[SKIP] reuse home page id={home_id} name={home.get('name')}")
        status, payload = req(
            "PUT",
            f"/api/v1/admin/pages/{home_id}",
            token,
            {
                "name": "跨境电商知识库首页",
                "shareTitle": "跨境电商知识库｜选品·运营·物流·供应链",
                "description": "IP博主跨境电商知识库与内容包",
            },
        )
        # update may not exist fields - ignore soft fail
        if status < 400 and ok(payload):
            print("[OK] update home meta")
        else:
            print(f"[WARN] update home meta: {status} {payload}")
    else:
        status, payload = req(
            "POST",
            "/api/v1/admin/pages",
            token,
            {
                "name": "跨境电商知识库首页",
                "type": 1,
                "path": "/pages/index/index",
                "shareTitle": "跨境电商知识库｜选品·运营·物流·供应链",
                "description": "IP博主跨境电商知识库与内容包",
            },
        )
        created = must("create home page", status, payload)
        home_id = created["id"]

    home_dsl["page"]["id"] = str(home_id)
    status, payload = req(
        "POST",
        f"/api/v1/admin/pages/{home_id}/draft",
        token,
        {"dslContent": json.dumps(home_dsl, ensure_ascii=False)},
    )
    must("save home draft", status, payload)
    status, payload = req("POST", f"/api/v1/admin/pages/{home_id}/publish", token)
    must("publish home page", status, payload)

    # --- theme + tabbar + mine ---
    tabs = [
        {
            "id": "tab-0",
            "text": "首页",
            "icon": "🏠",
            "pagePath": "/pages/index/index",
            "pageId": home_id,
            "pageName": "跨境电商知识库首页",
        },
        {
            "id": "tab-1",
            "text": "知识库",
            "icon": "📚",
            "pagePath": "/pages/content-list/content-list",
            "pageId": "__content_list__",
            "pageName": "内容列表",
        },
        {
            "id": "tab-2",
            "text": "会员",
            "icon": "👑",
            "pagePath": "/pages/member-center/member-center",
            "pageId": "",
            "pageName": "会员中心",
        },
        {
            "id": "tab-3",
            "text": "我的",
            "icon": "👤",
            "pagePath": "/pages/mine/mine",
            "pageId": "__mine__",
            "pageName": "我的",
        },
    ]
    theme = {
        "primaryColor": "#0f766e",
        "secondaryColor": "#14b8a6",
        "navBarColor": "#134e4a",
        "tabBarActiveColor": "#0f766e",
        "tabBarInactiveColor": "#94a3b8",
        "tabBarBackgroundColor": "#ffffff",
        "pageBackgroundColor": "#f4f7f5",
    }
    mine = {
        "loginTitle": "登录后解锁知识内容包",
        "loginSubtitle": "收藏文章、查看会员专栏与已购内容包",
        "loginButtonText": "微信一键登录",
        "memberCardTitle": "跨境实战会员",
        "menuItems": [
            {"id": "mine-1", "icon": "📚", "title": "我的内容包", "url": "/pages/content-list/content-list", "enabled": True, "group": "学习"},
            {"id": "mine-2", "icon": "⭐", "title": "我的收藏", "url": "/pages/content-list/content-list", "enabled": True, "group": "学习"},
            {"id": "mine-3", "icon": "👑", "title": "会员专栏", "url": "/pages/member-center/member-center", "enabled": True, "group": "会员"},
            {"id": "mine-4", "icon": "💬", "title": "联系博主", "url": "/pages/mine/mine", "enabled": True, "group": "服务"},
        ],
        "orderQuickAccess": {
            "showOrderTabs": False,
            "showAllOrdersBtn": False,
            "tabLabels": {"pending": "待付款", "paid": "已付款", "shipped": "已发货", "refund": "退款"},
        },
        "userProfile": {
            "showAvatar": True,
            "showNickname": True,
            "showMemberLevel": True,
            "allowEditProfile": True,
            "memberLevelLabel": "实战会员",
        },
    }

    configs = [
        {"configKey": "miniappTemplateKey", "configValue": "standard", "configGroup": "basic", "description": "小程序导航模板"},
        {"configKey": "miniappHomePageId", "configValue": str(home_id), "configGroup": "basic", "description": "首页绑定"},
        {"configKey": "miniappMinePageId", "configValue": "__mine__", "configGroup": "basic", "description": "我的页面绑定"},
        {"configKey": "tabbarItems", "configValue": json.dumps(tabs, ensure_ascii=False), "configGroup": "basic", "description": "底部导航配置"},
        {"configKey": "minePageConfig", "configValue": json.dumps(mine, ensure_ascii=False), "configGroup": "basic", "description": "我的页面配置"},
        {"configKey": "miniappThemeConfig", "configValue": json.dumps(theme, ensure_ascii=False), "configGroup": "basic", "description": "主题配色"},
        {
            "configKey": "miniappShareTitle",
            "configValue": "跨境电商知识库｜选品·运营·物流·供应链",
            "configGroup": "basic",
            "description": "小程序分享标题",
        },
    ]
    status, payload = req("PUT", "/api/v1/admin/system/configs", token, {"configs": configs})
    must("save miniapp configs", status, payload)

    # --- publish miniapp release ---
    status, payload = req(
        "POST",
        "/api/v1/admin/miniapp-releases",
        token,
        {
            "mode": "publish",
            "changeType": "minor",
            "releaseNotes": "跨境电商IP知识库首发：首页+知识库导航+示例内容包文章",
        },
    )
    release = must("publish miniapp release", status, payload)
    print(json.dumps({
        "homePageId": home_id,
        "categories": cat_ids,
        "release": release if isinstance(release, dict) else {"raw": release},
        "admin": "http://localhost:5175/page-builder/start",
        "previewHint": "H5/小程序读取已发布页面与公开配置；推微信体验版需配置 AppID + 上传密钥",
    }, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
