#!/usr/bin/env python3
"""通过后台 DSL 配置搭建内容型演示小程序（首页 + 内容 + 我的）"""
import json
import subprocess
from datetime import datetime

DB = ["mysql", "-h127.0.0.1", "-uminiprogram", "-pzx123456", "miniprogram_prod", "-N"]


def mysql(q: str) -> str:
    r = subprocess.run(DB + ["-e", q], capture_output=True, text=True)
    if r.returncode:
        raise SystemExit(r.stderr or r.stdout)
    return r.stdout.strip()


def mysql_json(q: str):
    raw = mysql(q)
    if not raw:
        return None
    return json.loads(raw)


def esc_json(obj) -> str:
    return json.dumps(obj, ensure_ascii=False).replace("\\", "\\\\").replace("'", "''")


def publish_page(page_id: int, dsl: dict):
    latest = int(mysql(f"SELECT COALESCE(MAX(version),0) FROM mp_page_version WHERE page_id={page_id};") or 0)
    new_ver = latest + 1
    dsl_str = esc_json(dsl)
    mysql(
        f"UPDATE mp_page_version SET status=2 WHERE page_id={page_id} AND status=1;"
    )
    mysql(
        f"INSERT INTO mp_page_version (page_id, version, dsl_content, status, published_at, publisher_id, deleted) "
        f"VALUES ({page_id}, {new_ver}, '{dsl_str}', 1, NOW(), 1, 0);"
    )
    mysql(
        f"UPDATE mp_page SET status=1, current_version={new_ver}, update_time=NOW() WHERE id={page_id};"
    )
    return new_ver


HERO_IMG = "https://api.zfculture.site/uploads/2026-08-19/d18dcd5f5c654fea8b5a40f3580d10cd.jpg"

HOME_DSL = {
    "schema_version": "1.0",
    "page": {
        "id": "demo_home",
        "name": "出海笔记首页",
        "path": "/pages/custom/page-old-home-1",
        "type": "home",
        "share_title": "出海笔记｜跨境资讯与干货",
        "background_color": "#F3F5F8",
    },
    "global_config": {"pull_refresh": True, "reach_bottom_load": True},
    "components": [
        {
            "id": "bh_demo_home",
            "type": "brand_header",
            "props": {
                "logo_text": "墨太白",
                "title": "出海笔记",
                "subtitle": "跨境资讯 · 干货工具",
                "fixed_top": True,
                "style_type": "plain",
                "title_color": "#172033",
                "subtitle_color": "#7b8798",
                "logo_text_color": "#002FA7",
                "background_color": "#ffffff",
                "show_divider": True,
                "title_font_size": 15,
                "subtitle_font_size": 11,
            },
            "style": {"margin_top": 0, "margin_left": 0, "margin_right": 0, "margin_bottom": 0},
        },
        {
            "id": "hero_demo",
            "type": "image",
            "props": {
                "image": HERO_IMG,
                "src": HERO_IMG,
                "mode": "widthFix",
                "aspect_ratio": "21:9",
                "link_type": "page",
                "link_url": "/pages/custom/page-398724",
            },
            "style": {"margin_top": 8, "margin_left": 12, "margin_right": 12, "margin_bottom": 8, "border_radius": 12},
        },
        {
            "id": "nav_demo",
            "type": "nav",
            "props": {
                "columns": 4,
                "items": [
                    {
                        "icon": "/images/nav-icons/g-content.png",
                        "title": "跨境资讯",
                        "link_type": "page",
                        "link_url": "/pages/custom/page-398724",
                    },
                    {
                        "icon": "/images/nav-icons/g-folder.png",
                        "title": "免费工具",
                        "link_type": "page",
                        "link_url": "/pages/custom/page-751193",
                    },
                    {
                        "icon": "/images/nav-icons/g-search.png",
                        "title": "搜索",
                        "link_type": "page",
                        "link_url": "/pages/search/search",
                    },
                    {
                        "icon": "/images/nav-icons/g-activity.png",
                        "title": "活动",
                        "link_type": "page",
                        "link_url": "/pkg-extra/activity-list/activity-list",
                    },
                ],
            },
            "style": {"margin_top": 4, "margin_left": 12, "margin_right": 12, "margin_bottom": 8},
        },
        {
            "id": "st_read",
            "type": "section_title",
            "props": {
                "title": "精选阅读",
                "subtitle": "最新跨境干货",
                "more_text": "更多 >",
                "more_link_type": "page",
                "more_link_url": "/pages/custom/page-398724",
            },
            "style": {"margin_top": 4, "margin_left": 12, "margin_right": 12, "margin_bottom": 4},
        },
        {
            "id": "feed_demo",
            "type": "article_feed",
            "props": {
                "layout": "list",
                "style_type": "list",
                "show_cover": True,
                "show_date": True,
                "page_size": 8,
                "data_source": {
                    "type": "content",
                    "params": {"status": "published"},
                    "query": {"status": "published", "size": 8},
                },
            },
            "style": {"margin_top": 0, "margin_left": 0, "margin_right": 0, "margin_bottom": 12},
        },
        {
            "id": "join_demo",
            "type": "join_group",
            "props": {
                "title": "加入出海交流群",
                "subtitle": "与同行交流跨境经验",
                "button_text": "立即加入",
                "qrcode": "",
            },
            "style": {"margin_top": 0, "margin_left": 12, "margin_right": 12, "margin_bottom": 16},
        },
    ],
}

CONTENT_DSL = {
    "schema_version": "1.0",
    "page": {
        "id": "page_cross_border_news",
        "name": "跨境资讯",
        "path": "/pages/custom/page-398724",
        "type": "custom",
        "share_title": "跨境资讯",
        "background_color": "#F3F5F8",
    },
    "global_config": {"pull_refresh": True, "reach_bottom_load": True},
    "components": [
        {
            "id": "bh_content",
            "type": "brand_header",
            "props": {
                "logo_text": "墨太白",
                "title": "跨境资讯",
                "subtitle": "政策 · 干货 · 行业动态",
                "fixed_top": True,
                "style_type": "plain",
                "title_color": "#172033",
                "subtitle_color": "#7b8798",
                "background_color": "#ffffff",
                "show_divider": True,
            },
            "style": {"margin_top": 0, "margin_left": 0, "margin_right": 0, "margin_bottom": 0},
        },
        {
            "id": "search_content",
            "type": "search",
            "props": {
                "placeholder": "搜索跨境文章、政策、干货",
                "shape": "round",
                "scope": "content",
                "link_url": "/pages/search/search",
            },
            "style": {"margin_top": 8, "margin_left": 12, "margin_right": 12, "margin_bottom": 8},
        },
        {
            "id": "articles_demo",
            "type": "article_list",
            "props": {
                "layout": "list",
                "show_cover": True,
                "show_date": True,
                "show_category_tabs": True,
                "show_more": False,
                "limit": 20,
                "data_source": {
                    "type": "content",
                    "params": {"status": "published"},
                    "query": {"status": "published", "size": 50},
                },
                "category_tabs": [
                    {"id": "", "name": "全部"},
                    {"id": "9", "name": "行业动态"},
                    {"id": "11", "name": "政策解读"},
                    {"id": "12", "name": "出海干货"},
                    {"id": "13", "name": "税务合规"},
                ],
            },
            "style": {},
        },
    ],
}

TOOLS_DSL = {
    "schema_version": "1.0",
    "page": {
        "id": "demo_tools",
        "name": "免费领取工具",
        "path": "/pages/custom/page-751193",
        "type": "custom",
        "share_title": "跨境实用工具包",
        "background_color": "#F3F5F8",
    },
    "global_config": {"pull_refresh": False, "reach_bottom_load": False},
    "components": [
        {
            "id": "bh_tools",
            "type": "brand_header",
            "props": {
                "logo_text": "墨太白",
                "title": "免费工具包",
                "subtitle": "跨境卖家实用资料",
                "fixed_top": True,
                "style_type": "plain",
                "title_color": "#172033",
                "background_color": "#ffffff",
            },
            "style": {"margin_top": 0, "margin_left": 0, "margin_right": 0, "margin_bottom": 0},
        },
        {
            "id": "img_tools",
            "type": "image",
            "props": {
                "image": HERO_IMG,
                "src": HERO_IMG,
                "mode": "widthFix",
                "aspect_ratio": "16:9",
                "link_type": "none",
            },
            "style": {"margin_top": 8, "margin_left": 12, "margin_right": 12, "margin_bottom": 8, "border_radius": 12},
        },
        {
            "id": "rt_tools",
            "type": "rich_text",
            "props": {
                "content": (
                    "<div style='padding:16px;line-height:1.8;color:#334155;'>"
                    "<h3 style='margin:0 0 12px;color:#002FA7;'>📦 工具包包含</h3>"
                    "<p>· 跨境税务自查清单</p>"
                    "<p>· 亚马逊运营 SOP 模板</p>"
                    "<p>· 物流成本测算表</p>"
                    "<p style='margin-top:16px;color:#64748b;font-size:13px;'>"
                    "点击下方按钮联系客服领取完整资料"
                    "</p></div>"
                ),
                "background_color": "#ffffff",
            },
            "style": {"margin_top": 0, "margin_left": 12, "margin_right": 12, "margin_bottom": 12, "border_radius": 12},
        },
        {
            "id": "nav_tools",
            "type": "nav",
            "props": {
                "columns": 2,
                "items": [
                    {
                        "icon": "/images/nav-icons/g-content.png",
                        "title": "去看资讯",
                        "link_type": "page",
                        "link_url": "/pages/custom/page-398724",
                    },
                    {
                        "icon": "💬",
                        "title": "联系客服",
                        "link_type": "page",
                        "link_url": "/pkg-user/service-chat/service-chat",
                    },
                ],
            },
            "style": {"margin_top": 0, "margin_left": 12, "margin_right": 12, "margin_bottom": 16},
        },
    ],
}

TABBAR = [
    {
        "id": "tab-0",
        "text": "首页",
        "icon": "/images/nav-icons/g-platform.png",
        "pagePath": "/pages/custom/page-old-home-1",
        "pageId": 1,
        "pageName": "出海笔记首页",
        "enabled": True,
    },
    {
        "id": "tab-1",
        "text": "内容",
        "icon": "/images/nav-icons/g-content.png",
        "pagePath": "/pages/custom/page-398724",
        "pageId": 12,
        "pageName": "跨境资讯",
        "enabled": True,
    },
    {
        "id": "tab-2",
        "text": "商品",
        "icon": "/images/nav-icons/g-bag.png",
        "pagePath": "/pages/custom/page-989072",
        "pageId": 13,
        "pageName": "知识商城",
        "enabled": False,
    },
    {
        "id": "tab-3",
        "text": "我的",
        "icon": "/images/nav-icons/g-user.png",
        "pagePath": "/pages/mine/mine",
        "pageId": "__mine__",
        "pageName": "我的",
        "enabled": True,
    },
]

MINE_CONFIG = {
    "loginTitle": "登录后同步收藏与阅读记录",
    "loginSubtitle": "查看收藏内容与客服消息",
    "loginButtonText": "登录",
    "showMemberCard": False,
    "showMenuIcons": True,
    "showDecorBackground": True,
    "orderQuickAccess": {
        "showOrderTabs": False,
        "showAllOrdersBtn": False,
        "tabLabels": {
            "pending": "待付款",
            "paid": "待发货",
            "shipped": "待收货",
            "completed": "已完成",
        },
    },
    "menuItems": [
        {
            "id": "favorites",
            "icon": "line:star",
            "title": "我的收藏",
            "url": "/pkg-user/favorites/favorites",
            "enabled": True,
            "group": "",
        },
        {
            "id": "contact",
            "icon": "line:chat",
            "title": "在线客服",
            "url": "/pkg-user/service-chat/service-chat",
            "enabled": True,
            "group": "",
        },
        {
            "id": "feedback",
            "icon": "line:edit",
            "title": "意见反馈",
            "url": "/pkg-user/feedback/feedback",
            "enabled": True,
            "group": "",
        },
        {
            "id": "settings",
            "icon": "line:setting",
            "title": "设置",
            "url": "/pkg-user/settings/settings",
            "enabled": True,
            "group": "",
        },
    ],
}


def main():
    v1 = publish_page(1, HOME_DSL)
    v12 = publish_page(12, CONTENT_DSL)
    v14 = publish_page(14, TOOLS_DSL)

    mysql(
        f"UPDATE mp_system_config SET config_value='{esc_json(TABBAR)}' WHERE config_key='tabbarItems';"
    )
    mysql(
        f"UPDATE mp_system_config SET config_value='{esc_json(MINE_CONFIG)}' WHERE config_key='minePageConfig';"
    )
    mysql(
        "UPDATE mp_system_config SET config_value='1.13.14' WHERE config_key='wx_version';"
    )
    mysql(
        "UPDATE mp_system_config SET config_value='内容演示版：首页+资讯+我的，无商城' "
        "WHERE config_key='wx_version_desc';"
    )

    print("published home v", v1)
    print("published content v", v12)
    print("published tools v", v14)
    print("tabbar + mine updated, wx_version=1.13.14")


if __name__ == "__main__":
    main()
