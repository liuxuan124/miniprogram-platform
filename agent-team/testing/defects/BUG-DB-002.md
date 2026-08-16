# BUG-DB-002

- 编号：`BUG-DB-002`
- 关联功能点 ID：FP-DB-005
- 严重度：P1
- 复现步骤：
  1. 对 QA 页保存草稿、发布、回滚
  2. `SELECT current_version, (SELECT MAX(version) FROM mp_page_version WHERE page_id=p.id AND status=1) FROM mp_page p WHERE id=5`
- 预期：current_version 等于已发布版本号
- 实际：回滚后 current_version=5，已发布版本 max=3
- 证据：`agent-team/testing/evidence/BATCH-QA-010/api-db-results.json` dump.currentVsPub
- 影响范围：发布版本指针与版本表不一致
- 指派 Agent：backend-agent
- 指派依据：page-dsl-schema §11 与 database-model current_version
- 状态：回归通过
