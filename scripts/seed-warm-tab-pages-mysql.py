#!/usr/bin/env python3
"""Insert/publish 暖阁五槽装修页 and bind tabbar via MySQL. Does not touch /pages/index/index."""
import json
import os
import subprocess
import sys

DB_HOST = os.environ["DB_HOST"]
DB_PORT = os.environ.get("DB_PORT", "3306")
DB_USER = os.environ["DB_USERNAME"]
DB_NAME = os.environ.get("DB_NAME", "miniprogram_prod")
DB_PASSWORD = os.environ["DB_PASSWORD"]

PAGES = [
    ("暖阁首页", "/pages/custom/warm-home", None, None),
    ("暖阁发现", "/pages/custom/warm-discover", "warm_discover", {"title": "发现"}),
    ("暖阁星球", "/pages/custom/warm-planet", "warm_planet", {"title": "暖阁星球"}),
    ("暖阁商城", "/pages/custom/warm-shop", "warm_shop", {"title": "暖阁商城"}),
    ("暖阁我的", "/pages/custom/warm-mine", "warm_mine", {"title": "我的"}),
]

HOME_BLOCKS = [
    ("wh-greet", "warm_greet", {
        "greet_template": "你好", "show_notice": True, "show_search": True,
        "search_placeholder": "搜索文章、笔记、专栏……", "show_nav": True,
    }),
    ("wh-authors", "warm_authors", {
        "title": "暖阁出品", "more_text": "全部作者 ›",
        "more_url": "/pages/content-list/content-list", "more_tab": False,
    }),
    ("wh-feature", "warm_feature", {"empty_text": "暂无精选内容"}),
    ("wh-columns", "warm_columns", {
        "title": "精品专栏", "more_text": "全部 ›",
        "more_url": "/pages/shop/shop", "more_tab": True,
    }),
    ("wh-planet", "warm_planet_rec", {
        "title": "我的星球", "more_text": "进入 ›",
        "more_url": "/pages/planet/planet", "more_tab": True,
    }),
    ("wh-feed", "warm_feed", {"footer": "暖阁 · 慢一点，也很好"}),
]

TAB_BIND = [
    ("首页", "/pages/custom/warm-home", "/pages/index/index"),
    ("发现", "/pages/custom/warm-discover", "/pages/discover/discover"),
    ("星球", "/pages/custom/warm-planet", "/pages/planet/planet"),
    ("商城", "/pages/custom/warm-shop", "/pages/shop/shop"),
    ("我的", "/pages/custom/warm-mine", "/pages/mine/mine"),
]


def mysql(sql, extra=None):
    cmd = [
        "mysql", f"-h{DB_HOST}", f"-P{DB_PORT}", f"-u{DB_USER}", DB_NAME,
        "-N", "--batch", "--raw", "-e", sql,
    ]
    env = os.environ.copy()
    env["MYSQL_PWD"] = DB_PASSWORD
    proc = subprocess.run(cmd, env=env, capture_output=True, text=True)
    if proc.returncode != 0:
        raise SystemExit(proc.stderr or proc.stdout or f"mysql failed: {sql[:200]}")
    return proc.stdout


def mysql_file(sql):
    env = os.environ.copy()
    env["MYSQL_PWD"] = DB_PASSWORD
    proc = subprocess.run(
        ["mysql", f"-h{DB_HOST}", f"-P{DB_PORT}", f"-u{DB_USER}", DB_NAME],
        env=env, input=sql, capture_output=True, text=True,
    )
    if proc.returncode != 0:
        raise SystemExit(proc.stderr or proc.stdout or "mysql_file failed")
    return proc.stdout


def sql_str(value):
    return "'" + str(value).replace("\\", "\\\\").replace("'", "\\'") + "'"


def dsl_for(name, path, ctype, props):
    if ctype is None:
        components = [{"id": bid, "type": btype, "props": bprops} for bid, btype, bprops in HOME_BLOCKS]
        page_id = "warm-home"
    else:
        components = [{"id": f"{ctype}-1", "type": ctype, "props": props}]
        page_id = f"warm-{ctype}"
    return {
        "schema_version": "1.0",
        "page": {
            "id": page_id,
            "name": name,
            "type": "custom",
            "path": path,
            "background_color": "#FDF6EC",
            "share_title": "暖阁 · 慢一点，也很好",
        },
        "components": components,
        "global_config": {"pull_refresh": True, "reach_bottom_load": True},
    }


def main():
    created = {}
    for name, path, ctype, props in PAGES:
        row = mysql(f"SELECT id, current_version FROM mp_page WHERE path={sql_str(path)} AND deleted=0 LIMIT 1").strip()
        dsl = json.dumps(dsl_for(name, path, ctype, props), ensure_ascii=False)
        if not row:
            mysql_file(
                "INSERT INTO mp_page (tenant_id, name, type, path, share_title, status, current_version, description, deleted) "
                f"VALUES (1, {sql_str(name)}, 3, {sql_str(path)}, {sql_str('暖阁 · 慢一点，也很好')}, 1, 1, "
                f"{sql_str('承接本地暖阁原生页，底栏绑定后走系统暖阁版式')}, 0);"
            )
            pid = mysql(f"SELECT id FROM mp_page WHERE path={sql_str(path)} AND deleted=0 LIMIT 1").strip()
            ver = 1
        else:
            pid, ver_s = row.split("\t")
            ver = int(ver_s or 0) + 1
            mysql_file(
                f"UPDATE mp_page SET name={sql_str(name)}, status=1, current_version={ver}, "
                f"share_title={sql_str('暖阁 · 慢一点，也很好')}, update_time=NOW() WHERE id={int(pid)} AND path<>'/pages/index/index';"
            )
        mysql_file(
            f"UPDATE mp_page_version SET status=2 WHERE page_id={int(pid)} AND status=1 AND deleted=0;"
        )
        mysql_file(
            "INSERT INTO mp_page_version (tenant_id, page_id, version, dsl_content, status, published_at, deleted) "
            f"VALUES (1, {int(pid)}, {ver}, CAST({sql_str(dsl)} AS JSON), 1, NOW(), 0);"
        )
        created[path] = int(pid)
        print("published", pid, name, path, "v"+str(ver))

    raw = mysql("SELECT config_value FROM mp_system_config WHERE config_key='tabbarItems' LIMIT 1").rstrip("\n")
    if not raw:
        raise SystemExit("tabbarItems missing")
    tabbar = json.loads(raw)
    path_to_id = created
    for tab in tabbar:
        text = str(tab.get("text") or "")
        for label, path, shell in TAB_BIND:
            if text == label or str(tab.get("tabRoute") or "") == shell:
                tab["pagePath"] = path
                tab["path"] = path
                tab["pageId"] = path_to_id[path]
                tab["tabRoute"] = shell
                break
    mysql_file(
        "UPDATE mp_system_config SET config_value=" + sql_str(json.dumps(tabbar, ensure_ascii=False))
        + " WHERE config_key='tabbarItems';"
    )
    print("tabbar bound")
    print(json.dumps({"ok": True, "pages": created, "index_untouched": True}, ensure_ascii=False))


if __name__ == "__main__":
    try:
        main()
    except KeyError as e:
        print("missing env", e, file=sys.stderr)
        sys.exit(1)
