# BUG-API-002

- 编号：`BUG-API-002`
- 关联功能点 ID：FP-API-009, FP-API-010, FP-API-019, FP-API-025, FP-API-029, FP-API-035, FP-API-042, FP-API-048, FP-API-054, FP-API-060, FP-API-064, FP-API-069
- 严重度：P2
- 复现步骤：
  1. 不带 Authorization 调用 `GET /api/v1/admin/pages`
  2. 带过期 JWT 再调同一接口
- 预期：HTTP 401，code=110101（未登录）或 110102（过期）
- 实际：HTTP 403，body 无业务 JSON；过期 token 与缺 token 表现相同，无法区分 110102
- 证据：`agent-team/testing/evidence/BATCH-QA-010/api-db-results.json` dump.unauthList / expired
- 影响范围：全部需登录的页面管理接口
- 指派 Agent：backend-agent
- 指派依据：认证失败未按契约错误码返回
- 状态：回归通过
