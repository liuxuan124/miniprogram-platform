#!/usr/bin/env python3
"""Create/publish 暖阁五槽装修页 and bind tabbar. Does not touch pages/index/index."""
import json
import os
import urllib.error
import urllib.request

BASE = os.environ.get("API_BASE", "http://127.0.0.1:8080").rstrip("/")
USER = os.environ.get("ADMIN_USER", "admin")
PASSWORD = os.environ.get("ADMIN_PASS", "admin123")

PAGES = [
    ("暖阁首页", "pages/custom/warm-home", None, None),
    ("暖阁发现", "pages/custom/warm-discover", "warm_discover", {"title": "发现"}),
    ("暖阁星球", "pages/custom/warm-planet", "warm_planet", {"title": "暖阁星球"}),
    ("暖阁商城", "pages/custom/warm-shop", "warm_shop", {"title": "暖阁商城"}),
    ("暖阁我的", "pages/custom/warm-mine", "warm_mine", {"title": "我的"}),
]

HOME_BLOCKS = [
    ("wh-greet", "warm_greet", {
        "greet_template": "你好",
        "show_notice": True,
        "show_search": True,
        "search_placeholder": "搜索文章、笔记、专栏……",
        "show_nav": True,
    }),
    ("wh-authors", "warm_authors", {
        "title": "暖阁出品",
        "more_text": "全部作者 ›",
        "more_url": "/pages/content-list/content-list",
        "more_tab": False,
    }),
    ("wh-feature", "warm_feature", {"empty_text": "暂无精选内容"}),
    ("wh-columns", "warm_columns", {
        "title": "精品专栏",
        "more_text": "全部 ›",
        "more_url": "/pages/shop/shop",
        "more_tab": True,
    }),
    ("wh-planet", "warm_planet_rec", {
        "title": "我的星球",
        "more_text": "进入 ›",
        "more_url": "/pages/planet/planet",
        "more_tab": True,
    }),
    ("wh-feed", "warm_feed", {"footer": "暖阁 · 慢一点，也很好"}),
]

TAB_BIND = [
    ("首页", "pages/custom/warm-home", "/pages/index/index"),
    ("发现", "pages/custom/warm-discover", "/pages/discover/discover"),
    ("星球", "pages/custom/warm-planet", "/pages/planet/planet"),
    ("商城", "pages/custom/warm-shop", "/pages/shop/shop"),
    ("我的", "pages/custom/warm-mine", "/pages/mine/mine"),
]


def req(method, url, body=None, token=None):
    data = None if body is None else json.dumps(body).encode()
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    r = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(r, timeout=30) as resp:
            return json.loads(resp.read().decode())
    except urllib.error.HTTPError as e:
        detail = e.read().decode("utf-8", "ignore")
        raise SystemExit(f"{method} {url} -> {e.code}: {detail[:800]}") from e


def unwrap(payload):
    if isinstance(payload, dict) and "data" in payload:
        return payload["data"]
    return payload


def main():
    login = unwrap(req("POST", f"{BASE}/api/v1/admin/auth/login", {
        "username": USER, "password": PASSWORD,
    }))
    token = login.get("accessToken") or login.get("token")
    if not token:
        raise SystemExit(f"login failed: {login}")

    listed = unwrap(req("GET", f"{BASE}/api/v1/admin/pages?current=1&size=100", token=token))
    records = listed.get("records") if isinstance(listed, dict) else listed
    by_path = {}
    for row in records or []:
        path = str(row.get("path") or "").lstrip("/")
        by_path[path] = row

    created = {}
    for name, path, ctype, props in PAGES:
        key = path.lstrip("/")
        row = by_path.get(key)
        if not row:
            row = unwrap(req("POST", f"{BASE}/api/v1/admin/pages", {
                "name": name,
                "type": 3,
                "path": "/" + key if not path.startswith("/") else path,
                "shareTitle": "暖阁 · 慢一点，也很好",
                "description": "暖阁固定模板；首页为可组合区块，其余为系统业务页入口",
            }, token=token))
        pid = int(row["id"])
        if ctype is None:
            components = [{"id": bid, "type": btype, "props": bprops} for bid, btype, bprops in HOME_BLOCKS]
        else:
            components = [{"id": f"{ctype}-1", "type": ctype, "props": props}]
        dsl = {
            "schema_version": "1.0",
            "page": {
                "id": f"warm-{key.split('/')[-1]}",
                "name": name,
                "type": "custom",
                "path": key,
                "background_color": "#FDF6EC",
                "share_title": "暖阁 · 慢一点，也很好",
            },
            "components": components,
            "global_config": {"pull_refresh": True, "reach_bottom_load": True},
        }
        req("POST", f"{BASE}/api/v1/admin/pages/{pid}/draft", {
            "dslContent": json.dumps(dsl, ensure_ascii=False),
        }, token=token)
        req("POST", f"{BASE}/api/v1/admin/pages/{pid}/publish", {}, token=token)
        created[key] = {"id": pid, "name": name, "path": path, "type": ctype}
        print("published", pid, name, path)

    configs = unwrap(req("GET", f"{BASE}/api/v1/admin/system/configs", token=token))
    items = configs if isinstance(configs, list) else []
    tabbar = None
    group = "basic"
    for item in items:
        if item.get("configKey") == "tabbarItems":
            raw = item.get("configValue") or "[]"
            tabbar = json.loads(raw) if isinstance(raw, str) else raw
            group = item.get("configGroup") or "basic"
            break
        groups = item.get("items") or item.get("configs") or []
        if isinstance(item.get("configGroup") or item.get("group"), str) and groups:
            for sub in groups:
                if sub.get("configKey") == "tabbarItems":
                    raw = sub.get("configValue") or "[]"
                    tabbar = json.loads(raw) if isinstance(raw, str) else raw
                    group = item.get("configGroup") or sub.get("configGroup") or "basic"
        if isinstance(item, dict) and item.get("group") and isinstance(item.get("data"), dict):
            if "tabbarItems" in item["data"]:
                tabbar = item["data"]["tabbarItems"]
                group = item.get("group") or "basic"
    if tabbar is None:
        # grouped shape
        for item in items:
            data = item.get("data") if isinstance(item, dict) else None
            if isinstance(data, list):
                for sub in data:
                    if sub.get("configKey") == "tabbarItems":
                        raw = sub.get("configValue") or "[]"
                        tabbar = json.loads(raw) if isinstance(raw, str) else raw
                        group = item.get("group") or "basic"
    if not isinstance(tabbar, list) or not tabbar:
        raise SystemExit(f"tabbarItems missing: {json.dumps(items)[:500]}")

    path_to_id = {k: v["id"] for k, v in created.items()}
    for tab in tabbar:
        text = str(tab.get("text") or "")
        for label, path, shell in TAB_BIND:
            if text == label or str(tab.get("tabRoute") or "") == shell:
                key = path.lstrip("/")
                tab["pagePath"] = "/" + key
                tab["path"] = "/" + key
                tab["pageId"] = path_to_id[key]
                tab["tabRoute"] = shell
                break
    req("PUT", f"{BASE}/api/v1/admin/system/configs", {
        "configs": [{
            "configKey": "tabbarItems",
            "configValue": json.dumps(tabbar, ensure_ascii=False),
            "configGroup": group,
            "description": "底部导航",
        }],
    }, token=token)
    print("tabbar bound", json.dumps(tabbar, ensure_ascii=False)[:800])
    print(json.dumps({"ok": True, "pages": created}, ensure_ascii=False))


if __name__ == "__main__":
    main()
