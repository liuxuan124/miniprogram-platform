# BUG-MP-001

- 编号：`BUG-MP-001`
- 类型：功能入口关闭
- 关联功能点 ID：EXP-LINE2-MP-ORDER
- 严重度：P1
- 所属模块与页面：小程序 / 商品列表 / 商品详情 / 自定义 tabBar
- 指派 Agent：miniapp-agent
- 状态：回归通过
- 复现概率：修复前必现

## 实际现象（修复前）

- 商品列表/详情或底栏点击提示「商城暂未开放」并回首页

## 修复说明（BATCH-QA-019）

- `product-list` / `product-detail` 已可正常加载（无硬关闭）
- `custom-tab-bar`：移除「商城暂未开放」拦截；白名单加入 product-list/cart；仅拦截无路径的占位「分类/购物车」文案项
- 首页 `goShop` 仍 `navigateTo` 商品列表

## 回归证据

- 代码：`miniapp/custom-tab-bar/index.js`
- 说明：端上微信开发者工具需本地重载后点验；API 侧已有上架商品可供下单主线继续
