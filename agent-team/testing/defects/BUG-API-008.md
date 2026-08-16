# BUG-API-008

- 编号：`BUG-API-008`
- 关联功能点 ID：FP-API-077
- 严重度：P3
- 复现步骤：
  1. `POST /api/v1/admin/pages` 创建成功
- 预期：ID 以字符串传输，避免 JS 精度丢失
- 实际：`data.id` 为 number（本批 5）
- 证据：`agent-team/testing/evidence/BATCH-QA-010/api-db-results.json` dump.create
- 影响范围：页面 ID 传输格式
- 指派 Agent：backend-agent
- 指派依据：api-contract §1.1 ID 格式
- 状态：回归通过
- 回归证据：BATCH-QA-014 创建响应 `data.id` 为 string（例 `"15"`）
