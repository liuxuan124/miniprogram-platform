# 经营管理升级（实施跟踪）

原型：`docs/prototypes/暖阁经营管理原型.html`

## 菜单（5 页）

| 菜单 | 路由 |
|------|------|
| 经营概览 | `/finance/overview` |
| 收支明细 | `/finance/transactions`（`?tab=pending` 未入账） |
| 预算与目标 | `/finance/budget` |
| 票据与税务 | `/finance/invoice` |
| 智能助手 | `/finance/assistant` |

旧路由重定向：`/finance/dashboard` → overview；`/finance/report`、`/finance/permission` 已收敛。

## 对账

- `GET /api/v1/admin/finance/orders/pending`
- `POST .../orders/sync`、`.../orders/sync-all`
- 流水表 V78：`amount_cents`、`order_id`、`exclude_from_summary`（测试/零元）
- 概览/趋势仅统计 `exclude_from_summary=0` 的已审批流水

## 待办 API

- `POST /budgets/dedupe`、`POST /invoices/clean-samples`
- 目标：`GET/PUT /goals`（system_config `finance_goal_*_cents`）
