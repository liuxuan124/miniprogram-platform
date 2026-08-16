# BUG-API-009

- 编号：`BUG-API-009`
- 关联功能点 ID：FP-API-044
- 严重度：P2
- 复现步骤：
  1. 保存草稿后，用过期 `expectedVersion` 再 `POST /admin/pages/{id}/draft`
- 预期：HTTP 409 版本冲突
- 实际：HTTP 404，code=300409，message 含「页面已被其他人修改」
- 证据：`agent-team/testing/evidence/BATCH-QA-010/api-db-results.json` dump.draftConflict
- 影响范围：草稿乐观锁；且 300409 不在契约错误码表（见功能点清单待裁决项 3）
- 指派 Agent：backend-agent
- 指派依据：冲突应用 409；错误码需契约补齐或改实现
- 状态：回归通过
