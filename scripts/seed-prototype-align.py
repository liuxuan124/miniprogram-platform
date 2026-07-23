#!/usr/bin/env python3
"""Align miniapp with 跨境电商博主小程序原型：首页/Tab/商城知识商品/我的菜单/主题色."""

from __future__ import annotations

import json
import sys
import urllib.error
import urllib.request

BASE = "http://localhost:8080"
ORIGIN = "http://localhost:5175"
BRAND = "#2f5bff"
ACCENT = "#ff6b3d"


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
        with urllib.request.urlopen(r, timeout=45) as resp:
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
        print(f"[FAIL] {label}: HTTP {status} {json.dumps(payload, ensure_ascii=False)[:600]}")
        sys.exit(1)
    print(f"[OK] {label}")
    return payload.get("data")


def soft(label: str, status: int, payload: dict):
    if status >= 400 or not ok(payload):
        print(f"[WARN] {label}: HTTP {status} {json.dumps(payload, ensure_ascii=False)[:400]}")
        return None
    print(f"[OK] {label}")
    return payload.get("data")


def login():
    status, payload = req(
        "POST",
        "/api/v1/admin/auth/login",
        body={"username": "admin", "password": "admin123"},
    )
    data = must("login", status, payload)
    return data["accessToken"]


def ensure_product_categories(token: str) -> dict:
    status, payload = req("GET", "/api/v1/admin/product-categories", token)
    existing = payload.get("data") or []
    if isinstance(existing, dict):
        existing = existing.get("records") or existing.get("list") or []
    cat_ids = {}
    for item in existing:
        if isinstance(item, dict) and item.get("name"):
            cat_ids[item["name"]] = item.get("id")

    wanted = [("知识资料包", 1), ("1v1 咨询", 2)]
    for name, sort in wanted:
        if name in cat_ids:
            print(f"[SKIP] product category: {name}")
            continue
        status, payload = req(
            "POST",
            "/api/v1/admin/product-categories",
            token,
            {"name": name, "sortOrder": sort, "status": 1},
        )
        created = must(f"create product category {name}", status, payload)
        cat_ids[name] = created.get("id") if isinstance(created, dict) else created
    return cat_ids


def ensure_products(token: str, cat_ids: dict) -> list:
    status, payload = req("GET", "/api/v1/admin/products?page=1&pageSize=100", token)
    d = payload.get("data") or {}
    existing = d.get("records") if isinstance(d, dict) else (d if isinstance(d, list) else [])
    by_name = {p.get("name"): p for p in existing if isinstance(p, dict)}

    products = [
        {
            "name": "亚马逊选品利润模型资料包（2026）",
            "categoryId": cat_ids.get("知识资料包"),
            "productType": "digital",
            "mainImage": "https://picsum.photos/seed/ebook-select/600/600",
            "images": ["https://picsum.photos/seed/ebook-select/600/600"],
            "description": "从搜索词到利润模型的完整清单，含模板可复用。",
            "detail": (
                "<h2>你将获得</h2><p>选品漏斗、利润表、竞品拆解模板与案例库。</p>"
                "<h2>适合谁</h2><p>准备启动或优化亚马逊选品流程的卖家。</p>"
                "<h2>更新说明</h2><p>季度免费更新，已购用户可在阅读器查看最新版。</p>"
            ),
            "price": 99,
            "originalPrice": 199,
            "stock": 9999,
            "unit": "份",
            "sortOrder": 1,
            "skus": [
                {
                    "skuName": "标准版",
                    "price": 99,
                    "originalPrice": 199,
                    "stock": 9999,
                    "sortOrder": 0,
                    "status": 1,
                }
            ],
        },
        {
            "name": "欧洲站合规与 VAT 操作手册",
            "categoryId": cat_ids.get("知识资料包"),
            "productType": "digital",
            "mainImage": "https://picsum.photos/seed/ebook-vat/600/600",
            "images": ["https://picsum.photos/seed/ebook-vat/600/600"],
            "description": "各国税率、申报频率与代理费用对照，少踩合规坑。",
            "detail": (
                "<h2>目录</h2><p>VAT 注册流程、税率对比、申报节奏、常见拒单原因。</p>"
                "<h3>附录</h3><p>各国税率与代理费用对比表。</p>"
            ),
            "price": 39,
            "originalPrice": 79,
            "stock": 9999,
            "unit": "份",
            "sortOrder": 2,
            "skus": [
                {
                    "skuName": "电子版",
                    "price": 39,
                    "originalPrice": 79,
                    "stock": 9999,
                    "sortOrder": 0,
                    "status": 1,
                }
            ],
        },
        {
            "name": "选品诊断 1v1 咨询（45 分钟）",
            "categoryId": cat_ids.get("1v1 咨询"),
            "productType": "service",
            "mainImage": "https://picsum.photos/seed/consult-1/600/600",
            "images": ["https://picsum.photos/seed/consult-1/600/600"],
            "description": "针对你的具体业务场景做选品与路径诊断，支持改期。",
            "detail": (
                "<h2>服务说明</h2><p>45 分钟一对一语音/视频；下单后自选时段。</p>"
                "<p>服务开始前 24 小时可免费改期或取消。</p>"
            ),
            "price": 299,
            "originalPrice": 399,
            "stock": 100,
            "unit": "次",
            "sortOrder": 3,
            "skus": [
                {
                    "skuName": "45分钟",
                    "price": 299,
                    "originalPrice": 399,
                    "stock": 100,
                    "sortOrder": 0,
                    "status": 1,
                }
            ],
        },
        {
            "name": "独立站冷启动 1v1 咨询（60 分钟）",
            "categoryId": cat_ids.get("1v1 咨询"),
            "productType": "service",
            "mainImage": "https://picsum.photos/seed/consult-2/600/600",
            "images": ["https://picsum.photos/seed/consult-2/600/600"],
            "description": "从内容测品到结账页信息架构，帮你规划冷启动路径。",
            "detail": "<h2>服务说明</h2><p>60 分钟深聊：流量、转化、履约与售后政策前置。</p>",
            "price": 399,
            "originalPrice": 499,
            "stock": 80,
            "unit": "次",
            "sortOrder": 4,
            "skus": [
                {
                    "skuName": "60分钟",
                    "price": 399,
                    "originalPrice": 499,
                    "stock": 80,
                    "sortOrder": 0,
                    "status": 1,
                }
            ],
        },
    ]

    ids = []
    for p in products:
        old = by_name.get(p["name"])
        if old:
            pid = old["id"]
            print(f"[SKIP] product exists: {p['name']} id={pid}")
            status, payload = req("PUT", f"/api/v1/admin/products/{pid}/on-sale", token)
            soft(f"on-sale existing {pid}", status, payload)
            ids.append(pid)
            continue
        status, payload = req("POST", "/api/v1/admin/products", token, p)
        created = must(f"create product {p['name'][:20]}", status, payload)
        pid = created.get("id") if isinstance(created, dict) else None
        if pid:
            status, payload = req("PUT", f"/api/v1/admin/products/{pid}/on-sale", token)
            soft(f"on-sale {pid}", status, payload)
            ids.append(pid)
    return ids


def ensure_appointment_services(token: str):
    status, payload = req("GET", "/api/v1/admin/appointment-services?page=1&pageSize=50", token)
    d = payload.get("data") or {}
    existing = d.get("records") if isinstance(d, dict) else (d if isinstance(d, list) else [])
    names = {s.get("name") for s in existing if isinstance(s, dict)}
    services = [
        {
            "name": "选品诊断 1v1（45 分钟）",
            "description": "针对具体业务做选品与路径诊断",
            "image": "https://picsum.photos/seed/appt-1/400/400",
            "duration": 45,
            "price": 299,
            "status": 1,
        },
        {
            "name": "独立站冷启动 1v1（60 分钟）",
            "description": "内容测品到结账页的冷启动规划",
            "image": "https://picsum.photos/seed/appt-2/400/400",
            "duration": 60,
            "price": 399,
            "status": 1,
        },
    ]
    for s in services:
        if s["name"] in names:
            print(f"[SKIP] appointment service: {s['name']}")
            continue
        status, payload = req("POST", "/api/v1/admin/appointment-services", token, s)
        soft(f"create appointment {s['name']}", status, payload)


def build_home_dsl(home_id: str | int) -> dict:
    return {
        "schema_version": "1.0",
        "page": {
            "id": str(home_id),
            "name": "出海笔记首页",
            "type": "home",
            "path": "/pages/index/index",
            "share_title": "出海笔记 · 阿哲｜选品·供应链·独立站",
            "background_color": "#f5f6f9",
        },
        "global_config": {"pull_refresh": True, "reach_bottom_load": True},
        "components": [
            {
                "id": "brand-hero",
                "type": "brand_intro",
                "props": {
                    "title": "出海笔记 · 阿哲",
                    "subtitle": "已认证 · 跨境电商实战",
                    "description": "选品 / 供应链 / 独立站 · 238 篇内容 · 1.2w 关注 · 咨询评分 4.9",
                    "kpi": "238 篇内容 · 1.2w 关注者 · 4.9 咨询评分",
                },
                "style": {
                    "margin_top": 0,
                    "margin_bottom": 12,
                    "padding_left": 12,
                    "padding_right": 12,
                    "background_color": "#1b1f31",
                    "border_radius": 0,
                    "padding_top": 20,
                    "padding_bottom": 20,
                },
            },
            {
                "id": "search-home",
                "type": "search",
                "props": {
                    "placeholder": "搜索：选品清单 / 验厂 / VAT / TikTok",
                    "scope": "all",
                    "shape": "round",
                },
                "style": {
                    "margin_top": 0,
                    "margin_bottom": 12,
                    "padding_left": 12,
                    "padding_right": 12,
                },
            },
            {
                "id": "quick-nav",
                "type": "nav",
                "props": {
                    "items": [
                        {
                            "icon": "📚",
                            "title": "内容中心",
                            "link_type": "page",
                            "link_url": "/pages/content-list/content-list",
                        },
                        {
                            "icon": "📘",
                            "title": "资料包",
                            "link_type": "page",
                            "link_url": "/pages/product-list/product-list?type=digital",
                        },
                        {
                            "icon": "🗓️",
                            "title": "1v1咨询",
                            "link_type": "page",
                            "link_url": "/pages/product-list/product-list?type=service",
                        },
                        {
                            "icon": "👑",
                            "title": "会员权益",
                            "link_type": "page",
                            "link_url": "/pages/member-center/member-center",
                        },
                    ],
                    "columns": 4,
                    "item_size": 56,
                    "text_color": "#0f1219",
                    "icon_bg_color": "#eef2ff",
                },
                "style": {
                    "margin_top": 0,
                    "margin_bottom": 14,
                    "padding_left": 12,
                    "padding_right": 12,
                    "background_color": "#fff",
                    "border_radius": 14,
                    "padding_top": 16,
                    "padding_bottom": 16,
                },
            },
            {
                "id": "topics-title",
                "type": "section_title",
                "props": {
                    "title": "按主题逛",
                    "subtitle": "内容都按业务环节归好类了",
                    "title_color": "#0f1219",
                    "subtitle_color": "#a5abb9",
                },
                "style": {"margin_top": 4, "margin_bottom": 8, "padding_left": 12, "padding_right": 12},
            },
            {
                "id": "topics-nav",
                "type": "nav",
                "props": {
                    "items": [
                        {"icon": "🔍", "title": "选品", "link_type": "page", "link_url": "/pages/content-list/content-list"},
                        {"icon": "🛒", "title": "平台运营", "link_type": "page", "link_url": "/pages/content-list/content-list"},
                        {"icon": "🏭", "title": "供应链", "link_type": "page", "link_url": "/pages/content-list/content-list"},
                        {"icon": "🚢", "title": "物流", "link_type": "page", "link_url": "/pages/content-list/content-list"},
                        {"icon": "📋", "title": "合规", "link_type": "page", "link_url": "/pages/content-list/content-list"},
                        {"icon": "🌐", "title": "独立站", "link_type": "page", "link_url": "/pages/content-list/content-list"},
                    ],
                    "columns": 3,
                    "item_size": 48,
                    "text_color": "#39404f",
                    "icon_bg_color": "#f5f6f9",
                },
                "style": {
                    "margin_top": 0,
                    "margin_bottom": 14,
                    "padding_left": 12,
                    "padding_right": 12,
                    "background_color": "#fff",
                    "border_radius": 14,
                    "padding_top": 12,
                    "padding_bottom": 12,
                },
            },
            {
                "id": "feed-title",
                "type": "section_title",
                "props": {
                    "title": "最新更新",
                    "subtitle": "笔记 · 长文 · 视频 · 数据混合流",
                    "more_text": "全部 ›",
                    "more_link_type": "page",
                    "more_link_url": "/pages/content-list/content-list",
                    "title_color": "#0f1219",
                    "subtitle_color": "#a5abb9",
                },
                "style": {"margin_top": 4, "margin_bottom": 8, "padding_left": 12, "padding_right": 12},
            },
            {
                "id": "article-feed",
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
                "style": {"margin_top": 0, "margin_bottom": 14, "padding_left": 12, "padding_right": 12},
            },
            {
                "id": "shop-title",
                "type": "section_title",
                "props": {
                    "title": "知识产品",
                    "subtitle": "资料包永久可看 · 咨询按时段预约",
                    "more_text": "商城 ›",
                    "more_link_type": "page",
                    "more_link_url": "/pages/product-list/product-list",
                    "title_color": "#0f1219",
                    "subtitle_color": "#a5abb9",
                },
                "style": {"margin_top": 4, "margin_bottom": 8, "padding_left": 12, "padding_right": 12},
            },
            {
                "id": "product-grid",
                "type": "product_list",
                "props": {
                    "title": "",
                    "layout": "grid",
                    "columns": 2,
                    "show_price": True,
                    "limit": 4,
                    "data_source": {"type": "product", "config": {"sort": "latest", "limit": 4}},
                },
                "style": {"margin_top": 0, "margin_bottom": 20, "padding_left": 12, "padding_right": 12},
            },
            {
                "id": "ai-fab",
                "type": "float_button",
                "props": {
                    "text": "🤖",
                    "action_type": "ai",
                    "link_url": "/pages/ai-chat/ai-chat",
                    "position": "right_bottom",
                    "offset_x": 24,
                    "offset_y": 180,
                    "size": 100,
                    "background_color": BRAND,
                    "shadow_level": 3,
                },
                "style": {},
            },
        ],
    }


def upsert_home(token: str) -> int:
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
        print(f"[SKIP] reuse home page id={home_id}")
        soft(
            "update home meta",
            *req(
                "PUT",
                f"/api/v1/admin/pages/{home_id}",
                token,
                {
                    "name": "出海笔记首页",
                    "shareTitle": "出海笔记 · 阿哲｜选品·供应链·独立站",
                    "description": "内容沉淀 · 知识电商 · 预约咨询 · 会员运营",
                },
            ),
        )
    else:
        status, payload = req(
            "POST",
            "/api/v1/admin/pages",
            token,
            {
                "name": "出海笔记首页",
                "type": 1,
                "path": "/pages/index/index",
                "shareTitle": "出海笔记 · 阿哲｜选品·供应链·独立站",
                "description": "内容沉淀 · 知识电商 · 预约咨询 · 会员运营",
            },
        )
        created = must("create home page", status, payload)
        home_id = created["id"]

    dsl = build_home_dsl(home_id)
    status, payload = req(
        "POST",
        f"/api/v1/admin/pages/{home_id}/draft",
        token,
        {"dslContent": json.dumps(dsl, ensure_ascii=False)},
    )
    must("save home draft", status, payload)
    status, payload = req("POST", f"/api/v1/admin/pages/{home_id}/publish", token)
    must("publish home page", status, payload)
    return home_id


def save_configs(token: str, home_id: int):
    tabs = [
        {
            "id": "tab-0",
            "text": "首页",
            "icon": "🏠",
            "pagePath": "/pages/index/index",
            "pageId": home_id,
            "pageName": "出海笔记首页",
            "enabled": True,
        },
        {
            "id": "tab-1",
            "text": "内容",
            "icon": "📚",
            "pagePath": "/pages/content-list/content-list",
            "pageId": "__content_list__",
            "pageName": "内容中心",
            "enabled": True,
        },
        {
            "id": "tab-2",
            "text": "商城",
            "icon": "🛍️",
            "pagePath": "/pages/product-list/product-list",
            "pageId": "",
            "pageName": "知识商城",
            "enabled": True,
        },
        {
            "id": "tab-3",
            "text": "我的",
            "icon": "👤",
            "pagePath": "/pages/mine/mine",
            "pageId": "__mine__",
            "pageName": "我的",
            "enabled": True,
        },
    ]
    theme = {
        "primaryColor": BRAND,
        "secondaryColor": ACCENT,
        "navBarColor": BRAND,
        "tabBarActiveColor": BRAND,
        "tabBarInactiveColor": "#a5abb9",
        "tabBarBackgroundColor": "#ffffff",
        "pageBackgroundColor": "#f5f6f9",
    }
    mine = {
        "loginTitle": "登录出海笔记",
        "loginSubtitle": "查看订单、已购资料、预约与会员权益",
        "loginButtonText": "微信一键登录",
        "memberCardTitle": "出海会员",
        "servicePhone": "",
        "menuItems": [
            {"id": "orders", "icon": "🧾", "title": "全部订单", "url": "/pages/order-list/order-list", "enabled": True},
            {"id": "library", "icon": "📚", "title": "我的已购资料", "url": "/pages/library/library", "enabled": True},
            {"id": "reservation", "icon": "🗓️", "title": "我的预约", "url": "/pages/my-appointments/my-appointments", "enabled": True},
            {"id": "member-center", "icon": "👑", "title": "会员中心 · 权益", "url": "/pages/member-center/member-center", "enabled": True},
            {"id": "coupons", "icon": "🎫", "title": "优惠券", "url": "/pages/coupon-list/coupon-list", "enabled": True},
            {"id": "ai", "icon": "🤖", "title": "AI 出海助手", "url": "/pages/ai-chat/ai-chat", "enabled": True},
            {"id": "favorites", "icon": "🔖", "title": "我的收藏", "url": "/pages/content-list/content-list", "enabled": True},
            {"id": "contact", "icon": "💬", "title": "客服 · 售后", "url": "/pages/service-chat/service-chat", "enabled": True},
        ],
        "orderQuickAccess": {
            "showOrderTabs": True,
            "showAllOrdersBtn": True,
            "tabLabels": {"pending": "待付款", "paid": "已付款", "shipped": "已发货", "refund": "退款"},
        },
        "userProfile": {
            "showAvatar": True,
            "showNickname": True,
            "showMemberLevel": True,
            "allowEditProfile": True,
            "memberLevelLabel": "出海会员",
        },
    }
    configs = [
        {"configKey": "miniappTemplateKey", "configValue": "standard", "configGroup": "basic", "description": "小程序导航模板"},
        {"configKey": "miniappHomePageId", "configValue": str(home_id), "configGroup": "basic", "description": "首页绑定"},
        {"configKey": "miniappMinePageId", "configValue": "__mine__", "configGroup": "basic", "description": "我的页面绑定"},
        {"configKey": "tabbarItems", "configValue": json.dumps(tabs, ensure_ascii=False), "configGroup": "basic", "description": "底部导航"},
        {"configKey": "minePageConfig", "configValue": json.dumps(mine, ensure_ascii=False), "configGroup": "basic", "description": "我的页面"},
        {"configKey": "miniappThemeConfig", "configValue": json.dumps(theme, ensure_ascii=False), "configGroup": "basic", "description": "主题配色"},
        {
            "configKey": "miniappShareTitle",
            "configValue": "出海笔记 · 阿哲｜选品·供应链·独立站",
            "configGroup": "basic",
            "description": "分享标题",
        },
    ]
    status, payload = req("PUT", "/api/v1/admin/system/configs", token, {"configs": configs})
    must("save miniapp configs", status, payload)


def publish_release(token: str):
    status, payload = req(
        "POST",
        "/api/v1/admin/miniapp-releases",
        token,
        {
            "mode": "publish",
            "changeType": "minor",
            "releaseNotes": "对齐出海笔记原型：首页IP卡/搜索/快捷入口、Tab=首页·内容·商城·我的、知识资料包与1v1咨询、已购资料阅读器、评价与支付成功闭环",
        },
    )
    return must("publish miniapp release", status, payload)


def ensure_reviews(product_ids: list):
    """写入示例评价（直接 SQL，Admin 仅有屏蔽能力）。"""
    import subprocess

    if not product_ids:
        print("[SKIP] reviews: no products")
        return
    # 固定示例：覆盖资料包与咨询
    samples = [
        (product_ids[0], 5, "实用,模板全", "选品漏斗直接能套用，利润表帮我省了不少试错。", 0, "Lisa_跨境"),
        (product_ids[0], 5, "更新及时", "季度更新很良心，目录结构清楚。", 1, "匿名用户"),
    ]
    if len(product_ids) > 1:
        samples.append(
            (product_ids[1], 4, "合规清晰", "VAT 流程讲得很清楚，附录税率表有用。", 0, "阿哲粉丝")
        )
    if len(product_ids) > 2:
        samples.append(
            (product_ids[2], 5, "讲得清楚,值得推荐", "45 分钟把选品卡点讲透了，很值。", 0, "独立站新人")
        )

    values_sql = []
    for pid, score, tags, content, anon, nick in samples:
        content_esc = content.replace("'", "''")
        tags_esc = tags.replace("'", "''")
        nick_esc = nick.replace("'", "''")
        values_sql.append(
            f"( {int(pid)}, 1, NULL, {int(score)}, '{tags_esc}', '{content_esc}', '[]', {int(anon)}, '{nick_esc}', 1 )"
        )
    sql = (
        "DELETE FROM mp_product_review WHERE user_id=1 AND nickname IN "
        "('Lisa_跨境','匿名用户','阿哲粉丝','独立站新人');"
        "INSERT INTO mp_product_review "
        "(product_id,user_id,order_id,score,tags,content,images,anonymous,nickname,status) VALUES "
        + ",".join(values_sql)
        + ";"
    )
    cmd = [
        "docker",
        "exec",
        "-i",
        "miniapp-mysql",
        "mysql",
        "-uroot",
        "-proot123456",
        "--default-character-set=utf8mb4",
        "miniapp",
        "-e",
        sql,
    ]
    try:
        r = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
        if r.returncode != 0:
            print(f"[WARN] reviews seed: {r.stderr[-400:]}")
        else:
            print(f"[OK] seed reviews x{len(samples)}")
    except Exception as e:
        print(f"[WARN] reviews seed failed: {e}")


def main():
    token = login()
    cat_ids = ensure_product_categories(token)
    product_ids = ensure_products(token, cat_ids)
    ensure_appointment_services(token)
    ensure_reviews(product_ids)
    home_id = upsert_home(token)
    save_configs(token, home_id)
    release = publish_release(token)
    print(
        json.dumps(
            {
                "homePageId": home_id,
                "productIds": product_ids,
                "productCategories": cat_ids,
                "release": release if isinstance(release, dict) else {"raw": release},
                "theme": {"brand": BRAND, "accent": ACCENT},
                "tabs": ["首页", "内容", "商城", "我的"],
                "admin": "http://localhost:5175/page-builder/start",
            },
            ensure_ascii=False,
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
