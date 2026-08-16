# BUG-FORM-001

- 编号：`BUG-FORM-001`
- 类型：操作失败
- 关联功能点 ID：EXP-LINE3-ADMIN-CREATE
- 严重度：P1
- 所属模块与页面：表单管理 / 表单模板列表「启用」
- 指派 Agent：admin-agent
- 状态：回归通过
- 复现概率：修复前必现

## 实际现象（修复前）

- 列表「启用」只提交 `{status:1}` → 400「表单名称不能为空; 表单字段定义不能为空」

## 修复说明（BATCH-QA-019）

- 列表启用走 `updateTemplateStatus`，带 name/fields/status
- `activateFormTemplate` / `deactivateFormTemplate` 改为先拉详情再 PUT 全量必要字段
- 后端更新已支持仅改 status；双端兼容

## 回归证据

- `agent-team/testing/evidence/BATCH-QA-019/02-form-template.png`（已启用）
- API 启停 status 0→1 均 200
