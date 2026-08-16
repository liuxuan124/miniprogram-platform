# BUG-MP-005

- 编号：`BUG-MP-005`
- 类型：空态缺失
- 关联功能点 ID：EXP-LINE2-MP-ORDER
- 严重度：P2
- 所属模块与页面：小程序 / 我的订单 `pkg-trade/order-list/order-list`
- 指派 Agent：miniapp-agent
- 指派依据：关闭登录半层后订单数为 0，页面无空态
- 状态：回归通过
- 复现概率：未登录关闭登录半层后必现

## 从登录开始的完整复现路径

1. automator `reLaunch('/pkg-trade/order-list/order-list')`，出现「完善个人资料」半层
2. 调用登录组件 `hide()` 关闭半层
3. 停留在「我的订单 / 全部」

## 实际现象

- 页面 data：`orders=[]`，`loading=false`，`isEmpty=false`，`hasMore=true`
- 登录半层已关闭
- 列表区域全白，无订单卡片，也无「暂无订单」类空态

## 预期现象及依据

无订单时应给出空态，或继续引导登录，不应留下空白内容区。

## 影响范围

未登录用户关闭登录半层后的订单列表。

## 证据

- `agent-team/testing/evidence/BATCH-QA-009/02-orders-after-close.png`
- `agent-team/testing/evidence/BATCH-QA-009/automator-report.json`
