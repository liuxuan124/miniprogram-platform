# BUG-PROD-003

- 编号：`BUG-PROD-003`
- 类型：真实数据预览与主数据不一致
- 关联功能点 ID：EXP-LINE2-BIND-PREVIEW
- 严重度：P1
- 所属模块与页面：页面装修器 / 商品列表组件 / 真实数据预览
- 指派 Agent：admin-agent
- 状态：回归通过
- 复现概率：修复前必现

## 实际现象（修复前）

- 真实数据预览混入下架商品、销量与主数据不符

## 修复说明（BATCH-QA-019）

- `useDataSync.syncProducts` 仅请求 `status=on_sale`
- `preview-datasource.mapProductItems` 过滤非上架，并按销量/价格排序
- `MiniPreviewDialog` 预览透传真实 sales

## 回归证据

- API `products?status=on_sale` 仅 6 条上架，销量与主数据一致（含 id=9 sales=0）
- 代码变更见 BATCH-QA-019 回执
