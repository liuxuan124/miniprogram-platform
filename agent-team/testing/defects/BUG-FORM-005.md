# BUG-FORM-005

- 编号：`BUG-FORM-005`
- 关联功能点 ID：FP-API-扩展表单列表（feature-inventory-system-extension 表单 GET）；探索 EXP-LINE3-ADMIN-CREATE
- 严重度：P1
- 复现步骤：
  1. 超管登录获取 token
  2. `GET /api/v1/admin/forms?current=1&size=10`
- 预期：HTTP 200，返回表单分页列表
- 实际：HTTP 500，code=500
- 证据：`agent-team/testing/evidence/BATCH-QA-016/results.json` dump.forms；此前 BATCH-QA-015 亦复现
- 影响范围：管理后台表单列表不可用，阻断表单运营
- 指派 Agent：backend-agent
- 指派依据：接口 500，服务端异常
- 状态：回归通过
- 回归证据：BATCH-QA-017 — `GET /api/v1/admin/forms` HTTP 200（新增 AdminFormController 别名）

