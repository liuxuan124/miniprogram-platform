# BUG-API-010

- 编号：`BUG-API-010`
- 关联功能点 ID：FP-API-071, FP-API-072
- 严重度：P2
- 复现步骤：
  1. `GET /api/v1/mp/pages?path=pages/custom/does-not-exist-xyz`
  2. `GET /api/v1/mp/pages?path=` 仅有草稿未发布的自定义页
- 预期：HTTP 404
- 实际：HTTP 200，body.code=404，message=页面不存在或未发布
- 证据：`agent-team/testing/evidence/BATCH-QA-010/api-db-results.json` dump.mpDraftOnly
- 影响范围：小程序拉页失败语义
- 指派 Agent：backend-agent
- 指派依据：HTTP 状态码未对齐契约
- 状态：回归通过
