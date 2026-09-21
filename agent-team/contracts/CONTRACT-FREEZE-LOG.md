---
name: 契约冻结记录
description: Phase 02 契约初稿验收与冻结
type: project
created: 2026-05-11
---

# 契约冻结记录

## 冻结状态：已冻结

以下 5 份契约初稿经总控验收，确认回执合格，正式冻结：

| 契约文件 | 来源任务 | 验收结论 | 冻结时间 |
|----------|----------|----------|----------|
| database-model.md | TASK-BE-001 | ✅ 41张表覆盖全部业务对象，字段与PRD对齐 | 2026-05-11 |
| api-contract.md | TASK-BE-002 | ✅ 120+接口覆盖全部功能，错误码体系完整 | 2026-05-11 |
| page-dsl-schema.md | TASK-BE-003 | ✅ 13种组件覆盖PRD需求，数据源和跳转规则明确 | 2026-05-11 |
| order-state-machine.md | TASK-BE-004 | ✅ 状态机覆盖实物/数字/服务三种类型，幂等规则完整 | 2026-05-11 |
| ai-recommendation-contract.md | TASK-AI-001 | ✅ 推荐格式可追溯真实数据，工具调用契约完整 | 2026-05-11 |

## 冻结规则

冻结后执行 Agent 不得私自修改契约。任何变更必须通过回执提交"契约变更请求"，由总控判断是否允许。

## 待对齐项

- AI 契约中接口路径为 AI Agent 期望设计，需与 api-contract.md 对齐
- AI 契约中数据模型字段名需与 database-model.md 对齐
- 小程序方案中接口路径需与 api-contract.md 对齐

## 变更请求记录（未改冻结正文）

- 2026-09-21：Mini Site 增补 `GET /api/v1/admin/mini/releases`、`POST .../releases/{id}/prepare-rollback`（内容时间线 + 回滚为待发布草稿）；publish 写入 snapshot；待合入 api-contract.md。
- 2026-09-21：Admin Mini Site 聚合 API——`GET/PUT /api/v1/admin/mini/site`、`GET .../pending-changes`、`POST .../publish`；页面状态计算 draft/pending/live/offline/archived；待合入 api-contract.md。
- 2026-09-20：新增 MP `GET/POST /api/v1/mp/store-templates`（列表/详情/套用）与 Admin `POST /api/v1/admin/miniapp-releases/publish-content`（上线内容）；待总控择期合入 api-contract.md。
