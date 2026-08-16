# BUG-API-005

- 编号：`BUG-API-005`
- 关联功能点 ID：FP-API-017
- 严重度：P2
- 复现步骤：
  1. `POST /api/v1/admin/pages` `{ name, type: 99, path }`
- 预期：type 非法被拒绝
- 实际：HTTP 200 创建成功（本批 id=6）
- 证据：`agent-team/testing/evidence/BATCH-QA-010/api-db-results.json` dump.createBadType
- 影响范围：页面类型约束
- 指派 Agent：backend-agent
- 指派依据：未校验 type 枚举 1/2/3
- 状态：回归通过
- 回归证据：BATCH-QA-014 type=99 被拒绝 created=false
