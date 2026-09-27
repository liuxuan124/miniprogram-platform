#!/usr/bin/env python3
"""跨境墨太白：新建「墨太白-*」装修页 + 站点草稿 Tab（不触发小程序发布）。"""

from __future__ import annotations

import json
import os
import sys
import urllib.error
import urllib.parse
import urllib.request
from copy import deepcopy
from typing import Any

BASE = os.environ.get("API_BASE", "https://api.zfculture.site").rstrip("/")
USER = os.environ.get("ADMIN_USER", "admin")
PASS = os.environ.get("ADMIN_PASS", "")
OUT = os.path.join(
    os.path.dirname(__file__),
    "../evidence/motai-build-20260924/seed-result.json",
)


def req(method: str, path: str, body: Any | None = None, token: str | None = None):
    url = BASE + path
    data = json.dumps(body).encode() if body is not None else None
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    request = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(request, timeout=120) as resp:
            return resp.status, json.loads(resp.read().decode())
    except urllib.error.HTTPError as e:
        raw = e.read().decode()
        try:
            payload = json.loads(raw)
        except json.JSONDecodeError:
            payload = {"raw": raw[:800]}
        return e.code, payload


def login() -> str:
    code, body = req("POST", "/api/v1/admin/auth/login", {"username": USER, "password": PASS})
    if code != 200 or body.get("code") != 200:
        raise SystemExit(f"login failed: {code} {body}")
    return body["data"]["accessToken"]


def dsl(page_id: int, name: str, path: str, components: list[dict]) -> str:
    norm_path = path if path.startswith("pages/") else f"pages/{path}"
    payload = {
        "schema_version": "1.0",
        "page": {
            "id": f"page_{page_id}",
            "name": name,
            "type": "custom",
            "path": norm_path,
        },
        "components": components,
    }
    return json.dumps(payload, ensure_ascii=False)


def rich_page(title: str, html: str) -> list[dict]:
    return [
        {
            "id": "notice-1",
            "type": "notice_bar",
            "props": {
                "text": f"本页为装修器说明 · 真机请走原生页",
                "mode": "warning",
                "scrollable": False,
            },
        },
        {
            "id": "rt-1",
            "type": "rich_text",
            "props": {
                "content": f"<h3>{title}</h3>{html}",
                "text_color": "#333333",
                "background_color": "#ffffff",
            },
        },
    ]


PAGE_SPECS: list[tuple[str, str, list[dict]]] = [
    (
        "墨太白-首页",
        "pages/custom/motai-home",
        [
            {
                "id": "warm_home-1",
                "type": "warm_home",
                "props": {
                    "planet_title": "我的星球",
                    "authors_title": "墨太白出品",
                    "columns_title": "精品专栏",
                    "greet_template": "你好",
                    "search_placeholder": "搜索文章、笔记、专栏……",
                },
            }
        ],
    ),
    (
        "墨太白-内容",
        "pages/custom/motai-content",
        [{"id": "warm_discover-1", "type": "warm_discover", "props": {"title": "内容"}}],
    ),
    (
        "墨太白-资料库",
        "pages/custom/motai-library",
        [
            {
                "id": "rt-banner",
                "type": "rich_text",
                "props": {
                    "content": (
                        "<p><strong>【示例】312 份跨境实操资料</strong></p>"
                        "<p>报告 · SOP · 表格模板 · 课件 · 每周更新</p>"
                    ),
                    "background_color": "#f5f0e8",
                },
            },
            {
                "id": "ml-1",
                "type": "material_list",
                "props": {
                    "layout": "list",
                    "limit": 10,
                    "sort": "newest",
                    "source_mode": "all",
                    "show_filter_bar": True,
                    "show_meta": True,
                    "show_downloads": True,
                    "show_access": True,
                    "show_more": True,
                    "more_text": "查看更多资料 ›",
                    "more_link": "/pkg-content/resources/resources",
                    "data_source": {"type": "file", "params": {"status": "published"}},
                },
            },
        ],
    ),
    (
        "墨太白-问答",
        "pages/custom/motai-qa",
        [
            {
                "id": "rt-qa",
                "type": "rich_text",
                "props": {
                    "content": "<p><strong>付费提问 · 围观</strong>（价格待确认）</p>",
                    "background_color": "#f5f0e8",
                },
            },
            {
                "id": "qa-1",
                "type": "qa_list",
                "props": {
                    "limit": 8,
                    "source_mode": "public",
                    "show_more": True,
                    "more_text": "查看更多问答 ›",
                    "more_link": "/pages/qa-list/qa-list",
                    "show_ask_entry": True,
                    "ask_link": "/pages/ask/ask",
                    "filter_private": True,
                    "data_source": {"type": "paid_qa", "params": {}},
                },
            },
        ],
    ),
    (
        "墨太白-星球",
        "pages/custom/motai-planet",
        [{"id": "warm_planet-1", "type": "warm_planet", "props": {"title": "墨太白星球"}}],
    ),
    (
        "墨太白-商城",
        "pages/custom/motai-shop",
        [{"id": "warm_shop-1", "type": "warm_shop", "props": {"title": "墨太白商城"}}],
    ),
    (
        "墨太白-我的",
        "pages/custom/motai-mine",
        [{"id": "warm_mine-1", "type": "warm_mine", "props": {"title": "我的"}}],
    ),
    (
        "墨太白-会员方案",
        "pages/custom/motai-member",
        [
            {
                "id": "mp-1",
                "type": "member_plan",
                "props": {
                    "scope": "platform",
                    "show_banner": True,
                    "banner_title": "选择适合你的会员方案（价格待确认）",
                    "banner_subtitle": "¥29 / ¥199 / ¥465 · 未启用前不可购买",
                    "show_agreement": True,
                    "data_source": {"type": "membership_plan", "params": {"scope": "platform", "status": 1}},
                },
            }
        ],
    ),
    (
        "墨太白-说明-文章详情",
        "pages/custom/motai-note-p3",
        rich_page(
            "P3 文章详情（原生）",
            "<p>真机路径：<code>/pkg-content/content-detail/content-detail?id=…</code></p>"
            "<p>付费墙文案已在后台 <strong>content_member_wall</strong> 配置；"
            "单篇解锁 / 邀请解锁 / 文末资料区需原生能力或后续迭代。</p>",
        ),
    ),
    (
        "墨太白-说明-资料详情",
        "pages/custom/motai-note-p5",
        rich_page(
            "P5 资料详情（原生）",
            "<p>真机路径：<code>/pkg-content/file-preview/file-preview</code></p>"
            "<p>列表页用「资料列表」组件；详情以原生预览/下载为准。</p>",
        ),
    ),
    (
        "墨太白-说明-商品详情",
        "pages/custom/motai-note-p11",
        rich_page(
            "P11 商品详情（原生）",
            "<p>真机路径：<code>/pkg-content/product-detail/product-detail?id=…</code></p>"
            "<p>虚拟退款展示文案见 <strong>commerce_virtual_refund_rules</strong>。</p>",
        ),
    ),
]


def find_page(records: list[dict], name: str, path: str) -> dict | None:
    norm = "/" + path.lstrip("/")
    for row in records:
        if row.get("name") == name:
            return row
        rp = row.get("path") or ""
        if rp == path or rp == norm or rp.lstrip("/") == path.lstrip("/"):
            return row
    return None


def ensure_page(token: str, records: list[dict], name: str, path: str, components: list[dict]) -> int:
    hit = find_page(records, name, path)
    if hit:
        page_id = int(hit["id"])
        print(f"  reuse {name} id={page_id}")
    else:
        code, body = req(
            "POST",
            "/api/v1/admin/pages",
            {"name": name, "type": 3, "path": path, "description": "跨境墨太白草稿"},
            token,
        )
        if code != 200 or body.get("code") != 200:
            if body.get("code") == 300203:
                kw = urllib.parse.quote("墨太白")
                code2, body2 = req(
                    "GET",
                    f"/api/v1/admin/pages?current=1&size=50&keyword={kw}",
                    token=token,
                )
                recs = (body2.get("data") or {}).get("records") or []
                hit = find_page(recs, name, path)
                if hit:
                    page_id = int(hit["id"])
                    records.append(hit)
                    print(f"  resolved existing {name} id={page_id}")
                else:
                    raise SystemExit(f"create {name} path clash, not in list: {body}")
            else:
                raise SystemExit(f"create {name} failed: {code} {body}")
        else:
            page_id = int(body["data"]["id"])
            print(f"  created {name} id={page_id} path={path}")

    draft_body = {"dslContent": dsl(page_id, name, path, components)}
    code, body = req("POST", f"/api/v1/admin/pages/{page_id}/draft", draft_body, token)
    if code != 200 or body.get("code") != 200:
        raise SystemExit(f"draft {name} failed: {code} {body}")

    code, body = req("POST", f"/api/v1/admin/pages/{page_id}/publish", {}, token)
    if code != 200 or body.get("code") != 200:
        raise SystemExit(f"publish {name} failed: {code} {body}")
    return page_id


def load_live_tabbar(token: str) -> list[dict]:
    code, body = req("GET", "/api/v1/admin/mini/site?view=live", token=token)
    if code != 200:
        raise SystemExit(f"site live failed: {code} {body}")
    tabs = body.get("data", {}).get("tabBar") or []
    if tabs:
        return tabs
    backup = os.path.join(os.path.dirname(__file__), "../evidence/motai-backup-20260924/tabbarItems.json")
    with open(backup, encoding="utf-8") as f:
        return json.load(f)


def main() -> None:
    token = login()
    print("logged in")

    code, pages_body = req("GET", "/api/v1/admin/pages?current=1&size=50", token=token)
    records = (pages_body.get("data") or {}).get("records") or []
    kw = urllib.parse.quote("墨太白")
    code2, body2 = req("GET", f"/api/v1/admin/pages?current=1&size=50&keyword={kw}", token=token)
    for row in (body2.get("data") or {}).get("records") or []:
        if not any(int(r.get("id", 0)) == int(row.get("id", 0)) for r in records):
            records.append(row)

    ids: dict[str, int] = {}
    for name, path, components in PAGE_SPECS:
        ids[name] = ensure_page(token, records, name, path, components)
        # refresh records for reuse detection in same run
        hit = find_page(records, name, path)
        if not hit:
            records.append({"id": ids[name], "name": name, "path": path})

    tabs = deepcopy(load_live_tabbar(token))
    content_id = ids["墨太白-内容"]
    for tab in tabs:
        if tab.get("id") == "tab-1" or tab.get("text") == "发现":
            tab["text"] = "内容"
            tab["pageName"] = "墨太白-内容"
            tab["pageId"] = content_id
            tab["path"] = "/pages/custom/motai-content"
            tab["pagePath"] = "/pages/custom/motai-content"
            break

    code, body = req("PUT", "/api/v1/admin/mini/site", {"tabBar": tabs}, token=token)
    if code != 200 or body.get("code") != 200:
        raise SystemExit(f"site draft failed: {code} {body}")
    print("site draft tabBar updated (发现→内容 → 墨太白-内容)")

    result = {"pageIds": ids, "tabDraftContentTab": content_id}
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, "w", encoding="utf-8") as f:
        json.dump(result, f, ensure_ascii=False, indent=2)
    print("wrote", OUT)


if __name__ == "__main__":
    main()
