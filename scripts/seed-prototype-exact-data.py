#!/usr/bin/env python3
"""将原型 HTML 的 ITEMS / PRODUCTS 精确写入后台，并发布与原型一致的首页 DSL。"""

from __future__ import annotations

import json
import sys
import urllib.error
import urllib.request

BASE = "http://localhost:8080"
ORIGIN = "http://localhost:5175"
BRAND = "#2f5bff"
ACCENT = "#ff6b3d"

# ── 原型内容（与 跨境电商博主小程序-完整版.html ITEMS 一致）──
ITEMS = [
    {
        "title": "2026下半年跨境选品趋势清单，附完整数据源",
        "category": "选品洞察",
        "format": "长文",
        "summary": "07-19 · 12分钟 · 2.1w 阅读",
        "tags": ["长文", "选品洞察", "趋势"],
        "content": (
            "<p>过去两个季度，我拉了后台 30+ 品类的动销数据，结合独立站与 TikTok Shop 的实际成交，"
            "整理出下半年值得关注的细分品类清单。</p>"
            "<h3>三个明确信号</h3>"
            "<p>家居收纳在欧洲站需求稳定但竞争加剧；户外露营装备在北美复购率明显提升；"
            "宠物智能用品仍在早期红利期，客单价高、竞品少。</p>"
            "<p>完整数据表与供应商初筛清单已更新至资料包 2026 年 7 月版本。</p>"
        ),
        "sort": 3,
        "cover": "https://picsum.photos/seed/proto-item1/750/420",
    },
    {
        "title": "新手起独立站，这 5 个坑我全踩过一遍",
        "category": "独立站",
        "format": "笔记",
        "summary": "3.4k · 出海笔记",
        "tags": ["笔记", "独立站", "跨境新手", "避坑指南"],
        "content": (
            "<p>做独立站两年多，被问最多的就是「第一次搭站要注意什么」。今天把最容易踩的 5 个坑写清楚。</p>"
            "<p>1️⃣ 建站前没做选品验证<br/>2️⃣ 物流方案选错<br/>3️⃣ 支付渠道没本地化<br/>"
            "4️⃣ 落地页信息层级混乱<br/>5️⃣ 广告投放太早</p>"
            "<p>每个坑的具体解法整理在资料包里了。</p>"
        ),
        "sort": 4,
        "cover": "https://picsum.photos/seed/proto-item2/750/900",
    },
    {
        "title": "TikTok Shop 起号 3 个月，完整数据复盘",
        "category": "平台运营",
        "format": "视频",
        "summary": "07-10 · 1.5w 播放",
        "tags": ["视频", "平台运营", "TikTok"],
        "content": (
            "<p>3 个月从 0 做到日均稳定成交，中间调整过 4 次选品方向。这期把关键节点和后台数据都摆出来。</p>"
            "<h3>关键转折点</h3>"
            "<p>前两周流量很好但转化很差，详情页卖点和达人话术没对齐目标人群。调整之后转化率提升近 3 倍。</p>"
        ),
        "sort": 1,
        "cover": "https://picsum.photos/seed/proto-item3/750/420",
    },
    {
        "title": "验厂清单｜第一次去工厂要问的 18 个问题",
        "category": "供应链",
        "format": "笔记",
        "summary": "2.8k · 出海笔记",
        "tags": ["笔记", "供应链", "验厂", "工厂筛选"],
        "content": (
            "<p>第一次跑工厂最怕「不知道该问什么」。这份清单分三块：资质核验、产能评估、品控流程。"
            "照着问一遍，基本能筛掉 80% 不靠谱的供应商。</p>"
        ),
        "sort": 5,
        "cover": "https://picsum.photos/seed/proto-item4/750/900",
    },
    {
        "title": "7 月跨境类目动销速报",
        "category": "选品洞察",
        "format": "数据",
        "summary": "数据更新至 07-14 · 采样 3 个平台 · 宠物智能 +38% · 户外露营 +21% · 家居收纳 -6%",
        "tags": ["数据", "选品洞察", "动销"],
        "content": (
            "<p>本期数据覆盖亚马逊北美站、欧洲站及 TikTok Shop 美区，采样周期 06-15 至 07-14。</p>"
            "<p><b>+38%</b> 宠物智能　<b>+21%</b> 户外露营　<b style='color:#e2564a'>-6%</b> 家居收纳</p>"
            "<h3>读数说明</h3>"
            "<p>宠物智能用品增速最快但基数小，适合测品；家居收纳环比下滑主要来自价格战导致的均价下移。</p>"
        ),
        "sort": 2,
        "cover": "https://picsum.photos/seed/proto-item5/750/420",
    },
    {
        "title": "欧洲站 VAT 注册全流程：时间、成本与最容易卡住的环节",
        "category": "合规税务",
        "format": "长文",
        "summary": "07-08 · 9分钟 · 8.6k 阅读",
        "tags": ["长文", "合规税务", "VAT"],
        "content": (
            "<p>VAT 是欧洲站最容易被低估的环节。注册周期通常 4–6 周，赶上旺季前排队可能拖到 8 周。</p>"
            "<p>建议在选品定型、还没开始打样时就启动 VAT 注册，和供应链并行。</p>"
        ),
        "sort": 6,
        "cover": "https://picsum.photos/seed/proto-item6/750/420",
    },
    {
        "title": "海外仓 vs 直发｜成本临界点算给你看",
        "category": "物流履约",
        "format": "笔记",
        "summary": "1.9k · 出海笔记",
        "tags": ["笔记", "物流", "海外仓"],
        "content": (
            "<p>单品月销稳定超过 300 单、且件重超过 500g，海外仓基本就划算；低于这个量级，直发 + 头程集运更灵活。</p>"
        ),
        "sort": 7,
        "cover": "https://picsum.photos/seed/proto-item7/750/750",
    },
    {
        "title": "亚马逊新品前 30 天：Listing、广告与评论的节奏安排",
        "category": "平台运营",
        "format": "长文",
        "summary": "06-28 · 15分钟 · 1.2w 阅读",
        "tags": ["长文", "平台运营", "亚马逊"],
        "content": (
            "<p>第 1–7 天做 Listing 完整度；第 8–20 天投精准词并积累评论；第 21–30 天决定加码或止损。</p>"
        ),
        "sort": 8,
        "cover": "https://picsum.photos/seed/proto-item8/750/420",
    },
    {
        "title": "独立站落地页拆解：转化率从 1.2% 到 3.8%",
        "category": "独立站",
        "format": "视频",
        "summary": "06-25 · 9.3k 播放 · 12:05",
        "tags": ["视频", "独立站", "转化"],
        "content": (
            "<p>首屏价值主张 > 信任背书位置 > 价格呈现方式 > CTA 文案。前两项贡献了大部分提升。</p>"
        ),
        "sort": 9,
        "cover": "https://picsum.photos/seed/proto-item9/750/420",
    },
    {
        "title": "打样阶段最容易翻车的 4 件事",
        "category": "供应链",
        "format": "长文",
        "summary": "06-20 · 7分钟 · 6.4k 阅读",
        "tags": ["长文", "供应链", "打样"],
        "content": (
            "<p>样品和大货用料不一致、包装未同步确认、认证测试没提前送样、口头确认没留书面记录。</p>"
        ),
        "sort": 10,
        "cover": "https://picsum.photos/seed/proto-item10/750/420",
    },
]

# ── 原型商品（与 PRODUCTS 一致）──
PRODUCTS = [
    {
        "name": "《100 个跨境爆款选品案例库》",
        "productType": "digital",
        "category": "知识资料包",
        "price": 59,
        "originalPrice": 99,
        "description": "覆盖家居 / 户外 / 宠物 / 3C 四大类目 · 含供应商筛选清单与定价模型",
        "detail": (
            "<h2>你将获得</h2><ul>"
            "<li>一套可复用的选品验证流程（含 4 项硬指标）</li>"
            "<li>100 个已验证案例的完整决策链路</li>"
            "<li>供应商筛选核对清单</li>"
            "<li>定价与利润测算 Excel 模板</li></ul>"
            "<h2>适合谁</h2><p>已经决定做跨境、但还没稳定选品方法论的卖家。</p>"
        ),
        "mainImage": "https://picsum.photos/seed/proto-p1/600/600",
        "skuName": "完整版",
        "sortOrder": 1,
    },
    {
        "name": "《欧洲站合规与 VAT 操作手册》",
        "productType": "digital",
        "category": "知识资料包",
        "price": 39,
        "originalPrice": 69,
        "description": "VAT / EPR / CE / GPSR 全流程 · 含各国税率对比与驳回补救方案",
        "detail": (
            "<h2>你将获得</h2><ul>"
            "<li>VAT 注册全流程时间表</li>"
            "<li>各国税率与申报频率对比表</li>"
            "<li>常见驳回原因与补救方案</li></ul>"
        ),
        "mainImage": "https://picsum.photos/seed/proto-p2/600/600",
        "skuName": "标准版",
        "sortOrder": 2,
    },
    {
        "name": "选品诊断 1v1 咨询（45 分钟）",
        "productType": "service",
        "category": "1v1 咨询",
        "price": 299,
        "originalPrice": 399,
        "description": "围绕你的选品方向、供应链与店铺数据做针对性诊断 · 含文字纪要",
        "detail": (
            "<h2>服务说明</h2><p>45 分钟一对一；咨询后 1 个工作日内文字纪要；"
            "服务开始前 24 小时可免费改期。</p>"
        ),
        "mainImage": "https://picsum.photos/seed/proto-p3/600/600",
        "skuName": "标准 45 分钟",
        "sortOrder": 3,
    },
    {
        "name": "独立站冷启动 1v1 咨询（60 分钟）",
        "productType": "service",
        "category": "1v1 咨询",
        "price": 399,
        "originalPrice": 399,
        "description": "建站选型 / 落地页结构 / 支付物流 / 首波投放 逐项诊断",
        "detail": "<h2>服务说明</h2><p>60 分钟深聊：建站、落地页、支付物流与首波投放。</p>",
        "mainImage": "https://picsum.photos/seed/proto-p4/600/600",
        "skuName": "标准 60 分钟",
        "sortOrder": 4,
    },
]

PROTO_CONTENT_TITLES = {i["title"] for i in ITEMS}
PROTO_PRODUCT_NAMES = {p["name"] for p in PRODUCTS}


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
        with urllib.request.urlopen(r, timeout=60) as resp:
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


def soft(label: str, status: int, payload: dict):
    if status >= 400 or not ok(payload):
        print(f"[WARN] {label}: HTTP {status} {json.dumps(payload, ensure_ascii=False)[:300]}")
        return None
    print(f"[OK] {label}")
    return payload.get("data")


def login():
    status, payload = req("POST", "/api/v1/admin/auth/login", body={"username": "admin", "password": "admin123"})
    return must("login", status, payload)["accessToken"]


def ensure_content_categories(token: str) -> dict:
    status, payload = req("GET", "/api/v1/admin/content-categories", token)
    existing = payload.get("data") or []
    if isinstance(existing, dict):
        existing = existing.get("records") or existing.get("list") or []
    cat_ids = {}
    for item in existing:
        if isinstance(item, dict) and item.get("name"):
            cat_ids[item["name"]] = item.get("id")
    wanted = ["选品洞察", "供应链", "平台运营", "独立站", "物流履约", "合规税务"]
    for i, name in enumerate(wanted, 1):
        if name in cat_ids:
            continue
        status, payload = req(
            "POST",
            "/api/v1/admin/content-categories",
            token,
            {"name": name, "sortOrder": i, "status": 1},
        )
        created = must(f"content category {name}", status, payload)
        cat_ids[name] = created.get("id") if isinstance(created, dict) else created
    return cat_ids


def ensure_product_categories(token: str) -> dict:
    status, payload = req("GET", "/api/v1/admin/product-categories", token)
    existing = payload.get("data") or []
    if isinstance(existing, dict):
        existing = existing.get("records") or existing.get("list") or []
    cat_ids = {}
    for item in existing:
        if isinstance(item, dict) and item.get("name"):
            cat_ids[item["name"]] = item.get("id")
    for name, sort in [("知识资料包", 1), ("1v1 咨询", 2)]:
        if name in cat_ids:
            continue
        status, payload = req(
            "POST",
            "/api/v1/admin/product-categories",
            token,
            {"name": name, "sortOrder": sort, "status": 1},
        )
        created = must(f"product category {name}", status, payload)
        cat_ids[name] = created.get("id") if isinstance(created, dict) else created
    return cat_ids


def list_contents(token: str) -> list:
    status, payload = req("GET", "/api/v1/admin/contents?current=1&size=200", token)
    d = payload.get("data") or {}
    return d.get("records") or d.get("list") or (d if isinstance(d, list) else [])


def list_products(token: str) -> list:
    status, payload = req("GET", "/api/v1/admin/products?page=1&pageSize=100", token)
    d = payload.get("data") or {}
    return d.get("records") or d.get("list") or (d if isinstance(d, list) else [])


def upsert_contents(token: str, cat_ids: dict):
    existing = list_contents(token)
    by_title = {c.get("title"): c for c in existing if isinstance(c, dict)}
    for art in ITEMS:
        body = {
            "title": art["title"],
            "categoryId": cat_ids.get(art["category"]),
            "coverImage": art["cover"],
            "summary": art["summary"],
            "content": art["content"],
            "author": "出海笔记 · 阿哲",
            "source": art["format"],
            "tags": art["tags"],
            "sortOrder": art["sort"],
        }
        old = by_title.get(art["title"])
        if old:
            cid = old["id"]
            status, payload = req("PUT", f"/api/v1/admin/contents/{cid}", token, body)
            soft(f"update content {art['title'][:18]}", status, payload)
        else:
            status, payload = req("POST", "/api/v1/admin/contents", token, body)
            created = must(f"create content {art['title'][:18]}", status, payload)
            cid = created.get("id") if isinstance(created, dict) else None
        if cid:
            status, payload = req("PUT", f"/api/v1/admin/contents/{cid}/publish", token)
            soft(f"publish {cid}", status, payload)

    # 下架非原型演示文（status 为 published 字符串，不是 1）
    for c in list_contents(token):
        title = c.get("title")
        st = c.get("status")
        if title and title not in PROTO_CONTENT_TITLES and st in (1, "1", "published", "PUBLISHED"):
            cid = c.get("id")
            for path in (
                f"/api/v1/admin/contents/{cid}/unpublish",
                f"/api/v1/admin/contents/{cid}/offline",
            ):
                status, payload = req("PUT", path, token)
                if status < 400 and ok(payload):
                    print(f"[OK] unpublish {title[:20]}")
                    break
            else:
                status, payload = req(
                    "PUT",
                    f"/api/v1/admin/contents/{cid}",
                    token,
                    {**{k: c.get(k) for k in ("title", "categoryId", "coverImage", "summary", "content", "author", "source", "tags", "sortOrder")}, "status": 0},
                )
                soft(f"hide {title[:20]}", status, payload)


def upsert_products(token: str, cat_ids: dict) -> list:
    existing = list_products(token)
    by_name = {p.get("name"): p for p in existing if isinstance(p, dict)}
    ids = []
    for p in PRODUCTS:
        body = {
            "name": p["name"],
            "categoryId": cat_ids.get(p["category"]),
            "productType": p["productType"],
            "mainImage": p["mainImage"],
            "images": [p["mainImage"]],
            "description": p["description"],
            "detail": p["detail"],
            "price": p["price"],
            "originalPrice": p["originalPrice"],
            "stock": 9999,
            "unit": "份" if p["productType"] == "digital" else "次",
            "sortOrder": p["sortOrder"],
            "skus": [
                {
                    "skuName": p["skuName"],
                    "price": p["price"],
                    "originalPrice": p["originalPrice"],
                    "stock": 9999,
                    "sortOrder": 0,
                    "status": 1,
                }
            ],
        }
        old = by_name.get(p["name"])
        if old:
            pid = old["id"]
            status, payload = req("PUT", f"/api/v1/admin/products/{pid}", token, body)
            soft(f"update product {p['name'][:16]}", status, payload)
        else:
            # try remap old seeded names
            aliases = {
                "《100 个跨境爆款选品案例库》": ["亚马逊选品利润模型资料包（2026）"],
                "《欧洲站合规与 VAT 操作手册》": ["欧洲站合规与 VAT 操作手册"],
                "选品诊断 1v1 咨询（45 分钟）": ["选品诊断 1v1 咨询（45 分钟）"],
                "独立站冷启动 1v1 咨询（60 分钟）": ["独立站冷启动 1v1 咨询（60 分钟）"],
            }
            mapped = None
            for alias in aliases.get(p["name"], []):
                if alias in by_name:
                    mapped = by_name[alias]
                    break
            if mapped:
                pid = mapped["id"]
                status, payload = req("PUT", f"/api/v1/admin/products/{pid}", token, body)
                soft(f"remap product -> {p['name'][:16]}", status, payload)
            else:
                status, payload = req("POST", "/api/v1/admin/products", token, body)
                created = must(f"create product {p['name'][:16]}", status, payload)
                pid = created.get("id") if isinstance(created, dict) else None
        if pid:
            status, payload = req("PUT", f"/api/v1/admin/products/{pid}/on-sale", token)
            soft(f"on-sale {pid}", status, payload)
            ids.append(pid)

    # 下架非原型实体商品噪音
    for p in list_products(token):
        name = p.get("name")
        if name and name not in PROTO_PRODUCT_NAMES:
            pid = p.get("id")
            for path in (
                f"/api/v1/admin/products/{pid}/off-sale",
                f"/api/v1/admin/products/{pid}/offline",
            ):
                status, payload = req("PUT", path, token)
                if status < 400 and ok(payload):
                    print(f"[OK] off-sale {name}")
                    break
    return ids


def upsert_home(token: str) -> int:
    status, payload = req("GET", "/api/v1/admin/pages?page=1&pageSize=50", token)
    d = payload.get("data") or {}
    pages = d.get("records") or d.get("list") or []
    home = next((p for p in pages if p.get("path") in ("/pages/index/index", "pages/index/index") or p.get("type") == "home"), None)
    if not home:
        status, payload = req(
            "POST",
            "/api/v1/admin/pages",
            token,
            {"name": "出海笔记首页", "path": "/pages/index/index", "type": "home", "status": 1},
        )
        home = must("create home", status, payload)
    home_id = home["id"] if isinstance(home, dict) else home

    dsl = {
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
                    "description": "选品 / 供应链 / 独立站",
                    "kpi": "238 篇内容 · 1.2w 关注者 · 4.9 咨询评分",
                },
                "style": {
                    "margin_top": 0,
                    "margin_bottom": 12,
                    "padding_left": 12,
                    "padding_right": 12,
                    "padding_top": 20,
                    "padding_bottom": 20,
                    "background_color": "#1b1f31",
                    "border_radius": 0,
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
                "style": {"margin_bottom": 12, "padding_left": 12, "padding_right": 12},
            },
            {
                "id": "quick-nav",
                "type": "nav",
                "props": {
                    "columns": 4,
                    "item_size": 56,
                    "text_color": "#0f1219",
                    "icon_bg_color": "#eef2ff",
                    "items": [
                        {"icon": "📚", "title": "内容中心", "link_type": "page", "link_url": "/pages/content-list/content-list"},
                        {"icon": "📘", "title": "资料包", "link_type": "page", "link_url": "/pages/product-list/product-list?type=digital"},
                        {"icon": "🗓️", "title": "1v1咨询", "link_type": "page", "link_url": "/pages/product-list/product-list?type=service"},
                        {"icon": "👑", "title": "会员权益", "link_type": "page", "link_url": "/pages/member-center/member-center"},
                    ],
                },
                "style": {
                    "margin_bottom": 14,
                    "padding_left": 12,
                    "padding_right": 12,
                    "padding_top": 16,
                    "padding_bottom": 16,
                    "background_color": "#fff",
                    "border_radius": 14,
                },
            },
            {
                "id": "feature-banner",
                "type": "banner",
                "props": {
                    "items": [
                        {
                            "image": "https://picsum.photos/seed/proto-feature/750/360",
                            "title": "🔍 选品洞察 · 本周精选｜2026 下半年跨境选品趋势清单",
                            "link_type": "page",
                            "link_url": "/pages/content-list/content-list",
                        }
                    ],
                    "autoplay": False,
                    "height": 280,
                    "border_radius": 16,
                },
                "style": {"margin_bottom": 14, "padding_left": 12, "padding_right": 12},
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
                "style": {"margin_bottom": 8, "padding_left": 12, "padding_right": 12},
            },
            {
                "id": "topics-nav",
                "type": "nav",
                "props": {
                    "columns": 3,
                    "item_size": 48,
                    "text_color": "#39404f",
                    "icon_bg_color": "#f5f6f9",
                    "items": [
                        {"icon": "🔍", "title": "选品洞察", "link_type": "page", "link_url": "/pages/content-list/content-list"},
                        {"icon": "🛒", "title": "平台运营", "link_type": "page", "link_url": "/pages/content-list/content-list"},
                        {"icon": "🏭", "title": "供应链", "link_type": "page", "link_url": "/pages/content-list/content-list"},
                        {"icon": "🚢", "title": "物流履约", "link_type": "page", "link_url": "/pages/content-list/content-list"},
                        {"icon": "⚖️", "title": "合规税务", "link_type": "page", "link_url": "/pages/content-list/content-list"},
                        {"icon": "🌐", "title": "独立站", "link_type": "page", "link_url": "/pages/content-list/content-list"},
                    ],
                },
                "style": {
                    "margin_bottom": 14,
                    "padding_left": 12,
                    "padding_right": 12,
                    "padding_top": 12,
                    "padding_bottom": 12,
                    "background_color": "#fff",
                    "border_radius": 14,
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
                "style": {"margin_bottom": 8, "padding_left": 12, "padding_right": 12},
            },
            {
                "id": "article-feed",
                "type": "article_list",
                "props": {
                    "layout": "card",
                    "columns": 1,
                    "show_cover": True,
                    "show_views": True,
                    "show_author": True,
                    "show_summary": True,
                    "data_source": {"type": "content", "config": {"sort": "latest", "limit": 8}},
                },
                "style": {"margin_bottom": 14, "padding_left": 12, "padding_right": 12},
            },
            {
                "id": "shop-title",
                "type": "section_title",
                "props": {
                    "title": "知识产品",
                    "subtitle": "虚拟商品正常发货 · 咨询按时段预约",
                    "more_text": "商城 ›",
                    "more_link_type": "page",
                    "more_link_url": "/pages/product-list/product-list",
                    "title_color": "#0f1219",
                    "subtitle_color": "#a5abb9",
                },
                "style": {"margin_bottom": 8, "padding_left": 12, "padding_right": 12},
            },
            {
                "id": "product-grid",
                "type": "product_list",
                "props": {
                    "limit": 4,
                    "layout": "grid",
                    "columns": 2,
                    "show_price": True,
                    "data_source": {"type": "product", "config": {"sort": "latest", "limit": 4}},
                },
                "style": {"margin_bottom": 20, "padding_left": 12, "padding_right": 12},
            },
            {
                "id": "ai-fab",
                "type": "float_button",
                "props": {
                    "size": 100,
                    "text": "🤖",
                    "link_url": "/pages/ai-chat/ai-chat",
                    "offset_x": 24,
                    "offset_y": 180,
                    "position": "right_bottom",
                    "action_type": "ai",
                    "shadow_level": 3,
                    "background_color": BRAND,
                },
                "style": {},
            },
        ],
    }

    status, payload = req(
        "POST",
        f"/api/v1/admin/pages/{home_id}/draft",
        token,
        {"dslContent": json.dumps(dsl, ensure_ascii=False)},
    )
    must("save home draft", status, payload)
    status, payload = req("POST", f"/api/v1/admin/pages/{home_id}/publish", token)
    must("publish home", status, payload)
    return int(home_id)


def save_configs_and_release(token: str, home_id: int):
    tabs = [
        {"id": "tab-0", "text": "首页", "icon": "🏠", "pagePath": "/pages/index/index", "pageId": home_id, "pageName": "出海笔记首页", "enabled": True},
        {"id": "tab-1", "text": "内容", "icon": "📚", "pagePath": "/pages/content-list/content-list", "pageId": "__content_list__", "pageName": "内容中心", "enabled": True},
        {"id": "tab-2", "text": "商城", "icon": "🛍️", "pagePath": "/pages/product-list/product-list", "pageId": "", "pageName": "知识商城", "enabled": True},
        {"id": "tab-3", "text": "我的", "icon": "👤", "pagePath": "/pages/mine/mine", "pageId": "__mine__", "pageName": "我的", "enabled": True},
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
    configs = [
        {"configKey": "miniappHomePageId", "configValue": str(home_id), "configGroup": "basic", "description": "首页绑定"},
        {"configKey": "tabbarItems", "configValue": json.dumps(tabs, ensure_ascii=False), "configGroup": "basic", "description": "底部导航"},
        {"configKey": "miniappThemeConfig", "configValue": json.dumps(theme, ensure_ascii=False), "configGroup": "basic", "description": "主题配色"},
        {"configKey": "miniappShareTitle", "configValue": "出海笔记 · 阿哲｜选品·供应链·独立站", "configGroup": "basic", "description": "分享标题"},
    ]
    status, payload = req("PUT", "/api/v1/admin/system/configs", token, {"configs": configs})
    must("save configs", status, payload)
    status, payload = req(
        "POST",
        "/api/v1/admin/miniapp-releases",
        token,
        {
            "mode": "publish",
            "changeType": "minor",
            "releaseNotes": "原型数据对齐：ITEMS 10 篇 + PRODUCTS 4 个知识商品，首页精选/主题/最新更新/知识产品",
        },
    )
    return must("publish release", status, payload)


def main():
    token = login()
    content_cats = ensure_content_categories(token)
    product_cats = ensure_product_categories(token)
    upsert_contents(token, content_cats)
    product_ids = upsert_products(token, product_cats)
    home_id = upsert_home(token)
    release = save_configs_and_release(token, home_id)

    # verify
    _, mp_c = req("GET", "/api/v1/mp/contents?current=1&size=10")
    _, mp_p = req("GET", "/api/v1/mp/products?current=1&size=10")
    contents = (mp_c.get("data") or {}).get("records") or []
    products = (mp_p.get("data") or {}).get("records") or []
    print(
        json.dumps(
            {
                "homePageId": home_id,
                "productIds": product_ids,
                "release": release.get("semver") if isinstance(release, dict) else release,
                "mpContentTitles": [c.get("title") for c in contents[:8]],
                "mpProductNames": [f"{p.get('name')} ¥{p.get('price')}" for p in products[:6]],
            },
            ensure_ascii=False,
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
