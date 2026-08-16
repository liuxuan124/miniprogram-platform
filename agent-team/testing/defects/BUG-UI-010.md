# BUG-UI-010

- 编号：`BUG-UI-010`
- 关联功能点 ID：FP-UI-019, FP-UI-054
- 严重度：P2
- 复现步骤：
  1. 打开新建页面弹窗
  2. 打开装修器右侧页面属性
- 预期：可配置 share_image
- 实际：回归后新建弹窗与页面属性均有分享封面
- 证据：`agent-team/testing/evidence/BATCH-QA-013/01-create-dialog.png`、`02-page-props.png`
- 影响范围：页面分享图
- 指派 Agent：admin-agent
- 指派依据：page-dsl-schema page.share_image 无对应控件
- 状态：回归通过
