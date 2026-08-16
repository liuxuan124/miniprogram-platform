# BUG-API-006

- 编号：`BUG-API-006`
- 关联功能点 ID：FP-API-059
- 严重度：P2
- 复现步骤：
  1. `GET /api/v1/admin/pages/999999001/versions`（带超管 token）
- 预期：页面不存在 404 / 300401
- 实际：HTTP 200，code=200
- 证据：`agent-team/testing/evidence/BATCH-QA-010/api-db-results.json` 对应该条 note
- 影响范围：版本列表对无效 pageId
- 指派 Agent：backend-agent
- 指派依据：不存在资源未返回 404
- 状态：回归通过
- 回归证据：BATCH-QA-014 不存在页面 versions → HTTP 404 code=300401
