# BUG-API-003

- 编号：`BUG-API-003`
- 关联功能点 ID：FP-API-011, FP-API-013, FP-API-014, FP-API-015, FP-API-018, FP-API-024, FP-API-028
- 严重度：P2
- 复现步骤：
  1. `POST /api/v1/admin/pages` 缺 name / type / path
  2. 发送非法 JSON
  3. `GET /api/v1/admin/pages?current=abc`
- 预期：HTTP 400，code=100101（参数）或 100102（JSON）
- 实际：HTTP 400，code=400，message 为校验文案；空 PUT 成功（无必填校验）
- 证据：`agent-team/testing/evidence/BATCH-QA-010/api-db-results.json` dump.createNoName 等
- 影响范围：页面写接口参数错误语义
- 指派 Agent：backend-agent
- 指派依据：错误码未对齐 api-contract §3
- 状态：回归通过
- 回归证据：BATCH-QA-014 缺参/非法 JSON/空 PUT 均返回 code=100101
