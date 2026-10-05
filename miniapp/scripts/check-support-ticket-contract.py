#!/usr/bin/env python3
"""客服工单写入侧契约门禁。

背景（2026-10-06 踩过的坑）：「客服工单有收件箱但没人投单」—— 后端只有
GET/reply/status 没有创建接口，端上 service-chat 是本地假数据，收件箱永远空。
补完写入侧后，必须静态锁住这些断言，否则后端/端上任何一侧回退都是静默失败。

用法: python3 miniapp/scripts/check-support-ticket-contract.py
"""
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

CHAT_JS = ROOT / "pkg-user/service-chat/service-chat.js"
SUPPORT_JS = ROOT / "services/support.js"
CONTROLLER = (
    ROOT.parent
    / "backend/src/main/java/com/miniprogram/controller/MpSupportController.java"
)
NOTICE_SERVICE = (
    ROOT.parent
    / "backend/src/main/java/com/miniprogram/service/UserNoticeService.java"
)

results = []


def check(name, ok, detail=""):
    results.append((name, bool(ok), detail))


def read(path):
    if not path.exists():
        return ""
    return path.read_text(encoding="utf-8")


chat = read(CHAT_JS)
support = read(SUPPORT_JS)
controller = read(CONTROLLER)
notice_service = read(NOTICE_SERVICE)

# ---------- 端上：必须真的调建单接口 ----------
check("端上存在 services/support.js", bool(support))
check("端上引用 supportService", "require('../../services/support')" in chat)
check("端上调用建单接口", "/api/v1/mp/support/tickets" in support)
check("service-chat 调用 createTicket", ".createTicket(" in chat)
check("_createTicket 有实现", "_createTicket(content)" in chat)

# ---------- 端上：建单判据不能用文案匹配 ----------
# 起因：曾用 /无法连接|未找到|无法回答/ 匹配答案判断「AI 答不上来」，
# 但 AI 正常回答里也可能出现「未找到」，会把正常问答误判成需转人工。
check("禁止用答案文案匹配判 AI 兜不住", not re.search(r"answer\)\s*\.test|test\(String\(answer\)\)", chat))
check("使用后端 isTransferHuman 判据", "isTransferHuman" in chat)

# ---------- 端上：未登录不建单 ----------
check("_maybeCreateTicket 有登录守卫", "AuthUtil.isLoggedIn()" in chat)

# ---------- 后端：必须有创建接口 + 复用 open 单 ----------
check("后端 MpSupportController 存在", bool(controller))
check("后端有 POST 建单映射", '@PostMapping("/tickets")' in controller)
check("后端复用已有 open 工单", "findOpenTicket" in controller)
check("后端复用时按 source 过滤", ".eq(SupportTicket::getSource, source)" in controller)
check("后端校验内容非空", "请填写咨询内容" in controller)
check("会话详情做本人校验", "无权查看该会话" in controller)

# ---------- 后端：站内信双闸门 ----------
check("UserNoticeService 存在", bool(notice_service))
check("站内信走场景开关", "isSceneEnabled" in notice_service)
check("站内信走用户偏好", "isUserGroupEnabled" in notice_service)
check("偏好缺项视为开启", "return !(v instanceof Boolean b) || b;" in notice_service)
check("场景表缺失时按全开处理", "按全部开启处理" in notice_service)

# ---------- 输出 ----------
passed = sum(1 for _, ok, _ in results if ok)
failed = len(results) - passed
for name, ok, detail in results:
    mark = "✓" if ok else "✗"
    line = f"  {mark} {name}"
    if detail:
        line += f"  ({detail})"
    print(line)

print()
print("=" * 46)
print(f"通过 {passed} · 失败 {failed}")
print("=" * 46)
sys.exit(1 if failed else 0)
