# BUG-UI-011

- 编号：`BUG-UI-011`
- 关联功能点 ID：FP-UI-047, FP-UI-048
- 严重度：P2
- 复现步骤：
  1. 打开装修器 → 更多
- 预期：可导入 DSL，缺 schema_version/page/components 时拒绝
- 实际：仅有「历史版本」「查看 DSL」，无导入入口
- 证据：`agent-team/testing/evidence/BATCH-QA-011/13-dsl.png`
- 影响范围：DSL 导入
- 指派 Agent：admin-agent
- 指派依据：功能点要求的导入能力缺失
- 状态：回归通过
