#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""探测 34 个重复账号在各关联表里的真实数据量（只读，不改数据）。
输出用于决定合并脚本需要迁移哪些表 —— 避免无差别全表 UPDATE。"""
import subprocess, sys

PHONES = ["18924071446", "19927404435", "15360475622"]
ph = ",".join("'%s'" % p for p in PHONES)

def q(sql):
    r = subprocess.run(
        ["ssh", "zfculture",
         'sudo mysql -N -B -e "%s"' % sql],
        capture_output=True, text=True, timeout=180)
    if r.returncode != 0:
        return None, r.stderr.strip()
    return r.stdout.strip(), None

# 子账号 id（排除每组主账号：按 create_time 最早）
sql_ids = (
    "SELECT GROUP_CONCAT(id) FROM ("
    " SELECT id, phone, ROW_NUMBER() OVER (PARTITION BY phone ORDER BY create_time ASC, id ASC) rn"
    " FROM miniprogram_prod.mp_user"
    " WHERE deleted=0 AND phone IN (%s)"
    ") t WHERE rn>1" % ph
)
out, err = q(sql_ids)
if err:
    print("取子账号ID失败:", err); sys.exit(1)
slave_ids = out
n = len(slave_ids.split(",")) if slave_ids else 0
print("子账号（待合并）数量 =", n)
print(slave_ids)
print()

TABLES = [
    ("mp_order", "user_id"), ("mp_member_points_log", "user_id"),
    ("mp_user_coupon", "user_id"), ("mp_cart", "user_id"),
    ("mp_content", "author_id"), ("mp_product", "author_id"),
    ("mp_author", "user_id"), ("mp_user_address", "user_id"),
    ("mp_activity_signup", "user_id"), ("mp_activity_check_in", "user_id"),
    ("mp_member_checkin", "user_id"), ("mp_analytics_event", "user_id"),
    ("mp_page_access_log", "user_id"), ("mp_search_log", "user_id"),
    ("mp_file_download_log", "user_id"), ("mp_download_grant", "user_id"),
    ("mp_content_like", "user_id"), ("mp_content_favorite", "user_id"),
    ("mp_content_comment", "user_id"), ("mp_community_post", "user_id"),
    ("mp_subscribe_log", "user_id"), ("mp_entitlement_quota", "user_id"),
    ("mp_purchase_entitlement", "user_id"), ("mp_coupon_effect", "user_id"),
    ("mp_ai_conversation", "user_id"), ("mp_feedback", "user_id"),
    ("mp_user_consent_record", "user_id"), ("mp_invite_content_unlock", "inviter_user_id"),
    ("mp_user_notice", "user_id"), ("mp_booking", "user_id"),
    ("mp_member_subscription", "user_id"), ("mp_user_member_tag", "user_id"),
    ("mp_product_review", "user_id"), ("mp_support_ticket", "user_id"),
    ("mp_form_data", "user_id"), ("mp_appointment", "user_id"),
    ("mp_analytics_event", "user_id"),
]

print("%-34s %-18s %s" % ("表", "字段", "子账号关联行数"))
print("-" * 64)
hit = []
for t, c in TABLES:
    # 先确认表存在
    chk, e1 = q("SELECT COUNT(*) FROM information_schema.tables "
                "WHERE table_schema='miniprogram_prod' AND table_name='%s';" % t)
    if e1 or chk == "0":
        continue
    cc, e2 = q("SELECT COUNT(*) FROM information_schema.columns WHERE "
               "table_schema='miniprogram_prod' AND table_name='%s' AND column_name='%s';" % (t, c))
    if e2 or cc == "0":
        continue
    cnt, e3 = q("SELECT COUNT(*) FROM miniprogram_prod.%s WHERE %s IN (%s);" % (t, c, slave_ids))
    if e3:
        print("%-34s %-18s ERR %s" % (t, c, e3[:60])); continue
    if cnt and cnt != "0":
        hit.append((t, c, int(cnt)))
        print("%-34s %-18s %s" % (t, c, cnt))

print("-" * 64)
print("有数据的表数量 =", len(hit))
print("需迁移的总行数 =", sum(h[2] for h in hit))
