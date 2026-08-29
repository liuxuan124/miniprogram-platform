#!/usr/bin/env python3
"""审核加固：下架商城页、关闭订单模块、净化配置"""
import json
import subprocess

DB = ["mysql", "-h127.0.0.1", "-uminiprogram", "-pzx123456", "miniprogram_prod", "-N"]


def mysql(q: str) -> str:
    r = subprocess.run(DB + ["-e", q], capture_output=True, text=True)
    if r.returncode:
        raise SystemExit(r.stderr or r.stdout)
    return r.stdout.strip()


def esc_json(obj) -> str:
    return json.dumps(obj, ensure_ascii=False).replace("\\", "\\\\").replace("'", "''")


def main():
    # 下架知识商城装修页（仍发布会被审核扫到 product_list）
    mysql("UPDATE mp_page SET status=2, update_time=NOW() WHERE id=13;")
    mysql(
        "UPDATE mp_page_version SET status=2 WHERE page_id=13 AND status=1;"
    )

    raw = mysql("SELECT config_value FROM mp_system_config WHERE config_key='plugins' LIMIT 1;")
    plugins = json.loads(raw)
    for p in plugins:
        if p.get("key") in ("product", "member", "order"):
            p["enabled"] = False
    mysql(
        f"UPDATE mp_system_config SET config_value='{esc_json(plugins)}' WHERE config_key='plugins';"
    )

    mine = json.loads(
        mysql("SELECT config_value FROM mp_system_config WHERE config_key='minePageConfig' LIMIT 1;")
    )
    mine["loginTitle"] = "登录后同步收藏与阅读记录"
    mine["loginSubtitle"] = "查看收藏内容与消息通知"
    mine["showMemberCard"] = False
    mine["orderQuickAccess"] = {
        "showOrderTabs": False,
        "showAllOrdersBtn": False,
        "tabLabels": mine.get("orderQuickAccess", {}).get("tabLabels", {}),
    }
    for item in mine.get("menuItems") or []:
        url = str(item.get("url") or "")
        iid = str(item.get("id") or "")
        if iid in ("orders", "library", "coupons", "address", "member-center") or "order" in url or "coupon" in url:
            item["enabled"] = False
    mysql(
        f"UPDATE mp_system_config SET config_value='{esc_json(mine)}' WHERE config_key='minePageConfig';"
    )

    brand = json.loads(
        mysql("SELECT config_value FROM mp_system_config WHERE config_key='miniappBrandConfig' LIMIT 1;")
    )
    brand["loginTagline"] = "登录后畅享跨境资讯与干货"
    mysql(
        f"UPDATE mp_system_config SET config_value='{esc_json(brand)}' WHERE config_key='miniappBrandConfig';"
    )

    mysql("UPDATE mp_system_config SET config_value='1.13.15' WHERE config_key='wx_version';")
    mysql(
        "UPDATE mp_system_config SET config_value='审核版：纯内容资讯，无商城无订单' "
        "WHERE config_key='wx_version_desc';"
    )

    print("audit hardening done")
    print("page 13 unpublished, product/member/order disabled")


if __name__ == "__main__":
    main()
