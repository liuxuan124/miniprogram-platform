# BUG-UI-015

- 编号：`BUG-UI-015`
- 关联功能点 ID：FP-UI-005, FP-UI-029
- 严重度：P0
- 复现步骤：
  1. 打开后台登录页，使用 `qa_staff` / `QaStaff123` 登录
  2. 进入 `/page-builder` 页面管理
  3. 进入任意 `/page-builder/editor/{id}` 装修器
- 预期：无页面搭建权限时应展示无权限态，不可新建/进入装修器
- 实际：可见页面管理与「新建」，可进入装修器画布
- 证据：
  - `agent-team/testing/evidence/BATCH-QA-016/01-qa-staff-page-builder.png`
  - `agent-team/testing/evidence/BATCH-QA-016/02-qa-staff-editor.png`
  - `agent-team/testing/evidence/BATCH-QA-016/results.json`
- 影响范围：后台前端未按角色隐藏/拦截页面搭建入口（与 BUG-API-011 叠加）
- 指派 Agent：admin-agent
- 指派依据：页面表现不符合权限模型；无权限态缺失
- 状态：回归通过
- 回归证据：BATCH-QA-017 — 侧栏无「小程序/页面」；直链 `/page-builder/editor/1` 被重定向工作台；工作台装修入口按权限隐藏

