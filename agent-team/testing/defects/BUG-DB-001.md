# BUG-DB-001

- 编号：`BUG-DB-001`
- 关联功能点 ID：FP-DB-002
- 严重度：P1
- 复现步骤：
  1. `SELECT CONSTRAINT_NAME, DELETE_RULE FROM information_schema.REFERENTIAL_CONSTRAINTS WHERE TABLE_NAME='mp_page_version'`
- 预期：删除页面对版本记录有外键/级联（database-model）
- 实际：无外键
- 证据：`agent-team/testing/evidence/BATCH-QA-010/api-db-results.json` dump.fk 为空
- 影响范围：删页面可能留下孤儿版本，或需业务层软删兜底
- 指派 Agent：backend-agent
- 指派依据：库表约束不符合 database-model §5.2
- 状态：回归通过
