# BUG-MEMBER-003

- 编号：`BUG-MEMBER-003`
- 关联功能点 ID：FP-API-扩展会员列表；探索 EXP-MEMBER-LIST
- 严重度：P1
- 复现步骤：
  1. 超管登录获取 token
  2. `GET /api/v1/admin/members?current=1&size=10`
- 预期：HTTP 200，返回会员分页列表
- 实际：HTTP 500，code=500
- 证据：`agent-team/testing/evidence/BATCH-QA-016/results.json` dump.members；此前 BATCH-QA-015 亦复现
- 影响范围：管理后台会员列表不可用
- 指派 Agent：backend-agent
- 指派依据：接口 500，服务端异常
- 状态：回归通过
- 回归证据：BATCH-QA-017 — `GET /api/v1/admin/members` HTTP 200（新增 AdminMemberController 别名）

