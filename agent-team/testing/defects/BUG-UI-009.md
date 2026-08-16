# BUG-UI-009

- 编号：`BUG-UI-009`
- 关联功能点 ID：FP-UI-014
- 严重度：P2
- 复现步骤：
  1. 页面管理 → 新建页面
  2. 查看名称输入框 maxlength
- 预期：最长 128（契约 name VARCHAR(128)）
- 实际：回归 maxlength=128
- 证据：`agent-team/testing/evidence/BATCH-QA-013/01-create-dialog.png`
- 影响范围：新建页面名称
- 指派 Agent：admin-agent
- 指派依据：后台表单限制严于契约/库表
- 状态：回归通过
