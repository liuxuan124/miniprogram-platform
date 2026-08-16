# BUG-API-011

- 编号：`BUG-API-011`
- 关联功能点 ID：FP-API-020, FP-API-030, FP-API-036, FP-API-043, FP-API-049, FP-API-055, FP-API-065
- 严重度：P0
- 复现步骤：
  1. 使用客服角色账号登录：`qa_staff` / `QaStaff123`（role=`service_staff`，无 content_ops）
  2. `POST /api/v1/admin/pages` 创建页面
  3. `PUT /api/v1/admin/pages/{id}` 改名
  4. 尝试 draft/publish/unpublish/rollback（部分因业务状态返回 422/404，但不是 403/200301）
- 预期：角色不足应 HTTP 403 + code `200301`
- 实际：创建与更新成功（HTTP 200）；删除不存在资源返回 404；发布类返回业务 422——均未按权限拒绝
- 证据：`agent-team/testing/evidence/BATCH-QA-016/results.json`（api020/api030 等）
- 影响范围：任意低于 content_ops 的后台账号可改页面数据；权限模型失效
- 指派 Agent：backend-agent
- 指派依据：不符合 api-contract §7.4 content_ops+ 与错误码 200301
- 状态：回归通过
- 回归证据：BATCH-QA-017 — `qa_staff` 创建/更新页面返回 HTTP 403 + code 200301；后端已加 `@PreAuthorize(page:*)` 并重建镜像

