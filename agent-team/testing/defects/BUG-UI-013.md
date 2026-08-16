# BUG-UI-013

- 编号：`BUG-UI-013`
- 关联功能点 ID：FP-UI-108
- 严重度：P2
- 复现步骤：
  1. 添加商品列表 → 内容与数据
- 预期：布局 grid / list / waterfall
- 实际：回归后布局为宫格/列表/瀑布流
- 证据：`agent-team/testing/evidence/BATCH-QA-013/06-product-list.png`
- 影响范围：商品列表布局
- 指派 Agent：admin-agent
- 指派依据：与 page-dsl-schema product_list 布局枚举不符
- 状态：回归通过
