# BUG-PROD-001

- 编号：`BUG-PROD-001`
- 类型：数据展示错误
- 关联功能点 ID：EXP-PRODUCT-CATEGORY
- 严重度：P1
- 所属模块与页面：商品管理 / 商品列表
- 指派 Agent：backend-agent
- 状态：回归通过
- 复现概率：修复前必现

## 实际现象（修复前）

- 列表接口无 `categoryName`，UI 全部显示「未分类」

## 修复说明

- `ProductServiceImpl.toListVOs` 批量填充 `categoryName`
- 前端 `row.categoryName || '未分类'`

## 回归证据（BATCH-QA-019）

- `GET /api/v1/admin/products`：id=9 `categoryName=品牌礼盒`
- UI：`/commerce/product` → `01-product-list.png`，未见全量「未分类」
