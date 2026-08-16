# BUG-API-004

- 编号：`BUG-API-004`
- 关联功能点 ID：FP-API-016
- 严重度：P2
- 复现步骤：
  1. `POST /api/v1/admin/pages`，name 为 129 个字符，type=3，path 合法
- 预期：参数越界拒绝（400 / 100101）
- 实际：HTTP 500，code=500，message=系统内部错误，请稍后重试
- 证据：`agent-team/testing/evidence/BATCH-QA-010/api-db-results.json` dump.createLongName
- 影响范围：创建页面名称超长
- 指派 Agent：backend-agent
- 指派依据：校验失败变成未处理异常
- 状态：回归通过
- 回归证据：BATCH-QA-014 name 129 → HTTP 400 code=100101
