#!/usr/bin/env python3
"""墨太白：会员/商品/标签/券/站点草稿（不小程序发布）。"""

from __future__ import annotations

import json
import os
import sys
import urllib.error
import urllib.parse
import urllib.request
from copy import deepcopy
from decimal import Decimal
from typing import Any

BASE = os.environ.get("API_BASE", "https://api.zfculture.site").rstrip("/")
USER = os.environ.get("ADMIN_USER", "admin")
PASS = os.environ.get("ADMIN_PASS", "")
OUT = os.path.join(
    os.path.dirname(__file__),
    "../evidence/motai-build-20260924/commerce-seed-result.json",
)
SEED_PAGES = os.path.join(
    os.path.dirname(__file__),
    "../evidence/motai-build-20260924/seed-result.json",
)

PLANET_ID = "warm-main"
CAT_MEMBER = 2
CAT_EBOOK = 3
CAT_SHOP = 5

IMG_LOGO = "https://placehold.co/512x512/e8e0d4/5c534a/png?text=Logo%E5%BE%85%E4%B8%8A%E4%BC%A0"
IMG_COVER = "https://placehold.co/750x750/e8e0d4/5c534a/png?text=%E5%B0%81%E9%9D%A2%E5%BE%85%E4%B8%8A%E4%BC%A0"
IMG_PLANET = "https://placehold.co/750x420/e8e0d4/5c534a/png?text=%E6%98%9F%E7%90%83%E5%B0%81%E9%9D%A2"


def req(method: str, path: str, body: Any | None = None, token: str | None = None):
    url = BASE + path
    data = json.dumps(body, default=str).encode() if body is not None else None
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
    if not PASS:
        raise SystemExit("请设置环境变量 ADMIN_PASS")
    code, body = req("POST", "/api/v1/admin/auth/login", {"username": USER, "password": PASS})
    if code != 200 or body.get("code") != 200:
        raise SystemExit(f"login failed: {code} {body}")
    return body["data"]["accessToken"]


def ok(body: dict) -> bool:
    return body.get("code") in (0, 200)


def find_product(token: str, keyword: str, exact_name: str | None = None) -> dict | None:
    kw = urllib.parse.quote(keyword)
    _, body = req("GET", f"/api/v1/admin/products?current=1&size=50&keyword={kw}", token=token)
    rows = (body.get("data") or {}).get("records") or []
    for row in rows:
        if exact_name and row.get("name") == exact_name:
            return row
        if exact_name is None and keyword in (row.get("name") or ""):
            return row
    return None


def ensure_product(token: str, name: str, payload: dict) -> int:
    hit = find_product(token, "【示例】", exact_name=name)
    if hit:
        pid = int(hit["id"])
        print(f"  product reuse {name} id={pid} status={hit.get('status')}")
        return pid
    code, body = req("POST", "/api/v1/admin/products", payload, token)
    if not ok(body):
        raise SystemExit(f"product create {name}: {code} {body}")
    pid = int(body["data"]["id"])
    print(f"  product created {name} id={pid} (draft)")
    return pid


def ensure_plan(token: str, name: str, payload: dict) -> int:
    _, body = req("GET", "/api/v1/admin/membership-plans?scope=platform", token=token)
    rows = body.get("data") or []
    for row in rows:
        if row.get("name") == name:
            return int(row["id"])
    code, body = req("POST", "/api/v1/admin/membership-plans", payload, token)
    if not ok(body):
        raise SystemExit(f"plan create {name}: {code} {body}")
    pid = int(body["data"]["id"])
    print(f"  plan created {name} id={pid}")
    return pid


def disable_plan(token: str, plan_id: int) -> None:
    _, detail = req("GET", "/api/v1/admin/membership-plans?scope=platform", token=token)
    row = next((r for r in (detail.get("data") or []) if int(r["id"]) == plan_id), None)
    if not row:
        return
    payload = {
        "scope": row["scope"],
        "name": row["name"],
        "description": row.get("description"),
        "rights": row.get("rights") or [],
        "sortOrder": row.get("sortOrder") or 0,
        "status": 0,
    }
    code, body = req("PUT", f"/api/v1/admin/membership-plans/{plan_id}", payload, token)
    if ok(body):
        print(f"  plan disabled id={plan_id}")


def ensure_tag(token: str, name: str, kind: str, platform_code: str | None = None) -> None:
    _, body = req("GET", "/api/v1/admin/content-tags", token=token)
    for row in body.get("data") or []:
        if row.get("name") == name and (row.get("tag_kind") or row.get("tagKind")) == kind:
            return
    payload = {"name": name, "color": "#8a7f70", "tagKind": kind}
    if platform_code:
        payload["platformCode"] = platform_code
    code, body = req("POST", "/api/v1/admin/content-tags", payload, token)
    if ok(body):
        print(f"  tag {kind}:{name}")


def patch_category_types(token: str, cat_id: int, extra_types: list[str]) -> None:
    _, body = req("GET", "/api/v1/admin/product-categories", token=token)
    tree = body.get("data") or []
    cat = next((c for c in tree if int(c.get("id", 0)) == cat_id), None)
    if not cat:
        return
    allowed = list(cat.get("allowedProductTypes") or [])
    for t in extra_types:
        if t not in allowed:
            allowed.append(t)
    payload = {
        "name": cat.get("name") or "",
        "parentId": cat.get("parentId") or 0,
        "sortOrder": cat.get("sortOrder") or 0,
        "allowedProductTypes": allowed,
    }
    code, res = req("PUT", f"/api/v1/admin/product-categories/{cat_id}", payload, token)
    if ok(res):
        print(f"  category {cat_id} +types {extra_types}")


def ensure_member_category_allows_membership(token: str) -> None:
    patch_category_types(
        token,
        CAT_MEMBER,
        ["membership", "digital", "ebook", "column", "resource_pack"],
    )
    patch_category_types(token, CAT_EBOOK, ["ebook", "digital", "resource_pack", "column"])
    patch_category_types(token, 4, ["service", "digital"])


def disable_coupons(token: str) -> None:
    _, body = req("GET", "/api/v1/admin/coupons?current=1&size=50", token=token)
    for row in (body.get("data") or {}).get("records") or []:
        st = (row.get("status") or "").lower()
        if st in ("published", "enabled", "active", "1"):
            cid = row["id"]
            code, res = req("PUT", f"/api/v1/admin/coupons/{cid}/disable", {}, token)
            if ok(res):
                print(f"  coupon disabled id={cid} {row.get('name')}")


def update_site_draft(token: str, page_ids: dict[str, int]) -> None:
    _, live = req("GET", "/api/v1/admin/mini/site?view=live", token=token)
    tabs = deepcopy(live.get("data", {}).get("tabBar") or [])
    mapping = {
        "tab-0": ("首页", page_ids["墨太白-首页"], "/pages/custom/motai-home", "墨太白-首页"),
        "tab-1": ("内容", page_ids["墨太白-内容"], "/pages/custom/motai-content", "墨太白-内容"),
        "tab-2": ("星球", page_ids["墨太白-星球"], "/pages/custom/motai-planet", "墨太白-星球"),
        "tab-3": ("商城", page_ids["墨太白-商城"], "/pages/custom/motai-shop", "墨太白-商城"),
        "tab-4": ("我的", page_ids["墨太白-我的"], "/pages/custom/motai-mine", "墨太白-我的"),
    }
    for tab in tabs:
        spec = mapping.get(tab.get("id"))
        if not spec:
            continue
        text, pid, path, pname = spec
        tab["text"] = text
        tab["pageId"] = pid
        tab["pageName"] = pname
        tab["path"] = path
        tab["pagePath"] = path

    dto = {
        "tabBar": tabs,
        "homePageId": page_ids["墨太白-首页"],
        "minePageId": page_ids["墨太白-我的"],
        "name": "跨境墨太白",
        "slogan": "登录后继续 · 收藏 / 星球 / 已购",
        "brandConfig": {
            "appName": "跨境墨太白",
            "logoUrl": IMG_LOGO,
            "logoMark": "墨",
            "loginTagline": "登录后继续 · 收藏 / 星球 / 已购",
            "brandEyebrow": "CROSS-BORDER INK",
            "loginStyleKey": "warm",
        },
        "minePageConfig": {
            "loginTitle": "登录跨境墨太白",
            "loginSubtitle": "查看订单、已购资料与会员权益",
            "loginButtonText": "手机号快捷登录",
            "memberCardTitle": "墨太白会员",
            "memberCardDesc": "全站畅读 + 资料库（价格待确认，未开放购买）",
        },
        "shareTitle": "跨境墨太白",
        "shareImage": IMG_COVER,
    }
    code, body = req("PUT", "/api/v1/admin/mini/site", dto, token)
    if not ok(body):
        raise SystemExit(f"site draft: {code} {body}")
    print("  site draft: 5 Tab + 品牌/我的 → 墨太白（仅草稿）")


def save_planet_commerce(token: str, join_product_id: int) -> None:
    payload = {
        "planetId": PLANET_ID,
        "joinProductId": join_product_id,
        "validityDays": 365,
        "previewPostCount": 3,
        "refundWindowDays": 7,
        "memberDeductAmount": Decimal("0"),
    }
    code, body = req("PUT", f"/api/v1/admin/planet-commerce/{PLANET_ID}", payload, token)
    if ok(body):
        print(f"  planet commerce join_product_id={join_product_id} (商品仍为 draft)")


def main() -> None:
    token = login()
    with open(SEED_PAGES, encoding="utf-8") as f:
        page_ids = json.load(f)["pageIds"]

    result: dict[str, Any] = {"tags": [], "plans": {}, "products": {}, "notes": []}

    print("== tags ==")
    platforms = [
        ("公众号", "wechat"),
        ("小红书", "xiaohongshu"),
        ("抖音", "douyin"),
    ]
    topics = ["平台政策", "选品报告", "运营 SOP", "表格模板", "课件", "深度解读", "出海笔记"]
    for name, code in platforms:
        ensure_tag(token, name, "platform", code)
    for name in topics:
        ensure_tag(token, name, "topic")

    print("== category ==")
    ensure_member_category_allows_membership(token)

    print("== membership (plan 先启用建商品，再禁用档) ==")
    plan_specs = [
        ("【示例】墨太白会员·月卡（待确认）", 29, 30, 1),
        ("【示例】墨太白会员·年卡（待确认）", 199, 365, 2),
        ("【示例】墨太白会员·终身（待确认）", 465, 0, 3),
    ]
    plan_ids = []
    for name, price, days, sort in plan_specs:
        plan_id = ensure_plan(
            token,
            name,
            {
                "scope": "platform",
                "name": name,
                "description": "价格待确认 · 当前不可购买",
                "rights": ["read", "download", "planet_preview"],
                "sortOrder": sort,
                "status": 1,
                "showBadge": 1,
            },
        )
        plan_ids.append(plan_id)
        result["plans"][name] = plan_id
        prod_name = name.replace("会员·", "会员商品·")
        pid = ensure_product(
            token,
            prod_name,
            {
                "name": prod_name,
                "categoryId": CAT_MEMBER,
                "productType": "membership",
                "productTypes": ["membership"],
                "mainImage": IMG_COVER,
                "images": [IMG_COVER],
                "description": "虚拟会员 · 价格待确认 · 草稿未上架",
                "detail": "<p>开通后解锁会员权益。当前为搭建草稿，请勿对真实用户上架。</p>",
                "price": price,
                "membershipDays": days,
                "membershipPlanId": plan_id,
                "autoFulfill": 1,
                "deliveryMode": "auto",
                "refundPolicy": "none",
                "stock": 9999,
            },
        )
        result["products"][prod_name] = pid
        disable_plan(token, plan_id)

    print("== planet join product ==")
    join_name = "【示例】墨太白星球年费（待确认）"
    join_pid = ensure_product(
        token,
        join_name,
        {
            "name": join_name,
            "categoryId": CAT_MEMBER,
            "productType": "digital",
            "productTypes": ["digital"],
            "mainImage": IMG_PLANET,
            "images": [IMG_PLANET],
            "description": "星球入圈 ¥365/年（待确认）· 草稿",
            "detail": "<p>付费入圈、有效期 365 天。当前未上架。</p>",
            "price": 365,
            "autoFulfill": 1,
            "deliveryMode": "auto",
            "refundPolicy": "seven_days",
            "stock": 9999,
        },
    )
    result["products"][join_name] = join_pid
    save_planet_commerce(token, join_pid)

    print("== sample shop products ==")
    samples = [
        (
            "【示例】亚马逊运营 SOP 全集（待确认）",
            99,
            199,
            "ebook",
            "⚡ 付款后自动发货 · 价格待确认",
        ),
        (
            "【示例】TikTok 美区 21 天训练营（待确认）",
            1299,
            None,
            "ebook",
            "课程 · 待确认",
        ),
        (
            "【示例】60 分钟店铺诊断咨询（待确认）",
            999,
            None,
            "service",
            "预约服务 · 待确认",
        ),
    ]
    for name, price, orig, ptype, desc in samples:
        body = {
            "name": name,
            "categoryId": CAT_EBOOK if ptype == "ebook" else 4,
            "productType": ptype,
            "productTypes": [ptype],
            "mainImage": IMG_COVER,
            "images": [IMG_COVER],
            "description": desc,
            "detail": f"<p>{desc}</p><p>虚拟商品说明：售出后不支持无理由退款（待法务确认）。</p>",
            "price": price,
            "autoFulfill": 1 if ptype != "service" else 0,
            "deliveryMode": "auto" if ptype != "service" else "manual",
            "refundPolicy": "none",
            "stock": 999 if ptype == "service" else 9999,
        }
        if orig:
            body["originalPrice"] = orig
            body["memberPrice"] = 69 if price == 99 else None
        pid = ensure_product(token, name, body)
        result["products"][name] = pid

    print("== coupons ==")
    disable_coupons(token)

    print("== site draft ==")
    update_site_draft(token, page_ids)

    result["note"] = (
        "会员档 status=0；会员/星球/示例商品均为 draft；"
        "planet_commerce 已指向 draft 入圈商品；未做小程序发布。"
    )
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, "w", encoding="utf-8") as f:
        json.dump(result, f, ensure_ascii=False, indent=2)
    print("wrote", OUT)


if __name__ == "__main__":
    main()
