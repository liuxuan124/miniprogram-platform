# BUG-UI-005

- 编号：`BUG-UI-005`
- 类型：工作台与商品主数据不一致
- 关联功能点 ID：未分配
- 严重度：P2
- 所属模块与页面：工作台 / 销售排行
- 指派 Agent：backend-agent
- 指派依据：同一商品在工作台排行与商品列表销量数字不同
- 状态：回归通过
- 复现概率：当前环境必现

## 从登录开始的完整复现路径

1. 登录后查看工作台销售排行（BATCH-QA-001 已截「品牌文创礼盒 ¥199 1件」）
2. 本批进入商品管理，查看 id=1「品牌文创礼盒」
3. 再请求工作台聚合接口

## 实际现象

- 商品列表：品牌文创礼盒 **已下架**，销量 **124**
- `GET /api/v1/admin/statistics/workbench` 的 `productRanking`：`name=品牌文创礼盒, sales=1, price=199`
- 排行第 2/3 名为「暂无数据」见 BUG-UI-004

## 预期现象及依据

销售排行件数应与商品主数据销量一致，或明确标注统计口径（例如仅统计已支付订单件数）。当前两处数字无法互相对上。

## 影响范围

工作台排行；与商品列表对照时无法采信。

## 证据

- `agent-team/testing/evidence/BATCH-QA-001/01-dashboard-force-password.png`
- `agent-team/testing/evidence/BATCH-QA-002/08-product-list-9-uncategorized.png`
- `agent-team/testing/evidence/BATCH-QA-002/api-dump.json`
