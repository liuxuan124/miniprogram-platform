#!/usr/bin/env python3
"""下架审核会扫到的测试/占位内容与商品，避免 3.3 demo 态拒审。"""
import json
import subprocess

DB = ["mysql", "-h127.0.0.1", "-uminiprogram", "-pzx123456", "miniprogram_prod", "-N"]


def mysql(q: str) -> str:
    r = subprocess.run(DB + ["-e", q], capture_output=True, text=True)
    if r.returncode:
        raise SystemExit(r.stderr or r.stdout)
    return r.stdout.strip()


def main():
    # 测试/占位文章（含 id=4「测试啊啊啊」与 111111 占位正文）
    mysql(
        """
        UPDATE mp_content SET status='draft', update_time=NOW()
        WHERE status='published' AND (
          id IN (3,4,5,6)
          OR title LIKE '%测试%'
          OR title REGEXP '^[0-9]+$'
          OR title LIKE '%在此输入%'
          OR title LIKE '%啊啊%'
          OR title LIKE '%士大夫%'
          OR content LIKE '%在此输入内容%'
          OR content LIKE '%111111111111111%'
        );
        """
    )

    # 测试商品下架
    mysql(
        """
        UPDATE mp_product SET status='off_sale', updated_at=NOW()
        WHERE status='on_sale' AND (
          name LIKE '%测试%' OR name LIKE '%沙雕%' OR name REGEXP '^[0-9]+$'
        );
        """
    )

    # 知识商城页再次下架（避免 tab/深链扫到）
    mysql("UPDATE mp_page SET status=2, update_time=NOW() WHERE id=13;")
    mysql("UPDATE mp_page_version SET status=2 WHERE page_id=13 AND status=1;")

    mysql(
        "UPDATE mp_system_config SET config_value='1.13.17' WHERE config_key='wx_version';"
    )
    mysql(
        "UPDATE mp_system_config SET config_value='审核版：已清理测试内容，纯资讯' "
        "WHERE config_key='wx_version_desc';"
    )

    left = mysql(
        "SELECT COUNT(*) FROM mp_content WHERE status='published' AND ("
        "title LIKE '%测试%' OR content LIKE '%在此输入内容%' OR content LIKE '%111111111111111%'"
        ");"
    )
    print("clean-audit-test-content done, remaining bad published:", left)


if __name__ == "__main__":
    main()
