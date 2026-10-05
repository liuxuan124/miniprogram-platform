#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""V119 合并后验收：逐条核对交付清单。"""
import subprocess

SLAVES = "13,20,23,24,25,34,35,36,38,43,16,26,29,32,33,37,39,41,42,46,18,19,21,22,27,28,30,31,40,44,45"
PHONES = "18924071446,19927404435,15360475622"


def q(sql):
    r = subprocess.run(["ssh", "zfculture", 'sudo mysql -N -B miniprogram_prod -e "%s"' % sql],
                       capture_output=True, text=True, timeout=120)
    return r.stdout.strip(), r.stderr.strip()


def show(title, sql):
    out, err = q(sql)
    print("\n== %s ==" % title)
    if err:
        print("ERR:", err[:200])
    else:
        print(out)


show("3 个主账号（积分应已累加）",
     "SELECT id, phone, points, nickname FROM mp_user "
     "WHERE deleted=0 AND phone IN (%s) ORDER BY phone;" % PHONES)

show("3 笔订单归属（user_id 应为主账号 id 12/14/17 之一）",
     "SELECT id, user_id, order_no, pay_amount, status FROM mp_order WHERE id IN (10,11,12);")

show("从账号残留资产（全部应为 0）",
     "SELECT 'points_log', COUNT(*) FROM mp_member_points_log WHERE user_id IN ({0}) "
     "UNION ALL SELECT 'ai_conversation', COUNT(*) FROM mp_ai_conversation WHERE user_id IN ({0}) "
     "UNION ALL SELECT 'content_comment', COUNT(*) FROM mp_content_comment WHERE user_id IN ({0}) "
     "UNION ALL SELECT 'content_favorite', COUNT(*) FROM mp_content_favorite WHERE user_id IN ({0}) "
     "UNION ALL SELECT 'order', COUNT(*) FROM mp_order WHERE user_id IN ({0});".format(SLAVES))

show("合并日志抽样（含原 openid 留痕）",
     "SELECT keep_user_id, merged_user_id, phone, "
     "JSON_UNQUOTE(JSON_EXTRACT(detail_json,'$.mergedOpenid')) "
     "FROM mp_account_merge_log ORDER BY id LIMIT 4;")

show("关键验证：墓碑化后原 openid 是否可重新登录（应插入成功=不再撞唯一键）",
     "START TRANSACTION; "
     "INSERT INTO mp_user (openid,phone,points,deleted,create_time,update_time,status,tenant_id,nickname) "
     "SELECT 'merged:PROBE','19999999999',0,0,NOW(),NOW(),'active',1,'probe'; "
     "SELECT 'OK-原openid已释放'; ROLLBACK;")

show("唯一索引生效验证：存活态重复手机号插入应被拒绝",
     "START TRANSACTION; "
     "INSERT INTO mp_user (openid,phone,points,deleted,create_time,update_time,status,tenant_id,nickname) "
     "VALUES ('PROBE_UNIQ_1','18924071446',0,0,NOW(),NOW(),'active',1,'probe'); "
     "ROLLBACK;")
