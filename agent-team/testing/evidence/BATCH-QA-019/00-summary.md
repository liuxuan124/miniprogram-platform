# BATCH-QA-019 证据摘要

## 本批修复

| 缺陷 | 修复 |
| --- | --- |
| BUG-FORM-001 | `activateFormTemplate`/`deactivateFormTemplate` 先拉详情再带 name/fields 更新；列表启用路径已带全量字段 |
| BUG-PROD-001 | 列表 API 已返回 `categoryName`；UI `/commerce/product` 可见「品牌礼盒」，无全量「未分类」 |
| BUG-PROD-003 | 预览/同步仅取 `on_sale`；按销量排序；预览带真实 sales |
| BUG-MP-001 | 取消「商城暂未开放」硬拦截；允许 product-list/cart 导航 |
| BUG-FORM-004 | 小程序表单归一 `field_key→key`；空字段提示；开发环境 BASE_URL 仍指向本地 |

## 证据

- `01-product-list.png`：商品列表分类「品牌礼盒」等
- `02-form-template.png`：表单「QA主线表单-0813」已启用
- API：`PUT form-templates/1` 启停 200；`products?status=on_sale` 6 条且含 categoryName
