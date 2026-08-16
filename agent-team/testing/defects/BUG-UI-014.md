# BUG-UI-014

- 编号：`BUG-UI-014`
- 关联功能点 ID：FP-UI-175, FP-UI-176
- 严重度：P2
- 复现步骤：
  1. 添加轮播图，不选跳转类型或留空跳转地址
  2. 保存草稿 / 发布（非首页 id=1）
- 预期：type=page / webview / miniapp / phone / none；缺 type/target 应拦截
- 实际：BATCH-QA-013 已出现页面/网页/小程序/拨打电话/无跳转。缺 type、缺 target 仍无保存或发布校验。
- 证据：`agent-team/testing/evidence/BATCH-QA-013/05-banner.png`、`results.json`
- 影响范围：组件跳转契约校验
- 指派 Agent：admin-agent
- 指派依据：跳转枚举已补，缺字段校验仍不符合 page-dsl-schema
- 状态：回归通过
