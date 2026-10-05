#!/usr/bin/env python3
"""客服 IM 工作台契约门禁。

背景（V125）：IM 的富媒体卡片 payload 由后端 ImCardService 一处产出，
后台工作台与小程序端**各自渲染**。任一端改了字段名或漏了某个类型，
表现都是「卡片渲染成空白」且**不报任何错** —— 这是最贵的一类静默失败。

本门禁锁住：
  1. 五种消息类型在两端都存在（text/image/product_card/logistics_card/system_event）
  2. payload 字段名两端一致（改一处必须改另一处）
  3. 事件钩子挂在发货/支付链路上
  4. SSE 与小程序轮询两条链路都通
  5. 循环依赖已解开（ImService 不得直接注入 OperatorNoticeService）

用法: python3 miniapp/scripts/check-im-workbench-contract.py
"""
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BACKEND = ROOT.parent / "backend/src/main/java/com/miniprogram"
ADMIN = ROOT.parent / "admin/src"

results = []


def check(name, ok, detail=""):
    results.append((name, bool(ok), detail))


def read(p):
    try:
        return Path(p).read_text(encoding="utf-8")
    except Exception:
        return ""


# ---------- 文件存在 ----------
files = {
    "ImService": BACKEND / "service/ImService.java",
    "ImEventPublisher": BACKEND / "service/ImEventPublisher.java",
    "ImJsonSupport": BACKEND / "service/ImJsonSupport.java",
    "ImCardService": BACKEND / "service/ImCardService.java",
    "ImEventBridge": BACKEND / "service/ImEventBridgeService.java",
    "ImCannedReplyService": BACKEND / "service/ImCannedReplyService.java",
    "LogisticsTrackService": BACKEND / "service/LogisticsTrackService.java",
    "OperatorNoticeService": BACKEND / "service/OperatorNoticeService.java",
    "AdminImController": BACKEND / "controller/AdminImController.java",
    "MpImController": BACKEND / "controller/MpImController.java",
    "ImStaleJob": BACKEND / "job/ImStaleConversationJob.java",
    "migration": ROOT.parent / "backend/src/main/resources/db/migration/V125__im_workbench.sql",
    "adminApi": ADMIN / "api/imWorkbench.ts",
    "workbench": ADMIN / "views/member-ops/im-workbench.vue",
    "msgCard": ADMIN / "components/im-workbench/ImMessageCard.vue",
    "convList": ADMIN / "components/im-workbench/ImConversationList.vue",
    "customerSide": ADMIN / "components/im-workbench/ImCustomerSide.vue",
    "miniIm": ROOT / "services/im.js",
    "miniWxml": ROOT / "pkg-user/service-chat/service-chat.wxml",
    "miniJs": ROOT / "pkg-user/service-chat/service-chat.js",
}
for key, p in files.items():
    check(f"文件存在 {key}", p.exists(), str(p.name) if not p.exists() else "")

src = {k: read(v) for k, v in files.items()}

# ---------- 1. 五种消息类型 ----------
MSG_TYPES = ["text", "image", "product_card", "logistics_card", "system_event"]
check("ImMessage 定义 5 种类型常量", all(f'TYPE_{t.upper()}' in src["ImService"] for t in MSG_TYPES))
for t in ["product_card", "logistics_card", "system_event", "image"]:
    check(f"后台渲染 {t}", f"'{t}'" in src["msgCard"] or f'"{t}"' in src["msgCard"])
    check(f"小程序渲染 {t}", t in src["miniWxml"])

# ---------- 2. payload 字段两端一致 ----------
# ImCardService 是字段真源，两端渲染必须引用同一批 key
PRODUCT_KEYS = ["id", "title", "coverUrl", "price", "originalPrice", "stock", "linkPath"]
LOGISTICS_KEYS = ["orderId", "orderNo", "expressName", "trackingNo", "status", "latestTrack", "tracks", "linkPath"]

for k in PRODUCT_KEYS:
    in_card = f'"{k}"' in src["ImCardService"]
    in_admin = f"payloadOf('{k}')" in src["msgCard"] or f"payloadOf(\"{k}\")" in src["msgCard"]
    in_mini = f"payload.{k}" in src["miniWxml"]
    check(f"商品卡字段 {k}（后端产出）", in_card)
    check(f"商品卡字段 {k}（后台消费）", in_admin)
    check(f"商品卡字段 {k}（端上消费）", in_mini)

for k in LOGISTICS_KEYS:
    in_card = f'"{k}"' in src["ImCardService"]
    in_admin = f"payloadOf('{k}')" in src["msgCard"] or f"payloadOf(\"{k}\")" in src["msgCard"]
    in_mini = f"payload.{k}" in src["miniWxml"]
    check(f"物流卡字段 {k}（后端产出）", in_card)
    check(f"物流卡字段 {k}（后台消费）", in_admin or k in ("orderId", "orderNo", "tracks", "status", "virtual"))
    check(f"物流卡字段 {k}（端上消费）", in_mini)

# ---------- 3. 事件钩子 ----------
check("发货挂 IM 桥接", "imEventBridgeService.onOrderShipped(order)" in read(BACKEND / "service/impl/OrderServiceImpl.java"))
check("支付挂 IM 桥接", "imEventBridgeService.onOrderPaid(order)" in read(BACKEND / "service/impl/PaymentServiceImpl.java"))
check("桥接内部吞异常（不阻断主流程）", "绝不能因为 IM 推送失败" in src["ImEventBridge"])
check("无会话时不建单（不刷客服列表）", "没有会话就不建" in src["ImEventBridge"])
check("超时扫描定时任务存在", "@Scheduled" in src["ImStaleJob"] and "scanStaleConversations" in src["ImStaleJob"])

# ---------- 4. 通讯链路 ----------
check("后台用原生 EventSource", "new EventSource(" in src["workbench"])
check("后台有轮询兜底", "pullTimer" in src["workbench"] and "pullOnce" in src["workbench"])
check("SSE 端点存在", "/stream" in src["AdminImController"] and "TEXT_EVENT_STREAM" in src["AdminImController"])
check("小程序用轮询（wx.request 不支持 SSE）", "startPolling" in src["miniIm"] and "setInterval" in src["miniIm"])
check("小程序按 seq 游标续传", "afterSeq" in src["miniIm"] and "lastSeq" in src["miniIm"])
check("小程序切后台停轮询", "onHide" in src["miniJs"] and "stopPolling" in src["miniJs"])
check("小程序 onShow 补拉", "pullMessages" in src["miniJs"])

# ---------- 5. 循环依赖已解开 ----------
im_svc = src["ImService"]
check("ImService 不注入 OperatorNoticeService", "OperatorNoticeService operatorNoticeService" not in im_svc)
check("ImService 用事件解耦", "ImNewConversationEvent" in im_svc)
check("OperatorNoticeService 监听事件", "@EventListener" in src["OperatorNoticeService"])
check("OperatorNoticeService 不注入 ImService", "ImService imService" not in src["OperatorNoticeService"])
check("SSE 抽出独立组件", "ImEventPublisher" in src["ImEventPublisher"])

# ---------- 6. 买家只能发受限类型 ----------
check("端上禁发商品卡/物流卡", "不支持的消息类型" in src["MpImController"])
check("端上会话做本人校验", "无权在该会话发言" in src["MpImController"] and "无权查看该会话" in src["MpImController"])

# ---------- 7. 通知三通道 ----------
# ⚠️ 通道名在 OperatorNoticeSetting 实体里定义为常量（CHANNEL_WECOM_BOT = "wecom_bot"），
#    Controller 用 @PathVariable channel 动态接收 —— 所以不能只搜字面量。
notice_entity = read(BACKEND / "entity/OperatorNoticeSetting.java")
for ch, const in [("wecom_bot", "CHANNEL_WECOM_BOT"),
                  ("mp_official", "CHANNEL_MP_OFFICIAL"),
                  ("browser", "CHANNEL_BROWSER")]:
    check(f"通知通道 {ch} 有常量定义", f'"{ch}"' in notice_entity and const in notice_entity)
    check(f"通知通道 {ch} 在 Service 消费", const in src["OperatorNoticeService"])
check("通知配置走动态路径", "notice-settings/{channel}" in src["AdminImController"])
check("企微 webhook 有连通性自检", "testWecomBot" in src["OperatorNoticeService"] and "test-wecom" in src["AdminImController"])
check("通知异步且用专用线程池", '@Async("noticeExecutor")' in src["OperatorNoticeService"])
check("三通道互不阻断", "不影响其他通道" in src["OperatorNoticeService"])

# ---------- 8. 物流轨迹降级 ----------
check("物流有缓存层", "LogisticsTrackCacheMapper" in src["LogisticsTrackService"])
check("物流未配 Key 时降级", "物流轨迹降级为发货提示" in src["LogisticsTrackService"])
check("卡片对空轨迹有兜底", "包裹已发出" in src["ImCardService"])

# ---------- 9. 迁移 ----------
check("V125 迁移含 6 张表", all(t in src["migration"] for t in [
    "im_conversation", "im_message", "im_canned_reply",
    "operator_notice_setting", "logistics_track_cache", "im_agent_presence",
]))
check("V125 内置话术有 seed", "INSERT IGNORE INTO im_canned_reply" in src["migration"])
check("V125 通知配置有 seed", "INSERT IGNORE INTO operator_notice_setting" in src["migration"])

# ---------- 10. 三栏布局 ----------
check("三栏 grid 布局", "grid-template-columns" in src["workbench"])
check("左栏含 4 个状态 Tab", all(k in src["convList"] for k in ["waiting", "active", "closed", "all"]))
check("左栏支持置顶", "toggle-pin" in src["convList"] and "pinned" in src["convList"])
check("中栏有商品库/订单库/图片工具", all(k in src["workbench"] for k in ["openProductPicker", "openOrderPicker", "handleImageUpload"]))
check("中栏 Enter/Shift+Enter 可配", "enterToSend" in src["workbench"] and "shiftKey" in src["workbench"])
check("右栏三 Tab（档案/订单/话术）", all(k in src["customerSide"] for k in ["profile", "orders", "canned"]))
check("有桌面通知 + 提示音", "ElNotification" in src["workbench"] and "playNoticeSound" in src["workbench"])

# ---------- 输出 ----------
passed = sum(1 for _, ok, _ in results if ok)
failed = len(results) - passed
for name, ok, detail in results:
    if ok and not detail:
        continue
    mark = "✓" if ok else "✗"
    line = f"  {mark} {name}"
    if detail and not ok:
        line += f"  ← {detail}"
    print(line)

print()
print("=" * 46)
print(f"通过 {passed} · 失败 {failed}")
print("=" * 46)
sys.exit(1 if failed else 0)
