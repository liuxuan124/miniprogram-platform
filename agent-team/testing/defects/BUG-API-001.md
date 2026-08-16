# BUG-API-001

- 编号：`BUG-API-001`
- 关联功能点 ID：FP-API-003, FP-API-004, FP-API-005
- 严重度：P2
- 复现步骤：
  1. 超管登录 `POST /api/v1/admin/auth/login`
  2. `GET /api/v1/admin/pages` 不传分页
  3. `GET /api/v1/admin/pages?page=1&page_size=101`
  4. `GET /api/v1/admin/pages?size=101`
- 预期：分页参数为 `page`（从 1）/`page_size`（默认 20，最大 100）；超过 100 被拒绝
- 实际：实现使用 `current`/`size`；默认 size=10；`page_size` 被忽略；`size=101` 被接受
- 证据：`agent-team/testing/evidence/BATCH-QA-010/api-db-results.json` dump.defaultPageSize / pageSizeOver
- 影响范围：所有后台列表分页与契约不一致
- 指派 Agent：backend-agent
- 指派依据：接口不符合 api-contract §1.1 分页约定
- 状态：回归通过
- 回归证据：`agent-team/testing/evidence/BATCH-QA-014/api-retest.json`（page 字段、默认 size=20、超限拒绝）
